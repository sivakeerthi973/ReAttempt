from datetime import datetime

from flask import Blueprint, g, jsonify, request
from sqlalchemy.exc import IntegrityError

from extensions import db
from models import Backlog, StudyTask
from services.auth import login_required
from services.validation import (
    ApiValidationError,
    json_object,
    required_text,
    validate_date,
    validate_time,
)

task_api = Blueprint("task_api", __name__, url_prefix="/api/tasks")
STATUSES = {"Planned", "In progress", "Completed"}


def _integer_id(value, label):
    try:
        result = int(value)
    except (TypeError, ValueError) as error:
        raise ApiValidationError(f"{label} is invalid.") from error
    if result < 1:
        raise ApiValidationError(f"{label} is invalid.")
    return result


def _task_values(data):
    title = required_text(data.get("title"), "Study focus", 180)
    subject_id = _integer_id(data.get("subjectId", data.get("subject")), "Subject")
    backlog = Backlog.query.filter_by(id=subject_id, user_id=g.current_user.id).first()
    if backlog is None:
        raise ApiValidationError("Choose one of your backlog subjects.")
    study_date = validate_date(data.get("date"), "Study date")
    start = validate_time(data.get("start"), "Start time")
    end = validate_time(data.get("end"), "End time")
    if end <= start:
        raise ApiValidationError("End time must be later than start time.")
    status = data.get("status", "Planned")
    if not isinstance(status, str) or status not in STATUSES:
        raise ApiValidationError("Choose a valid study task status.")
    duration = int((datetime.combine(study_date, end) - datetime.combine(study_date, start)).total_seconds() // 60)
    return {
        "backlog": backlog,
        "title": title,
        "study_date": study_date,
        "start_time": start,
        "end_time": end,
        "duration": duration,
        "status": status,
    }


def _owned_task(task_id):
    return StudyTask.query.filter_by(id=task_id, user_id=g.current_user.id).first_or_404(
        description="Study task not found."
    )


@task_api.get("")
@login_required
def list_tasks():
    query = StudyTask.query.filter_by(user_id=g.current_user.id)
    date_filter = request.args.get("date")
    subject_filter = request.args.get("subjectId")
    status_filter = request.args.get("status")
    if date_filter:
        query = query.filter_by(study_date=validate_date(date_filter, "Date filter"))
    if subject_filter and subject_filter != "all":
        query = query.filter_by(backlog_id=_integer_id(subject_filter, "Subject filter"))
    if status_filter and status_filter != "all":
        if status_filter not in STATUSES:
            raise ApiValidationError("Choose a valid study task status filter.")
        query = query.filter_by(status=status_filter)
    records = query.order_by(StudyTask.study_date, StudyTask.start_time, StudyTask.id).all()
    return jsonify(items=[record.to_dict() for record in records])


@task_api.post("")
@login_required
def create_task():
    values = _task_values(json_object(request))
    duplicate = StudyTask.query.filter_by(
        user_id=g.current_user.id,
        backlog_id=values["backlog"].id,
        study_date=values["study_date"],
        start_time=values["start_time"],
        title=values["title"],
    ).first()
    if duplicate:
        return jsonify(error="duplicate_task", message="That study task is already on your planner."), 409
    task = StudyTask(user_id=g.current_user.id, **values)
    try:
        db.session.add(task)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error="invalid_task", message="The study task could not be saved."), 400
    return jsonify(item=task.to_dict()), 201


@task_api.get("/<int:task_id>")
@login_required
def get_task(task_id):
    return jsonify(item=_owned_task(task_id).to_dict())


@task_api.put("/<int:task_id>")
@login_required
def update_task(task_id):
    task = _owned_task(task_id)
    values = _task_values(json_object(request))
    duplicate = StudyTask.query.filter(
        StudyTask.user_id == g.current_user.id,
        StudyTask.id != task.id,
        StudyTask.backlog_id == values["backlog"].id,
        StudyTask.study_date == values["study_date"],
        StudyTask.start_time == values["start_time"],
        StudyTask.title == values["title"],
    ).first()
    if duplicate:
        return jsonify(error="duplicate_task", message="That study task is already on your planner."), 409
    for key, value in values.items():
        setattr(task, key, value)
    db.session.commit()
    return jsonify(item=task.to_dict())


@task_api.patch("/<int:task_id>/complete")
@login_required
def complete_task(task_id):
    task = _owned_task(task_id)
    task.status = "Completed"
    db.session.commit()
    return jsonify(item=task.to_dict())


@task_api.delete("/<int:task_id>")
@login_required
def delete_task(task_id):
    db.session.delete(_owned_task(task_id))
    db.session.commit()
    return jsonify(message="Study task deleted.")
