import React, {
  useEffect,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle
} from 'react';
import {
  Box,
  Button,
  HStack,
  IconButton,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  NumberInput,
  NumberInputField,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  useDisclosure,
  Spinner
} from '@chakra-ui/react';
import {
  DeleteIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@chakra-ui/icons';
import { FiCopy, FiDollarSign } from 'react-icons/fi';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

import TarifSettings, {
  TarifInputUI as TarifInput
} from './TarifSettings';
import PayrollSettings, {
  PayrollInputUI as PayrollInput
} from './PayrollSettings';

import {
  Cell,
  getFinance,
  saveCell,
  shiftRevision,
  resetFinanceYear,
  RowMeta,
  getRowMeta,
  saveRowMeta,
  deleteRowMeta
} from '../api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

/* ───────────────────────────────────────────────────────── */
export interface FinanceTableHandle {
  undo(): void;
  redo(): void;
}

interface Props {
  year: number;
  onYearChange: (y: number) => void;
  tarifInput: TarifInput;
  payrollInput: PayrollInput;
}

/* Months */
const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];

interface Row {
  description: string;
  values: number[];
  idx: number; // DB row-id
}

/* ───────────────────────────────────────────────────────── */
const FinanceTable = forwardRef<FinanceTableHandle, Props>(
  ({ year, onYearChange, tarifInput, payrollInput }, ref) => {
    /* ── state ─────────────────────────────────────────── */
    const [rows, setRows] = useState<Row[]>([]);
    const [meta, setMeta] = useState<Record<number, RowMeta>>({});
    const [revision, setRevision] = useState(0);
    const [showChart, setShowChart] = useState(false);

    /* carry-over from previous year (for running balance only) */
    const [prevLeftover, setPrevLeftover] = useState(0);

    /* income-settings modal */
    const incomeDlg = useDisclosure();
    const [incomeTarif, setIncomeTarif] = useState<TarifInput>(tarifInput);
    const [incomePayroll, setIncomePayroll] =
      useState<PayrollInput>(payrollInput);
    const [savingIncome, setSavingIncome] = useState(false);

    /* keep modal state in sync with global defaults */
    useEffect(() => {
      if (incomeDlg.isOpen) {
        setIncomeTarif(tarifInput);
        setIncomePayroll(payrollInput);
      }
    }, [incomeDlg.isOpen, tarifInput, payrollInput]);

    /* ── build UI rows from DB payload ─────────────────── */
    const buildRows = (cells: Cell[], metaObj: Record<number, RowMeta>) => {
      const byRow: Record<number, number[]> = {};
      cells.forEach((c) => {
        if (metaObj[c.row]?.deleted) return;
        if (!byRow[c.row]) byRow[c.row] = Array(12).fill(0);
        byRow[c.row][c.col] = c.value;
      });
      if (!byRow[0]) byRow[0] = Array(12).fill(0); // ensure Income row exists

      const out: Row[] = Object.keys(byRow)
        .map(Number)
        .sort((a, b) => a - b)
        .map((idx) => ({
          idx,
          description:
            metaObj[idx]?.description ?? (idx === 0 ? 'Income' : `Item ${idx}`),
          values: byRow[idx]
        }));
      setRows(out);
    };

    /* ── load snapshot + meta whenever year / revision changes ───────── */
    useEffect(() => {
      Promise.all([getFinance(year), getRowMeta(year)]).then(
        ([cells, metaObj]) => {
          setMeta(metaObj);
          buildRows(cells, metaObj);
          if (cells.length) setRevision(cells[0].revision);
        }
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [year, revision]);

    /* ── determine *full-year* leftover from previous year ───────────── */
    useEffect(() => {
      if (year <= 1971) {
        setPrevLeftover(0);
        return;
      }

      Promise.all([getFinance(year - 1), getRowMeta(year - 1)]).then(
        ([prevCells, prevMeta]) => {
          // Sum all income over the year
          const incomeSum = prevCells
            .filter((c) => c.row === 0)
            .reduce((s, c) => s + c.value, 0);

          // Sum all outcome over the year, skipping deleted rows
          const outcomeSum = prevCells
            .filter((c) => c.row !== 0 && !prevMeta[c.row]?.deleted)
            .reduce((s, c) => s + c.value, 0);

          setPrevLeftover(incomeSum - outcomeSum);
        }
      );
    }, [year]);

    /* ── debounced cell save ───────────────────────────── */
    const timer = useRef<NodeJS.Timeout>();

    const upsert = (rowIdx: number, col: number, val: number) => {
      clearTimeout(timer.current);
      setRows((prev) =>
        prev.map((r) =>
          r.idx === rowIdx
            ? { ...r, values: r.values.map((v, i) => (i === col ? val : v)) }
            : r
        )
      );
      timer.current = setTimeout(async () => {
        const rev = await shiftRevision(year, 'redo');
        await saveCell({ year, row: rowIdx, col, value: val, revision: rev });
        setRevision(rev);
      }, 200);
    };

    /* ── expose undo / redo to parent ─────────────────── */
    useImperativeHandle(ref, () => ({
      undo() {
        shiftRevision(year, 'undo').then(setRevision);
      },
      redo() {
        shiftRevision(year, 'redo').then(setRevision);
      }
    }));

    /* ── monthly leftover for chart & summary row ────────────────────── */
    const monthlyLeft: number[] = [];
    let running = prevLeftover; // start with carry-over from last year
    for (let i = 0; i < 12; i++) {
      const income = rows.find((r) => r.idx === 0)?.values[i] ?? 0;
      const outcome = rows
        .filter((r) => r.idx !== 0)
        .reduce((sum, row) => sum + (row.values[i] || 0), 0);
      running += income - outcome;
      monthlyLeft[i] = running;
    }

    const chartData = {
      labels: months,
      datasets: [
        {
          label: 'Leftover',
          data: monthlyLeft,
          borderColor: 'rgb(56,132,255)',
          backgroundColor: 'rgba(56,132,255,0.2)'
        }
      ]
    };

    /* ── styles ───────────────────────────────────────── */
    const headerBg = useColorModeValue('gray.50', 'gray.800');
    const borderCol = useColorModeValue('gray.200', 'gray.600');

    /* ── cell-edit modal state ────────────────────────── */
    const [edit, setEdit] =
      useState<null | { rowIdx: number; col: number; val: number }>(null);

    /* ── row helpers ──────────────────────────────────── */
    const addRow = async () => {
      const newIdx = Math.max(0, ...rows.map((r) => r.idx)) + 1;
      const meta: RowMeta = {
        year,
        row: newIdx,
        description: `Item ${newIdx}`,
        deleted: false
      };
      await saveRowMeta(meta);
      setMeta((m) => ({ ...m, [newIdx]: meta }));
      setRows((prev) => [
        ...prev,
        { idx: newIdx, description: meta.description, values: Array(12).fill(0) }
      ]);
    };

    const deleteRow = async (rowIdx: number) => {
      await deleteRowMeta(year, rowIdx);
      setMeta((m) => ({
        ...m,
        [rowIdx]: { year, row: rowIdx, description: '', deleted: true }
      }));
      setRows((prev) => prev.filter((r) => r.idx !== rowIdx));
    };

    const renameRow = (rowIdx: number, name: string) => {
      setRows((prev) =>
        prev.map((r) => (r.idx === rowIdx ? { ...r, description: name } : r))
      );
      saveRowMeta({
        year,
        row: rowIdx,
        description: name,
        deleted: false
      });
    };

    /* ── render ───────────────────────────────────────── */
    return (
      <Box w="full" h="full" overflow="auto">
        {/* controls */}
        <HStack mb={2} gap={2}>
          <IconButton
            aria-label="Prev year"
            icon={<ChevronLeftIcon />}
            size="sm"
            variant="outline"
            onClick={() => onYearChange(year - 1)}
          />
          <Box minW="70px" textAlign="center" fontWeight="bold">
            {year}
          </Box>
          <IconButton
            aria-label="Next year"
            icon={<ChevronRightIcon />}
            size="sm"
            variant="outline"
            onClick={() => onYearChange(year + 1)}
          />

          {/* reset button */}
          <IconButton
            aria-label="Reset year"
            icon={<DeleteIcon />}
            size="sm"
            variant="outline"
            colorScheme="red"
            onClick={() => {
              if (
                !window.confirm(
                  `Delete EVERY entry for ${year}? This cannot be undone.`
                )
              )
                return;
              resetFinanceYear(year).then(() => {
                setRows([]);
                setRevision(0);
                setMeta({});
              });
            }}
          />

          <Button size="sm" onClick={addRow}>
            Add row
          </Button>
          <Button size="sm" onClick={() => setShowChart((s) => !s)}>
            {showChart ? 'Hide chart' : 'Show chart'}
          </Button>
        </HStack>

        {showChart && (
          <Box mb={4}>
            <Line data={chartData} />
          </Box>
        )}

        <Box overflowX="auto">
          <Table
            size="sm"
            variant="striped"
            w="full"
            sx={{
              'th, td': {
                borderRight: '1px solid',
                borderColor: borderCol
              },
              'th:last-child, td:last-child': { borderRight: 'none' },
              thead: {
                position: 'sticky',
                top: 0,
                zIndex: 1,
                bg: headerBg
              }
            }}
          >
            <Thead>
              <Tr>
                <Th>Description</Th>
                {months.map((m) => (
                  <Th key={m}>
                    {m} {year}
                  </Th>
                ))}
                <Th w="40px" />
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((row) => (
                <Tr key={row.idx}>
                  <Td>
                    <HStack>
                      <Input
                        variant="flushed"
                        size="sm"
                        value={row.description}
                        onChange={(e) => renameRow(row.idx, e.target.value)}
                      />
                      {row.idx === 0 && (
                        <IconButton
                          aria-label="Fill income"
                          icon={<FiDollarSign />}
                          size="xs"
                          variant="ghost"
                          onClick={incomeDlg.onOpen}
                        />
                      )}
                    </HStack>
                  </Td>
                  {row.values.map((v, cIdx) => (
                    <Td
                      key={cIdx}
                      textAlign="right"
                      cursor="pointer"
                      onClick={() =>
                        setEdit({ rowIdx: row.idx, col: cIdx, val: v })
                      }
                      _hover={{ bg: 'blue.50' }}
                    >
                      {v.toFixed(2)}
                    </Td>
                  ))}
                  <Td textAlign="center">
                    {row.idx !== 0 && (
                      <IconButton
                        aria-label="Delete row"
                        icon={<DeleteIcon />}
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => deleteRow(row.idx)}
                      />
                    )}
                  </Td>
                </Tr>
              ))}
              <Tr fontWeight="bold">
                <Td>Leftover</Td>
                {monthlyLeft.map((v, i) => (
                  <Td key={i} textAlign="right">
                    {v.toFixed(2)}
                  </Td>
                ))}
                <Td />
              </Tr>
            </Tbody>
          </Table>
        </Box>

        {/* cell edit modal */}
        {edit && (
          <Modal
            isOpen={!!edit}
            onClose={() => setEdit(null)}
            isCentered
            size="xs"
          >
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Edit value</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <HStack>
                  <NumberInput
                    value={edit.val}
                    onChange={(_, n) =>
                      setEdit((e) => (e ? { ...e, val: n } : e))
                    }
                    precision={2}
                    step={10}
                  >
                    <NumberInputField autoFocus />
                  </NumberInput>
                  <IconButton
                    aria-label="Copy to row"
                    icon={<FiCopy />}
                    title="Fill entire row"
                    onClick={async () => {
                      const rev = await shiftRevision(year, 'redo');
                      await Promise.all(
                        Array.from({ length: 12 }, (_, m) =>
                          saveCell({
                            year,
                            row: edit.rowIdx,
                            col: m,
                            value: edit.val,
                            revision: rev
                          })
                        )
                      );
                      setRevision(rev);
                      setEdit(null);
                    }}
                  />
                  <Button
                    ml="auto"
                    onClick={() => {
                      upsert(edit.rowIdx, edit.col, edit.val);
                      setEdit(null);
                    }}
                  >
                    OK
                  </Button>
                </HStack>
              </ModalBody>
            </ModalContent>
          </Modal>
        )}

        {/* income settings modal */}
        <Modal
          isOpen={incomeDlg.isOpen}
          onClose={incomeDlg.onClose}
          size="xl"
          scrollBehavior="inside"
        >
          <ModalOverlay />
          <ModalContent maxH="80vh" overflow="hidden">
            <ModalHeader>Income Settings</ModalHeader>
            <ModalCloseButton />
            <ModalBody overflow="auto" pb={4}>
              <TarifSettings value={incomeTarif} onChange={setIncomeTarif} />
              <PayrollSettings
                value={incomePayroll}
                onChange={setIncomePayroll}
              />
              <Button
                mt={4}
                colorScheme="blue"
                isDisabled={savingIncome}
                onClick={async () => {
                  setSavingIncome(true);
                  try {
                    /* 1️⃣  Get month-by-month gross breakdown ---------------- */
                    const breakdown: {
                      Monat: string;
                      Brutto: number;
                    }[] = await fetch('/api/tarif/breakdown', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(incomeTarif)
                    }).then((r) => r.json());

                    /* helper to convert german month name → 0-based index */
                    const monthIndex: Record<string, number> = {
                      Januar: 0,
                      Februar: 1,
                      März: 2,
                      April: 3,
                      Mai: 4,
                      Juni: 5,
                      Juli: 6,
                      August: 7,
                      September: 8,
                      Oktober: 9,
                      November: 10,
                      Dezember: 11
                    };

                    /* 2️⃣  For each month run payroll => net ---------------- */
                    const nets: number[] = Array(12).fill(0);
                    await Promise.all(
                      breakdown.map(async (rec) => {
                        const res = await fetch('/api/payroll/gross-to-net', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            ...incomePayroll,
                            gross: rec.Brutto
                          })
                        }).then((r) => r.json());
                        nets[monthIndex[rec.Monat]] = res.net;
                      })
                    );

                    /* 3️⃣  Persist one new revision snapshot ----------------- */
                    const rev = await shiftRevision(year, 'redo');
                    await Promise.all(
                      nets.map((v, m) =>
                        saveCell({
                          year,
                          row: 0,
                          col: m,
                          value: v,
                          revision: rev
                        })
                      )
                    );

                    /* 4️⃣  Update UI state ----------------------------------- */
                    setRows((prev) =>
                      prev.map((r) => (r.idx === 0 ? { ...r, values: nets } : r))
                    );
                    setRevision(rev);
                    incomeDlg.onClose();
                  } finally {
                    setSavingIncome(false);
                  }
                }}
              >
                {savingIncome && <Spinner size="xs" mr={2} />}Apply
              </Button>
            </ModalBody>
          </ModalContent>
        </Modal>
      </Box>
    );
  }
);

export default FinanceTable;