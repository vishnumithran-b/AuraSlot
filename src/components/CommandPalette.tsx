import React, { useState, useEffect } from 'react';
import {
  Search,
  Calendar,
  FileText,
  LayoutDashboard,
  RotateCcw,
  Sparkles,
  User,
  ArrowRight,
} from 'lucide-react';
import { useAppointmentsContext } from '../context/AppointmentsContext';
import { useAuth } from '../context/AuthContext';
import { formatISTDisplayDate, formatISTTimeDisplay } from '../utils/date-ist';
import { formatINR } from '../utils/currency';
import type { Appointment } from '../types/appointment';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: 'book' | 'appointments' | 'calendar' | 'admin') => void;
  onSelectAppointment?: (appointment: Appointment) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onSelectAppointment,
}) => {
  const [query, setQuery] = useState('');
  const { appointments, resetToSampleData } = useAppointmentsContext();
  const { user, switchRole, isAdmin } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredAppointments = query.trim()
    ? appointments.filter(
        (a) =>
          a.fullName.toLowerCase().includes(query.toLowerCase()) ||
          a.id.toLowerCase().includes(query.toLowerCase()) ||
          a.invoiceNumber.toLowerCase().includes(query.toLowerCase()) ||
          a.serviceName.toLowerCase().includes(query.toLowerCase()) ||
          a.phone.includes(query)
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-stone-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#FFFDF9] border border-red-900/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-red-900/10 flex items-center gap-3">
          <Search className="w-5 h-5 text-[#DC2626] shrink-0" />
          <input
            type="text"
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search appointments by name, ID, phone..."
            className="w-full bg-transparent text-sm text-[#1C1917] focus:outline-none placeholder:text-[#78716C]/60"
          />
          <kbd className="px-2 py-1 rounded bg-stone-100 text-[10px] font-mono text-[#78716C] border border-stone-200">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4 text-xs">
          {/* If search query has matched appointments */}
          {filteredAppointments.length > 0 && (
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-[#78716C] mb-2">
                Matching Appointments ({filteredAppointments.length})
              </p>
              <div className="space-y-1.5">
                {filteredAppointments.map((apt) => (
                  <button
                    key={apt.id}
                    onClick={() => {
                      if (onSelectAppointment) onSelectAppointment(apt);
                      onNavigateTab('appointments');
                      onClose();
                    }}
                    className="w-full p-2.5 rounded-xl bg-white hover:bg-red-50/70 border border-red-900/10 hover:border-red-500/30 flex items-center justify-between text-left transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-[#1C1917]">{apt.fullName}</span>
                      <span className="text-[#78716C] ml-2">
                        • {apt.serviceName} ({apt.id})
                      </span>
                      <p className="text-[11px] text-[#DC2626] mt-0.5">
                        {formatISTDisplayDate(apt.date)} at {formatISTTimeDisplay(apt.timeSlot)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-[#1C1917] font-semibold">
                        {formatINR(apt.pricing.totalAmount)}
                      </span>
                      <span className="block text-[10px] capitalize text-[#059669] font-medium">
                        {apt.paymentStatus}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Navigation Commands */}
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-[#78716C] mb-2">
              Quick Navigation
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onNavigateTab('book');
                  onClose();
                }}
                className="p-3 rounded-xl bg-white hover:bg-red-50/70 border border-red-900/10 hover:border-red-500/30 flex items-center gap-3 text-left transition-colors"
              >
                <Sparkles className="w-4 h-4 text-[#DC2626]" />
                <div>
                  <p className="font-semibold text-[#1C1917]">Book New Appointment</p>
                  <p className="text-[10px] text-[#78716C]">Select service & schedule in IST</p>
                </div>
              </button>

              <button
                onClick={() => {
                  onNavigateTab('appointments');
                  onClose();
                }}
                className="p-3 rounded-xl bg-white hover:bg-red-50/70 border border-red-900/10 hover:border-red-500/30 flex items-center gap-3 text-left transition-colors"
              >
                <Calendar className="w-4 h-4 text-[#059669]" />
                <div>
                  <p className="font-semibold text-[#1C1917]">My Appointments</p>
                  <p className="text-[10px] text-[#78716C]">Invoices, QR pass, reschedule</p>
                </div>
              </button>

              <button
                onClick={() => {
                  onNavigateTab('calendar');
                  onClose();
                }}
                className="p-3 rounded-xl bg-white hover:bg-red-50/70 border border-red-900/10 hover:border-red-500/30 flex items-center gap-3 text-left transition-colors"
              >
                <FileText className="w-4 h-4 text-amber-600" />
                <div>
                  <p className="font-semibold text-[#1C1917]">Calendar Density View</p>
                  <p className="text-[10px] text-[#78716C]">Heat-style month/week density</p>
                </div>
              </button>

              <button
                onClick={() => {
                  onNavigateTab('admin');
                  onClose();
                }}
                className="p-3 rounded-xl bg-white hover:bg-red-50/70 border border-red-900/10 hover:border-red-500/30 flex items-center gap-3 text-left transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-[#B91C1C]" />
                <div>
                  <p className="font-semibold text-[#1C1917]">Admin Dashboard</p>
                  <p className="text-[10px] text-[#78716C]">Stats, Recharts, GST, tables</p>
                </div>
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-[#78716C] mb-2">
              System Actions
            </p>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => {
                  switchRole(isAdmin ? 'customer' : 'admin');
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-white hover:bg-red-50/70 border border-red-900/10 hover:border-red-500/30 flex items-center justify-between text-left transition-colors text-[#1C1917]"
              >
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-[#DC2626]" />
                  <span className="font-medium">
                    Switch to {isAdmin ? 'Customer View' : 'Administrator Dashboard'}
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-50 text-[#991B1B] font-mono border border-red-200">
                  Current: {user?.role}
                </span>
              </button>

              <button
                onClick={() => {
                  resetToSampleData();
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-white hover:bg-red-50/70 border border-red-900/10 flex items-center justify-between text-left transition-colors text-amber-700"
              >
                <div className="flex items-center gap-2.5 font-medium">
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset & Restore Demo Appointments (15+ items)</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-stone-50 border-t border-red-900/10 flex items-center justify-between text-[11px] text-[#78716C]">
          <span>Tip: Press ⌘K or Ctrl+K anywhere to reopen</span>
          <span className="text-[#1C1917] font-mono font-medium">Asia/Kolkata (IST)</span>
        </div>
      </div>
    </div>
  );
};
