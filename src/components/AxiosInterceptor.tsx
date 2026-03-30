import { useEffect } from 'react';
import api from '../api/axios';
import { useAppStore } from '../store';

export default function AxiosInterceptor({ children }: { children: React.ReactNode }) {
  const { setGlobalError, setLoading, logout, setServerAwake, isServerAwake } = useAppStore();

  useEffect(() => {
    const resInterceptor = api.interceptors.response.use(
      (response) => {
        // If the server was previously marked as asleep, mark it as awake now
        // so all subscribed pages (Organization, Public org, etc.) auto-refetch.
        if (!isServerAwake) {
          setServerAwake(true);
        }
        return response;
      },
      (error) => {
        setLoading(false);
        const status = error.response?.status;
        const message = error.response?.data?.message || '';
        const isTimeout = error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout');

        const isColdStartError = status === 502 || status === 503;
        const isNetworkGlitch = error.code === 'ERR_NETWORK' || isTimeout;

        // ONLY trigger the full-screen 'Waking up' loader for actual server sleep (502/503)
        // or if it's the very first request (nothing awake yet).
        // This prevents minor mobile network hiccups from blocking the whole UI during active use.
        if (isColdStartError || (!isServerAwake && isNetworkGlitch)) {
          setServerAwake(false);
          return Promise.reject(error);
        }

        if (status === 401) {
          logout();
          // Only show error if not already on login page to avoid repetitive alerts
          if (!window.location.pathname.includes('/login')) {
            setGlobalError('Session expired. Please log in again.');
          }
        } else if (status === 403) {
          // Silently ignore role-based access restrictions
        } else if (!error.config?.url?.includes('/api/auth/login')) {
          // Only set global error for non-login endpoints (Login.tsx handles its own errors)
          const msg = message || error.message || 'An unexpected networking error occurred.';
          setGlobalError(msg);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(resInterceptor);
    };
  }, [setGlobalError, setLoading, logout, isServerAwake]);

  return <>{children}</>;
}
