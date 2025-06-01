import { Box, Button, Input, FormControl, FormLabel } from '@chakra-ui/react';
import React, { useState } from 'react';

interface PayrollResult {
  net: number;
  income_tax: number;
  solidarity: number;
  church_tax: number;
  health_employee: number;
  health_employer: number;
  care_employee: number;
  care_employer: number;
  pension_employee: number;
  pension_employer: number;
  unemployment_employee: number;
  unemployment_employer: number;
}

interface PayrollSettingsProps {
  gross: number;
  setGross: (v: number) => void;
}

const PayrollSettings = ({ gross, setGross }: PayrollSettingsProps) => {
  const [result, setResult] = useState<PayrollResult | null>(null);

  const handleCalc = async () => {
    const res = await fetch('/api/payroll/gross-to-net', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gross })
    });
    const data: PayrollResult = await res.json();
    setResult(data);
  };

  return (
    <Box>
      <FormControl mb={2}>
        <FormLabel>Gross (monthly)</FormLabel>
        <Input type="number" value={gross} onChange={e => setGross(Number(e.target.value))} />
      </FormControl>
      <Button onClick={handleCalc}>Calculate</Button>
      {result && (
        <Box mt={4}>
          <div>Net: {result.net}</div>
          <div>Income tax: {result.income_tax}</div>
          <div>Solidarity: {result.solidarity}</div>
          <div>Church tax: {result.church_tax}</div>
          <div>Health employee: {result.health_employee}</div>
          <div>Health employer: {result.health_employer}</div>
          <div>Care employee: {result.care_employee}</div>
          <div>Care employer: {result.care_employer}</div>
          <div>Pension employee: {result.pension_employee}</div>
          <div>Pension employer: {result.pension_employer}</div>
          <div>Unemployment employee: {result.unemployment_employee}</div>
          <div>Unemployment employer: {result.unemployment_employer}</div>
        </Box>
      )}
    </Box>
  );
};

export default PayrollSettings;
