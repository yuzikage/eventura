import anthropic
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required

from app.models.venue import Venue
from app.models.theme import Theme
from app.models.packages import EventPackage, PhotographyPackage, CateringPackage
from app.utils.helpers import error_response
from app.rag.retriever import retrieve

chat_bp = Blueprint("chat", __name__)

CHAT_MODEL  = "claude-haiku-4-5-20251001"
MAX_TOKENS  = 600


# POST /api/v1/chat

@chat_bp.route("", methods=["POST"])
@jwt_required()
def chat():
    data = request.get_json(silent=True)
    if not data:
        return error_response("Bad request", "Request body must be JSON", 400)

    messages = data.get("messages")
    if not messages or not isinstance(messages, list):
        return error_response("Bad request", "messages must be a non-empty array", 400)

    for i, msg in enumerate(messages):
        if msg.get("role") not in ("user", "assistant"):
            return error_response(
                "Bad request",
                f"messages[{i}].role must be 'user' or 'assistant'",
                400,
            )
        if not msg.get("content") or not str(msg["content"]).strip():
            return error_response(
                "Bad request",
                f"messages[{i}].content must not be empty",
                400,
            )

    api_key = current_app.config.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return error_response(
            "Service unavailable",
            "AI chat is not configured on this server",
            503,
        )

    # RAG: retrieve relevant knowledge for the latest user message
    # We use the last user message as the search query.
    # This targets the retrieval at what the user is actually asking right now
    # rather than the full conversation history.
    latest_user_message = next(
        (m["content"] for m in reversed(messages) if m["role"] == "user"),
        "",
    )
    retrieved_chunks = retrieve(latest_user_message, n_results=3)

    # Build system prompt — live DB data + RAG context injected together
    system_prompt = _build_system_prompt(retrieved_chunks)

    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model=CHAT_MODEL,
            max_tokens=MAX_TOKENS,
            system=system_prompt,
            messages=messages,
        )
        reply = response.content[0].text
        return jsonify({"reply": reply}), 200

    except anthropic.AuthenticationError:
        return error_response("Service unavailable", "Invalid AI API key", 503)
    except anthropic.RateLimitError:
        return error_response("Too many requests", "AI service rate limit reached", 429)
    except anthropic.APIError as e:
        current_app.logger.error(f"Anthropic API error: {e}")
        return error_response("Service unavailable", "AI service temporarily unavailable", 503)


# Private helpers 

def _build_system_prompt(retrieved_chunks: list[str]) -> str:
    """
    Builds the full system prompt by combining:
      1. Live database data (venues, themes, packages) — always injected
      2. RAG-retrieved knowledge chunks — injected only when relevant
    """
    venues   = Venue.query.filter_by(is_available=True).all()
    themes   = Theme.query.filter_by(is_active=True).all()
    ev_pkgs  = EventPackage.query.filter_by(is_active=True).all()
    ph_pkgs  = PhotographyPackage.query.filter_by(is_active=True).all()
    cat_pkgs = CateringPackage.query.filter_by(is_active=True).all()

    venue_lines = "\n".join(
        f"  - {v.name} ({v.location}) — capacity {v.capacity}, price ₹{v.price:,.0f}"
        for v in venues
    ) or "  No venues currently available."

    theme_lines = "\n".join(
        f"  - {t.name}: {t.description or 'No description'}"
        for t in themes
    ) or "  No themes currently available."

    ev_pkg_lines = "\n".join(
        f"  - {p.label}: ₹{p.price:,.0f} — {', '.join(p.features or [])}"
        for p in ev_pkgs
    ) or "  No event packages currently available."

    ph_pkg_lines = "\n".join(
        f"  - {p.label}: ₹{p.price:,.0f} — {', '.join(p.features or [])}"
        for p in ph_pkgs
    ) or "  No photography packages currently available."

    cat_pkg_lines = "\n".join(
        f"  - {p.label}: ₹{p.price_per_head:,.0f}/head — {', '.join(p.features or [])}"
        for p in cat_pkgs
    ) or "  No catering packages currently available."

    # RAG section — only included when retrieval found something
    rag_section = ""
    if retrieved_chunks:
        chunks_text = "\n\n".join(
            f"  [{i+1}] {chunk}" for i, chunk in enumerate(retrieved_chunks)
        )
        rag_section = f"""
RELEVANT BUSINESS KNOWLEDGE (use this to answer policy or planning questions):
{chunks_text}
"""

    return f"""You are Eventura's friendly AI assistant for a small event management business \
based in Coochbehar, India. You help customers plan weddings, birthdays, corporate events, \
and other celebrations.

Your personality: warm, helpful, concise. You speak naturally — not like a brochure. \
You use **bold** for important things like prices and names. You never make up information. \
If you don't know something, say so and suggest the customer ask their event manager.
{rag_section}
CURRENT AVAILABLE VENUES:
{venue_lines}

CURRENT THEMES:
{theme_lines}

EVENT PACKAGES (flat fee):
{ev_pkg_lines}

PHOTOGRAPHY PACKAGES (flat fee):
{ph_pkg_lines}

CATERING PACKAGES (per person):
{cat_pkg_lines}

BOOKING PROCESS:
1. Customer selects event type (Wedding, Birthday, Corporate, Social Event)
2. Picks a venue and theme
3. Enters guest count — catering cost = price_per_head × guest_count
4. Chooses event, photography, and catering packages
5. Selects a meeting date and time with the event manager
6. Submits — receives a booking reference (e.g. EVT-A3F2K)
7. Manager reviews and confirms or contacts the customer

Keep replies under 150 words unless the customer asks for details. \
Never invent venues, prices, or packages not listed above."""