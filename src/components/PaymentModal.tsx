import React, { useState, useEffect, useRef } from 'react';
import {
  CreditCard,
  QrCode,
  Building,
  MapPin,
  Lock,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Download,
} from 'lucide-react';
import { Modal } from './Modal';
import { formatINR } from '../utils/currency';
import { downloadInvoicePDF } from '../utils/invoice';
import { formatISTDisplayDate, formatISTTimeDisplay } from '../utils/date-ist';
import {
  isValidLuhn,
  isValidUPI,
  formatCardNumber,
  formatCardExpiry,
} from '../utils/validators';
import type { PaymentMethod, PricingBreakdown, Appointment } from '../types/appointment';

type PaymentState = 'idle' | 'processing' | 'success' | 'failure';

export interface PaymentModalProps {
  isOpen?: boolean;
  pricing: PricingBreakdown;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceName: string;
  onBookAppointment?: (
    paymentMethod: PaymentMethod,
    transactionId: string
  ) => Promise<{ success: boolean; appointment?: Appointment; error?: string }>;
  onComplete?: (appointment: Appointment) => void;
  onSuccess?: (paymentMethod: PaymentMethod, transactionId: string) => void;
  onCancel: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen = true,
  pricing,
  customerName,
  customerEmail: _customerEmail,
  customerPhone: _customerPhone,
  serviceName: _serviceName,
  onBookAppointment,
  onComplete,
  onSuccess,
  onCancel,
}) => {
  // Payment Flow State
  const [paymentState, setPaymentState] = useState<PaymentState>('idle');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('upi');
  const [transactionId, setTransactionId] = useState<string>('');
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Form Fields (Preserved on failure / retries)
  const [upiId, setUpiId] = useState('user@okhdfcbank');
  const [upiError, setUpiError] = useState<string | null>(null);

  const [cardHolder, setCardHolder] = useState(customerName || 'Kavitha Sundaram');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('883');
  const [cardError, setCardError] = useState<string | null>(null);

  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  // Developer Test Mode (Unchecked by default, only shown in DEV)
  const isDev = Boolean(import.meta.env?.DEV);
  const [simulateFailure, setSimulateFailure] = useState(false);

  // Auto-redirect timer for Success state
  const [redirectCountdown, setRedirectCountdown] = useState(4);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isProcessing = paymentState === 'processing';

  // Handle countdown during success state
  useEffect(() => {
    if (paymentState === 'success') {
      setRedirectCountdown(4);
      countdownTimerRef.current = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev <= 1) {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            handleFinishSuccess();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      };
    }
  }, [paymentState, confirmedAppointment]);

  const handleFinishSuccess = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (confirmedAppointment && onComplete) {
      onComplete(confirmedAppointment);
    } else if (onSuccess) {
      onSuccess(selectedMethod, transactionId);
    } else {
      onCancel();
    }
  };

  // UPI Chip quick action
  const handleSelectUpiApp = (domain: string) => {
    const username = upiId.includes('@') ? upiId.split('@')[0] : upiId || 'user';
    setUpiId(`${username}@${domain}`);
    setUpiError(null);
  };

  // Card Number change with auto-grouping
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setCardNumber(formatted);
    setCardError(null);
  };

  // Card Expiry change with slash insertion
  const handleCardExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardExpiry(e.target.value);
    setCardExpiry(formatted);
    setCardError(null);
  };

  // Validation before submission
  const validateInputs = (): boolean => {
    if (selectedMethod === 'upi') {
      if (!isValidUPI(upiId)) {
        setUpiError('Please enter a valid UPI VPA (e.g. name@bank)');
        return false;
      }
      setUpiError(null);
      return true;
    }

    if (selectedMethod === 'card') {
      if (!cardHolder.trim()) {
        setCardError('Please enter the name on the card.');
        return false;
      }
      if (!isValidLuhn(cardNumber)) {
        setCardError('Invalid card number (fails Luhn check). Use standard test card 4242 4242 4242 4242.');
        return false;
      }
      const rawExpiry = cardExpiry.replace(/\D/g, '');
      if (rawExpiry.length < 4) {
        setCardError('Please enter valid expiry date (MM/YY).');
        return false;
      }
      const month = parseInt(rawExpiry.slice(0, 2), 10);
      if (month < 1 || month > 12) {
        setCardError('Invalid expiry month (01-12).');
        return false;
      }
      if (cardCvv.length < 3) {
        setCardError('Please enter a 3 or 4-digit CVV.');
        return false;
      }
      setCardError(null);
      return true;
    }

    return true;
  };

  // Submit payment handler
  const handleSubmitPayment = async () => {
    if (!validateInputs()) return;

    setPaymentError(null);
    setPaymentState('processing');

    const generatedTxnId = `TXN-${Date.now().toString().slice(-6)}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;
    setTransactionId(generatedTxnId);

    // Simulate payment gateway authorization delay (1.2s)
    setTimeout(async () => {
      // 1. If simulation failure is enabled
      if (simulateFailure) {
        setPaymentState('failure');
        setPaymentError(
          'Payment authorization failed: Transaction was declined by the bank or UPI authorization was cancelled. Your account was not debited.'
        );
        return;
      }

      // 2. Perform booking creation
      if (onBookAppointment) {
        try {
          const res = await onBookAppointment(selectedMethod, generatedTxnId);
          if (res.success && res.appointment) {
            setConfirmedAppointment(res.appointment);
            setPaymentState('success');
          } else {
            setPaymentState('failure');
            setPaymentError(res.error || 'Failed to confirm reservation slot. Please try again.');
          }
        } catch (err: any) {
          setPaymentState('failure');
          setPaymentError(err?.message || 'Unexpected server error while reserving slot.');
        }
      } else {
        // Fallback for legacy onSuccess signature
        setPaymentState('success');
      }
    }, 1200);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      titleId="payment-dialog-title"
      ariaLabel="Complete Payment Dialog"
      preventClose={isProcessing}
      maxWidth="min(480px, 100%)"
    >
      {/* 1. Header (Fixed, with Lock icon and X button) */}
      <div className="p-4 sm:p-5 border-b border-stone-200/80 bg-white/95 flex items-center justify-between shrink-0">
        <div>
          <h3
            id="payment-dialog-title"
            className="text-lg sm:text-xl font-bold font-['Outfit'] text-[#1C1917] tracking-tight"
          >
            Complete Payment
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">Secure payment</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          aria-label="Close payment modal"
          className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Scrollable Content Area */}
      <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-4 overscroll-contain">
        {/* === STATE: SUCCESS === */}
        {paymentState === 'success' && (
          <div className="py-5 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100/80 flex items-center justify-center text-emerald-600 animate-pulse">
                <CheckCircle2 className="w-9 h-9 text-emerald-600 stroke-[2.5]" />
              </div>
            </div>

            <div>
              <h4 className="text-xl font-extrabold text-[#1C1917] font-['Outfit']">
                {selectedMethod === 'venue' ? 'Reservation Confirmed' : 'Payment Successful'}
              </h4>
              <p className="text-xs text-stone-600 mt-1 max-w-xs mx-auto">
                {selectedMethod === 'venue'
                  ? `Your appointment is reserved. Settle ${formatINR(pricing.totalAmount)} at the venue upon arrival.`
                  : `Payment of ${formatINR(pricing.totalAmount)} authorized and verified.`}
              </p>
            </div>

            {/* Transaction Card */}
            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/90 text-xs text-left space-y-2">
              <div className="flex justify-between items-center text-stone-600">
                <span>Transaction Ref:</span>
                <span className="font-mono font-bold text-stone-900">{transactionId}</span>
              </div>
              {confirmedAppointment && (
                <>
                  <div className="flex justify-between items-center text-stone-600">
                    <span>Appointment ID:</span>
                    <span className="font-mono font-bold text-[#991B1B]">
                      {confirmedAppointment.id}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-stone-600">
                    <span>Date & Time (IST):</span>
                    <span className="font-semibold text-stone-900">
                      {formatISTDisplayDate(confirmedAppointment.date)} at{' '}
                      {formatISTTimeDisplay(confirmedAppointment.timeSlot)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-stone-600">
                    <span>Invoice Ref:</span>
                    <span className="font-mono text-stone-700">
                      {confirmedAppointment.invoiceNumber}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Auto continue note */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-stone-500 pt-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-400" />
              <span>
                Continuing to booking confirmation in{' '}
                <strong className="text-stone-700">{redirectCountdown}s</strong>...
              </span>
            </div>
          </div>
        )}

        {/* === STATE: FAILURE === */}
        {paymentState === 'failure' && (
          <div className="py-2 space-y-4 animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-red-50/90 border border-red-200 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-sm font-bold text-[#991B1B]">
                <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0" />
                <span>Payment Authorization Failed</span>
              </div>
              <p className="text-stone-700 leading-relaxed">
                {paymentError ||
                  'Your payment was declined by the bank or gateway timed out. Your card or account was not charged.'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600 space-y-1">
              <p className="font-semibold text-stone-800">Your appointment details are preserved.</p>
              <p className="text-[11px] text-stone-500 leading-normal">
                You can retry immediately, pick a different payment method, or choose{' '}
                <strong>Pay at Venue</strong> to settle in person upon arrival.
              </p>
            </div>
          </div>
        )}

        {/* === STATE: IDLE or PROCESSING === */}
        {(paymentState === 'idle' || paymentState === 'processing') && (
          <>
            {/* Amount Summary Card */}
            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/90 text-xs space-y-1.5">
              <div className="flex justify-between text-stone-600">
                <span>Base fee</span>
                <span className="font-semibold text-stone-900">{formatINR(pricing.basePrice)}</span>
              </div>

              {pricing.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>
                    Coupon Discount {pricing.couponCode ? `(${pricing.couponCode})` : ''}
                  </span>
                  <span className="font-semibold">- {formatINR(pricing.discountAmount)}</span>
                </div>
              )}

              {pricing.isInterState ? (
                <div className="flex justify-between text-stone-600">
                  <span>IGST ({pricing.gstRate}%)</span>
                  <span className="font-semibold text-stone-900">{formatINR(pricing.igst)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-stone-600">
                    <span>CGST ({(pricing.gstRate / 2).toFixed(0)}%)</span>
                    <span className="font-semibold text-stone-900">{formatINR(pricing.cgst)}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>SGST ({(pricing.gstRate / 2).toFixed(0)}%)</span>
                    <span className="font-semibold text-stone-900">{formatINR(pricing.sgst)}</span>
                  </div>
                </>
              )}

              <div className="pt-2 border-t border-stone-200/90 flex justify-between items-baseline font-bold">
                <span className="text-xs uppercase tracking-wider text-stone-700">Total</span>
                <span className="text-base text-[#991B1B]">{formatINR(pricing.totalAmount)}</span>
              </div>
            </div>

            {/* Segmented Row of 4 Payment Methods */}
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-2">
                Payment Method
              </label>
              <div className="grid grid-cols-4 gap-1 p-1 bg-stone-100 rounded-xl border border-stone-200/60">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setSelectedMethod('upi')}
                  className={`py-2 px-1 text-center rounded-lg text-xs transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                    selectedMethod === 'upi'
                      ? 'bg-white text-[#991B1B] font-bold shadow-sm'
                      : 'text-stone-600 hover:text-stone-900 font-medium'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5 shrink-0" />
                  <span>UPI</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setSelectedMethod('card')}
                  className={`py-2 px-1 text-center rounded-lg text-xs transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                    selectedMethod === 'card'
                      ? 'bg-white text-[#991B1B] font-bold shadow-sm'
                      : 'text-stone-600 hover:text-stone-900 font-medium'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 shrink-0" />
                  <span>Card</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setSelectedMethod('netbanking')}
                  className={`py-2 px-1 text-center rounded-lg text-xs transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                    selectedMethod === 'netbanking'
                      ? 'bg-white text-[#991B1B] font-bold shadow-sm'
                      : 'text-stone-600 hover:text-stone-900 font-medium'
                  }`}
                >
                  <Building className="w-3.5 h-3.5 shrink-0" />
                  <span>Net Banking</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setSelectedMethod('venue')}
                  className={`py-2 px-1 text-center rounded-lg text-xs transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                    selectedMethod === 'venue'
                      ? 'bg-white text-[#991B1B] font-bold shadow-sm'
                      : 'text-stone-600 hover:text-stone-900 font-medium'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>Pay at Venue</span>
                </button>
              </div>
            </div>

            {/* Selected Method Inputs */}
            {selectedMethod === 'upi' && (
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-3 animate-in fade-in duration-150">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Virtual Payment Address (VPA)
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    disabled={isProcessing}
                    onChange={(e) => {
                      setUpiId(e.target.value);
                      setUpiError(null);
                    }}
                    placeholder="username@bank"
                    className={`w-full px-3 py-2 text-xs rounded-lg border bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 ${
                      upiError ? 'border-red-500' : 'border-stone-300'
                    }`}
                  />
                  {upiError && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">{upiError}</p>
                  )}
                </div>

                {/* App Chips */}
                <div>
                  <span className="block text-[10px] text-stone-500 uppercase font-semibold tracking-wider mb-1.5">
                    Quick App Handles
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleSelectUpiApp('okhdfcbank')}
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 transition-colors shadow-2xs"
                    >
                      GPay
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleSelectUpiApp('ybl')}
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 transition-colors shadow-2xs"
                    >
                      PhonePe
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleSelectUpiApp('paytm')}
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 transition-colors shadow-2xs"
                    >
                      Paytm
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleSelectUpiApp('upi')}
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 transition-colors shadow-2xs"
                    >
                      BHIM
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedMethod === 'card' && (
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-3 animate-in fade-in duration-150">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Name on Card
                  </label>
                  <input
                    type="text"
                    value={cardHolder}
                    disabled={isProcessing}
                    onChange={(e) => {
                      setCardHolder(e.target.value);
                      setCardError(null);
                    }}
                    placeholder="Cardholder Name"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Card Number
                  </label>
                  <input
                    type="text"
                    maxLength={23}
                    value={cardNumber}
                    disabled={isProcessing}
                    onChange={handleCardNumberChange}
                    placeholder="4242 4242 4242 4242"
                    className={`w-full px-3 py-2 text-xs font-mono rounded-lg border bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 ${
                      cardError ? 'border-red-500' : 'border-stone-300'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Expiry (MM/YY)
                    </label>
                    <input
                      type="text"
                      maxLength={5}
                      value={cardExpiry}
                      disabled={isProcessing}
                      onChange={handleCardExpiryChange}
                      placeholder="12/28"
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      CVV
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={cardCvv}
                      disabled={isProcessing}
                      onChange={(e) => {
                        setCardCvv(e.target.value.replace(/\D/g, ''));
                        setCardError(null);
                      }}
                      placeholder="•••"
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                    />
                  </div>
                </div>

                {cardError && (
                  <p className="text-[11px] text-red-600 font-medium">{cardError}</p>
                )}
              </div>
            )}

            {selectedMethod === 'netbanking' && (
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2 animate-in fade-in duration-150">
                <label className="block text-[11px] font-semibold text-stone-700">
                  Select Bank
                </label>
                <select
                  value={selectedBank}
                  disabled={isProcessing}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                >
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="State Bank of India (SBI)">State Bank of India (SBI)</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="Axis Bank">Axis Bank</option>
                  <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                  <option value="Punjab National Bank">Punjab National Bank</option>
                </select>
                <p className="text-[11px] text-stone-500">
                  You will be securely redirected to {selectedBank} portal.
                </p>
              </div>
            )}

            {selectedMethod === 'venue' && (
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs space-y-1 animate-in fade-in duration-150">
                <div className="font-semibold text-amber-950 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-amber-700" />
                  <span>Pay at Venue Desk</span>
                </div>
                <p className="text-amber-900/90 leading-relaxed text-[11px]">
                  Your appointment slot is guaranteed now. Payment of{' '}
                  <strong>{formatINR(pricing.totalAmount)}</strong> will be collected at reception
                  upon arrival (status = <strong>Pending</strong>).
                </p>
              </div>
            )}

            {/* Developer Test Tools (Dev only, collapsible, unchecked by default) */}
            {isDev && (
              <details className="text-xs border border-dashed border-stone-300 rounded-xl bg-stone-50/70 p-2 text-stone-600 group">
                <summary className="cursor-pointer font-medium text-[11px] text-stone-500 hover:text-stone-800 flex items-center justify-between select-none">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Dev tools
                  </span>
                  <span className="text-[10px] text-stone-400 group-open:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <div className="pt-2 mt-2 border-t border-stone-200/70 flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-stone-700">
                    <input
                      type="checkbox"
                      checked={simulateFailure}
                      onChange={(e) => setSimulateFailure(e.target.checked)}
                      className="rounded accent-[#DC2626]"
                    />
                    <span
                      className={
                        simulateFailure ? 'text-red-600 font-semibold' : 'text-stone-600'
                      }
                    >
                      Simulate Gateway Failure
                    </span>
                  </label>
                  <span className="text-[10px] text-stone-400">Default: off</span>
                </div>
              </details>
            )}
          </>
        )}
      </div>

      {/* 3. Footer (Sticky, fixed at bottom) */}
      <div className="p-3.5 sm:p-4 bg-stone-50 border-t border-stone-200/80 flex items-center gap-3 shrink-0">
        {paymentState === 'success' ? (
          <>
            <button
              type="button"
              onClick={() => {
                if (confirmedAppointment) {
                  downloadInvoicePDF(confirmedAppointment);
                }
              }}
              className="btn-secondary flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Download Invoice</span>
            </button>
            <button
              type="button"
              onClick={handleFinishSuccess}
              className="btn-primary flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-red-500/20"
            >
              <span>View Booking</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </>
        ) : paymentState === 'failure' ? (
          <>
            <button
              type="button"
              onClick={() => setPaymentState('idle')}
              className="btn-secondary flex-1 py-2.5 text-xs font-semibold"
            >
              Change Method
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentState('idle');
                setTimeout(() => {
                  handleSubmitPayment();
                }, 50);
              }}
              className="btn-primary flex-1 py-2.5 text-xs font-bold"
            >
              Try Again
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="btn-secondary px-4 py-2.5 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitPayment}
              disabled={isProcessing}
              className="btn-primary flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-red-500/20"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : selectedMethod === 'venue' ? (
                <span>Confirm Booking</span>
              ) : (
                <span>Pay {formatINR(pricing.totalAmount)}</span>
              )}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
};
