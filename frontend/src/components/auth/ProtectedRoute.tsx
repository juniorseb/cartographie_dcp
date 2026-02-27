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
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (requiredType && userType !== requiredType) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
