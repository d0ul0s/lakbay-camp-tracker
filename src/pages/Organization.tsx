import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../store';
import { Link } from 'react-router-dom';
import { Users, Shield, X, Edit2, Map, Tent, Star, Flag, Target, Hand, Loader2, Search, Check, ChevronDown, ArrowLeft, Printer, ShieldAlert } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import api from '../api/axios';
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


// Helper: Modern Facebook Solid Circular SVG Icon (2024 Version)
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
  const rolePerms = currentUser?.permissionMatrix?.[currentUser.role!];
  const isVisitor = !currentUser;

  // Granular check: Admin always has access, others check matrix
  const canViewOrg = isAdmin || (rolePerms?.org?.view === true);

  const [leaders, setLeaders] = useState<CampLeader[]>([]);
  const [groups, setGroups] = useState<CampGroup[]>([]);
  const [registrants, setRegistrants] = useState<{ id?: string, _id?: string, fullName: string, church: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'departments' | 'leaders' | 'groups'>('departments');

  // If not visitor, and not admin, and NO permission, show restricted
  if (!isVisitor && !canViewOrg) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center px-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-brand-beige max-w-md w-full">
          <ShieldAlert size={48} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-2xl font-display text-brand-brown mb-2">Restricted Access</h2>
          <p className="text-gray-500">Only authorized coordinators or administrators can view the internal organization roster.</p>
        </div>
      </div>
    );
  }

  // Modals
  const [leaderModal, setLeaderModal] = useState<{ isOpen: boolean, leader: CampLeader | null }>({ isOpen: false, leader: null });
  const [groupModal, setGroupModal] = useState<{ isOpen: boolean, group: CampGroup | null }>({ isOpen: false, group: null });
  const [confirmState, setConfirmState] = useState<{ 
    isOpen: boolean, 
    title: string, 
    message: string, 
    onConfirm: () => void,
    isDestructive?: boolean 
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: true
  });

  // Form States
  const [leaderForm, setLeaderForm] = useState<Partial<CampLeader>>({ categories: ['Registration'], name: '', roleTitle: '', churchRef: '', image: '', socialLink: '' });
  const [groupForm, setGroupForm] = useState<Partial<CampGroup>>({ name: '', leader: '', assistantLeader: '', pointKeeper: '', flagBearer: '', facilitators: [], grabMasters: [], members: [] });

  // Local raw input state for manual member entry
  const [manualName, setManualName] = useState('');

  // Local search filter states for modal
  const [facilSearch, setFacilSearch] = useState('');
  const [registrySearch, setRegistrySearch] = useState('');
  // Separate search state for the ungrouped audit panel (independent from modal)
  const [ungroupedSearch, setUngroupedSearch] = useState('');

  useEffect(() => {
    if (groupModal.isOpen && !groupModal.group) {
      setManualName('');
      setFacilSearch('');
      setRegistrySearch('');
    } else if (!groupModal.isOpen) {
      // Modal just closed — clear modal-local searches to prevent leaking into main page
      setRegistrySearch('');
      setFacilSearch('');
      setManualName('');
    }
  }, [groupModal.isOpen]);

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
    } catch (err: any) {
      console.error(err);
      setConfirmState({
        isOpen: true,
        title: 'Save Failed',
        message: err.response?.data?.message || 'Failed to save personnel role. Please check all fields and try again.',
        onConfirm: () => setConfirmState(prev => ({ ...prev, isOpen: false })),
        isDestructive: false
      });
    }
  };

  const handleDeleteLeader = async (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Remove Personnel Role',
      message: 'Are you sure you want to remove this role? This will not delete the registrant, only their administrative assignment.',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        try {
          await api.delete(`/api/org/leaders/${id}`);
          fetchData();
        } catch (err) {
          console.error(err);
          setConfirmState({
             isOpen: true,
             title: 'Error',
             message: 'Failed to delete leader assignment.',
             onConfirm: () => setConfirmState(prev => ({ ...prev, isOpen: false })),
             isDestructive: false
          });
        }
      }
    });
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
    } catch (err: any) {
      console.error(err);
      setConfirmState({
        isOpen: true,
        title: 'Save Failed',
        message: err.response?.data?.message || 'Failed to save tribe data. Please check all fields and try again.',
        onConfirm: () => setConfirmState(prev => ({ ...prev, isOpen: false })),
        isDestructive: false
      });
    }
  };

  const handleDeleteGroup = async (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Official Group',
      message: 'Are you sure you want to dissolve this tribe? All role assignments for this group will be cleared.',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        try {
          await api.delete(`/api/org/groups/${id}`);
          fetchData();
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  // Roles processing
  const staff = leaders;
  const youthLeaders = leaders.filter(l => getCategories(l).includes('Youth Leader'));

  // Logic: Tribe Integrity Audit (Ungrouped & Duplicates)
  // Keys are lowercased+trimmed for case-insensitive matching
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
  const duplicates = Object.entries(memberAssignments)
    .filter(([_, groupNames]) => groupNames.length > 1)
    .map(([name, groupNames]) => ({ name, groups: groupNames }));
  
  // Dynamic fallback for church list if settings haven't loaded yet
  const effectiveChurches = (appSettings?.churches && appSettings.churches.length > 0)
    ? appSettings.churches.filter((c: string) => c !== 'JAM')
    : Array.from(new Set(youthLeaders.filter(yl => yl.churchRef && yl.churchRef !== 'JAM').map(yl => yl.churchRef as string))).sort();

  return (
    <>
      <div className={`space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative ${isVisitor ? 'min-h-screen bg-brand-cream p-4 md:p-8 pt-0 font-sans' : ''}`}>
        {isVisitor && (
          <>
            {/* Background Decor */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
              <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-sand blur-[120px]"></div>
              <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-brown/10 blur-[120px]"></div>
            </div>

            <header className="-mx-4 md:-mx-8 bg-brand-brown text-white py-3 px-6 md:px-10 shadow-lg sticky top-0 z-50 flex items-center justify-between mb-8 overflow-hidden no-print">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
              <div className="flex items-center gap-3 md:gap-4 font-display tracking-widest leading-none relative z-10 transition-transform active:scale-95 cursor-default">
                <img src="/logo.svg" alt="LAKBAY" className="h-8 w-8 md:h-10 md:w-10 filter drop-shadow-md" />
                <h1 className="text-lg md:text-xl hidden sm:block uppercase font-bold tracking-widest">LAKBAY CAMP</h1>
              </div>
              <Link to="/login" className="relative z-10 flex items-center gap-2 bg-white/10 hover:bg-white/20 active:bg-white/30 px-4 py-2 rounded-xl transition-all font-bold text-xs backdrop-blur-sm shadow-inner uppercase tracking-wider border border-white/10">
                <ArrowLeft size={14} /> Back to Login
              </Link>
            </header>
          </>
        )}

        {isLoading && (
          <div className="absolute top-2 right-2 p-2 z-10 flex gap-2 items-center text-brand-brown/50">
            <Loader2 className="animate-spin w-5 h-5" />
          </div>
        )}

        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 no-print ${isVisitor ? 'max-w-7xl mx-auto w-full' : ''}`}>
          <div>
            <h2 className="text-3xl md:text-5xl font-display text-brand-brown tracking-wide mb-2 flex items-center gap-3">
              <Map className="text-brand-brown w-8 h-8 md:w-10 md:h-10" /> Camp Organization
            </h2>
            <p className="text-gray-500 font-medium text-sm md:text-base mt-2 border-l-4 border-brand-sand/50 pl-4">Official camp groupings, staff roster, and church youth leaders.</p>
          </div>
          <button 
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-white border-2 border-brand-sand text-brand-brown rounded-2xl font-bold hover:bg-brand-sand hover:text-white transition-all shadow-sm active:scale-95 shrink-0"
          >
            <Printer size={18} /> 
            <span>Print {activeTab === 'groups' ? 'Tribes' : activeTab === 'leaders' ? 'Personnel' : 'Report'}</span>
          </button>
        </div>

        <div className="no-print">
          <CampCountdown />
        </div>

        {/* Tab Navigation */}
        <div className={`flex items-center gap-1 p-1 bg-brand-sand/10 rounded-2xl w-full sm:w-fit mb-8 border border-brand-sand/5 no-print ${isVisitor ? 'max-w-7xl mx-auto' : ''}`}>
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
                {/* Tribe Integrity Audit Summary (Admin Only) */}
                {isAdmin && (
                  <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-300">
                    {/* 1. Ungrouped Participants */}
                    <div className="lg:col-span-2 bg-white rounded-3xl p-5 border border-amber-100 shadow-sm shadow-amber-900/5 transition-all hover:shadow-md">
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-inner">
                            <Users size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black uppercase text-gray-800 tracking-widest leading-none mb-1">Ungrouped Members</h4>
                            <p className="text-[10px] text-gray-400 font-bold uppercase leading-none">{ungrouped.length} remaining for assignment</p>
                          </div>
                        </div>
                        <div className="relative group/ungsearch flex-1 max-w-[200px]">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within/ungsearch:text-amber-400 transition-colors" size={14} />
                          <input 
                            type="text" 
                            placeholder="Find ungrouped..." 
                            className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:border-amber-200 focus:bg-white transition-all font-medium"
                            value={ungroupedSearch}
                            onChange={e => setUngroupedSearch(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-2 bg-amber-50/20 rounded-2xl border border-amber-50/50 custom-scrollbar">
                        {ungrouped.length === 0 ? (
                          <div className="w-full py-6 flex flex-col items-center justify-center gap-2 opacity-40">
                             <Check className="text-emerald-500" size={24} />
                             <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600">All participants grouped!</p>
                          </div>
                        ) : (
                          ungrouped
                            .filter((r) => (r.fullName || '').toLowerCase().includes(ungroupedSearch.toLowerCase()) || (r.church || '').toLowerCase().includes(ungroupedSearch.toLowerCase()))
                            .map((r) => (
                              <div key={r._id || r.id} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-amber-100 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-transform hover:scale-105 cursor-default group">
                                <div className={`w-1.5 h-1.5 rounded-full ${getChurchVibrantColor(r.church || '', appSettings?.churchColors)}`}></div>
                                <span className="text-[11px] font-bold text-gray-700 truncate max-w-[120px]">{r.fullName}</span>
                                <span className="text-[8px] font-black uppercase text-gray-300 tracking-tighter ml-auto opacity-0 group-hover:opacity-100 transition-opacity">{r.church}</span>
                              </div>
                            ))
                        )}
                        {ungrouped.filter((r) => (r.fullName || '').toLowerCase().includes(ungroupedSearch.toLowerCase())).length === 0 && ungrouped.length > 0 && (
                          <p className="w-full text-center py-4 text-[10px] text-gray-400 italic">No matches found.</p>
                        )}
                      </div>
                    </div>

                    {/* 2. Logic Critical Errors (Duplicates) */}
                    <div className="bg-white rounded-3xl p-5 border border-red-50 shadow-sm shadow-red-900/5 relative overflow-hidden group">
                      {duplicates.length > 0 && (
                        <div className="absolute top-0 right-0 p-3 animate-pulse">
                          <Flag size={20} className="text-red-500" fill="currentColor" opacity={0.1} />
                        </div>
                      )}
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner transition-colors ${duplicates.length > 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                          {duplicates.length > 0 ? <Flag size={20} /> : <Check size={20} />}
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase text-gray-800 tracking-widest leading-none mb-1">Double Bookings</h4>
                          <p className={`text-[10px] font-bold uppercase leading-none ${duplicates.length > 0 ? 'text-red-400' : 'text-emerald-500'}`}>
                            {duplicates.length > 0 ? `${duplicates.length} participants in multiple tribes` : 'Perfect assignments'}
                          </p>
                        </div>
                      </div>
                      <div className={`flex flex-col gap-2 max-h-[150px] overflow-y-auto p-2 rounded-2xl border transition-all ${duplicates.length > 0 ? 'bg-red-50/20 border-red-100' : 'bg-emerald-50/20 border-emerald-50 opacity-50'}`}>
                        {duplicates.length === 0 ? (
                          <p className="text-[10px] text-gray-400 italic py-6 text-center">No duplicate tribe assignments detected.</p>
                        ) : (
                          duplicates.map((d, idx: number) => (
                            <div key={idx} className="bg-white p-2.5 rounded-xl border border-red-100/50 shadow-sm">
                              <p className="text-[11px] font-black text-red-600 truncate mb-1">{d.name}</p>
                              <div className="flex flex-wrap gap-1">
                                {d.groups.map((gn: string) => (
                                  <span key={gn} className="text-[8px] bg-red-50 text-red-400 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter border border-red-100">{gn}</span>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

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
                      {isAdmin && (
                        <div className="absolute top-2.5 right-2.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex gap-0.5 bg-white/80 backdrop-blur rounded p-1 border border-brand-sand/10 shadow-sm">
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
                                            className="text-[10px] sm:text-[11px] px-2.5 py-1 rounded-lg font-bold border bg-white border-amber-300/40 text-amber-800 border-dashed transition-transform hover:scale-105 cursor-default shadow-sm"
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
      </div>

      {/* Leader Modal */}
      {isAdmin && leaderModal.isOpen && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-brand-brown/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative my-auto">
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
        </div>,
        document.body
      )}

      {/* Group Modal */}
      {isAdmin && groupModal.isOpen && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-brand-brown/50 backdrop-blur-sm p-1 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl relative border border-brand-sand/50 my-auto flex flex-col pointer-events-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="text-2xl font-display text-brand-brown tracking-wide flex items-center gap-2"><Tent size={24} className="text-brand-brown" /> {groupModal.group ? 'Edit Official Group' : 'Create Official Group'}</h3>
              <button type="button" onClick={() => setGroupModal({ isOpen: false, group: null })} className="text-gray-400 hover:text-brand-brown transition-colors p-1"><X size={24} /></button>
            </div>

            <form onSubmit={handleSaveGroup} className="p-6 overflow-y-auto space-y-6 max-h-[75vh]">
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
                  options={registrants.filter(r => r.church !== 'JAM')}
                  placeholder="Search participant..."
                />
                <SearchableRoleInput
                  label="Assistant Leader Name"
                  icon={<Shield size={12} className="inline mr-1 text-amber-500" />}
                  value={groupForm.assistantLeader || ''}
                  onChange={val => setGroupForm({ ...groupForm, assistantLeader: val })}
                  options={registrants.filter(r => r.church !== 'JAM')}
                  placeholder="Search participant..."
                />
                <SearchableRoleInput
                  label="Point Keeper Name"
                  icon={<Target size={12} className="inline mr-1 text-blue-500" />}
                  value={groupForm.pointKeeper || ''}
                  onChange={val => setGroupForm({ ...groupForm, pointKeeper: val })}
                  options={registrants.filter(r => r.church !== 'JAM')}
                  placeholder="Search participant..."
                />
                <SearchableRoleInput
                  label="Flag Bearer Name"
                  icon={<Flag size={12} className="inline mr-1 text-red-500" />}
                  value={groupForm.flagBearer || ''}
                  onChange={val => setGroupForm({ ...groupForm, flagBearer: val })}
                  options={registrants.filter(r => r.church !== 'JAM')}
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
                  options={registrants.filter(r => r.church !== 'JAM')}
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
                  options={registrants.filter(r => r.church !== 'JAM')}
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
                    .filter(l => !getCategories(l).includes('Youth Leader') && l.churchRef !== 'JAM')
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
                        <div className="flex flex-col items-center gap-0.5">
                          <span>{l.name}</span>
                          {l.categories && l.categories.length > 0 && (
                            <span className="text-[7px] opacity-60 font-medium">{getCategories(l).filter(c => c !== 'Youth Leader').join(', ')}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  {leaders.filter(l => !getCategories(l).includes('Youth Leader') && l.name.toLowerCase().includes(facilSearch.toLowerCase())).length === 0 && (
                    <p className="text-[10px] text-gray-400 italic py-1 px-2">{leaders.length === 0 ? 'No personnel added yet. Add staff roles in the Departments tab first.' : 'No matching personnel found.'}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                  <label className="block text-xs text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2"><Users size={14} className="text-brand-brown" /> Tribe Members Listing</label>
                  <div className="relative group/regshow flex-1 sm:max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/regshow:text-brand-brown transition-colors" size={12} />
                    <input 
                      type="text" 
                      placeholder="Filter registrants list..." 
                      className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs outline-none focus:border-brand-brown/30 focus:bg-white transition-all font-medium"
                      value={registrySearch}
                      onChange={e => setRegistrySearch(e.target.value)}
                    />
                  </div>
                </div>

                {/* 1. Manual Entry Row */}
                <div className="flex gap-2 p-1.5 bg-brand-brown/5 rounded-xl border border-brand-sand/20 group-focus-within:border-brand-brown/40 transition-all">
                  <input
                    type="text"
                    value={manualName}
                    onChange={e => setManualName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && manualName.trim()) {
                        e.preventDefault();
                        const current = (groupForm.members || []);
                        if (!current.some(name => name.toLowerCase().trim() === manualName.trim().toLowerCase())) {
                          setGroupForm({ ...groupForm, members: [...current, manualName.trim()] });
                        }
                        setManualName('');
                      }
                    }}
                    placeholder="Type name (even with commas)..."
                    className="flex-1 bg-transparent border-none outline-none text-xs font-bold px-2 placeholder:text-gray-300 placeholder:font-normal"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (manualName.trim()) {
                        const current = (groupForm.members || []);
                        if (!current.some(name => name.toLowerCase().trim() === manualName.trim().toLowerCase())) {
                          setGroupForm({ ...groupForm, members: [...current, manualName.trim()] });
                        }
                        setManualName('');
                      }
                    }}
                    className="bg-brand-brown text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-brand-light-brown transition-all active:scale-95"
                  >
                    Add Manually
                  </button>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
                  {/* Active Tribe Members (Partitioned Chips) */}
                  <div className="space-y-4 mb-4">
                    {(() => {
                      const allMembers = groupForm.members || [];
                      const registered = allMembers.filter(m => registrants.some(r => (r.fullName || '').toLowerCase().trim() === m.toLowerCase().trim()));
                      const pending = allMembers.filter(m => !registrants.some(r => (r.fullName || '').toLowerCase().trim() === m.toLowerCase().trim()));

                      if (allMembers.length === 0) {
                        return <p className="text-[10px] text-gray-400 italic px-2 py-4 border-2 border-dashed border-gray-200 w-full rounded-2xl text-center">No members assigned yet. Add from registry below or type manually above.</p>;
                      }

                      return (
                        <>
                          {registered.length > 0 && (
                            <div>
                               <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-2 px-1">Official Registrants ({registered.length})</p>
                               <div className="flex flex-wrap gap-2">
                                  {registered.map((m: string, i: number) => (
                                    <div
                                      key={i}
                                      className="flex items-center gap-1.5 py-1.5 pl-3 pr-1.5 rounded-xl text-[11px] font-bold border shadow-sm bg-white border-brand-sand/30 text-gray-700 animate-in zoom-in-95"
                                    >
                                      <span className="truncate max-w-[120px]">{m}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const next = allMembers.filter(name => name !== m);
                                          setGroupForm({ ...groupForm, members: next });
                                        }}
                                        className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
                                      >
                                        <X size={10} />
                                      </button>
                                    </div>
                                  ))}
                               </div>
                            </div>
                          )}

                          {pending.length > 0 && (
                            <div className="bg-amber-50/30 p-3 rounded-2xl border border-amber-100">
                               <p className="text-[8px] font-black uppercase text-amber-600 tracking-widest mb-2 px-1">Manual/Guest Entries ({pending.length})</p>
                               <div className="flex flex-wrap gap-2">
                                  {pending.map((m: string, i: number) => (
                                    <div
                                      key={i}
                                      className="flex items-center gap-1.5 py-1.5 pl-3 pr-1.5 rounded-xl text-[11px] font-bold border shadow-md bg-white border-amber-400/50 text-amber-900 border-dashed animate-in zoom-in-95"
                                    >
                                      <span className="truncate max-w-[120px]">{m}</span>
                                      <span className="text-[7px] bg-amber-200 text-amber-700 px-1 py-0.5 rounded font-black uppercase tracking-tighter">Manual</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const next = allMembers.filter(name => name !== m);
                                          setGroupForm({ ...groupForm, members: next });
                                        }}
                                        className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-amber-100 text-amber-400 hover:text-red-500 transition-colors"
                                      >
                                        <X size={10} />
                                      </button>
                                    </div>
                                  ))}
                               </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <div className="border-t border-gray-100 pt-4 mb-2">
                     <p className="text-[9px] font-black uppercase text-gray-300 tracking-widest mb-3">Tribe Registry Toggle</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                    {registrants
                      .filter(r => r.church !== 'JAM')
                      .filter(reg => (reg.fullName || '').toLowerCase().includes(registrySearch.toLowerCase()) || (reg.church || '').toLowerCase().includes(registrySearch.toLowerCase()))
                      .map(reg => (
                        <button
                          key={reg._id || reg.id}
                          type="button"
                          onClick={() => {
                            const current = groupForm.members || [];
                            const next = current.some(name => name.toLowerCase().trim() === reg.fullName.toLowerCase().trim()) 
                              ? current.filter(n => n.toLowerCase().trim() !== reg.fullName.toLowerCase().trim()) 
                              : [...current, reg.fullName];
                            setGroupForm({ ...groupForm, members: next });
                          }}
                          className={`text-[9px] px-2.5 py-1.5 rounded-lg font-black transition-all border shadow-sm ${ (groupForm.members || []).some(name => name.toLowerCase().trim() === reg.fullName.toLowerCase().trim()) 
                            ? 'bg-brand-brown border-brand-brown text-white ring-2 ring-brand-sand/50 shadow-md' 
                            : 'bg-white border-gray-100 text-gray-400 hover:border-brand-brown hover:text-brand-brown' }`}
                        >
                        <div className="flex flex-col items-center gap-0.5">
                          <span>{reg.fullName}</span>
                          <span className={`text-[7px] opacity-70 ${ (groupForm.members || []).some(name => name.toLowerCase().trim() === reg.fullName.toLowerCase().trim()) ? 'text-brand-cream' : 'text-gray-300' }`}>{reg.church ? reg.church : ''}</span>
                        </div>
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
        </div>,
        document.body
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

      {/* Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        isDestructive={confirmState.isDestructive}
      />

      <style>{`
        @media print {
          @page { size: A4; margin: 1cm; }
          .no-print { display: none !important; }
          #print-root { display: block !important; visibility: visible !important; position: static !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
          #print-root * { visibility: visible !important; color: black !important; border-color: black !important; }
          .print-page-break { break-after: page; page-break-after: always; margin-bottom: 0 !important; border-bottom: none !important; }
        }
      `}</style>
      
      <div id="print-root" className="hidden print:block p-0 bg-white font-serif text-black">
        {/* 1. PRINT DEPARTMENTS */}
        {activeTab === 'departments' && (
          <div className="flex flex-col text-black px-10">
            {/* Dossier Header (Single for Departments) */}
            <div className="bg-black text-white p-6 flex flex-col items-center justify-center text-center mb-10">
               <h1 className="text-4xl font-bold tracking-[0.2em] uppercase leading-none mb-2">LAKBAY CAMP 2026</h1>
               <p className="text-[10px] font-black tracking-[0.5em] uppercase border-t border-white/20 pt-2 opacity-80">
                  Official Organizational Roster • Generated {new Date().toLocaleDateString()}
               </p>
            </div>

            <div className="space-y-12">
              {Array.from(new Set(staff.flatMap(s => getCategories(s))))
                .filter(cat => cat !== 'Youth Leader')
                .sort((a, b) => a === 'Camp Head' ? -1 : b === 'Camp Head' ? 1 : a.localeCompare(b))
                .map(category => (
                  <div key={category} className="break-inside-avoid">
                     <h2 className="bg-black text-white px-4 py-2 text-sm font-black uppercase tracking-widest mb-4 inline-block self-start text-white">
                        DEPARTMENT: {category}
                     </h2>
                     <div className="grid grid-cols-2 gap-x-12 gap-y-2 border-t-4 border-black pt-4">
                        {staff.filter(s => getCategories(s).includes(category)).map((s, idx) => (
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

        {/* 2. PRINT LEADERS */}
        {activeTab === 'leaders' && (
          <div className="flex flex-col text-black px-10">
            {/* Dossier Header (Single for Leaders) */}
            <div className="bg-black text-white p-6 flex flex-col items-center justify-center text-center mb-10">
               <h1 className="text-4xl font-bold tracking-[0.2em] uppercase leading-none mb-2">LAKBAY CAMP 2026</h1>
               <p className="text-[10px] font-black tracking-[0.5em] uppercase border-t border-white/20 pt-2 opacity-80">
                  Official Organizational Roster • Generated {new Date().toLocaleDateString()}
               </p>
            </div>

            <div className="break-inside-avoid">
               <h2 className="bg-black text-white px-4 py-2 text-sm font-black uppercase tracking-widest mb-4 inline-block self-start text-white">
                  HEAD YOUTH LEADERS DIRECTORY
               </h2>
               <div className="grid grid-cols-2 gap-x-12 gap-y-2 border-t-4 border-black pt-4">
                  {effectiveChurches.map((churchName, idx) => {
                    const ldr = youthLeaders.find(yl => yl.churchRef === churchName);
                    return (
                      <div key={churchName} className="flex justify-between items-baseline border-b border-gray-100 py-1.5">
                         <div className="flex items-center gap-3">
                            <span className="text-[10px] opacity-30 font-bold">{idx + 1}.</span>
                            <span className="text-sm font-bold">{churchName}</span>
                         </div>
                         <div className="text-right">
                            <p className="text-[11px] font-black uppercase leading-none mb-1">{ldr?.name || '---'}</p>
                            <p className="text-[8px] font-bold opacity-40 uppercase tracking-tighter italic">{ldr?.roleTitle || 'CHURCH HEAD'}</p>
                         </div>
                      </div>
                    );
                  })}
               </div>
            </div>
          </div>
        )}

        {/* 3. PRINT TRIBES */}
        {activeTab === 'groups' && (
          <div className="flex flex-col text-black px-10">
             {groups.map((tribe, tribeIdx) => (
                <div key={tribe._id} className="print-page-break border-2 border-black p-8 relative min-h-[27.7cm] flex flex-col uppercase">
                   {/* Per-Page Header */}
                   <div className="bg-black text-white p-6 flex flex-col items-center justify-center text-center mb-10">
                      <h1 className="text-4xl font-bold tracking-[0.2em] uppercase leading-none mb-2 text-white">LAKBAY CAMP 2026</h1>
                      <p className="text-[10px] font-black tracking-[0.5em] uppercase border-t border-white/20 pt-2 opacity-80 text-white">
                         Official Organizational Roster • Generated {new Date().toLocaleDateString()}
                      </p>
                   </div>
                   
                   {/* Tribe ID Tag */}
                   <div className="absolute top-[160px] right-8 bg-black text-white px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                      UNIT {tribeIdx + 1}
                   </div>

                   <h2 className="text-3xl font-bold mb-6 border-b-4 border-black pb-2 uppercase tracking-tighter text-black">
                      TRIBE: <span className="font-black italic">{tribe.name}</span>
                   </h2>
                   
                   {/* Executive Core Grid */}
                   <div className="grid grid-cols-2 gap-4 mb-8 text-black">
                      <div className="border border-black p-3 bg-gray-50 flex flex-col">
                         <span className="text-[9px] font-bold uppercase tracking-widest text-black/40 mb-1 leading-none text-black">Command / Leader</span>
                         <span className="text-lg font-black">{tribe.leader || 'UNASSIGNED'}</span>
                      </div>
                      <div className="border border-black p-3 flex flex-col">
                         <span className="text-[9px] font-bold uppercase tracking-widest text-black/40 mb-1 leading-none text-black">Co-Command / Assistant</span>
                         <span className="text-lg font-black">{tribe.assistantLeader || 'UNASSIGNED'}</span>
                      </div>
                      <div className="border border-black p-3 flex flex-col">
                         <span className="text-[9px] font-bold uppercase tracking-widest text-black/40 mb-1 leading-none text-black">Intelligence / Point Keeper</span>
                         <span className="text-base font-bold">{tribe.pointKeeper || '---'}</span>
                      </div>
                      <div className="border border-black p-3 flex flex-col">
                         <span className="text-[9px] font-bold uppercase tracking-widest text-black/40 mb-1 leading-none text-black">Vanguard / Flag Bearer</span>
                         <span className="text-base font-bold">{tribe.flagBearer || '---'}</span>
                      </div>
                   </div>

                   {/* Tactics / Grab Masters */}
                   <div className="mb-8 border-t border-gray-100 pt-4 text-black">
                      <h3 className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 text-black">
                         <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                         Facilitators & Logistics
                      </h3>
                      <div className="flex flex-wrap gap-x-6 gap-y-2">
                         {[...(tribe.facilitators || []), ...(tribe.grabMasters || [])].filter(Boolean).map((f, i) => (
                           <div key={i} className="flex items-center gap-2 text-sm font-bold min-w-[200px] border-b border-gray-100 pb-1 italic text-black">
                              <span className="opacity-30">[{i + 1}]</span> {f}
                           </div>
                         ))}
                      </div>
                   </div>

                   {/* Roster Table */}
                   <div className="text-black">
                      <h3 className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 text-black">
                         <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                         Unit Personnel Roster
                      </h3>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                         {tribe.members.map((m, i) => {
                            const reg = registrants.find(r => r.fullName.toLowerCase().trim() === m.toLowerCase().trim());
                            return (
                               <div key={i} className="flex justify-between border-b border-gray-200 py-1 text-xs text-black">
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
        )}

        <div className="mt-20 border-t-2 border-black pt-6 flex justify-between items-end opacity-20">
           <div className="text-[10px] font-black tracking-widest uppercase">LAKBAY COMMAND • OFFICIAL OUTPUT</div>
           <div className="text-[10px] font-bold uppercase tracking-tighter italic">AUTHENTICATED CAMP DOCUMENT</div>
        </div>
      </div>
    </>
  );
}
