"""
Modèle TransfertInternational - Transferts de données hors Côte d'Ivoire.
Partie 4 du formulaire DCP (Sous-traitance et transferts).
"""
from app.extensions import db
from app.models.base import UUIDMixin


class TransfertInternational(UUIDMixin, db.Model):
    __tablename__ = 'transferts_internationaux'

    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'), nullable=False
    )
    pays_destination = db.Column(db.String(100), nullable=False)
    organisme_destinataire = db.Column(db.String(255))
    base_juridique = db.Column(db.String(255))
    garanties_appropriees = db.Column(db.Text)
    autorisation_artci = db.Column(db.Boolean)
    createdAt = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())

    # Relationship
    entite = db.relationship('EntiteBase', back_populates='transferts')

    def __repr__(self):
        return f'<TransfertInternational {self.pays_destination}>'
