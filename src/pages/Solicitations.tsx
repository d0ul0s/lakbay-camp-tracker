import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAppStore } from '../store';
import { PlusCircle, Edit2, Trash2, Search, X, ShieldAlert, CheckCircle, Clock } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import type { Solicitation, AppSettings } from '../types';

export default function Solicitations() {
  const { currentUser, setLoading } = useAppStore();
  const [solicitations, setSolicitations] = useState<Solicitation[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, action: () => void, title: string, message: string}>({
    isOpen: false, action: () => {}, title: '', message: ''
  });

  const initialForm = {
    sourceName: '',
    type: '',
    amount: 0,
    dateReceived: new Date().toISOString().split('T')[0],
    paymentMethod: '',
    notes: ''
  };
  const [formData, setFormData] = useState<Omit<Solicitation, 'id' | 'verifiedByTreasurer' | 'verifiedAt'>>(initialForm);

  const fetchData = async () => {
    try {
      const [solRes, setRes] = await Promise.all([
        api.get('/api/solicitations'),
        api.get('/api/settings')
      ]);
      setSolicitations(solRes.data);
      setSettings(setRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [setLoading]);

  // Block Coordinator Role
  if (currentUser?.role === 'coordinator') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center px-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-brand-beige max-w-md w-full">
          <ShieldAlert size={48} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-2xl font-display text-brand-brown mb-2">Restricted Access</h2>
          <p className="text-gray-500">Solicitations are strictly accessible to Camp Administrators and Treasurers.</p>
        </div>
      </div>
    );
  }

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Solicitation',
      message: 'Are you sure you want to delete this solicitation record? This will alter financial reports.',
      action: async () => {
        try {
          await api.delete(`/api/solicitations/${id}`);
          fetchData();
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleToggleVerified = (solicitation: Solicitation) => {
    const isNowVerified = !solicitation.verifiedByTreasurer;
    setConfirmModal({
      isOpen: true,
      title: isNowVerified ? 'Confirm Verification' : 'Remove Verification',
      message: `Are you sure you want to mark this as ${isNowVerified ? 'verified' : 'unverified'}? This affects the financial summary.`,
      action: async () => {
        try {
          await api.put(`/api/solicitations/${solicitation.id || (solicitation as any)._id}`, {
            verifiedByTreasurer: isNowVerified,
            verifiedAt: isNowVerified ? new Date().toISOString() : null
          });
          fetchData();
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const openModal = (sol?: Solicitation) => {
    if (sol) {
      setFormData({
        sourceName: sol.sourceName,
        type: sol.type,
        amount: sol.amount,
        dateReceived: new Date(sol.dateReceived).toISOString().split('T')[0],
        paymentMethod: sol.paymentMethod,
        notes: sol.notes || ''
      });
      setEditingId(sol.id || (sol as any)._id);
    } else {
      setFormData({ 
        ...initialForm, 
        type: settings?.solicitationTypes?.[0] || '',
        paymentMethod: settings?.paymentMethods?.[0] || '' 
      });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        dateReceived: new Date(formData.dateReceived).toISOString()
      };
      if (editingId) {
        await api.put(`/api/solicitations/${editingId}`, payload);
      } else {
        await api.post(`/api/solicitations`, payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = solicitations.filter(s => 
    s.sourceName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-display text-brand-brown tracking-wide">Solicitations</h2>
        <button 
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 bg-brand-brown text-white px-5 py-2.5 rounded-xl font-bold hover:bg-brand-light-brown transition-colors shadow-sm"
        >
          <PlusCircle size={20} /> Add Solicitation
        </button>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-brand-beige">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by source name or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-brown"
          />
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-xs text-gray-400 uppercase bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-4 py-4 font-medium tracking-wider">Source Name</th>
                <th className="px-4 py-4 font-medium tracking-wider">Type</th>
                <th className="px-4 py-4 font-medium tracking-wider">Amount</th>
                <th className="px-4 py-4 font-medium tracking-wider">Payment Method</th>
                <th className="px-4 py-4 font-medium tracking-wider">Date</th>
                <th className="px-4 py-4 font-medium tracking-wider text-center">Verified</th>
                <th className="px-4 py-4 font-medium tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(sol => (
                <tr key={sol.id || (sol as any)._id} className="hover:bg-brand-cream/30 transition-colors">
                  <td className="px-4 py-4 font-medium text-gray-800">{sol.sourceName}</td>
                  <td className="px-4 py-4"><span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-brand-sand/50 text-brand-brown">{sol.type}</span></td>
                  <td className="px-4 py-4 font-bold text-gray-900">₱{sol.amount.toLocaleString()}</td>
                  <td className="px-4 py-4">{sol.paymentMethod}</td>
                  <td className="px-4 py-4">{new Date(sol.dateReceived).toLocaleDateString()}</td>
                  <td className="px-4 py-4 text-center">
                    <button 
                      onClick={() => handleToggleVerified(sol)}
                      className={`inline-flex items-center justify-center p-1.5 rounded-lg transition-colors ${sol.verifiedByTreasurer ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}
                      title={sol.verifiedByTreasurer ? "Verified by Treasurer" : "Pending Verification"}
                    >
                      {sol.verifiedByTreasurer ? <CheckCircle size={20} /> : <Clock size={20} />}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openModal(sol)} className="p-2 text-gray-400 hover:text-brand-brown hover:bg-brand-sand/20 rounded-lg">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(sol.id || (sol as any)._id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-gray-400">No solicitations found.</div>}
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {filtered.map(sol => (
            <div key={sol.id || (sol as any)._id} className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col gap-3 relative">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg leading-tight">{sol.sourceName}</h3>
                  <p className="text-sm text-gray-500">{sol.type} • {sol.paymentMethod}</p>
                </div>
                <button 
                  onClick={() => handleToggleVerified(sol)}
                  className={`shrink-0 p-1.5 rounded-lg transition-colors ${sol.verifiedByTreasurer ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}
                >
                  {sol.verifiedByTreasurer ? <CheckCircle size={20} /> : <Clock size={20} />}
                </button>
              </div>
              <div className="flex justify-between items-end border-t border-gray-50 pt-3">
                <div>
                  <p className="text-xs text-gray-400">{new Date(sol.dateReceived).toLocaleDateString()}</p>
                  {sol.notes && <p className="text-xs text-gray-500 italic mt-0.5 line-clamp-1">{sol.notes}</p>}
                </div>
                <div className="text-right">
                  <div className="font-bold text-xl text-brand-brown">₱{sol.amount.toLocaleString()}</div>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <button onClick={() => openModal(sol)} className="p-1.5 text-gray-400 hover:text-brand-brown rounded-lg"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(sol.id || (sol as any)._id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">No solicitations match your search.</div>}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-brand-brown/40 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-brand-sand max-h-[90vh] flex flex-col">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-brand-cream/50 sticky top-0 z-10 shrink-0">
              <h3 className="text-2xl font-display text-brand-brown tracking-wide">
                {editingId ? 'Edit Solicitation' : 'Record Solicitation'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-brand-brown transition-colors p-1 rounded-lg">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Source / Donor Name</label>
                <input required type="text" value={formData.sourceName} onChange={e => setFormData({...formData, sourceName: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown" placeholder="e.g. John Doe, or Youth Ministry" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Type</label>
                  <select required value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown">
                    <option value="" disabled>Select Type</option>
                    {settings?.solicitationTypes?.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Amount (₱)</label>
                  <input required type="number" min="0" step="0.01" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Payment Method</label>
                  <select required value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown">
                    <option value="" disabled>Select Method</option>
                    {settings?.paymentMethods?.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Date Received</label>
                  <input required type="date" value={formData.dateReceived} onChange={e => setFormData({...formData, dateReceived: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Notes (Optional)</label>
                <textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown" placeholder="Additional details..." />
              </div>

              <div className="mt-8 pt-6 border-t border-brand-beige flex justify-end gap-3 sticky bottom-0 bg-white pb-2 z-10">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 rounded-lg bg-brand-brown text-white font-bold hover:bg-brand-light-brown transition-colors shadow-sm">{editingId ? 'Save Changes' : 'Add Solicitation'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onCancel={() => setConfirmModal({...confirmModal, isOpen: false})}
        onConfirm={() => {
          confirmModal.action();
          setConfirmModal({...confirmModal, isOpen: false});
        }}
        confirmLabel="Continue"
      />
    </div>
  );
}
