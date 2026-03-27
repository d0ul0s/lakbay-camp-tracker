import { create } from 'zustand';
import type { UserRole, PermissionMatrix } from '../types';
import api from '../api/axios';

// Mirror of DEFAULT_MATRIX from Settings model — ensures any missing DB key always has a valid fallback
const DEFAULT_MATRIX: Record<string, any> = {
  treasurer: {
    dashboard: { view: true },
    registrants: { view: true, viewAll: true, add: true, editOwn: true, editAny: false, deleteOwn: true, deleteAny: false },
    merch: { view: true, toggleOwn: false, toggleAll: true },
    expenses: { view: true, viewAll: true, add: true, editOwn: true, editAny: false, deleteOwn: true, deleteAny: false },
    solicitations: { view: true, add: true, edit: true, delete: true, verify: true },
    reports: { view: true, exportCsv: true },
    activitylogs: { view: true }
  },
  coordinator: {
    dashboard: { view: true },
    registrants: { view: true, viewAll: true, add: true, editOwn: true, editAny: false, deleteOwn: true, deleteAny: false },
    merch: { view: true, toggleOwn: false, toggleAll: false },
    expenses: { view: true, viewAll: true, add: true, editOwn: true, editAny: false, deleteOwn: true, deleteAny: false },
    solicitations: { view: false, add: false, edit: false, delete: false, verify: false },
    reports: { view: true, exportCsv: true },
    activitylogs: { view: false }
  }
};

function mergeMatrix(defaults: Record<string, any>, saved: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = { ...defaults };
  // Create a lowercase map of saved keys for case-insensitive lookup
  const savedLower: Record<string, any> = {};
  if (saved) {
    Object.keys(saved).forEach(k => {
      savedLower[k.toLowerCase().trim()] = saved[k];
    });
  }

  for (const role of Object.keys(defaults)) {
    const savedRoleData = savedLower[role] || {};
    result[role] = { ...defaults[role] };
    for (const page of Object.keys(defaults[role])) {
      result[role][page] = { ...defaults[role][page], ...(savedRoleData[page] || {}) };
    }
  }
  return result;
}

interface AppState {
  // Auth State
  currentUser: { _id?: string; role: UserRole; church: string | null; token?: string; permissionMatrix?: PermissionMatrix } | null;
  login: (user: { _id?: string; role: UserRole; church: string | null; token?: string; permissionMatrix?: PermissionMatrix }) => void;
  logout: () => void;
  refreshPermissions: () => Promise<void>;

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

    refreshPermissions: async () => {
      try {
        const res = await api.get('/api/settings');
        if (res.data?.permissionMatrix) {
          // Deep-merge with defaults so missing DB keys are filled in (same logic as login endpoint)
          const merged = mergeMatrix(DEFAULT_MATRIX, res.data.permissionMatrix);
          set((state) => {
            if (!state.currentUser) return state;
            const updatedUser = { ...state.currentUser, permissionMatrix: merged };
            sessionStorage.setItem('lakbay_auth', JSON.stringify(updatedUser));
            return { currentUser: updatedUser };
          });
        }
      } catch (err) {
        console.error("Failed to refresh permissions", err);
      }
    }
  };
});
