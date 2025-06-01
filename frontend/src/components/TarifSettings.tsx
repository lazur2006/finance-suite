import { Box, Button, Input, FormControl, FormLabel } from '@chakra-ui/react';
import React, { useState } from 'react';

interface TarifResult {
  monatsgrund: number;
  zulagen: number;
  monatsgesamt: number;
  tzug_b: number;
  urlaubsgeld: number;
  transformationsgeld: number;
  tzug_a: number;
  weihnachtsgeld: number;
  jahresentgelt: number;
}

interface TarifSettingsProps {
  entgeltgruppe: string;
  setEntgeltgruppe: (v: string) => void;
  stufe: string;
  setStufe: (v: string) => void;
}

const TarifSettings = ({ entgeltgruppe, setEntgeltgruppe, stufe, setStufe }: TarifSettingsProps) => {
  const [result, setResult] = useState<TarifResult | null>(null);

  const handleCalc = async () => {
    const res = await fetch('/api/tarif/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entgeltgruppe, stufe })
    });
    const data: TarifResult = await res.json();
    setResult(data);
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
      {result && (
        <Box mt={4}>
          <div>Monatsgrund: {result.monatsgrund}</div>
          <div>Zulagen: {result.zulagen}</div>
          <div>Monatsgesamt: {result.monatsgesamt}</div>
          <div>T-ZUG B: {result.tzug_b}</div>
          <div>Urlaubsgeld: {result.urlaubsgeld}</div>
          <div>Transformationsgeld: {result.transformationsgeld}</div>
          <div>T-ZUG A: {result.tzug_a}</div>
          <div>Weihnachtsgeld: {result.weihnachtsgeld}</div>
          <div>Jahresentgelt: {result.jahresentgelt}</div>
        </Box>
      )}
    </Box>
  );
};

export default TarifSettings;
