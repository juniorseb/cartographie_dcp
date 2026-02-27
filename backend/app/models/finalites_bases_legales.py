"""
Modèle FinaliteBaseLegale - Finalités et bases légales du traitement.
Partie 3 du formulaire DCP. Inclut le pourcentage pour l'affichage carte.
"""
from app.extensions import db
from app.models.base import UUIDMixin
from app.models.enums import BaseLegaleEnum


class FinaliteBaseLegale(UUIDMixin, db.Model):
    __tablename__ = 'finalites_bases_legales'

    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'), nullable=False
    )
    finalite = db.Column(db.String(255), nullable=False)
    base_legale = db.Column(
        db.Enum(BaseLegaleEnum, name='base_legale_enum'), nullable=False
    )
    pourcentage = db.Column(db.Integer)
    description = db.Column(db.Text)
    createdAt = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())

    # Relationship
    entite = db.relationship('EntiteBase', back_populates='finalites')

    def __repr__(self):
        return f'<FinaliteBaseLegale {self.finalite} ({self.base_legale.value})>'
