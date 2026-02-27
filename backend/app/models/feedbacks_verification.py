"""
Modèle FeedbackVerification - Feedbacks structurés des agents lors de la vérification.
Nouveau v2.2 : commentaires + éléments manquants (JSONB) + délai.
"""
from app.extensions import db
from app.models.base import UUIDMixin
from sqlalchemy.dialects.postgresql import JSONB


class FeedbackVerification(UUIDMixin, db.Model):
    __tablename__ = 'feedbacks_verification'

    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'), nullable=False
    )
    agent_id = db.Column(
        db.String(36), db.ForeignKey('users.id'), nullable=False
    )
    date_feedback = db.Column(
        db.DateTime(timezone=True), nullable=False, server_default=db.func.now()
    )
    commentaires = db.Column(db.Text)
    elements_manquants = db.Column(JSONB)
    delai_fourniture = db.Column(db.Date)
    createdAt = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())

    # Relationships
    entite = db.relationship('EntiteBase', back_populates='feedbacks')
    agent = db.relationship('User', back_populates='feedbacks_agent')

    def __repr__(self):
        return f'<FeedbackVerification {self.id}>'
