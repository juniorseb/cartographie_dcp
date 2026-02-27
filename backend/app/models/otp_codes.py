"""
Modèle OTPCode - Codes OTP pour inscription et connexion sensible.
Nouveau v2.2 : vérification par email obligatoire.
"""
from app.extensions import db
from app.models.base import UUIDMixin
from app.models.enums import TypeOTPEnum


class OTPCode(UUIDMixin, db.Model):
    __tablename__ = 'otp_codes'
    __table_args__ = (
        db.Index('ix_otp_compte_type_used', 'compte_entreprise_id', 'type', 'used'),
    )

    compte_entreprise_id = db.Column(
        db.String(36), db.ForeignKey('comptes_entreprises.id'), nullable=False, index=True
    )
    code = db.Column(db.String(6), nullable=False, index=True)
    type = db.Column(db.Enum(TypeOTPEnum, name='type_otp_enum'), nullable=False)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False, index=True)
    used = db.Column(db.Boolean, default=False, nullable=False)
    createdAt = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())

    # Relationship
    compte_entreprise = db.relationship('CompteEntreprise', back_populates='otp_codes')

    def __repr__(self):
        return f'<OTPCode {self.type.value} for {self.compte_entreprise_id}>'
