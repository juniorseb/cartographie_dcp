/**
 * String literal unions miroir des enums Python backend.
 */

export type Role = 'super_admin' | 'admin' | 'editor' | 'reader';

export type OrigineSaisie = 'auto_recensement' | 'saisie_artci' | 'rapprochement';

export type StatutWorkflow =
  | 'brouillon'
  | 'brouillon_artci'
  | 'soumis'
  | 'en_verification'
  | 'en_attente_complements'
  | 'conforme'
  | 'conforme_sous_reserve'
  | 'valide'
  | 'rejete'
  | 'publie';

export type StatutConformite = 'Conforme' | 'Démarche achevée' | 'Démarche en cours';

export type TypeDPO = 'interne' | 'externe';

export type TypeOTP = 'inscription' | 'connexion' | 'reset_password';

export type StatutAssignation = 'en_cours' | 'traite_attente_validation' | 'valide' | 'en_retard';

export type TypeDocument =
  | 'cni'
  | 'registre_commerce'
  | 'statuts'
  | 'attestation_fiscale'
  | 'rapport_activite'
  | 'autre';

export type CategorieDonnees =
  | 'identite'
  | 'contact'
  | 'financieres'
  | 'sante'
  | 'biometriques'
  | 'localisation'
  | 'professionnelles'
  | 'sensibles'
  | 'mineurs'
  | 'autre';

export type BaseLegale =
  | 'consentement'
  | 'contrat'
  | 'obligation_legale'
  | 'interet_vital'
  | 'mission_publique'
  | 'interet_legitime';

export type TypeMesure = 'technique' | 'organisationnelle' | 'physique';

export type StatutRenouvellement = 'en_attente' | 'en_cours' | 'approuve' | 'rejete';
