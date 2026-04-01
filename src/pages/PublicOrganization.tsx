import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Link } from 'react-router-dom';
import { Users, Shield, Tent, Star, Flag, Target, Loader2, Info, ArrowLeft, Printer } from 'lucide-react';
import api from '../api/axios';
import { getChurchColor, getChurchVibrantColor } from '../utils/churchColorUtils';
import CampCountdown from '../components/CampCountdown';

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
    // Only set loading if we have NO data yet (First mount)
    if (leaders.length === 0 && groups.length === 0) {
      setIsLoading(true);
    }

    try {
      // Use parallel fetching for speed
      const results = await Promise.allSettled([
        api.get('/api/org/leaders'),
        api.get('/api/org/groups'),
        api.get('/api/org/registrants')
      ]);

      if (results[0].status === 'fulfilled') setLeaders(results[0].value.data);
      if (results[1].status === 'fulfilled') setGroups(results[1].value.data);
      if (results[2].status === 'fulfilled') setRegistrants(results[2].value.data);

      // Speed-of-Success: If anything returns 200, the server is awake.
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

  // IMPORTANT: If we already have leaders or groups, do NOT show the full-screen loader.
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
    <div className="min-h-screen bg-brand-cream font-sans selection:bg-brand-brown selection:text-white relative">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-sand blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-brown/10 blur-[120px]"></div>
      </div>

      <header className="bg-brand-brown text-white py-3 px-6 md:px-10 shadow-lg sticky top-0 z-50 flex items-center justify-between mb-8 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
        <div className="flex items-center gap-3 md:gap-4 font-display tracking-widest leading-none relative z-10 cursor-default">
          <img src="/logo.svg" alt="LAKBAY" className="h-8 w-8 md:h-10 md:w-10 filter drop-shadow-md" />
          <h1 className="text-lg md:text-xl hidden sm:block uppercase font-bold tracking-widest">LAKBAY CAMP</h1>
        </div>
        <Link to="/login" className="relative z-10 flex items-center gap-2 bg-white/10 hover:bg-white/20 active:bg-white/30 px-4 py-2 rounded-xl transition-all font-bold text-xs backdrop-blur-sm shadow-inner uppercase tracking-wider border border-white/10">
          <ArrowLeft size={14} /> Back to Login
        </Link>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 pb-32 space-y-8 relative z-10">
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

        <CampCountdown />

        {/* Tab Navigation */}
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
               {/* Search/Filter Legend */}
               <div className="flex flex-wrap gap-2 mb-8 p-4 bg-white/40 backdrop-blur-md rounded-3xl border border-white/50 shadow-xl shadow-brand-brown/[0.02]">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2 self-center flex items-center gap-2"><Info size={14} className="text-brand-sand" /> Church Legend:</span>
                  {effectiveChurches.map(church => (
                    <div key={church} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/60 border border-white shadow-sm">
                       <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${getChurchVibrantColor(church, appSettings?.churchColors)}`}></div>
                       <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tight">{church}</span>
                    </div>
                  ))}
               </div>

               <div className="columns-1 md:columns-2 xl:columns-3 gap-6 space-y-6">
                {groups.map(g => (
                  <div key={g._id || g.id} className="break-inside-avoid bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-5 shadow-2xl shadow-brand-brown/[0.03] border border-white transition-all hover:scale-[1.01]">
                    <h4 className="text-2xl font-display text-brand-brown tracking-tight mb-4 border-b border-brand-sand/10 pb-2 flex items-center justify-between">
                      {g.name}
                      <Tent size={24} className="text-brand-sand opacity-40" />
                    </h4>

                    <div className="space-y-4">
                      {/* Key Roles */}
                      <div className="grid grid-cols-1 gap-2">
                        {g.leader && (
                          <div className="flex items-center gap-3 p-2 bg-gradient-to-r from-brand-sand/5 to-transparent rounded-2xl border border-brand-sand/10">
                            <div className="text-orange-400 shrink-0 w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center"><Star size={16} fill="currentColor" /></div>
                            <div className="min-w-0">
                              <p className="text-[8px] font-black uppercase text-gray-400 tracking-[0.2em] leading-none mb-1">Tribe Leader</p>
                              <p className="text-sm font-bold text-gray-800 truncate">{g.leader}</p>
                            </div>
                          </div>
                        )}
                        {g.assistantLeader && (
                          <div className="flex items-center gap-3 p-2 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                            <div className="text-amber-500 shrink-0 w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center"><Shield size={16} /></div>
                            <div className="min-w-0">
                              <p className="text-[8px] font-black uppercase text-gray-400 tracking-[0.2em] leading-none mb-1">Assistant</p>
                              <p className="text-sm font-bold text-gray-800 truncate">{g.assistantLeader}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Tactical Roles */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 p-2 bg-blue-50/30 rounded-2xl border border-blue-50">
                          <Target size={14} className="text-blue-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[7px] font-black uppercase text-gray-300 tracking-widest leading-none mb-1">Keeper</p>
                            <p className="text-xs font-bold text-gray-600 truncate">{g.pointKeeper || '---'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-red-50/30 rounded-2xl border border-red-50">
                          <Flag size={14} className="text-red-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[7px] font-black uppercase text-gray-300 tracking-widest leading-none mb-1">Bearer</p>
                            <p className="text-xs font-bold text-gray-600 truncate">{g.flagBearer || '---'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Members Section */}
                      <div className="pt-4 border-t border-gray-50 mt-2">
                        {(() => {
                          const registered = g.members.filter(m => registrants.some(r => (r.fullName || '').toLowerCase().trim() === m.toLowerCase().trim()));
                          const pending = g.members.filter(m => !registrants.some(r => (r.fullName || '').toLowerCase().trim() === m.toLowerCase().trim()));
                          
                          return (
                            <div className="space-y-4">
                              {registered.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {registered.map((m, i) => {
                                    const reg = registrants.find(r => (r.fullName || '').toLowerCase().trim() === m.toLowerCase().trim());
                                    const colorClass = getChurchColor(reg?.church || '', appSettings?.churchColors);
                                    return (
                                      <div key={i} className={`text-[10px] px-3 py-1.5 rounded-xl font-bold border ${colorClass} shadow-sm backdrop-blur-sm transition-transform hover:scale-105 cursor-default`}>
                                        {m}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {pending.length > 0 && (
                                <div className="p-3 bg-amber-50/20 rounded-2xl border border-dashed border-amber-200">
                                  <p className="text-[7px] font-black uppercase text-amber-600/50 tracking-widest mb-2 flex items-center gap-1">
                                    <div className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                                    Pending Records
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {pending.map((m, i) => (
                                      <div key={i} className="text-[10px] px-2.5 py-1.5 rounded-lg font-bold border border-amber-200/50 bg-white text-amber-800 shadow-sm">
                                        {m}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
               </div>

               {/* Ungrouped Participants (Self-Finding Panel) */}
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
                             <div className={`w-2 h-2 rounded-full ${getChurchVibrantColor(r.church || '', appSettings?.churchColors)} shadow-sm`}></div>
                             <span className="text-xs font-bold text-gray-700">{r.fullName}</span>
                             <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest border-l pl-3 ml-1">{r.church}</span>
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
          @page { margin: 1cm; }
          body > *:not(#print-root) { display: none !important; }
          #print-root { display: block !important; visibility: visible !important; position: static !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
          #print-root * { visibility: visible !important; }
        }
      `}</style>
      
      <div id="print-root" className="hidden print:block p-10 bg-white">
        <div className="border-b-4 border-gray-900 pb-4 mb-10">
           <h1 className="text-4xl font-display font-black tracking-widest">LAKBAY CAMP 2026</h1>
           <p className="text-sm font-bold uppercase tracking-widest text-gray-500">Official Roster • {new Date().toLocaleDateString()}</p>
        </div>
        
        {activeTab === 'groups' ? (
          <div className="grid grid-cols-2 gap-10">
             {groups.map(tribe => (
               <div key={tribe._id} className="break-inside-avoid border-t-2 border-gray-800 pt-4">
                 <h2 className="text-2xl font-black mb-4 uppercase">{tribe.name}</h2>
                 <p className="text-sm mb-1"><strong>Leader:</strong> {tribe.leader}</p>
                 <p className="text-sm mb-4"><strong>Assistant:</strong> {tribe.assistantLeader}</p>
                 <div className="text-[10px] space-y-1">
                   {tribe.members.map((m, i) => <div key={i}>• {m}</div>)}
                 </div>
               </div>
             ))}
          </div>
        ) : (
          <div className="columns-2">
            {leaders.map(l => (
              <div key={l._id} className="py-2 border-b border-gray-100 flex justify-between">
                <span className="font-bold">{l.name}</span>
                <span className="text-xs italic">{getCategories(l).join(', ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
