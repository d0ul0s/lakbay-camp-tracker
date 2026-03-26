import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../store';
import { LayoutDashboard, Users, ShoppingBag, Receipt, Settings, FileDown, LogOut, Menu, UserCog, HeartHandshake, Loader2, AlertCircle, Activity } from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
  const { currentUser, logout, isLoading, globalError, setGlobalError } = useAppStore();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const isTreasurer = currentUser?.role === 'treasurer';

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Registrants', href: '/registrants', icon: Users },
    { name: 'Merch Claims', href: '/merch', icon: ShoppingBag },
    { name: 'Expenses', href: '/expenses', icon: Receipt },
  ];

  if (isAdmin || isTreasurer) {
    navigation.push({ name: 'Solicitations', href: '/solicitations', icon: HeartHandshake });
    navigation.push({ name: 'Activity Logs', href: '/activity-logs', icon: Activity });
  }

  navigation.push({ name: 'Reports', href: '/reports', icon: FileDown });
  
  if (isAdmin) {
    navigation.push({ name: 'System Auth', href: '/users', icon: UserCog });
    navigation.push({ name: 'Settings', href: '/settings', icon: Settings });
  }

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
        </nav>
        
        <div className="p-6 border-t border-brand-light-brown mt-auto">
          <button 
            onClick={logout}
            className="flex items-center justify-center gap-2 px-4 py-3 w-full rounded-xl hover:bg-white/10 text-white/90 transition-colors font-medium"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="md:hidden bg-brand-brown text-brand-beige p-4 flex items-center justify-between shadow-md z-20">
          <div>
            <h1 className="text-2xl font-display tracking-wider text-white leading-none">LAKBAY</h1>
            <p className="text-[10px] text-brand-sand uppercase tracking-wider">{currentUser?.role} {currentUser?.church ? `• ${currentUser.church}` : ''}</p>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 bg-white/10 rounded-lg">
            <Menu size={24} className="text-white" />
          </button>
        </header>
        
        {mobileMenuOpen && (
          <div className="md:hidden absolute inset-0 top-[60px] bg-brand-brown/95 backdrop-blur-sm z-20 flex flex-col">
            <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
              {navigation.map((item) => {
                 const isActive = location.pathname === item.href;
                 const Icon = item.icon;
                 return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-4 px-4 py-4 rounded-xl text-lg ${isActive ? 'bg-brand-sand text-brand-brown font-bold' : 'text-white hover:bg-white/10'}`}
                  >
                    <Icon size={24} />
                    <span>{item.name}</span>
                  </Link>
                 )
              })}
            </nav>
            <div className="p-4 border-t border-white/10">
              <button onClick={logout} className="flex items-center justify-center gap-3 px-4 py-4 w-full rounded-xl bg-white/10 text-white font-medium">
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-0">
          <Outlet />
        </main>
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
