from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models.venue import Venue
from app.utils.helpers import role_required, error_response, validation_error_response

venues_bp = Blueprint("venues", __name__)


# GET /api/v1/venues  (available only — customers)

@venues_bp.route("", methods=["GET"])
@jwt_required()
def get_available_venues():
    venues = Venue.query.filter_by(is_available=True).all()
    return jsonify({"venues": [v.to_dict() for v in venues]}), 200


# GET /api/v1/venues/all  (all — admin)

@venues_bp.route("/all", methods=["GET"])
@role_required("admin")
def get_all_venues():
    venues = Venue.query.all()
    return jsonify({"venues": [v.to_dict() for v in venues]}), 200


# POST /api/v1/venues  (admin)

@venues_bp.route("", methods=["POST"])
@role_required("admin")
def create_venue():
    data = request.get_json(silent=True)
    if not data:
        return error_response("Bad request", "Request body must be JSON", 400)

    errors = _validate_venue(data)
    if errors:
        return validation_error_response(errors)

    venue = Venue(
        id=data["id"] if data.get("id") else _generate_venue_id(data["name"]),
        name=data["name"].strip(),
        location=data.get("location", "").strip(),
        capacity=int(data["capacity"]),
        price=float(data["price"]),
        is_available=data.get("is_available", True),
    )
    db.session.add(venue)
    db.session.commit()
    return jsonify(venue.to_dict()), 201


# GET /api/v1/venues/<venue_id>

@venues_bp.route("/<venue_id>", methods=["GET"])
@jwt_required()
def get_venue(venue_id):
    venue = Venue.query.get(venue_id)
    if not venue:
        return error_response("Not found", f"Venue with id {venue_id} does not exist", 404)
    return jsonify(venue.to_dict()), 200


# PUT /api/v1/venues/<venue_id>  (admin)

@venues_bp.route("/<venue_id>", methods=["PUT"])
@role_required("admin")
def update_venue(venue_id):
    venue = Venue.query.get(venue_id)
    if not venue:
        return error_response("Not found", f"Venue with id {venue_id} does not exist", 404)

    data = request.get_json(silent=True)
    if not data:
        return error_response("Bad request", "Request body must be JSON", 400)

    errors = _validate_venue(data)
    if errors:
        return validation_error_response(errors)

    venue.name         = data["name"].strip()
    venue.location     = data.get("location", venue.location)
    venue.capacity     = int(data["capacity"])
    venue.price        = float(data["price"])
    venue.is_available = data.get("is_available", venue.is_available)

    db.session.commit()
    return jsonify(venue.to_dict()), 200


# DELETE /api/v1/venues/<venue_id>  (admin)

@venues_bp.route("/<venue_id>", methods=["DELETE"])
@role_required("admin")
def delete_venue(venue_id):
    venue = Venue.query.get(venue_id)
    if not venue:
        return error_response("Not found", f"Venue with id {venue_id} does not exist", 404)

    db.session.delete(venue)
    db.session.commit()
    return jsonify({"message": "Venue deleted successfully"}), 200


# Private helpers

def _validate_venue(data: dict) -> dict:
    """Returns a messages dict (empty = valid)."""
    errors = {}
    if not data.get("name") or not str(data["name"]).strip():
        errors["name"] = ["Venue name is required"]

    if data.get("capacity") is None:
        errors["capacity"] = ["Capacity must be a positive integer"]
    else:
        try:
            if int(data["capacity"]) <= 0:
                errors["capacity"] = ["Capacity must be a positive integer"]
        except (ValueError, TypeError):
            errors["capacity"] = ["Capacity must be a positive integer"]

    if data.get("price") is None:
        errors["price"] = ["Price must be a valid number"]
    else:
        try:
            if float(data["price"]) < 0:
                errors["price"] = ["Price must be a valid number"]
        except (ValueError, TypeError):
            errors["price"] = ["Price must be a valid number"]

    return errors


def _generate_venue_id(name: str) -> str:
    """Fallback ID from venue name — used when no id is provided in POST."""
    import re
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower().strip()).strip("-")
    return f"v-{slug[:40]}"
