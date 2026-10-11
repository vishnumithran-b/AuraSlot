import React, { useState } from 'react';
import { UserCheck, X, AlertCircle } from 'lucide-react';
import { Modal } from './Modal';
import { formatISTDisplayDate, formatISTTimeDisplay } from '../utils/date-ist';

interface WaitlistModalProps {
  date: string;
  timeSlot: string;
  serviceName: string;
  serviceId?: string;
  providerId?: string;
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
  onConfirm: (data: { fullName: string; email: string; phone: string }) => void;
  onClose: () => void;
}

export const WaitlistModal: React.FC<WaitlistModalProps> = ({
  date,
  timeSlot,
  serviceName,
  serviceId: _serviceId,
  providerId: _providerId,
  defaultName = '',
  defaultEmail = '',
  defaultPhone = '',
  onConfirm,
  onClose,
}) => {
  const [fullName, setFullName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState(defaultPhone);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setError('Please provide your name, email, and phone number.');
      return;
    }
    onConfirm({ fullName, email, phone });
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      titleId="waitlist-dialog-title"
      ariaLabel="Join Waitlist"
      maxWidth="min(440px, 100%)"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#991B1B] via-[#B91C1C] to-[#DC2626] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-red-100">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 id="waitlist-dialog-title" className="text-lg font-bold font-['Outfit']">Join Waitlist</h3>
              <p className="text-xs text-red-100/90">Get auto-promoted if someone cancels</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close dialog" className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-red-50/60 border border-red-200/70 space-y-1">
            <p className="font-semibold text-[#1C1917]">{serviceName}</p>
            <p className="text-[#78716C]">
              Target Date: <span className="text-[#1C1917] font-medium">{formatISTDisplayDate(date)}</span> at{' '}
              <span className="text-[#DC2626] font-mono font-semibold">{formatISTTimeDisplay(timeSlot)}</span>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1C1917] mb-1">Your Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Ananya Raman"
              className="glass-input w-full px-3.5 py-2.5 text-xs text-[#1C1917]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1C1917] mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="glass-input w-full px-3.5 py-2.5 text-xs text-[#1C1917]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1C1917] mb-1">10-Digit Mobile (WhatsApp/SMS alerts)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98401 23456"
              className="glass-input w-full px-3.5 py-2.5 text-xs text-[#1C1917]"
              required
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[#B91C1C] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex items-center gap-3">
            <button type="button" onClick={onClose} className="btn-secondary px-4 py-2.5 text-xs flex-1">
              Cancel
            </button>
            <button type="submit" className="btn-primary px-4 py-2.5 text-xs flex-1 font-semibold">
              Join Waitlist
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
