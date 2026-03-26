import { useEffect } from 'react';
import api from '../api/axios';
import { useAppStore } from '../store';

export default function AxiosInterceptor({ children }: { children: React.ReactNode }) {
  const { setGlobalError, setLoading, logout } = useAppStore();

  useEffect(() => {
    const resInterceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        setLoading(false);
        const status = error.response?.status;
        const message = error.response?.data?.message || '';

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
