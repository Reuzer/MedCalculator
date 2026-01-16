import { PregnancyResult } from "../types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function toISODateOnly(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function parseISODateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function diffInDays(a: Date, b: Date): number {
  const startA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const startB = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.floor((startA - startB) / MS_PER_DAY);
}

export function getTrimester(weeks: number): 1 | 2 | 3 {
  if (weeks < 13) return 1;
  if (weeks < 28) return 2;
  return 3;
}

export function calculatePregnancyFromLMP(params: {
  lmp: Date;
  cycleLength: number;
  now?: Date;
}): PregnancyResult {
  const { lmp, cycleLength, now = new Date() } = params;

  const gestAgeDays = Math.max(0, diffInDays(now, lmp));
  const weeks = Math.floor(gestAgeDays / 7);
  const days = gestAgeDays % 7;

  const cycleCorrection = (cycleLength || 28) - 28;
  const edd = addDays(lmp, 280 + cycleCorrection);

  return {
    gestAgeDays,
    weeks,
    days,
    trimester: getTrimester(weeks),
    eddISO: toISODateOnly(edd),
  };
}

export function formatDateRU(isoDateOnly: string): string {
  const d = parseISODateOnly(isoDateOnly);
  return d.toLocaleDateString("ru-RU");
}
