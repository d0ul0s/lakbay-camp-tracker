import { useState, useEffect } from 'react';
import { Save, Shield, Check, X, AlertTriangle } from 'lucide-react';
import { useBlocker } from 'react-router-dom';
import api from '../api/axios';
import { useAppStore } from '../store';
import type { PermissionMatrix } from '../types';
import ConfirmModal from './ConfirmModal';

const PAGES = [
  { id: 'dashboard', label: 'Dashboard', actions: [{ key: 'view', label: 'Can view dashboard' }] },
  { 
    id: 'registrants', 
    label: 'Registrants', 
    actions: [
      { key: 'view', label: 'Can view page' },
      { key: 'viewAll', label: 'Can view ALL churches' },
      { key: 'add', label: 'Can add new' },
      { key: 'editOwn', label: 'Can edit own church' },
      { key: 'editAny', label: 'Can edit ANY registrant' },
      { key: 'deleteOwn', label: 'Can delete own church' },
      { key: 'deleteAny', label: 'Can delete ANY registrant' },
    ] 
  },
  { 
    id: 'merch', 
    label: 'Merch Claims', 
    actions: [
      { key: 'view', label: 'Can view page' },
      { key: 'toggleOwn', label: 'Can toggle own church' },
      { key: 'toggleAll', label: 'Can toggle ALL churches' },
    ] 
  },
  { 
    id: 'expenses', 
    label: 'Expenses', 
    actions: [
      { key: 'view', label: 'Can view page' },
      { key: 'viewAll', label: 'Can view ALL logs (vs own only)' },
      { key: 'add', label: 'Can log new' },
      { key: 'editOwn', label: 'Can edit own logged' },
      { key: 'editAny', label: 'Can edit ANY log' },
      { key: 'deleteOwn', label: 'Can delete own logged' },
      { key: 'deleteAny', label: 'Can delete ANY log' },
    ] 
  },
  { 
    id: 'solicitations', 
    label: 'Solicitations', 
    actions: [
      { key: 'view', label: 'Can view page' },
      { key: 'add', label: 'Can add new solicitation' },
      { key: 'edit', label: 'Can edit solicitations' },
      { key: 'delete', label: 'Can delete solicitations' },
      { key: 'verify', label: 'Can verify/unverify solicitations' },
    ] 
  },
  { 
    id: 'reports', 
    label: 'Reports', 
    actions: [
      { key: 'view', label: 'Can view page' },
      { key: 'exportCsv', label: 'Can export CSV' },
    ] 
  },
  { 
    id: 'activitylogs', 
    label: 'Activity Logs', 
    actions: [{ key: 'view', label: 'Can view logs' }] 
  },
];

const ROLES: ('treasurer' | 'coordinator')[] = ['treasurer', 'coordinator'];

export default function PermissionMatrixUI() {
  const { appSettings, fetchGlobalSettings, refreshPermissions, setGlobalError } = useAppStore();
  const [matrix, setMatrix] = useState<PermissionMatrix | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Block in-app React Router navigation when there are unsaved changes
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasChanges && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    // Initial load from store if available
    if (appSettings?.permissionMatrix) {
      setMatrix(appSettings.permissionMatrix);
    }
    
    // Always trigger a silent refresh to ensure we have the latest
    fetchGlobalSettings(true);
  }, []);

  useEffect(() => {
    // Update local matrix when store settings arrive (if not currently editing)
    if (appSettings?.permissionMatrix && !hasChanges) {
      setMatrix(appSettings.permissionMatrix);
    }
  }, [appSettings, hasChanges]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        const msg = "You have unsaved matrix changes. Are you sure you want to leave?";
        e.returnValue = msg;
        return msg;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const handleToggle = (role: string, pageId: string, actionKey: string) => {
    if (role?.toLowerCase().trim() === 'admin') return; // Cannot edit admin perms

    setMatrix(prev => {
      if (!prev) return null;
      const newMatrix = { ...prev };
      const roleData = { ...newMatrix[role] } as any;
      const pageData = { ...roleData[pageId] };
      
      pageData[actionKey] = !pageData[actionKey];
      roleData[pageId] = pageData;
      newMatrix[role] = roleData;
      
      setHasChanges(true);
      return newMatrix;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    console.log('PermissionMatrix: Saving changes...', matrix);
    try {
      const res = await api.put('/api/settings', { permissionMatrix: matrix });
      console.log('PermissionMatrix: Save response:', res.data);
      if (res.data?.permissionMatrix) {
        setMatrix(res.data.permissionMatrix);
      }
      await refreshPermissions();
      setHasChanges(false);
      setIsConfirmOpen(false);
    } catch (err) {
      console.error(err);
      setGlobalError('Failed to save permission matrix');
    } finally {
      setIsSaving(false);
    }
  };

  if (!matrix) return <div className="p-8 text-center text-gray-500 italic">Loading matrix...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-brand-beige">
        <div className="flex items-center gap-4">
          <div className="bg-brand-brown/10 p-3 rounded-2xl text-brand-brown">
            <Shield size={28} />
          </div>
          <div>
            <h3 className="text-xl font-display text-brand-brown tracking-wide">Global Permission Matrix</h3>
            <p className="text-sm text-gray-500 mt-0.5">Define granular access rights per role across the entire system.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasChanges && <span className="text-orange-500 font-bold text-sm animate-pulse">Unsaved changes!</span>}
          <button
            onClick={() => setIsConfirmOpen(true)}
            disabled={!hasChanges || isSaving}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm ${
              hasChanges 
                ? 'bg-brand-brown text-white hover:bg-brand-light-brown transform active:scale-95' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSaving ? <X className="animate-spin" size={20} /> : <Save size={20} />}
            Save Matrix
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-brand-beige overflow-hidden">
        {/* Mobile View: Role Tabs + Cards */}
        <div className="md:hidden">
          <div className="flex border-b border-gray-100 bg-gray-50/50 p-1">
            {ROLES.map(role => (
              <button
                key={role}
                onClick={() => {}} // Could add state to switch role here if we wanted single view, but current matrix allows both. 
                // Let's just show role headers on mobile for now as cards.
                className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-brand-brown border-b-2 border-brand-brown bg-white shadow-sm rounded-lg"
              >
                {role} Permissions
              </button>
            ))}
          </div>
          
          <div className="p-3 space-y-6">
            {PAGES.map(page => (
              <div key={page.id} className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                  <h4 className="font-black text-brand-brown uppercase text-xs tracking-wider">{page.label}</h4>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  {ROLES.map(role => (
                    <div key={role} className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                      <p className="text-[9px] font-black text-gray-400 uppercase mb-2 tracking-widest">{role}</p>
                      <div className="space-y-2">
                        {page.actions.map(action => {
                          const isChecked = (matrix[role] as any)?.[page.id]?.[action.key] === true;
                          return (
                            <button
                              key={action.key}
                              onClick={() => handleToggle(role, page.id, action.key)}
                              className="flex items-center gap-2 w-full text-left text-[11px] p-2 bg-white rounded-lg border border-gray-100 shadow-sm active:scale-[0.98] transition-all"
                            >
                              <div className={`shrink-0 w-5 h-5 rounded flex items-center justify-center border transition-all ${
                                isChecked 
                                  ? 'bg-brand-brown border-brand-brown text-white' 
                                  : 'bg-white border-gray-200 text-transparent'
                              }`}>
                                <Check size={12} className="stroke-[3]" />
                              </div>
                              <span className={isChecked ? 'text-gray-900 font-bold' : 'text-gray-400 font-medium'}>
                                {action.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto max-h-[70vh] custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-100 shadow-sm">
              <tr>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-widest text-xs min-w-[240px]">Page / Resource</th>
                {ROLES.map(role => (
                  <th key={role} className="px-6 py-4 font-bold text-center">
                    <span className="inline-block px-3 py-1 rounded-full text-xs uppercase tracking-tighter bg-brand-sand/50 text-brand-brown">
                      {role}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-beige/30">
              {PAGES.map(page => (
                <tr key={page.id} className="group hover:bg-brand-cream/10 transition-colors">
                  <td className="px-6 py-6 align-top">
                    <div className="sticky top-20">
                      <h4 className="font-display text-lg text-brand-brown tracking-wide">{page.label}</h4>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1 font-bold">Actions & Toggles</p>
                    </div>
                  </td>
                  {ROLES.map(role => (
                    <td key={role} className="px-6 py-6 align-top bg-gray-50/20 group-hover:bg-transparent">
                      <div className="space-y-3">
                        {page.actions.map(action => {
                          const isChecked = (matrix[role] as any)?.[page.id]?.[action.key] === true;

                          return (
                            <button
                              key={action.key}
                              onClick={() => handleToggle(role, page.id, action.key)}
                              className="flex items-center gap-2 w-full text-left text-sm p-1.5 rounded-lg transition-all group/btn hover:bg-white hover:shadow-sm"
                            >
                              <div className={`shrink-0 w-5 h-5 rounded flex items-center justify-center border transition-all ${
                                isChecked 
                                  ? 'bg-brand-brown border-brand-brown text-white' 
                                  : 'bg-white border-gray-300 text-transparent group-hover/btn:border-brand-brown'
                              }`}>
                                <Check size={14} className="stroke-[3]" />
                              </div>
                              <span className={isChecked ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                                {action.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Apply Permission Changes?"
        message="This will immediately update access rights for all coordinators and treasurers across the system. Users may need to refresh their page to see UI changes."
        confirmLabel="Save & Apply"
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={handleSave}
      />

      {/* Navigation block warning modal */}
      {blocker.state === 'blocked' && (
        <div className="fixed inset-0 bg-brand-brown/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-orange-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-xl text-orange-600">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-display text-gray-900">Unsaved Changes</h3>
            </div>
            <p className="text-gray-600 text-sm mb-6">You have unsaved Permission Matrix changes. If you leave now, your changes will be lost.</p>
            <div className="flex gap-3">
              <button
                onClick={() => blocker.reset?.()}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              >
                Stay & Save
              </button>
              <button
                onClick={() => blocker.proceed?.()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors"
              >
                Leave Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
