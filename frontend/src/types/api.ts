/**
 * Types pour les réponses API standardisées (miroir de utils/responses.py).
 */

export interface ApiResponse<T = unknown> {
  message: string;
  data?: T;
}

export interface ApiError {
  error: string;
  details?: Record<string, string[]>;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}
