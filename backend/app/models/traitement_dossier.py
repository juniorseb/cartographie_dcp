"""
Modele TraitementDossier — workflow Traiter (spec §6 reunion 07/05/2026).

Stocke le travail de l'editeur/admin qui examine un dossier soumis :
- commentaires par rubrique (JSONB)
- scoring manuel (peut differer du score automatique propose)
- recommandations
- statut (en_cours, traite_attente_validation, valide_par_n1)
- decision finale (approuve, retourne)
"""
from sqlalchemy.dialects.postgresql import JSONB
from app.extensions import db
from app.models.base import UUIDMixin, TimestampMixin


class TraitementDossier(UUIDMixin, TimestampMixin, db.Model):
    """Travail de traitement d'un dossier par un editeur/admin."""
    __tablename__ = 'traitements_dossier'

    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'), nullable=False, index=True
    )
    # Agent qui traite (editeur, admin ou super_admin)
    traitant_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    # Commentaires par rubrique : { 'identification': '...', 'cadre_juridique': '...', ... }
    commentaires_par_rubrique = db.Column(JSONB, nullable=False, default=dict)
    # Score automatique propose par le systeme (lecture seule, snapshot)
    score_automatique = db.Column(db.Integer)
    # Score manuel saisi par l'editeur (le systeme deduit niveau_conformite a partir de ca)
    score_manuel = db.Column(db.Integer)
    # Niveau de conformite calcule (Conforme / Demarche en cours / Non conforme)
    niveau_conformite = db.Column(db.String(50))
    # Recommandations finales
    recommandations = db.Column(db.Text)
    # Statut du traitement
    # en_cours / soumis_validation / valide / retourne_entreprise
    statut = db.Column(db.String(50), nullable=False, default='en_cours')
    # Decision validateur N+1
    valide_par = db.Column(db.String(36), db.ForeignKey('users.id'))
    valide_le = db.Column(db.DateTime(timezone=True))
    decision_validation = db.Column(db.String(20))  # approuve / retourne
    motif_retour = db.Column(db.Text)

    # Relationships
    entite = db.relationship('EntiteBase', backref='traitements')
    traitant = db.relationship('User', foreign_keys=[traitant_id])
    validateur = db.relationship('User', foreign_keys=[valide_par])

    def __repr__(self):
        return f'<TraitementDossier entite={self.entite_id} statut={self.statut}>'
