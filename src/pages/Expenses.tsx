import React, { useState, useMemo, useEffect } from 'react';
import api from '../api/axios';
import { useAppStore } from '../store';
import type { Expense, Registrant, AppSettings } from '../types';
import { PlusCircle, Filter, Trash2, Edit2, X, DollarSign, TrendingDown, TrendingUp, CheckCircle, Clock, ShieldAlert, Users, Receipt } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import ConfirmModal from '../components/ConfirmModal';



export default function Expenses() {
  const { currentUser, setLoading } = useAppStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [registrants, setRegistrants] = useState<Registrant[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    churches: [],
    ministries: [],
    expenseCategories: [],
    paymentMethods: [],
    shirtSizePhoto: null,
    merchCosts: { tshirt: 0, bag: 0, notebook: 0, pen: 0 }
  } as any);
  const [solicitations, setSolicitations] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const [expRes, regRes, setRes, solRes] = await Promise.all([
        api.get('/api/expenses').catch(() => ({ data: [] })),
        api.get('/api/registrants'),
        api.get('/api/settings'),
        api.get('/api/solicitations').catch(() => ({ data: [] }))
      ]);
      setExpenses(expRes.data);
      setRegistrants(regRes.data);
      setSolicitations(solRes.data);
      if (setRes.data) {
        setSettings({
          ...setRes.data,
          churches: setRes.data.churchList || [],
          ministries: setRes.data.ministries || [],
          expenseCategories: setRes.data.expenseCategories || [],
          paymentMethods: setRes.data.paymentMethods || []
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [setLoading]);

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
  const itemsPerPage = 10;

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
    const nowVerified = !exp.verifiedByTreasurer;
    try {
      await api.put(`/api/expenses/${(exp as any)._id || exp.id}`, {
        verifiedByTreasurer: nowVerified,
        verifiedAt: nowVerified ? new Date().toISOString() : null
      });
      fetchData();
    } catch (err) { console.error(err); }
    setVerifyConfirm({ isOpen: false, expense: null });
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
  const registrationIncome = registrants.filter(r => r.verifiedByTreasurer).reduce((sum, r) => sum + (r.amountPaid || 0), 0);
  const solicitationIncome = solicitations.filter(s => s.verifiedByTreasurer).reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalIncome = registrationIncome + solicitationIncome;

  const totalItemsExpected = registrants.length;
  const totalMerchProductionCost =
    ((settings.merchCosts?.tshirt || 0) * totalItemsExpected) +
    ((settings.merchCosts?.bag || 0) * totalItemsExpected) +
    ((settings.merchCosts?.notebook || 0) * totalItemsExpected) +
    ((settings.merchCosts?.pen || 0) * totalItemsExpected);

  const loggedExpensesTotal = expenses.filter(e => e.verifiedByTreasurer).reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalExpenses = loggedExpensesTotal + totalMerchProductionCost;

  const pendingIncome = registrants.filter(r => !r.verifiedByTreasurer).reduce((sum, r) => sum + (r.amountPaid || 0), 0) +
                        solicitations.filter(s => !s.verifiedByTreasurer).reduce((sum, s) => sum + (s.amount || 0), 0);
  const pendingExpenses = expenses.filter(e => !e.verifiedByTreasurer).reduce((sum, e) => sum + (e.amount || 0), 0);

  const netBalance = totalIncome - totalExpenses;

  // Filtered log
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => filterCategory === 'All' || e.category === filterCategory)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, filterCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const savePayload = {
      ...formData,
      date: new Date(formData.date).toISOString()
    };
    try {
      if (editingId) {
        await api.put(`/api/expenses/${editingId}`, savePayload);
      } else {
        await api.post(`/api/expenses`, savePayload);
      }
      closeModal();
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = (exp: Expense) => {
    const canDeleteOwn = isAdmin || (rolePerms?.deleteOwn === true && exp.createdBy === currentUser?._id);
    if (!canDeleteAny && !canDeleteOwn) return;
    setConfirmModal({ isOpen: true, id: (exp as any)._id || exp.id });
  };

  const confirmDelete = async () => {
    if (!confirmModal.id) return;
    try {
      await api.delete(`/api/expenses/${confirmModal.id}`);
      setConfirmModal({ isOpen: false, id: null });
      fetchData();
    } catch (err) {
      console.error(err);
    }
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

    try {
      const payload = validData.map(d => ({ ...d, date: new Date(d.date).toISOString() }));
      await api.post(`/api/expenses/batch`, { expenses: payload });
      setIsBatchModalOpen(false);
      setBatchData([]);
      fetchData();
    } catch (err) {
      console.error(err);
    }
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

  const handleMerchCostChange = async (item: string, value: number) => {
    try {
      await api.put(`/api/settings`, {
        merchCosts: { ...settings.merchCosts, [item]: value }
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const isNameValid = true;

  return (
    <div className="space-y-6">
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
      <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-beige">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-green-50 text-green-600 rounded-lg"><TrendingUp size={16} /></div>
                <p className="font-bold text-gray-400 uppercase tracking-tighter text-[10px]">Total Income</p>
              </div>
              {pendingIncome > 0 && <p className="text-[9px] text-orange-400 italic">₱{pendingIncome.toLocaleString()} pending</p>}
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-brand-beige">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-red-50 text-red-500 rounded-lg"><TrendingDown size={16} /></div>
                <p className="font-bold text-gray-400 uppercase tracking-tighter text-[10px]">Total Expenses</p>
              </div>
              <h3 className="text-2xl font-black text-red-500">₱{totalExpenses.toLocaleString()}</h3>
              {pendingExpenses > 0 && <p className="text-[9px] text-orange-400 italic">₱{pendingExpenses.toLocaleString()} pending</p>}
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
                  { id: 'tshirt', label: 'T-Shirt', val: settings.merchCosts?.tshirt },
                  { id: 'bag', label: 'Bag', val: settings.merchCosts?.bag },
                  { id: 'notebook', label: 'Notebook', val: settings.merchCosts?.notebook },
                  { id: 'pen', label: 'Pen', val: settings.merchCosts?.pen },
                ].map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <span className="text-xs font-medium text-gray-700">{item.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-400">₱</span>
                      <input
                        type="number" min="0"
                        value={item.val || ''}
                        onChange={(e) => handleMerchCostChange(item.id, parseInt(e.target.value) || 0)}
                        className="w-16 px-1.5 py-1 text-right rounded-md border border-gray-200 focus:outline-none focus:border-brand-brown text-xs font-bold"
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
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between md:items-center gap-4 bg-gray-50/30">
            <h3 className="font-display text-xl text-brand-brown tracking-wide px-1">Camp-Wide Expense Log</h3>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="py-1.5 pl-3 pr-8 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown focus:ring-1 text-sm bg-white"
              >
                <option value="All">All Categories</option>
                {settings.expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden space-y-2 px-1">
            {filteredExpenses.length > 0 ? filteredExpenses.map((exp) => (
              <div key={exp.id} className="mobile-card flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-brand-brown text-base leading-tight truncate">{exp.description}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{format(parseISO(exp.date), 'MMM d, yyyy')}</p>
                  </div>
                  <div className={`shrink-0 p-1.5 rounded-lg border shadow-sm ${exp.verifiedByTreasurer ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-orange-50 text-orange-500 border border-orange-100'}`}>
                    {canVerify ? (
                      <button onClick={() => handleToggleVerify(exp)}>
                        {exp.verifiedByTreasurer ? <CheckCircle size={18} /> : <Clock size={18} />}
                      </button>
                    ) : (
                      exp.verifiedByTreasurer ? <CheckCircle size={18} /> : <Clock size={18} />
                    )}
                  </div>
                </div>
 
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-gray-50 text-gray-400 text-[9px] font-black uppercase rounded-md border border-gray-100">{exp.category}</span>
                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-bold uppercase rounded-md border border-blue-100">{exp.method}</span>
                </div>
 
                <div className="flex items-center justify-between mt-0.5 pt-1.5 border-t border-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter shrink-0">Amount</span>
                    <span className="text-[14px] font-black text-brand-brown">₱{exp.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter shrink-0">Paid By</span>
                    <span className="text-[11px] font-bold text-gray-600 truncate">{exp.paidBy}</span>
                  </div>
                </div>
 
                {(() => {
                  const canEditThis = isAdmin || canEditAny || (rolePerms?.editOwn && exp.createdBy === currentUser?._id);
                  const canDeleteThis = isAdmin || canDeleteAny || (rolePerms?.deleteOwn && exp.createdBy === currentUser?._id);
 
                  if (!canEditThis && !canDeleteThis) return null;
 
                  return (
                    <div className="flex items-center justify-end gap-2 mt-0.5 pt-1.5 border-t border-gray-50/50">
                      {canEditThis && (
                        <button onClick={() => openModalForEdit(exp)} className="p-1.5 bg-gray-50 text-gray-400 hover:text-brand-brown rounded-lg border border-gray-100 active:bg-brand-sand/20 transition-all">
                          <Edit2 size={14} />
                        </button>
                      )}
                      {canDeleteThis && (
                        <button onClick={() => handleDelete(exp)} className="p-1.5 bg-red-50 text-red-300 hover:text-red-500 rounded-lg border border-red-100 active:bg-red-100 transition-all">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })()}
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
              <thead className="text-xs text-gray-400 uppercase bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-medium tracking-wider">Date</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Description</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Category</th>
                  <th className="px-6 py-4 font-medium tracking-wider text-right">Amount</th>
                  <th className="px-6 py-4 font-medium tracking-wider text-center">Verified</th>
                  <th className="px-6 py-4 font-medium tracking-wider text-right">Actions</th>
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
                {filteredExpenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).length > 0 ? filteredExpenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((exp) => (
                  <tr key={exp.id} className="hover:bg-brand-cream/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">{format(parseISO(exp.date), 'MMM d, yyyy')}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-brand-brown">{exp.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Paid by: <span className="font-medium text-gray-600">{exp.paidBy}</span> ({exp.method})</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200">
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-800">
                      ₱{exp.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {canVerify ? (
                        <button
                          onClick={() => handleToggleVerify(exp)}
                          className={`inline-flex items-center justify-center p-1.5 rounded-lg transition-colors ${exp.verifiedByTreasurer ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                            }`}
                          title={exp.verifiedByTreasurer ? 'Verified by Treasurer' : 'Pending Verification'}
                        >
                          {exp.verifiedByTreasurer ? <CheckCircle size={20} /> : <Clock size={20} />}
                        </button>
                      ) : (
                        <div className={`inline-flex items-center justify-center p-1.5 rounded-lg ${exp.verifiedByTreasurer ? 'text-green-500' : 'text-orange-400'}`} title={exp.verifiedByTreasurer ? 'Verified by Treasurer' : 'Pending Verification'}>
                          {exp.verifiedByTreasurer ? <CheckCircle size={20} /> : <Clock size={20} />}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(() => {
                        const canEditThis = isAdmin || canEditAny || (rolePerms?.editOwn && exp.createdBy === currentUser?._id);
                        const canDeleteThis = isAdmin || canDeleteAny || (rolePerms?.deleteOwn && exp.createdBy === currentUser?._id);

                        if (!canEditThis && !canDeleteThis) return null;

                        return (
                          <div className="flex items-center justify-end gap-2">
                            {canEditThis && (
                              <button onClick={() => openModalForEdit(exp)} className="p-2 text-gray-400 hover:text-brand-brown hover:bg-brand-sand/20 rounded-lg transition-colors">
                                <Edit2 size={16} />
                              </button>
                            )}
                            {canDeleteThis && (
                              <button onClick={() => handleDelete(exp)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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
          {Math.ceil(filteredExpenses.length / itemsPerPage) > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
              <span className="text-sm text-gray-500">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredExpenses.length)} of {filteredExpenses.length}
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
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredExpenses.length / itemsPerPage), p + 1))}
                  disabled={currentPage === Math.ceil(filteredExpenses.length / itemsPerPage)}
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
        <div className="fixed inset-0 bg-brand-brown/40 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-brand-sand max-h-[90vh] flex flex-col">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-brand-cream/50 sticky top-0 z-10">
              <h3 className="text-2xl font-display text-brand-brown tracking-wide">
                {editingId ? 'Edit Expense' : 'Log New Expense'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-brand-brown transition-colors p-1 rounded-lg hover:bg-white">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
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
                    {settings.expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
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
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none transition-colors ${isNameValid ? 'border-gray-200 focus:border-brand-brown' : 'border-red-400 focus:border-red-500 bg-red-50/30'
                      }`}
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
                    {settings.paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-brand-beige flex justify-end gap-3 sticky bottom-0 bg-white pb-2">
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
                  {editingId ? 'Save Changes' : 'Log Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-brand-brown/50 backdrop-blur-sm z-[60] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
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

            <form onSubmit={handleBatchSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/30">
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
                            {settings.expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
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
                            {settings.paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
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
