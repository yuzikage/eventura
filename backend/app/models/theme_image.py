from app.extensions import db
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class ThemeImage(db.Model):
    __tablename__ = 'theme_images'

    id            = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    theme_id      = db.Column(db.String(50), db.ForeignKey('themes.id'), nullable=False)
    image_url     = db.Column(db.Text,       nullable=False)
    display_order = db.Column(db.Integer,    default=0)

    def to_dict(self):
        return {
            "id":            self.id,
            "theme_id":      self.theme_id,
            "image_url":     self.image_url,
            "display_order": self.display_order,
        }

    def __repr__(self):
        return f"<ThemeImage theme_id={self.theme_id} order={self.display_order}>"
