/**
 * Timezone-aware date utility functions
 * Ensures consistent date handling across all calendars in the system
 */

/**
 * Get today's date in local timezone as YYYY-MM-DD format
 * This ensures the date matches what users see in their calendar
 */
export function getTodayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a date string (YYYY-MM-DD) for display using local timezone
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Formatted date string for display
 */
export function formatDateLocal(dateString: string): string {
  if (!dateString) return '';
  // Parse date string as local date (YYYY-MM-DD)
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString();
}

/**
 * Convert a Date object to YYYY-MM-DD string using local timezone
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format
 */
export function dateToLocalString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a date string (YYYY-MM-DD) as a Date object in local timezone
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Date object representing the date at midnight local time
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Calculate day of week (0-6, Sunday-Saturday) from a date string using UTC
 * This ensures consistent calculation regardless of server timezone
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 */
export function getDayOfWeekUTC(dateString: string): number {
  const [year, month, day] = dateString.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  return utcDate.getUTCDay();
}

/**
 * Check if a date is before today (using local timezone)
 * @param date - Date object or date string (YYYY-MM-DD)
 * @returns true if the date is before today
 */
export function isBeforeToday(date: Date | string): boolean {
  const today = getTodayLocalDate();
  const dateStr = typeof date === 'string' ? date : dateToLocalString(date);
  return dateStr < today;
}

/**
 * Check if a date is today (using local timezone)
 * @param date - Date object or date string (YYYY-MM-DD)
 * @returns true if the date is today
 */
export function isToday(date: Date | string): boolean {
  const today = getTodayLocalDate();
  const dateStr = typeof date === 'string' ? date : dateToLocalString(date);
  return dateStr === today;
}

/**
 * Compare two dates (using local timezone)
 * @param date1 - First date (Date object or YYYY-MM-DD string)
 * @param date2 - Second date (Date object or YYYY-MM-DD string)
 * @returns Negative if date1 < date2, 0 if equal, positive if date1 > date2
 */
export function compareDates(date1: Date | string, date2: Date | string): number {
  const date1Str = typeof date1 === 'string' ? date1 : dateToLocalString(date1);
  const date2Str = typeof date2 === 'string' ? date2 : dateToLocalString(date2);
  return date1Str.localeCompare(date2Str);
}
