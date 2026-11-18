import os
import shutil
import uuid
from celery import Celery
from sqlmodel import Session

from app.core.config import settings
from app.db.models import AnalysisJob, ClientPrediction
from app.db.session import engine
from app.ml.habit_engine import run_habit_churn_pipeline

celery_app = Celery(
    "gym_churn_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)


@celery_app.task(name="run_churn_analysis")
def run_churn_analysis_task(job_id_str: str) -> dict:
    """Task done in background by celery worker"""
    job_id = uuid.UUID(job_id_str)

    with Session(engine) as session:
        job = session.get(AnalysisJob, job_id)
        if not job:
            return {"error": f"Job {job_id_str} not found in database"}

        try:
            job.status = "PROCESSING"
            session.add(job)
            session.commit()

            if not os.path.exists(job.file_path):
                raise FileNotFoundError(f"Lack of upload directory: {job.file_path}")

            result = run_habit_churn_pipeline(job.file_path)
            active_members = result["active_members"]

            predictions_to_save = [
                ClientPrediction(
                    job_id=job_id,
                    client_index=member["member_id"],
                    churn_probability=member["prob_churn_current"],
                    uncertainty_low=member["uncertainty_low"],
                    uncertainty_high=member["uncertainty_high"],
                    predicted_days_to_churn=member["predicted_days_to_churn"],
                    raw_features=member,
                )
                for member in active_members
            ]
            session.add_all(predictions_to_save)

            job.rows_count = result["summary_kpis"]["total_active_members"]
            job.high_risk_count = sum(
                1 for m in active_members if m["segment_id"] in ("behavioral_alarm", "zombie_zone")
            )
            job.avg_churn_probability = round(
                float(sum(m["prob_churn_current"] for m in active_members) / max(len(active_members), 1)),
                4,
            )
            job.report_data = {
                "summary_kpis": result["summary_kpis"],
                "club_physics": result["club_physics"],
                "segments_summary": result["segments_summary"],
            }
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
                shutil.rmtree(job.file_path, ignore_errors=True)