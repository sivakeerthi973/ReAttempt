from datetime import date, timedelta

from sqlalchemy import func

from extensions import db
from models import Backlog, StudyTask


def calculate_progress(user_id: int) -> dict:
    total_subjects = Backlog.query.filter_by(user_id=user_id).count()
    completed_subjects = Backlog.query.filter(
        Backlog.user_id == user_id,
        db.or_(Backlog.status == "Completed", Backlog.progress >= 100),
    ).count()
    average_progress = (
        db.session.query(func.avg(Backlog.progress))
        .filter(Backlog.user_id == user_id)
        .scalar()
    )
    total_tasks = StudyTask.query.filter_by(user_id=user_id).count()
    completed_tasks = StudyTask.query.filter_by(user_id=user_id, status="Completed").count()
    total_minutes = (
        db.session.query(func.coalesce(func.sum(StudyTask.duration), 0))
        .filter(StudyTask.user_id == user_id, StudyTask.status == "Completed")
        .scalar()
    )

    today = date.today()
    monday = today - timedelta(days=today.weekday())
    week_dates = [monday + timedelta(days=offset) for offset in range(7)]
    week_rows = (
        db.session.query(StudyTask.study_date, func.coalesce(func.sum(StudyTask.duration), 0))
        .filter(
            StudyTask.user_id == user_id,
            StudyTask.status == "Completed",
            StudyTask.study_date >= week_dates[0],
            StudyTask.study_date <= week_dates[-1],
        )
        .group_by(StudyTask.study_date)
        .all()
    )
    minutes_by_date = {study_date: int(minutes) for study_date, minutes in week_rows}
    weekly = [
        {
            "date": current_date.isoformat(),
            "day": current_date.strftime("%a"),
            "minutes": minutes_by_date.get(current_date, 0),
            "hours": round(minutes_by_date.get(current_date, 0) / 60, 2),
        }
        for current_date in week_dates
    ]
    subjects = (
        Backlog.query.filter_by(user_id=user_id)
        .order_by(Backlog.semester, Backlog.subject_name)
        .all()
    )
    return {
        "stats": {
            "totalSubjects": total_subjects,
            "completedSubjects": completed_subjects,
            "pendingSubjects": total_subjects - completed_subjects,
            "overallPreparation": round(float(average_progress or 0)),
            "totalTasks": total_tasks,
            "completedTasks": completed_tasks,
            "totalStudyHours": round(int(total_minutes) / 60, 1),
            "weeklyStudyHours": round(sum(item["minutes"] for item in weekly) / 60, 1),
        },
        "subjects": [subject.to_dict() for subject in subjects],
        "weekly": weekly,
    }
