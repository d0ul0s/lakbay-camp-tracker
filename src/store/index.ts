import { create } from 'zustand';
import axios from 'axios';
import type { UserRole } from '../types';

interface AppState {
  // Auth State
  currentUser: { role: UserRole; church: string | null; token?: string } | null;
  login: (user: { role: UserRole; church: string | null; token?: string }) => void;
  logout: () => void;

  // App Loading State
  isLoading: boolean;
  setLoading: (loading: boolean) => void;

  // Global Error State
  globalError: string | null;
  setGlobalError: (error: string | null) => void;
}

export const useAppStore = create<AppState>()((set) => {
  const savedSession = sessionStorage.getItem('lakbay_auth');
  const initialUser = savedSession ? JSON.parse(savedSession) : null;

  if (initialUser?.token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${initialUser.token}`;
  }

  axios.defaults.baseURL = import.meta.env.VITE_API_URL;

  axios.interceptors.request.use((config) => {
    const token = useAppStore.getState().currentUser?.token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  return {
    currentUser: initialUser,
    isLoading: false,
    globalError: null,

    setLoading: (loading: boolean) => set({ isLoading: loading }),
    setGlobalError: (error: string | null) => set({ globalError: error }),

    login: (user) => {
      sessionStorage.setItem('lakbay_auth', JSON.stringify(user));

      if (user.token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${user.token}`;
      }

      set({ currentUser: user });
    },

    logout: () => {
      sessionStorage.removeItem('lakbay_auth');
      delete axios.defaults.headers.common['Authorization'];
      set({ currentUser: null });
    },
  };
});
