from datetime import datetime, date
from flask import Blueprint, request, jsonify
from sqlalchemy import func

from app.extensions import db
from app.models.booking import Booking
from app.utils.helpers import role_required, error_response

admin_bp = Blueprint("admin", __name__)


# GET /api/v1/admin/stats 

@admin_bp.route("/stats", methods=["GET"])
@role_required("admin")
def get_stats():
    total     = Booking.query.count()
    confirmed = Booking.query.filter_by(status="confirmed").count()
    pending   = Booking.query.filter_by(status="pending").count()
    cancelled = Booking.query.filter_by(status="cancelled").count()

    # Projected revenue = confirmed + pending (excludes cancelled bookings).
    # These are amounts we can realistically expect to collect.
    projected_revenue = db.session.query(
        func.coalesce(func.sum(Booking.total_estimated_cost), 0.0)
    ).filter(Booking.status != "cancelled").scalar()

    confirmed_revenue = db.session.query(
        func.coalesce(func.sum(Booking.total_estimated_cost), 0.0)
    ).filter(Booking.status == "confirmed").scalar()

    return jsonify({
        "total_bookings":    total,
        "confirmed":         confirmed,
        "pending":           pending,
        "cancelled":         cancelled,
        "projected_revenue": float(projected_revenue),
        "confirmed_revenue": float(confirmed_revenue),
    }), 200


# GET /api/v1/admin/revenue

@admin_bp.route("/revenue", methods=["GET"])
@role_required("admin")
def get_revenue():
    # Parse and validate ?months= param (default 6, min 1, max 24)
    try:
        months = int(request.args.get("months", 6))
    except (ValueError, TypeError):
        return error_response("Bad request", "months must be an integer", 400)

    if not (1 <= months <= 24):
        return error_response("Bad request", "months must be between 1 and 24", 400)

    today = date.today()

    # Build the ordered list of YYYY-MM keys we want to return
    month_keys = []
    for i in range(months - 1, -1, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        month_keys.append(f"{y:04d}-{m:02d}")

    # Start of the earliest month as a datetime for the DB filter
    earliest_key = month_keys[0]
    earliest_year, earliest_month = map(int, earliest_key.split("-"))
    start_dt = datetime(earliest_year, earliest_month, 1)

    # Fetch all bookings in range
    bookings = (
        Booking.query
        .filter(Booking.created_at >= start_dt)
        .all()
    )

    # Group in Python by YYYY-MM
    monthly: dict = {}
    for b in bookings:
        key = b.created_at.strftime("%Y-%m")
        if key not in monthly:
            monthly[key] = {
                "month":             key,
                "total_revenue":     0.0,   # confirmed + pending (excludes cancelled)
                "confirmed_revenue": 0.0,   # confirmed only
                "booking_count":     0,     # active bookings (excludes cancelled)
            }
        cost = b.total_estimated_cost or 0.0
        # Only confirmed and pending contribute to total (projected) revenue.
        # Cancelled bookings are excluded — they represent lost business.
        if b.status in ("confirmed", "pending"):
            monthly[key]["booking_count"] += 1
            monthly[key]["total_revenue"] += cost
        if b.status == "confirmed":
            monthly[key]["confirmed_revenue"] += cost

    # Build final list — include every month in range, zeroing out empty ones.
    # avg_per_booking is based on total_revenue (projected) divided by
    # non-cancelled booking count so it reflects expected value per active booking.
    result = []
    for key in month_keys:
        entry = monthly.get(key, {
            "month":             key,
            "total_revenue":     0.0,
            "confirmed_revenue": 0.0,
            "booking_count":     0,
        })
        entry["avg_per_booking"] = (
            round(entry["total_revenue"] / entry["booking_count"], 2)
            if entry["booking_count"] > 0 else 0.0
        )
        result.append(entry)

    return jsonify({"revenue": result}), 200
