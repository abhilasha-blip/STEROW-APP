/** Book a Service step 4: the bookable dates (today + 13 days; never a past date) and slot availability. */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export type BookingDate = {
  /** yyyy-mm-dd, local time. */
  iso: string;
  /** "Mon" */
  weekday: string;
  /** "26 Oct" */
  dayMonth: string;
};

const pad = (n: number) => String(n).padStart(2, '0');

export const toIsoDate = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** `count` consecutive days starting today (local). */
export function upcomingDates(now: Date, count: number): BookingDate[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    return { iso: toIsoDate(d), weekday: WEEKDAYS[d.getDay()], dayMonth: `${d.getDate()} ${MONTHS[d.getMonth()]}` };
  });
}

/** A slot can't be booked once it has started (only matters for today). */
export const isSlotPast = (slot: { startHour: number }, isoDate: string, now: Date): boolean =>
  isoDate === toIsoDate(now) && now.getHours() >= slot.startHour;

/** Earlier than today (a stored date from a booking left open overnight). */
export const isPastDate = (isoDate: string, now: Date): boolean => isoDate < toIsoDate(now);
