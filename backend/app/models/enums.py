"""
Tous les types Enum pour ARTCI DCP Platform v2.2.
Centralisés dans un seul fichier pour éviter les imports circulaires.
"""
import enum


class RoleEnum(enum.Enum):
    """Rôles RBAC pour le personnel ARTCI."""
    super_admin = 'super_admin'
    admin = 'admin'
    editor = 'editor'
    reader = 'reader'


class OrigineSaisieEnum(enum.Enum):
    """Origine de la saisie d'une entité."""
    auto_recensement = 'auto_recensement'
    saisie_artci = 'saisie_artci'
    rapprochement = 'rapprochement'


class StatutWorkflowEnum(enum.Enum):
    """Statut du workflow de traitement d'une entité."""
    brouillon = 'brouillon'
    brouillon_artci = 'brouillon_artci'
    soumis = 'soumis'
    en_verification = 'en_verification'
    en_attente_complements = 'en_attente_complements'
    conforme = 'conforme'
    conforme_sous_reserve = 'conforme_sous_reserve'
    valide = 'valide'
    rejete = 'rejete'
    publie = 'publie'


class StatutConformiteEnum(enum.Enum):
    """Statuts de conformité (nouveaux v2.2)."""
    conforme = 'Conforme'
    demarche_achevee = 'Démarche achevée'
    demarche_en_cours = 'Démarche en cours'


class TypeDPOEnum(enum.Enum):
    """Type de DPO : interne ou externe."""
    interne = 'interne'
    externe = 'externe'


class TypeOTPEnum(enum.Enum):
    """Type de code OTP."""
    inscription = 'inscription'
    connexion = 'connexion'
    reset_password = 'reset_password'


class StatutAssignationEnum(enum.Enum):
    """Statut de traitement d'une assignation."""
    en_cours = 'en_cours'
    traite_attente_validation = 'traite_attente_validation'
    valide = 'valide'
    en_retard = 'en_retard'


class StatutRapprochementEnum(enum.Enum):
    """Statut d'une demande de rapprochement compte-entité."""
    en_attente = 'en_attente'
    approuve = 'approuve'
    rejete = 'rejete'


class TypeDocumentEnum(enum.Enum):
    """Types de documents uploadés."""
    cni = 'cni'
    registre_commerce = 'registre_commerce'
    statuts = 'statuts'
    attestation_fiscale = 'attestation_fiscale'
    rapport_activite = 'rapport_activite'
    autre = 'autre'


class CategorieDonneesEnum(enum.Enum):
    """Catégories de données personnelles traitées."""
    identite = 'identite'
    contact = 'contact'
    financieres = 'financieres'
    sante = 'sante'
    biometriques = 'biometriques'
    localisation = 'localisation'
    professionnelles = 'professionnelles'
    sensibles = 'sensibles'
    mineurs = 'mineurs'
    autre = 'autre'


class BaseLegaleEnum(enum.Enum):
    """Bases légales du traitement de données."""
    consentement = 'consentement'
    contrat = 'contrat'
    obligation_legale = 'obligation_legale'
    interet_vital = 'interet_vital'
    mission_publique = 'mission_publique'
    interet_legitime = 'interet_legitime'


class TypeMesureEnum(enum.Enum):
    """Types de mesures de sécurité."""
    technique = 'technique'
    organisationnelle = 'organisationnelle'
    physique = 'physique'


class StatutRenouvellementEnum(enum.Enum):
    """Statut d'une demande de renouvellement."""
    en_attente = 'en_attente'
    en_cours = 'en_cours'
    approuve = 'approuve'
    rejete = 'rejete'
