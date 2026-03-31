import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Loader2, 
  Trophy, 
  TrendingUp, 
  TrendingDown,
  Activity,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import api from '../api/axios';
import { format } from 'date-fns';

export default function PublicPulse() {
  const [pulseData, setPulseData] = useState<{ logs: any[], scoreboard: any[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchPulse = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/points/public');
      setPulseData(res.data);
    } catch (err) {
      console.error("Failed to fetch public pulse", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPulse();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchPulse, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-brand-cream p-4 md:p-8 animate-in fade-in duration-500 pb-20">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none opacity-5">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-sand blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-brown blur-[120px]"></div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
           <button 
             onClick={() => navigate('/login')}
             className="flex items-center gap-2 text-brand-brown hover:bg-white/50 px-4 py-2 rounded-2xl transition-all font-bold text-sm shadow-sm border border-brand-sand/20 bg-white/30 backdrop-blur-sm"
           >
              <ArrowLeft size={18} /> <span className="hidden sm:inline">Back to Login</span>
           </button>

           <div className="text-center flex-1">
              <h1 className="text-3xl font-display text-brand-brown tracking-tight">Live Camp Pulse</h1>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] -mt-1">Real-time Tribal Operations</p>
           </div>

           <button 
             onClick={fetchPulse}
             disabled={isLoading}
             className="p-3 bg-brand-brown text-white rounded-2xl shadow-lg hover:bg-brand-light-brown active:rotate-180 transition-all duration-500 disabled:opacity-50"
           >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
           </button>
        </div>

        {/* TOP: SCOREBOARD */}
        <div className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-white p-6 md:p-10 shadow-2xl shadow-brand-sand/20 relative overflow-hidden group">
           <Trophy size={120} className="absolute -top-4 -right-4 text-brand-brown opacity-[0.03] group-hover:scale-110 transition-transform duration-700" />
           
           <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 bg-brand-brown text-white rounded-xl shadow-md">
                 <Trophy size={20} />
              </div>
              <div>
                 <h2 className="text-xl font-display text-brand-brown">Tribal Standings</h2>
                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Official Verified Totals</p>
              </div>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(pulseData?.scoreboard || [1,2,3,4]).slice(0, 4).map((tribe: any, idx: number) => (
                <div 
                  key={tribe.id || idx} 
                  className={`relative p-6 rounded-3xl border-2 transition-all duration-500 ${
                    idx === 0 
                      ? 'bg-gradient-to-br from-amber-50 to-white border-amber-200 shadow-amber-100/50' 
                      : 'bg-white/80 border-white shadow-sm'
                  } group hover:-translate-y-1`}
                >
                   {idx === 0 && (
                     <div className="absolute -top-3 -right-3 p-2 bg-amber-500 text-white rounded-full shadow-lg border-4 border-white animate-bounce-subtle">
                        <Trophy size={12} className="stroke-[3]" />
                     </div>
                   )}
                   <span className={`text-[10px] font-black mb-1 block ${idx === 0 ? 'text-amber-600' : 'text-gray-300'}`}>RANK #0{idx + 1}</span>
                   <h3 className="text-sm font-black text-gray-700 uppercase tracking-tight truncate mb-2">{tribe.name || '---'}</h3>
                   <div className="flex items-end gap-1">
                      <span className={`text-4xl font-display ${idx === 0 ? 'text-amber-600' : 'text-brand-brown'}`}>{tribe.score ?? '--'}</span>
                      <span className="text-[10px] font-bold text-gray-400 mb-2 font-mono uppercase">POINTS</span>
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* BOTTOM: ACTIVITY STREAM */}
        <div className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-white p-6 md:p-8 shadow-2xl shadow-brand-sand/10 flex flex-col min-h-[400px]">
           <div className="flex items-center justify-between mb-8 shrink-0">
              <div className="flex items-center gap-3">
                 <div className="p-2.5 bg-brand-brown/10 text-brand-brown rounded-xl">
                    <Activity size={20} />
                 </div>
                 <div>
                    <h2 className="text-xl font-display text-brand-brown">Recent Activity</h2>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Verified Merit Tracking</p>
                 </div>
              </div>
              {isLoading && <Loader2 size={16} className="animate-spin text-brand-brown opacity-20" />}
           </div>

           <div className="space-y-4 overflow-y-auto pr-4 custom-scrollbar flex-1">
              {isLoading && !pulseData ? (
                [1,2,3,4,5].map(i => <div key={i} className="h-20 bg-white/40 rounded-[1.5rem] animate-pulse border border-white/50" />)
              ) : (
                pulseData?.logs.map((log: any) => (
                  <div key={log._id} className="bg-white/80 p-4 rounded-[1.5rem] border border-white hover:border-brand-sand/30 shadow-sm flex items-start gap-4 transition-all hover:bg-white animate-in slide-in-from-bottom-2 duration-500">
                     <div className={`p-3 rounded-2xl shrink-0 ${log.type === 'merit' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                        {log.type === 'merit' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                     </div>
                     <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                           <span className="text-sm font-black text-gray-800 uppercase tracking-tight">{log.groupId?.name}</span>
                           <span className={`text-xl font-display ${log.points > 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {log.points > 0 ? `+${log.points}` : log.points}
                           </span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed italic pr-4">"{log.reason}"</p>
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
                           <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-brown/40"></span>
                              <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{log.createdBy?.church}</span>
                           </div>
                           <span className="text-[9px] text-gray-300 font-bold uppercase tracking-widest">{format(new Date(log.createdAt), 'MMM d, HH:mm')}</span>
                        </div>
                     </div>
                  </div>
                ))
              )}
              {pulseData?.logs.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center py-20 opacity-20">
                   <Activity size={48} className="mb-4" />
                   <p className="text-sm font-black uppercase tracking-widest">Awaiting First Verified Action</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
