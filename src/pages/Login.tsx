import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Map, Megaphone, AlertTriangle, ChevronRight } from 'lucide-react';
import api from '../api/axios';
import { useAppStore } from '../store';
import { useEffect } from 'react';

export default function Login() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const { login, setLoading, announcements, fetchAnnouncements } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch announcements for the public login screen
    fetchAnnouncements(true);
  }, []);

  const priorityAnnouncements = announcements.filter(a => a.priority);
  const latestPriority = priorityAnnouncements[0];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim();
    if (!cleanPin) return;

    setLoading(true);
    setError(false);
    try {
      const res = await api.post('/api/auth/login', { pin: cleanPin });
      login(res.data);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(true);
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const isLoading = useAppStore(state => state.isLoading);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-brand-cream select-none relative overflow-x-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-brand-sand blur-[150px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-brown blur-[150px]"></div>
      </div>

      {/* Alert Banner for Priority Announcements */}
      {latestPriority && (
        <div 
          onClick={() => navigate('/announcements')}
          className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white py-3 px-4 shadow-xl cursor-pointer hover:bg-red-700 transition-colors animate-in slide-in-from-top duration-700"
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
             <div className="flex items-center gap-3">
               <div className="bg-white/20 p-1.5 rounded-lg animate-pulse">
                <AlertTriangle size={20} className="text-white" />
               </div>
               <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none opacity-80 mb-1">URGENT ANNOUNCEMENT</span>
                  <p className="font-bold text-sm md:text-base leading-tight line-clamp-1">{latestPriority.title}</p>
               </div>
             </div>
             <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest bg-white/20 px-3 py-1.5 rounded-full hover:bg-white/30 transition-all">
                READ NOW <ChevronRight size={14} />
             </div>
          </div>
        </div>
      )}

      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-6 md:p-10 border border-brand-beige relative z-10 hover:shadow-brand-sand/30 transition-all duration-700">
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="LAKBAY Logo" className="h-20 w-auto mx-auto mb-4 object-contain brightness-0" />
          <h1 className="text-5xl font-display text-brand-brown">LAKBAY</h1>
          <p className="text-brand-light-brown mt-2 font-medium">Summer Youth Camp 2026</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-brand-brown mb-2 text-center">Enter Access PIN</label>
            <input
              type="password"
              value={pin}
              autoComplete="current-password"
              onChange={(e) => {
                setPin(e.target.value);
                setError(false);
              }}
              className="w-full px-4 py-3 rounded-lg border-2 border-brand-sand focus:ring-0 focus:border-brand-brown outline-none transition-all text-center text-3xl tracking-[0.5em] font-mono"
              placeholder="••••"
              maxLength={4}
              disabled={isLoading}
            />
            {error && (
              <p className="text-red-500 text-sm mt-3 text-center font-medium">
                Invalid PIN code. Please try again.
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading || !pin.trim()}
            className="w-full bg-brand-brown hover:bg-brand-light-brown text-white font-bold py-3 px-4 rounded-lg transition-colors text-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="animate-spin" size={20} />}
            {isLoading ? 'Verifying...' : 'Enter Portal'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-brand-beige flex flex-col gap-3">
          <button 
            type="button" 
            onClick={() => navigate('/announcements')} 
            className="w-full bg-brand-brown text-white hover:bg-brand-light-brown font-bold py-3.5 px-4 rounded-2xl transition-all duration-300 text-sm shadow-lg flex items-center justify-center gap-2 group active:scale-95"
          >
            <Megaphone size={18} className="group-hover:rotate-12 transition-transform" /> View Camp Announcements
          </button>
          
          <button 
            type="button" 
            onClick={() => navigate('/public-org')} 
            className="w-full bg-brand-sand/30 border-2 border-brand-sand/50 text-brand-brown hover:bg-brand-sand/50 font-bold py-3.5 px-4 rounded-2xl transition-all duration-300 text-sm shadow-sm flex items-center justify-center gap-2 group active:scale-95"
          >
            <Map size={18} className="text-brand-brown group-hover:scale-110 transition-transform" /> Organization Board
          </button>
          
          <div className="mt-4 text-center space-y-2">
            <p className="text-[10px] text-brand-brown/40 px-6 font-black uppercase tracking-widest leading-loose">
                LAKBAY CAMP 2026 • OFFICIAL PORTAL
            </p>
            <p className="text-[9px] text-gray-300 font-bold">
                2 Peter 3:18
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
