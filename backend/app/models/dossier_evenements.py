"""
Modele DossierEvenement : audit trail global du dossier (modele PR + spec L1).

Chaque action sensible sur un dossier laisse une trace consultable. Cette table
est append-only (jamais d'UPDATE/DELETE en regime normal). C'est la source de
verite legale en cas de contestation.

Types d'evenements :
- soumission, re_soumission : entreprise envoie le formulaire
- retour_entreprise : agent renvoie le dossier pour correction
- validation_n_plus_1 : admin valide le travail de l'editeur
- publication : agent publie sur la carte publique
- depublication : agent depublie manuellement
- depublication_auto : score retombe < 70 -> depublication automatique
- re_publication : agent republie apres regain du seuil 70
- assignation, re_assignation : changement d'agent assigne
- commentaire_ajoute, commentaire_resolu, commentaire_repondu
- score_modifie : application d'un score final
- formalite_deposee : declaration ou autorisation deposee
- archivage, desarchivage : soft delete
"""
from app.extensions import db
from app.models.base import UUIDMixin
from sqlalchemy.dialects.postgresql import JSONB


class DossierEvenement(UUIDMixin, db.Model):
    __tablename__ = 'dossier_evenements'
    __table_args__ = (
        db.Index(
            'ix_dossier_evenements_entite_type_date',
            'entite_id', 'evenement_type', 'createdAt',
        ),
    )

    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'),
        nullable=False, index=True,
    )
    evenement_type = db.Column(db.String(50), nullable=False, index=True)

    # Acteur : on supporte user (ARTCI) OU compte_entreprise.
    acteur_user_id = db.Column(
        db.String(36), db.ForeignKey('users.id'),
        nullable=True, index=True,
    )
    acteur_compte_id = db.Column(
        db.String(36), db.ForeignKey('comptes_entreprises.id'),
        nullable=True, index=True,
    )
    acteur_role = db.Column(db.String(20))  # super_admin/admin/editor/reader/entreprise/system

    # Payload contextuel (JSON libre) : ex pour score_modifie -> {"avant": 65, "apres": 80}
    # pour depublication_auto -> {"score_avant": 75, "score_apres": 65, "trigger": "re_soumission"}
    payload = db.Column(JSONB, nullable=False, default=dict)

    createdAt = db.Column(
        db.DateTime(timezone=True), nullable=False,
        server_default=db.func.now(), index=True,
    )

    entite = db.relationship('EntiteBase')
    acteur_user = db.relationship('User', foreign_keys=[acteur_user_id])
    acteur_compte = db.relationship('CompteEntreprise', foreign_keys=[acteur_compte_id])

    def __repr__(self):
        return f'<DossierEvenement {self.evenement_type} {self.entite_id} {self.createdAt}>'
