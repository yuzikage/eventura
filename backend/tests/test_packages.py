"""
Tests for:
  GET    /api/v1/packages/events
  POST   /api/v1/packages/events
  PUT    /api/v1/packages/events/<id>
  DELETE /api/v1/packages/events/<id>

  GET    /api/v1/packages/photography
  POST   /api/v1/packages/photography
  PUT    /api/v1/packages/photography/<id>
  DELETE /api/v1/packages/photography/<id>

  GET    /api/v1/packages/catering
  POST   /api/v1/packages/catering
  PUT    /api/v1/packages/catering/<id>
  DELETE /api/v1/packages/catering/<id>
"""

EVENTS_URL      = "/api/v1/packages/events"
PHOTO_URL       = "/api/v1/packages/photography"
CATERING_URL    = "/api/v1/packages/catering"

VALID_EVENT_PKG = {
    "id":       "pk-new-1",
    "label":    "Premium",
    "price":    35000.0,
    "features": ["Premium floral decor", "2 coordinators"],
    "is_active": True,
}

VALID_PHOTO_PKG = {
    "id":       "ph-new-1",
    "label":    "Cinematic",
    "price":    32000.0,
    "features": ["Full-day coverage", "Highlight reel"],
    "is_active": True,
}

VALID_CATERING_PKG = {
    "id":            "c-new-1",
    "label":         "Royal Feast",
    "price_per_head": 950.0,
    "features":      ["Multi-cuisine spread", "6 starters"],
    "is_active":     True,
}


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# Shared behaviour — tested once per package type via subclassing

class _PackageGetTests:
    """Mixin — subclasses set URL and seed fixture name."""
    url = None

    def _seed(self, seed_packages):
        # seed_packages returns (ep, pp, cp)
        return seed_packages

    def test_returns_200_with_packages_key(self, client, customer_token, seed_packages):
        res = client.get(self.url, headers=auth(customer_token))
        assert res.status_code == 200
        assert "packages" in res.get_json()

    def test_returns_only_active_packages(self, client, customer_token, seed_packages):
        res = client.get(self.url, headers=auth(customer_token))
        pkgs = res.get_json()["packages"]
        assert all(p["is_active"] for p in pkgs)

    def test_requires_authentication(self, client):
        res = client.get(self.url)
        assert res.status_code == 401

    def test_manager_can_access(self, client, manager_token, seed_packages):
        res = client.get(self.url, headers=auth(manager_token))
        assert res.status_code == 200

    def test_admin_can_access(self, client, admin_token, seed_packages):
        res = client.get(self.url, headers=auth(admin_token))
        assert res.status_code == 200


# EVENT PACKAGES

class TestGetEventPackages(_PackageGetTests):
    url = EVENTS_URL

    def test_event_package_has_price_field(self, client, customer_token, seed_packages):
        res = client.get(self.url, headers=auth(customer_token))
        pkg = res.get_json()["packages"][0]
        assert "price" in pkg
        assert "price_per_head" not in pkg


class TestCreateEventPackage:

    def test_admin_creates_package_returns_201(self, client, admin_token):
        res = client.post(EVENTS_URL, json=VALID_EVENT_PKG, headers=auth(admin_token))
        assert res.status_code == 201
        p = res.get_json()
        assert p["label"] == "Premium"
        assert p["price"] == 35000.0

    def test_features_stored_correctly(self, client, admin_token):
        res = client.post(EVENTS_URL, json=VALID_EVENT_PKG, headers=auth(admin_token))
        assert res.get_json()["features"] == VALID_EVENT_PKG["features"]

    def test_missing_label_returns_400(self, client, admin_token):
        payload = {**VALID_EVENT_PKG, "label": ""}
        res = client.post(EVENTS_URL, json=payload, headers=auth(admin_token))
        assert res.status_code == 400
        assert "label" in res.get_json()["messages"]

    def test_missing_price_returns_400(self, client, admin_token):
        payload = {k: v for k, v in VALID_EVENT_PKG.items() if k != "price"}
        res = client.post(EVENTS_URL, json=payload, headers=auth(admin_token))
        assert res.status_code == 400
        assert "price" in res.get_json()["messages"]

    def test_customer_gets_403(self, client, customer_token):
        res = client.post(EVENTS_URL, json=VALID_EVENT_PKG, headers=auth(customer_token))
        assert res.status_code == 403

    def test_manager_gets_403(self, client, manager_token):
        res = client.post(EVENTS_URL, json=VALID_EVENT_PKG, headers=auth(manager_token))
        assert res.status_code == 403


class TestUpdateEventPackage:

    def test_admin_can_update(self, client, admin_token, seed_packages):
        payload = {**VALID_EVENT_PKG, "label": "Updated Label", "price": 40000.0}
        res = client.put(f"{EVENTS_URL}/pk-test-1", json=payload, headers=auth(admin_token))
        assert res.status_code == 200
        assert res.get_json()["label"] == "Updated Label"
        assert res.get_json()["price"] == 40000.0

    def test_can_deactivate_package(self, client, admin_token, seed_packages):
        payload = {**VALID_EVENT_PKG, "is_active": False}
        res = client.put(f"{EVENTS_URL}/pk-test-1", json=payload, headers=auth(admin_token))
        assert res.status_code == 200
        assert res.get_json()["is_active"] is False

    def test_unknown_id_returns_404(self, client, admin_token):
        res = client.put(f"{EVENTS_URL}/ghost", json=VALID_EVENT_PKG, headers=auth(admin_token))
        assert res.status_code == 404

    def test_customer_gets_403(self, client, customer_token, seed_packages):
        res = client.put(f"{EVENTS_URL}/pk-test-1", json=VALID_EVENT_PKG,
                         headers=auth(customer_token))
        assert res.status_code == 403


class TestDeleteEventPackage:

    def test_admin_can_delete(self, client, admin_token, seed_packages):
        res = client.delete(f"{EVENTS_URL}/pk-test-1", headers=auth(admin_token))
        assert res.status_code == 200
        assert res.get_json()["message"] == "Package deleted successfully"

    def test_deleted_package_not_in_list(self, client, admin_token, seed_packages):
        client.delete(f"{EVENTS_URL}/pk-test-1", headers=auth(admin_token))
        res = client.get(EVENTS_URL, headers=auth(admin_token))
        ids = [p["id"] for p in res.get_json()["packages"]]
        assert "pk-test-1" not in ids

    def test_unknown_id_returns_404(self, client, admin_token):
        res = client.delete(f"{EVENTS_URL}/ghost", headers=auth(admin_token))
        assert res.status_code == 404

    def test_customer_gets_403(self, client, customer_token, seed_packages):
        res = client.delete(f"{EVENTS_URL}/pk-test-1", headers=auth(customer_token))
        assert res.status_code == 403


# PHOTOGRAPHY PACKAGES

class TestGetPhotographyPackages(_PackageGetTests):
    url = PHOTO_URL

    def test_photography_package_has_price_field(self, client, customer_token, seed_packages):
        res = client.get(self.url, headers=auth(customer_token))
        pkg = res.get_json()["packages"][0]
        assert "price" in pkg
        assert "price_per_head" not in pkg


class TestCreatePhotographyPackage:

    def test_admin_creates_package_returns_201(self, client, admin_token):
        res = client.post(PHOTO_URL, json=VALID_PHOTO_PKG, headers=auth(admin_token))
        assert res.status_code == 201
        assert res.get_json()["label"] == "Cinematic"
        assert res.get_json()["price"] == 32000.0

    def test_missing_label_returns_400(self, client, admin_token):
        payload = {**VALID_PHOTO_PKG, "label": ""}
        res = client.post(PHOTO_URL, json=payload, headers=auth(admin_token))
        assert res.status_code == 400
        assert "label" in res.get_json()["messages"]

    def test_missing_price_returns_400(self, client, admin_token):
        payload = {k: v for k, v in VALID_PHOTO_PKG.items() if k != "price"}
        res = client.post(PHOTO_URL, json=payload, headers=auth(admin_token))
        assert res.status_code == 400
        assert "price" in res.get_json()["messages"]

    def test_customer_gets_403(self, client, customer_token):
        res = client.post(PHOTO_URL, json=VALID_PHOTO_PKG, headers=auth(customer_token))
        assert res.status_code == 403


class TestUpdatePhotographyPackage:

    def test_admin_can_update(self, client, admin_token, seed_packages):
        payload = {**VALID_PHOTO_PKG, "label": "New Label", "price": 20000.0}
        res = client.put(f"{PHOTO_URL}/ph-test-1", json=payload, headers=auth(admin_token))
        assert res.status_code == 200
        assert res.get_json()["price"] == 20000.0

    def test_unknown_id_returns_404(self, client, admin_token):
        res = client.put(f"{PHOTO_URL}/ghost", json=VALID_PHOTO_PKG, headers=auth(admin_token))
        assert res.status_code == 404

    def test_customer_gets_403(self, client, customer_token, seed_packages):
        res = client.put(f"{PHOTO_URL}/ph-test-1", json=VALID_PHOTO_PKG,
                         headers=auth(customer_token))
        assert res.status_code == 403


class TestDeletePhotographyPackage:

    def test_admin_can_delete(self, client, admin_token, seed_packages):
        res = client.delete(f"{PHOTO_URL}/ph-test-1", headers=auth(admin_token))
        assert res.status_code == 200

    def test_unknown_id_returns_404(self, client, admin_token):
        res = client.delete(f"{PHOTO_URL}/ghost", headers=auth(admin_token))
        assert res.status_code == 404

    def test_customer_gets_403(self, client, customer_token, seed_packages):
        res = client.delete(f"{PHOTO_URL}/ph-test-1", headers=auth(customer_token))
        assert res.status_code == 403


# CATERING PACKAGES

class TestGetCateringPackages(_PackageGetTests):
    url = CATERING_URL

    def test_catering_package_has_price_per_head_field(self, client, customer_token,
                                                        seed_packages):
        res = client.get(self.url, headers=auth(customer_token))
        pkg = res.get_json()["packages"][0]
        assert "price_per_head" in pkg
        assert "price" not in pkg


class TestCreateCateringPackage:

    def test_admin_creates_package_returns_201(self, client, admin_token):
        res = client.post(CATERING_URL, json=VALID_CATERING_PKG, headers=auth(admin_token))
        assert res.status_code == 201
        assert res.get_json()["label"] == "Royal Feast"
        assert res.get_json()["price_per_head"] == 950.0

    def test_missing_label_returns_400(self, client, admin_token):
        payload = {**VALID_CATERING_PKG, "label": ""}
        res = client.post(CATERING_URL, json=payload, headers=auth(admin_token))
        assert res.status_code == 400
        assert "label" in res.get_json()["messages"]

    def test_missing_price_per_head_returns_400(self, client, admin_token):
        payload = {k: v for k, v in VALID_CATERING_PKG.items() if k != "price_per_head"}
        res = client.post(CATERING_URL, json=payload, headers=auth(admin_token))
        assert res.status_code == 400
        assert "price_per_head" in res.get_json()["messages"]

    def test_sending_price_instead_of_price_per_head_returns_400(self, client, admin_token):
        payload = {"id": "c-wrong", "label": "Test", "price": 500.0}
        res = client.post(CATERING_URL, json=payload, headers=auth(admin_token))
        assert res.status_code == 400
        assert "price_per_head" in res.get_json()["messages"]

    def test_customer_gets_403(self, client, customer_token):
        res = client.post(CATERING_URL, json=VALID_CATERING_PKG, headers=auth(customer_token))
        assert res.status_code == 403


class TestUpdateCateringPackage:

    def test_admin_can_update(self, client, admin_token, seed_packages):
        payload = {**VALID_CATERING_PKG, "label": "Budget Feast", "price_per_head": 300.0}
        res = client.put(f"{CATERING_URL}/c-test-1", json=payload, headers=auth(admin_token))
        assert res.status_code == 200
        assert res.get_json()["price_per_head"] == 300.0

    def test_unknown_id_returns_404(self, client, admin_token):
        res = client.put(f"{CATERING_URL}/ghost", json=VALID_CATERING_PKG,
                         headers=auth(admin_token))
        assert res.status_code == 404

    def test_customer_gets_403(self, client, customer_token, seed_packages):
        res = client.put(f"{CATERING_URL}/c-test-1", json=VALID_CATERING_PKG,
                         headers=auth(customer_token))
        assert res.status_code == 403


class TestDeleteCateringPackage:

    def test_admin_can_delete(self, client, admin_token, seed_packages):
        res = client.delete(f"{CATERING_URL}/c-test-1", headers=auth(admin_token))
        assert res.status_code == 200

    def test_unknown_id_returns_404(self, client, admin_token):
        res = client.delete(f"{CATERING_URL}/ghost", headers=auth(admin_token))
        assert res.status_code == 404

    def test_customer_gets_403(self, client, customer_token, seed_packages):
        res = client.delete(f"{CATERING_URL}/c-test-1", headers=auth(customer_token))
        assert res.status_code == 403
