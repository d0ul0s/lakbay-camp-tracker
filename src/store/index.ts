import { create } from 'zustand';
import type { UserRole, PermissionMatrix, AppSettings, Registrant, Expense, Solicitation } from '../types';
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

function updateCache(state: any, updates: any) {
  try {
    const merged = { ...state, ...updates };
    localStorage.setItem('lakbay_cache', JSON.stringify({
      registrants: merged.registrants,
      expenses: merged.expenses,
      solicitations: merged.solicitations,
      appSettings: merged.appSettings
    }));
  } catch(e) {}
}

interface AppState {
  // Auth State
  currentUser: { _id?: string; role: UserRole; church: string | null; permissionMatrix?: PermissionMatrix } | null;
  login: (user: { _id?: string; role: UserRole; church: string | null; permissionMatrix?: PermissionMatrix }) => void;
  logout: () => void;
  refreshPermissions: () => Promise<void>;

  // App Settings (Global cache)
  appSettings: AppSettings | null;
  fetchGlobalSettings: (force?: boolean) => Promise<void>;

  // Data Collections (Global cache)
  registrants: Registrant[];
  expenses: Expense[];
  solicitations: Solicitation[];
  users: any[];
  fetchRegistrants: (silent?: boolean) => Promise<void>;
  updateRegistrant: (id: string, updates: Partial<Registrant>) => void;
  syncRegistrant: (action: string, data: any) => void;
  syncExpense: (action: string, data: any) => void;
  fetchExpenses: (silent?: boolean) => Promise<void>;
  syncSolicitation: (action: string, data: any) => void;
  fetchSolicitations: (silent?: boolean) => Promise<void>;
  syncUser: (action: string, data: any) => void;
  fetchUsers: (silent?: boolean) => Promise<void>;
  syncSettings: (data: any) => void;

  // In-flight mutation lock — prevents WebSocket echoes from overriding optimistic UI
  pendingMutations: Set<string>;
  lockEntity: (type: string, id: string) => void;
  unlockEntity: (type: string, id: string) => void;

  fetchBootData: (retryCount?: number) => Promise<void>;

  // App Loading State
  isLoading: boolean;
  setLoading: (loading: boolean) => void;

  // Global Error State
  globalError: string | null;
  setGlobalError: (error: string | null) => void;

  // Cold Start State
  isServerAwake: boolean;
  setServerAwake: (awake: boolean) => void;

  hasBooted: boolean;
  hasSyncedLive: boolean;
}

export const useAppStore = create<AppState>()((set) => {
  const savedSession = sessionStorage.getItem('lakbay_auth');
  const initialUser = savedSession ? JSON.parse(savedSession) : null;
  
  let initialCache = null;
  try {
    const savedCache = localStorage.getItem('lakbay_cache');
    if (savedCache) {
      initialCache = JSON.parse(savedCache);
    }
  } catch (err) {
    console.warn("Invalid local cache bypassed");
    localStorage.removeItem('lakbay_cache');
  }

  return {
    currentUser: initialUser,
    appSettings: initialCache?.appSettings || null,
    registrants: initialCache?.registrants || [],
    expenses: initialCache?.expenses || [],
    solicitations: initialCache?.solicitations || [],
    users: [],
    isLoading: false,
    globalError: null,
    isServerAwake: false,
    hasBooted: !!initialCache,
    hasSyncedLive: false,
    pendingMutations: new Set<string>(),

    setLoading: (loading: boolean) => set({ isLoading: loading }),
    setGlobalError: (error: string | null) => set({ globalError: error }),
    setServerAwake: (awake: boolean) => set({ isServerAwake: awake }),

    lockEntity: (type, id) => set(state => {
      const next = new Set(state.pendingMutations);
      next.add(`${type}:${id}`);
      return { pendingMutations: next };
    }),
    unlockEntity: (type, id) => set(state => {
      const next = new Set(state.pendingMutations);
      next.delete(`${type}:${id}`);
      return { pendingMutations: next };
    }),

    login: (user) => {
      // Store token separately so the axios interceptor can send it as a Bearer header.
      // This is the cross-origin mobile fix — cookies are blocked by Safari on Vercel→Render.
      if ((user as any).token) {
        sessionStorage.setItem('lakbay_token', (user as any).token);
      }
      const { token: _t, ...userWithoutToken } = user as any;
      sessionStorage.setItem('lakbay_auth', JSON.stringify(userWithoutToken));
      set({ currentUser: userWithoutToken });
      // Fetch settings immediately after login
      api.get('/api/settings').then(res => {
        if (res.data) set({ appSettings: {
          ...res.data,
          churches: res.data.churchList || res.data.churches || [],
          ministries: res.data.ministries || [],
          expenseCategories: res.data.expenseCategories || [],
          paymentMethods: res.data.paymentMethods || [],
          shirtSizePhoto: res.data.shirtSizePhoto || null
        }});
      }).catch(err => console.error("Initial settings fetch failed", err));
    },

    logout: async () => {
      try {
        await api.post('/api/auth/logout');
      } catch (err) {
        console.error("Logout failed", err);
      }
      sessionStorage.removeItem('lakbay_auth');
      sessionStorage.removeItem('lakbay_token');
      localStorage.removeItem('lakbay_cache');
      set({ 
        currentUser: null,
        appSettings: null,
        registrants: [],
        expenses: [],
        solicitations: [],
        hasBooted: false,
        hasSyncedLive: false
      });
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
            return { currentUser: updatedUser, appSettings: {
              ...res.data,
              churches: res.data.churchList || res.data.churches || [],
              ministries: res.data.ministries || [],
              expenseCategories: res.data.expenseCategories || [],
              paymentMethods: res.data.paymentMethods || [],
              shirtSizePhoto: res.data.shirtSizePhoto || null
            } };
          });
        }
      } catch (err) {
        console.error("Failed to refresh permissions", err);
      }
    },

    fetchGlobalSettings: async (force = false) => {
      const { appSettings } = useAppStore.getState();
      if (appSettings && !force) return;

      try {
        const res = await api.get('/api/settings');
        if (res.data) {
          set({ appSettings: {
            ...res.data,
            churches: res.data.churchList || res.data.churches || [],
            ministries: res.data.ministries || [],
            expenseCategories: res.data.expenseCategories || [],
            paymentMethods: res.data.paymentMethods || [],
            shirtSizePhoto: res.data.shirtSizePhoto || null
          }});
        }
      } catch (err) {
        console.error("Global settings fetch failed", err);
      }
    },

    fetchRegistrants: async (silent = false) => {
      if (!silent) set({ isLoading: true });
      try {
        const res = await api.get('/api/registrants', { params: { limit: 1000 } });
        const data = Array.isArray(res.data) ? res.data : (res.data.registrants || []);
        set({ registrants: data, isLoading: false });
      } catch (err) {
        console.error("Fetch registrants failed", err);
        if (!silent) set({ isLoading: false });
      }
    },

    updateRegistrant: (id: string, updates: Partial<Registrant>) => {
      set(state => ({
        registrants: state.registrants.map(r => 
          (r.id === id || (r as any)._id === id) ? { ...r, ...updates } : r
        )
      }));
    },

    syncRegistrant: (action: string, data: any) => {
      if (!data) return;
      set(state => {
        if (!Array.isArray(state.registrants)) return { registrants: [data] };
        let next = [...state.registrants];
        if (action === 'added') {
          const dId = data.id || data._id;
          if (!next.some(r => (r.id || (r as any)._id) === dId)) {
            next = [data, ...next];
          }
        } else if (action === 'imported') {
          const newItems = Array.isArray(data) ? data : [data];
          newItems.forEach(item => {
            const iId = item.id || item._id;
            if (!next.some(r => (r.id || (r as any)._id) === iId)) {
              next = [item, ...next];
            }
          });
        } else if (action === 'updated') {
          const dId = data.id || data._id;
          next = next.map(r => 
            ((r.id || (r as any)._id) === dId) ? { ...r, ...data } : r
          );
        } else if (action === 'deleted') {
          const idToDelete = data.id || data._id;
          next = next.filter(r => (r.id || (r as any)._id) !== idToDelete);
        }
        updateCache(state, { registrants: next });
        return { registrants: next };
      });
    },
    syncExpense: (action: string, data: any) => {
      if (!data) return;
      set(state => {
        if (!Array.isArray(state.expenses)) return { expenses: [data] };
        let next = [...state.expenses];
        if (action === 'added') {
          const dId = data.id || data._id;
          if (!next.some(e => (e.id || (e as any)._id) === dId)) {
            next = [data, ...next];
          }
        } else if (action === 'imported') {
          const newItems = Array.isArray(data) ? data : [data];
          newItems.forEach(item => {
            const iId = item.id || item._id;
            if (!next.some(e => (e.id || (e as any)._id) === iId)) {
              next = [item, ...next];
            }
          });
        } else if (action === 'updated') {
          const dId = data.id || data._id;
          next = next.map(e => 
            ((e.id || (e as any)._id) === dId) ? { ...e, ...data } : e
          );
        } else if (action === 'deleted') {
          const idToDelete = data.id || data._id;
          next = next.filter(e => (e.id || (e as any)._id) !== idToDelete);
        }
        updateCache(state, { expenses: next });
        return { expenses: next };
      });
    },

    fetchExpenses: async (silent = false) => {
      if (!silent) set({ isLoading: true });
      try {
        const res = await api.get('/api/expenses', { params: { limit: 1000 } });
        const data = Array.isArray(res.data) ? res.data : (res.data.expenses || []);
        set({ expenses: data, isLoading: false });
      } catch (err) {
        console.error("Fetch expenses failed", err);
        if (!silent) set({ isLoading: false });
      }
    },
    syncSolicitation: (action: string, data: any) => {
      if (!data) return;
      set(state => {
        if (!Array.isArray(state.solicitations)) return { solicitations: [data] };
        let next = [...state.solicitations];
        if (action === 'added') {
          const dId = data.id || data._id;
          if (!next.some(s => (s.id || (s as any)._id) === dId)) {
            next = [data, ...next];
          }
        } else if (action === 'imported') {
          const newItems = Array.isArray(data) ? data : [data];
          newItems.forEach(item => {
            const iId = item.id || item._id;
            if (!next.some(s => (s.id || (s as any)._id) === iId)) {
              next = [item, ...next];
            }
          });
        } else if (action === 'updated') {
          const dId = data.id || data._id;
          next = next.map(s => 
            ((s.id || (s as any)._id) === dId) ? { ...s, ...data } : s
          );
        } else if (action === 'deleted') {
          const idToDelete = data.id || data._id;
          next = next.filter(s => (s.id || (s as any)._id) !== idToDelete);
        }
        updateCache(state, { solicitations: next });
        return { solicitations: next };
      });
    },

    fetchSolicitations: async (silent = false) => {
      if (!silent) set({ isLoading: true });
      try {
        const res = await api.get('/api/solicitations', { params: { limit: 1000 } });
        const data = Array.isArray(res.data) ? res.data : (res.data.solicitations || []);
        set({ solicitations: data, isLoading: false });
      } catch (err) {
        console.error("Fetch solicitations failed", err);
        if (!silent) set({ isLoading: false });
      }
    },
    syncUser: (action: string, data: any) => {
      if (!data) return;
      set(state => {
        let next = [...state.users];
        if (action === 'added') {
          const dId = data.id || data._id;
          if (!next.some(u => (u.id || (u as any)._id) === dId)) {
            next = [...next, data];
          }
        } else if (action === 'updated') {
          const dId = data.id || data._id;
          next = next.map(u => 
            ((u.id || (u as any)._id) === dId) ? { ...u, ...data } : u
          );
        } else if (action === 'deleted') {
          const idToDelete = data.id || data._id;
          next = next.filter(u => (u.id || (u as any)._id) !== idToDelete);
        }
        return { users: next };
      });
    },

    syncSettings: (data: any) => {
      if (!data) return;
      set(state => {
        const newSettings = {
          ...data,
          churches: data.churchList || data.churches || [],
          churchColors: data.churchColors || {},
          ministries: data.ministries || [],
          expenseCategories: data.expenseCategories || [],
          paymentMethods: data.paymentMethods || [],
          shirtSizePhoto: data.shirtSizePhoto || null
        };
        
        let currentUser = state.currentUser;
        if (currentUser && data.permissionMatrix) {
            const merged = mergeMatrix(DEFAULT_MATRIX, data.permissionMatrix);
            currentUser = { ...currentUser, permissionMatrix: merged };
            sessionStorage.setItem('lakbay_auth', JSON.stringify(currentUser));
        }
        updateCache(state, { appSettings: newSettings });
        return { appSettings: newSettings, currentUser };
      });
    },

    fetchUsers: async (silent = false) => {
      if (!silent) set({ isLoading: true });
      try {
        const res = await api.get('/api/auth/users');
        set({ users: res.data, isLoading: false });
      } catch (err) {
        console.error("Fetch users failed", err);
        if (!silent) set({ isLoading: false });
      }
    },
    fetchBootData: async (retryCount = 0) => {
      const { hasBooted } = useAppStore.getState();
      if (!hasBooted) set({ isLoading: true, globalError: null });

      try {
        const res = await api.get('/api/boot');
        const { registrants, expenses, solicitations, settings } = res.data;
        const newSettings = {
          ...settings,
          churches: settings.churchList || settings.churches || [],
          churchColors: settings.churchColors || {},
          ministries: settings.ministries || [],
          expenseCategories: settings.expenseCategories || [],
          paymentMethods: settings.paymentMethods || [],
          shirtSizePhoto: settings.shirtSizePhoto || null
        };
        
        const payload = {
          registrants,
          expenses,
          solicitations,
          appSettings: newSettings,
        };
        
        localStorage.setItem('lakbay_cache', JSON.stringify(payload));
        
        set({
          ...payload,
          hasBooted: true,
          hasSyncedLive: true,
          isLoading: false,
          globalError: null
        });
      } catch (err: any) {
        const status = err.response?.status;
        const isColdStart = status === 503 || status === 504 || err.code === 'ECONNABORTED';
        
        if (isColdStart && retryCount < 4) {
          const delay = Math.pow(2, retryCount) * 1000;
          set({ globalError: `Waking up the server (Attempt ${retryCount + 1}/4)...` });
          setTimeout(() => useAppStore.getState().fetchBootData(retryCount + 1), delay);
        } else {
          set({ 
            globalError: err.response?.data?.message || 'Failed to boot application data. Please refresh and try again.', 
            isLoading: false 
          });
        }
      }
    }
  };
});
