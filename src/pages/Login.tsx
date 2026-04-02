import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Loader2, 
  Map, 
  Megaphone, 
  AlertTriangle, 
  ChevronRight, 
  Activity
} from 'lucide-react';
import api from '../api/axios';
import { useAppStore } from '../store';
import CampCountdown from '../components/CampCountdown';

export default function Login() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  const { login, setLoading, announcements, fetchAnnouncements } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Background Fetch: Don't block the initial render
    const loadAnnouncements = async () => {
       await fetchAnnouncements(true);
       setIsDataLoading(false);
    };
    loadAnnouncements();
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 select-none relative overflow-x-hidden bg-brand-cream bg-[radial-gradient(circle_at_top_left,rgba(212,163,115,0.15),transparent_50%),radial-gradient(circle_at_bottom_right,rgba(111,78,55,0.1),transparent_50%)]">
      {/* 
          GPU-Optimized Background:
          The previous version used blur-[150px] which is CPU/GPU intensive on mobile.
          The radial-gradient in the parent div above is significantly more efficient.
      */}

      {/* Alert Banner for Priority Announcements */}
      {!isDataLoading && latestPriority && (
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

      {/* 
          CAMP COUNTDOWN
          Positioned above the main card to build immediate anticipation.
      */}
      <div className="max-w-sm w-full mb-6">
        <CampCountdown />
      </div>

      {/* LOGIN CARD */}
      <div className="max-w-sm w-full bg-white rounded-[2rem] shadow-2xl p-6 md:p-8 border border-brand-beige relative z-10 transition-all duration-700">
        <div className="text-center mb-6">
          <img src="/logo.svg" alt="LAKBAY Logo" className="h-16 w-auto mx-auto mb-3 object-contain brightness-0" />
          <h1 className="text-4xl font-display text-brand-brown">LAKBAY</h1>
          <p className="text-[10px] text-brand-light-brown font-black uppercase tracking-widest mt-1">Summer Youth Camp 2026</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="bg-brand-cream/30 p-4 rounded-2xl border border-brand-sand/10">
            <label className="block text-[10px] font-black uppercase tracking-widest text-brand-brown mb-3 text-center opacity-60">Enter Access PIN</label>
            <input
              type="password"
              value={pin}
              autoComplete="current-password"
              onChange={(e) => {
                setPin(e.target.value);
                setError(false);
              }}
              className="w-full bg-transparent border-b-2 border-brand-sand focus:border-brand-brown outline-none transition-all text-center text-3xl tracking-[0.5em] font-mono pb-2"
              placeholder="••••"
              maxLength={4}
              disabled={isLoading}
            />
            {error && (
              <p className="text-red-500 text-[10px] mt-3 text-center font-bold uppercase tracking-tight">
                Invalid PIN code.
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading || !pin.trim()}
            className="w-full bg-brand-brown hover:bg-brand-light-brown text-white font-bold py-3 px-4 rounded-xl transition-all text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform active:scale-95"
          >
            {isLoading && <Loader2 className="animate-spin" size={16} />}
            {isLoading ? 'Verifying...' : 'Enter Portal'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-brand-beige">
          <div className="flex flex-col gap-3">
             <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button" 
                  onClick={() => navigate('/announcements')} 
                  className="flex flex-col items-center justify-center gap-2 bg-brand-brown text-white hover:bg-brand-light-brown font-bold p-4 rounded-2xl transition-all duration-300 text-[10px] shadow-lg group active:scale-95 text-center uppercase tracking-widest"
                >
                  <Megaphone size={16} className="group-hover:rotate-12 transition-transform" /> 
                  Announcements
                </button>
                
                <button 
                  type="button" 
                  onClick={() => navigate('/public-org')} 
                  className="flex flex-col items-center justify-center gap-2 bg-brand-sand/20 border border-brand-sand/50 text-brand-brown hover:bg-brand-sand/40 font-bold p-4 rounded-2xl transition-all duration-300 text-[10px] shadow-sm group active:scale-95 text-center uppercase tracking-widest"
                >
                  <Map size={16} className="text-brand-brown group-hover:scale-110 transition-transform" /> 
                  Organization
                </button>
             </div>

             <button 
                type="button" 
                onClick={() => navigate('/public-pulse')} 
                className="flex items-center justify-center gap-3 bg-amber-500 text-white hover:bg-amber-600 font-bold p-4 rounded-2xl transition-all duration-300 text-[10px] shadow-lg group active:scale-95 text-center uppercase tracking-[0.2em] w-full"
              >
                <Activity size={18} className="group-hover:scale-110 transition-transform" /> 
                Live Camp Pulse & Standings
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
          </div>
          
          <div className="mt-6 text-center space-y-1 opacity-40">
            <p className="text-[8px] text-brand-brown px-6 font-black uppercase tracking-[0.2em] leading-loose">
                LAKBAY CAMP • OFFICIAL PORTAL
            </p>
            <p className="text-[8px] text-brand-brown font-bold text-center">
                2 Peter 3:18
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
