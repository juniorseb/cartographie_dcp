"""
Modèle SousTraitance - Sous-traitants ayant accès aux données.
Partie 4 du formulaire DCP (Q26-Q38).
"""
from app.extensions import db
from app.models.base import UUIDMixin


class SousTraitance(UUIDMixin, db.Model):
    __tablename__ = 'sous_traitance'

    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'), nullable=False
    )
    nom_sous_traitant = db.Column(db.String(255), nullable=False)
    pays = db.Column(db.String(100))
    type_donnees_partagees = db.Column(db.Text)
    contrat_sous_traitance = db.Column(db.Boolean)
    clauses_protection = db.Column(db.Boolean)
    audit_sous_traitant = db.Column(db.Boolean)
    createdAt = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())

    # Relationship
    entite = db.relationship('EntiteBase', back_populates='sous_traitants')

    def __repr__(self):
        return f'<SousTraitance {self.nom_sous_traitant}>'
