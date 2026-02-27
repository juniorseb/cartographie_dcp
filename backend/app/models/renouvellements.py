"""
Modèle Renouvellement - Demandes de renouvellement d'agrément.
Soumises 3 mois avant expiration par les entités conformes.
"""
from app.extensions import db
from app.models.base import UUIDMixin, TimestampMixin
from app.models.enums import StatutRenouvellementEnum


class Renouvellement(UUIDMixin, TimestampMixin, db.Model):
    __tablename__ = 'renouvellements'

    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'), nullable=False
    )
    date_demande = db.Column(
        db.DateTime(timezone=True), nullable=False, server_default=db.func.now()
    )
    date_expiration_agrement = db.Column(db.Date)
    motif = db.Column(db.Text)
    statut = db.Column(
        db.Enum(StatutRenouvellementEnum, name='statut_renouvellement_enum'),
        nullable=False, default=StatutRenouvellementEnum.en_attente
    )
    traite_par = db.Column(db.String(36), db.ForeignKey('users.id'))
    date_traitement = db.Column(db.DateTime(timezone=True))
    commentaire = db.Column(db.Text)

    # Relationships
    entite = db.relationship('EntiteBase', back_populates='renouvellements')
    traiteur = db.relationship('User', back_populates='renouvellements_traites')

    def __repr__(self):
        return f'<Renouvellement {self.id} statut={self.statut.value}>'
