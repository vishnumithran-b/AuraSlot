/**
 * Professional PDF Tax Invoice Generator using jsPDF
 * Fully compliant with Indian GST Invoicing standards.
 */

import { jsPDF } from 'jspdf';
import { formatISTDisplayDate, formatISTTimeDisplay } from './date-ist';
import { numberToWordsINR } from './currency';
import { BUSINESS_CONFIG } from './gst';
import type { Appointment } from '../types/appointment';

export function generateInvoicePDF(appointment: Appointment, profile?: Partial<typeof BUSINESS_CONFIG>): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const config = { ...BUSINESS_CONFIG, ...profile };
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Background Header Banner
  doc.setFillColor(153, 27, 27); // Deep crimson wine (#991B1B)
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Decorative Accent Strip
  doc.setFillColor(220, 38, 38); // Vibrant ruby red (#DC2626)
  doc.rect(0, 41, pageWidth, 1.5, 'F');

  // Business Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(config.businessName.toUpperCase(), margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(254, 226, 226);
  doc.text(config.tagline || 'Smart Appointment Booking Suite', margin, 24);
  doc.text(`GSTIN: ${config.gstin} | PAN: ${config.pan}`, margin, 29);
  doc.text(`${config.registeredAddress}`, margin, 34);

  // Invoice Title Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(254, 202, 202); // Soft cream rose
  doc.text('TAX INVOICE', pageWidth - margin, 18, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`Invoice No: ${appointment.invoiceNumber || 'INV-' + appointment.id}`, pageWidth - margin, 25, {
    align: 'right',
  });
  doc.text(`Date (IST): ${formatISTDisplayDate(appointment.date)}`, pageWidth - margin, 30, {
    align: 'right',
  });
  doc.text(`Place of Supply: ${appointment.state}`, pageWidth - margin, 35, {
    align: 'right',
  });

  // Client Details & Appointment Info Boxes
  let curY = 52;

  // Box 1: Billed To
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, curY, contentWidth / 2 - 3, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('BILLED TO (CUSTOMER DETAILS)', margin + 4, curY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(appointment.fullName, margin + 4, curY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Email: ${appointment.email}`, margin + 4, curY + 19);
  doc.text(`Phone: ${appointment.phone}`, margin + 4, curY + 24);
  doc.text(`State / Region: ${appointment.state}`, margin + 4, curY + 29);
  doc.text(`GST Category: Consumer / Unregistered (B2C)`, margin + 4, curY + 34);

  // Box 2: Appointment Specifics
  const col2X = margin + contentWidth / 2 + 3;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(col2X, curY, contentWidth / 2 - 3, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('APPOINTMENT DETAILS', col2X + 4, curY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Ref ID: ${appointment.id}`, col2X + 4, curY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Professional: ${appointment.providerName || 'Staff'}`, col2X + 4, curY + 19);
  doc.text(`Scheduled Date: ${formatISTDisplayDate(appointment.date)}`, col2X + 4, curY + 24);
  doc.text(`Time Slot: ${formatISTTimeDisplay(appointment.timeSlot)} (${appointment.duration} mins)`, col2X + 4, curY + 29);
  doc.text(`Payment: ${appointment.paymentMethod?.toUpperCase()} (${appointment.paymentStatus?.toUpperCase()})`, col2X + 4, curY + 34);

  // Table of Services & Taxes
  curY = 97;

  // Table Header
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, curY, contentWidth, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('DESCRIPTION OF SERVICE', margin + 3, curY + 5.5);
  doc.text('SAC CODE', margin + 75, curY + 5.5);
  doc.text('QTY', margin + 98, curY + 5.5);
  doc.text('BASE (INR)', margin + 115, curY + 5.5, { align: 'right' });
  doc.text('DISCOUNT', margin + 142, curY + 5.5, { align: 'right' });
  doc.text('TAXABLE (INR)', margin + contentWidth - 3, curY + 5.5, { align: 'right' });

  // Table Row
  curY += 8;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, curY, contentWidth, 14, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(appointment.serviceName, margin + 3, curY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Duration: ${appointment.duration} mins | Slot: ${appointment.timeSlot} IST`, margin + 3, curY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(appointment.pricing.sacCode || BUSINESS_CONFIG.defaultSACCode, margin + 75, curY + 7);
  doc.text('1', margin + 100, curY + 7);
  doc.text(appointment.pricing.basePrice.toFixed(2), margin + 115, curY + 7, { align: 'right' });
  doc.text(
    appointment.pricing.discountAmount > 0 ? `-${appointment.pricing.discountAmount.toFixed(2)}` : '0.00',
    margin + 142,
    curY + 7,
    { align: 'right' }
  );
  doc.text(appointment.pricing.taxableAmount.toFixed(2), margin + contentWidth - 3, curY + 7, { align: 'right' });

  // Tax Breakdown Subtable
  curY += 20;

  const summaryWidth = 85;
  const summaryX = margin + contentWidth - summaryWidth;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(summaryX, curY, summaryWidth, 54, 2, 2, 'FD');

  let sY = curY + 6;
  const addSummaryRow = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 9.5 : 8.5);
    doc.setTextColor(bold ? 15 : 71, bold ? 23 : 85, bold ? 42 : 105);
    doc.text(label, summaryX + 4, sY);
    doc.text(value, summaryX + summaryWidth - 4, sY, { align: 'right' });
    sY += 6.5;
  };

  addSummaryRow('Base Service Price:', `INR ${appointment.pricing.basePrice.toFixed(2)}`);
  if (appointment.pricing.discountAmount > 0) {
    addSummaryRow(`Discount (${appointment.pricing.couponCode || 'Promo'}):`, `- INR ${appointment.pricing.discountAmount.toFixed(2)}`);
  }
  addSummaryRow('Taxable Value:', `INR ${appointment.pricing.taxableAmount.toFixed(2)}`);

  if (appointment.pricing.isInterState) {
    addSummaryRow(`IGST (${appointment.pricing.gstRate}%):`, `INR ${appointment.pricing.igst.toFixed(2)}`);
  } else {
    const halfRate = (appointment.pricing.gstRate / 2).toFixed(1);
    addSummaryRow(`CGST (${halfRate}%):`, `INR ${appointment.pricing.cgst.toFixed(2)}`);
    addSummaryRow(`SGST (${halfRate}%):`, `INR ${appointment.pricing.sgst.toFixed(2)}`);
  }

  // Divider
  doc.setDrawColor(203, 213, 225);
  doc.line(summaryX + 4, sY - 1, summaryX + summaryWidth - 4, sY - 1);
  sY += 3;

  // Total
  addSummaryRow('Total Amount Payable:', `INR ${appointment.pricing.totalAmount.toFixed(2)}`, true);

  // Amount in Words Box on Left
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, curY, contentWidth - summaryWidth - 6, 32, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL AMOUNT IN WORDS (INR):', margin + 4, curY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  const words = numberToWordsINR(appointment.pricing.totalAmount);
  const splitWords = doc.splitTextToSize(words, contentWidth - summaryWidth - 14);
  doc.text(splitWords, margin + 4, curY + 13);

  // Payment Receipt Acknowledgement
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Transaction Status: ${appointment.paymentStatus.toUpperCase()} | Mode: ${appointment.paymentMethod.toUpperCase()}`, margin + 4, curY + 26);

  // Terms and Declaration Footer
  const footerY = 230;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('TERMS & CONDITIONS:', margin, footerY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('1. All appointments adhere strictly to Indian Standard Time (IST, UTC+5:30).', margin, footerY + 9);
  doc.text('2. Free cancellation applies 24+ hours before appointment time; 50% refund applies between 2 and 24 hours.', margin, footerY + 13);
  doc.text('3. This is a computer-generated tax invoice and requires no physical signature under Indian GST Rule 46.', margin, footerY + 17);

  // Authorized Signatory Stamp
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`For ${config.legalName || config.businessName}`, pageWidth - margin, footerY + 20, { align: 'right' });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Digitally Authorized Signatory', pageWidth - margin, footerY + 25, { align: 'right' });

  return doc;
}

/**
 * Trigger immediate browser download of the PDF invoice
 */
export function downloadInvoicePDF(appointment: Appointment, profile?: Partial<typeof BUSINESS_CONFIG>): void {
  const doc = generateInvoicePDF(appointment, profile);
  const filename = `${appointment.invoiceNumber || 'Invoice-' + appointment.id}.pdf`;
  doc.save(filename);
}
