import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { Modal } from './Modal';
import { calculateRefund } from '../utils/refund';
import { formatINR } from '../utils/currency';
import { formatISTDisplayDate, formatISTTimeDisplay } from '../utils/date-ist';
import type { Appointment } from '../types/appointment';

interface CancelModalProps {
  appointment: Appointment;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export const CancelModal: React.FC<CancelModalProps> = ({ appointment, onConfirm, onClose }) => {
  const [reason, setReason] = useState('Change of plans');
  const refund = calculateRefund(appointment);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      titleId="cancel-modal-title"
      ariaLabel="Cancel Appointment"
      maxWidth="min(448px, 100%)"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#991B1B] to-[#DC2626] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="cancel-modal-title" className="text-lg font-bold font-['Outfit'] text-white">Cancel Appointment</h3>
              <p className="text-xs text-rose-200">Review IST Refund Policy</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white/90 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
            <p className="font-semibold text-[#1C1917]">{appointment.serviceName}</p>
            <p className="text-[#78716C]">
              With {appointment.providerName} on {formatISTDisplayDate(appointment.date)} at{' '}
              {formatISTTimeDisplay(appointment.timeSlot)}
            </p>
          </div>

          {/* Refund Breakdown Card */}
          <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100 space-y-2.5">
            <div className="flex items-center justify-between text-[#78716C]">
              <span>Original Amount Paid:</span>
              <span className="font-semibold text-[#1C1917]">{formatINR(appointment.pricing.totalAmount)}</span>
            </div>

            <div className="flex items-center justify-between text-[#78716C]">
              <span>Time Until Slot (IST):</span>
              <span className="font-semibold text-[#1C1917]">
                {refund.diffHours > 0 ? `${refund.diffHours.toFixed(1)} hours` : 'Past slot'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[#78716C]">
              <span>Refund Eligibility:</span>
              <span className={`font-semibold ${refund.refundPercentage > 0 ? 'text-[#047857]' : 'text-[#DC2626]'}`}>
                {refund.refundPercentage}%
              </span>
            </div>

            <div className="flex items-center justify-between text-[#78716C]">
              <span>Cancellation Retention Fee:</span>
              <span className="text-[#1C1917] font-semibold">{formatINR(refund.cancellationFee)}</span>
            </div>

            <div className="pt-2 border-t border-red-200 flex items-center justify-between font-bold text-sm">
              <span className="text-[#1C1917]">Amount to be Refunded:</span>
              <span className="text-[#047857] text-base">{formatINR(refund.refundAmount)}</span>
            </div>
          </div>

          {/* Policy description note */}
          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-[#78716C] text-[11px] leading-relaxed">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
              <span>{refund.policyDescription}</span>
            </div>
          </div>

          {/* Reason selector */}
          <div>
            <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">
              Reason for Cancellation
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="glass-input w-full px-3.5 py-2.5 text-xs text-[#1C1917] bg-white"
            >
              <option value="Change of plans">Change of plans / Schedule conflict</option>
              <option value="Personal emergency">Personal emergency / Unforeseen conflict</option>
              <option value="Need different professional">Need a different professional or service</option>
              <option value="Found earlier appointment elsewhere">Found an earlier slot elsewhere</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-4 py-2.5 text-xs flex-1"
          >
            Keep Appointment
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors flex-1"
          >
            Confirm Cancellation
          </button>
        </div>
      </div>
    </Modal>
  );
};
