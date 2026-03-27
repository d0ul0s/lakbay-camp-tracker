import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../store';
import { LayoutDashboard, Users, ShoppingBag, Receipt, Settings, FileDown, LogOut, Menu, UserCog, HeartHandshake, Loader2, AlertCircle, Activity, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Layout() {
  const { currentUser, logout, isLoading, globalError, setGlobalError, refreshPermissions } = useAppStore();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
      refreshPermissions();
    }
  }, []);

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

    // Default for pages not in matrix but shown to admin
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
    <div className="min-h-screen bg-brand-cream flex">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-brand-brown text-brand-beige shadow-xl z-10">
        <div className="p-6">
          <h1 className="text-4xl font-display tracking-widest text-white">LAKBAY</h1>
          <p className="text-sm text-brand-sand font-medium uppercase tracking-wider mt-1">{currentUser?.role}</p>
          {currentUser?.church && <p className="text-xs text-white/70 mt-1 truncate">{currentUser.church}</p>}
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-brand-sand text-brand-brown font-bold shadow-md' : 'hover:bg-brand-light-brown text-brand-beige/90'}`}
              >
                <Icon size={20} className={isActive ? 'text-brand-brown' : 'opacity-80'} />
                <span>{item.name}</span>
              </Link>
            );
          })}

          <button 
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-brand-beige/90 hover:bg-brand-light-brown transition-all text-left mt-2"
          >
            <LogOut size={20} className="opacity-80" />
            <span>Logout</span>
          </button>
        </nav>
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="md:hidden bg-brand-brown text-brand-beige p-4 flex items-center justify-between shadow-md z-30 relative">
          <div>
            <h1 className="text-2xl font-display tracking-wider text-white leading-none">LAKBAY</h1>
            <p className="text-[10px] text-brand-sand uppercase tracking-wider">{currentUser?.role} {currentUser?.church ? `• ${currentUser.church}` : ''}</p>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 bg-white/10 rounded-lg">
            <Menu size={24} className="text-white" />
          </button>
        </header>
        
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 bg-brand-brown/60 backdrop-blur-md z-[40]" onClick={() => setMobileMenuOpen(false)}>
            <div 
              className="absolute right-0 top-0 bottom-0 w-64 bg-brand-brown shadow-2xl safe-area-bottom flex flex-col p-6 animate-in slide-in-from-right duration-300"
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

        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <Outlet />
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-brand-beige flex justify-around items-center px-2 py-2 safe-area-bottom z-[35] shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
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
                <span className="mt-1">{item.name}</span>
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
            <span className="mt-1">More</span>
          </button>
        </nav>
      </div>

      {/* Global Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center">
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

    </div>
  );
}
