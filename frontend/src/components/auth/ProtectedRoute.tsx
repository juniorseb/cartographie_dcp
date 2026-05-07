import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/utils/constants';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredType?: 'entreprise' | 'artci';
}

export default function ProtectedRoute({ children, requiredType = 'entreprise' }: ProtectedRouteProps) {
  const { isAuthenticated, userType } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const loginRoute = requiredType === 'artci' ? ROUTES.ADMIN_LOGIN : ROUTES.LOGIN;
    return <Navigate to={loginRoute} state={{ from: location }} replace />;
  }

  if (requiredType && userType !== requiredType) {
    const fallback = userType === 'artci' ? ROUTES.ADMIN_DASHBOARD : userType === 'entreprise' ? ROUTES.ENTREPRISE_DASHBOARD : '/';
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
