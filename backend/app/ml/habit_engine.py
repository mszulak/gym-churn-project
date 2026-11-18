from pathlib import Path
from typing import Any

import jax
import jax.numpy as jnp
import numpy as np
import numpyro
import numpyro.distributions as dist
import numpyro.optim as optim
import pandas as pd
from numpyro.infer import SVI, Predictive, Trace_ELBO
from numpyro.infer.autoguide import AutoNormal
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, roc_auc_score


def _gym_habit_model(data: dict[str, Any], include_obs: bool = True) -> None:
    N_ep = data["N_episodes"]

    mu_lambda = numpyro.sample("mu_lambda", dist.Normal(jnp.log(2.5), 0.4))
    beta_lambda_dist = numpyro.sample("beta_lambda_dist", dist.Normal(0.0, 0.4))
    beta_lambda_group = numpyro.sample("beta_lambda_group", dist.Normal(0.0, 0.5))
    sigma_lambda = numpyro.sample("sigma_lambda", dist.HalfNormal(0.4))

    mu_tau = numpyro.sample("mu_tau", dist.Normal(jnp.log(16.0), 0.5))
    beta_tau_dist = numpyro.sample("beta_tau_dist", dist.Normal(0.0, 0.5))
    beta_tau_friends = numpyro.sample("beta_tau_friends", dist.Normal(0.0, 0.5))
    beta_tau_group = numpyro.sample("beta_tau_group", dist.Normal(0.0, 0.6))
    beta_tau_partner = numpyro.sample("beta_tau_partner", dist.Normal(0.0, 0.5))
    beta_tau_age = numpyro.sample("beta_tau_age", dist.Normal(0.0, 0.4))
    beta_tau_returning = numpyro.sample("beta_tau_returning", dist.Normal(0.0, 0.4))
    sigma_tau = numpyro.sample("sigma_tau", dist.HalfNormal(0.5))

    mu_gamma = numpyro.sample("mu_gamma", dist.Normal(jnp.log(0.35), 0.5))
    beta_gamma_group = numpyro.sample("beta_gamma_group", dist.Normal(0.0, 0.5))
    beta_gamma_friends = numpyro.sample("beta_gamma_friends", dist.Normal(0.0, 0.5))
    sigma_gamma = numpyro.sample("sigma_gamma", dist.HalfNormal(0.5))

    vacation_prob = numpyro.sample("vacation_prob", dist.Beta(1.5, 18.0))

    with numpyro.plate("episodes", N_ep):
        z_lambda = numpyro.sample("z_lambda", dist.Normal(0.0, 1.0))
        z_tau = numpyro.sample("z_tau", dist.Normal(0.0, 1.0))
        z_gamma = numpyro.sample("z_gamma", dist.Normal(0.0, 1.0))

        log_lambda_base = (
            mu_lambda
            + beta_lambda_dist * data["dist_z"]
            + beta_lambda_group * data["group_affinity"]
            + sigma_lambda * z_lambda
        )
        log_tau = (
            mu_tau
            + beta_tau_dist * data["dist_z"]
            + beta_tau_friends * data["promo_friends"]
            + beta_tau_group * data["group_affinity"]
            + beta_tau_partner * data["partners_company"]
            + beta_tau_age * data["age_z"]
            + beta_tau_returning * data["is_returning"]
            + sigma_tau * z_tau
        )
        log_gamma = (
            mu_gamma
            + beta_gamma_group * data["group_affinity"]
            + beta_gamma_friends * data["promo_friends"]
            + sigma_gamma * z_gamma
        )

        lambda_base = numpyro.deterministic("lambda_base", jnp.exp(log_lambda_base))
        tau = numpyro.deterministic("tau", jnp.clip(jnp.exp(log_tau), 1.0, 250.0))
        gamma = numpyro.deterministic("gamma", jnp.clip(jnp.exp(log_gamma), 0.02, 5.0))

    ep_i = data["ep_idx"]
    t_week = data["t"]

    exponent = jnp.clip(gamma[ep_i] * (t_week - tau[ep_i]), -20.0, 20.0)
    lam_t = lambda_base[ep_i] / (1.0 + jnp.exp(exponent))

    obs_val = data["visits_obs"] if include_obs else None
    numpyro.sample(
        "visits",
        dist.ZeroInflatedPoisson(gate=vacation_prob, rate=lam_t),
        obs=obs_val,
    )


def run_habit_churn_pipeline(job_dir: str | Path, num_svi_steps: int = 4500) -> dict[str, Any]:
    job_path = Path(job_dir)
    members_df = pd.read_csv(job_path / "members.csv")
    contracts_df = pd.read_csv(job_path / "contracts.csv")
    check_ins_df = pd.read_csv(job_path / "check_ins.csv")

    # 1. Czyszczenie logów bramkowych (filtr duplikatów i odbić < 45 minut)
    check_ins_df["timestamp"] = pd.to_datetime(check_ins_df["timestamp"])
    check_ins_df = check_ins_df.sort_values(["member_id", "timestamp"]).reset_index(drop=True)
    time_diff_min = check_ins_df.groupby("member_id")["timestamp"].diff().dt.total_seconds() / 60.0
    clean_check_ins = check_ins_df[(time_diff_min.isna()) | (time_diff_min >= 45.0)].copy()

    # 2. Budowa epizodów członkowskich (sklejanie umów z przerwą <= 14 dni)
    contracts_df["start_date"] = pd.to_datetime(contracts_df["start_date"])
    contracts_df["end_date"] = pd.to_datetime(contracts_df["end_date"])
    contracts_df = contracts_df.sort_values(["member_id", "start_date"]).reset_index(drop=True)

    prev_end = contracts_df.groupby("member_id")["end_date"].shift(1)
    gap_days = (contracts_df["start_date"] - prev_end).dt.days
    contracts_df["is_new_episode"] = (gap_days.isna()) | (gap_days > 14)
    contracts_df["member_episode_num"] = contracts_df.groupby("member_id")["is_new_episode"].cumsum()

    episodes_df = (
        contracts_df.groupby(["member_id", "member_episode_num"], as_index=False)
        .agg(
            episode_start=("start_date", "min"),
            contract_end=("end_date", "max"),
            num_contracts=("contract_id", "count"),
            last_duration_months=("duration_months", "last"),
            avg_monthly_price=("monthly_price", "mean"),
            final_status=("status", "last"),
        )
        .sort_values(["member_id", "episode_start"])
        .reset_index(drop=True)
    )
    episodes_df["episode_id"] = np.arange(1, len(episodes_df) + 1)
    episodes_df["is_returning"] = (episodes_df["member_episode_num"] > 1).astype(int)

    # Punkt odcięcia danych (dzisiaj)
    export_date = max(clean_check_ins["timestamp"].max().normalize(), contracts_df["start_date"].max())

    # 3. Budowa pełnej siatki tygodniowej z jawnymi zerami
    grid_rows = []
    for ep in episodes_df.itertuples(index=False):
        obs_end = min(ep.contract_end, export_date)
        total_weeks = max(1, int((obs_end - ep.episode_start).days // 7))
        for w in range(1, total_weeks + 1):
            grid_rows.append({
                "episode_id": ep.episode_id,
                "member_id": ep.member_id,
                "t": w,
                "week_start": ep.episode_start + pd.Timedelta(days=(w - 1) * 7),
            })
    weekly_grid_df = pd.DataFrame(grid_rows)

    merged_ci = clean_check_ins.merge(
        episodes_df[["episode_id", "member_id", "episode_start", "contract_end"]],
        on="member_id",
        how="inner",
    )
    merged_ci = merged_ci[
        (merged_ci["timestamp"] >= merged_ci["episode_start"])
        & (merged_ci["timestamp"] <= merged_ci["contract_end"])
    ].copy()
    merged_ci["t"] = ((merged_ci["timestamp"] - merged_ci["episode_start"]).dt.days // 7) + 1

    weekly_agg = (
        merged_ci.groupby(["episode_id", "t"], as_index=False)
        .agg(
            visits=("timestamp", "count"),
            group_visits=("is_group_class", "sum"),
            ancillary_spend=("additional_spend", "sum"),
        )
    )

    weekly_grid_df = weekly_grid_df.merge(weekly_agg, on=["episode_id", "t"], how="left")
    weekly_grid_df["visits"] = weekly_grid_df["visits"].fillna(0).astype(int)
    weekly_grid_df["group_visits"] = weekly_grid_df["group_visits"].fillna(0).astype(int)
    weekly_grid_df["ancillary_spend"] = weekly_grid_df["ancillary_spend"].fillna(0.0)

    # Obliczenie group_affinity i statystyk epizodu
    ep_visit_stats = (
        weekly_grid_df.groupby("episode_id", as_index=False)
        .agg(
            observed_weeks=("t", "max"),
            total_visits=("visits", "sum"),
            total_group_visits=("group_visits", "sum"),
        )
    )
    ep_visit_stats["group_affinity"] = np.where(
        ep_visit_stats["total_visits"] > 0,
        ep_visit_stats["total_group_visits"] / ep_visit_stats["total_visits"],
        0.0,
    )

    episodes_df = (
        episodes_df.merge(members_df, on="member_id", how="left")
        .merge(ep_visit_stats, on="episode_id", how="left")
        .sort_values("episode_id")
        .reset_index(drop=True)
    )
    episodes_df["ep_idx"] = np.arange(len(episodes_df))
    episodes_df["weeks_to_contract_end"] = np.maximum(
        0, (episodes_df["contract_end"] - export_date).dt.days // 7
    )

    weekly_grid_df = (
        weekly_grid_df.merge(episodes_df[["episode_id", "ep_idx"]], on="episode_id", how="left")
        .sort_values(["ep_idx", "t"])
        .reset_index(drop=True)
    )

    # 4. Trening Części A w NumPyro (SVI AutoNormal)
    age_mean, age_std = episodes_df["age"].mean(), max(episodes_df["age"].std(), 1e-6)
    dist_mean, dist_std = episodes_df["distance_km"].mean(), max(episodes_df["distance_km"].std(), 1e-6)

    model_data = {
        "N_episodes": len(episodes_df),
        "age_z": jnp.asarray((episodes_df["age"] - age_mean) / age_std, dtype=jnp.float32),
        "dist_z": jnp.asarray((episodes_df["distance_km"] - dist_mean) / dist_std, dtype=jnp.float32),
        "promo_friends": jnp.asarray(episodes_df["promo_friends"], dtype=jnp.float32),
        "partners_company": jnp.asarray(episodes_df["partners_company"], dtype=jnp.float32),
        "group_affinity": jnp.asarray(episodes_df["group_affinity"], dtype=jnp.float32),
        "is_returning": jnp.asarray(episodes_df["is_returning"], dtype=jnp.float32),
        "ep_idx": jnp.asarray(weekly_grid_df["ep_idx"], dtype=jnp.int32),
        "t": jnp.asarray(weekly_grid_df["t"], dtype=jnp.float32),
        "visits_obs": jnp.asarray(weekly_grid_df["visits"], dtype=jnp.int32),
    }

    guide = AutoNormal(_gym_habit_model)
    optimizer = optim.Adam(step_size=0.01)
    svi = SVI(_gym_habit_model, guide, optimizer, loss=Trace_ELBO())
    svi_result = svi.run(jax.random.PRNGKey(42), num_steps=num_svi_steps, data=model_data, include_obs=True)

    guide_samples = Predictive(guide, params=svi_result.params, num_samples=1000)(
        jax.random.PRNGKey(1), data=model_data, include_obs=True
    )
    det_samples = Predictive(
        _gym_habit_model,
        posterior_samples=guide_samples,
        return_sites=["lambda_base", "tau", "gamma"],
    )(jax.random.PRNGKey(2), data=model_data, include_obs=True)
    svi_samples = {**guide_samples, **det_samples}

    episodes_df["lambda_base_est"] = np.asarray(svi_samples["lambda_base"]).mean(axis=0)
    episodes_df["tau_est"] = np.asarray(svi_samples["tau"]).mean(axis=0)
    episodes_df["gamma_est"] = np.asarray(svi_samples["gamma"]).mean(axis=0)

    # 5. Trening Części B (Model decyzji kontraktowej na zamkniętych umowach)
    contracts_with_ep = contracts_df.merge(
        episodes_df[[
            "episode_id", "member_id", "episode_start", "contract_end",
            "lambda_base_est", "tau_est", "gamma_est",
        ]],
        on="member_id",
        how="inner",
    )
    contracts_with_ep = contracts_with_ep[
        (contracts_with_ep["start_date"] >= contracts_with_ep["episode_start"])
        & (contracts_with_ep["end_date"] <= contracts_with_ep["contract_end"])
    ].copy()

    contracts_with_ep["t_decision"] = (
        (contracts_with_ep["end_date"] - contracts_with_ep["episode_start"]).dt.days // 7
    ).clip(lower=1)

    exp_term = np.clip(
        contracts_with_ep["gamma_est"] * (contracts_with_ep["t_decision"] - contracts_with_ep["tau_est"]),
        -20.0, 20.0,
    )
    contracts_with_ep["lambda_at_decision"] = contracts_with_ep["lambda_base_est"] / (1.0 + np.exp(exp_term))
    contracts_with_ep["drop_ratio_at_decision"] = 1.0 - (
        contracts_with_ep["lambda_at_decision"] / contracts_with_ep["lambda_base_est"]
    )
    contracts_with_ep["long_contract_shock"] = (contracts_with_ep["duration_months"] >= 6).astype(int)

    hist_decisions = contracts_with_ep[contracts_with_ep["status"].isin(["churned", "renewed"])].copy()
    hist_decisions["y_churn"] = (hist_decisions["status"] == "churned").astype(int)

    features_B = ["lambda_at_decision", "drop_ratio_at_decision", "long_contract_shock"]
    clf_churn = LogisticRegression(C=np.inf)
    clf_churn.fit(hist_decisions[features_B], hist_decisions["y_churn"])

    pred_probs_hist = clf_churn.predict_proba(hist_decisions[features_B])[:, 1]
    roc_auc = float(roc_auc_score(hist_decisions["y_churn"], pred_probs_hist))
    brier = float(brier_score_loss(hist_decisions["y_churn"], pred_probs_hist))

    # 6. Wyliczenie dzisiejszego stanu, przedziałów niepewności i segmentacji dla AKTYWNYCH klientów
    active_df = episodes_df[episodes_df["final_status"] == "active"].copy()

    # Wyliczamy pełny rozkład a posteriori dzisiejszego drop_ratio (1000 próbek SVI), by mieć prawdziwe CI 90%
    active_indices = active_df["ep_idx"].to_numpy()
    t_obs_vec = active_df["observed_weeks"].to_numpy()[None, :]  # (1, N_active)
    lb_s = np.asarray(svi_samples["lambda_base"])[:, active_indices]
    tau_s = np.asarray(svi_samples["tau"])[:, active_indices]
    gam_s = np.asarray(svi_samples["gamma"])[:, active_indices]

    lam_today_samples = lb_s / (1.0 + np.exp(np.clip(gam_s * (t_obs_vec - tau_s), -20.0, 20.0)))
    drop_today_samples = 1.0 - (lam_today_samples / lb_s)
    long_shock_vec = (active_df["last_duration_months"].to_numpy() >= 6).astype(float)[None, :]

    # Logity prawdopodobieństwa odejścia dla wszystkich 1000 próbek SVI
    b0 = float(clf_churn.intercept_[0])
    b_lam, b_drop, b_long = [float(c) for c in clf_churn.coef_[0]]
    logits_samples = b0 + b_lam * lam_today_samples + b_drop * drop_today_samples + b_long * long_shock_vec
    prob_samples = 1.0 / (1.0 + np.exp(-np.clip(logits_samples, -20.0, 20.0)))

    active_df["lambda_today"] = lam_today_samples.mean(axis=0)
    active_df["drop_ratio_today"] = drop_today_samples.mean(axis=0)
    active_df["prob_churn_current"] = prob_samples.mean(axis=0)
    active_df["uncertainty_low"] = np.percentile(prob_samples, 5, axis=0)
    active_df["uncertainty_high"] = np.percentile(prob_samples, 95, axis=0)
    active_df["revenue_at_risk_pln"] = active_df["prob_churn_current"] * active_df["avg_monthly_price"]

    # Flaga świeżego spadkowicza (np. Episode #4: przekroczył 75% spadku, ale kryzys tau był <= 4 tyg. temu)
    active_df["is_fresh_drop"] = (active_df["drop_ratio_today"] >= 0.25) & (
        (active_df["observed_weeks"] - active_df["tau_est"]).between(-2.0, 4.0)
    )
    active_df["predicted_days_to_churn"] = (
        np.maximum(0.0, active_df["tau_est"] - active_df["observed_weeks"]) * 7.0
    ).round().astype(int)

    # Przypisanie segmentów (świeży spadkowicze trafiają do Alarmu Behawioralnego zamiast Strefy Zombie!)
    cond_alarm = (
        (active_df["drop_ratio_today"].between(0.25, 0.75))
        | ((active_df["drop_ratio_today"] > 0.75) & active_df["is_fresh_drop"])
    )
    cond_zombie = (active_df["drop_ratio_today"] > 0.75) & (~active_df["is_fresh_drop"])
    cond_hot = (active_df["weeks_to_contract_end"] <= 4) & (active_df["drop_ratio_today"] < 0.25)

    active_df["segment_id"] = np.select(
        [cond_alarm, cond_hot, cond_zombie],
        ["behavioral_alarm", "hot_window", "zombie_zone"],
        default="strong_base",
    )

    segment_meta = {
        "behavioral_alarm": (
            "1. Behavioral alarm (diminishig habit)",
            "Habit is currently going down but can still be saved",
        ),
        "hot_window": (
            "2. Hot window (end of contract in less than 4 weeks)",
            "Healthy habit, contract is ending, send prolongation proposal",
        ),
        "zombie_zone": (
            "3. Zombie zone (habit lost > 75%)",
            "Client is no longer active member.",
        ),
        "strong_base": (
            "4. Strong base (solid habit)",
            "Solid habit with no signs for going down",
        ),
    }
    active_df["segment_name"] = active_df["segment_id"].map(lambda s: segment_meta[s][0])

    segments_summary = []
    for seg_id, (seg_name, action_desc) in segment_meta.items():
        sub = active_df[active_df["segment_id"] == seg_id]
        segments_summary.append({
            "segment_id": seg_id,
            "segment_name": seg_name,
            "client_amount": int(len(sub)),
            "average_lambda": round(float(sub["lambda_today"].mean()) if len(sub) else 0.0, 2),
            "average_drop_ratio": round(float(sub["drop_ratio_today"].mean()) if len(sub) else 0.0, 2),
            "average_churn_risk": round(float(sub["prob_churn_current"].mean()) if len(sub) else 0.0, 2),
            "revenue_at_risk": round(float(sub["revenue_at_risk_pln"].sum()), 2),
            "recommended_action": action_desc,
        })

    tau_mult_group = float(np.exp(np.asarray(svi_samples["beta_tau_group"]).mean()))
    tau_mult_friends = float(np.exp(np.asarray(svi_samples["beta_tau_friends"]).mean()))
    tau_mult_partner = float(np.exp(np.asarray(svi_samples["beta_tau_partner"]).mean()))
    tau_mult_dist = float(np.exp(np.asarray(svi_samples["beta_tau_dist"]).mean()))

    club_physics = [
        {
            "feature": "group_affinity",
            "label": "Group classes (Group Affinity)",
            "effect_type": "anchor",
            "tau_multiplier": round(tau_mult_group, 2),
            "description": f"Changes time of habit time by {(tau_mult_group - 1.0) * 100:+.0f}% and slowdowns expiration",
        },
        {
            "feature": "promo_friends",
            "label": "Signing up with friends (Promo Friends)",
            "effect_type": "anchor",
            "tau_multiplier": round(tau_mult_friends, 2),
            "description": f"Delays moment of crisis by {(tau_mult_friends - 1.0) * 100:+.0f}%.",
        },
        {
            "feature": "partners_company",
            "label": "Parnet / company program",
            "effect_type": "anchor",
            "tau_multiplier": round(tau_mult_partner, 2),
            "description": f"Changes breaking point of habit by {(tau_mult_partner - 1.0) * 100:+.0f}%.",
        },
        {
            "feature": "distance_km",
            "label": "Distance form club (+1 std)",
            "effect_type": "friction",
            "tau_multiplier": round(tau_mult_dist, 2),
            "description": f"Decreases habit by {abs(tau_mult_dist - 1.0) * 100:.0f}%",
        },
    ]

    active_ep_ids = set(active_df["episode_id"].tolist())
    active_grid = weekly_grid_df[weekly_grid_df["episode_id"].isin(active_ep_ids)]
    history_by_ep: dict[int, list[dict[str, int]]] = {}
    for row in active_grid.itertuples(index=False):
        history_by_ep.setdefault(int(row.episode_id), []).append(
            {"t": int(row.t), "visits": int(row.visits)}
        )

    active_df = active_df.sort_values("prob_churn_current", ascending=False).reset_index(drop=True)
    active_members_payload = []
    for row in active_df.itertuples(index=False):
        active_members_payload.append({
            "episode_id": int(row.episode_id),
            "member_id": int(row.member_id),
            "segment_id": str(row.segment_id),
            "segment_name": str(row.segment_name),
            "is_fresh_drop": bool(row.is_fresh_drop),
            "observed_weeks": int(row.observed_weeks),
            "weeks_to_contract_end": int(row.weeks_to_contract_end),
            "lambda_base_est": round(float(row.lambda_base_est), 2),
            "tau_est": round(float(row.tau_est), 1),
            "gamma_est": round(float(row.gamma_est), 2),
            "lambda_today": round(float(row.lambda_today), 2),
            "drop_ratio_today": round(float(row.drop_ratio_today), 2),
            "prob_churn_current": round(float(row.prob_churn_current), 3),
            "uncertainty_low": round(float(row.uncertainty_low), 3),
            "uncertainty_high": round(float(row.uncertainty_high), 3),
            "predicted_days_to_churn": int(row.predicted_days_to_churn),
            "monthly_price": round(float(row.avg_monthly_price), 2),
            "revenue_at_risk_pln": round(float(row.revenue_at_risk_pln), 2),
            "weekly_history": history_by_ep.get(int(row.episode_id), []),
        })

    actionable_rev = float(
        active_df[active_df["segment_id"].isin(["behavioral_alarm", "hot_window"])]["revenue_at_risk_pln"].sum()
    )
    summary_kpis = {
        "total_active_members": int(len(active_df)),
        "total_revenue_at_risk_pln": round(float(active_df["revenue_at_risk_pln"].sum()), 2),
        "actionable_revenue_at_risk_pln": round(actionable_rev, 2),
        "avg_club_lambda_base": round(float(np.exp(np.asarray(svi_samples["mu_lambda"]).mean())), 2),
        "avg_club_tau_weeks": round(float(np.exp(np.asarray(svi_samples["mu_tau"]).mean())), 1),
        "vacation_prob": round(float(np.asarray(svi_samples["vacation_prob"]).mean()), 3),
        "model_roc_auc": round(roc_auc, 3),
        "model_brier_score": round(brier, 3),
    }

    return {
        "summary_kpis": summary_kpis,
        "club_physics": club_physics,
        "segments_summary": segments_summary,
        "active_members": active_members_payload,
    }