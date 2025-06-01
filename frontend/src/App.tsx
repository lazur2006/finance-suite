import { Box, Container, Heading, Tabs, TabList, TabPanels, Tab, TabPanel, useColorMode, Button } from '@chakra-ui/react';
import React, { useState } from 'react';
import PayrollSettings from './components/PayrollSettings';
import TarifSettings from './components/TarifSettings';
import FinanceTable from './components/FinanceTable';

const App = () => {
  const { toggleColorMode } = useColorMode();
  const [showSettings, setShowSettings] = useState(true);
  const [gross, setGross] = useState(4000);
  const [entgeltgruppe, setEntgeltgruppe] = useState('EG 1');
  const [stufe, setStufe] = useState('Grundentgelt');

  return (
    <Container maxW="container.xl" py={4}>
      <Box textAlign="right" mb={4}>
        <Button size="sm" onClick={toggleColorMode}>Toggle Theme</Button>
      </Box>
      <Heading mb={4}>Finance Suite</Heading>
      <Button size="sm" mb={2} onClick={() => setShowSettings(!showSettings)}>
        {showSettings ? 'Hide Settings' : 'Show Settings'}
      </Button>
      {showSettings && (
        <Tabs variant="enclosed" mb={4} isFitted>
          <TabList>
            <Tab>IGMetall ERA</Tab>
            <Tab>Net Salary</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <TarifSettings entgeltgruppe={entgeltgruppe} setEntgeltgruppe={setEntgeltgruppe} stufe={stufe} setStufe={setStufe} />
            </TabPanel>
            <TabPanel>
              <PayrollSettings gross={gross} setGross={setGross} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      )}
      <FinanceTable entgeltgruppe={entgeltgruppe} stufe={stufe} />
    </Container>
  );
};

export default App;
