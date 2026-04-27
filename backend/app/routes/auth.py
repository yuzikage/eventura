from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
)
from werkzeug.security import generate_password_hash, check_password_hash

from app.extensions import db
from app.models.user import User
from app.utils.helpers import error_response, validation_error_response

auth_bp = Blueprint("auth", __name__)


# POST /api/v1/auth/signup

@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True)

    if not data:
        return error_response("Bad request", "Request body must be JSON", 400)

    messages = {}
    for field in ("name", "email", "password", "phone"):
        if not data.get(field):
            messages[field] = [f"{field.capitalize()} is required"]
    if messages:
        return validation_error_response(messages)

    if len(data["password"]) < 6:
        return validation_error_response({"password": ["Password must be at least 6 characters"]})

    if User.query.filter_by(email=data["email"].lower().strip()).first():
        return error_response("Conflict", "An account with this email already exists", 409)

    user = User(
        name=data["name"].strip(),
        email=data["email"].lower().strip(),
        password_hash=generate_password_hash(data["password"]),
        phone=data["phone"].strip(),
        role="customer",
    )
    db.session.add(user)
    db.session.commit()

    token = _make_token(user)
    return jsonify({"token": token, "user": user.to_dict()}), 201


# POST /api/v1/auth/login 

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True)

    if not data:
        return error_response("Bad request", "Request body must be JSON", 400)

    messages = {}
    if not data.get("email"):
        messages["email"] = ["Email is required"]
    if not data.get("password"):
        messages["password"] = ["Password is required"]
    if messages:
        return validation_error_response(messages)

    user = User.query.filter_by(email=data["email"].lower().strip()).first()

    if not user or not check_password_hash(user.password_hash, data["password"]):
        return error_response("Unauthorized", "Invalid email or password", 401)

    token = _make_token(user)
    return jsonify({"token": token, "user": user.to_dict()}), 200


# GET /api/v1/auth/me 

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    # identity is now a plain string (user.id) — no dict, no type issues
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return error_response("Not found", "User not found", 404)

    return jsonify(user.to_dict()), 200


# Private helpers 

def _make_token(user: User) -> str:
    """
    Create a JWT where:
      - identity (sub claim) = user.id as a plain string
      - additional_claims    = name, email, role (readable via get_jwt())

    Flask-JWT-Extended 4.x requires identity to be a scalar (str/int).
    Passing a dict as identity causes 'Invalid token' on decode in 4.x.
    Role etc. are stored in additional_claims instead.
    """
    additional_claims = {
        "name":  user.name,
        "email": user.email,
        "role":  user.role,
    }
    return create_access_token(
        identity=str(user.id),
        additional_claims=additional_claims,
    )