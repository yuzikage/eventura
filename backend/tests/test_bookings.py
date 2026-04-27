"""
Tests for:
  POST   /api/v1/bookings
  GET    /api/v1/bookings/my
  GET    /api/v1/bookings/all
  GET    /api/v1/bookings/conflicts
  GET    /api/v1/bookings/<id>
  PATCH  /api/v1/bookings/<id>/status
"""

import pytest
from app.models.booking import Booking
from app.models.venue import Venue
from app.models.event_type import EventType
from app.models.theme import Theme
from app.models.packages import EventPackage, PhotographyPackage, CateringPackage

BOOKINGS_URL   = "/api/v1/bookings"
MY_URL         = "/api/v1/bookings/my"
ALL_URL        = "/api/v1/bookings/all"
CONFLICTS_URL  = "/api/v1/bookings/conflicts"


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# Local seed fixture

@pytest.fixture()
def deps(db):
    """Seeds venue, event_type, theme, and all three packages."""
    venue = Venue(id="v-b1", name="Booking Venue", location="Loc",
                  capacity=300, price=60000.0, is_available=True)
    et    = EventType(id="et-b1", label="Wedding", description="", icon="💍")
    theme = Theme(id="t-b1", name="Royal", description="", is_active=True)
    ep    = EventPackage(id="pk-b1", label="Basic", price=15000.0,
                         features=[], is_active=True)
    pp    = PhotographyPackage(id="ph-b1", label="Essential", price=8000.0,
                               features=[], is_active=True)
    cp    = CateringPackage(id="c-b1", label="Standard", price_per_head=350.0,
                            features=[], is_active=True)
    db.session.add_all([venue, et, theme, ep, pp, cp])
    db.session.commit()
    return {
        "venue_id":               "v-b1",
        "event_type_id":          "et-b1",
        "theme_id":               "t-b1",
        "event_package_id":       "pk-b1",
        "photography_package_id": "ph-b1",
        "catering_package_id":    "c-b1",
    }


def valid_payload(deps, event_date="2026-09-20", meeting_date="2026-08-15",
                  meeting_time="11:00 AM"):
    """Builds a complete valid booking payload from seeded dep IDs."""
    return {
        "event_type_id":          deps["event_type_id"],
        "venue_id":               deps["venue_id"],
        "theme_id":               deps["theme_id"],
        "guest_count":            100,
        "event_package_id":       deps["event_package_id"],
        "photography_package_id": deps["photography_package_id"],
        "catering_package_id":    deps["catering_package_id"],
        "event_date":             event_date,
        "meeting_date":           meeting_date,
        "meeting_time":           meeting_time,
        "meeting_notes":          "Prefer outdoor setup",
        "total_estimated_cost":   185000.0,
    }


# POST /bookings

class TestCreateBooking:

    def test_customer_creates_booking_returns_201(self, client, customer_token, deps):
        res = client.post(BOOKINGS_URL, json=valid_payload(deps),
                          headers=auth(customer_token))
        assert res.status_code == 201
        b = res.get_json()
        assert b["status"] == "pending"
        assert b["venue_id"] == deps["venue_id"]
        assert b["guest_count"] == 100

    def test_response_includes_event_date(self, client, customer_token, deps):
        res = client.post(BOOKINGS_URL, json=valid_payload(deps),
                          headers=auth(customer_token))
        assert res.status_code == 201
        assert res.get_json()["event_date"] == "2026-09-20"

    def test_booking_reference_generated(self, client, customer_token, deps):
        res = client.post(BOOKINGS_URL, json=valid_payload(deps),
                          headers=auth(customer_token))
        ref = res.get_json()["booking_reference"]
        assert ref.startswith("EVT-")
        assert len(ref) == 9   # "EVT-" + 5 chars

    def test_booking_belongs_to_logged_in_user(self, client, customer_token, deps, seed_customer):
        res = client.post(BOOKINGS_URL, json=valid_payload(deps),
                          headers=auth(customer_token))
        assert res.get_json()["user_id"] == seed_customer.id

    def test_manager_cannot_create_booking(self, client, manager_token, deps):
        res = client.post(BOOKINGS_URL, json=valid_payload(deps),
                          headers=auth(manager_token))
        assert res.status_code == 403

    def test_admin_cannot_create_booking(self, client, admin_token, deps):
        res = client.post(BOOKINGS_URL, json=valid_payload(deps),
                          headers=auth(admin_token))
        assert res.status_code == 403

    def test_unauthenticated_returns_401(self, client, deps):
        res = client.post(BOOKINGS_URL, json=valid_payload(deps))
        assert res.status_code == 401

    def test_missing_venue_returns_400(self, client, customer_token, deps):
        payload = {**valid_payload(deps), "venue_id": ""}
        res = client.post(BOOKINGS_URL, json=payload, headers=auth(customer_token))
        assert res.status_code == 400
        assert "venue_id" in res.get_json()["messages"]

    def test_missing_guest_count_returns_400(self, client, customer_token, deps):
        payload = {k: v for k, v in valid_payload(deps).items() if k != "guest_count"}
        res = client.post(BOOKINGS_URL, json=payload, headers=auth(customer_token))
        assert res.status_code == 400
        assert "guest_count" in res.get_json()["messages"]

    def test_missing_event_date_returns_400(self, client, customer_token, deps):
        payload = {k: v for k, v in valid_payload(deps).items() if k != "event_date"}
        res = client.post(BOOKINGS_URL, json=payload, headers=auth(customer_token))
        assert res.status_code == 400
        assert "event_date" in res.get_json()["messages"]

    def test_missing_meeting_date_returns_400(self, client, customer_token, deps):
        payload = {k: v for k, v in valid_payload(deps).items() if k != "meeting_date"}
        res = client.post(BOOKINGS_URL, json=payload, headers=auth(customer_token))
        assert res.status_code == 400
        assert "meeting_date" in res.get_json()["messages"]

    def test_missing_meeting_time_returns_400(self, client, customer_token, deps):
        payload = {k: v for k, v in valid_payload(deps).items() if k != "meeting_time"}
        res = client.post(BOOKINGS_URL, json=payload, headers=auth(customer_token))
        assert res.status_code == 400
        assert "meeting_time" in res.get_json()["messages"]

    def test_missing_event_package_returns_400(self, client, customer_token, deps):
        payload = {**valid_payload(deps), "event_package_id": ""}
        res = client.post(BOOKINGS_URL, json=payload, headers=auth(customer_token))
        assert res.status_code == 400
        assert "event_package_id" in res.get_json()["messages"]

    # Conflict tests — now based on event_date, not meeting_date

    def test_duplicate_venue_event_date_returns_409(self, client, customer_token, deps):
        """Same venue, same event date → conflict regardless of meeting details."""
        client.post(BOOKINGS_URL, json=valid_payload(deps), headers=auth(customer_token))
        # Second booking — same venue, same event_date
        res = client.post(BOOKINGS_URL, json=valid_payload(deps),
                          headers=auth(customer_token))
        assert res.status_code == 409
        assert res.get_json()["error"] == "Conflict"

    def test_same_venue_same_event_date_different_meeting_time_is_still_409(
            self, client, customer_token, deps):
        """Meeting time is irrelevant — event date clash still blocks."""
        client.post(BOOKINGS_URL,
                    json=valid_payload(deps, meeting_time="11:00 AM"),
                    headers=auth(customer_token))
        res = client.post(BOOKINGS_URL,
                          json=valid_payload(deps, meeting_time="3:00 PM"),
                          headers=auth(customer_token))
        assert res.status_code == 409

    def test_same_venue_same_event_date_different_meeting_date_is_still_409(
            self, client, customer_token, deps):
        """Different meeting date but same event date → still a venue conflict."""
        client.post(BOOKINGS_URL,
                    json=valid_payload(deps, meeting_date="2026-08-10"),
                    headers=auth(customer_token))
        res = client.post(BOOKINGS_URL,
                          json=valid_payload(deps, meeting_date="2026-08-20"),
                          headers=auth(customer_token))
        assert res.status_code == 409

    def test_same_venue_different_event_date_is_allowed(self, client, customer_token, deps):
        """Different event dates at the same venue are fine."""
        client.post(BOOKINGS_URL,
                    json=valid_payload(deps, event_date="2026-09-20"),
                    headers=auth(customer_token))
        res = client.post(BOOKINGS_URL,
                          json=valid_payload(deps, event_date="2026-10-15"),
                          headers=auth(customer_token))
        assert res.status_code == 201

    def test_same_event_date_different_venue_is_allowed(self, client, customer_token, deps, db):
        """Same event date at a different venue is fine — no conflict."""
        second_venue = Venue(id="v-b2", name="Second Venue", location="Loc2",
                             capacity=200, price=50000.0, is_available=True)
        db.session.add(second_venue)
        db.session.commit()

        client.post(BOOKINGS_URL,
                    json={**valid_payload(deps), "venue_id": "v-b1"},
                    headers=auth(customer_token))
        res = client.post(BOOKINGS_URL,
                          json={**valid_payload(deps), "venue_id": "v-b2"},
                          headers=auth(customer_token))
        assert res.status_code == 201

    def test_same_venue_same_meeting_date_different_event_date_is_allowed(
            self, client, customer_token, deps):
        """Two customers consulting on the same day is fine — meetings don't conflict."""
        client.post(BOOKINGS_URL,
                    json=valid_payload(deps, event_date="2026-09-20", meeting_date="2026-08-15"),
                    headers=auth(customer_token))
        res = client.post(BOOKINGS_URL,
                          json=valid_payload(deps, event_date="2026-10-05", meeting_date="2026-08-15"),
                          headers=auth(customer_token))
        assert res.status_code == 201

    def test_no_body_returns_400(self, client, customer_token):
        res = client.post(BOOKINGS_URL, headers=auth(customer_token))
        assert res.status_code == 400


# GET /bookings/my

class TestGetMyBookings:

    def test_returns_only_own_bookings(self, client, customer_token, deps):
        client.post(BOOKINGS_URL, json=valid_payload(deps), headers=auth(customer_token))
        res = client.get(MY_URL, headers=auth(customer_token))
        assert res.status_code == 200
        bookings = res.get_json()["bookings"]
        assert len(bookings) == 1
        assert bookings[0]["venue_id"] == deps["venue_id"]

    def test_returns_empty_list_when_no_bookings(self, client, customer_token):
        res = client.get(MY_URL, headers=auth(customer_token))
        assert res.status_code == 200
        assert res.get_json()["bookings"] == []

    def test_manager_cannot_access_my(self, client, manager_token):
        res = client.get(MY_URL, headers=auth(manager_token))
        assert res.status_code == 403

    def test_requires_authentication(self, client):
        res = client.get(MY_URL)
        assert res.status_code == 401


# GET /bookings/all

class TestGetAllBookings:

    def test_manager_sees_all_bookings(self, client, manager_token, customer_token, deps):
        client.post(BOOKINGS_URL, json=valid_payload(deps), headers=auth(customer_token))
        res = client.get(ALL_URL, headers=auth(manager_token))
        assert res.status_code == 200
        assert len(res.get_json()["bookings"]) == 1

    def test_admin_sees_all_bookings(self, client, admin_token, customer_token, deps):
        client.post(BOOKINGS_URL, json=valid_payload(deps), headers=auth(customer_token))
        res = client.get(ALL_URL, headers=auth(admin_token))
        assert res.status_code == 200
        assert len(res.get_json()["bookings"]) >= 1

    def test_response_includes_expanded_objects(self, client, manager_token,
                                                customer_token, deps):
        client.post(BOOKINGS_URL, json=valid_payload(deps), headers=auth(customer_token))
        res = client.get(ALL_URL, headers=auth(manager_token))
        b = res.get_json()["bookings"][0]
        assert isinstance(b.get("user"),  dict)
        assert isinstance(b.get("venue"), dict)

    def test_response_includes_event_date(self, client, manager_token, customer_token, deps):
        client.post(BOOKINGS_URL, json=valid_payload(deps), headers=auth(customer_token))
        res = client.get(ALL_URL, headers=auth(manager_token))
        b = res.get_json()["bookings"][0]
        assert b.get("event_date") == "2026-09-20"

    def test_status_filter_confirmed(self, client, manager_token, customer_token, deps):
        create_res = client.post(BOOKINGS_URL, json=valid_payload(deps),
                                 headers=auth(customer_token))
        booking_id = create_res.get_json()["id"]
        client.patch(f"{BOOKINGS_URL}/{booking_id}/status",
                     json={"status": "confirmed"}, headers=auth(manager_token))

        res = client.get(f"{ALL_URL}?status=confirmed", headers=auth(manager_token))
        assert res.status_code == 200
        bookings = res.get_json()["bookings"]
        assert all(b["status"] == "confirmed" for b in bookings)

    def test_status_filter_pending(self, client, manager_token, customer_token, deps):
        client.post(BOOKINGS_URL, json=valid_payload(deps), headers=auth(customer_token))
        res = client.get(f"{ALL_URL}?status=pending", headers=auth(manager_token))
        assert res.status_code == 200
        assert all(b["status"] == "pending" for b in res.get_json()["bookings"])

    def test_invalid_status_filter_returns_400(self, client, manager_token):
        res = client.get(f"{ALL_URL}?status=invalid", headers=auth(manager_token))
        assert res.status_code == 400

    def test_customer_gets_403(self, client, customer_token):
        res = client.get(ALL_URL, headers=auth(customer_token))
        assert res.status_code == 403

    def test_requires_authentication(self, client):
        res = client.get(ALL_URL)
        assert res.status_code == 401


# GET /bookings/conflicts

class TestGetConflicts:

    def test_returns_empty_when_no_conflicts(self, client, manager_token, customer_token, deps):
        client.post(BOOKINGS_URL, json=valid_payload(deps), headers=auth(customer_token))
        res = client.get(CONFLICTS_URL, headers=auth(manager_token))
        assert res.status_code == 200
        assert res.get_json()["conflicts"] == []

    def test_detects_conflict_same_venue_same_event_date(self, client, manager_token,
                                                          customer_token, deps, db):
        """Two bookings at the same venue on the same event date → conflict."""
        client.post(BOOKINGS_URL, json=valid_payload(deps), headers=auth(customer_token))

        from app.models.user import User
        from werkzeug.security import generate_password_hash
        second_user = User(name="Second", email="second@test.com",
                           password_hash=generate_password_hash("pass123"),
                           phone="1111111111", role="customer")
        db.session.add(second_user)
        db.session.commit()

        from datetime import date as dt
        conflict_booking = Booking(
            user_id=second_user.id,
            venue_id=deps["venue_id"],
            theme_id=deps["theme_id"],
            guest_count=50,
            event_package_id=deps["event_package_id"],
            photography_package_id=deps["photography_package_id"],
            catering_package_id=deps["catering_package_id"],
            event_date=dt(2026, 9, 20),   # same event_date as valid_payload default
            meeting_date=dt(2026, 8, 20), # different meeting date — doesn't matter
            meeting_time="2:00 PM",       # different meeting time — doesn't matter
            status="pending",
        )
        db.session.add(conflict_booking)
        db.session.commit()

        res = client.get(CONFLICTS_URL, headers=auth(manager_token))
        assert res.status_code == 200
        conflicts = res.get_json()["conflicts"]
        assert len(conflicts) == 1
        assert conflicts[0]["venue"] == "Booking Venue"
        assert conflicts[0]["date"] == "2026-09-20"
        assert len(conflicts[0]["bookings"]) == 2

    def test_same_venue_different_event_date_no_conflict(self, client, manager_token,
                                                          customer_token, deps, db):
        """Different event dates at the same venue → no conflict."""
        client.post(BOOKINGS_URL,
                    json=valid_payload(deps, event_date="2026-09-20"),
                    headers=auth(customer_token))

        from app.models.user import User
        from werkzeug.security import generate_password_hash
        second_user = User(name="Third", email="third@test.com",
                           password_hash=generate_password_hash("pass123"),
                           phone="3333333333", role="customer")
        db.session.add(second_user)
        db.session.commit()

        from datetime import date as dt
        other_booking = Booking(
            user_id=second_user.id,
            venue_id=deps["venue_id"],
            theme_id=deps["theme_id"],
            guest_count=80,
            event_package_id=deps["event_package_id"],
            photography_package_id=deps["photography_package_id"],
            catering_package_id=deps["catering_package_id"],
            event_date=dt(2026, 10, 15),  # different event date
            meeting_date=dt(2026, 8, 15),
            meeting_time="11:00 AM",
            status="pending",
        )
        db.session.add(other_booking)
        db.session.commit()

        res = client.get(CONFLICTS_URL, headers=auth(manager_token))
        assert res.status_code == 200
        assert res.get_json()["conflicts"] == []

    def test_customer_gets_403(self, client, customer_token):
        res = client.get(CONFLICTS_URL, headers=auth(customer_token))
        assert res.status_code == 403

    def test_requires_authentication(self, client):
        res = client.get(CONFLICTS_URL)
        assert res.status_code == 401


# GET /bookings/<id>

class TestGetBooking:

    def test_customer_can_view_own_booking(self, client, customer_token, deps):
        create_res = client.post(BOOKINGS_URL, json=valid_payload(deps),
                                 headers=auth(customer_token))
        booking_id = create_res.get_json()["id"]
        res = client.get(f"{BOOKINGS_URL}/{booking_id}", headers=auth(customer_token))
        assert res.status_code == 200
        assert res.get_json()["id"] == booking_id

    def test_response_is_full_expanded_dict(self, client, customer_token, deps):
        create_res = client.post(BOOKINGS_URL, json=valid_payload(deps),
                                 headers=auth(customer_token))
        booking_id = create_res.get_json()["id"]
        res = client.get(f"{BOOKINGS_URL}/{booking_id}", headers=auth(customer_token))
        b = res.get_json()
        assert isinstance(b.get("venue"), dict)
        assert isinstance(b.get("user"),  dict)

    def test_response_includes_event_date(self, client, customer_token, deps):
        create_res = client.post(BOOKINGS_URL, json=valid_payload(deps),
                                 headers=auth(customer_token))
        booking_id = create_res.get_json()["id"]
        res = client.get(f"{BOOKINGS_URL}/{booking_id}", headers=auth(customer_token))
        assert res.get_json()["event_date"] == "2026-09-20"

    def test_customer_cannot_view_other_customers_booking(self, client, customer_token,
                                                           deps, db):
        from app.models.user import User
        from werkzeug.security import generate_password_hash
        from datetime import date as dt
        other = User(name="Other", email="other@test.com",
                     password_hash=generate_password_hash("pass123"),
                     phone="2222222222", role="customer")
        db.session.add(other)
        db.session.commit()

        other_booking = Booking(
            user_id=other.id,
            venue_id=deps["venue_id"],
            theme_id=deps["theme_id"],
            guest_count=50,
            event_package_id=deps["event_package_id"],
            photography_package_id=deps["photography_package_id"],
            catering_package_id=deps["catering_package_id"],
            event_date=dt(2026, 11, 10),
            meeting_date=dt(2026, 11, 1),
            meeting_time="10:00 AM",
            status="pending",
        )
        db.session.add(other_booking)
        db.session.commit()

        res = client.get(f"{BOOKINGS_URL}/{other_booking.id}",
                         headers=auth(customer_token))
        assert res.status_code == 403

    def test_manager_can_view_any_booking(self, client, manager_token,
                                           customer_token, deps):
        create_res = client.post(BOOKINGS_URL, json=valid_payload(deps),
                                 headers=auth(customer_token))
        booking_id = create_res.get_json()["id"]
        res = client.get(f"{BOOKINGS_URL}/{booking_id}", headers=auth(manager_token))
        assert res.status_code == 200

    def test_admin_can_view_any_booking(self, client, admin_token,
                                         customer_token, deps):
        create_res = client.post(BOOKINGS_URL, json=valid_payload(deps),
                                 headers=auth(customer_token))
        booking_id = create_res.get_json()["id"]
        res = client.get(f"{BOOKINGS_URL}/{booking_id}", headers=auth(admin_token))
        assert res.status_code == 200

    def test_unknown_id_returns_404(self, client, customer_token):
        res = client.get(f"{BOOKINGS_URL}/does-not-exist",
                         headers=auth(customer_token))
        assert res.status_code == 404

    def test_requires_authentication(self, client):
        res = client.get(f"{BOOKINGS_URL}/any-id")
        assert res.status_code == 401


# PATCH /bookings/<id>/status

class TestUpdateBookingStatus:

    def test_manager_can_confirm_booking(self, client, manager_token,
                                          customer_token, deps):
        create_res = client.post(BOOKINGS_URL, json=valid_payload(deps),
                                 headers=auth(customer_token))
        booking_id = create_res.get_json()["id"]
        res = client.patch(f"{BOOKINGS_URL}/{booking_id}/status",
                           json={"status": "confirmed"},
                           headers=auth(manager_token))
        assert res.status_code == 200
        assert res.get_json()["status"] == "confirmed"

    def test_manager_can_cancel_booking(self, client, manager_token,
                                         customer_token, deps):
        create_res = client.post(BOOKINGS_URL, json=valid_payload(deps),
                                 headers=auth(customer_token))
        booking_id = create_res.get_json()["id"]
        res = client.patch(f"{BOOKINGS_URL}/{booking_id}/status",
                           json={"status": "cancelled"},
                           headers=auth(manager_token))
        assert res.status_code == 200
        assert res.get_json()["status"] == "cancelled"

    def test_admin_can_update_status(self, client, admin_token,
                                      customer_token, deps):
        create_res = client.post(BOOKINGS_URL, json=valid_payload(deps),
                                 headers=auth(customer_token))
        booking_id = create_res.get_json()["id"]
        res = client.patch(f"{BOOKINGS_URL}/{booking_id}/status",
                           json={"status": "confirmed"},
                           headers=auth(admin_token))
        assert res.status_code == 200

    def test_invalid_status_returns_400(self, client, manager_token,
                                         customer_token, deps):
        create_res = client.post(BOOKINGS_URL, json=valid_payload(deps),
                                 headers=auth(customer_token))
        booking_id = create_res.get_json()["id"]
        res = client.patch(f"{BOOKINGS_URL}/{booking_id}/status",
                           json={"status": "approved"},
                           headers=auth(manager_token))
        assert res.status_code == 400
        assert "status" in res.get_json()["messages"]

    def test_unknown_booking_returns_404(self, client, manager_token):
        res = client.patch(f"{BOOKINGS_URL}/ghost/status",
                           json={"status": "confirmed"},
                           headers=auth(manager_token))
        assert res.status_code == 404

    def test_customer_gets_403(self, client, customer_token, deps):
        create_res = client.post(BOOKINGS_URL, json=valid_payload(deps),
                                 headers=auth(customer_token))
        booking_id = create_res.get_json()["id"]
        res = client.patch(f"{BOOKINGS_URL}/{booking_id}/status",
                           json={"status": "confirmed"},
                           headers=auth(customer_token))
        assert res.status_code == 403

    def test_requires_authentication(self, client):
        res = client.patch(f"{BOOKINGS_URL}/any-id/status",
                           json={"status": "confirmed"})
        assert res.status_code == 401
