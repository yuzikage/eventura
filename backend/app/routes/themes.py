from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models.theme import Theme
from app.models.theme_image import ThemeImage
from app.utils.helpers import role_required, error_response, validation_error_response

themes_bp = Blueprint("themes", __name__)


# GET /api/v1/themes  (active only — customers)

@themes_bp.route("", methods=["GET"])
@jwt_required()
def get_active_themes():
    themes = Theme.query.filter_by(is_active=True).all()
    return jsonify({"themes": [t.to_dict() for t in themes]}), 200


# GET /api/v1/themes/all  (all — admin)

@themes_bp.route("/all", methods=["GET"])
@role_required("admin")
def get_all_themes():
    themes = Theme.query.all()
    return jsonify({"themes": [t.to_dict() for t in themes]}), 200


# POST /api/v1/themes  (admin)

@themes_bp.route("", methods=["POST"])
@role_required("admin")
def create_theme():
    data = request.get_json(silent=True)
    if not data:
        return error_response("Bad request", "Request body must be JSON", 400)

    errors = _validate_theme(data)
    if errors:
        return validation_error_response(errors)

    theme = Theme(
        id=data.get("id") or _generate_theme_id(data["name"]),
        name=data["name"].strip(),
        description=data.get("description", "").strip(),
        is_active=data.get("is_active", True),
    )
    db.session.add(theme)
    db.session.flush()   # get theme.id into session before inserting images

    _replace_images(theme.id, data.get("images", []))

    db.session.commit()
    return jsonify(theme.to_dict()), 201


# PUT /api/v1/themes/<theme_id>  (admin)

@themes_bp.route("/<theme_id>", methods=["PUT"])
@role_required("admin")
def update_theme(theme_id):
    theme = Theme.query.get(theme_id)
    if not theme:
        return error_response("Not found", f"Theme with id {theme_id} does not exist", 404)

    data = request.get_json(silent=True)
    if not data:
        return error_response("Bad request", "Request body must be JSON", 400)

    errors = _validate_theme(data)
    if errors:
        return validation_error_response(errors)

    theme.name        = data["name"].strip()
    theme.description = data.get("description", theme.description)
    theme.is_active   = data.get("is_active", theme.is_active)

    # Replace all images — delete existing, insert new list
    _replace_images(theme.id, data.get("images", []))

    db.session.commit()
    return jsonify(theme.to_dict()), 200


# DELETE /api/v1/themes/<theme_id>  (admin)

@themes_bp.route("/<theme_id>", methods=["DELETE"])
@role_required("admin")
def delete_theme(theme_id):
    theme = Theme.query.get(theme_id)
    if not theme:
        return error_response("Not found", f"Theme with id {theme_id} does not exist", 404)

    # cascade='all, delete-orphan' on Theme.images handles ThemeImage deletion
    db.session.delete(theme)
    db.session.commit()
    return jsonify({"message": "Theme deleted successfully"}), 200


# Private helpers 

def _validate_theme(data: dict) -> dict:
    errors = {}
    if not data.get("name") or not str(data["name"]).strip():
        errors["name"] = ["Theme name is required"]
    return errors


def _replace_images(theme_id: str, image_urls: list):
    """Delete all existing ThemeImage rows for theme_id, then insert new ones."""
    ThemeImage.query.filter_by(theme_id=theme_id).delete()
    for order, url in enumerate(image_urls):
        if url and str(url).strip():
            db.session.add(ThemeImage(
                theme_id=theme_id,
                image_url=str(url).strip(),
                display_order=order,
            ))


def _generate_theme_id(name: str) -> str:
    import re
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower().strip()).strip("-")
    return f"t-{slug[:40]}"
