import { useEffect } from 'react';
import axios from 'axios';
import { useAppStore } from '../store';

export default function AxiosInterceptor({ children }: { children: React.ReactNode }) {
  const { currentUser, setGlobalError, setLoading, logout } = useAppStore();

  useEffect(() => {
    const interceptor = axios.interceptors.request.use((config) => {
      if (currentUser?.token) {
        config.headers['x-auth-token'] = currentUser.token;
      }
      return config;
    });

    const resInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        setLoading(false);
        if (error.response?.status === 401 && error.response?.data?.message?.includes('Token')) {
          logout();
          setGlobalError('Session expired. Please log in again.');
        } else if (error.response?.status === 403) {
          // Silently ignore role-based access restrictions (e.g. coordinator hitting solicitations)
        } else if (error.response?.status !== 401 || !error.config.url.includes('/login')) {
          const msg = error.response?.data?.message || error.message || 'An unexpected networking error occurred.';
          setGlobalError(msg);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(interceptor);
      axios.interceptors.response.eject(resInterceptor);
    };
  }, [currentUser, setGlobalError, setLoading, logout]);

  return <>{children}</>;
}
