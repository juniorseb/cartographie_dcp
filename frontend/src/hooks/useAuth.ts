import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const { isAuthenticated, compte, user, login, logout, isLoading } = useAuthStore();

  const userType = compte ? 'entreprise' : user ? 'artci' : null;

  return {
    isAuthenticated,
    compte,
    user,
    userType,
    login,
    logout,
    isLoading,
  };
}
