
import React, { useEffect, useState } from 'react';
import {
  Box,
  Flex,
  IconButton,
  useColorMode,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Heading,
  VStack
} from '@chakra-ui/react';
import { SunIcon, MoonIcon } from '@chakra-ui/icons';
import {
  FiInfo,
  FiSettings,
  FiRotateCcw,
  FiRotateCw
} from 'react-icons/fi';

import PayrollSettings, {
  PayrollInputUI,
  defaultPayrollInput
} from './components/PayrollSettings';
import TarifSettings, {
  defaultTarifInput,
  TarifInputUI
} from './components/TarifSettings';
import FinanceTable, { FinanceTableHandle } from './components/FinanceTable';
import { loadSettings, saveSettings } from './api';

/* ──────────────────────────────────────────────────────────────────── */
/*  App-level state                                                    */
/* ──────────────────────────────────────────────────────────────────── */
const App: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const settingsDlg = useDisclosure();

  const [year, setYear] = useState<number>(new Date().getFullYear());

  const [tarifInput, setTarifInput] = useState<TarifInputUI>(
    defaultTarifInput
  );
  const [payrollInput, setPayrollInput] = useState<PayrollInputUI>(
    defaultPayrollInput
  );

  /* Load persisted defaults once */
  useEffect(() => {
    loadSettings<TarifInputUI>('tarif').then((s) =>
      setTarifInput({ ...defaultTarifInput, ...s })
    );
    loadSettings<PayrollInputUI>('payroll').then((s) =>
      setPayrollInput({ ...defaultPayrollInput, ...s })
    );
  }, []);

  /* Persist on every change */
  useEffect(() => {
    saveSettings('tarif', tarifInput);
  }, [tarifInput]);
  useEffect(() => {
    saveSettings('payroll', payrollInput);
  }, [payrollInput]);

  /* Expose undo/redo coming from FinanceTable */
  const tableRef = React.useRef<FinanceTableHandle>(null);

  return (
    <Box w="100vw" h="100vh" overflow="hidden">
      {/* ─── Header ─────────────────────────────────────── */}
      <Flex
        as="header"
        w="full"
        h="48px"
        align="center"
        px={2}
        gap={2}
        borderBottom="1px solid"
        borderColor="gray.200"
      >
        <Heading size="sm" flexGrow={1} pl={1}>
          Finance Suite
        </Heading>

        <IconButton
          aria-label="Undo"
          icon={<FiRotateCcw />}
          size="sm"
          variant="ghost"
          onClick={() => tableRef.current?.undo()}
        />
        <IconButton
          aria-label="Redo"
          icon={<FiRotateCw />}
          size="sm"
          variant="ghost"
          onClick={() => tableRef.current?.redo()}
        />

        <IconButton
          aria-label="Toggle colour mode"
          icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
          variant="ghost"
          size="sm"
          onClick={toggleColorMode}
        />
        <IconButton
          aria-label="About"
          icon={<FiInfo />}
          variant="ghost"
          size="sm"
          onClick={() =>
            window.alert('Demo build – IG Metall & German payroll toolkit')
          }
        />
        <IconButton
          aria-label="Settings"
          icon={<FiSettings />}
          variant="ghost"
          size="sm"
          onClick={settingsDlg.onOpen}
        />
      </Flex>

      {/* ─── Full-screen settings modal (non-scrolling) ── */}
      <Modal
        isOpen={settingsDlg.isOpen}
        onClose={settingsDlg.onClose}
        size="full"
        motionPreset="slideInBottom"
      >
        <ModalOverlay />
        <ModalContent maxH="100vh" overflow="hidden">
          <ModalHeader p={3}>Settings</ModalHeader>
          <ModalCloseButton />
          <ModalBody p={4} overflow="auto">
            <Tabs variant="soft-rounded" colorScheme="blue" isFitted>
              <TabList mb={4}>
                <Tab>IG Metall ERA</Tab>
                <Tab>Net Salary</Tab>
              </TabList>
              <TabPanels>
                <TabPanel px={0}>
                  <TarifSettings
                    value={tarifInput}
                    onChange={setTarifInput}
                  />
                </TabPanel>
                <TabPanel px={0}>
                  <PayrollSettings
                    value={payrollInput}
                    onChange={setPayrollInput}
                  />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* ─── Main view ──────────────────────────────────── */}
      <VStack
        spacing={4}
        align="stretch"
        w="full"
        h="calc(100vh - 48px)"
        p={4}
        overflow="hidden"
      >
        <FinanceTable
          ref={tableRef}
          year={year}
          onYearChange={setYear}
          tarifInput={tarifInput}
          payrollInput={payrollInput}
        />
      </VStack>
    </Box>
  );
};

export default App;

