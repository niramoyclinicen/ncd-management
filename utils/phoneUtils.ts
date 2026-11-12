/**
 * Phone Number Utilities for Bangladeshi Mobile Numbers (01XXX-XXXXXX)
 * Standard format: 11 digits total (5 prefix, hyphen, 6 suffix)
 */

// Convert Bengali digits (০-৯) to English digits (0-9)
export function convertBengaliToEnglishDigits(str: string): string {
  if (!str) return '';
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return str.replace(/[০-৯]/g, (w) => String(bengaliDigits.indexOf(w)));
}

/**
 * Extracts raw digits (up to 11) from any mobile string.
 * Strips international prefix +88 or 88 if present at the start of an 11+ digit number.
 */
export function extractMobileDigits(input: string | null | undefined): string {
  if (!input) return '';
  let cleaned = convertBengaliToEnglishDigits(String(input)).replace(/\D/g, '');
  
  // If starts with 8801 and length is 13, strip leading 88
  if (cleaned.startsWith('8801') && cleaned.length >= 13) {
    cleaned = cleaned.slice(2);
  }
  
  return cleaned.slice(0, 11);
}

/**
 * Formats digits into standard "01XXX-XXXXXX" representation.
 * - 0-5 digits: "01712"
 * - 6-11 digits: "01712-345678"
 */
export function formatMobileNumber(input: string | null | undefined): string {
  const digits = extractMobileDigits(input);
  if (!digits) return '';
  if (digits.length <= 5) {
    return digits;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/**
 * Returns a masked representation showing entered digits and remaining "X" slots.
 * E.g., for "017123" -> "01712-3XXXXX"
 * E.g., for "" -> "01XXX-XXXXXX"
 */
export function getMobileMaskSlots(input: string | null | undefined): {
  formatted: string;
  masked: string;
  digitsCount: number;
  remainingCount: number;
  isComplete: boolean;
  isValidPrefix: boolean;
} {
  const digits = extractMobileDigits(input);
  const digitsCount = digits.length;
  const remainingCount = Math.max(0, 11 - digitsCount);
  const isComplete = digitsCount === 11;
  const isValidPrefix = digitsCount === 0 || digits.startsWith('01') || (digitsCount === 1 && digits === '0');

  // Build mask string "01XXX-XXXXXX"
  // Target: 5 digits prefix, hyphen, 6 digits suffix
  let p1 = '';
  for (let i = 0; i < 5; i++) {
    p1 += i < digits.length ? digits[i] : 'X';
  }

  let p2 = '';
  for (let i = 5; i < 11; i++) {
    p2 += i < digits.length ? digits[i] : 'X';
  }

  const masked = `${p1}-${p2}`;
  const formatted = formatMobileNumber(digits);

  return {
    formatted,
    masked,
    digitsCount,
    remainingCount,
    isComplete,
    isValidPrefix
  };
}
