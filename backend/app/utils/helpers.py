import random
import string
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, get_jwt, verify_jwt_in_request


def generate_booking_reference():
    """Generates a unique human-readable booking reference e.g. EVT-A3F2K"""
    chars = string.ascii_uppercase + string.digits
    suffix = ''.join(random.choices(chars, k=5))
    return f"EVT-{suffix}"


def role_required(*roles):
    """
    Decorator to protect routes by user role.

    Works with the token structure from auth.py:
      - identity (sub) = user.id  (plain string)
      - role stored in additional_claims, readable via get_jwt()

    Usage:
        @role_required("admin")
        @role_required("manager", "admin")
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()                    # reads additional_claims
            if claims.get("role") not in roles:
                return jsonify({
                    "error": "Forbidden",
                    "message": "You do not have permission to perform this action"
                }), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def success_response(data, status_code=200):
    """Standard success response wrapper."""
    return jsonify(data), status_code


def error_response(error, message, status_code):
    """Standard error response wrapper."""
    return jsonify({"error": error, "message": message}), status_code


def validation_error_response(messages):
    """Standard validation error response wrapper."""
    return jsonify({"error": "Validation error", "messages": messages}), 400