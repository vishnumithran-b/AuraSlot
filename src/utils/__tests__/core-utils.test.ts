import { describe, it, expect } from 'vitest';
import {
  formatISTTimeDisplay,
  formatISTDisplayDate,
  createISTIsoString,
  isPastSlotIST,
  getCountdownIST,
} from '../date-ist';
import { formatINR, numberToWordsINR, roundToTwoDecimals } from '../currency';
import { calculateGSTBreakdown } from '../gst';
import {
  doesIntervalOverlap,
  isProviderAvailableForSlot,
} from '../slots';
import { calculateRefund } from '../refund';
import {
  isValidLuhn,
  isValidUPI,
  formatCardNumber,
  formatCardExpiry,
} from '../validators';
import type { Provider, Appointment } from '../../types/appointment';

describe('1. IST Timezone and Formatting', () => {
  it('appends IST label and retains 12-hour format', () => {
    expect(formatISTTimeDisplay('10:30 AM')).toBe('10:30 AM IST');
    expect(formatISTTimeDisplay('04:45 PM IST')).toBe('04:45 PM IST');
  });

  it('formats dates into DD MMM YYYY in IST regardless of time of day', () => {
    expect(formatISTDisplayDate('2026-10-12')).toMatch(/12 Oct 2026/);
  });

  it('creates ISO strings with +05:30 offset', () => {
    const iso = createISTIsoString('2026-10-15', '11:30 AM');
    expect(iso).toBe('2026-10-15T11:30:00+05:30');
  });

  it('identifies past and future slots correctly based on current IST timestamp', () => {
    // Reference fake "now": 2026-10-10 14:00:00 IST
    // IST is UTC+5:30, so 14:00 IST is 08:30 UTC
    const mockNow = new Date(Date.UTC(2026, 9, 10, 8, 30, 0));

    // Earlier today: 10:00 AM IST should be past
    expect(isPastSlotIST('2026-10-10', '10:00 AM', mockNow)).toBe(true);

    // Later today: 04:00 PM IST should NOT be past
    expect(isPastSlotIST('2026-10-10', '04:00 PM', mockNow)).toBe(false);

    // Tomorrow should NOT be past
    expect(isPastSlotIST('2026-10-11', '09:00 AM', mockNow)).toBe(false);

    // Yesterday should be past
    expect(isPastSlotIST('2026-10-09', '05:00 PM', mockNow)).toBe(true);
  });

  it('calculates live countdown accurately in IST', () => {
    const mockNow = new Date(Date.UTC(2026, 9, 10, 8, 30, 0)); // 14:00 IST
    const countdown = getCountdownIST('2026-10-10', '04:15 PM', mockNow); // 16:15 IST -> 2h 15m away
    expect(countdown.isPast).toBe(false);
    expect(countdown.hours).toBe(2);
    expect(countdown.minutes).toBe(15);
    expect(countdown.formatted).toBe('Starts in 2h 15m');
  });
});

describe('2. Currency and Indian Numbering System', () => {
  it('formats amounts in Indian Rupees (INR) with Indian comma grouping', () => {
    expect(formatINR(1499)).toBe('₹1,499.00');
    expect(formatINR(100000)).toBe('₹1,00,000.00');
  });

  it('converts amounts to English words in Indian numbering system', () => {
    expect(numberToWordsINR(1180)).toBe('One Thousand One Hundred and Eighty Rupees Only');
    expect(numberToWordsINR(1000)).toBe('One Thousand Rupees Only');
    expect(numberToWordsINR(1499.50)).toBe(
      'One Thousand Four Hundred and Ninety-Nine Rupees and Fifty Paise Only'
    );
  });
});

describe('3. GST Calculation & Interstate / Intrastate Rules', () => {
  it('computes CGST (9%) + SGST (9%) for intra-state bookings (Tamil Nadu)', () => {
    const breakdown = calculateGSTBreakdown({
      basePrice: 1000,
      gstRate: 18,
      state: 'Tamil Nadu',
    });

    expect(breakdown.isInterState).toBe(false);
    expect(breakdown.basePrice).toBe(1000.00);
    expect(breakdown.taxableAmount).toBe(1000.00);
    expect(breakdown.cgst).toBe(90.00);
    expect(breakdown.sgst).toBe(90.00);
    expect(breakdown.igst).toBe(0.00);
    expect(breakdown.totalAmount).toBe(1180.00);

    // Strict equality check: taxable + taxes === total
    expect(roundToTwoDecimals(breakdown.taxableAmount + breakdown.cgst + breakdown.sgst)).toBe(
      breakdown.totalAmount
    );
  });

  it('computes single IGST (18%) for inter-state bookings (e.g. Karnataka)', () => {
    const breakdown = calculateGSTBreakdown({
      basePrice: 1000,
      gstRate: 18,
      state: 'Karnataka',
    });

    expect(breakdown.isInterState).toBe(true);
    expect(breakdown.cgst).toBe(0.00);
    expect(breakdown.sgst).toBe(0.00);
    expect(breakdown.igst).toBe(180.00);
    expect(breakdown.totalAmount).toBe(1180.00);

    expect(roundToTwoDecimals(breakdown.taxableAmount + breakdown.igst)).toBe(
      breakdown.totalAmount
    );
  });

  it('applies discounts BEFORE calculating GST', () => {
    const breakdown = calculateGSTBreakdown({
      basePrice: 1000,
      discountAmount: 200, // ₹200 discount
      gstRate: 18,
      state: 'Tamil Nadu',
      couponCode: 'SAVE200',
    });

    expect(breakdown.basePrice).toBe(1000.00);
    expect(breakdown.discountAmount).toBe(200.00);
    expect(breakdown.taxableAmount).toBe(800.00);
    expect(breakdown.cgst).toBe(72.00); // 9% of 800
    expect(breakdown.sgst).toBe(72.00); // 9% of 800
    expect(breakdown.totalAmount).toBe(944.00); // 800 + 72 + 72 = 944
  });
});

describe('4. Slot Overlap & Multi-Provider Collisions', () => {
  it('detects time interval overlaps with buffer', () => {
    // Slot A: 10:00 (600m), duration 60m -> [600, 660], buffer 10m -> blocked until 670m (11:10)
    // Slot B: 10:30 (630m), duration 30m
    expect(doesIntervalOverlap(600, 60, 630, 30, 10)).toBe(true);

    // Slot C: 11:00 (660m), duration 30m -> conflicts because of 10m buffer!
    expect(doesIntervalOverlap(600, 60, 660, 30, 10)).toBe(true);

    // Slot D: 11:10 (670m), duration 30m -> free!
    expect(doesIntervalOverlap(600, 60, 670, 30, 10)).toBe(false);
  });

  it('blocks overlapping slots for the same provider, but NOT for another provider', () => {
    const provider1: Provider = {
      id: 'prov-1',
      name: 'Dr. Priya Raman',
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150',
      role: 'Chief Medical Specialist',
      rating: 4.9,
      reviewCount: 142,
      specialties: ['General Medicine'],
      workingHours: { start: '09:00', end: '18:00' },
      daysOff: [0], // Sunday
    };

    const provider2: Provider = {
      id: 'prov-2',
      name: 'Dr. Arjun Mehta',
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150',
      role: 'Senior Dental Surgeon',
      rating: 4.8,
      reviewCount: 98,
      specialties: ['Dental Care'],
      workingHours: { start: '09:00', end: '18:00' },
      daysOff: [0],
    };

    const existingAppointments: Appointment[] = [
      {
        id: 'APT-1',
        invoiceNumber: 'INV-1',
        fullName: 'Test Patient',
        email: 'patient@example.com',
        phone: '9876543210',
        state: 'Tamil Nadu',
        isInterState: false,
        serviceId: 'srv-60',
        serviceName: 'Comprehensive Checkup',
        providerId: 'prov-1',
        providerName: 'Dr. Priya Raman',
        date: '2026-10-15',
        timeSlot: '10:00 AM',
        endTimeSlot: '11:00 AM',
        isoDateTime: '2026-10-15T10:00:00+05:30',
        duration: 60,
        status: 'upcoming',
        paymentStatus: 'paid',
        paymentMethod: 'upi',
        pricing: {
          basePrice: 1000,
          discountAmount: 0,
          taxableAmount: 1000,
          gstRate: 18,
          cgst: 90,
          sgst: 90,
          igst: 0,
          isInterState: false,
          totalAmount: 1180,
          sacCode: '998311',
        },
        createdAt: '2026-10-10T10:00:00+05:30',
      },
    ];

    // Check 10:30 AM (630 mins) for 30 min duration
    // Provider 1 should be UNAVAILABLE due to overlap with 10:00-11:00 booking
    const checkP1 = isProviderAvailableForSlot(
      provider1,
      '2026-10-15',
      630,
      30,
      existingAppointments,
      10
    );
    expect(checkP1.isAvailable).toBe(false);

    // Provider 2 has no bookings at 10:30 AM -> should be AVAILABLE
    const checkP2 = isProviderAvailableForSlot(
      provider2,
      '2026-10-15',
      630,
      30,
      existingAppointments,
      10
    );
    expect(checkP2.isAvailable).toBe(true);
  });
});

describe('5. Refund & Cancellation Policy in IST', () => {
  it('gives 100% refund for cancellation >= 24h prior', () => {
    // Current time: 2026-10-10 10:00 AM IST
    const mockNow = new Date(Date.UTC(2026, 9, 10, 4, 30, 0));
    // Appointment: 2026-10-12 10:00 AM IST (48h away)
    const refund = calculateRefund(
      {
        date: '2026-10-12',
        timeSlot: '10:00 AM',
        pricing: { totalAmount: 1180 } as any,
        paymentStatus: 'paid',
      },
      mockNow
    );

    expect(refund.eligible).toBe(true);
    expect(refund.refundPercentage).toBe(100);
    expect(refund.refundAmount).toBe(1180);
    expect(refund.cancellationFee).toBe(0);
  });

  it('gives 50% refund for cancellation within 24h (e.g. 5 hours prior)', () => {
    // Current time: 2026-10-10 10:00 AM IST
    const mockNow = new Date(Date.UTC(2026, 9, 10, 4, 30, 0));
    // Appointment: 2026-10-10 03:00 PM IST (5h away)
    const refund = calculateRefund(
      {
        date: '2026-10-10',
        timeSlot: '03:00 PM',
        pricing: { totalAmount: 1180 } as any,
        paymentStatus: 'paid',
      },
      mockNow
    );

    expect(refund.eligible).toBe(true);
    expect(refund.refundPercentage).toBe(50);
    expect(refund.refundAmount).toBe(590);
    expect(refund.cancellationFee).toBe(590);
  });

  it('gives 0% refund for cancellation under 2 hours prior', () => {
    // Current time: 2026-10-10 10:00 AM IST
    const mockNow = new Date(Date.UTC(2026, 9, 10, 4, 30, 0));
    // Appointment: 2026-10-10 11:00 AM IST (1h away)
    const refund = calculateRefund(
      {
        date: '2026-10-10',
        timeSlot: '11:00 AM',
        pricing: { totalAmount: 1180 } as any,
        paymentStatus: 'paid',
      },
      mockNow
    );

    expect(refund.eligible).toBe(false);
    expect(refund.refundPercentage).toBe(0);
    expect(refund.refundAmount).toBe(0);
    expect(refund.cancellationFee).toBe(1180);
  });
});

describe('6. Payment Validation & Luhn Algorithm Check', () => {
  it('validates card numbers accurately using the Luhn algorithm', () => {
    // Valid standard test cards
    expect(isValidLuhn('4242 4242 4242 4242')).toBe(true);
    expect(isValidLuhn('4111 1111 1111 1111')).toBe(true);
    expect(isValidLuhn('4242424242424242')).toBe(true);

    // Invalid cards
    expect(isValidLuhn('4242 4242 4242 4243')).toBe(false);
    expect(isValidLuhn('1234 5678 9012 3456')).toBe(false);
    expect(isValidLuhn('123')).toBe(false);
    expect(isValidLuhn('')).toBe(false);
  });

  it('validates UPI VPA addresses adhering to Indian banking conventions', () => {
    expect(isValidUPI('kavitha@okhdfcbank')).toBe(true);
    expect(isValidUPI('sundaram.k@ybl')).toBe(true);
    expect(isValidUPI('9876543210@paytm')).toBe(true);
    expect(isValidUPI('doctor-clinic@upi')).toBe(true);

    expect(isValidUPI('invalid-upi')).toBe(false);
    expect(isValidUPI('@okhdfcbank')).toBe(false);
    expect(isValidUPI('user@')).toBe(false);
    expect(isValidUPI('')).toBe(false);
  });

  it('formats card numbers into 4-digit groups and card expiry with slashes', () => {
    expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242');
    expect(formatCardExpiry('1228')).toBe('12/28');
    expect(formatCardExpiry('09')).toBe('09');
  });
});
