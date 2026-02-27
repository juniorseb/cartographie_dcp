/**
 * API Entreprise — 10 fonctions pour le portail entreprise.
 */
import apiClient from './client';
import type { ApiResponse } from '@/types/api';
import type {
  DashboardData,
  DossierComplet,
  DemandeInput,
  FeedbackItem,
  RenouvellementInput,
  RenouvellementItem,
  ProfilData,
  ProfilUpdateInput,
} from '@/types/entreprise';

/** GET /api/entreprise/dashboard */
export async function getDashboard(): Promise<DashboardData> {
  const res = await apiClient.get<ApiResponse<DashboardData>>('/entreprise/dashboard');
  return res.data.data!;
}

/** GET /api/entreprise/mon-dossier */
export async function getMonDossier(): Promise<DossierComplet> {
  const res = await apiClient.get<ApiResponse<DossierComplet>>('/entreprise/mon-dossier');
  return res.data.data!;
}

/** POST /api/entreprise/demande */
export async function createDemande(data: DemandeInput): Promise<DossierComplet> {
  const res = await apiClient.post<ApiResponse<DossierComplet>>('/entreprise/demande', data);
  return res.data.data!;
}

/** PUT /api/entreprise/demande/:id */
export async function updateDemande(id: string, data: Partial<DemandeInput>): Promise<DossierComplet> {
  const res = await apiClient.put<ApiResponse<DossierComplet>>(`/entreprise/demande/${id}`, data);
  return res.data.data!;
}

/** POST /api/entreprise/demande/:id/soumettre */
export async function soumettreDemande(id: string): Promise<void> {
  await apiClient.post(`/entreprise/demande/${id}/soumettre`);
}

/** GET /api/entreprise/feedbacks */
export async function getFeedbacks(): Promise<FeedbackItem[]> {
  const res = await apiClient.get<ApiResponse<FeedbackItem[]>>('/entreprise/feedbacks');
  return res.data.data!;
}

/** POST /api/entreprise/rapports (FormData avec fichier) */
export async function soumettreRapport(
  file: File,
  typeDocument: string = 'rapport_activite'
): Promise<{ id: string; nom_fichier: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type_document', typeDocument);

  const res = await apiClient.post<ApiResponse<{ id: string; nom_fichier: string }>>(
    '/entreprise/rapports',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data.data!;
}

/** POST /api/entreprise/renouvellement */
export async function demanderRenouvellement(
  data: RenouvellementInput
): Promise<RenouvellementItem> {
  const res = await apiClient.post<ApiResponse<RenouvellementItem>>(
    '/entreprise/renouvellement',
    data
  );
  return res.data.data!;
}

/** GET /api/entreprise/profil */
export async function getProfil(): Promise<ProfilData> {
  const res = await apiClient.get<ApiResponse<ProfilData>>('/entreprise/profil');
  return res.data.data!;
}

/** PUT /api/entreprise/profil */
export async function updateProfil(data: ProfilUpdateInput): Promise<ProfilData> {
  const res = await apiClient.put<ApiResponse<ProfilData>>('/entreprise/profil', data);
  return res.data.data!;
}

// ============================================================
// Rapprochements
// ============================================================

interface RapprochementEntrepriseItem {
  id: string;
  numero_cc: string;
  raison: string;
  statut: 'en_attente' | 'approuve' | 'rejete';
  createdAt: string;
  commentaire_admin?: string;
}

/** GET /api/entreprise/rapprochements */
export async function getRapprochements(): Promise<RapprochementEntrepriseItem[]> {
  const res = await apiClient.get<ApiResponse<RapprochementEntrepriseItem[]>>('/entreprise/rapprochements');
  return res.data.data!;
}

/** POST /api/entreprise/rapprochement */
export async function createRapprochement(formData: FormData): Promise<RapprochementEntrepriseItem> {
  const res = await apiClient.post<ApiResponse<RapprochementEntrepriseItem>>(
    '/entreprise/rapprochement',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data.data!;
}
