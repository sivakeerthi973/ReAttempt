from flask import Blueprint, g, jsonify, request
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

from extensions import db
from models import User, UserPreferences
from services.auth import login_required
from services.validation import (
    ApiValidationError,
    json_object,
    required_text,
    validate_bool,
    validate_email,
    validate_password,
    validate_semester,
    validate_year,
)

profile_api = Blueprint("profile_api", __name__, url_prefix="/api")


@profile_api.get("/profile")
@login_required
def get_profile():
    return jsonify(profile=g.current_user.to_dict())


@profile_api.put("/profile")
@login_required
def update_profile():
    data = json_object(request)
    user = g.current_user
    email = validate_email(data.get("email", user.email))
    duplicate = User.query.filter(User.email == email, User.id != user.id).first()
    if duplicate:
        return jsonify(error="email_exists", message="Another account already uses this email address."), 409
    user.full_name = required_text(data.get("fullName", user.full_name), "Full name", 120, 2)
    user.email = email
    user.college = required_text(data.get("college", user.college), "College name", 180)
    user.course = required_text(data.get("course", user.course), "Course", 100)
    user.department = required_text(data.get("department", user.department), "Department", 120)
    user.year = validate_year(data.get("year", user.year))
    user.semester = validate_semester(data.get("semester", user.semester))
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error="email_exists", message="Another account already uses this email address."), 409
    return jsonify(profile=user.to_dict())


@profile_api.get("/preferences")
@login_required
def get_preferences():
    preferences = g.current_user.preferences
    if preferences is None:
        preferences = UserPreferences(user_id=g.current_user.id)
        db.session.add(preferences)
        db.session.commit()
    return jsonify(preferences=preferences.to_dict())


@profile_api.put("/preferences")
@login_required
def update_preferences():
    data = json_object(request)
    preferences = g.current_user.preferences
    if preferences is None:
        preferences = UserPreferences(user_id=g.current_user.id)
        db.session.add(preferences)
    theme = data.get("theme", "dark" if preferences.dark_theme else "light")
    if theme not in {"light", "dark"}:
        raise ApiValidationError("Choose light or dark theme.")
    study_reminders = validate_bool(
        data.get("studyReminders", preferences.notifications_enabled),
        "Study reminders preference",
    )
    weekly_recap = validate_bool(
        data.get("weeklyRecap", preferences.weekly_recap),
        "Weekly recap preference",
    )
    preferences.dark_theme = theme == "dark"
    preferences.notifications_enabled = study_reminders
    preferences.weekly_recap = weekly_recap
    db.session.commit()
    return jsonify(preferences=preferences.to_dict())


@profile_api.post("/profile/password")
@login_required
def change_password():
    data = json_object(request)
    current_password = validate_password(data.get("currentPassword"), "Current password", minimum=1)
    new_password = validate_password(data.get("newPassword"), "New password")
    if data.get("confirmPassword") != new_password:
        raise ApiValidationError("New password and confirmation do not match.")
    if not check_password_hash(g.current_user.password_hash, current_password):
        return jsonify(error="invalid_password", message="Current password is incorrect."), 400
    if current_password == new_password:
        raise ApiValidationError("Choose a new password different from your current password.")
    g.current_user.password_hash = generate_password_hash(new_password, method="scrypt")
    db.session.commit()
    return jsonify(message="Password updated.")


@profile_api.delete("/account/data")
@login_required
def clear_account_data():
    user = g.current_user
    for task in list(user.tasks):
        db.session.delete(task)
    for material in list(user.materials):
        db.session.delete(material)
    for backlog in list(user.backlogs):
        db.session.delete(backlog)
    preferences = user.preferences
    if preferences:
        preferences.dark_theme = False
        preferences.notifications_enabled = True
        preferences.weekly_recap = True
    db.session.commit()
    return jsonify(message="Your saved subjects, tasks, and resources have been cleared.")
