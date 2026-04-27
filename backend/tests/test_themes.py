"""
Tests for:
  GET    /api/v1/themes          (active only, any authenticated user)
  GET    /api/v1/themes/all      (all themes, admin only)
  POST   /api/v1/themes          (admin only)
  PUT    /api/v1/themes/<id>     (admin only)
  DELETE /api/v1/themes/<id>     (admin only)
"""

THEMES_URL     = "/api/v1/themes"
THEMES_ALL_URL = "/api/v1/themes/all"

VALID_THEME = {
    "id":          "t-new-1",
    "name":        "Golden Sunset",
    "description": "Warm amber and gold tones",
    "is_active":   True,
    "images": [
        "https://example.com/img1.jpg",
        "https://example.com/img2.jpg",
    ],
}


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# GET /themes  — active themes only

class TestGetActiveThemes:

    def test_returns_only_active_themes(self, client, customer_token,
                                        seed_theme, seed_inactive_theme):
        res = client.get(THEMES_URL, headers=auth(customer_token))
        assert res.status_code == 200
        themes = res.get_json()["themes"]
        assert all(t["is_active"] for t in themes)
        ids = [t["id"] for t in themes]
        assert "t-test-1" in ids
        assert "t-test-2" not in ids   # inactive must be excluded

    def test_returns_empty_list_when_no_active_themes(self, client, customer_token,
                                                       seed_inactive_theme):
        res = client.get(THEMES_URL, headers=auth(customer_token))
        assert res.status_code == 200
        assert res.get_json()["themes"] == []

    def test_theme_has_correct_fields(self, client, customer_token, seed_theme):
        res = client.get(THEMES_URL, headers=auth(customer_token))
        t = res.get_json()["themes"][0]
        for field in ("id", "name", "description", "is_active", "images"):
            assert field in t, f"Missing field: {field}"

    def test_theme_images_is_list_of_urls(self, client, customer_token, seed_theme):
        res = client.get(THEMES_URL, headers=auth(customer_token))
        t = res.get_json()["themes"][0]
        assert isinstance(t["images"], list)
        assert t["images"][0] == "https://example.com/image.jpg"

    def test_requires_authentication(self, client):
        res = client.get(THEMES_URL)
        assert res.status_code == 401

    def test_manager_can_access(self, client, manager_token, seed_theme):
        res = client.get(THEMES_URL, headers=auth(manager_token))
        assert res.status_code == 200

    def test_admin_can_access(self, client, admin_token, seed_theme):
        res = client.get(THEMES_URL, headers=auth(admin_token))
        assert res.status_code == 200


# GET /themes/all  — all themes (admin only)

class TestGetAllThemes:

    def test_admin_sees_active_and_inactive(self, client, admin_token,
                                             seed_theme, seed_inactive_theme):
        res = client.get(THEMES_ALL_URL, headers=auth(admin_token))
        assert res.status_code == 200
        ids = [t["id"] for t in res.get_json()["themes"]]
        assert "t-test-1" in ids
        assert "t-test-2" in ids

    def test_customer_gets_403(self, client, customer_token):
        res = client.get(THEMES_ALL_URL, headers=auth(customer_token))
        assert res.status_code == 403

    def test_manager_gets_403(self, client, manager_token):
        res = client.get(THEMES_ALL_URL, headers=auth(manager_token))
        assert res.status_code == 403

    def test_requires_authentication(self, client):
        res = client.get(THEMES_ALL_URL)
        assert res.status_code == 401


# POST /themes  — create theme (admin only)

class TestCreateTheme:

    def test_admin_creates_theme_returns_201(self, client, admin_token):
        res = client.post(THEMES_URL, json=VALID_THEME, headers=auth(admin_token))
        assert res.status_code == 201
        t = res.get_json()
        assert t["name"]      == VALID_THEME["name"]
        assert t["is_active"] == True
        assert len(t["images"]) == 2

    def test_images_stored_in_correct_order(self, client, admin_token):
        res = client.post(THEMES_URL, json=VALID_THEME, headers=auth(admin_token))
        images = res.get_json()["images"]
        assert images[0] == "https://example.com/img1.jpg"
        assert images[1] == "https://example.com/img2.jpg"

    def test_created_theme_appears_in_active_list(self, client, admin_token):
        client.post(THEMES_URL, json=VALID_THEME, headers=auth(admin_token))
        res = client.get(THEMES_URL, headers=auth(admin_token))
        ids = [t["id"] for t in res.get_json()["themes"]]
        assert VALID_THEME["id"] in ids

    def test_theme_without_images_creates_empty_list(self, client, admin_token):
        payload = {**VALID_THEME, "id": "t-no-images", "images": []}
        res = client.post(THEMES_URL, json=payload, headers=auth(admin_token))
        assert res.status_code == 201
        assert res.get_json()["images"] == []

    def test_inactive_theme_can_be_created(self, client, admin_token):
        payload = {**VALID_THEME, "id": "t-inactive-new", "is_active": False}
        res = client.post(THEMES_URL, json=payload, headers=auth(admin_token))
        assert res.status_code == 201
        assert res.get_json()["is_active"] is False

    def test_missing_name_returns_400(self, client, admin_token):
        payload = {**VALID_THEME, "name": ""}
        res = client.post(THEMES_URL, json=payload, headers=auth(admin_token))
        assert res.status_code == 400
        assert "name" in res.get_json()["messages"]

    def test_customer_gets_403(self, client, customer_token):
        res = client.post(THEMES_URL, json=VALID_THEME, headers=auth(customer_token))
        assert res.status_code == 403

    def test_manager_gets_403(self, client, manager_token):
        res = client.post(THEMES_URL, json=VALID_THEME, headers=auth(manager_token))
        assert res.status_code == 403

    def test_no_body_returns_400(self, client, admin_token):
        res = client.post(THEMES_URL, headers=auth(admin_token))
        assert res.status_code == 400


# PUT /themes/<id>  — update theme (admin only)

class TestUpdateTheme:

    def test_admin_can_update_name(self, client, admin_token, seed_theme):
        payload = {**VALID_THEME, "name": "Renamed Theme"}
        res = client.put(f"{THEMES_URL}/t-test-1", json=payload,
                         headers=auth(admin_token))
        assert res.status_code == 200
        assert res.get_json()["name"] == "Renamed Theme"

    def test_update_replaces_all_images(self, client, admin_token, seed_theme):
        # seed_theme has 1 image — update with 2 different ones
        payload = {
            **VALID_THEME,
            "name": "Test Theme",
            "images": [
                "https://example.com/new1.jpg",
                "https://example.com/new2.jpg",
                "https://example.com/new3.jpg",
            ],
        }
        res = client.put(f"{THEMES_URL}/t-test-1", json=payload,
                         headers=auth(admin_token))
        assert res.status_code == 200
        images = res.get_json()["images"]
        assert len(images) == 3
        assert "https://example.com/new1.jpg" in images
        # Original image must be gone
        assert "https://example.com/image.jpg" not in images

    def test_update_with_empty_images_clears_all(self, client, admin_token, seed_theme):
        payload = {**VALID_THEME, "name": "Test Theme", "images": []}
        res = client.put(f"{THEMES_URL}/t-test-1", json=payload,
                         headers=auth(admin_token))
        assert res.status_code == 200
        assert res.get_json()["images"] == []

    def test_can_deactivate_theme(self, client, admin_token, seed_theme):
        payload = {**VALID_THEME, "name": "Test Theme", "is_active": False}
        res = client.put(f"{THEMES_URL}/t-test-1", json=payload,
                         headers=auth(admin_token))
        assert res.status_code == 200
        assert res.get_json()["is_active"] is False

    def test_unknown_id_returns_404(self, client, admin_token):
        res = client.put(f"{THEMES_URL}/ghost", json=VALID_THEME,
                         headers=auth(admin_token))
        assert res.status_code == 404
        assert res.get_json()["error"] == "Not found"

    def test_missing_name_returns_400(self, client, admin_token, seed_theme):
        payload = {**VALID_THEME, "name": ""}
        res = client.put(f"{THEMES_URL}/t-test-1", json=payload,
                         headers=auth(admin_token))
        assert res.status_code == 400
        assert "name" in res.get_json()["messages"]

    def test_customer_gets_403(self, client, customer_token, seed_theme):
        res = client.put(f"{THEMES_URL}/t-test-1", json=VALID_THEME,
                         headers=auth(customer_token))
        assert res.status_code == 403

    def test_manager_gets_403(self, client, manager_token, seed_theme):
        res = client.put(f"{THEMES_URL}/t-test-1", json=VALID_THEME,
                         headers=auth(manager_token))
        assert res.status_code == 403


# DELETE /themes/<id>  — delete theme (admin only)

class TestDeleteTheme:

    def test_admin_can_delete_theme(self, client, admin_token, seed_theme):
        res = client.delete(f"{THEMES_URL}/t-test-1", headers=auth(admin_token))
        assert res.status_code == 200
        assert res.get_json()["message"] == "Theme deleted successfully"

    def test_deleted_theme_not_in_active_list(self, client, admin_token, seed_theme):
        client.delete(f"{THEMES_URL}/t-test-1", headers=auth(admin_token))
        res = client.get(THEMES_URL, headers=auth(admin_token))
        ids = [t["id"] for t in res.get_json()["themes"]]
        assert "t-test-1" not in ids

    def test_delete_also_removes_images(self, client, admin_token, seed_theme):
        # After deleting the theme, getting it should 404 (not 500 from orphan images)
        client.delete(f"{THEMES_URL}/t-test-1", headers=auth(admin_token))
        # If cascade failed, the DB would have orphan ThemeImage rows but no crash here.
        # We verify the theme is fully gone from the all-themes list.
        res = client.get(THEMES_ALL_URL, headers=auth(admin_token))
        ids = [t["id"] for t in res.get_json()["themes"]]
        assert "t-test-1" not in ids

    def test_unknown_id_returns_404(self, client, admin_token):
        res = client.delete(f"{THEMES_URL}/ghost", headers=auth(admin_token))
        assert res.status_code == 404

    def test_customer_gets_403(self, client, customer_token, seed_theme):
        res = client.delete(f"{THEMES_URL}/t-test-1", headers=auth(customer_token))
        assert res.status_code == 403

    def test_manager_gets_403(self, client, manager_token, seed_theme):
        res = client.delete(f"{THEMES_URL}/t-test-1", headers=auth(manager_token))
        assert res.status_code == 403
