from app.extensions import db

class EventPackage(db.Model):
    __tablename__ = 'event_packages'

    id        = db.Column(db.String(50),  primary_key=True)
    label     = db.Column(db.String(100), nullable=False)
    price     = db.Column(db.Float,       nullable=False)
    features  = db.Column(db.JSON)
    is_active = db.Column(db.Boolean,     nullable=False, default=True)

    bookings = db.relationship('Booking', backref='event_package',
                               foreign_keys='Booking.event_package_id', lazy=True)

    def to_dict(self):
        return {
            "id":        self.id,
            "label":     self.label,
            "price":     self.price,
            "features":  self.features or [],
            "is_active": self.is_active,
        }

    def __repr__(self):
        return f"<EventPackage {self.label}>"


class PhotographyPackage(db.Model):
    __tablename__ = 'photography_packages'

    id        = db.Column(db.String(50),  primary_key=True)
    label     = db.Column(db.String(100), nullable=False)
    price     = db.Column(db.Float,       nullable=False)
    features  = db.Column(db.JSON)
    is_active = db.Column(db.Boolean,     nullable=False, default=True)

    bookings = db.relationship('Booking', backref='photography_package',
                               foreign_keys='Booking.photography_package_id', lazy=True)

    def to_dict(self):
        return {
            "id":        self.id,
            "label":     self.label,
            "price":     self.price,
            "features":  self.features or [],
            "is_active": self.is_active,
        }

    def __repr__(self):
        return f"<PhotographyPackage {self.label}>"


class CateringPackage(db.Model):
    __tablename__ = 'catering_packages'

    id             = db.Column(db.String(50),  primary_key=True)
    label          = db.Column(db.String(100), nullable=False)
    price_per_head = db.Column(db.Float,       nullable=False)
    features       = db.Column(db.JSON)
    is_active      = db.Column(db.Boolean,     nullable=False, default=True)

    bookings = db.relationship('Booking', backref='catering_package',
                               foreign_keys='Booking.catering_package_id', lazy=True)

    def to_dict(self):
        return {
            "id":             self.id,
            "label":          self.label,
            "price_per_head": self.price_per_head,
            "features":       self.features or [],
            "is_active":      self.is_active,
        }

    def __repr__(self):
        return f"<CateringPackage {self.label}>"
