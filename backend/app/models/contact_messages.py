"""
Modele ContactMessage : messages envoyes via le formulaire de contact public.
"""
from app.extensions import db
from app.models.base import UUIDMixin, TimestampMixin


class ContactMessage(UUIDMixin, TimestampMixin, db.Model):
    """Message du formulaire de contact public."""
    __tablename__ = 'contact_messages'

    nom = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    telephone = db.Column(db.String(30))
    sujet = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    lu = db.Column(db.Boolean, nullable=False, default=False)
    traite_par = db.Column(db.String(36), db.ForeignKey('users.id'))

    def __repr__(self):
        return f'<ContactMessage {self.email} {self.sujet}>'
