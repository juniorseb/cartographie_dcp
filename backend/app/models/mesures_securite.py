"""
Modèle MesureSecurite - Mesures de sécurité mises en place.
Partie 5 du formulaire DCP. Classées par type : technique, organisationnelle, physique.
"""
from app.extensions import db
from app.models.base import UUIDMixin
from app.models.enums import TypeMesureEnum


class MesureSecurite(UUIDMixin, db.Model):
    __tablename__ = 'mesures_securite'

    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'), nullable=False
    )
    type_mesure = db.Column(
        db.Enum(TypeMesureEnum, name='type_mesure_enum'), nullable=False
    )
    description = db.Column(db.Text, nullable=False)
    mise_en_oeuvre = db.Column(db.Boolean)
    date_mise_en_oeuvre = db.Column(db.Date)
    createdAt = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())

    # Relationship
    entite = db.relationship('EntiteBase', back_populates='mesures_securite')

    def __repr__(self):
        return f'<MesureSecurite {self.type_mesure.value}>'
