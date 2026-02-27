"""
Modèle CategorieDonnees - Catégories de données personnelles traitées.
Partie 3 du formulaire DCP. Lié à EntiteBase et optionnellement à RegistreTraitement.
"""
from app.extensions import db
from app.models.base import UUIDMixin
from app.models.enums import CategorieDonneesEnum


class CategorieDonnees(UUIDMixin, db.Model):
    __tablename__ = 'categories_donnees'

    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'), nullable=False
    )
    registre_traitement_id = db.Column(
        db.String(36), db.ForeignKey('registre_traitements.id'), nullable=True
    )
    categorie = db.Column(
        db.Enum(CategorieDonneesEnum, name='categorie_donnees_enum'), nullable=False
    )
    description = db.Column(db.Text)
    volume_estime = db.Column(db.String(100))
    createdAt = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())

    # Relationships
    entite = db.relationship('EntiteBase', back_populates='categories_donnees')
    registre_traitement = db.relationship('RegistreTraitement', back_populates='categories_donnees')

    def __repr__(self):
        return f'<CategorieDonnees {self.categorie.value}>'
