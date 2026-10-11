/**
 * IST (Asia/Kolkata, UTC+5:30) Timezone Utility
 * Ensures all date and time operations are strictly executed in Indian Standard Time (IST),
 * regardless of the user's local operating system / browser device timezone.
 */

export const IST_TIMEZONE = 'Asia/Kolkata';
export const IST_OFFSET_STRING = '+05:30';
export const IST_OFFSET_MINUTES = 330; // 5 hours 30 mins

/**
 * Returns breakdown of year, month, day, hour, minute, second for a date in IST
 */
export function getISTParts(date: Date = new Date()): {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  second: number; // 0-59
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = parseInt(part.value, 10);
    }
  }

  // Handle midnight 24 edge cases in some browser Intl implementations
  const hour = map.hour === 24 ? 0 : map.hour;

  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: hour ?? 0,
    minute: map.minute ?? 0,
    second: map.second ?? 0,
  };
}

/**
 * Get today's date formatted as 'YYYY-MM-DD' in IST
 */
export function getTodayISTDateString(now: Date = new Date()): string {
  const parts = getISTParts(now);
  const y = parts.year;
  const m = String(parts.month).padStart(2, '0');
  const d = String(parts.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses time strings like "10:30 AM" or "02:15 PM" into 24-hr hour and minute
 */
export function parseTimeSlot(timeSlot: string): { hour: number; minute: number } {
  const clean = timeSlot.replace(/\s*IST/i, '').trim();
  const [timePart, period] = clean.split(/\s+/);
  const [hStr, mStr] = timePart.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);

  if (period?.toUpperCase() === 'PM' && h !== 12) {
    h += 12;
  } else if (period?.toUpperCase() === 'AM' && h === 12) {
    h = 0;
  }

  return { hour: h, minute: m };
}

/**
 * Formats 24-hr hour & minute to 12-hour string (e.g. "10:30 AM")
 */
export function formatTime12Hour(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayH = hour % 12 === 0 ? 12 : hour % 12;
  const hStr = String(displayH).padStart(2, '0');
  const mStr = String(minute).padStart(2, '0');
  return `${hStr}:${mStr} ${period}`;
}

/**
 * Formats a time string into 12-hour format with "IST" label appended (e.g. "10:30 AM IST")
 */
export function formatISTTimeDisplay(timeSlot: string): string {
  if (!timeSlot) return '';
  const clean = timeSlot.replace(/\s*IST/i, '').trim();
  return `${clean} IST`;
}

/**
 * Formats date string 'YYYY-MM-DD' to "DD MMM YYYY" (e.g. "12 Oct 2026") in IST
 */
export function formatISTDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;

  // Create an explicit UTC timestamp for noon to avoid day boundary drifts
  const utcDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(utcDate);
}

/**
 * Creates an ISO 8601 string with +05:30 offset
 * e.g. date: "2026-10-12", timeSlot: "10:30 AM" -> "2026-10-12T10:30:00+05:30"
 */
export function createISTIsoString(dateStr: string, timeSlot: string): string {
  const { hour, minute } = parseTimeSlot(timeSlot);
  const [y, m, d] = dateStr.split('-').map(Number);
  const yStr = String(y);
  const mStr = String(m).padStart(2, '0');
  const dStr = String(d).padStart(2, '0');
  const hStr = String(hour).padStart(2, '0');
  const minStr = String(minute).padStart(2, '0');
  return `${yStr}-${mStr}-${dStr}T${hStr}:${minStr}:00${IST_OFFSET_STRING}`;
}

/**
 * Parses an IST ISO string or date/time slot into a real Unix epoch millisecond timestamp
 */
export function getISTTimestamp(dateStr: string, timeSlot: string): number {
  const { hour, minute } = parseTimeSlot(timeSlot);
  const [y, m, d] = dateStr.split('-').map(Number);
  // IST is UTC+05:30 (5.5 hours ahead of UTC), so UTC is time - 5.5 hours
  return Date.UTC(y, m - 1, d, hour, minute, 0) - (IST_OFFSET_MINUTES * 60 * 1000);
}

/**
 * Checks if a slot on a given date is strictly in the past compared to the current IST time
 */
export function isPastSlotIST(dateStr: string, timeSlot: string, now: Date = new Date()): boolean {
  if (!dateStr || !timeSlot) return false;
  const slotTimestamp = getISTTimestamp(dateStr, timeSlot);
  return slotTimestamp < now.getTime();
}

/**
 * Check if a date string 'YYYY-MM-DD' is strictly before today in IST
 */
export function isPastDateIST(dateStr: string, now: Date = new Date()): boolean {
  if (!dateStr) return false;
  const todayStr = getTodayISTDateString(now);
  return dateStr < todayStr;
}

/**
 * Returns difference in hours from current IST time to slot time (positive = future, negative = past)
 */
export function getDiffHoursFromNowIST(dateStr: string, timeSlot: string, now: Date = new Date()): number {
  const slotTimestamp = getISTTimestamp(dateStr, timeSlot);
  const diffMs = slotTimestamp - now.getTime();
  return diffMs / (1000 * 60 * 60);
}

/**
 * Formatted live countdown e.g. "Starts in 2h 15m" or "Starts in 45m" or "Started 10m ago"
 */
export function getCountdownIST(dateStr: string, timeSlot: string, now: Date = new Date()): {
  totalSeconds: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
  formatted: string;
} {
  const slotTimestamp = getISTTimestamp(dateStr, timeSlot);
  const diffMs = slotTimestamp - now.getTime();
  const isPast = diffMs < 0;
  const absDiff = Math.abs(diffMs);

  const totalSeconds = Math.floor(absDiff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let formatted = '';
  if (isPast) {
    if (hours > 24) {
      formatted = `${Math.floor(hours / 24)}d ago`;
    } else if (hours > 0) {
      formatted = `Started ${hours}h ${minutes}m ago`;
    } else if (minutes > 0) {
      formatted = `Started ${minutes}m ago`;
    } else {
      formatted = 'Started just now';
    }
  } else {
    if (hours > 24) {
      formatted = `Starts in ${Math.floor(hours / 24)}d ${hours % 24}h`;
    } else if (hours > 0) {
      formatted = `Starts in ${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      formatted = `Starts in ${minutes}m ${seconds}s`;
    } else {
      formatted = `Starts in ${seconds}s`;
    }
  }

  return {
    totalSeconds,
    hours,
    minutes,
    seconds,
    isPast,
    formatted,
  };
}

/**
 * Formats an IST date string into full display date with time:
 * "12 Oct 2026, 10:30 AM IST"
 */
export function formatFullISTDateTime(dateStr: string, timeSlot: string): string {
  const dateFormatted = formatISTDisplayDate(dateStr);
  const timeFormatted = formatISTTimeDisplay(timeSlot);
  return `${dateFormatted}, ${timeFormatted}`;
}
