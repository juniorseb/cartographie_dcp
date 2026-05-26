"""
Modèle EntiteLocalisation - Données géographiques d'une entité.
Relation ONE-TO-ONE avec EntiteBase (PK = entite_id).
Latitude/longitude en Float pour Leaflet. PostGIS optionnel.
"""
from app.extensions import db


class EntiteLocalisation(db.Model):
    __tablename__ = 'entites_localisation'

    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'), primary_key=True
    )
    # Coordonnees GPS obligatoires (cf. migration o5p6q7r8s9t0).
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    precision_gps = db.Column(db.String(50))
    methode_geolocalisation = db.Column(db.String(100))
    adresse_complete = db.Column(db.String(500))
    code_postal = db.Column(db.String(20))

    # Relationship
    entite = db.relationship('EntiteBase', back_populates='localisation')

    def __repr__(self):
        return f'<EntiteLocalisation {self.entite_id} ({self.latitude}, {self.longitude})>'
