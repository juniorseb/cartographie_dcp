"""
Modèle ResponsableLegal - Responsables légaux d'une entité.
Partie 1 du formulaire DCP (Identification).
"""
from app.extensions import db
from app.models.base import UUIDMixin


class ResponsableLegal(UUIDMixin, db.Model):
    __tablename__ = 'responsables_legaux'

    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'), nullable=False
    )
    nom = db.Column(db.String(200), nullable=False)
    prenom = db.Column(db.String(200))
    fonction = db.Column(db.String(200))
    email = db.Column(db.String(255))
    telephone = db.Column(db.String(20))
    createdAt = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())

    # Relationship
    entite = db.relationship('EntiteBase', back_populates='responsables_legaux')

    def __repr__(self):
        return f'<ResponsableLegal {self.nom} {self.prenom}>'
