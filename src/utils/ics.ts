/**
 * iCalendar (.ics) and Google Calendar Link Generator
 * Explicitly configured for IST (Asia/Kolkata, UTC+5:30)
 */

import { parseTimeSlot } from './date-ist';
import { BUSINESS_CONFIG } from './gst';
import type { Appointment } from '../types/appointment';

function formatICSDate(dateStr: string, timeSlot: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const { hour, minute } = parseTimeSlot(timeSlot);

  // Convert IST (UTC+5:30) to UTC for standard universal iCal DTSTART
  const utcMs = Date.UTC(y, m - 1, d, hour, minute, 0) - (330 * 60 * 1000);
  const utcDate = new Date(utcMs);

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${utcDate.getUTCFullYear()}${pad(utcDate.getUTCMonth() + 1)}${pad(utcDate.getUTCDate())}T${pad(utcDate.getUTCHours())}${pad(utcDate.getUTCMinutes())}${pad(utcDate.getUTCSeconds())}Z`;
}

function formatICSEndDate(dateStr: string, timeSlot: string, durationMinutes: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const { hour, minute } = parseTimeSlot(timeSlot);

  const utcMs = Date.UTC(y, m - 1, d, hour, minute + durationMinutes, 0) - (330 * 60 * 1000);
  const utcDate = new Date(utcMs);

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${utcDate.getUTCFullYear()}${pad(utcDate.getUTCMonth() + 1)}${pad(utcDate.getUTCDate())}T${pad(utcDate.getUTCHours())}${pad(utcDate.getUTCMinutes())}${pad(utcDate.getUTCSeconds())}Z`;
}

/**
 * Generates an RFC-compliant .ics file string
 */
export function generateICSContent(appointment: Appointment): string {
  const dtStart = formatICSDate(appointment.date, appointment.timeSlot);
  const dtEnd = formatICSEndDate(appointment.date, appointment.timeSlot, appointment.duration);
  const nowUtc = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AuraSlot//Smart Appointment System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Kolkata',
    'X-LIC-LOCATION:Asia/Kolkata',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0530',
    'TZOFFSETTO:+0530',
    'TZNAME:IST',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${appointment.id}@auraslot.in`,
    `DTSTAMP:${nowUtc}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:Appointment: ${appointment.serviceName} (${appointment.timeSlot} IST)`,
    `DESCRIPTION:AuraSlot Confirmed Appointment for ${appointment.fullName}.\\nService: ${appointment.serviceName}\\nProfessional: ${appointment.providerName}\\nDuration: ${appointment.duration} minutes (IST).`,
    `LOCATION:${BUSINESS_CONFIG.registeredAddress}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Downloads .ics calendar invite
 */
export function downloadICSFile(appointment: Appointment): void {
  const ics = generateICSContent(appointment);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `appointment-${appointment.id}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates direct Add to Google Calendar URL with IST timezone
 */
export function getGoogleCalendarUrl(appointment: Appointment): string {
  const dtStart = formatICSDate(appointment.date, appointment.timeSlot);
  const dtEnd = formatICSEndDate(appointment.date, appointment.timeSlot, appointment.duration);

  const title = encodeURIComponent(`${appointment.serviceName} - AuraSlot`);
  const details = encodeURIComponent(
    `Confirmed Appointment with ${appointment.providerName}.\nDuration: ${appointment.duration} mins.\nInvoice: ${appointment.invoiceNumber}`
  );
  const location = encodeURIComponent(BUSINESS_CONFIG.registeredAddress);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dtStart}/${dtEnd}&ctz=Asia/Kolkata&details=${details}&location=${location}`;
}
