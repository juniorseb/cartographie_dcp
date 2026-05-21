import apiClient from './client';
import type { ApiResponse } from '@/types/api';
import type {
  LoginResponse, RegisterInput, LoginInput, VerifyOTPInput, CompteEntreprise
} from '@/types/auth';

/**
 * POST /auth/register
 * Si `documents` est fourni : envoi en multipart/form-data avec les fichiers
 * (RCCM, DFE et autres). Sinon : envoi JSON simple.
 */
export async function register(
  data: RegisterInput,
  documents?: { rccm?: File; dfe?: File; autres?: File[] }
): Promise<CompteEntreprise> {
  const hasFiles = documents && (documents.rccm || documents.dfe || (documents.autres?.length ?? 0) > 0);

  if (hasFiles) {
    const formData = new FormData();
    formData.append('payload', JSON.stringify(data));
    if (documents?.rccm) formData.append('doc_rccm', documents.rccm);
    if (documents?.dfe) formData.append('doc_dfe', documents.dfe);
    documents?.autres?.forEach((f, i) => formData.append(`doc_autre_${i}`, f));
    const response = await apiClient.post<ApiResponse<CompteEntreprise>>(
      '/auth/register',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data.data!;
  }

  const response = await apiClient.post<ApiResponse<CompteEntreprise>>(
    '/auth/register',
    data
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
