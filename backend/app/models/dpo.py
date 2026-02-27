"""
Modèle DPO - Délégué à la Protection des Données d'une entité.
Partie 2 du formulaire DCP (Conformité Administrative).
"""
from app.extensions import db
from app.models.base import UUIDMixin
from app.models.enums import TypeDPOEnum


class DPO(UUIDMixin, db.Model):
    __tablename__ = 'dpo'

    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'), nullable=False
    )
    nom = db.Column(db.String(200), nullable=False)
    prenom = db.Column(db.String(200))
    email = db.Column(db.String(255))
    telephone = db.Column(db.String(20))
    type = db.Column(db.Enum(TypeDPOEnum, name='type_dpo_dpo_enum'), nullable=False)
    organisme = db.Column(db.String(255))
    date_designation = db.Column(db.Date)
    createdAt = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())

    # Relationship
    entite = db.relationship('EntiteBase', back_populates='dpos')

    def __repr__(self):
        return f'<DPO {self.nom} ({self.type.value})>'
