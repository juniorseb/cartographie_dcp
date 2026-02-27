"""
SQLAlchemy Models pour ARTCI DCP Platform v2.2
25 tables organisées en 7 groupes.
"""

# Infrastructure
from app.models.base import UUIDMixin, TimestampMixin
from app.models.enums import (
    RoleEnum,
    OrigineSaisieEnum,
    StatutWorkflowEnum,
    StatutConformiteEnum,
    TypeDPOEnum,
    TypeOTPEnum,
    StatutAssignationEnum,
    StatutRapprochementEnum,
    TypeDocumentEnum,
    CategorieDonneesEnum,
    BaseLegaleEnum,
    TypeMesureEnum,
    StatutRenouvellementEnum,
)

# Groupe 1 : Auth (2 tables)
from app.models.comptes_entreprises import CompteEntreprise
from app.models.users import User

# Groupe 2 : Entités Core (5 tables)
from app.models.entites_base import EntiteBase
from app.models.entites_contact import EntiteContact
from app.models.entites_workflow import EntiteWorkflow
from app.models.entites_localisation import EntiteLocalisation
from app.models.entites_conformite import EntiteConformite

# Groupe 3 : Nouvelles tables v2.2 (3 tables)
from app.models.otp_codes import OTPCode
from app.models.assignations_demandes import AssignationDemande
from app.models.feedbacks_verification import FeedbackVerification

# Groupe 4 : Rapprochement (1 table)
from app.models.demandes_rapprochement import DemandeRapprochement

# Groupe 5 : DCP Form Data (8 tables)
from app.models.responsables_legaux import ResponsableLegal
from app.models.dpo import DPO
from app.models.conformite_administrative import ConformiteAdministrative
from app.models.documents_joints import DocumentJoint
from app.models.registre_traitements import RegistreTraitement
from app.models.categories_donnees import CategorieDonnees
from app.models.finalites_bases_legales import FinaliteBaseLegale
from app.models.sous_traitance import SousTraitance

# Groupe 6 : Security (4 tables)
from app.models.transferts_internationaux import TransfertInternational
from app.models.securite_conformite import SecuriteConformite
from app.models.mesures_securite import MesureSecurite
from app.models.certifications_securite import CertificationSecurite

# Groupe 7 : Workflow & Tracking (2 tables)
from app.models.historique_statuts import HistoriqueStatut
from app.models.renouvellements import Renouvellement

# Groupe 8 : Notifications (1 table)
from app.models.notifications import Notification

__all__ = [
    # Mixins
    'UUIDMixin', 'TimestampMixin',
    # Enums
    'RoleEnum', 'OrigineSaisieEnum', 'StatutWorkflowEnum',
    'StatutConformiteEnum', 'TypeDPOEnum', 'TypeOTPEnum',
    'StatutAssignationEnum', 'StatutRapprochementEnum',
    'TypeDocumentEnum', 'CategorieDonneesEnum', 'BaseLegaleEnum',
    'TypeMesureEnum', 'StatutRenouvellementEnum',
    # Modèles (25)
    'CompteEntreprise', 'User',
    'EntiteBase', 'EntiteContact', 'EntiteWorkflow',
    'EntiteLocalisation', 'EntiteConformite',
    'OTPCode', 'AssignationDemande', 'FeedbackVerification',
    'DemandeRapprochement',
    'ResponsableLegal', 'DPO', 'ConformiteAdministrative',
    'DocumentJoint', 'RegistreTraitement', 'CategorieDonnees',
    'FinaliteBaseLegale', 'SousTraitance',
    'TransfertInternational', 'SecuriteConformite',
    'MesureSecurite', 'CertificationSecurite',
    'HistoriqueStatut', 'Renouvellement',
    'Notification',
]
