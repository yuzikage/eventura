from app.extensions import db

class Theme(db.Model):
    __tablename__ = 'themes'

    id          = db.Column(db.String(50),  primary_key=True)
    name        = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    is_active   = db.Column(db.Boolean,     nullable=False, default=True)

    images   = db.relationship(
        'ThemeImage', backref='theme', lazy=True,
        order_by='ThemeImage.display_order',
        cascade='all, delete-orphan'
    )
    bookings = db.relationship('Booking', backref='theme', lazy=True)

    def to_dict(self):
        return {
            "id":          self.id,
            "name":        self.name,
            "description": self.description,
            "is_active":   self.is_active,
            "images":      [img.image_url for img in self.images],
        }

    def __repr__(self):
        return f"<Theme {self.name}>"
