import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Link } from 'react-router-dom';
import { Users, Shield, X, Edit2, Map, Tent, Star, Flag, Target, Hand, Loader2, Search, Check, ChevronDown, ArrowLeft } from 'lucide-react';
import api from '../api/axios';

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

// Helper: Get color based on church name (Lighter backgrounds)
const getChurchColor = (church: string) => {
  if (!church) return 'bg-gray-100 text-gray-600 border-gray-200';

  const colors = [
    'bg-blue-50 text-blue-700 border-blue-100',
    'bg-emerald-50 text-emerald-700 border-emerald-100',
    'bg-purple-50 text-purple-700 border-purple-100',
    'bg-amber-50 text-amber-700 border-amber-100',
    'bg-rose-50 text-rose-700 border-rose-100',
    'bg-indigo-50 text-indigo-700 border-indigo-100',
    'bg-cyan-50 text-cyan-700 border-cyan-100',
    'bg-orange-50 text-orange-700 border-orange-100',
    'bg-lime-50 text-lime-800 border-lime-100',
    'bg-pink-50 text-pink-700 border-pink-100',
    'bg-teal-50 text-teal-700 border-teal-100',
    'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
    'bg-sky-50 text-sky-700 border-sky-100',
    'bg-red-50 text-red-700 border-red-100',
    'bg-green-50 text-green-700 border-green-100',
    'bg-yellow-50 text-yellow-800 border-yellow-100',
    'bg-violet-50 text-violet-700 border-violet-100',
    'bg-slate-50 text-slate-700 border-slate-100',
    'bg-stone-50 text-stone-700 border-stone-100'
  ];

  let hash = 0;
  for (let i = 0; i < church.length; i++) {
    hash = church.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Helper: Get vibrant/saturated version of church color for legend indicators
const getChurchVibrantColor = (church: string) => {
  if (!church) return 'bg-gray-400';
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500',
    'bg-indigo-500', 'bg-cyan-500', 'bg-orange-500', 'bg-lime-500', 'bg-pink-500',
    'bg-teal-500', 'bg-fuchsia-500', 'bg-sky-500', 'bg-red-500', 'bg-green-500',
    'bg-yellow-500', 'bg-violet-500', 'bg-slate-500', 'bg-stone-500'
  ];
  let hash = 0;
  for (let i = 0; i < church.length; i++) {
    hash = church.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Helper: Modern Facebook Circular SVG Icon
const FacebookIcon = ({ size = 16, className = "" }: { size?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path 
      d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" 
      fill="currentColor"
    />
  </svg>
);

// Searchable Input Component for Group Roles
const SearchableRoleInput = ({ label, icon, value, onChange, options, placeholder }: { label: string, icon: React.ReactNode, value: string, onChange: (val: string) => void, options: any[], placeholder: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = options.filter(o => (o.fullName || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative group/role">
      <label className="block text-[11px] text-gray-500 font-bold mb-1 uppercase tracking-tight flex items-center">{icon}{label}</label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-brand-brown outline-none font-medium pr-8"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-brown"
        >
          <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[110]" onClick={() => setIsOpen(false)}></div>
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-[120] max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
            <div className="p-2 sticky top-0 bg-white border-b border-gray-50">
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1.5">
                <Search size={12} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter participants..."
                  className="bg-transparent text-xs outline-none w-full font-medium"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="py-1">
              {filtered.length === 0 ? (
                <p className="p-3 text-[10px] text-gray-400 italic text-center">No participants found.</p>
              ) : (
                filtered.map(o => (
                  <button
                    key={o._id || o.id}
                    type="button"
                    onClick={() => {
                      onChange(o.fullName);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-brand-cream hover:text-brand-brown transition-colors flex items-center justify-between group"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold leading-tight truncate">{o.fullName}</p>
                      <p className="text-[9px] text-gray-400 font-medium truncate uppercase tracking-tighter">{o.church}</p>
                    </div>
                    {value === o.fullName && <Check size={12} className="text-brand-brown" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default function Organization() {
  const { currentUser, appSettings, isServerAwake, fetchGlobalSettings } = useAppStore();
  const isAdmin = currentUser?.role === 'admin';
  const isVisitor = !currentUser;

  const [leaders, setLeaders] = useState<CampLeader[]>([]);
  const [groups, setGroups] = useState<CampGroup[]>([]);
  const [registrants, setRegistrants] = useState<{ id?: string, _id?: string, fullName: string, church: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'departments' | 'leaders' | 'groups'>('departments');

  // Modals
  const [leaderModal, setLeaderModal] = useState<{ isOpen: boolean, leader: CampLeader | null }>({ isOpen: false, leader: null });
  const [groupModal, setGroupModal] = useState<{ isOpen: boolean, group: CampGroup | null }>({ isOpen: false, group: null });

  // Form States
  const [leaderForm, setLeaderForm] = useState<Partial<CampLeader>>({ categories: ['Registration'], name: '', roleTitle: '', churchRef: '', image: '', socialLink: '' });
  const [groupForm, setGroupForm] = useState<Partial<CampGroup>>({ name: '', leader: '', assistantLeader: '', pointKeeper: '', flagBearer: '', facilitators: [], grabMasters: [], members: [] });

  // Local raw input states for comma-separated fields
  const [membersRaw, setMembersRaw] = useState('');

  // Local search filter states for modal
  const [facilSearch, setFacilSearch] = useState('');
  const [registrySearch, setRegistrySearch] = useState('');

  useEffect(() => {
    if (groupModal.isOpen && groupModal.group) {
      setMembersRaw(groupModal.group.members?.join(', ') || '');
    } else if (groupModal.isOpen) {
      setMembersRaw('');
      setFacilSearch('');
      setRegistrySearch('');
    }
  }, [groupModal.isOpen, groupModal.group]);

  const ALL_CATEGORIES = [
    'Camp Head', 'Registration', 'Food', 'Arts & Decorations',
    'Media', 'Music', 'Marshall', 'Runners', 'Game Masters',
    'Point Masters', 'Medic', 'Awards', 'Finance', 'Facilitator/Counselor', 'Youth Leader'
  ];

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Use allSettled to ensure partial success works for visitors
      const results = await Promise.allSettled([
        api.get('/api/org/leaders'),
        api.get('/api/org/groups'),
        api.get('/api/org/registrants')
      ]);

      if (results[0].status === 'fulfilled') setLeaders(results[0].value.data);
      if (results[1].status === 'fulfilled') setGroups(results[1].value.data);
      if (results[2].status === 'fulfilled') setRegistrants(results[2].value.data);

      // If settings are missing (likely visitor), fetch them too
      if (!appSettings) {
        await fetchGlobalSettings();
      }
    } catch (err) {
      console.error('Failed to load org data', err);
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

  const handleSaveLeader = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (leaderModal.leader) {
        const leaderId = leaderModal.leader._id || leaderModal.leader.id;
        await api.put(`/api/org/leaders/${leaderId}`, leaderForm);
      } else {
        await api.post('/api/org/leaders', leaderForm);
      }
      setLeaderModal({ isOpen: false, leader: null });
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to save leader');
    }
  };

  const handleDeleteLeader = async (id: string) => {
    if (!confirm('Are you sure you want to remove this role?')) return;
    try {
      await api.delete(`/api/org/leaders/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete leader');
    }
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (groupModal.group) {
        const groupId = groupModal.group._id || groupModal.group.id;
        await api.put(`/api/org/groups/${groupId}`, groupForm);
      } else {
        await api.post('/api/org/groups', groupForm);
      }
      setGroupModal({ isOpen: false, group: null });
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to save group');
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return;
    try {
      await api.delete(`/api/org/groups/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Roles processing
  const staff = leaders;
  const youthLeaders = leaders.filter(l => getCategories(l).includes('Youth Leader'));
  
  // Dynamic fallback for church list if settings haven't loaded yet
  const effectiveChurches = (appSettings?.churches && appSettings.churches.length > 0)
    ? appSettings.churches.filter((c: string) => c !== 'JAM')
    : Array.from(new Set(youthLeaders.filter(yl => yl.churchRef && yl.churchRef !== 'JAM').map(yl => yl.churchRef as string))).sort();

  return (
    <>
      <div className={`space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative ${isVisitor ? 'min-h-screen bg-brand-cream p-4 md:p-8 pt-0' : ''}`}>
        {isVisitor && (
          <header className="-mx-4 md:-mx-8 bg-brand-brown text-white py-3 px-6 md:px-10 shadow-lg sticky top-0 z-50 flex items-center justify-between mb-8 overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
            <div className="flex items-center gap-3 md:gap-4 font-display tracking-widest leading-none relative z-10 transition-transform active:scale-95 cursor-default">
              <img src="/logo.svg" alt="LAKBAY" className="h-8 w-8 md:h-10 md:w-10 filter drop-shadow-md" />
              <h1 className="text-lg md:text-xl hidden sm:block uppercase">LAKBAY CAMP</h1>
            </div>
            <Link to="/login" className="relative z-10 flex items-center gap-2 bg-white/10 hover:bg-white/20 active:bg-white/30 px-4 py-2 rounded-xl transition-all font-bold text-xs backdrop-blur-sm shadow-inner uppercase tracking-wider border border-white/10">
              <ArrowLeft size={14} /> Back to Login
            </Link>
          </header>
        )}

        {isLoading && (
          <div className="absolute top-2 right-2 p-2 z-10 flex gap-2 items-center text-brand-brown/50">
            <Loader2 className="animate-spin w-5 h-5" />
          </div>
        )}

        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 ${isVisitor ? 'max-w-7xl mx-auto w-full' : ''}`}>
          <div>
            <h2 className="text-2xl md:text-4xl font-display text-brand-brown tracking-wide mb-1 flex items-center gap-3">
              <Map className="text-brand-brown" size={isVisitor ? 32 : 24} /> {isVisitor ? 'Camp Board' : 'Camp Organization'}
            </h2>
            <p className="text-sm text-gray-500 font-medium border-l-4 border-brand-sand/30 pl-3">Official camp groupings, staff roster, and church youth leaders.</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={`flex items-center gap-1 p-1 bg-brand-sand/10 rounded-2xl w-full sm:w-fit mb-8 border border-brand-sand/5 ${isVisitor ? 'max-w-7xl mx-auto' : ''}`}>
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

        <div className={`min-h-[500px] ${isVisitor ? 'max-w-7xl mx-auto w-full' : ''}`}>
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
                                  <p className="font-bold text-sm leading-none flex items-center gap-2 truncate text-gray-800">
                                    {s.name}
                                    {s.socialLink && (
                                      <a href={s.socialLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 transition-all p-1 rounded-lg hover:bg-blue-50/50 group" title="View Facebook Profile">
                                        <FacebookIcon size={14} className="fill-blue-500/10 group-hover:fill-blue-500/20" />
                                      </a>
                                    )}
                                  </p>
                                  {s.roleTitle && <p className="text-[9px] uppercase font-black text-gray-400 tracking-tighter mt-1 truncate">{s.roleTitle}</p>}
                                </div>
                              </div>
                              {isAdmin && (
                                <div className="opacity-0 group-hover:opacity-100 flex gap-0.5">
                                  <button
                                    onClick={() => {
                                      const norm = { ...s, categories: s.categories?.length > 0 ? s.categories : (s.category ? [s.category] : []) };
                                      setLeaderForm(norm); setLeaderModal({ isOpen: true, leader: s });
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-brand-brown transition-colors"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteLeader(s._id || s.id as string)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              )}
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
                                   <p className="text-sm font-bold leading-none flex items-center gap-2 truncate text-gray-800">
                                     {cl.name}
                                     {cl.socialLink && (
                                       <a href={cl.socialLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 transition-all p-1 rounded-lg hover:bg-blue-50/50 group" title="View Facebook Profile">
                                         <FacebookIcon size={14} className="fill-blue-500/10 group-hover:fill-blue-500/20" />
                                       </a>
                                     )}
                                   </p>
                                   {cl.roleTitle && <p className="text-[8px] uppercase font-black text-gray-400 tracking-tighter mt-1 truncate">{cl.roleTitle}</p>}
                                 </div>
                               </div>
                               {isAdmin && (
                                 <div className="opacity-0 group-hover:opacity-100 flex gap-0.5">
                                    <button 
                                      onClick={() => {
                                        const norm = { ...cl, categories: cl.categories?.length > 0 ? cl.categories : (cl.category ? [cl.category] : ['Youth Leader']) };
                                        setLeaderForm(norm); setLeaderModal({ isOpen: true, leader: cl });
                                      }}
                                      className="p-1 text-gray-400 hover:text-brand-brown"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteLeader(cl._id || cl.id as string)}
                                      className="p-1 text-gray-400 hover:text-red-500"
                                    >
                                      <X size={12} />
                                    </button>
                                 </div>
                               )}
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
                          <div className={`w-3 h-3 rounded-full border border-white shadow-sm ring-1 ring-black/5 ${getChurchVibrantColor(church)}`}></div>
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
                      {isAdmin && (
                        <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 bg-white/80 backdrop-blur rounded p-1 border border-brand-sand/10 shadow-sm">
                          <button
                            onClick={() => { setGroupForm(g); setGroupModal({ isOpen: true, group: g }); }}
                            className="p-1 px-1.5 text-gray-400 hover:text-brand-brown hover:bg-white rounded-lg transition-colors border border-transparent"
                          >
                            <Edit2 size={11} />
                          </button>
                          <button
                            onClick={() => handleDeleteGroup(g._id || g.id as string)}
                            className="p-1 px-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors border border-transparent"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      )}

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
                          <div className="mt-4 pt-4 border-t border-gray-50">
                            <h5 className="text-[8px] font-black uppercase text-gray-300 tracking-widest mb-2 px-1">Facilitators</h5>
                            <div className="flex flex-wrap gap-1.5">
                              {g.facilitators.map((facil: string, i: number) => (
                                <span key={i} className="bg-gray-50 text-gray-500 border border-gray-100 text-[10px] px-2.5 py-1 rounded-lg font-bold">{facil}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {g.members?.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <h5 className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-3 px-1">Members ({g.members.length})</h5>
                            <div className="flex flex-wrap gap-1.5 px-0.5">
                              {g.members.map((m: string, i: number) => {
                                const reg = registrants.find(r => (r.fullName || '').toLowerCase().trim() === m.toLowerCase().trim());
                                const colorClass = getChurchColor(reg?.church || '');
                                return (
                                  <div
                                    key={i}
                                    className={`text-[10px] sm:text-[11px] px-2.5 py-1 rounded-lg font-bold border ${colorClass} transition-transform hover:scale-105 cursor-default shadow-sm`}
                                    title={reg?.church || 'Unknown Church'}
                                  >
                                    {m}
                                  </div>
                                );
                              })}
                            </div>
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
      </div>

      {/* Leader Modal */}
      {isAdmin && leaderModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-brown/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button type="button" onClick={() => setLeaderModal({ isOpen: false, leader: null })} className="absolute top-4 right-4 text-gray-400 hover:text-black focus:outline-none"><X size={24} /></button>
            <h3 className="text-2xl font-display text-brand-brown mb-6">{leaderModal.leader ? 'Edit Role' : 'Add New Role'}</h3>
            <form onSubmit={handleSaveLeader} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">Department(s)</label>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-3">
                  {ALL_CATEGORIES.filter(c => c !== 'Youth Leader').map(cat => (
                    <label key={cat} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-brand-brown rounded"
                        checked={(leaderForm.categories || []).includes(cat)}
                        onChange={e => {
                          const current = leaderForm.categories || [];
                          setLeaderForm({
                            ...leaderForm,
                            categories: e.target.checked
                              ? [...current, cat]
                              : current.filter(c => c !== cat)
                          });
                        }}
                      />
                      <span className="text-sm text-gray-700 group-hover:text-brand-brown font-medium leading-tight">{cat}</span>
                    </label>
                  ))}
                </div>
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-indigo-600 rounded"
                    checked={(leaderForm.categories || []).includes('Youth Leader')}
                    onChange={e => {
                      const current = leaderForm.categories || [];
                      setLeaderForm({
                        ...leaderForm,
                        categories: e.target.checked
                          ? [...current, 'Youth Leader']
                          : current.filter(c => c !== 'Youth Leader')
                      });
                    }}
                  />
                  <span className="text-sm font-medium text-indigo-700">Church Youth Leader</span>
                </label>
              </div>
              {(leaderForm.categories || []).includes('Youth Leader') && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Church</label>
                  <select required value={leaderForm.churchRef || ''} onChange={e => setLeaderForm({ ...leaderForm, churchRef: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:border-brand-brown outline-none">
                    <option value="" disabled>Select a church...</option>
                    {appSettings?.churches?.map((c: string) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Full Name</label>
                <input type="text" required value={leaderForm.name} onChange={e => setLeaderForm({ ...leaderForm, name: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:border-brand-brown outline-none" placeholder="e.g. John Doe" />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Photo URL (Optional)</label>
                <input type="url" value={leaderForm.image} onChange={e => setLeaderForm({ ...leaderForm, image: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:border-brand-brown outline-none" placeholder="e.g. https://imgur.com/photo.jpg" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Social Media Link (Optional)</label>
                <input type="url" value={leaderForm.socialLink} onChange={e => setLeaderForm({ ...leaderForm, socialLink: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-400 outline-none" placeholder="e.g. https://facebook.com/username" />
              </div>
              <button type="submit" className="w-full py-3 rounded-xl bg-brand-brown text-white font-bold hover:bg-brand-light-brown transition-colors mt-2">{leaderModal.leader ? 'Save Changes' : 'Add Role'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Group Modal */}
      {isAdmin && groupModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-brown/50 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl relative border border-brand-sand/50 my-6 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="text-2xl font-display text-brand-brown tracking-wide flex items-center gap-2"><Tent size={24} className="text-brand-brown" /> {groupModal.group ? 'Edit Official Group' : 'Create Official Group'}</h3>
              <button type="button" onClick={() => setGroupModal({ isOpen: false, group: null })} className="text-gray-400 hover:text-brand-brown transition-colors p-1"><X size={24} /></button>
            </div>

            <form onSubmit={handleSaveGroup} className="p-6 overflow-y-auto space-y-6">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-widest font-black mb-1">Group Name</label>
                <input type="text" required value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} className="w-full border-2 border-brand-sand rounded-xl px-4 py-3 text-lg font-bold focus:border-brand-brown outline-none" placeholder="e.g. Group 1, Wildcats" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <h4 className="md:col-span-2 text-[10px] font-black uppercase text-brand-brown tracking-widest border-b border-gray-200 pb-2 mb-2">Key Core Roles</h4>
                <SearchableRoleInput
                  label="Leader Name"
                  icon={<Star size={12} className="inline mr-1 text-orange-500" />}
                  value={groupForm.leader || ''}
                  onChange={val => setGroupForm({ ...groupForm, leader: val })}
                  options={registrants}
                  placeholder="Search participant..."
                />
                <SearchableRoleInput
                  label="Assistant Leader Name"
                  icon={<Shield size={12} className="inline mr-1 text-amber-500" />}
                  value={groupForm.assistantLeader || ''}
                  onChange={val => setGroupForm({ ...groupForm, assistantLeader: val })}
                  options={registrants}
                  placeholder="Search participant..."
                />
                <SearchableRoleInput
                  label="Point Keeper Name"
                  icon={<Target size={12} className="inline mr-1 text-blue-500" />}
                  value={groupForm.pointKeeper || ''}
                  onChange={val => setGroupForm({ ...groupForm, pointKeeper: val })}
                  options={registrants}
                  placeholder="Search participant..."
                />
                <SearchableRoleInput
                  label="Flag Bearer Name"
                  icon={<Flag size={12} className="inline mr-1 text-red-500" />}
                  value={groupForm.flagBearer || ''}
                  onChange={val => setGroupForm({ ...groupForm, flagBearer: val })}
                  options={registrants}
                  placeholder="Search participant..."
                />
                <SearchableRoleInput
                  label="Grab Master 1"
                  icon={<Hand size={12} className="inline mr-1 text-gray-500" />}
                  value={groupForm.grabMasters?.[0] || ''}
                  onChange={val => {
                    const next = [...(groupForm.grabMasters || [])];
                    next[0] = val;
                    setGroupForm({ ...groupForm, grabMasters: next });
                  }}
                  options={registrants}
                  placeholder="Search participant..."
                />
                <SearchableRoleInput
                  label="Grab Master 2"
                  icon={<Hand size={12} className="inline mr-1 text-gray-500" />}
                  value={groupForm.grabMasters?.[1] || ''}
                  onChange={val => {
                    const next = [...(groupForm.grabMasters || [])];
                    next[1] = val;
                    setGroupForm({ ...groupForm, grabMasters: next });
                  }}
                  options={registrants}
                  placeholder="Search participant..."
                />
              </div>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-[11px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1"><Shield size={14} className="text-indigo-400" /> Facilitators</label>
                  <div className="relative group/search flex-1 sm:max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/search:text-indigo-500 transition-colors" size={12} />
                    <input 
                      type="text" 
                      placeholder="Search facilitators..." 
                      className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs outline-none focus:border-indigo-200 focus:bg-white transition-all font-medium"
                      value={facilSearch}
                      onChange={e => setFacilSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 p-3 bg-indigo-50/30 rounded-xl border border-indigo-100/50 max-h-32 overflow-y-auto">
                  {leaders
                    .filter(l => !getCategories(l).includes('Youth Leader'))
                    .filter(l => l.name.toLowerCase().includes(facilSearch.toLowerCase()))
                    .map(l => (
                      <button
                        key={l._id || l.id}
                        type="button"
                        onClick={() => {
                          const current = groupForm.facilitators || [];
                          const next = current.includes(l.name) ? current.filter(n => n !== l.name) : [...current, l.name];
                          setGroupForm({ ...groupForm, facilitators: next });
                        }}
                        className={`text-[10px] px-2.5 py-1 rounded-lg font-bold border transition-all ${(groupForm.facilitators || []).includes(l.name)
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                          : 'bg-white border-indigo-200 text-indigo-600 hover:border-indigo-400'
                          }`}
                      >
                        {l.name}
                      </button>
                    ))}
                  {leaders.filter(l => !getCategories(l).includes('Youth Leader') && l.name.toLowerCase().includes(facilSearch.toLowerCase())).length === 0 && (
                    <p className="text-[10px] text-gray-400 italic py-1 px-2">No personnel found.</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                  <label className="block text-xs text-gray-500 font-bold uppercase tracking-widest">Participants/Members Listing</label>
                  <div className="relative group/regshow flex-1 sm:max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/regshow:text-brand-brown transition-colors" size={12} />
                    <input 
                      type="text" 
                      placeholder="Filter registry..." 
                      className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs outline-none focus:border-brand-brown/30 focus:bg-white transition-all font-medium"
                      value={registrySearch}
                      onChange={e => setRegistrySearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <textarea
                    value={membersRaw}
                    onChange={e => {
                      setMembersRaw(e.target.value);
                      const list = e.target.value.split(',').map(s => s.trim()).filter(s => s !== '');
                      setGroupForm({ ...groupForm, members: list });
                    }}
                    rows={3}
                    placeholder="Separate names with commas (e.g. John Doe, Jane Smith)"
                    className="w-full bg-transparent border-none outline-none text-sm font-medium resize-none placeholder:text-gray-300 mb-2 border-b border-gray-200 pb-2"
                  />
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pt-2 custom-scrollbar">
                    {registrants
                      .filter(reg => (reg.fullName || '').toLowerCase().includes(registrySearch.toLowerCase()) || (reg.church || '').toLowerCase().includes(registrySearch.toLowerCase()))
                      .map(reg => (
                        <button
                          key={reg._id || reg.id}
                          type="button"
                          onClick={() => {
                            const current = groupForm.members || [];
                            const next = current.includes(reg.fullName) ? current.filter(n => n !== reg.fullName) : [...current, reg.fullName];
                            setGroupForm({ ...groupForm, members: next });
                            setMembersRaw(next.join(', '));
                          }}
                          className={`text-[9px] px-2 py-0.5 rounded-md font-bold transition-all border ${ (groupForm.members || []).includes(reg.fullName) 
                            ? 'bg-brand-brown border-brand-brown text-white shadow-sm' 
                            : 'bg-white border-gray-200 text-gray-500 hover:border-brand-sand' }`}
                        >
                          {reg.fullName}
                        </button>
                      ))}
                    {registrants.filter(reg => (reg.fullName || '').toLowerCase().includes(registrySearch.toLowerCase())).length === 0 && (
                      <p className="w-full text-center py-4 text-[10px] text-gray-400 italic">No matching participants found.</p>
                    )}
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full py-4 rounded-xl bg-brand-brown text-white font-black uppercase tracking-widest hover:bg-brand-light-brown transition-all shadow-lg hover:shadow-xl active:scale-[0.98] mt-2">Save Tribe Data</button>
            </form>
          </div>
        </div>
      )}

      {/* FABs (Only for Admin) */}
      {isAdmin && (
        <div className="fixed bottom-28 right-6 flex flex-col gap-3 group z-[90]">
          <button
            onClick={() => { setGroupForm({ name: '', leader: '', assistantLeader: '', pointKeeper: '', flagBearer: '', facilitators: [], grabMasters: [], members: [] }); setGroupModal({ isOpen: true, group: null }); }}
            className={`flex items-center justify-center w-14 h-14 bg-white text-brand-brown rounded-full shadow-xl hover:shadow-2xl transition-all border-2 border-brand-sand hover:scale-110 active:scale-95 ${activeTab === 'groups' ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}`}
            title="Create New Tribe"
          >
            <Tent size={24} />
          </button>
          <button
            onClick={() => { setLeaderForm({ categories: ['Registration'], name: '', roleTitle: '', churchRef: '', image: '', socialLink: '' }); setLeaderModal({ isOpen: true, leader: null }); }}
            className={`flex items-center justify-center w-14 h-14 bg-brand-brown text-white rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-110 active:scale-95 ${activeTab !== 'groups' ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}`}
            title="Add New Personnel"
          >
            <Users size={24} />
          </button>
        </div>
      )}
    </>
  );
}
