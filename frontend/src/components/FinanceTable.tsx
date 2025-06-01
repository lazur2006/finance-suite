import { Box, Table, Thead, Tbody, Tr, Th, Td, Button } from '@chakra-ui/react';
import React, { useState } from 'react';

interface Row {
  description: string;
  values: number[];
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const FinanceTable = () => {
  const [rows, setRows] = useState<Row[]>([{ description: 'Income', values: Array(12).fill(0) }]);

  const addRow = () => {
    setRows([...rows, { description: 'Item', values: Array(12).fill(0) }]);
  };

  return (
    <Box overflowX="auto">
      <Button mb={2} onClick={addRow}>Add row</Button>
      <Table size="sm" variant="striped">
        <Thead>
          <Tr>
            <Th>Description</Th>
            {months.map(m => <Th key={m}>{m}</Th>)}
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row, rIdx) => (
            <Tr key={rIdx}>
              <Td>{row.description}</Td>
              {row.values.map((v, idx) => (
                <Td key={idx}>{v}</Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

export default FinanceTable;
