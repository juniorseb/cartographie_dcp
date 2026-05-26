import apiClient from './client';
import type { ApiResponse } from '@/types/api';
import type {
  LoginResponse, RegisterInput, LoginInput, VerifyOTPInput, CompteEntreprise
} from '@/types/auth';

/** Metadata d'un document deja uploade sur R2 (cf. uploads.api.ts). */
export interface UploadedDocument {
  type: string;            // 'doc_rccm', 'doc_dfe', 'doc_autre'
  r2_key: string;
  nom_fichier: string;
  taille: number;
  mime_type: string;
}

/**
 * POST /auth/register
 * JSON pur : les documents (RCCM, DFE) sont uploades par le frontend
 * DIRECTEMENT vers R2 via uploads.api.ts puis on envoie ici juste les cles.
 * Le backend ne traite plus de multipart -> plus de cold-start timeout.
 */
export async function register(
  data: RegisterInput,
  documents?: UploadedDocument[],
): Promise<CompteEntreprise> {
  const payload = documents && documents.length > 0
    ? { ...data, documents }
    : data;
  const response = await apiClient.post<ApiResponse<CompteEntreprise>>(
    '/auth/register',
    payload,
  );
  return response.data.data!;
}

/** GET /auth/verify-rl-email/:token — verification du lien magique RL */
export async function verifyRLEmail(token: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await apiClient.get<ApiResponse<unknown>>(`/auth/verify-rl-email/${token}`);
    return { ok: true, message: res.data.message ?? 'Email vérifié.' };
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    return { ok: false, message: err?.response?.data?.message ?? 'Lien invalide ou expiré.' };
  }
}

export async function verifyOTP(data: VerifyOTPInput): Promise<void> {
  await apiClient.post('/auth/verify-otp', data);
}

export async function login(data: LoginInput): Promise<LoginResponse> {
  const response = await apiClient.post<ApiResponse<LoginResponse>>(
    '/auth/login',
    data
  );
  return response.data.data!;
}

export async function refreshToken(): Promise<{ access_token: string }> {
  const response = await apiClient.post<ApiResponse<{ access_token: string }>>(
    '/auth/refresh'
  );
  return response.data.data!;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', { email });
}

export async function resetPassword(
  email: string,
  code: string,
  new_password: string
): Promise<void> {
  await apiClient.post('/auth/reset-password', { email, code, new_password });
}

export async function changePassword(
  current_password: string,
  new_password: string
): Promise<void> {
  await apiClient.put('/auth/change-password', { current_password, new_password });
}
