"""
Modèle ConformiteAdministrative - Données de conformité administrative.
Partie 2 du formulaire DCP (Q5-Q13).
"""
from app.extensions import db
from app.models.base import UUIDMixin, TimestampMixin


class ConformiteAdministrative(UUIDMixin, TimestampMixin, db.Model):
    __tablename__ = 'conformite_administrative'

    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'), nullable=False
    )
    connaissance_loi_2013 = db.Column(db.Boolean)
    declaration_artci = db.Column(db.Boolean)
    numero_declaration = db.Column(db.String(100))
    date_declaration = db.Column(db.Date)
    autorisation_artci = db.Column(db.Boolean)
    numero_autorisation = db.Column(db.String(100))
    date_autorisation = db.Column(db.Date)

    # Relationship
    entite = db.relationship('EntiteBase', back_populates='conformites_administratives')

    def __repr__(self):
        return f'<ConformiteAdministrative {self.id}>'
