/**
 * GST (Goods and Services Tax) Calculation Engine
 * Indian Tax Compliance with CGST, SGST, IGST, and SAC codes.
 */

import { roundToTwoDecimals } from './currency';
import type { PricingBreakdown } from '../types/appointment';

/**
 * Business GST and Configuration Settings
 * Centralized at the top of this file to avoid hard-coded values anywhere in components.
 */
export const BUSINESS_CONFIG = {
  businessName: 'AuraSlot Pro Services Pvt. Ltd.',
  legalName: 'AuraSlot Pro Services Private Limited',
  tagline: 'Smart appointment booking',
  gstin: '33AAAAA0000A1Z5', // 33 is Tamil Nadu State Code
  homeState: 'Tamil Nadu',
  homeStateCode: '33',
  defaultGSTRate: 18, // 18% standard GST
  defaultSACCode: '998311', // Professional, technical and business services
  registeredAddress: 'Level 4, Express Chambers, 42 Anna Salai, Chennai, Tamil Nadu 600002, India',
  phone: '+91 44 2852 9000',
  email: 'support@auraslot.in',
  website: 'https://auraslot.in',
  cin: 'U74999TN2024PTC123456',
  pan: 'AAAAA0000A',
};

export interface GSTCalculationInput {
  basePrice: number;
  discountAmount?: number;
  gstRate?: number;
  state?: string;
  couponCode?: string;
  sacCode?: string;
}

/**
 * Calculates itemized GST breakdown for an appointment.
 * Ensures that discount is applied BEFORE GST,
 * switches correctly between intra-state (CGST + SGST) and inter-state (IGST),
 * and strictly guarantees that taxableAmount + taxes === totalAmount.
 */
export function calculateGSTBreakdown(input: GSTCalculationInput): PricingBreakdown {
  const base = roundToTwoDecimals(Math.max(0, input.basePrice || 0));
  const rawDiscount = roundToTwoDecimals(Math.max(0, input.discountAmount || 0));
  // Discount cannot exceed base price
  const discountAmount = Math.min(base, rawDiscount);
  const taxableAmount = roundToTwoDecimals(base - discountAmount);

  const gstRate = typeof input.gstRate === 'number' && input.gstRate >= 0
    ? input.gstRate
    : BUSINESS_CONFIG.defaultGSTRate;

  const state = (input.state || BUSINESS_CONFIG.homeState).trim();
  const isInterState = state.toLowerCase() !== BUSINESS_CONFIG.homeState.toLowerCase();

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (taxableAmount > 0 && gstRate > 0) {
    if (isInterState) {
      // Inter-state: Single IGST rate
      igst = roundToTwoDecimals((taxableAmount * gstRate) / 100);
    } else {
      // Intra-state (Tamil Nadu): Half CGST + Half SGST
      const halfRate = gstRate / 2;
      cgst = roundToTwoDecimals((taxableAmount * halfRate) / 100);
      sgst = roundToTwoDecimals((taxableAmount * halfRate) / 100);
    }
  }

  // Exact addition to avoid 1-paise discrepancy
  const totalAmount = roundToTwoDecimals(
    taxableAmount + (isInterState ? igst : cgst + sgst)
  );

  return {
    basePrice: base,
    discountAmount,
    taxableAmount,
    gstRate,
    cgst,
    sgst,
    igst,
    isInterState,
    totalAmount,
    couponCode: input.couponCode,
    sacCode: input.sacCode || BUSINESS_CONFIG.defaultSACCode,
  };
}

/**
 * Calculates discount amount given a base price and a coupon
 */
export function calculateCouponDiscount(
  basePrice: number,
  coupon?: { type: 'percentage' | 'flat'; value: number; minAmount?: number } | null
): number {
  if (!coupon || !coupon.value || coupon.value <= 0) return 0;
  if (coupon.minAmount && basePrice < coupon.minAmount) return 0;

  if (coupon.type === 'percentage') {
    const rawDiscount = (basePrice * coupon.value) / 100;
    return roundToTwoDecimals(Math.min(basePrice, rawDiscount));
  } else {
    // flat discount
    return roundToTwoDecimals(Math.min(basePrice, coupon.value));
  }
}
