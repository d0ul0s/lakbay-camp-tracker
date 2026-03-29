import React, { useState, useEffect, memo } from 'react';
import api from '../api/axios';
import { useAppStore } from '../store';
import type { Registrant, ShirtSize, PaymentStatus, PaymentMethod } from '../types';
import { PlusCircle, Search, Edit2, Trash2, X, Filter, Info, CheckSquare, Square, CheckCircle, Clock, ShieldAlert, Users, Loader2 } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

// Memoized Row Component for Desktop
const RegistrantRow = memo(({ 
  reg, 
  canVerify, 
  handleToggleVerify, 
  openModalForEdit, 
  handleDelete,
  isAdmin,
  canEditAny,
  canDeleteAny,
  rolePerms,
  currentUserChurch
}: { 
  reg: Registrant, 
  canVerify: boolean, 
  handleToggleVerify: (reg: Registrant) => void,
  openModalForEdit: (reg: Registrant) => void,
  handleDelete: (reg: Registrant) => void,
  isAdmin: boolean,
  canEditAny: boolean,
  canDeleteAny: boolean,
  rolePerms: any,
  currentUserChurch: string | null
}) => {
  const userChurch = currentUserChurch?.toLowerCase().trim();
  const regChurch = reg.church?.toLowerCase().trim();
  const isOwnChurch = !!userChurch && userChurch === regChurch;
  const canEditThis = isAdmin || canEditAny || (rolePerms?.editOwn && isOwnChurch);
  const canDeleteThis = isAdmin || canDeleteAny || (rolePerms?.deleteOwn && isOwnChurch);

  return (
    <tr className="hover:bg-brand-cream/30 transition-colors">
      <td className="px-2 lg:px-6 py-4 font-bold text-brand-brown truncate max-w-[80px] md:max-w-[120px] xl:max-w-none text-[10px] lg:text-base leading-tight">{reg.fullName}</td>
      <td className="px-2 lg:px-6 py-4 text-center">
        <span className="font-medium text-gray-800 text-[9px] lg:text-sm">{reg.age} • {reg.sex?.charAt(0) || 'M'}</span>
        <span className="text-[8px] text-gray-400 block mt-0.5 font-bold">{reg.shirtSize}</span>
      </td>
      <td className="px-2 lg:px-6 py-4 max-w-[120px] lg:max-w-[200px]">
        <div className="truncate font-medium text-gray-800 text-[10px] lg:text-sm" title={reg.church}>{reg.church}</div>
        <div className="flex flex-wrap gap-0.5 mt-1">
          {reg.ministry && reg.ministry.length > 0 ? reg.ministry.map(m => (
            <span key={m} className="px-1 py-0.5 bg-brand-sand/30 text-brand-brown border border-brand-sand rounded text-[7px] lg:text-[10px] uppercase font-bold tracking-wider">{m}</span>
          )) : <span className="text-[8px] text-gray-300 italic">None</span>}
        </div>
      </td>
      <td className="px-2 lg:px-6 py-4 text-[10px] lg:text-sm">
        <span className="block text-gray-800 font-medium leading-tight">{reg.feeType}</span>
        <span className="text-[9px] text-gray-400">₱{reg.feeType === 'Early Bird' ? 350 : 500}</span>
      </td>
      <td className="px-2 lg:px-6 py-4">
        <div className="flex flex-col items-center">
          <span className={`px-1.5 py-0.5 lg:px-2.5 lg:py-1 rounded-full text-[8px] lg:text-xs font-bold ${reg.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' :
              reg.paymentStatus === 'Partial' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
            }`}>
            {reg.paymentStatus}
          </span>
          {reg.paymentStatus !== 'Unpaid' && (
            <span className="text-[7px] lg:text-[10px] text-gray-400 font-medium mt-1 uppercase tracking-wider text-center leading-tight">₱{reg.amountPaid} <br className="lg:hidden" /> {reg.paymentMethod?.split(' ')[0]}</span>
          )}
        </div>
      </td>
      <td className="px-2 lg:px-6 py-4 text-center">
        {canVerify ? (
          <button
            onClick={() => handleToggleVerify(reg)}
            className={`inline-flex items-center justify-center p-1 rounded-lg transition-colors ${reg.verifiedByTreasurer ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
              }`}
            title={reg.verifiedByTreasurer ? 'Verified by Treasurer' : 'Pending Verification'}
          >
            {reg.verifiedByTreasurer ? <CheckCircle size={14} className="lg:w-5 lg:h-5" /> : <Clock size={14} className="lg:w-5 lg:h-5" />}
          </button>
        ) : (
          <div className={`inline-flex items-center justify-center p-1 rounded-lg ${reg.verifiedByTreasurer ? 'text-green-500' : 'text-orange-400'}`} title={reg.verifiedByTreasurer ? 'Verified by Treasurer' : 'Pending Verification'}>
            {reg.verifiedByTreasurer ? <CheckCircle size={14} className="lg:w-5 lg:h-5" /> : <Clock size={14} className="lg:w-5 lg:h-5" />}
          </div>
        )}
      </td>
      <td className="px-2 lg:px-6 py-4 text-right">
        {(canEditThis || canDeleteThis) && (
          <div className="flex items-center justify-end gap-0.5 lg:gap-2">
            {canEditThis && (
              <button onClick={() => openModalForEdit(reg)} className="p-1 lg:p-2 text-gray-400 hover:text-brand-brown hover:bg-brand-sand/20 rounded-lg transition-colors">
                <Edit2 size={14} className="lg:w-4 lg:h-4" />
              </button>
            )}
            {canDeleteThis && (
              <button onClick={() => handleDelete(reg)} className="p-1 lg:p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 size={14} className="lg:w-4 lg:h-4" />
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
});

// Memoized Card Component for Mobile
const RegistrantCard = memo(({ 
  reg, 
  canVerify, 
  handleToggleVerify, 
  openModalForEdit, 
  handleDelete,
  isAdmin,
  canEditAny,
  canDeleteAny,
  rolePerms,
  currentUserChurch
}: { 
  reg: Registrant, 
  canVerify: boolean, 
  handleToggleVerify: (reg: Registrant) => void,
  openModalForEdit: (reg: Registrant) => void,
  handleDelete: (reg: Registrant) => void,
  isAdmin: boolean,
  canEditAny: boolean,
  canDeleteAny: boolean,
  rolePerms: any,
  currentUserChurch: string | null
}) => {
  const userChurch = currentUserChurch?.toLowerCase().trim();
  const regChurch = reg.church?.toLowerCase().trim();
  const isOwnChurch = !!userChurch && userChurch === regChurch;
  const canEditThis = isAdmin || canEditAny || (rolePerms?.editOwn && isOwnChurch);
  const canDeleteThis = isAdmin || canDeleteAny || (rolePerms?.deleteOwn && isOwnChurch);

  return (
    <div className="mobile-card flex flex-col gap-1.5 !p-2">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <p className="font-black text-brand-brown text-[13px] leading-tight truncate">{reg.fullName}</p>
          <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider mt-0.5 truncate">{reg.church}</p>
        </div>
        <div className={`shrink-0 p-1 rounded-lg transition-all shadow-sm ${reg.verifiedByTreasurer ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-orange-50 text-orange-500 border border-orange-100'}`}>
          {canVerify ? (
            <button onClick={() => handleToggleVerify(reg)} className="flex items-center justify-center">
              {reg.verifiedByTreasurer ? <CheckCircle size={15} /> : <Clock size={15} />}
            </button>
          ) : (
            <div className="flex items-center justify-center">
              {reg.verifiedByTreasurer ? <CheckCircle size={15} /> : <Clock size={15} />}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-1 flex-wrap">
        <span className="px-1 py-0.5 bg-brand-cream border border-brand-sand/30 text-brand-brown rounded text-[8px] font-black uppercase leading-none">{reg.age}Y • {reg.sex?.charAt(0) || 'M'}</span>
        <span className="px-1 py-0.5 bg-brand-brown text-brand-cream rounded text-[8px] font-black uppercase tracking-tighter leading-none">Size {reg.shirtSize}</span>
        <span className={`px-1 py-0.5 rounded text-[8px] font-black uppercase border leading-none ${reg.paymentStatus === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' :
            reg.paymentStatus === 'Partial' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
              'bg-red-50 text-red-700 border-red-200'
          }`}>{reg.paymentStatus}</span>
        <span className="px-1 py-0.5 bg-blue-50 text-blue-700 rounded text-[8px] font-bold uppercase border border-blue-100 leading-none">{reg.feeType}</span>
        {reg.ministry && reg.ministry.length > 0 && reg.ministry.map(m => (
          <span key={m} className="px-1 py-0.5 bg-gray-50 text-gray-400 text-[8px] font-bold rounded border border-gray-100">{m}</span>
        ))}
      </div>

      <div className="flex items-center justify-between mt-0.5 pt-1.5 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter shrink-0">Paid</span>
          <span className="text-[11px] font-black text-brand-brown leading-none">₱{reg.amountPaid} <span className="text-[8px] font-medium text-gray-400">{reg.paymentMethod ? `(${reg.paymentMethod.split(' ')[0]})` : ''}</span></span>
        </div>
        {(canEditThis || canDeleteThis) && (
          <div className="flex gap-1">
            {canEditThis && (
              <button onClick={() => openModalForEdit(reg)} className="p-1 lg:p-1.5 bg-gray-50 text-gray-400 hover:text-brand-brown rounded-lg border border-gray-100 active:bg-brand-sand/20 transition-colors"><Edit2 size={12} /></button>
            )}
            {canDeleteThis && (
              <button onClick={() => handleDelete(reg)} className="p-1 lg:p-1.5 bg-red-50 text-red-300 hover:text-red-500 rounded-lg border border-red-100 active:bg-red-100 transition-colors"><Trash2 size={12} /></button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

const NAME_REGEX = /^[A-Za-z\s.',-]+$/;

export default function Registrants() {
  const currentUser = useAppStore(s => s.currentUser);
  const appSettings = useAppStore(s => s.appSettings);
  const fetchGlobalSettings = useAppStore(s => s.fetchGlobalSettings);
  const registrants = useAppStore(s => s.registrants);
  const fetchRegistrants = useAppStore(s => s.fetchRegistrants);
  const syncRegistrant = useAppStore(s => s.syncRegistrant);
  const updateRegistrant = useAppStore(s => s.updateRegistrant);
  const lockEntity = useAppStore(s => s.lockEntity);
  const unlockEntity = useAppStore(s => s.unlockEntity);
  const user = currentUser; // Cache for stable null-checks
  
  // Use global settings with an internal fallback for the structure
  const settings = appSettings || {
    churches: [], merchCosts: {}, ministries: [], expenseCategories: [], paymentMethods: [], shirtSizePhoto: null
  } as any;

  useEffect(() => {
    // If boot sync is already complete (cache hit + live sync), skip redundant fetches.
    // Layout.tsx already handles the live boot cycle for all roles via fetchBootData().
    const { hasSyncedLive } = useAppStore.getState();
    if (!hasSyncedLive) {
      fetchGlobalSettings();
      fetchRegistrants(registrants.length > 0);
    }
  }, []);

  // Local state for UI
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterChurch, setFilterChurch] = useState<string>(() => {
    const role = currentUser?.role?.toLowerCase().trim();
    if (role === 'coordinator' && currentUser?.church) return currentUser.church;
    return 'All';
  });
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterMinistry, setFilterMinistry] = useState<string>('All');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;
  const [pageRegistrants, setPageRegistrants] = useState<Registrant[]>([]);
  const [total, setTotal] = useState(0);
  const [isFetching, setIsFetching] = useState(false);

  type ChurchSummary = {
    total: number;
    collected: number;
    expected: number;
    pending: number;
  };

  const [summaries, setSummaries] = useState<{ 
    churchSummaries: Record<string, ChurchSummary>, 
    totalExpected: number, 
    totalCollected: number 
  }>({
    churchSummaries: {}, totalExpected: 0, totalCollected: 0
  });

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });
  const [shirtModalOpen, setShirtModalOpen] = useState(false);
  const [verifyConfirm, setVerifyConfirm] = useState<{ isOpen: boolean, reg: Registrant | null }>({ isOpen: false, reg: null });
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchData, setBatchData] = useState<Omit<Registrant, 'id' | 'dateRegistered'>[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);

  const isAdmin = currentUser?.role?.toLowerCase().trim() === 'admin';
  const isTreasurer = currentUser?.role?.toLowerCase().trim() === 'treasurer';
  const roleKey = currentUser?.role?.toLowerCase().trim();
  const rolePerms = roleKey ? currentUser?.permissionMatrix?.[roleKey]?.registrants : undefined;
  
  const canView = isAdmin || (rolePerms?.view === true);
  const canAdd = isAdmin || (rolePerms?.add === true);
  const canEditAny = isAdmin || (rolePerms?.editAny === true);
  const canDeleteAny = isAdmin || (rolePerms?.deleteAny === true);
  const canVerify = isAdmin || (isTreasurer && currentUser?.permissionMatrix?.[currentUser.role]?.registrants?.viewAll); // Custom logic for treasurer verification if needed or just use treasurer role

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center px-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-brand-beige max-w-md w-full">
          <ShieldAlert size={48} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-2xl font-display text-brand-brown mb-2">Restricted Access</h2>
          <p className="text-gray-500">You do not have permission to access Registrants.</p>
        </div>
      </div>
    );
  }

  // Form state
  const initialForm: Omit<Registrant, 'id' | 'dateRegistered'> = {
    fullName: '',
    age: 0,
    sex: 'Male',
    ministry: [],
    shirtSize: 'M',
    church: (roleKey === 'coordinator' || roleKey === 'treasurer') && user?.church ? user.church : '',
    feeType: 'Regular',
    paymentStatus: 'Unpaid',
    paymentMethod: 'Cash' as any,
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
  const fetchData = async () => {
    setIsFetching(true);
    try {
      const res = await api.get('/api/registrants', {
        params: {
          page: currentPage,
          limit: itemsPerPage,
          search: searchTerm,
          church: filterChurch,
          status: filterStatus,
          ministry: filterMinistry
        }
      });
      setPageRegistrants(res.data.registrants);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsFetching(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await api.get('/api/registrants/summary');
      setSummaries(res.data);
    } catch (err) {
      console.error('Summary fetch error:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, searchTerm, filterChurch, filterStatus, filterMinistry]);

  useEffect(() => {
    fetchSummary();
  }, []);

  // Derived visible data
  const baseRegistrants = pageRegistrants;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterChurch, filterStatus, filterMinistry]);

  const totalPages = Math.ceil(total / itemsPerPage);
  const paginatedRegistrants = baseRegistrants;

  // Summaries from state
  const { churchSummaries, totalExpected, totalCollected } = summaries;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!NAME_REGEX.test(formData.fullName)) {
      setFormError('Please enter a valid name (e.g., "Doe, John" or "John Doe").');
      return;
    }

    try {
      setFormError(null);
      const { id, _id, __v, createdAt, updatedAt, ...cleanData } = formData as any;
      
      if (editingId) {
        // Optimistic update: instantly reflect the edit in the UI before server confirms
        lockEntity('registrants', editingId);
        updateRegistrant(editingId, cleanData);
        closeModal();
        
        await api.put(`/api/registrants/${editingId}`, cleanData);
        unlockEntity('registrants', editingId);
        await Promise.all([fetchData(), fetchSummary()]);
      } else {
        // Optimistic update for new entries
        const tempId = `temp-${Date.now()}`;
        const optimisticNew = {
          ...cleanData,
          _id: tempId,
          id: tempId,
          dateRegistered: new Date().toISOString()
        };
        syncRegistrant('added', optimisticNew);
        closeModal();

        try {
          const res = await api.post(`/api/registrants`, cleanData);
          // Graceful handoff: Swap temp optimistic UI instantly to prevent duplicates.
          syncRegistrant('deleted', { _id: tempId, id: tempId });
          syncRegistrant('added', res.data);
          fetchSummary();
          fetchData();
        } catch (err) {
          console.error('Failed to register participant:', err);
          // Immediate rollback on error
          syncRegistrant('deleted', { _id: tempId, id: tempId });
          throw err;
        }
      }
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Failed to save registrant.');
      // If we were editing and it failed, we need to unlock and sync
      if (editingId) {
        unlockEntity('registrants', editingId);
        fetchData();
      }
    }
  };

  const openModalForNew = () => {
    setFormData({
      ...initialForm,
      church: (roleKey === 'coordinator' || roleKey === 'treasurer') && user?.church ? user.church : (settings.churches[0] || '')
    });
    setEditingId(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openBatchModal = () => {
    setBatchData([{ 
      ...initialForm, 
      church: (roleKey === 'coordinator' || roleKey === 'treasurer') && user?.church ? user.church : (settings.churches[0] || '') 
    }]);
    setBatchError(null);
    setIsBatchModalOpen(true);
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validData = batchData.filter(d => d.fullName && NAME_REGEX.test(d.fullName));
    if (validData.length === 0) return;

    setBatchError(null);
    // Optimistic batch add with temp entries
    const tempDocs = validData.map(d => ({
      ...d,
      _id: `temp-${Date.now()}-${Math.random()}`,
      dateRegistered: new Date().toISOString()
    }));
    syncRegistrant('imported', tempDocs);
    setIsBatchModalOpen(false);
    setBatchData([]);

    api.post(`/api/registrants/batch`, { registrants: validData }).then((res) => {
      // Graceful handoff: Swap temp optimistic UI instantly to prevent duplicates.
      tempDocs.forEach(d => syncRegistrant('deleted', { _id: d._id }));
      syncRegistrant('imported', res.data);
      fetchSummary();
      fetchData();
    }).catch(err => {
      console.error(err);
      // Immediate rollback on error
      tempDocs.forEach(d => syncRegistrant('deleted', { _id: d._id }));
    });
  };

  const addBatchRow = () => {
    setBatchData([...batchData, { 
      ...initialForm, 
      church: (roleKey === 'coordinator' || roleKey === 'treasurer') && user?.church ? user.church : (settings.churches[0] || '') 
    }]);
  };

  const openModalForEdit = (reg: Registrant) => {
    // Case-insensitive/trimmed comparison for Coordinator/Treasurer roles
    const userChurch = currentUser?.church?.toLowerCase().trim();
    const regChurch = reg.church?.toLowerCase().trim();
    const isOwnChurch = !!userChurch && userChurch === regChurch;
    const canEditOwn = isAdmin || (rolePerms?.editOwn === true && isOwnChurch);
    if (!canEditAny && !canEditOwn) return;

    setFormData(reg);
    setEditingId(reg.id);
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormError(null);
  };

  const handleDelete = (reg: Registrant) => {
    const canDeleteOwn = isAdmin || (rolePerms?.deleteOwn === true && reg.church === currentUser?.church);
    if (!canDeleteAny && !canDeleteOwn) return;

    setConfirmModal({ isOpen: true, id: (reg as any)._id || reg.id });
  };

  const confirmDelete = async () => {
    if (!confirmModal.id) return;
    const deletedId = confirmModal.id;
    // Optimistic instant removal from list
    syncRegistrant('deleted', { _id: deletedId, id: deletedId });
    setConfirmModal({ isOpen: false, id: null });
    api.delete(`/api/registrants/${deletedId}`).then(() => {
      fetchSummary();
      fetchData();
    }).catch(err => {
      console.error('Delete failed:', err);
    });
  };

  const handleToggleVerify = (reg: Registrant) => {
    setVerifyConfirm({ isOpen: true, reg });
  };
  const doVerify = async () => {
    if (!verifyConfirm.reg) return;
    const reg = verifyConfirm.reg;
    const regId = (reg as any)._id || reg.id;
    const nowVerified = !reg.verifiedByTreasurer;
    // Close immediately and optimistically update
    setVerifyConfirm({ isOpen: false, reg: null });
    updateRegistrant(regId, {
      verifiedByTreasurer: nowVerified,
      verifiedAt: nowVerified ? new Date().toISOString() : null
    });
    api.put(`/api/registrants/${regId}`, {
      verifiedByTreasurer: nowVerified,
      verifiedAt: nowVerified ? new Date().toISOString() : null
    }).catch(err => {
      console.error(err);
      // Revert ONLY the failed row back to its original state
      updateRegistrant(regId, {
        verifiedByTreasurer: reg.verifiedByTreasurer,
        verifiedAt: reg.verifiedAt
      });
    });
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
  
  const expectedFee = formData.feeType === 'Early Bird' ? 350 : 500;
  const isAmountMismatch = formData.paymentStatus === 'Paid' && formData.amountPaid !== expectedFee;
  const isPartialMismatch = formData.paymentStatus === 'Partial' && formData.amountPaid >= expectedFee;

  return (
    <div className="space-y-6 relative">
      {isFetching && (
        <div className="absolute top-0 right-0 p-2 z-10">
          <Loader2 className="animate-spin text-brand-brown w-6 h-6" />
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <h2 className="text-2xl md:text-3xl font-display text-brand-brown tracking-wide mb-1 md:mb-0">Delegates</h2>
        
        {/* Actions - Desktop Only */}
        <div className="hidden md:flex flex-wrap gap-3">
          {canAdd && (
            <button 
              onClick={openBatchModal}
              className="flex items-center gap-2 bg-brand-sand text-brand-brown px-5 py-2.5 rounded-xl font-bold hover:bg-opacity-80 transition-colors shadow-sm"
            >
              <Users size={20} /> Batch Add
            </button>
          )}
          {canAdd && (
            <button 
              onClick={openModalForNew}
              className="flex items-center gap-2 bg-brand-brown text-white px-5 py-2.5 rounded-xl font-bold hover:bg-brand-light-brown transition-colors shadow-sm"
            >
              <PlusCircle size={20} /> Add New
            </button>
          )}
        </div>
      </div>

      {/* Per-Church Summary (For Admins & Treasurers) */}
      {(isAdmin || isTreasurer) && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-brand-beige">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Financial Performance Snapshot</h3>
            <span className="text-[10px] font-black text-brand-brown bg-brand-sand/30 px-2 py-0.5 rounded-full uppercase tracking-tighter">Per-Church Metrics</span>
          </div>
          
          <div className="flex overflow-x-auto gap-3 pb-2 -mx-1 px-1 custom-scrollbar">
            {Object.entries(churchSummaries).map(([church, stats]) => (
              <div key={church} className="min-w-[180px] border border-gray-100 rounded-xl p-3 bg-gray-50/50 shadow-sm flex flex-col justify-between">
                <div>
                  <p className="font-black text-brand-brown text-xs truncate uppercase tracking-tight" title={church}>{church || 'Unknown'}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5">{stats.total} Reg.</p>
                </div>
                
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-400 font-bold uppercase tracking-tighter text-[8px]">Paid</span>
                    <span className="font-black text-green-600">₱{stats.collected.toLocaleString()}</span>
                  </div>
                  
                  <div className={`flex justify-between items-center px-1.5 py-0.5 rounded-md border mt-1 ${stats.pending > 0 ? 'bg-orange-50 border-orange-100' : 'bg-transparent border-transparent'}`}>
                    <span className={`uppercase tracking-tighter text-[7px] font-black ${stats.pending > 0 ? 'text-orange-400' : 'text-gray-300'}`}>Pending</span>
                    <span className={`font-bold text-[9px] ${stats.pending > 0 ? 'text-orange-500' : 'text-gray-300'}`}>₱{stats.pending.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center pt-1 border-t border-gray-100 mt-1">
                    <span className="text-gray-400 font-bold uppercase tracking-tighter text-[8px]">Gap</span>
                    <span className={`font-black text-[10px] ${stats.expected - stats.collected > 0 ? 'text-red-500' : 'text-green-600'}`}>
                      ₱{(stats.expected - stats.collected).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {Object.keys(churchSummaries).length > 0 && (
              <div className="min-w-[180px] border-2 border-brand-sand/30 rounded-xl p-3 bg-brand-cream/30 shadow-sm flex flex-col justify-between">
                <div>
                  <p className="font-black text-brand-brown text-xs uppercase tracking-widest">GRAND TOTAL</p>
                </div>
                
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-400 font-bold uppercase tracking-tighter text-[8px]">Expected</span>
                    <span className="font-black text-gray-700">₱{totalExpected.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-400 font-bold uppercase tracking-tighter text-[8px]">Collected</span>
                    <span className="font-black text-green-600">₱{totalCollected.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-brand-sand mt-1">
                    <span className="text-brand-brown font-black uppercase tracking-tighter text-[9px]">Gap</span>
                    <span className="font-black text-red-600 text-sm leading-none">₱{(totalExpected - totalCollected).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
            
            {Object.keys(churchSummaries).length === 0 && (
              <div className="w-full py-8 text-center text-gray-400 italic bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <Users size={32} className="mx-auto mb-2 opacity-10" />
                <p className="text-sm">No Church Summary data available yet.</p>
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center justify-center gap-1 md:hidden">
            <div className="w-1 h-1 rounded-full bg-brand-brown"></div>
            <div className="w-1 h-1 rounded-full bg-brand-brown/30"></div>
            <div className="w-1 h-1 rounded-full bg-brand-brown/30"></div>
            <span className="text-[9px] font-black text-gray-300 uppercase ml-1 tracking-widest">Scroll for more</span>
          </div>
        </div>
      )}


      {/* Filters and Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-brand-beige overflow-hidden">
        {/* Toolbar */}
        <div className="p-3 md:p-4 border-b border-gray-100 flex flex-col md:flex-row gap-3 md:gap-4 bg-gray-50/30">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold" size={18} />
            <input
              type="text"
              placeholder="Search delegate..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown focus:ring-1 focus:ring-brand-brown transition-all bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter size={18} className="text-gray-400 hidden lg:block" />

            <select
              value={filterChurch}
              onChange={(e) => setFilterChurch(e.target.value)}
              className="py-2 pl-3 pr-8 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown focus:ring-1 transition-all w-full md:w-32 lg:w-40 bg-white text-xs font-bold"
            >
              <option value="All">All Churches</option>
              {settings.churches.map((c: string) => <option key={c} value={c}>{c}</option>)}
            </select>

            <select
              value={filterMinistry}
              onChange={(e) => setFilterMinistry(e.target.value)}
              className="py-2 pl-3 pr-8 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown focus:ring-1 transition-all w-[48%] md:w-32 lg:w-40 bg-white text-xs font-bold"
            >
              <option value="All">Ministries</option>
              {settings.ministries.map((m: string) => <option key={m} value={m}>{m}</option>)}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="py-2 pl-3 pr-8 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown focus:ring-1 transition-all w-[48%] md:w-32 lg:w-40 bg-white text-xs font-bold"
            >
              <option value="All">Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Unpaid">Unpaid</option>
            </select>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-[9px] lg:text-xs text-gray-400 uppercase bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-2 lg:px-6 py-4 font-medium tracking-wider">Name</th>
                <th className="px-2 lg:px-6 py-4 font-medium tracking-wider text-center">Age / Sex / Size</th>
                <th className="px-2 lg:px-6 py-4 font-medium tracking-wider">Church & Ministry</th>
                <th className="px-2 lg:px-6 py-4 font-medium tracking-wider">Package</th>
                <th className="px-2 lg:px-6 py-4 font-medium tracking-wider text-center">Payment</th>
                <th className="px-2 lg:px-6 py-4 font-medium tracking-wider text-center">Verified</th>
                <th className="px-2 lg:px-6 py-4 font-medium tracking-wider text-right">Actions</th>
              </tr>
              <tr className="bg-green-50/40 text-[9px] lg:text-xs border-b border-gray-100">
                <td colSpan={7} className="px-2 lg:px-6 py-1.5 text-gray-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-600" /> Verified by Treasurer</span>
                    <span className="flex items-center gap-1.5"><Clock size={12} className="text-orange-500" /> Pending verification</span>
                  </div>
                </td>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedRegistrants.length > 0 ? paginatedRegistrants.map((reg) => (
                <RegistrantRow 
                  key={reg.id || (reg as any)._id}
                  reg={reg}
                  canVerify={!!canVerify}
                  handleToggleVerify={handleToggleVerify}
                  openModalForEdit={openModalForEdit}
                  handleDelete={handleDelete}
                  isAdmin={isAdmin}
                  canEditAny={canEditAny}
                  canDeleteAny={canDeleteAny}
                  rolePerms={rolePerms}
                  currentUserChurch={currentUser?.church || null}
                />
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    No registrants found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-1.5 px-0.5 pb-32">
          {paginatedRegistrants.length > 0 ? paginatedRegistrants.map(reg => (
            <RegistrantCard 
              key={(reg as any)._id || reg.id}
              reg={reg}
              canVerify={!!canVerify}
              handleToggleVerify={handleToggleVerify}
              openModalForEdit={openModalForEdit}
              handleDelete={handleDelete}
              isAdmin={isAdmin}
              canEditAny={canEditAny}
              canDeleteAny={canDeleteAny}
              rolePerms={rolePerms}
              currentUserChurch={currentUser?.church || null}
            />
          )) : (
            <div className="mobile-card py-12 text-center text-gray-400">
              <Users size={48} className="mx-auto opacity-10 mb-2" />
              <p className="text-sm">No registrants found matching your criteria.</p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
            <span className="text-sm text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, total)} of {total}
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
        <div className="fixed inset-0 bg-brand-brown/50 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
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

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6">
              {formError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4 animate-shake shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                  <ShieldAlert size={20} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-red-800 uppercase tracking-widest mb-1">Error Encountered</p>
                    <p className="text-sm text-red-700 font-bold leading-relaxed">{formError}</p>
                  </div>
                </div>
              )}
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
                            Format: Last, First (e.g., 'Santos, Maria' or 'Reyes, Jose Jr.')
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
                            {settings.ministries.map((m: string) => {
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
                        {roleKey === 'admin' ? (
                          <select
                            value={formData.church}
                            onChange={(e) => setFormData({ ...formData, church: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown"
                          >
                            {settings.churches.map((c: string) => <option key={c} value={c}>{c}</option>)}
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
                          onChange={(e) => {
                            const newFeeType = e.target.value as any;
                            const newExpected = newFeeType === 'Early Bird' ? 350 : 500;
                            setFormData({ 
                              ...formData, 
                              feeType: newFeeType,
                              amountPaid: formData.paymentStatus === 'Paid' ? newExpected : formData.amountPaid
                            });
                          }}
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
                          className={`w-full px-3 py-2 rounded-lg border focus:outline-none font-bold transition-all ${
                                formData.paymentStatus === 'Paid' ? (isAmountMismatch ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-green-300 bg-green-50 text-green-700') :
                                formData.paymentStatus === 'Partial' ? (isPartialMismatch ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-yellow-300 bg-yellow-50 text-yellow-700') :
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
                              className={`w-full px-3 py-2 rounded-lg border focus:outline-none font-medium transition-colors ${
                                isAmountMismatch || isPartialMismatch ? 'border-orange-400 bg-orange-50 focus:border-orange-500' : 'border-gray-200 focus:border-brand-brown'
                              }`}
                            />
                            {isAmountMismatch && (
                              <p className="text-[10px] text-orange-600 font-bold mt-1 uppercase tracking-tighter">⚠️ Amount must be ₱{expectedFee} for 'Paid Fully'</p>
                            )}
                            {isPartialMismatch && (
                              <p className="text-[10px] text-orange-600 font-bold mt-1 uppercase tracking-tighter">⚠️ Use 'Paid Fully' if amount is ₱{expectedFee}</p>
                            )}
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
                              {settings.paymentMethods.map((pm: string) => <option key={pm} value={pm}>{pm}</option>)}
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

              <div className="mt-8 pt-6 border-t border-brand-beige flex justify-end gap-3 bg-white pb-2">
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

      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-brand-brown/50 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl overflow-hidden my-4 md:my-8 border border-brand-sand max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-brand-cream/50 sticky top-0 z-20">
              <h3 className="text-2xl font-display text-brand-brown tracking-wide flex items-center gap-2">
                <Users className="text-brand-brown" /> Batch Registration
              </h3>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="text-gray-400 hover:text-brand-brown transition-colors p-1 rounded-lg hover:bg-white"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleBatchSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/30">
              {batchError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4 animate-shake shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                  <ShieldAlert size={20} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-red-800 uppercase tracking-widest mb-1">Batch Error</p>
                    <p className="text-sm text-red-700 font-bold leading-relaxed">{batchError}</p>
                  </div>
                </div>
              )}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  <span className="font-bold">Format:</span> Last, First (e.g., 'Santos, Maria' or 'Reyes, Jose Jr.')
                </p>
              </div>
              <div className="space-y-8">
                {batchData.map((row, idx) => {
                  const isValidName = !row.fullName || NAME_REGEX.test(row.fullName);
                  const expected = row.feeType === 'Early Bird' ? 350 : 500;
                  const isMistake = row.paymentStatus === 'Paid' && row.amountPaid !== expected;
                  const isPartialMistake = row.paymentStatus === 'Partial' && row.amountPaid >= expected;

                  return (
                    <div key={idx} className="bg-white rounded-2xl border-2 border-brand-sand/30 shadow-sm overflow-hidden relative group">
                      {/* Card Header */}
                      <div className="bg-brand-cream/50 px-4 py-2 border-b border-brand-sand/20 flex justify-between items-center sticky top-0 md:static z-10">
                        <span className="text-[10px] font-black text-brand-brown uppercase tracking-widest">Registrant #{idx + 1}</span>
                        <button 
                          type="button" 
                          onClick={() => setBatchData(batchData.filter((_: any, i: number) => i !== idx))} 
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-all opacity-100 lg:opacity-0 group-hover:opacity-100"
                          title="Remove this registrant"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                         {/* Personal Info Column (Batch) */}
                         <div className="space-y-6">
                            <div>
                               <h6 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2 mb-4">Personal Info</h6>
                               <div className="space-y-4">
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">Full Name (Last, First M.)</label>
                                    <input 
                                      type="text" required 
                                      value={row.fullName} 
                                      onChange={(e) => setBatchData(batchData.map((d, i) => i === idx ? { ...d, fullName: e.target.value } : d))} 
                                      className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none transition-colors ${isValidName ? 'border-gray-200 focus:border-brand-brown' : 'border-red-400 focus:border-red-500 bg-red-50/30'}`} 
                                      placeholder="Dela Cruz, Juan P." 
                                    />
                                    {!isValidName && <p className="text-[10px] text-red-500 mt-1 font-bold">Incorrect format. Use 'Last, First'</p>}
                                  </div>

                                  <div className="grid grid-cols-3 gap-3">
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1 text-center">Age</label>
                                      <input type="number" required min="1" max="100" value={row.age || ''} onChange={(e) => setBatchData(batchData.map((d, i) => i === idx ? { ...d, age: parseInt(e.target.value) || 0 } : d))} className="w-full px-2 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown text-center" />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1 text-center font-medium">Sex</label>
                                      <select value={row.sex} onChange={(e) => setBatchData(batchData.map((d, i) => i === idx ? { ...d, sex: e.target.value as any } : d))} className="w-full px-2 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown text-center font-medium">
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1 text-center font-bold">Size</label>
                                      <select value={row.shirtSize} onChange={(e) => setBatchData(batchData.map((d, i) => i === idx ? { ...d, shirtSize: e.target.value as any } : d))} className="w-full px-2 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown text-center font-black">
                                        {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(s => <option key={s} value={s}>{s}</option>)}
                                      </select>
                                    </div>
                                  </div>

                                  <div>
                                     <label className="block text-[10px] text-gray-400 uppercase font-black mb-2">Ministries</label>
                                     <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100 min-h-[42px]">
                                        {settings.ministries.map((m: string) => {
                                          const isChecked = row.ministry?.includes(m);
                                          return (
                                            <button
                                              type="button"
                                              key={m}
                                              onClick={() => {
                                                const current = row.ministry || [];
                                                const next = isChecked ? current.filter(x => x !== m) : [...current, m];
                                                setBatchData(batchData.map((d, i) => i === idx ? { ...d, ministry: next } : d));
                                              }}
                                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${isChecked ? 'bg-brand-sand text-brand-brown border-brand-sand shadow-sm' : 'bg-white text-gray-400 border-gray-200 hover:border-brand-sand'}`}
                                            >
                                              <div className={`w-3 h-3 rounded border flex items-center justify-center ${isChecked ? 'bg-brand-brown border-brand-brown text-white' : 'bg-white border-gray-300 text-transparent'}`}>
                                                <CheckCircle size={8} />
                                              </div>
                                              <span className="truncate">{m}</span>
                                            </button>
                                          );
                                        })}
                                     </div>
                                  </div>
                               </div>
                            </div>
                         </div>

                         {/* Camp & Payment Column (Batch) */}
                         <div className="space-y-6">
                            <div>
                               <h6 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2 mb-4">Camp & Payment</h6>
                               <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                     <div>
                                        <label className="block text-xs text-gray-500 mb-1">Church</label>
                                        {roleKey === 'admin' ? (
                                          <select value={row.church} onChange={(e) => setBatchData(batchData.map((d, i) => i === idx ? { ...d, church: e.target.value } : d))} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown">
                                            {settings.churches.map((c: string) => <option key={c} value={c}>{c}</option>)}
                                          </select>
                                        ) : (
                                          <input type="text" disabled value={row.church} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-100 bg-gray-50 text-gray-500 opacity-80 cursor-not-allowed font-medium" />
                                        )}
                                     </div>
                                     <div>
                                        <label className="block text-xs text-gray-500 mb-1">Package</label>
                                        <select 
                                          value={row.feeType} 
                                          onChange={(e) => {
                                            const ft = e.target.value as any;
                                            const newExpected = ft === 'Early Bird' ? 350 : 500;
                                            setBatchData(batchData.map((d, i) => i === idx ? { ...d, feeType: ft, amountPaid: d.paymentStatus === 'Paid' ? newExpected : d.amountPaid } : d));
                                          }}
                                          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown"
                                        >
                                          <option value="Early Bird">Early (₱350)</option>
                                          <option value="Regular">Regular (₱500)</option>
                                        </select>
                                     </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4 pt-2">
                                     <div>
                                        <label className="block text-xs text-gray-500 mb-1">Status</label>
                                        <select 
                                          value={row.paymentStatus} 
                                          onChange={(e) => {
                                            const status = e.target.value as any;
                                            const pkgFixed = row.feeType === 'Early Bird' ? 350 : 500;
                                            setBatchData(batchData.map((d, i) => i === idx ? { ...d, paymentStatus: status, amountPaid: status === 'Unpaid' ? 0 : (status === 'Paid' ? pkgFixed : d.amountPaid) } : d));
                                          }} 
                                          className={`w-full px-3 py-2 text-sm font-black rounded-lg border focus:outline-none transition-all ${
                                            row.paymentStatus === 'Paid' ? (isMistake ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-green-300 bg-green-50 text-green-700') :
                                            row.paymentStatus === 'Partial' ? (isPartialMistake ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-yellow-300 bg-yellow-50 text-yellow-700') :
                                            'border-red-300 bg-red-50 text-red-700'
                                          }`}
                                        >
                                          <option value="Unpaid">Unpaid</option>
                                          <option value="Partial">Partial</option>
                                          <option value="Paid">Paid Fully</option>
                                        </select>
                                     </div>
                                     <div>
                                        <label className="block text-xs text-gray-500 mb-1">Amount Paid (₱)</label>
                                        <input 
                                          type="number" required={row.paymentStatus !== 'Unpaid'} min="0" 
                                          disabled={row.paymentStatus === 'Unpaid'} 
                                          value={row.amountPaid || ''} 
                                          onChange={(e) => setBatchData(batchData.map((d, i) => i === idx ? { ...d, amountPaid: parseInt(e.target.value) || 0 } : d))} 
                                          className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none transition-all font-black text-brand-brown ${
                                            isMistake || isPartialMistake ? 'border-orange-400 bg-orange-50' : 'border-gray-200 focus:border-brand-brown'
                                          }`} 
                                        />
                                        {isMistake && <p className="text-[8px] text-orange-500 font-black mt-1 uppercase">⚠️ Balance mismatch</p>}
                                     </div>

                                     <div className="col-span-2">
                                        <label className="block text-xs text-gray-500 mb-1">Payment Method</label>
                                        <select value={row.paymentMethod || 'Cash'} onChange={(e) => setBatchData(batchData.map((d, i) => i === idx ? { ...d, paymentMethod: e.target.value as any } : d))} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown">
                                          {settings.paymentMethods.map((pm: string) => <option key={pm} value={pm}>{pm}</option>)}
                                        </select>
                                     </div>

                                     {row.paymentMethod?.toLowerCase().includes('gcash') && (
                                       <div className="col-span-2">
                                         <label className="block text-xs text-gray-500 mb-1">GCash Ref No.</label>
                                         <input type="text" value={row.gcRef || ''} onChange={(e) => setBatchData(batchData.map((d, i) => i === idx ? { ...d, gcRef: e.target.value } : d))} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown font-mono" placeholder="000 000 000000" />
                                       </div>
                                     )}
                                  </div>
                               </div>
                            </div>
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button type="button" onClick={addBatchRow} className="mt-4 flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-brand-brown hover:text-brand-brown transition-colors font-medium">
                <PlusCircle size={20} /> Add Another Row
              </button>

              <div className="mt-8 pt-6 border-t border-brand-beige flex justify-end gap-3 bg-gray-50/30 pb-2">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={batchData.length === 0 || batchData.some(d => d.fullName && !NAME_REGEX.test(d.fullName))}
                  className="px-6 py-2.5 rounded-lg bg-brand-brown text-white font-bold hover:bg-brand-light-brown transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Users size={18} /> Process Batch ({batchData.length})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shirt Size Photo Modal */}
      {shirtModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-2 sm:p-4" onClick={() => setShirtModalOpen(false)}>
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

      {/* Mobile FAB */}
      {canAdd && (
        <div className="md:hidden fixed bottom-24 right-6 z-[30] flex flex-col gap-3">
          <button
            onClick={openBatchModal}
            className="w-12 h-12 bg-white text-brand-brown rounded-full shadow-lg border-2 border-brand-sand flex items-center justify-center active:scale-95 transition-transform"
            title="Batch Add"
          >
            <Users size={20} />
          </button>
          <button
            onClick={openModalForNew}
            className="w-14 h-14 bg-brand-brown text-white rounded-full shadow-xl flex items-center justify-center active:scale-95 transition-transform"
            title="Add Registrant"
          >
            <PlusCircle size={28} />
          </button>
        </div>
      )}
    </div>
  );
}
