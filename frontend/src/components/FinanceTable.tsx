import { Box, Table, Thead, Tbody, Tr, Th, Td, Button, Input } from '@chakra-ui/react';
import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const AutoInput = ({ value, onChange }: { value: number | string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => {
  const [width, setWidth] = useState('2ch');
  useEffect(() => {
    const len = String(value ?? '').length;
    setWidth(`${Math.max(len + 1, 2)}ch`);
  }, [value]);
  return (
    <Input
      type="number"
      size="sm"
      textAlign="right"
      value={value}
      onChange={onChange}
      width={width}
      variant="flushed"
    />
  );
};

interface Row {
  description: string;
  values: number[];
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface FinanceTableProps {
  entgeltgruppe: string;
  stufe: string;
}

const FinanceTable = ({ entgeltgruppe, stufe }: FinanceTableProps) => {
  const [rows, setRows] = useState<Row[]>([{ description: 'Income', values: Array(12).fill(0) }]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showChart, setShowChart] = useState(false);

  const addRow = () => {
    setRows([...rows, { description: `Item ${rows.length}`, values: Array(12).fill(0) }]);
  };

  const headers = months.map(m => <Th key={m}>{m} {year}</Th>);

  const populateIncome = async () => {
    const tarifRes = await fetch('/api/tarif/breakdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entgeltgruppe, stufe }),
    });
    const monthsData = await tarifRes.json();
    const nets: number[] = [];
    for (const m of monthsData) {
      const payRes = await fetch('/api/payroll/gross-to-net', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gross: m.Brutto }),
      });
      const payData = await payRes.json();
      nets.push(payData.net);
    }
    const newRows = [...rows];
    newRows[0].values = nets;
    setRows(newRows);
  };

  const monthlyLeftover: number[] = [];
  for (let i = 0; i < 12; i++) {
    const income = rows[0].values[i] || 0;
    const outcome = rows.slice(1).reduce((s, r) => s + (r.values[i] || 0), 0);
    const prev = i > 0 ? monthlyLeftover[i - 1] : 0;
    monthlyLeftover[i] = prev + income - outcome;
  }

  const chartData = {
    labels: months,
    datasets: [
      {
        label: 'Leftover',
        data: monthlyLeftover,
        borderColor: 'rgb(56,132,255)',
        backgroundColor: 'rgba(56,132,255,0.2)',
      },
    ],
  };

  const headers = months.map(m => <Th key={m}>{m} {year}</Th>);

  const populateIncome = async () => {
    const tarifRes = await fetch('/api/tarif/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entgeltgruppe, stufe }),
    });
    const tarifData = await tarifRes.json();
    const gross = tarifData.monatsgesamt;
    const payRes = await fetch('/api/payroll/gross-to-net', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gross }),
    });
    const payData = await payRes.json();
    const newRows = [...rows];
    newRows[0].values = Array(12).fill(payData.net);
    setRows(newRows);
  };

  const monthlyLeftover: number[] = [];
  for (let i = 0; i < 12; i++) {
    const income = rows[0].values[i] || 0;
    const outcome = rows.slice(1).reduce((s, r) => s + (r.values[i] || 0), 0);
    const prev = i > 0 ? monthlyLeftover[i - 1] : 0;
    monthlyLeftover[i] = prev + income - outcome;
  }

  const chartData = {
    labels: months,
    datasets: [
      {
        label: 'Leftover',
        data: monthlyLeftover,
        borderColor: 'rgb(56,132,255)',
        backgroundColor: 'rgba(56,132,255,0.2)',
      },
    ],
  };

  return (
    <Box overflowX="auto">
      <Box mb={2} display="flex" gap={2} alignItems="center">
        <Input width="100px" type="number" value={year} onChange={e => setYear(Number(e.target.value))} />
        <Button onClick={populateIncome}>Populate Income</Button>
        <Button onClick={addRow}>Add row</Button>
        <Button onClick={() => setShowChart(!showChart)}>{showChart ? 'Hide Chart' : 'Show Chart'}</Button>
      </Box>
      {showChart && (
        <Box mb={4}>
          <Line data={chartData} />
        </Box>
      )}
      <Table size="sm" variant="striped">
        <Thead>
          <Tr>
            <Th>Description</Th>
            {headers}
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row, rIdx) => (
            <Tr key={rIdx}>
              <Td>
                <Input
                  variant="flushed"
                  size="sm"
                  width="100%"
                  value={row.description}
                  onChange={e => {
                    const newRows = [...rows];
                    newRows[rIdx].description = e.target.value;
                    setRows(newRows);
                  }}
                />
              </Td>
              {row.values.map((v, idx) => (
                <Td key={idx}>
                  <AutoInput
                    value={v}
                    onChange={e => {
                      const newRows = [...rows];
                      newRows[rIdx].values[idx] = Number(e.target.value);
                      setRows(newRows);
                    }}
                  />
                </Td>
              ))}
            </Tr>
          ))}
          <Tr>
            <Td fontWeight="bold">Leftover</Td>
            {monthlyLeftover.map((v, idx) => (
              <Td key={idx} textAlign="right">{v.toFixed(2)}</Td>
            ))}
          </Tr>
        </Tbody>
      </Table>
    </Box>
  );
};

export default FinanceTable;
