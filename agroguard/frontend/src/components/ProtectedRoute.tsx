import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import LeafLoader from './LeafLoader';

const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isDemoAccess = import.meta.env.DEV;

  if (loading) {
    return (
      <div className="card">
        <LeafLoader variant="panel" label="Restoring secure session" />
      </div>
    );
  }
  if (!user && !isDemoAccess) return <Navigate to="/auth" state={{ from: location }} replace />;
  return children;
};

export default ProtectedRoute;
