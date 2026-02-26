import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import Navbar from '@/components/Navbar';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import UserDashboard from '@/pages/UserDashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import MapView from '@/pages/MapView';
import ReportPage from '@/pages/ReportPage';
import NotFound from '@/pages/NotFound';
import { ReactNode } from 'react';

const ProtectedRoute = ({
  children,
  requiredRole,
}: {
  children: ReactNode;
  requiredRole?: string;
}) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && user?.role !== requiredRole)
    return <Navigate to="/" replace />;

  return <>{children}</>;
};

const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      {/* Public routes (NO NAVBAR) */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* User routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <>
              <Navbar />
              <UserDashboard />
            </>
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <>
              <Navbar />
              <AdminDashboard />
            </>
          </ProtectedRoute>
        }
      />

      <Route
        path="/map"
        element={
          <ProtectedRoute>
            <>
              <Navbar />
              <MapView />
            </>
          </ProtectedRoute>
        }
      />

      <Route
        path="/report"
        element={
          <ProtectedRoute>
            <>
              <Navbar />
              <ReportPage />
            </>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default AppRouter;