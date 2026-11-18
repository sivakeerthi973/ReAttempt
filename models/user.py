from datetime import datetime, timezone

from extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(254), nullable=False, unique=True, index=True)
    password_hash = db.Column(db.String(512), nullable=False)
    college = db.Column(db.String(180), nullable=False)
    course = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(120), nullable=False)
    year = db.Column(db.String(20), nullable=False)
    semester = db.Column(db.String(20), nullable=False)
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    backlogs = db.relationship(
        "Backlog", back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    tasks = db.relationship(
        "StudyTask", back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    materials = db.relationship(
        "StudyMaterial",
        back_populates="user",
        foreign_keys="StudyMaterial.user_id",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    preferences = db.relationship(
        "UserPreferences",
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
        passive_deletes=True,
    )

    def to_dict(self):
        return {
            "id": self.id,
            "fullName": self.full_name,
            "email": self.email,
            "college": self.college,
            "course": self.course,
            "department": self.department,
            "year": self.year,
            "semester": self.semester,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }
