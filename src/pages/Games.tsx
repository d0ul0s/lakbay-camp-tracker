import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Navigate } from 'react-router-dom';
import { 
  Timer, 
  Lock, 
  Coins, 
  ArrowRight, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Rocket,
  History,
  AlertTriangle,
  Settings2,
  Save,
  Zap,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

// --- Default Risk Config ---
const DEFAULT_MULTIPLIERS = [
  { value: 0.5, label: 'DIP', weight: 30, color: 'text-orange-500', bg: 'bg-orange-500' },
  { value: 1.2, label: 'UP', weight: 35, color: 'text-blue-500', bg: 'bg-blue-500' },
  { value: 2, label: 'STRIKE', weight: 20, color: 'text-emerald-500', bg: 'bg-emerald-500' },
  { value: 5, label: 'JACKPOT', weight: 10, color: 'text-purple-500', bg: 'bg-purple-600' },
  { value: 10, label: 'MOON', weight: 5, color: 'text-pink-500', bg: 'bg-pink-600' },
];

const PENALTY_RATE = 0.75; // 25% Deduction for early withdrawal

export default function Games() {
  const { currentUser } = useAppStore();
  
  // Camp State (Tribes)
  const [tribeList, setTribeList] = useState<{ id: string; name: string; color?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Standalone Vault States (Persistent in localStorage)
  const [activeLocks, setActiveLocks] = useState<any[]>([]);
  const [vaultHistory, setVaultHistory] = useState<any[]>([]);
  const [riskConfig, setRiskConfig] = useState(DEFAULT_MULTIPLIERS);
  
  // UI States
  const [now, setNow] = useState(Date.now());
  const [showConfig, setShowConfig] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form Params
  const [selectedTribeId, setSelectedTribeId] = useState<string>('');
  const [wager, setWager] = useState<number>(500);
  const [duration, setDuration] = useState<number>(5);

  // Role Security
  if (currentUser?.role?.toLowerCase().trim() !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Timer Update
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialization
  useEffect(() => {
    const init = async () => {
      try {
        // 1. Fetch Tribes for Selection
        const res = await api.get('/api/org/groups');
        const groups = res.data.map((g: any) => ({
          id: (g._id || g.id).toString(),
          name: g.name,
          color: g.color || '#8B4513'
        }));
        setTribeList(groups);
        if (groups.length > 0) setSelectedTribeId(groups[0].id);

        // 2. Load Local Vault Data
        const savedVault = localStorage.getItem('LAKBAY_STANDALONE_VAULT');
        if (savedVault) {
          const data = JSON.parse(savedVault);
          setActiveLocks(data.locks || []);
          setVaultHistory(data.history || []);
        }

        // 3. Load Risk Config
        const savedRisk = localStorage.getItem('LAKBAY_VAULT_RISK');
        if (savedRisk) {
          const parsed = JSON.parse(savedRisk);
          // CLEANUP: Strip old hardcoded multipliers from labels (e.g. "UP (1.2X)" -> "UP")
          const cleaned = parsed.map((r: any) => ({
            ...r,
            label: r.label.replace(/\s*\(\d+\.?\d*X\)$/i, '').trim()
          }));
          setRiskConfig(cleaned);
        }

      } catch (err) {
        toast.error('Vault Sync Offline');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // Persistence to Browser
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('LAKBAY_STANDALONE_VAULT', JSON.stringify({
        locks: activeLocks,
        history: vaultHistory
      }));
    }
  }, [activeLocks, vaultHistory, isLoading]);

  // --- ACTIONS ---

  const handleClearHistory = () => {
    if (confirm('Clear all Vault history?')) {
      setVaultHistory([]);
      toast.success('History Purged');
    }
  };

  const handleDeposit = () => {
    if (!selectedTribeId || wager <= 0) return toast.error('Check your inputs');

    setIsProcessing(true);
    const expiry = Date.now() + (duration * 60 * 1000);
    const lockId = Math.random().toString(36).substr(2, 6).toUpperCase();

    // 1. Create Lock
    const newLock = {
      id: lockId,
      tribeId: selectedTribeId,
      tribeName: tribeList.find(t => t.id === selectedTribeId)?.name || 'Tribe',
      amount: wager,
      expiry,
      duration,
      createdAt: Date.now()
    };
    setActiveLocks([newLock, ...activeLocks]);

    // 2. Record Event Start
    const log = {
      id: Math.random().toString(36).substr(2, 4),
      type: 'INITIATED',
      tribe: newLock.tribeName,
      input: wager,
      output: null,
      reason: `${duration}m Lock-in`,
      timestamp: Date.now()
    };
    setVaultHistory([log, ...vaultHistory.slice(0, 49)]);

    toast.success(`Vault Lock ${lockId} Engaged`);
    setIsProcessing(false);
  };

  const handleClaim = (lock: any) => {
    const isMature = now >= lock.expiry;
    let finalAmount = 0;
    let label = '';
    let status: 'CLAIMED' | 'PENALIZED' = 'CLAIMED';

    if (isMature) {
      // Resolve Probability
      const totalWeight = riskConfig.reduce((acc, curr) => acc + curr.weight, 0);
      const rand = Math.random() * totalWeight;
      let cumulative = 0;
      let mult = riskConfig[0];
      for (const m of riskConfig) {
        cumulative += m.weight;
        if (rand < cumulative) { mult = m; break; }
      }
      finalAmount = Math.round(lock.amount * mult.value);
      label = `${mult.label} (${mult.value}X)`;
      toast.success(`${label}! Final: ${finalAmount}`);
    } else {
      // Early Out
      finalAmount = Math.round(lock.amount * PENALTY_RATE);
      label = 'EARLY EXIT';
      status = 'PENALIZED';
      toast.error(`-25% Penalty Penalty. Final: ${finalAmount}`);
    }

    // 1. Remove Lock
    setActiveLocks(activeLocks.filter(l => l.id !== lock.id));

    // 2. Record Resolution
    const log = {
      id: Math.random().toString(36).substr(2, 4),
      type: status,
      tribe: lock.tribeName,
      input: lock.amount,
      output: finalAmount,
      reason: label,
      timestamp: Date.now()
    };
    setVaultHistory([log, ...vaultHistory.slice(0, 49)]);
  };

  const saveRiskConfig = () => {
    localStorage.setItem('LAKBAY_VAULT_RISK', JSON.stringify(riskConfig));
    toast.success('Matrix Calibrated');
    setShowConfig(false);
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen animate-pulse text-brand-brown uppercase font-black tracking-[0.4em]">Calibrating Vault Systems...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20 px-4 sm:px-0">
      
      {/* HEADER: SIMPLIFIED */}
      <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-brand-sand/30 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 rounded-2xl bg-brand-brown text-white flex items-center justify-center shadow-xl">
              <Zap size={26} className={activeLocks.length > 0 ? 'animate-pulse text-emerald-400' : ''} />
           </div>
           <div>
              <h1 className="text-2xl font-display text-brand-brown tracking-tight leading-none mb-1 uppercase">LAKBAY VAULT</h1>
              <div className="flex items-center gap-2">
                 <ShieldCheck size={12} className="text-emerald-500" />
                 <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest leading-none italic underline decoration-brand-sand/30">Independent Event Simulator: No Point Logs</span>
              </div>
           </div>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={() => setShowConfig(!showConfig)} className={`p-3 rounded-xl border-2 transition-all ${showConfig ? 'bg-brand-brown text-white border-brand-brown' : 'bg-white border-brand-sand/20 text-brand-brown hover:bg-brand-sand/5'}`}>
              <Settings2 size={18} />
           </button>
           <button onClick={handleClearHistory} className="p-3 rounded-xl border-2 border-brand-sand/10 text-gray-300 bg-white hover:bg-red-50 hover:text-red-500 transition-all">
              <Trash2 size={18} />
           </button>
        </div>
      </div>

      {/* RISK CALIBRATION: DYNAMIC */}
      {showConfig && (
        <div className="bg-white/95 backdrop-blur rounded-[2.5rem] border-2 border-brand-sand/20 shadow-2xl p-8 animate-in slide-in-from-top-4 duration-300">
           <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-display text-brand-brown uppercase tracking-tight flex items-center gap-3">Vault Risk Matrix</h3>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">Adjust probabilities and multipliers for resolution events.</p>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => setRiskConfig(DEFAULT_MULTIPLIERS)} className="px-4 py-2 rounded-xl bg-gray-50 text-[10px] font-black uppercase text-gray-400 hover:text-red-500 transition-all">Default</button>
                 <button onClick={saveRiskConfig} className="px-6 py-2 rounded-xl bg-brand-brown text-[10px] font-black uppercase text-white hover:bg-brand-light-brown shadow-lg flex items-center gap-2"><Save size={14} /> Save Calibration</button>
              </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {riskConfig.map((risk, idx) => {
                 const totalWeight = riskConfig.reduce((acc, curr) => acc + curr.weight, 0);
                 const probability = totalWeight > 0 ? ((risk.weight / totalWeight) * 100).toFixed(1) : '0';
                 
                 return (
                    <div key={idx} className="p-5 rounded-3xl bg-white border border-brand-sand/10 shadow-sm space-y-4 hover:border-brand-sand/30 transition-colors group">
                       <div className="flex items-center gap-1.5 border-b border-gray-50 pb-2">
                           <input 
                             className="bg-transparent border-none p-0 text-[11px] font-black text-brand-brown uppercase focus:ring-0 outline-none w-full" 
                             value={risk.label} 
                             onChange={e => { const newC = [...riskConfig]; newC[idx].label = e.target.value.toUpperCase(); setRiskConfig(newC); }} 
                           />
                           <span className="text-[10px] font-mono font-black text-brand-sand shrink-0">({risk.value}X)</span>
                       </div>
                       <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                             <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Multiplier</label>
                             <input type="number" step="0.1" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-2 text-xs font-bold text-brand-brown focus:border-brand-sand/30 outline-none transition-colors" value={risk.value} onChange={e => { const newC = [...riskConfig]; newC[idx].value = parseFloat(e.target.value) || 0; setRiskConfig(newC); }} />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Weight (Chance)</label>
                             <input type="number" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-2 text-xs font-bold text-emerald-600 focus:border-brand-sand/30 outline-none transition-colors" value={risk.weight} onChange={e => { const newC = [...riskConfig]; newC[idx].weight = parseInt(e.target.value) || 0; setRiskConfig(newC); }} />
                          </div>
                       </div>
                       <div className="flex items-center justify-between pt-1">
                          <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Probability:</span>
                          <span className="text-[10px] font-mono font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                             {probability}%
                          </span>
                       </div>
                    </div>
                 );
              })}
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* NEW LOCK CONSOLE */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-white shadow-xl p-8 space-y-6">
              <h3 className="text-lg font-display text-brand-brown flex items-center gap-3 uppercase"><Lock size={18} className="text-brand-light-brown" /> Engage Lock</h3>
              <div className="space-y-4">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Target Tribe</label>
                    <select value={selectedTribeId} onChange={e => setSelectedTribeId(e.target.value)} className="w-full bg-white border-2 border-brand-beige rounded-2xl p-4 font-bold text-sm outline-none" style={{ borderLeft: `8px solid ${tribeList.find(t => t.id === selectedTribeId)?.color || '#eee'}` }}>
                       {tribeList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Risky Amount</label>
                    <div className="relative group">
                       <Coins size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-sand group-focus-within:text-brand-brown transition-colors" />
                       <input type="number" value={wager} onChange={e => setWager(Math.max(1, parseInt(e.target.value) || 0))} className="w-full bg-white border-2 border-brand-beige rounded-2xl p-4 pl-12 font-display text-2xl text-brand-brown" />
                    </div>
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Lock Period</label>
                    <div className="grid grid-cols-4 gap-2">
                       {[5, 15, 30, 60].map(m => (
                         <button key={m} onClick={() => setDuration(m)} className={`p-2 rounded-xl border-2 text-[9px] font-black tracking-tighter transition-all ${duration === m ? 'bg-brand-brown text-white border-brand-brown' : 'bg-white border-gray-100 text-gray-400'}`}>{m}m</button>
                       ))}
                    </div>
                 </div>
                 <button onClick={handleDeposit} disabled={isProcessing} className="w-full py-5 rounded-2xl bg-brand-brown text-white font-display text-xl uppercase tracking-widest shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4">
                    {isProcessing ? <RefreshCw className="animate-spin" /> : <>START LOCK-IN <ArrowRight size={18} /></>}
                 </button>
                 <div className="bg-brand-sand/10 p-4 rounded-2xl border border-brand-sand/10 flex items-start gap-4">
                    <AlertTriangle size={16} className="text-brand-brown/40 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-brand-brown/60 font-bold uppercase tracking-wider leading-relaxed italic">Standalone Event Console: This tool generates outcomes independently of the camp registry. Results must be manually applied if needed.</p>
                 </div>
              </div>
           </div>
        </div>

        {/* ACTIVE VAULT LOCKS */}
        <div className="lg:col-span-8 space-y-6">
           <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white shadow-xl p-8 min-h-[440px]">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-xl font-display text-brand-brown flex items-center gap-3 uppercase">Active Vault Locks</h3>
                 <span className="text-[7px] font-black text-gray-300 uppercase tracking-[0.4em]">Simulation Node Active</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {activeLocks.map(lock => {
                   const isMature = now >= lock.expiry;
                   return (
                     <div key={lock.id} className={`group relative p-6 rounded-[2.5rem] border-2 transition-all duration-500 ${isMature ? 'bg-emerald-50/50 border-emerald-500/30 shadow-lg shadow-emerald-500/10' : 'bg-white/80 border-brand-sand/10 shadow-sm'}`}>
                        <div className="absolute top-5 right-5">
                           {isMature ? <Rocket size={20} className="text-emerald-500 animate-bounce" /> : <Timer size={20} className="text-brand-sand animate-pulse" />}
                        </div>
                        <div className="mb-4">
                           <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest">{lock.tribeName}</h4>
                           <p className="text-[10px] text-gray-400 mt-0.5 font-bold tracking-tighter">Event Hash: #{lock.id}</p>
                        </div>
                        <div className="mb-6 flex items-end justify-between">
                           <div>
                              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Risk Amount</p>
                              <p className="text-4xl font-display text-brand-brown leading-none">{lock.amount.toLocaleString()}</p>
                           </div>
                           <div className="text-right">
                             {isMature ? (
                               <span className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em] italic">READY</span>
                             ) : (
                               <span className="text-xs font-mono font-black text-brand-sand animate-pulse">
                                 {formatDistanceToNow(lock.expiry, { addSuffix: true })}
                               </span>
                             )}
                           </div>
                        </div>
                        <button onClick={() => handleClaim(lock)} className={`w-full py-4 rounded-xl font-display text-xl uppercase tracking-widest transition-all ${isMature ? 'bg-emerald-500 text-white shadow-xl hover:scale-[1.03]' : 'bg-white border-2 border-red-100 text-red-500 hover:bg-red-500 hover:text-white group-hover:border-red-500/20'}`}>
                           {isMature ? 'RESOLVE RESULT' : 'END EARLY (-25%)'}
                        </button>
                     </div>
                   );
                 })}
                 {activeLocks.length === 0 && (
                    <div className="col-span-full py-24 text-center opacity-30">
                       <History size={64} className="mx-auto mb-6 text-brand-sand" />
                       <p className="font-display text-xl uppercase tracking-[0.4em]">No Live Vault Events</p>
                    </div>
                 )}
              </div>
           </div>

           {/* SIMULATION HISTORY: EVENT JOURNAL */}
           <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white shadow-xl p-8">
              <h4 className="text-lg font-display text-brand-brown mb-6 uppercase flex items-center gap-3"><History className="text-brand-sand" /> Event Resolutions</h4>
              <div className="space-y-3">
                 {vaultHistory.map((log, i) => (
                   <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white shadow-sm border border-brand-sand/5 animate-in slide-in-from-left-2 transition-all hover:border-brand-sand/30">
                      <div className="flex items-center gap-4 min-w-0">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${log.output === null ? 'bg-amber-100 text-amber-700' : (log.output >= log.input ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}`}>
                            {log.output === null ? <Lock size={18} /> : (log.output >= log.input ? <TrendingUp size={18} /> : <TrendingDown size={18} />)}
                         </div>
                         <div className="min-w-0">
                            <p className="text-[11px] font-bold text-gray-800 truncate leading-none mb-1.5 uppercase tracking-wide">{log.tribe}</p>
                            <p className="text-[7.5px] font-black text-gray-400 uppercase truncate tracking-widest">{log.reason} • {formatDistanceToNow(log.timestamp, { addSuffix: true })}</p>
                         </div>
                      </div>
                      <div className="text-right shrink-0">
                         <div className="flex items-center gap-2 justify-end">
                            {log.output !== null && (
                               <span className={`text-[10px] font-mono font-black ${log.output >= log.input ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {log.output >= log.input ? `+${log.output - log.input}` : `-${log.input - log.output}`}
                               </span>
                            )}
                            <span className="text-sm font-display text-brand-brown tracking-tight">
                               {log.output !== null ? log.output.toLocaleString() : '---'}
                            </span>
                         </div>
                         <p className="text-[7px] font-black text-gray-300 uppercase tracking-tighter">Resolving Capital: {log.input}</p>
                      </div>
                   </div>
                 ))}
                 {vaultHistory.length === 0 && (
                   <p className="text-center py-6 text-[9px] font-black text-gray-300 uppercase tracking-widest italic">No event resolutions recorded.</p>
                 )}
              </div>
           </div>
        </div>
      </div>

      <style>{` .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } `}</style>
    </div>
  );
}
