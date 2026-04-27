"""
Tests for:
  GET /api/v1/admin/stats
  GET /api/v1/admin/revenue
"""

import pytest
from datetime import datetime, date
from app.models.booking import Booking
from app.models.venue import Venue
from app.models.event_type import EventType
from app.models.theme import Theme
from app.models.packages import EventPackage, PhotographyPackage, CateringPackage
from app.models.user import User
from werkzeug.security import generate_password_hash

STATS_URL   = "/api/v1/admin/stats"
REVENUE_URL = "/api/v1/admin/revenue"


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# Local fixtures

@pytest.fixture()
def booking_deps(db):
    """Seeds the minimum FK rows needed to create bookings."""
    venue = Venue(id="v-a1", name="Admin Venue", location="Loc",
                  capacity=300, price=60000.0, is_available=True)
    et    = EventType(id="et-a1", label="Corporate", description="", icon="💼")
    theme = Theme(id="t-a1", name="Classic", description="", is_active=True)
    ep    = EventPackage(id="pk-a1", label="Basic", price=10000.0,
                         features=[], is_active=True)
    pp    = PhotographyPackage(id="ph-a1", label="Essential", price=5000.0,
                               features=[], is_active=True)
    cp    = CateringPackage(id="c-a1", label="Standard", price_per_head=300.0,
                            features=[], is_active=True)
    customer = User(
        id="u-admin-test",
        name="Admin Test Customer",
        email="admincustomer@test.com",
        password_hash=generate_password_hash("pass123"),
        phone="9999999999",
        role="customer",
    )
    db.session.add_all([venue, et, theme, ep, pp, cp, customer])
    db.session.commit()
    return {
        "user_id":                "u-admin-test",
        "venue_id":               "v-a1",
        "theme_id":               "t-a1",
        "event_package_id":       "pk-a1",
        "photography_package_id": "ph-a1",
        "catering_package_id":    "c-a1",
    }


def make_booking(db, deps, status="pending", cost=100000.0,
                 meeting_date=None, event_date=None, created_at=None):
    """Inserts a booking directly into the DB with full control over fields."""
    b = Booking(
        user_id=deps["user_id"],
        venue_id=deps["venue_id"],
        theme_id=deps["theme_id"],
        guest_count=100,
        event_package_id=deps["event_package_id"],
        photography_package_id=deps["photography_package_id"],
        catering_package_id=deps["catering_package_id"],
        event_date=event_date or date(2026, 10, 15),
        meeting_date=meeting_date or date(2026, 9, 1),
        meeting_time="10:00 AM",
        total_estimated_cost=cost,
        status=status,
    )
    if created_at:
        b.created_at = created_at
    db.session.add(b)
    db.session.commit()
    return b


# GET /admin/stats

class TestAdminStats:

    def test_requires_admin(self, client, customer_token):
        res = client.get(STATS_URL, headers=auth(customer_token))
        assert res.status_code == 403

    def test_manager_gets_403(self, client, manager_token):
        res = client.get(STATS_URL, headers=auth(manager_token))
        assert res.status_code == 403

    def test_requires_authentication(self, client):
        res = client.get(STATS_URL)
        assert res.status_code == 401

    def test_returns_correct_shape(self, client, admin_token):
        res = client.get(STATS_URL, headers=auth(admin_token))
        assert res.status_code == 200
        data = res.get_json()
        for field in ("total_bookings", "confirmed", "pending",
                      "cancelled", "projected_revenue", "confirmed_revenue"):
            assert field in data, f"Missing field: {field}"

    def test_no_longer_returns_total_revenue_field(self, client, admin_token):
        # total_revenue was renamed to projected_revenue
        res = client.get(STATS_URL, headers=auth(admin_token))
        assert "total_revenue" not in res.get_json()

    def test_zero_stats_on_empty_db(self, client, admin_token):
        res = client.get(STATS_URL, headers=auth(admin_token))
        assert res.status_code == 200
        data = res.get_json()
        assert data["total_bookings"]    == 0
        assert data["projected_revenue"] == 0.0

    def test_counts_bookings_by_status(self, client, admin_token, booking_deps, db):
        make_booking(db, booking_deps, status="pending",   cost=50000.0,
                     meeting_date=date(2026, 9, 1),  event_date=date(2026, 11, 1))
        make_booking(db, booking_deps, status="confirmed", cost=80000.0,
                     meeting_date=date(2026, 9, 2),  event_date=date(2026, 11, 2))
        make_booking(db, booking_deps, status="confirmed", cost=70000.0,
                     meeting_date=date(2026, 9, 3),  event_date=date(2026, 11, 3))
        make_booking(db, booking_deps, status="cancelled", cost=40000.0,
                     meeting_date=date(2026, 9, 4),  event_date=date(2026, 11, 4))

        res = client.get(STATS_URL, headers=auth(admin_token))
        data = res.get_json()
        assert data["total_bookings"] == 4
        assert data["pending"]        == 1
        assert data["confirmed"]      == 2
        assert data["cancelled"]      == 1

    def test_projected_revenue_excludes_cancelled(self, client, admin_token,
                                                   booking_deps, db):
        """Projected revenue = confirmed + pending; cancelled bookings are excluded."""
        make_booking(db, booking_deps, status="pending",   cost=50000.0,
                     meeting_date=date(2026, 9, 1), event_date=date(2026, 11, 1))
        make_booking(db, booking_deps, status="confirmed", cost=80000.0,
                     meeting_date=date(2026, 9, 2), event_date=date(2026, 11, 2))
        make_booking(db, booking_deps, status="cancelled", cost=40000.0,
                     meeting_date=date(2026, 9, 3), event_date=date(2026, 11, 3))

        res = client.get(STATS_URL, headers=auth(admin_token))
        data = res.get_json()
        # 50000 (pending) + 80000 (confirmed) = 130000; cancelled 40000 excluded
        assert data["projected_revenue"] == 130000.0

    def test_projected_revenue_equals_confirmed_plus_pending(self, client, admin_token,
                                                              booking_deps, db):
        make_booking(db, booking_deps, status="pending",   cost=30000.0,
                     meeting_date=date(2026, 9, 1), event_date=date(2026, 11, 1))
        make_booking(db, booking_deps, status="confirmed", cost=70000.0,
                     meeting_date=date(2026, 9, 2), event_date=date(2026, 11, 2))

        res = client.get(STATS_URL, headers=auth(admin_token))
        data = res.get_json()
        assert data["projected_revenue"] == 100000.0
        assert data["confirmed_revenue"] == 70000.0

    def test_confirmed_revenue_only_sums_confirmed(self, client, admin_token,
                                                    booking_deps, db):
        make_booking(db, booking_deps, status="pending",   cost=50000.0,
                     meeting_date=date(2026, 9, 1), event_date=date(2026, 11, 1))
        make_booking(db, booking_deps, status="confirmed", cost=80000.0,
                     meeting_date=date(2026, 9, 2), event_date=date(2026, 11, 2))
        make_booking(db, booking_deps, status="confirmed", cost=70000.0,
                     meeting_date=date(2026, 9, 3), event_date=date(2026, 11, 3))

        res = client.get(STATS_URL, headers=auth(admin_token))
        assert res.get_json()["confirmed_revenue"] == 150000.0



# GET /admin/revenue

class TestAdminRevenue:

    def test_requires_admin(self, client, customer_token):
        res = client.get(REVENUE_URL, headers=auth(customer_token))
        assert res.status_code == 403

    def test_manager_gets_403(self, client, manager_token):
        res = client.get(REVENUE_URL, headers=auth(manager_token))
        assert res.status_code == 403

    def test_requires_authentication(self, client):
        res = client.get(REVENUE_URL)
        assert res.status_code == 401

    def test_returns_correct_shape(self, client, admin_token):
        res = client.get(REVENUE_URL, headers=auth(admin_token))
        assert res.status_code == 200
        data = res.get_json()
        assert "revenue" in data
        assert isinstance(data["revenue"], list)

    def test_default_returns_6_months(self, client, admin_token):
        res = client.get(REVENUE_URL, headers=auth(admin_token))
        assert len(res.get_json()["revenue"]) == 6

    def test_months_param_controls_length(self, client, admin_token):
        res = client.get(f"{REVENUE_URL}?months=3", headers=auth(admin_token))
        assert res.status_code == 200
        assert len(res.get_json()["revenue"]) == 3

    def test_months_12_returns_12_entries(self, client, admin_token):
        res = client.get(f"{REVENUE_URL}?months=12", headers=auth(admin_token))
        assert len(res.get_json()["revenue"]) == 12

    def test_invalid_months_returns_400(self, client, admin_token):
        res = client.get(f"{REVENUE_URL}?months=abc", headers=auth(admin_token))
        assert res.status_code == 400

    def test_months_below_1_returns_400(self, client, admin_token):
        res = client.get(f"{REVENUE_URL}?months=0", headers=auth(admin_token))
        assert res.status_code == 400

    def test_months_above_24_returns_400(self, client, admin_token):
        res = client.get(f"{REVENUE_URL}?months=25", headers=auth(admin_token))
        assert res.status_code == 400

    def test_each_entry_has_required_fields(self, client, admin_token):
        res = client.get(REVENUE_URL, headers=auth(admin_token))
        for entry in res.get_json()["revenue"]:
            for field in ("month", "total_revenue", "confirmed_revenue",
                          "booking_count", "avg_per_booking"):
                assert field in entry, f"Missing field: {field}"

    def test_month_format_is_yyyy_mm(self, client, admin_token):
        res = client.get(REVENUE_URL, headers=auth(admin_token))
        import re
        for entry in res.get_json()["revenue"]:
            assert re.match(r"^\d{4}-\d{2}$", entry["month"]), \
                f"Bad month format: {entry['month']}"

    def test_months_ordered_oldest_to_newest(self, client, admin_token):
        res = client.get(REVENUE_URL, headers=auth(admin_token))
        months = [e["month"] for e in res.get_json()["revenue"]]
        assert months == sorted(months)

    def test_current_month_is_last_entry(self, client, admin_token):
        current = date.today().strftime("%Y-%m")
        res = client.get(REVENUE_URL, headers=auth(admin_token))
        assert res.get_json()["revenue"][-1]["month"] == current

    def test_empty_months_have_zero_values(self, client, admin_token):
        res = client.get(REVENUE_URL, headers=auth(admin_token))
        for entry in res.get_json()["revenue"]:
            assert entry["total_revenue"]     == 0.0
            assert entry["confirmed_revenue"] == 0.0
            assert entry["booking_count"]     == 0
            assert entry["avg_per_booking"]   == 0.0

    def test_total_revenue_excludes_cancelled(self, client, admin_token,
                                               booking_deps, db):
        """Monthly total_revenue is confirmed + pending; cancelled is excluded."""
        now = datetime.utcnow()
        b1 = make_booking(db, booking_deps, status="confirmed", cost=100000.0,
                          meeting_date=date(now.year, now.month, 1),
                          event_date=date(now.year + 1, 1, 10))
        b1.created_at = now
        b2 = make_booking(db, booking_deps, status="pending", cost=60000.0,
                          meeting_date=date(now.year, now.month, 2),
                          event_date=date(now.year + 1, 2, 10))
        b2.created_at = now
        b3 = make_booking(db, booking_deps, status="cancelled", cost=40000.0,
                          meeting_date=date(now.year, now.month, 3),
                          event_date=date(now.year + 1, 3, 10))
        b3.created_at = now
        db.session.commit()

        res = client.get(REVENUE_URL, headers=auth(admin_token))
        current_month = now.strftime("%Y-%m")
        entry = next(e for e in res.get_json()["revenue"] if e["month"] == current_month)

        # booking_count excludes cancelled (confirmed + pending only)
        assert entry["booking_count"]     == 2
        # total_revenue = confirmed + pending only (100000 + 60000)
        assert entry["total_revenue"]     == 160000.0
        # confirmed_revenue = confirmed only
        assert entry["confirmed_revenue"] == 100000.0

    def test_revenue_aggregated_correctly_for_current_month(self, client, admin_token,
                                                             booking_deps, db):
        now = datetime.utcnow()
        b1 = make_booking(db, booking_deps, status="confirmed", cost=100000.0,
                          meeting_date=date(now.year, now.month, 1),
                          event_date=date(now.year + 1, 1, 15))
        b1.created_at = now
        b2 = make_booking(db, booking_deps, status="pending", cost=60000.0,
                          meeting_date=date(now.year, now.month, 2),
                          event_date=date(now.year + 1, 2, 15))
        b2.created_at = now
        db.session.commit()

        res = client.get(REVENUE_URL, headers=auth(admin_token))
        current_month = now.strftime("%Y-%m")
        entry = next(e for e in res.get_json()["revenue"] if e["month"] == current_month)

        assert entry["booking_count"]     == 2
        # Both confirmed and pending contribute to total_revenue
        assert entry["total_revenue"]     == 160000.0
        assert entry["confirmed_revenue"] == 100000.0
        # avg = 160000 / 2 active bookings
        assert entry["avg_per_booking"]   == 80000.0

    def test_avg_per_booking_excludes_cancelled_from_denominator(self, client, admin_token,
                                                                   booking_deps, db):
        """avg_per_booking divides projected revenue by active (non-cancelled) count."""
        now = datetime.utcnow()
        for i, (status, cost) in enumerate([
            ("confirmed", 90000.0),
            ("pending",   60000.0),
            ("cancelled", 30000.0),   # should not affect avg
        ]):
            b = make_booking(db, booking_deps, status=status, cost=cost,
                             meeting_date=date(now.year, now.month, i + 1),
                             event_date=date(now.year + 1, i + 1, 10))
            b.created_at = now
        db.session.commit()

        res = client.get(REVENUE_URL, headers=auth(admin_token))
        current_month = now.strftime("%Y-%m")
        entry = next(e for e in res.get_json()["revenue"] if e["month"] == current_month)
        # total_revenue = 90000 + 60000 = 150000, active count = 2
        assert entry["total_revenue"]   == 150000.0
        assert entry["avg_per_booking"] == 75000.0

    def test_avg_per_booking_calculated_correctly(self, client, admin_token,
                                                   booking_deps, db):
        now = datetime.utcnow()
        for i, cost in enumerate([90000.0, 60000.0, 30000.0]):
            b = make_booking(db, booking_deps, status="pending", cost=cost,
                             meeting_date=date(now.year, now.month, i + 3),
                             event_date=date(now.year + 1, i + 1, 20))
            b.created_at = now
        db.session.commit()

        res = client.get(REVENUE_URL, headers=auth(admin_token))
        current_month = now.strftime("%Y-%m")
        entry = next(e for e in res.get_json()["revenue"] if e["month"] == current_month)
        # (90000 + 60000 + 30000) / 3 = 60000.0
        assert entry["avg_per_booking"] == 60000.0
