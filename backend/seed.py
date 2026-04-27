# Creates the initial manager and admin accounts.
# Also creates the event types.

from app import create_app
from app.extensions import db  
from app.models.user import User
from app.models.event_type import EventType 
from werkzeug.security import generate_password_hash


app = create_app()

STAFF = [
    {
        "name":     "Event Manager",
        "email":    "manager@eventura.in",
        "password": "manager123",
        "phone":    "9000000001",
        "role":     "manager",
    },
    {
        "name":     "Admin User",
        "email":    "admin@eventura.in",
        "password": "admin123",
        "phone":    "9000000002",
        "role":     "admin",
    },
]

EVENT_TYPES = [
    { "id": "et1", "label": "Wedding",      "description": "Intimate to grand celebrations",  "icon": "💍" },
    { "id": "et2", "label": "Birthday",     "description": "Milestone birthday parties",       "icon": "🎂" },
    { "id": "et3", "label": "Corporate",    "description": "Seminars & product launches",      "icon": "🏢" },
    { "id": "et4", "label": "Social Event", "description": "Anniversaries & reunions",         "icon": "🎊" },
]

with app.app_context():
    # Staff Accounts
    for staff in STAFF:
        existing = User.query.filter_by(email=staff["email"]).first()
        if existing:
            print(f"  Already exists: {staff['email']} — skipping")
            continue
        user = User(
            name=staff["name"],
            email=staff["email"],
            password_hash=generate_password_hash(staff["password"]),
            phone=staff["phone"],
            role=staff["role"],
        )
        db.session.add(user)
        print(f"  Created: {staff['email']} ({staff['role']})")

    # Event types
    for et in EVENT_TYPES:
        existing = EventType.query.filter_by(id=et["id"]).first()
        if existing:
            print(f"  Already exists: {et['label']} — skipping")
            continue
        event_type = EventType(
            id=et["id"],
            label=et["label"],
            description=et["description"],
            icon=et["icon"],
        )
        db.session.add(event_type)
        print(f"  Created: {et['label']}")

    db.session.commit()
    print("Done.")