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

/* ───────────────────────────────────────────────────────── */
const FinanceTable = forwardRef<FinanceTableHandle, FinanceTableProps>(
  ({ year, onYearChange, tarifInput, payrollInput }, ref) => {
    /* ─── state ───────────────────────────────────────── */
    const [rows, setRows] = useState<Row[]>([]);
    const [meta, setMeta] = useState<Record<number, RowMeta>>({});
    const [revision, setRevision] = useState(0);
    const [showChart, setShowChart] = useState(false);

    /* carry-over for future feature */
    const [prevLeftover] = useState(0);

    /* cell-edit modal */
    const [edit, setEdit] =
      useState<null | { rowIdx: number; col: number; val: number }>(null);

    /* income-settings modal */
    const incomeDlg = useDisclosure();

    /* ─── helper: build visible rows from DB snapshot + meta ───────── */
    const buildRows = (cells: Cell[], metaObj: Record<number, RowMeta>) => {
      const byRow: Record<number, number[]> = {};
      cells.forEach((c) => {
        if (metaObj[c.row]?.deleted) return;
        if (!byRow[c.row]) byRow[c.row] = Array(12).fill(0);
        byRow[c.row][c.col] = c.value;
      });
      if (!byRow[0]) byRow[0] = Array(12).fill(0); // ensure at least one income row

      const out: Row[] = Object.keys(byRow)
        .map(Number)
        .map((idx) => ({
          idx,
          description:
            metaObj[idx]?.description ??
            (idx === 0 ? "Income" : `Item ${idx}`),
          values: byRow[idx],
          income: isIncomeRow(idx, metaObj),
          position: metaObj[idx]?.position ?? idx,
        }))
        .sort((a, b) => a.position - b.position);

      setRows(out);
    };

    /* ─── load snapshot + meta whenever year OR revision changes ───── */
    useEffect(() => {
      Promise.all([getFinance(year), getRowMeta(year)]).then(
        ([cells, metaObj]) => {
          // guarantee legacy row-0 is income
          if (!metaObj[0])
            metaObj[0] = {
              year,
              row: 0,
              position: 0,
              description: "Income",
              deleted: false,
              income: true,
            } as RowMeta;

          setMeta(metaObj);
          buildRows(cells, metaObj);
          if (cells.length) setRevision(cells[0].revision);
        },
      );
    }, [year, revision]);

    /* ─── expose undo / redo to parent ─────────────────────────────── */
    useImperativeHandle(ref, () => ({
      undo: () => shiftRevision(year, "undo").then(setRevision),
      redo: () => shiftRevision(year, "redo").then(setRevision),
    }));

    /* ─── drag & drop handler ──────────────────────────────────────── */
    const onDragEnd = useCallback(
      (result: DropResult) => {
        if (!result.destination) return;
        const from = result.source.index;
        const to = result.destination.index;
        if (from === to) return;

        /* re-order local state */
        const reordered = [...rows];
        const [moved] = reordered.splice(from, 1);
        reordered.splice(to, 0, moved);

        const updatedRows = reordered.map((r, pos) => ({
          ...r,
          position: pos,
        }));
        setRows(updatedRows);

        /* persist new positions (fire-and-forget) */
        const newMeta = { ...meta };
        updatedRows.forEach((r) => {
          if (!meta[r.idx] || meta[r.idx].position !== r.position) {
            const m: RowMeta = {
              ...meta[r.idx],
              position: r.position,
            } as RowMeta;
            newMeta[r.idx] = m;
            saveRowMeta(m);
          }
        });
        setMeta(newMeta);
      },
      [rows, meta],
    );

    /* ─── helpers that mutate remote state ─────────────────────────── */
    const upsert = async (rowIdx: number, col: number, val: number) => {
      const rev = await shiftRevision(year, "redo");
      await saveCell({ year, row: rowIdx, col, value: val, revision: rev });
      setRows((prev) =>
        prev.map((r) =>
          r.idx === rowIdx
            ? { ...r, values: r.values.map((v, i) => (i === col ? val : v)) }
            : r,
        ),
      );
      setRevision(rev);
    };

    const addRow = async (asIncome: boolean) => {
      const newIdx = Math.max(0, ...rows.map((r) => r.idx)) + 1;
      const metaRec: RowMeta = {
        year,
        row: newIdx,
        position: rows.length,
        description: asIncome ? `Income ${newIdx}` : `Item ${newIdx}`,
        deleted: false,
        income: asIncome,
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

    /* ─── derived data ─────────────────────────────────────────────── */
    const monthlyLeft = calcMonthlyLeftover(rows, prevLeftover);

    /* ─── theme helpers ────────────────────────────────────────────── */
    const headerBg   = useColorModeValue("gray.100", "gray.700");
    const borderCol  = useColorModeValue("gray.200", "gray.600");
    const zebraOdd   = useColorModeValue("gray.50",  "gray.800");
    const incomeBg   = useColorModeValue("green.50", "green.900");
    const incomeText = useColorModeValue("green.700","green.300");

    /* Dark-mode-specific hover colors */
    const hoverBg     = useColorModeValue("gray.100", "gray.600"); // row hover
    const cellHoverBg = useColorModeValue("blue.50",  "blue.700"); // cell hover

    /* ────────────────────────── render ────────────────────────────── */
    return (
      <Box w="full" h="full" overflow="auto">
        {/* toolbar */}
        <HStack mb={2} gap={2} flexWrap="wrap">
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
          <Button size="sm" onClick={() => addRow(false)}>
            Add expense row
          </Button>
          <Button size="sm" onClick={() => addRow(true)}>
            Add income row
          </Button>
          <Button size="sm" onClick={() => setShowChart((s) => !s)}>
            {showChart ? "Hide chart" : "Show chart"}
          </Button>
        </HStack>

        {showChart && (
          /* Height limited to ~1/3 of the previous size */
          <Box mb={4} h="25rem">
            <LeftoverChart data={monthlyLeft} />
          </Box>
        )}

        <Box overflowX="auto">
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
                  top: 0,
                  zIndex: 1,
                  bg: headerBg,
                },
              }}
            >
              <Thead>
                <Tr>
                  <Th w="24px" /> {/* drag-handle column */}
                  <Th>Description</Th>
                  {months.map((m) => (
                    <Th key={m}>
                      {m} {year}
                    </Th>
                  ))}
                  <Th w="40px" />
                </Tr>
              </Thead>

              {/* Droppable container = Tbody */}
              <Droppable droppableId="finance-rows" type="ROW">
                {(dropProvided) => (
                  <Tbody
                    ref={dropProvided.innerRef}
                    {...dropProvided.droppableProps}
                  >
                    {rows.map((row, index) => {
                      const rowBg = row.income
                        ? incomeBg
                        : index % 2
                        ? zebraOdd
                        : "transparent";
                      const textColor = row.income ? incomeText : undefined;

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
                              _hover={{ bg: row.income ? incomeBg : hoverBg }}
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
                                        : "Expense row"
                                    }
                                    icon={<FiDollarSign />}
                                    size="xs"
                                    variant="ghost"
                                    colorScheme={row.income ? "green" : "gray"}
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
                                  onClick={() =>
                                    setEdit({
                                      rowIdx: row.idx,
                                      col: cIdx,
                                      val: v,
                                    })
                                  }
                                  _hover={{ bg: cellHoverBg }}
                                >
                                  {v.toFixed(2)}
                                </Td>
                              ))}

                              {/* delete btn */}
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

        {/* cell-edit modal */}
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
            onCopyRow={async () => {
              if (!edit) return;
              const rev = await shiftRevision(year, "redo");
              await Promise.all(
                Array.from({ length: 12 }, (_, m) =>
                  saveCell({
                    year,
                    row: edit.rowIdx,
                    col: m,
                    value: edit.val,
                    revision: rev,
                  }),
                ),
              );
              setRevision(rev);
              setEdit(null);
            }}
            onClose={() => setEdit(null)}
          />
        )}

        {/* income-settings modal */}
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
