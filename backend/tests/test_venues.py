"""
Tests for:
  GET    /api/v1/venues           (available only, any authenticated user)
  GET    /api/v1/venues/all       (all venues, admin only)
  POST   /api/v1/venues           (admin only)
  GET    /api/v1/venues/<id>      (any authenticated user)
  PUT    /api/v1/venues/<id>      (admin only)
  DELETE /api/v1/venues/<id>      (admin only)
"""

VENUES_URL     = "/api/v1/venues"
VENUES_ALL_URL = "/api/v1/venues/all"

# Payload for creating/updating a venue
VALID_VENUE = {
    "id":           "v-new-1",
    "name":         "New Banquet Hall",
    "location":     "North Coochbehar",
    "capacity":     300,
    "price":        80000.0,
    "is_available": True,
}


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# GET /venues  — available venues

class TestGetAvailableVenues:

    def test_returns_only_available_venues(self, client, customer_token,
                                           seed_venue, seed_unavailable_venue):
        res = client.get(VENUES_URL, headers=auth(customer_token))
        assert res.status_code == 200
        venues = res.get_json()["venues"]
        assert all(v["is_available"] for v in venues)
        ids = [v["id"] for v in venues]
        assert "v-test-1" in ids
        assert "v-test-2" not in ids   # unavailable must be excluded

    def test_returns_empty_list_when_no_available_venues(self, client, customer_token,
                                                          seed_unavailable_venue):
        res = client.get(VENUES_URL, headers=auth(customer_token))
        assert res.status_code == 200
        assert res.get_json()["venues"] == []

    def test_venue_has_correct_fields(self, client, customer_token, seed_venue):
        res = client.get(VENUES_URL, headers=auth(customer_token))
        v = res.get_json()["venues"][0]
        for field in ("id", "name", "location", "capacity", "price", "is_available"):
            assert field in v, f"Missing field: {field}"

    def test_requires_authentication(self, client):
        res = client.get(VENUES_URL)
        assert res.status_code == 401

    def test_manager_can_access(self, client, manager_token, seed_venue):
        res = client.get(VENUES_URL, headers=auth(manager_token))
        assert res.status_code == 200


# GET /venues/all  — all venues (admin only)

class TestGetAllVenues:

    def test_admin_sees_available_and_unavailable(self, client, admin_token,
                                                   seed_venue, seed_unavailable_venue):
        res = client.get(VENUES_ALL_URL, headers=auth(admin_token))
        assert res.status_code == 200
        ids = [v["id"] for v in res.get_json()["venues"]]
        assert "v-test-1" in ids
        assert "v-test-2" in ids

    def test_customer_gets_403(self, client, customer_token):
        res = client.get(VENUES_ALL_URL, headers=auth(customer_token))
        assert res.status_code == 403

    def test_manager_gets_403(self, client, manager_token):
        res = client.get(VENUES_ALL_URL, headers=auth(manager_token))
        assert res.status_code == 403

    def test_requires_authentication(self, client):
        res = client.get(VENUES_ALL_URL)
        assert res.status_code == 401


# POST /venues  — create venue (admin only)

class TestCreateVenue:

    def test_admin_creates_venue_returns_201(self, client, admin_token):
        res = client.post(VENUES_URL, json=VALID_VENUE, headers=auth(admin_token))
        assert res.status_code == 201
        v = res.get_json()
        assert v["name"]     == VALID_VENUE["name"]
        assert v["capacity"] == VALID_VENUE["capacity"]
        assert v["price"]    == VALID_VENUE["price"]

    def test_created_venue_appears_in_list(self, client, admin_token):
        client.post(VENUES_URL, json=VALID_VENUE, headers=auth(admin_token))
        res = client.get(VENUES_URL, headers=auth(admin_token))
        ids = [v["id"] for v in res.get_json()["venues"]]
        assert VALID_VENUE["id"] in ids

    def test_customer_gets_403(self, client, customer_token):
        res = client.post(VENUES_URL, json=VALID_VENUE, headers=auth(customer_token))
        assert res.status_code == 403

    def test_manager_gets_403(self, client, manager_token):
        res = client.post(VENUES_URL, json=VALID_VENUE, headers=auth(manager_token))
        assert res.status_code == 403

    def test_missing_name_returns_400(self, client, admin_token):
        payload = {**VALID_VENUE, "name": ""}
        res = client.post(VENUES_URL, json=payload, headers=auth(admin_token))
        assert res.status_code == 400
        assert "name" in res.get_json()["messages"]

    def test_missing_capacity_returns_400(self, client, admin_token):
        payload = {k: v for k, v in VALID_VENUE.items() if k != "capacity"}
        res = client.post(VENUES_URL, json=payload, headers=auth(admin_token))
        assert res.status_code == 400
        assert "capacity" in res.get_json()["messages"]

    def test_invalid_capacity_returns_400(self, client, admin_token):
        payload = {**VALID_VENUE, "capacity": -10}
        res = client.post(VENUES_URL, json=payload, headers=auth(admin_token))
        assert res.status_code == 400
        assert "capacity" in res.get_json()["messages"]

    def test_missing_price_returns_400(self, client, admin_token):
        payload = {k: v for k, v in VALID_VENUE.items() if k != "price"}
        res = client.post(VENUES_URL, json=payload, headers=auth(admin_token))
        assert res.status_code == 400
        assert "price" in res.get_json()["messages"]

    def test_no_body_returns_400(self, client, admin_token):
        res = client.post(VENUES_URL, headers=auth(admin_token))
        assert res.status_code == 400


# GET /venues/<id>  — single venue

class TestGetVenue:

    def test_returns_venue_by_id(self, client, customer_token, seed_venue):
        res = client.get(f"{VENUES_URL}/v-test-1", headers=auth(customer_token))
        assert res.status_code == 200
        assert res.get_json()["id"] == "v-test-1"

    def test_unknown_id_returns_404(self, client, customer_token):
        res = client.get(f"{VENUES_URL}/does-not-exist", headers=auth(customer_token))
        assert res.status_code == 404
        assert res.get_json()["error"] == "Not found"

    def test_requires_authentication(self, client):
        res = client.get(f"{VENUES_URL}/v-test-1")
        assert res.status_code == 401


# PUT /venues/<id>  — update venue (admin only)

class TestUpdateVenue:

    def test_admin_can_update_venue(self, client, admin_token, seed_venue):
        updated = {**VALID_VENUE, "id": "v-test-1", "name": "Updated Pavilion"}
        res = client.put(f"{VENUES_URL}/v-test-1", json=updated, headers=auth(admin_token))
        assert res.status_code == 200
        assert res.get_json()["name"] == "Updated Pavilion"

    def test_can_toggle_availability(self, client, admin_token, seed_venue):
        payload = {**VALID_VENUE, "id": "v-test-1", "is_available": False}
        res = client.put(f"{VENUES_URL}/v-test-1", json=payload, headers=auth(admin_token))
        assert res.status_code == 200
        assert res.get_json()["is_available"] is False

    def test_unknown_id_returns_404(self, client, admin_token):
        res = client.put(f"{VENUES_URL}/ghost", json=VALID_VENUE, headers=auth(admin_token))
        assert res.status_code == 404

    def test_customer_gets_403(self, client, customer_token, seed_venue):
        res = client.put(f"{VENUES_URL}/v-test-1", json=VALID_VENUE,
                         headers=auth(customer_token))
        assert res.status_code == 403

    def test_invalid_payload_returns_400(self, client, admin_token, seed_venue):
        payload = {**VALID_VENUE, "capacity": "not-a-number"}
        res = client.put(f"{VENUES_URL}/v-test-1", json=payload, headers=auth(admin_token))
        assert res.status_code == 400
        assert "capacity" in res.get_json()["messages"]


# DELETE /venues/<id>  — delete venue (admin only)

class TestDeleteVenue:

    def test_admin_can_delete_venue(self, client, admin_token, seed_venue):
        res = client.delete(f"{VENUES_URL}/v-test-1", headers=auth(admin_token))
        assert res.status_code == 200
        assert res.get_json()["message"] == "Venue deleted successfully"

    def test_deleted_venue_no_longer_exists(self, client, admin_token, seed_venue):
        client.delete(f"{VENUES_URL}/v-test-1", headers=auth(admin_token))
        res = client.get(f"{VENUES_URL}/v-test-1", headers=auth(admin_token))
        assert res.status_code == 404

    def test_unknown_id_returns_404(self, client, admin_token):
        res = client.delete(f"{VENUES_URL}/ghost", headers=auth(admin_token))
        assert res.status_code == 404

    def test_customer_gets_403(self, client, customer_token, seed_venue):
        res = client.delete(f"{VENUES_URL}/v-test-1", headers=auth(customer_token))
        assert res.status_code == 403

    def test_manager_gets_403(self, client, manager_token, seed_venue):
        res = client.delete(f"{VENUES_URL}/v-test-1", headers=auth(manager_token))
        assert res.status_code == 403
