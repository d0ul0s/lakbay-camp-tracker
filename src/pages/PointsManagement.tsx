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

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmLogId, setConfirmLogId] = useState<string | null>(null);

  const pendingCount = pointLogs.filter(p => !p.verified).length;

  const handleDeleteClick = (id: string) => {
    setConfirmLogId(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (!confirmLogId) return;
    try {
      await api.delete(`/api/points/${confirmLogId}`);
      syncPointLog('deleted', { id: confirmLogId, _id: confirmLogId });
      toast.success('Log Expunged');
    } catch (err: any) {
      toast.error('Failed to Delete');
    } finally {
      setShowConfirm(false);
      setConfirmLogId(null);
    }
  };

  const filteredHistory = useMemo(() => {
    return pointLogs.filter(log => {
      const term = searchQuery.toLowerCase();
      return (
        log.groupId?.name.toLowerCase().includes(term) ||
        log.reason.toLowerCase().includes(term) ||
        log.createdBy?.church?.toLowerCase().includes(term)
      );
    });
  }, [pointLogs, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-in fade-in duration-500 pb-10">
      {/* CUSTOM CONFIRMATION MODAL */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-brand-brown/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl border-4 border-white w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
             <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center text-red-500 shadow-inner">
                   <Trash2 size={40} className="animate-bounce" />
                </div>
                <div className="space-y-2">
                   <h3 className="text-2xl font-display text-brand-brown uppercase">Permanently Delete?</h3>
                   <p className="text-xs font-black text-gray-400 uppercase tracking-widest leading-relaxed">
                      This action will immediately remove this entry from the verified registry and audit logs.
                   </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                   <button 
                     onClick={() => setShowConfirm(false)}
                     className="flex-1 py-4 rounded-2xl bg-gray-100 text-[10px] font-black uppercase text-gray-400 hover:bg-gray-200 transition-all"
                   >
                      Cancel Action
                   </button>
                   <button 
                     onClick={confirmDelete}
                     className="flex-1 py-4 rounded-2xl bg-red-500 text-[10px] font-black uppercase text-white hover:bg-red-600 shadow-xl shadow-red-500/20 active:scale-95 transition-all"
                   >
                      Expunge Entry
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
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
          <div className="bg-white rounded-2xl p-6 border border-brand-sand shadow-sm transition-all hover:shadow-md">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-brown/40 uppercase tracking-[0.2em] ml-1">Target Tribe</label>
                  <select 
                    required
                    className="w-full bg-brand-cream/40 border-2 border-brand-beige rounded-2xl px-5 py-4 focus:ring-2 focus:ring-brand-brown focus:border-transparent outline-none font-bold text-sm shadow-sm transition-all"
                    value={formData.groupId}
                    onChange={e => setFormData({...formData, groupId: e.target.value})}
                  >
                    <option value="" disabled>Select Tribe...</option>
                    {tribeList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-brown/40 uppercase tracking-[0.2em] ml-1">Adjustment Type</label>
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, type: 'merit'})}
                      className={`flex-1 py-4 rounded-2xl text-xs font-black border-2 transition-all shadow-sm ${
                        formData.type === 'merit' ? 'border-brand-brown bg-brand-brown text-white shadow-brand-brown/20' : 'border-gray-100 text-gray-400 bg-gray-50/50'
                      }`}
                    >MERIT (+)</button>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, type: 'demerit'})}
                      className={`flex-1 py-4 rounded-2xl text-xs font-black border-2 transition-all shadow-sm ${
                        formData.type === 'demerit' ? 'border-red-500 bg-red-500 text-white shadow-red-500/20' : 'border-gray-100 text-gray-400 bg-gray-50/50'
                      }`}
                    >DEMERIT (-)</button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-brand-brown/40 uppercase tracking-[0.2em] ml-1 block">Point Chips (Tap to Stack)</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[20, 50, 100, 200, 500, 1000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, points: p.points + val }))}
                      className="py-4 bg-white hover:bg-brand-brown hover:text-white border-2 border-brand-beige rounded-2xl text-sm font-black text-brand-brown transition-all active:scale-95 shadow-sm"
                    >
                      +{val}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, points: 0 }))}
                  className="w-full py-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white border-2 border-red-100 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Reset Current Selection
                </button>
              </div>

              <div className="flex flex-col md:flex-row gap-6 items-center bg-brand-sand/5 p-6 rounded-[2.5rem] border border-brand-sand/10">
                <div className="flex-1 w-full space-y-2">
                  <label className="text-[10px] font-black text-brand-brown/40 uppercase tracking-[0.2em] ml-1">Reason / Context</label>
                  <input 
                    required
                    placeholder="Why is this point being logged?"
                    className="w-full bg-white border-2 border-brand-beige rounded-2xl px-6 py-4 focus:ring-2 focus:ring-brand-brown focus:border-transparent outline-none text-sm font-medium shadow-sm"
                    value={formData.reason}
                    onChange={e => setFormData({...formData, reason: e.target.value})}
                  />
                </div>

                <div className="shrink-0 flex flex-col items-center">
                  <label className="text-[10px] font-black text-brand-brown/40 uppercase tracking-[0.2em] mb-2">Final Change</label>
                  <div className="bg-white border-2 border-brand-sand rounded-3xl px-8 py-4 shadow-inner">
                    <span className={`text-4xl font-display leading-none ${formData.type === 'merit' ? 'text-green-600' : 'text-red-500'}`}>
                      {formData.type === 'merit' ? '+' : '-'}{formData.points}
                    </span>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting || formData.points === 0}
                  className="w-full md:w-auto px-10 py-5 bg-brand-brown text-white text-sm font-black rounded-3xl hover:bg-brand-light-brown active:scale-95 transition-all shadow-xl shadow-brand-brown/20 disabled:opacity-30 disabled:grayscale h-auto"
                >
                  {isSubmitting ? 'SAVING...' : (isAdmin ? 'APPROVE LOG' : 'POST ENTRY')}
                </button>
              </div>
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
                            onClick={() => handleDeleteClick(log.id || log._id!)}
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
