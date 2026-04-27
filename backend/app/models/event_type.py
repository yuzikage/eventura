from app.extensions import db

class EventType(db.Model):
    __tablename__ = 'event_types'

    id          = db.Column(db.String(50),  primary_key=True)
    label       = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    icon        = db.Column(db.String(20))

    bookings = db.relationship('Booking', backref='event_type', lazy=True)

    def to_dict(self):
        return {
            "id":          self.id,
            "label":       self.label,
            "description": self.description,
            "icon":        self.icon,
        }

    def __repr__(self):
        return f"<EventType {self.label}>"
