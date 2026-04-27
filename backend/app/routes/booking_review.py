"""
app/routes/booking_review.py

GET /api/v1/bookings/<booking_id>/review

Manager / Admin only. Returns an AI-generated review of a booking —
a short structured assessment that highlights anything worth the
manager's attention: capacity concerns, cost flags, suggested actions.

The response shape is:
{
    "summary":    "One-line overall assessment",
    "flags":      ["Flag 1", "Flag 2", ...],   # may be empty list
    "suggestion": "Recommended next action for the manager"
}
"""

import json
import anthropic

from flask import Blueprint, jsonify, current_app
from flask_jwt_extended import jwt_required

from app.models.booking import Booking
from app.utils.helpers import error_response, role_required

booking_review_bp = Blueprint("booking_review", __name__)

REVIEW_MODEL  = "claude-haiku-4-5-20251001"
MAX_TOKENS    = 400


@booking_review_bp.route("/<booking_id>/review", methods=["GET"])
@jwt_required()
@role_required("manager", "admin")
def get_booking_review(booking_id):
    booking = Booking.query.get(booking_id)
    if not booking:
        return error_response("Not found", f"Booking with id {booking_id} does not exist", 404)

    api_key = current_app.config.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return error_response("Service unavailable", "AI review is not configured on this server", 503)

    # Build a rich text summary of the booking to send to Claude
    context = _build_booking_context(booking)

    prompt = f"""You are an AI assistant helping an event manager review a booking.
Analyse the booking below and respond with ONLY a valid JSON object — no markdown,
no explanation, just the raw JSON. Use this exact shape:

{{
  "summary":    "<one sentence mentioning the booking reference, event type, and overall status>",
  "flags":      ["<specific concern with exact numbers where relevant>", ...],
  "suggestion": "<one clear recommended next action, mentioning the meeting date if present>"
}}

Rules:
- flags must be specific and include actual values from the booking data.
  Good: "Guest count of 280 is close to venue capacity of 300 — discuss seating plan."
  Bad:  "Guest count is close to venue capacity."
- Actively check for these issues:
    * Guest count within 20% of venue capacity — state both numbers explicitly
    * Event date within 14 days from today — flag as urgent with the actual date
    * Wedding or large event (150+ guests) with no meeting notes — mention guest count
    * Total estimated cost looks unusually low for the guest count and packages chosen
    * Theme name appears mismatched with event type (e.g. floral theme for corporate event)
    * Basic photography package selected for a wedding — flag by name
- If there are no concerns, return flags as an empty list [].
- summary must reference the booking reference number and event type.
- suggestion must start with a verb and mention the meeting date if one is present.
- Never invent data not present in the booking. Never guess at missing fields.

BOOKING DATA:
{context}"""

    try:
        client   = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model=REVIEW_MODEL,
            max_tokens=MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()

        # Strip markdown code fences if Claude wrapped the JSON anyway
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        review = json.loads(raw)

        # Validate shape — ensure all keys are present
        review.setdefault("summary",    "No summary available.")
        review.setdefault("flags",      [])
        review.setdefault("suggestion", "Review the booking and follow up with the customer.")

        return jsonify(review), 200

    except json.JSONDecodeError:
        # Claude returned something unexpected — return a graceful fallback
        current_app.logger.error(f"AI review JSON parse failed for booking {booking_id}: {raw!r}")
        return jsonify({
            "summary":    "AI review could not be parsed. Please review manually.",
            "flags":      [],
            "suggestion": "Review the booking details and contact the customer directly.",
        }), 200

    except anthropic.AuthenticationError:
        return error_response("Service unavailable", "Invalid AI API key", 503)
    except anthropic.RateLimitError:
        return error_response("Too many requests", "AI service rate limit reached", 429)
    except anthropic.APIError as e:
        current_app.logger.error(f"Anthropic API error during booking review: {e}")
        return error_response("Service unavailable", "AI service temporarily unavailable", 503)


# Private helpers

def _build_booking_context(booking: Booking) -> str:
    """
    Formats the booking and all its related objects into a plain-text
    summary for the AI prompt. Uses the expanded relationships on the
    booking model so the AI sees names, not just IDs.
    """
    venue       = booking.venue
    theme       = booking.theme
    event_type  = booking.event_type
    event_pkg   = booking.event_package
    photo_pkg   = booking.photography_package
    catering    = booking.catering_package
    customer    = booking.user

    venue_capacity = venue.capacity if venue else "unknown"
    venue_price    = f"₹{venue.price:,.0f}" if venue else "unknown"
    guest_count    = booking.guest_count or 0

    catering_total = 0
    if catering and guest_count:
        catering_total = catering.price_per_head * guest_count

    lines = [
        f"Reference:      {booking.booking_reference}",
        f"Status:         {booking.status}",
        f"Customer:       {customer.name if customer else 'Unknown'} ({customer.email if customer else ''})",
        f"Event Type:     {event_type.label if event_type else booking.event_type_id}",
        f"Event Date:     {booking.event_date}",
        f"Meeting Date:   {booking.meeting_date} at {booking.meeting_time}",
        f"Meeting Notes:  {booking.meeting_notes or 'None provided'}",
        f"",
        f"Venue:          {venue.name if venue else booking.venue_id} "
        f"(capacity: {venue_capacity}, price: {venue_price})",
        f"Guest Count:    {guest_count}",
        f"Theme:          {theme.name if theme else booking.theme_id}",
        f"",
        f"Event Package:  {event_pkg.label if event_pkg else 'None'} "
        f"(₹{event_pkg.price:,.0f})" if event_pkg else "Event Package:  None",
        f"Photo Package:  {photo_pkg.label if photo_pkg else 'None'} "
        f"(₹{photo_pkg.price:,.0f})" if photo_pkg else "Photo Package:  None",
        f"Catering:       {catering.label if catering else 'None'} "
        f"(₹{catering.price_per_head:,.0f}/head × {guest_count} = ₹{catering_total:,.0f})"
        if catering else "Catering:       None",
        f"",
        f"Total Estimated Cost: ₹{booking.total_estimated_cost:,.0f}"
        if booking.total_estimated_cost else "Total Estimated Cost: Not provided",
    ]

    return "\n".join(lines)
