import { create } from 'zustand';
import type { UserRole } from '../types';

interface AppState {
  // Auth State
  currentUser: { _id?: string; role: UserRole; church: string | null; token?: string } | null;
  login: (user: { _id?: string; role: UserRole; church: string | null; token?: string }) => void;
  logout: () => void;

  // App Loading State
  isLoading: boolean;
  setLoading: (loading: boolean) => void;

  // Global Error State
  globalError: string | null;
  setGlobalError: (error: string | null) => void;

  // Cold Start State
  isServerAwake: boolean;
  setServerAwake: (awake: boolean) => void;
}

export const useAppStore = create<AppState>()((set) => {
  const savedSession = sessionStorage.getItem('lakbay_auth');
  const initialUser = savedSession ? JSON.parse(savedSession) : null;

  return {
    currentUser: initialUser,
    isLoading: false,
    globalError: null,
    isServerAwake: false,

    setLoading: (loading: boolean) => set({ isLoading: loading }),
    setGlobalError: (error: string | null) => set({ globalError: error }),
    setServerAwake: (awake: boolean) => set({ isServerAwake: awake }),

    login: (user) => {
      sessionStorage.setItem('lakbay_auth', JSON.stringify(user));
      set({ currentUser: user });
    },

    logout: () => {
      sessionStorage.removeItem('lakbay_auth');
      set({ currentUser: null });
    },
  };
});
