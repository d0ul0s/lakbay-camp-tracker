import { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Clock, 
  History as HistoryIcon, 
  Search, 
  TrendingUp, 
  TrendingDown,
  Trash2,
  Check,
  Edit3,
  X
} from 'lucide-react';
import { useAppStore } from '../store';
import api from '../api/axios';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function PointsManagement() {
  const { 
    currentUser, 
    pointLogs, 
    fetchPointLogs, 
    syncPointLog,
    fetchGlobalSettings
  } = useAppStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tribeList, setTribeList] = useState<{ id: string; name: string }[]>([]);
  
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    groupId: '',
    type: 'merit' as 'merit' | 'demerit',
    points: 0,
    reason: ''
  });

  const isAdmin = currentUser?.role === 'admin';
  const rolePerms = currentUser?.permissionMatrix?.[currentUser.role!];
  const canAdd = isAdmin || rolePerms?.points?.add;
  const canVerify = isAdmin || rolePerms?.points?.verify;

  useEffect(() => {
    fetchPointLogs(pointLogs.length > 0);
    fetchGlobalSettings(true);
    
    api.get('/api/org/groups').then(res => {
      if (Array.isArray(res.data)) {
        setTribeList(res.data.map((g: any) => ({
          id: g.id || g._id,
          name: g.name
        })));
      }
    }).catch(err => console.error("Failed to fetch tribes", err));
  }, []);

  const scores = useMemo(() => {
    const map: Record<string, number> = {};
    pointLogs.filter(p => p.verified).forEach(p => {
      const gId = p.groupId?.id || p.groupId?._id;
      if (!gId) return;
      map[gId] = (map[gId] || 0) + p.points;
    });
    return map;
  }, [pointLogs]);

  const tribes = useMemo(() => {
    return tribeList.map(t => ({
      ...t,
      score: scores[t.id] || 0
    })).sort((a, b) => b.score - a.score);
  }, [tribeList, scores]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.groupId) return toast.error('Select tribe');
    setIsSubmitting(true);
    try {
      const res = await api.post('/api/points', formData);
      syncPointLog('added', res.data);
      toast.success(isAdmin ? 'Verified!' : 'Submitted');
      setFormData(prev => ({ ...prev, reason: '', points: 0 }));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateReason = async (logId: string) => {
    if (!editValue.trim()) return;
    try {
      const res = await api.put(`/api/points/${logId}`, { reason: editValue });
      syncPointLog('updated', res.data);
      setEditingId(null);
      toast.success('Updated');
    } catch (err: any) {
      toast.error('Failed to update');
    }
  };

  const handleVerify = async (logId: string) => {
    try {
      const res = await api.put(`/api/points/${logId}/verify`);
      syncPointLog('updated', res.data);
      toast.success('Verified');
    } catch (err: any) {
      toast.error('Failed');
    }
  };

  const handleDelete = async (logId: string) => {
    if (!window.confirm('Delete?')) return;
    try {
      await api.delete(`/api/points/${logId}`);
      syncPointLog('deleted', { id: logId, _id: logId });
      toast.success('Deleted');
    } catch (err: any) {
      toast.error('Failed');
    }
  };

  const filteredHistory = pointLogs.filter(log => {
      const term = searchQuery.toLowerCase();
      return (
        log.groupId?.name.toLowerCase().includes(term) ||
        log.reason.toLowerCase().includes(term) ||
        log.createdBy?.church?.toLowerCase().includes(term)
      );
  });

  const pendingCount = pointLogs.filter(p => !p.verified).length;

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-in fade-in duration-500 pb-10">
      {/* Mini Header (Unified Stream) */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-brand-sand/30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-brown text-white rounded-xl shadow-md">
            <Trophy size={18} />
          </div>
          <div>
            <h1 className="text-xl font-display text-brand-brown tracking-tight">Merit Management</h1>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter -mt-1 underline decoration-brand-sand">Live Operations Feed</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
           {pendingCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-lg border border-amber-100 animate-pulse">
                <Clock size={12} className="stroke-[3]" />
                <span className="text-[10px] font-black uppercase tracking-widest">{pendingCount} PENDING ACTION</span>
              </div>
           )}
           <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg border border-gray-100 text-gray-400">
              <HistoryIcon size={12} />
              <span className="text-[10px] font-black uppercase tracking-widest">REAL-TIME SYNC</span>
           </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* TOP: FORM (Condensed Row) */}
        {canAdd && (
          <div className="bg-white rounded-2xl p-4 border border-brand-sand shadow-sm transition-all hover:shadow-md">
             <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
               <div className="flex-1 w-full space-y-1">
                 <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Tribe / Category</label>
                 <select 
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-brand-beige focus:border-brand-brown outline-none bg-gray-50/50 font-bold"
                  value={formData.groupId}
                  onChange={e => setFormData({...formData, groupId: e.target.value})}
                >
                  <option value="" disabled>Select Tribe...</option>
                  {tribeList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
               </div>

               <div className="flex-1 w-full flex items-center gap-2">
                 <button 
                  type="button"
                  onClick={() => setFormData({...formData, type: 'merit'})}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black border-2 transition-all ${
                    formData.type === 'merit' ? 'border-brand-brown bg-brand-brown text-white shadow-sm' : 'border-gray-100 text-gray-400 opacity-50'
                  }`}
                 >MERIT</button>
                 <button 
                  type="button"
                  onClick={() => setFormData({...formData, type: 'demerit'})}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black border-2 transition-all ${
                    formData.type === 'demerit' ? 'border-red-500 bg-red-500 text-white shadow-sm' : 'border-gray-100 text-gray-400 opacity-50'
                  }`}
                 >DEMERIT</button>
               </div>

               <div className="flex-[1.5] w-full space-y-1">
                 <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Point Increments (Additive)</label>
                 <div className="flex flex-wrap gap-1.5">
                    {[20, 50, 100, 200, 500, 1000].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, points: p.points + val }))}
                        className="px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-[10px] font-black text-brand-brown transition-all active:scale-95"
                      >
                        +{val}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, points: 0 }))}
                      className="px-2.5 py-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white border border-red-100 rounded-lg text-[10px] font-black transition-all"
                    >
                      CLEAR
                    </button>
                 </div>
               </div>

               <div className="w-full md:w-32 space-y-1">
                 <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 text-center block">Total Points</label>
                 <div className="flex items-center justify-center p-2 bg-brand-cream/20 border border-brand-sand/30 rounded-xl">
                    <span className={`text-xl font-display leading-none ${formData.type === 'merit' ? 'text-green-500' : 'text-red-500'}`}>
                      {formData.type === 'merit' ? '+' : '-'}{formData.points}
                    </span>
                 </div>
               </div>

               <div className="flex-[1.5] w-full space-y-1">
                  <input 
                    required
                    placeholder="Short justification of action..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-brand-beige focus:border-brand-brown outline-none"
                    value={formData.reason}
                    onChange={e => setFormData({...formData, reason: e.target.value})}
                  />
               </div>

               <button 
                 type="submit"
                 disabled={isSubmitting}
                 className="px-6 py-2 bg-brand-brown text-white text-xs font-black rounded-xl hover:bg-brand-light-brown active:scale-95 transition-all shadow-md h-[38px] min-w-[80px]"
               >
                 {isSubmitting ? '...' : (isAdmin ? 'GRANT' : 'POST')}
               </button>
             </form>
          </div>
        )}

        {/* MIDDLE: LOGS (Unified Activity Stream) */}
        <div className="bg-white rounded-2xl border border-brand-sand shadow-sm overflow-hidden flex flex-col min-h-[40vh] max-h-[60vh]">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-brand-brown uppercase tracking-widest">Unified Activity Stream</span>
             </div>
             <div className="relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300" />
                <input 
                  type="text" placeholder="Search..." 
                  className="pl-7 pr-3 py-1 text-[10px] rounded-lg border border-gray-200 outline-none w-32 focus:w-48 transition-all"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
             </div>
          </div>

          <div className="overflow-y-auto divide-y divide-gray-50 custom-scrollbar">
             {filteredHistory.map(log => (
               <div 
                 key={log.id || log._id} 
                 className={`p-3 flex items-center justify-between gap-4 group transition-colors ${!log.verified ? 'bg-amber-50/30' : 'hover:bg-brand-cream/5'}`}
               >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                     <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                       log.type === 'merit' ? 'bg-green-50 border-green-100 text-green-500' : 'bg-red-50 border-red-100 text-red-500'
                     }`}>
                        {log.type === 'merit' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                     </div>
                     
                     <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-gray-700 truncate">{log.groupId?.name}</span>
                          {!log.verified && (
                             <span className="bg-amber-100 text-amber-700 text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">PENDING ACTION</span>
                          )}
                        </div>
                        
                        {editingId === (log.id || log._id) ? (
                          <div className="flex items-center gap-1 mt-1">
                             <input 
                               autoFocus
                               className="text-xs px-2 py-0.5 border border-brand-brown rounded outline-none w-full"
                               value={editValue}
                               onChange={e => setEditValue(e.target.value)}
                               onKeyDown={e => e.key === 'Enter' && handleUpdateReason(log.id || log._id!)}
                             />
                             <button onClick={() => handleUpdateReason(log.id || log._id!)} className="p-1 text-green-500"><Check size={12} /></button>
                             <button onClick={() => setEditingId(null)} className="p-1 text-red-500"><X size={12} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-gray-500 leading-tight truncate">{log.reason}</p>
                            {(currentUser?.role === 'admin' || log.createdBy?._id === currentUser?._id) && (
                              <button 
                                onClick={() => { setEditingId(log.id || log._id!); setEditValue(log.reason); }}
                                className="text-gray-300 hover:text-brand-brown opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Edit3 size={10} />
                              </button>
                            )}
                          </div>
                        )}
                        
                        <div className="text-[9px] text-gray-400 mt-0.5 flex gap-2">
                          <span>{log.createdBy?.church || 'Unknown Staff'}</span>
                          <span>{format(new Date(log.createdAt), 'MMM d, HH:mm')}</span>
                        </div>
                     </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-right">
                     <span className={`text-xl font-display leading-none ${log.points > 0 ? 'text-green-500' : 'text-red-500'}`}>
                       {log.points > 0 ? `+${log.points}` : log.points}
                     </span>

                     <div className="flex items-center gap-1 border-l border-gray-100 pl-3">
                        {!log.verified && canVerify && (
                          <button 
                            onClick={() => handleVerify(log.id || log._id!)}
                            className="p-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 shadow-sm transition-all"
                          ><Check size={14} className="stroke-[3]" /></button>
                        )}
                        {(isAdmin || rolePerms?.points?.delete) && (
                          <button 
                            onClick={() => handleDelete(log.id || log._id!)}
                            className="p-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-md transition-all"
                          ><Trash2 size={14} /></button>
                        )}
                     </div>
                  </div>
               </div>
             ))}
             {filteredHistory.length === 0 && (
                <div className="py-20 text-center text-xs text-gray-300 italic">No activity logs recorded yet.</div>
             )}
          </div>
        </div>

        {/* BOTTOM: SCOREBOARD (Mini Table Mode) */}
        <div className="bg-white rounded-2xl border border-brand-sand shadow-sm overflow-hidden">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-brand-cream/20">
             <div className="flex items-center gap-2">
                <Trophy size={14} className="text-brand-sand" />
                <span className="text-[10px] font-black text-brand-brown uppercase tracking-widest">Camp Leaderboard</span>
             </div>
             <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">verified scores only</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 divide-x divide-y divide-gray-50">
             {tribes.map((tribe, idx) => (
               <div key={tribe.id} className="p-4 flex flex-col items-center justify-center text-center group hover:bg-brand-cream/10 transition-colors">
                  <span className={`text-[10px] font-black mb-1 px-2 py-0.5 rounded-full ${
                      idx === 0 ? 'bg-amber-100 text-amber-600' :
                      idx === 1 ? 'bg-gray-100 text-gray-400' :
                      idx === 2 ? 'bg-orange-50 text-orange-600' :
                      'text-gray-300'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-gray-700 truncate w-full mb-1">{tribe.name}</span>
                  <span className={`text-2xl font-display tracking-tight leading-none ${tribe.score >= 0 ? 'text-brand-brown font-bold' : 'text-red-500 font-bold'}`}>
                    {tribe.score}
                  </span>
               </div>
             ))}
             {tribes.length === 0 && <div className="col-span-full py-16 text-center text-xs text-gray-400 uppercase font-black tracking-widest">No Tribes Found</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
