import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  X,
  MapPin,
  ShieldCheck,
  Download,
  Sparkles,
} from 'lucide-react';
import { formatISTDisplayDate, formatISTTimeDisplay, getCountdownIST } from '../utils/date-ist';
import { useSettings, useLabels } from '../context/SettingsContext';
import { formatINR } from '../utils/currency';
import type { Appointment } from '../types/appointment';

interface BookingPassModalProps {
  appointment: Appointment;
  onClose: () => void;
}

export const BookingPassModal: React.FC<BookingPassModalProps> = ({ appointment, onClose }) => {
  const { businessProfile } = useSettings();
  const labels = useLabels();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [countdown, setCountdown] = useState(getCountdownIST(appointment.date, appointment.timeSlot));

  useEffect(() => {
    // Generate QR code data URL
    const passPayload = JSON.stringify({
      id: appointment.id,
      inv: appointment.invoiceNumber,
      client: appointment.fullName,
      service: appointment.serviceName,
      date: appointment.date,
      time: appointment.timeSlot,
      status: appointment.status,
      gstin: businessProfile.gstin,
    });

    QRCode.toDataURL(passPayload, {
      width: 240,
      margin: 1.5,
      color: {
        dark: '#991B1B',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR code generation failed:', err));
  }, [appointment, businessProfile.gstin]);

  // Live countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getCountdownIST(appointment.date, appointment.timeSlot));
    }, 1000);
    return () => clearInterval(timer);
  }, [appointment]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#FFFDF9] border border-red-900/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Pass Header Banner */}
        <div className="relative bg-gradient-to-r from-[#991B1B] via-[#B91C1C] to-[#DC2626] p-6 text-white overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
            title="Close Pass"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-200 mb-1">
            <Sparkles className="w-4 h-4 text-rose-200" />
            <span>Digital Admission Pass</span>
          </div>

          <h2 className="text-xl font-bold font-['Outfit']">{businessProfile.businessName}</h2>
          <p className="text-xs text-white/85 mt-0.5">Ref: {appointment.id} • {appointment.invoiceNumber}</p>

          {/* Live countdown badge */}
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/30 border border-white/20 text-xs font-medium text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{countdown.formatted}</span>
          </div>
        </div>

        {/* Pass Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* QR Code Presentation Box */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-red-50/50 border border-red-100">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Entry QR Code"
                className="w-48 h-48 rounded-xl p-2 bg-white border border-red-200 shadow-md"
              />
            ) : (
              <div className="w-48 h-48 bg-stone-100 rounded-xl flex items-center justify-center animate-pulse">
                <span className="text-xs text-[#78716C]">Generating QR Code...</span>
              </div>
            )}
            <p className="text-[11px] text-[#78716C] mt-3 flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
              <span>Scan at reception desk for instant check-in</span>
            </p>
          </div>

          {/* Appointment Details Grid */}
          <div className="space-y-3 text-xs border-y border-stone-200 py-4">
            <div className="flex items-start justify-between">
              <span className="text-[#78716C]">{labels.customer}</span>
              <span className="font-semibold text-[#1C1917] text-right">{appointment.fullName}</span>
            </div>

            <div className="flex items-start justify-between">
              <span className="text-[#78716C]">{labels.service}</span>
              <span className="font-semibold text-[#DC2626] text-right">{appointment.serviceName}</span>
            </div>

            <div className="flex items-start justify-between">
              <span className="text-[#78716C]">{labels.professional}</span>
              <span className="font-semibold text-[#1C1917] text-right">{appointment.providerName}</span>
            </div>

            <div className="flex items-start justify-between">
              <span className="text-[#78716C]">Date (IST)</span>
              <span className="font-semibold text-[#1C1917] text-right">
                {formatISTDisplayDate(appointment.date)}
              </span>
            </div>

            <div className="flex items-start justify-between">
              <span className="text-[#78716C]">Slot Time</span>
              <span className="font-mono font-bold text-[#1C1917] text-right">
                {formatISTTimeDisplay(appointment.timeSlot)} ({appointment.duration} mins)
              </span>
            </div>

            <div className="flex items-start justify-between">
              <span className="text-[#78716C]">Status / Payment</span>
              <span className="font-semibold text-[#047857] text-right capitalize">
                {appointment.paymentStatus} ({formatINR(appointment.pricing.totalAmount)})
              </span>
            </div>
          </div>

          {/* Location and Venue Info */}
          <div className="flex items-start gap-2.5 text-xs text-[#78716C]">
            <MapPin className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-[#1C1917]">{labels.venue} Location</p>
              <p className="text-[11px] leading-relaxed">{businessProfile.address}</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex-1 btn-secondary py-2.5 text-xs flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Print Pass</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 btn-primary py-2.5 text-xs flex items-center justify-center gap-2"
          >
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
