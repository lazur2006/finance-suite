import {
  Box,
  Heading,
  IconButton,
  Tabs,
  useColorMode,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { FaCog, FaMoneyBill, FaSun } from 'react-icons/fa';
import PayrollSettings from './components/PayrollSettings';
import TarifSettings from './components/TarifSettings';
import FinanceTable from './components/FinanceTable';

const App = () => {
  const { toggleColorMode } = useColorMode();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [gross, setGross] = useState(4000);
  const [entgeltgruppe, setEntgeltgruppe] = useState('EG 1');
  const [stufe, setStufe] = useState('Grundentgelt');

  return (
    <Box width="100vw" minH="100vh">
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        px={4}
        py={2}
        bg="bg.subtle"
      >
        <Heading size="md">Finance Suite</Heading>
        <Tabs.Root
          value={activeTab ?? undefined}
          onValueChange={(v) => setActiveTab(v)}
        >
          <Tabs.List>
            <Tabs.Trigger value="tarif">
              <FaCog />
            </Tabs.Trigger>
            <Tabs.Trigger value="payroll">
              <FaMoneyBill />
            </Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>
          <Tabs.Content value="tarif">
            <TarifSettings
              entgeltgruppe={entgeltgruppe}
              setEntgeltgruppe={setEntgeltgruppe}
              stufe={stufe}
              setStufe={setStufe}
            />
          </Tabs.Content>
          <Tabs.Content value="payroll">
            <PayrollSettings gross={gross} setGross={setGross} />
          </Tabs.Content>
        </Tabs.Root>
        <IconButton
          aria-label="Toggle theme"
          size="sm"
          onClick={toggleColorMode}
          icon={<FaSun />}
        />
      </Box>
      <Box px={4} py={4} width="full">
        <FinanceTable entgeltgruppe={entgeltgruppe} stufe={stufe} />
      </Box>
    </Box>
  );
};

export default App;
