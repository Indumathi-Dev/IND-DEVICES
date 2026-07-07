import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, AlertDescription, AlertIcon, Box, Button,
  Center, FormControl, FormErrorMessage, FormHelperText,
  FormLabel, Heading, Input, InputGroup, InputRightElement,
  Text, VStack, HStack, Badge, useId,
} from '@chakra-ui/react';
import { login, navigateTo, useWcagAudit, WcagAuditPanel } from '@ind-devices/shared';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState({ username: false, password: false });

  // WCAG 2.2 AI Audit
  const { containerRef, runAudit, result, isAuditing } = useWcagAudit('Login');

  // Focus the heading on mount — WCAG 2.4.3 Focus Order
  const headingRef = useRef(null);
  useEffect(() => { headingRef.current?.focus(); }, []);

  // WCAG unique IDs for aria-describedby wiring
  const errorId = useId();
  const userHelpId = useId();
  const pwHelpId = useId();

  const usernameError = touched.username && !username.trim() ? 'Username is required.' : '';
  const passwordError = touched.password && !password ? 'Password is required.' : '';
  const hasErrors = Boolean(usernameError || passwordError);

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({ username: true, password: true });
    if (hasErrors || !username || !password) return;
    setServerError('');
    setIsSubmitting(true);
    try {
      await login(username, password);
      navigateTo('/dashboard');
    } catch (err) {
      setServerError(err.message || 'Sign-in failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Box
      ref={containerRef}
      minH="100vh"
      bg="gray.50"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={4}
    >
      {/* WCAG 2.4.1 – in-page skip anchor */}
      <Box
        as="a"
        href="#login-form"
        position="absolute"
        top="-100%"
        left={2}
        bg="blue.600"
        color="white"
        px={4}
        py={2}
        borderRadius="md"
        fontWeight="semibold"
        fontSize="sm"
        zIndex={9999}
        _focus={{ top: 2 }}
      >
        Skip to login form
      </Box>

      <Box
        bg="white"
        borderRadius="xl"
        boxShadow="lg"
        p={{ base: 6, md: 10 }}
        w="full"
        maxW="420px"
        border="1px solid"
        borderColor="gray.200"
      >
        {/* Brand */}
        <VStack spacing={1} mb={8} align="start">
          <HStack>
            <Center
              w="36px" h="36px"
              bg="blue.600"
              borderRadius="lg"
              aria-hidden="true"
            >
              <Text color="white" fontWeight="800" fontSize="sm">ID</Text>
            </Center>
            <Text fontWeight="700" fontSize="lg" color="gray.800">IND-DEVICES</Text>
          </HStack>
          {/* WCAG 2.4.6 – descriptive heading; tabIndex=-1 for focus on mount */}
          <Heading
            ref={headingRef}
            as="h1"
            size="lg"
            color="gray.800"
            tabIndex={-1}
            _focus={{ outline: 'none' }}
            mt={2}
          >
            Sign in
          </Heading>
          <Text fontSize="sm" color="gray.500">
            Enter your credentials to access the NOC console.
          </Text>
        </VStack>

        {/* WCAG 1.4.1 – connectivity indicator uses text + colour */}
        <HStack
          mb={6}
          p={2}
          bg="green.50"
          borderRadius="md"
          border="1px solid"
          borderColor="green.200"
          role="status"
          aria-label="System status: connected"
        >
          <Box w="8px" h="8px" borderRadius="full" bg="green.400" aria-hidden="true" />
          <Text fontSize="xs" color="green.700" fontWeight="500">
            Connected to mock identity service
          </Text>
        </HStack>

        {/* WCAG 3.3.1 – server error described in text, not colour alone */}
        {serverError && (
          <Alert
            status="error"
            mb={4}
            borderRadius="md"
            id={errorId}
            role="alert"
            aria-live="assertive"
          >
            <AlertIcon />
            <AlertDescription fontSize="sm">{serverError}</AlertDescription>
          </Alert>
        )}

        <Box
          as="form"
          id="login-form"
          onSubmit={handleSubmit}
          noValidate
          aria-label="Sign-in form"
        >
          <VStack spacing={5}>
            {/* Username — WCAG 1.3.5 autocomplete, 2.5.3 label in name */}
            <FormControl isRequired isInvalid={Boolean(usernameError)}>
              <FormLabel htmlFor="username" fontSize="sm" fontWeight="600" color="gray.700">
                Username
              </FormLabel>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => setTouched(t => ({ ...t, username: true }))}
                placeholder="admin"
                aria-required="true"
                aria-describedby={`${userHelpId}${usernameError ? '' : ''}`}
                aria-invalid={Boolean(usernameError)}
                size="md"
                focusBorderColor="blue.500"
                borderColor="gray.300"
                /* WCAG 2.5.8 – min target 24px; Chakra Input is 40px */
              />
              <FormHelperText id={userHelpId} fontSize="xs" color="gray.500">
                Mock credential: <Box as="code" fontFamily="mono">admin</Box>
              </FormHelperText>
              {/* WCAG 3.3.1 – error described in text */}
              <FormErrorMessage fontSize="xs" role="alert">{usernameError}</FormErrorMessage>
            </FormControl>

            {/* Password — WCAG 3.3.8 Accessible Authentication (show/hide control) */}
            <FormControl isRequired isInvalid={Boolean(passwordError)}>
              <FormLabel htmlFor="password" fontSize="sm" fontWeight="600" color="gray.700">
                Password
              </FormLabel>
              <InputGroup>
                <Input
                  id="password"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, password: true }))}
                  placeholder="Enter your password"
                  aria-required="true"
                  aria-describedby={pwHelpId}
                  aria-invalid={Boolean(passwordError)}
                  focusBorderColor="blue.500"
                  borderColor="gray.300"
                />
                {/* WCAG 3.3.8 – toggle to remove cognitive barrier of hidden chars */}
                <InputRightElement>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setShowPw(v => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    aria-pressed={showPw}
                    color="gray.500"
                    mr={1}
                    minW="24px"
                    minH="24px"
                    _focusVisible={{ boxShadow: '0 0 0 3px var(--chakra-colors-blue-300)' }}
                  >
                    {showPw ? '🙈' : '👁'}
                  </Button>
                </InputRightElement>
              </InputGroup>
              <FormHelperText id={pwHelpId} fontSize="xs" color="gray.500">
                Mock credential: <Box as="code" fontFamily="mono">admin@123!</Box>
              </FormHelperText>
              <FormErrorMessage fontSize="xs" role="alert">{passwordError}</FormErrorMessage>
            </FormControl>

            {/* WCAG 2.5.8 – button min 24px (Chakra Button size="lg" = 48px) */}
            <Button
              type="submit"
              colorScheme="blue"
              size="lg"
              width="full"
              isLoading={isSubmitting}
              loadingText="Signing in…"
              aria-label="Sign in to IND-DEVICES"
              _focusVisible={{ boxShadow: '0 0 0 3px var(--chakra-colors-blue-300)' }}
              mt={2}
            >
              Sign in
            </Button>
          </VStack>
        </Box>

        {/* WCAG 2.2 level badges */}
        <HStack mt={6} justify="center" flexWrap="wrap" gap={1}>
          <Badge colorScheme="green" fontSize="9px">WCAG 2.2</Badge>
          <Badge colorScheme="blue" fontSize="9px">Level AA</Badge>
          <Badge colorScheme="purple" fontSize="9px">Chakra UI</Badge>
        </HStack>
      </Box>

      {/* AI WCAG Audit Panel — available on every screen */}
      <WcagAuditPanel
        componentName="Login"
        runAudit={runAudit}
        result={result}
        isAuditing={isAuditing}
      />
    </Box>
  );
}
