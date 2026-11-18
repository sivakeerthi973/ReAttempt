from flask import Blueprint, g, jsonify, request
from sqlalchemy import or_

from extensions import db
from models import Backlog, StudyMaterial
from services.auth import login_required
from services.validation import (
    ApiValidationError,
    json_object,
    optional_text,
    required_text,
    validate_url,
)

material_api = Blueprint("material_api", __name__, url_prefix="/api/materials")
MATERIAL_TYPES = {"Notes", "Question paper", "Important topics", "Reference"}


def _subject_for_user(subject_id):
    try:
        identifier = int(subject_id)
    except (TypeError, ValueError) as error:
        raise ApiValidationError("Choose one of your backlog subjects.") from error
    backlog = Backlog.query.filter_by(id=identifier, user_id=g.current_user.id).first()
    if backlog is None:
        raise ApiValidationError("Choose one of your backlog subjects.")
    return backlog


def _material_values(data):
    title = required_text(data.get("title"), "Resource title", 120)
    material_type = data.get("type", data.get("materialType"))
    if not isinstance(material_type, str) or material_type not in MATERIAL_TYPES:
        raise ApiValidationError("Choose a valid study material type.")
    backlog = _subject_for_user(data.get("subjectId"))
    url = validate_url(data.get("url"))
    description = optional_text(data.get("description", ""), "Description", 240)
    return {
        "backlog": backlog,
        "subject": backlog.subject_name,
        "title": title,
        "material_type": material_type,
        "url": url,
        "description": description,
    }


def _owned_custom_material(material_id):
    return StudyMaterial.query.filter_by(
        id=material_id, user_id=g.current_user.id, is_sample=False
    ).first_or_404(description="Custom study resource not found.")


def _duplicate_url(url, exclude_id=None):
    query = StudyMaterial.query.filter_by(user_id=g.current_user.id, url=url)
    if exclude_id is not None:
        query = query.filter(StudyMaterial.id != exclude_id)
    return query.first() is not None


@material_api.get("")
@login_required
def list_materials():
    query = StudyMaterial.query.filter(
        or_(StudyMaterial.user_id.is_(None), StudyMaterial.user_id == g.current_user.id)
    )
    search = optional_text(request.args.get("search", ""), "Search", 100)
    subject_id = request.args.get("subjectId")
    material_type = request.args.get("type")
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                StudyMaterial.title.ilike(pattern),
                StudyMaterial.description.ilike(pattern),
                StudyMaterial.subject.ilike(pattern),
            )
        )
    if subject_id and subject_id != "all":
        backlog = _subject_for_user(subject_id)
        query = query.filter(StudyMaterial.backlog_id == backlog.id)
    if material_type and material_type != "all":
        if material_type not in MATERIAL_TYPES:
            raise ApiValidationError("Choose a valid study material type filter.")
        query = query.filter_by(material_type=material_type)
    records = query.order_by(StudyMaterial.created_at.desc(), StudyMaterial.id).all()
    return jsonify(items=[record.to_dict() for record in records])


@material_api.post("")
@login_required
def create_material():
    values = _material_values(json_object(request))
    if _duplicate_url(values["url"]):
        return jsonify(error="duplicate_url", message="That resource link is already saved."), 409
    record = StudyMaterial(
        user_id=g.current_user.id,
        backlog=values.pop("backlog"),
        is_sample=False,
        **values,
    )
    db.session.add(record)
    db.session.commit()
    return jsonify(item=record.to_dict()), 201


@material_api.put("/<int:material_id>")
@login_required
def update_material(material_id):
    record = _owned_custom_material(material_id)
    values = _material_values(json_object(request))
    if _duplicate_url(values["url"], exclude_id=record.id):
        return jsonify(error="duplicate_url", message="That resource link is already saved."), 409
    record.backlog = values.pop("backlog")
    for key, value in values.items():
        setattr(record, key, value)
    db.session.commit()
    return jsonify(item=record.to_dict())


@material_api.delete("/<int:material_id>")
@login_required
def delete_material(material_id):
    db.session.delete(_owned_custom_material(material_id))
    db.session.commit()
    return jsonify(message="Study resource deleted.")
