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
  password_must_change?: boolean;
  compte?: CompteEntreprise;
  user?: User;
}

export interface RegisterInput {
  // Section 1 — Entreprise
  denomination: string;
  numero_cc: string;
  telephone?: string;
  adresse?: string;
  ville?: string;
  region?: string;
  // Section 2 — Représentant légal (email = identifiant)
  dg_nom: string;
  dg_prenom: string;
  dg_fonction?: string;
  dg_telephone?: string;
  dg_email: string;
  // Section 3 — DPO (email = identifiant)
  dpo_nom: string;
  dpo_prenom: string;
  dpo_telephone?: string;
  dpo_email: string;
  dpo_type?: 'interne' | 'externe';
  dpo_organisme?: string;
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
