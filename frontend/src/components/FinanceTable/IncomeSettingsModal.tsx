import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
} from '@chakra-ui/react';
import { FC, useState } from 'react';

/* ⬇️  one-level-up import paths */
import TarifSettings, {
  TarifInputUI as TarifInput,
} from '../TarifSettings';
import PayrollSettings, {
  PayrollInputUI as PayrollInput,
} from '../PayrollSettings';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  incomeRowIdx: number;
  tarifInput: TarifInput;
  payrollInput: PayrollInput;
  applyIncome: (
    nets: number[],
    incomeRowIdx: number,
    year: number,
  ) => Promise<void>;
}

const IncomeSettingsModal: FC<Props> = ({
  isOpen,
  onClose,
  year,
  incomeRowIdx,
  tarifInput,
  payrollInput,
  applyIncome,
}) => {
  const [incomeTarif, setIncomeTarif] = useState<TarifInput>(tarifInput);
  const [incomePayroll, setIncomePayroll] =
    useState<PayrollInput>(payrollInput);
  const [saving, setSaving] = useState(false);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="80vh" overflow="hidden">
        <ModalHeader>Income Settings</ModalHeader>
        <ModalCloseButton />
        <ModalBody overflow="auto" pb={4}>
          <TarifSettings value={incomeTarif} onChange={setIncomeTarif} />
          <PayrollSettings value={incomePayroll} onChange={setIncomePayroll} />
          <Button
            mt={4}
            colorScheme="blue"
            isDisabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                /* 1️⃣  month-by-month gross breakdown ---------- */
                const breakdown: { Monat: string; Brutto: number }[] =
                  await fetch('/api/tarif/breakdown', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(incomeTarif),
                  }).then((r) => r.json());

                const monthIdx: Record<string, number> = {
                  Januar: 0,
                  Februar: 1,
                  März: 2,
                  April: 3,
                  Mai: 4,
                  Juni: 5,
                  Juli: 6,
                  August: 7,
                  September: 8,
                  Oktober: 9,
                  November: 10,
                  Dezember: 11,
                };

                /* 2️⃣  gross ➜ net for each month -------------- */
                const nets: number[] = Array(12).fill(0);
                await Promise.all(
                  breakdown.map(async (rec) => {
                    const { net } = await fetch(
                      '/api/payroll/gross-to-net',
                      {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          ...incomePayroll,
                          gross: rec.Brutto,
                        }),
                      },
                    ).then((r) => r.json());
                    nets[monthIdx[rec.Monat]] = net;
                  }),
                );

                /* 3️⃣  persist + update table ------------------- */
                await applyIncome(nets, incomeRowIdx, year);
                onClose();
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving && <Spinner size="xs" mr={2} />}Apply
          </Button>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default IncomeSettingsModal;
