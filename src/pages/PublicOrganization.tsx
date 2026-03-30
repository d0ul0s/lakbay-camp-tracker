import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Shield, Map, Tent, Star, Flag, Target, Hand, Loader2, ArrowLeft, ExternalLink } from 'lucide-react';
import api from '../api/axios';
import { useAppStore } from '../store';

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

export default function PublicOrganization() {
  const { isServerAwake } = useAppStore();
  const [leaders, setLeaders] = useState<CampLeader[]>([]);
  const [groups, setGroups] = useState<CampGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [leadersRes, groupsRes] = await Promise.all([
        api.get('/api/org/leaders'),
        api.get('/api/org/groups')
      ]);
      setLeaders(leadersRes.data);
      setGroups(groupsRes.data);
    } catch (err) {
      console.error('Failed to load org data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refetch when the server wakes up after a cold start
  useEffect(() => {
    if (isServerAwake) fetchData();
  }, [isServerAwake]);

  const getCategories = (l: CampLeader) => {
    if (l.categories && l.categories.length > 0) return l.categories;
    if (l.category) return [l.category];
    return [];
  };

  // For the staff section, we allow all leaders but we only render their non-"Youth Leader" roles
  const staff = leaders;
  const youthLeaders = leaders.filter(l => getCategories(l).includes('Youth Leader'));
  
  // Dynamically extract churches with youth leaders assigned to them
  const activeChurches = Array.from(new Set(youthLeaders.filter(yl => yl.churchRef).map(yl => yl.churchRef as string))).sort();

  return (
    <div className="min-h-screen bg-brand-cream font-sans">
      {/* Public Header */}
      <header className="bg-brand-brown text-white py-4 px-6 md:px-10 shadow-lg sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          <img src="/logo.svg" alt="LAKBAY" className="h-10 w-10 md:h-12 md:w-12 filter drop-shadow-md" />
          <h1 className="text-xl md:text-2xl font-display tracking-widest hidden sm:block">LAKBAY CAMP</h1>
        </div>
        <Link to="/login" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-colors font-bold text-sm backdrop-blur-sm">
          <ArrowLeft size={16} /> Back to Login
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 relative pb-20">
        {isLoading && (
          <div className="absolute top-4 right-4 flex gap-2 items-center text-brand-brown/50">
            <Loader2 className="animate-spin w-5 h-5" /> 
            <span className="text-sm font-bold uppercase tracking-widest">Loading...</span>
          </div>
        )}

        <div>
          <h2 className="text-3xl md:text-5xl font-display text-brand-brown tracking-wide mb-2 flex items-center gap-3 border-b-2 border-brand-sand pb-4">
            <Map className="text-brand-brown w-8 h-8 md:w-10 md:h-10" /> Camp Organization Structure
          </h2>
          <p className="text-gray-500 font-medium text-sm md:text-base mt-4">Welcome to the official LAKBAY Camp Organization board! Below you will find the designated camp administrators, youth leaders, and the master list of tribes and roles for this year's camp.</p>
        </div>

        {/* 1. CAMP STAFF & DEPARTMENTS */}
        <section>
          <div className="flex items-center gap-2 mb-6">
             <Shield className="text-brand-brown text-opacity-80 drop-shadow-sm" size={24} />
             <h3 className="text-2xl md:text-3xl font-display text-brand-brown tracking-wide">Camp Departments</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            {staff.length === 0 && <p className="text-gray-400 text-sm italic col-span-full bg-white p-6 rounded-2xl border border-dashed border-gray-300">Staff structures are currently being finalized.</p>}
            {Array.from(new Set(staff.flatMap(s => getCategories(s))))
              .filter(cat => cat !== 'Youth Leader') // Staff section only shows staff roles
              .sort((a, b) => a === 'Camp Head' ? -1 : b === 'Camp Head' ? 1 : a.localeCompare(b))
              .map(category => {
                const isCampHead = category === 'Camp Head';
                return (
                  <div key={category} className={`rounded-2xl p-5 md:p-6 shadow-md shadow-brand-brown/5 border transform hover:-translate-y-1 transition-all duration-300 ${
                    isCampHead 
                      ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300 shadow-amber-100' 
                      : 'bg-white border-brand-sand/50'
                  }`}>
                    <h4 className={`font-black uppercase text-[11px] md:text-xs tracking-widest mb-4 border-b pb-3 flex items-center gap-2 ${
                      isCampHead ? 'text-amber-700 border-amber-200' : 'text-brand-brown border-gray-100'
                    }`}>
                      {isCampHead 
                        ? <Star size={14} className="text-amber-500" fill="currentColor" /> 
                        : <div className="w-2 h-2 rounded-full bg-brand-light-brown shadow-sm shadow-brand-brown/30"></div>
                      }
                      {category}
                      {isCampHead && <span className="ml-auto text-[10px] font-bold text-amber-600 bg-amber-100 px-2.5 py-0.5 rounded-full tracking-widest">LEADERSHIP</span>}
                    </h4>
                 <div className="flex flex-col gap-2">
                    {staff.filter(s => getCategories(s).includes(category)).map(s => (
                     <div key={s._id || s.id} className="flex items-center justify-between group p-2 hover:bg-brand-cream/50 rounded-xl transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-sand/30 to-brand-cream flex items-center justify-center shrink-0 overflow-hidden border border-brand-sand/50 shadow-inner">
                            {s.image ? <img src={s.image} alt={s.name} className="w-full h-full object-cover" /> : <span className="font-display text-brand-brown text-base">{s.name.charAt(0)}</span>}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 leading-tight flex items-center gap-1.5">
                              {s.socialLink ? (
                                <a href={s.socialLink} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline flex items-center gap-1" title="View Social Profile">{s.name} <ExternalLink size={10} className="text-gray-400" /></a>
                              ) : (
                                s.name
                              )}
                            </p>
                            {s.roleTitle && <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mt-0.5">{s.roleTitle}</p>}
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

        {/* 2. YOUTH LEADERS */}
        <section>
          <div className="flex items-center gap-2 mb-6">
             <Users className="text-brand-brown text-opacity-80 drop-shadow-sm" size={24} />
             <h3 className="text-2xl md:text-3xl font-display text-brand-brown tracking-wide">Church Youth Leaders</h3>
          </div>
          {activeChurches.length === 0 ? (
            <p className="text-gray-400 text-sm italic col-span-full bg-white p-6 rounded-2xl border border-dashed border-gray-300">No youth leaders assigned yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
              {activeChurches.map((church: string) => {
                const churchLeaders = youthLeaders.filter(yl => yl.churchRef === church);
                return (
                  <div key={church} className="bg-gradient-to-br from-white to-gray-50 border border-brand-beige rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                     <h4 className="text-[11px] font-black uppercase text-gray-400 tracking-widest mb-3 border-b border-gray-100 pb-2">{church}</h4>
                     <div className="grid grid-cols-1 gap-3">
                       {churchLeaders.map(cl => (
                         <div key={cl._id || cl.id} className="flex items-center justify-between group bg-white border border-gray-50 p-2.5 rounded-lg shadow-sm">
                           <div className="flex items-center gap-2.5">
                             <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 overflow-hidden border border-brand-sand/30 shadow-inner">
                               {cl.image ? <img src={cl.image} alt={cl.name} className="w-full h-full object-cover" /> : <span className="font-display text-brand-brown text-[10px]">{cl.name.charAt(0)}</span>}
                             </div>
                             <div>
                               <p className="text-sm font-bold text-brand-brown leading-none flex items-center gap-1.5">
                                 {cl.socialLink ? (
                                   <a href={cl.socialLink} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline flex items-center gap-1" title="View Social Profile">{cl.name} <ExternalLink size={10} className="text-gray-400" /></a>
                                 ) : (
                                   cl.name
                                 )}
                               </p>
                               {cl.roleTitle && <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wider mt-1">{cl.roleTitle}</p>}
                             </div>
                           </div>
                         </div>
                       ))}
                     </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 3. OFFICIAL GROUPINGS */}
        <section className="bg-brand-brown rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden mt-16 border-4 border-brand-cream/20">
          <div className="absolute -top-10 -right-10 w-96 h-96 bg-brand-light-brown/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-white/5 to-transparent pointer-events-none"></div>
          
          <div className="flex items-center gap-4 mb-10 relative z-10 border-b border-white/10 pb-6">
             <Tent className="text-brand-cream h-12 w-12 p-2.5 bg-white/10 rounded-2xl shadow-inner backdrop-blur-sm" />
             <div>
               <h3 className="text-3xl md:text-4xl font-display text-white tracking-wide leading-none">Official Groupings</h3>
               <p className="text-brand-cream/80 text-sm md:text-base mt-2 font-medium tracking-wide">Tribes and specialized unit roles for the duration of the camp</p>
             </div>
          </div>
          
          {groups.length === 0 ? (
            <div className="text-center py-16 relative z-10 bg-black/10 rounded-2xl backdrop-blur-sm border border-white/5">
               <p className="text-white/60 text-lg font-medium tracking-wide uppercase">Groupings are not yet finalized.</p>
            </div>
          ) : (
            <div className="columns-1 md:columns-2 xl:columns-3 gap-6 space-y-6 relative z-10">
              {groups.map(g => (
                <div key={g._id || g.id} className="break-inside-avoid bg-white rounded-3xl p-6 shadow-2xl relative border-[3px] border-brand-cream/30 overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-brown via-brand-sand to-brand-brown"></div>
                  
                  <h4 className="text-2xl md:text-3xl font-display text-brand-brown tracking-wide mb-6 flex items-center gap-2 drop-shadow-sm">
                    {g.name}
                  </h4>

                  <div className="space-y-3 p-1">
                    {g.leader && (
                      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-50 to-orange-50/20 rounded-xl border border-orange-100 shadow-sm">
                        <div className="bg-orange-100 p-2 rounded-lg text-orange-600 shrink-0 shadow-inner"><Star size={18} fill="currentColor" /></div>
                        <div>
                          <p className="text-[10px] md:text-xs font-black uppercase text-orange-600 tracking-widest leading-none mb-1">Leader</p>
                          <p className="text-sm md:text-base font-bold text-gray-900 leading-tight">{g.leader}</p>
                        </div>
                      </div>
                    )}
                    {g.assistantLeader && (
                      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-amber-50/20 rounded-xl border border-amber-100 shadow-sm mt-2">
                        <div className="bg-amber-100 p-2 rounded-lg text-amber-600 shrink-0 shadow-inner"><Shield size={18} /></div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest leading-none mb-1">Asst. Leader</p>
                          <p className="text-sm md:text-base font-bold text-gray-800 leading-tight">{g.assistantLeader}</p>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {g.pointKeeper && (
                        <div className="flex flex-col justify-center gap-1.5 p-2.5 bg-blue-50/50 rounded-xl border border-blue-100 hover:bg-blue-50 transition-colors">
                          <div className="flex items-center gap-1.5"><Target size={14} className="text-blue-600"/> <p className="text-[9px] font-black uppercase text-blue-600 tracking-widest leading-none truncate">Point Keeper</p></div>
                          <p className="text-xs md:text-sm font-bold text-gray-800 truncate px-1">{g.pointKeeper}</p>
                        </div>
                      )}
                      {g.flagBearer && (
                        <div className="flex flex-col justify-center gap-1.5 p-2.5 bg-red-50/50 rounded-xl border border-red-100 hover:bg-red-50 transition-colors">
                          <div className="flex items-center gap-1.5"><Flag size={14} className="text-red-600"/> <p className="text-[9px] font-black uppercase text-red-600 tracking-widest leading-none truncate">Flag Bearer</p></div>
                          <p className="text-xs md:text-sm font-bold text-gray-800 truncate px-1">{g.flagBearer}</p>
                        </div>
                      )}
                    </div>

                    {(g.grabMasters?.[0] || g.grabMasters?.[1]) && (
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div className="flex flex-col justify-center gap-1.5 p-2.5 bg-gray-50/80 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-1.5"><Hand size={14} className="text-gray-500"/> <p className="text-[9px] font-black uppercase text-gray-500 tracking-widest leading-none truncate">Grab Master 1</p></div>
                          <p className="text-xs md:text-sm font-bold text-gray-800 truncate px-1">{g.grabMasters[0] || '-'}</p>
                        </div>
                        <div className="flex flex-col justify-center gap-1.5 p-2.5 bg-gray-50/80 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-1.5"><Hand size={14} className="text-gray-500"/> <p className="text-[9px] font-black uppercase text-gray-500 tracking-widest leading-none truncate">Grab Master 2</p></div>
                          <p className="text-xs md:text-sm font-bold text-gray-800 truncate px-1">{g.grabMasters[1] || '-'}</p>
                        </div>
                      </div>
                    )}

                    {g.facilitators?.length > 0 && (
                      <div className="mt-5 border-t border-gray-100 pt-4 bg-indigo-50/30 -mx-6 px-6 pb-2">
                         <h5 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-3 flex items-center gap-2">
                           <Shield size={14} className="text-indigo-500 drop-shadow-sm" /> Facilitators/Counselors
                         </h5>
                         <div className="flex flex-wrap gap-2">
                           {g.facilitators.map((facil, i) => (
                             <span key={i} className="bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs md:text-sm px-3 py-1.5 rounded-lg font-bold shadow-sm">{facil}</span>
                           ))}
                         </div>
                      </div>
                    )}


                    {g.members?.length > 0 && (
                      <div className="mt-5 border-t border-gray-100 pt-4 pb-2">
                         <h5 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3 flex items-center justify-between">
                            <span>Camp Members</span>
                            <span className="bg-gray-100 px-2 py-0.5 rounded-md text-[9px] text-gray-500">{g.members.length} Delegates</span>
                         </h5>
                         <p className="text-sm md:text-base leading-relaxed text-gray-700 font-medium">
                           {g.members.join(', ')}
                         </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
