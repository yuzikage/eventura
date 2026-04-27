from app.extensions import db

class Venue(db.Model):
    __tablename__ = 'venues'

    id           = db.Column(db.String(50),  primary_key=True)
    name         = db.Column(db.String(100), nullable=False)
    location     = db.Column(db.String(200))
    capacity     = db.Column(db.Integer)
    price        = db.Column(db.Float,   comment='Flat booking price')
    is_available = db.Column(db.Boolean, nullable=False, default=True)

    bookings = db.relationship('Booking', backref='venue', lazy=True)

    def to_dict(self):
        return {
            "id":           self.id,
            "name":         self.name,
            "location":     self.location,
            "capacity":     self.capacity,
            "price":        self.price,
            "is_available": self.is_available,
        }

    def __repr__(self):
        return f"<Venue {self.name}>"
