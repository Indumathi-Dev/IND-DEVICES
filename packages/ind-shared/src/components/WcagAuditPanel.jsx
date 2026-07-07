import React, { useEffect, useState } from 'react';
import {
  Box, Button, Drawer, DrawerBody, DrawerCloseButton, DrawerContent,
  DrawerFooter, DrawerHeader, DrawerOverlay, Flex, HStack, Icon,
  IconButton, Tag, Text, Tooltip, VStack, Accordion, AccordionItem,
  AccordionButton, AccordionPanel, AccordionIcon, Badge, Circle,
  useDisclosure, Divider, Spinner, Alert, AlertIcon, AlertDescription,
} from '@chakra-ui/react';

const SEVERITY_MAP = {
  critical: { color: 'red',    bg: 'red.50',    border: 'red.300',    label: 'Critical' },
  serious:  { color: 'orange', bg: 'orange.50', border: 'orange.300', label: 'Serious'  },
  moderate: { color: 'yellow', bg: 'yellow.50', border: 'yellow.300', label: 'Moderate' },
  minor:    { color: 'blue',   bg: 'blue.50',   border: 'blue.300',   label: 'Minor'    },
};

const PRINCIPLE_COLORS = {
  Perceivable:    'purple',
  Operable:       'blue',
  Understandable: 'teal',
  Robust:         'green',
};

function ScoreRing({ score }) {
  if (score === null) return null;
  const color = score >= 90 ? '#38A169' : score >= 70 ? '#D69E2E' : '#E53E3E';
  const r = 30, circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  return (
    <Box position="relative" w="80px" h="80px" aria-label={`Accessibility score: ${score} out of 100`} role="img">
      <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#E2E8F0" strokeWidth="8" />
        <circle
          cx="40" cy="40" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
        />
      </svg>
      <Flex position="absolute" inset="0" align="center" justify="center" direction="column">
        <Text fontWeight="700" fontSize="lg" lineHeight="1" color={color}>{score}</Text>
        <Text fontSize="9px" color="gray.500" textTransform="uppercase" letterSpacing="wider">Score</Text>
      </Flex>
    </Box>
  );
}

function IssueCard({ issue }) {
  const sev = SEVERITY_MAP[issue.severity] || SEVERITY_MAP.minor;
  const prinColor = PRINCIPLE_COLORS[issue.wcag?.principle] || 'gray';
  return (
    <AccordionItem
      border="1px solid"
      borderColor={sev.border}
      borderRadius="md"
      mb={2}
      overflow="hidden"
      bg={sev.bg}
    >
      <AccordionButton
        px={3} py={2}
        _hover={{ bg: 'whiteAlpha.700' }}
        aria-label={`WCAG ${issue.criterion}: ${issue.wcag?.title || 'Issue'} — ${issue.severity}`}
      >
        <HStack flex="1" textAlign="left" spacing={2} flexWrap="wrap">
          <Badge colorScheme={sev.color} fontSize="10px" flexShrink={0}>{sev.label}</Badge>
          <Text fontWeight="600" fontSize="xs" color="gray.700">
            {issue.criterion} {issue.wcag?.title || ''}
          </Text>
          {issue.wcag?.level && (
            <Tag size="sm" colorScheme={prinColor} fontSize="10px" flexShrink={0}>
              Level {issue.wcag.level}
            </Tag>
          )}
        </HStack>
        <AccordionIcon color="gray.500" ml={1} />
      </AccordionButton>
      <AccordionPanel px={3} pb={3} bg="white" borderTop="1px solid" borderColor={sev.border}>
        <VStack align="start" spacing={2}>
          <Box>
            <Text fontSize="11px" fontWeight="700" color="gray.500" textTransform="uppercase" mb="2px">
              Element
            </Text>
            <Badge variant="outline" colorScheme="gray" fontSize="11px" fontFamily="mono">
              {issue.element}
            </Badge>
          </Box>
          <Box>
            <Text fontSize="11px" fontWeight="700" color="gray.500" textTransform="uppercase" mb="2px">
              Issue
            </Text>
            <Text fontSize="12px" color="gray.700" lineHeight="1.5">{issue.description}</Text>
          </Box>
          <Box>
            <Text fontSize="11px" fontWeight="700" color="teal.600" textTransform="uppercase" mb="2px">
              ✦ Fix
            </Text>
            <Text fontSize="12px" color="gray.700" lineHeight="1.5">{issue.fix}</Text>
          </Box>
          {issue.wcag?.principle && (
            <Tag size="sm" colorScheme={prinColor} variant="subtle" fontSize="10px">
              {issue.wcag.principle}
            </Tag>
          )}
        </VStack>
      </AccordionPanel>
    </AccordionItem>
  );
}

/**
 * WcagAuditPanel
 *
 * A fully keyboard-accessible floating button that opens a Chakra Drawer
 * with the live AI WCAG 2.2 audit results for the current component.
 *
 * Props:
 *   componentName — string  e.g. "Dashboard", "Devices", "Login"
 *   runAudit      — () => Promise<void>  (from useWcagAudit)
 *   result        — audit result object | null
 *   isAuditing    — boolean
 */
export default function WcagAuditPanel({ componentName, runAudit, result, isAuditing }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [hasRun, setHasRun] = useState(false);

  // Auto-run once when the panel is first opened
  useEffect(() => {
    if (isOpen && !hasRun) {
      setHasRun(true);
      runAudit();
    }
  }, [isOpen, hasRun, runAudit]);

  const issueCount = result?.issues?.length ?? 0;
  const criticalCount = result?.issues?.filter(i => ['critical','serious'].includes(i.severity)).length ?? 0;

  return (
    <>
      {/* Floating trigger button — fixed bottom-right, always accessible via Tab */}
      <Tooltip label="Open WCAG 2.2 AI Accessibility Audit" placement="left" hasArrow>
        <Box
          position="fixed"
          bottom="24px"
          right="24px"
          zIndex={1000}
        >
          <Button
            onClick={onOpen}
            colorScheme={criticalCount > 0 ? 'red' : result?.score >= 90 ? 'green' : 'blue'}
            size="md"
            borderRadius="full"
            boxShadow="lg"
            leftIcon={
              <Text fontSize="16px" aria-hidden="true">♿</Text>
            }
            aria-label={`WCAG 2.2 Audit${issueCount > 0 ? ` — ${issueCount} issue${issueCount !== 1 ? 's' : ''} found` : ''}`}
            _focus={{ boxShadow: '0 0 0 3px var(--chakra-colors-blue-300)' }}
          >
            {issueCount > 0 ? `${issueCount} Issue${issueCount !== 1 ? 's' : ''}` : 'A11y Audit'}
          </Button>
        </Box>
      </Tooltip>

      <Drawer
        isOpen={isOpen}
        placement="right"
        onClose={onClose}
        size="md"
        aria-label={`WCAG 2.2 Accessibility Audit for ${componentName}`}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton
            aria-label="Close accessibility audit panel"
            _focus={{ boxShadow: '0 0 0 3px var(--chakra-colors-blue-300)' }}
          />
          <DrawerHeader borderBottomWidth="1px">
            <VStack align="start" spacing={1}>
              <HStack>
                <Text fontSize="16px" aria-hidden="true">♿</Text>
                <Text fontWeight="700">WCAG 2.2 AI Audit</Text>
              </HStack>
              <Text fontSize="xs" color="gray.500" fontWeight="400">
                Component: <strong>{componentName}</strong>
              </Text>
            </VStack>
          </DrawerHeader>

          <DrawerBody py={4} px={4}>
            {/* Score + summary bar */}
            {result && !isAuditing && (
              <Flex
                align="center"
                gap={4}
                p={3}
                mb={4}
                bg="gray.50"
                borderRadius="lg"
                border="1px solid"
                borderColor="gray.200"
              >
                <ScoreRing score={result.score} />
                <Box flex="1">
                  <HStack mb={1} flexWrap="wrap" spacing={2}>
                    {criticalCount > 0 && (
                      <Badge colorScheme="red" fontSize="10px">{criticalCount} Critical/Serious</Badge>
                    )}
                    <Badge colorScheme="gray" fontSize="10px">
                      {result.source === 'ai' ? '🤖 AI Analysis' : result.source === 'static' ? '⚙ Static Analysis' : '⚠ Fallback'}
                    </Badge>
                  </HStack>
                  <Text fontSize="11.5px" color="gray.600" lineHeight="1.5">{result.summary}</Text>
                </Box>
              </Flex>
            )}

            {isAuditing && (
              <VStack py={8} spacing={3} role="status" aria-live="polite" aria-label="Running WCAG audit">
                <Spinner size="lg" color="blue.500" thickness="3px" />
                <Text fontSize="13px" color="gray.500">Running WCAG 2.2 analysis…</Text>
              </VStack>
            )}

            {!isAuditing && result?.source === 'offline' && (
              <Alert status="warning" borderRadius="md" mb={4}>
                <AlertIcon />
                <AlertDescription fontSize="12px">{result.summary}</AlertDescription>
              </Alert>
            )}

            {!isAuditing && result && result.issues.length === 0 && (
              <Alert status="success" borderRadius="md">
                <AlertIcon />
                <AlertDescription fontSize="12px">
                  No WCAG 2.2 issues detected. Component appears fully compliant!
                </AlertDescription>
              </Alert>
            )}

            {!isAuditing && result && result.issues.length > 0 && (
              <Box aria-label={`${result.issues.length} accessibility issues found`} role="region">
                <Accordion allowMultiple>
                  {result.issues.map((issue, idx) => (
                    <IssueCard key={`${issue.criterion}-${idx}`} issue={issue} />
                  ))}
                </Accordion>
              </Box>
            )}
          </DrawerBody>

          <DrawerFooter borderTopWidth="1px" gap={2}>
            <Button
              size="sm"
              colorScheme="blue"
              onClick={() => { setHasRun(false); runAudit(); }}
              isLoading={isAuditing}
              loadingText="Auditing…"
              aria-label="Re-run WCAG 2.2 accessibility audit"
              _focus={{ boxShadow: '0 0 0 3px var(--chakra-colors-blue-300)' }}
            >
              Re-run Audit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              aria-label="Close audit panel"
              _focus={{ boxShadow: '0 0 0 3px var(--chakra-colors-blue-300)' }}
            >
              Close
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
