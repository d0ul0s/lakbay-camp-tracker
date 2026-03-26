import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '../store';

export const ProtectedRoute = () => {
  const currentUser = useAppStore(state => state.currentUser);
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  return <Outlet />;
};

export const AdminRoute = () => {
  const currentUser = useAppStore(state => state.currentUser);
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  if (currentUser.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  
  return <Outlet />;
};
