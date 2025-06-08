import { DropResult } from 'react-beautiful-dnd';

/* ⬇️  moved up one folder */
import { TarifInputUI as TarifInput } from '../TarifSettings';
import { PayrollInputUI as PayrollInput } from '../PayrollSettings';
import { RowMeta as ApiRowMeta } from '../../api';

/* Public handle exposed through `forwardRef` */
export interface FinanceTableHandle {
  undo(): void;
  redo(): void;
}

/* Props expected by the top-level component */
export interface FinanceTableProps {
  year: number;
  onYearChange: (y: number) => void;
  tarifInput: TarifInput;
  payrollInput: PayrollInput;
}

/* One logical row inside the table */
export interface Row {
  description: string;
  values: number[];
  idx: number;          // immutable backend id
  income: boolean;      // income = green
  irregular: boolean;   // NEW – special one-off expenses = orange
  position: number;     // display order
}

/**
 * Extend backend RowMeta with optional flags.
 * (Older DB rows don’t contain these yet.)
 */
export interface RowMeta extends ApiRowMeta {
  income?: boolean;
  irregular?: boolean;
}

/* Drag-and-drop helper */
export type DragEndHandler = (result: DropResult) => void;
