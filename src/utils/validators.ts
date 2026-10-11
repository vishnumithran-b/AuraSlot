/**
 * Form and Input Validation Utilities
 * Tailored for Indian contact standards and business constraints.
 */

import type { BookingFormData, FormErrors } from '../types/appointment';

export function isValidIndianPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // Matches 10 digits starting with 6,7,8,9 OR with +91 or 91 or 0 prefix
  const regex = /^(?:\+91|91|0)?[6-9]\d{9}$/;
  return regex.test(cleaned);
}

export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
  return regex.test(email.trim());
}

export function validateBookingForm(data: BookingFormData): {
  isValid: boolean;
  errors: FormErrors;
} {
  const errors: FormErrors = {};

  if (!data.fullName || data.fullName.trim().length < 2) {
    errors.fullName = 'Please enter your full name (at least 2 characters).';
  }

  if (!data.email || !isValidEmail(data.email)) {
    errors.email = 'Please provide a valid email address.';
  }

  if (!data.phone || !isValidIndianPhone(data.phone)) {
    errors.phone = 'Please provide a valid 10-digit Indian mobile number.';
  }

  if (!data.state) {
    errors.state = 'Please select your state for billing.';
  }

  if (!data.serviceId) {
    errors.serviceId = 'Please select a service.';
  }

  if (data.serviceMode === 'customer_location' && (!data.customerAddress || data.customerAddress.trim().length < 5)) {
    errors.customerAddress = 'Please provide your location address for service.';
  }

  if (!data.date) {
    errors.date = 'Please pick an appointment date.';
  }

  if (!data.timeSlot) {
    errors.timeSlot = 'Please choose an available appointment time slot.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function isValidUPI(vpa: string): boolean {
  if (!vpa) return false;
  const trimmed = vpa.trim();
  const regex = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/;
  return regex.test(trimmed);
}

export function isValidLuhn(cardNumber: string): boolean {
  const sanitized = cardNumber.replace(/\D/g, '');
  if (sanitized.length < 13 || sanitized.length > 19) return false;
  let sum = 0;
  let alternate = false;
  for (let i = sanitized.length - 1; i >= 0; i--) {
    let n = parseInt(sanitized.charAt(i), 10);
    if (isNaN(n)) return false;
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 19);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function formatCardExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
}
