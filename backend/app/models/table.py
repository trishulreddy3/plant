from . import db
from datetime import datetime
import json

class Table(db.Model):
    __tablename__ = 'tables'

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    serial_number = db.Column(db.String(50), nullable=False)
    panels_top = db.Column(db.Integer, nullable=False)
    panels_bottom = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    top_panels = db.Column(db.Text)  # JSON string
    bottom_panels = db.Column(db.Text)  # JSON string

    def to_dict(self):
        return {
            'id': str(self.id),
            'serialNumber': self.serial_number,
            'panelsTop': self.panels_top,
            'panelsBottom': self.panels_bottom,
            'createdAt': self.created_at.isoformat(),
            'topPanels': json.loads(self.top_panels) if self.top_panels else None,
            'bottomPanels': json.loads(self.bottom_panels) if self.bottom_panels else None
        }
