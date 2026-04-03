import { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { 
  Star, 
  Plus, 
  Users, 
  Vote, 
  CheckCircle2, 
  X, 
  Search, 
  Trash2, 
  ChevronRight,
  TrendingUp,
  Award as AwardIcon,
  Activity
} from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import type { Registrant } from '../types';

export default function Awards() {
  const { 
    awards, 
    registrants, 
    currentUser,
    updateAwardVote,
    lockEntity,
    unlockEntity,
    groups
  } = useAppStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isNominateModalOpen, setIsNominateModalOpen] = useState<string | null>(null); // Award ID
  const [newAwardData, setNewAwardData] = useState({ 
    title: '', 
    description: '',
    awardType: 'individual' as 'individual' | 'group'
  });
  const [nominationReason, setNominationReason] = useState('');
  const [searchCamper, setSearchCamper] = useState('');
  const [selectedCamper, setSelectedCamper] = useState<Registrant | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'nominating' | 'voting' | 'closed'>('all');

  const isAdmin = currentUser?.role === 'admin';
  const currentUserId = currentUser?._id || (currentUser as any)?.id || '';

  // Stats
  const stats = useMemo(() => {
    return {
      total: awards.length,
      nominating: awards.filter(a => a.status === 'nominating').length,
      voting: awards.filter(a => a.status === 'voting').length,
      closed: awards.filter(a => a.status === 'closed').length,
    };
  }, [awards]);

  const filteredAwards = useMemo(() => {
    if (filterStatus === 'all') return awards;
    return awards.filter(a => a.status === filterStatus);
  }, [awards, filterStatus]);

  const filteredRegistrants = useMemo(() => {
    if (!searchCamper) return registrants.slice(0, 10);
    const lowSearch = searchCamper.toLowerCase();
    return registrants.filter(r => 
      r.fullName.toLowerCase().includes(lowSearch) || 
      r.church.toLowerCase().includes(lowSearch)
    ).slice(0, 10);
  }, [registrants, searchCamper]);

  const handleCreateAward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAwardData.title.trim()) return;

    try {
      await api.post('/api/awards', newAwardData);
      toast.success('Award category created!');
      setIsCreateModalOpen(false);
      setNewAwardData({ title: '', description: '', awardType: 'individual' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create award');
    }
  };

  const handleNominate = async () => {
    if (!isNominateModalOpen) return;
    const award = awards.find(a => (a.id || (a as any)._id) === isNominateModalOpen);
    const isGroup = award?.awardType === 'group';
    
    if (isGroup && !selectedGroupId) return toast.error('Select a tribe');
    if (!isGroup && !selectedCamper) return toast.error('Select a camper');

    try {
      const payload = isGroup 
        ? { groupId: selectedGroupId, reason: nominationReason }
        : { camperId: selectedCamper!.id || (selectedCamper as any)._id, reason: nominationReason };

      await api.post(`/api/awards/${isNominateModalOpen}/nominate`, payload);
      toast.success('Nomination added!');
      setIsNominateModalOpen(null);
      setSelectedCamper(null);
      setSelectedGroupId('');
      setNominationReason('');
      setSearchCamper('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to nominate');
    }
  };

  const handleVote = async (awardId: string, nominationId: string, action: 'add' | 'remove') => {
    if (!currentUserId) return;

    // Frontend validation
    if (action === 'add') {
      const award = awards.find(a => (a.id || (a as any)._id) === awardId);
      const limit = currentUser?.voteLimit || 1;
      const totalCast = award?.nominations?.reduce((acc: number, n: any) => 
        acc + (n.votes?.filter((v: any) => (v._id || v || '').toString() === currentUserId).length || 0)
      , 0) || 0;
      
      if (totalCast >= limit) {
        return toast.error(`You have reached your limit of ${limit} vote${limit > 1 ? 's' : ''} for this award.`);
      }
    }

    // Optimistic Update
    updateAwardVote(awardId, nominationId, currentUserId, action);
    lockEntity('awards', awardId);
    
    try {
      await api.post(`/api/awards/${awardId}/vote/${nominationId}`, { action });
    } catch (err: any) {
      // Rollback on error
      updateAwardVote(awardId, nominationId, currentUserId, action === 'add' ? 'remove' : 'add');
      toast.error(err.response?.data?.message || 'Failed to vote');
    } finally {
      unlockEntity('awards', awardId);
    }
  };

  const updateStatus = async (awardId: string, status: string) => {
    try {
      await api.patch(`/api/awards/${awardId}/status`, { status });
      toast.success(`Award status updated to ${status}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const deleteAward = async (awardId: string) => {
    if (!confirm('Are you sure you want to delete this award completely?')) return;
    try {
      await api.delete(`/api/awards/${awardId}`);
      toast.success('Award deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete award');
    }
  };

  const deleteNomination = async (awardId: string, nominationId: string) => {
    if (!confirm('Remove this nomination?')) return;
    try {
      await api.delete(`/api/awards/${awardId}/nominate/${nominationId}`);
      toast.success('Nomination removed');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove nomination');
    }
  };

  return (
    <div className="space-y-4 pb-8 animate-in fade-in duration-700 max-w-7xl mx-auto px-4">
      {/* Header & Stats Section */}
      <div className="relative overflow-hidden bg-brand-brown rounded-3xl p-6 md:p-10 text-brand-beige shadow-xl">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-brand-sand/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-white/5 rounded-full blur-[50px]" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-brand-sand/20 rounded-2xl text-brand-sand">
                <Star size={32} strokeWidth={2.5} />
              </div>
              <span className="text-brand-sand font-display tracking-[0.3em] text-sm uppercase">Recognition System</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-display text-white tracking-tight">Awards & <span className="text-brand-sand italic">Nominations</span></h1>
            <p className="text-brand-beige/60 max-w-xl text-sm md:text-base font-medium leading-relaxed">
              Empower our camp leaders to recognize exceptional character. Nominate delegates and collectively decide our awardees.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full md:w-auto shrink-0">
             <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-3 rounded-xl min-w-[100px]">
                <p className="text-[10px] text-brand-sand uppercase tracking-widest font-black mb-0.5">Total</p>
                <p className="text-2xl font-display text-white">{stats.total}</p>
             </div>
             <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-3 rounded-xl min-w-[100px]">
                <p className="text-[10px] text-yellow-400 uppercase tracking-widest font-black mb-0.5">Nominating</p>
                <p className="text-2xl font-display text-white">{stats.nominating}</p>
             </div>
             <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-3 rounded-xl min-w-[100px]">
                <p className="text-[10px] text-green-400 uppercase tracking-widest font-black mb-0.5">Voting</p>
                <p className="text-2xl font-display text-white">{stats.voting}</p>
             </div>
             <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-3 rounded-xl min-w-[100px]">
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-black mb-0.5">Closed</p>
                <p className="text-2xl font-display text-white">{stats.closed}</p>
             </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 bg-white rounded-2xl border border-brand-beige/50 shadow-sm w-fit">
          {(['all', 'nominating', 'voting', 'closed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-5 py-2 rounded-xl text-sm font-bold capitalize transition-all ${filterStatus === status ? 'bg-brand-brown text-white shadow-md' : 'text-brand-brown/60 hover:bg-brand-cream'}`}
            >
              {status}
            </button>
          ))}
        </div>

        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-brand-brown hover:bg-brand-light-brown text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-brand-brown/10 transition-all active:scale-95 text-base"
        >
          <Plus size={18} />
          <span>New Award</span>
        </button>
      </div>

      {/* Awards Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {filteredAwards.map((award) => {
          const awardId = award.id || (award as any)._id;
          return (
            <div 
              key={awardId}
              className="group bg-white rounded-3xl border border-brand-brown/5 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              {/* Award Card Header */}
              <div className="p-5 pb-2 relative">
                 <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                         <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                           award.status === 'nominating' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                           award.status === 'voting' ? 'bg-green-50 text-green-600 border-green-200' :
                           'bg-gray-50 text-gray-400 border-gray-200'
                         }`}>
                           {award.status} 
                         </span>
                         <span className="text-[10px] text-gray-400 font-medium">Created {format(new Date(award.createdAt), 'MMM dd, h:mm a')}</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl md:text-2xl font-display text-brand-brown tracking-tight leading-none group-hover:text-brand-light-brown transition-colors">
                            {award.title}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border shadow-sm shrink-0 ${
                            award.awardType === 'group' 
                              ? 'bg-amber-50 text-amber-600 border-amber-100' 
                              : 'bg-brand-brown/5 text-brand-brown/40 border-brand-brown/10'
                          }`}>
                            {award.awardType === 'group' ? 'Group' : 'Indiv'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium line-clamp-1 opacity-70">
                          {award.description || 'No description provided.'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <div className="flex items-center gap-1 bg-brand-cream/50 p-1 rounded-xl border border-brand-beige">
                          <button 
                            onClick={() => updateStatus(awardId, 'nominating')}
                            className={`p-2 rounded-lg transition-all ${award.status === 'nominating' ? 'bg-white text-yellow-600 shadow-sm' : 'text-gray-400 hover:text-brand-brown'}`}
                            title="Set to Nominating"
                          >
                            <Users size={16} />
                          </button>
                          <button 
                            onClick={() => updateStatus(awardId, 'voting')}
                            className={`p-2 rounded-lg transition-all ${award.status === 'voting' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-brand-brown'}`}
                            title="Set to Voting"
                          >
                            <Vote size={16} />
                          </button>
                          <button 
                            onClick={() => updateStatus(awardId, 'closed')}
                            className={`p-2 rounded-lg transition-all ${award.status === 'closed' ? 'bg-white text-gray-600 shadow-sm' : 'text-gray-400 hover:text-brand-brown'}`}
                            title="Set to Closed"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        </div>
                      )}
                      {(isAdmin || award.createdBy === currentUserId) && (
                        <button 
                          onClick={() => deleteAward(awardId)}
                          className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                 </div>
              </div>

              {/* Nominations List */}
              <div className="flex-1 p-5 pt-2">
                  <div className="mb-6 flex items-center justify-between">
                    <h4 className="text-sm font-black text-brand-brown/40 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Activity size={14} className="text-brand-sand" />
                      Nominees ({award.nominations?.length || 0})
                    </h4>

                    {award.status === 'voting' && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-sand/10 border border-brand-sand/20">
                        <Vote size={14} className="text-brand-sand" />
                        <span className="text-xs font-black text-brand-brown uppercase tracking-tighter">
                          Votes Left: {Math.max(0, (currentUser?.voteLimit || 1) - (award.nominations?.reduce((acc: number, n: any) => acc + (n.votes?.filter((v: any) => (v._id || v || '').toString() === currentUserId).length || 0), 0) || 0))}
                        </span>
                      </div>
                    )}

                    {award.status === 'nominating' && (
                      <button 
                        onClick={() => setIsNominateModalOpen(awardId)}
                        className="text-xs font-bold text-brand-brown hover:text-brand-sand flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-cream hover:bg-brand-beige border border-brand-beige transition-all"
                      >
                        <Plus size={14} />
                        Add Nominee
                      </button>
                    )}
                  </div>

                 <div className="space-y-4">
                    {(award.nominations || []).length === 0 ? (
                      <div className="py-12 border-2 border-dashed border-brand-beige rounded-3xl flex flex-col items-center justify-center text-gray-400">
                         <AwardIcon size={40} className="mb-3 opacity-20" />
                         <p className="font-medium italic">Waiting for nominations...</p>
                      </div>
                    ) : (
                      award.nominations.sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0)).map((nomination) => {
                        const nominationId = nomination.id || (nomination as any)._id;
                        const voteCount = nomination.votes?.length || 0;
                        const maxVotes = Math.max(...(award.nominations.map(n => n.votes?.length || 0)), 1);
                        const progressWidth = (voteCount / maxVotes) * 100;
                        const userVotes = nomination.votes?.filter((v: any) => (v._id || v || '').toString() === currentUserId).length || 0;
                        
                        return (
                          <div 
                            key={nominationId}
                            className="relative group/nominee p-3 rounded-2xl bg-brand-cream/30 border border-brand-beige/50 hover:bg-white hover:border-brand-brown/10 transition-all duration-300"
                          >
                             {/* Vote Progress Bar */}
                             <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-b-full">
                                <div 
                                  className={`h-full transition-all duration-1000 ease-out ${award.status === 'closed' ? 'bg-gray-300' : 'bg-brand-sand'}`}
                                  style={{ width: `${progressWidth}%` }}
                                />
                             </div>

                             <div className="flex items-center gap-4 relative z-10">
                                <div className="w-10 h-10 rounded-xl bg-white border border-brand-beige flex flex-col items-center justify-center shrink-0 shadow-sm relative group/voters">
                                  <span className={`text-lg font-display leading-none ${award.status === 'closed' ? 'text-gray-400' : 'text-brand-brown'}`}>{voteCount}</span>
                                  <span className="text-[6px] font-black uppercase tracking-widest text-brand-brown/40">Votes</span>
                                  
                                  {/* Voters Popover */}
                                   {nomination.votes && nomination.votes.length > 0 && (
                                    <div className="absolute left-full ml-2 top-0 invisible group-hover/voters:visible z-[100] w-max max-w-[200px] bg-brand-brown text-white p-2.5 rounded-xl shadow-xl shadow-brand-brown/20 text-left overflow-hidden">
                                      <p className="text-[7px] font-black uppercase tracking-[0.2em] mb-1.5 opacity-50 border-b border-white/10 pb-1">Voters</p>
                                      <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                                        {nomination.votes.map((v: any, i: number) => {
                                          const isObject = typeof v === 'object' && v !== null;
                                          return (
                                            <div key={i} className="flex flex-col border-l-2 border-brand-sand/30 pl-1.5">
                                              <span className="text-[9px] font-bold leading-tight truncate">{isObject ? v.church : 'Anonymous Voter'}</span>
                                              <span className="text-[7px] opacity-60 leading-tight uppercase font-black tracking-tighter">{isObject ? (v.role || 'Member') : 'Voter'}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                      <div className="absolute right-full top-4 translate-x-1 border-[6px] border-transparent border-r-brand-brown" />
                                    </div>
                                  )}
                                </div>

                                 <div className="min-w-0 flex-1">
                                   <div className="flex items-center gap-1.5 mb-0.5">
                                      <h5 className="font-display text-base text-brand-brown truncate">
                                        {award.awardType === 'group' ? nomination.groupId?.name : nomination.camperId?.fullName}
                                      </h5>
                                      {award.awardType === 'individual' && (
                                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-brand-brown/5 text-brand-brown/60 font-bold truncate max-w-[80px]">
                                          {nomination.camperId?.church}
                                        </span>
                                      )}
                                      {award.awardType === 'group' && nomination.groupId?.color && (
                                        <div 
                                          className="w-2.5 h-2.5 rounded-full border border-white shadow-sm" 
                                          style={{ backgroundColor: nomination.groupId.color }} 
                                        />
                                      )}
                                   </div>
                                   <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                                     <p className="text-[11px] text-gray-500 italic truncate max-w-[200px]">"{nomination.reason || 'No reason specified'}"</p>
                                     <span className="hidden sm:inline text-[10px] text-gray-300">•</span>
                                     <span className="text-[9px] text-gray-400 font-medium">By {nomination.nominatedBy?.church}</span>
                                   </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {award.status === 'voting' && (
                                    <div className="flex items-center gap-1.5">
                                      {userVotes > 0 && (
                                        <button 
                                          onClick={() => handleVote(awardId, nominationId, 'remove')}
                                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100 transition-all"
                                          title="Remove one vote"
                                        >
                                          <X size={16} />
                                        </button>
                                      )}
                                      <button 
                                        onClick={() => handleVote(awardId, nominationId, 'add')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all text-xs ${
                                          userVotes > 0
                                            ? 'bg-brand-brown text-white' 
                                            : 'bg-white text-brand-brown border border-brand-beige'
                                        }`}
                                      >
                                        <Vote size={14} />
                                        <span>
                                          {userVotes > 0 ? `Voted (${userVotes})` : 'Vote'}
                                        </span>
                                      </button>
                                    </div>
                                  )}
                                  
                                  {(isAdmin || (nomination.nominatedBy?._id || nomination.nominatedBy?.id || nomination.nominatedBy) === currentUserId) && (
                                    <button 
                                      onClick={() => deleteNomination(awardId, nominationId)}
                                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                      <X size={16} />
                                    </button>
                                  )}
                                </div>
                             </div>
                          </div>
                        )
                      })
                    )}
                 </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredAwards.length === 0 && (
        <div className="py-24 flex flex-col items-center justify-center text-center px-4">
           <div className="w-24 h-24 bg-brand-beige/20 rounded-[2rem] flex items-center justify-center text-brand-beige mb-6">
              <Star size={48} strokeWidth={1.5} />
           </div>
           <h3 className="text-2xl font-display text-brand-brown mb-2 tracking-tight">No reward categories found</h3>
           <p className="text-brand-brown/50 max-w-sm mx-auto font-medium">
             Start acknowledging great character by creating a new award category for this camp.
           </p>
           <button 
             onClick={() => setIsCreateModalOpen(true)}
             className="mt-8 flex items-center gap-2 bg-brand-brown text-white px-8 py-3 rounded-2xl font-bold hover:shadow-xl transition-all"
           >
             <Plus size={20} />
             Create First Category
           </button>
        </div>
      )}

      {/* Create Award Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-brand-brown/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-brand-brown/5 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 pb-0 flex justify-between items-start">
               <div className="p-2.5 bg-brand-brown text-white rounded-xl">
                 <AwardIcon size={20} />
               </div>
               <button onClick={() => setIsCreateModalOpen(false)} className="p-2 text-gray-400 hover:text-brand-brown transition-colors">
                 <X size={20} />
               </button>
            </div>
            
            <form onSubmit={handleCreateAward} className="p-6 pt-4 space-y-5">
              <div>
                <h3 className="text-xl font-display text-brand-brown mb-0.5 tracking-tight">Create Award Category</h3>
                <p className="text-gray-500 text-[11px] font-medium leading-tight">Define a new recognition for our delegates.</p>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-black text-brand-brown/40 uppercase tracking-widest mb-3 ml-1">Launch Scope</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button 
                      type="button"
                      onClick={() => setNewAwardData(d => ({ ...d, awardType: 'individual' }))}
                      className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all group ${
                        newAwardData.awardType === 'individual' 
                          ? 'border-brand-brown bg-brand-brown text-white shadow-lg shadow-brand-brown/10' 
                          : 'border-brand-beige text-gray-400 hover:border-brand-brown/20 hover:bg-brand-cream/30'
                      }`}
                    >
                      <Star size={20} className={newAwardData.awardType === 'individual' ? '' : 'text-brand-beige group-hover:text-brand-brown/40'} />
                      <div className="text-center">
                        <p className="font-bold text-xs">Individual</p>
                        <p className={`text-[8px] font-black uppercase tracking-tighter ${newAwardData.awardType === 'individual' ? 'text-white/60' : 'text-gray-300'}`}>Campers</p>
                      </div>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setNewAwardData(d => ({ ...d, awardType: 'group' }))}
                      className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all group ${
                        newAwardData.awardType === 'group' 
                          ? 'border-brand-brown bg-brand-brown text-white shadow-lg shadow-brand-brown/10' 
                          : 'border-brand-beige text-gray-400 hover:border-brand-brown/20 hover:bg-brand-cream/30'
                      }`}
                    >
                      <Users size={20} className={newAwardData.awardType === 'group' ? '' : 'text-brand-beige group-hover:text-brand-brown/40'} />
                      <div className="text-center">
                        <p className="font-bold text-xs">Group / Tribe</p>
                        <p className={`text-[8px] font-black uppercase tracking-tighter ${newAwardData.awardType === 'group' ? 'text-white/60' : 'text-gray-300'}`}>Full Teams</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-brand-brown/40 uppercase tracking-widest mb-3 ml-1">Award Title</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newAwardData.title}
                    onChange={e => setNewAwardData(d => ({ ...d, title: e.target.value }))}
                    placeholder="e.g. Most Disciplined Tribe"
                    className="w-full bg-brand-cream/50 border border-brand-beige rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-brown focus:border-transparent outline-none font-medium placeholder:text-gray-400 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-brand-brown/40 uppercase tracking-widest mb-3 ml-1">Description (Optional)</label>
                  <textarea 
                    value={newAwardData.description}
                    onChange={e => setNewAwardData(d => ({ ...d, description: e.target.value }))}
                    placeholder="Describe what this award is for..."
                    rows={2}
                    className="w-full bg-brand-cream/50 border border-brand-beige rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-brown focus:border-transparent outline-none font-medium placeholder:text-gray-400 resize-none text-sm"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={!newAwardData.title.trim()}
                className="w-full bg-brand-brown hover:bg-brand-light-brown disabled:opacity-50 disabled:hover:bg-brand-brown text-white py-4 rounded-xl font-bold transition-all active:scale-95 text-base shadow-lg shadow-brand-brown/10"
              >
                Launch Award Category
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Nominate Modal */}
      {isNominateModalOpen && (
        <div className="fixed inset-0 bg-brand-brown/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-brand-brown/5 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 pb-4 flex justify-between items-start">
               <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-brand-sand text-brand-brown rounded-xl">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-display text-brand-brown tracking-tight">Nominate Delegate</h3>
                    <p className="text-gray-500 text-[11px] font-medium leading-tight">Search and select a camper for this award.</p>
                  </div>
               </div>
               <button onClick={() => { setIsNominateModalOpen(null); setSelectedCamper(null); }} className="p-2 text-gray-400 hover:text-brand-brown transition-colors">
                 <X size={20} />
               </button>
             </div>
             
             <div className="p-6 pt-0 space-y-5">
               {(awards.find(a => (a.id || (a as any)._id) === isNominateModalOpen)?.awardType === 'group' ? !selectedGroupId : !selectedCamper) ? (
                 <div className="space-y-4">
                    {awards.find(a => (a.id || (a as any)._id) === isNominateModalOpen)?.awardType === 'group' ? (
                      <div className="space-y-4">
                         <label className="block text-xs font-black text-brand-brown/40 uppercase tracking-widest ml-1">Select Tribe from Camp Organization</label>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                           {groups.map((g: any) => (
                             <button
                               key={g.id || g._id}
                               onClick={() => setSelectedGroupId(g.id || g._id)}
                               className="flex items-center gap-2.5 p-3 rounded-xl bg-brand-cream/50 border border-brand-beige hover:border-brand-brown hover:bg-white transition-all group/tribe"
                             >
                                <div className="w-8 h-8 rounded-lg shadow-sm border border-white" style={{ backgroundColor: g.color || '#8B4513' }} />
                                <span className="font-bold text-brand-brown text-sm">{g.name}</span>
                             </button>
                           ))}
                         </div>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input 
                            autoFocus
                            type="text"
                            value={searchCamper}
                            onChange={e => setSearchCamper(e.target.value)}
                            placeholder="Search by name or church..."
                            className="w-full bg-brand-cream border border-brand-beige rounded-xl pl-11 pr-5 py-3 focus:ring-2 focus:ring-brand-brown focus:border-transparent outline-none font-medium text-sm"
                          />
                        </div>

                         <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                           {filteredRegistrants.map((r) => (
                             <button
                               key={r.id || (r as any)._id}
                               onClick={() => setSelectedCamper(r)}
                               className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-brand-cream border border-transparent hover:border-brand-beige transition-all group/item"
                             >
                                 <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-lg bg-brand-brown/5 flex items-center justify-center text-brand-brown font-display text-sm">
                                     {r.fullName.charAt(0)}
                                   </div>
                                   <div className="text-left">
                                       <p className="font-bold text-brand-brown text-sm leading-tight">{r.fullName}</p>
                                       <p className="text-[10px] text-gray-500">{r.church} • {r.sex}</p>
                                   </div>
                                 </div>
                                 <ChevronRight size={16} className="text-gray-300 group-hover/item:text-brand-brown transition-colors" />
                             </button>
                           ))}
                          {filteredRegistrants.length === 0 && (
                            <div className="py-8 text-center text-gray-400 font-medium italic">No matching delegates found</div>
                          )}
                        </div>
                      </>
                    )}
                 </div>
               ) : (
                 <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="bg-brand-cream border border-brand-beige p-6 rounded-3xl flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-display shadow-lg ${
                            awards.find(a => (a.id || (a as any)._id) === isNominateModalOpen)?.awardType === 'group' 
                              ? 'bg-white border border-brand-beige' 
                              : 'bg-brand-brown text-white shadow-brand-brown/20'
                          }`}>
                            {awards.find(a => (a.id || (a as any)._id) === isNominateModalOpen)?.awardType === 'group' ? (
                               <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: groups.find(g => (g.id || g._id) === selectedGroupId)?.color || '#8B4513' }} />
                            ) : selectedCamper?.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xl font-display text-brand-brown leading-tight">
                              {awards.find(a => (a.id || (a as any)._id) === isNominateModalOpen)?.awardType === 'group' 
                                ? groups.find(g => (g.id || g._id) === selectedGroupId)?.name 
                                : selectedCamper?.fullName}
                            </p>
                            <p className="text-sm text-brand-brown/60 font-bold uppercase tracking-widest">
                                {awards.find(a => (a.id || (a as any)._id) === isNominateModalOpen)?.awardType === 'group' ? 'Selected Tribe' : selectedCamper?.church}
                            </p>
                          </div>
                       </div>
                       <button 
                         onClick={() => { setSelectedCamper(null); setSelectedGroupId(''); }}
                         className="text-brand-brown/40 hover:text-brand-brown font-bold text-xs uppercase tracking-widest px-3 py-1.5 rounded-lg border border-brand-beige/50 hover:border-brand-brown/20 transition-all"
                       >
                         Change
                       </button>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-brand-brown/40 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2">
                        <TrendingUp size={14} className="text-brand-sand" />
                        Why are they being nominated?
                      </label>
                      <textarea 
                        autoFocus
                        value={nominationReason}
                        onChange={e => setNominationReason(e.target.value)}
                        placeholder="e.g. Exhibited exceptional leadership during the night session..."
                        rows={4}
                        className="w-full bg-brand-cream border border-brand-beige rounded-[2rem] px-6 py-5 focus:ring-2 focus:ring-brand-brown focus:border-transparent outline-none font-medium placeholder:text-gray-400 resize-none leading-relaxed"
                      />
                    </div>

                    <button 
                      onClick={handleNominate}
                      className="w-full bg-brand-brown hover:bg-brand-light-brown text-white py-5 rounded-[1.5rem] font-bold text-lg shadow-xl shadow-brand-brown/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span>Submit Nomination</span>
                      <ChevronRight size={20} />
                    </button>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
