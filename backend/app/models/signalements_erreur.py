"""
Modele SignalementErreur : permet a une entreprise de signaler une erreur
sur sa fiche / dossier traite par l'ARTCI. Reserve aux entites authentifiees.
Traite par les Super Admins (route admin).
"""
from app.extensions import db
from app.models.base import UUIDMixin, TimestampMixin


class SignalementErreur(UUIDMixin, TimestampMixin, db.Model):
    __tablename__ = 'signalements_erreur'

    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'),
        nullable=False, index=True,
    )
    # Compte demandeur ayant emis le signalement (peut etre RL ou DPO)
    compte_id = db.Column(
        db.String(36), db.ForeignKey('comptes_entreprises.id'),
        nullable=False, index=True,
    )
    sujet = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    # Champ libre pour l'emplacement du probleme dans la fiche (rubrique, page)
    rubrique_concernee = db.Column(db.String(120))

    # Workflow : open -> in_progress -> resolved | dismissed
    statut = db.Column(
        db.String(20), nullable=False, default='open', index=True,
    )
    # Super Admin assigne au traitement
    traite_par = db.Column(db.String(36), db.ForeignKey('users.id'), index=True)
    reponse_admin = db.Column(db.Text)
    date_traitement = db.Column(db.DateTime(timezone=True))

    # Relationships
    entite = db.relationship('EntiteBase')
    compte = db.relationship('CompteEntreprise')

    def __repr__(self):
        return f'<SignalementErreur {self.id} {self.statut}>'
