/**
 * API Admin ARTCI — 18 fonctions pour l'interface d'administration.
 */
import apiClient from './client';
import type { ApiResponse, PaginatedData } from '@/types/api';
import type { User } from '@/types/auth';
import type {
  AdminDashboardStats, AdminStatsFilter, AdminEntiteFilter,
  AdminEntiteListItem, AdminEntiteDetail,
  AssignationItem, AssignationCreateInput,
  ValidationN1Input,
  FeedbackCreateInput,
  UserCreateInput, UserUpdateInput, UserListItem,
  ImportResult,
  HistoriqueItem, LogsFilter,
  RenouvellementAdminItem, RenouvellementFilter, RenouvellementDecisionInput,
  RapportActiviteItem, RapportFilter, RapportDecisionInput,
  NotificationItem, NotificationsFilter,
} from '@/types/admin';
import type { DemandeInput } from '@/types/entreprise';

// ============================================================
// Dashboard / Stats
// ============================================================

/** GET /api/admin/dashboard */
export async function getDashboardStats(filters?: AdminStatsFilter): Promise<AdminDashboardStats> {
  const res = await apiClient.get<ApiResponse<AdminDashboardStats>>('/admin/dashboard', { params: filters });
  return res.data.data!;
}

/** GET /api/admin/stats */
export async function getAdvancedStats(filters?: AdminStatsFilter): Promise<AdminDashboardStats> {
  const res = await apiClient.get<ApiResponse<AdminDashboardStats>>('/admin/stats', { params: filters });
  return res.data.data!;
}

// ============================================================
// Entités
// ============================================================

/** GET /api/admin/entites */
export async function getEntites(filters: AdminEntiteFilter): Promise<PaginatedData<AdminEntiteListItem>> {
  const res = await apiClient.get<ApiResponse<PaginatedData<AdminEntiteListItem>>>('/admin/entites', { params: filters });
  return res.data.data!;
}

/** GET /api/admin/entites/:id */
export async function getEntiteDetail(id: string): Promise<AdminEntiteDetail> {
  const res = await apiClient.get<ApiResponse<AdminEntiteDetail>>(`/admin/entites/${id}`);
  return res.data.data!;
}

/** POST /api/admin/entites */
export async function createEntite(data: DemandeInput): Promise<AdminEntiteDetail> {
  const res = await apiClient.post<ApiResponse<AdminEntiteDetail>>('/admin/entites', data);
  return res.data.data!;
}

/** PUT /api/admin/entites/:id */
export async function updateEntite(id: string, data: Partial<DemandeInput>): Promise<AdminEntiteDetail> {
  const res = await apiClient.put<ApiResponse<AdminEntiteDetail>>(`/admin/entites/${id}`, data);
  return res.data.data!;
}

// ============================================================
// Backup
// ============================================================

export interface BackupItem {
  filename: string;
  taille_octets: number;
  taille: string;
  createdAt: string;
  type: 'manuel' | 'automatique';
  statut: 'termine' | 'en_cours' | 'echoue';
}

/** GET /api/admin/backup */
export async function listBackups(): Promise<BackupItem[]> {
  const res = await apiClient.get<ApiResponse<BackupItem[]>>('/admin/backup');
  return res.data.data!;
}

/** POST /api/admin/backup */
export async function createBackup(): Promise<{ filename: string; taille: string }> {
  const res = await apiClient.post<ApiResponse<{ filename: string; taille: string }>>('/admin/backup');
  return res.data.data!;
}

/** GET /api/admin/backup/:filename */
export async function downloadBackup(filename: string): Promise<void> {
  const res = await apiClient.get(`/admin/backup/${filename}`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

// ============================================================
// Inscriptions a valider
// ============================================================

export interface InscriptionItem {
  id: string;
  denomination: string;
  numero_cc: string;
  email: string;
  telephone?: string;
  ville?: string;
  region?: string;
  dg_nom?: string;
  dg_prenom?: string;
  dg_fonction?: string;
  dg_telephone?: string;
  dg_email?: string;
  dpo_nom?: string;
  dpo_prenom?: string;
  dpo_telephone?: string;
  dpo_email?: string;
  dpo_type?: string;
  dpo_organisme?: string;
  acces_email_referant?: string;
  acces_email_dpo?: string;
  inscription_statut: 'pending' | 'approved' | 'rejected';
  inscription_motif_rejet?: string;
  createdAt: string;
}

/** GET /api/admin/inscriptions?statut=pending */
export async function getInscriptions(statut: 'pending' | 'approved' | 'rejected' = 'pending'): Promise<InscriptionItem[]> {
  const res = await apiClient.get<ApiResponse<InscriptionItem[]>>('/admin/inscriptions', {
    params: { statut },
  });
  return res.data.data!;
}

/** POST /api/admin/inscriptions/:id/valider */
export async function validerInscription(compteId: string): Promise<{ id: string; inscription_statut: string; is_active: boolean }> {
  const res = await apiClient.post<ApiResponse<{ id: string; inscription_statut: string; is_active: boolean }>>(
    `/admin/inscriptions/${compteId}/valider`
  );
  return res.data.data!;
}

/** POST /api/admin/inscriptions/:id/rejeter */
export async function rejeterInscription(
  compteId: string,
  motif: string,
  motifCode?: string,
): Promise<{ id: string; inscription_statut: string; inscription_motif_rejet: string }> {
  const res = await apiClient.post<ApiResponse<{ id: string; inscription_statut: string; inscription_motif_rejet: string }>>(
    `/admin/inscriptions/${compteId}/rejeter`,
    { motif, motif_code: motifCode },
  );
  return res.data.data!;
}

/** GET /api/admin/inscriptions/motifs-rejet */
export async function getMotifsRejetInscription(): Promise<{ code: string; label: string }[]> {
  const res = await apiClient.get<ApiResponse<{ motifs: { code: string; label: string }[] }>>(
    '/admin/inscriptions/motifs-rejet'
  );
  return res.data.data!.motifs;
}

/** PUT /api/admin/entites/:id/formalites */
export async function updateFormalitesActivation(
  entiteId: string,
  data: { autorisation_active?: boolean; declaration_active?: boolean }
): Promise<{ autorisation_active: boolean; declaration_active: boolean }> {
  const res = await apiClient.put<ApiResponse<{ autorisation_active: boolean; declaration_active: boolean }>>(
    `/admin/entites/${entiteId}/formalites`,
    data
  );
  return res.data.data!;
}

// ============================================================
// Suivi d'activite des agents (spec §5.1, §5.2)
// ============================================================

export interface AgentActivity {
  agent_id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  nb_dossiers_affectes: number;
  nb_traites: number;
  nb_en_cours: number;
  nb_en_retard: number;
  nb_traitements_total: number;
  nb_traitements_valides: number;
  taux_traitement: number;
}

/** GET /api/admin/agents/activity */
export async function getAgentsActivity(): Promise<AgentActivity[]> {
  const res = await apiClient.get<ApiResponse<AgentActivity[]>>('/admin/agents/activity');
  return res.data.data!;
}

/** POST /api/admin/entites/:id/retour-formulaire (Super Admin uniquement) */
export async function retourFormulaireEntreprise(
  entiteId: string,
  motif: string,
): Promise<{ entite_id: string; statut: string }> {
  const res = await apiClient.post<ApiResponse<{ entite_id: string; statut: string }>>(
    `/admin/entites/${entiteId}/retour-formulaire`,
    { motif }
  );
  return res.data.data!;
}

// ============================================================
// Workflow Traiter (spec §6 reunion 07/05)
// ============================================================

export interface Traitement {
  id: string;
  entite_id: string;
  entite_denomination: string | null;
  entite_numero_cc: string | null;
  reponses_formulaire: Record<string, unknown>;
  commentaires_par_rubrique: Record<string, string>;
  score_automatique: number | null;
  score_manuel: number | null;
  niveau_conformite: string | null;
  recommandations: string | null;
  statut: 'en_cours' | 'soumis_validation' | 'valide' | 'retourne_entreprise';
  decision_validation: 'approuve' | 'retourne' | null;
  motif_retour: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

/** POST /api/admin/entites/:id/traiter (recupere ou cree le traitement) */
export async function commencerTraiter(entiteId: string): Promise<Traitement> {
  const res = await apiClient.post<ApiResponse<Traitement>>(`/admin/entites/${entiteId}/traiter`);
  return res.data.data!;
}

/** GET /api/admin/traitements/:id */
export async function getTraitement(traitementId: string): Promise<Traitement> {
  const res = await apiClient.get<ApiResponse<Traitement>>(`/admin/traitements/${traitementId}`);
  return res.data.data!;
}

/** PUT /api/admin/traitements/:id */
export async function updateTraitement(
  traitementId: string,
  data: {
    commentaires_par_rubrique?: Record<string, string>;
    score_manuel?: number;
    recommandations?: string;
  },
): Promise<Traitement> {
  const res = await apiClient.put<ApiResponse<Traitement>>(`/admin/traitements/${traitementId}`, data);
  return res.data.data!;
}

/** POST /api/admin/traitements/:id/soumettre */
export async function soumettreTraitement(traitementId: string): Promise<Traitement> {
  const res = await apiClient.post<ApiResponse<Traitement>>(`/admin/traitements/${traitementId}/soumettre`);
  return res.data.data!;
}

/** POST /api/admin/traitements/:id/valider */
export async function validerTraitement(
  traitementId: string,
  decision: 'approuve' | 'retourne',
  motif?: string,
): Promise<Traitement> {
  const res = await apiClient.post<ApiResponse<Traitement>>(
    `/admin/traitements/${traitementId}/valider`,
    { decision, motif }
  );
  return res.data.data!;
}

/** POST /api/admin/entites/:id/publier */
export async function publierEntite(entiteId: string): Promise<{ id: string; publie_sur_carte: boolean }> {
  const res = await apiClient.post<ApiResponse<{ id: string; publie_sur_carte: boolean }>>(
    `/admin/entites/${entiteId}/publier`
  );
  return res.data.data!;
}

/** POST /api/admin/entites/:id/depublier */
export async function depublierEntite(entiteId: string): Promise<{ id: string; publie_sur_carte: boolean }> {
  const res = await apiClient.post<ApiResponse<{ id: string; publie_sur_carte: boolean }>>(
    `/admin/entites/${entiteId}/depublier`
  );
  return res.data.data!;
}

/** POST /api/admin/entites/:id/rapport-audit */
export async function uploadRapportAudit(
  entiteId: string,
  file: File
): Promise<{ id: string; nom_fichier: string; type_document: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post<ApiResponse<{ id: string; nom_fichier: string; type_document: string }>>(
    `/admin/entites/${entiteId}/rapport-audit`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data.data!;
}

// ============================================================
// Workflow — Panier / Assignation
// ============================================================

/** GET /api/admin/panier */
export async function getPanier(): Promise<AssignationItem[]> {
  const res = await apiClient.get<ApiResponse<AssignationItem[]>>('/admin/panier');
  return res.data.data!;
}

/** POST /api/admin/assignation */
export async function createAssignation(data: AssignationCreateInput): Promise<AssignationItem> {
  const res = await apiClient.post<ApiResponse<AssignationItem>>('/admin/assignation', data);
  return res.data.data!;
}

/** PUT /api/admin/assignation/:id (marquer traité) */
export async function traiterAssignation(id: string): Promise<AssignationItem> {
  const res = await apiClient.put<ApiResponse<AssignationItem>>(`/admin/assignation/${id}`);
  return res.data.data!;
}

// ============================================================
// Validation N+1
// ============================================================

/** GET /api/admin/validation-n1 */
export async function getValidationQueue(): Promise<AssignationItem[]> {
  const res = await apiClient.get<ApiResponse<AssignationItem[]>>('/admin/validation-n1');
  return res.data.data!;
}

/** PUT /api/admin/validation-n1/:id */
export async function validerN1(id: string, data: ValidationN1Input): Promise<AssignationItem> {
  const res = await apiClient.put<ApiResponse<AssignationItem>>(`/admin/validation-n1/${id}`, data);
  return res.data.data!;
}

// ============================================================
// Feedbacks
// ============================================================

/** POST /api/admin/feedbacks */
export async function createFeedback(data: FeedbackCreateInput): Promise<{ id: string }> {
  const res = await apiClient.post<ApiResponse<{ id: string }>>('/admin/feedbacks', data);
  return res.data.data!;
}

// ============================================================
// Utilisateurs
// ============================================================

/** GET /api/admin/users */
export async function getUsers(page = 1, perPage = 20): Promise<PaginatedData<UserListItem>> {
  const res = await apiClient.get<ApiResponse<PaginatedData<UserListItem>>>('/admin/users', {
    params: { page, per_page: perPage },
  });
  return res.data.data!;
}

/** POST /api/admin/users */
export async function createUser(data: UserCreateInput): Promise<User> {
  const res = await apiClient.post<ApiResponse<User>>('/admin/users', data);
  return res.data.data!;
}

/** PUT /api/admin/users/:id */
export async function updateUser(id: string, data: UserUpdateInput): Promise<User> {
  const res = await apiClient.put<ApiResponse<User>>(`/admin/users/${id}`, data);
  return res.data.data!;
}

/** DELETE /api/admin/users/:id */
export async function deactivateUser(id: string): Promise<void> {
  await apiClient.delete(`/admin/users/${id}`);
}

// ============================================================
// Import Excel
// ============================================================

/** POST /api/admin/import */
export async function importExcel(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post<ApiResponse<ImportResult>>('/admin/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data!;
}

/** POST /api/admin/import/boloforms - Import du CSV BoloForms / Google Forms (171 cols) */
export async function importBoloforms(file: File): Promise<ImportResult & { skipped: number }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post<ApiResponse<ImportResult & { skipped: number }>>(
    '/admin/import/boloforms',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data.data!;
}

/** GET /api/admin/import/template — Télécharger le template Excel pré-formaté */
export async function downloadImportTemplate(): Promise<void> {
  const res = await apiClient.get('/admin/import/template', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'template_recensement_dcp_artci.xlsx';
  a.click();
  window.URL.revokeObjectURL(url);
}

// ============================================================
// Logs
// ============================================================

/** GET /api/admin/logs */
export async function getLogs(filters: LogsFilter): Promise<PaginatedData<HistoriqueItem>> {
  const res = await apiClient.get<ApiResponse<PaginatedData<HistoriqueItem>>>('/admin/logs', { params: filters });
  return res.data.data!;
}

// ============================================================
// Formalités (Renouvellements + Autorisations + Déclarations)
// ============================================================

/** GET /api/admin/renouvellements */
export async function getRenouvellements(filters: RenouvellementFilter): Promise<PaginatedData<RenouvellementAdminItem>> {
  const res = await apiClient.get<ApiResponse<PaginatedData<RenouvellementAdminItem>>>('/admin/renouvellements', { params: filters });
  return res.data.data!;
}

/** PUT /api/admin/renouvellements/:id */
export async function traiterRenouvellement(id: string, data: RenouvellementDecisionInput): Promise<RenouvellementAdminItem> {
  const res = await apiClient.put<ApiResponse<RenouvellementAdminItem>>(`/admin/renouvellements/${id}`, data);
  return res.data.data!;
}

// ============================================================
// Rapports d'activité (validation)
// ============================================================

/** GET /api/admin/rapports */
export async function getRapportsActivite(filters: RapportFilter): Promise<PaginatedData<RapportActiviteItem>> {
  const res = await apiClient.get<ApiResponse<PaginatedData<RapportActiviteItem>>>('/admin/rapports', { params: filters });
  return res.data.data!;
}

/** PUT /api/admin/rapports/:id */
export async function traiterRapport(id: string, data: RapportDecisionInput): Promise<RapportActiviteItem> {
  const res = await apiClient.put<ApiResponse<RapportActiviteItem>>(`/admin/rapports/${id}`, data);
  return res.data.data!;
}

// ============================================================
// Notifications
// ============================================================

/** GET /api/admin/notifications */
export async function getNotifications(filters?: NotificationsFilter): Promise<NotificationItem[]> {
  const res = await apiClient.get<ApiResponse<NotificationItem[]>>('/admin/notifications', { params: filters });
  return res.data.data!;
}

/** PUT /api/admin/notifications/:id/read */
export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.put(`/admin/notifications/${id}/read`);
}
