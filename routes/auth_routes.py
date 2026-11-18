from flask import Blueprint, current_app, jsonify, request, session
from flask_wtf.csrf import generate_csrf
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

from extensions import db
from models import User
from services.auth import current_user
from services.sample_data import seed_account_data
from services.validation import (
    ApiValidationError,
    json_object,
    optional_text,
    required_text,
    validate_email,
    validate_bool,
    validate_password,
    validate_semester,
    validate_year,
)

auth_api = Blueprint("auth_api", __name__, url_prefix="/api/auth")


@auth_api.get("/csrf-token")
def csrf_token():
    return jsonify(csrfToken=generate_csrf())


@auth_api.get("/me")
def me():
    user = current_user()
    if user is None:
        return jsonify(error="authentication_required", message="Sign in to continue."), 401
    return jsonify(user=user.to_dict())


@auth_api.post("/register")
def register():
    data = json_object(request)
    email = validate_email(data.get("email"))
    if User.query.filter_by(email=email).first():
        return jsonify(error="email_exists", message="An account already uses this email address."), 409
    password = validate_password(data.get("password"))
    remember = validate_bool(data.get("remember", True), "Remember me preference")
    confirmation = data.get("confirmPassword")
    if confirmation != password:
        raise ApiValidationError("Password and confirmation do not match.")

    user = User(
        full_name=required_text(data.get("fullName"), "Full name", 120, 2),
        email=email,
        password_hash=generate_password_hash(password, method="scrypt"),
        college=required_text(data.get("college"), "College name", 180),
        course=required_text(data.get("course"), "Course", 100),
        department=required_text(data.get("department"), "Department", 120),
        year=validate_year(data.get("year")),
        semester=validate_semester(data.get("semester")),
    )
    try:
        db.session.add(user)
        db.session.flush()
        seed_account_data(user)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error="email_exists", message="An account already uses this email address."), 409
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Account registration failed.")
        raise

    session.clear()
    session.permanent = remember
    session["user_id"] = user.id
    return jsonify(user=user.to_dict()), 201


@auth_api.post("/login")
def login():
    data = json_object(request)
    email = validate_email(data.get("email"))
    password = validate_password(data.get("password"), minimum=1)
    remember = validate_bool(data.get("remember", True), "Remember me preference")
    user = User.query.filter_by(email=email).first()
    if user is None or not check_password_hash(user.password_hash, password):
        return jsonify(error="invalid_credentials", message="Email or password is incorrect."), 401

    session.clear()
    session.permanent = remember
    session["user_id"] = user.id
    return jsonify(user=user.to_dict())


@auth_api.post("/logout")
def logout():
    session.clear()
    return jsonify(message="You have been signed out.")
