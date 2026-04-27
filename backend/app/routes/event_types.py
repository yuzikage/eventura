from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.models.event_type import EventType

event_types_bp = Blueprint("event_types", __name__)


# GET /api/v1/event-types

@event_types_bp.route("", methods=["GET"])
@jwt_required()
def get_event_types():
    event_types = EventType.query.all()
    return jsonify({"event_types": [et.to_dict() for et in event_types]}), 200
