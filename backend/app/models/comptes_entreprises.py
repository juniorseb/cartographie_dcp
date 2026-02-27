"""
Modèle CompteEntreprise - Comptes des entreprises déclarantes.
"""
from app.extensions import db
from app.models.base import UUIDMixin, TimestampMixin


class CompteEntreprise(UUIDMixin, TimestampMixin, db.Model):
    __tablename__ = 'comptes_entreprises'

    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    denomination = db.Column(db.String(255), nullable=False)
    numero_cc = db.Column(db.String(50), unique=True, nullable=False)
    telephone = db.Column(db.String(20))
    adresse = db.Column(db.String(500))
    ville = db.Column(db.String(100))
    region = db.Column(db.String(100))
    email_verified = db.Column(db.Boolean, default=False, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    password_last_changed = db.Column(db.DateTime(timezone=True))
    password_expires_at = db.Column(db.DateTime(timezone=True))

    # Relationships
    entites = db.relationship('EntiteBase', back_populates='compte_entreprise', lazy='dynamic')
    otp_codes = db.relationship('OTPCode', back_populates='compte_entreprise', lazy='dynamic', cascade='all, delete-orphan')
    demandes_rapprochement = db.relationship('DemandeRapprochement', back_populates='compte_entreprise', lazy='dynamic')

    def __repr__(self):
        return f'<CompteEntreprise {self.denomination} ({self.email})>'
