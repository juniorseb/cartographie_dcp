"""
Modèle RegistreTraitement - Registre des traitements de données.
Partie 3 du formulaire DCP (Q14-Q25).
"""
from app.extensions import db
from app.models.base import UUIDMixin


class RegistreTraitement(UUIDMixin, db.Model):
    __tablename__ = 'registre_traitements'

    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'), nullable=False
    )
    nom_traitement = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    finalite = db.Column(db.Text)
    base_legale = db.Column(db.String(255))
    categories_personnes = db.Column(db.Text)
    duree_conservation = db.Column(db.String(100))
    destinataires = db.Column(db.Text)
    transfert_hors_ci = db.Column(db.Boolean, default=False)
    createdAt = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())

    # Relationships
    entite = db.relationship('EntiteBase', back_populates='registre_traitements')
    categories_donnees = db.relationship(
        'CategorieDonnees', back_populates='registre_traitement', lazy='dynamic'
    )

    def __repr__(self):
        return f'<RegistreTraitement {self.nom_traitement}>'
