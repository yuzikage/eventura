import pytest
from app import create_app
from app.extensions import db as _db
from app.models.user import User
from app.models.venue import Venue
from app.models.event_type import EventType
from app.models.theme import Theme
from app.models.theme_image import ThemeImage
from app.models.packages import EventPackage, PhotographyPackage, CateringPackage
from werkzeug.security import generate_password_hash


@pytest.fixture(scope="session")
def app():
    """Create application for testing using TestingConfig."""
    app = create_app("testing")
    with app.app_context():
        _db.create_all()
        yield app
        _db.session.remove()
        _db.drop_all()


@pytest.fixture(scope="function")
def db(app):
    """
    Provide a clean database state for each test using nested transactions.
    Each test runs inside a transaction that is rolled back after the test
    completes — nothing is ever permanently written to the database.
    """
    with app.app_context():

        yield _db
        # Clean up all test data after each test
        _db.session.remove()
        for table in reversed(_db.metadata.sorted_tables):
            _db.session.execute(table.delete())
        _db.session.commit()


@pytest.fixture(scope="function")
def client(app, db):
    """
    Flask test client bound to the same DB transaction as the db fixture.
    Depends on db so the transaction is active during the request.
    """
    return app.test_client()


# Seed data fixtures
# Use commit() not commit() — keeps data inside the transaction
# so it gets rolled back automatically after each test.

@pytest.fixture(scope="function")
def seed_customer(db):
    """Creates a test customer user."""
    user = User(
        name="Test Customer",
        email="customer@test.com",
        password_hash=generate_password_hash("password123"),
        phone="9876543210",
        role="customer",
    )
    db.session.add(user)
    db.session.commit()
    return user


@pytest.fixture(scope="function")
def seed_manager(db):
    """Creates a test manager user."""
    user = User(
        name="Test Manager",
        email="manager@test.com",
        password_hash=generate_password_hash("password123"),
        phone="9876543211",
        role="manager",
    )
    db.session.add(user)
    db.session.commit()
    return user


@pytest.fixture(scope="function")
def seed_admin(db):
    """Creates a test admin user."""
    user = User(
        name="Test Admin",
        email="admin@test.com",
        password_hash=generate_password_hash("password123"),
        phone="9876543212",
        role="admin",
    )
    db.session.add(user)
    db.session.commit()
    return user


@pytest.fixture(scope="function")
def seed_venue(db):
    """Creates a test venue."""
    venue = Venue(
        id="v-test-1",
        name="Test Pavilion",
        location="Test Location",
        capacity=200,
        price=50000.0,
        is_available=True,
    )
    db.session.add(venue)
    db.session.commit()
    return venue


@pytest.fixture(scope="function")
def seed_unavailable_venue(db):
    """Creates an unavailable test venue."""
    venue = Venue(
        id="v-test-2",
        name="Unavailable Venue",
        location="Test Location 2",
        capacity=100,
        price=30000.0,
        is_available=False,
    )
    db.session.add(venue)
    db.session.commit()
    return venue


@pytest.fixture(scope="function")
def seed_event_type(db):
    """Creates a test event type."""
    event_type = EventType(
        id="et-test-1",
        label="Wedding",
        description="Intimate to grand celebrations",
        icon="💍",
    )
    db.session.add(event_type)
    db.session.commit()
    return event_type


@pytest.fixture(scope="function")
def seed_theme(db):
    """Creates a test theme with one image."""
    theme = Theme(
        id="t-test-1",
        name="Test Theme",
        description="A test theme",
        is_active=True,
    )
    db.session.add(theme)
    db.session.commit()

    image = ThemeImage(
        theme_id="t-test-1",
        image_url="https://example.com/image.jpg",
        display_order=0,
    )
    db.session.add(image)
    db.session.commit()
    return theme


@pytest.fixture(scope="function")
def seed_inactive_theme(db):
    """Creates an inactive test theme."""
    theme = Theme(
        id="t-test-2",
        name="Inactive Theme",
        description="A hidden theme",
        is_active=False,
    )
    db.session.add(theme)
    db.session.commit()
    return theme


@pytest.fixture(scope="function")
def seed_packages(db):
    """Creates one of each package type."""
    ep = EventPackage(
        id="pk-test-1",
        label="Basic",
        price=15000.0,
        features=["Standard decor", "1 coordinator"],
        is_active=True,
    )
    pp = PhotographyPackage(
        id="ph-test-1",
        label="Essential",
        price=8000.0,
        features=["4-hour coverage", "200 photos"],
        is_active=True,
    )
    cp = CateringPackage(
        id="c-test-1",
        label="Standard",
        price_per_head=350.0,
        features=["Veg buffet", "2 starters"],
        is_active=True,
    )
    db.session.add_all([ep, pp, cp])
    db.session.commit()
    return ep, pp, cp


# Auth token helpers
# These log in via the actual API endpoint to get a real JWT token.
# They depend on seed fixtures so the user exists before login is attempted.

@pytest.fixture(scope="function")
def customer_token(client, seed_customer):
    """Returns a valid JWT token for the test customer."""
    res = client.post("/api/v1/auth/login", json={
        "email": "customer@test.com",
        "password": "password123",
    })
    assert res.status_code == 200, f"Customer login failed: {res.get_json()}"
    return res.get_json()["token"]


@pytest.fixture(scope="function")
def manager_token(client, seed_manager):
    """Returns a valid JWT token for the test manager."""
    res = client.post("/api/v1/auth/login", json={
        "email": "manager@test.com",
        "password": "password123",
    })
    assert res.status_code == 200, f"Manager login failed: {res.get_json()}"
    return res.get_json()["token"]


@pytest.fixture(scope="function")
def admin_token(client, seed_admin):
    """Returns a valid JWT token for the test admin."""
    res = client.post("/api/v1/auth/login", json={
        "email": "admin@test.com",
        "password": "password123",
    })
    assert res.status_code == 200, f"Admin login failed: {res.get_json()}"
    return res.get_json()["token"]
