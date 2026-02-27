"""
Modèle Notification - Notifications internes pour ARTCI et entreprises.
Types : nouvelle_demande, echeance, validation, renouvellement, rapprochement, rapport.
"""
from app.extensions import db
from app.models.base import UUIDMixin


class Notification(UUIDMixin, db.Model):
    __tablename__ = 'notifications'

    destinataire_type = db.Column(
        db.String(20), nullable=False, index=True
    )  # 'artci' ou 'entreprise'
    destinataire_id = db.Column(
        db.String(36), nullable=False, index=True
    )  # user_id ou compte_entreprise_id
    type = db.Column(db.String(50), nullable=False, index=True)
    titre = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text)
    lue = db.Column(db.Boolean, nullable=False, default=False, index=True)
    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'), nullable=True
    )
    createdAt = db.Column(
        db.DateTime(timezone=True), nullable=False, server_default=db.func.now()
    )

    # Relationships
    entite = db.relationship('EntiteBase', backref='notifications')

    def __repr__(self):
        return f'<Notification {self.id} type={self.type} lue={self.lue}>'
