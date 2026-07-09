/**
 * apps/dashboard/src/App.jsx
 *
 * MF-exposed root component: './App': './src/App.jsx'
 *
 * Lazy-loading chain:
 *   1. root-config does `import('dashboard/bootstrap')` → MF loads the remote entry
 *   2. bootstrap exports single-spa lifecycles backed by THIS component
 *   3. THIS component uses React.lazy(() => import('./DashboardPage')) → second split-point
 *      DashboardPage + Highcharts (heavy) are in a separate async chunk
 *
 * AppShell (Header + LeftNav) is NOT lazy because it renders synchronously
 * with the layout — only the chart-heavy content area is deferred.
 */
import React, { Suspense, useEffect, useState } from 'react'
import { ChakraProvider, Center, Spinner, extendTheme } from '@chakra-ui/react'
import { isAuthenticated, navigateTo } from '@ind-devices/shared'
import AppShell from '@ind-devices/shared/components/AppShell'

// ── Lazy-load the Highcharts-heavy content area ───────────────────────────────
const DashboardPage = React.lazy(() => import('./DashboardPage.jsx'))

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

function ChartFallback() {
  return (
    <Center py={16} role="status" aria-label="Loading dashboard charts">
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
      <AppShell activeKey="dashboard">
        <Suspense fallback={<ChartFallback />}>
          <DashboardPage />
        </Suspense>
      </AppShell>
    </ChakraProvider>
  )
}
