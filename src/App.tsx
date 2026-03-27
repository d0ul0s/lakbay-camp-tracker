import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

export default function App() {
  return (
    <AxiosInterceptor>
      <ColdStartLoader />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/registrants" element={<Registrants />} />
              <Route path="/merch" element={<MerchClaims />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/solicitations" element={<Solicitations />} />
              <Route path="/activity-logs" element={<ActivityLogs />} />
              <Route path="/reports" element={<Reports />} />
              
              <Route element={<AdminRoute />}>
                <Route path="/settings" element={<Settings />} />
                <Route path="/users" element={<Users />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AxiosInterceptor>
  );
}
