export type AppointmentStatus = 'upcoming' | 'completed' | 'cancelled';
export type PaymentStatus = 'paid' | 'pending' | 'refunded';
export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'venue';

export type ServiceMode = 'in_person' | 'online' | 'customer_location';

export interface ServiceOption {
  id: string;
  name: string;
  category: string;
  duration: number; // in minutes (30, 45, 60, 90)
  basePrice: number; // Base price in INR (e.g. 1000)
  gstRate: number; // GST rate percentage (e.g. 18)
  sacCode: string; // Indian SAC code (e.g. "998311")
  description: string;
  badge?: string;
  serviceMode?: ServiceMode;
  isActive?: boolean;
  customFieldIds?: string[];
}

export interface Provider {
  id: string;
  name: string;
  avatar: string;
  role: string;
  rating: number;
  reviewCount: number;
  specialties: string[];
  workingHours: {
    start: string; // "09:00"
    end: string; // "18:00"
  };
  daysOff: number[]; // 0 for Sunday, 6 for Saturday, etc.
  serviceIds?: string[]; // IDs of services offered by this professional
  isActive?: boolean;
}

export interface Coupon {
  code: string;
  type: 'percentage' | 'flat';
  value: number; // e.g. 15 for 15%, or 200 for ₹200
  minAmount?: number;
  description: string;
  expiryDate: string; // YYYY-MM-DD
  isActive: boolean;
}

export interface PublicHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  isMandatory?: boolean;
}

export interface PricingBreakdown {
  basePrice: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  isInterState: boolean;
  totalAmount: number;
  couponCode?: string;
  sacCode: string;
}

export interface CancellationDetails {
  cancelledAt: string; // IST ISO string
  reason?: string;
  refundAmount: number;
  refundPercentage: number;
  cancellationFee: number;
  refundStatus: 'processed' | 'pending' | 'none';
}

export interface RecurringRule {
  frequency: 'weekly' | 'fortnightly' | 'monthly';
  occurrences: number;
  groupId: string;
}

export interface Appointment {
  id: string; // e.g. "APT-2026-8421"
  invoiceNumber: string; // e.g. "INV-2026-1042"
  fullName: string;
  email: string;
  phone: string;
  state: string; // e.g. "Tamil Nadu" or "Karnataka"
  isInterState: boolean;
  serviceId: string;
  serviceName: string;
  serviceCategory?: string;
  serviceMode?: ServiceMode;
  customerAddress?: string;
  onlineMeetingLink?: string;
  customFieldResponses?: Record<string, any>;
  providerId: string; // provider ID or "any"
  providerName: string;
  date: string; // YYYY-MM-DD in IST
  timeSlot: string; // e.g. "10:30 AM"
  endTimeSlot: string; // e.g. "11:30 AM"
  isoDateTime: string; // e.g. "2026-10-12T10:30:00+05:30"
  duration: number; // in minutes
  notes?: string;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  pricing: PricingBreakdown;
  cancellation?: CancellationDetails;
  recurring?: RecurringRule;
  createdAt: string; // IST ISO string
  updatedAt?: string;
}

export interface BookingFormData {
  fullName: string;
  email: string;
  phone: string;
  state: string;
  serviceId: string;
  providerId: string;
  date: string;
  timeSlot: string;
  notes: string;
  couponCode?: string;
  paymentMethod: PaymentMethod;
  isRecurring?: boolean;
  recurringFrequency?: 'weekly' | 'fortnightly' | 'monthly';
  recurringCount?: number;
  serviceMode?: ServiceMode;
  serviceCategory?: string;
  customerAddress?: string;
  customFieldResponses?: Record<string, any>;
}

export interface FormErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  state?: string;
  serviceId?: string;
  providerId?: string;
  date?: string;
  timeSlot?: string;
  notes?: string;
  couponCode?: string;
  customerAddress?: string;
  [customFieldKey: string]: string | undefined;
}

export interface WaitlistEntry {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  serviceId: string;
  providerId: string;
  date: string;
  timeSlot: string;
  createdAt: string;
  status: 'waiting' | 'promoted' | 'cancelled';
}

export interface ActivityLogItem {
  id: string;
  timestamp: string; // IST ISO
  type: 'booking' | 'cancellation' | 'reschedule' | 'payment' | 'reminder' | 'waitlist' | 'system';
  title: string;
  description: string;
  appointmentId?: string;
  userEmail?: string;
  metadata?: Record<string, any>;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  state?: string;
  role: 'customer' | 'admin';
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
  duration?: number;
}
