import { useState, useMemo, useEffect } from 'react';
import api from '../api/axios';
import { useAppStore } from '../store';
import type { Registrant, ShirtSize, PaymentStatus, PaymentMethod, AppSettings } from '../types';
import { PlusCircle, Search, Edit2, Trash2, X, Filter, Info, CheckSquare, Square, CheckCircle, Clock } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

const NAME_REGEX = /^[A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*,\s[A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*\s[A-Z]\.(?:\s(?:Jr\.|III|IV|V))?$/;

export default function Registrants() {
  const { currentUser, setLoading } = useAppStore();
  const [registrants, setRegistrants] = useState<Registrant[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    churches: [], merchCosts: {}, ministries: [], expenseCategories: [], paymentMethods: [], shirtSizePhoto: null
  } as any);

  const fetchRegistrants = async () => {
    try {
      const [regRes, setRes] = await Promise.all([
        api.get('/api/registrants'),
        api.get('/api/settings')
      ]);
      setRegistrants(regRes.data);
      if (setRes.data) {
        setSettings({
          ...setRes.data,
          churches: setRes.data.churchList || [],
          ministries: setRes.data.ministries || [],
          expenseCategories: setRes.data.expenseCategories || [],
          paymentMethods: setRes.data.paymentMethods || [],
          shirtSizePhoto: setRes.data.shirtSizePhoto || null
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRegistrants();
  }, [setLoading]);

  // Local state for UI
  const [searchTerm, setSearchTerm] = useState('');
  const [filterChurch, setFilterChurch] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterMinistry, setFilterMinistry] = useState<string>('All');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });
  const [shirtModalOpen, setShirtModalOpen] = useState(false);
  const [verifyConfirm, setVerifyConfirm] = useState<{ isOpen: boolean, reg: Registrant | null }>({ isOpen: false, reg: null });

  const isAdmin = currentUser?.role === 'admin';
  const isTreasurer = currentUser?.role === 'treasurer';
  const canVerify = isAdmin || isTreasurer;

  // Form state
  const initialForm: Omit<Registrant, 'id' | 'dateRegistered'> = {
    fullName: '',
    age: 0,
    sex: 'Male',
    ministry: [],
    shirtSize: 'M',
    church: (currentUser?.role === 'coordinator' || currentUser?.role === 'treasurer') && currentUser.church ? currentUser.church : '',
    feeType: 'Regular',
    paymentStatus: 'Unpaid',
    paymentMethod: null,
    gcRef: '',
    amountPaid: 0,
    merchClaims: { tshirt: false, bag: false, notebook: false, pen: false },
    merchClaimDates: { tshirt: null, bag: null, notebook: null, pen: null },
    verifiedByTreasurer: false,
    verifiedAt: null
  };
  const [formData, setFormData] = useState(initialForm);

  // Auto-set default church when settings load if forming new
  useEffect(() => {
    if (!editingId && !formData.church && settings.churches.length > 0) {
      setFormData(prev => ({ ...prev, church: prev.church || settings.churches[0] }));
    }
  }, [settings.churches, editingId, formData.church]);

  // Derived visible data
  // All roles now see global registrants
  const baseRegistrants = registrants;

  const filteredRegistrants = useMemo(() => {
    return baseRegistrants.filter(r => {
      const matchesSearch = r.fullName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesChurch = filterChurch === 'All' || r.church === filterChurch;
      const matchesStatus = filterStatus === 'All' || r.paymentStatus === filterStatus;
      const matchesMinistry = filterMinistry === 'All' || (r.ministry && r.ministry.includes(filterMinistry));
      return matchesSearch && matchesChurch && matchesStatus && matchesMinistry;
    }).sort((a, b) => new Date(b.dateRegistered).getTime() - new Date(a.dateRegistered).getTime());
  }, [baseRegistrants, searchTerm, filterChurch, filterStatus, filterMinistry]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterChurch, filterStatus, filterMinistry]);

  const totalPages = Math.ceil(filteredRegistrants.length / itemsPerPage);
  const paginatedRegistrants = filteredRegistrants.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Summaries
  const churchSummaries = useMemo(() => {
    const sum: Record<string, { total: number, collected: number, expected: number }> = {};
    baseRegistrants.forEach(r => {
      if (!sum[r.church]) sum[r.church] = { total: 0, collected: 0, expected: 0 };
      sum[r.church].total += 1;
      sum[r.church].collected += r.amountPaid;
      sum[r.church].expected += r.feeType === 'Early Bird' ? 350 : 500;
    });
    return sum;
  }, [baseRegistrants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!NAME_REGEX.test(formData.fullName)) {
      return;
    }

    try {
      if (editingId) {
        await api.put(`/api/registrants/${editingId}`, formData);
      } else {
        await api.post(`/api/registrants`, formData);
      }
      closeModal();
      fetchRegistrants();
    } catch (err) {
      console.error(err);
    }
  };

  const openModalForNew = () => {
    setFormData({
      ...initialForm,
      church: (currentUser?.role === 'coordinator' || currentUser?.role === 'treasurer') && currentUser.church ? currentUser.church : (settings.churches[0] || '')
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openModalForEdit = (reg: Registrant) => {
    setFormData(reg);
    setEditingId(reg.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    setConfirmModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (!confirmModal.id) return;
    try {
      await api.delete(`/api/registrants/${confirmModal.id}`);
      setConfirmModal({ isOpen: false, id: null });
      fetchRegistrants();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleVerify = (reg: Registrant) => {
    setVerifyConfirm({ isOpen: true, reg });
  };
  const doVerify = async () => {
    if (!verifyConfirm.reg) return;
    const reg = verifyConfirm.reg;
    const nowVerified = !reg.verifiedByTreasurer;
    try {
      await api.put(`/api/registrants/${(reg as any)._id || reg.id}`, {
        verifiedByTreasurer: nowVerified,
        verifiedAt: nowVerified ? new Date().toISOString() : null
      });
      fetchRegistrants();
    } catch (err) { console.error(err); }
    setVerifyConfirm({ isOpen: false, reg: null });
  };

  const toggleMinistry = (m: string) => {
    const current = formData.ministry || [];
    if (current.includes(m)) {
      setFormData({ ...formData, ministry: current.filter(x => x !== m) });
    } else {
      setFormData({ ...formData, ministry: [...current, m] });
    }
  };

  const isNameValid = !formData.fullName || NAME_REGEX.test(formData.fullName);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-display text-brand-brown tracking-wide">
          Registrant Tracker
        </h2>

        <button
          onClick={openModalForNew}
          className="flex items-center justify-center gap-2 bg-brand-brown text-white px-5 py-2.5 rounded-xl font-bold hover:bg-brand-light-brown transition-colors shadow-sm"
        >
          <PlusCircle size={20} /> Add New Registrant
        </button>
      </div>

      {/* Per-Church Summary (For Admins & Treasurers) */}
      {(isAdmin || isTreasurer) && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-beige overflow-x-auto">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Per-Church Summary</h3>
          <div className="flex gap-4">
            {Object.entries(churchSummaries).map(([church, stats]) => (
              <div key={church} className="min-w-[200px] border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                <p className="font-bold text-brand-brown truncate" title={church}>{church}</p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Registrants:</span>
                    <span className="font-medium text-gray-800">{stats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Collected:</span>
                    <span className="font-medium text-green-600">₱{stats.collected}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Balance:</span>
                    <span className="font-medium text-red-500">₱{stats.expected - stats.collected}</span>
                  </div>
                </div>
              </div>
            ))}
            {Object.keys(churchSummaries).length === 0 && (
              <p className="text-gray-400 text-sm italic">No data yet.</p>
            )}
          </div>
        </div>
      )}


      {/* Filters and Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-brand-beige overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 bg-gray-50/30">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown focus:ring-1 focus:ring-brand-brown transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter size={18} className="text-gray-400 hidden lg:block" />

            {currentUser?.role === 'admin' && (
              <select
                value={filterChurch}
                onChange={(e) => setFilterChurch(e.target.value)}
                className="py-2 pl-3 pr-8 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown focus:ring-1 transition-all md:w-36 bg-white text-sm"
              >
                <option value="All">All Churches</option>
                {settings.churches.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}

            <select
              value={filterMinistry}
              onChange={(e) => setFilterMinistry(e.target.value)}
              className="py-2 pl-3 pr-8 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown focus:ring-1 transition-all md:w-36 bg-white text-sm"
            >
              <option value="All">All Ministries</option>
              {settings.ministries.map(m => <option key={m} value={m}>{m}</option>)}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="py-2 pl-3 pr-8 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown focus:ring-1 transition-all w-full md:w-36 bg-white text-sm"
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Unpaid">Unpaid</option>
            </select>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-xs text-gray-400 uppercase bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-medium tracking-wider">Name</th>
                <th className="px-6 py-4 font-medium tracking-wider text-center">Age / Sex / Size</th>
                <th className="px-6 py-4 font-medium tracking-wider">Church & Ministry</th>
                <th className="px-6 py-4 font-medium tracking-wider">Package</th>
                <th className="px-6 py-4 font-medium tracking-wider text-center">Payment</th>
                {canVerify && <th className="px-6 py-4 font-medium tracking-wider text-center">Verified</th>}
                <th className="px-6 py-4 font-medium tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedRegistrants.length > 0 ? paginatedRegistrants.map((reg) => (
                <tr key={reg.id || (reg as any)._id} className="hover:bg-brand-cream/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-brand-brown">{reg.fullName}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-medium text-gray-800">{reg.age} • {reg.sex?.charAt(0) || 'M'}</span>
                    <span className="text-xs text-gray-400 block mt-0.5 font-bold">{reg.shirtSize}</span>
                  </td>
                  <td className="px-6 py-4 max-w-[200px]">
                    <div className="truncate font-medium text-gray-800" title={reg.church}>{reg.church}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {reg.ministry && reg.ministry.length > 0 ? reg.ministry.map(m => (
                        <span key={m} className="px-1.5 py-0.5 bg-brand-sand/30 text-brand-brown border border-brand-sand rounded text-[10px] uppercase font-bold tracking-wider">{m}</span>
                      )) : <span className="text-[10px] text-gray-300 italic">No ministries</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="block text-gray-800 font-medium">{reg.feeType}</span>
                    <span className="text-xs text-gray-400">₱{reg.feeType === 'Early Bird' ? 350 : 500}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${reg.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' :
                          reg.paymentStatus === 'Partial' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                        {reg.paymentStatus}
                      </span>
                      {reg.paymentStatus !== 'Unpaid' && (
                        <span className="text-[10px] text-gray-400 font-medium mt-1 uppercase tracking-wider text-center leading-tight">₱{reg.amountPaid} via <br />{reg.paymentMethod?.split(' ')[0]}</span>
                      )}
                    </div>
                  </td>
                  {canVerify && (
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleVerify(reg)}
                        className={`inline-flex items-center justify-center p-1.5 rounded-lg transition-colors ${reg.verifiedByTreasurer ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                          }`}
                        title={reg.verifiedByTreasurer ? 'Verified by Treasurer' : 'Pending Verification'}
                      >
                        {reg.verifiedByTreasurer ? <CheckCircle size={20} /> : <Clock size={20} />}
                      </button>
                    </td>
                  )}
                  <td className="px-6 py-4 text-right">
                    {(isAdmin || isTreasurer || (currentUser?.role === 'coordinator' && reg.church === currentUser.church)) ? (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openModalForEdit(reg)} className="p-2 text-gray-400 hover:text-brand-brown hover:bg-brand-sand/20 rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete((reg as any)._id || reg.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={canVerify ? 7 : 6} className="px-6 py-12 text-center text-gray-400">
                    No registrants found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {paginatedRegistrants.length > 0 ? paginatedRegistrants.map(reg => (
            <div key={(reg as any)._id || reg.id} className="p-4 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-brand-brown text-base leading-tight">{reg.fullName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{reg.church}{reg.ministry?.length ? ` • ${reg.ministry.join(', ')}` : ''}</p>
                </div>
                {canVerify && (
                  <button
                    onClick={() => handleToggleVerify(reg)}
                    className={`shrink-0 p-1.5 rounded-lg transition-colors ${reg.verifiedByTreasurer ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'
                      }`}
                  >
                    {reg.verifiedByTreasurer ? <CheckCircle size={18} /> : <Clock size={18} />}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">{reg.age}yrs</span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">{reg.sex || 'Male'}</span>
                <span className="px-2 py-0.5 bg-brand-sand/30 text-brand-brown rounded-full text-xs font-bold">Size {reg.shirtSize}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${reg.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' :
                    reg.paymentStatus === 'Partial' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                  }`}>{reg.paymentStatus}</span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{reg.feeType}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-400">₱{reg.amountPaid} {reg.paymentMethod ? `via ${reg.paymentMethod.split(' ')[0]}` : ''}</span>
                {(isAdmin || isTreasurer || (currentUser?.role === 'coordinator' && reg.church === currentUser.church)) ? (
                  <div className="flex gap-1">
                    <button onClick={() => openModalForEdit(reg)} className="p-1.5 text-gray-400 hover:text-brand-brown rounded-lg"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete((reg as any)._id || reg.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                ) : null}
              </div>
            </div>
          )) : (
            <p className="p-6 text-center text-gray-400 text-sm">No registrants found.</p>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
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
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-brand-brown text-brand-brown text-sm font-bold disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-brand-brown/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden my-4 md:my-8 border border-brand-sand max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-brand-cream/50 sticky top-0 z-20">
              <h3 className="text-2xl font-display text-brand-brown tracking-wide">
                {editingId ? 'Edit Registrant' : 'Add New Registrant'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-gray-400 hover:text-brand-brown transition-colors p-1 rounded-lg hover:bg-white"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Personal & Camp Info Column */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b pb-2 mb-4">Personal info</h4>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Full Name</label>
                        <input
                          type="text" required
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          placeholder="e.g. Dela Cruz, Juan P."
                          className={`w-full px-3 py-2 rounded-lg border focus:outline-none transition-colors ${isNameValid ? 'border-gray-200 focus:border-brand-brown' : 'border-red-400 focus:border-red-500 bg-red-50/30'
                            }`}
                        />
                        {!isNameValid && (
                          <p className="text-xs text-red-500 mt-1 flex items-start gap-1">
                            <Info size={14} className="shrink-0 mt-0.5" />
                            Format requirement: Last, First M. (e.g., 'Santos, Maria C.' or 'Reyes, Jose P. Jr.')
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Age</label>
                          <input
                            type="number" required min="1" max="100"
                            value={formData.age || ''}
                            onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Sex</label>
                          <select
                            value={formData.sex}
                            onChange={(e) => setFormData({ ...formData, sex: e.target.value as 'Male' | 'Female' })}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Shirt Size
                            <button
                              type="button"
                              onClick={() => setShirtModalOpen(true)}
                              className="ml-1 text-gray-400 hover:text-brand-brown transition-colors"
                              title="View Size Chart"
                            >
                              <Info size={14} className="inline" />
                            </button>
                          </label>
                          <select
                            value={formData.shirtSize}
                            onChange={(e) => setFormData({ ...formData, shirtSize: e.target.value as ShirtSize })}
                            className="w-full px-3 py-2 rounded-lg border-2 border-brand-sand focus:outline-none focus:border-brand-brown font-bold text-center"
                          >
                            {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm text-gray-600 mb-2">Ministries (Select all that apply)</label>
                        {settings.ministries.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                            {settings.ministries.map(m => {
                              const isChecked = formData.ministry?.includes(m) || false;
                              return (
                                <button
                                  type="button"
                                  key={m}
                                  onClick={() => toggleMinistry(m)}
                                  className={`flex items-start gap-2 text-left text-sm ${isChecked ? 'text-brand-brown font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                  {isChecked ? <CheckSquare size={18} className="text-brand-brown shrink-0" /> : <Square size={18} className="text-gray-300 shrink-0" />}
                                  <span className="leading-tight mt-0.5">{m}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 italic bg-gray-50 p-3 rounded-xl border border-gray-100">No ministries configured in settings.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Camp & Payment Info Column */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b pb-2 mb-4">Camp Info</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Church</label>
                        {currentUser?.role === 'admin' ? (
                          <select
                            value={formData.church}
                            onChange={(e) => setFormData({ ...formData, church: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown"
                          >
                            {settings.churches.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : (
                          <input
                            type="text" disabled value={formData.church}
                            className="w-full px-3 py-2 rounded-lg border border-gray-100 bg-gray-50 text-gray-500 opacity-80 cursor-not-allowed font-medium"
                          />
                        )}
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Package / Fee Type</label>
                        <select
                          value={formData.feeType}
                          onChange={(e) => setFormData({ ...formData, feeType: e.target.value as any })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown"
                        >
                          <option value="Early Bird">Early Bird (₱350)</option>
                          <option value="Regular">Regular (₱500)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b pb-2 mb-4">Payment Details</h4>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm text-gray-600 mb-1">Status</label>
                        <select
                          value={formData.paymentStatus}
                          onChange={(e) => {
                            const status = e.target.value as PaymentStatus;
                            setFormData({
                              ...formData,
                              paymentStatus: status,
                              amountPaid: status === 'Unpaid' ? 0 : (status === 'Paid' ? (formData.feeType === 'Early Bird' ? 350 : 500) : formData.amountPaid)
                            });
                          }}
                          className={`w-full px-3 py-2 rounded-lg border focus:outline-none font-bold ${formData.paymentStatus === 'Paid' ? 'border-green-300 bg-green-50 text-green-700' :
                              formData.paymentStatus === 'Partial' ? 'border-yellow-300 bg-yellow-50 text-yellow-700' :
                                'border-red-300 bg-red-50 text-red-700'
                            }`}
                        >
                          <option value="Unpaid">Unpaid</option>
                          <option value="Partial">Partial</option>
                          <option value="Paid">Paid Fully</option>
                        </select>
                      </div>

                      {formData.paymentStatus !== 'Unpaid' && (
                        <>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Amount Paid (₱)</label>
                            <input
                              type="number" required min="1"
                              value={formData.amountPaid || ''}
                              onChange={(e) => setFormData({ ...formData, amountPaid: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown font-medium"
                            />
                          </div>

                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Method</label>
                            <select
                              required
                              value={formData.paymentMethod || ''}
                              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown text-sm"
                            >
                              <option value="">Select...</option>
                              {settings.paymentMethods.map(pm => <option key={pm} value={pm}>{pm}</option>)}
                            </select>
                          </div>

                          {formData.paymentMethod?.toLowerCase().includes('gcash') && (
                            <div className="col-span-2">
                              <label className="block text-sm text-gray-600 mb-1">GCash Ref No.</label>
                              <input
                                type="text" required
                                value={formData.gcRef || ''}
                                onChange={(e) => setFormData({ ...formData, gcRef: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown font-mono"
                                placeholder="0000 000 000000"
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-brand-beige flex justify-end gap-3 sticky bottom-0 bg-white z-20 pb-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isNameValid}
                  className="px-6 py-2.5 rounded-lg bg-brand-brown text-white font-bold hover:bg-brand-light-brown transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingId ? 'Save Changes' : 'Register Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shirt Size Photo Modal */}
      {shirtModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-2 sm:p-4" onClick={() => setShirtModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 max-w-lg w-full relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShirtModalOpen(false)}
              className="absolute top-4 right-4 bg-white/70 hover:bg-white text-gray-600 p-1.5 rounded-full transition-colors z-10"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-brand-brown mb-4 text-center">Shirt Size Reference</h3>
            {settings?.shirtSizePhoto ? (
              <img src={settings.shirtSizePhoto} alt="Shirt Size Reference" className="w-full rounded-xl" />
            ) : (
              <div className="text-center p-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <p className="text-gray-500 font-medium">No sizing reference photo uploaded.</p>
                <p className="text-sm text-gray-400 mt-2">Admin can upload this in Settings.</p>
              </div>
            )}
            <div className="mt-6 text-center sticky bottom-0 bg-white/90 backdrop-blur-sm py-2">
              <button
                onClick={() => setShirtModalOpen(false)}
                className="bg-brand-brown text-white px-8 py-2.5 rounded-lg font-bold hover:bg-brand-light-brown transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Delete Registrant"
        message="Are you sure you want to delete this registrant? This action cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setConfirmModal({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
      />
      <ConfirmModal
        isOpen={verifyConfirm.isOpen}
        title={verifyConfirm.reg?.verifiedByTreasurer ? 'Remove Verification' : 'Confirm Verification'}
        message={`Are you sure you want to mark this as ${verifyConfirm.reg?.verifiedByTreasurer ? 'unverified' : 'verified'}? This affects the financial summary.`}
        confirmLabel="Continue"
        onCancel={() => setVerifyConfirm({ isOpen: false, reg: null })}
        onConfirm={doVerify}
      />
    </div>
  );
}
