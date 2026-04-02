import { useEffect, useState } from 'react';
import api from '../api/axios';
import type { WorshipSession, Song } from '../types';
import { 
  Music, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  GripVertical, 
  Calendar,
  Layers,
  Type,
  Mic2,
  Hash,
  Link2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

export default function ManageWorship() {
  const [sessions, setSessions] = useState<WorshipSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Partial<WorshipSession> | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/api/worship');
      setSessions(res.data);
    } catch (err) {
      toast.error('Failed to load worship sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (session?: WorshipSession) => {
    setEditingSession(session ? JSON.parse(JSON.stringify(session)) : {
      title: '',
      sessionDate: new Date().toISOString(),
      description: '',
      songs: [],
      isActive: true,
      order: sessions.length
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingSession?.title) {
        toast.error('Session title is required');
        return;
    }

    try {
      if (editingSession.id || editingSession._id) {
        const id = editingSession.id || editingSession._id;
        await api.put(`/api/worship/${id}`, editingSession);
        toast.success('Session updated successfully');
      } else {
        await api.post('/api/worship', editingSession);
        toast.success('Session created successfully');
      }
      setIsModalOpen(false);
      fetchSessions();
    } catch (err) {
      toast.error('Failed to save session');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this session?')) return;
    try {
      await api.delete(`/api/worship/${id}`);
      toast.success('Session deleted');
      fetchSessions();
    } catch (err) {
      toast.error('Failed to delete session');
    }
  };

  // Song Management
  const addSong = () => {
    if (!editingSession) return;
    const newSongs = [...(editingSession.songs || [])];
    newSongs.push({
      title: '',
      artist: '',
      key: '',
      lyricsUrl: '',
      notes: '',
      order: newSongs.length
    });
    setEditingSession({ ...editingSession, songs: newSongs });
  };

  const removeSong = (index: number) => {
    if (!editingSession) return;
    const newSongs = [...(editingSession.songs || [])];
    newSongs.splice(index, 1);
    // Re-order
    newSongs.forEach((s, i) => s.order = i);
    setEditingSession({ ...editingSession, songs: newSongs });
  };

  const updateSong = (index: number, field: keyof Song, value: any) => {
    if (!editingSession) return;
    const newSongs = [...(editingSession.songs || [])];
    newSongs[index] = { ...newSongs[index], [field]: value };
    setEditingSession({ ...editingSession, songs: newSongs });
  };

  const moveSong = (index: number, direction: 'up' | 'down') => {
    if (!editingSession) return;
    const newSongs = [...(editingSession.songs || [])];
    if (direction === 'up' && index > 0) {
        [newSongs[index], newSongs[index - 1]] = [newSongs[index - 1], newSongs[index]];
    } else if (direction === 'down' && index < newSongs.length - 1) {
        [newSongs[index], newSongs[index + 1]] = [newSongs[index + 1], newSongs[index]];
    }
    newSongs.forEach((s, i) => s.order = i);
    setEditingSession({ ...editingSession, songs: newSongs });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-brand-brown">Worship Lineup</h1>
          <p className="text-xs text-brand-light-brown font-black uppercase tracking-widest mt-1 opacity-60">Praise & Worship Team Management</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-brand-brown text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-brand-light-brown transition-all shadow-md active:scale-95"
        >
          <Plus size={18} /> New Session
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center opacity-40">
          <Music className="w-12 h-12 animate-bounce-slow text-brand-brown mb-4" />
          <p className="font-black uppercase tracking-widest text-[10px]">Loading Setlists...</p>
        </div>
      ) : sessions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <div key={session.id} className="bg-white border border-brand-sand/20 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all group">
               <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-brand-brown/5 flex items-center justify-center text-brand-brown">
                        <Calendar size={20} />
                     </div>
                     <div>
                        <h3 className="font-display text-xl text-brand-brown leading-none">{session.title}</h3>
                        <p className="text-[10px] font-black text-brand-brown/40 uppercase tracking-tighter mt-1">
                           {session.sessionDate ? format(parseISO(session.sessionDate), 'MMM d, h:mm a') : 'No Date Set'}
                        </p>
                     </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => handleOpenModal(session)} className="p-2 text-brand-brown/60 hover:text-brand-brown hover:bg-brand-brown/5 rounded-lg transition-all" title="Edit">
                        <Edit2 size={16} />
                     </button>
                     <button onClick={() => handleDelete(session.id)} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                        <Trash2 size={16} />
                     </button>
                  </div>
               </div>

               <div className="space-y-2 mb-4">
                  {session.songs && session.songs.length > 0 ? (
                    session.songs.slice(0, 3).map((song, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                           <span className="w-4 font-mono text-[10px] text-brand-brown/20">{i+1}</span>
                           <span className="font-bold text-brand-brown/70 truncate">{song.title}</span>
                           <span className="text-[10px] opacity-40 ml-auto">{song.key || '-'}</span>
                        </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-gray-400 italic">No songs added yet.</p>
                  )}
                  {session.songs && session.songs.length > 3 && (
                    <p className="text-[10px] text-brand-sand font-black uppercase tracking-widest pl-6">
                        + {session.songs.length - 3} more songs
                    </p>
                  )}
               </div>

               <div className="pt-4 border-t border-brand-sand/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <div className={`w-2 h-2 rounded-full ${session.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                     <span className="text-[10px] font-black uppercase tracking-widest text-brand-brown/40">
                        {session.isActive ? 'Published' : 'Draft'}
                     </span>
                  </div>
                  <span className="text-[9px] font-black bg-brand-sand/10 text-brand-brown/60 px-2.5 py-1 rounded-full uppercase tracking-widest">
                     {session.songs?.length || 0} Songs
                  </span>
               </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white/40 border-2 border-dashed border-brand-sand/30 rounded-[3rem]">
          <Music className="w-16 h-16 text-brand-sand/30 mx-auto mb-4" />
          <h3 className="text-2xl font-display text-brand-brown/60">No Worship Sessions</h3>
          <p className="text-brand-brown/40 text-[10px] font-black uppercase tracking-widest mt-2">Start by creating the first lineup for Lakbay 2026</p>
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && editingSession && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-brown/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden border border-white/20 select-none">
             {/* Modal Header */}
             <div className="p-6 md:p-8 bg-brand-cream/30 border-b border-brand-sand/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-brand-brown text-white flex items-center justify-center shadow-lg">
                      <Music size={24} />
                   </div>
                   <div>
                      <h2 className="text-2xl font-display text-brand-brown">{editingSession.id || editingSession._id ? 'Edit Lineup' : 'New Lineup'}</h2>
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-brown/40">Configure session details and song list</p>
                   </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 text-brand-brown/40 hover:text-brand-brown hover:bg-brand-brown/5 rounded-2xl transition-all">
                   <X size={24} />
                </button>
             </div>

             {/* Modal Body */}
             <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scrollbar-hide">
                {/* Basic Info Section */}
                <div className="space-y-5">
                   <div className="flex items-center gap-2 mb-2">
                       <Type size={14} className="text-brand-sand" />
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-brown/60">Session Information</span>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold text-brand-brown/40 uppercase tracking-widest ml-1">Session Title</label>
                         <input 
                            type="text" 
                            value={editingSession.title}
                            onChange={(e) => setEditingSession({ ...editingSession, title: e.target.value })}
                            className="w-full bg-brand-cream/20 border border-brand-sand/20 rounded-2xl px-5 py-3.5 outline-none focus:border-brand-brown transition-all text-sm font-bold text-brand-brown"
                            placeholder="e.g. Night 1 Worship"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold text-brand-brown/40 uppercase tracking-widest ml-1">Session Time</label>
                         <input 
                            type="datetime-local" 
                            value={editingSession.sessionDate ? format(parseISO(editingSession.sessionDate), "yyyy-MM-dd'T'HH:mm") : ''}
                            onChange={(e) => setEditingSession({ ...editingSession, sessionDate: new Date(e.target.value).toISOString() })}
                            className="w-full bg-brand-cream/20 border border-brand-sand/20 rounded-2xl px-5 py-3.5 outline-none focus:border-brand-brown transition-all text-sm font-bold text-brand-brown"
                         />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-brand-brown/40 uppercase tracking-widest ml-1">Short Description</label>
                      <textarea 
                         value={editingSession.description}
                         onChange={(e) => setEditingSession({ ...editingSession, description: e.target.value })}
                         className="w-full bg-brand-cream/20 border border-brand-sand/20 rounded-2xl px-5 py-3.5 outline-none focus:border-brand-brown transition-all text-sm font-medium text-brand-brown h-20 resize-none"
                         placeholder="Optional notes or session theme..."
                      />
                   </div>

                   <div className="flex items-center gap-3 bg-brand-cream/20 p-3 rounded-2xl border border-brand-sand/10">
                      <input 
                         type="checkbox" 
                         id="isActive"
                         checked={editingSession.isActive}
                         onChange={(e) => setEditingSession({ ...editingSession, isActive: e.target.checked })}
                         className="w-5 h-5 rounded-lg border-brand-sand text-brand-brown focus:ring-brand-brown"
                      />
                      <label htmlFor="isActive" className="text-xs font-bold text-brand-brown uppercase tracking-widest">Publish to public view</label>
                   </div>
                </div>

                {/* Songs Section */}
                <div className="space-y-5 pt-4 border-t border-brand-sand/10">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Layers size={14} className="text-brand-sand" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-brown/60">Song Setlist ({editingSession.songs?.length || 0})</span>
                        </div>
                        <button 
                            onClick={addSong}
                            className="flex items-center gap-1.5 text-brand-brown hover:bg-brand-brown/5 px-3 py-1.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest border border-brand-brown/10"
                        >
                            <Plus size={14} /> Add Song
                        </button>
                    </div>

                    <div className="space-y-4">
                        {editingSession.songs && editingSession.songs.length > 0 ? (
                            editingSession.songs.map((song, sIdx) => (
                                <div key={sIdx} className="relative group/song bg-white border border-brand-sand/20 rounded-3xl p-5 shadow-sm space-y-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2 ml-1">
                                                        <Mic2 size={10} className="text-brand-sand" />
                                                        <label className="text-[8px] font-black uppercase tracking-widest text-brand-brown/40">Song Title</label>
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={song.title}
                                                        onChange={(e) => updateSong(sIdx, 'title', e.target.value)}
                                                        className="w-full bg-brand-cream/10 border-b border-brand-sand/20 px-1 py-1 outline-none focus:border-brand-brown transition-all text-sm font-bold text-brand-brown placeholder:text-brand-brown/10"
                                                        placeholder="e.g. Goodness of God"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2 ml-1">
                                                        <Type size={10} className="text-brand-sand" />
                                                        <label className="text-[8px] font-black uppercase tracking-widest text-brand-brown/40">Artist</label>
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={song.artist}
                                                        onChange={(e) => updateSong(sIdx, 'artist', e.target.value)}
                                                        className="w-full bg-brand-cream/10 border-b border-brand-sand/20 px-1 py-1 outline-none focus:border-brand-brown transition-all text-sm font-medium text-brand-brown/80 placeholder:text-brand-brown/10"
                                                        placeholder="e.g. Bethel Music"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2 ml-1">
                                                        <Hash size={10} className="text-brand-sand" />
                                                        <label className="text-[8px] font-black uppercase tracking-widest text-brand-brown/40">Musical Key</label>
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={song.key}
                                                        onChange={(e) => updateSong(sIdx, 'key', e.target.value)}
                                                        className="w-full bg-brand-cream/10 border-b border-brand-sand/20 px-1 py-1 outline-none focus:border-brand-brown transition-all text-xs font-black text-brand-brown/60 uppercase"
                                                        placeholder="G, D, Am..."
                                                    />
                                                </div>
                                                <div className="md:col-span-2 space-y-1.5">
                                                    <div className="flex items-center gap-2 ml-1">
                                                        <Link2 size={10} className="text-brand-sand" />
                                                        <label className="text-[8px] font-black uppercase tracking-widest text-brand-brown/40">Lyrics/Resource Link</label>
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={song.lyricsUrl}
                                                        onChange={(e) => updateSong(sIdx, 'lyricsUrl', e.target.value)}
                                                        className="w-full bg-brand-cream/10 border-b border-brand-sand/20 px-1 py-1 outline-none focus:border-brand-brown transition-all text-xs font-medium text-brand-brown/40 italic"
                                                        placeholder="URL to chords or lyrics..."
                                                    />
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-1.5">
                                                <label className="text-[8px] font-black uppercase tracking-widest text-brand-brown/40 ml-1">Notes</label>
                                                <input 
                                                    type="text" 
                                                    value={song.notes}
                                                    onChange={(e) => updateSong(sIdx, 'notes', e.target.value)}
                                                    className="w-full bg-brand-cream/10 border-b border-brand-sand/20 px-1 py-1 outline-none focus:border-brand-brown transition-all text-[10px] text-brand-brown/60"
                                                    placeholder="e.g. Build up bridge, Intro keyboard only..."
                                                />
                                            </div>
                                        </div>

                                        {/* Action Stack */}
                                        <div className="flex flex-col gap-2 pt-4">
                                            <button 
                                                onClick={() => removeSong(sIdx)}
                                                className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                title="Remove Song"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <div className="flex flex-col border border-brand-sand/20 rounded-xl overflow-hidden mt-auto">
                                                <button 
                                                    disabled={sIdx === 0}
                                                    onClick={() => moveSong(sIdx, 'up')}
                                                    className="p-2 text-brand-brown/20 hover:text-brand-brown hover:bg-brand-brown/5 disabled:opacity-20 transition-all border-b border-brand-sand/20"
                                                >
                                                    <Edit2 size={12} className="-rotate-90" />
                                                </button>
                                                <button 
                                                    disabled={sIdx === (editingSession.songs?.length || 0) - 1}
                                                    onClick={() => moveSong(sIdx, 'down')}
                                                    className="p-2 text-brand-brown/20 hover:text-brand-brown hover:bg-brand-brown/5 disabled:opacity-20 transition-all"
                                                >
                                                    <Edit2 size={12} className="rotate-90" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 opacity-20 group-hover/song:opacity-60 transition-opacity">
                                        <GripVertical size={20} className="text-brand-brown" />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <button 
                                onClick={addSong}
                                className="w-full py-10 flex flex-col items-center justify-center bg-brand-cream/10 border border-dashed border-brand-sand/30 rounded-[2rem] hover:bg-brand-cream/20 transition-all group"
                            >
                                <Plus size={32} className="text-brand-sand/50 group-hover:scale-110 transition-transform mb-2" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-brand-brown/40">Add your first setlist song</span>
                            </button>
                        )}
                    </div>
                </div>
             </div>

             {/* Modal Footer */}
             <div className="p-6 md:p-8 bg-brand-cream/30 border-t border-brand-sand/10 flex items-center justify-between gap-4">
                <button 
                   onClick={() => setIsModalOpen(false)}
                   className="px-6 py-3 rounded-2xl font-bold text-sm text-brand-brown/60 hover:bg-brand-brown/5 transition-all text-center"
                >
                   Cancel
                </button>
                <button 
                   onClick={handleSave}
                   className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-brand-brown text-white px-10 py-3.5 rounded-2xl font-bold text-sm hover:bg-brand-light-brown transition-all shadow-xl active:scale-95"
                >
                   <Save size={18} /> Save Lineup
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
