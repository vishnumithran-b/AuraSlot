/**
 * Cancellation & Refund Policy Engine (Computed in IST)
 *
 * Rules:
 * - >= 24 hours prior to appointment slot: Free cancellation (100% refund, 0% fee)
 * - Between 2 hours and 24 hours prior: 50% refund (50% fee)
 * - Under 2 hours prior or past slot: No refund (0% refund, 100% fee)
 */

import { getDiffHoursFromNowIST } from './date-ist';
import { roundToTwoDecimals } from './currency';
import type { Appointment } from '../types/appointment';

export interface RefundCalculationResult {
  eligible: boolean;
  diffHours: number;
  refundPercentage: number;
  refundAmount: number;
  cancellationFee: number;
  policyTier: 'free_cancellation' | 'partial_cancellation' | 'non_refundable';
  policyDescription: string;
}

/**
 * Calculates refund according to IST cancellation policy
 */
export function calculateRefund(
  appointment: Pick<Appointment, 'date' | 'timeSlot' | 'pricing' | 'paymentStatus'>,
  now: Date = new Date()
): RefundCalculationResult {
  const diffHours = getDiffHoursFromNowIST(appointment.date, appointment.timeSlot, now);
  const totalPaid = appointment.paymentStatus === 'paid' ? (appointment.pricing?.totalAmount || 0) : 0;

  if (diffHours >= 24) {
    const refundAmount = roundToTwoDecimals(totalPaid);
    return {
      eligible: true,
      diffHours,
      refundPercentage: 100,
      refundAmount,
      cancellationFee: 0,
      policyTier: 'free_cancellation',
      policyDescription: 'Free cancellation (>24 hours prior). 100% refund will be credited.',
    };
  } else if (diffHours >= 2) {
    const refundAmount = roundToTwoDecimals(totalPaid * 0.5);
    const cancellationFee = roundToTwoDecimals(totalPaid - refundAmount);
    return {
      eligible: true,
      diffHours,
      refundPercentage: 50,
      refundAmount,
      cancellationFee,
      policyTier: 'partial_cancellation',
      policyDescription: 'Short notice cancellation (2 to 24 hours prior). 50% refund applies.',
    };
  } else {
    return {
      eligible: false,
      diffHours,
      refundPercentage: 0,
      refundAmount: 0,
      cancellationFee: roundToTwoDecimals(totalPaid),
      policyTier: 'non_refundable',
      policyDescription: 'Under 2 hours prior or past appointment. Non-refundable per service policy.',
    };
  }
}
