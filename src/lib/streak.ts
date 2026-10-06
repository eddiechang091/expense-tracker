import type { Expense } from "@/lib/types";
import { toIsoDate } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Streak tracking — consecutive days with at least one logged expense.
// ---------------------------------------------------------------------------

export interface StreakInfo {
  /** Current consecutive-day run (0 if broken). */
  current: number;
  /** Longest run ever seen in the expense history. */
  longest: number;
  /** Total distinct days with at least one expense. */
  totalDays: number;
  /** Most recent active date (YYYY-MM-DD), or null. */
  lastActiveDate: string | null;
  /** True when the streak is still alive but today has no expense yet. */
  aliveButIdleToday: boolean;
}

function activeDates(expenses: Expense[]): Set<string> {
  const dates = new Set<string>();
  for (const e of expenses) {
    if (e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date)) dates.add(e.date);
  }
  return dates;
}

function shiftDate(key: string, deltaDays: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return toIsoDate(dt);
}

/**
 * Compute streak stats from the expense history.
 *
 * Current-streak rule: if today has an expense, count back from today;
 * otherwise, if yesterday has one, the streak is still alive — count back
 * from yesterday (and flag aliveButIdleToday so the UI can nudge).
 */
export function computeStreak(expenses: Expense[], now: Date = new Date()): StreakInfo {
  const dates = activeDates(expenses);
  const todayKey = toIsoDate(now);
  const yesterdayKey = shiftDate(todayKey, -1);

  let current = 0;
  let aliveButIdleToday = false;
  if (dates.size > 0) {
    let cursor: string | null = null;
    if (dates.has(todayKey)) {
      cursor = todayKey;
    } else if (dates.has(yesterdayKey)) {
      cursor = yesterdayKey;
      aliveButIdleToday = true;
    }
    while (cursor && dates.has(cursor)) {
      current += 1;
      cursor = shiftDate(cursor, -1);
    }
  }

  // Longest run anywhere in history.
  let longest = 0;
  const sorted = [...dates].sort();
  let run = 0;
  let prev: string | null = null;
  for (const key of sorted) {
    if (prev !== null && shiftDate(prev, 1) === key) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = key;
  }

  const lastActiveDate = sorted.length > 0 ? sorted[sorted.length - 1] : null;

  return {
    current,
    longest,
    totalDays: dates.size,
    lastActiveDate,
    aliveButIdleToday,
  };
}

export interface HeatmapDay {
  /** YYYY-MM-DD */
  date: string;
  /** Number of expenses logged that day. */
  count: number;
  /** 0 = none, 1..4 = intensity. */
  level: 0 | 1 | 2 | 3 | 4;
  /** True for days in the future or before the range (rendered empty). */
  placeholder: boolean;
}

function levelFor(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

// ---------------------------------------------------------------------------
// Year heatmap — full calendar year (Jan..Dec), GitHub profile style.
// ---------------------------------------------------------------------------

export interface YearStats {
  year: number;
  daysLogged: number;
  expenseCount: number;
  longestStreak: number;
}

/** Years that have at least one expense, newest first. */
export function availableYears(expenses: Expense[], now: Date = new Date()): number[] {
  const years = new Set<number>();
  for (const e of expenses) {
    const m = /^(\d{4})-\d{2}-\d{2}$/.exec(e.date ?? "");
    if (m) years.add(Number(m[1]));
  }
  years.add(now.getFullYear());
  return [...years].sort((a, b) => b - a);
}

/**
 * Build a full-year heatmap. Columns are weeks (Sun..Sat); leading and
 * trailing days outside the year are placeholders.
 */
export function buildYearHeatmap(expenses: Expense[], year: number): HeatmapDay[][] {
  const counts = new Map<string, number>();
  for (const e of expenses) {
    if (e.date && e.date.startsWith(`${year}-`)) {
      counts.set(e.date, (counts.get(e.date) ?? 0) + 1);
    }
  }

  // Start on the Sunday on or before Jan 1.
  const jan1 = new Date(year, 0, 1);
  const start = new Date(jan1);
  start.setDate(start.getDate() - start.getDay());

  const end = new Date(year, 11, 31);
  const weeks: HeatmapDay[][] = [];
  const cursor = new Date(start);
  while (cursor <= end || cursor.getDay() !== 0) {
    const week: HeatmapDay[] = [];
    for (let d = 0; d < 7; d++) {
      const inYear = cursor.getFullYear() === year;
      const key = toIsoDate(cursor);
      const count = inYear ? (counts.get(key) ?? 0) : 0;
      week.push({
        date: key,
        count,
        level: levelFor(count),
        placeholder: !inYear,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    if (cursor > end && cursor.getDay() === 0) break;
  }
  return weeks;
}

/** Stats for a single calendar year. */
export function yearStats(expenses: Expense[], year: number): YearStats {
  const prefix = `${year}-`;
  const yearExpenses = expenses.filter((e) => e.date?.startsWith(prefix));
  const dates = new Set(yearExpenses.map((e) => e.date));
  let longest = 0;
  const sorted = [...dates].sort();
  let run = 0;
  let prev: string | null = null;
  for (const key of sorted) {
    run = prev !== null && shiftDate(prev, 1) === key ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = key;
  }
  return {
    year,
    daysLogged: dates.size,
    expenseCount: yearExpenses.length,
    longestStreak: longest,
  };
}

/**
 * Build a heatmap of the last `weeks` weeks ending today.
 * Returns weeks oldest-first; each week is 7 days Sun..Sat.
 */
export function buildHeatmap(
  expenses: Expense[],
  weeks = 16,
  now: Date = new Date()
): HeatmapDay[][] {
  const counts = new Map<string, number>();
  for (const e of expenses) {
    if (e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date)) {
      counts.set(e.date, (counts.get(e.date) ?? 0) + 1);
    }
  }

  const todayKey = toIsoDate(now);
  // Start on the Sunday (weeks-1) weeks ago, so the final week is the
  // week containing today (Sun..Sat).
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(today);
  start.setDate(start.getDate() - start.getDay() - (weeks - 1) * 7);

  const result: HeatmapDay[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < weeks; w++) {
    const week: HeatmapDay[] = [];
    for (let d = 0; d < 7; d++) {
      const key = toIsoDate(cursor);
      const isFuture = key > todayKey;
      const count = isFuture ? 0 : (counts.get(key) ?? 0);
      week.push({
        date: key,
        count,
        level: levelFor(count),
        placeholder: isFuture,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    result.push(week);
  }
  return result;
}
