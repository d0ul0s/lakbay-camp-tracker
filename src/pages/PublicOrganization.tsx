import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Shield, Map, Tent, Star, Flag, Target, Hand, Loader2, ArrowLeft, ExternalLink } from 'lucide-react';
import api from '../api/axios';
import { useAppStore } from '../store';
import { getChurchColor, getChurchVibrantColor } from '../utils/churchColorUtils';
import CampCountdown from '../components/CampCountdown';

interface CampLeader {
  _id?: string;
  id?: string;
  name: string;
  churchRef: string | null;
  categories: string[];   // multi-role support
  category?: string;      // legacy compat
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

// Helper: get effective categories for a leader
const getCategories = (l: CampLeader) => {
  if (l.categories && l.categories.length > 0) return l.categories;
  if (l.category) return [l.category];
  return [];
};


export default function PublicOrganization() {
  const { appSettings, isServerAwake } = useAppStore();
  const [leaders, setLeaders] = useState<CampLeader[]>([]);
  const [groups, setGroups] = useState<CampGroup[]>([]);
  const [registrants, setRegistrants] = useState<{ id: string, fullName: string, church: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'departments' | 'leaders' | 'groups'>('departments');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Use individual fetches or allSettled to prevent one failure from blanking the page
      const results = await Promise.allSettled([
        api.get('/api/org/leaders'),
        api.get('/api/org/groups'),
        api.get('/api/org/registrants')
      ]);

      if (results[0].status === 'fulfilled') setLeaders(results[0].value.data);
      if (results[1].status === 'fulfilled') setGroups(results[1].value.data);
      if (results[2].status === 'fulfilled') setRegistrants(results[2].value.data);
      
    } catch (err) {
      console.error('Unexpected error loading org data', err);
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

  // Processing
  const staff = leaders;
  const youthLeaders = leaders.filter(l => getCategories(l).includes('Youth Leader'));

  // Dynamic fallback for church list if settings haven't loaded yet
  const effectiveChurches = (appSettings?.churches && appSettings.churches.length > 0)
    ? appSettings.churches.filter((c: string) => c !== 'JAM')
    : Array.from(new Set(youthLeaders.filter(yl => yl.churchRef && yl.churchRef !== 'JAM').map(yl => yl.churchRef as string))).sort();


  return (
    <div className="min-h-screen bg-brand-cream font-sans">
      {/* Public Header */}
      <header className="bg-brand-brown/95 text-white py-3 px-6 md:px-10 shadow-xl sticky top-0 z-[100] flex items-center justify-between backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-3 md:gap-4 font-display tracking-widest leading-none">
          <img src="/logo.svg" alt="LAKBAY" className="h-8 w-8 md:h-10 md:w-10 filter drop-shadow-md" />
          <h1 className="text-lg md:text-xl hidden sm:block uppercase font-bold">LAKBAY CAMP</h1>
        </div>
        <Link to="/login" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 active:bg-white/30 px-4 py-2 rounded-xl transition-all font-bold text-xs backdrop-blur-sm shadow-inner uppercase tracking-wider border border-white/10">
          <ArrowLeft size={14} /> Back to Login
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative pb-20">
        {isLoading && (
          <div className="absolute top-0 right-0 p-4 z-10 flex gap-2 items-center text-brand-brown/50">
            <Loader2 className="animate-spin w-5 h-5" />
          </div>
        )}

        <div>
          <h2 className="text-3xl md:text-5xl font-display text-brand-brown tracking-wide mb-2 flex items-center gap-3">
            <Map className="text-brand-brown w-8 h-8 md:w-10 md:h-10" /> Camp Organization
          </h2>
          <p className="text-gray-500 font-medium text-sm md:text-base mt-2 border-l-4 border-brand-sand/50 pl-4">Official camp groupings, staff roster, and church youth leaders.</p>
        </div>

        <CampCountdown />

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-1 bg-brand-sand/10 rounded-2xl w-full sm:w-fit mb-4 border border-brand-sand/5 shadow-inner">
          {[
            { id: 'departments', label: 'Departments', icon: <Shield size={16} /> },
            { id: 'leaders', label: 'YL', icon: <Users size={16} /> },
            { id: 'groups', label: 'Tribes', icon: <Tent size={16} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[12px] sm:text-sm font-bold transition-all duration-300 ${activeTab === tab.id
                ? 'bg-white text-brand-brown shadow-sm shadow-brand-brown/5 ring-1 ring-brand-sand/20'
                : 'text-gray-400 hover:text-brand-brown/70'
                }`}
            >
              {tab.icon}
              <span className={activeTab === tab.id ? 'inline' : 'hidden sm:inline'}>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="min-h-[500px]">
          {/* 1. CAMP STAFF & DEPARTMENTS */}
          {activeTab === 'departments' && (
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center gap-2 mb-6 text-brand-brown/40">
                <Shield size={18} />
                <h3 className="text-sm font-black uppercase tracking-widest">Administrative Departments</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                {staff.length === 0 && <p className="text-gray-400 text-sm italic col-span-full">Staff structures are currently being finalized.</p>}
                {Array.from(new Set(staff.flatMap(s => getCategories(s))))
                  .filter(cat => cat !== 'Youth Leader')
                  .sort((a, b) => a === 'Camp Head' ? -1 : b === 'Camp Head' ? 1 : a.localeCompare(b))
                  .map(category => {
                    const isCampHead = category === 'Camp Head';
                    return (
                      <div key={category} className={`bg-white rounded-2xl p-3 border transition-all ${isCampHead ? 'border-brand-brown/20 bg-gradient-to-br from-white to-amber-50/10' : 'border-gray-50 shadow-sm shadow-brand-brown/5'
                        }`}>
                        <h4 className={`font-black uppercase text-[10px] tracking-widest mb-2.5 border-b pb-1.5 flex items-center gap-2 ${isCampHead ? 'text-brand-brown border-amber-200' : 'text-gray-400 border-gray-50'
                          }`}>
                          {isCampHead && <Star size={12} className="text-amber-500" fill="currentColor" />}
                          {category}
                        </h4>
                        <div className="flex flex-col gap-1.5">
                          {staff.filter(s => getCategories(s).includes(category)).map(s => (
                            <div key={s._id || s.id} className="flex items-center justify-between group p-2 hover:bg-gray-50 rounded-xl transition-colors border border-transparent">
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden border border-gray-100">
                                  {s.image ? <img src={s.image} alt={s.name} className="w-full h-full object-cover" /> : <span className="font-display text-brand-brown text-xs">{s.name.charAt(0)}</span>}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-sm leading-none flex items-center gap-1.5 truncate">
                                    {s.socialLink ? (
                                      <a href={s.socialLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-brand-brown hover:underline truncate flex items-center gap-1" title="View Social Profile">
                                        {s.name}
                                        <ExternalLink size={10} className="opacity-70" />
                                      </a>
                                    ) : (
                                      <span className="text-gray-800">{s.name}</span>
                                    )}
                                  </p>
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
            </section>
          )}

          {/* 2. YOUTH LEADERS */}
          {activeTab === 'leaders' && (
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center gap-2 mb-6 text-brand-brown/40">
                <Users size={18} />
                <h3 className="text-sm font-black uppercase tracking-widest">Church Youth Leaders</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 md:gap-3">
                {effectiveChurches.map((church: string) => {
                  const churchLeaders = youthLeaders.filter(yl => yl.churchRef === church);
                  return (
                    <div key={church} className="bg-white border border-gray-100 rounded-2xl p-2.5 hover:border-brand-sand transition-all shadow-sm shadow-brand-brown/5">
                       <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 border-b border-gray-100 pb-1">{church}</h4>
                       <div className="space-y-1.5">
                         {churchLeaders.length > 0 ? (
                           churchLeaders.map(cl => (
                             <div key={cl._id || cl.id} className="flex items-center justify-between group bg-gray-50/50 p-2 rounded-xl transition-all border border-transparent">
                               <div className="flex items-center gap-3">
                                 <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden border border-gray-100">
                                  {cl.image ? <img src={cl.image} alt={cl.name} className="w-full h-full object-cover" /> : <span className="font-display text-brand-brown text-xs">{cl.name.charAt(0)}</span>}
                                 </div>
                                 <div className="min-w-0">
                                   <p className="text-sm font-bold leading-none flex items-center gap-1.5 truncate">
                                     {cl.socialLink ? (
                                       <a href={cl.socialLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-brand-brown hover:underline truncate flex items-center gap-1" title="View Social Profile">
                                         {cl.name}
                                         <ExternalLink size={10} className="opacity-70" />
                                       </a>
                                     ) : (
                                       <span className="text-gray-800">{cl.name}</span>
                                     )}
                                   </p>
                                   {cl.roleTitle && <p className="text-[8px] uppercase font-black text-gray-400 tracking-tighter mt-1 truncate">{cl.roleTitle}</p>}
                                 </div>
                               </div>
                             </div>
                           ))
                         ) : (
                           <p className="text-[10px] text-gray-300 italic font-medium px-1">No assignments yet.</p>
                         )}
                       </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 3. OFFICIAL GROUPINGS */}
          {activeTab === 'groups' && (
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 mb-12">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2 text-brand-brown/40">
                  <Tent size={18} />
                  <h3 className="text-sm font-black uppercase tracking-widest">Tribal Unit Groups</h3>
                </div>
                
                {/* Church Color Legend */}
                {effectiveChurches.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-white/50 backdrop-blur-sm rounded-2xl border border-brand-sand/10 shadow-sm sm:max-w-md md:max-w-lg lg:max-w-xl self-start">
                     <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mr-1 self-center">Church Legend:</span>
                     {effectiveChurches.map((church: string) => (
                       <div key={church} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-gray-50 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                          <div className={`w-3 h-3 rounded-full border border-white shadow-sm ring-1 ring-black/5 ${getChurchVibrantColor(church, appSettings?.churchColors)}`}></div>
                          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tight">{church}</span>
                       </div>
                     ))}
                  </div>
                )}
              </div>

              {groups.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                  <p className="text-gray-300 font-medium">No tribes have been formed yet.</p>
                </div>
              ) : (
                <div className="columns-1 md:columns-2 xl:columns-3 gap-6 space-y-6">
                  {groups.map(g => (
                    <div key={g._id || g.id} className="break-inside-avoid bg-white rounded-3xl p-3 shadow-sm border border-brand-sand/20 relative group transition-all hover:shadow-md hover:border-brand-sand/50">
                      <h4 className="text-base font-display text-brand-brown tracking-wide mb-3 border-b border-brand-sand/10 pb-1">
                        {g.name}
                      </h4>

                      <div className="space-y-1.5">
                        <div className="grid grid-cols-1 gap-1.5">
                          {g.leader && (
                            <div className="flex items-center gap-2.5 p-1.5 bg-gradient-to-r from-orange-50/50 to-transparent rounded-lg border border-orange-50">
                              <div className="text-orange-400 shrink-0"><Star size={12} fill="currentColor" /></div>
                              <div className="min-w-0">
                                <p className="text-[7px] font-black uppercase text-gray-400 tracking-tighter leading-none mb-0.5">Leader</p>
                                <p className="text-xs font-bold text-gray-800 truncate leading-tight">{g.leader}</p>
                              </div>
                            </div>
                          )}
                          {g.assistantLeader && (
                            <div className="flex items-center gap-2.5 p-1.5 bg-gradient-to-r from-amber-50/50 to-transparent rounded-lg border border-amber-50">
                              <div className="text-amber-400 shrink-0"><Shield size={12} /></div>
                              <div className="min-w-0">
                                <p className="text-[7px] font-black uppercase text-gray-400 tracking-tighter leading-none mb-0.5">Assistant</p>
                                <p className="text-xs font-bold text-gray-800 truncate leading-tight">{g.assistantLeader}</p>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-1.5 mt-0.5">
                            {g.pointKeeper && (
                              <div className="flex items-center gap-2 p-1.5 bg-gray-50/50 rounded-lg">
                                <Target size={11} className="text-blue-400" />
                                <div className="min-w-0">
                                  <p className="text-[7px] font-black uppercase text-gray-300 leading-none mb-0.5">PK</p>
                                  <p className="text-[11px] font-bold text-gray-700 truncate">{g.pointKeeper}</p>
                                </div>
                              </div>
                            )}
                            {g.flagBearer && (
                              <div className="flex items-center gap-2 p-1.5 bg-gray-50/50 rounded-lg">
                                <Flag size={11} className="text-red-400" />
                                <div className="min-w-0">
                                  <p className="text-[7px] font-black uppercase text-gray-300 leading-none mb-0.5">FB</p>
                                  <p className="text-[11px] font-bold text-gray-700 truncate">{g.flagBearer}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {(g.grabMasters?.[0] || g.grabMasters?.[1]) && (
                          <div className="grid grid-cols-2 gap-1.5">
                            {g.grabMasters.slice(0, 2).map((m: string, i: number) => m && (
                              <div key={i} className="flex items-center gap-2 p-1.5 bg-gray-50/30 rounded-lg">
                                <Hand size={11} className="text-gray-400" />
                                <div className="min-w-0">
                                  <p className="text-[7px] font-black uppercase text-gray-300 leading-none mb-0.5">GM {i + 1}</p>
                                  <p className="text-[10px] font-bold text-gray-600 truncate">{m}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {g.facilitators?.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-gray-50">
                            <h5 className="text-[8px] font-black uppercase text-gray-300 tracking-widest mb-2 px-1">Facilitators</h5>
                            <div className="flex flex-wrap gap-1">
                              {g.facilitators.map((facil: string, i: number) => (
                                <span key={i} className="bg-gray-50 text-gray-400 text-[10px] px-2.5 py-1 rounded-lg font-bold border border-gray-100">{facil}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {g.members?.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            {/* Partition members by registration status */}
                            {(() => {
                              const registered = g.members.filter(m => registrants.some(r => (r.fullName || '').toLowerCase().trim() === m.toLowerCase().trim()));
                              const pending = g.members.filter(m => !registrants.some(r => (r.fullName || '').toLowerCase().trim() === m.toLowerCase().trim()));
                              
                              return (
                                <div className="space-y-4">
                                  {registered.length > 0 && (
                                    <div>
                                      <h5 className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-3 px-1">Registered Members ({registered.length})</h5>
                                      <div className="flex flex-wrap gap-1.5 px-0.5">
                                        {registered.map((m: string, i: number) => {
                                          const reg = registrants.find(r => (r.fullName || '').toLowerCase().trim() === m.toLowerCase().trim());
                                          const colorClass = getChurchColor(reg?.church || '', appSettings?.churchColors);
                                          return (
                                            <div
                                              key={i}
                                              className={`text-[9px] sm:text-[10px] px-2.5 py-1 rounded-lg font-bold border ${colorClass} transition-transform hover:scale-105 cursor-default shadow-sm`}
                                              title={reg?.church || 'Unknown Church'}
                                            >
                                              {m}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {pending.length > 0 && (
                                    <div className="bg-amber-50/20 p-2.5 rounded-2xl border border-amber-100/50">
                                      <h5 className="text-[8px] font-black uppercase text-amber-600/60 tracking-widest mb-2.5 px-1 flex items-center gap-1.5">
                                        <div className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                                        Pending Registration ({pending.length})
                                      </h5>
                                      <div className="flex flex-wrap gap-1.5 px-0.5">
                                        {pending.map((m: string, i: number) => (
                                          <div
                                            key={i}
                                            className="text-[9px] sm:text-[10px] px-2.5 py-1 rounded-lg font-bold border bg-white border-amber-300/40 text-amber-800 border-dashed transition-transform hover:scale-105 cursor-default shadow-sm"
                                            title="Not yet registered in system"
                                          >
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
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
