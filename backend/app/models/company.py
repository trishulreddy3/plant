from . import db
from datetime import datetime

class Company(db.Model):
    __tablename__ = 'companies'

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.String(100), unique=True, nullable=False)
    company_name = db.Column(db.String(200), nullable=False)
    voltage_per_panel = db.Column(db.Float, nullable=False)
    current_per_panel = db.Column(db.Float, nullable=False)
    power_per_panel = db.Column(db.Float, nullable=False)
    plant_power_kw = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    users = db.relationship('User', backref='company', lazy=True, cascade='all, delete-orphan')
    entries = db.relationship('Entry', backref='company', lazy=True, cascade='all, delete-orphan')
    tickets = db.relationship('Ticket', backref='company', lazy=True, cascade='all, delete-orphan')
    tables = db.relationship('Table', backref='company', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.company_id,
            'name': self.company_name,
            'voltagePerPanel': self.voltage_per_panel,
            'currentPerPanel': self.current_per_panel,
            'powerPerPanel': self.power_per_panel,
            'plantPowerKW': self.plant_power_kw,
            'tables': [table.to_dict() for table in self.tables],
            'createdAt': self.created_at.isoformat(),
            'lastUpdated': self.last_updated.isoformat()
        }
