import React from 'react';
import { AlertTriangle, Trash2, CheckCircle, Loader2 } from 'lucide-react';
import { useAppStore } from '../store';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = true
}: ConfirmModalProps) {
  const { isLoading } = useAppStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-brand-brown/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-brand-sand transform transition-all mx-auto"
        role="dialog"
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 rounded-full shrink-0 ${isDestructive ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
              {isDestructive ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
            </div>
            <h3 className="text-xl font-display text-gray-900 tracking-wide">{title}</h3>
          </div>
          
          <div className="text-gray-600 mb-6 text-sm leading-relaxed">
            {message}
          </div>
          
          <div className="flex items-center gap-3 w-full">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              autoFocus
              onClick={() => {
                onConfirm();
              }}
              disabled={isLoading}
              className={`flex-1 px-4 py-3 rounded-lg font-bold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed ${
                isDestructive 
                  ? 'bg-red-500 hover:bg-red-600 shadow-sm shadow-red-500/20' 
                  : 'bg-brand-brown hover:bg-brand-light-brown shadow-sm shadow-brand-brown/20'
              }`}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : (
                <>
                  {isDestructive && <Trash2 size={16} />}
                  {confirmLabel}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>

  );
}
