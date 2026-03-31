import React, { useState } from 'react';
import api from '../api/axios';
import { useAppStore } from '../store';
import type { Announcement, AnnouncementType } from '../types';
import { 
  PlusCircle, 
  Megaphone, 
  Bell, 
  Clock, 
  AlertTriangle, 
  Trash2, 
  Edit2, 
  X, 
  Loader2, 
  Calendar,
  ShieldAlert
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

export default function ManageAnnouncements() {
  const { announcements, currentUser, syncAnnouncement } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const isAdmin = currentUser?.role?.toLowerCase().trim() === 'admin';
  const rolePerms = currentUser?.permissionMatrix?.[currentUser.role!];
  const canManageAnnounce = isAdmin || (rolePerms?.announcements?.view === true);

  const initialForm: Omit<Announcement, '_id' | 'id' | 'createdAt' | 'updatedAt'> = {
    title: '',
    content: '',
    type: 'General',
    priority: false,
    targetDate: null
  };

  const [formData, setFormData] = useState(initialForm);

  // If not admin and no permission, show restricted
  if (!canManageAnnounce) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center px-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-brand-beige max-w-md w-full">
          <ShieldAlert size={48} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-2xl font-display text-brand-brown mb-2">Restricted Access</h2>
          <p className="text-gray-500">Only authorized coordinators or administrators can manage announcements.</p>
        </div>
      </div>
    );
  }

  const handleOpenNew = () => {
    setFormData(initialForm);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleEdit = (ann: Announcement) => {
    setFormData({
      title: ann.title,
      content: ann.content,
      type: ann.type,
      priority: ann.priority,
      targetDate: ann.targetDate ? ann.targetDate.split('T')[0] : null
    });
    setEditingId(ann._id || ann.id || null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const payload = {
        ...formData,
        targetDate: formData.targetDate ? new Date(formData.targetDate).toISOString() : null
      };

      if (editingId) {
        const res = await api.put(`/api/announcements/${editingId}`, payload);
        syncAnnouncement('updated', res.data);
        toast.success('Announcement updated!');
      } else {
        const res = await api.post('/api/announcements', payload);
        syncAnnouncement('added', res.data);
        toast.success('Announcement posted!');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save announcement');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    
    try {
      await api.delete(`/api/announcements/${id}`);
      syncAnnouncement('deleted', { _id: id, id });
      toast.success('Announcement deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const getTypeIcon = (type: AnnouncementType) => {
    switch (type) {
      case 'Alert': return <AlertTriangle className="text-red-500" size={18} />;
      case 'Reminder': return <Clock className="text-blue-500" size={18} />;
      case 'Schedule': return <Calendar className="text-green-500" size={18} />;
      default: return <Bell className="text-brand-brown" size={18} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-brown text-white rounded-2xl shadow-sm">
            <Megaphone size={24} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-display text-brand-brown tracking-wide">Camp Announcements</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Manage public updates & alerts</p>
          </div>
        </div>
        
        <button 
          onClick={handleOpenNew}
          className="flex items-center gap-2 bg-brand-brown text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-light-brown transition-all shadow-md group active:scale-95"
        >
          <PlusCircle size={20} className="group-hover:rotate-90 transition-transform duration-300" /> 
          Create Announcement
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {announcements.length > 0 ? announcements.map((ann) => (
          <div 
            key={ann._id || ann.id} 
            className={`bg-white rounded-3xl shadow-sm border overflow-hidden flex flex-col relative group hover:shadow-xl transition-all duration-500 ${ann.priority ? 'border-red-100 ring-1 ring-red-50' : 'border-brand-beige'}`}
          >
            {ann.priority && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-400 via-orange-400 to-red-400 animate-pulse"></div>
            )}
            
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-xl ${ann.priority ? 'bg-red-50' : 'bg-brand-cream'}`}>
                  {getTypeIcon(ann.type)}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(ann)} className="p-2 text-gray-400 hover:text-brand-brown hover:bg-brand-sand/20 rounded-lg transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(ann._id || ann.id!)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-xl text-brand-brown leading-none">{ann.title}</h3>
                  {ann.priority && (
                    <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[9px] font-black uppercase rounded-md animate-bounce">URGENT</span>
                  )}
                </div>
                <p className="text-gray-500 text-sm line-clamp-4 leading-relaxed">{ann.content}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between text-[10px]">
                <div className="flex flex-col">
                  <span className="text-gray-400 font-bold uppercase tracking-tighter">Category</span>
                  <span className="font-black text-brand-brown uppercase tracking-widest">{ann.type}</span>
                </div>
                {ann.targetDate && (
                  <div className="flex flex-col text-right">
                    <span className="text-gray-400 font-bold uppercase tracking-tighter">Target Date</span>
                    <span className="font-black text-blue-500">{format(parseISO(ann.targetDate), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-brand-beige">
            <Megaphone size={48} className="mx-auto text-gray-200 mb-4" />
            <h3 className="text-xl font-display text-gray-400">No announcements yet</h3>
            <p className="text-gray-400 text-sm mt-1">Click "Create Announcement" to post your first update.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-brand-brown/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden border border-brand-sand flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-brand-cream/30">
              <div>
                <h3 className="text-2xl font-display text-brand-brown tracking-tight">
                  {editingId ? 'Edit Announcement' : 'Post New Announcement'}
                </h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Live synchronized for all users</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-brand-brown">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Title</label>
                <input 
                  type="text" required maxLength={100}
                  placeholder="e.g. Mandatory Packing List"
                  className="w-full px-5 py-3.5 rounded-2xl border-2 border-brand-beige focus:border-brand-brown focus:outline-none transition-all font-bold text-brand-brown"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Type</label>
                  <select 
                    className="w-full px-5 py-3.5 rounded-2xl border-2 border-brand-beige focus:border-brand-brown focus:outline-none appearance-none bg-white font-bold text-gray-700"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value as AnnouncementType})}
                  >
                    <option value="General">General</option>
                    <option value="Alert">Alert (Urgent)</option>
                    <option value="Reminder">Reminder</option>
                    <option value="Schedule">Schedule</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1 text-right block mr-1">Target Date (Optional)</label>
                  <input 
                    type="date"
                    className="w-full px-5 py-3.5 rounded-2xl border-2 border-brand-beige focus:border-brand-brown focus:outline-none font-bold text-gray-600"
                    value={formData.targetDate || ''}
                    onChange={e => setFormData({...formData, targetDate: e.target.value || null})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Content</label>
                <textarea 
                  required rows={5}
                  placeholder="Tell your campers what's up..."
                  className="w-full px-5 py-4 rounded-2xl border-2 border-brand-beige focus:border-brand-brown focus:outline-none transition-all leading-relaxed text-gray-700"
                  value={formData.content}
                  onChange={e => setFormData({...formData, content: e.target.value})}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-brand-cream/50 rounded-2xl border border-brand-sand/50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${formData.priority ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Bell size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-brand-brown uppercase tracking-tighter">High Priority / Banner</h4>
                    <p className="text-[10px] text-gray-500 font-medium tracking-tight leading-none">Show as alert banner on login page</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, priority: !formData.priority})}
                  className={`w-14 h-8 rounded-full transition-all relative ${formData.priority ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all shadow-sm ${formData.priority ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 font-bold text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 hover:bg-gray-100 rounded-2xl"
                >
                  Discard
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-[2] py-4 bg-brand-brown text-white font-black text-lg rounded-2xl hover:bg-brand-light-brown transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="flex items-center justify-center gap-2">
                       <Loader2 className="animate-spin" size={20} />
                       SAVING...
                    </div>
                  ) : (
                    editingId ? 'UPDATE ANNOUNCEMENT' : 'PUBLISH NOW'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
