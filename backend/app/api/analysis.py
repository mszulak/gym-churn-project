import io
import json
import os
import uuid
import joblib
import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlmodel import Session, select, col

from app.api.deps import get_current_user
from app.db.models import (
    AnalysisJob,
    AnalysisJobDetail,
    AnalysisJobPublic,
    ClientPrediction,
    ClientPredictionPublic,
    User,
)
from app.db.session import get_session

router = APIRouter(prefix="/api", tags=["analysis"])

MODEL_PATH = "app/ml/models/gym_churn_baseline.joblib"
STORAGE_DIR = "local_storage/uploads"

try:
    model = joblib.load(MODEL_PATH)
    print("Model loaded successfully")
except Exception as e:
    model = None
    print(f"Model loading error: {e}")


@router.post("/upload")
async def upload_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Program expectes file with .csv extension",
        )

    if model is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Model is not accessible on the server",
        )

    contents = await file.read()

    os.makedirs(STORAGE_DIR, exist_ok=True)
    job_id = uuid.uuid4()
    file_path = os.path.join(STORAGE_DIR, f"{job_id}.csv")
    with open(file_path, "wb") as f:
        f.write(contents)

    try:
        df: pd.DataFrame = pd.read_csv(io.BytesIO(contents))  # type: ignore
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

        high_risk_count = int((df["churn_probability"] >= 0.5).sum())
        avg_prob = float(df["churn_probability"].mean())

        new_job = AnalysisJob(
            id=job_id,
            user_id=current_user.id,
            filename=file.filename,
            file_path=file_path,
            status="COMPLETED",
            rows_count=int(df.shape[0]),
            high_risk_count=high_risk_count,
            avg_churn_probability=round(avg_prob, 4),
        )
        session.add(new_job)

        records = json.loads(df_sorted.to_json(orient="records"))

        predictions_to_save = []
        for record in records:
            pred = ClientPrediction(
                job_id=job_id,
                client_index=record["client_index"],
                churn_probability=round(float(record["churn_probability"]), 4),
                uncertainty_low=record["uncertainty_low"],
                uncertainty_high=record["uncertainty_high"],
                predicted_days_to_churn=record["predicted_days_to_churn"],
                raw_features=record,
            )
            predictions_to_save.append(pred)

        session.add_all(predictions_to_save)
        session.commit()

        return {
            "job_id": str(job_id),
            "filename": file.filename,
            "rows": df.shape[0],
            "high_risk_count": high_risk_count,
            "avg_churn_probability": round(avg_prob, 4),
            "columns": df.columns.tolist(),
            "status": "COMPLETED",
            "top_10_risk": records[:10],
        }

    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"CSV processing error: {str(e)}",
        )


@router.get("/analyses", response_model=list[AnalysisJobPublic])
def get_user_analyses(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    statement = (
        select(AnalysisJob)
        .where(AnalysisJob.user_id == current_user.id)
        .order_by(col(AnalysisJob.created_at).desc())
    )
    return session.exec(statement).all()


@router.get("/analyses/{job_id}", response_model=AnalysisJobDetail)
def get_analysis_detail(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    job = session.get(AnalysisJob, job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No analysis found or lack of privileges",
        )

    predictions_stmt = (
        select(ClientPrediction)
        .where(ClientPrediction.job_id == job_id)
        .order_by(col(ClientPrediction.churn_probability).desc())
        .limit(10)
    )
    predictions = session.exec(predictions_stmt).all()

    return AnalysisJobDetail(
        **job.model_dump(),
        predictions=[ClientPredictionPublic(**p.model_dump()) for p in predictions],
    )