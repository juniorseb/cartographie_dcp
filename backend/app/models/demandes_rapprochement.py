"""
Modèle DemandeRapprochement - Demandes de rapprochement compte-entité.
Permet à une entreprise de revendiquer une entité saisie par l'ARTCI.
"""
from app.extensions import db
from app.models.base import UUIDMixin
from app.models.enums import StatutRapprochementEnum


class DemandeRapprochement(UUIDMixin, db.Model):
    __tablename__ = 'demandes_rapprochement'

    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'), nullable=False
    )
    compte_entreprise_id = db.Column(
        db.String(36), db.ForeignKey('comptes_entreprises.id'), nullable=False
    )
    email_demandeur = db.Column(db.String(255), nullable=False)
    numero_cc = db.Column(db.String(50))
    document_preuve_path = db.Column(db.String(500))
    raison_demande = db.Column(db.Text)
    statut = db.Column(
        db.Enum(StatutRapprochementEnum, name='statut_rapprochement_enum'),
        nullable=False, default=StatutRapprochementEnum.en_attente, index=True
    )
    traite_par = db.Column(db.String(36), db.ForeignKey('users.id'))
    date_traitement = db.Column(db.DateTime(timezone=True))
    commentaire_artci = db.Column(db.Text)
    createdAt = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())

    # Relationships
    entite = db.relationship('EntiteBase', back_populates='demandes_rapprochement')
    compte_entreprise = db.relationship('CompteEntreprise', back_populates='demandes_rapprochement')
    traiteur = db.relationship('User', back_populates='rapprochements_traites')

    def __repr__(self):
        return f'<DemandeRapprochement {self.id} statut={self.statut.value}>'
