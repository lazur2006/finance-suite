import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import App from './App';

/**
 * NOTE
 * ----
 * `react-beautiful-dnd` is **not compatible with React 18 when
 * <React.StrictMode> is enabled** (it mounts twice and the drag-and-drop
 * sensors detach).  Removing StrictMode restores full drag capability.
 */
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <ChakraProvider>
    <ColorModeScript initialColorMode="system" />
    <App />
  </ChakraProvider>
);
