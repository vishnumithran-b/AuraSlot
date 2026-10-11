import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Download,
  QrCode,
  CalendarPlus,
  RefreshCw,
  XCircle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatISTDisplayDate, formatISTTimeDisplay, getCountdownIST } from '../utils/date-ist';
import { formatINR } from '../utils/currency';
import { downloadInvoicePDF } from '../utils/invoice';
import { downloadICSFile, getGoogleCalendarUrl } from '../utils/ics';
import { useAppointmentsContext } from '../context/AppointmentsContext';
import { useLabels } from '../context/SettingsContext';
import type { Appointment } from '../types/appointment';

interface AppointmentCardProps {
  appointment: Appointment;
  onViewPass: (appointment: Appointment) => void;
  onReschedule: (appointment: Appointment) => void;
  onCancel: (appointment: Appointment) => void;
  showToastSuccess?: (message: string) => void;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onViewPass,
  onReschedule,
  onCancel,
  showToastSuccess,
}) => {
  const labels = useLabels();
  const { simulateReminder } = useAppointmentsContext();
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);
  const [countdown, setCountdown] = useState(
    getCountdownIST(appointment.date, appointment.timeSlot)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getCountdownIST(appointment.date, appointment.timeSlot));
    }, 1000);
    return () => clearInterval(timer);
  }, [appointment]);

  const handleDownloadInvoice = () => {
    downloadInvoicePDF(appointment);
    showToastSuccess?.(`Tax Invoice ${appointment.invoiceNumber} downloaded.`);
  };

  const handleDownloadICS = () => {
    downloadICSFile(appointment);
    showToastSuccess?.('Calendar invite (.ics) downloaded.');
  };

  const handleSendReminder = (type: '24h' | '1h') => {
    simulateReminder(appointment.id, type);
    showToastSuccess?.(`Simulated ${type} reminder dispatched via WhatsApp, SMS & Email!`);
  };

  const isCompleted = appointment.status === 'completed';
  const isUpcoming = appointment.status === 'upcoming';

  return (
    <div className="glass-card p-5 sm:p-6 border border-red-900/15 relative overflow-hidden flex flex-col justify-between hover:shadow-xl transition-all">
      {/* Glow accent */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-bl from-[#DC2626]/10 via-[#F43F5E]/10 to-transparent rounded-full blur-2xl pointer-events-none" />

      <div>
        {/* Top Badges Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-red-900/10">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider shadow-sm ${
                isUpcoming
                  ? 'badge-upcoming'
                  : isCompleted
                  ? 'badge-completed'
                  : 'badge-cancelled'
              }`}
            >
              {appointment.status}
            </span>

            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize border shadow-sm ${
                appointment.paymentStatus === 'paid'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : appointment.paymentStatus === 'refunded'
                  ? 'bg-blue-100 text-blue-900 border-blue-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}
            >
              Payment: {appointment.paymentStatus}
            </span>
          </div>

          {/* Live IST Countdown badge for upcoming */}
          {isUpcoming && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-red-50 via-rose-50 to-red-50 border border-red-300 text-[11px] font-mono text-[#B91C1C] font-extrabold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-ping" />
              <span>{countdown.formatted}</span>
            </div>
          )}
        </div>

        {/* Primary Service & Provider Info */}
        <div className="py-4 space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[#1C1917] font-['Outfit'] leading-tight">
                {appointment.serviceName}
              </h3>
              <p className="text-xs text-[#78716C] mt-1">
                {labels.professional}: <span className="text-[#1C1917] font-bold">{appointment.providerName}</span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xl font-extrabold font-['Outfit'] text-[#DC2626]">
                {formatINR(appointment.pricing.totalAmount)}
              </span>
              <span className="block text-[10px] text-[#78716C] font-medium">incl. GST</span>
            </div>
          </div>

          {/* Time & Date in IST */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-[#1C1917]">
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-red-50/70 border border-red-200/80">
              <Calendar className="w-4 h-4 text-[#DC2626] shrink-0" />
              <div>
                <span className="text-[10px] text-[#78716C] block font-semibold">Date (IST)</span>
                <span className="font-bold text-[#1C1917]">{formatISTDisplayDate(appointment.date)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
              <Clock className="w-4 h-4 text-[#059669] shrink-0" />
              <div>
                <span className="text-[10px] text-[#78716C] block font-semibold">Slot Time (IST)</span>
                <span className="font-mono font-bold text-[#1C1917]">
                  {formatISTTimeDisplay(appointment.timeSlot)} ({appointment.duration}m)
                </span>
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="text-xs text-[#78716C] pt-1 flex items-center justify-between">
            <span>{labels.customer}: <span className="text-[#1C1917] font-semibold">{appointment.fullName}</span> ({appointment.phone})</span>
            <span className="text-[11px] text-[#059669] font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">State: {appointment.state}</span>
          </div>

          {/* Collapsible GST Price Breakdown */}
          <div className="pt-2">
            <button
              onClick={() => setShowTaxBreakdown(!showTaxBreakdown)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-stone-50 hover:bg-red-50 text-[11px] text-[#78716C] hover:text-[#B91C1C] border border-stone-200 transition-colors font-semibold"
            >
              <span>View Itemized GST Breakdown (SAC {appointment.pricing.sacCode})</span>
              {showTaxBreakdown ? <ChevronUp className="w-3.5 h-3.5 text-[#DC2626]" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showTaxBreakdown && (
              <div className="p-3.5 mt-1.5 rounded-xl bg-white border border-red-900/15 space-y-1 text-xs text-[#78716C] animate-in fade-in duration-150 shadow-sm">
                <div className="flex justify-between">
                  <span>Base price:</span>
                  <span className="text-[#1C1917] font-mono">{formatINR(appointment.pricing.basePrice)}</span>
                </div>
                {appointment.pricing.discountAmount > 0 && (
                  <div className="flex justify-between text-[#059669] font-semibold">
                    <span>Discount ({appointment.pricing.couponCode}):</span>
                    <span className="font-mono">- {formatINR(appointment.pricing.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Taxable value:</span>
                  <span className="text-[#1C1917] font-mono">{formatINR(appointment.pricing.taxableAmount)}</span>
                </div>
                {appointment.pricing.isInterState ? (
                  <div className="flex justify-between">
                    <span>IGST ({appointment.pricing.gstRate}%):</span>
                    <span className="text-[#1C1917] font-mono">{formatINR(appointment.pricing.igst)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span>CGST ({(appointment.pricing.gstRate / 2).toFixed(1)}%):</span>
                      <span className="text-[#1C1917] font-mono">{formatINR(appointment.pricing.cgst)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SGST ({(appointment.pricing.gstRate / 2).toFixed(1)}%):</span>
                      <span className="text-[#1C1917] font-mono">{formatINR(appointment.pricing.sgst)}</span>
                    </div>
                  </>
                )}
                <div className="pt-1.5 border-t border-red-900/10 flex justify-between font-bold text-[#1C1917]">
                  <span>Total payable:</span>
                  <span className="text-[#DC2626] font-mono font-extrabold text-sm">{formatINR(appointment.pricing.totalAmount)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Cancellation summary if cancelled */}
          {appointment.cancellation && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-1 mt-2">
              <div className="flex justify-between font-semibold">
                <span>Refund Processed:</span>
                <span>{formatINR(appointment.cancellation.refundAmount)} ({appointment.cancellation.refundPercentage}%)</span>
              </div>
              <p className="text-[11px] text-red-700">{appointment.cancellation.reason}</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="pt-3 border-t border-red-900/10 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Document & Pass buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => onViewPass(appointment)}
            className="px-2.5 py-1.5 rounded-xl bg-stone-50 hover:bg-red-50 border border-stone-200 text-[#1C1917] hover:text-[#DC2626] hover:border-red-300 flex items-center gap-1.5 transition-colors font-semibold"
            title="View Entry Pass with QR code and live countdown"
          >
            <QrCode className="w-3.5 h-3.5 text-[#DC2626]" />
            <span className="hidden sm:inline">Pass & QR</span>
          </button>

          <button
            onClick={handleDownloadInvoice}
            className="px-2.5 py-1.5 rounded-xl bg-stone-50 hover:bg-emerald-50 border border-stone-200 text-[#1C1917] hover:text-[#047857] hover:border-emerald-300 flex items-center gap-1.5 transition-colors font-semibold"
            title="Download GST Compliant Tax Invoice PDF"
          >
            <Download className="w-3.5 h-3.5 text-[#059669]" />
            <span className="hidden sm:inline">PDF Invoice</span>
          </button>

          <div className="relative group">
            <button
              onClick={handleDownloadICS}
              className="px-2.5 py-1.5 rounded-xl bg-stone-50 hover:bg-amber-50 border border-stone-200 text-[#1C1917] hover:text-amber-800 hover:border-amber-300 flex items-center gap-1.5 transition-colors font-semibold"
              title="Add to Calendar (.ics)"
            >
              <CalendarPlus className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Calendar</span>
            </button>
            <div className="absolute left-0 bottom-full mb-1 hidden group-hover:flex flex-col bg-[#FFFDF9] border border-stone-200 rounded-xl p-1 shadow-xl z-20 whitespace-nowrap text-[11px]">
              <button
                onClick={handleDownloadICS}
                className="px-3 py-1 hover:bg-stone-100 rounded-lg text-left text-[#1C1917]"
              >
                Download .ICS File
              </button>
              <a
                href={getGoogleCalendarUrl(appointment)}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 hover:bg-red-50 rounded-lg text-left text-[#DC2626] font-semibold"
              >
                Add to Google Calendar
              </a>
            </div>
          </div>

          {/* Simulated reminder button */}
          <div className="relative group">
            <button
              className="px-2 py-1.5 rounded-xl bg-stone-50 hover:bg-sky-50 border border-stone-200 hover:border-sky-300 text-[#78716C] hover:text-sky-700 transition-colors"
              title="Simulate WhatsApp & SMS reminders"
            >
              <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
            </button>
            <div className="absolute left-0 bottom-full mb-1 hidden group-hover:flex flex-col bg-[#FFFDF9] border border-stone-200 rounded-xl p-1 shadow-xl z-20 whitespace-nowrap text-[11px]">
              <button
                onClick={() => handleSendReminder('24h')}
                className="px-3 py-1 hover:bg-stone-100 rounded-lg text-left text-[#1C1917]"
              >
                Simulate 24h Reminder
              </button>
              <button
                onClick={() => handleSendReminder('1h')}
                className="px-3 py-1 hover:bg-stone-100 rounded-lg text-left text-[#1C1917]"
              >
                Simulate 1h Reminder
              </button>
            </div>
          </div>
        </div>

        {/* Reschedule & Cancel actions for upcoming appointments */}
        {isUpcoming && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onReschedule(appointment)}
              className="px-3 py-1.5 rounded-xl bg-stone-50 hover:bg-indigo-50 border border-stone-200 hover:border-indigo-300 text-[#1C1917] hover:text-indigo-700 flex items-center gap-1 transition-colors font-semibold"
            >
              <RefreshCw className="w-3 h-3 text-indigo-600" />
              <span>Reschedule</span>
            </button>

            <button
              onClick={() => onCancel(appointment)}
              className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-[#B91C1C] flex items-center gap-1 transition-colors font-semibold"
            >
              <XCircle className="w-3 h-3 text-[#DC2626]" />
              <span>Cancel</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
