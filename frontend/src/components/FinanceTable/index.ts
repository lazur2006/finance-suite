/**
 * Barrel export so `import … from "./components/FinanceTable"` keeps working.
 * ‣ default export  … FinanceTable component itself
 * ‣ named  export   … FinanceTableHandle type (for the `ref`)
 */
export { default } from './FinanceTable';
export type { FinanceTableHandle } from './types';
