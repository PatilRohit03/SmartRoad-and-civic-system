import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const Index = () => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />;
};

export default Index;