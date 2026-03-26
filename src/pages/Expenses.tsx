import React, { useState, useMemo, useEffect } from 'react';
import api from '../api/axios';
import { useAppStore } from '../store';
import type { Expense, Registrant, AppSettings } from '../types';
import { PlusCircle, Filter, Trash2, Edit2, X, DollarSign, TrendingDown, TrendingUp, Info, CheckCircle, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import ConfirmModal from '../components/ConfirmModal';

const NAME_REGEX = /^[A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*,\s[A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*\s[A-Z]\.(?:\s(?:Jr\.|III|IV|V))?$/;

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
  const isAdmin = currentUser?.role === 'admin';
  const isTreasurer = currentUser?.role === 'treasurer';
  const canVerify = isAdmin || isTreasurer;

  const [filterCategory, setFilterCategory] = useState<string>('All');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });
  const [verifyConfirm, setVerifyConfirm] = useState<{ isOpen: boolean, expense: Expense | null }>({ isOpen: false, expense: null });

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

  // Stats calculation
  const registrationIncome = registrants.reduce((sum, r) => sum + r.amountPaid, 0);
  const solicitationIncome = solicitations.reduce((sum, s) => sum + s.amount, 0);
  const totalIncome = registrationIncome + solicitationIncome;

  const totalItemsExpected = registrants.length;
  const totalMerchProductionCost =
    ((settings.merchCosts?.tshirt || 0) * totalItemsExpected) +
    ((settings.merchCosts?.bag || 0) * totalItemsExpected) +
    ((settings.merchCosts?.notebook || 0) * totalItemsExpected) +
    ((settings.merchCosts?.pen || 0) * totalItemsExpected);

  const loggedExpensesTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = loggedExpensesTotal + totalMerchProductionCost;

  const netBalance = totalIncome - totalExpenses;

  // Filtered log
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => filterCategory === 'All' || e.category === filterCategory)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, filterCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!NAME_REGEX.test(formData.paidBy)) {
      return;
    }

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

  const handleDelete = (id: string) => {
    setConfirmModal({ isOpen: true, id });
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

  const openModalForEdit = (exp: Expense) => {
    setFormData({
      ...exp,
      date: exp.date.split('T')[0]
    });
    setEditingId(exp.id);
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

  const isNameValid = !formData.paidBy || NAME_REGEX.test(formData.paidBy);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-display text-brand-brown tracking-wide">Expense Tracker</h2>
        <button
          onClick={openModalForNew}
          className="flex items-center justify-center gap-2 bg-brand-brown text-white px-5 py-2.5 rounded-xl font-bold hover:bg-brand-light-brown transition-colors shadow-sm"
        >
          <PlusCircle size={20} /> Log Expense
        </button>
      </div>

      {isAdmin && (
        <>
          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-beige">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg"><TrendingUp size={20} /></div>
                <p className="font-bold text-gray-600 uppercase tracking-wider text-sm">Total Income</p>
              </div>
              <h3 className="text-4xl font-bold text-green-600 mt-3">₱{totalIncome.toLocaleString()}</h3>
              <p className="text-xs text-gray-400 mt-2">Registration + Solicitations</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-beige">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-50 text-red-500 rounded-lg"><TrendingDown size={20} /></div>
                <p className="font-bold text-gray-600 uppercase tracking-wider text-sm">Total Expenses</p>
              </div>
              <h3 className="text-4xl font-bold text-red-500 mt-3">₱{totalExpenses.toLocaleString()}</h3>
              <p className="text-xs text-gray-400 mt-2">Manual Logs + Merch Production</p>
            </div>

            <div className={`p-6 rounded-2xl shadow-sm border ${netBalance >= 0 ? 'bg-brand-brown border-brand-brown text-white' : 'bg-red-50 border-red-200 text-red-900'}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${netBalance >= 0 ? 'bg-white/20' : 'bg-red-100 text-red-600'}`}><DollarSign size={20} /></div>
                <p className="font-bold uppercase tracking-wider text-sm opacity-90">Net Balance</p>
              </div>
              <h3 className="text-4xl font-bold mt-3">₱{netBalance.toLocaleString()}</h3>
              <p className="text-sm opacity-75 mt-2">Remaining camp funds</p>
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
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-4">
                {[
                  { id: 'tshirt', label: 'T-Shirt Cost', val: settings.merchCosts?.tshirt },
                  { id: 'bag', label: 'Drawstring Bag Cost', val: settings.merchCosts?.bag },
                  { id: 'notebook', label: 'Notebook Cost', val: settings.merchCosts?.notebook },
                  { id: 'pen', label: 'Pen Cost', val: settings.merchCosts?.pen },
                ].map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">₱</span>
                      <input
                        type="number" min="0"
                        value={item.val || ''}
                        onChange={(e) => handleMerchCostChange(item.id, parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-right rounded-md border border-gray-200 focus:outline-none focus:border-brand-brown"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                <span className="font-bold text-brand-brown">Total Est. Cost</span>
                <span className="text-xl font-bold text-gray-800">₱{totalMerchProductionCost.toLocaleString()}</span>
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

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="text-xs text-gray-400 uppercase bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-medium tracking-wider">Date</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Description</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Category</th>
                  <th className="px-6 py-4 font-medium tracking-wider text-right">Amount</th>
                  {canVerify && <th className="px-6 py-4 font-medium tracking-wider text-center">Verified</th>}
                  <th className="px-6 py-4 font-medium tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredExpenses.length > 0 ? filteredExpenses.map((exp) => (
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
                    {canVerify && (
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleVerify(exp)}
                          className={`inline-flex items-center justify-center p-1.5 rounded-lg transition-colors ${exp.verifiedByTreasurer ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                            }`}
                          title={exp.verifiedByTreasurer ? 'Verified by Treasurer' : 'Pending Verification'}
                        >
                          {exp.verifiedByTreasurer ? <CheckCircle size={20} /> : <Clock size={20} />}
                        </button>
                      </td>
                    )}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openModalForEdit(exp)} className="p-2 text-gray-400 hover:text-brand-brown hover:bg-brand-sand/20 rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(exp.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      No expenses logged in this category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
                  {!isNameValid && (
                    <p className="text-xs text-red-500 mt-1 flex items-start gap-1">
                      <Info size={14} className="shrink-0 mt-0.5" />
                      Format requirement: Last, First M. (e.g., 'Santos, Maria C.' or 'Reyes, Jose P. Jr.')
                    </p>
                  )}
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
    </div>
  );
}
