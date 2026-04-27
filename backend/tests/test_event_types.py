"""
Tests for:
  GET /api/v1/event-types
"""

EVENT_TYPES_URL = "/api/v1/event-types"


class TestGetEventTypes:

    def test_returns_200_with_list(self, client, customer_token, seed_event_type):
        res = client.get(EVENT_TYPES_URL,
                         headers={"Authorization": f"Bearer {customer_token}"})
        assert res.status_code == 200
        data = res.get_json()
        assert "event_types" in data
        assert isinstance(data["event_types"], list)
        assert len(data["event_types"]) == 1

    def test_event_type_has_correct_fields(self, client, customer_token, seed_event_type):
        res = client.get(EVENT_TYPES_URL,
                         headers={"Authorization": f"Bearer {customer_token}"})
        et = res.get_json()["event_types"][0]
        assert et["id"]    == "et-test-1"
        assert et["label"] == "Wedding"
        assert et["icon"]  == "💍"
        assert "description" in et

    def test_returns_empty_list_when_no_event_types(self, client, customer_token):
        # No seed fixture — DB is clean
        res = client.get(EVENT_TYPES_URL,
                         headers={"Authorization": f"Bearer {customer_token}"})
        assert res.status_code == 200
        assert res.get_json()["event_types"] == []

    def test_requires_authentication(self, client):
        res = client.get(EVENT_TYPES_URL)
        assert res.status_code == 401

    def test_manager_can_access(self, client, manager_token, seed_event_type):
        res = client.get(EVENT_TYPES_URL,
                         headers={"Authorization": f"Bearer {manager_token}"})
        assert res.status_code == 200

    def test_admin_can_access(self, client, admin_token, seed_event_type):
        res = client.get(EVENT_TYPES_URL,
                         headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200
