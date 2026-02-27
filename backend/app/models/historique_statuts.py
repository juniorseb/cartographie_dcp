"""
Modèle HistoriqueStatut - Journal des changements de statut d'une entité.
Stocke ancien/nouveau statut en String pour préserver l'historique même si les enums évoluent.
"""
from app.extensions import db
from app.models.base import UUIDMixin


class HistoriqueStatut(UUIDMixin, db.Model):
    __tablename__ = 'historique_statuts'

    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'), nullable=False, index=True
    )
    ancien_statut = db.Column(db.String(50))
    nouveau_statut = db.Column(db.String(50), nullable=False)
    date_changement = db.Column(
        db.DateTime(timezone=True), nullable=False, server_default=db.func.now(), index=True
    )
    modifie_par = db.Column(db.String(36), db.ForeignKey('users.id'))
    commentaire = db.Column(db.Text)
    createdAt = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())

    # Relationships
    entite = db.relationship('EntiteBase', back_populates='historique_statuts')
    modifie_par_user = db.relationship('User', back_populates='historiques_modifies')

    def __repr__(self):
        return f'<HistoriqueStatut {self.ancien_statut} -> {self.nouveau_statut}>'
