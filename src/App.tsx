import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Registrants from './pages/Registrants';
import MerchClaims from './pages/MerchClaims';
import Expenses from './pages/Expenses';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Solicitations from './pages/Solicitations';
import ActivityLogs from './pages/ActivityLogs';
import AxiosInterceptor from './components/AxiosInterceptor';
import ColdStartLoader from './components/ColdStartLoader';

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: "/", element: <Dashboard /> },
          { path: "/registrants", element: <Registrants /> },
          { path: "/merch", element: <MerchClaims /> },
          { path: "/expenses", element: <Expenses /> },
          { path: "/solicitations", element: <Solicitations /> },
          { path: "/activity-logs", element: <ActivityLogs /> },
          { path: "/reports", element: <Reports /> },
          {
            element: <AdminRoute />,
            children: [
              { path: "/settings", element: <Settings /> },
              { path: "/users", element: <Users /> },
            ]
          },
        ]
      }
    ]
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  }
]);

export default function App() {
  return (
    <AxiosInterceptor>
      <ColdStartLoader />
      <RouterProvider router={router} />
    </AxiosInterceptor>
  );
}
