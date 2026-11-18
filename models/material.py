from datetime import datetime, timezone

from extensions import db


class StudyMaterial(db.Model):
    __tablename__ = "study_materials"
    __table_args__ = (
        db.Index("ix_material_user_subject_type", "user_id", "subject", "material_type"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    backlog_id = db.Column(
        db.Integer, db.ForeignKey("backlogs.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title = db.Column(db.String(120), nullable=False)
    subject = db.Column(db.String(120), nullable=False)
    material_type = db.Column(db.String(30), nullable=False)
    url = db.Column(db.String(2048), nullable=True)
    description = db.Column(db.String(240), nullable=False, default="")
    is_sample = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    user = db.relationship("User", back_populates="materials", foreign_keys=[user_id])
    backlog = db.relationship("Backlog", back_populates="materials")

    def to_dict(self):
        return {
            "id": self.id,
            "subjectId": self.backlog_id,
            "subject": self.subject,
            "title": self.title,
            "type": self.material_type,
            "url": self.url or "",
            "description": self.description,
            "sample": self.is_sample,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }
