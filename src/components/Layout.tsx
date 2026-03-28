import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../store';
import { LayoutDashboard, Users, ShoppingBag, Receipt, Settings, FileDown, LogOut, Menu, UserCog, HeartHandshake, Loader2, AlertCircle, Activity, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Toaster } from 'react-hot-toast';

export default function Layout() {
  const { currentUser, logout, isLoading, globalError, setGlobalError, refreshPermissions, hasSyncedLive, fetchBootData } = useAppStore();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (!currentUser) return;

    // Initialize Socket connection
    let baseUrl = import.meta.env.VITE_API_URL;
    if (!baseUrl) {
      if (window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168.')) {
        baseUrl = `http://${window.location.hostname}:5000/api`;
      } else {
        baseUrl = 'https://lakbay-camp-tracker.onrender.com/api';
      }
    }
    const socketUrl = baseUrl.replace('/api', '');
    
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity, // Keep and hold! Never give up.
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsSocketConnected(true);
      console.log('Socket link established.');
    });

    socket.on('connect_error', (err: any) => {
      console.error('Socket link fault:', err.message);
    });

    socket.on('disconnect', (reason: string) => {
      setIsSocketConnected(false);
      console.warn('Socket link severed:', reason);
    });

    socket.on('DATA_UPDATED', (data: { type: string, action: string, user: string, userId: string, data?: any }) => {
      const { 
        fetchRegistrants, 
        syncRegistrant,
        fetchExpenses, 
        syncExpense,
        fetchSolicitations, 
        syncSolicitation,
        fetchGlobalSettings, 
        syncSettings,
        fetchUsers,
        syncUser,
        refreshPermissions,
        pendingMutations
      } = useAppStore.getState();

      if (data.type === 'registrants') {
        if (data.data) {
          // If this registrant has an in-flight mutation, discard the stale broadcast.
          // Our optimistic UI already has the correct state; the lock will be released
          // once the API call resolves, at which point future broadcasts will apply normally.
          const registrantId = data.data._id || data.data.id;
          if (data.action === 'updated' && registrantId && pendingMutations.has(String(registrantId))) {
            return;
          }
          syncRegistrant(data.action, data.data);
        } else {
          fetchRegistrants(true);
        }
      }
      if (data.type === 'expenses') {
        if (data.data) {
          syncExpense(data.action, data.data);
        } else {
          fetchExpenses(true);
        }
      }
      if (data.type === 'solicitations') {
        if (data.data) {
          syncSolicitation(data.action, data.data);
        } else {
          fetchSolicitations(true);
        }
      }
      if (data.type === 'settings') {
        if (data.data) {
          syncSettings(data.data);
        } else {
          fetchGlobalSettings(true);
          refreshPermissions();
        }
      }
      if (data.type === 'users') {
        if (data.data) {
          syncUser(data.action, data.data);
        } else {
          fetchUsers(true);
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser?._id]);

  useEffect(() => {
    if (!currentUser) return;

    if (!hasSyncedLive) {
      // Fire universal background sync over the network
      fetchBootData();
    } else {
      refreshPermissions();
    }
  }, [currentUser?._id, hasSyncedLive]);

  const isAdmin = currentUser?.role?.toLowerCase().trim() === 'admin';

  const hasAccess = (pageId: string) => {
    if (isAdmin) return true;
    if (!currentUser?.permissionMatrix) return false;
    const roleKey = currentUser.role?.toLowerCase().trim();
    if (!roleKey) return false;
    const rolePerms = currentUser.permissionMatrix[roleKey];
    if (!rolePerms) return false;
    
    const pageMap: any = {
      'dashboard': 'dashboard',
      'registrants': 'registrants',
      'merch': 'merch',
      'expenses': 'expenses',
      'solicitations': 'solicitations',
      'reports': 'reports',
      'activitylogs': 'activitylogs'
    };

    const matrixKey = pageMap[pageId];
    if (matrixKey && rolePerms[matrixKey as keyof typeof rolePerms]) {
      const pagePerms = rolePerms[matrixKey as keyof typeof rolePerms] as any;
      return pagePerms.view === true;
    }

    return false;
  };

  const navigation = [];
  if (hasAccess('dashboard')) navigation.push({ name: 'Dashboard', href: '/', icon: LayoutDashboard });
  if (hasAccess('registrants')) navigation.push({ name: 'Registrants', href: '/registrants', icon: Users });
  if (hasAccess('merch')) navigation.push({ name: 'Merch Claims', href: '/merch', icon: ShoppingBag });
  if (hasAccess('expenses')) navigation.push({ name: 'Expenses', href: '/expenses', icon: Receipt });
  if (hasAccess('solicitations')) navigation.push({ name: 'Solicitations', href: '/solicitations', icon: HeartHandshake });
  if (hasAccess('activitylogs')) navigation.push({ name: 'Activity Logs', href: '/activity-logs', icon: Activity });
  if (hasAccess('reports')) navigation.push({ name: 'Reports', href: '/reports', icon: FileDown });
  
  if (isAdmin) {
    navigation.push({ name: 'System Auth', href: '/users', icon: UserCog, mobile: false });
    navigation.push({ name: 'Settings', href: '/settings', icon: Settings, mobile: false });
  }

  const primaryNav = [
    { name: 'Home', href: '/', icon: LayoutDashboard },
    { name: 'Delegates', href: '/registrants', icon: Users },
    { name: 'Merch', href: '/merch', icon: ShoppingBag },
    { name: 'Expenses', href: '/expenses', icon: Receipt },
  ].filter(item => hasAccess(item.href === '/' ? 'dashboard' : item.href.substring(1)));

  const moreNav = navigation.filter(item => !primaryNav.some(p => p.href === item.href));

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-brand-cream flex">
      {/* Sidebar Desktop/Tablet */}
      <aside className="hidden md:flex flex-col md:w-20 xl:w-64 bg-brand-brown text-brand-beige shadow-xl z-20 transition-all duration-300">
        <div className="p-4 xl:p-6 text-center xl:text-left flex flex-col items-center xl:items-start relative">
          <div className="flex items-center gap-2 xl:gap-3 xl:mb-1">
            <div className="relative">
              <img src="/logo.svg" alt="LAKBAY Logo" className="h-10 w-10 xl:h-12 xl:w-12 object-contain drop-shadow-md" />
              <div className="xl:hidden absolute -bottom-1 -right-1 flex items-center justify-center p-0.5 rounded-full bg-brand-brown border border-white/10" title="Connection Status">
                <div className={`w-2.5 h-2.5 rounded-full ${isSocketConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              </div>
            </div>
            <h1 className="hidden xl:block text-3xl xl:text-4xl font-display tracking-widest text-white mt-1">LAKBAY</h1>
          </div>
          <div className="hidden xl:block">
            <p className="text-sm text-brand-sand font-medium uppercase tracking-wider mt-1">{currentUser?.role}</p>
            {currentUser?.church && <p className="text-xs text-white/70 mt-0.5 truncate">{currentUser.church}</p>}
          </div>
          
          {/* Socket Status Dot - Desktop */}
          <div className="hidden xl:flex absolute top-6 right-6 items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10" title="Connection Status">
            <div className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-tighter">Live</span>
          </div>
        </div>
        
        <nav className="flex-1 px-2 xl:px-4 space-y-2 mt-4 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                title={item.name}
                className={`flex items-center xl:gap-3 px-3 xl:px-4 py-3 rounded-xl transition-all justify-center xl:justify-start ${isActive ? 'bg-brand-sand text-brand-brown font-bold shadow-md' : 'hover:bg-brand-light-brown text-brand-beige/90'}`}
              >
                <Icon size={20} className={isActive ? 'text-brand-brown' : 'opacity-80'} />
                <span className="hidden xl:block">{item.name}</span>
              </Link>
            );
          })}

          <button 
            onClick={logout}
            title="Logout"
            className="flex items-center xl:gap-3 px-3 xl:px-4 py-3 w-full rounded-xl text-brand-beige/90 hover:bg-brand-light-brown transition-all justify-center xl:justify-start mt-2"
          >
            <LogOut size={20} className="opacity-80" />
            <span className="hidden xl:block lg:ml-0.5">Logout</span>
          </button>
        </nav>
      </aside>

      {/* Mobile main column — NO overflow-hidden here to avoid iOS clipping fixed modals */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden bg-brand-brown text-brand-beige p-4 flex items-center justify-between shadow-md z-30 shrink-0">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Logo" className="h-10 w-10 object-contain drop-shadow-sm" />
            <div className="flex flex-col justify-center mt-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-display tracking-wider text-white leading-none">LAKBAY</h1>
                <div className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              </div>
              <p className="text-[10px] text-brand-sand uppercase tracking-wider mt-1 leading-none">{currentUser?.role} {currentUser?.church ? `• ${currentUser.church}` : ''}</p>
            </div>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 bg-white/10 rounded-lg">
            <Menu size={24} className="text-white" />
          </button>
        </header>
        
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 bg-brand-brown/60 backdrop-blur-md z-[40]" onClick={() => setMobileMenuOpen(false)}>
            <div 
              className="absolute right-0 top-0 bottom-0 w-64 bg-brand-brown shadow-2xl safe-area-bottom flex flex-col p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-display text-white tracking-widest underline decoration-brand-sand underline-offset-8">MORE</h3>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-brand-beige/50"><X size={24} /></button>
              </div>
              <nav className="space-y-4 flex-1 overflow-y-auto">
                {moreNav.map((item) => {
                  const isActive = location.pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-brand-sand text-brand-brown font-bold' : 'text-brand-beige hover:bg-white/10'}`}
                    >
                      <Icon size={20} />
                      <span className="text-lg">{item.name}</span>
                    </Link>
                  )
                })}

                <button 
                  onClick={logout} 
                  className="flex items-center gap-4 px-4 py-3 w-full rounded-xl text-brand-beige hover:bg-white/10 text-left mt-8 border-t border-white/10 pt-8"
                >
                  <LogOut size={20} className="opacity-50" />
                  <span className="text-lg">Logout</span>
                </button>
              </nav>
            </div>
          </div>
        )}

        {/* Main scrollable content — flex-1 so it fills the space between header and nav */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-28 md:pb-8">
          <div className="max-w-screen-2xl mx-auto w-full">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Nav — natural flex sibling (NOT fixed) for reliable iOS taps */}
        <nav className="md:hidden bg-white border-t border-brand-beige flex justify-around items-stretch px-1 safe-area-bottom z-[35] shadow-[0_-4px_10px_rgba(0,0,0,0.05)] shrink-0">
          {primaryNav.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`bottom-nav-item ${isActive ? 'text-brand-brown' : 'text-gray-400'}`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-brand-sand/20 scale-110' : ''}`}>
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="mt-0.5">{item.name}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className={`bottom-nav-item ${mobileMenuOpen ? 'text-brand-brown' : 'text-gray-400'}`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${mobileMenuOpen ? 'bg-brand-sand/20 scale-110' : ''}`}>
              <Menu size={24} strokeWidth={mobileMenuOpen ? 2.5 : 2} />
            </div>
            <span className="mt-0.5">More</span>
          </button>
        </nav>
      </div>

      {/* Global Loading Overlay - Only show for long/manual blocking operations */}
      {isLoading && (location.pathname === '/login' || location.pathname === '/settings' || location.pathname === '/reports') && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center animate-in fade-in duration-300">
          <Loader2 className="animate-spin text-brand-brown w-12 h-12 mb-4" />
          <p className="text-brand-brown font-display tracking-widest animate-pulse">PROCESSING...</p>
        </div>
      )}

      {/* Global Error Modal */}
      {globalError && (
        <div className="fixed inset-0 bg-brand-brown/40 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full border border-red-100 overflow-hidden transform transition-all">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="text-red-500 w-8 h-8" />
              </div>
              <h3 className="text-xl font-display text-gray-900 mb-2">Error Encountered</h3>
              <p className="text-gray-600 text-sm mb-6">{globalError}</p>
              <button
                onClick={() => setGlobalError(null)}
                className="w-full bg-brand-brown hover:bg-brand-light-brown text-white font-bold py-3 rounded-xl transition-colors"
              >
                Dismiss & Retry
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster position="top-right" />
    </div>
  );
}
