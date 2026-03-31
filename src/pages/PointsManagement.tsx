import { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  PlusCircle, 
  Clock, 
  History as HistoryIcon, 
  Search, 
  TrendingUp, 
  TrendingDown,
  ShieldCheck,
  Trash2,
  Check
} from 'lucide-react';
import { useAppStore } from '../store';
import api from '../api/axios';
import { format, isToday } from 'date-fns';
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
  const [activeView, setActiveView] = useState<'scoreboard' | 'history' | 'verify'>('scoreboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [tribeList, setTribeList] = useState<{ id: string; name: string }[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    groupId: '',
    type: 'merit' as 'merit' | 'demerit',
    points: 5,
    reason: ''
  });

  const isAdmin = currentUser?.role === 'admin';
  const rolePerms = currentUser?.permissionMatrix?.[currentUser.role!];
  const canAdd = isAdmin || rolePerms?.points?.add;
  const canVerify = isAdmin || rolePerms?.points?.verify;

  useEffect(() => {
    fetchPointLogs(pointLogs.length > 0);
    fetchGlobalSettings(true);
    
    // Fetch Tribes/Groups for the dropdown
    api.get('/api/org/groups').then(res => {
      if (Array.isArray(res.data)) {
        setTribeList(res.data.map((g: any) => ({
          id: g.id || g._id,
          name: g.name
        })));
      }
    }).catch(err => console.error("Failed to fetch tribes for pointing", err));
  }, []);

  // Calculate Scores (Only Verified Points)
  const scores = useMemo(() => {
    const map: Record<string, number> = {};
    pointLogs.filter(p => p.verified).forEach(p => {
      const gId = p.groupId?.id || p.groupId?._id;
      if (!gId) return;
      map[gId] = (map[gId] || 0) + p.points;
    });
    return map;
  }, [pointLogs]);

  // Daily Merit Quota Calculation
  const dailyMeritUsed = useMemo(() => {
    if (!currentUser?._id) return 0;
    return pointLogs
      .filter(p => p.type === 'merit' && p.createdBy?._id === currentUser._id && isToday(new Date(p.createdAt)))
      .reduce((sum, p) => sum + Math.abs(p.points), 0);
  }, [pointLogs, currentUser?._id]);

  const QUOTA = 50;
  const remainingQuota = Math.max(0, QUOTA - dailyMeritUsed);

  // Tribes with Scores for Leaderboard
  const tribes = useMemo(() => {
    return tribeList.map(t => ({
      ...t,
      score: scores[t.id] || 0
    })).sort((a, b) => b.score - a.score);
  }, [tribeList, scores]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.groupId) return toast.error('Please select a tribe');
    if (formData.points <= 0) return toast.error('Points must be greater than zero');
    if (formData.type === 'merit' && !isAdmin && formData.points > remainingQuota) {
      return toast.error(`Quota exceeded! You only have ${remainingQuota} merit points left today.`);
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/api/points', formData);
      syncPointLog('added', res.data);
      toast.success(isAdmin ? 'Points added and verified!' : 'Points submitted for admin verification');
      setFormData(prev => ({ ...prev, reason: '', points: 5 }));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit points');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (logId: string) => {
    try {
      const res = await api.put(`/api/points/${logId}/verify`);
      syncPointLog('updated', res.data);
      toast.success('Points verified!');
    } catch (err: any) {
      toast.error('Verification failed');
    }
  };

  const handleDelete = async (logId: string) => {
    if (!window.confirm('Are you sure you want to delete this point entry?')) return;
    try {
      await api.delete(`/api/points/${logId}`);
      syncPointLog('deleted', { id: logId, _id: logId });
      toast.success('Entry removed');
    } catch (err: any) {
      toast.error('Deletion failed');
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
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-brand-brown text-white rounded-[2rem] shadow-xl shadow-brand-brown/20 rotate-3">
            <Trophy size={32} />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-display text-brand-brown tracking-tight">Merit & Demerit</h1>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-1">Live Tribe Pointing Management</p>
          </div>
        </div>

        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-brand-sand/30">
          {[
            { id: 'scoreboard', label: 'Scoreboard', icon: <Trophy size={16} /> },
            { id: 'history', label: 'All Logs', icon: <HistoryIcon size={16} /> },
            { id: 'verify', label: 'Pending', icon: <Clock size={16} />, count: pendingCount }
          ].map(view => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id as any)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeView === view.id 
                  ? 'bg-brand-brown text-white shadow-md' 
                  : 'text-gray-400 hover:text-brand-brown hover:bg-brand-sand/10'
              }`}
            >
              {view.icon}
              {view.label}
              {view.count ? (
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeView === view.id ? 'bg-white text-brand-brown' : 'bg-red-500 text-white'}`}>
                  {view.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & Statistics */}
        <div className="xl:col-span-4 space-y-6">
          {canAdd && (
            <div className="bg-white rounded-[2.5rem] p-8 border border-brand-sand shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden relative group">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-brand-sand/10 rounded-full blur-2xl group-hover:bg-brand-sand/20 transition-all"></div>
              
              <h3 className="text-xl font-display text-brand-brown mb-6 flex items-center gap-2">
                <PlusCircle className="text-brand-sand" size={24} /> Submit Points
              </h3>

              <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Tribe</label>
                  <select 
                    required
                    className="w-full px-5 py-4 rounded-2xl border-2 border-brand-beige focus:border-brand-brown focus:outline-none appearance-none bg-white font-bold text-gray-700"
                    value={formData.groupId}
                    onChange={e => setFormData({...formData, groupId: e.target.value})}
                  >
                    <option value="" disabled>Choose a group...</option>
                    {tribes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, type: 'merit'})}
                    className={`flex-1 py-4 rounded-2xl border-2 font-black text-sm transition-all flex flex-col items-center gap-1 ${
                      formData.type === 'merit' 
                        ? 'border-brand-brown bg-brand-brown text-white shadow-lg' 
                        : 'border-brand-beige text-gray-400 hover:border-brand-sand'
                    }`}
                  >
                    <TrendingUp size={20} />
                    MERIT
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, type: 'demerit'})}
                    className={`flex-1 py-4 rounded-2xl border-2 font-black text-sm transition-all flex flex-col items-center gap-1 ${
                      formData.type === 'demerit' 
                        ? 'border-red-500 bg-red-500 text-white shadow-lg' 
                        : 'border-brand-beige text-gray-400 hover:border-brand-sand'
                    }`}
                  >
                    <TrendingDown size={20} />
                    DEMERIT
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Points Value</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" min="1" max="50" step="1"
                      className="flex-1 accent-brand-brown"
                      value={formData.points}
                      onChange={e => setFormData({...formData, points: parseInt(e.target.value)})}
                    />
                    <span className="w-16 h-12 bg-brand-cream rounded-xl flex items-center justify-center font-black text-brand-brown text-xl border border-brand-sand/30">
                      {formData.points}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Justification</label>
                  <textarea 
                    required rows={3}
                    placeholder="Describe why points were given/taken..."
                    className="w-full px-5 py-4 rounded-2xl border-2 border-brand-beige focus:border-brand-brown focus:outline-none transition-all text-sm leading-relaxed"
                    value={formData.reason}
                    onChange={e => setFormData({...formData, reason: e.target.value})}
                  />
                </div>

                {!isAdmin && (
                  <div className={`p-4 rounded-2xl flex items-center justify-between border ${remainingQuota <= 10 ? 'bg-red-50 border-red-100' : 'bg-brand-cream/50 border-brand-sand/50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${remainingQuota <= 10 ? 'bg-red-100 text-red-600' : 'bg-white text-brand-brown'}`}>
                        <TrendingUp size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Daily Merit Left</span>
                        <span className={`text-sm font-black leading-none ${remainingQuota <= 10 ? 'text-red-500' : 'text-brand-brown'}`}>{remainingQuota} pts</span>
                      </div>
                    </div>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={isSubmitting || (!isAdmin && formData.type === 'merit' && remainingQuota < formData.points)}
                  className="w-full py-5 bg-brand-brown text-white font-black text-lg rounded-2xl hover:bg-brand-light-brown transition-all shadow-xl active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting ? 'PROCESSING...' : (isAdmin ? 'GRANT POINTS' : 'SUBMIT FOR AUDIT')}
                </button>
              </form>
            </div>
          )}

          {/* Quick Stats */}
          <div className="bg-brand-brown rounded-[2rem] p-6 text-white shadow-xl flex items-center justify-between overflow-hidden relative">
            <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Total Activity</p>
              <h4 className="text-3xl font-display tracking-wide">{pointLogs.length} Entries</h4>
            </div>
            <Trophy className="opacity-10" size={64} />
          </div>
        </div>

        {/* Right Column: Scoreboard or Audit Log */}
        <div className="xl:col-span-8">
          {activeView === 'scoreboard' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tribes.map((tribe, idx) => (
                <div 
                  key={tribe.id} 
                  className="bg-white rounded-[2.5rem] p-1 border border-brand-sand group hover:shadow-2xl transition-all duration-700"
                >
                  <div className="p-7 flex items-center justify-between relative overflow-hidden">
                    {idx < 3 && (
                      <div className="absolute top-0 right-0 p-2 opacity-5 scale-150 rotate-12">
                        <Trophy size={100} />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-5 relative z-10">
                      <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center font-display text-4xl shadow-inner ${
                        idx === 0 ? 'bg-amber-100 text-amber-600' :
                        idx === 1 ? 'bg-gray-100 text-gray-400' :
                        idx === 2 ? 'bg-orange-100 text-orange-600' :
                        'bg-brand-cream text-brand-brown/40'
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-2xl font-display text-brand-brown tracking-tight">{tribe.name}</h4>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tribe Standings</p>
                      </div>
                    </div>

                    <div className="text-right relative z-10">
                      <p className={`text-5xl font-display tracking-tight leading-none ${tribe.score >= 0 ? 'text-brand-brown' : 'text-red-500'}`}>
                        {tribe.score}
                      </p>
                      <span className="text-[9px] font-black text-gray-300 uppercase tracking-tighter">Total Pts</span>
                    </div>
                  </div>
                  
                  {/* Recent Activity Mini-List */}
                  <div className="bg-gray-50/50 rounded-[2.25rem] p-4 m-1 mt-0">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 px-3">Recent Movement</p>
                    <div className="space-y-2">
                      {pointLogs
                        .filter(p => (p.groupId?.id || p.groupId?._id) === tribe.id && p.verified)
                        .slice(0, 3)
                        .map(log => (
                          <div key={log.id || log._id} className="bg-white p-3 rounded-2xl flex items-center justify-between border border-gray-100 shadow-sm">
                             <div className="flex items-center gap-3 min-w-0">
                               <div className={`p-1.5 rounded-lg ${log.type === 'merit' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                 {log.type === 'merit' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                               </div>
                               <p className="text-xs text-gray-500 truncate font-medium">{log.reason}</p>
                             </div>
                             <span className={`text-sm font-black ${log.type === 'merit' ? 'text-green-500' : 'text-red-500'}`}>
                               {log.points > 0 ? `+${log.points}` : log.points}
                             </span>
                          </div>
                      ))}
                      {pointLogs.filter(p => (p.groupId?.id || p.groupId?._id) === tribe.id && p.verified).length === 0 && (
                        <p className="text-[10px] text-gray-300 italic text-center py-2">No verified activity yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {tribes.length === 0 && (
                <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border-4 border-dashed border-brand-sand/20">
                    <Clock size={64} className="mx-auto text-brand-sand/20 mb-6" />
                    <h3 className="text-2xl font-display text-gray-400">Scoreboard Empty</h3>
                    <p className="text-gray-400 mt-2">Initialize tribes in the Organization page to begin pointing.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-brand-sand overflow-hidden flex flex-col max-h-screen">
               <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-display text-brand-brown tracking-tight">
                      {activeView === 'verify' ? 'Verification Queue' : 'Activity Audit Log'}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                      {activeView === 'verify' ? 'Pending admin approval' : 'Complete history of camp points'}
                    </p>
                  </div>
                  <div className="relative group flex-1 max-w-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-brand-brown" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search reasons or tribes..."
                      className="w-full pl-12 pr-6 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-brand-brown focus:bg-white transition-all text-sm"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
               </div>

               <div className="overflow-y-auto custom-scrollbar flex-1">
                 {(activeView === 'verify' ? pointLogs.filter(p => !p.verified) : filteredHistory).length > 0 ? (
                    <div className="divide-y divide-gray-50">
                      {(activeView === 'verify' ? pointLogs.filter(p => !p.verified) : filteredHistory).map(log => (
                        <div key={log.id || log._id} className="p-6 hover:bg-brand-cream/10 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-5">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 ${
                              log.type === 'merit' ? 'bg-green-50 border-green-100 text-green-500' : 'bg-red-50 border-red-100 text-red-500'
                            }`}>
                              {log.type === 'merit' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                            </div>
                            <div className="min-w-0">
                               <div className="flex items-center gap-3 mb-1">
                                 <h5 className="font-display text-lg text-brand-brown">{log.groupId?.name}</h5>
                                 <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                   log.verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                 }`}>
                                   {log.verified ? 'Verified' : 'Pending'}
                                 </span>
                               </div>
                               <p className="text-sm text-gray-500 leading-tight mb-2">{log.reason}</p>
                               <div className="flex items-center gap-4 text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                                  <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md">
                                    <ShieldCheck size={12} /> {log.createdBy?.role}: {log.createdBy?.church}
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <Clock size={12} /> {format(new Date(log.createdAt), 'MMM d, h:mm a')}
                                  </span>
                               </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 sm:text-right shrink-0">
                             <div className="text-right">
                               <p className={`text-4xl font-display tracking-tight leading-none ${log.points > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                 {log.points > 0 ? `+${log.points}` : log.points}
                               </p>
                               <span className="text-[9px] font-black text-gray-300 uppercase">Movement</span>
                             </div>

                             {isAdmin && (
                               <div className="flex items-center gap-2">
                                 {!log.verified && canVerify && (
                                   <button 
                                     onClick={() => handleVerify(log.id || log._id!)}
                                     title="Approve Points"
                                     className="p-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all shadow-md active:scale-90"
                                   >
                                     <Check size={20} className="stroke-[3]" />
                                   </button>
                                 )}
                                 {rolePerms?.points?.delete && (
                                   <button 
                                      onClick={() => handleDelete(log.id || log._id!)}
                                      title="Delete Entry"
                                      className="p-3 bg-red-50 text-red-500 border border-red-100 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-90"
                                   >
                                      <Trash2 size={20} />
                                   </button>
                                 )}
                               </div>
                             )}
                          </div>
                        </div>
                      ))}
                    </div>
                 ) : (
                    <div className="py-32 text-center">
                       <HistoryIcon size={48} className="mx-auto text-gray-100 mb-4" />
                       <p className="text-gray-400 font-medium">No activity matching your search or filters.</p>
                       <button onClick={() => setSearchQuery('')} className="text-brand-brown font-bold text-xs mt-2 underline">Clear Search</button>
                    </div>
                 )}
               </div>

               {activeView === 'verify' && (
                 <div className="p-4 bg-amber-50 border-t border-amber-100 text-[10px] font-bold text-amber-700 uppercase tracking-widest text-center">
                    Internal System Audit • Admin Oversight Required for Score Updates
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
