import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const isSuccess = toast.type === 'success';
  const isWarning = toast.type === 'warning';
  const isError = toast.type === 'error';

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-3.5 flex items-start space-x-3 transition-all max-w-sm w-full">
      <div className="mt-0.5">
        {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        {isWarning && <AlertTriangle className="w-5 h-5 text-amber-500" />}
        {isError && <AlertTriangle className="w-5 h-5 text-rose-600" />}
        {!isSuccess && !isWarning && !isError && <Info className="w-5 h-5 text-blue-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <h5 className="text-xs font-bold text-slate-900 leading-tight">
          {toast.title}
        </h5>
        <p className="text-xs text-slate-600 mt-0.5 leading-snug">
          {toast.message}
        </p>
      </div>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onClose={() => onDismiss(toast.id)} />
        </div>
      ))}
    </div>
  );
};

