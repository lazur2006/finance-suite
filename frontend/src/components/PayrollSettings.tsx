
import React, { useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  Select,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Stack,
  Switch
} from '@chakra-ui/react';
import { saveSettings } from '../api';

/* ───────────── UI type + defaults ───────────── */
export interface PayrollInputUI {
  gross: number;
  period: 'monthly' | 'yearly';
  tax_class: number;
  married: boolean;
  federal_state: string;
  church: boolean;
  childless: boolean;
  additional_kv: number;
}

export const defaultPayrollInput: PayrollInputUI = {
  gross: 4000,
  period: 'monthly',
  tax_class: 1,
  married: false,
  federal_state: 'NW',
  church: false,
  childless: true,
  additional_kv: 0.025
};

/* ───────────── component ───────────── */
interface PayrollResult {
  [k: string]: number;
}

interface Props {
  value: PayrollInputUI;
  onChange: (v: PayrollInputUI) => void;
}

const PayrollSettings: React.FC<Props> = ({ value, onChange }) => {
  const [result, setResult] = React.useState<PayrollResult | null>(null);

  const set = <K extends keyof PayrollInputUI>(k: K, v: PayrollInputUI[K]) =>
    onChange({ ...value, [k]: v });

  const calc = () =>
    fetch('/api/payroll/gross-to-net', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value)
    })
      .then(r => r.json())
      .then(setResult);

  /* persist */
  useEffect(() => {
    saveSettings('payroll', value);
  }, [value]);

  const num = (
    label: string,
    key: keyof PayrollInputUI,
    step = 1,
    min?: number,
    max?: number
  ) => (
    <FormControl>
      <FormLabel>{label}</FormLabel>
      <NumberInput
        value={value[key] as number}
        onChange={(_, n) => set(key, Number.isNaN(n) ? 0 : n)}
        step={step}
        min={min}
        max={max}
        precision={2}
      >
        <NumberInputField />
      </NumberInput>
    </FormControl>
  );

  return (
    <Stack spacing={4}>
      <SimpleGrid columns={[1, 2]} gap={4}>
        {num('Gross', 'gross', 50, 0)}
        <FormControl>
          <FormLabel>Period</FormLabel>
          <Select
            value={value.period}
            onChange={e => set('period', e.target.value as any)}
          >
            <option value="monthly">monthly</option>
            <option value="yearly">yearly</option>
          </Select>
        </FormControl>

        {num('Tax class', 'tax_class', 1, 1, 6)}
        <FormControl>
          <FormLabel>Married</FormLabel>
          <Switch
            isChecked={value.married}
            onChange={e => set('married', e.target.checked)}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Federal state</FormLabel>
          <Select
            value={value.federal_state}
            onChange={e => set('federal_state', e.target.value)}
          >
            {[
              'BW',
              'BY',
              'NW',
              'NI',
              'HB',
              'HH',
              'HE',
              'RP',
              'SL',
              'SH',
              'MV',
              'SN',
              'ST',
              'BB',
              'BE',
              'TH'
            ].map(s => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>Church tax</FormLabel>
          <Switch
            isChecked={value.church}
            onChange={e => set('church', e.target.checked)}
          />
        </FormControl>
        <FormControl>
          <FormLabel>Childless</FormLabel>
          <Switch
            isChecked={value.childless}
            onChange={e => set('childless', e.target.checked)}
          />
        </FormControl>

        {num('Additional KV %', 'additional_kv', 0.001, 0, 0.05)}
      </SimpleGrid>

      <Button w="fit-content" onClick={calc}>
        Calculate
      </Button>

      {result && (
        <>
          <Box fontWeight="bold">Breakdown</Box>
          <SimpleGrid columns={[1, 2, 3]} gap={4}>
            {Object.entries(result).map(([k, v]) => (
              <Stat
                key={k}
                p={3}
                borderWidth="1px"
                rounded="md"
                bg="gray.50"
                _dark={{ bg: 'gray.700' }}
              >
                <StatLabel textTransform="capitalize">{k}</StatLabel>
                <StatNumber>
                  {v.toLocaleString('de-DE', {
                    style: 'currency',
                    currency: 'EUR'
                  })}
                </StatNumber>
              </Stat>
            ))}
          </SimpleGrid>
        </>
      )}
    </Stack>
  );
};

export default PayrollSettings;

