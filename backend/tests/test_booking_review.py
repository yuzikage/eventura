"""
Tests for:
  GET /api/v1/bookings/<booking_id>/review

The Anthropic API is mocked in all tests.
"""

import json
import pytest
from unittest.mock import patch, MagicMock

from app.models.booking import Booking
from app.models.venue import Venue
from app.models.event_type import EventType
from app.models.theme import Theme
from app.models.packages import EventPackage, PhotographyPackage, CateringPackage
from app.models.user import User
from werkzeug.security import generate_password_hash
from datetime import date

ANTHROPIC_PATCH = "app.routes.booking_review.anthropic.Anthropic"


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def review_url(booking_id):
    return f"/api/v1/bookings/{booking_id}/review"


# Fixtures

@pytest.fixture()
def review_deps(db):
    """Seeds all FK dependencies and returns a complete booking."""
    venue = Venue(id="v-rev-1", name="Review Venue", location="Test Loc",
                  capacity=200, price=60000.0, is_available=True)
    et    = EventType(id="et-rev-1", label="Wedding", description="", icon="💍")
    theme = Theme(id="t-rev-1", name="Royal", description="", is_active=True)
    ep    = EventPackage(id="pk-rev-1", label="Premium", price=35000.0,
                         features=[], is_active=True)
    pp    = PhotographyPackage(id="ph-rev-1", label="Cinematic", price=32000.0,
                               features=[], is_active=True)
    cp    = CateringPackage(id="c-rev-1", label="Royal Feast", price_per_head=950.0,
                            features=[], is_active=True)
    customer = User(
        id="u-rev-1", name="Review Customer",
        email="reviewcustomer@test.com",
        password_hash=generate_password_hash("pass123"),
        phone="8888888888", role="customer",
    )
    db.session.add_all([venue, et, theme, ep, pp, cp, customer])
    db.session.commit()

    booking = Booking(
        user_id="u-rev-1",
        venue_id="v-rev-1",
        theme_id="t-rev-1",
        event_type_id="et-rev-1",
        guest_count=150,
        event_package_id="pk-rev-1",
        photography_package_id="ph-rev-1",
        catering_package_id="c-rev-1",
        event_date=date(2026, 10, 20),
        meeting_date=date(2026, 9, 5),
        meeting_time="11:00 AM",
        meeting_notes="Prefer outdoor setup",
        total_estimated_cost=285000.0,
        status="pending",
    )
    db.session.add(booking)
    db.session.commit()
    return booking


def mock_ai_review(summary="Good booking.", flags=None, suggestion="Confirm the booking."):
    """Builds a mock Anthropic response returning a valid review JSON."""
    payload = json.dumps({
        "summary":    summary,
        "flags":      flags or [],
        "suggestion": suggestion,
    })
    mock_content          = MagicMock()
    mock_content.text     = payload
    mock_response         = MagicMock()
    mock_response.content = [mock_content]
    return mock_response


# Access control

class TestReviewAccess:

    def test_requires_authentication(self, client, review_deps):
        res = client.get(review_url(review_deps.id))
        assert res.status_code == 401

    def test_customer_gets_403(self, client, customer_token, review_deps):
        res = client.get(review_url(review_deps.id), headers=auth(customer_token))
        assert res.status_code == 403

    def test_manager_can_access(self, client, manager_token, review_deps):
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = mock_ai_review()
            res = client.get(review_url(review_deps.id), headers=auth(manager_token))
        assert res.status_code == 200

    def test_admin_can_access(self, client, admin_token, review_deps):
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = mock_ai_review()
            res = client.get(review_url(review_deps.id), headers=auth(admin_token))
        assert res.status_code == 200

    def test_unknown_booking_returns_404(self, client, manager_token):
        res = client.get(review_url("does-not-exist"), headers=auth(manager_token))
        assert res.status_code == 404


# Response shape

class TestReviewShape:

    def test_response_has_all_required_fields(self, client, manager_token, review_deps):
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = mock_ai_review(
                summary="Solid wedding booking with good package selection.",
                flags=["Guest count of 150 is close to venue capacity of 200."],
                suggestion="Confirm the booking and discuss seating arrangements.",
            )
            res = client.get(review_url(review_deps.id), headers=auth(manager_token))
        assert res.status_code == 200
        data = res.get_json()
        assert "summary"    in data
        assert "flags"      in data
        assert "suggestion" in data

    def test_flags_is_a_list(self, client, manager_token, review_deps):
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = mock_ai_review()
            res = client.get(review_url(review_deps.id), headers=auth(manager_token))
        assert isinstance(res.get_json()["flags"], list)

    def test_flags_can_be_empty_list(self, client, manager_token, review_deps):
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = mock_ai_review(flags=[])
            res = client.get(review_url(review_deps.id), headers=auth(manager_token))
        assert res.get_json()["flags"] == []

    def test_summary_matches_ai_response(self, client, manager_token, review_deps):
        expected = "High-value wedding booking with premium package selections."
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = mock_ai_review(
                summary=expected)
            res = client.get(review_url(review_deps.id), headers=auth(manager_token))
        assert res.get_json()["summary"] == expected

    def test_suggestion_matches_ai_response(self, client, manager_token, review_deps):
        expected = "Contact customer to confirm outdoor setup preference."
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = mock_ai_review(
                suggestion=expected)
            res = client.get(review_url(review_deps.id), headers=auth(manager_token))
        assert res.get_json()["suggestion"] == expected

    def test_multiple_flags_all_returned(self, client, manager_token, review_deps):
        flags = [
            "Guest count close to venue capacity.",
            "No meeting notes provided for a complex event.",
        ]
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = mock_ai_review(flags=flags)
            res = client.get(review_url(review_deps.id), headers=auth(manager_token))
        assert res.get_json()["flags"] == flags


# Prompt content — booking data sent to AI

class TestReviewPromptContent:

    def test_booking_reference_in_prompt(self, client, manager_token, review_deps):
        """The booking reference should appear in the prompt so the AI can reference it."""
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_instance = mock_cls.return_value
            mock_instance.messages.create.return_value = mock_ai_review()
            client.get(review_url(review_deps.id), headers=auth(manager_token))
            prompt = mock_instance.messages.create.call_args.kwargs["messages"][0]["content"]
        assert review_deps.booking_reference in prompt

    def test_venue_name_in_prompt(self, client, manager_token, review_deps):
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_instance = mock_cls.return_value
            mock_instance.messages.create.return_value = mock_ai_review()
            client.get(review_url(review_deps.id), headers=auth(manager_token))
            prompt = mock_instance.messages.create.call_args.kwargs["messages"][0]["content"]
        assert "Review Venue" in prompt

    def test_guest_count_in_prompt(self, client, manager_token, review_deps):
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_instance = mock_cls.return_value
            mock_instance.messages.create.return_value = mock_ai_review()
            client.get(review_url(review_deps.id), headers=auth(manager_token))
            prompt = mock_instance.messages.create.call_args.kwargs["messages"][0]["content"]
        assert "150" in prompt

    def test_venue_capacity_in_prompt(self, client, manager_token, review_deps):
        """Capacity must be in the prompt so the AI can detect capacity issues."""
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_instance = mock_cls.return_value
            mock_instance.messages.create.return_value = mock_ai_review()
            client.get(review_url(review_deps.id), headers=auth(manager_token))
            prompt = mock_instance.messages.create.call_args.kwargs["messages"][0]["content"]
        assert "200" in prompt   # venue capacity seeded as 200


# Error handling

class TestReviewErrorHandling:

    def test_missing_api_key_returns_503(self, client, manager_token, review_deps, app):
        original = app.config.get("ANTHROPIC_API_KEY")
        app.config["ANTHROPIC_API_KEY"] = ""
        try:
            res = client.get(review_url(review_deps.id), headers=auth(manager_token))
            assert res.status_code == 503
        finally:
            app.config["ANTHROPIC_API_KEY"] = original

    def test_rate_limit_returns_429(self, client, manager_token, review_deps):
        import anthropic as anthropic_lib
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.side_effect = \
                anthropic_lib.RateLimitError(
                    message="Rate limit exceeded",
                    response=MagicMock(status_code=429),
                    body={},
                )
            res = client.get(review_url(review_deps.id), headers=auth(manager_token))
        assert res.status_code == 429

    def test_malformed_ai_json_returns_200_with_fallback(self, client, manager_token,
                                                           review_deps):
        """If Claude returns invalid JSON, endpoint should return a graceful fallback."""
        mock_content          = MagicMock()
        mock_content.text     = "Sorry, I cannot review this booking right now."
        mock_response         = MagicMock()
        mock_response.content = [mock_content]

        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = mock_response
            res = client.get(review_url(review_deps.id), headers=auth(manager_token))

        assert res.status_code == 200
        data = res.get_json()
        # Should still have the correct shape, just with fallback text
        assert "summary"    in data
        assert "flags"      in data
        assert "suggestion" in data
        assert isinstance(data["flags"], list)
