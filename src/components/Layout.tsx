import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../store';
import { LayoutDashboard, Users, ShoppingBag, Receipt, Settings, FileDown, LogOut, Menu, UserCog, HeartHandshake, Loader2, AlertCircle, Activity, X, Map, Trophy, Megaphone, Music } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Toaster } from 'react-hot-toast';
import BackgroundExportEngine from './BackgroundExportEngine';
import { ShieldCheck, HeartHandshake as HeartIcon } from 'lucide-react';

export default function Layout() {
  const { 
    currentUser, 
    logout, 
    isLoading, 
    globalError, 
    setGlobalError, 
    refreshPermissions, 
    hasSyncedLive, 
    fetchBootData, 
    syncRegistrant, 
    syncExpense, 
    syncSolicitation, 
    syncAnnouncement, 
    syncWorship,
    syncSettings,
    syncAward,
    activeExport,
    clearExport
  } = useAppStore();
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

    // Universal Data Sync Listener
    socket.on('DATA_UPDATED', (payload: any) => {
      const { type, action, data } = payload;
      console.log(`Socket Sync: ${type} ${action}`, data);
      
      switch (type) {
        case 'registrants': syncRegistrant(action, data); break;
        case 'expenses': syncExpense(action, data); break;
        case 'solicitations': syncSolicitation(action, data); break;
        case 'announcements': syncAnnouncement(action, data); break;
        case 'worship': syncWorship(action, data); break;
        case 'settings': syncSettings(data); break;
        case 'awards': syncAward(action, data); break;
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
      'announcements': 'announcements',
      'org': 'org',
      'points': 'points',
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
  if (hasAccess('points')) navigation.push({ name: 'Point Management', href: '/points', icon: Trophy });
  if (hasAccess('merch')) navigation.push({ name: 'Merch Claims', href: '/merch', icon: ShoppingBag });
  if (hasAccess('expenses')) navigation.push({ name: 'Expenses', href: '/expenses', icon: Receipt });
  if (hasAccess('solicitations')) navigation.push({ name: 'Solicitations', href: '/solicitations', icon: HeartHandshake });
  if (hasAccess('activitylogs')) navigation.push({ name: 'Activity Logs', href: '/activity-logs', icon: Activity });
  if (hasAccess('announcements')) navigation.push({ name: 'Announcements', href: '/announcements/manage', icon: Megaphone });
  if (hasAccess('org')) navigation.push({ name: 'Organization', href: '/org', icon: Map });
  if (hasAccess('reports')) navigation.push({ name: 'Reports', href: '/reports', icon: FileDown });
  
  navigation.push({ name: 'Awards', href: '/awards', icon: Trophy });

  if (isAdmin || currentUser?.role?.toLowerCase().trim() === 'coordinator') {
    navigation.push({ name: 'Docs & Printing', href: '/docs', icon: FileDown });
    navigation.push({ name: 'Worship Lineup', href: '/worship/manage', icon: Music });
  }

  if (isAdmin) {
    navigation.push({ name: 'Tribe Sorter', href: '/tribe-sorter', icon: Trophy });
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
    <div className="h-[100dvh] w-full overflow-hidden bg-brand-cream flex print:h-auto print:overflow-visible print:bg-white print:block">
      {/* Sidebar Desktop/Tablet */}
      <aside className="hidden md:flex flex-col md:w-20 xl:w-64 bg-brand-brown text-brand-beige shadow-xl z-20 transition-all duration-300 print:hidden">
        <div className="p-4 xl:p-6 flex flex-col items-center xl:items-start relative group">
          <div className="mb-2">
            <h1 className="hidden xl:block text-3xl xl:text-4xl font-display tracking-[0.2em] text-white mt-1">LAKBAY</h1>
          </div>
          
          <div className="hidden xl:flex items-end justify-between w-full gap-4">
            <div className="min-w-0">
               <p className="text-xs text-brand-sand font-bold uppercase tracking-widest leading-none mb-1">{currentUser?.role}</p>
               {currentUser?.church && (
                 <p className="text-[10px] text-white/40 truncate font-medium uppercase tracking-tight">
                   {currentUser.church}
                 </p>
               )}
            </div>

            {/* Socket Status Dot - Desktop (Aligned with Church) */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10 shrink-0 mb-0.5" title="Live Connection">
              <div className={`w-1.5 h-1.5 rounded-full ${isSocketConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Live</span>
            </div>
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
      <div className="flex-1 flex flex-col min-w-0 print:block print:overflow-visible">
        <header className="md:hidden bg-brand-brown text-brand-beige p-4 flex items-center justify-between shadow-md z-30 shrink-0 print:hidden">
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
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-28 md:pb-8 print:p-0 print:overflow-visible text-black">
          <div className="max-w-screen-2xl mx-auto w-full print:max-w-none print:m-0">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Nav — natural flex sibling (NOT fixed) for reliable iOS taps */}
        <nav className="md:hidden bg-white border-t border-brand-beige flex justify-around items-stretch px-1 safe-area-bottom z-[35] shadow-[0_-4px_10px_rgba(0,0,0,0.05)] shrink-0 print:hidden">
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
      
      {/* Background Export Engine (Headless) */}
      <BackgroundExportEngine />

      {/* Progress Dock (Floating & Compact) */}
      {activeExport?.isProcessing && (
        <div className="fixed bottom-6 right-6 z-[60] animate-in slide-in-from-bottom-10 duration-500">
          <div className="bg-brand-brown/95 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-2xl w-[260px] ring-1 ring-black/10 overflow-hidden relative group">
            {/* Background Glow */}
            <div className="absolute -top-12 -left-12 w-24 h-24 bg-brand-sand/10 blur-[40px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-brand-sand/20 flex items-center justify-center text-brand-sand animate-pulse shrink-0">
                {activeExport.template === 'waiver' ? <ShieldCheck size={16} /> : <HeartIcon size={16} />}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-white font-display text-[11px] uppercase tracking-tighter truncate leading-none">
                    {activeExport.template === 'waiver' ? 'Consents' : 'Letters'} • {activeExport.progress.current}/{activeExport.progress.total}
                  </p>
                  <div className="text-right shrink-0 flex items-center gap-3">
                    <div>
                      <span className="text-brand-sand font-display text-xs leading-none block">
                        {Math.round((activeExport.progress.current / activeExport.progress.total) * 100)}%
                      </span>
                      {activeExport.estimatedRemainingMsg && (
                        <span className="text-white/40 text-[8px] font-black uppercase tracking-widest mt-1 block">
                          {activeExport.estimatedRemainingMsg}
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        clearExport();
                      }}
                      className="p-1.5 rounded-full hover:bg-white/10 transition-colors pointer-events-auto"
                      title="Cancel Export"
                    >
                      <X className="w-4 h-4 text-white/40 hover:text-white" />
                    </button>
                  </div>
                </div>
                
                {/* Slim Progress Bar */}
                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden mt-2">
                  <div 
                    className="h-full bg-brand-sand transition-all duration-700 ease-out shadow-[0_0_8px_rgba(210,180,140,0.5)]"
                    style={{ width: `${(activeExport.progress.current / activeExport.progress.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
