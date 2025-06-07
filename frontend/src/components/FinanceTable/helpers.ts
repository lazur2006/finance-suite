import { months } from './constants';
import { Row } from './types';

/**
 * Given all rows + a carry-over, return an array with the running
 * monthly leftover, i.e. income – expenses accumulated over time.
 */
export function calcMonthlyLeftover(
  rows: Row[],
  prevLeftover: number
): number[] {
  const out: number[] = [];
  let running = prevLeftover;

  for (let m = 0; m < months.length; m++) {
    const incomes = rows
      .filter((r) => r.income)
      .reduce((sum, r) => sum + (r.values[m] || 0), 0);

    const expenses = rows
      .filter((r) => !r.income)
      .reduce((sum, r) => sum + (r.values[m] || 0), 0);

    running += incomes - expenses;
    out[m] = running;
  }
  return out;
}

/** Convenience for “which rows are incomes” even on legacy data */
export const isIncomeRow = (idx: number, meta: Record<number, { income?: boolean }>) =>
  meta[idx]?.income ?? idx === 0;
