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
  RapprochementAdminItem, RapprochementFilter, RapprochementDecisionInput,
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

// ============================================================
// Logs
// ============================================================

/** GET /api/admin/logs */
export async function getLogs(filters: LogsFilter): Promise<PaginatedData<HistoriqueItem>> {
  const res = await apiClient.get<ApiResponse<PaginatedData<HistoriqueItem>>>('/admin/logs', { params: filters });
  return res.data.data!;
}

// ============================================================
// Rapprochements
// ============================================================

/** GET /api/admin/rapprochements */
export async function getRapprochements(filters: RapprochementFilter): Promise<PaginatedData<RapprochementAdminItem>> {
  const res = await apiClient.get<ApiResponse<PaginatedData<RapprochementAdminItem>>>('/admin/rapprochements', { params: filters });
  return res.data.data!;
}

/** PUT /api/admin/rapprochements/:id */
export async function traiterRapprochement(id: string, data: RapprochementDecisionInput): Promise<RapprochementAdminItem> {
  const res = await apiClient.put<ApiResponse<RapprochementAdminItem>>(`/admin/rapprochements/${id}`, data);
  return res.data.data!;
}

// ============================================================
// Renouvellements
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
