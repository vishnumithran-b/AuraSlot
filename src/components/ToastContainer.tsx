import React from 'react';
import type { ToastMessage } from '../types/appointment';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  const getIcon = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-[#DC2626] shrink-0" />;
    }
  };

  const getBorderColor = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return 'border-[#059669]/30 shadow-[0_4px_24px_rgba(5,150,105,0.15)]';
      case 'error':
        return 'border-[#DC2626]/30 shadow-[0_4px_24px_rgba(220,38,38,0.15)]';
      case 'warning':
        return 'border-amber-500/30 shadow-[0_4px_24px_rgba(245,158,11,0.15)]';
      default:
        return 'border-red-900/20 shadow-[0_4px_24px_rgba(220,38,38,0.12)]';
    }
  };

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl bg-[#FFFDF9]/95 backdrop-blur-xl border ${getBorderColor(
            toast.type
          )} transition-all duration-300 animate-in fade-in slide-in-from-bottom-5`}
        >
          {getIcon(toast.type)}
          <div className="flex-1 min-w-0">
            {toast.title && (
              <h4 className="text-sm font-semibold text-[#1C1917] mb-0.5">{toast.title}</h4>
            )}
            <p className="text-xs text-[#78716C] leading-relaxed break-words">{toast.message}</p>
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-[#78716C] hover:text-[#1C1917] p-1 rounded-lg hover:bg-stone-100 transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
