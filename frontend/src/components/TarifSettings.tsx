import { Box, Button, Input, FormControl, FormLabel } from '@chakra-ui/react';
import React, { useState } from 'react';

const TarifSettings = () => {
  const [entgeltgruppe, setEntgeltgruppe] = useState('EG 1');
  const [stufe, setStufe] = useState('Grundentgelt');

  const handleCalc = async () => {
    const res = await fetch('/api/tarif/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entgeltgruppe, stufe })
    });
    const data = await res.json();
    console.log(data);
  };

  return (
    <Box>
      <FormControl mb={2}>
        <FormLabel>Entgeltgruppe</FormLabel>
        <Input value={entgeltgruppe} onChange={e => setEntgeltgruppe(e.target.value)} />
      </FormControl>
      <FormControl mb={2}>
        <FormLabel>Stufe</FormLabel>
        <Input value={stufe} onChange={e => setStufe(e.target.value)} />
      </FormControl>
      <Button onClick={handleCalc}>Calculate</Button>
    </Box>
  );
};

export default TarifSettings;
