import { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store';
import api from '../api/axios';
import { 
  Trophy, 
  Star, 
  Map, 
  CheckCircle, 
  Save, 
  RefreshCw, 
  Lock, 
  Plus, 
  Trash2, 
  Search, 
  Info,
  ShieldCheck,
  Zap,
  LayoutGrid,
  ClipboardList,
  BarChart,
  Loader2,
  Settings,
  X,
  Minus,
  Cloud,
  RotateCcw
} from 'lucide-react';
import type { Registrant, TribeProposal } from '../types';
import toast from 'react-hot-toast';

type Tab = 'grading' | 'sorter' | 'comparison';

export default function TribeSorter() {
  const { currentUser, appSettings, fetchGlobalSettings } = useAppStore();
  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  const [activeTab, setActiveTab] = useState<Tab>('grading');
  const [registrants, setRegistrants] = useState<Registrant[]>([]);
  const [proposals, setProposals] = useState<TribeProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [proposalName, setProposalName] = useState('');
  const [showUnscoredOnly, setShowUnscoredOnly] = useState(false);

  // Sorter State
  const [groupCount, setGroupCount] = useState(10);
  const [tribeNames, setTribeNames] = useState<Record<number, string>>({});
  const [currentProposal, setCurrentProposal] = useState<Partial<TribeProposal> | null>(null);
  const [localScores, setLocalScores] = useState<Record<string, { spirituality: number, build: number, lockedTribe: string | null }>>({});

  // Refs for tracking initial load vs updates
  const isInitialLoad = useRef(true);
  const syncTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchData();
    if (!appSettings) fetchGlobalSettings();
  }, []);

  // Auto-sync effect
  useEffect(() => {
    if (isInitialLoad.current) return;
    
    // Debounce sync to server
    if (syncTimeout.current) clearTimeout(syncTimeout.current);
    
    syncTimeout.current = setTimeout(() => {
      syncDraftToCloud();
    }, 2000);

    return () => {
      if (syncTimeout.current) clearTimeout(syncTimeout.current);
    };
  }, [activeTab, groupCount, tribeNames, currentProposal, localScores]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [regRes, propRes, draftRes] = await Promise.all([
        api.get('/api/org/registrants'),
        api.get('/api/tribe-proposals'),
        api.get('/api/org/sorter/draft')
      ]);
      
      setRegistrants(regRes.data);
      setProposals(propRes.data);

      const draft = draftRes.data;
      
      // 1. Initialize scores from draft OR server
      const scores: Record<string, any> = {};
      const draftScores = draft?.localScores || {};
      
      regRes.data.forEach((r: Registrant) => {
        const dScore = draftScores[r.id];
        scores[r.id] = {
          spirituality: dScore?.spirituality ?? (r.spirituality || 1),
          build: dScore?.build ?? (r.build || 1),
          lockedTribe: dScore?.lockedTribe ?? (r.lockedTribe || null)
        };
      });
      
      setLocalScores(scores);

      // 2. Initialize other UI states from draft
      if (draft) {
        if (draft.activeTab) setActiveTab(draft.activeTab as Tab);
        if (draft.groupCount) setGroupCount(draft.groupCount);
        if (draft.tribeNames) setTribeNames(draft.tribeNames);
        if (draft.currentProposal) setCurrentProposal(draft.currentProposal);
        if (draft.updatedAt) setLastSyncedAt(new Date(draft.updatedAt));
      }

      // Mark initial load as complete AFTER state is set
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 500);

    } catch (err) {
      console.error('Failed to fetch sorter data', err);
      toast.error('Failed to load participants or cloud draft.');
    } finally {
      setIsLoading(false);
    }
  };

  const syncDraftToCloud = async () => {
    if (!isAdmin) return;
    setIsSyncing(true);
    try {
      const res = await api.put('/api/org/sorter/draft', {
        activeTab,
        groupCount,
        tribeNames,
        currentProposal,
        localScores
      });
      setLastSyncedAt(new Date(res.data.updatedAt));
    } catch (err) {
      console.error('Sync failed', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const resetDraft = async () => {
    if (!window.confirm('Reset all sorter work and sync with LIVE data? This cannot be undone.')) return;
    
    setIsLoading(true);
    try {
      await api.delete('/api/org/sorter/draft');
      isInitialLoad.current = true;
      await fetchData();
      toast.success('Sorter draft reset to server defaults.');
    } catch (err) {
      toast.error('Failed to reset draft.');
    } finally {
      setIsLoading(false);
    }
  };

  const hasUnsavedChanges = useMemo(() => {
    return registrants.some(r => {
      const local = localScores[r.id];
      if (!local) return false;
      return local.spirituality !== (r.spirituality || 1) || 
             local.build !== (r.build || 1) || 
             local.lockedTribe !== (r.lockedTribe || null);
    });
  }, [registrants, localScores]);

  const handleUpdateScore = (id: string, field: 'spirituality' | 'build', value: number) => {
    setLocalScores(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleToggleLock = (id: string, tribeName: string | null) => {
    setLocalScores(prev => ({
      ...prev,
      [id]: { ...prev[id], lockedTribe: tribeName }
    }));
  };

  const generateProposals = () => {
    // 1. Initialize tribes
    const tribes: { name: string, members: string[] }[] = [];
    for (let i = 1; i <= groupCount; i++) {
        const name = tribeNames[i] || `Tribe ${i}`;
        tribes.push({ name, members: [] });
    }

    // 2. Separate into Locked vs Unlocked (Exclude JAM)
    const pool = registrants
        .filter(r => (r.church || '').toUpperCase().trim() !== 'JAM')
        .map(r => ({
            ...r,
            spirituality: localScores[r.id]?.spirituality || 1,
            build: localScores[r.id]?.build || 1,
            lockedTribe: localScores[r.id]?.lockedTribe || null
        }));

    // 3. Place Locked first
    pool.filter(p => p.lockedTribe).forEach(p => {
        const target = tribes.find(t => t.name === p.lockedTribe);
        if (target) {
            target.members.push(p.fullName);
        } else {
            // If the locked tribe doesn't exist among the N groups, put it in Tribe 1 or something?
            const first = tribes[0];
            if (first) first.members.push(p.fullName);
        }
    });

    // 4. Distribute the rest
    const remaining = pool.filter(p => !p.lockedTribe);
    
    // Sort remaining by complexity (more frequent churches first to spread them out better)
    const churchCounts: Record<string, number> = {};
    remaining.forEach(p => { churchCounts[p.church] = (churchCounts[p.church] || 0) + 1; });
    
    const sortedRemaining = [...remaining].sort((a, b) => {
        const countA = churchCounts[a.church] || 0;
        const countB = churchCounts[b.church] || 0;
        if (countA !== countB) return countB - countA;
        
        const complexityA = a.spirituality + a.build;
        const complexityB = b.spirituality + b.build;
        if (complexityA !== complexityB) return complexityB - complexityA;
        
        // Final tie-breaker: Alphabetical stable sort
        return (a.fullName || '').localeCompare(b.fullName || '');
    });

    // Distribute
    sortedRemaining.forEach(p => {
        // Find best tribe for this person
        const bestTribe = [...tribes].sort((a, b) => {
            // Count members from same church
            const sameChurchA = pool.filter(member => a.members.includes(member.fullName) && member.church === p.church).length;
            const sameChurchB = pool.filter(member => b.members.includes(member.fullName) && member.church === p.church).length;

            if (a.members.length !== b.members.length) return a.members.length - b.members.length;
            if (sameChurchA !== sameChurchB) return sameChurchA - sameChurchB;

            // Calculate current metrics
            const calcAvg = (t: typeof a) => {
               const mData = pool.filter(m => t.members.includes(m.fullName));
               if (mData.length === 0) return 0;
               return mData.reduce((sum, curr) => sum + curr.spirituality + curr.build, 0) / mData.length;
            };
            return calcAvg(a) - calcAvg(b);
        })[0];

        bestTribe.members.push(p.fullName);
    });

    // 5. Calculate final metrics
    const metrics: Record<string, any> = {};
    tribes.forEach(t => {
        const mData = pool.filter(m => t.members.includes(m.fullName));
        metrics[t.name] = {
            avgSpirituality: mData.reduce((s, c) => s + c.spirituality, 0) / (mData.length || 1),
            avgBuild: mData.reduce((s, c) => s + c.build, 0) / (mData.length || 1),
            churchSpread: Array.from(new Set(mData.map(m => m.church))).length,
            mCount: mData.filter(m => m.sex === 'Male').length,
            fCount: mData.filter(m => m.sex === 'Female').length
        };
    });

    setCurrentProposal({
        groupCount,
        distribution: tribes,
        metrics
    });
    toast.success('Generated recommended distribution!');
  };

  const saveProposal = async () => {
    if (!proposalName.trim()) return toast.error('Enter a name for this proposal.');
    if (!currentProposal) return;

    setIsSaving(true);
    try {
        await api.post('/api/tribe-proposals', {
            ...currentProposal,
            name: proposalName
        });
        toast.success(`Proposal "${proposalName}" saved.`);
        setIsSaveModalOpen(false);
        setProposalName('');
        await fetchData();
    } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to save proposal.');
    } finally {
        setIsSaving(false);
    }
  };

  const deleteProposal = async (id: string) => {
    if (!window.confirm('Delete this proposal?')) return;
    try {
        await api.delete(`/api/tribe-proposals/${id}`);
        toast.success('Proposal removed.');
        await fetchData();
    } catch (err) {
        toast.error('Failed to delete.');
    }
  };

  const applyProposalToLive = async () => {
    if (!currentProposal) return;
    if (!window.confirm('This will OVERWRITE all existing camp tribes. Proceed?')) return;

    setIsSaving(true);
    try {
        await api.post('/api/org/groups/apply-proposal', { 
            tribes: currentProposal.distribution 
        });
        toast.success('Camp Tribes updated successfully!');
    } catch (err) {
        toast.error('Failed to apply groupings.');
    } finally {
        setIsSaving(false);
    }
  };

  const saveBulkScores = async () => {
    setIsSaving(true);
    try {
      const updates = registrants.map(r => ({
        id: r.id,
        ...localScores[r.id]
      })).filter(u => {
        const orig = registrants.find(r => r.id === u.id);
        return u.spirituality !== (orig?.spirituality || 1) || 
               u.build !== (orig?.build || 1) || 
               u.lockedTribe !== (orig?.lockedTribe || null);
      });

      if (updates.length > 0) {
        await api.put('/api/org/registrants/bulk-scores', { updates });
        toast.success(`Updated scores/locks for ${updates.length} participants.`);
        
        // After committing to database, we can reset the draft markers
        await fetchData();
      } else {
        toast.error('No changes to save.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to save scores.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <ShieldCheck size={64} className="text-brand-brown/20 mb-4" />
        <h2 className="text-2xl font-display text-brand-brown">Administrative Access Required</h2>
        <p className="text-gray-500 mt-2">Only camp administrators can access the Tribe Sorter.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-4 mb-1">
            <h2 className="text-3xl md:text-4xl font-display text-brand-brown tracking-wide flex items-center gap-3">
               <Trophy className="text-brand-brown" size={32} /> Tribe Sorter
            </h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-100 rounded-full shadow-sm text-[10px] font-black uppercase tracking-widest text-gray-400">
               {isSyncing ? (
                 <>
                   <Loader2 size={12} className="animate-spin text-brand-sand" />
                   Syncing...
                 </>
               ) : (
                 <>
                   <Cloud size={12} className="text-emerald-500" />
                   {lastSyncedAt ? `Synced ${lastSyncedAt.toLocaleTimeString()}` : 'Cloud Ready'}
                 </>
               )}
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium border-l-4 border-brand-sand/30 pl-3">
            Shared cloud draft enabled. Your work is synced across devices.
          </p>
        </div>

        <div className="flex items-center gap-2">
           <button 
             onClick={resetDraft}
             className="p-2.5 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-red-500 transition-all shadow-sm"
             title="Reset Draft to Live Defaults"
           >
             <RotateCcw size={20} />
           </button>
           <button 
             onClick={fetchData}
             className="p-2.5 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-brand-brown transition-all shadow-sm"
             title="Refresh Data"
           >
             <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
           </button>
           {activeTab === 'grading' && hasUnsavedChanges && (
             <button 
               onClick={saveBulkScores}
               disabled={isSaving}
               className="flex items-center gap-2 px-5 py-2.5 bg-brand-brown text-white rounded-xl font-bold shadow-lg shadow-brand-brown/10 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
             >
               {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
               Save to Live
             </button>
           )}
        </div>
      </header>

      {/* Main Tabs */}
      <div className="flex items-center gap-1 p-1 bg-brand-sand/10 rounded-2xl w-full sm:w-fit mb-4">
        {[
          { id: 'grading', label: '1. Grade Participants', icon: <ClipboardList size={18} /> },
          { id: 'sorter', label: '2. Generate Tribes', icon: <Zap size={18} /> },
          { id: 'comparison', label: '3. Compare Proposals', icon: <BarChart size={18} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === tab.id
              ? 'bg-white text-brand-brown shadow-sm ring-1 ring-brand-sand/20'
              : 'text-gray-400 hover:text-brand-brown/70'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[600px]">
        {isLoading ? (
          <div className="flex items-center justify-center p-24">
             <div className="flex flex-col items-center gap-4">
                <Loader2 size={48} className="text-brand-brown/20 animate-spin" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs animate-pulse">Syncing Cloud Session...</p>
             </div>
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            {activeTab === 'grading' && (
              <div className="space-y-6">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-3xl border border-white/50">
                    <div className="flex flex-1 items-center gap-3 max-w-2xl">
                      <div className="relative group/search flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within/search:text-brand-brown transition-colors" size={16} />
                          <input 
                            type="text" 
                            placeholder="Search participants by name or church..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl outline-none focus:border-brand-brown transition-all shadow-sm"
                          />
                      </div>
                      <button
                        onClick={() => setShowUnscoredOnly(!showUnscoredOnly)}
                        className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                          showUnscoredOnly 
                            ? 'bg-brand-brown text-white border-brand-brown' 
                            : 'bg-white text-gray-400 border-gray-200 hover:border-brand-sand hover:text-brand-brown'
                        }`}
                      >
                        <LayoutGrid size={14} />
                        {showUnscoredOnly ? 'Showing Unscored' : 'Filter Unscored'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 bg-gray-50/50 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider">
                       <Info size={14} className="text-brand-brown" />
                       1 = Beginner | 5 = Mature
                    </div>
                 </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {registrants
                    .filter(r => (r.church || '').toUpperCase().trim() !== 'JAM')
                    .filter(r => (r.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (r.church || '').toLowerCase().includes(searchTerm.toLowerCase()))
                    .filter(r => !showUnscoredOnly || (localScores[r.id]?.spirituality === 1 && localScores[r.id]?.build === 1))
                    .map(r => {
                      const scores = localScores[r.id] || { spirituality: 1, build: 1 };
                      const hasChanges = scores.spirituality !== (r.spirituality || 1) || scores.build !== (r.build || 1) || scores.lockedTribe !== (r.lockedTribe || null);
                      return (
                        <div key={r.id} className={`bg-white rounded-3xl p-5 border transition-all ${hasChanges ? 'border-amber-300 shadow-md ring-2 ring-amber-50' : 'border-gray-50 shadow-sm'}`}>
                          <div className="flex justify-between items-start mb-4">
                            <div className="min-w-0">
                               <h4 className="font-bold text-gray-800 truncate leading-tight">{r.fullName}</h4>
                               <p className="text-[10px] font-black uppercase text-gray-400 tracking-tighter mt-0.5">{r.church} • {r.sex}</p>
                            </div>
                            {hasChanges && <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Synced in draft" />}
                          </div>

                          <div className="space-y-4">
                             <div>
                                <label className="block text-[8px] font-black uppercase text-gray-400 tracking-widest mb-1.5 flex items-center gap-1">
                                   <Star size={10} className="text-amber-500" fill="currentColor" /> Spiritual Level
                                </label>
                                <div className="flex items-center gap-1">
                                   {[1, 2, 3, 4, 5].map(v => (
                                     <button
                                       key={v}
                                       onClick={() => handleUpdateScore(r.id, 'spirituality', v)}
                                       className={`flex-1 h-8 rounded-lg text-xs font-black transition-all ${scores.spirituality === v ? 'bg-amber-500 text-white shadow-inner scale-110' : 'bg-gray-50 text-gray-400 hover:bg-amber-50 hover:text-amber-600'}`}
                                     >
                                       {v}
                                     </button>
                                   ))}
                                </div>
                             </div>

                             <div>
                                <label className="block text-[8px] font-black uppercase text-gray-400 tracking-widest mb-1.5 flex items-center gap-1">
                                   <Zap size={10} className="text-blue-500" fill="currentColor" /> Physical Build
                                </label>
                                <div className="flex items-center gap-1">
                                   {[1, 2, 3, 4, 5].map(v => (
                                     <button
                                       key={v}
                                       onClick={() => handleUpdateScore(r.id, 'build', v)}
                                       className={`flex-1 h-8 rounded-lg text-xs font-black transition-all ${scores.build === v ? 'bg-blue-500 text-white shadow-inner scale-110' : 'bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600'}`}
                                     >
                                       {v}
                                     </button>
                                   ))}
                                </div>
                             </div>

                             <div className="pt-2 border-t border-gray-50 mt-2">
                                <label className="block text-[8px] font-black uppercase text-gray-400 tracking-widest mb-1.5 flex items-center gap-1">
                                   <Lock size={10} className="text-brand-brown" /> Pre-Assign Tribe
                                </label>
                                <select 
                                  value={scores.lockedTribe || ''} 
                                  onChange={e => handleToggleLock(r.id, e.target.value || null)}
                                  className="w-full bg-brand-cream/10 border border-brand-sand/10 rounded-lg py-1.5 px-3 text-[10px] font-bold text-brand-brown outline-none focus:ring-1 ring-brand-sand transition-all"
                                >
                                  <option value="">- No Lock -</option>
                                  {Array.from({ length: groupCount }, (_, i) => {
                                    const name = tribeNames[i + 1] || `Tribe ${i + 1}`;
                                    return <option key={i} value={name}>{name}</option>;
                                  })}
                                </select>
                             </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
            
            {activeTab === 'sorter' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                      <h3 className="text-lg font-display text-brand-brown mb-6 flex items-center gap-2">
                        <Settings className="text-brand-brown" size={20} /> Configure Sorter
                      </h3>
                      <div className="space-y-6">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Number of Tribes</label>
                          <div className="flex items-center justify-between p-1 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
                            <button 
                              onClick={() => setGroupCount(Math.max(2, groupCount - 1))}
                              className="w-12 h-12 flex items-center justify-center rounded-xl bg-white text-brand-brown shadow-sm border border-gray-100 hover:bg-brand-sand hover:text-white transition-all active:scale-90"
                            >
                              <Minus size={20} strokeWidth={3} />
                            </button>
                            <span className="text-3xl font-display text-brand-brown">{groupCount}</span>
                            <button 
                              onClick={() => setGroupCount(Math.min(25, groupCount + 1))}
                              className="w-12 h-12 flex items-center justify-center rounded-xl bg-white text-brand-brown shadow-sm border border-gray-100 hover:bg-brand-sand hover:text-white transition-all active:scale-90"
                            >
                              <Plus size={20} strokeWidth={3} />
                            </button>
                          </div>
                        </div>

                        {/* Tribe Names Section */}
                        <div className="pt-4 border-t border-gray-50">
                           <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Tribe Names (Optional)</label>
                           <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                              {Array.from({ length: groupCount }, (_, i) => (
                                <div key={i} className="flex items-center gap-2">
                                   <span className="text-[10px] font-bold text-gray-300 w-4">{i + 1}</span>
                                   <input 
                                     type="text" 
                                     placeholder={`Tribe ${i + 1}`}
                                     value={tribeNames[i + 1] || ''}
                                     onChange={(e) => setTribeNames(prev => ({ ...prev, [i + 1]: e.target.value }))}
                                     className="flex-1 px-3 py-1.5 bg-gray-50 border border-transparent rounded-lg outline-none focus:border-brand-sand transition-all text-xs font-bold text-brand-brown"
                                   />
                                </div>
                              ))}
                           </div>
                        </div>

                        <div className="pt-4 border-t border-gray-50">
                          <button 
                            onClick={generateProposals}
                            disabled={isSaving}
                            className="w-full py-4 bg-brand-brown text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-brown/20 hover:scale-[1.02] active:scale-95 transition-all text-sm flex items-center justify-center gap-3 disabled:opacity-50"
                          >
                            <Zap size={20} className="fill-amber-400 text-amber-400" /> Generate Recommendation
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-brand-cream/30 rounded-3xl p-6 border border-brand-sand/20">
                       <h4 className="text-[10px] font-black uppercase text-brand-brown/50 tracking-widest mb-4 flex items-center gap-2">
                          <Lock size={14} /> Manually Locked ({registrants.filter(r => localScores[r.id]?.lockedTribe).length})
                       </h4>
                       <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {registrants.filter(r => localScores[r.id]?.lockedTribe).map(r => (
                            <div key={r.id} className="flex items-center justify-between p-2 bg-white rounded-xl border border-brand-sand/10 shadow-sm">
                               <div className="min-w-0">
                                  <p className="text-xs font-bold truncate">{r.fullName}</p>
                                  <p className="text-[9px] font-bold text-brand-brown/40 uppercase tracking-tighter truncate">→ {localScores[r.id].lockedTribe}</p>
                               </div>
                               <button 
                                 onClick={() => handleToggleLock(r.id, null)}
                                 className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                               >
                                 <X size={14} />
                               </button>
                            </div>
                          ))}
                          {registrants.filter(r => localScores[r.id]?.lockedTribe).length === 0 && (
                            <p className="text-[10px] text-gray-400 italic text-center py-4">No participants locked. Algorithm will have full freedom.</p>
                          )}
                       </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-6">
                    {!currentProposal ? (
                      <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 bg-white rounded-[40px] border-2 border-dashed border-gray-100">
                        <LayoutGrid size={64} className="text-gray-100 mb-4" />
                        <h4 className="text-xl font-display text-gray-400">No active recommendation</h4>
                        <p className="text-sm text-gray-400 mt-2 max-w-xs">Run the sorter or load a saved proposal to see the tribe distribution.</p>
                      </div>
                    ) : (
                      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <h3 className="text-2xl font-display text-brand-brown flex items-center gap-3">
                               <CheckCircle className="text-emerald-500" /> Proposed Distribution
                            </h3>
                            <div className="flex items-center gap-2">
                               <button 
                                 onClick={() => setIsSaveModalOpen(true)}
                                 className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm"
                               >
                                 <Plus size={16} /> Save Proposal
                               </button>
                               <button 
                                 onClick={applyProposalToLive}
                                 className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/10"
                               >
                                 <Map size={16} /> Apply to LIVE
                               </button>
                            </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentProposal.distribution?.map((tribe, idx) => {
                               const metrics = currentProposal.metrics?.[tribe.name] || {};
                               return (
                                 <div key={idx} className="bg-white rounded-[32px] p-5 border border-gray-50 shadow-sm hover:shadow-md transition-all group">
                                    <div className="flex justify-between items-center mb-4 border-b border-gray-50 pb-3">
                                       <h5 className="font-display text-lg text-brand-brown truncate pr-4">{tribe.name}</h5>
                                       <div className="flex items-center gap-1.5 shrink-0">
                                          <span className="px-2 py-0.5 rounded-full bg-brand-sand/30 text-brand-brown text-[10px] font-black uppercase tracking-widest">{tribe.members.length} members</span>
                                       </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                       <div className="p-2.5 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                                          <p className="text-[8px] font-black uppercase text-amber-600/60 tracking-widest mb-1">Avg Spirituality</p>
                                          <div className="flex items-center gap-1.5">
                                             <Star size={12} className="text-amber-500" fill="currentColor" opacity={0.5} />
                                             <span className="text-sm font-black text-amber-700">{metrics.avgSpirituality?.toFixed(1) || '0.0'}</span>
                                          </div>
                                       </div>
                                       <div className="p-2.5 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                                          <p className="text-[8px] font-black uppercase text-blue-600/60 tracking-widest mb-1">Avg build</p>
                                          <div className="flex items-center gap-1.5">
                                             <Zap size={12} className="text-blue-500" fill="currentColor" opacity={0.5} />
                                             <span className="text-sm font-black text-blue-700">{metrics.avgBuild?.toFixed(1) || '0.0'}</span>
                                          </div>
                                       </div>
                                    </div>

                                    <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                                       {tribe.members.map(mName => {
                                         const reg = registrants.find(r => r.fullName === mName);
                                         const isLocked = localScores[reg?.id || '']?.lockedTribe === tribe.name;
                                         return (
                                           <div key={mName} className="flex items-center justify-between py-1.5 px-3 bg-gray-50/30 rounded-xl text-xs hover:bg-gray-50 transition-colors">
                                              <span className="font-bold text-gray-700 truncate mr-2">{mName}</span>
                                              <div className="flex items-center gap-2 shrink-0">
                                                 <span className={`text-[8px] font-black uppercase tracking-tighter ${reg?.sex === 'Male' ? 'text-blue-400' : 'text-pink-400'}`}>{reg?.sex?.charAt(0)}</span>
                                                 <button 
                                                   onClick={() => handleToggleLock(reg?.id || '', isLocked ? null : tribe.name)}
                                                   className={`p-1 rounded-md transition-all ${isLocked ? 'text-brand-brown bg-brand-sand rotate-0' : 'text-gray-200 hover:text-brand-brown hover:bg-white -rotate-12'}`}
                                                   title={isLocked ? "Unlock from tribe" : "Lock to this tribe"}
                                                 >
                                                   <Lock size={10} />
                                                 </button>
                                              </div>
                                           </div>
                                         );
                                       })}
                                    </div>
                                 </div>
                               );
                            })}
                         </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'comparison' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
                <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                   <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                      <div>
                         <h3 className="text-2xl font-display text-brand-brown">Proposal Comparison</h3>
                         <p className="text-sm text-gray-400">Review and compare all saved grouping versions.</p>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-brand-sand/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-brand-brown">
                         {proposals.length} Saved Proposals
                      </div>
                   </div>

                   <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                            <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Proposal Name</th>
                            <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Tribes</th>
                            <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Spirituality Bal.</th>
                            <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Build Bal.</th>
                            <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {proposals.map((p) => {
                             // Calculate overall balance score (Standard Deviation of tribe averages)
                             const tribeMetrics = Object.values(p.metrics || {});
                             const avgSpir = tribeMetrics.reduce((s: any, m: any) => s + m.avgSpirituality, 0) / tribeMetrics.length;
                             const avgBuild = tribeMetrics.reduce((s: any, m: any) => s + m.avgBuild, 0) / tribeMetrics.length;
                             
                             const stdevSpir = Math.sqrt(tribeMetrics.reduce((s: any, m: any) => s + Math.pow(m.avgSpirituality - avgSpir, 2), 0) / tribeMetrics.length);
                             const stdevBuild = Math.sqrt(tribeMetrics.reduce((s: any, m: any) => s + Math.pow(m.avgBuild - avgBuild, 2), 0) / tribeMetrics.length);

                             return (
                               <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                                 <td className="px-8 py-6">
                                   <p className="font-bold text-gray-800">{p.name}</p>
                                   <p className="text-[10px] text-gray-400">{new Date(p.createdAt).toLocaleDateString()}</p>
                                 </td>
                                 <td className="px-8 py-6 text-center">
                                   <span className="font-display text-lg text-brand-brown">{p.groupCount}</span>
                                 </td>
                                 <td className="px-8 py-6">
                                    <div className="flex flex-col items-center">
                                       <div className={`text-[10px] font-black px-2 py-0.5 rounded-full ${stdevSpir < 0.2 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                          ±{stdevSpir.toFixed(2)}
                                       </div>
                                       <span className="text-[8px] text-gray-400 uppercase tracking-tighter mt-1">Variance</span>
                                    </div>
                                 </td>
                                 <td className="px-8 py-6">
                                    <div className="flex flex-col items-center">
                                       <div className={`text-[10px] font-black px-2 py-0.5 rounded-full ${stdevBuild < 0.2 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                          ±{stdevBuild.toFixed(2)}
                                       </div>
                                       <span className="text-[8px] text-gray-400 uppercase tracking-tighter mt-1">Variance</span>
                                    </div>
                                 </td>
                                 <td className="px-8 py-6 text-right">
                                   <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button 
                                        onClick={() => {
                                          setCurrentProposal(p);
                                          setGroupCount(p.groupCount);
                                          setActiveTab('sorter');
                                        }}
                                        className="p-2 text-brand-brown hover:bg-brand-sand/20 rounded-lg transition-colors"
                                        title="Load Proposal"
                                      >
                                        <Zap size={18} />
                                      </button>
                                      <button 
                                        onClick={() => deleteProposal(p.id)}
                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete"
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                   </div>
                                 </td>
                               </tr>
                             )
                          })}
                          {proposals.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-8 py-20 text-center text-gray-400 font-display italic">
                                No proposals saved yet. Head to "Generate Tribes" to create one.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-brand-brown/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-white rounded-[40px] shadow-2xl max-w-md w-full border border-white/50 overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8">
                 <div className="w-16 h-16 bg-brand-sand/20 rounded-3xl flex items-center justify-center mb-6">
                    <Save className="text-brand-brown" size={32} />
                 </div>
                 <h3 className="text-2xl font-display text-brand-brown mb-2">Save Sorting Proposal</h3>
                 <p className="text-sm text-gray-500 mb-8 leading-relaxed">Give this version a unique name so you can compare it with others later.</p>
                 
                 <div className="space-y-4">
                    <div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Proposal Name</label>
                       <input 
                         type="text" 
                         autoFocus
                         placeholder="e.g. Balanced Sorter - Opt A"
                         value={proposalName}
                         onChange={e => setProposalName(e.target.value)}
                         className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 ring-brand-sand transition-all text-gray-800 font-bold"
                       />
                    </div>
                 </div>
              </div>

              <div className="p-4 bg-gray-50 flex items-center gap-3">
                 <button 
                   onClick={() => { setIsSaveModalOpen(false); setProposalName(''); }}
                   className="flex-1 py-4 text-gray-400 font-bold hover:text-gray-600 transition-colors"
                 >
                    Cancel
                 </button>
                 <button 
                   onClick={saveProposal}
                   disabled={isSaving || !proposalName.trim()}
                   className="flex-1 py-4 bg-brand-brown text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-brown/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                 >
                    {isSaving ? 'Saving...' : 'Confirm Save'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Hidden Print Area */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>
      
      {currentProposal && (
        <div id="print-area" className="hidden print:block p-8 bg-white">
           <h1 className="text-3xl font-display mb-2 uppercase tracking-widest border-b-2 border-gray-900 pb-2">LAKBAY TRIBE ASSIGNMENTS</h1>
           <p className="text-sm mb-8 text-gray-600">Generated on {new Date().toLocaleDateString()} • Proposal: {currentProposal.name || 'Untitled'}</p>
           
           <div className="grid grid-cols-2 gap-8">
              {currentProposal.distribution?.map((tribe, idx) => (
                <div key={idx} className="border border-gray-300 p-4 rounded-lg">
                   <h2 className="text-xl font-bold border-b border-gray-200 mb-4 pb-1">{tribe.name}</h2>
                   <div className="space-y-1">
                      {tribe.members.map(name => (
                        <div key={name} className="text-sm">{name}</div>
                      ))}
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
}
