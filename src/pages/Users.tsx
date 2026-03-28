import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAppStore } from '../store';
import { PlusCircle, Edit2, Trash2, X, ShieldAlert } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import PermissionMatrix from '../components/PermissionMatrix';
import type { AppSettings } from '../types';

interface AppUser {
  _id: string;
  pin: string;
  role: 'admin' | 'coordinator' | 'treasurer';
  church: string;
}

export default function Users() {
  const { currentUser, users, fetchUsers, appSettings, fetchGlobalSettings } = useAppStore();
  const [settings, setSettings] = useState<AppSettings>({ churches: [], merchCosts: {} } as any);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialForm = {
    church: '',
    pin: '',
    role: 'coordinator' as 'admin' | 'coordinator' | 'treasurer'
  };
  const [formData, setFormData] = useState(initialForm);

  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, id: string | null}>({isOpen: false, id: null});

  const fetchData = async (silent = false) => {
    try {
      await Promise.all([
        fetchUsers(silent),
        fetchGlobalSettings()
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // If we already have users in the store, do a silent refresh.
    // Otherwise, do a foreground fetch.
    fetchData(users.length > 0);
  }, []);

  useEffect(() => {
    if (appSettings) {
      setSettings(appSettings);
    }
  }, [appSettings]);

  if (currentUser?.role?.toLowerCase().trim() !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center px-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-brand-beige max-w-md w-full">
          <ShieldAlert size={48} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-2xl font-display text-brand-brown mb-2">Restricted Access</h2>
          <p className="text-gray-500">User Management is strictly reserved for Camp Administrators.</p>
        </div>
      </div>
    );
  }

  const handleDelete = (id: string) => {
    setConfirmModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (!confirmModal.id) return;
    try {
      await api.delete(`/api/auth/users/${confirmModal.id}`);
      setConfirmModal({ isOpen: false, id: null });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const openModalForNew = () => {
    setFormData({ ...initialForm, church: settings.churches[0] || '' });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openModalForEdit = (usr: AppUser) => {
    setFormData({
      church: usr.church,
      pin: '', // Do not display original PIN, leave blank unless changing
      role: usr.role
    });
    setEditingId(usr._id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      church: formData.church,
      role: formData.role
    };
    if (formData.pin.trim()) payload.pin = formData.pin.trim();

    try {
      if (editingId) {
        await api.put(`/api/auth/users/${editingId}`, payload);
      } else {
        if (!payload.pin) throw new Error("PIN is required for new users.");
        await api.post(`/api/auth/register`, payload);
      }
      closeModal();
      fetchData();
    } catch (err) {
      console.error(err);
      alert((err as any).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-display text-brand-brown tracking-wide">User Management</h2>
        <button 
          onClick={openModalForNew}
          className="flex items-center justify-center gap-2 bg-brand-brown text-white px-5 py-2.5 rounded-xl font-bold hover:bg-brand-light-brown transition-colors shadow-sm"
        >
          <PlusCircle size={20} /> Add Coordinator
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-beige overflow-hidden">
        {/* Mobile Card View */}
        <div className="md:hidden space-y-3 px-1">
          {users.map((usr) => (
            <div key={usr._id} className="mobile-card flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-black text-brand-brown text-lg leading-tight truncate">
                    {usr.role?.toLowerCase().trim() === 'admin' ? 'System Administrator' : usr.church}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                      usr.role?.toLowerCase().trim() === 'admin' ? 'bg-brand-brown text-white border-brand-brown' : 'bg-gray-100 text-gray-500 border-gray-200'
                    }`}>
                      {usr.role}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openModalForEdit(usr)} className="p-2.5 bg-gray-50 text-gray-400 hover:text-brand-brown rounded-xl border border-gray-100 active:bg-brand-sand/20 transition-all">
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(usr._id)} 
                    disabled={usr.role?.toLowerCase().trim() === 'admin' && users.filter(u => u.role?.toLowerCase().trim() === 'admin').length === 1}
                    className="p-2.5 bg-red-50 text-red-300 hover:text-red-500 rounded-xl border border-red-100 active:bg-red-100 transition-all disabled:opacity-30"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <div className="mt-1 pt-2 border-t border-gray-50 flex items-center justify-between">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Access Context</span>
                <span className="text-[10px] font-black text-gray-700 uppercase tracking-tighter">
                  {usr.role?.toLowerCase().trim() === 'admin' ? 'Global Access' : `Church Restricted: ${usr.church}`}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-xs text-gray-400 uppercase bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-medium tracking-wider">Role</th>
                <th className="px-6 py-4 font-medium tracking-wider">Church Assignment</th>
                <th className="px-6 py-4 font-medium tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((usr) => (
                <tr key={usr._id} className="hover:bg-brand-cream/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                      usr.role?.toLowerCase().trim() === 'admin' ? 'bg-brand-brown text-white' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {usr.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-800">
                    {usr.role?.toLowerCase().trim() === 'admin' ? 'Global Access (Admin HQ)' : usr.church}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openModalForEdit(usr)} className="p-2 text-gray-400 hover:text-brand-brown hover:bg-brand-sand/20 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(usr._id)} 
                        disabled={usr.role?.toLowerCase().trim() === 'admin' && users.filter(u => u.role?.toLowerCase().trim() === 'admin').length === 1}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                        title={usr.role?.toLowerCase().trim() === 'admin' && users.filter(u => u.role?.toLowerCase().trim() === 'admin').length === 1 ? "Cannot delete the only admin" : "Delete user"}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pt-10 border-t border-brand-beige">
        <PermissionMatrix />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-brand-brown/40 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-brand-sand max-h-[90vh] flex flex-col">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-brand-cream/50 sticky top-0 z-10 shrink-0">
              <h3 className="text-2xl font-display text-brand-brown tracking-wide">
                {editingId ? 'Edit Coordinator' : 'Add Coordinator'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-brand-brown transition-colors p-1 rounded-lg hover:bg-white">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Assigned Church</label>
                <select
                  required
                  value={formData.church}
                  onChange={(e) => setFormData({...formData, church: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown"
                >
                  <option value="" disabled>Select Church</option>
                  {settings.churches.map((c: string) => <option key={c} value={c}>{c}</option>)}
                </select>
                <p className="text-xs text-brand-light-brown mt-1">Sourced from Settings Church List.</p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">Access PIN</label>
                <input 
                  type="password" 
                  required={!editingId}
                  value={formData.pin}
                  onChange={(e) => setFormData({...formData, pin: e.target.value})}
                  placeholder={editingId ? "Leave blank to keep current PIN" : "Setup a PIN code"}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown font-mono"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Role</label>
                {editingId && formData.role?.toLowerCase().trim() === 'admin' ? (
                  <input 
                    type="text" 
                    disabled 
                    value="admin"
                    className="w-full px-3 py-2 rounded-lg border border-gray-100 bg-gray-50 text-gray-500 font-medium tracking-wide uppercase"
                  />
                ) : (
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown"
                  >
                    <option value="coordinator">Coordinator</option>
                    <option value="treasurer">Treasurer</option>
                  </select>
                )}
                <p className="text-xs text-brand-light-brown mt-1">Warning: System allows only ONE active treasurer at a time.</p>
              </div>



              <div className="mt-8 pt-6 border-t border-brand-beige flex justify-end gap-3 sticky bottom-0 bg-white pb-2 z-10">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 rounded-lg bg-brand-brown text-white font-bold hover:bg-brand-light-brown transition-colors shadow-sm"
                >
                  {editingId ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title="Delete User"
        message="Are you sure you want to delete this user? They will immediately lose access to the portal."
        confirmLabel="Delete User"
        onCancel={() => setConfirmModal({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
