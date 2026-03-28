import { useState, useMemo, useEffect } from 'react';
import api from '../api/axios';
import { useAppStore } from '../store';
import { Search, Filter, Check, Shirt, Briefcase, Book, PenTool, ShieldAlert, ShoppingBag } from 'lucide-react';
import type { Registrant, AppSettings } from '../types';

export default function MerchClaims() {
  const { currentUser, registrants, fetchRegistrants, updateRegistrant, appSettings, fetchGlobalSettings, lockRegistrant, unlockRegistrant } = useAppStore();
  // fetchRegistrants kept in deps to avoid lint warning even though we only use it for cold starts
  const [settings, setSettings] = useState<AppSettings>({ churches: [], merchCosts: {} } as any);
  
  const isAdmin = currentUser?.role?.toLowerCase().trim() === 'admin';
  const merchPerms = currentUser?.permissionMatrix?.[currentUser.role]?.merch;
  
  if (!isAdmin && !merchPerms?.view) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center px-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-brand-beige max-w-md w-full">
          <ShieldAlert size={48} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-2xl font-display text-brand-brown mb-2">Restricted Access</h2>
          <p className="text-gray-500">You do not have permission to access Merch Claims.</p>
        </div>
      </div>
    );
  }
  
  useEffect(() => {
    // Initial sync from store
    if (appSettings) {
      setSettings({ ...appSettings, churches: appSettings.churches || [] });
    }

    // Only trigger network fetches if boot hasn't synced yet (cold start with no cache).
    // Once hasSyncedLive=true, WebSocket in Layout.tsx handles all real-time updates.
    const { hasSyncedLive } = useAppStore.getState();
    if (!hasSyncedLive) {
      fetchGlobalSettings(true);
      fetchRegistrants(registrants.length > 0);
    }
  }, []);

  useEffect(() => {
    if (appSettings) {
      setSettings({ ...appSettings, churches: appSettings.churches || [] });
    }
  }, [appSettings]);

  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterChurch, setFilterChurch] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All'); // All, Fully Claimed, Partial, Unclaimed

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterChurch, filterStatus]);
  
  // All roles now see global registrants
  const baseRegistrants = registrants;

  const filteredRegistrants = useMemo(() => {
    return baseRegistrants.filter(r => {
      const matchSearch = r.fullName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchChurch = filterChurch === 'All' || r.church === filterChurch;
      
      const claimedCount = Object.values(r.merchClaims).filter(Boolean).length;
      let matchStatus = true;
      if (filterStatus === 'Fully Claimed') matchStatus = claimedCount === 4;
      if (filterStatus === 'Partial') matchStatus = claimedCount > 0 && claimedCount < 4;
      if (filterStatus === 'Unclaimed') matchStatus = claimedCount === 0;
      
      return matchSearch && matchChurch && matchStatus;
    });
  }, [baseRegistrants, searchTerm, filterChurch, filterStatus]);

  const toggleClaim = async (regId: string, item: keyof typeof registrants[0]['merchClaims']) => {
    // Read directly from the synchronous Zustand store to bypass React's async rendering closure.
    // This physically prevents rapid-fire sequential clicks from overwriting each other's optimistic UI states.
    const currentRegs = useAppStore.getState().registrants;
    const reg = currentRegs.find(r => (r.id === regId || (r as any)._id === regId));
    if (!reg) return;

    const canToggleAll = isAdmin || merchPerms?.toggleAll;
    const canToggleOwn = merchPerms?.toggleOwn && reg.church === currentUser?.church;

    if (!canToggleAll && !canToggleOwn) return;
    
    const isClaimed = reg.merchClaims[item];
    const newValue = !isClaimed;

    // 1. Lock this registrant: any WebSocket echo during this request will be ignored
    lockRegistrant(regId);

    // 2. Optimistic UI Update using Store
    const updatedClaims = { ...reg.merchClaims, [item]: newValue };
    const updatedDates = { ...reg.merchClaimDates, [item]: newValue ? new Date().toISOString() : null };
    
    updateRegistrant(regId, { 
      merchClaims: updatedClaims,
      merchClaimDates: updatedDates
    });

    try {
      // 3. Atomic Patch Update
      await api.patch(`/api/registrants/${regId}/merch`, {
        item: item,
        value: newValue
      });
    } catch (err) {
      console.error('Failed to toggle merch claim:', err);
      // 4. Revert on failure
      updateRegistrant(regId, { 
        merchClaims: reg.merchClaims,
        merchClaimDates: reg.merchClaimDates
      });
    } finally {
      // 5. Always unlock, whether success or failure
      unlockRegistrant(regId);
    }
  };

  // Stats
  const stats = useMemo(() => {
    let tshirts = 0, bags = 0, notebooks = 0, pens = 0;
    baseRegistrants.forEach(r => {
      if (r.merchClaims.tshirt) tshirts++;
      if (r.merchClaims.bag) bags++;
      if (r.merchClaims.notebook) notebooks++;
      if (r.merchClaims.pen) pens++;
    });
    const total = baseRegistrants.length;
    return { 
      tshirts: { claimed: tshirts, total },
      bags: { claimed: bags, total },
      notebooks: { claimed: notebooks, total },
      pens: { claimed: pens, total }
    };
  }, [baseRegistrants]);

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-2xl md:text-3xl font-display text-brand-brown tracking-wide">Merch Claims</h2>
      
      {/* Stats Summary */}
      <div className="grid grid-cols-4 md:grid-cols-4 gap-2 lg:gap-4 overflow-x-auto pb-1 md:pb-0">
        {[
          { label: 'Shirts', icon: Shirt, stats: stats.tshirts, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Bags', icon: Briefcase, stats: stats.bags, color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: 'Notes', icon: Book, stats: stats.notebooks, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'Pens', icon: PenTool, stats: stats.pens, color: 'text-purple-500', bg: 'bg-purple-50' },
        ].map(item => (
          <div key={item.label} className="bg-white p-2 md:p-3 lg:p-5 rounded-xl shadow-sm border border-brand-beige hover:shadow-md transition-shadow min-w-[70px] md:min-w-0">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1 lg:mb-2">
              <div className={`p-1 md:p-1.5 ${item.bg} ${item.color} rounded-lg`}>
                <item.icon size={12} className="md:w-3.5 md:h-3.5" />
              </div>
              <p className="font-bold text-gray-400 uppercase tracking-tighter text-[7px] md:text-[8px] lg:text-[10px] truncate">{item.label}</p>
            </div>
            <p className="text-xs md:text-sm lg:text-xl font-black text-gray-900 leading-none">
              {item.stats.claimed} <span className="text-[7px] md:text-[8px] lg:text-[10px] font-normal text-gray-400 lowercase">/ {item.stats.total}</span>
            </p>
            <div className="w-full bg-gray-100 h-0.5 md:h-1 rounded-full mt-1 lg:mt-2">
              <div 
                className="bg-brand-brown h-0.5 md:h-1 rounded-full transition-all duration-500" 
                style={{ width: item.stats.total ? `${(item.stats.claimed / item.stats.total) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-brand-beige overflow-hidden">
        {/* Toolbar */}
        <div className="p-3 md:p-4 border-b border-gray-100 flex flex-col md:flex-row gap-3 md:gap-4 bg-gray-50/30">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold" size={18} />
            <input 
              type="text" 
              placeholder="Search registrant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown focus:ring-1 transition-all text-xs lg:text-sm bg-white"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400 hidden lg:block" />
            {isAdmin && (
              <select 
                value={filterChurch} 
                onChange={(e) => setFilterChurch(e.target.value)}
                className="py-1.5 pl-3 pr-8 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown focus:ring-1 bg-white w-full md:w-32 lg:w-40 transition-all text-xs lg:text-sm font-bold"
              >
                <option value="All">All Churches</option>
                {settings.churches.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="py-1.5 pl-3 pr-8 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown focus:ring-1 bg-white w-full md:w-32 lg:w-40 transition-all text-xs lg:text-sm font-bold"
            >
              <option value="All">Filter Status</option>
              <option value="Fully Claimed">Fully Claimed</option>
              <option value="Partial">Partial</option>
              <option value="Unclaimed">Unclaimed</option>
            </select>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-2 px-1">
          {filteredRegistrants.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).length > 0 ? filteredRegistrants.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((reg) => (
            <div key={reg.id || (reg as any)._id} className="mobile-card flex flex-col gap-2">
              <div className="flex justify-between items-start border-b border-gray-50 pb-1.5 -mx-1 px-1">
                <div className="flex-1 min-w-0">
                  <p className="font-black text-brand-brown text-base leading-tight truncate">{reg.fullName}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5 truncate">{reg.church} • Size {reg.shirtSize}</p>
                </div>
              </div>
 
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'tshirt', label: 'Shirt', icon: Shirt },
                  { id: 'bag', label: 'Bag', icon: Briefcase },
                  { id: 'notebook', label: 'Note', icon: Book },
                  { id: 'pen', label: 'Pen', icon: PenTool },
                ].map((item) => {
                  const isClaimed = reg.merchClaims[item.id as keyof Registrant['merchClaims']];
                  const canToggleAll = isAdmin || merchPerms?.toggleAll;
                  const canToggleOwn = merchPerms?.toggleOwn && reg.church === currentUser?.church;
                  const isDisabled = !canToggleAll && !canToggleOwn;
 
                  return (
                    <button
                      key={item.id}
                      disabled={isDisabled}
                      onClick={() => toggleClaim(reg.id || (reg as any)._id, item.id as keyof typeof reg.merchClaims)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all active:scale-95 relative ${
                        isClaimed
                          ? 'bg-green-50 border-green-500 text-green-700 shadow-sm'
                          : 'bg-gray-50 border-gray-100 text-gray-300'
                      } ${isDisabled ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                    >
                      <item.icon size={18} className={isClaimed ? 'text-green-600' : 'text-gray-300'} />
                      <span className="text-[8px] font-black uppercase mt-1 tracking-tighter">{item.label}</span>
                      {isClaimed && <div className="absolute top-1 right-1 text-green-600"><Check size={8} strokeWidth={4} /></div>}
                    </button>
                  );
                })}
              </div>
            </div>
          )) : (
            <div className="mobile-card py-12 text-center text-gray-400">
              <ShoppingBag size={48} className="mx-auto opacity-10 mb-2" />
              <p className="text-sm">No registrants found.</p>
            </div>
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-[10px] lg:text-xs text-gray-400 uppercase bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-3 lg:px-6 py-4 font-medium tracking-wider">Registrant</th>
                <th className="px-3 lg:px-6 py-4 font-medium tracking-wider text-center">T-Shirt</th>
                <th className="px-3 lg:px-6 py-4 font-medium tracking-wider text-center">Bag</th>
                <th className="px-3 lg:px-6 py-4 font-medium tracking-wider text-center">Notebook</th>
                <th className="px-3 lg:px-6 py-4 font-medium tracking-wider text-center">Pen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRegistrants.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).length > 0 ? filteredRegistrants.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((reg) => (
                <tr key={reg.id} className="hover:bg-brand-cream/30 transition-colors">
                  <td className="px-3 lg:px-6 py-4">
                    <p className="font-bold text-brand-brown text-xs lg:text-base leading-tight">{reg.fullName}</p>
                    <p className="text-[10px] lg:text-xs text-gray-500 mt-1 font-medium">{reg.church} <span className="hidden lg:inline">• Size {reg.shirtSize}</span></p>
                  </td>
                  
                  {['tshirt', 'bag', 'notebook', 'pen'].map((item) => {
                    const isClaimed = reg.merchClaims[item as keyof Registrant['merchClaims']];
                    return (
                      <td key={item} className="px-3 lg:px-6 py-4 text-center">
                        <button
                          disabled={(() => {
                            const canToggleAll = isAdmin || merchPerms?.toggleAll;
                            const canToggleOwn = merchPerms?.toggleOwn && reg.church === currentUser?.church;
                            return !canToggleAll && !canToggleOwn;
                          })()}
                          onClick={() => toggleClaim(reg.id || (reg as any)._id, item as keyof typeof reg.merchClaims)}
                          className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center mx-auto transition-all transform active:scale-95 ${
                            isClaimed 
                              ? 'bg-green-100 text-green-600 ring-2 ring-green-500 ring-offset-2' 
                              : 'bg-gray-100 text-gray-300 hover:bg-gray-200 hover:text-gray-500'
                          } ${((!isAdmin && !merchPerms?.toggleAll) && (!merchPerms?.toggleOwn || reg.church !== currentUser?.church)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isClaimed && <Check size={20} className="lg:w-6 lg:h-6 stroke-[3]" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    No registrants found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {Math.ceil(filteredRegistrants.length / itemsPerPage) > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
            <span className="text-sm text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredRegistrants.length)} of {filteredRegistrants.length}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredRegistrants.length / itemsPerPage), p + 1))}
                disabled={currentPage === Math.ceil(filteredRegistrants.length / itemsPerPage)}
                className="px-3 py-1.5 rounded-lg border border-brand-brown text-brand-brown text-sm font-bold disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
