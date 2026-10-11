import type { Appointment } from '../types/appointment';
import { STORAGE_KEY, INITIAL_SEED_APPOINTMENTS } from './constants';
import { downloadICSFile } from './ics';

export const getAppointmentsFromStorage = (): Appointment[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SEED_APPOINTMENTS));
      return INITIAL_SEED_APPOINTMENTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return INITIAL_SEED_APPOINTMENTS;
  } catch (error) {
    console.error('Failed to load appointments from localStorage:', error);
    return INITIAL_SEED_APPOINTMENTS;
  }
};

export const saveAppointmentsToStorage = (appointments: Appointment[]): boolean => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
    return true;
  } catch (error) {
    console.error('Failed to save appointments to localStorage:', error);
    return false;
  }
};

export const generateBookingId = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const randomSegment = (len: number) => {
    let result = '';
    for (let i = 0; i < len; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  const numPart = Math.floor(1000 + Math.random() * 9000);
  return `APT-${numPart}-${randomSegment(4)}`;
};

export const downloadCalendarEvent = (appointment: Appointment): void => {
  downloadICSFile(appointment);
};

export const formatDisplayPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return phone;
};
