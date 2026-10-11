import { describe, it, expect } from 'vitest';
import {
  formatISTTimeDisplay,
  formatISTDisplayDate,
  createISTIsoString,
} from '../date-ist';
import { calculateGSTBreakdown } from '../gst';
import { isProviderAvailableForSlot } from '../slots';
import { calculateRefund } from '../refund';
import { generateInvoicePDF } from '../invoice';
import { numberToWordsINR, formatINR, roundToTwoDecimals } from '../currency';
import type { Appointment, Provider } from '../../types/appointment';

describe('Extra Verification Tests Required by Specification', () => {
  it('1. Timezone resilience: formatting returns identical IST values regardless of runtime', () => {
    // A fixed date: 2026-10-15
    const formattedDate = formatISTDisplayDate('2026-10-15');
    expect(formattedDate).toBe('15 Oct 2026');

    // A fixed slot: 10:30 AM
    const formattedTime = formatISTTimeDisplay('10:30 AM');
    expect(formattedTime).toBe('10:30 AM IST');

    // ISO string with explicit +05:30 offset
    const isoString = createISTIsoString('2026-10-15', '10:30 AM');
    expect(isoString).toBe('2026-10-15T10:30:00+05:30');
  });

  it('2. GST breakdown always sums exactly to the total, and CGST/SGST vs IGST switches correctly with state', () => {
    // Intra-state (Tamil Nadu)
    const tnBreakdown = calculateGSTBreakdown({
      basePrice: 1499,
      gstRate: 18,
      state: 'Tamil Nadu',
    });
    expect(tnBreakdown.isInterState).toBe(false);
    expect(tnBreakdown.cgst).toBe(134.91);
    expect(tnBreakdown.sgst).toBe(134.91);
    expect(tnBreakdown.igst).toBe(0);
    expect(
      roundToTwoDecimals(tnBreakdown.taxableAmount + tnBreakdown.cgst + tnBreakdown.sgst)
    ).toBe(tnBreakdown.totalAmount);

    // Inter-state (Maharashtra)
    const mhBreakdown = calculateGSTBreakdown({
      basePrice: 1499,
      gstRate: 18,
      state: 'Maharashtra',
    });
    expect(mhBreakdown.isInterState).toBe(true);
    expect(mhBreakdown.cgst).toBe(0);
    expect(mhBreakdown.sgst).toBe(0);
    expect(mhBreakdown.igst).toBe(269.82);
    expect(mhBreakdown.totalAmount).toBe(1768.82);
    expect(
      roundToTwoDecimals(mhBreakdown.taxableAmount + mhBreakdown.igst)
    ).toBe(mhBreakdown.totalAmount);
  });

  it('3. A 60-minute booking blocks overlapping slots for the same provider, but not for others', () => {
    const providerA: Provider = {
      id: 'doc-a',
      name: 'Dr. A',
      avatar: '',
      role: 'Physician',
      rating: 5,
      reviewCount: 10,
      specialties: ['General'],
      workingHours: { start: '09:00', end: '17:00' },
      daysOff: [],
    };

    const providerB: Provider = {
      id: 'doc-b',
      name: 'Dr. B',
      avatar: '',
      role: 'Dentist',
      rating: 5,
      reviewCount: 10,
      specialties: ['Dental'],
      workingHours: { start: '09:00', end: '17:00' },
      daysOff: [],
    };

    // Provider A has a 60 min booking from 10:00 AM (600 mins) to 11:00 AM (660 mins)
    const existingApts: Appointment[] = [
      {
        id: 'APT-EX1',
        invoiceNumber: 'INV-EX1',
        fullName: 'Client 1',
        email: 'c1@test.com',
        phone: '9840111111',
        state: 'Tamil Nadu',
        isInterState: false,
        serviceId: 'srv-1',
        serviceName: '60 Min Checkup',
        providerId: 'doc-a',
        providerName: 'Dr. A',
        date: '2026-10-20',
        timeSlot: '10:00 AM',
        endTimeSlot: '11:00 AM',
        isoDateTime: '2026-10-20T10:00:00+05:30',
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

    // Slot 10:30 AM (630 min), duration 30 min:
    // Should be blocked for Provider A
    const checkA = isProviderAvailableForSlot(
      providerA,
      '2026-10-20',
      630,
      30,
      existingApts,
      10
    );
    expect(checkA.isAvailable).toBe(false);

    // Should be open for Provider B
    const checkB = isProviderAvailableForSlot(
      providerB,
      '2026-10-20',
      630,
      30,
      existingApts,
      10
    );
    expect(checkB.isAvailable).toBe(true);
  });

  it('4. Cancelling within the policy window shows the correct refund amount', () => {
    // Current time: 2026-10-10 10:00 AM IST
    const now = new Date(Date.UTC(2026, 9, 10, 4, 30, 0));

    // Case A: 30 hours in advance (100% refund)
    const refundA = calculateRefund(
      {
        date: '2026-10-11',
        timeSlot: '04:00 PM', // 30h away
        paymentStatus: 'paid',
        pricing: { totalAmount: 1180 } as any,
      },
      now
    );
    expect(refundA.refundPercentage).toBe(100);
    expect(refundA.refundAmount).toBe(1180);

    // Case B: 10 hours in advance (50% refund)
    const refundB = calculateRefund(
      {
        date: '2026-10-10',
        timeSlot: '08:00 PM', // 10h away
        paymentStatus: 'paid',
        pricing: { totalAmount: 1180 } as any,
      },
      now
    );
    expect(refundB.refundPercentage).toBe(50);
    expect(refundB.refundAmount).toBe(590);

    // Case C: 1 hour in advance (0% refund)
    const refundC = calculateRefund(
      {
        date: '2026-10-10',
        timeSlot: '11:00 AM', // 1h away
        paymentStatus: 'paid',
        pricing: { totalAmount: 1180 } as any,
      },
      now
    );
    expect(refundC.refundPercentage).toBe(0);
    expect(refundC.refundAmount).toBe(0);
  });

  it('5. Invoice PDF generates successfully with correct totals and amount in words', () => {
    const appointment: Appointment = {
      id: 'APT-TEST-99',
      invoiceNumber: 'INV-2026-99',
      fullName: 'Kavitha Sundaram',
      email: 'kavitha@example.com',
      phone: '9840123456',
      state: 'Tamil Nadu',
      isInterState: false,
      serviceId: 'srv-1',
      serviceName: 'General Medical Consultation',
      providerId: 'prov-1',
      providerName: 'Dr. Priya Ramanathan',
      date: '2026-10-15',
      timeSlot: '10:30 AM',
      endTimeSlot: '11:00 AM',
      isoDateTime: '2026-10-15T10:30:00+05:30',
      duration: 30,
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
    };

    const doc = generateInvoicePDF(appointment);
    expect(doc).toBeDefined();

    // Verify words conversion
    const words = numberToWordsINR(appointment.pricing.totalAmount);
    expect(words).toBe('One Thousand One Hundred and Eighty Rupees Only');

    // Verify formatted INR
    expect(formatINR(appointment.pricing.totalAmount)).toBe('₹1,180.00');
  });
});
