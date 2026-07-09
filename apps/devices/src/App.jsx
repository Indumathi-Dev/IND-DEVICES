/**
 * apps/devices/src/App.jsx
 *
 * MF-exposed root component: './App': './src/App.jsx'
 *
 * Lazy-loading chain (three levels):
 *   1. root-config: import('devices/bootstrap') — MF fetches devices_remote_entry.js
 *   2. App.jsx:     React.lazy(DevicesPage)     — Chakra Table + page logic deferred
 *   3. DevicesPage: React.lazy(DeviceModal)     — Modal code only fetched when opened
 *
 * This mirrors the DTIAS pattern for the inventory MFE where FirmwareUpgradeView
 * and DriftTemplateModal are separately exposed components loaded on demand.
 */
import React, { Suspense, useEffect, useState } from 'react'
import { ChakraProvider, Center, Spinner, extendTheme } from '@chakra-ui/react'
import { isAuthenticated, navigateTo } from '@ind-devices/shared'
import AppShell from '@ind-devices/shared/components/AppShell'

// ── Lazy-load the paginated CRUD table ───────────────────────────────────────
const DevicesPage = React.lazy(() => import('./DevicesPage.jsx'))

const theme = extendTheme({
  components: {
    Button: {
      baseStyle: {
        _focusVisible: {
          boxShadow: '0 0 0 3px var(--chakra-colors-blue-300)',
          outline: '2px solid transparent',
        },
      },
    },
  },
})

function TableFallback() {
  return (
    <Center py={16} role="status" aria-label="Loading devices">
      <Spinner size="xl" color="blue.500" thickness="3px" />
    </Center>
  )
}

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isAuthenticated()) { navigateTo('/login'); return }
    setReady(true)
  }, [])

  if (!ready) return null

  return (
    <ChakraProvider theme={theme}>
      <AppShell activeKey="devices">
        <Suspense fallback={<TableFallback />}>
          <DevicesPage />
        </Suspense>
      </AppShell>
    </ChakraProvider>
  )
}
