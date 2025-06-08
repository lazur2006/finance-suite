/* eslint-disable react-hooks/exhaustive-deps */
import {
  Box,
  Button,
  HStack,
  IconButton,
  Input,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  useDisclosure,
} from "@chakra-ui/react";
import {
  DeleteIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DragHandleIcon,
  StarIcon,
} from "@chakra-ui/icons";
import { FiDollarSign } from "react-icons/fi";
import { AiOutlineCalculator } from "react-icons/ai";

import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "react-beautiful-dnd";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
} from "react";

import { months } from "./constants";
import { calcMonthlyLeftover, isIncomeRow } from "./helpers";
import LeftoverChart from "./LeftoverChart";
import CellEditModal from "./CellEditModal";
import IncomeSettingsModal from "./IncomeSettingsModal";
import {
  FinanceTableHandle,
  FinanceTableProps,
  Row,
  RowMeta,
} from "./types";

import {
  Cell,
  getFinance,
  saveCell,
  shiftRevision,
  resetFinanceYear,
  getRowMeta,
  saveRowMeta,
  deleteRowMeta,
} from "../../api";

/* Height (px) of the fixed toolbar – keep in sync with `h` below */
const TOOLBAR_H = 48;

/* ───────────────────────────────────────────────────────── */
/** maps DB snapshot + meta → renderable rows */
const toRows = (
  cells: Cell[],
  metaObj: Record<number, RowMeta>,
  year: number,
): Row[] => {
  if (!metaObj[0]) {
    metaObj[0] = {
      year,
      row: 0,
      position: 0,
      description: "Income",
      deleted: false,
      income: true,
    } as RowMeta;
  }

  const byRow: Record<number, number[]> = {};
  cells.forEach((c) => {
    if (metaObj[c.row]?.deleted) return;
    if (!byRow[c.row]) byRow[c.row] = Array(12).fill(0);
    byRow[c.row][c.col] = c.value;
  });
  if (!byRow[0]) byRow[0] = Array(12).fill(0);

  return Object.keys(byRow)
    .map(Number)
    .map((idx) => ({
      idx,
      description:
        metaObj[idx]?.description ?? (idx === 0 ? "Income" : `Item ${idx}`),
      values: byRow[idx],
      income: isIncomeRow(idx, metaObj),
      irregular: metaObj[idx]?.irregular ?? false,
      position: metaObj[idx]?.position ?? idx,
    }))
    .sort((a, b) => a.position - b.position);
};

const FinanceTable = forwardRef<FinanceTableHandle, FinanceTableProps>(
  ({ year, onYearChange, tarifInput, payrollInput }, ref) => {
    /* ─── state ───────────────────────────────────────── */
    const [rows, setRows] = useState<Row[]>([]);
    const [meta, setMeta] = useState<Record<number, RowMeta>>({});
    const [revision, setRevision] = useState(0);
    const [showChart, setShowChart] = useState(false);
    const [prevLeftover, setPrevLeftover] = useState(0);
    const [edit, setEdit] =
      useState<null | { rowIdx: number; col: number; val: number }>(null);

    const incomeDlg = useDisclosure();

    /* ─── load CURRENT year snapshot + meta ─────────────── */
    useEffect(() => {
      const loadCurrent = async () => {
        const [cells, metaObj] = await Promise.all([
          getFinance(year),
          getRowMeta(year),
        ]);
        setRows(toRows(cells, metaObj, year));
        setMeta(metaObj);
        if (cells.length) setRevision(cells[0].revision);
      };
      loadCurrent();
    }, [year, revision]);

    /* ─── load PREVIOUS year for carry-over ─────────────── */
    useEffect(() => {
      const loadPrev = async () => {
        const [cellsPrev, metaPrev] = await Promise.all([
          getFinance(year - 1),
          getRowMeta(year - 1),
        ]);
        if (!cellsPrev.length) {
          setPrevLeftover(0);
          return;
        }
        const prevRows = toRows(cellsPrev, metaPrev, year - 1);
        const left = calcMonthlyLeftover(prevRows, 0);
        setPrevLeftover(left[left.length - 1] ?? 0);
      };
      loadPrev();
    }, [year]);

    /* expose undo / redo to parent */
    useImperativeHandle(ref, () => ({
      undo: () => shiftRevision(year, "undo").then(setRevision),
      redo: () => shiftRevision(year, "redo").then(setRevision),
    }));

    /* ─── drag & drop handler ───────────────────────────── */
    const onDragEnd = useCallback(
      (result: DropResult) => {
        if (!result.destination) return;
        const from = result.source.index;
        const to = result.destination.index;
        if (from === to) return;

        const reordered = [...rows];
        const [moved] = reordered.splice(from, 1);
        reordered.splice(to, 0, moved);

        const updatedRows = reordered.map((r, pos) => ({
          ...r,
          position: pos,
        }));
        setRows(updatedRows);

        const newMeta = { ...meta };
        updatedRows.forEach((r) => {
          if (!meta[r.idx] || meta[r.idx].position !== r.position) {
            const m: RowMeta = { ...meta[r.idx], position: r.position } as RowMeta;
            newMeta[r.idx] = m;
            saveRowMeta(m);
          }
        });
        setMeta(newMeta);
      },
      [rows, meta],
    );

    /* ─── helpers that mutate remote state ──────────────── */
    const upsert = (rowIdx: number, col: number, val: number) => {
      setRows((prev) =>
        prev.map((r) =>
          r.idx === rowIdx
            ? { ...r, values: r.values.map((v, i) => (i === col ? val : v)) }
            : r,
        ),
      );

      (async () => {
        try {
          const rev = await shiftRevision(year, "redo");
          await saveCell({ year, row: rowIdx, col, value: val, revision: rev });
          setRevision(rev);
        } catch (err) {
          console.error(err);
        }
      })();
    };

    const copyValueToRow = (rowIdx: number, val: number) => {
      const newVals = Array(12).fill(val);
      setRows((prev) =>
        prev.map((r) => (r.idx === rowIdx ? { ...r, values: newVals } : r)),
      );

      (async () => {
        try {
          const rev = await shiftRevision(year, "redo");
          await Promise.all(
            newVals.map((v, m) =>
              saveCell({
                year,
                row: rowIdx,
                col: m,
                value: v,
                revision: rev,
              }),
            ),
          );
          setRevision(rev);
        } catch (err) {
          console.error(err);
        }
      })();
    };

    /* add row (expense / income / irregular) */
    const addRow = async (asIncome: boolean, asIrregular = false) => {
      const newIdx = Math.max(0, ...rows.map((r) => r.idx)) + 1;
      const metaRec: RowMeta = {
        year,
        row: newIdx,
        position: rows.length,
        description: asIncome
          ? `Income ${newIdx}`
          : asIrregular
          ? `Irregular ${newIdx}`
          : `Item ${newIdx}`,
        deleted: false,
        income: asIncome,
        irregular: asIrregular,
      };
      await saveRowMeta(metaRec);
      setMeta((m) => ({ ...m, [newIdx]: metaRec }));
      setRows((prev) => [
        ...prev,
        {
          idx: newIdx,
          description: metaRec.description,
          values: Array(12).fill(0),
          income: asIncome,
          irregular: asIrregular,
          position: metaRec.position,
        },
      ]);
    };

    const deleteRow = async (rowIdx: number) => {
      await deleteRowMeta(year, rowIdx);
      setMeta((m) => ({ ...m, [rowIdx]: { ...m[rowIdx], deleted: true } }));
      setRows((prev) => prev.filter((r) => r.idx !== rowIdx));
    };

    const renameRow = (rowIdx: number, name: string) => {
      setRows((prev) =>
        prev.map((r) => (r.idx === rowIdx ? { ...r, description: name } : r)),
      );
      saveRowMeta({ ...meta[rowIdx], description: name });
    };

    const toggleIncome = async (rowIdx: number) => {
      const updated = {
        ...meta[rowIdx],
        income: !isIncomeRow(rowIdx, meta),
      } as RowMeta;
      await saveRowMeta(updated);
      setMeta((m) => ({ ...m, [rowIdx]: updated }));
      setRows((prev) =>
        prev.map((r) =>
          r.idx === rowIdx ? { ...r, income: updated.income! } : r,
        ),
      );
    };

    /* derived data */
    const monthlyLeft = calcMonthlyLeftover(rows, prevLeftover);

    /* theme helpers */
    const headerBg  = useColorModeValue("gray.100", "gray.700");
    const borderCol = useColorModeValue("gray.200", "gray.600");
    const zebraOdd  = useColorModeValue("gray.50",  "gray.800");

    const incomeBg   = useColorModeValue("green.50",  "green.900");
    const incomeText = useColorModeValue("green.700", "green.300");

    const irrBg      = useColorModeValue("orange.50", "orange.900");
    const irrText    = useColorModeValue("orange.700","orange.300");

    const cellHoverBg = useColorModeValue("blue.50",  "blue.700");

    /* ────────────────────────── render ─────────────────────── */
    return (
      <Box w="full" h="full" display="flex" flexDirection="column">
        {/* Fixed toolbar (never scrolls) */}
        <HStack
          gap={2}
          px={2}
          py={1}
          bg={headerBg}
          h={`${TOOLBAR_H}px`}
          flexWrap="nowrap"
          position="sticky"
          top={0}
          zIndex={3}
        >
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
          <IconButton
            aria-label="Reset year"
            icon={<DeleteIcon />}
            size="sm"
            variant="outline"
            colorScheme="red"
            onClick={() => {
              if (
                !window.confirm(
                  `Delete EVERY entry for ${year}? This cannot be undone.`,
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
          <Button size="sm" onClick={() => addRow(false, false)}>
            Add expense row
          </Button>
          <Button size="sm" onClick={() => addRow(false, true)}>
            Add special row
          </Button>
          <Button size="sm" onClick={() => addRow(true, false)}>
            Add income row
          </Button>
          <Button size="sm" onClick={() => setShowChart((s) => !s)}>
            {showChart ? "Hide chart" : "Show chart"}
          </Button>
        </HStack>

        {/* Chart (optional) */}
        {showChart && (
          <Box h="140px" mb={4}>
            <LeftoverChart data={monthlyLeft} />
          </Box>
        )}

        {/* Scrolling table area */}
        <Box flex="1 1 0" overflow="auto">
          <DragDropContext onDragEnd={onDragEnd}>
            <Table
              size="sm"
              variant="simple"
              w="full"
              sx={{
                "th, td": {
                  borderRight: "1px solid",
                  borderColor: borderCol,
                },
                "th:last-child, td:last-child": { borderRight: "none" },
                thead: {
                  position: "sticky",
                  top: 0,             /* now relative to the scroll box */
                  zIndex: 2,
                  bg: headerBg,
                },
              }}
            >
              <Thead>
                <Tr>
                  <Th w="24px" />
                  <Th>Description</Th>
                  {months.map((m) => (
                    <Th key={m}>
                      {m} {year}
                    </Th>
                  ))}
                  <Th w="40px" />
                </Tr>
              </Thead>

              <Droppable droppableId="finance-rows" type="ROW">
                {(dropProvided) => (
                  <Tbody
                    ref={dropProvided.innerRef}
                    {...dropProvided.droppableProps}
                  >
                    {rows.map((row, index) => {
                      const rowBg =
                        row.income
                          ? incomeBg
                          : row.irregular
                          ? irrBg
                          : index % 2
                          ? zebraOdd
                          : "transparent";

                      const textColor =
                        row.income
                          ? incomeText
                          : row.irregular
                          ? irrText
                          : undefined;

                      return (
                        <Draggable
                          key={row.idx}
                          draggableId={row.idx.toString()}
                          index={index}
                        >
                          {(dragProvided, dragState) => (
                            <Tr
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              opacity={dragState.isDragging ? 0.6 : 1}
                              bg={rowBg}
                              color={textColor}
                              _hover={{ bg: rowBg }}
                            >
                              {/* handle */}
                              <Td
                                {...dragProvided.dragHandleProps}
                                sx={{ cursor: "grab", px: 1, w: "24px" }}
                              >
                                <DragHandleIcon />
                              </Td>

                              {/* description */}
                              <Td>
                                <HStack>
                                  <Input
                                    variant="flushed"
                                    size="sm"
                                    value={row.description}
                                    onChange={(e) =>
                                      renameRow(row.idx, e.target.value)
                                    }
                                  />
                                  <IconButton
                                    aria-label={
                                      row.income
                                        ? "Income row"
                                        : row.irregular
                                        ? "Special row"
                                        : "Expense row"
                                    }
                                    icon={
                                      row.income ? (
                                        <FiDollarSign />
                                      ) : row.irregular ? (
                                        <StarIcon />
                                      ) : (
                                        <FiDollarSign />
                                      )
                                    }
                                    size="xs"
                                    variant="ghost"
                                    colorScheme={
                                      row.income
                                        ? "green"
                                        : row.irregular
                                        ? "orange"
                                        : "gray"
                                    }
                                    title="Toggle income / expense"
                                    onClick={() => toggleIncome(row.idx)}
                                  />
                                  {row.idx ===
                                    (rows.find((r) => r.income)?.idx ?? 0) && (
                                    <IconButton
                                      aria-label="Fill income"
                                      icon={<AiOutlineCalculator />}
                                      size="xs"
                                      variant="ghost"
                                      onClick={incomeDlg.onOpen}
                                    />
                                  )}
                                </HStack>
                              </Td>

                              {/* monthly cells */}
                              {row.values.map((v, cIdx) => (
                                <Td
                                  key={cIdx}
                                  textAlign="right"
                                  cursor="pointer"
                                  _hover={{ bg: cellHoverBg }}
                                  onClick={() =>
                                    setEdit({
                                      rowIdx: row.idx,
                                      col: cIdx,
                                      val: v,
                                    })
                                  }
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
                          )}
                        </Draggable>
                      );
                    })}

                    {dropProvided.placeholder}

                    {/* leftover summary row */}
                    <Tr bg="slategray" color="white" fontWeight="semibold">
                      <Td />
                      <Td>Leftover</Td>
                      {monthlyLeft.map((v, i) => (
                        <Td
                          key={i}
                          textAlign="right"
                          color={v < 0 ? "red.300" : "green.200"}
                        >
                          {v.toFixed(2)}
                        </Td>
                      ))}
                      <Td />
                    </Tr>
                  </Tbody>
                )}
              </Droppable>
            </Table>
          </DragDropContext>
        </Box>

        {/* ───────── Modals ───────── */}
        {edit && (
          <CellEditModal
            isOpen={!!edit}
            value={edit.val}
            onChange={(v) =>
              setEdit((e) => (e ? { ...e, val: v } : e))
            }
            onSave={() => {
              if (!edit) return;
              upsert(edit.rowIdx, edit.col, edit.val);
              setEdit(null);
            }}
            onCopyRow={() => {
              if (!edit) return;
              copyValueToRow(edit.rowIdx, edit.val);
              setEdit(null);
            }}
            onClose={() => setEdit(null)}
          />
        )}

        <IncomeSettingsModal
          isOpen={incomeDlg.isOpen}
          onClose={incomeDlg.onClose}
          year={year}
          incomeRowIdx={rows.find((r) => r.income)?.idx ?? 0}
          tarifInput={tarifInput}
          payrollInput={payrollInput}
          applyIncome={async (nets, incomeRowIdx, yr) => {
            const rev = await shiftRevision(yr, "redo");
            await Promise.all(
              nets.map((v, m) =>
                saveCell({
                  year: yr,
                  row: incomeRowIdx,
                  col: m,
                  value: v,
                  revision: rev,
                }),
              ),
            );
            setRows((prev) =>
              prev.map((r) =>
                r.idx === incomeRowIdx ? { ...r, values: nets } : r,
              ),
            );
            setRevision(rev);
          }}
        />
      </Box>
    );
  },
);

export default FinanceTable;
