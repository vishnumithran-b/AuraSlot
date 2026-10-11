/**
 * Advanced Smart Scheduling and Slot Collision Engine
 * Supports multi-provider scheduling, duration-based slots, buffer times,
 * public holidays, admin blocked dates, and overlap prevention.
 */

import { parseTimeSlot, formatTime12Hour, isPastSlotIST } from './date-ist';
import type { Provider, ServiceOption, Appointment, PublicHoliday } from '../types/appointment';

export interface GeneratedSlot {
  timeSlot: string; // "10:30 AM"
  endTimeSlot: string; // "11:30 AM"
  startMinutes: number;
  endMinutes: number;
  isAvailable: boolean;
  isPast: boolean;
  unavailableReason?: string;
  assignedProviderId?: string;
  assignedProviderName?: string;
  availableProviderIds: string[];
}

export const DEFAULT_SCHEDULE_CONFIG = {
  startHour: 9, // 9:00 AM
  endHour: 18, // 6:00 PM (18:00)
  slotIntervalMinutes: 30, // Slot generation step interval
  defaultBufferMinutes: 10, // Buffer between appointments
  lunchBreakStart: '13:00', // 1:00 PM
  lunchBreakEnd: '14:00', // 2:00 PM
  maxBookingDaysAhead: 60,
};

/**
 * Converts a 12-hour or 24-hour time string into minutes from midnight (0 - 1439)
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  if (timeStr.includes('AM') || timeStr.includes('PM') || timeStr.includes('am') || timeStr.includes('pm')) {
    const { hour, minute } = parseTimeSlot(timeStr);
    return hour * 60 + minute;
  }
  const [hStr, mStr] = timeStr.split(':');
  return parseInt(hStr || '0', 10) * 60 + parseInt(mStr || '0', 10);
}

/**
 * Converts minutes from midnight into 12-hour time string (e.g. 630 -> "10:30 AM")
 */
export function minutesToTimeString(minutes: number): string {
  const normMinutes = Math.max(0, minutes % 1440);
  const hour = Math.floor(normMinutes / 60);
  const minute = normMinutes % 60;
  return formatTime12Hour(hour, minute);
}

/**
 * Robust bidirectional overlap detection between two time intervals with buffer.
 * Two intervals [startA, endA] and [startB, endB] with buffer time B:
 * Conflict occurs if slot A's required time + buffer overlaps slot B.
 */
export function doesIntervalOverlap(
  startA: number,
  durationA: number,
  startB: number,
  durationB: number,
  bufferMinutes: number = 0
): boolean {
  const endAWithBuffer = startA + durationA + bufferMinutes;
  const endBWithBuffer = startB + durationB + bufferMinutes;

  return startA < endBWithBuffer && startB < endAWithBuffer;
}

/**
 * Check if a date (YYYY-MM-DD) is an Indian public holiday
 */
export function isPublicHoliday(dateStr: string, holidays: PublicHoliday[] = []): PublicHoliday | null {
  return holidays.find((h) => h.date === dateStr) || null;
}

/**
 * Check if a date is blocked by admin
 */
export function isDateBlocked(dateStr: string, blockedDates: string[] = []): boolean {
  return blockedDates.includes(dateStr);
}

/**
 * Check if a day is a provider's day off
 * 0 = Sunday, 1 = Monday, ..., 6 = Saturday
 */
export function isProviderDayOff(dateStr: string, provider: Provider): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayOfWeek = date.getUTCDay();
  return (provider.daysOff || []).includes(dayOfWeek);
}

/**
 * Checks if a specific provider is available for a proposed appointment slot
 */
export function isProviderAvailableForSlot(
  provider: Provider,
  dateStr: string,
  startMinutes: number,
  durationMinutes: number,
  existingAppointments: Appointment[],
  bufferMinutes: number = DEFAULT_SCHEDULE_CONFIG.defaultBufferMinutes
): { isAvailable: boolean; conflictReason?: string } {
  // 1. Day off check
  if (isProviderDayOff(dateStr, provider)) {
    return { isAvailable: false, conflictReason: `${provider.name} is off on this day` };
  }

  // 2. Working hours check
  const workStart = timeStringToMinutes(provider.workingHours.start);
  const workEnd = timeStringToMinutes(provider.workingHours.end);
  const endMinutes = startMinutes + durationMinutes;

  if (startMinutes < workStart || endMinutes > workEnd) {
    return { isAvailable: false, conflictReason: `Outside ${provider.name}'s working hours` };
  }

  // 3. Lunch break check
  const lunchStart = timeStringToMinutes(DEFAULT_SCHEDULE_CONFIG.lunchBreakStart);
  const lunchEnd = timeStringToMinutes(DEFAULT_SCHEDULE_CONFIG.lunchBreakEnd);
  if (doesIntervalOverlap(startMinutes, durationMinutes, lunchStart, lunchEnd - lunchStart, 0)) {
    return { isAvailable: false, conflictReason: 'Overlaps with lunch break' };
  }

  // 4. Overlap with existing booked appointments for this provider
  const providerAppointments = existingAppointments.filter(
    (apt) =>
      apt.date === dateStr &&
      apt.status !== 'cancelled' &&
      (apt.providerId === provider.id || apt.providerId === 'any')
  );

  for (const apt of providerAppointments) {
    const aptStart = timeStringToMinutes(apt.timeSlot);
    const aptDuration = apt.duration || 30;

    if (doesIntervalOverlap(startMinutes, durationMinutes, aptStart, aptDuration, bufferMinutes)) {
      return {
        isAvailable: false,
        conflictReason: `Overlaps with another booking (${apt.serviceName})`,
      };
    }
  }

  return { isAvailable: true };
}

export interface GenerateSlotsOptions {
  service: ServiceOption;
  providerId: string; // specific provider ID or "any"
  dateStr: string;
  allProviders: Provider[];
  appointments: Appointment[];
  holidays?: PublicHoliday[];
  blockedDates?: string[];
  bufferMinutes?: number;
  now?: Date;
}

/**
 * Generates all time slots for a given date, service, and provider selection.
 * Properly calculates duration and blocks overlapping bookings.
 */
export function generateAvailableSlotsForDate(options: GenerateSlotsOptions): GeneratedSlot[] {
  const {
    service,
    providerId,
    dateStr,
    allProviders,
    appointments,
    holidays = [],
    blockedDates = [],
    bufferMinutes = DEFAULT_SCHEDULE_CONFIG.defaultBufferMinutes,
    now = new Date(),
  } = options;

  const duration = service.duration || 30;
  const slots: GeneratedSlot[] = [];

  // If date is a public holiday
  const holiday = isPublicHoliday(dateStr, holidays);
  if (holiday) {
    return [];
  }

  // If date is blocked by admin
  if (isDateBlocked(dateStr, blockedDates)) {
    return [];
  }

  const { startHour, endHour, slotIntervalMinutes } = DEFAULT_SCHEDULE_CONFIG;
  const startDayMinutes = startHour * 60;
  const endDayMinutes = endHour * 60;

  // Selected providers list
  const candidateProviders =
    providerId === 'any'
      ? allProviders
      : allProviders.filter((p) => p.id === providerId);

  if (candidateProviders.length === 0) {
    return [];
  }

  for (
    let startMin = startDayMinutes;
    startMin + duration <= endDayMinutes;
    startMin += slotIntervalMinutes
  ) {
    const endMin = startMin + duration;
    const timeSlot = minutesToTimeString(startMin);
    const endTimeSlot = minutesToTimeString(endMin);

    const isPast = isPastSlotIST(dateStr, timeSlot, now);

    // Check which providers are free for this slot
    const freeProviders: Provider[] = [];
    let lastConflictReason: string | undefined;

    for (const p of candidateProviders) {
      const check = isProviderAvailableForSlot(
        p,
        dateStr,
        startMin,
        duration,
        appointments,
        bufferMinutes
      );
      if (check.isAvailable) {
        freeProviders.push(p);
      } else {
        lastConflictReason = check.conflictReason;
      }
    }

    const isAvailable = !isPast && freeProviders.length > 0;
    const assignedProvider = freeProviders.length > 0 ? freeProviders[0] : undefined;

    slots.push({
      timeSlot,
      endTimeSlot,
      startMinutes: startMin,
      endMinutes: endMin,
      isAvailable,
      isPast,
      unavailableReason: isPast
        ? 'Time has passed'
        : freeProviders.length === 0
        ? lastConflictReason || 'Slot fully booked'
        : undefined,
      assignedProviderId: assignedProvider?.id,
      assignedProviderName: assignedProvider?.name,
      availableProviderIds: freeProviders.map((p) => p.id),
    });
  }

  return slots;
}

/**
 * Computes dates for recurring appointments (weekly, fortnightly, monthly)
 */
export function generateRecurringDates(
  startDateStr: string,
  frequency: 'weekly' | 'fortnightly' | 'monthly',
  count: number = 4
): string[] {
  const dates: string[] = [startDateStr];
  const [y, m, d] = startDateStr.split('-').map(Number);
  const baseDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

  for (let i = 1; i < count; i++) {
    const nextDate = new Date(baseDate);
    if (frequency === 'weekly') {
      nextDate.setUTCDate(baseDate.getUTCDate() + i * 7);
    } else if (frequency === 'fortnightly') {
      nextDate.setUTCDate(baseDate.getUTCDate() + i * 14);
    } else if (frequency === 'monthly') {
      nextDate.setUTCMonth(baseDate.getUTCMonth() + i);
    }

    const ny = nextDate.getUTCFullYear();
    const nm = String(nextDate.getUTCMonth() + 1).padStart(2, '0');
    const nd = String(nextDate.getUTCDate()).padStart(2, '0');
    dates.push(`${ny}-${nm}-${nd}`);
  }

  return dates;
}
