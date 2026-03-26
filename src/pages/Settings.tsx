import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { useAppStore } from '../store';
import { Database, Download, Upload, AlertTriangle, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

export default function Settings() {
  const { currentUser } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null, msg: string }>({ type: null, msg: '' });
  const [photoError, setPhotoError] = useState('');
  
  const [settings, setSettings] = useState<any>(null);
  
  const [addingField, setAddingField] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState('');

  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, action: () => void, message: string}>({
    isOpen: false,
    action: () => {},
    message: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/settings`);
      setSettings(res.data);
    } catch (err) {
      console.error(err);
    }
  };
  
  if (currentUser?.role !== 'admin') {
    return null;
  }
  
  const handleExport = async () => {
    try {
      setImportStatus({ type: null, msg: '' });
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/backup/export`);
      const dataString = JSON.stringify(res.data, null, 2);
      const blob = new Blob([dataString], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `LAKBAY_Backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
    } catch(err) {
      console.error(err);
      setImportStatus({ type: 'error', msg: 'Failed to export backup.' });
    }
  };
  
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setConfirmModal({
      isOpen: true,
      message: 'Uploading a JSON backup file will permanently overwrite all current system data. This action cannot be undone.',
      action: () => {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const jsonString = event.target?.result as string;
            const parsed = JSON.parse(jsonString);
            await axios.post(`${import.meta.env.VITE_API_URL}/api/backup/import`, parsed);
            setImportStatus({
              type: 'success',
              msg: 'Data restored successfully. The system will reload in 3 seconds to apply changes.'
            });
            setTimeout(() => window.location.reload(), 3000);
          } catch (err: any) {
            setImportStatus({ type: 'error', msg: 'Backup error: ' + (err.response?.data?.message || err.message) });
          }
        };
        reader.readAsText(file);
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateArrayField = async (field: string, newArray: string[]) => {
    try {
      if (!settings) return;
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/settings`, {
        [field]: newArray
      });
      setSettings(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddItem = async (field: string) => {
    if (!newItemText.trim() || !settings) return;
    const currentArray = settings[field] || [];
    if (currentArray.includes(newItemText.trim())) {
      setNewItemText('');
      setAddingField(null);
      return;
    }
    const newArray = [...currentArray, newItemText.trim()];
    await updateArrayField(field, newArray);
    setNewItemText('');
    setAddingField(null);
  };

  const handleRemoveItem = (field: string, index: number) => {
    setConfirmModal({
      isOpen: true,
      message: 'Are you sure you want to remove this item? Dependent records might be affected if they rely on this exact text.',
      action: async () => {
        if (!settings) return;
        const currentArray = settings[field] || [];
        const newArray = currentArray.filter((_: any, i: number) => i !== index);
        await updateArrayField(field, newArray);
      }
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('File size exceeds 2MB limit. Please upload a smaller image.');
      if (photoInputRef.current) photoInputRef.current.value = '';
      return;
    }
    setPhotoError('');
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64 = event.target?.result as string;
        const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/settings`, {
          shirtSizePhoto: base64
        });
        setSettings(res.data);
      } catch (err) {
        setPhotoError('Error saving photo: ' + (err as any).message);
      }
    };
    reader.readAsDataURL(file);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const renderArrayEditor = (title: string, field: string, description: string) => {
    const items = settings?.[field] || [];
    const isAdding = addingField === field;

    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-beige">
        <h3 className="text-xl font-bold text-gray-800 mb-1">{title}</h3>
        <p className="text-gray-500 text-sm mb-4">{description}</p>
        
        <div className="space-y-2 mb-4">
          {items.map((item: string, idx: number) => (
            <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
              <span className="font-medium text-gray-700">{item}</span>
              <button 
                onClick={() => handleRemoveItem(field, idx)}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-gray-400 text-sm italic py-2">No items configured.</p>
          )}
        </div>

        {isAdding ? (
          <div className="flex gap-2">
            <input 
              type="text" 
              autoFocus
              value={newItemText}
              onChange={e => setNewItemText(e.target.value)}
              placeholder={`New ${title.toLowerCase()}...`}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown"
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddItem(field);
                if (e.key === 'Escape') { setAddingField(null); setNewItemText(''); }
              }}
            />
            <button 
              onClick={() => handleAddItem(field)}
              className="bg-brand-brown text-white px-4 py-2 rounded-lg font-bold hover:bg-brand-light-brown transition-colors"
            >
              Save
            </button>
            <button 
              onClick={() => { setAddingField(null); setNewItemText(''); }}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button 
            onClick={() => { setAddingField(field); setNewItemText(''); }}
            className="flex items-center gap-2 text-brand-brown font-bold hover:text-brand-light-brown transition-colors text-sm"
          >
            <Plus size={16} /> Add {title.slice(0, -1)}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto md:mx-0 pb-12">
      <h2 className="text-3xl font-display text-brand-brown tracking-wide mb-6">System Settings</h2>
      
      {/* List Configurations */}
      {settings && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderArrayEditor('Participating Churches', 'churchList', 'The definitive list of churches for coordinations and registrants.')}
          {renderArrayEditor('Ministries', 'ministries', 'Available ministries registrants can select.')}
          {renderArrayEditor('Expense Categories', 'expenseCategories', 'Categories for the expense tracker.')}
          {renderArrayEditor('Payment Methods', 'paymentMethods', 'Accepted methods of payment for expenses.')}
          {renderArrayEditor('Solicitation Types', 'solicitationTypes', 'Dynamic list of valid donation/solicitation sources.')}
        </div>
      )}

      {/* Shirt Size Photo Upload */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-beige">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-brand-cream text-brand-brown rounded-full">
            <ImageIcon size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Shirt Size Reference Model</h3>
            <p className="text-gray-500 text-sm">Upload a photo displaying the shirt dimensions. Maximum 2MB size limit.</p>
          </div>
        </div>

        {photoError && (
          <div className="p-3 rounded-xl mb-4 bg-red-50 text-red-800 border border-red-100 flex items-start gap-2 text-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p className="font-medium">{photoError}</p>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-6 mt-6">
          <div className="flex-1">
            <input 
              type="file" 
              accept="image/png, image/jpeg, image/webp" 
              className="hidden" 
              ref={photoInputRef}
              onChange={handlePhotoUpload}
            />
            <button 
              onClick={() => photoInputRef.current?.click()}
              className="flex items-center justify-center gap-2 bg-white text-brand-brown border-2 border-brand-beige w-full md:w-auto px-6 py-3 rounded-lg font-bold hover:bg-brand-cream transition-colors"
            >
              <Upload size={18} /> Select Image (Max 2MB)
            </button>
            <p className="text-xs text-gray-400 mt-3">Accepts JPG, PNG, WEBP.</p>
          </div>
          
          <div className="flex-1 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center bg-gray-50 min-h-[200px] overflow-hidden">
            {settings?.shirtSizePhoto ? (
              <img src={settings.shirtSizePhoto} alt="Shirt Size Spec" className="max-h-[300px] object-contain" />
            ) : (
              <div className="text-center p-6 text-gray-400">
                <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No photo uploaded yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Database Management */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-brand-beige mt-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-4 mb-6 border-b pb-6 border-gray-100 text-center md:text-left">
          <div className="p-4 bg-brand-cream text-brand-brown rounded-full">
            <Database size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Database Management</h3>
            <p className="text-gray-500 text-sm mt-1">Export and import the full system state as JSON. Since this app runs completely offline in your browser, it is highly recommended to export a backup regularly.</p>
          </div>
        </div>
        
        {importStatus.type && (
          <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 ${importStatus.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            <AlertTriangle size={20} className="mt-0.5 shrink-0" />
            <p className="font-medium">{importStatus.msg}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-100 bg-gray-50 p-6 rounded-xl relative overflow-hidden group hover:border-brand-sand transition-colors">
            <h4 className="font-bold text-gray-800 mb-2">Export Backup</h4>
            <p className="text-sm text-gray-500 mb-6 font-medium">Downloads a JSON snapshot containing all users, registrants, merch claims, expenses, and configuration exactly as they are currently.</p>
            
            <button 
              onClick={handleExport}
              className="flex items-center justify-center gap-2 bg-brand-brown text-white w-full py-3 rounded-lg font-bold hover:bg-brand-light-brown transition-colors shadow-sm"
            >
              <Download size={18} /> Download JSON
            </button>
          </div>
          
          <div className="border border-red-100 bg-red-50/30 p-6 rounded-xl relative overflow-hidden transition-colors">
            <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">Restore Backup <AlertTriangle size={16} /></h4>
            <p className="text-sm text-red-600/80 mb-6 font-medium">Uploading a JSON backup file will <strong className="text-red-700">permanently overwrite</strong> all current system data. This action cannot be undone.</p>
            
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImport}
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 bg-white text-red-600 border-2 border-red-200 w-full py-3 rounded-lg font-bold hover:bg-red-50 transition-colors"
            >
              <Upload size={18} /> Upload JSON
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title="Confirm Action"
        message={confirmModal.message}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.action}
      />
    </div>
  );
}
