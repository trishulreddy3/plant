from . import db
from datetime import datetime

class Ticket(db.Model):
    __tablename__ = 'tickets'

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    track_id = db.Column(db.String(100), nullable=False)
    fault = db.Column(db.String(200), nullable=False)
    reason = db.Column(db.String(500))
    category = db.Column(db.String(50), nullable=False)  # BAD, MODERATE
    power_loss = db.Column(db.Float, default=0)
    predicted_loss = db.Column(db.Float)
    resolved_at = db.Column(db.DateTime, nullable=False)
    resolved_by = db.Column(db.String(100), nullable=False)

    def to_dict(self):
        return {
            'id': str(self.id),
            'companyId': self.company_id,
            'trackId': self.track_id,
            'fault': self.fault,
            'reason': self.reason,
            'category': self.category,
            'powerLoss': self.power_loss,
            'predictedLoss': self.predicted_loss,
            'resolvedAt': self.resolved_at.isoformat(),
            'resolvedBy': self.resolved_by
        }
