from extensions import db


class UserPreferences(db.Model):
    __tablename__ = "user_preferences"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    dark_theme = db.Column(db.Boolean, nullable=False, default=False)
    notifications_enabled = db.Column(db.Boolean, nullable=False, default=True)
    weekly_recap = db.Column(db.Boolean, nullable=False, default=True)
    user = db.relationship("User", back_populates="preferences")

    def to_dict(self):
        return {
            "theme": "dark" if self.dark_theme else "light",
            "studyReminders": self.notifications_enabled,
            "weeklyRecap": self.weekly_recap,
        }
