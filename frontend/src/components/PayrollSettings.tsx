import { Box, Button, Input, FormControl, FormLabel } from '@chakra-ui/react';
import React, { useState } from 'react';

const PayrollSettings = () => {
  const [gross, setGross] = useState(4000);

  const handleCalc = async () => {
    const res = await fetch('/api/payroll/gross-to-net', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gross })
    });
    const data = await res.json();
    console.log(data);
  };

  return (
    <Box>
      <FormControl mb={2}>
        <FormLabel>Gross (monthly)</FormLabel>
        <Input type="number" value={gross} onChange={e => setGross(Number(e.target.value))} />
      </FormControl>
      <Button onClick={handleCalc}>Calculate</Button>
    </Box>
  );
};

export default PayrollSettings;
