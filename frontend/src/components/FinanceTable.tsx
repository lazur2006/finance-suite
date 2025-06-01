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
  useDisclosure
} from '@chakra-ui/react';
import {
  DeleteIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@chakra-ui/icons';
import { FiCopy, FiDollarSign, FiTrash2 } from 'react-icons/fi';
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
  resetFinanceYear
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
}

/* ───────────────────────────────────────────────────────── */
const FinanceTable = forwardRef<FinanceTableHandle, Props>(
  ({ year, onYearChange, tarifInput, payrollInput }, ref) => {
    /* ── persistent state ──────────────────────────────── */
    const [rows, setRows] = useState<Row[]>([
      { description: 'Income', values: Array(12).fill(0) }
    ]);
    const [revision, setRevision] = useState(0);
    const [showChart, setShowChart] = useState(false);
    const incomeDlg = useDisclosure();
    const [incomeTarif, setIncomeTarif] =
      useState<TarifInput>(tarifInput);
    const [incomePayroll, setIncomePayroll] =
      useState<PayrollInput>(payrollInput);

    /* keep modal state in sync with global defaults */
    useEffect(() => {
      if (incomeDlg.isOpen) {
        setIncomeTarif(tarifInput);
        setIncomePayroll(payrollInput);
      }
    }, [incomeDlg.isOpen, tarifInput, payrollInput]);

    /* ── debounced save ────────────────────────────────── */
    const timer = useRef<NodeJS.Timeout>();

    /**
     * Save the cell **first**, then switch to the new revision.
     * This avoids the race-condition where the table refreshes
     * before the change has hit the database.
     */
    const upsert = (r: number, c: number, v: number) => {
      shiftRevision(year, 'redo').then(newRev => {
        clearTimeout(timer.current);

        setRows(prev => {
          const clone = [...prev];
          clone[r].values[c] = v;
          return clone;
        });

        timer.current = setTimeout(async () => {
          await saveCell({ year, row: r, col: c, value: v, revision: newRev });
          setRevision(newRev); // trigger reload **after** the cell is stored
        }, 200);
      });
    };

    /* ── load latest snapshot whenever year/revision changes ───── */
    useEffect(() => {
      getFinance(year).then(cells => {
        if (!cells.length) {
          setRows([{ description: 'Income', values: Array(12).fill(0) }]);
          return;
        }
        const maxRow = Math.max(...cells.map(c => c.row), 0);
        const r: Row[] = [];
        for (let i = 0; i <= maxRow; i++) {
          r.push({
            description: i === 0 ? 'Income' : `Item ${i}`,
            values: Array(12).fill(0)
          });
        }
        cells.forEach(({ row, col, value }) => {
          if (!r[row])
            r[row] = {
              description: `Item ${row}`,
              values: Array(12).fill(0)
            };
          r[row].values[col] = value;
        });
        setRows(r);
        setRevision(cells[0]?.revision ?? 0);
      });
    }, [year, revision]);

    /* ── carry-over from December of previous year ─────────────── */
    useEffect(() => {
      if (year <= 1970) return;
      getFinance(year - 1).then(prevCells => {
        const incomeDec =
          prevCells.find(c => c.row === 0 && c.col === 11)?.value ?? 0;
        const outDec = prevCells
          .filter(c => c.row !== 0 && c.col === 11)
          .reduce((s, c) => s + c.value, 0);
        const leftover = incomeDec - outDec;
        if (leftover !== 0) {
          upsert(
            rows.length - 1,
            0,
            rows[rows.length - 1].values[0] + leftover
          );
        }
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [year]);

    /* ── undo / redo exposed to parent ───────────────────────────── */
    useImperativeHandle(ref, () => ({
      undo() {
        shiftRevision(year, 'undo').then(setRevision);
      },
      redo() {
        shiftRevision(year, 'redo').then(setRevision);
      }
    }));

    /* ── monthly leftover for chart ──────────────────────────────── */
    const monthlyLeft: number[] = [];
    for (let i = 0; i < 12; i++) {
      const income = rows[0]?.values[i] ?? 0;
      const outcome = rows
        .slice(1)
        .reduce((sum, row) => sum + (row.values[i] || 0), 0);
      monthlyLeft[i] = (monthlyLeft[i - 1] || 0) + income - outcome;
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

    /* ── styles ─────────────────────────────────────────────────── */
    const headerBg = useColorModeValue('gray.50', 'gray.800');
    const borderCol = useColorModeValue('gray.200', 'gray.600');

    /* ── edit modal state ───────────────────────────────────────── */
    const [edit, setEdit] =
      useState<null | { row: number; col: number; val: number }>(
        null
      );

    /* ── helpers ────────────────────────────────────────────────── */
    const deleteRow = (idx: number) =>
      setRows(prev => prev.filter((_, i) => i !== idx));

    const addRow = () =>
      setRows(prev => [
        ...prev,
        { description: `Item ${prev.length}`, values: Array(12).fill(0) }
      ]);

    /* ── render ─────────────────────────────────────────────────── */
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
            icon={<FiTrash2 />}
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
                setRows([
                  { description: 'Income', values: Array(12).fill(0) }
                ]);
                setRevision(0);
              });
            }}
          />

          <Button size="sm" onClick={addRow}>
            Add row
          </Button>
          <Button size="sm" onClick={() => setShowChart(s => !s)}>
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
                {months.map(m => (
                  <Th key={m}>
                    {m} {year}
                  </Th>
                ))}
                <Th w="40px" />
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((row, rIdx) => (
                <Tr key={rIdx}>
                  <Td>
                    <HStack>
                      <Input
                        variant="flushed"
                        size="sm"
                        value={row.description}
                        onChange={e =>
                          setRows(prev => {
                            const clone = [...prev];
                            clone[rIdx].description = e.target.value;
                            return clone;
                          })
                        }
                      />
                      {rIdx === 0 && (
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
                        setEdit({ row: rIdx, col: cIdx, val: v })
                      }
                      _hover={{ bg: 'blue.50' }}
                    >
                      {v.toFixed(2)}
                    </Td>
                  ))}
                  <Td textAlign="center">
                    {rIdx !== 0 && (
                      <IconButton
                        aria-label="Delete row"
                        icon={<DeleteIcon />}
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => deleteRow(rIdx)}
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
        <Modal isOpen={!!edit} onClose={() => setEdit(null)} isCentered>
          <ModalOverlay />
          {edit && (
            <ModalContent>
              <ModalHeader>Edit value</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <HStack>
                  <NumberInput
                    value={edit.val}
                    onChange={(_, n) =>
                      setEdit(e => (e ? { ...e, val: n } : e))
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
                    onClick={() => {
                      shiftRevision(year, 'redo').then(newRev => {
                        setRows(prev => {
                          const clone = [...prev];
                          clone[edit.row].values = Array(12).fill(
                            edit.val
                          );
                          return clone;
                        });
                        for (let m = 0; m < 12; m++)
                          saveCell({
                            year,
                            row: edit.row,
                            col: m,
                            value: edit.val,
                            revision: newRev
                          });
                        setRevision(newRev);
                        setEdit(null);
                      });
                    }}
                  />
                  <Button
                    ml="auto"
                    onClick={() => {
                      upsert(edit.row, edit.col, edit.val);
                      setEdit(null);
                    }}
                  >
                    OK
                  </Button>
                </HStack>
              </ModalBody>
            </ModalContent>
          )}
        </Modal>

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
              <TarifSettings
                value={incomeTarif}
                onChange={setIncomeTarif}
              />
              <PayrollSettings
                value={incomePayroll}
                onChange={setIncomePayroll}
              />
              <Button
                mt={4}
                colorScheme="blue"
                onClick={async () => {
                  const tarif = await fetch('/api/tarif/estimate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(incomeTarif)
                  }).then(r => r.json());
                  const payroll = await fetch('/api/payroll/gross-to-net', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      ...incomePayroll,
                      gross: tarif.monatsgesamt
                    })
                  }).then(r => r.json());
                  const net = payroll.net;
                  for (let m = 0; m < 12; m++) {
                    upsert(0, m, net);
                  }
                  incomeDlg.onClose();
                }}
              >
                Apply
              </Button>
            </ModalBody>
          </ModalContent>
        </Modal>
      </Box>
    );
  }
);

export default FinanceTable;
