/**
 * Quarter utility — derive a "26Q3"-style tag from a date string,
 * and helpers for building the quarter-filter dropdown.
 */

/** Return e.g. "2026·Q3" for a date in 2026 Jul–Sep. */
export function getQuarterTag(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `${d.getFullYear()}·Q${q}`;
}

/** Return { year, quarter } for a Date. */
export function dateToYQ(d: Date): { year: number; quarter: number } {
  return { year: d.getFullYear(), quarter: Math.ceil((d.getMonth() + 1) / 3) };
}

/** Check whether a date string falls within a given quarter (e.g. year=2026, q=3). */
export function isInQuarter(dateStr: string | undefined | null, year: number, q: number): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return d.getFullYear() === year && Math.ceil((d.getMonth() + 1) / 3) === q;
}

/** Check whether a date string falls in a given year but not the current quarter. */
export function isInYear(dateStr: string | undefined | null, year: number): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return d.getFullYear() === year;
}

/** Check whether a date string is from a year before the given year. */
export function isPreviousYears(dateStr: string | undefined | null, beforeYear: number): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return d.getFullYear() < beforeYear;
}

export type QuarterFilterValue = 'all' | `${number}Q${number}` | `year_${number}` | 'prev_years';

export interface QuarterOption {
  value: QuarterFilterValue;
  labelKey: string;        // i18n key or raw label
  labelParams?: Record<string, string>;
}

/** Build the quarter dropdown options list for the current date. */
export function buildQuarterOptions(now: Date = new Date()): QuarterOption[] {
  const { year, quarter } = dateToYQ(now);
  const options: QuarterOption[] = [];

  // Current quarter (default)
  options.push({ value: `${year}Q${quarter}` as QuarterFilterValue, labelKey: 'quarter.current', labelParams: { q: `Q${quarter}` } });

  // Other quarters of the current year (descending)
  for (let q = 4; q >= 1; q--) {
    if (q === quarter) continue;
    options.push({ value: `${year}Q${q}` as QuarterFilterValue, labelKey: 'quarter.specific', labelParams: { year: String(year), q: `Q${q}` } });
  }

  // Previous year
  options.push({ value: `year_${year - 1}` as QuarterFilterValue, labelKey: 'quarter.year', labelParams: { year: String(year - 1) } });

  // Older
  options.push({ value: 'prev_years', labelKey: 'quarter.older' });

  // All
  options.push({ value: 'all', labelKey: 'quarter.all' });

  return options;
}

/** Filter predicate for a quarter option value. */
export function matchesQuarterFilter(dateStr: string | undefined | null, filterValue: QuarterFilterValue): boolean {
  if (filterValue === 'all') return true;

  if (filterValue === 'prev_years') {
    const currentYear = new Date().getFullYear();
    return isPreviousYears(dateStr, currentYear - 1);
  }

  if (filterValue.startsWith('year_')) {
    const year = parseInt(filterValue.slice(5), 10);
    return isInYear(dateStr, year);
  }

  // e.g. "2026Q3"
  const match = filterValue.match(/^(\d{4})Q(\d)$/);
  if (match) {
    return isInQuarter(dateStr, parseInt(match[1], 10), parseInt(match[2], 10));
  }

  return true;
}
