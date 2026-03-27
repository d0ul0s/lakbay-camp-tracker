import { useState, useMemo, useEffect } from 'react';
import api from '../api/axios';
import { useAppStore } from '../store';
import { Search, Filter, Check, Shirt, Briefcase, Book, PenTool } from 'lucide-react';
import type { Registrant, AppSettings } from '../types';

export default function MerchClaims() {
  const { currentUser } = useAppStore();
  const [registrants, setRegistrants] = useState<Registrant[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ churches: [], merchCosts: {} } as any);
  
  const isAdmin = currentUser?.role === 'admin';
  
  const fetchData = async () => {
    try {
      const [regRes, setRes] = await Promise.all([
        api.get('/api/registrants'),
        api.get('/api/settings')
      ]);
      setRegistrants(regRes.data);
      if (setRes.data && setRes.data.churchList) {
        setSettings({ ...setRes.data, churches: setRes.data.churchList });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  
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

  const toggleClaim = async (regId: string, item: keyof Registrant['merchClaims']) => {
    const reg = registrants.find(r => r.id === regId);
    if (!reg) return;
    
    const isClaimed = reg.merchClaims[item];
    try {
      await api.put(`/api/registrants/${regId}`, {
        merchClaims: { ...reg.merchClaims, [item]: !isClaimed },
        merchClaimDates: { ...reg.merchClaimDates, [item]: !isClaimed ? new Date().toISOString() : null }
      });
      fetchData();
    } catch (err) {
      console.error(err);
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
    <div className="space-y-6">
      <h2 className="text-3xl font-display text-brand-brown tracking-wide">Merch Claims Tracker</h2>
      
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'T-Shirts', icon: Shirt, stats: stats.tshirts, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Drawstring Bags', icon: Briefcase, stats: stats.bags, color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: 'Notebooks', icon: Book, stats: stats.notebooks, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'Pens', icon: PenTool, stats: stats.pens, color: 'text-purple-500', bg: 'bg-purple-50' },
        ].map(item => (
          <div key={item.label} className="bg-white p-5 rounded-xl shadow-sm border border-brand-beige hover:shadow-md transition-shadow">
            <div className={`p-2 w-10 h-10 ${item.bg} ${item.color} rounded-xl flex items-center justify-center mb-3`}>
              <item.icon size={20} />
            </div>
            <p className="font-bold text-gray-700">{item.label}</p>
            <p className="text-2xl font-bold mt-1 text-gray-900">{item.stats.claimed} <span className="text-sm font-normal text-gray-400">/ {item.stats.total}</span></p>
            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3">
              <div 
                className="bg-brand-brown h-1.5 rounded-full transition-all duration-500" 
                style={{ width: item.stats.total ? `${(item.stats.claimed / item.stats.total) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-brand-beige overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 bg-gray-50/30">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search registrant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown focus:ring-1 transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400 hidden lg:block" />
            {isAdmin && (
              <select 
                value={filterChurch} 
                onChange={(e) => setFilterChurch(e.target.value)}
                className="py-2 pl-3 pr-8 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown focus:ring-1 bg-white md:w-40 transition-all"
              >
                <option value="All">All Churches</option>
                {settings.churches.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="py-2 pl-3 pr-8 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown focus:ring-1 bg-white md:w-40 transition-all"
            >
              <option value="All">Filter Status</option>
              <option value="Fully Claimed">Fully Claimed</option>
              <option value="Partial">Partial</option>
              <option value="Unclaimed">Unclaimed</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-xs text-gray-400 uppercase bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-medium tracking-wider">Registrant</th>
                <th className="px-6 py-4 font-medium tracking-wider text-center">T-Shirt</th>
                <th className="px-6 py-4 font-medium tracking-wider text-center">Bag</th>
                <th className="px-6 py-4 font-medium tracking-wider text-center">Notebook</th>
                <th className="px-6 py-4 font-medium tracking-wider text-center">Pen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRegistrants.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).length > 0 ? filteredRegistrants.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((reg) => (
                <tr key={reg.id} className="hover:bg-brand-cream/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-brand-brown text-base">{reg.fullName}</p>
                    <p className="text-xs text-gray-500 mt-1 font-medium">{reg.church} • Size {reg.shirtSize}</p>
                  </td>
                  
                  {['tshirt', 'bag', 'notebook', 'pen'].map((item) => {
                    const isClaimed = reg.merchClaims[item as keyof Registrant['merchClaims']];
                    return (
                      <td key={item} className="px-6 py-4 text-center">
                        <button
                          disabled={currentUser?.role === 'coordinator'}
                          onClick={() => toggleClaim(reg.id, item as keyof typeof reg.merchClaims)}
                          className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto transition-all transform active:scale-95 ${
                            isClaimed 
                              ? 'bg-green-100 text-green-600 ring-2 ring-green-500 ring-offset-2' 
                              : 'bg-gray-100 text-gray-300 hover:bg-gray-200 hover:text-gray-500'
                          } ${currentUser?.role === 'coordinator' ? 'opacity-80 cursor-not-allowed' : ''}`}
                        >
                          {isClaimed && <Check size={24} className="stroke-[3]" />}
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
