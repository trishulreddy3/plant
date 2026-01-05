from . import db
from datetime import datetime

class Entry(db.Model):
    __tablename__ = 'entries'

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    company_name = db.Column(db.String(200), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    phone_number = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100))

    def to_dict(self):
        return {
            'id': str(self.id),  # Match old format
            'companyName': self.company_name,
            'name': self.name,
            'role': self.role,
            'email': self.email,
            'phoneNumber': self.phone_number,
            'createdAt': self.created_at.isoformat(),
            'createdBy': self.created_by
        }
