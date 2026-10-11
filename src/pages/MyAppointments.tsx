import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Search,
  PlusCircle,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { AppointmentCard } from '../components/AppointmentCard';
import { BookingPassModal } from '../components/BookingPassModal';
import { CancelModal } from '../components/CancelModal';
import { RescheduleModal } from '../components/RescheduleModal';
import { useAppointmentsContext } from '../context/AppointmentsContext';
import { useLabels } from '../context/SettingsContext';
import { formatISTDisplayDate, formatISTTimeDisplay } from '../utils/date-ist';
import type { Appointment, AppointmentStatus } from '../types/appointment';

interface MyAppointmentsProps {
  onNavigateToBook: () => void;
  showToastSuccess: (msg: string) => void;
  showToastError: (msg: string) => void;
  initialStatusFilter?: 'all' | AppointmentStatus;
}

export const MyAppointments: React.FC<MyAppointmentsProps> = ({
  onNavigateToBook,
  showToastSuccess,
  showToastError,
  initialStatusFilter = 'all',
}) => {
  const labels = useLabels();
  const {
    appointments,
    waitlist,
    cancelAppointment,
    rescheduleAppointment,
  } = useAppointmentsContext();

  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>(
    initialStatusFilter
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPassAppointment, setSelectedPassAppointment] = useState<Appointment | null>(
    null
  );
  const [cancellingAppointment, setCancellingAppointment] = useState<Appointment | null>(
    null
  );
  const [reschedulingAppointment, setReschedulingAppointment] = useState<Appointment | null>(
    null
  );

  // Filtered customer appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      const matchSearch =
        !searchQuery.trim() ||
        a.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [appointments, searchQuery, statusFilter]);

  // Counts
  const counts = useMemo(() => {
    return {
      all: appointments.length,
      upcoming: appointments.filter((a) => a.status === 'upcoming').length,
      completed: appointments.filter((a) => a.status === 'completed').length,
      cancelled: appointments.filter((a) => a.status === 'cancelled').length,
    };
  }, [appointments]);

  // Handle Cancel
  const handleConfirmCancel = (reason: string) => {
    if (!cancellingAppointment) return;
    const res = cancelAppointment(cancellingAppointment.id, reason);
    setCancellingAppointment(null);
    if (res.success) {
      showToastSuccess(
        `Appointment cancelled. Refund of ₹${res.refundAmount.toFixed(2)} (${res.refundPercentage}%) initiated.`
      );
    }
  };

  // Handle Reschedule
  const handleConfirmReschedule = (
    newDate: string,
    newTimeSlot: string,
    newProviderId: string
  ) => {
    if (!reschedulingAppointment) return;
    const res = rescheduleAppointment(
      reschedulingAppointment.id,
      newDate,
      newTimeSlot,
      newProviderId
    );
    setReschedulingAppointment(null);
    if (res.success) {
      showToastSuccess('Appointment rescheduled successfully.');
    } else {
      showToastError(res.error || 'Failed to reschedule.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Quick Book CTA */}
      <div className="glass-panel p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-red-900/15 shadow-md">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#DC2626] mb-1">
            <span className="p-1 rounded-lg bg-red-100/90 text-[#DC2626]">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <span className="text-gradient font-bold">Customer Booking Hub • IST Timings</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-['Outfit'] text-[#1C1917]">
            My Scheduled {labels.appointments}
          </h2>
          <p className="text-xs text-[#78716C] mt-0.5">
            Download GST invoices, generate admission QR codes, and manage your bookings.
          </p>
        </div>

        <button
          onClick={onNavigateToBook}
          className="btn-primary px-5 py-2.5 text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-600/20"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Book Another {labels.appointment}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel-subtle p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs border border-red-900/10 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#DC2626] absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search by ${labels.service.toLowerCase()}, ${labels.professional.toLowerCase()}, reference ID, or invoice...`}
            className="glass-input w-full pl-9 pr-3.5 py-2 text-xs text-[#1C1917] bg-white"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap font-bold ${
              statusFilter === 'all'
                ? 'bg-gradient-to-r from-[#B91C1C] via-[#DC2626] to-[#F43F5E] text-white shadow-sm'
                : 'bg-white text-[#78716C] hover:bg-red-50 hover:text-[#1C1917] border border-red-900/10'
            }`}
          >
            All ({counts.all})
          </button>
          <button
            onClick={() => setStatusFilter('upcoming')}
            className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap font-bold ${
              statusFilter === 'upcoming'
                ? 'bg-gradient-to-r from-[#B91C1C] via-[#DC2626] to-[#F43F5E] text-white shadow-sm'
                : 'bg-white text-[#78716C] hover:bg-red-50 hover:text-[#1C1917] border border-red-900/10'
            }`}
          >
            Upcoming ({counts.upcoming})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap font-bold ${
              statusFilter === 'completed'
                ? 'bg-gradient-to-r from-[#B91C1C] via-[#DC2626] to-[#F43F5E] text-white shadow-sm'
                : 'bg-white text-[#78716C] hover:bg-red-50 hover:text-[#1C1917] border border-red-900/10'
            }`}
          >
            Completed ({counts.completed})
          </button>
          <button
            onClick={() => setStatusFilter('cancelled')}
            className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap font-bold ${
              statusFilter === 'cancelled'
                ? 'bg-gradient-to-r from-[#B91C1C] via-[#DC2626] to-[#F43F5E] text-white shadow-sm'
                : 'bg-white text-[#78716C] hover:bg-red-50 hover:text-[#1C1917] border border-red-900/10'
            }`}
          >
            Cancelled ({counts.cancelled})
          </button>
        </div>
      </div>

      {/* Waitlist Active Banner if customer has entries */}
      {waitlist.length > 0 && (
        <div className="p-4 rounded-2xl bg-red-50/80 border border-red-200 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-[#1C1917]">
              <UserCheck className="w-4 h-4 text-[#059669]" />
              <span>Active Waitlist Registrations ({waitlist.length})</span>
            </div>
            <span className="text-[10px] text-[#059669] font-mono font-semibold">Auto-promotion enabled</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {waitlist.map((w) => (
              <div
                key={w.id}
                className="p-2.5 rounded-xl bg-white border border-stone-200 flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-[#1C1917]">{w.fullName}</span>
                  <p className="text-[11px] text-[#78716C]">
                    {formatISTDisplayDate(w.date)} at {formatISTTimeDisplay(w.timeSlot)}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                    w.status === 'promoted'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-50 text-amber-800 border border-amber-300'
                  }`}
                >
                  {w.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Appointment Cards Grid */}
      {filteredAppointments.length === 0 ? (
        <div className="glass-panel p-12 text-center space-y-4 border border-red-900/15">
          <div className="w-16 h-16 rounded-3xl bg-red-50 border border-red-200 mx-auto flex items-center justify-center text-[#DC2626]">
            <Calendar className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1C1917] font-['Outfit']">No Appointments Found</h3>
            <p className="text-xs text-[#78716C] max-w-sm mx-auto mt-1">
              {searchQuery
                ? 'No appointments matched your search query. Try clearing the filters.'
                : `You have no scheduled ${labels.appointments.toLowerCase()} in this category.`}
            </p>
          </div>
          <button
            onClick={onNavigateToBook}
            className="btn-primary px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-2"
          >
            <span>Book an {labels.appointment}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredAppointments.map((apt) => (
            <AppointmentCard
              key={apt.id}
              appointment={apt}
              onViewPass={(target) => setSelectedPassAppointment(target)}
              onReschedule={(target) => setReschedulingAppointment(target)}
              onCancel={(target) => setCancellingAppointment(target)}
              showToastSuccess={showToastSuccess}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {selectedPassAppointment && (
        <BookingPassModal
          appointment={selectedPassAppointment}
          onClose={() => setSelectedPassAppointment(null)}
        />
      )}

      {cancellingAppointment && (
        <CancelModal
          appointment={cancellingAppointment}
          onConfirm={handleConfirmCancel}
          onClose={() => setCancellingAppointment(null)}
        />
      )}

      {reschedulingAppointment && (
        <RescheduleModal
          appointment={reschedulingAppointment}
          onConfirm={handleConfirmReschedule}
          onClose={() => setReschedulingAppointment(null)}
        />
      )}
    </div>
  );
};
