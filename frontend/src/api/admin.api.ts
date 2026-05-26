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
  FeedbackCreateInput, FeedbackListItem, StatutEcheanceFeedback,
  UserCreateInput, UserUpdateInput, UserListItem,
  ImportResult,
  HistoriqueItem, LogsFilter,
  RenouvellementAdminItem, RenouvellementFilter, RenouvellementDecisionInput,
  RapportActiviteItem, RapportFilter, RapportDecisionInput,
  NotificationItem, NotificationsFilter,
  DashboardResponse,
} from '@/types/admin';
import type { DemandeInput } from '@/types/entreprise';

// ============================================================
// Dashboard / Stats
// ============================================================

/** GET /api/admin/dashboard
 * Renvoie un AdminDashboardStats pour reader/admin/super_admin,
 * un EditorPerformance pour editor.
 */
export async function getDashboardStats(filters?: AdminStatsFilter): Promise<DashboardResponse> {
  const res = await apiClient.get<ApiResponse<DashboardResponse>>('/admin/dashboard', { params: filters });
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

export interface InscriptionDocument {
  type?: string;              // ex 'doc_rccm', 'doc_dfe', 'doc_autre'
  r2_key?: string;
  nom_fichier?: string;
  taille?: number;
  mime_type?: string;
  uploadedAt?: string;
  download_url?: string | null;  // URL R2 signee valide 1h (null pour les vieux docs)
}

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
  documents_inscription?: InscriptionDocument[];
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

/** Nouvelle soumission non assignee (visible uniquement par admin/super_admin
 * dans leur panier). L'admin peut soit s'auto-traiter, soit assigner a un
 * editeur via le bouton dedie. */
export interface NouvelleSoumissionPanier {
  entite_id: string;
  entite_denomination: string | null;
  entite_numero_cc: string | null;
  entite_ville: string | null;
  entite_region: string | null;
  date_soumission: string | null;
  statut_workflow: string | null;
}

export interface PanierResponse {
  assignations: AssignationItem[];
  nouvelles_soumissions: NouvelleSoumissionPanier[];
}

/** GET /api/admin/panier */
export async function getPanier(): Promise<PanierResponse> {
  const res = await apiClient.get<ApiResponse<PanierResponse>>('/admin/panier');
  return res.data.data!;
}

/** GET /api/admin/assignations — toutes les assignations (vue globale) */
export async function getAllAssignations(): Promise<AssignationItem[]> {
  const res = await apiClient.get<ApiResponse<AssignationItem[]>>('/admin/assignations');
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

/** GET /api/admin/feedbacks — liste paginee avec filtre echeance */
export async function listFeedbacks(params: {
  page?: number;
  per_page?: number;
  statut_echeance?: StatutEcheanceFeedback;
}): Promise<PaginatedData<FeedbackListItem>> {
  const res = await apiClient.get<ApiResponse<PaginatedData<FeedbackListItem>>>(
    '/admin/feedbacks',
    { params }
  );
  return res.data.data!;
}

// ============================================================
// Formulaire DCP — vue admin (saisie ARTCI ou edition par agent)
// ============================================================

export interface AdminFormulaireDCPResponse {
  entite_id: string;
  denomination: string;
  numero_cc: string;
  reponses: Record<string, unknown>;
  version: number;
  formalite_calculee?: string;
  formalite_motifs?: string[];
}

/** GET /api/admin/entites/:id/formulaire-dcp */
export async function adminGetFormulaireDCP(
  entiteId: string,
): Promise<AdminFormulaireDCPResponse> {
  const res = await apiClient.get<ApiResponse<AdminFormulaireDCPResponse>>(
    `/admin/entites/${entiteId}/formulaire-dcp`
  );
  return res.data.data!;
}

/** PUT /api/admin/entites/:id/formulaire-dcp (verrouillage optimiste) */
export async function adminSaveFormulaireDCP(
  entiteId: string,
  reponses: Record<string, unknown>,
  expectedVersion?: number,
): Promise<AdminFormulaireDCPResponse> {
  const res = await apiClient.put<ApiResponse<AdminFormulaireDCPResponse>>(
    `/admin/entites/${entiteId}/formulaire-dcp`,
    { reponses, version: expectedVersion },
  );
  return res.data.data!;
}

/** POST /api/admin/entites/saisie-artci (creation initiale en saisie ARTCI) */
export async function adminCreateSaisieArtci(payload: {
  denomination?: string;
  numero_cc?: string;
  reponses: Record<string, unknown>;
}): Promise<{ id: string; denomination: string; numero_cc: string; formalite_calculee?: string; version: number }> {
  const res = await apiClient.post<ApiResponse<{
    id: string; denomination: string; numero_cc: string;
    formalite_calculee?: string; version: number;
  }>>('/admin/entites/saisie-artci', payload);
  return res.data.data!;
}

// ============================================================
// Commentaires ancres + Revisions (Modele PR)
// ============================================================

export interface CommentaireDossierItem {
  id: string;
  entite_id: string;
  revision_id: string | null;
  agent_id: string;
  agent_nom: string | null;
  rubrique: string;
  sous_question: string | null;
  contenu: string;
  etat: 'open' | 'resolved';
  reponse_entreprise: string | null;
  repondu_le: string | null;
  resolu_par: string | null;
  resolu_le: string | null;
  cree_le: string | null;
  // L1 PR : threads + edition
  parent_id?: string | null;
  auteur_role?: string | null;
  edited_at?: string | null;
}

export interface CommentaireCreateInput {
  rubrique: string;
  sous_question?: string;
  contenu: string;
  revision_id?: string;
  parent_id?: string;
}

export interface DossierRevisionItem {
  id: string;
  numero_revision: number;
  soumis_le: string | null;
  soumis_par_compte_id: string | null;
  statut_au_moment: string | null;
  score_automatique_snapshot: number | null;
}

/** GET /api/admin/entites/:id/commentaires */
export async function listCommentaires(
  entiteId: string,
  params?: { etat?: 'open' | 'resolved'; revision_id?: string }
): Promise<CommentaireDossierItem[]> {
  const res = await apiClient.get<ApiResponse<{ items: CommentaireDossierItem[] }>>(
    `/admin/entites/${entiteId}/commentaires`,
    { params }
  );
  return res.data.data?.items ?? [];
}

/** POST /api/admin/entites/:id/commentaires */
export async function addCommentaire(
  entiteId: string,
  payload: CommentaireCreateInput
): Promise<{ id: string; etat: string }> {
  const res = await apiClient.post<ApiResponse<{ id: string; etat: string }>>(
    `/admin/entites/${entiteId}/commentaires`,
    payload
  );
  return res.data.data!;
}

/** POST /api/admin/commentaires/:id/resoudre */
export async function resoudreCommentaire(commentaireId: string): Promise<void> {
  await apiClient.post(`/admin/commentaires/${commentaireId}/resoudre`);
}

/** PUT /api/admin/commentaires/:id (auteur uniquement, avant resolution) */
export async function editerCommentaire(commentaireId: string, contenu: string): Promise<void> {
  await apiClient.put(`/admin/commentaires/${commentaireId}`, { contenu });
}

export interface DossierEvenementItem {
  id: string;
  evenement_type: string;
  acteur_user_id: string | null;
  acteur_compte_id: string | null;
  acteur_role: string | null;
  acteur_nom: string;
  payload: Record<string, unknown>;
  createdAt: string | null;
}

/** GET /api/admin/entites/:id/evenements (audit trail) */
export async function listEvenements(
  entiteId: string,
  params?: { type?: string; limit?: number }
): Promise<DossierEvenementItem[]> {
  const res = await apiClient.get<ApiResponse<{ items: DossierEvenementItem[] }>>(
    `/admin/entites/${entiteId}/evenements`,
    { params }
  );
  return res.data.data?.items ?? [];
}

/** GET /api/admin/entites/:id/revisions */
export async function listRevisions(entiteId: string): Promise<DossierRevisionItem[]> {
  const res = await apiClient.get<ApiResponse<{ items: DossierRevisionItem[] }>>(
    `/admin/entites/${entiteId}/revisions`
  );
  return res.data.data?.items ?? [];
}

/** GET /api/admin/entites/:id/revisions/diff (mode simple, par rubrique) */
export async function diffRevisions(
  entiteId: string,
  fromRev: number,
  toRev: number
): Promise<{ from: number; to: number; rubriques: Record<string, 'modifiee' | 'ajoutee' | 'supprimee' | 'inchangee'> }> {
  const res = await apiClient.get<ApiResponse<{
    from: number; to: number; rubriques: Record<string, 'modifiee' | 'ajoutee' | 'supprimee' | 'inchangee'>
  }>>(
    `/admin/entites/${entiteId}/revisions/diff`,
    { params: { from: fromRev, to: toRev } }
  );
  return res.data.data!;
}

/** Champ modifie dans une rubrique (mode detail). */
export interface ChampDiff {
  cle: string;          // ex: 'volume_donnees', 'localisation.latitude'
  avant: unknown;
  apres: unknown;
  type: 'scalaire' | 'liste';
  ajoutes?: unknown[];  // si type=liste
  retires?: unknown[];  // si type=liste
}

export interface RubriqueDiffDetail {
  etat: 'modifiee' | 'ajoutee' | 'supprimee' | 'inchangee';
  champs: ChampDiff[];
}

export interface DiffRevisionsDetailResponse {
  from: number;
  to: number;
  rubriques: Record<string, RubriqueDiffDetail>;
  total_champs_modifies: number;
  total_rubriques_modifiees: number;
}

/** GET /api/admin/entites/:id/revisions/diff?detail=true (mode champ par champ) */
export async function diffRevisionsDetail(
  entiteId: string,
  fromRev: number,
  toRev: number
): Promise<DiffRevisionsDetailResponse> {
  const res = await apiClient.get<ApiResponse<DiffRevisionsDetailResponse>>(
    `/admin/entites/${entiteId}/revisions/diff`,
    { params: { from: fromRev, to: toRev, detail: 'true' } }
  );
  return res.data.data!;
}

// ============================================================
// Signalements d'erreur (Super Admin uniquement)
// ============================================================

export type StatutSignalement = 'open' | 'in_progress' | 'resolved' | 'dismissed';

export interface SignalementErreurAdminItem {
  id: string;
  entite_id: string;
  entite_denomination?: string | null;
  compte_id: string;
  sujet: string;
  description: string;
  rubrique_concernee?: string | null;
  statut: StatutSignalement;
  reponse_admin?: string | null;
  traite_par?: string | null;
  date_traitement?: string | null;
  createdAt: string | null;
}

/** GET /api/admin/signalements */
export async function listSignalements(statut?: StatutSignalement): Promise<{
  items: SignalementErreurAdminItem[]; total: number;
}> {
  const res = await apiClient.get<ApiResponse<{ items: SignalementErreurAdminItem[]; total: number }>>(
    '/admin/signalements',
    { params: statut ? { statut } : undefined }
  );
  return res.data.data!;
}

/** PUT /api/admin/signalements/:id */
export async function repondreSignalement(
  id: string,
  payload: { statut: StatutSignalement; reponse_admin?: string }
): Promise<{ id: string; statut: string }> {
  const res = await apiClient.put<ApiResponse<{ id: string; statut: string }>>(
    `/admin/signalements/${id}`,
    payload
  );
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
