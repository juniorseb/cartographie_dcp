/**
 * Types d'authentification (miroir schemas/auth.py + schemas/user.py).
 */
import type { Role } from './enums';

export interface CompteEntreprise {
  id: string;
  email: string;
  denomination: string;
  numero_cc: string;
  telephone: string | null;
  adresse: string | null;
  ville: string | null;
  region: string | null;
  email_verified: boolean;
  is_active: boolean;
  password_expires_at: string | null;
  createdAt: string;
}

export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  telephone: string | null;
  is_active: boolean;
  last_login: string | null;
  createdAt: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  password_expired?: boolean;
  compte?: CompteEntreprise;
  user?: User;
}

export interface RegisterInput {
  email: string;
  password: string;
  password_confirm: string;
  denomination: string;
  numero_cc: string;
  telephone?: string;
  adresse?: string;
  ville?: string;
  region?: string;
}

export interface LoginInput {
  email: string;
  password: string;
  login_type?: 'entreprise' | 'artci';
}

export interface VerifyOTPInput {
  email: string;
  code: string;
  type: string;
}
