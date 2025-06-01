import { Box, Button, FormControl, FormLabel, Select } from '@chakra-ui/react';
import React, { useState } from 'react';

const EG_OPTIONS = [
  'EG 1',
  'EG 2',
  'EG 3',
  'EG 4',
  'EG 5',
  'EG 6',
  'EG 7',
  'EG 8',
  'EG 9',
  'EG 10',
  'EG 11',
  'EG 12',
  'EG 13',
  'EG 14',
];

const STUFE_OPTIONS = [
  'Grundentgelt',
  'bis 12. Monat',
  'nach 12. Monat',
  'bis 18. Monat',
  'nach 18. Monat',
  'bis 36. Monat',
  'nach 36. Monat',
  'nach 24. Monat',
];

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
        <Select value={entgeltgruppe} onChange={e => setEntgeltgruppe(e.target.value)}>
          {EG_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </Select>
      </FormControl>
      <FormControl mb={2}>
        <FormLabel>Stufe</FormLabel>
        <Select value={stufe} onChange={e => setStufe(e.target.value)}>
          {STUFE_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </Select>
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
