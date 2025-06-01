
import React, { useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Select,
  NumberInput,
  NumberInputField,
  Switch,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Stack,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionIcon,
  AccordionPanel
} from '@chakra-ui/react';
import { saveSettings } from '../api';

/* ───────────────────────── types & defaults ───────────────────────── */
export interface TarifInputUI {
  entgeltgruppe: string;
  stufe: string;
  wochenstunden: number;
  leistungszulage_pct: number;
  sonstige_zulage_pct: number;
  tzug_b_pct: number;
  urlaubsgeld_pct: number;
  transformationsgeld_pct: number;
  include_transformationsgeld: boolean;
  tzug_a_pct: number;
  weihnachtsgeld_pct_base: number;
  weihnachtsgeld_pct_max: number;
  betriebszugehoerigkeit_monate: number;
}

export const defaultTarifInput: TarifInputUI = {
  entgeltgruppe: 'EG 1',
  stufe: 'Grundentgelt',
  wochenstunden: 35,
  leistungszulage_pct: 0,
  sonstige_zulage_pct: 0,
  tzug_b_pct: 18.5,
  urlaubsgeld_pct: 72,
  transformationsgeld_pct: 18.4,
  include_transformationsgeld: true,
  tzug_a_pct: 27.5,
  weihnachtsgeld_pct_base: 25,
  weihnachtsgeld_pct_max: 55,
  betriebszugehoerigkeit_monate: 0
};

/* ------------------------------------------------------------------- */
const ERA_GROUPS: Record<string, string[]> = {
  EG1: ['Grundentgelt'],
  EG2: ['Grundentgelt'],
  EG3: ['Grundentgelt'],
  EG4: ['Grundentgelt'],
  EG5: ['Grundentgelt'],
  EG6: ['Grundentgelt'],
  EG7: ['Grundentgelt'],
  EG8: ['Grundentgelt'],
  EG9: ['Grundentgelt'],
  EG10: ['Grundentgelt'],
  EG11: ['Grundentgelt'],
  EG12: ['bis 36. Monat', 'nach 36. Monat'],
  EG13: ['bis 18. Monat', 'nach 18. Monat', 'nach 36. Monat'],
  EG14: ['bis 12. Monat', 'nach 12. Monat', 'nach 24. Monat', 'nach 36. Monat']
};

/* result type from API */
interface TarifResult {
  [k: string]: number;
}

interface Props {
  value: TarifInputUI;
  onChange: (v: TarifInputUI) => void;
}

const TarifSettings: React.FC<Props> = ({ value, onChange }) => {
  const stufen = ERA_GROUPS[value.entgeltgruppe.replace(' ', '')] ?? [
    'Grundentgelt'
  ];

  const set = <K extends keyof TarifInputUI>(k: K, v: TarifInputUI[K]) =>
    onChange({ ...value, [k]: v });

  const [result, setResult] = React.useState<TarifResult | null>(null);

  const num = (
    label: string,
    key: keyof TarifInputUI,
    step = 0.1,
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

  const calc = () =>
    fetch('/api/tarif/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value)
    })
      .then(r => r.json())
      .then(setResult);

  /* persist every change (App persists too, this is redundancy-safe) */
  useEffect(() => {
    saveSettings('tarif', value);
  }, [value]);

  return (
    <Stack spacing={4}>
      <SimpleGrid columns={[1, 2]} gap={4}>
        <FormControl>
          <FormLabel>Entgeltgruppe</FormLabel>
          <Select
            value={value.entgeltgruppe}
            onChange={e => set('entgeltgruppe', e.target.value)}
          >
            {Object.keys(ERA_GROUPS).map(g => (
              <option key={g}>{g.replace('EG', 'EG ')}</option>
            ))}
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>Stufe</FormLabel>
          <Select
            value={value.stufe}
            onChange={e => set('stufe', e.target.value)}
          >
            {stufen.map(s => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </FormControl>

        {num('Wochenstunden', 'wochenstunden', 1, 10, 40)}
        {num('Leistungszulage %', 'leistungszulage_pct')}
        {num('Sonstige Zulage %', 'sonstige_zulage_pct')}
      </SimpleGrid>

      <Accordion allowToggle>
        <AccordionItem border="none">
          <AccordionButton
            py={2}
            _expanded={{ fontWeight: 'bold' }}
            _hover={{ bg: 'gray.50' }}
          >
            Sonderzahlungen &nbsp;
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={2}>
            <SimpleGrid columns={[1, 2]} gap={4}>
              {num('T-ZUG B %', 'tzug_b_pct')}
              {num('Urlaubsgeld %', 'urlaubsgeld_pct')}
              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Transformationsgeld aktiv</FormLabel>
                <Switch
                  isChecked={value.include_transformationsgeld}
                  onChange={e =>
                    set('include_transformationsgeld', e.target.checked)
                  }
                />
              </FormControl>
              {num('Transformationsgeld %', 'transformationsgeld_pct')}
              {num('T-ZUG A %', 'tzug_a_pct')}
              {num('Weihnachtsgeld Basis %', 'weihnachtsgeld_pct_base')}
              {num('Weihnachtsgeld Max %', 'weihnachtsgeld_pct_max')}
              {num(
                'Betriebszugehörigkeit (Monate)',
                'betriebszugehoerigkeit_monate',
                1,
                0,
                480
              )}
            </SimpleGrid>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>

      <Button w="fit-content" onClick={calc}>
        Calculate
      </Button>

      {result && (
        <SimpleGrid columns={[1, 2]} gap={4}>
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
      )}
    </Stack>
  );
};

export default TarifSettings;

