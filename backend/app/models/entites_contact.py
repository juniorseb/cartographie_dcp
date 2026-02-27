"""
Modèle EntiteContact - Informations de contact du responsable légal.
Relation ONE-TO-ONE avec EntiteBase (PK = entite_id).
"""
from app.extensions import db


class EntiteContact(db.Model):
    __tablename__ = 'entites_contact'

    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'), primary_key=True
    )
    responsable_legal_nom = db.Column(db.String(200))
    responsable_legal_fonction = db.Column(db.String(200))
    responsable_legal_email = db.Column(db.String(255))
    responsable_legal_telephone = db.Column(db.String(20))
    site_web = db.Column(db.String(500))

    # Relationship
    entite = db.relationship('EntiteBase', back_populates='contact')

    def __repr__(self):
        return f'<EntiteContact for {self.entite_id}>'
