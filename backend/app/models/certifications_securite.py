"""
Modèle CertificationSecurite - Certifications de sécurité obtenues.
Partie 5 du formulaire DCP (Audits et certifications).
"""
from app.extensions import db
from app.models.base import UUIDMixin


class CertificationSecurite(UUIDMixin, db.Model):
    __tablename__ = 'certifications_securite'

    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'), nullable=False
    )
    nom_certification = db.Column(db.String(255), nullable=False)
    organisme_certificateur = db.Column(db.String(255))
    date_obtention = db.Column(db.Date)
    date_expiration = db.Column(db.Date)
    numero_certificat = db.Column(db.String(100))
    createdAt = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())

    # Relationship
    entite = db.relationship('EntiteBase', back_populates='certifications')

    def __repr__(self):
        return f'<CertificationSecurite {self.nom_certification}>'
