import React from 'react';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import LoginPage from './LoginPage';

const theme = extendTheme({
  styles: { global: { 'html, body': { bg: 'gray.50', color: 'gray.800' } } },
  components: {
    Button: {
      baseStyle: {
        _focus: { boxShadow: '0 0 0 3px var(--chakra-colors-blue-300)' },
        _focusVisible: { boxShadow: '0 0 0 3px var(--chakra-colors-blue-300)' },
      },
    },
    Input: {
      defaultProps: { focusBorderColor: 'blue.500' },
    },
  },
});

export default function Root() {
  return (
    <ChakraProvider theme={theme}>
      <LoginPage />
    </ChakraProvider>
  );
}
