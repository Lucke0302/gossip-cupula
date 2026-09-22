import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from './Layout';
import { FeedSkeleton } from './Skeleton';

/**
 * Enquanto o boot tenta ressuscitar a sessao pelo cookie de refresh, a
 * gente segura a rota. Sem isso, quem recarrega /post/123 logado veria
 * um piscar do /login antes de voltar.
 */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'booting') {
    return (
      <Layout>
        <FeedSkeleton />
      </Layout>
    );
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}
