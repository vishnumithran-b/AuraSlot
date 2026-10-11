import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  Clock,
  User,
  Mail,
  Tag,
  AlertCircle,
  Repeat,
  MapPin,
  ChevronRight,
  Video,
  Building2,
  Home,
  Check,
} from 'lucide-react';
import { useSettings, useLabels } from '../context/SettingsContext';
import { useAppointmentsContext } from '../context/AppointmentsContext';
import { useAuth } from '../context/AuthContext';
import { INDIAN_STATES, DEFAULT_STATE } from '../data/indianStates';
import {
  generateAvailableSlotsForDate,
  isPublicHoliday,
  isDateBlocked,
} from '../utils/slots';
import {
  formatISTDisplayDate,
  formatISTTimeDisplay,
  getTodayISTDateString,
  isPastDateIST,
} from '../utils/date-ist';
import { formatINR } from '../utils/currency';
import { calculateGSTBreakdown } from '../utils/gst';
import { validateBookingForm } from '../utils/validators';
import { PaymentModal } from './PaymentModal';
import { WaitlistModal } from './WaitlistModal';
import type {
  BookingFormData,
  FormErrors,
  PaymentMethod,
  Appointment,
  ServiceMode,
} from '../types/appointment';

interface BookingFormProps {
  onBookSuccess: (appointment: Appointment) => void;
  showToastError: (msg: string) => void;
  showToastSuccess: (msg: string) => void;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  onBookSuccess,
  showToastError,
  showToastSuccess,
}) => {
  const {
    services,
    providers,
    holidays,
    blockedDates,
    coupons,
    scheduleSettings,
    categories,
    customFields,
  } = useSettings();
  const labels = useLabels();
  const { appointments, bookAppointment, joinWaitlist } = useAppointmentsContext();
  const { user } = useAuth();

  const todayIST = getTodayISTDateString();

  // Active Category Filter for Step 1
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Form State
  const [formData, setFormData] = useState<BookingFormData>({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    state: user?.state || DEFAULT_STATE,
    serviceId: services[0]?.id || '',
    providerId: 'any',
    date: todayIST,
    timeSlot: '',
    notes: '',
    couponCode: '',
    paymentMethod: 'upi',
    isRecurring: false,
    recurringFrequency: 'weekly',
    recurringCount: 3,
    customFieldResponses: {},
    customerAddress: '',
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    description: string;
  } | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [waitlistTargetSlot, setWaitlistTargetSlot] = useState<string | null>(null);

  // Selected Service
  const selectedService = useMemo(() => {
    return services.find((s) => s.id === formData.serviceId) || services[0];
  }, [services, formData.serviceId]);

  // Keep serviceId valid when services list changes
  useEffect(() => {
    if (services.length > 0 && !services.some((s) => s.id === formData.serviceId)) {
      setFormData((prev) => ({
        ...prev,
        serviceId: services[0].id,
      }));
    }
  }, [services, formData.serviceId]);

  // Eligible Providers for selected service (Per-professional services mapping)
  const eligibleProviders = useMemo(() => {
    if (!selectedService) return providers;
    return providers.filter(
      (p) =>
        !p.serviceIds ||
        p.serviceIds.length === 0 ||
        p.serviceIds.includes(selectedService.id)
    );
  }, [providers, selectedService]);

  // Reset providerId to 'any' if currently selected provider is not eligible
  useEffect(() => {
    if (
      formData.providerId !== 'any' &&
      !eligibleProviders.some((p) => p.id === formData.providerId)
    ) {
      setFormData((prev) => ({ ...prev, providerId: 'any' }));
    }
  }, [eligibleProviders, formData.providerId]);

  // Relevant custom questions for selected service
  const relevantCustomFields = useMemo(() => {
    if (!selectedService) return [];
    if (selectedService.customFieldIds && selectedService.customFieldIds.length > 0) {
      return customFields.filter((f) =>
        selectedService.customFieldIds!.includes(f.id)
      );
    }
    return customFields;
  }, [customFields, selectedService]);

  // Filtered services for display in Step 1
  const displayedServices = useMemo(() => {
    if (selectedCategoryFilter === 'all') return services;
    return services.filter(
      (s) => s.category.toLowerCase() === selectedCategoryFilter.toLowerCase()
    );
  }, [services, selectedCategoryFilter]);

  // Unique category names from settings or services
  const categoryList = useMemo(() => {
    const names = new Set<string>();
    categories.forEach((c) => names.add(c.name));
    services.forEach((s) => names.add(s.category));
    return Array.from(names);
  }, [categories, services]);

  // Compute live price breakdown with GST
  const livePricing = useMemo(() => {
    if (!selectedService) {
      return calculateGSTBreakdown({ basePrice: 0, state: formData.state });
    }

    return calculateGSTBreakdown({
      basePrice: selectedService.basePrice,
      discountAmount: appliedCoupon ? appliedCoupon.discount : 0,
      gstRate: selectedService.gstRate,
      state: formData.state,
      couponCode: appliedCoupon?.code,
      sacCode: selectedService.sacCode,
    });
  }, [selectedService, appliedCoupon, formData.state]);

  // Available slots for selected date, provider, and service
  const availableSlots = useMemo(() => {
    if (!selectedService || !formData.date || isPastDateIST(formData.date)) {
      return [];
    }

    return generateAvailableSlotsForDate({
      service: selectedService,
      providerId: formData.providerId,
      dateStr: formData.date,
      allProviders: eligibleProviders,
      appointments,
      holidays,
      blockedDates,
      bufferMinutes: scheduleSettings.bufferMinutes,
    });
  }, [
    selectedService,
    formData.providerId,
    formData.date,
    eligibleProviders,
    appointments,
    holidays,
    blockedDates,
    scheduleSettings.bufferMinutes,
  ]);

  // Verify date status (holiday or closed)
  const holiday = useMemo(() => isPublicHoliday(formData.date, holidays), [formData.date, holidays]);
  const isDateClosed = useMemo(() => isDateBlocked(formData.date, blockedDates), [formData.date, blockedDates]);

  // Reset timeslot if not in available slots
  useEffect(() => {
    if (formData.timeSlot) {
      const match = availableSlots.find(
        (s) => s.timeSlot === formData.timeSlot && s.isAvailable
      );
      if (!match) {
        setFormData((prev) => ({ ...prev, timeSlot: '' }));
      }
    }
  }, [availableSlots, formData.timeSlot]);

  // Handle Coupon Apply
  const handleApplyCoupon = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCouponError(null);
    const code = couponInput.trim().toUpperCase();
    if (!code) return;

    const coupon = coupons.find((c) => c.code.toUpperCase() === code && c.isActive);
    if (!coupon) {
      setCouponError('Invalid coupon code or offer expired.');
      setAppliedCoupon(null);
      return;
    }

    if (coupon.minAmount && selectedService && selectedService.basePrice < coupon.minAmount) {
      setCouponError(`Requires minimum service value of ${formatINR(coupon.minAmount)}.`);
      return;
    }

    let discount = 0;
    if (selectedService) {
      if (coupon.type === 'percentage') {
        discount = (selectedService.basePrice * coupon.value) / 100;
      } else {
        discount = coupon.value;
      }
    }

    setAppliedCoupon({
      code: coupon.code,
      discount,
      description: coupon.description,
    });
    setFormData((prev) => ({ ...prev, couponCode: coupon.code }));
    showToastSuccess(`Coupon ${coupon.code} applied! Saved ${formatINR(discount)}.`);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
    setFormData((prev) => ({ ...prev, couponCode: undefined }));
  };

  // Custom Field Value Change
  const handleCustomFieldChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      customFieldResponses: {
        ...(prev.customFieldResponses || {}),
        [fieldId]: value,
      },
    }));
    if (formErrors[fieldId]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  // Submit flow
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submissionData: BookingFormData = {
      ...formData,
      serviceMode: selectedService?.serviceMode || 'in_person',
      serviceCategory: selectedService?.category,
    };

    const validation = validateBookingForm(submissionData);
    const customErrors: FormErrors = {};

    // Validate dynamic custom fields
    for (const field of relevantCustomFields) {
      if (field.required) {
        const val = formData.customFieldResponses?.[field.id];
        if (
          val === undefined ||
          val === null ||
          (typeof val === 'string' && val.trim() === '') ||
          (field.type === 'checkbox' && !val)
        ) {
          customErrors[field.id] = `${field.label} is required.`;
        }
      }
    }

    const allErrors = { ...validation.errors, ...customErrors };

    if (!validation.isValid || Object.keys(customErrors).length > 0) {
      setFormErrors(allErrors);
      showToastError('Please complete all required fields.');
      return;
    }

    setFormErrors({});
    setShowPaymentModal(true);
  };

  // Process booking creation via PaymentModal
  const handleProcessPaymentBooking = async (
    paymentMethod: PaymentMethod,
    _transactionId: string
  ): Promise<{ success: boolean; appointment?: Appointment; error?: string }> => {
    const updatedForm: BookingFormData = {
      ...formData,
      paymentMethod,
      serviceMode: selectedService?.serviceMode || 'in_person',
      serviceCategory: selectedService?.category,
    };
    const res = await bookAppointment(updatedForm, true);
    if (res.success && res.appointments.length > 0) {
      return { success: true, appointment: res.appointments[0] };
    }
    return {
      success: false,
      error: res.error || 'Failed to complete appointment reservation.',
    };
  };

  // Payment Final Completion Handler
  const handleBookingComplete = (appointment: Appointment) => {
    setShowPaymentModal(false);
    showToastSuccess(
      `Appointment confirmed! Reference ID: ${appointment.id}. Invoice generated.`
    );
    onBookSuccess(appointment);
  };

  // Legacy fallback
  const handlePaymentSuccess = async (
    paymentMethod: PaymentMethod,
    _transactionId: string
  ) => {
    setShowPaymentModal(false);
    const updatedForm = {
      ...formData,
      paymentMethod,
      serviceMode: selectedService?.serviceMode || 'in_person',
      serviceCategory: selectedService?.category,
    };

    const res = await bookAppointment(updatedForm, true);
    if (res.success && res.appointments.length > 0) {
      showToastSuccess(
        `Appointment confirmed! Reference ID: ${res.appointments[0].id}. Invoice generated.`
      );
      onBookSuccess(res.appointments[0]);
    } else {
      showToastError(res.error || 'Failed to complete appointment reservation.');
    }
  };

  // Helper for mode presentation
  const renderModeBadge = (mode?: ServiceMode) => {
    switch (mode) {
      case 'online':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
            <Video className="w-3 h-3 text-sky-600" />
            Online
          </span>
        );
      case 'customer_location':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <Home className="w-3 h-3 text-amber-700" />
            At Customer's Location
          </span>
        );
      case 'in_person':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Building2 className="w-3 h-3 text-emerald-700" />
            In-Person
          </span>
        );
    }
  };

  return (
    <div className="glass-panel p-6 sm:p-8 space-y-8 relative border border-red-900/15 shadow-xl">
      {/* Form Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#DC2626] mb-1">
          <span className="p-1 rounded-lg bg-red-100/90 text-[#DC2626]">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <span className="text-gradient font-bold">{labels.tagline}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C1917] font-['Outfit']">
          Book Your {labels.appointment}
        </h2>
        <p className="text-xs text-[#78716C] mt-1">
          All appointments are timed and locked in{' '}
          <span className="text-[#DC2626] font-semibold">
            Indian Standard Time (IST, UTC+5:30)
          </span>
          .
        </p>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-8">
        {/* STEP 1: CHOOSE CATEGORY AND SERVICE */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-red-900/10 text-xs font-bold uppercase tracking-wider text-[#1C1917]">
            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#DC2626] to-[#F43F5E] text-white flex items-center justify-center text-[11px] font-extrabold shadow-sm">
              1
            </span>
            <span>Choose Category & {labels.service}</span>
          </div>

          {/* Category Filter Pills */}
          {categoryList.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[#78716C]">
                Filter by Category:
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    selectedCategoryFilter === 'all'
                      ? 'bg-gradient-to-r from-[#B91C1C] via-[#DC2626] to-[#F43F5E] text-white shadow-sm'
                      : 'bg-white text-[#78716C] hover:bg-red-50 hover:text-[#1C1917] border border-red-900/10'
                  }`}
                >
                  All Categories ({services.length})
                </button>
                {categoryList.map((catName) => {
                  const isSelected =
                    selectedCategoryFilter.toLowerCase() === catName.toLowerCase();
                  const count = services.filter(
                    (s) => s.category.toLowerCase() === catName.toLowerCase()
                  ).length;
                  return (
                    <button
                      key={catName}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(catName)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#B91C1C] via-[#DC2626] to-[#F43F5E] text-white shadow-sm'
                          : 'bg-white text-[#78716C] hover:bg-red-50 hover:text-[#1C1917] border border-red-900/10'
                      }`}
                    >
                      {catName} {count > 0 ? `(${count})` : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Service Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {displayedServices.map((srv) => {
              const isSelected = formData.serviceId === srv.id;
              const priceWithGST = srv.basePrice * (1 + srv.gstRate / 100);

              return (
                <div
                  key={srv.id}
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      serviceId: srv.id,
                      serviceCategory: srv.category,
                      serviceMode: srv.serviceMode || 'in_person',
                    }))
                  }
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-red-50/95 border-[#DC2626] shadow-lg shadow-red-900/15 ring-2 ring-[#DC2626]'
                      : 'bg-white/85 border-red-900/10 hover:border-red-300 hover:bg-red-50/40 hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-[#44403C] border border-stone-200">
                        {srv.category}
                      </span>
                      {renderModeBadge(srv.serviceMode)}
                    </div>
                    <h4 className="font-bold text-[#1C1917] text-sm leading-snug">
                      {srv.name}
                    </h4>
                    <p className="text-xs text-[#78716C] mt-1 line-clamp-2">
                      {srv.description}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-red-900/10 flex items-end justify-between text-xs">
                    <span className="text-[#059669] font-mono flex items-center gap-1 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <Clock className="w-3.5 h-3.5 text-[#059669]" />
                      {srv.duration} mins
                    </span>
                    <div className="text-right">
                      <span className="font-extrabold text-[#991B1B] font-mono text-sm block">
                        {formatINR(Math.round(priceWithGST))}{' '}
                        <span className="text-[10px] text-[#78716C] font-normal">
                          incl. GST
                        </span>
                      </span>
                      <span className="text-[10px] text-[#78716C] font-mono">
                        {formatINR(srv.basePrice)} + {srv.gstRate}% GST
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {formErrors.serviceId && (
            <p className="text-[11px] text-[#DC2626] mt-1 font-medium">
              {formErrors.serviceId}
            </p>
          )}
        </div>

        {/* STEP 2: CHOOSE PROFESSIONAL */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-red-900/10 text-xs font-bold uppercase tracking-wider text-[#1C1917]">
            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#0284C7] to-[#0EA5E9] text-white flex items-center justify-center text-[11px] font-extrabold shadow-sm">
              2
            </span>
            <span>Choose {labels.professional}</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#1C1917]">
                Select Preferred {labels.professional}
              </label>
              <span className="text-[11px] text-[#78716C]">
                {eligibleProviders.length} available for this {labels.service.toLowerCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
              {/* Option: Any Available */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, providerId: 'any' })}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  formData.providerId === 'any'
                    ? 'bg-red-50/95 border-[#DC2626] text-[#1C1917] shadow-md ring-2 ring-[#DC2626]'
                    : 'bg-white/85 border-red-900/10 text-[#78716C] hover:bg-red-50/40 hover:text-[#1C1917]'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#DC2626] to-[#F43F5E] text-white mx-auto mb-1.5 flex items-center justify-center font-extrabold text-xs shadow-sm">
                  ANY
                </div>
                <span className="block font-bold text-xs text-[#1C1917]">
                  Any Available
                </span>
                <span className="text-[10px] text-[#059669] font-bold flex items-center justify-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                  Fastest Slot
                </span>
              </button>

              {/* Eligible Providers */}
              {eligibleProviders.map((p) => {
                const isSelected = formData.providerId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, providerId: p.id })}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      isSelected
                        ? 'bg-red-50/95 border-[#DC2626] text-[#1C1917] shadow-md ring-2 ring-[#DC2626]'
                        : 'bg-white/85 border-red-900/10 text-[#78716C] hover:bg-red-50/40 hover:text-[#1C1917]'
                    }`}
                  >
                    <div className="relative w-10 h-10 mx-auto mb-1.5">
                      <img
                        src={p.avatar}
                        alt={p.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-red-200 shadow-sm"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#10B981] border-2 border-white" />
                    </div>
                    <span className="block font-bold text-xs text-[#1C1917] truncate">
                      {p.name}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200 mt-0.5">
                      {p.rating} ★
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* STEP 3: PICK DATE AND TIME SLOT */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-red-900/10 text-xs font-bold uppercase tracking-wider text-[#1C1917]">
            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#059669] to-[#10B981] text-white flex items-center justify-center text-[11px] font-extrabold shadow-sm">
              3
            </span>
            <span>Date & Time Slot (IST)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">
                {labels.appointment} Date (IST) <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                min={todayIST}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="glass-input w-full px-3.5 py-2.5 text-xs text-[#1C1917] font-mono bg-white"
              />
              {holiday && (
                <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Public Holiday: {holiday.name}</span>
                </p>
              )}
              {isDateClosed && (
                <p className="text-[11px] text-red-700 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{labels.venue} is closed on this date per administration.</span>
                </p>
              )}
            </div>

            {/* Recurring toggle */}
            <div className="p-3.5 rounded-2xl bg-white/80 border border-red-900/10 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#1C1917]">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) =>
                    setFormData({ ...formData, isRecurring: e.target.checked })
                  }
                  className="rounded accent-[#DC2626]"
                />
                <Repeat className="w-4 h-4 text-[#DC2626]" />
                <span>Repeat as Recurring {labels.appointment}</span>
              </label>

              {formData.isRecurring && (
                <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in duration-150">
                  <select
                    value={formData.recurringFrequency}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recurringFrequency: e.target.value as any,
                      })
                    }
                    className="glass-input px-2.5 py-1.5 text-xs text-[#1C1917] bg-white"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                    <option value="monthly">Monthly</option>
                  </select>

                  <select
                    value={formData.recurringCount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recurringCount: parseInt(e.target.value, 10),
                      })
                    }
                    className="glass-input px-2.5 py-1.5 text-xs text-[#1C1917] bg-white"
                  >
                    <option value="3">3 occurrences</option>
                    <option value="4">4 occurrences</option>
                    <option value="6">6 occurrences</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Time Slot Picker Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#1C1917]">
                Select Time Slot (IST) <span className="text-[#DC2626]">*</span>
              </label>
              <span className="text-[11px] text-[#78716C] font-medium">
                {availableSlots.filter((s) => s.isAvailable).length} slots open
              </span>
            </div>

            {holiday || isDateClosed ? (
              <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center text-amber-800 text-xs">
                No slots available on this date due to holiday closure. Please pick another day.
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white/80 border border-red-900/10 text-center text-[#78716C] text-xs">
                No valid operating slots found. Check operating hours or select another {labels.professional.toLowerCase()}.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-56 overflow-y-auto p-1">
                {availableSlots.map((slot) => {
                  const isSelected = formData.timeSlot === slot.timeSlot;
                  return (
                    <div key={slot.timeSlot} className="relative group">
                      <button
                        type="button"
                        disabled={!slot.isAvailable}
                        onClick={() => setFormData({ ...formData, timeSlot: slot.timeSlot })}
                        className={`w-full py-2.5 px-2 rounded-xl text-xs font-mono text-center transition-all ${
                          isSelected
                            ? 'slot-selected'
                            : slot.isAvailable
                            ? 'slot-chip'
                            : 'slot-booked'
                        }`}
                        title={slot.unavailableReason || 'Available in IST'}
                      >
                        {slot.timeSlot}
                      </button>

                      {/* Waitlist option for booked slots */}
                      {!slot.isAvailable && !slot.isPast && (
                        <button
                          type="button"
                          onClick={() => setWaitlistTargetSlot(slot.timeSlot)}
                          className="w-full mt-1 py-0.5 rounded text-[9px] font-semibold text-[#B91C1C] bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                          title="Join waitlist for auto-promotion if someone cancels"
                        >
                          Waitlist
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {formErrors.timeSlot && (
              <p className="text-[11px] text-[#DC2626] mt-1">{formErrors.timeSlot}</p>
            )}
          </div>
        </div>

        {/* STEP 4: CUSTOMER DETAILS, ADDRESS & DYNAMIC QUESTIONS */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-red-900/10 text-xs font-bold uppercase tracking-wider text-[#1C1917]">
            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#D97706] to-[#F59E0B] text-white flex items-center justify-center text-[11px] font-extrabold shadow-sm">
              4
            </span>
            <span>{labels.customer} & Custom Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">
                Full Name <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Kavitha Sundaram"
                  className={`glass-input w-full pl-9 pr-3.5 py-2.5 text-xs text-[#1C1917] ${
                    formErrors.fullName ? 'input-error' : ''
                  }`}
                />
                <User className="w-4 h-4 text-[#DC2626] absolute left-3 top-3 pointer-events-none" />
              </div>
              {formErrors.fullName && (
                <p className="text-[11px] text-[#DC2626] mt-1 font-medium">{formErrors.fullName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">
                Email Address <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="kavitha@example.com"
                  className={`glass-input w-full pl-9 pr-3.5 py-2.5 text-xs text-[#1C1917] ${
                    formErrors.email ? 'input-error' : ''
                  }`}
                />
                <Mail className="w-4 h-4 text-[#3B82F6] absolute left-3 top-3 pointer-events-none" />
              </div>
              {formErrors.email && (
                <p className="text-[11px] text-[#DC2626] mt-1 font-medium">{formErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">
                Indian Mobile Number <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative flex">
                <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-red-900/15 bg-red-50 text-xs font-mono text-[#B91C1C] font-semibold">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })
                  }
                  placeholder="98401 23456"
                  className={`glass-input w-full rounded-l-none pl-3.5 pr-3.5 py-2.5 text-xs text-[#1C1917] font-mono ${
                    formErrors.phone ? 'input-error' : ''
                  }`}
                />
              </div>
              {formErrors.phone && (
                <p className="text-[11px] text-[#DC2626] mt-1 font-medium">{formErrors.phone}</p>
              )}
            </div>

            {/* State selection for GST computation */}
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">
                State of Supply / Billing <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="glass-input w-full pl-9 pr-3.5 py-2.5 text-xs text-[#1C1917] bg-[#FFFDF9]"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.name}>
                      {s.name} ({s.code}){' '}
                      {s.isHomeState ? '• Intra-State (CGST+SGST)' : '• Inter-State (IGST)'}
                    </option>
                  ))}
                </select>
                <MapPin className="w-4 h-4 text-[#059669] absolute left-3 top-3 pointer-events-none" />
              </div>
              <p className="text-[10px] text-[#78716C] mt-1">
                {formData.state.toLowerCase() === 'tamil nadu'
                  ? 'Tamil Nadu address triggers CGST (9%) + SGST (9%).'
                  : 'Out-of-state address triggers IGST (18%).'}
              </p>
            </div>

            {/* Service Location input for customer_location services */}
            {selectedService?.serviceMode === 'customer_location' && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">
                  Service Location / Address <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.customerAddress || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, customerAddress: e.target.value })
                    }
                    placeholder="Door/Flat no, Street, Landmark, City, Pincode"
                    className={`glass-input w-full pl-9 pr-3.5 py-2.5 text-xs text-[#1C1917] bg-white ${
                      formErrors.customerAddress ? 'input-error' : ''
                    }`}
                  />
                  <MapPin className="w-4 h-4 text-[#DC2626] absolute left-3 top-3 pointer-events-none" />
                </div>
                {formErrors.customerAddress && (
                  <p className="text-[11px] text-[#DC2626] mt-1 font-medium">
                    {formErrors.customerAddress}
                  </p>
                )}
                <p className="text-[10px] text-[#78716C] mt-1">
                  Our {labels.professional.toLowerCase()} will arrive at this address for your scheduled service.
                </p>
              </div>
            )}

            {/* Dynamic Custom Fields */}
            {relevantCustomFields.map((field) => (
              <div
                key={field.id}
                className={field.type === 'textarea' ? 'sm:col-span-2' : ''}
              >
                <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">
                  {field.label} {field.required && <span className="text-[#DC2626]">*</span>}
                </label>

                {field.type === 'select' ? (
                  <select
                    value={formData.customFieldResponses?.[field.id] || ''}
                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                    className={`glass-input w-full px-3.5 py-2.5 text-xs text-[#1C1917] bg-white ${
                      formErrors[field.id] ? 'input-error' : ''
                    }`}
                  >
                    <option value="">Select option...</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    rows={2}
                    value={formData.customFieldResponses?.[field.id] || ''}
                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder || ''}
                    className={`glass-input w-full px-3.5 py-2.5 text-xs text-[#1C1917] bg-white ${
                      formErrors[field.id] ? 'input-error' : ''
                    }`}
                  />
                ) : field.type === 'checkbox' ? (
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#1C1917] pt-2">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.customFieldResponses?.[field.id])}
                      onChange={(e) => handleCustomFieldChange(field.id, e.target.checked)}
                      className="rounded accent-[#DC2626]"
                    />
                    <span>{field.placeholder || field.label}</span>
                  </label>
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={formData.customFieldResponses?.[field.id] || ''}
                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder || ''}
                    className={`glass-input w-full px-3.5 py-2.5 text-xs text-[#1C1917] bg-white ${
                      formErrors[field.id] ? 'input-error' : ''
                    }`}
                  />
                )}

                {field.helpText && (
                  <p className="text-[10px] text-[#78716C] mt-1">{field.helpText}</p>
                )}
                {formErrors[field.id] && (
                  <p className="text-[11px] text-[#DC2626] mt-1 font-medium">
                    {formErrors[field.id]}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Special Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">
              Special Notes / Instructions (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={`Any specific instructions, preferences, or questions for your ${labels.appointment.toLowerCase()}...`}
              className="glass-input w-full px-3.5 py-2.5 text-xs text-[#1C1917] bg-white"
            />
          </div>
        </div>

        {/* STEP 5: REVIEW PRICE BREAKDOWN & PAY */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-red-900/10 text-xs font-bold uppercase tracking-wider text-[#1C1917]">
            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#A855F7] text-white flex items-center justify-center text-[11px] font-extrabold shadow-sm">
              5
            </span>
            <span>Review Price Breakdown & Pay</span>
          </div>

          {/* Coupon Code Input */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="Enter promo coupon (e.g. AURA10, SAVE200)"
                className="glass-input w-full pl-9 pr-3.5 py-2.5 text-xs font-mono text-[#1C1917] uppercase placeholder:normal-case bg-white"
              />
              <Tag className="w-4 h-4 text-[#D97706] absolute left-3 top-3 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={() => handleApplyCoupon()}
              className="btn-secondary w-full sm:w-auto px-5 py-2.5 text-xs font-bold shadow-sm"
            >
              Apply Promo
            </button>
          </div>

          {couponError && (
            <p className="text-[11px] text-[#DC2626] font-semibold">{couponError}</p>
          )}

          {appliedCoupon && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 shadow-sm flex items-center justify-between text-xs text-[#047857]">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-emerald-100 text-[#059669]">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                <div>
                  <span className="font-extrabold text-[#065F46] tracking-wide">
                    {appliedCoupon.code}
                  </span>{' '}
                  applied! You saved{' '}
                  <span className="font-mono font-extrabold text-[#047857]">
                    {formatINR(appliedCoupon.discount)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveCoupon}
                className="text-xs text-[#DC2626] hover:text-red-800 font-bold underline ml-3"
              >
                Remove
              </button>
            </div>
          )}

          {/* Live Price Breakdown Box */}
          <div className="p-5 rounded-2xl bg-white/95 border border-red-900/15 space-y-2.5 text-xs shadow-md">
            <div className="flex justify-between text-[#78716C]">
              <span>Base price:</span>
              <span className="text-[#1C1917] font-mono font-semibold">
                {formatINR(livePricing.basePrice)}
              </span>
            </div>

            {livePricing.discountAmount > 0 && (
              <div className="flex justify-between text-[#059669] bg-emerald-50/70 px-2.5 py-1 rounded-lg border border-emerald-200/60 font-semibold">
                <span>Coupon discount ({livePricing.couponCode}):</span>
                <span className="font-mono">
                  - {formatINR(livePricing.discountAmount)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-[#78716C]">
              <span>Taxable value:</span>
              <span className="text-[#1C1917] font-mono font-semibold">
                {formatINR(livePricing.taxableAmount)}
              </span>
            </div>

            {livePricing.isInterState ? (
              <div className="flex justify-between text-[#78716C]">
                <span>IGST ({livePricing.gstRate}% - Inter-state):</span>
                <span className="text-[#1C1917] font-mono font-semibold">
                  {formatINR(livePricing.igst)}
                </span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-[#78716C]">
                  <span>CGST ({(livePricing.gstRate / 2).toFixed(1)}% - Tamil Nadu):</span>
                  <span className="text-[#1C1917] font-mono font-semibold">
                    {formatINR(livePricing.cgst)}
                  </span>
                </div>
                <div className="flex justify-between text-[#78716C]">
                  <span>SGST ({(livePricing.gstRate / 2).toFixed(1)}% - Tamil Nadu):</span>
                  <span className="text-[#1C1917] font-mono font-semibold">
                    {formatINR(livePricing.sgst)}
                  </span>
                </div>
              </>
            )}

            <div className="pt-3 border-t border-red-900/10 flex items-center justify-between font-bold text-sm">
              <span className="text-[#1C1917]">Total payable:</span>
              <span className="text-[#DC2626] text-xl font-extrabold font-mono">
                {formatINR(livePricing.totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            className="btn-primary w-full py-4 text-sm font-bold flex items-center justify-center gap-2 shadow-xl shadow-red-600/30"
          >
            <span>
              Proceed to Payment ({formatINR(livePricing.totalAmount)})
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Payment Step Modal */}
      {showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          pricing={livePricing}
          customerName={formData.fullName}
          customerEmail={formData.email}
          customerPhone={formData.phone}
          serviceName={selectedService.name}
          onBookAppointment={handleProcessPaymentBooking}
          onComplete={handleBookingComplete}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowPaymentModal(false)}
        />
      )}

      {/* Waitlist Modal */}
      {waitlistTargetSlot && (
        <WaitlistModal
          date={formData.date}
          timeSlot={waitlistTargetSlot}
          serviceName={selectedService.name}
          serviceId={selectedService.id}
          providerId={formData.providerId}
          defaultName={formData.fullName}
          defaultEmail={formData.email}
          defaultPhone={formData.phone}
          onClose={() => setWaitlistTargetSlot(null)}
          onConfirm={(wlData) => {
            joinWaitlist({
              fullName: wlData.fullName,
              email: wlData.email,
              phone: wlData.phone,
              serviceId: selectedService.id,
              providerId: formData.providerId,
              date: formData.date,
              timeSlot: waitlistTargetSlot,
            });
            setWaitlistTargetSlot(null);
            showToastSuccess(
              `Joined waitlist for ${formatISTDisplayDate(formData.date)} at ${formatISTTimeDisplay(
                waitlistTargetSlot
              )}!`
            );
          }}
        />
      )}
    </div>
  );
};
