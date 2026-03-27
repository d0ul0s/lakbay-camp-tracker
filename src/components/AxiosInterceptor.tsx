import { useEffect } from 'react';
import api from '../api/axios';
import { useAppStore } from '../store';

export default function AxiosInterceptor({ children }: { children: React.ReactNode }) {
  const { setGlobalError, setLoading, logout, setServerAwake } = useAppStore();

  useEffect(() => {
    const resInterceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        setLoading(false);
        const status = error.response?.status;
        const message = error.response?.data?.message || '';
        const isTimeout = error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout');

        // Handle cold start related errors (including health check timeouts) silently
        if (status === 502 || status === 503 || error.code === 'ERR_NETWORK' || isTimeout) {
          setServerAwake(false);
          if (error.config?.url?.includes('/api/health')) {
            return Promise.reject(error); // Silently reject health checks without global error
          }
          return Promise.reject(error); // The ColdStartLoader will handle the UI
        }

        if (status === 401 && message.toLowerCase().includes('token')) {
          logout();
          setGlobalError('Session expired. Please log in again.');
        } else if (status === 403) {
          // Silently ignore role-based access restrictions
        } else if (status !== 401 || !error.config?.url?.includes('/login')) {
          const msg = message || error.message || 'An unexpected networking error occurred.';
          setGlobalError(msg);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(resInterceptor);
    };
  }, [setGlobalError, setLoading, logout]);

  return <>{children}</>;
}
