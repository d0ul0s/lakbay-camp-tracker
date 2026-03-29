import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAppStore } from '../store';
import type { Expense } from '../types';
import { PlusCircle, Filter, Trash2, Edit2, X, DollarSign, TrendingDown, TrendingUp, CheckCircle, Clock, ShieldAlert, Users, Receipt, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import ConfirmModal from '../components/ConfirmModal';



export default function Expenses() {
  const { 
    currentUser, 
    appSettings, 
    fetchGlobalSettings, 
    expenses, 
    fetchExpenses,
    registrants,
    fetchRegistrants,
    solicitations,
    fetchSolicitations,
    syncExpense,
    lockEntity,
    unlockEntity
  } = useAppStore();
  
  // Use global settings with fallback
  const settings = appSettings || {
    churches: [],
    ministries: [],
    expenseCategories: [],
    paymentMethods: [],
    shirtSizePhoto: null,
    merchCosts: { tshirt: 0, bag: 0, notebook: 0, pen: 0 }
  } as any;

  // Local state for snappy numeric typing without blocking the main event thread
  // Casted to strings intermediate so React doesn't eat trailing zeros or empty states
  // We strictly initialize this ONCE from settings to prevent any "snapback" or WebSocket overwrites during an edit session.
  const [localMerchCosts, setLocalMerchCosts] = useState({
    tshirt: settings.merchCosts?.tshirt?.toString() || '0',
    bag: settings.merchCosts?.bag?.toString() || '0',
    notebook: settings.merchCosts?.notebook?.toString() || '0',
    pen: settings.merchCosts?.pen?.toString() || '0'
  });

  const localMerchCostsRef = React.useRef(localMerchCosts);
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Keep ref identically up to date with RAM state, but DO NOT overwrite RAM with external settings.
  useEffect(() => {
    localMerchCostsRef.current = localMerchCosts;
  }, [localMerchCosts]);

  useEffect(() => {
    // Only trigger network fetches if boot hasn't synced yet (cold start with no cache).
    // Once hasSyncedLive=true, WebSocket in Layout.tsx handles all real-time updates.
    const { hasSyncedLive } = useAppStore.getState();
    if (!hasSyncedLive) {
      fetchRegistrants(registrants.length > 0);
      fetchSolicitations(solicitations.length > 0);
      fetchExpenses(expenses.length > 0);
      fetchGlobalSettings(true);
    }
  }, []);

  // Roles
  const isAdmin = currentUser?.role?.toLowerCase().trim() === 'admin';
  const roleKey = currentUser?.role?.toLowerCase().trim();
  const rolePerms = roleKey ? currentUser?.permissionMatrix?.[roleKey]?.expenses : undefined;

  const canView = isAdmin || (rolePerms?.view === true);
  const canAdd = isAdmin || (rolePerms?.add === true);
  const canEditAny = isAdmin || (rolePerms?.editAny === true);
  const canDeleteAny = isAdmin || (rolePerms?.deleteAny === true);
  const canVerify = isAdmin || (roleKey === 'treasurer' && rolePerms?.viewAll);

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center px-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-brand-beige max-w-md w-full">
          <ShieldAlert size={48} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-2xl font-display text-brand-brown mb-2">Restricted Access</h2>
          <p className="text-gray-500">You do not have permission to access Expenses.</p>
        </div>
      </div>
    );
  }

  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;
  const [pageExpenses, setPageExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [stats, setStats] = useState({
    regIncome: 0,
    solIncome: 0,
    expTotal: 0,
    pendingInc: 0,
    pendingExp: 0,
    totalRegs: 0
  });

  const fetchData = async () => {
    setIsFetching(true);
    try {
      const res = await api.get('/api/expenses', {
        params: {
          page: currentPage,
          limit: itemsPerPage,
          category: filterCategory
        }
      });
      setPageExpenses(res.data.expenses);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsFetching(false);
    }
  };

  const fetchFinancialStats = async () => {
    try {
      const [regRes, solRes, expRes] = await Promise.all([
        api.get('/api/registrants/summary'),
        api.get('/api/solicitations/summary'),
        api.get('/api/expenses/summary')
      ]);

      setStats({
        regIncome: regRes.data.totalCollected,
        solIncome: solRes.data.verifiedTotal,
        expTotal: expRes.data.verifiedTotal,
        pendingInc: (regRes.data.totalExpected - regRes.data.totalCollected) + solRes.data.pendingTotal,
        pendingExp: expRes.data.pendingTotal,
        totalRegs: Object.values(regRes.data.churchSummaries as Record<string, any>).reduce((acc, s) => acc + s.total, 0)
      });
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, filterCategory]);

  useEffect(() => {
    fetchFinancialStats();
  }, []);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });
  const [verifyConfirm, setVerifyConfirm] = useState<{ isOpen: boolean, expense: Expense | null }>({ isOpen: false, expense: null });
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchData, setBatchData] = useState<Omit<Expense, 'id'>[]>([]);

  const handleToggleVerify = (exp: Expense) => {
    setVerifyConfirm({ isOpen: true, expense: exp });
  };
  const doVerify = async () => {
    if (!verifyConfirm.expense) return;
    const exp = verifyConfirm.expense;
    const expId = (exp as any)._id || exp.id;
    const nowVerified = !exp.verifiedByTreasurer;
    
    // Close immediately and optimistically update
    setVerifyConfirm({ isOpen: false, expense: null });
    lockEntity('expenses', expId);
    syncExpense('updated', { 
      _id: expId, 
      id: expId, 
      verifiedByTreasurer: nowVerified,
      verifiedAt: nowVerified ? new Date().toISOString() : null
    });

    api.put(`/api/expenses/${expId}`, {
      verifiedByTreasurer: nowVerified,
      verifiedAt: nowVerified ? new Date().toISOString() : null
    }).then(() => {
      unlockEntity('expenses', expId);
      fetchFinancialStats();
      fetchData();
    }).catch(err => {
      console.error(err);
      unlockEntity('expenses', expId);
      fetchExpenses(true); // Silent revert on failure
    });
  };

  const initialForm: Omit<Expense, 'id'> = {
    description: '',
    category: '' as any,
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    paidBy: '',
    method: '',
    verifiedByTreasurer: false,
    verifiedAt: null
  };
  const [formData, setFormData] = useState<any>(initialForm);

  // Auto-set category and method defaults if empty
  useEffect(() => {
    if (isModalOpen && !editingId) {
      if (!formData.category && settings.expenseCategories.length > 0) {
        setFormData((prev: any) => ({ ...prev, category: settings.expenseCategories[0] }));
      }
      if (!formData.method && settings.paymentMethods.length > 0) {
        setFormData((prev: any) => ({ ...prev, method: settings.paymentMethods[0] }));
      }
    }
  }, [isModalOpen, editingId, settings.expenseCategories, settings.paymentMethods, formData.category, formData.method]);

  // Stats calculation (Verified Only)
  const totalIncome = stats.regIncome + stats.solIncome;
  const totalItemsExpected = stats.totalRegs;
  const totalMerchProductionCost =
    ((parseInt(localMerchCosts.tshirt) || 0) * totalItemsExpected) +
    ((parseInt(localMerchCosts.bag) || 0) * totalItemsExpected) +
    ((parseInt(localMerchCosts.notebook) || 0) * totalItemsExpected) +
    ((parseInt(localMerchCosts.pen) || 0) * totalItemsExpected);

  const totalExpenses = stats.expTotal + totalMerchProductionCost;
  const pendingIncome = stats.pendingInc;
  const pendingExpenses = stats.pendingExp;
  const netBalance = totalIncome - totalExpenses;

  // Filtered log
  const filteredExpenses = pageExpenses; // Server already filtered them

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { id, _id, __v, createdBy, createdAt, updatedAt, ...cleanData } = formData as any;
    const savePayload = {
      ...cleanData,
      date: new Date(formData.date).toISOString()
    };
    
    if (editingId) {
      // Optimistic update
      lockEntity('expenses', editingId);
      syncExpense('updated', { ...savePayload, _id: editingId, id: editingId });
      closeModal();
      api.put(`/api/expenses/${editingId}`, savePayload)
        .then(() => {
          unlockEntity('expenses', editingId);
        })
        .catch(err => {
          console.error(err);
          unlockEntity('expenses', editingId);
          fetchExpenses(true); // Silent revert on failure
        });
    } else {
      // Optimistic added for new entries
      const tempId = `temp-${Date.now()}`;
      const optimisticNew = {
        ...savePayload,
        _id: tempId,
        id: tempId,
        createdBy: currentUser?._id
      };
      syncExpense('added', optimisticNew);
      closeModal();

      api.post(`/api/expenses`, savePayload).then((res) => {
        // Graceful handoff: Swap temp optimistic UI instantly to prevent duplicates.
        syncExpense('deleted', { _id: tempId, id: tempId });
        syncExpense('added', res.data);
        fetchFinancialStats();
        fetchData();
      }).catch(err => {
        console.error(err);
        // Immediate rollback on error
        syncExpense('deleted', { _id: tempId, id: tempId });
        fetchExpenses(true);
      });
    }
  };

  const handleDelete = (exp: Expense) => {
    const canDeleteOwn = isAdmin || (rolePerms?.deleteOwn === true && exp.createdBy === currentUser?._id);
    if (!canDeleteAny && !canDeleteOwn) return;
    setConfirmModal({ isOpen: true, id: (exp as any)._id || exp.id });
  };

  const confirmDelete = async () => {
    if (!confirmModal.id) return;
    const deletedId = confirmModal.id;
    // Optimistic delete
    syncExpense('deleted', { _id: deletedId, id: deletedId });
    setConfirmModal({ isOpen: false, id: null });
    
    // Guard: skip API call if this is still a temp optimistic entry (server hasn't responded yet)
    if (String(deletedId).startsWith('temp-')) return;
    
    api.delete(`/api/expenses/${deletedId}`).then(() => {
      fetchFinancialStats();
      fetchData();
    }).catch(err => {
      console.error(err);
      fetchExpenses(true);
    });
  };

  const openModalForNew = () => {
    setFormData({
      ...initialForm,
      category: settings.expenseCategories[0] || '',
      method: settings.paymentMethods[0] || ''
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openBatchModal = () => {
    setBatchData([{ 
      ...initialForm, 
      category: settings.expenseCategories[0] || '' as any,
      method: settings.paymentMethods[0] || '' 
    }]);
    setIsBatchModalOpen(true);
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validData = batchData.filter(d => d.paidBy && d.description && d.amount > 0);
    if (validData.length === 0) return;

    const payload = validData.map(d => ({ ...d, date: new Date(d.date).toISOString() }));
    
    // Optimistic batch add
    const tempDocs = payload.map(d => ({
      ...d,
      _id: `temp-${Date.now()}-${Math.random()}`,
      createdBy: currentUser?._id
    }));
    
    syncExpense('imported', tempDocs);
    setIsBatchModalOpen(false);
    setBatchData([]);

    api.post(`/api/expenses/batch`, { expenses: payload }).then((res) => {
      // Graceful handoff: Swap temp optimistic UI instantly to prevent duplicates.
      tempDocs.forEach(d => syncExpense('deleted', { _id: d._id }));
      syncExpense('imported', res.data);
    }).catch(err => {
      console.error(err);
      // Immediate rollback on error
      tempDocs.forEach(d => syncExpense('deleted', { _id: d._id }));
      fetchExpenses(true);
    });
  };

  const addBatchRow = () => {
    setBatchData([...batchData, { 
      ...initialForm, 
      category: settings.expenseCategories[0] || '' as any,
      method: settings.paymentMethods[0] || '' 
    }]);
  };

  const openModalForEdit = (exp: Expense) => {
    const canEditOwn = isAdmin || (rolePerms?.editOwn === true && exp.createdBy === currentUser?._id);
    if (!canEditAny && !canEditOwn) return;

    setFormData({
      ...exp,
      date: exp.date.split('T')[0]
    });
    setEditingId((exp as any)._id || exp.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleMerchCostChange = (item: string, htmlValue: number) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Force update the ref immediately by bypassing React render cycle guarantees
    // This perfectly captures blazing fast tabbing without losing adjacent box edits!
    localMerchCostsRef.current = {
      ...localMerchCostsRef.current,
      [item]: htmlValue.toString()
    };

    const realtimePayload = {
      tshirt: parseInt(localMerchCostsRef.current.tshirt) || 0,
      bag: parseInt(localMerchCostsRef.current.bag) || 0,
      notebook: parseInt(localMerchCostsRef.current.notebook) || 0,
      pen: parseInt(localMerchCostsRef.current.pen) || 0,
    };

    // 1. Debounce the server transmission
    // We intentionally DO NOT update global state here, as synchronously modifying global state
    // will cause our local useEffect to nuke whatever input box you just tabbed into!
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await api.put(`/api/settings`, {
          merchCosts: realtimePayload
        });
      } catch (err) {
        console.error(err);
      }
    }, 1000);
  };

  const isNameValid = true;

  const totalPages = Math.ceil(total / itemsPerPage);
  const paginatedExpenses = filteredExpenses;

  return (
    <div className="space-y-6 relative">
      {isFetching && (
        <div className="absolute top-0 right-0 p-2 z-10">
          <Loader2 className="animate-spin text-brand-brown w-6 h-6" />
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-display text-brand-brown tracking-wide">Expenses</h2>
        </div>
        
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

      {isAdmin && (
        <>
      {/* Financial Summary - Desktop Only */}
      <div className="hidden min-[1800px]:grid grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-beige">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-green-50 text-green-600 rounded-lg"><TrendingUp size={16} /></div>
            <p className="font-bold text-gray-400 uppercase tracking-tighter text-[10px]">Total Income</p>
          </div>
          <h3 className="text-2xl font-black text-green-600">₱{totalIncome.toLocaleString()}</h3>
          <p className={`text-[9px] italic mt-0.5 ${pendingIncome > 0 ? 'text-orange-400 font-bold' : 'text-gray-300'}`}>
            ₱{pendingIncome.toLocaleString()} pending
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-brand-beige">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-red-50 text-red-500 rounded-lg"><TrendingDown size={16} /></div>
            <p className="font-bold text-gray-400 uppercase tracking-tighter text-[10px]">Total Expenses</p>
          </div>
          <h3 className="text-2xl font-black text-red-500">₱{totalExpenses.toLocaleString()}</h3>
          <p className={`text-[9px] italic mt-0.5 ${pendingExpenses > 0 ? 'text-orange-400 font-bold' : 'text-gray-300'}`}>
            ₱{pendingExpenses.toLocaleString()} pending
          </p>
        </div>

        <div className={`p-4 rounded-xl shadow-sm border ${netBalance >= 0 ? 'bg-brand-brown border-brand-brown text-white' : 'bg-red-50 border-red-200 text-red-900'}`}>
          <div className="flex items-center gap-2 mb-1">
            <div className={`p-1.5 rounded-lg ${netBalance >= 0 ? 'bg-white/20' : 'bg-red-100 text-red-600'}`}><DollarSign size={16} /></div>
            <p className="font-bold uppercase tracking-tighter text-[10px] opacity-90">Net Balance</p>
          </div>
          <h3 className="text-2xl font-black">₱{netBalance.toLocaleString()}</h3>
          <p className="text-[10px] opacity-75">Remaining camp funds</p>
        </div>
      </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Merch Setup Column */}
        {isAdmin && (
          <div className="bg-white rounded-2xl shadow-sm border border-brand-beige overflow-hidden lg:col-span-1">
            <div className="p-5 border-b border-gray-100 bg-brand-cream/30">
              <h3 className="font-display text-xl text-brand-brown tracking-wide">Merch Production Costs</h3>
              <p className="text-xs text-gray-500 mt-1">Calculated per registrant ({registrants.length} delegates)</p>
                      <div className="p-4 space-y-3">
              <div className="space-y-2">
                {[
                  { id: 'tshirt', label: 'T-Shirt', val: localMerchCosts?.tshirt },
                  { id: 'bag', label: 'Bag', val: localMerchCosts?.bag },
                  { id: 'notebook', label: 'Notebook', val: localMerchCosts?.notebook },
                  { id: 'pen', label: 'Pen', val: localMerchCosts?.pen },
                ].map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <span className="text-xs font-medium text-gray-700">{item.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-400">₱</span>
                      <input
                        type="number" min="0"
                        value={item.val}
                        onChange={(e) => setLocalMerchCosts({ ...localMerchCosts, [item.id]: e.target.value })}
                        onBlur={(e) => handleMerchCostChange(item.id, parseInt(e.target.value) || 0)}
                        className="w-20 px-1.5 py-1 text-right rounded-md border border-gray-200 focus:outline-none focus:border-brand-brown text-xs font-bold"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs font-bold text-brand-brown">Total Production</span>
                <span className="text-base font-black text-gray-800">₱{totalMerchProductionCost.toLocaleString()}</span>
              </div>
            </div>
       </div>
          </div>
        )}

        {/* Manual Expense Log Column */}
        <div className={`bg-white rounded-2xl shadow-sm border border-brand-beige overflow-hidden ${isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="p-3 md:p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between md:items-center gap-3 md:gap-4 bg-gray-50/30">
            <h3 className="font-display text-lg lg:text-xl text-brand-brown tracking-wide px-1">Expense Log</h3>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-400 font-bold" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="py-1.5 pl-3 pr-8 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown focus:ring-1 text-xs lg:text-sm bg-white font-bold"
              >
                <option value="All">All Categories</option>
                {settings.expenseCategories.map((c: string) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden space-y-1.5 px-0.5">
            {paginatedExpenses.length > 0 ? paginatedExpenses.map((exp) => (
              <div key={exp.id} className="mobile-card flex flex-col gap-1.5 !p-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-brand-brown text-[13px] leading-tight truncate">{exp.description}</p>
                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{format(parseISO(exp.date), 'MMM d, yyyy')}</p>
                  </div>
                  <div className={`shrink-0 p-1 rounded-lg border shadow-sm ${exp.verifiedByTreasurer ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-50 text-orange-500 border-orange-100'}`}>
                    {canVerify ? (
                      <button onClick={() => handleToggleVerify(exp)} className="flex items-center justify-center">
                        {exp.verifiedByTreasurer ? <CheckCircle size={15} /> : <Clock size={15} />}
                      </button>
                    ) : (
                      <div className="flex items-center justify-center">
                        {exp.verifiedByTreasurer ? <CheckCircle size={15} /> : <Clock size={15} />}
                      </div>
                    )}
                  </div>
                </div>
 
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="px-1 py-0.5 bg-gray-50 text-gray-400 text-[8px] font-black uppercase rounded border border-gray-100">{exp.category}</span>
                  <span className="px-1 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-bold uppercase rounded border border-blue-100">{exp.method}</span>
                </div>
 
                <div className="flex items-center justify-between mt-0.5 pt-1.5 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-black text-brand-brown leading-none">₱{exp.amount.toLocaleString()} <span className="text-[8px] font-medium text-gray-400">by {exp.paidBy}</span></span>
                  </div>
                  {(() => {
                    const canEditThis = isAdmin || canEditAny || (rolePerms?.editOwn && exp.createdBy === currentUser?._id);
                    const canDeleteThis = isAdmin || canDeleteAny || (rolePerms?.deleteOwn && exp.createdBy === currentUser?._id);
 
                    if (!canEditThis && !canDeleteThis) return null;
 
                    return (
                      <div className="flex items-center gap-1">
                        {canEditThis && (
                          <button onClick={() => openModalForEdit(exp)} className="p-1 bg-gray-50 text-gray-400 hover:text-brand-brown rounded-lg border border-gray-100 active:bg-brand-sand/20 transition-all">
                            <Edit2 size={12} />
                          </button>
                        )}
                        {canDeleteThis && (
                          <button onClick={() => handleDelete(exp)} className="p-1 bg-red-50 text-red-300 hover:text-red-500 rounded-lg border border-red-100 active:bg-red-100 transition-all">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )) : (
              <div className="mobile-card py-12 text-center text-gray-400">
                <Receipt size={48} className="mx-auto opacity-10 mb-2" />
                <p className="text-sm">No expenses logged yet.</p>
              </div>
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="text-[10px] lg:text-xs text-gray-400 uppercase bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="px-3 lg:px-6 py-4 font-medium tracking-wider">Date</th>
                  <th className="px-3 lg:px-6 py-4 font-medium tracking-wider">Description</th>
                  <th className="px-3 lg:px-6 py-4 font-medium tracking-wider">Category</th>
                  <th className="px-3 lg:px-6 py-4 font-medium tracking-wider text-right">Amount</th>
                  <th className="px-3 lg:px-6 py-4 font-medium tracking-wider text-center">Verified</th>
                  <th className="px-3 lg:px-6 py-4 font-medium tracking-wider text-right">Actions</th>
                </tr>
                <tr className="bg-green-50/40 text-xs border-b border-gray-100">
                  <td colSpan={6} className="px-6 py-1.5 text-gray-500">
                    <span className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5"><CheckCircle size={13} className="text-green-600" /> Verified by Treasurer</span>
                      <span className="flex items-center gap-1.5"><Clock size={13} className="text-orange-500" /> Pending verification</span>
                    </span>
                  </td>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedExpenses.length > 0 ? paginatedExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-brand-cream/30 transition-colors">
                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-[11px] lg:text-sm">{format(parseISO(exp.date), 'MMM d, yyyy')}</td>
                    <td className="px-3 lg:px-6 py-4">
                      <p className="font-bold text-brand-brown text-xs lg:text-sm">{exp.description}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Paid by: <span className="font-medium text-gray-600">{exp.paidBy}</span> <span className="hidden lg:inline text-[9px]">({exp.method})</span></p>
                    </td>
                    <td className="px-3 lg:px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full text-[8px] lg:text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200">
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-3 lg:px-6 py-4 text-right font-black text-gray-800 text-xs lg:text-sm">
                      ₱{exp.amount.toLocaleString()}
                    </td>
                    <td className="px-3 lg:px-6 py-4 text-center">
                      {canVerify ? (
                        <button
                          onClick={() => handleToggleVerify(exp)}
                          className={`inline-flex items-center justify-center p-1.5 rounded-lg transition-colors ${exp.verifiedByTreasurer ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                            }`}
                          title={exp.verifiedByTreasurer ? 'Verified by Treasurer' : 'Pending Verification'}
                        >
                          {exp.verifiedByTreasurer ? <CheckCircle size={18} className="lg:w-5 lg:h-5" /> : <Clock size={18} className="lg:w-5 lg:h-5" />}
                        </button>
                      ) : (
                        <div className={`inline-flex items-center justify-center p-1.5 rounded-lg ${exp.verifiedByTreasurer ? 'text-green-500' : 'text-orange-400'}`} title={exp.verifiedByTreasurer ? 'Verified by Treasurer' : 'Pending Verification'}>
                          {exp.verifiedByTreasurer ? <CheckCircle size={18} className="lg:w-5 lg:h-5" /> : <Clock size={18} className="lg:w-5 lg:h-5" />}
                        </div>
                      )}
                    </td>
                    <td className="px-3 lg:px-6 py-4 text-right">
                      {(() => {
                        const canEditThis = isAdmin || canEditAny || (rolePerms?.editOwn && exp.createdBy === currentUser?._id);
                        const canDeleteThis = isAdmin || canDeleteAny || (rolePerms?.deleteOwn && exp.createdBy === currentUser?._id);

                        if (!canEditThis && !canDeleteThis) return null;

                        return (
                          <div className="flex items-center justify-end gap-1 lg:gap-2">
                            {canEditThis && (
                              <button onClick={() => openModalForEdit(exp)} className="p-1.5 lg:p-2 text-gray-400 hover:text-brand-brown hover:bg-brand-sand/20 rounded-lg transition-colors">
                                <Edit2 size={16} />
                              </button>
                            )}
                            {canDeleteThis && (
                              <button onClick={() => handleDelete(exp)} className="p-1.5 lg:p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      No expenses logged in this category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-brand-brown/50 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-brand-sand flex flex-col" style={{maxHeight: 'min(92dvh, 700px)'}}>
            {/* Modal Header — shrink-0 keeps it pinned above the scroll region */}
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-brand-cream/50 shrink-0 rounded-t-2xl">
              <h3 className="text-2xl font-display text-brand-brown tracking-wide">
                {editingId ? 'Edit Expense' : 'Log New Expense'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-brand-brown transition-colors p-1 rounded-lg hover:bg-white">
                <X size={24} />
              </button>
            </div>

            {/* Scrollable form fields.
                CRITICAL: min-h-0 is required on iOS Safari — without it, a flex-1 child
                expands to its content height and overflow-y-auto never activates. */}
            <form id="expense-form" onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Description</label>
                <input
                  type="text" required placeholder="e.g. Catering 1st Day"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown"
                  >
                    {settings.expenseCategories.map((c: string) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Date</label>
                  <input
                    type="date" required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Amount (₱)</label>
                <input
                  type="number" required min="1"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border-2 border-brand-light-brown focus:outline-none focus:border-brand-brown font-bold text-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Paid By (Person)</label>
                  <input
                    type="text" required placeholder="Name"
                    value={formData.paidBy}
                    onChange={(e) => setFormData({ ...formData, paidBy: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Payment Method</label>
                  <select
                    required
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown"
                  >
                    {settings.paymentMethods.map((m: string) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            </form>

            {/* Action buttons anchored to the modal floor — NOT inside the scroll container.         */}
            {/* This prevents iOS keyboard from pushing them up when a text field is focused.         */}
            <div className="shrink-0 px-4 sm:px-6 py-3 border-t border-brand-beige flex justify-end gap-3 bg-white rounded-b-2xl">
              <button
                type="button"
                onClick={closeModal}
                className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="expense-form"
                disabled={!isNameValid}
                className="px-6 py-2.5 rounded-lg bg-brand-brown text-white font-bold hover:bg-brand-light-brown transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingId ? 'Save Changes' : 'Log Expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-brand-brown/50 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden my-4 md:my-8 border border-brand-sand max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-brand-cream/50 sticky top-0 z-20">
              <h3 className="text-2xl font-display text-brand-brown tracking-wide flex items-center gap-2">
                <Users className="text-brand-brown" /> Batch Expense Logging
              </h3>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="text-gray-400 hover:text-brand-brown transition-colors p-1 rounded-lg hover:bg-white"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleBatchSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/30 pb-24 md:pb-6">
              <div className="space-y-4">
                {batchData.map((row, idx) => {
                  return (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative group">
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button type="button" onClick={() => setBatchData(batchData.filter((_, i) => i !== idx))} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                        <div className="md:col-span-3">
                          <label className="block text-xs text-gray-500 mb-1">Description</label>
                          <input type="text" required placeholder="e.g. Lunch" value={row.description} onChange={(e) => setBatchData(batchData.map((d, i) => i === idx ? { ...d, description: e.target.value } : d))} className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Category</label>
                          <select required value={row.category} onChange={(e) => setBatchData(batchData.map((d, i) => i === idx ? { ...d, category: e.target.value as any } : d))} className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown">
                            {settings.expenseCategories.map((c: string) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Date</label>
                          <input type="date" required value={row.date} onChange={(e) => setBatchData(batchData.map((d, i) => i === idx ? { ...d, date: e.target.value } : d))} className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown tracking-tighter" />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-xs text-gray-500 mb-1">Amount</label>
                          <input type="number" required min="1" value={row.amount || ''} onChange={(e) => setBatchData(batchData.map((d, i) => i === idx ? { ...d, amount: parseInt(e.target.value) || 0 } : d))} className="w-full px-3 py-1.5 text-sm rounded-lg border-2 border-brand-light-brown focus:outline-none focus:border-brand-brown font-bold text-center" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Paid By (Name)</label>
                          <input type="text" required placeholder="Name" value={row.paidBy} onChange={(e) => setBatchData(batchData.map((d, i) => i === idx ? { ...d, paidBy: e.target.value } : d))} className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Method</label>
                          <select required value={row.method} onChange={(e) => setBatchData(batchData.map((d, i) => i === idx ? { ...d, method: e.target.value } : d))} className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown">
                            {settings.paymentMethods.map((m: string) => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button type="button" onClick={addBatchRow} className="mt-4 flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-brand-brown hover:text-brand-brown transition-colors font-medium">
                <PlusCircle size={20} /> Add Another Row
              </button>

              <div className="mt-8 pt-6 border-t border-brand-beige flex justify-end gap-3 sticky bottom-0 bg-gray-50/30 backdrop-blur-md pb-2 z-20">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={batchData.length === 0}
                  className="px-6 py-2.5 rounded-lg bg-brand-brown text-white font-bold hover:bg-brand-light-brown transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Users size={18} /> Process Batch ({batchData.length})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Delete Expense"
        message="Are you sure you want to delete this expense log? This action cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setConfirmModal({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
      />
      <ConfirmModal
        isOpen={verifyConfirm.isOpen}
        title={verifyConfirm.expense?.verifiedByTreasurer ? 'Remove Verification' : 'Confirm Verification'}
        message={`Are you sure you want to mark this as ${verifyConfirm.expense?.verifiedByTreasurer ? 'unverified' : 'verified'}? This affects the financial summary.`}
        confirmLabel="Continue"
        onCancel={() => setVerifyConfirm({ isOpen: false, expense: null })}
        onConfirm={doVerify}
      />

      {/* Mobile FAB */}
      {canAdd && (
        <div className="md:hidden fixed bottom-24 right-6 z-[30] flex flex-col gap-3">
          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="w-12 h-12 bg-white text-brand-brown rounded-full shadow-lg border-2 border-brand-sand flex items-center justify-center active:scale-95 transition-transform"
            title="Batch Add"
          >
            <Users size={20} />
          </button>
          <button
            onClick={openModalForNew}
            className="w-14 h-14 bg-brand-brown text-white rounded-full shadow-xl flex items-center justify-center active:scale-95 transition-transform"
            title="Log Expense"
          >
            <PlusCircle size={28} />
          </button>
        </div>
      )}
    </div>
  );
}
