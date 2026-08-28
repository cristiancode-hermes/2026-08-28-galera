export const MADRID_TZ = 'Europe/Madrid';

export function madridNowParts(now = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: MADRID_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

export function madridToday(now = new Date()): string {
  return madridNowParts(now).date;
}

export function addMadridDays(isoDate: string, delta: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + delta));
  const yyyy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utc.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatEsDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d} ${months[m - 1]}`;
}

/** Hours until 00:00 Madrid of `date`. Negative if that midnight already passed. */
export function hoursUntilMidnightMadrid(date: string, now = new Date()): number {
  const [y, m, d] = date.split('-').map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, 0, 0));
  for (let i = 0; i < 6; i++) {
    const p = madridNowParts(guess);
    if (p.date === date && p.hour === 0 && p.minute === 0) break;
    const deltaMin =
      0 - (p.hour * 60 + p.minute) + (date > p.date ? 24 * 60 : date < p.date ? -24 * 60 : 0);
    guess.setUTCMinutes(guess.getUTCMinutes() + deltaMin);
  }
  return (guess.getTime() - now.getTime()) / 36e5;
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && aEnd >= bStart;
}
