import json
import os
import uuid
import joblib
import pandas as pd
from celery import Celery
from sqlmodel import Session

from app.core.config import settings
from app.db.models import AnalysisJob, ClientPrediction
from app.db.session import engine

celery_app = Celery(
    "gym_churn_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

MODEL_PATH = "app/ml/models/gym_churn_baseline.joblib"

@celery_app.task(name="run_churn_analysis")
def run_churn_analysis_task(job_id_str: str) -> dict:
    """Task done in background by celery worker"""
    job_id = uuid.UUID(job_id_str)

    with Session(engine) as session:
        job = session.get(AnalysisJob, job_id)
        if not job:
            return {"error": f"Job {job_id_str} not found in database"}

        try:
            try:
                model = joblib.load(MODEL_PATH)
                print("Worker: Model loaded successfully")
            except Exception as e:
                model = None
                print(f"Worker: Model loading error: {e}")

            job.status = "PROCESSING"
            session.add(job)
            session.commit()

            if model is None:
                raise RuntimeError("Model not accessible in worker")

            if not os.path.exists(job.file_path):
                raise FileNotFoundError(f"Lack of CSV file: {job.file_path}")

            df: pd.DataFrame = pd.read_csv(job.file_path)
            df_features = df.copy()

            if "Churn" in df_features.columns:
                df_features = df_features.drop(columns=["Churn"])

            df_features["frequency_delta"] = (
                df_features["Avg_class_frequency_current_month"]
                - df_features["Avg_class_frequency_total"]
            )
            df_features = df_features.drop(
                columns=["Month_to_end_contract", "Avg_class_frequency_total"],
                errors="ignore",
            )

            probabilities = model.predict_proba(df_features)[:, 1]
            df["client_index"] = df.index
            df["churn_probability"] = probabilities

            df["uncertainty_low"] = (df["churn_probability"] - 0.08).clip(0.0, 1.0).round(4)
            df["uncertainty_high"] = (df["churn_probability"] + 0.08).clip(0.0, 1.0).round(4)
            df["predicted_days_to_churn"] = ((1.0 - df["churn_probability"]) * 90).astype(int)

            df_sorted = df.sort_values(by="churn_probability", ascending=False)

            records = json.loads(df_sorted.to_json(orient="records"))
            predictions_to_save = [
                ClientPrediction(
                    job_id=job_id,
                    client_index=record["client_index"],
                    churn_probability=round(float(record["churn_probability"]), 4),
                    uncertainty_low=record["uncertainty_low"],
                    uncertainty_high=record["uncertainty_high"],
                    predicted_days_to_churn=record["predicted_days_to_churn"],
                    raw_features=record,
                )
                for record in records
            ]
            session.add_all(predictions_to_save)

            job.rows_count = int(df.shape[0])
            job.high_risk_count = int((df["churn_probability"] >= 0.5).sum())
            job.avg_churn_probability = round(float(df["churn_probability"].mean()), 4)
            job.status = "COMPLETED"
            session.add(job)
            session.commit()

            return {"job_id": job_id_str, "status": "COMPLETED"}

        except Exception as e:
            session.rollback()
            job_failed = session.get(AnalysisJob, job_id)
            if job_failed:
                job_failed.status = "FAILED"
                session.add(job_failed)
                session.commit()
            raise e

        finally:
            if os.path.exists(job.file_path):
                try:
                    os.remove(job.file_path)
                except OSError:
                    pass