from flask import Blueprint, g, jsonify, request
from sqlalchemy.exc import IntegrityError

from extensions import db
from models import Backlog
from services.auth import login_required
from services.validation import (
    ApiValidationError,
    json_object,
    optional_text,
    required_text,
    validate_date,
    validate_semester,
)

backlog_api = Blueprint("backlog_api", __name__, url_prefix="/api/backlogs")
STATUSES = {"Not started", "In progress", "Completed"}


def _number(value, label, minimum, maximum):
    if isinstance(value, bool):
        raise ApiValidationError(f"{label} must be a whole number.")
    try:
        number = int(value)
    except (TypeError, ValueError) as error:
        raise ApiValidationError(f"{label} must be a whole number.") from error
    if str(value).strip() != str(number) or not minimum <= number <= maximum:
        raise ApiValidationError(f"{label} must be between {minimum} and {maximum}.")
    return number


def _text_list(value, label):
    if value is None:
        return []
    if not isinstance(value, list) or len(value) > 100:
        raise ApiValidationError(f"{label} must be a list of at most 100 topics.")
    return [required_text(topic, label, 120) for topic in value]


def _backlog_values(data):
    status = data.get("status", "Not started")
    if status not in STATUSES:
        raise ApiValidationError("Choose a valid preparation status.")
    progress = _number(data.get("progress", 0), "Preparation progress", 0, 100)
    if status == "Completed":
        progress = 100
    elif progress == 100:
        status = "Completed"
    return {
        "subject_name": required_text(data.get("name"), "Subject name", 120),
        "subject_code": required_text(data.get("code"), "Subject code", 40).upper(),
        "semester": validate_semester(data.get("semester")),
        "attempts": _number(data.get("attempts", 1), "Attempts", 1, 20),
        "status": status,
        "progress": progress,
        "exam_date": validate_date(data.get("examDate"), "Exam date", optional=True),
        "topics_done": _text_list(data.get("topicsDone"), "Completed topic"),
        "topics_pending": _text_list(data.get("topicsPending"), "Pending topic"),
    }


def _owned_backlog(backlog_id):
    return Backlog.query.filter_by(id=backlog_id, user_id=g.current_user.id).first_or_404(
        description="Backlog subject not found."
    )


@backlog_api.get("")
@login_required
def list_backlogs():
    query = Backlog.query.filter_by(user_id=g.current_user.id)
    search = optional_text(request.args.get("search", ""), "Search", 100)
    semester = request.args.get("semester")
    status = request.args.get("status")
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            db.or_(Backlog.subject_name.ilike(pattern), Backlog.subject_code.ilike(pattern))
        )
    if semester and semester != "all":
        query = query.filter_by(semester=validate_semester(semester))
    if status and status != "all":
        if status not in STATUSES:
            raise ApiValidationError("Choose a valid preparation status filter.")
        query = query.filter_by(status=status)
    records = query.order_by(Backlog.semester, Backlog.subject_name).all()
    return jsonify(items=[record.to_dict() for record in records])


@backlog_api.post("")
@login_required
def create_backlog():
    values = _backlog_values(json_object(request))
    record = Backlog(user_id=g.current_user.id, **values)
    try:
        db.session.add(record)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error="duplicate_subject", message="A subject with that code already exists."), 409
    return jsonify(item=record.to_dict()), 201


@backlog_api.get("/<int:backlog_id>")
@login_required
def get_backlog(backlog_id):
    return jsonify(item=_owned_backlog(backlog_id).to_dict())


@backlog_api.put("/<int:backlog_id>")
@login_required
def update_backlog(backlog_id):
    record = _owned_backlog(backlog_id)
    values = _backlog_values(json_object(request))
    for key, value in values.items():
        setattr(record, key, value)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error="duplicate_subject", message="A subject with that code already exists."), 409
    return jsonify(item=record.to_dict())


@backlog_api.delete("/<int:backlog_id>")
@login_required
def delete_backlog(backlog_id):
    record = _owned_backlog(backlog_id)
    db.session.delete(record)
    db.session.commit()
    return jsonify(message="Backlog subject deleted.")
