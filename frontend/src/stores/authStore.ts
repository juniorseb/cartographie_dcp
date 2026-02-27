import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CompteEntreprise, User } from '@/types/auth';
import * as authApi from '@/api/auth.api';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  compte: CompteEntreprise | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string, loginType: 'entreprise' | 'artci') => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      compte: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password, loginType) => {
        set({ isLoading: true });
        try {
          const result = await authApi.login({ email, password, login_type: loginType });
          set({
            accessToken: result.access_token,
            refreshToken: result.refresh_token,
            compte: result.compte ?? null,
            user: result.user ?? null,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          set({ isLoading: false });
          throw new Error('Échec de la connexion');
        }
      },

      logout: async () => {
        try {
          if (get().accessToken) {
            await authApi.logout();
          }
        } catch {
          // Ignorer les erreurs de logout
        } finally {
          get().clearAuth();
        }
      },

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken, isAuthenticated: true });
      },

      clearAuth: () => {
        set({
          accessToken: null,
          refreshToken: null,
          compte: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        compte: state.compte,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
