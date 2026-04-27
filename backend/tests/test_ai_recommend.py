"""
Tests for:
  POST /api/v1/ai/recommend

Covers: access control, validation, response shape, edge cases
(irrelevant query, impossible budget, capacity mismatch).
"""

import json
import pytest
from unittest.mock import patch, MagicMock

from app.models.venue import Venue
from app.models.theme import Theme
from app.models.packages import EventPackage, PhotographyPackage, CateringPackage

ANTHROPIC_PATCH = "app.routes.ai_recommend.anthropic.Anthropic"
RECOMMEND_URL   = "/api/v1/ai/recommend"


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# Fixtures

@pytest.fixture()
def catalogue(db):
    """Seeds a complete catalogue with two venues of different capacities."""
    v1 = Venue(id="v-r1", name="Grand Pavilion", location="Central",
               capacity=300, price=120000.0, is_available=True)
    v2 = Venue(id="v-r2", name="Garden Terrace", location="North",
               capacity=100, price=75000.0, is_available=True)
    t1 = Theme(id="t-r1", name="Royal Marigold", description="Warm golds", is_active=True)
    t2 = Theme(id="t-r2", name="Modern Minimal", description="Clean lines", is_active=True)
    ep = EventPackage(id="pk-r1", label="Basic", price=15000.0,
                      features=["Standard decor"], is_active=True)
    pp = PhotographyPackage(id="ph-r1", label="Essential", price=8000.0,
                            features=["4-hour coverage"], is_active=True)
    cp = CateringPackage(id="c-r1", label="Standard", price_per_head=350.0,
                         features=["Veg buffet"], is_active=True)
    db.session.add_all([v1, v2, t1, t2, ep, pp, cp])
    db.session.commit()
    return {"venues": [v1, v2], "themes": [t1, t2], "ep": ep, "pp": pp, "cp": cp}


def mock_ai_rec(venue_id="v-r1", theme_id="t-r1", budget_mentioned=None,
                is_relevant=True):
    """Builds a mock Anthropic response with a valid recommendation JSON."""
    if not is_relevant:
        payload = json.dumps({
            "is_relevant": False,
            "venue": None, "theme": None, "guest_count": None,
            "event_package": None, "photography": None, "catering": None,
            "summary": None, "budget_mentioned": None,
        })
    else:
        payload = json.dumps({
            "is_relevant":      True,
            "venue":            {"id": venue_id,  "name": "Grand Pavilion",  "reason": "Fits guests."},
            "theme":            {"id": theme_id,  "name": "Royal Marigold",  "reason": "Suits wedding."},
            "guest_count":      150,
            "event_package":    {"id": "pk-r1",   "label": "Basic",         "reason": "Affordable."},
            "photography":      {"id": "ph-r1",   "label": "Essential",     "reason": "Good coverage."},
            "catering":         {"id": "c-r1",    "label": "Standard",      "reason": "Good value."},
            "summary":          "A solid wedding setup at Grand Pavilion.",
            "budget_mentioned": budget_mentioned,
        })

    mock_content          = MagicMock()
    mock_content.text     = payload
    mock_response         = MagicMock()
    mock_response.content = [mock_content]
    return mock_response


# Access control

class TestRecommendAccess:

    def test_requires_authentication(self, client):
        res = client.post(RECOMMEND_URL, json={"description": "test event", "guest_count": 50})
        assert res.status_code == 401

    def test_manager_gets_403(self, client, manager_token):
        res = client.post(RECOMMEND_URL,
                          json={"description": "outdoor wedding please", "guest_count": 100},
                          headers=auth(manager_token))
        assert res.status_code == 403

    def test_admin_gets_403(self, client, admin_token):
        res = client.post(RECOMMEND_URL,
                          json={"description": "outdoor wedding please", "guest_count": 100},
                          headers=auth(admin_token))
        assert res.status_code == 403

    def test_customer_can_access(self, client, customer_token, catalogue):
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = mock_ai_rec()
            res = client.post(RECOMMEND_URL,
                              json={"description": "outdoor wedding for family and friends",
                                    "guest_count": 150, "event_type": "Wedding"},
                              headers=auth(customer_token))
        assert res.status_code == 200


# Request validation

class TestRecommendValidation:

    def test_missing_description_returns_400(self, client, customer_token):
        res = client.post(RECOMMEND_URL, json={"guest_count": 50},
                          headers=auth(customer_token))
        assert res.status_code == 400

    def test_empty_description_returns_400(self, client, customer_token):
        res = client.post(RECOMMEND_URL,
                          json={"description": "", "guest_count": 50},
                          headers=auth(customer_token))
        assert res.status_code == 400

    def test_missing_guest_count_returns_400(self, client, customer_token):
        res = client.post(RECOMMEND_URL,
                          json={"description": "outdoor wedding for family"},
                          headers=auth(customer_token))
        assert res.status_code == 400

    def test_zero_guest_count_returns_400(self, client, customer_token):
        res = client.post(RECOMMEND_URL,
                          json={"description": "outdoor wedding", "guest_count": 0},
                          headers=auth(customer_token))
        assert res.status_code == 400

    def test_non_numeric_guest_count_returns_400(self, client, customer_token):
        res = client.post(RECOMMEND_URL,
                          json={"description": "outdoor wedding", "guest_count": "many"},
                          headers=auth(customer_token))
        assert res.status_code == 400

    def test_no_body_returns_400(self, client, customer_token):
        res = client.post(RECOMMEND_URL, headers=auth(customer_token))
        assert res.status_code == 400


# Response shape

class TestRecommendShape:

    def test_response_has_all_required_fields(self, client, customer_token, catalogue):
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = mock_ai_rec()
            res = client.post(RECOMMEND_URL,
                              json={"description": "outdoor wedding for family and friends",
                                    "guest_count": 150},
                              headers=auth(customer_token))
        assert res.status_code == 200
        data = res.get_json()
        for field in ("venue", "theme", "guest_count", "event_package",
                      "photography", "catering", "summary",
                      "budget_warning", "capacity_warning", "actual_total"):
            assert field in data, f"Missing field: {field}"

    def test_full_objects_attached(self, client, customer_token, catalogue):
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = mock_ai_rec()
            res = client.post(RECOMMEND_URL,
                              json={"description": "outdoor wedding for family and friends",
                                    "guest_count": 150},
                              headers=auth(customer_token))
        data = res.get_json()
        for key in ("venue", "theme", "event_package", "photography", "catering"):
            assert isinstance(data[key]["full"], dict), f"full missing on {key}"

    def test_catering_full_has_price_per_head(self, client, customer_token, catalogue):
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = mock_ai_rec()
            res = client.post(RECOMMEND_URL,
                              json={"description": "birthday party for colleagues",
                                    "guest_count": 80},
                              headers=auth(customer_token))
        assert "pricePerHead" in res.get_json()["catering"]["full"]

    def test_actual_total_is_numeric(self, client, customer_token, catalogue):
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = mock_ai_rec()
            res = client.post(RECOMMEND_URL,
                              json={"description": "birthday party for family friends",
                                    "guest_count": 80},
                              headers=auth(customer_token))
        assert isinstance(res.get_json()["actual_total"], (int, float))

    def test_no_warnings_on_normal_request(self, client, customer_token, catalogue):
        """A normal request with reasonable guest count should have null warnings."""
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = mock_ai_rec()
            res = client.post(RECOMMEND_URL,
                              json={"description": "outdoor wedding for family and friends",
                                    "guest_count": 100},
                              headers=auth(customer_token))
        data = res.get_json()
        assert data["budget_warning"]   is None
        assert data["capacity_warning"] is None


# Edge case: irrelevant query

class TestRecommendRelevanceGuard:

    def test_irrelevant_query_returns_400(self, client, customer_token, catalogue):
        """If AI marks the query as not event-related, endpoint returns 400."""
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = \
                mock_ai_rec(is_relevant=False)
            res = client.post(RECOMMEND_URL,
                              json={"description": "who is john cena the wrestler",
                                    "guest_count": 50},
                              headers=auth(customer_token))
        assert res.status_code == 400

    def test_irrelevant_query_error_message_is_helpful(self, client, customer_token,
                                                         catalogue):
        """The 400 message should guide the customer to re-describe their event."""
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = \
                mock_ai_rec(is_relevant=False)
            res = client.post(RECOMMEND_URL,
                              json={"description": "who is john cena the wrestler",
                                    "guest_count": 50},
                              headers=auth(customer_token))
        data = res.get_json()
        # Should contain a helpful message, not a generic error
        assert "event" in data["message"].lower()

    def test_relevant_event_query_is_not_blocked(self, client, customer_token, catalogue):
        """A genuine event description should never be blocked by the relevance guard."""
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = mock_ai_rec()
            res = client.post(RECOMMEND_URL,
                              json={"description": "outdoor wedding for family and friends",
                                    "guest_count": 100},
                              headers=auth(customer_token))
        assert res.status_code == 200


# Edge case: budget warnings

class TestRecommendBudgetWarning:

    def test_no_budget_warning_when_budget_not_mentioned(self, client, customer_token,
                                                           catalogue):
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = \
                mock_ai_rec(budget_mentioned=None)
            res = client.post(RECOMMEND_URL,
                              json={"description": "outdoor wedding for family and friends",
                                    "guest_count": 100},
                              headers=auth(customer_token))
        assert res.get_json()["budget_warning"] is None

    def test_budget_warning_when_budget_impossibly_low(self, client, customer_token,
                                                         catalogue):
        """Budget of ₹10,000 is far below any possible combination — should warn."""
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = \
                mock_ai_rec(budget_mentioned=10000)
            res = client.post(RECOMMEND_URL,
                              json={"description": "wedding for family friends budget 10000",
                                    "guest_count": 100},
                              headers=auth(customer_token))
        data = res.get_json()
        assert data["budget_warning"] is not None
        assert "10,000" in data["budget_warning"] or "10000" in data["budget_warning"]

    def test_no_budget_warning_when_budget_is_sufficient(self, client, customer_token,
                                                           catalogue):
        """Budget of ₹5,00,000 easily covers the recommendation — no warning."""
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = \
                mock_ai_rec(budget_mentioned=500000)
            res = client.post(RECOMMEND_URL,
                              json={"description": "wedding family budget 5 lakhs",
                                    "guest_count": 100},
                              headers=auth(customer_token))
        assert res.get_json()["budget_warning"] is None

    def test_budget_warning_when_recommendation_exceeds_budget_by_over_20_pct(
            self, client, customer_token, catalogue):
        """Catalogue: venue=120k, ep=15k, ph=8k, cat=350*100=35k → total=178k.
           Budget of 100k is 78% below total — should warn."""
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = \
                mock_ai_rec(budget_mentioned=100000)
            res = client.post(RECOMMEND_URL,
                              json={"description": "wedding family friends budget 1 lakh",
                                    "guest_count": 100},
                              headers=auth(customer_token))
        assert res.get_json()["budget_warning"] is not None


# Edge case: capacity warnings and auto-swap

class TestRecommendCapacity:

    def test_capacity_warning_when_no_venue_fits(self, client, customer_token, catalogue):
        """Guest count of 500 exceeds all seeded venues (max 300) — should warn."""
        with patch(ANTHROPIC_PATCH) as mock_cls:
            # Claude returns v-r1 (capacity 300) for 500 guests
            mock_cls.return_value.messages.create.return_value = mock_ai_rec(venue_id="v-r1")
            res = client.post(RECOMMEND_URL,
                              json={"description": "large corporate event for entire company",
                                    "guest_count": 500},
                              headers=auth(customer_token))
        data = res.get_json()
        assert data["capacity_warning"] is not None
        assert "500" in data["capacity_warning"]

    def test_no_capacity_warning_when_venue_fits(self, client, customer_token, catalogue):
        """Guest count of 100 fits both venues — no capacity warning."""
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = mock_ai_rec(venue_id="v-r1")
            res = client.post(RECOMMEND_URL,
                              json={"description": "outdoor wedding for family and friends",
                                    "guest_count": 100},
                              headers=auth(customer_token))
        assert res.get_json()["capacity_warning"] is None

    def test_venue_swapped_when_claude_picks_too_small(self, client, customer_token,
                                                         catalogue, db):
        """If Claude picks v-r2 (capacity 100) for 150 guests but v-r1 fits (300),
           backend should silently swap to v-r1 with no capacity_warning."""
        with patch(ANTHROPIC_PATCH) as mock_cls:
            # Claude wrongly picks small venue
            mock_cls.return_value.messages.create.return_value = mock_ai_rec(venue_id="v-r2")
            res = client.post(RECOMMEND_URL,
                              json={"description": "outdoor wedding for family and friends",
                                    "guest_count": 150},
                              headers=auth(customer_token))
        data = res.get_json()
        # Should have been silently swapped to the fitting venue
        assert data["venue"]["id"] == "v-r1"
        # Swap is silent — no warning needed since we found a good venue
        assert data["capacity_warning"] is None


# ID validation

class TestRecommendIDValidation:

    def test_invalid_venue_id_returns_503(self, client, customer_token, catalogue):
        bad_payload = json.dumps({
            "is_relevant":      True,
            "venue":            {"id": "v-FAKE", "name": "Ghost", "reason": "Nice."},
            "theme":            {"id": "t-r1",   "name": "Royal", "reason": "Good."},
            "guest_count":      100,
            "event_package":    {"id": "pk-r1",  "label": "Basic",    "reason": "Good."},
            "photography":      {"id": "ph-r1",  "label": "Essential","reason": "Good."},
            "catering":         {"id": "c-r1",   "label": "Standard", "reason": "Good."},
            "summary":          "A recommendation.",
            "budget_mentioned": None,
        })
        mock_content      = MagicMock()
        mock_content.text = bad_payload
        mock_resp         = MagicMock()
        mock_resp.content = [mock_content]

        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = mock_resp
            res = client.post(RECOMMEND_URL,
                              json={"description": "outdoor wedding for family",
                                    "guest_count": 100},
                              headers=auth(customer_token))
        assert res.status_code == 503


# Error handling

class TestRecommendErrorHandling:

    def test_missing_api_key_returns_503(self, client, customer_token, app):
        original = app.config.get("ANTHROPIC_API_KEY")
        app.config["ANTHROPIC_API_KEY"] = ""
        try:
            res = client.post(RECOMMEND_URL,
                              json={"description": "wedding", "guest_count": 100},
                              headers=auth(customer_token))
            assert res.status_code == 503
        finally:
            app.config["ANTHROPIC_API_KEY"] = original

    def test_rate_limit_returns_429(self, client, customer_token, catalogue):
        import anthropic as anthropic_lib
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.side_effect = \
                anthropic_lib.RateLimitError(
                    message="Rate limit",
                    response=MagicMock(status_code=429),
                    body={},
                )
            res = client.post(RECOMMEND_URL,
                              json={"description": "outdoor wedding for friends",
                                    "guest_count": 100},
                              headers=auth(customer_token))
        assert res.status_code == 429

    def test_malformed_json_from_ai_returns_503(self, client, customer_token, catalogue):
        mock_content      = MagicMock()
        mock_content.text = "Sorry I cannot help."
        mock_resp         = MagicMock()
        mock_resp.content = [mock_content]
        with patch(ANTHROPIC_PATCH) as mock_cls:
            mock_cls.return_value.messages.create.return_value = mock_resp
            res = client.post(RECOMMEND_URL,
                              json={"description": "outdoor wedding for friends",
                                    "guest_count": 100},
                              headers=auth(customer_token))
        assert res.status_code == 503