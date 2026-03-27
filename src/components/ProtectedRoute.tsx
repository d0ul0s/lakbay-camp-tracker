import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '../store';

export const ProtectedRoute = () => {
  const { currentUser, logout } = useAppStore();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Guard against corrupted sessionStorage (role missing)
  if (!currentUser.role || typeof currentUser.role !== 'string') {
    logout();
    return <Navigate to="/login" replace />;
  }
  
  return <Outlet />;
};

export const AdminRoute = () => {
  const { currentUser, logout } = useAppStore();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Guard against corrupted sessionStorage
  const role = currentUser.role?.toLowerCase().trim();
  if (!role) {
    logout();
    return <Navigate to="/login" replace />;
  }
  
  if (role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  
  return <Outlet />;
};
