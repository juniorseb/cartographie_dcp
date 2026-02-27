"""
Modèle SecuriteConformite - Données de sécurité et conformité globales.
Partie 5 du formulaire DCP (Q39-Q50).
Relation ONE-TO-ONE avec EntiteBase (PK = entite_id).
"""
from app.extensions import db


class SecuriteConformite(db.Model):
    __tablename__ = 'securite_conformite'

    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'), primary_key=True
    )
    politique_securite = db.Column(db.Boolean)
    responsable_securite = db.Column(db.Boolean)
    analyse_risques = db.Column(db.Boolean)
    plan_continuite = db.Column(db.Boolean)
    notification_violations = db.Column(db.Boolean)
    nombre_violations_12mois = db.Column(db.Integer, default=0)
    formation_personnel = db.Column(db.Boolean)
    frequence_formation = db.Column(db.String(100))
    dernier_audit = db.Column(db.Date)
    createdAt = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())
    updatedAt = db.Column(
        db.DateTime(timezone=True), nullable=False,
        server_default=db.func.now(), onupdate=db.func.now()
    )

    # Relationship
    entite = db.relationship('EntiteBase', back_populates='securite')

    def __repr__(self):
        return f'<SecuriteConformite for {self.entite_id}>'
