"""
Modèle CompteEntreprise - Comptes des entreprises déclarantes.
"""
from app.extensions import db
from app.models.base import UUIDMixin, TimestampMixin
from sqlalchemy.dialects.postgresql import JSONB


class CompteEntreprise(UUIDMixin, TimestampMixin, db.Model):
    __tablename__ = 'comptes_entreprises'

    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    denomination = db.Column(db.String(255), nullable=False)
    numero_cc = db.Column(db.String(50), unique=True, nullable=False)
    # 'personne_physique' | 'pm_droit_prive' | 'pm_droit_public' (memes valeurs
    # que StatutJuridique cote frontend, frontend/src/types/formulaire-dcp.ts).
    # Pour une personne physique, denomination/numero_cc sont synthetises
    # (voir AuthService.register_entreprise) pour ne pas toucher aux
    # contraintes NOT NULL/UNIQUE existantes ni au reste du code aval.
    statut_juridique = db.Column(db.String(20), nullable=False, default='pm_droit_prive')
    telephone = db.Column(db.String(20))
    adresse = db.Column(db.String(500))
    ville = db.Column(db.String(100))
    region = db.Column(db.String(100))
    email_verified = db.Column(db.Boolean, default=False, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    password_last_changed = db.Column(db.DateTime(timezone=True))
    password_expires_at = db.Column(db.DateTime(timezone=True))
    # Mot de passe genere par l'admin a la validation - doit etre change a la 1ere connexion
    password_must_change = db.Column(db.Boolean, nullable=False, default=False)

    # Inscription en 3 sections : etat de validation par l'ARTCI
    # pending : en attente de verification, approved : valide (acces actif),
    # rejected : refuse
    inscription_statut = db.Column(db.String(20), nullable=False, default='pending')
    inscription_validee_par = db.Column(db.String(36), db.ForeignKey('users.id'))
    inscription_validee_le = db.Column(db.DateTime(timezone=True))
    inscription_motif_rejet = db.Column(db.Text)

    # Section 1 - Representant legal / Referant (DG)
    dg_nom = db.Column(db.String(200))
    dg_prenom = db.Column(db.String(200))
    dg_fonction = db.Column(db.String(200))
    dg_telephone = db.Column(db.String(30))
    dg_email = db.Column(db.String(255))

    # Section 2 - DPO
    dpo_nom = db.Column(db.String(200))
    dpo_prenom = db.Column(db.String(200))
    dpo_telephone = db.Column(db.String(30))
    dpo_email = db.Column(db.String(255))
    dpo_type = db.Column(db.String(20))
    dpo_organisme = db.Column(db.String(255))

    # Section 3 - Acces (referant + DPO)
    acces_email_referant = db.Column(db.String(255))
    acces_email_dpo = db.Column(db.String(255))

    # Documents administratifs deposes a l'inscription (RCCM, DFE, autres).
    # Liste de {type, nom_fichier, chemin_fichier, taille, mime_type, uploadedAt}.
    documents_inscription = db.Column(JSONB, nullable=False, server_default='[]', default=list)

    # Verification email du Representant legal (lien magique)
    rl_email_verified = db.Column(db.Boolean, nullable=False, default=False)
    rl_email_token = db.Column(db.String(64), index=True)
    rl_email_token_expires_at = db.Column(db.DateTime(timezone=True))

    # Relationships
    entites = db.relationship('EntiteBase', back_populates='compte_entreprise', lazy='dynamic')
    otp_codes = db.relationship('OTPCode', back_populates='compte_entreprise', lazy='dynamic', cascade='all, delete-orphan')
    demandes_rapprochement = db.relationship('DemandeRapprochement', back_populates='compte_entreprise', lazy='dynamic')

    def __repr__(self):
        return f'<CompteEntreprise {self.denomination} ({self.email})>'
