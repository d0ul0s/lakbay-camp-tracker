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
      case 'Alert': return <AlertTriangle className="text-red-500" size={24} />;
      case 'Reminder': return <Clock className="text-blue-500" size={24} />;
      case 'Schedule': return <Calendar className="text-green-500" size={24} />;
      default: return <Bell className="text-brand-brown" size={24} />;
    }
  };

  const getPriorityStyle = (priority: boolean) => {
    if (priority) return 'border-red-100 bg-red-50/30 ring-1 ring-red-50';
    return 'border-brand-beige bg-white';
  };

  return (
    <div className="min-h-screen bg-brand-cream selection:bg-brand-brown selection:text-white">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-sand blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-brown/10 blur-[120px]"></div>
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-12 md:py-20 flex flex-col">
        {/* Header */}
        <div className="mb-12 flex flex-col items-center text-center">
            <button 
                onClick={() => navigate('/login')}
                className="mb-8 flex items-center gap-2 text-brand-brown/60 hover:text-brand-brown font-bold text-sm transition-all group"
            >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Login
            </button>
            
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-brand-brown/5 blur-2xl rounded-full scale-150"></div>
                <Megaphone size={48} className="text-brand-brown relative animate-bounce-slow" />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-display text-brand-brown tracking-tighter mb-2">
                CAMP <span className="underline decoration-brand-sand underline-offset-4">ANNOUNCEMENTS</span>
            </h1>
            <p className="text-brand-light-brown font-black uppercase tracking-[0.2em] text-xs md:text-sm">
                LAKBAY CAMP 2026 • OFFICIAL UPDATES
            </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-brand-brown/50 mb-4" />
            <p className="text-brand-brown font-bold animate-pulse uppercase tracking-widest text-xs">Fetching latest updates...</p>
          </div>
        ) : announcements.length > 0 ? (
          <div className="space-y-6">
            {announcements.map((ann) => (
              <div 
                key={ann._id || ann.id}
                className={`group relative p-6 md:p-8 rounded-[2rem] border transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 ${getPriorityStyle(ann.priority)} overflow-hidden`}
              >
                {/* Visual Accent */}
                {ann.priority && (
                  <div className="absolute top-0 right-0 p-3">
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-red-500 text-white text-[9px] font-black uppercase rounded-full shadow-lg shadow-red-200 animate-pulse">
                      Urgent Update
                    </span>
                  </div>
                )}
                
                <div className="flex flex-col md:flex-row gap-6">
                  <div className={`shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm ${ann.priority ? 'bg-red-100' : 'bg-brand-cream'}`}>
                    {getTypeIcon(ann.type)}
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <h3 className="text-2xl md:text-3xl font-display text-brand-brown group-hover:text-black transition-colors">
                            {ann.title}
                        </h3>
                        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                             <span className="flex items-center gap-1.5">
                                <Info size={12} className="text-brand-sand" /> {ann.type}
                             </span>
                             {ann.targetDate && (
                                <span className="flex items-center gap-1.5 text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md">
                                    <Calendar size={12} /> {safeFormat(ann.targetDate, 'MMM d', 'TBD')}
                                </span>
                             )}
                        </div>
                    </div>
                    
                    <p className="text-gray-600 text-base md:text-lg leading-relaxed whitespace-pre-wrap">
                      {ann.content}
                    </p>
                    
                    <div className="pt-4 flex items-center gap-2 text-[9px] font-black text-gray-300 uppercase tracking-widest">
                       Posted {safeFormat(ann.createdAt, 'MMM d, yyyy')} • {safeFormat(ann.createdAt, 'h:mm a')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-brand-beige">
            <div className="max-w-md mx-auto px-6">
                <div className="w-20 h-20 bg-brand-cream rounded-full flex items-center justify-center mx-auto mb-6">
                    <Info size={40} className="text-brand-sand opacity-50" />
                </div>
                <h3 className="text-2xl font-display text-brand-brown mb-2 tracking-tight">No Active Announcements</h3>
                <p className="text-gray-400 font-medium">We haven't posted any updates yet. Check back soon for camp schedules and packing reminders!</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-20 pt-8 border-t border-brand-beige text-center space-y-4">
            <div className="flex items-center justify-center gap-4">
                <img src="/logo.svg" alt="LAKBAY" className="h-8 w-auto brightness-0" />
                <div className="h-4 w-px bg-brand-sand"></div>
                <span className="text-xs font-black text-brand-brown/40 uppercase tracking-[0.2em]">lakbay camp 2026</span>
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest px-6 leading-loose">
                Managed by the LAKBAY Executive Committee • 2 Peter 3:18
            </p>
        </div>
      </div>
    </div>
  );
}
