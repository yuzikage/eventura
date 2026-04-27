from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models.packages import EventPackage, PhotographyPackage, CateringPackage
from app.utils.helpers import role_required, error_response, validation_error_response

packages_bp = Blueprint("packages", __name__)


# Event Packages  —  /api/v1/packages/events

@packages_bp.route("/events", methods=["GET"])
@jwt_required()
def get_event_packages():
    packages = EventPackage.query.filter_by(is_active=True).all()
    return jsonify({"packages": [p.to_dict() for p in packages]}), 200


@packages_bp.route("/events", methods=["POST"])
@role_required("admin")
def create_event_package():
    data = request.get_json(silent=True)
    if not data:
        return error_response("Bad request", "Request body must be JSON", 400)

    errors = _validate_price_package(data)
    if errors:
        return validation_error_response(errors)

    pkg = EventPackage(
        id=data.get("id") or _gen_id("pk", data["label"]),
        label=data["label"].strip(),
        price=float(data["price"]),
        features=data.get("features", []),
        is_active=data.get("is_active", True),
    )
    db.session.add(pkg)
    db.session.commit()
    return jsonify(pkg.to_dict()), 201


@packages_bp.route("/events/<package_id>", methods=["PUT"])
@role_required("admin")
def update_event_package(package_id):
    pkg = EventPackage.query.get(package_id)
    if not pkg:
        return error_response("Not found", f"Package with id {package_id} does not exist", 404)

    data = request.get_json(silent=True)
    if not data:
        return error_response("Bad request", "Request body must be JSON", 400)

    errors = _validate_price_package(data)
    if errors:
        return validation_error_response(errors)

    pkg.label     = data["label"].strip()
    pkg.price     = float(data["price"])
    pkg.features  = data.get("features", pkg.features)
    pkg.is_active = data.get("is_active", pkg.is_active)
    db.session.commit()
    return jsonify(pkg.to_dict()), 200


@packages_bp.route("/events/<package_id>", methods=["DELETE"])
@role_required("admin")
def delete_event_package(package_id):
    pkg = EventPackage.query.get(package_id)
    if not pkg:
        return error_response("Not found", f"Package with id {package_id} does not exist", 404)
    db.session.delete(pkg)
    db.session.commit()
    return jsonify({"message": "Package deleted successfully"}), 200



# Photography Packages  —  /api/v1/packages/photography

@packages_bp.route("/photography", methods=["GET"])
@jwt_required()
def get_photography_packages():
    packages = PhotographyPackage.query.filter_by(is_active=True).all()
    return jsonify({"packages": [p.to_dict() for p in packages]}), 200


@packages_bp.route("/photography", methods=["POST"])
@role_required("admin")
def create_photography_package():
    data = request.get_json(silent=True)
    if not data:
        return error_response("Bad request", "Request body must be JSON", 400)

    errors = _validate_price_package(data)
    if errors:
        return validation_error_response(errors)

    pkg = PhotographyPackage(
        id=data.get("id") or _gen_id("ph", data["label"]),
        label=data["label"].strip(),
        price=float(data["price"]),
        features=data.get("features", []),
        is_active=data.get("is_active", True),
    )
    db.session.add(pkg)
    db.session.commit()
    return jsonify(pkg.to_dict()), 201


@packages_bp.route("/photography/<package_id>", methods=["PUT"])
@role_required("admin")
def update_photography_package(package_id):
    pkg = PhotographyPackage.query.get(package_id)
    if not pkg:
        return error_response("Not found", f"Package with id {package_id} does not exist", 404)

    data = request.get_json(silent=True)
    if not data:
        return error_response("Bad request", "Request body must be JSON", 400)

    errors = _validate_price_package(data)
    if errors:
        return validation_error_response(errors)

    pkg.label     = data["label"].strip()
    pkg.price     = float(data["price"])
    pkg.features  = data.get("features", pkg.features)
    pkg.is_active = data.get("is_active", pkg.is_active)
    db.session.commit()
    return jsonify(pkg.to_dict()), 200


@packages_bp.route("/photography/<package_id>", methods=["DELETE"])
@role_required("admin")
def delete_photography_package(package_id):
    pkg = PhotographyPackage.query.get(package_id)
    if not pkg:
        return error_response("Not found", f"Package with id {package_id} does not exist", 404)
    db.session.delete(pkg)
    db.session.commit()
    return jsonify({"message": "Package deleted successfully"}), 200



# Catering Packages  —  /api/v1/packages/catering

@packages_bp.route("/catering", methods=["GET"])
@jwt_required()
def get_catering_packages():
    packages = CateringPackage.query.filter_by(is_active=True).all()
    return jsonify({"packages": [p.to_dict() for p in packages]}), 200


@packages_bp.route("/catering", methods=["POST"])
@role_required("admin")
def create_catering_package():
    data = request.get_json(silent=True)
    if not data:
        return error_response("Bad request", "Request body must be JSON", 400)

    errors = _validate_catering_package(data)
    if errors:
        return validation_error_response(errors)

    pkg = CateringPackage(
        id=data.get("id") or _gen_id("c", data["label"]),
        label=data["label"].strip(),
        price_per_head=float(data["price_per_head"]),
        features=data.get("features", []),
        is_active=data.get("is_active", True),
    )
    db.session.add(pkg)
    db.session.commit()
    return jsonify(pkg.to_dict()), 201


@packages_bp.route("/catering/<package_id>", methods=["PUT"])
@role_required("admin")
def update_catering_package(package_id):
    pkg = CateringPackage.query.get(package_id)
    if not pkg:
        return error_response("Not found", f"Package with id {package_id} does not exist", 404)

    data = request.get_json(silent=True)
    if not data:
        return error_response("Bad request", "Request body must be JSON", 400)

    errors = _validate_catering_package(data)
    if errors:
        return validation_error_response(errors)

    pkg.label         = data["label"].strip()
    pkg.price_per_head = float(data["price_per_head"])
    pkg.features      = data.get("features", pkg.features)
    pkg.is_active     = data.get("is_active", pkg.is_active)
    db.session.commit()
    return jsonify(pkg.to_dict()), 200


@packages_bp.route("/catering/<package_id>", methods=["DELETE"])
@role_required("admin")
def delete_catering_package(package_id):
    pkg = CateringPackage.query.get(package_id)
    if not pkg:
        return error_response("Not found", f"Package with id {package_id} does not exist", 404)
    db.session.delete(pkg)
    db.session.commit()
    return jsonify({"message": "Package deleted successfully"}), 200


# Private helpers

def _validate_price_package(data: dict) -> dict:
    """Validates label + price for event and photography packages."""
    errors = {}
    if not data.get("label") or not str(data["label"]).strip():
        errors["label"] = ["Package label is required"]
    if data.get("price") is None:
        errors["price"] = ["Price must be a positive number"]
    else:
        try:
            if float(data["price"]) < 0:
                errors["price"] = ["Price must be a positive number"]
        except (ValueError, TypeError):
            errors["price"] = ["Price must be a positive number"]
    return errors


def _validate_catering_package(data: dict) -> dict:
    """Validates label + price_per_head for catering packages."""
    errors = {}
    if not data.get("label") or not str(data["label"]).strip():
        errors["label"] = ["Package label is required"]
    if data.get("price_per_head") is None:
        errors["price_per_head"] = ["Price per head is required for catering packages"]
    else:
        try:
            if float(data["price_per_head"]) < 0:
                errors["price_per_head"] = ["Price per head is required for catering packages"]
        except (ValueError, TypeError):
            errors["price_per_head"] = ["Price per head is required for catering packages"]
    return errors


def _gen_id(prefix: str, label: str) -> str:
    import re
    slug = re.sub(r"[^a-z0-9]+", "-", label.lower().strip()).strip("-")
    return f"{prefix}-{slug[:40]}"
