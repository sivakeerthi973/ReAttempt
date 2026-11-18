from datetime import datetime, timezone

from extensions import db


class StudyTask(db.Model):
    __tablename__ = "study_tasks"
    __table_args__ = (
        db.CheckConstraint("duration >= 1", name="ck_task_duration_positive"),
        db.Index("ix_task_user_date_status", "user_id", "study_date", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    backlog_id = db.Column(
        db.Integer, db.ForeignKey("backlogs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title = db.Column(db.String(180), nullable=False)
    study_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    duration = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="Planned")
    is_sample = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    user = db.relationship("User", back_populates="tasks")
    backlog = db.relationship("Backlog", back_populates="tasks")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "subjectId": self.backlog_id,
            "subject": self.backlog.subject_name if self.backlog else "",
            "date": self.study_date.isoformat(),
            "start": self.start_time.strftime("%H:%M"),
            "end": self.end_time.strftime("%H:%M"),
            "durationMinutes": self.duration,
            "status": self.status,
            "sample": self.is_sample,
        }
