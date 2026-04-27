from app.extensions import db
from datetime import datetime
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class User(db.Model):
    __tablename__ = 'users'

    id            = db.Column(db.String(36),  primary_key=True, default=generate_uuid)
    name          = db.Column(db.String(100), nullable=False)
    email         = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    phone         = db.Column(db.String(20),  nullable=False)
    role          = db.Column(db.String(20),  nullable=False, default='customer')
    created_at    = db.Column(db.DateTime,    default=datetime.utcnow)

    bookings = db.relationship('Booking', backref='user', lazy=True)

    def to_dict(self):
        return {
            "id":         self.id,
            "name":       self.name,
            "email":      self.email,
            "phone":      self.phone,
            "role":       self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<User {self.email}>"
