import { Box, Container, Heading, Tabs, TabList, TabPanels, Tab, TabPanel, useColorMode, Button } from '@chakra-ui/react';
import React from 'react';
import PayrollSettings from './components/PayrollSettings';
import TarifSettings from './components/TarifSettings';
import FinanceTable from './components/FinanceTable';

const App = () => {
  const { toggleColorMode } = useColorMode();
  return (
    <Container maxW="container.xl" py={4}>
      <Box textAlign="right" mb={4}>
        <Button size="sm" onClick={toggleColorMode}>Toggle Theme</Button>
      </Box>
      <Heading mb={4}>Finance Suite</Heading>
      <Tabs variant="enclosed" isFitted>
        <TabList>
          <Tab>Payroll</Tab>
          <Tab>Tarif</Tab>
          <Tab>Table</Tab>
        </TabList>
        <TabPanels>
          <TabPanel><PayrollSettings /></TabPanel>
          <TabPanel><TarifSettings /></TabPanel>
          <TabPanel><FinanceTable /></TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  );
};

export default App;
