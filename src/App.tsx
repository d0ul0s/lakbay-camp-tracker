import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Registrants from './pages/Registrants';
import Expenses from './pages/Expenses';
import Solicitations from './pages/Solicitations';
import Settings from './pages/Settings';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import Organization from './pages/Organization';
import PublicOrganization from './pages/PublicOrganization';
import TribeSorter from './pages/TribeSorter';
import AxiosInterceptor from './components/AxiosInterceptor';
import ColdStartLoader from './components/ColdStartLoader';
import ErrorBoundary from './components/ErrorBoundary';
import PublicAnnouncements from './pages/PublicAnnouncements';
import PublicPulse from './pages/PublicPulse';
import ManageAnnouncements from './pages/ManageAnnouncements';
import MerchClaims from './pages/MerchClaims';
import ActivityLogs from './pages/ActivityLogs';
import Reports from './pages/Reports';
import DocumentRegistry from './pages/DocumentRegistry';
import Users from './pages/Users';

import PointsManagement from './pages/PointsManagement';

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
    errorElement: <ErrorBoundary />
  },
  {
    path: "/public-org",
    element: <PublicOrganization />,
    errorElement: <ErrorBoundary />
  },
  {
    path: "/announcements",
    element: <PublicAnnouncements />,
    errorElement: <ErrorBoundary />
  },
  {
    path: "/public-pulse",
    element: <PublicPulse />,
    errorElement: <ErrorBoundary />
  },
  {
    element: <ProtectedRoute />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: "/", element: <Dashboard /> },
          { path: "/registrants", element: <Registrants /> },
          { path: "/points", element: <PointsManagement /> },
          { path: "/expenses", element: <Expenses /> },
          { path: "/solicitations", element: <Solicitations /> },
          { path: "/settings", element: <Settings /> },
          { path: "/org", element: <Organization /> },
          { path: "/merch", element: <MerchClaims /> },
          { path: "/activity-logs", element: <ActivityLogs /> },
          { path: "/reports", element: <Reports /> },
          { path: "/docs", element: <DocumentRegistry /> },
          { path: "/users", element: <Users /> },
          { path: "/tribe-sorter", element: <TribeSorter /> },
          { path: "/announcements/manage", element: <ManageAnnouncements /> },
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
