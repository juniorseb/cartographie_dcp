/**
 * Types pour l'interface admin ARTCI.
 */
import type { StatutAssignation, Role } from './enums';
import type { DossierComplet } from './entreprise';

// ============================================================
// Dashboard / Stats
// ============================================================

export interface AdminDashboardStats {
  par_statut_workflow: Record<string, number>;
  par_statut_conformite: Record<string, number>;
  par_secteur: Record<string, number>;
  par_region: Record<string, number>;
  par_origine: Record<string, number>;
  demandes_en_cours: number;
  demandes_en_retard: number;
  agents_actifs: number;
  total_entites: number;
}

export interface AdminStatsFilter {
  date_debut?: string;
  date_fin?: string;
}

// ============================================================
// Entités admin
// ============================================================

export interface AdminEntiteFilter {
  search?: string;
  secteur_activite?: string;
  ville?: string;
  region?: string;
  forme_juridique?: string;
  statut_workflow?: string;
  statut_conformite?: string;
  origine_saisie?: string;
  page?: number;
  per_page?: number;
}

/** Entité en liste (vue admin, inclut statut_workflow) */
export interface AdminEntiteListItem {
  id: string;
  denomination: string;
  numero_cc: string;
  forme_juridique?: string;
  secteur_activite?: string;
  ville?: string;
  region?: string;
  origine_saisie?: string;
  publie_sur_carte?: boolean;
  statut_conformite?: string;
  statut_workflow?: string;
  score_conformite?: number;
  latitude?: number;
  longitude?: number;
  a_dpo?: boolean;
  finalite_principale?: string;
  numero_autorisation?: string;
  createdAt: string;
}

// Réutilise DossierComplet pour le détail admin
export type AdminEntiteDetail = DossierComplet;

// ============================================================
// Assignations
// ============================================================

export interface AssignationItem {
  id: string;
  entite_id: string;
  entite_denomination?: string;
  agent_id: string;
  agent_nom?: string;
  agent_prenom?: string;
  validateur_id?: string;
  validateur_nom?: string;
  statut: StatutAssignation;
  echeance?: string;
  commentaire?: string;
  date_traitement?: string;
  createdAt: string;
}

export interface AssignationCreateInput {
  entite_id: string;
  agent_id: string;
  echeance?: string;
}

// ============================================================
// Validation N+1
// ============================================================

export interface ValidationN1Input {
  action: 'valider' | 'renvoyer';
  commentaire?: string;
}

// ============================================================
// Feedbacks admin
// ============================================================

export interface FeedbackCreateInput {
  entite_id: string;
  commentaires: string;
  elements_manquants?: string[];
  delai_fourniture?: string;
}

// ============================================================
// Utilisateurs
// ============================================================

export interface UserCreateInput {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  role: Role;
  telephone?: string;
}

export interface UserUpdateInput {
  nom?: string;
  prenom?: string;
  email?: string;
  role?: Role;
  telephone?: string;
  is_active?: boolean;
}

export interface UserListItem {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  telephone?: string;
  is_active: boolean;
  last_login?: string;
  createdAt: string;
}

// ============================================================
// Import Excel
// ============================================================

export interface ImportResult {
  imported: number;
  errors: { row: number; message: string }[];
}

// ============================================================
// Logs / Historique
// ============================================================

export interface HistoriqueItem {
  id: string;
  entite_id: string;
  entite_denomination?: string;
  ancien_statut?: string;
  nouveau_statut?: string;
  modifie_par?: string;
  modifie_par_nom?: string;
  commentaire?: string;
  createdAt: string;
}

export interface LogsFilter {
  entite_id?: string;
  modifie_par?: string;
  page?: number;
  per_page?: number;
}

// ============================================================
// Rapprochements admin
// ============================================================

export interface RapprochementAdminItem {
  id: string;
  entite_id?: string;
  entreprise_denomination: string;
  numero_cc?: string;
  email_demandeur: string;
  raison_demande?: string;
  statut: string;
  commentaire_artci?: string;
  traite_par?: string;
  createdAt: string;
}

export interface RapprochementFilter {
  search?: string;
  statut?: string;
  page?: number;
  per_page?: number;
}

export interface RapprochementDecisionInput {
  action: 'approuver' | 'rejeter';
  motif?: string;
}

// ============================================================
// Renouvellements admin
// ============================================================

export interface RenouvellementAdminItem {
  id: string;
  entite_id?: string;
  entreprise_denomination: string;
  date_expiration: string;
  motif?: string;
  statut: string;
  commentaire?: string;
  traite_par?: string;
  createdAt: string;
}

export interface RenouvellementFilter {
  search?: string;
  statut?: string;
  page?: number;
  per_page?: number;
}

export interface RenouvellementDecisionInput {
  action: 'approuver' | 'rejeter';
  commentaire?: string;
}

// ============================================================
// Rapports d'activité (validation)
// ============================================================

export interface RapportActiviteItem {
  id: string;
  entite_id?: string;
  entreprise_denomination: string;
  type_document?: string;
  nom_fichier: string;
  date_soumission: string;
  statut: string;
  commentaire?: string;
  createdAt: string;
}

export interface RapportFilter {
  search?: string;
  statut?: string;
  page?: number;
  per_page?: number;
}

export interface RapportDecisionInput {
  action: 'valider' | 'rejeter';
  motif?: string;
}

// ============================================================
// Notifications
// ============================================================

export interface NotificationItem {
  id: string;
  type: string;
  titre: string;
  message: string;
  lue: boolean;
  entite_id?: string;
  createdAt: string;
}

export interface NotificationsFilter {
  type?: string;
  lue?: boolean;
}
