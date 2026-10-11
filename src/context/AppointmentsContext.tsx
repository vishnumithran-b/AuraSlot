import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  Appointment,
  BookingFormData,
  WaitlistEntry,
  ActivityLogItem,
  AppointmentStatus,
  PaymentStatus,
} from '../types/appointment';
import {
  SEED_APPOINTMENTS,
  SEED_ACTIVITY_LOGS,
} from '../data/seedData';
import {
  createISTIsoString,
  getTodayISTDateString,
  formatISTTimeDisplay,
  formatISTDisplayDate,
} from '../utils/date-ist';
import { calculateGSTBreakdown } from '../utils/gst';
import { calculateRefund } from '../utils/refund';
import {
  generateRecurringDates,
  isProviderAvailableForSlot,
  timeStringToMinutes,
  minutesToTimeString,
} from '../utils/slots';
import { useSettings } from './SettingsContext';
import { useAuth } from './AuthContext';

interface UndoCancellationState {
  appointment: Appointment;
  expiresAt: number; // Unix timestamp
  timerId: NodeJS.Timeout | null;
}

interface AppointmentsContextType {
  appointments: Appointment[];
  waitlist: WaitlistEntry[];
  activityLogs: ActivityLogItem[];
  undoState: UndoCancellationState | null;
  bookAppointment: (
    data: BookingFormData,
    paymentSuccess?: boolean
  ) => Promise<{ success: boolean; appointments: Appointment[]; error?: string }>;
  cancelAppointment: (
    appointmentId: string,
    reason?: string
  ) => { success: boolean; refundAmount: number; refundPercentage: number };
  undoCancellation: () => void;
  dismissUndo: () => void;
  rescheduleAppointment: (
    appointmentId: string,
    newDate: string,
    newTimeSlot: string,
    newProviderId?: string
  ) => { success: boolean; error?: string };
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  joinWaitlist: (entry: Omit<WaitlistEntry, 'id' | 'createdAt' | 'status'>) => void;
  simulateReminder: (appointmentId: string, type: '24h' | '1h') => void;
  bulkUpdateStatus: (ids: string[], status: AppointmentStatus) => void;
  bulkCancel: (ids: string[]) => void;
  exportToCSV: (filteredAppointments?: Appointment[]) => void;
  resetToSampleData: () => void;
}

const APPOINTMENTS_KEY = 'auraslot_appointments_master_v2';
const WAITLIST_KEY = 'auraslot_waitlist_master_v2';
const LOGS_KEY = 'auraslot_logs_master_v2';

const AppointmentsContext = createContext<AppointmentsContextType | undefined>(undefined);

export const AppointmentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { services, providers, scheduleSettings, coupons } = useSettings();
  const { user } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      const stored = localStorage.getItem(APPOINTMENTS_KEY);
      return stored ? JSON.parse(stored) : SEED_APPOINTMENTS;
    } catch {
      return SEED_APPOINTMENTS;
    }
  });

  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>(() => {
    try {
      const stored = localStorage.getItem(WAITLIST_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>(() => {
    try {
      const stored = localStorage.getItem(LOGS_KEY);
      return stored ? JSON.parse(stored) : SEED_ACTIVITY_LOGS;
    } catch {
      return SEED_ACTIVITY_LOGS;
    }
  });

  const [undoState, setUndoState] = useState<UndoCancellationState | null>(null);

  useEffect(() => {
    localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem(WAITLIST_KEY, JSON.stringify(waitlist));
  }, [waitlist]);

  useEffect(() => {
    localStorage.setItem(LOGS_KEY, JSON.stringify(activityLogs));
  }, [activityLogs]);

  // Log activity helper
  const addLog = (
    type: ActivityLogItem['type'],
    title: string,
    description: string,
    appointmentId?: string
  ) => {
    const today = getTodayISTDateString();
    const newLog: ActivityLogItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: createISTIsoString(today, '12:00 PM'),
      type,
      title,
      description,
      appointmentId,
      userEmail: user?.email,
    };
    setActivityLogs((prev) => [newLog, ...prev]);
  };

  /**
   * Book appointment flow with GST breakdown, optional recurring, and mock payment
   */
  const bookAppointment = async (
    data: BookingFormData,
    paymentSuccess: boolean = true
  ): Promise<{ success: boolean; appointments: Appointment[]; error?: string }> => {
    const selectedService = services.find((s) => s.id === data.serviceId);
    if (!selectedService) {
      return { success: false, appointments: [], error: 'Service not found' };
    }

    const duration = selectedService.duration;
    const startMin = timeStringToMinutes(data.timeSlot);
    const endMin = startMin + duration;
    const endTimeSlot = minutesToTimeString(endMin);

    // Resolve Provider
    let assignedProvider = providers.find((p) => p.id === data.providerId);
    if (data.providerId === 'any' || !assignedProvider) {
      // Find first available provider offering this specific service
      const eligibleProviders = providers.filter((p) => {
        if (p.isActive === false) return false;
        if (p.serviceIds && p.serviceIds.length > 0 && !p.serviceIds.includes(data.serviceId)) {
          return false;
        }
        return true;
      });

      const free = eligibleProviders.filter((p) => {
        const check = isProviderAvailableForSlot(
          p,
          data.date,
          startMin,
          duration,
          appointments,
          scheduleSettings.bufferMinutes
        );
        return check.isAvailable;
      });

      if (free.length === 0) {
        return {
          success: false,
          appointments: [],
          error: 'No professionals are available for this slot. You can join the waitlist.',
        };
      }
      assignedProvider = free[0];
    } else {
      // Check collision
      const check = isProviderAvailableForSlot(
        assignedProvider,
        data.date,
        startMin,
        duration,
        appointments,
        scheduleSettings.bufferMinutes
      );
      if (!check.isAvailable) {
        return {
          success: false,
          appointments: [],
          error: check.conflictReason || 'Selected time slot is already booked for this professional.',
        };
      }
    }

    // Coupon calculation
    let discountAmount = 0;
    if (data.couponCode) {
      const activeCoupon = coupons.find(
        (c) => c.code.toUpperCase() === data.couponCode?.toUpperCase() && c.isActive
      );
      if (activeCoupon) {
        if (activeCoupon.type === 'percentage') {
          discountAmount = (selectedService.basePrice * activeCoupon.value) / 100;
        } else {
          discountAmount = activeCoupon.value;
        }
      }
    }

    // Determine recurring dates
    const datesToBook = data.isRecurring && data.recurringFrequency
      ? generateRecurringDates(data.date, data.recurringFrequency, data.recurringCount || 3)
      : [data.date];

    const recurringGroupId = data.isRecurring ? `REC-${Date.now()}` : undefined;
    const createdAppointments: Appointment[] = [];
    const paymentStatus: PaymentStatus =
      data.paymentMethod === 'venue' ? 'pending' : paymentSuccess ? 'paid' : 'pending';

    for (let i = 0; i < datesToBook.length; i++) {
      const targetDate = datesToBook[i];
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const appointmentId = `APT-${Date.now().toString().slice(-4)}-${randomSuffix}`;
      const invoiceNumber = `INV-${new Date().getFullYear()}-${randomSuffix}`;

      const pricing = calculateGSTBreakdown({
        basePrice: selectedService.basePrice,
        discountAmount,
        gstRate: selectedService.gstRate,
        state: data.state,
        couponCode: data.couponCode,
        sacCode: selectedService.sacCode,
      });

      const newAppointment: Appointment = {
        id: appointmentId,
        invoiceNumber,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        state: data.state,
        isInterState: pricing.isInterState,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        serviceCategory: selectedService.category,
        serviceMode: data.serviceMode || selectedService.serviceMode || 'in_person',
        customerAddress: data.customerAddress,
        customFieldResponses: data.customFieldResponses,
        providerId: assignedProvider.id,
        providerName: assignedProvider.name,
        date: targetDate,
        timeSlot: data.timeSlot,
        endTimeSlot,
        isoDateTime: createISTIsoString(targetDate, data.timeSlot),
        duration,
        notes: data.notes,
        status: 'upcoming',
        paymentStatus,
        paymentMethod: data.paymentMethod,
        pricing,
        recurring: data.isRecurring && data.recurringFrequency
          ? {
              frequency: data.recurringFrequency,
              occurrences: datesToBook.length,
              groupId: recurringGroupId!,
            }
          : undefined,
        createdAt: createISTIsoString(getTodayISTDateString(), '12:00 PM'),
      };

      createdAppointments.push(newAppointment);
    }

    setAppointments((prev) => [...createdAppointments, ...prev]);

    // Log Activity
    const firstApt = createdAppointments[0];
    addLog(
      'booking',
      `Appointment Booked (${firstApt.serviceName})`,
      `${data.fullName} reserved ${firstApt.serviceName} with ${assignedProvider.name} on ${formatISTDisplayDate(firstApt.date)} at ${formatISTTimeDisplay(firstApt.timeSlot)}. Total: ₹${firstApt.pricing.totalAmount.toFixed(2)}.`,
      firstApt.id
    );

    return { success: true, appointments: createdAppointments };
  };

  /**
   * Cancel appointment with refund policy and 10-second undo window
   */
  const cancelAppointment = (
    appointmentId: string,
    reason: string = 'User requested cancellation'
  ): { success: boolean; refundAmount: number; refundPercentage: number } => {
    const target = appointments.find((a) => a.id === appointmentId);
    if (!target) return { success: false, refundAmount: 0, refundPercentage: 0 };

    const refund = calculateRefund(target);

    // Save previous state for undo
    if (undoState?.timerId) {
      clearTimeout(undoState.timerId);
    }

    const timerId = setTimeout(() => {
      setUndoState(null);
    }, 10000); // 10 seconds undo window

    setUndoState({
      appointment: { ...target },
      expiresAt: Date.now() + 10000,
      timerId,
    });

    const updatedAppointment: Appointment = {
      ...target,
      status: 'cancelled',
      paymentStatus: refund.refundAmount > 0 ? 'refunded' : target.paymentStatus,
      cancellation: {
        cancelledAt: createISTIsoString(getTodayISTDateString(), '12:00 PM'),
        reason,
        refundAmount: refund.refundAmount,
        refundPercentage: refund.refundPercentage,
        cancellationFee: refund.cancellationFee,
        refundStatus: refund.refundAmount > 0 ? 'processed' : 'none',
      },
    };

    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? updatedAppointment : a))
    );

    addLog(
      'cancellation',
      `Appointment Cancelled: ${target.id}`,
      `Cancelled by ${target.fullName}. Refund of ₹${refund.refundAmount.toFixed(2)} (${refund.refundPercentage}%) calculated under IST policy.`,
      target.id
    );

    // Check waitlist to auto-promote candidates
    promoteWaitlistCandidate(target.date, target.timeSlot, target.serviceId, target.providerId);

    return {
      success: true,
      refundAmount: refund.refundAmount,
      refundPercentage: refund.refundPercentage,
    };
  };

  /**
   * Undo cancellation within 10-second window
   */
  const undoCancellation = () => {
    if (!undoState) return;
    if (undoState.timerId) {
      clearTimeout(undoState.timerId);
    }

    const original = undoState.appointment;
    setAppointments((prev) =>
      prev.map((a) => (a.id === original.id ? original : a))
    );

    addLog(
      'system',
      `Cancellation Undone: ${original.id}`,
      `Appointment for ${original.fullName} restored to confirmed upcoming status.`,
      original.id
    );

    setUndoState(null);
  };

  const dismissUndo = () => {
    if (undoState?.timerId) {
      clearTimeout(undoState.timerId);
    }
    setUndoState(null);
  };

  /**
   * Reschedule appointment flow
   */
  const rescheduleAppointment = (
    appointmentId: string,
    newDate: string,
    newTimeSlot: string,
    newProviderId?: string
  ): { success: boolean; error?: string } => {
    const target = appointments.find((a) => a.id === appointmentId);
    if (!target) return { success: false, error: 'Appointment not found' };

    const providerId = newProviderId || target.providerId;
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return { success: false, error: 'Provider not found' };

    const startMin = timeStringToMinutes(newTimeSlot);
    const duration = target.duration || 30;

    // Filter out the current appointment during conflict check
    const otherAppointments = appointments.filter((a) => a.id !== appointmentId);
    const check = isProviderAvailableForSlot(
      provider,
      newDate,
      startMin,
      duration,
      otherAppointments,
      scheduleSettings.bufferMinutes
    );

    if (!check.isAvailable) {
      return { success: false, error: check.conflictReason || 'Slot conflicts with existing booking' };
    }

    const endMin = startMin + duration;
    const endTimeSlot = minutesToTimeString(endMin);

    const updated: Appointment = {
      ...target,
      date: newDate,
      timeSlot: newTimeSlot,
      endTimeSlot,
      providerId: provider.id,
      providerName: provider.name,
      isoDateTime: createISTIsoString(newDate, newTimeSlot),
      status: 'upcoming',
      updatedAt: createISTIsoString(getTodayISTDateString(), '12:00 PM'),
    };

    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? updated : a))
    );

    addLog(
      'reschedule',
      `Appointment Rescheduled: ${target.id}`,
      `Shifted to ${formatISTDisplayDate(newDate)} at ${formatISTTimeDisplay(newTimeSlot)} with ${provider.name}.`,
      target.id
    );

    return { success: true };
  };

  const updateAppointment = (id: string, updates: Partial<Appointment>) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  /**
   * Waitlist entry
   */
  const joinWaitlist = (entry: Omit<WaitlistEntry, 'id' | 'createdAt' | 'status'>) => {
    const newEntry: WaitlistEntry = {
      ...entry,
      id: `wait-${Date.now()}`,
      createdAt: createISTIsoString(getTodayISTDateString(), '12:00 PM'),
      status: 'waiting',
    };
    setWaitlist((prev) => [newEntry, ...prev]);

    addLog(
      'waitlist',
      `Joined Waitlist: ${entry.fullName}`,
      `Joined waitlist for ${formatISTDisplayDate(entry.date)} at ${formatISTTimeDisplay(entry.timeSlot)}.`,
      undefined
    );
  };

  /**
   * Promote waitlist candidate when a slot is freed
   */
  const promoteWaitlistCandidate = (
    date: string,
    timeSlot: string,
    serviceId: string,
    providerId: string
  ) => {
    const candidate = waitlist.find(
      (w) =>
        w.date === date &&
        w.timeSlot === timeSlot &&
        w.status === 'waiting' &&
        (w.serviceId === serviceId || !w.serviceId) &&
        (w.providerId === providerId || w.providerId === 'any')
    );

    if (candidate) {
      setWaitlist((prev) =>
        prev.map((w) => (w.id === candidate.id ? { ...w, status: 'promoted' } : w))
      );

      addLog(
        'waitlist',
        `Waitlist Auto-Promoted: ${candidate.fullName}`,
        `Candidate auto-promoted for cancelled slot on ${formatISTDisplayDate(date)} at ${formatISTTimeDisplay(timeSlot)}!`
      );
    }
  };

  /**
   * Simulated reminder notification (Email / WhatsApp / SMS)
   */
  const simulateReminder = (appointmentId: string, type: '24h' | '1h') => {
    const target = appointments.find((a) => a.id === appointmentId);
    if (!target) return;

    addLog(
      'reminder',
      `Simulated ${type} Notification Sent`,
      `Sent automated ${type} WhatsApp, SMS & Email reminders to ${target.fullName} (${target.phone}) for ${target.serviceName} on ${formatISTDisplayDate(target.date)} at ${formatISTTimeDisplay(target.timeSlot)}.`,
      target.id
    );
  };

  const bulkUpdateStatus = (ids: string[], status: AppointmentStatus) => {
    setAppointments((prev) =>
      prev.map((a) => (ids.includes(a.id) ? { ...a, status } : a))
    );
    addLog('system', 'Bulk Status Update', `Updated ${ids.length} appointment(s) to ${status}.`);
  };

  const bulkCancel = (ids: string[]) => {
    setAppointments((prev) =>
      prev.map((a) =>
        ids.includes(a.id)
          ? {
              ...a,
              status: 'cancelled',
              cancellation: {
                cancelledAt: createISTIsoString(getTodayISTDateString(), '12:00 PM'),
                reason: 'Bulk cancellation by administrator',
                refundAmount: a.pricing.totalAmount,
                refundPercentage: 100,
                cancellationFee: 0,
                refundStatus: 'processed',
              },
            }
          : a
      )
    );
    addLog('cancellation', 'Bulk Cancellation Executed', `Admin cancelled ${ids.length} appointment(s).`);
  };

  /**
   * Export appointments to CSV with full INR & GST details
   */
  const exportToCSV = (filteredAppointments?: Appointment[]) => {
    const list = filteredAppointments || appointments;
    const headers = [
      'Appointment ID',
      'Invoice No',
      'Customer Name',
      'Email',
      'Phone',
      'State',
      'Service',
      'Provider',
      'Date (IST)',
      'Time (IST)',
      'Duration (mins)',
      'Status',
      'Payment Status',
      'Payment Mode',
      'SAC Code',
      'Base Price (INR)',
      'Discount (INR)',
      'Taxable Value (INR)',
      'GST Rate (%)',
      'CGST (INR)',
      'SGST (INR)',
      'IGST (INR)',
      'Total Payable (INR)',
    ];

    const rows = list.map((a) => [
      a.id,
      a.invoiceNumber,
      `"${a.fullName.replace(/"/g, '""')}"`,
      a.email,
      a.phone,
      `"${a.state}"`,
      `"${a.serviceName.replace(/"/g, '""')}"`,
      `"${a.providerName.replace(/"/g, '""')}"`,
      a.date,
      `"${a.timeSlot} IST"`,
      a.duration,
      a.status,
      a.paymentStatus,
      a.paymentMethod,
      a.pricing.sacCode,
      a.pricing.basePrice.toFixed(2),
      a.pricing.discountAmount.toFixed(2),
      a.pricing.taxableAmount.toFixed(2),
      a.pricing.gstRate,
      a.pricing.cgst.toFixed(2),
      a.pricing.sgst.toFixed(2),
      a.pricing.igst.toFixed(2),
      a.pricing.totalAmount.toFixed(2),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auraslot_appointments_${getTodayISTDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetToSampleData = () => {
    setAppointments(SEED_APPOINTMENTS);
    setActivityLogs(SEED_ACTIVITY_LOGS);
    setWaitlist([]);
    localStorage.removeItem(APPOINTMENTS_KEY);
    localStorage.removeItem(LOGS_KEY);
    localStorage.removeItem(WAITLIST_KEY);
  };

  return (
    <AppointmentsContext.Provider
      value={{
        appointments,
        waitlist,
        activityLogs,
        undoState,
        bookAppointment,
        cancelAppointment,
        undoCancellation,
        dismissUndo,
        rescheduleAppointment,
        updateAppointment,
        joinWaitlist,
        simulateReminder,
        bulkUpdateStatus,
        bulkCancel,
        exportToCSV,
        resetToSampleData,
      }}
    >
      {children}
    </AppointmentsContext.Provider>
  );
};

export const useAppointmentsContext = (): AppointmentsContextType => {
  const context = useContext(AppointmentsContext);
  if (!context) {
    throw new Error('useAppointmentsContext must be used within an AppointmentsProvider');
  }
  return context;
};
