import io
import os
import uuid
import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlmodel import Session, col, select

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

REQUIRED_COLUMNS = {
    "members.csv": {"member_id", "age", "distance_km", "promo_friends", "partners_company"},
    "contracts.csv": {"contract_id", "member_id", "start_date", "end_date", "duration_months", "monthly_price", "status"},
    "check_ins.csv": {"member_id", "timestamp", "is_group_class", "additional_spend"},
}


@router.post("/upload", response_model=AnalysisJobPublic, status_code=status.HTTP_202_ACCEPTED)
async def upload_csv(
    members_file: UploadFile = File(...),
    contracts_file: UploadFile = File(...),
    check_ins_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    uploaded_map = {
        "members.csv": members_file,
        "contracts.csv": contracts_file,
        "check_ins.csv": check_ins_file,
    }

    job_id = uuid.uuid4()
    job_dir = os.path.join(STORAGE_DIR, str(job_id))
    os.makedirs(job_dir, exist_ok=True)

    for target_name, up_file in uploaded_map.items():
        if not up_file.filename or not up_file.filename.endswith(".csv"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Plik dla {target_name} musi mieć rozszerzenie .csv",
            )
        contents = await up_file.read()
        try:
            header_df = pd.read_csv(io.BytesIO(contents), nrows=1)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Nie udało się odczytać pliku {up_file.filename} jako CSV",
            ) from exc

        missing = REQUIRED_COLUMNS[target_name] - set(header_df.columns)
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"W pliku {up_file.filename} ({target_name}) brakuje wymaganych kolumn: {sorted(missing)}",
            )

        with open(os.path.join(job_dir, target_name), "wb") as f:
            f.write(contents)

    display_name = f"{members_file.filename} + {contracts_file.filename} + {check_ins_file.filename}"
    new_job = AnalysisJob(
        id=job_id,
        user_id=current_user.id,
        filename=display_name[:255],
        file_path=job_dir,
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
    )
    predictions = session.exec(predictions_stmt).all()
    report_data = job.report_data or {}

    return AnalysisJobDetail(
        **job.model_dump(),
        summary_kpis=report_data.get("summary_kpis", {}),
        club_physics=report_data.get("club_physics", []),
        segments_summary=report_data.get("segments_summary", []),
        active_members=[p.raw_features for p in predictions if p.raw_features],
        predictions=[ClientPredictionPublic(**p.model_dump()) for p in predictions],
    )