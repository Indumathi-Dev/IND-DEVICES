import React, { useEffect, useState } from 'react';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { isAuthenticated, navigateTo } from '@ind-devices/shared';
import AppShell from '@ind-devices/shared/components/AppShell';
import DashboardPage from './DashboardPage';

const theme = extendTheme({
  components: {
    Button: {
      baseStyle: {
        _focusVisible: { boxShadow: '0 0 0 3px var(--chakra-colors-blue-300)', outline: '2px solid transparent' },
      },
    },
  },
});

export default function Root() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!isAuthenticated()) { navigateTo('/login'); return; }
    setReady(true);
  }, []);
  if (!ready) return null;
  return (
    <ChakraProvider theme={theme}>
      <AppShell activeKey="dashboard">
        <DashboardPage />
      </AppShell>
    </ChakraProvider>
  );
}
