import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Users, Shield, X, Edit2, Map, Tent, Star, Flag, Target, Hand, Loader2, ExternalLink } from 'lucide-react';
import api from '../api/axios';

interface CampLeader {
  _id?: string;
  id?: string;
  name: string;
  churchRef: string | null;
  category: string;
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

export default function Organization() {
  const { currentUser, appSettings } = useAppStore();
  const isAdmin = currentUser?.role === 'admin';

  const [leaders, setLeaders] = useState<CampLeader[]>([]);
  const [groups, setGroups] = useState<CampGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [leaderModal, setLeaderModal] = useState<{ isOpen: boolean, leader: CampLeader | null }>({ isOpen: false, leader: null });
  const [groupModal, setGroupModal] = useState<{ isOpen: boolean, group: CampGroup | null }>({ isOpen: false, group: null });

  // Form States
  const [leaderForm, setLeaderForm] = useState<Partial<CampLeader>>({ category: 'Registration', name: '', roleTitle: '', churchRef: '', image: '', socialLink: '' });
  const [groupForm, setGroupForm] = useState<Partial<CampGroup>>({ name: '', leader: '', assistantLeader: '', pointKeeper: '', flagBearer: '', facilitators: [], grabMasters: [], members: [] });

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

  const staff = leaders.filter(l => l.category !== 'Youth Leader');
  const youthLeaders = leaders.filter(l => l.category === 'Youth Leader');

  return (
    <>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      {isLoading && (
        <div className="absolute top-0 right-0 p-2 z-10 flex gap-2 items-center text-brand-brown/50">
          <Loader2 className="animate-spin w-5 h-5" /> 
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl md:text-3xl font-display text-brand-brown tracking-wide mb-1 flex items-center gap-2">
              <Map className="text-brand-brown" /> Camp Organization
            </h2>
            <p className="text-sm text-gray-500">Official camp groupings, staff roster, and church youth leaders.</p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <button 
                onClick={() => { setLeaderForm({ category: 'Registration', name: '', roleTitle: '', churchRef: '', image: '', socialLink: '' }); setLeaderModal({ isOpen: true, leader: null }); }}
                className="bg-brand-sand text-brand-brown px-4 py-2 rounded-xl font-bold hover:bg-opacity-80 transition-colors shadow-sm flex items-center gap-2 text-sm"
              >
                <Shield size={16} /> Add Role
              </button>
              <button 
                onClick={() => { setGroupForm({ name: '', leader: '', assistantLeader: '', pointKeeper: '', flagBearer: '', facilitators: [], grabMasters: [], members: [] }); setGroupModal({ isOpen: true, group: null }); }}
                className="bg-brand-brown text-white px-4 py-2 rounded-xl font-bold hover:bg-brand-light-brown transition-colors shadow-sm flex items-center gap-2 text-sm"
              >
                <Tent size={16} /> New Group
              </button>
            </div>
          )}
        </div>

        {/* 1. CAMP STAFF & DEPARTMENTS */}
        <section>
          <div className="flex items-center gap-2 mb-4">
             <Shield className="text-brand-brown/50" size={20} />
             <h3 className="text-xl font-display text-brand-brown tracking-wide">Camp Staff & Departments</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
            {staff.length === 0 && <p className="text-gray-400 text-sm italic col-span-full">No staff assigned yet.</p>}
            {Array.from(new Set(staff.map(s => s.category))).sort().map(category => (
              <div key={category} className="bg-white rounded-2xl p-4 lg:p-5 shadow-sm border border-brand-sand/50 h-max">
                 <h4 className="font-black uppercase text-[10px] lg:text-xs tracking-widest text-brand-brown/60 mb-3 border-b border-gray-100 pb-2 flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-brand-brown"></div> {category}
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                   {staff.filter(s => s.category === category).map(s => (
                     <div key={s._id || s.id} className="flex items-center justify-between group p-2 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-brand-beige">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-cream flex items-center justify-center shrink-0 overflow-hidden border border-brand-sand/30 shadow-inner">
                            {s.image ? <img src={s.image} alt={s.name} className="w-full h-full object-cover" /> : <span className="font-display text-brand-brown text-sm">{s.name.charAt(0)}</span>}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 leading-tight flex items-center gap-1.5">
                              {s.socialLink ? (
                                <a href={s.socialLink} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline flex items-center gap-1" title="View Social Profile">{s.name} <ExternalLink size={10} className="text-gray-400" /></a>
                              ) : (
                                s.name
                              )}
                            </p>
                            {s.roleTitle && <p className="text-[9px] lg:text-[10px] uppercase font-bold text-gray-400 tracking-wider mt-0.5">{s.roleTitle}</p>}
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="opacity-0 group-hover:opacity-100 flex gap-1 bg-white shadow-sm border border-gray-100 p-0.5 rounded-lg shrink-0">
                            <button 
                                onClick={() => { setLeaderForm(s); setLeaderModal({ isOpen: true, leader: s }); }}
                                className="p-2 text-blue-600 hover:bg-blue-50 bg-white rounded-lg transition-colors opacity-0 group-hover:opacity-100 shadow-sm border border-brand-beige"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteLeader(s._id || s.id as string)}
                                className="p-2 text-red-600 hover:bg-red-50 bg-white rounded-lg transition-colors opacity-0 group-hover:opacity-100 shadow-sm border border-brand-beige"
                              >
                                <X size={14} />
                              </button>
                          </div>
                        )}
                     </div>
                   ))}
                 </div>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-brand-beige" />

        {/* 2. YOUTH LEADERS */}
        <section>
          <div className="flex items-center gap-2 mb-4">
             <Users className="text-brand-brown/50" size={20} />
             <h3 className="text-xl font-display text-brand-brown tracking-wide">Church Youth Leaders</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {appSettings?.churches?.map((church: string) => {
              const churchLeaders = youthLeaders.filter(yl => yl.churchRef === church);
              return (
                <div key={church} className="bg-gradient-to-br from-white to-gray-50 border border-brand-beige rounded-2xl p-5 shadow-sm">
                   <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3 border-b border-gray-100 pb-2">{church}</h4>
                   <div className="p-4 pt-0">
                     <div className="space-y-2">
                       {churchLeaders.length > 0 ? (
                         churchLeaders.map(cl => (
                           <div key={cl._id || cl.id} className="flex items-center justify-between group">
                             <div className="flex items-center gap-2.5">
                               <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0 overflow-hidden border border-brand-sand shadow-inner">
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
                             {isAdmin && (
                               <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                                  <button 
                                    onClick={() => { setLeaderForm(cl); setLeaderModal({ isOpen: true, leader: cl }); }}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteLeader(cl._id || cl.id as string)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <X size={12} />
                                  </button>
                               </div>
                             )}
                           </div>
                         ))
                       ) : (
                         <p className="text-xs text-brand-brown/40 italic font-medium">No youth leader assigned yet.</p>
                       )}
                     </div>
                   </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. OFFICIAL GROUPINGS */}
        <section className="bg-brand-brown rounded-3xl p-6 md:p-8 shadow-xl mt-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          
          <div className="flex items-center gap-3 mb-8 relative z-10">
             <Tent className="text-brand-cream h-10 w-10 p-2 bg-white/10 rounded-xl" />
             <div>
               <h3 className="text-2xl md:text-3xl font-display text-white tracking-wide leading-none">Official Groups</h3>
               <p className="text-brand-cream/70 text-sm mt-1 font-medium">Tribes and roles for the duration of the camp</p>
             </div>
          </div>
          
          {groups.length === 0 ? (
            <div className="text-center py-12 relative z-10">
               <p className="text-white/50 italic">No official groups have been created yet.</p>
            </div>
          ) : (
            <div className="columns-1 md:columns-2 xl:columns-3 gap-6 space-y-6 relative z-10 p-1">
              {groups.map(g => (
                <div key={g._id || g.id} className="break-inside-avoid bg-white rounded-3xl p-6 shadow-2xl relative group transform hover:-translate-y-1 transition-all duration-300 border-[3px] border-brand-cream overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-brown via-brand-sand to-brand-brown"></div>
                  {isAdmin && (
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/90 backdrop-blur rounded p-1 shadow-sm border border-brand-beige">
                           <button 
                             onClick={() => { setGroupForm(g); setGroupModal({ isOpen: true, group: g }); }}
                             className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                           >
                             <Edit2 size={16} />
                           </button>
                           <button 
                             onClick={() => handleDeleteGroup(g._id || g.id as string)}
                             className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                           >
                             <X size={16} />
                           </button>
                    </div>
                  )}
                  
                  <h4 className="text-2xl font-display text-brand-brown tracking-wide mb-6 flex items-center gap-2">
                    {g.name}
                  </h4>

                  <div className="space-y-3">
                    {g.leader && (
                      <div className="flex items-center gap-3 p-2 bg-orange-50/50 rounded-xl border border-orange-100">
                        <div className="bg-orange-100 p-1.5 rounded-lg text-orange-600 shrink-0"><Star size={16} fill="currentColor" /></div>
                        <div>
                          <p className="text-xs font-black uppercase text-orange-600 tracking-widest leading-none mb-1">Leader</p>
                          <p className="text-sm font-bold text-gray-900 leading-tight">{g.leader}</p>
                        </div>
                      </div>
                    )}
                    {g.assistantLeader && (
                      <div className="flex items-center gap-3 p-2 bg-amber-50/50 rounded-xl border border-amber-100">
                        <div className="bg-amber-100 p-1.5 rounded-lg text-amber-600 shrink-0"><Shield size={16} /></div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest leading-none mb-1">Asst. Leader</p>
                          <p className="text-sm font-bold text-gray-800 leading-tight">{g.assistantLeader}</p>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      {g.pointKeeper && (
                        <div className="flex items-center gap-2 p-2 bg-blue-50/50 rounded-xl border border-blue-100">
                          <div className="bg-blue-100 p-1 rounded-md text-blue-600 shrink-0"><Target size={14} /></div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase text-blue-600 tracking-widest leading-none mb-0.5 truncate">Point Keeper</p>
                            <p className="text-xs font-bold text-gray-800 truncate">{g.pointKeeper}</p>
                          </div>
                        </div>
                      )}
                      {g.flagBearer && (
                        <div className="flex items-center gap-2 p-2 bg-red-50/50 rounded-xl border border-red-100">
                          <div className="bg-red-100 p-1 rounded-md text-red-600 shrink-0"><Flag size={14} /></div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase text-red-600 tracking-widest leading-none mb-0.5 truncate">Flag Bearer</p>
                            <p className="text-xs font-bold text-gray-800 truncate">{g.flagBearer}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {g.facilitators?.length > 0 && (
                      <div className="mt-4 border-t border-gray-100 pt-3">
                         <h5 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 flex items-center gap-1.5">
                           <Shield size={12} className="text-indigo-400" /> Facilitators/Counselors
                         </h5>
                         <div className="flex flex-wrap gap-1.5">
                           {g.facilitators.map((facil, i) => (
                             <span key={i} className="bg-indigo-50/80 text-indigo-700 border border-indigo-100 text-[11px] px-2.5 py-1 rounded-md font-bold shadow-sm">{facil}</span>
                           ))}
                         </div>
                      </div>
                    )}

                    {g.grabMasters?.length > 0 && (
                      <div className="mt-4 border-t border-gray-100 pt-3">
                         <h5 className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1.5 mb-2"><Hand size={12} className="text-brand-brown" /> Grab Masters</h5>
                         <div className="flex flex-wrap gap-1.5">
                           {g.grabMasters.map((gm, i) => (
                             <span key={i} className="bg-gray-100 text-gray-700 text-[11px] px-2 py-1 rounded-md font-bold">{gm}</span>
                           ))}
                         </div>
                      </div>
                    )}

                    {g.members?.length > 0 && (
                      <div className="mt-4 border-t border-gray-100 pt-3">
                         <h5 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Members ({g.members.length})</h5>
                         <p className="text-[11px] leading-relaxed text-gray-600 font-medium">
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
      </div>

      {/* Leader Modal */}
      {leaderModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-brown/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
              <button type="button" onClick={() => setLeaderModal({ isOpen: false, leader: null })} className="absolute top-4 right-4 text-gray-400 hover:text-black focus:outline-none"><X size={24} /></button>
              <h3 className="text-2xl font-display text-brand-brown mb-6">{leaderModal.leader ? 'Edit Role' : 'Add New Role'}</h3>
              <form onSubmit={handleSaveLeader} className="space-y-4">
                 <div>
                    <label className="block text-xs text-gray-500 mb-1">Category</label>
                    <select required value={leaderForm.category} onChange={e => setLeaderForm({...leaderForm, category: e.target.value as any})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:border-brand-brown outline-none">
                       <option value="Camp Head">Camp Head</option>
                       <option value="Registration">Registration Team</option>
                       <option value="Food">Food Team</option>
                       <option value="Arts & Decorations">Arts & Decorations</option>
                       <option value="Media">Media Team</option>
                       <option value="Music">Music Team</option>
                       <option value="Marshall">Marshall</option>
                       <option value="Runners">Runners</option>
                       <option value="Game Masters">Game Masters</option>
                       <option value="Point Masters">Point Masters</option>
                       <option value="Medic">Medic</option>
                       <option value="Awards">Awards</option>
                       <option value="Finance">Finance (Treasurer & Auditor)</option>
                       <option value="Youth Leader">Church Youth Leader</option>
                    </select>
                 </div>
                 {leaderForm.category === 'Youth Leader' && (
                   <div>
                      <label className="block text-xs text-gray-500 mb-1">Church</label>
                      <select required value={leaderForm.churchRef || ''} onChange={e => setLeaderForm({...leaderForm, churchRef: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:border-brand-brown outline-none">
                         <option value="" disabled>Select a church...</option>
                         {appSettings?.churches?.map((c: string) => <option key={c} value={c}>{c}</option>)}
                      </select>
                   </div>
                 )}
                 <div>
                    <label className="block text-xs text-gray-500 mb-1">Full Name</label>
                    <input type="text" required value={leaderForm.name} onChange={e => setLeaderForm({...leaderForm, name: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:border-brand-brown outline-none" placeholder="e.g. John Doe" />
                 </div>
                 <div>
                    <label className="block text-xs text-gray-500 mb-1">Specific Title (Optional)</label>
                    <input type="text" value={leaderForm.roleTitle} onChange={e => setLeaderForm({...leaderForm, roleTitle: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:border-brand-brown outline-none" placeholder="e.g. Head Coordinator, Medical Team" />
                 </div>
                 <div>
                    <label className="block text-xs text-gray-500 mb-1">Photo URL (Optional)</label>
                    <input type="url" value={leaderForm.image} onChange={e => setLeaderForm({...leaderForm, image: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:border-brand-brown outline-none" placeholder="e.g. https://imgur.com/photo.jpg" />
                 </div>
                 <div>
                    <label className="block text-xs text-gray-500 mb-1">Social Media Link (Optional)</label>
                    <input type="url" value={leaderForm.socialLink} onChange={e => setLeaderForm({...leaderForm, socialLink: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-400 outline-none" placeholder="e.g. https://facebook.com/username" />
                 </div>
                 <button type="submit" className="w-full py-3 rounded-xl bg-brand-brown text-white font-bold hover:bg-brand-light-brown transition-colors mt-2">{leaderModal.leader ? 'Save Changes' : 'Add Role'}</button>
              </form>
           </div>
        </div>
      )}

      {/* Group Modal */}
      {groupModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-brown/50 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
           <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl relative border border-brand-sand/50 my-6 max-h-[90vh] flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
                 <h3 className="text-2xl font-display text-brand-brown tracking-wide flex items-center gap-2"><Tent size={24} className="text-brand-brown" /> {groupModal.group ? 'Edit Official Group' : 'Create Official Group'}</h3>
                 <button type="button" onClick={() => setGroupModal({ isOpen: false, group: null })} className="text-gray-400 hover:text-brand-brown transition-colors p-1"><X size={24} /></button>
              </div>
              
              <form onSubmit={handleSaveGroup} className="p-6 overflow-y-auto space-y-6">
                 <div>
                    <label className="block text-xs text-gray-500 uppercase tracking-widest font-black mb-1">Group Name</label>
                    <input type="text" required value={groupForm.name} onChange={e => setGroupForm({...groupForm, name: e.target.value})} className="w-full border-2 border-brand-sand rounded-xl px-4 py-3 text-lg font-bold focus:border-brand-brown outline-none" placeholder="e.g. Group 1, Wildcats" />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <h4 className="md:col-span-2 text-[10px] font-black uppercase text-brand-brown tracking-widest border-b border-gray-200 pb-2 mb-2">Key Core Roles</h4>
                    <div>
                       <label className="block text-[11px] text-gray-500 font-bold mb-1"><Star size={12} className="inline mr-1 text-orange-500" />Leader Name</label>
                       <input type="text" value={groupForm.leader} onChange={e => setGroupForm({...groupForm, leader: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-orange-400 outline-none" />
                    </div>
                    <div>
                       <label className="block text-[11px] text-gray-500 font-bold mb-1"><Shield size={12} className="inline mr-1 text-amber-500" />Assistant Leader Name</label>
                       <input type="text" value={groupForm.assistantLeader} onChange={e => setGroupForm({...groupForm, assistantLeader: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400 outline-none" />
                    </div>
                    <div>
                       <label className="block text-[11px] text-gray-500 font-bold mb-1"><Target size={12} className="inline mr-1 text-blue-500" />Point Keeper Name</label>
                       <input type="text" value={groupForm.pointKeeper} onChange={e => setGroupForm({...groupForm, pointKeeper: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 outline-none" />
                    </div>
                    <div>
                       <label className="block text-[11px] text-gray-500 font-bold mb-1"><Flag size={12} className="inline mr-1 text-red-500" />Flag Bearer Name</label>
                       <input type="text" value={groupForm.flagBearer} onChange={e => setGroupForm({...groupForm, flagBearer: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-red-400 outline-none" />
                    </div>
                 </div>

                 <div>
                    <label className="block text-[11px] text-gray-500 font-bold mb-1 uppercase tracking-widest flex items-center gap-1"><Shield size={14} className="text-indigo-400" /> Facilitators/Counselors (Comma separated)</label>
                    <input type="text" value={groupForm.facilitators?.join(', ')} onChange={e => setGroupForm({...groupForm, facilitators: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-300 outline-none font-medium bg-indigo-50/10" placeholder="e.g. John, Mary (Counselors not part of the tribe but guiding it)" />
                 </div>

                 <div>
                    <label className="block text-[11px] text-gray-500 font-bold mb-1 uppercase tracking-widest flex items-center gap-1"><Hand size={14} className="text-gray-400" /> Grab Masters (Comma separated)</label>
                    <input type="text" value={groupForm.grabMasters?.join(', ')} onChange={e => setGroupForm({...groupForm, grabMasters: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-brand-brown outline-none font-medium" placeholder="e.g. John, Mary, Steve" />
                 </div>

                 <div>
                    <label className="block text-[11px] text-gray-500 font-bold mb-1 uppercase tracking-widest">Normal Members (Comma separated)</label>
                    <textarea value={groupForm.members?.join(', ')} onChange={e => setGroupForm({...groupForm, members: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} rows={4} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-brand-brown outline-none font-medium leading-relaxed custom-scrollbar" placeholder="Paste all member names here separated by commas..." />
                 </div>

                 <div className="pt-4 border-t border-gray-100 flex justify-end">
                    <button type="submit" className="px-6 py-3 rounded-xl bg-brand-brown text-white font-bold hover:bg-brand-light-brown transition-colors shadow-sm">{groupModal.group ? 'Save Group Layout' : 'Create Organization Group'}</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </>
  );
}
