/**
 * Indian Rupee (INR ₹) Formatting & Number to Words Utility
 */

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats a number to Indian Rupee currency string, e.g. 1499 -> "₹1,499.00"
 */
export function formatINR(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '₹0.00';
  }
  return INR_FORMATTER.format(amount);
}

/**
 * Rounds a number to exactly two decimal places avoiding floating point imprecision
 */
export function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function convertBelowThousand(n: number): string {
  let str = '';
  if (n >= 100) {
    str += `${ONES[Math.floor(n / 100)]} Hundred `;
    n %= 100;
  }
  if (n > 0) {
    if (str !== '') str += 'and ';
    if (n < 20) {
      str += ONES[n];
    } else {
      str += TENS[Math.floor(n / 10)];
      if (n % 10 > 0) {
        str += `-${ONES[n % 10]}`;
      }
    }
  }
  return str.trim();
}

/**
 * Converts an INR amount to formal English words (Indian numbering system: Crores, Lakhs, Thousands, Hundreds)
 * e.g. 1180 -> "One Thousand One Hundred Eighty Rupees Only"
 * e.g. 1499.50 -> "One Thousand Four Hundred Ninety-Nine Rupees and Fifty Paise Only"
 */
export function numberToWordsINR(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount) || amount === 0) {
    return 'Zero Rupees Only';
  }

  const rounded = roundToTwoDecimals(Math.abs(amount));
  const integerPart = Math.floor(rounded);
  const paisePart = Math.round((rounded - integerPart) * 100);

  if (integerPart === 0 && paisePart > 0) {
    const paiseWords = convertBelowThousand(paisePart);
    return `${paiseWords} Paise Only`;
  }

  let crore = Math.floor(integerPart / 10000000);
  let remainder = integerPart % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder %= 100000;
  let thousand = Math.floor(remainder / 1000);
  let belowThousand = remainder % 1000;

  const parts: string[] = [];

  if (crore > 0) {
    parts.push(`${convertBelowThousand(crore)} Crore`);
  }
  if (lakh > 0) {
    parts.push(`${convertBelowThousand(lakh)} Lakh`);
  }
  if (thousand > 0) {
    parts.push(`${convertBelowThousand(thousand)} Thousand`);
  }
  if (belowThousand > 0) {
    parts.push(convertBelowThousand(belowThousand));
  }

  let words = parts.join(' ').trim();
  if (!words) {
    words = 'Zero';
  }

  let result = `${words} Rupees`;
  if (paisePart > 0) {
    const paiseWords = convertBelowThousand(paisePart);
    result += ` and ${paiseWords} Paise`;
  }

  return `${result} Only`;
}
