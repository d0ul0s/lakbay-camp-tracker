import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Link } from 'react-router-dom';
import { Users, Shield, Tent, Star, Flag, Target, Loader2, ArrowLeft, Printer, Hand } from 'lucide-react';
import api from '../api/axios';
import { getChurchVibrantColor } from '../utils/churchColorUtils';

interface CampLeader {
  _id?: string;
  id?: string;
  name: string;
  churchRef: string | null;
  categories: string[];
  category?: string;
  roleTitle: string;
  image?: string;
  socialLink?: string;
}

interface CampGroup {
  _id?: string;
  id?: string;
  name: string;
  leader: string;
  assistantLeader: string;
  pointKeeper: string;
  flagBearer: string;
  facilitators: string[];
  grabMasters: string[];
  members: string[];
  color?: string;
}

const getCategories = (l: CampLeader) => {
  if (l.categories && l.categories.length > 0) return l.categories;
  if (l.category) return [l.category];
  return [];
};

const FacebookIcon = ({ size = 16, className = "" }: { size?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="currentColor"
  >
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078v-3.47h3.047V9.356c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.384C19.612 22.954 24 17.99 24 12c0-6.627-5.373-12-12-12z" />
  </svg>
);

export default function PublicOrganization() {
  const { appSettings, isServerAwake, fetchGlobalSettings, setServerAwake } = useAppStore();
  
  const [leaders, setLeaders] = useState<CampLeader[]>([]);
  const [groups, setGroups] = useState<CampGroup[]>([]);
  const [registrants, setRegistrants] = useState<{ id?: string, _id?: string, fullName: string, church: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'departments' | 'leaders' | 'groups'>('departments');

  const fetchData = async () => {
    if (leaders.length === 0 && groups.length === 0) {
      setIsLoading(true);
    }

    try {
      const results = await Promise.allSettled([
        api.get('/api/org/leaders'),
        api.get('/api/org/groups'),
        api.get('/api/org/registrants')
      ]);

      if (results[0].status === 'fulfilled') setLeaders(results[0].value.data);
      if (results[1].status === 'fulfilled') setGroups(results[1].value.data);
      if (results[2].status === 'fulfilled') setRegistrants(results[2].value.data);

      if (results.some(r => r.status === 'fulfilled')) {
        setServerAwake(true);
      }

      if (!appSettings) {
        await fetchGlobalSettings();
      }
    } catch (err) {
      console.error('Failed to load public org data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (isServerAwake) fetchData();
  }, [isServerAwake]);

  const staff = leaders;
  const youthLeaders = leaders.filter(l => getCategories(l).includes('Youth Leader'));

  const memberAssignments: Record<string, string[]> = {};
  groups.forEach((g: CampGroup) => {
    const allGroupedNames = [
      g.leader,
      g.assistantLeader,
      g.pointKeeper,
      g.flagBearer,
      ...(g.facilitators || []),
      ...(g.grabMasters || []),
      ...(g.members || [])
    ].filter(Boolean);

    allGroupedNames.forEach((name: string) => {
      const key = name.toLowerCase().trim();
      if (!memberAssignments[key]) memberAssignments[key] = [];
      if (!memberAssignments[key].includes(g.name)) {
        memberAssignments[key].push(g.name);
      }
    });
  });

  const ungrouped = registrants
    .filter((r) => r.church !== 'JAM')
    .filter((r) => !memberAssignments[(r.fullName || '').toLowerCase().trim()]);

  const effectiveChurches = (appSettings?.churches && appSettings.churches.length > 0)
    ? appSettings.churches.filter((c: string) => c !== 'JAM')
    : Array.from(new Set(youthLeaders.filter(yl => yl.churchRef && yl.churchRef !== 'JAM').map(yl => yl.churchRef as string))).sort();

  const hasSomeData = leaders.length > 0 || groups.length > 0;

  if (isLoading && !isServerAwake && !hasSomeData) {
    return (
      <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-6 text-center">
         <div className="relative mb-8">
            <div className="absolute inset-0 bg-brand-brown/10 blur-3xl rounded-full scale-150 animate-pulse"></div>
            <Loader2 className="w-16 h-16 text-brand-brown animate-spin relative" />
         </div>
         <h2 className="text-2xl font-display text-brand-brown mb-2 tracking-tight animate-pulse">Connecting to LAKBAY...</h2>
         <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] max-w-xs leading-loose">
            ESTABLISHING SECURE CAMP CONNECTION
         </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen print:min-h-0 bg-brand-cream font-sans selection:bg-brand-brown selection:text-white relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20 no-print">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-sand blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-brown/10 blur-[120px]"></div>
      </div>

      <header className="bg-brand-brown text-white py-3 px-6 md:px-10 shadow-lg sticky top-0 z-50 flex items-center justify-between mb-8 overflow-hidden no-print">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
        <div className="flex items-center gap-3 md:gap-4 font-display tracking-widest leading-none relative z-10 cursor-default">
          <img src="/logo.svg" alt="LAKBAY" className="h-8 w-8 md:h-10 md:w-10 filter drop-shadow-md" />
          <h1 className="text-lg md:text-xl hidden sm:block uppercase font-bold tracking-widest">LAKBAY CAMP</h1>
        </div>
        <Link to="/login" className="relative z-10 flex items-center gap-2 bg-white/10 hover:bg-white/20 active:bg-white/30 px-4 py-2 rounded-xl transition-all font-bold text-xs backdrop-blur-sm shadow-inner uppercase tracking-wider border border-white/10">
          <ArrowLeft size={14} /> Back to Login
        </Link>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 pb-32 space-y-8 relative z-10 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-4xl md:text-6xl font-display text-brand-brown tracking-tighter mb-2">
              CAMP <span className="text-brand-light-brown">ORGANIZATION</span>
            </h2>
            <p className="text-gray-500 font-medium text-sm md:text-base border-l-4 border-brand-sand/50 pl-4">
              Official camp groupings, staff roster, and church youth leaders.
            </p>
          </div>
          <button 
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-brand-sand text-brand-brown rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-brand-sand hover:text-white transition-all shadow-xl active:scale-95 shrink-0"
          >
            <Printer size={16} /> 
            <span>Print {activeTab === 'groups' ? 'Tribes' : activeTab === 'leaders' ? 'Personnel' : 'Report'}</span>
          </button>
        </div>


        <div className="flex items-center gap-1 p-1 bg-brand-sand/10 backdrop-blur-sm rounded-2xl w-full sm:w-fit border border-brand-sand/10">
          {[
            { id: 'departments', label: 'Departments', icon: <Shield size={16} /> },
            { id: 'leaders', label: 'YL', icon: <Users size={16} /> },
            { id: 'groups', label: 'Tribes', icon: <Tent size={16} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab.id
                ? 'bg-white text-brand-brown shadow-xl ring-1 ring-brand-sand/20'
                : 'text-gray-400 hover:text-brand-brown/70 hover:bg-white/30'
                }`}
            >
              {tab.icon}
              <span className={activeTab === tab.id ? 'inline' : 'hidden sm:inline'}>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="min-h-[400px]">
          {/* DEPARTMENTS VIEW */}
          {activeTab === 'departments' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from(new Set(staff.flatMap(s => getCategories(s))))
                  .filter(cat => cat !== 'Youth Leader')
                  .sort((a, b) => a === 'Camp Head' ? -1 : b === 'Camp Head' ? 1 : a.localeCompare(b))
                  .map(category => {
                    const isCampHead = category === 'Camp Head';
                    return (
                      <div key={category} className={`bg-white/60 backdrop-blur-md rounded-3xl p-4 border transition-all ${isCampHead ? 'border-brand-brown/20 ring-1 ring-amber-100 shadow-amber-900/5 shadow-xl' : 'border-white/80 shadow-xl shadow-brand-brown/[0.03]'}`}>
                        <h4 className={`font-black uppercase text-[10px] tracking-[0.2em] mb-4 pb-2 border-b flex items-center gap-2 ${isCampHead ? 'text-brand-brown border-amber-100' : 'text-gray-400 border-gray-50'}`}>
                          {isCampHead && <Star size={12} className="text-amber-500 animate-pulse" fill="currentColor" />}
                          {category}
                        </h4>
                        <div className="space-y-2">
                          {staff.filter(s => getCategories(s).includes(category)).map(s => (
                            <div key={s._id || s.id} className="flex items-center justify-between group p-2 hover:bg-white rounded-2xl transition-all">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 overflow-hidden border border-gray-100 group-hover:scale-110 transition-transform">
                                  {s.image ? <img src={s.image} alt={s.name} className="w-full h-full object-cover" /> : <Shield size={16} className="text-brand-brown/20" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                     <p className="font-bold text-sm text-gray-800 truncate">{s.name}</p>
                                     {s.socialLink && (
                                       <a href={s.socialLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 transition-all group/fb">
                                         <FacebookIcon size={14} className="opacity-40 group-hover/fb:opacity-100" />
                                       </a>
                                     )}
                                  </div>
                                  {s.roleTitle && <p className="text-[9px] uppercase font-black text-gray-400 tracking-tighter mt-1 truncate">{s.roleTitle}</p>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* YL VIEW */}
          {activeTab === 'leaders' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                 {effectiveChurches.map(church => {
                   const churchLeaders = youthLeaders.filter(yl => yl.churchRef === church);
                   return (
                     <div key={church} className="bg-white border border-white/80 rounded-3xl p-4 shadow-xl shadow-brand-brown/[0.03] backdrop-blur-md">
                        <h4 className="text-[10px] font-black uppercase text-gray-300 tracking-widest mb-3 border-b border-gray-50 pb-2">{church}</h4>
                        <div className="space-y-2">
                          {churchLeaders.length > 0 ? (
                            churchLeaders.map(cl => (
                              <div key={cl._id || cl.id} className="flex items-center justify-between group p-2 hover:bg-gray-50 rounded-2xl transition-all">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 overflow-hidden border border-gray-100">
                                   {cl.image ? <img src={cl.image} alt={cl.name} className="w-full h-full object-cover" /> : <Users size={14} className="text-brand-brown/20" />}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                       <p className="text-sm font-bold text-gray-800 truncate">{cl.name}</p>
                                       {cl.socialLink && (
                                         <a href={cl.socialLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                                           <FacebookIcon size={14} className="opacity-40" />
                                         </a>
                                       )}
                                    </div>
                                    {cl.roleTitle && <p className="text-[8px] uppercase font-black text-gray-400 tracking-tighter mt-1 truncate">{cl.roleTitle}</p>}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-gray-300 italic font-medium px-1">No roles assigned.</p>
                          )}
                        </div>
                     </div>
                   );
                 })}
               </div>
            </div>
          )}

          {/* TRIBES VIEW */}
          {activeTab === 'groups' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
               <div className="columns-1 md:columns-2 xl:columns-3 gap-6 space-y-6">
                {groups.map((g, idx) => {
                  const isWhite = g.color?.toLowerCase() === '#ffffff' || g.color?.toLowerCase() === 'white' || g.color?.toLowerCase() === '#fff';
                  const tribeColor = g.color || '#8B4513';
                  
                  // Solid black 1px outline for white tribes (8-direction technique)
                  const solidOutline = '1px 1px 0 #000, -1px 1px 0 #000, 1px -1px 0 #000, -1px -1px 0 #000, 0 1px 0 #000, 0 -1px 0 #000, 1px 0 0 #000, -1px 0 0 #000';

                  return (
                    <div 
                      key={g._id || g.id} 
                      className={`break-inside-avoid relative group transition-all duration-500 hover:-translate-y-1.5 overflow-hidden rounded-[1.75rem] border shadow-xl bg-white/40 backdrop-blur-md mb-6 ${isWhite ? 'border-black/10' : 'border-white/60'}`}
                      style={{ 
                        boxShadow: isWhite 
                          ? '0 20px 40px -15px rgba(0, 0, 0, 0.15), 0 10px 20px -10px rgba(0, 0, 0, 0.1)' 
                          : `0 15px 35px -12px ${tribeColor}15`
                      }}
                    >
                      {/* Premium Aura Glow - Adaptive Fallback */}
                      <div 
                        className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[70px] transition-all duration-1000 pointer-events-none group-hover:scale-110" 
                        style={{ 
                          background: isWhite 
                            ? 'linear-gradient(135deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.05) 50%, transparent 100%)' 
                            : tribeColor,
                          opacity: isWhite ? '1' : '0.2',
                        }}
                      ></div>

                      {/* Tribe ID Badge & Decorative Header - Compact */}
                      <div className="relative p-5 pb-1">
                        <div className="flex items-start justify-between mb-3">
                           <div className="flex flex-col">
                              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 mb-0.5 opacity-50">Unit Division</span>
                              <h4 className="text-3xl font-display tracking-tight leading-none uppercase transition-transform group-hover:scale-[1.01] origin-left" 
                                style={{ 
                                  color: tribeColor,
                                  textShadow: isWhite ? solidOutline : '0 0 1px rgba(0,0,0,0.1)'
                                }}>
                                {g.name}
                              </h4>
                           </div>
                            <div 
                             className="w-10 h-10 rounded-xl flex items-center justify-center font-display text-xl shadow-sm border"
                             style={{ 
                               backgroundColor: isWhite ? 'rgba(255,255,255,0.95)' : `${tribeColor}15`, 
                               color: tribeColor,
                               textShadow: isWhite ? solidOutline : 'none',
                               borderColor: isWhite ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)'
                             }}
                           >
                             {String(idx + 1).padStart(2, '0')}
                           </div>
                        </div>
                      </div>

                      <div className="p-5 pt-1 space-y-3 relative z-10">
                        {/* Command Deck: Elevated Capsules - Dense */}
                        <div className="space-y-1.5">
                          {g.leader && (
                            <div className="flex items-center gap-2.5 p-2.5 rounded-[1rem] bg-white shadow-sm border border-brand-sand/10 group/role transition-all hover:shadow-md" style={{ borderLeft: `3px solid ${g.color || '#8B4513'}` }}>
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover/role:scale-105 shadow-sm bg-gray-50" 
                                style={{ 
                                  color: tribeColor,
                                  border: isWhite ? '1px solid rgba(0,0,0,0.05)' : 'none'
                                }}>
                                <Star 
                                  size={14} 
                                  fill="currentColor" 
                                  stroke={isWhite ? "#000" : "currentColor"} 
                                  strokeWidth={isWhite ? 2 : 1.5} 
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[7px] font-black uppercase text-gray-400 tracking-widest leading-none mb-1 flex items-center gap-1">
                                   Tribe Leader
                                </p>
                                <p className="text-sm font-bold text-gray-800 truncate leading-none tracking-tight">{g.leader}</p>
                              </div>
                            </div>
                          )}
                          {g.assistantLeader && (
                            <div className="flex items-center gap-2.5 p-2 rounded-[1rem] bg-white/60 backdrop-blur-sm border border-brand-sand/10 group/role transition-all hover:shadow-md" style={{ borderLeft: `3px solid ${g.color || '#8B4513'}80` }}>
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-xs bg-gray-50/50" 
                                style={{ 
                                  color: tribeColor
                                }}>
                                <Shield 
                                  size={12} 
                                  stroke={isWhite ? "#000" : "currentColor"} 
                                  strokeWidth={isWhite ? 3 : 2} 
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[7px] font-black uppercase text-gray-400 tracking-widest leading-none mb-1">Alpha Assistant</p>
                                <p className="text-xs font-bold text-gray-800 truncate leading-none">{g.assistantLeader}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Operational Support Pill Grid - Tighter */}
                        <div className="grid grid-cols-2 gap-1.5">
                          {g.pointKeeper && (
                            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/40 border border-white/60 shadow-sm">
                              <div className="p-1 rounded-md bg-white/60 shadow-xs" 
                                style={{ 
                                  color: tribeColor,
                                  border: isWhite ? '1px solid rgba(0,0,0,0.05)' : 'none'
                                }}>
                                <Target 
                                  size={10} 
                                  stroke={isWhite ? "#000" : "currentColor"} 
                                  strokeWidth={isWhite ? 3 : 2} 
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[6px] font-black uppercase text-gray-400 tracking-widest leading-none mb-0.5">PK</p>
                                <p className="text-[10px] font-bold text-gray-700 truncate leading-none">{g.pointKeeper}</p>
                              </div>
                            </div>
                          )}
                          {g.flagBearer && (
                            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/40 border border-white/60 shadow-sm">
                              <div className="p-1 rounded-md bg-white/60 shadow-xs" 
                                style={{ 
                                  color: tribeColor,
                                  border: isWhite ? '1px solid rgba(0,0,0,0.05)' : 'none'
                                }}>
                                <Flag 
                                  size={10} 
                                  stroke={isWhite ? "#000" : "currentColor"} 
                                  strokeWidth={isWhite ? 3 : 2} 
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[6px] font-black uppercase text-gray-400 tracking-widest leading-none mb-0.5">FB</p>
                                <p className="text-[10px] font-bold text-gray-700 truncate leading-none">{g.flagBearer}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Specialized Logistics Team */}
                        {(g.grabMasters?.some((m: string) => m) || g.facilitators?.length > 0) && (
                          <div className="p-3 rounded-2xl bg-black/5 border border-black/5 space-y-2">
                             {g.grabMasters?.some((m: string) => m) && (
                               <div className="grid grid-cols-2 gap-1">
                                 {g.grabMasters.slice(0, 4).map((m: string, i: number) => m && (
                                   <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-gray-100 shadow-xs">
                                      <Hand size={8} className="text-gray-400" />
                                      <span className="text-[10px] font-bold text-gray-700 truncate">{m}</span>
                                   </div>
                                 ))}
                               </div>
                             )}
                             {g.facilitators?.length > 0 && (
                               <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                                  <div className="flex gap-1">
                                    {g.facilitators.map((facil: string, i: number) => (
                                      <span key={i} className="shrink-0 text-[9.5px] font-black uppercase tracking-tight px-2 py-1 rounded-lg bg-indigo-500 text-white shadow-sm shadow-indigo-200/50">{facil}</span>
                                    ))}
                                  </div>
                               </div>
                             )}
                          </div>
                        )}

                        {/* Tactical Status Grid - Personnel */}
                        {g.members?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100/60">
                            {(() => {
                              const registered = g.members.filter(m => registrants.some(r => (r.fullName || '').toLowerCase().trim() === m.toLowerCase().trim()));
                              const pending = g.members.filter(m => !registrants.some(r => (r.fullName || '').toLowerCase().trim() === m.toLowerCase().trim()));
                              
                              return (
                                <div className="space-y-4">
                                  {registered.length > 0 && (
                                    <div className="bg-black/5 rounded-2xl p-3 border border-black/5 shadow-inner">
                                      <div className="flex items-center justify-between mb-3 px-1">
                                        <div className="flex flex-col">
                                          <h5 className="text-[9px] font-black uppercase text-gray-500 tracking-[0.2em] mb-0.5">Unit Personnel</h5>
                                          <p className="text-[7px] text-gray-400 font-bold uppercase tracking-wider">{registered.length} Verified Records</p>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                        {registered.map((m: string, i: number) => {
                                          const reg = registrants.find(r => (r.fullName || '').toLowerCase().trim() === m.toLowerCase().trim());
                                          const vColor = getChurchVibrantColor(reg?.church || '', appSettings?.churchColors);
                                          return (
                                            <div
                                              key={i}
                                              className="group/member relative bg-white border border-gray-100 rounded-xl p-2 transition-all hover:translate-y-[-2px] hover:shadow-lg hover:border-brand-sand/30 overflow-hidden"
                                              title={`${m} • ${reg?.church || 'Unknown'}`}
                                            >
                                              {/* 4px Tactical Accent */}
                                              <div className={`absolute top-0 left-0 bottom-0 w-1 ${vColor}`} />
                                              
                                              <div className="pl-1">
                                                <p className="text-[11px] font-bold text-gray-800 truncate leading-none mb-2">{m}</p>
                                                
                                                {/* Micro-Church Badge */}
                                                <div className="flex">
                                                  <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full text-white tracking-widest uppercase ${vColor} shadow-sm truncate max-w-[80px]`}>
                                                    {reg?.church || 'Unknown'}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {pending.length > 0 && (
                                    <div className="bg-amber-50/10 p-4 rounded-2xl border border-dashed border-amber-200/40 relative overflow-hidden">
                                      <div className="absolute top-0 right-0 w-16 h-16 bg-amber-100/20 blur-2xl rounded-full" />
                                      <div className="flex items-center justify-between mb-3 px-0.5">
                                        <h5 className="text-[8px] font-black uppercase text-amber-700/60 tracking-widest flex items-center gap-1.5">
                                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                          Unverified ({pending.length})
                                        </h5>
                                      </div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {pending.map((m: string, i: number) => (
                                          <div
                                            key={i}
                                            className="relative flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-white/80 border border-amber-200/50 group/pending transition-all hover:bg-white hover:border-amber-300"
                                          >
                                            <span className="text-[10px] font-bold text-amber-900/70 truncate mr-2">{m}</span>
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-200 group-hover/pending:bg-amber-400 transition-colors" />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
               </div>

               {ungrouped.length > 0 && (
                  <div className="mt-20 bg-white/60 backdrop-blur-md rounded-[3rem] p-8 border border-white/80 shadow-2xl">
                     <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-3xl bg-brand-brown text-white flex items-center justify-center shadow-lg">
                           <Users size={24} />
                        </div>
                        <div>
                           <h4 className="text-2xl font-display text-brand-brown leading-none mb-1">Member Directory</h4>
                           <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest underline decoration-brand-sand underline-offset-4">UNGARNERED PARTICIPANTS • AWAITING TRIBE ASSIGNMENT</p>
                        </div>
                     </div>
                     <div className="flex flex-wrap gap-2">
                        {ungrouped.map(r => (
                          <div key={r._id || r.id} className="flex items-center gap-3 px-4 py-2 bg-white/80 rounded-2xl border border-brand-sand/10 shadow-sm transition-transform hover:scale-105">
                             <div className={`w-2 h-2 rounded-full ${getChurchVibrantColor((r.church || '').trim(), appSettings?.churchColors)} shadow-sm`}></div>
                             <span className="text-xs font-bold text-gray-700">{r.fullName}</span>
                             <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest border-l pl-3 ml-1">{r.church?.trim()}</span>
                          </div>
                        ))}
                     </div>
                  </div>
               )}
            </div>
          )}
        </div>
      </main>

      <style>{`
        @media print {
          @page { size: A4; margin: 1cm; }
          .no-print { display: none !important; }
          #print-root { display: block !important; visibility: visible !important; position: static !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
          #print-root * { visibility: visible !important; color: black !important; border-color: black !important; }
          .print-page-break { break-before: page; page-break-before: always; margin-top: 0 !important; border-top: none !important; }
        }
      `}</style>
      
      <div id="print-root" className="hidden print:block p-0 bg-white font-serif">
        {activeTab === 'groups' ? (
          <div className="flex flex-col text-black">
             {groups.map((tribe, tribeIdx) => (
                <div key={tribe._id} className={`${tribeIdx > 0 ? 'print-page-break' : ''} border-2 border-black p-8 relative min-h-[27.5cm] flex flex-col`}>
                   {/* Per-Page Header */}
                   <div className="bg-black text-white p-6 flex flex-col items-center justify-center text-center mb-10">
                      <h1 className="text-4xl font-bold tracking-[0.2em] uppercase leading-none mb-2">LAKBAY CAMP 2026</h1>
                      <p className="text-[10px] font-black tracking-[0.5em] uppercase border-t border-white/20 pt-2 opacity-80">
                         Official Organizational Roster • Generated {new Date().toLocaleDateString()}
                      </p>
                   </div>
                   
                   {/* Tribe ID Tag */}
                   <div className="absolute top-[160px] right-8 bg-black text-white px-4 py-1 text-[10px] font-bold uppercase tracking-widest">
                      UNIT {tribeIdx + 1}
                   </div>

                   <h2 className="text-3xl font-bold mb-6 border-b-4 border-black pb-2 uppercase tracking-tighter">
                      TRIBE: <span className="font-black italic">{tribe.name}</span>
                   </h2>
                   
                   {/* Executive Core Grid */}
                   <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="border border-black p-3 bg-gray-50 flex flex-col">
                         <span className="text-[9px] font-bold uppercase tracking-widest text-black/40 mb-1 leading-none">Command / Leader</span>
                         <span className="text-lg font-black">{tribe.leader || 'UNASSIGNED'}</span>
                      </div>
                      <div className="border border-black p-3 flex flex-col">
                         <span className="text-[9px] font-bold uppercase tracking-widest text-black/40 mb-1 leading-none">Co-Command / Assistant</span>
                         <span className="text-lg font-black">{tribe.assistantLeader || 'UNASSIGNED'}</span>
                      </div>
                      <div className="border border-black p-3 flex flex-col">
                         <span className="text-[9px] font-bold uppercase tracking-widest text-black/40 mb-1 leading-none">Intelligence / Point Keeper</span>
                         <span className="text-base font-bold">{tribe.pointKeeper || '---'}</span>
                      </div>
                      <div className="border border-black p-3 flex flex-col">
                         <span className="text-[9px] font-bold uppercase tracking-widest text-black/40 mb-1 leading-none">Vanguard / Flag Bearer</span>
                         <span className="text-base font-bold">{tribe.flagBearer || '---'}</span>
                      </div>
                   </div>

                   {/* Tactics / Grab Masters */}
                   <div className="mb-8 border-t border-gray-100 pt-4">
                      <h3 className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                         <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                         Facilitators & Logistics
                      </h3>
                      <div className="flex flex-wrap gap-x-6 gap-y-2">
                         {[...(tribe.facilitators || []), ...(tribe.grabMasters || [])].filter(Boolean).map((f, i) => (
                           <div key={i} className="flex items-center gap-2 text-sm font-bold min-w-[200px] border-b border-gray-100 pb-1 italic">
                              <span className="opacity-30">[{i + 1}]</span> {f}
                           </div>
                         ))}
                      </div>
                   </div>

                   {/* Roster Table */}
                   <div>
                      <h3 className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                         <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                         Unit Personnel Roster
                      </h3>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                         {tribe.members.map((m, i) => {
                            const reg = registrants.find(r => r.fullName.toLowerCase().trim() === m.toLowerCase().trim());
                            return (
                               <div key={i} className="flex justify-between border-b border-gray-200 py-1 text-xs">
                                  <div className="flex items-center gap-2">
                                     <span className="text-[10px] opacity-30 font-bold">{i + 1}.</span>
                                     <span className="font-bold">{m}</span>
                                  </div>
                                  <span className="text-[9px] font-black uppercase opacity-60 italic">{reg?.church || 'GUEST'}</span>
                               </div>
                            );
                         })}
                      </div>
                   </div>
                </div>
             ))}
          </div>
        ) : (
          <div className="flex flex-col text-black px-10">
            {/* Dossier Header (Single for Departments) */}
            <div className="bg-black text-white p-6 flex flex-col items-center justify-center text-center mb-10">
               <h1 className="text-4xl font-bold tracking-[0.2em] uppercase leading-none mb-2">LAKBAY CAMP 2026</h1>
               <p className="text-[10px] font-black tracking-[0.5em] uppercase border-t border-white/20 pt-2 opacity-80">
                  Official Organizational Roster • Generated {new Date().toLocaleDateString()}
               </p>
            </div>

            <div className="space-y-12">
              {/* Personnel Listing Table */}
              {Array.from(new Set(leaders.flatMap(s => getCategories(s))))
                .filter(cat => activeTab === 'leaders' ? cat === 'Youth Leader' : cat !== 'Youth Leader')
                .sort((a, b) => a === 'Camp Head' ? -1 : b === 'Camp Head' ? 1 : a.localeCompare(b))
                .map(category => (
                  <div key={category} className="break-inside-avoid">
                     <h2 className="bg-black text-white px-4 py-2 text-sm font-black uppercase tracking-widest mb-4 inline-block self-start">
                        DEPARTMENT: {category}
                     </h2>
                     <div className="grid grid-cols-2 gap-x-12 gap-y-2 border-t-4 border-black pt-4">
                        {leaders.filter(s => getCategories(s).includes(category)).map((s, idx) => (
                          <div key={s._id || s.id} className="flex justify-between items-baseline border-b border-gray-100 py-1.5">
                             <div className="flex items-center gap-3">
                                <span className="text-[10px] opacity-30 font-bold">{idx + 1}.</span>
                                <span className="text-sm font-bold">{s.name}</span>
                             </div>
                             <div className="text-right">
                                <p className="text-[9px] font-black uppercase italic opacity-60 leading-none mb-1">{s.roleTitle || 'Personnel'}</p>
                                {s.churchRef && s.churchRef !== 'JAM' && <p className="text-[7px] font-bold opacity-40 uppercase tracking-tighter">{s.churchRef}</p>}
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="mt-20 border-t-2 border-black pt-6 flex justify-between items-end opacity-20">
           <div className="text-[10px] font-black tracking-widest uppercase">LAKBAY COMMAND • OFFICIAL OUTPUT</div>
           <div className="text-[10px] font-bold uppercase tracking-tighter italic">AUTHENTICATED CAMP DOCUMENT</div>
        </div>
      </div>
    </div>
  );
}
