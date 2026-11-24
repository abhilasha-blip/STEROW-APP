import { isPastDate, isSlotPast, toIsoDate, upcomingDates } from '../bookingDates';

describe('bookingDates', () => {
  const now = new Date(2026, 9, 26, 10, 30); // Mon 26 Oct 2026, 10:30 local

  it('14 days from today, labelled like step4.svg ("Mon" / "26 Oct"), across a month end', () => {
    const days = upcomingDates(now, 14);
    expect(days).toHaveLength(14);
    expect(days[0]).toEqual({ iso: '2026-10-26', weekday: 'Mon', dayMonth: '26 Oct' });
    expect(days[1]).toEqual({ iso: '2026-10-27', weekday: 'Tue', dayMonth: '27 Oct' });
    expect(days[6].iso).toBe('2026-11-01');
    expect(days[13].iso).toBe('2026-11-08');
    expect(days.every(d => !isPastDate(d.iso, now))).toBe(true);
  });

  it('a slot that already started today is past; any slot on a later day is not', () => {
    expect(isSlotPast({ startHour: 9 }, '2026-10-26', now)).toBe(true);
    expect(isSlotPast({ startHour: 11 }, '2026-10-26', now)).toBe(false);
    expect(isSlotPast({ startHour: 9 }, '2026-10-27', now)).toBe(false);
  });

  it('isPastDate / toIsoDate', () => {
    expect(isPastDate('2026-10-25', now)).toBe(true);
    expect(isPastDate('2026-10-26', now)).toBe(false);
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
