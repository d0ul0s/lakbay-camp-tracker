import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import type { Announcement, AnnouncementType } from '../types';
import { 
  Megaphone, 
  Bell, 
  Clock, 
  AlertTriangle, 
  Calendar,
  ArrowLeft,
  Loader2,
  Info
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function PublicAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const res = await api.get('/api/announcements');
        setAnnouncements(res.data);
      } catch (err) {
        console.error('Failed to fetch announcements:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicData();
  }, []);

  const safeFormat = (dateStr: string | null | undefined, formatStr: string, fallback: string = 'Just now') => {
    if (!dateStr) return fallback;
    try {
      return format(parseISO(dateStr), formatStr);
    } catch (e) {
      return fallback;
    }
  };

  const getTypeIcon = (type: AnnouncementType) => {
    switch (type) {
      case 'Alert': return <AlertTriangle size={18} />;
      case 'Reminder': return <Clock size={18} />;
      case 'Schedule': return <Calendar size={18} />;
      default: return <Bell size={18} />;
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream selection:bg-brand-brown selection:text-white relative overflow-hidden">
      {/* Immersive Background Layers */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-brand-sand/30 blur-[140px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-brown/10 blur-[160px] animate-pulse-slow delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-8 md:py-16 flex flex-col min-h-screen">
        {/* Modern Header */}
        <div className="mb-8 md:mb-12 flex flex-col items-center text-center">
            <button 
                onClick={() => navigate('/login')}
                className="mb-10 px-4 py-2 rounded-full bg-white/40 hover:bg-white/60 active:scale-95 border border-white/50 backdrop-blur-sm shadow-sm transition-all flex items-center gap-2 text-brand-brown/60 hover:text-brand-brown font-black text-[10px] uppercase tracking-widest group"
            >
                <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" /> Back to Login
            </button>
            
            <div className="relative mb-4">
                <div className="absolute inset-0 bg-brand-brown/10 blur-3xl rounded-full scale-110"></div>
                <div className="relative w-12 h-12 rounded-full bg-white/60 backdrop-blur-md border border-white/80 shadow-xl flex items-center justify-center">
                    <Megaphone size={24} className="text-brand-brown animate-bounce-slow" />
                    <div className="absolute top-0 right-0 w-3 h-3 bg-brand-sand rounded-full border-2 border-white animate-pulse"></div>
                </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-display text-brand-brown tracking-tighter leading-[0.85] mb-4">
               CAMP <br/> <span className="text-transparent bg-clip-text bg-gradient-to-br from-brand-brown to-brand-brown/40">BULLETIN</span>
            </h1>
            
            <div className="flex items-center gap-3 bg-white/30 backdrop-blur-sm border border-white/50 px-4 py-1.5 rounded-xl shadow-inner shadow-white/50">
                <span className="flex items-center gap-2 text-[9px] md:text-xs font-black text-brand-light-brown uppercase tracking-[0.3em]">
                   LAKBAY 2026
                </span>
                <div className="w-1 h-1 rounded-full bg-brand-sand shadow-sm"></div>
                <span className="flex items-center gap-2 text-[9px] md:text-xs font-black text-brand-light-brown/60 uppercase tracking-[0.3em]">
                   Live Feed
                </span>
            </div>
        </div>

        {/* Content Stream */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white/20 rounded-[3rem] border border-white/50 backdrop-blur-sm">
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-brand-brown/5 blur-2xl rounded-full scale-150 animate-pulse"></div>
                <Loader2 className="w-12 h-12 animate-spin text-brand-brown relative" />
            </div>
            <p className="text-brand-brown font-black animate-pulse uppercase tracking-[0.3em] text-[10px]">Synchronizing Updates...</p>
          </div>
        ) : announcements.length > 0 ? (
          <div className="relative space-y-6 pb-24">
            {/* Timeline Rail */}
            <div className="absolute left-5 top-4 bottom-4 w-px bg-gradient-to-b from-brand-brown/0 via-brand-brown/10 to-brand-brown/0 hidden sm:block"></div>
            
            {announcements.map((ann, idx) => {
              const isUrgent = ann.priority;
              return (
                <div 
                  key={ann._id || ann.id}
                  className="relative pl-0 sm:pl-12 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  {/* Timeline Anchor */}
                  <div className="absolute left-4 top-6 w-2 h-2 rounded-full border-2 border-white bg-brand-brown shadow-md z-10 hidden sm:block"></div>

                  <div 
                    className={`group relative bg-white/60 backdrop-blur-xl border border-white/80 p-4 md:p-5 rounded-[2rem] shadow-xl shadow-brand-brown/[0.03] transition-all hover:scale-[1.01] active:scale-[0.99] ${isUrgent ? 'ring-2 ring-red-400/20 bg-gradient-to-br from-red-50/40 to-white/60' : ''}`}
                  >
                     {/* Urgent Glow */}
                     {isUrgent && (
                       <div className="absolute inset-0 bg-red-400/5 blur-3xl -z-10 rounded-[2rem]"></div>
                     )}

                     <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-3">
                           <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-full ${isUrgent ? 'bg-red-500/10 text-red-600 border border-red-500/10' : 'bg-brand-brown/10 text-brand-brown border border-brand-brown/10'} shadow-sm`}>
                                 {getTypeIcon(ann.type)}
                              </div>
                              <div className="min-w-0">
                                 <h3 className={`text-lg md:text-xl font-display ${isUrgent ? 'text-red-900' : 'text-brand-brown'} leading-tight`}>
                                    {ann.title}
                                 </h3>
                                 <p className="text-[9px] font-black uppercase tracking-widest text-brand-brown/30 mt-0.5">
                                    {safeFormat(ann.createdAt, 'MMM d, yyyy')} • {safeFormat(ann.createdAt, 'h:mm a')}
                                 </p>
                              </div>
                           </div>
                        </div>

                        <div className="relative">
                            <p className="text-gray-600 text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                {ann.content}
                            </p>
                            {isUrgent && (
                                <div className="mt-4 flex items-center gap-2 px-3 py-1.5 border border-red-200 bg-red-100/30 w-fit rounded-lg">
                                    <AlertTriangle size={12} className="text-red-500" />
                                    <span className="text-[9px] font-black text-red-700 uppercase tracking-widest">Crucial Information</span>
                                </div>
                            )}
                        </div>

                        {ann.targetDate && (
                            <div className="flex items-center gap-3 pt-4 border-t border-brand-brown/5">
                                <div className="flex items-center gap-2 px-2.5 py-1 bg-blue-50/50 border border-blue-100 rounded-lg">
                                    <Calendar size={10} className="text-blue-500" />
                                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">Event Date</span>
                                    <span className="text-[10px] font-bold text-blue-900 ml-1">{safeFormat(ann.targetDate, 'EEEE, MMMM d')}</span>
                                </div>
                            </div>
                        )}
                     </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24 bg-white/30 backdrop-blur-md rounded-[3rem] border-2 border-dashed border-white/50 animate-in zoom-in duration-700">
            <div className="max-w-xs mx-auto px-4">
                <div className="w-20 h-20 bg-white/40 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner shadow-white/50">
                    <Info size={40} className="text-brand-sand opacity-40" />
                </div>
                <h3 className="text-3xl font-display text-brand-brown mb-2 tracking-tight">Quiet on the Front</h3>
                <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] leading-loose">
                    THE STREAM IS CALM • OFFICIAL UPDATES WILL AUTO-SYNC WHEN RELEASED
                </p>
            </div>
          </div>
        )}

        {/* Premium Footer */}
        <div className="mt-auto py-12 border-t border-brand-brown/10 text-center space-y-6">
            <div className="flex items-center justify-center gap-6">
                <div className="p-3 bg-white/40 backdrop-blur-sm rounded-2xl border border-white/50">
                    <img src="/logo.svg" alt="LAKBAY" className="h-10 w-auto opacity-70" />
                </div>
            </div>
            <p className="text-[9px] text-brand-brown/30 font-black uppercase tracking-[0.4em] px-8 leading-loose max-w-sm mx-auto">
                OFFICIAL MOBILE BULLETIN OF THE LAKBAY CAMP MANAGEMENT SYSTEMS • 2 PETER 3:18
            </p>
            <div className="flex justify-center gap-1.5 opacity-20">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-brown"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-brand-brown"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-brand-brown"></div>
            </div>
        </div>
      </div>
    </div>
  );
}
