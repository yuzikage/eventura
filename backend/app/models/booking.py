from app.extensions import db
from datetime import datetime
import uuid
import random
import string

def generate_uuid():
    return str(uuid.uuid4())

def generate_booking_reference():
    """Generates a human-readable booking reference e.g. EVT-A3F2K"""
    chars = string.ascii_uppercase + string.digits
    suffix = ''.join(random.choices(chars, k=5))
    return f"EVT-{suffix}"

class Booking(db.Model):
    __tablename__ = 'bookings'

    id                     = db.Column(db.String(36),  primary_key=True, default=generate_uuid)
    booking_reference      = db.Column(db.String(20),  unique=True, default=generate_booking_reference)
    user_id                = db.Column(db.String(36),  db.ForeignKey('users.id'),                nullable=False)
    event_type_id          = db.Column(db.String(50),  db.ForeignKey('event_types.id'))
    venue_id               = db.Column(db.String(50),  db.ForeignKey('venues.id'))
    theme_id               = db.Column(db.String(50),  db.ForeignKey('themes.id'))
    guest_count            = db.Column(db.Integer)
    event_package_id       = db.Column(db.String(50),  db.ForeignKey('event_packages.id'))
    photography_package_id = db.Column(db.String(50),  db.ForeignKey('photography_packages.id'))
    catering_package_id    = db.Column(db.String(50),  db.ForeignKey('catering_packages.id'))
    event_date             = db.Column(db.Date)
    meeting_date           = db.Column(db.Date)
    meeting_time           = db.Column(db.String(20))
    meeting_notes          = db.Column(db.Text)
    total_estimated_cost   = db.Column(db.Float)
    status                 = db.Column(db.String(20),  nullable=False, default='pending')
    created_at             = db.Column(db.DateTime,    default=datetime.utcnow)

    def to_dict(self):
        return {
            "id":                     self.id,
            "booking_reference":      self.booking_reference,
            "user_id":                self.user_id,
            "event_type_id":          self.event_type_id,
            "venue_id":               self.venue_id,
            "theme_id":               self.theme_id,
            "guest_count":            self.guest_count,
            "event_package_id":       self.event_package_id,
            "photography_package_id": self.photography_package_id,
            "catering_package_id":    self.catering_package_id,
            "event_date":             self.event_date.isoformat() if self.event_date else None,
            "meeting_date":           self.meeting_date.isoformat() if self.meeting_date else None,
            "meeting_time":           self.meeting_time,
            "meeting_notes":          self.meeting_notes,
            "total_estimated_cost":   self.total_estimated_cost,
            "status":                 self.status,
            "created_at":             self.created_at.isoformat() if self.created_at else None,
        }

    def to_dict_full(self):
        """Returns booking with all related objects expanded — used in manager/admin views."""
        return {
            **self.to_dict(),
            "user":                self.user.to_dict()                if self.user                else None,
            "venue":               self.venue.to_dict()               if self.venue               else None,
            "event_type":          self.event_type.to_dict()          if self.event_type          else None,
            "theme":               self.theme.to_dict()               if self.theme               else None,
            "event_package":       self.event_package.to_dict()       if self.event_package       else None,
            "photography_package": self.photography_package.to_dict() if self.photography_package else None,
            "catering_package":    self.catering_package.to_dict()    if self.catering_package    else None,
        }

    def __repr__(self):
        return f"<Booking {self.booking_reference}>"
