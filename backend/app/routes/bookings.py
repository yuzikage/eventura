from datetime import date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from app.extensions import db
from app.models.booking import Booking
from app.utils.helpers import role_required, error_response, validation_error_response

bookings_bp = Blueprint("bookings", __name__)

VALID_STATUSES = {"pending", "confirmed", "cancelled"}


# POST /api/v1/bookings  (customer only) 

@bookings_bp.route("", methods=["POST"])
@role_required("customer")
def create_booking():
    data = request.get_json(silent=True)
    if not data:
        return error_response("Bad request", "Request body must be JSON", 400)

    errors = _validate_booking(data)
    if errors:
        return validation_error_response(errors)

    # Parse event_date string → Python date object
    try:
        event_date = date.fromisoformat(data["event_date"])
    except ValueError:
        return validation_error_response(
            {"event_date": ["Date must be in YYYY-MM-DD format"]}
        )

    # Parse meeting_date string → Python date object
    try:
        meeting_date = date.fromisoformat(data["meeting_date"])
    except ValueError:
        return validation_error_response(
            {"meeting_date": ["Date must be in YYYY-MM-DD format"]}
        )

    # Venue conflict check — same venue booked for the same EVENT DATE.
    # Cancelled bookings are excluded: cancelling frees the date for rebooking.
    # Meeting date/time carries no uniqueness constraint.
    conflict = (
        Booking.query
        .filter_by(venue_id=data["venue_id"], event_date=event_date)
        .filter(Booking.status != "cancelled")
        .first()
    )
    if conflict:
        return error_response(
            "Conflict",
            "This venue is already booked for an event on that date. "
            "Please choose a different date for your event.",
            409,
        )

    user_id = get_jwt_identity()

    booking = Booking(
        user_id=user_id,
        event_type_id=data.get("event_type_id"),
        venue_id=data["venue_id"],
        theme_id=data.get("theme_id"),
        guest_count=int(data["guest_count"]),
        event_package_id=data["event_package_id"],
        photography_package_id=data["photography_package_id"],
        catering_package_id=data["catering_package_id"],
        event_date=event_date,
        meeting_date=meeting_date,
        meeting_time=data["meeting_time"],
        meeting_notes=data.get("meeting_notes", ""),
        total_estimated_cost=float(data["total_estimated_cost"])
            if data.get("total_estimated_cost") is not None else None,
        status="pending",
    )
    db.session.add(booking)
    db.session.commit()
    return jsonify(booking.to_dict()), 201


# GET /api/v1/bookings/my  (customer only)

@bookings_bp.route("/my", methods=["GET"])
@role_required("customer")
def get_my_bookings():
    user_id = get_jwt_identity()
    bookings = (
        Booking.query
        .filter_by(user_id=user_id)
        .order_by(Booking.created_at.desc())
        .all()
    )
    return jsonify({"bookings": [b.to_dict() for b in bookings]}), 200


# GET /api/v1/bookings/all  (manager, admin)

@bookings_bp.route("/all", methods=["GET"])
@role_required("manager", "admin")
def get_all_bookings():
    status_filter = request.args.get("status")

    query = Booking.query
    if status_filter:
        if status_filter not in VALID_STATUSES:
            return validation_error_response(
                {"status": [f"Must be one of: {', '.join(sorted(VALID_STATUSES))}"]}
            )
        query = query.filter_by(status=status_filter)

    bookings = query.order_by(Booking.created_at.desc()).all()
    return jsonify({"bookings": [b.to_dict_full() for b in bookings]}), 200


# GET /api/v1/bookings/conflicts  (manager, admin)

@bookings_bp.route("/conflicts", methods=["GET"])
@role_required("manager", "admin")
def get_conflicts():
    # Find all (venue_id, event_date) pairs that have more than one booking.
    # This represents a genuine double-booking: two events at the same venue
    # on the same day. Meeting date/time is irrelevant here.
    from sqlalchemy import func
    # Only non-cancelled bookings count toward conflicts.
    conflict_pairs = (
        db.session.query(Booking.venue_id, Booking.event_date)
        .filter(Booking.event_date.isnot(None))
        .filter(Booking.status != "cancelled")
        .group_by(Booking.venue_id, Booking.event_date)
        .having(func.count(Booking.id) > 1)
        .all()
    )

    result = []
    for venue_id, event_date in conflict_pairs:
        bookings = (
            Booking.query
            .filter_by(venue_id=venue_id, event_date=event_date)
            .filter(Booking.status != "cancelled")
            .all()
        )

        venue_name = bookings[0].venue.name if bookings[0].venue else venue_id

        result.append({
            "venue":    venue_name,
            "date":     event_date.isoformat(),
            "bookings": [b.to_dict_full() for b in bookings],
        })

    return jsonify({"conflicts": result}), 200




# GET /api/v1/bookings/slots  (authenticated)
# Returns time slots already taken for a given venue + meeting_date combination.
# Used by the frontend to disable slots that are already booked.
# Query params: venue_id (required), meeting_date (required, YYYY-MM-DD)

@bookings_bp.route("/slots", methods=["GET"])
@jwt_required()
def get_booked_slots():
    venue_id     = request.args.get("venue_id")
    meeting_date = request.args.get("meeting_date")

    if not venue_id or not meeting_date:
        return error_response("Bad request", "venue_id and meeting_date are required", 400)

    try:
        parsed_date = date.fromisoformat(meeting_date)
    except ValueError:
        return error_response("Bad request", "meeting_date must be in YYYY-MM-DD format", 400)

    # Only active (non-cancelled) bookings occupy a slot
    bookings = (
        Booking.query
        .filter_by(venue_id=venue_id, meeting_date=parsed_date)
        .filter(Booking.status != "cancelled")
        .all()
    )
    taken_slots = [b.meeting_time for b in bookings if b.meeting_time]
    return jsonify({"taken_slots": taken_slots}), 200

# GET /api/v1/bookings/<booking_id>  (customer own, manager, admin)

@bookings_bp.route("/<booking_id>", methods=["GET"])
@jwt_required()
def get_booking(booking_id):
    booking = Booking.query.get(booking_id)
    if not booking:
        return error_response(
            "Not found", f"Booking with id {booking_id} does not exist", 404
        )

    claims  = get_jwt()
    role    = claims.get("role")
    user_id = get_jwt_identity()

    if role == "customer" and booking.user_id != user_id:
        return error_response(
            "Forbidden", "You do not have permission to view this booking", 403
        )

    return jsonify(booking.to_dict_full()), 200


# PATCH /api/v1/bookings/<booking_id>/status  (manager, admin)

@bookings_bp.route("/<booking_id>/status", methods=["PATCH"])
@role_required("manager", "admin")
def update_booking_status(booking_id):
    booking = Booking.query.get(booking_id)
    if not booking:
        return error_response(
            "Not found", f"Booking with id {booking_id} does not exist", 404
        )

    data = request.get_json(silent=True)
    if not data:
        return error_response("Bad request", "Request body must be JSON", 400)

    new_status = data.get("status")
    if not new_status or new_status not in VALID_STATUSES:
        return validation_error_response(
            {"status": ["Must be one of: pending, confirmed, cancelled"]}
        )

    booking.status = new_status
    db.session.commit()
    return jsonify(booking.to_dict_full()), 200


# Private helpers

def _validate_booking(data: dict) -> dict:
    errors = {}
    required = {
        "venue_id":               "A venue must be selected",
        "theme_id":               "A theme must be selected",
        "guest_count":            "Guest count is required for cost calculation",
        "event_package_id":       "An event package must be selected",
        "photography_package_id": "A photography package must be selected",
        "catering_package_id":    "A catering package must be selected",
        "event_date":             "Please select a date for your event",
        "meeting_date":           "Please select a date for the manager meeting",
        "meeting_time":           "Please select a time for the manager meeting",
    }
    for field, message in required.items():
        if not data.get(field):
            errors[field] = [message]

    if not errors.get("guest_count") and data.get("guest_count"):
        try:
            if int(data["guest_count"]) <= 0:
                errors["guest_count"] = ["Guest count must be a positive number"]
        except (ValueError, TypeError):
            errors["guest_count"] = ["Guest count must be a positive number"]

    return errors
