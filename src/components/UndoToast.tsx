import React, { useEffect, useState } from 'react';
import { RotateCcw, X, AlertCircle } from 'lucide-react';
import { useAppointmentsContext } from '../context/AppointmentsContext';

export const UndoToast: React.FC = () => {
  const { undoState, undoCancellation, dismissUndo } = useAppointmentsContext();
  const [secondsRemaining, setSecondsRemaining] = useState(10);

  useEffect(() => {
    if (!undoState) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((undoState.expiresAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [undoState]);

  if (!undoState) return null;

  const pct = Math.max(0, Math.min(100, (secondsRemaining / 10) * 100));

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#FFFDF9]/95 border border-red-500/40 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
      {/* Progress Bar Header */}
      <div className="h-1 w-full bg-stone-200">
        <div
          className="h-full bg-gradient-to-r from-[#DC2626] to-[#B91C1C] transition-all duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-[#DC2626] shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#1C1917]">Appointment Cancelled</p>
            <p className="text-[11px] text-[#78716C]">
              Revert cancellation ({secondsRemaining}s remaining)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={undoCancellation}
            className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-[#DC2626] text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            onClick={dismissUndo}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
