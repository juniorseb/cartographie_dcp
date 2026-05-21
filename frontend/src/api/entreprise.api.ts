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

/** GET /api/entreprise/mon-dossier
 * Retourne null si l'entreprise n'a pas encore cree de dossier (404).
 */
export async function getMonDossier(): Promise<DossierComplet | null> {
  try {
    const res = await apiClient.get<ApiResponse<DossierComplet>>('/entreprise/mon-dossier');
    return res.data.data ?? null;
  } catch (e: unknown) {
    const err = e as { response?: { status?: number } };
    if (err?.response?.status === 404) return null;
    throw e;
  }
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
// Formulaire DCP officiel (questionnaire de recensement)
// ============================================================

export interface FormulaireDCPResponse {
  entite_id: string | null;
  reponses: Record<string, unknown>;
  /** Version pour verrouillage optimiste (manœuvre B). 0 si pas encore cree. */
  version?: number;
  formalite_calculee?: string;
  formalite_motifs?: string[];
}

/** GET /api/entreprise/formulaire-dcp */
export async function getFormulaireDCP(): Promise<FormulaireDCPResponse> {
  const res = await apiClient.get<ApiResponse<FormulaireDCPResponse>>('/entreprise/formulaire-dcp');
  return res.data.data!;
}

/** PUT /api/entreprise/formulaire-dcp
 * @param expectedVersion version connue par le client (verrouillage optimiste).
 *   Le backend renvoie 409 si la version a change entre temps.
 */
export async function saveFormulaireDCP(
  reponses: Record<string, unknown>,
  expectedVersion?: number,
): Promise<FormulaireDCPResponse> {
  const res = await apiClient.put<ApiResponse<FormulaireDCPResponse>>(
    '/entreprise/formulaire-dcp',
    { reponses, version: expectedVersion },
  );
  return res.data.data!;
}

/** POST /api/entreprise/formulaire-dcp/soumettre */
export async function soumettreFormulaireDCP(): Promise<{ statut: string }> {
  const res = await apiClient.post<ApiResponse<{ statut: string }>>('/entreprise/formulaire-dcp/soumettre');
  return res.data.data!;
}

// ============================================================
// Mon dossier : sous-onglets
// ============================================================

export interface DocumentJointItem {
  id: string;
  type_document: string;
  nom_fichier: string;
  taille?: number;
  mime_type?: string;
  uploadedAt: string | null;
}

export interface JournalEvenementItem {
  id: string;
  ancien_statut?: string;
  nouveau_statut?: string;
  commentaire?: string;
  modifie_par_nom?: string;
  date: string | null;
}

export type DPODocType =
  | 'dpo_cv'
  | 'dpo_casier_judiciaire'
  | 'dpo_cni'
  | 'dpo_extrait_naissance';

/** GET /api/entreprise/mes-rapports */
export async function getMesRapports(): Promise<DocumentJointItem[]> {
  const res = await apiClient.get<ApiResponse<DocumentJointItem[]>>('/entreprise/mes-rapports');
  return res.data.data!;
}

/** Document agrege (inscription + enregistrement) */
export interface MesDocumentItem extends DocumentJointItem {
  /** Origine du fichier : inscription (RCCM, DFE…) ou enregistrement (dossier). */
  source: 'inscription' | 'enregistrement';
}

/** GET /api/entreprise/mes-documents — tous les fichiers deposes */
export async function getMesDocuments(): Promise<MesDocumentItem[]> {
  const res = await apiClient.get<ApiResponse<MesDocumentItem[]>>('/entreprise/mes-documents');
  return res.data.data!;
}

/** GET /api/entreprise/journal-evenements */
export async function getJournalEvenements(): Promise<JournalEvenementItem[]> {
  const res = await apiClient.get<ApiResponse<JournalEvenementItem[]>>('/entreprise/journal-evenements');
  return res.data.data!;
}

/** GET /api/entreprise/dossier-dpo */
export async function getDossierDPO(): Promise<DocumentJointItem[]> {
  const res = await apiClient.get<ApiResponse<DocumentJointItem[]>>('/entreprise/dossier-dpo');
  return res.data.data!;
}

/** POST /api/entreprise/dossier-dpo */
export async function uploadDocumentDPO(
  file: File,
  typeDocument: DPODocType
): Promise<DocumentJointItem> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type_document', typeDocument);
  const res = await apiClient.post<ApiResponse<DocumentJointItem>>(
    '/entreprise/dossier-dpo',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data.data!;
}

// ============================================================
// Signalement d'erreur entreprise -> Super Admin
// ============================================================

export interface SignalementErreurItem {
  id: string;
  sujet: string;
  description: string;
  rubrique_concernee?: string | null;
  statut: 'open' | 'in_progress' | 'resolved' | 'dismissed';
  reponse_admin?: string | null;
  createdAt: string | null;
  date_traitement?: string | null;
}

export interface SignalementErreurInput {
  sujet: string;
  description: string;
  rubrique_concernee?: string;
}

/** GET /api/entreprise/signalements */
export async function listMesSignalements(): Promise<SignalementErreurItem[]> {
  const res = await apiClient.get<ApiResponse<{ items: SignalementErreurItem[] }>>(
    '/entreprise/signalements'
  );
  return res.data.data?.items ?? [];
}

/** POST /api/entreprise/signalements */
export async function creerSignalement(
  data: SignalementErreurInput
): Promise<{ id: string; statut: string }> {
  const res = await apiClient.post<ApiResponse<{ id: string; statut: string }>>(
    '/entreprise/signalements',
    data
  );
  return res.data.data!;
}

// ============================================================
// Commentaires ancres ARTCI (Modele PR) - vue entreprise
// ============================================================

export interface CommentaireEntrepriseItem {
  id: string;
  sous_question: string | null;
  contenu: string;
  etat: 'open' | 'resolved';
  reponse_entreprise: string | null;
  repondu_le: string | null;
  cree_le: string | null;
  agent_nom: string | null;
}

export interface MesCommentairesResponse {
  /** Commentaires groupes par rubrique (cle = identification, registre, ...) */
  rubriques: Record<string, CommentaireEntrepriseItem[]>;
  total_open: number;
}

/** GET /api/entreprise/commentaires */
export async function listMesCommentaires(
  etat?: 'open' | 'resolved'
): Promise<MesCommentairesResponse> {
  const res = await apiClient.get<ApiResponse<MesCommentairesResponse>>(
    '/entreprise/commentaires',
    { params: etat ? { etat } : undefined }
  );
  return res.data.data ?? { rubriques: {}, total_open: 0 };
}

/** POST /api/entreprise/commentaires/:id/repondre */
export async function repondreCommentaire(
  commentaireId: string, reponse: string
): Promise<void> {
  await apiClient.post(`/entreprise/commentaires/${commentaireId}/repondre`, { reponse });
}


