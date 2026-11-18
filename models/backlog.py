from datetime import datetime, timezone

from extensions import db


class Backlog(db.Model):
    __tablename__ = "backlogs"
    __table_args__ = (
        db.UniqueConstraint("user_id", "subject_code", name="uq_backlog_user_subject_code"),
        db.CheckConstraint("attempts >= 1", name="ck_backlog_attempts_positive"),
        db.CheckConstraint("progress >= 0 AND progress <= 100", name="ck_backlog_progress_range"),
        db.Index("ix_backlog_user_semester_status", "user_id", "semester", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subject_name = db.Column(db.String(120), nullable=False)
    subject_code = db.Column(db.String(40), nullable=False)
    semester = db.Column(db.String(20), nullable=False)
    attempts = db.Column(db.Integer, nullable=False, default=1)
    status = db.Column(db.String(20), nullable=False, default="Not started")
    progress = db.Column(db.Integer, nullable=False, default=0)
    exam_date = db.Column(db.Date, nullable=True)
    topics_done = db.Column(db.JSON, nullable=False, default=list)
    topics_pending = db.Column(db.JSON, nullable=False, default=list)
    is_sample = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    user = db.relationship("User", back_populates="backlogs")
    tasks = db.relationship(
        "StudyTask", back_populates="backlog", cascade="all, delete-orphan", passive_deletes=True
    )
    materials = db.relationship("StudyMaterial", back_populates="backlog")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.subject_name,
            "code": self.subject_code,
            "semester": self.semester,
            "attempts": self.attempts,
            "status": self.status,
            "progress": self.progress,
            "examDate": self.exam_date.isoformat() if self.exam_date else "",
            "topicsDone": self.topics_done or [],
            "topicsPending": self.topics_pending or [],
            "sample": self.is_sample,
        }
