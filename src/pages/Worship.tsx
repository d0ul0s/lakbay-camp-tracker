import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import type { WorshipSession, Song } from '../types';
import { 
  Music, 
  Mic2, 
  ArrowLeft,
  Loader2,
  Calendar,
  Clock,
  Hash,
  ChevronDown,
  ExternalLink,
  Disc
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function Worship() {
  const [sessions, setSessions] = useState<WorshipSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWorshipData = async () => {
      try {
        const res = await api.get('/api/worship');
        setSessions(res.data);
        // Expand the first session by default if available
        if (res.data.length > 0) {
          setExpandedSession(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch worship lineup:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWorshipData();
  }, []);

  const safeFormat = (dateStr: string | null | undefined, formatStr: string, fallback: string = 'TBA') => {
    if (!dateStr) return fallback;
    try {
      return format(parseISO(dateStr), formatStr);
    } catch (e) {
      return fallback;
    }
  };

  const toggleSession = (id: string) => {
    setExpandedSession(expandedSession === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-brand-cream selection:bg-brand-brown selection:text-white relative overflow-hidden">
      {/* Immersive Musical Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-brand-sand/20 blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-brown/10 blur-[160px] animate-pulse-slow delay-700"></div>
        
        {/* Subtle Waveform Pattern */}
        <div className="absolute bottom-0 left-0 right-0 h-64 opacity-[0.03] text-brand-brown overflow-hidden flex items-end justify-around px-4">
            {[...Array(40)].map((_, i) => (
                <div 
                    key={i} 
                    className="w-1 bg-current rounded-full" 
                    style={{ 
                        height: `${20 + Math.random() * 80}%`,
                        animation: `bounce-slow ${1 + Math.random() * 2}s ease-in-out infinite alternate`
                    }}
                ></div>
            ))}
        </div>
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-8 md:py-16 flex flex-col min-h-screen">
        {/* Header */}
        <div className="mb-8 md:mb-12 flex flex-col items-center text-center">
            <button 
                onClick={() => navigate('/login')}
                className="mb-10 px-4 py-2 rounded-full bg-white/40 hover:bg-white/60 active:scale-95 border border-white/50 backdrop-blur-sm shadow-sm transition-all flex items-center gap-2 text-brand-brown/60 hover:text-brand-brown font-black text-[10px] uppercase tracking-widest group"
            >
                <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" /> Back to Login
            </button>
            
            <div className="relative mb-4">
                <div className="absolute inset-0 bg-brand-brown/10 blur-3xl rounded-full scale-110"></div>
                <div className="relative w-16 h-16 rounded-3xl bg-white/60 backdrop-blur-md border border-white/80 shadow-xl flex items-center justify-center -rotate-6">
                    <Music size={32} className="text-brand-brown animate-bounce-slow" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-brand-sand rounded-lg border-2 border-white shadow-sm flex items-center justify-center rotate-12">
                        <Mic2 size={12} className="text-brand-brown" />
                    </div>
                </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-display text-brand-brown tracking-tighter leading-[0.85] mb-4">
               CAMP <br/> <span className="text-transparent bg-clip-text bg-gradient-to-br from-brand-brown to-brand-brown/40 uppercase">Lineup</span>
            </h1>
            
            <div className="flex items-center gap-3 bg-white/30 backdrop-blur-sm border border-white/50 px-4 py-1.5 rounded-xl shadow-inner shadow-white/50">
                <span className="flex items-center gap-2 text-[9px] md:text-xs font-black text-brand-light-brown uppercase tracking-[0.3em]">
                   PRAISE & WORSHIP
                </span>
                <div className="w-1 h-1 rounded-full bg-brand-sand shadow-sm"></div>
                <span className="flex items-center gap-2 text-[9px] md:text-xs font-black text-brand-light-brown/60 uppercase tracking-[0.3em]">
                   LAKBAY 2026
                </span>
            </div>
        </div>

        {/* Content Stream */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white/20 rounded-[3rem] border border-white/50 backdrop-blur-sm">
            <Loader2 className="w-12 h-12 animate-spin text-brand-brown mb-4 opacity-20" />
            <p className="text-brand-brown font-black animate-pulse uppercase tracking-[0.3em] text-[10px]">Tuning Instruments...</p>
          </div>
        ) : sessions.length > 0 ? (
          <div className="relative space-y-4 pb-24">
            {sessions.map((session, idx) => {
              const isExpanded = expandedSession === session.id;
              
              return (
                <div 
                  key={session.id}
                  className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className={`overflow-hidden transition-all duration-500 bg-white shadow-xl shadow-brand-brown/[0.03] border ${isExpanded ? 'border-brand-sand/50 rounded-[2.5rem]' : 'border-white/80 rounded-[2rem] bg-white/60 backdrop-blur-xl'}`}>
                    {/* Session Header */}
                    <button 
                        onClick={() => toggleSession(session.id)}
                        className="w-full flex items-center justify-between p-5 md:p-6 text-left group"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isExpanded ? 'bg-brand-brown text-white' : 'bg-brand-brown/5 text-brand-brown group-hover:bg-brand-brown/10'}`}>
                                <Disc size={24} className={isExpanded ? 'animate-spin-slow' : ''} />
                            </div>
                            <div>
                                <h3 className={`text-xl md:text-2xl font-display leading-none mb-1 ${isExpanded ? 'text-brand-brown' : 'text-brand-brown/80'}`}>
                                    {session.title}
                                </h3>
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-brand-brown/40">
                                        <Calendar size={10} /> {safeFormat(session.sessionDate, 'MMM d, yyyy')}
                                    </span>
                                    {session.sessionDate && (
                                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-brand-brown/40">
                                            <Clock size={10} /> {safeFormat(session.sessionDate, 'h:mm a')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className={`p-2 rounded-full border border-brand-brown/10 transition-transform duration-500 ${isExpanded ? 'rotate-180 bg-brand-sand/10 border-brand-sand/20' : ''}`}>
                            <ChevronDown size={20} className="text-brand-brown/40" />
                        </div>
                    </button>

                    {/* Session Songs */}
                    <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                        <div className="px-5 pb-6 pt-0 space-y-3">
                            {session.description && (
                                <p className="text-gray-400 text-[11px] font-bold uppercase tracking-widest px-4 border-l-2 border-brand-sand mb-6 mx-2 leading-relaxed">
                                    {session.description}
                                </p>
                            )}

                            <div className="grid grid-cols-1 gap-2.5">
                                {session.songs && session.songs.length > 0 ? (
                                    session.songs.sort((a,b) => (a.order || 0) - (b.order || 0)).map((song, sIdx) => (
                                        <div 
                                            key={song.id || sIdx}
                                            className="group relative flex items-center justify-between p-4 bg-brand-cream/40 border border-brand-sand/10 rounded-2xl transition-all hover:bg-white hover:shadow-md hover:-translate-y-0.5"
                                        >
                                            <div className="flex flex-col min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-[10px] font-black text-brand-brown/20 w-4 font-mono">{sIdx + 1}</span>
                                                    <h4 className="text-brand-brown font-bold text-sm md:text-base truncate tracking-tight">{song.title}</h4>
                                                </div>
                                                <div className="flex items-center gap-3 pl-6">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-brown/40">
                                                        {song.artist || 'Unknown Artist'}
                                                    </span>
                                                    {song.key && (
                                                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-brand-brown/5 rounded-md border border-brand-brown/10 text-[9px] font-black text-brand-brown/60 uppercase">
                                                            <Hash size={8} /> Key: {song.key}
                                                        </span>
                                                    )}
                                                </div>
                                                {song.notes && (
                                                    <p className="mt-2 pl-6 text-[10px] text-brand-brown/50 italic leading-relaxed">
                                                        "{song.notes}"
                                                    </p>
                                                )}
                                            </div>

                                            {song.lyricsUrl && (
                                                <a 
                                                    href={song.lyricsUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="p-3 bg-white rounded-xl border border-brand-brown/5 text-brand-brown/40 hover:text-brand-brown hover:bg-brand-sand/10 transition-all shadow-sm group/btn shrink-0"
                                                >
                                                    <ExternalLink size={18} className="group-hover/btn:scale-110 transition-transform" />
                                                </a>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-8 text-center bg-brand-cream/30 rounded-3xl border border-dashed border-brand-sand/40">
                                        <p className="text-[10px] font-black text-brand-brown/30 uppercase tracking-[0.2em]">List Pending...</p>
                                    </div>
                                )}
                            </div>
                        </div>
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
                    <Music size={40} className="text-brand-sand opacity-40" />
                </div>
                <h3 className="text-3xl font-display text-brand-brown mb-2 tracking-tight">Silent Stage</h3>
                <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] leading-loose">
                    THE LINEUP IS BEING FINALIZED • OFFICIAL SETLISTS WILL AUTO-SYNC SOON
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
                OFFICIAL PRAISE & WORSHIP PORTAL • LAKBAY YOUTH CAMP 2026 • PSALM 100:1-2
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
