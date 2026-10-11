import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Calendar,
  Copy,
  Check,
  Download,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatISTDisplayDate, formatISTTimeDisplay } from '../utils/date-ist';
import { formatINR } from '../utils/currency';
import { downloadInvoicePDF } from '../utils/invoice';
import { downloadICSFile } from '../utils/ics';
import type { Appointment } from '../types/appointment';

interface BookingSuccessModalProps {
  appointment: Appointment;
  onClose: () => void;
  onViewAppointments: () => void;
  onBookAnother: () => void;
}

export const BookingSuccessModal: React.FC<BookingSuccessModalProps> = ({
  appointment,
  onClose,
  onViewAppointments,
  onBookAnother,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#DC2626', '#B91C1C', '#EF4444', '#FAF6EE', '#059669', '#D97706'],
      });
    } catch (e) {
      // Confetti fallback
    }
  }, []);

  const handleCopyId = () => {
    navigator.clipboard.writeText(appointment.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-[#FFFDF9] p-6 sm:p-8 border border-red-900/20 shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Glow ambient background elements */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#DC2626]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-[#B91C1C]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="text-center mb-6 relative">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#991B1B] via-[#B91C1C] to-[#DC2626] p-0.5 shadow-[0_0_24px_rgba(220,38,38,0.35)] mb-3 animate-bounce">
            <div className="w-full h-full bg-[#FFFDF9] rounded-[14px] flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-[#059669]" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C1917] tracking-tight font-['Outfit']">
            Appointment Confirmed!
          </h2>
          <p className="text-xs text-[#78716C] mt-1">
            Confirmed in <span className="text-[#DC2626] font-semibold">Indian Standard Time (IST, UTC+5:30)</span>.
          </p>
        </div>

        {/* Booking Reference Bar */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-red-50/70 border border-red-100 mb-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#DC2626]" />
            <div>
              <span className="text-[10px] text-[#78716C] block">Appointment Ref & Invoice</span>
              <span className="font-mono text-xs font-bold text-[#1C1917] tracking-wider">
                {appointment.id} • {appointment.invoiceNumber}
              </span>
            </div>
          </div>
          <button
            onClick={handleCopyId}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-stone-100 text-[#1C1917] border border-stone-200 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#059669]" />
                <span className="text-[#059669]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#DC2626]" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Appointment Details Grid */}
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-3 mb-6 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-[#78716C]">Service</span>
              <p className="font-semibold text-[#1C1917] line-clamp-1">{appointment.serviceName}</p>
            </div>
            <div>
              <span className="text-[10px] text-[#78716C]">Provider</span>
              <p className="font-semibold text-[#DC2626] line-clamp-1">{appointment.providerName}</p>
            </div>
            <div>
              <span className="text-[10px] text-[#78716C]">Date (IST)</span>
              <p className="font-semibold text-[#1C1917]">{formatISTDisplayDate(appointment.date)}</p>
            </div>
            <div>
              <span className="text-[10px] text-[#78716C]">Time (IST)</span>
              <p className="font-mono font-bold text-[#059669]">
                {formatISTTimeDisplay(appointment.timeSlot)} ({appointment.duration}m)
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-200 flex justify-between items-center text-xs">
            <span className="text-[#78716C]">Total Paid (with GST):</span>
            <span className="font-mono font-bold text-[#991B1B] text-sm">
              {formatINR(appointment.pricing.totalAmount)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <button
            onClick={() => downloadInvoicePDF(appointment)}
            className="w-full sm:w-auto flex-1 btn-secondary py-2.5 px-3 flex items-center justify-center gap-1.5 text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5 text-[#059669]" />
            <span>Download Invoice PDF</span>
          </button>

          <button
            onClick={() => downloadICSFile(appointment)}
            className="w-full sm:w-auto flex-1 btn-secondary py-2.5 px-3 flex items-center justify-center gap-1.5 text-xs font-semibold"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span>Add to Calendar</span>
          </button>
        </div>

        <div className="mt-3">
          <button
            onClick={() => {
              onClose();
              onViewAppointments();
            }}
            className="w-full btn-primary py-3 px-4 flex items-center justify-center gap-2 text-xs font-bold shadow-md shadow-red-500/20"
          >
            <span>Go to My Bookings Hub</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3 text-center">
          <button
            onClick={() => {
              onClose();
              onBookAnother();
            }}
            className="text-[11px] text-[#78716C] hover:text-[#DC2626] transition-colors underline font-medium"
          >
            + Book another appointment
          </button>
        </div>
      </div>
    </div>
  );
};
