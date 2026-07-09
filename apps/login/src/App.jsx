/**
 * apps/login/src/App.jsx
 *
 * MF-exposed root component: './App': './src/App.jsx'
 * Mirrors the DTIAS pattern where each app exposes ./App for direct
 * component-level consumption by the shell or other MFEs.
 *
 * React.lazy() creates a webpack split-point so LoginPage and its
 * dependencies (Chakra form components, validation logic) are loaded
 * in a separate async chunk — not bundled into the remote entry itself.
 * This is the key lazy-loading mechanism for large MFE page components.
 */
import React, { Suspense } from 'react'
import { ChakraProvider, Center, Spinner, extendTheme } from '@chakra-ui/react'

// ── Lazy-load the heavy page component ───────────────────────────────────────
// webpack creates a separate chunk for LoginPage.jsx and all its imports.
// The chunk is only fetched when the Login MFE is first activated by single-spa.
const LoginPage = React.lazy(() => import('./LoginPage.jsx'))

const theme = extendTheme({
  styles: { global: { 'html, body': { bg: 'gray.50', color: 'gray.800' } } },
  components: {
    Button: {
      baseStyle: {
        _focusVisible: {
          boxShadow: '0 0 0 3px var(--chakra-colors-blue-300)',
          outline: '2px solid transparent',
        },
      },
    },
    Input: { defaultProps: { focusBorderColor: 'blue.500' } },
  },
})

function LazyFallback() {
  return (
    <Center minH="100vh" bg="gray.50" role="status" aria-label="Loading sign-in form">
      <Spinner size="lg" color="blue.500" thickness="3px" />
    </Center>
  )
}

export default function App() {
  return (
    <ChakraProvider theme={theme}>
      {/* Suspense catches the lazy import Promise and shows the fallback */}
      <Suspense fallback={<LazyFallback />}>
        <LoginPage />
      </Suspense>
    </ChakraProvider>
  )
}
