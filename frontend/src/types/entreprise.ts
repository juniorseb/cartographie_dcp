/**
 * Types pour l'interface entreprise (miroir schemas backend).
 */
import type { StatutWorkflow, StatutConformite, StatutRenouvellement } from './enums';

// ============================================================
// Dashboard
// ============================================================

export interface DashboardStep {
  step: number;
  label: string;
  statut: 'completed' | 'active' | 'pending';
  description: string;
}

export interface DashboardData {
  compte: {
    denomination: string;
    numero_cc: string;
    email: string;
  };
  entite_id: string | null;
  statut_workflow: StatutWorkflow | null;
  statut_conformite: StatutConformite | null;
  score_conformite: number | null;
  steps: DashboardStep[];
  has_demande: boolean;
  can_edit: boolean;
  can_submit: boolean;
  feedbacks_non_lus: number;
}

// ============================================================
// Demande (formulaire 50 questions)
// ============================================================

export interface EntiteContact {
  responsable_legal_nom?: string;
  responsable_legal_fonction?: string;
  responsable_legal_email?: string;
  responsable_legal_telephone?: string;
  site_web?: string;
}

export interface EntiteLocalisation {
  latitude?: number;
  longitude?: number;
  precision_gps?: string;
  methode_geolocalisation?: string;
  adresse_complete?: string;
  code_postal?: string;
}

export interface SecuriteConformite {
  politique_securite?: boolean;
  responsable_securite?: boolean;
  analyse_risques?: boolean;
  plan_continuite?: boolean;
  notification_violations?: boolean;
  nombre_violations_12mois?: number;
  formation_personnel?: boolean;
  frequence_formation?: string;
  dernier_audit?: string;
}

export interface ResponsableLegal {
  id?: string;
  nom: string;
  prenom?: string;
  fonction?: string;
  email?: string;
  telephone?: string;
}

export interface DPO {
  id?: string;
  nom: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  type: 'interne' | 'externe';
  organisme?: string;
  date_designation?: string;
}

export interface ConformiteAdministrative {
  id?: string;
  connaissance_loi_2013?: boolean;
  declaration_artci?: boolean;
  numero_declaration?: string;
  date_declaration?: string;
  autorisation_artci?: boolean;
  numero_autorisation?: string;
  date_autorisation?: string;
}

export interface RegistreTraitement {
  id?: string;
  nom_traitement: string;
  description?: string;
  finalite?: string;
  base_legale?: string;
  categories_personnes?: string;
  duree_conservation?: string;
  destinataires?: string;
  transfert_hors_ci?: boolean;
}

export interface CategorieDonneesItem {
  id?: string;
  registre_traitement_id?: string;
  categorie: string;
  description?: string;
  volume_estime?: string;
}

export interface FinaliteBaseLegale {
  id?: string;
  finalite: string;
  base_legale: string;
  pourcentage?: number;
  description?: string;
}

export interface SousTraitance {
  id?: string;
  nom_sous_traitant: string;
  pays?: string;
  type_donnees_partagees?: string;
  contrat_sous_traitance?: boolean;
  clauses_protection?: boolean;
  audit_sous_traitant?: boolean;
}

export interface TransfertInternational {
  id?: string;
  pays_destination: string;
  organisme_destinataire?: string;
  base_juridique?: string;
  garanties_appropriees?: string;
  autorisation_artci?: boolean;
}

export interface MesureSecurite {
  id?: string;
  type_mesure: 'technique' | 'organisationnelle' | 'physique';
  description: string;
  mise_en_oeuvre?: boolean;
  date_mise_en_oeuvre?: string;
}

export interface CertificationSecurite {
  id?: string;
  nom_certification: string;
  organisme_certificateur?: string;
  date_obtention?: string;
  date_expiration?: string;
  numero_certificat?: string;
}

/** Input complet du formulaire 50 questions. */
export interface DemandeInput {
  // Partie 1 : Identification
  denomination: string;
  numero_cc: string;
  forme_juridique?: string;
  secteur_activite?: string;
  adresse?: string;
  ville?: string;
  region?: string;
  telephone?: string;
  email?: string;
  // Partie 2 : Contact & Localisation
  contact?: EntiteContact;
  localisation?: EntiteLocalisation;
  responsables_legaux?: ResponsableLegal[];
  // Partie 3 : Protection des données
  dpos?: DPO[];
  conformites_administratives?: ConformiteAdministrative[];
  // Partie 4 : Traitements
  registre_traitements?: RegistreTraitement[];
  categories_donnees?: CategorieDonneesItem[];
  finalites?: FinaliteBaseLegale[];
  sous_traitants?: SousTraitance[];
  transferts?: TransfertInternational[];
  // Partie 5 : Sécurité
  securite?: SecuriteConformite;
  mesures_securite?: MesureSecurite[];
  certifications?: CertificationSecurite[];
}

// ============================================================
// Dossier complet (mon-dossier)
// ============================================================

export interface DossierComplet {
  id: string;
  denomination: string;
  numero_cc: string;
  forme_juridique?: string;
  secteur_activite?: string;
  adresse?: string;
  ville?: string;
  region?: string;
  telephone?: string;
  email?: string;
  origine_saisie?: string;
  publie_sur_carte?: boolean;
  createdAt: string;
  updatedAt?: string;
  contact?: EntiteContact;
  workflow?: WorkflowInfo;
  localisation?: EntiteLocalisation;
  conformite?: ConformiteInfo;
  securite?: SecuriteConformite;
  responsables_legaux?: ResponsableLegal[];
  dpos?: DPO[];
  conformites_administratives?: ConformiteAdministrative[];
  documents?: DocumentJoint[];
  registre_traitements?: RegistreTraitement[];
  categories_donnees?: CategorieDonneesItem[];
  finalites?: FinaliteBaseLegale[];
  sous_traitants?: SousTraitance[];
  transferts?: TransfertInternational[];
  mesures_securite?: MesureSecurite[];
  certifications?: CertificationSecurite[];
  renouvellements?: RenouvellementItem[];
}

export interface WorkflowInfo {
  statut: StatutWorkflow;
  numero_autorisation_artci?: string;
  date_soumission?: string;
  date_validation?: string;
  date_publication?: string;
  date_rejet?: string;
  motif_rejet?: string;
}

export interface ConformiteInfo {
  score_conformite?: number;
  statut_conformite?: StatutConformite;
  a_dpo?: boolean;
  type_dpo?: string;
  effectif_entreprise?: string;
  volume_donnees_traitees?: string;
  delai_mise_en_conformite?: string;
}

export interface DocumentJoint {
  id: string;
  type_document: string;
  nom_fichier: string;
  taille?: number;
  mime_type?: string;
  uploadedAt: string;
}

// ============================================================
// Feedbacks
// ============================================================

export interface FeedbackItem {
  id: string;
  type: string;
  message: string;
  created_by_nom?: string;
  createdAt: string;
  is_read?: boolean;
  elements_manquants?: string[];
  delai_fourniture?: string;
}

// ============================================================
// Renouvellement
// ============================================================

export interface RenouvellementInput {
  date_expiration_agrement?: string;
  motif?: string;
}

export interface RenouvellementItem {
  id: string;
  date_demande: string;
  date_expiration_agrement?: string;
  motif?: string;
  statut: StatutRenouvellement;
  traite_par?: string;
  date_traitement?: string;
  commentaire?: string;
  createdAt: string;
}

// ============================================================
// Profil
// ============================================================

export interface ProfilData {
  id: string;
  email: string;
  denomination: string;
  numero_cc: string;
  telephone?: string;
  adresse?: string;
  ville?: string;
  region?: string;
  email_verified: boolean;
  is_active: boolean;
  password_expires_at?: string;
  createdAt: string;
}

export interface ProfilUpdateInput {
  telephone?: string;
  adresse?: string;
  ville?: string;
  region?: string;
}
