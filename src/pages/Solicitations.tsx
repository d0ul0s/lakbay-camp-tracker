import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAppStore } from '../store';
import { PlusCircle, Edit2, Trash2, Search, X, ShieldAlert, CheckCircle, Clock, HeartHandshake, Loader2 } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import type { Solicitation } from '../types';

export default function Solicitations() {
  const { currentUser, appSettings, fetchGlobalSettings, solicitations, fetchSolicitations, syncSolicitation } = useAppStore();
  
  // Use global settings with fallback
  const settings = appSettings || {
    churches: [],
    paymentMethods: [],
    solicitationTypes: []
  } as any;

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;
  const [pageSolicitations, setPageSolicitations] = useState<Solicitation[]>([]);
  const [total, setTotal] = useState(0);
  const [isFetching, setIsFetching] = useState(false);

  const fetchData = async () => {
    setIsFetching(true);
    try {
      const res = await api.get('/api/solicitations', {
        params: {
          page: currentPage,
          limit: itemsPerPage,
          search: searchTerm
        }
      });
      setPageSolicitations(res.data.solicitations);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, searchTerm]);

  // Reset pagination on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);
  
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

  useEffect(() => {
    const { hasSyncedLive } = useAppStore.getState();
    if (!hasSyncedLive) {
      fetchSolicitations(solicitations.length > 0);
      fetchGlobalSettings();
    }
  }, []);

  const isAdmin = currentUser?.role?.toLowerCase().trim() === 'admin';
  const roleKey = currentUser?.role?.toLowerCase().trim();
  const rolePerms = roleKey ? currentUser?.permissionMatrix?.[roleKey]?.solicitations : undefined;

  const canView = isAdmin || (rolePerms?.view === true);
  const canAdd = isAdmin || (rolePerms?.add === true);
  const canEditAny = isAdmin || (rolePerms?.edit === true); 
  const canDeleteAny = isAdmin || (rolePerms?.delete === true);
  const canVerify = isAdmin || (rolePerms?.verify === true);

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center px-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-brand-beige max-w-md w-full">
          <ShieldAlert size={48} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-2xl font-display text-brand-brown mb-2">Restricted Access</h2>
          <p className="text-gray-500">You do not have permission to view Solicitations.</p>
        </div>
      </div>
    );
  }

  const handleDelete = (sol: Solicitation) => {
    const canDeleteThis = isAdmin || (canDeleteAny && sol.createdBy === currentUser?._id);
    if (!canDeleteThis) return;

    const solId = sol.id || (sol as any)._id;
    setConfirmModal({
      isOpen: true,
      title: 'Delete Solicitation',
      message: 'Are you sure you want to delete this solicitation record? This will alter financial reports.',
      action: () => {
        syncSolicitation('deleted', { _id: solId, id: solId });
        api.delete(`/api/solicitations/${solId}`).then(() => fetchData()).catch(err => {
          console.error(err);
          fetchSolicitations(true);
        });
      }
    });
  };

  const handleToggleVerified = (solicitation: Solicitation) => {
    const isNowVerified = !solicitation.verifiedByTreasurer;
    const solId = solicitation.id || (solicitation as any)._id;
    
    setConfirmModal({
      isOpen: true,
      title: isNowVerified ? 'Confirm Verification' : 'Remove Verification',
      message: `Are you sure you want to mark this as ${isNowVerified ? 'verified' : 'unverified'}? This affects the financial summary.`,
      action: () => {
        syncSolicitation('updated', { 
          _id: solId, 
          id: solId, 
          verifiedByTreasurer: isNowVerified,
          verifiedAt: isNowVerified ? new Date().toISOString() : null
        });
        
        api.put(`/api/solicitations/${solId}`, {
          verifiedByTreasurer: isNowVerified,
          verifiedAt: isNowVerified ? new Date().toISOString() : null
        }).then(() => fetchData()).catch(err => {
          console.error(err);
          fetchSolicitations(true);
        });
      }
    });
  };

  const openModal = (sol?: Solicitation) => {
    if (sol) {
      const canEditThis = isAdmin || (canEditAny && sol.createdBy === currentUser?._id);
      if (!canEditThis) return;

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
      const { id, _id, __v, createdAt, updatedAt, createdBy, ...cleanData } = formData as any;
      const payload = {
        ...cleanData,
        dateReceived: new Date(formData.dateReceived).toISOString()
      };
      
      if (editingId) {
        syncSolicitation('updated', { ...payload, _id: editingId, id: editingId });
        setIsModalOpen(false);
        api.put(`/api/solicitations/${editingId}`, payload).then(() => fetchData()).catch(err => {
          console.error(err);
          fetchSolicitations(true);
        });
      } else {
        const tempId = `temp-${Date.now()}`;
        const optimisticNew = {
          ...payload,
          _id: tempId,
          id: tempId,
          createdBy: currentUser?._id,
          dateReceived: payload.dateReceived
        };
        syncSolicitation('added', optimisticNew);
        setIsModalOpen(false);

        api.post(`/api/solicitations`, payload).then((res) => {
          syncSolicitation('deleted', { _id: tempId, id: tempId });
          syncSolicitation('added', res.data);
          fetchData();
        }).catch(err => {
          console.error(err);
          syncSolicitation('deleted', { _id: tempId, id: tempId });
          fetchSolicitations(true);
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = pageSolicitations;
  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <div className="space-y-6 pb-20 md:pb-6 relative">
      {isFetching && (
        <div className="absolute top-0 right-0 p-2 z-10">
          <Loader2 className="animate-spin text-brand-brown w-6 h-6" />
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <h2 className="text-2xl md:text-3xl font-display text-brand-brown tracking-wide mb-1 md:mb-0">Solicitations</h2>
        {canAdd && (
          <button 
            onClick={() => openModal()}
            className="flex items-center justify-center gap-1.5 bg-brand-brown text-white px-3 py-2 rounded-lg font-bold hover:bg-brand-light-brown transition-colors shadow-sm text-xs"
          >
            <PlusCircle size={16} /> Add New
          </button>
        )}
      </div>

      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-brand-beige">
        <div className="relative mb-3 lg:mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold" size={18} />
          <input 
            type="text" 
            placeholder="Search sources or types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-brown text-xs lg:text-sm bg-white font-medium"
          />
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-[10px] lg:text-xs text-gray-400 uppercase bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-2 lg:px-4 py-4 font-medium tracking-wider">Source Name</th>
                <th className="px-2 lg:px-4 py-4 font-medium tracking-wider text-center">Type</th>
                <th className="px-2 lg:px-4 py-4 font-medium tracking-wider">Amount</th>
                <th className="px-2 lg:px-4 py-4 font-medium tracking-wider">Method</th>
                <th className="px-2 lg:px-4 py-4 font-medium tracking-wider text-center">Date</th>
                <th className="px-2 lg:px-4 py-4 font-medium tracking-wider text-center">Verified</th>
                <th className="px-2 lg:px-4 py-4 font-medium tracking-wider text-right">Actions</th>
              </tr>
              <tr className="bg-green-50/40 text-[9px] lg:text-xs border-b border-gray-100">
                <td colSpan={7} className="px-2 lg:px-4 py-1.5 text-gray-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-600" /> Verified by Treasurer</span>
                    <span className="flex items-center gap-1.5"><Clock size={12} className="text-orange-500" /> Pending verification</span>
                  </div>
                </td>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(sol => (
                <tr key={sol.id || (sol as any)._id} className="hover:bg-brand-cream/30 transition-colors">
                  <td className="px-2 lg:px-4 py-4 font-black text-brand-brown text-[11px] lg:text-sm leading-tight">{sol.sourceName}</td>
                  <td className="px-2 lg:px-4 py-4 text-center"><span className="px-1.5 py-0.5 rounded-full text-[8px] lg:text-xs font-black uppercase bg-brand-sand/30 text-brand-brown border border-brand-sand/20">{sol.type}</span></td>
                  <td className="px-2 lg:px-4 py-4 font-black text-gray-900 text-[11px] lg:text-sm whitespace-nowrap">₱{sol.amount.toLocaleString()}</td>
                  <td className="px-2 lg:px-4 py-4 text-[10px] lg:text-sm whitespace-nowrap">{sol.paymentMethod?.split(' ')[0]}</td>
                  <td className="px-2 lg:px-4 py-4 text-[10px] lg:text-sm text-center whitespace-nowrap">{new Date(sol.dateReceived).toLocaleDateString([], { month: '2-digit', day: '2-digit', year: '2-digit' })}</td>
                  <td className="px-2 lg:px-4 py-4 text-center">
                    {canVerify ? (
                      <button 
                        onClick={() => handleToggleVerified(sol)}
                        className={`inline-flex items-center justify-center p-1.5 rounded-lg transition-colors ${sol.verifiedByTreasurer ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}
                        title={sol.verifiedByTreasurer ? "Verified by Treasurer" : "Pending Verification"}
                      >
                        {sol.verifiedByTreasurer ? <CheckCircle size={18} className="lg:w-5 lg:h-5" /> : <Clock size={18} className="lg:w-5 lg:h-5" />}
                      </button>
                    ) : (
                      <div className={`inline-flex items-center justify-center p-1.5 rounded-lg ${sol.verifiedByTreasurer ? 'text-green-500' : 'text-orange-400'}`}>
                        {sol.verifiedByTreasurer ? <CheckCircle size={18} className="lg:w-5 lg:h-5" /> : <Clock size={18} className="lg:w-5 lg:h-5" />}
                      </div>
                    )}
                  </td>
                  <td className="px-2 lg:px-4 py-4 text-right">
                    {(() => {
                      const canEditThis = isAdmin || (canEditAny && sol.createdBy === currentUser?._id);
                      const canDeleteThis = isAdmin || (canDeleteAny && sol.createdBy === currentUser?._id);
                      
                      if (!canEditThis && !canDeleteThis) return null;

                      return (
                        <div className="flex items-center justify-end gap-0.5 lg:gap-2">
                          {canEditThis && (
                            <button onClick={() => openModal(sol)} className="p-1 lg:p-2 text-gray-400 hover:text-brand-brown hover:bg-brand-sand/20 rounded-lg">
                              <Edit2 size={14} className="lg:w-4 lg:h-4" />
                            </button>
                          )}
                          {canDeleteThis && (
                            <button onClick={() => handleDelete(sol)} className="p-1 lg:p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                              <Trash2 size={14} className="lg:w-4 lg:h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-gray-400">No solicitations found.</div>}
        </div>
        
        {/* Mobile Card View */}
        <div className="md:hidden space-y-2">
          {filtered.map(sol => (
            <div key={sol.id || (sol as any)._id} className="mobile-card flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-brand-brown text-base leading-tight truncate">{sol.sourceName}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="px-1.5 py-0.5 bg-brand-sand/30 text-brand-brown text-[9px] font-black uppercase rounded-md border border-brand-sand/50">{sol.type}</span>
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-bold uppercase rounded-md border border-blue-100">{sol.paymentMethod}</span>
                  </div>
                </div>
                <div className={`shrink-0 p-1.5 rounded-lg border shadow-sm transition-all ${sol.verifiedByTreasurer ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-orange-50 text-orange-500 border border-orange-100'}`}>
                  {canVerify ? (
                    <button onClick={() => handleToggleVerified(sol)}>
                      {sol.verifiedByTreasurer ? <CheckCircle size={18} /> : <Clock size={18} />}
                    </button>
                  ) : (
                    sol.verifiedByTreasurer ? <CheckCircle size={18} /> : <Clock size={18} />
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-0.5 pt-1.5 border-t border-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter shrink-0">Amount</span>
                  <span className="text-[14px] font-black text-brand-brown">₱{sol.amount.toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-gray-600">{new Date(sol.dateReceived).toLocaleDateString()}</p>
                </div>
              </div>
 
              {sol.notes && (
                <div className="bg-gray-50 p-1.5 rounded-md border border-gray-100">
                  <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Notes</p>
                  <p className="text-[10px] text-gray-600 italic line-clamp-1">{sol.notes}</p>
                </div>
              )}
 
              {(() => {
                const canEditThis = isAdmin || (canEditAny && sol.createdBy === currentUser?._id);
                const canDeleteThis = isAdmin || (canDeleteAny && sol.createdBy === currentUser?._id);
                
                if (!canEditThis && !canDeleteThis) return null;
 
                return (
                  <div className="flex items-center justify-end gap-2 mt-0.5 pt-1.5 border-t border-gray-50/50">
                    {canEditThis && (
                      <button onClick={() => openModal(sol)} className="p-1.5 bg-gray-50 text-gray-400 hover:text-brand-brown rounded-lg border border-gray-100 active:bg-brand-sand/20 transition-all"><Edit2 size={14} /></button>
                    )}
                    {canDeleteThis && (
                      <button onClick={() => handleDelete(sol)} className="p-1.5 bg-red-50 text-red-300 hover:text-red-500 rounded-lg border border-red-100 active:bg-red-100 transition-all"><Trash2 size={14} /></button>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="mobile-card py-12 text-center text-gray-400">
              <HeartHandshake size={48} className="mx-auto opacity-10 mb-2" />
              <p className="text-sm">No solicitations match your search.</p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium disabled:opacity-50 text-gray-600 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-brand-brown text-brand-brown text-sm font-bold disabled:opacity-50 hover:bg-brand-sand/20"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-brand-brown/40 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-brand-sand max-h-[92vh] flex flex-col">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-brand-cream/50 sticky top-0 z-10 shrink-0">
              <h3 className="text-2xl font-display text-brand-brown tracking-wide">
                {editingId ? 'Edit Solicitation' : 'Record Solicitation'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-brand-brown transition-colors p-1 rounded-lg">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 pb-24 md:pb-6">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Source / Donor Name</label>
                <input required type="text" value={formData.sourceName} onChange={e => setFormData({...formData, sourceName: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown" placeholder="e.g. John Doe, or Youth Ministry" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Type</label>
                  <select required value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown">
                    <option value="" disabled>Select Type</option>
                    {settings?.solicitationTypes?.map((t: string) => <option key={t} value={t}>{t}</option>)}
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
                    {settings?.paymentMethods?.map((m: string) => <option key={m} value={m}>{m}</option>)}
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

      {/* Mobile FAB */}
      {canAdd && (
        <div className="md:hidden fixed bottom-24 right-6 z-[30]">
          <button
            onClick={() => openModal()}
            className="w-14 h-14 bg-brand-brown text-white rounded-full shadow-xl flex items-center justify-center active:scale-95 transition-transform"
            title="Add Solicitation"
          >
            <PlusCircle size={28} />
          </button>
        </div>
      )}
    </div>
  );
}
