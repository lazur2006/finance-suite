/**
 * Centralised fetch helpers used by the React components.
 * Keeps network code in one place and supplies TypeScript
 * types for strong compile-time checks.
 */

export interface Cell {
  year: number;
  row: number;
  col: number;
  value: number;
  revision: number;
}

/* ───────────────────────────────────────────────────────── */
/*  Finance-table persistence                                */
/* ───────────────────────────────────────────────────────── */

export async function getFinance(year: number): Promise<Cell[]> {
  return fetch(`/api/finance/${year}`).then(r => r.json());
}

export async function saveCell(cell: Cell): Promise<void> {
  await fetch('/api/finance/cell', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cell)
  });
}

export async function shiftRevision(
  year: number,
  dir: 'undo' | 'redo'
): Promise<number> {
  return fetch(`/api/finance/revision/${year}/${dir}`, { method: 'POST' }).then(
    r => r.json()
  );
}

/* ───────────────────────────────────────────────────────── */
/*  User-settings persistence                                */
/* ───────────────────────────────────────────────────────── */

export async function loadSettings<T = any>(group: string): Promise<T> {
  return fetch(`/api/settings/${group}`).then(r => r.json());
}

export async function saveSettings(group: string, data: any): Promise<void> {
  await fetch(`/api/settings/${group}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

/* ───────────────────────────────────────────────────────── */
/*  Danger-zone: wipe a whole year                           */
/* ───────────────────────────────────────────────────────── */

export async function resetFinanceYear(year: number): Promise<void> {
  await fetch(`/api/finance/${year}/reset`, { method: 'DELETE' });
}
