import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import LeafLoader from './LeafLoader';

const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="card">
        <LeafLoader variant="panel" label={t('auth.restoringSession')} />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  return children;
};

export default ProtectedRoute;
