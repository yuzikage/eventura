"""
app/routes/ai_recommend.py

POST /api/v1/ai/recommend

Customer only. Accepts a natural language event description and guest
count, queries live DB for available venues/themes/packages, and returns
a structured recommendation with specific IDs and reasons.

Three edge-case guards added:
  1. is_relevant — returns 400 if the description is not about an event
  2. capacity_warning — flags when no venue fits the guest count
  3. budget_warning — flags when the recommendation exceeds stated budget
"""

import json
import anthropic

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required

from app.models.venue import Venue
from app.models.theme import Theme
from app.models.packages import EventPackage, PhotographyPackage, CateringPackage
from app.utils.helpers import error_response, role_required

ai_recommend_bp = Blueprint("ai_recommend", __name__)

RECOMMEND_MODEL = "claude-haiku-4-5-20251001"
MAX_TOKENS      = 700


@ai_recommend_bp.route("", methods=["POST"])
@jwt_required()
@role_required("customer")
def recommend():
    data = request.get_json(silent=True)
    if not data:
        return error_response("Bad request", "Request body must be JSON", 400)

    description = (data.get("description") or "").strip()
    guest_count = data.get("guest_count")
    event_type  = (data.get("event_type") or "").strip()

    if not description:
        return error_response("Bad request", "description is required", 400)
    if not guest_count:
        return error_response("Bad request", "guest_count is required", 400)

    try:
        guest_count = int(guest_count)
        if guest_count < 1:
            raise ValueError
    except (ValueError, TypeError):
        return error_response("Bad request", "guest_count must be a positive integer", 400)

    api_key = current_app.config.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return error_response("Service unavailable",
                              "AI recommendation is not configured on this server", 503)

    # Fetch live catalogue
    venues   = Venue.query.filter_by(is_available=True).all()
    themes   = Theme.query.filter_by(is_active=True).all()
    ev_pkgs  = EventPackage.query.filter_by(is_active=True).all()
    ph_pkgs  = PhotographyPackage.query.filter_by(is_active=True).all()
    cat_pkgs = CateringPackage.query.filter_by(is_active=True).all()

    if not venues or not ev_pkgs or not ph_pkgs or not cat_pkgs:
        return error_response("Service unavailable",
                              "Not enough catalogue data to make a recommendation", 503)

    # Pre-compute useful aggregates for post-processing
    cheapest_venue      = min(venues,   key=lambda v: v.price)
    cheapest_ev         = min(ev_pkgs,  key=lambda p: p.price)
    cheapest_ph         = min(ph_pkgs,  key=lambda p: p.price)
    cheapest_cat        = min(cat_pkgs, key=lambda p: p.price_per_head)
    minimum_possible    = (
        cheapest_venue.price
        + cheapest_ev.price
        + cheapest_ph.price
        + cheapest_cat.price_per_head * guest_count
    )
    max_venue_capacity  = max(v.capacity for v in venues)

    # Build catalogue strings 
    venue_text = "\n".join(
        f'  id="{v.id}" name="{v.name}" location="{v.location}" '
        f'capacity={v.capacity} price=₹{v.price:,.0f}'
        for v in venues
    )
    theme_text = "\n".join(
        f'  id="{t.id}" name="{t.name}" description="{t.description or ""}"'
        for t in themes
    )
    ev_text = "\n".join(
        f'  id="{p.id}" label="{p.label}" price=₹{p.price:,.0f} '
        f'features="{", ".join(p.features or [])}"'
        for p in ev_pkgs
    )
    ph_text = "\n".join(
        f'  id="{p.id}" label="{p.label}" price=₹{p.price:,.0f} '
        f'features="{", ".join(p.features or [])}"'
        for p in ph_pkgs
    )
    cat_text = "\n".join(
        f'  id="{p.id}" label="{p.label}" price_per_head=₹{p.price_per_head:,.0f} '
        f'total_for_{guest_count}_guests=₹{p.price_per_head * guest_count:,.0f}'
        for p in cat_pkgs
    )

    prompt = f"""You are an event planning assistant for Eventura, an event management
business in Coochbehar, India.

FIRST — decide if the customer's description is actually about planning an event.
Set "is_relevant" to false if the description is completely unrelated to event
planning (e.g. asking about celebrities, general knowledge, random topics).
If is_relevant is false, return null for all other fields immediately.

CUSTOMER REQUEST:
  Event type: {event_type or "Not specified"}
  Guest count: {guest_count}
  Description: {description}

AVAILABLE VENUES (prefer capacity >= {guest_count}):
{venue_text}

AVAILABLE THEMES:
{theme_text}

AVAILABLE EVENT PACKAGES:
{ev_text}

AVAILABLE PHOTOGRAPHY PACKAGES:
{ph_text}

AVAILABLE CATERING PACKAGES (totals for {guest_count} guests):
{cat_text}

Instructions (only when is_relevant is true):
- Choose ONE item from each category.
- Strongly prefer venues with capacity >= {guest_count}. If none fit, pick the largest.
- Match theme to the event type and vibe described.
- If the customer mentioned a specific budget amount in rupees, extract it as a
  number into "budget_mentioned". Otherwise set it to null.
- Always choose the most appropriate option for the event described, not just the cheapest.

Respond with ONLY a valid JSON object — no markdown, no explanation.

When is_relevant is true:
{{
  "is_relevant":      true,
  "venue":            {{ "id": "<exact id>", "name": "<n>", "reason": "<one sentence>" }},
  "theme":            {{ "id": "<exact id>", "name": "<n>", "reason": "<one sentence>" }},
  "guest_count":      {guest_count},
  "event_package":    {{ "id": "<exact id>", "label": "<label>", "reason": "<one sentence>" }},
  "photography":      {{ "id": "<exact id>", "label": "<label>", "reason": "<one sentence>" }},
  "catering":         {{ "id": "<exact id>", "label": "<label>", "reason": "<one sentence>" }},
  "summary":          "<one sentence overview of the full recommendation>",
  "budget_mentioned": null
}}

When is_relevant is false:
{{
  "is_relevant": false,
  "venue": null, "theme": null, "guest_count": null,
  "event_package": null, "photography": null, "catering": null,
  "summary": null, "budget_mentioned": null
}}"""

    try:
        client   = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model=RECOMMEND_MODEL,
            max_tokens=MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()

        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        rec = json.loads(raw)

        if not rec.get("is_relevant", True):
            return error_response(
                "Bad request",
                "Your description doesn't seem to be about an event. "
                "Please tell us about the event you're planning — the type, "
                "style, preferences, or budget — and we'll build a "
                "personalised recommendation for you.",
                400,
            )

        # ID validation
        valid_venue_ids = {v.id for v in venues}
        valid_theme_ids = {t.id for t in themes}
        valid_ev_ids    = {p.id for p in ev_pkgs}
        valid_ph_ids    = {p.id for p in ph_pkgs}
        valid_cat_ids   = {p.id for p in cat_pkgs}

        if rec.get("venue", {}).get("id") not in valid_venue_ids:
            return error_response("Service unavailable",
                                  "AI returned an invalid venue recommendation", 503)
        if rec.get("theme", {}).get("id") not in valid_theme_ids:
            return error_response("Service unavailable",
                                  "AI returned an invalid theme recommendation", 503)
        if rec.get("event_package", {}).get("id") not in valid_ev_ids:
            return error_response("Service unavailable",
                                  "AI returned an invalid event package recommendation", 503)
        if rec.get("photography", {}).get("id") not in valid_ph_ids:
            return error_response("Service unavailable",
                                  "AI returned an invalid photography recommendation", 503)
        if rec.get("catering", {}).get("id") not in valid_cat_ids:
            return error_response("Service unavailable",
                                  "AI returned an invalid catering recommendation", 503)

        # Attach full objects
        venue_obj = next(v for v in venues   if v.id == rec["venue"]["id"])
        theme_obj = next(t for t in themes   if t.id == rec["theme"]["id"])
        ev_obj    = next(p for p in ev_pkgs  if p.id == rec["event_package"]["id"])
        ph_obj    = next(p for p in ph_pkgs  if p.id == rec["photography"]["id"])
        cat_obj   = next(p for p in cat_pkgs if p.id == rec["catering"]["id"])

        rec["venue"]["full"]         = venue_obj.to_dict()
        rec["theme"]["full"]         = theme_obj.to_dict()
        rec["event_package"]["full"] = ev_obj.to_dict()
        rec["photography"]["full"]   = ph_obj.to_dict()
        rec["catering"]["full"]      = {**cat_obj.to_dict(),
                                        "pricePerHead": cat_obj.price_per_head}

        capacity_warning = None

        if venue_obj.capacity < guest_count:
            fitting_venues = sorted(
                [v for v in venues if v.capacity >= guest_count],
                key=lambda v: v.price,
            )
            if fitting_venues:
                # Swap silently to the cheapest fitting venue
                venue_obj = fitting_venues[0]
                rec["venue"]["id"]     = venue_obj.id
                rec["venue"]["name"]   = venue_obj.name
                rec["venue"]["reason"] = (
                    f"Smallest venue that comfortably fits {guest_count} guests."
                )
                rec["venue"]["full"]   = venue_obj.to_dict()
            else:
                # No venue fits — warn the customer
                capacity_warning = (
                    f"None of our venues can accommodate {guest_count} guests. "
                    f"Our largest venue fits {max_venue_capacity} guests. "
                    f"We've suggested the best available option — please speak "
                    f"to the manager to discuss alternatives."
                )

        rec["capacity_warning"] = capacity_warning

        actual_total = (
            venue_obj.price
            + ev_obj.price
            + ph_obj.price
            + cat_obj.price_per_head * guest_count
        )
        rec["actual_total"] = actual_total

        budget_warning   = None
        budget_mentioned = rec.get("budget_mentioned")

        if isinstance(budget_mentioned, (int, float)) and budget_mentioned > 0:
            if budget_mentioned < minimum_possible:
                # Budget can't cover even the cheapest possible combination
                budget_warning = (
                    f"Your budget of ₹{budget_mentioned:,.0f} is below the minimum "
                    f"possible cost of ₹{minimum_possible:,.0f} for {guest_count} guests. "
                    f"We've shown our most affordable combination — consider reducing "
                    f"your guest count or speaking to the manager about custom options."
                )
            elif actual_total > budget_mentioned * 1.2:
                # Recommended total exceeds stated budget by more than 20%
                budget_warning = (
                    f"The recommended combination totals ₹{actual_total:,.0f}, "
                    f"which is above your budget of ₹{budget_mentioned:,.0f}. "
                    f"This is our closest match — your manager can help find "
                    f"adjustments during the consultation meeting."
                )

        rec["budget_warning"] = budget_warning

        return jsonify(rec), 200

    except json.JSONDecodeError:
        current_app.logger.error(f"AI recommendation JSON parse failed: {raw!r}")
        return error_response("Service unavailable",
                              "AI returned an unexpected response. Please try again.", 503)
    except anthropic.AuthenticationError:
        return error_response("Service unavailable", "Invalid AI API key", 503)
    except anthropic.RateLimitError:
        return error_response("Too many requests", "AI service rate limit reached", 429)
    except anthropic.APIError as e:
        current_app.logger.error(f"Anthropic API error during recommendation: {e}")
        return error_response("Service unavailable", "AI service temporarily unavailable", 503)