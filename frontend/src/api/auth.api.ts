import apiClient from './client';
import type { ApiResponse } from '@/types/api';
import type {
  LoginResponse, RegisterInput, LoginInput, VerifyOTPInput, CompteEntreprise
} from '@/types/auth';

export async function register(data: RegisterInput): Promise<CompteEntreprise> {
  const response = await apiClient.post<ApiResponse<CompteEntreprise>>(
    '/auth/register',
    data
  );
  return response.data.data!;
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
