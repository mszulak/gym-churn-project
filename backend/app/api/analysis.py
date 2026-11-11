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
from app.worker.tasks import run_churn_analysis_task

router = APIRouter(prefix="/api", tags=["analysis"])

STORAGE_DIR = "local_storage/uploads"

@router.post("/upload", response_model=AnalysisJobPublic, status_code=status.HTTP_202_ACCEPTED)
async def upload_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Program expectcs file with .csv extension",
        )

    contents = await file.read()

    os.makedirs(STORAGE_DIR, exist_ok=True)
    job_id = uuid.uuid4()
    file_path = os.path.join(STORAGE_DIR, f"{job_id}.csv")
    with open(file_path, "wb") as f:
        f.write(contents)

    new_job = AnalysisJob(
        id=job_id,
        user_id=current_user.id,
        filename=file.filename,
        file_path=file_path,
        status="PENDING",
    )
    session.add(new_job)
    session.commit()
    session.refresh(new_job)

    run_churn_analysis_task.delay(str(job_id))

    return new_job


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