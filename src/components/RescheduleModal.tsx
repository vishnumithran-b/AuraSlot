import React, { useState, useMemo } from 'react';
import { AlertCircle, X, Check } from 'lucide-react';
import { Modal } from './Modal';
import { useSettings, useLabels } from '../context/SettingsContext';
import { useAppointmentsContext } from '../context/AppointmentsContext';
import {
  generateAvailableSlotsForDate,
} from '../utils/slots';
import {
  formatISTDisplayDate,
  formatISTTimeDisplay,
  getTodayISTDateString,
  isPastDateIST,
} from '../utils/date-ist';
import type { Appointment } from '../types/appointment';

interface RescheduleModalProps {
  appointment: Appointment;
  onConfirm: (newDate: string, newTimeSlot: string, newProviderId: string) => void;
  onClose: () => void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  appointment,
  onConfirm,
  onClose,
}) => {
  const { services, providers, holidays, blockedDates, scheduleSettings } = useSettings();
  const labels = useLabels();
  const { appointments } = useAppointmentsContext();

  const [selectedDate, setSelectedDate] = useState(appointment.date);
  const [selectedProviderId, setSelectedProviderId] = useState(appointment.providerId);
  const [selectedSlot, setSelectedSlot] = useState(appointment.timeSlot);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentService = useMemo(() => {
    return (
      services.find((s) => s.id === appointment.serviceId) || {
        id: appointment.serviceId,
        name: appointment.serviceName,
        category: 'Consultation',
        duration: appointment.duration,
        basePrice: appointment.pricing.basePrice,
        gstRate: appointment.pricing.gstRate,
        sacCode: appointment.pricing.sacCode,
        description: '',
      }
    );
  }, [services, appointment]);

  const otherAppointments = useMemo(() => {
    return appointments.filter((a) => a.id !== appointment.id);
  }, [appointments, appointment.id]);

  const availableSlots = useMemo(() => {
    if (!selectedDate || isPastDateIST(selectedDate)) return [];
    return generateAvailableSlotsForDate({
      service: currentService,
      providerId: selectedProviderId,
      dateStr: selectedDate,
      allProviders: providers,
      appointments: otherAppointments,
      holidays,
      blockedDates,
      bufferMinutes: scheduleSettings.bufferMinutes,
    });
  }, [
    currentService,
    selectedProviderId,
    selectedDate,
    providers,
    otherAppointments,
    holidays,
    blockedDates,
    scheduleSettings.bufferMinutes,
  ]);

  const handleRescheduleSubmit = () => {
    if (!selectedDate) {
      setErrorMsg('Please select a valid future date.');
      return;
    }
    if (!selectedSlot) {
      setErrorMsg('Please select a time slot.');
      return;
    }

    const slotInfo = availableSlots.find((s) => s.timeSlot === selectedSlot);
    if (!slotInfo || !slotInfo.isAvailable) {
      setErrorMsg('The selected slot is unavailable or conflicts with another booking.');
      return;
    }

    onConfirm(selectedDate, selectedSlot, selectedProviderId);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      titleId="reschedule-modal-title"
      ariaLabel="Reschedule Appointment"
      maxWidth="min(512px, 100%)"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#991B1B] to-[#DC2626] text-white flex items-center justify-between shrink-0">
          <div>
            <h3 id="reschedule-modal-title" className="text-lg font-bold font-['Outfit']">Reschedule Appointment</h3>
            <p className="text-xs text-rose-200">
              Current: {formatISTDisplayDate(appointment.date)} at {formatISTTimeDisplay(appointment.timeSlot)}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-semibold text-[#1C1917] mb-2">
              Select {labels.professional}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {providers.map((p) => {
                const isSelected = selectedProviderId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedProviderId(p.id);
                      setSelectedSlot('');
                    }}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                      isSelected
                        ? 'bg-red-50 border-[#DC2626] text-[#991B1B] font-semibold shadow-sm'
                        : 'bg-white border-stone-200 text-[#78716C] hover:bg-red-50/50 hover:text-[#1C1917]'
                    }`}
                  >
                    <img src={p.avatar} alt={p.name} className="w-10 h-10 rounded-full object-cover border border-stone-200" />
                    <span className="font-semibold text-[11px] leading-tight line-clamp-1">{p.name}</span>
                    <span className="text-[10px] text-[#DC2626] font-bold">{p.rating} ★</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">
              Select New Date (IST)
            </label>
            <input
              type="date"
              value={selectedDate}
              min={getTodayISTDateString()}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedSlot('');
                setErrorMsg(null);
              }}
              className="glass-input w-full px-3.5 py-2.5 text-xs text-[#1C1917] font-mono bg-white"
            />
          </div>

          {/* Slot Picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#1C1917]">
                Available Slots ({availableSlots.filter((s) => s.isAvailable).length} open)
              </label>
              <span className="text-[11px] text-[#DC2626] font-mono font-semibold">12-hr IST</span>
            </div>

            {availableSlots.length === 0 ? (
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-center text-[#78716C]">
                No available slots for this date. Check for holidays or try another day.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                {availableSlots.map((slot) => {
                  const isSelected = selectedSlot === slot.timeSlot;
                  return (
                    <button
                      key={slot.timeSlot}
                      type="button"
                      disabled={!slot.isAvailable}
                      onClick={() => {
                        setSelectedSlot(slot.timeSlot);
                        setErrorMsg(null);
                      }}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-mono transition-all ${
                        isSelected
                          ? 'slot-selected font-bold'
                          : slot.isAvailable
                          ? 'slot-chip hover:border-[#DC2626]'
                          : 'slot-booked opacity-40'
                      }`}
                      title={slot.unavailableReason || 'Available'}
                    >
                      {slot.timeSlot}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Error display */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[#991B1B] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-4 py-2.5 text-xs flex-1"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRescheduleSubmit}
            disabled={!selectedSlot}
            className="btn-primary px-4 py-2.5 text-xs flex-1 font-semibold flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Confirm New Time</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
