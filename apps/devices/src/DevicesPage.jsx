import React, { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import {
  Alert, AlertDescription, AlertDialog, AlertDialogBody, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay, AlertIcon,
  Badge, Box, Button, Flex, Heading, HStack, IconButton, Input,
  InputGroup, InputLeftElement, Select, Spinner, Table, TableCaption,
  Tbody, Td, Text, Th, Thead, Tooltip, Tr, useToast, VStack,
} from '@chakra-ui/react';
import {
  getDevices, createDevice, updateDevice, deleteDevice,
  DEVICE_STATUS_OPTIONS, useWcagAudit, WcagAuditPanel,
} from '@ind-devices/shared';

/**
 * DeviceModal is lazy-loaded — the modal chunk (form fields, validation,
 * Chakra Modal) is only fetched the first time a user clicks Add/Edit.
 * This mirrors how DTIAS inventory exposes DriftTemplateModal and
 * FirmwareUpgradeView as separate MF-exposed modules loaded on demand.
 */
const DeviceModal = React.lazy(() => import('./DeviceModal'));

const PAGE_SIZES = [5, 10, 20];

function StatusBadge({ status }) {
  const map = { online: 'green', warning: 'yellow', offline: 'red' };
  return (
    <HStack spacing={2}>
      {/* WCAG 1.4.1 – status uses badge text + colour, never colour alone */}
      <Box
        w="7px" h="7px" borderRadius="full"
        bg={`${map[status] || 'gray'}.400`}
        aria-hidden="true"
        flexShrink={0}
      />
      <Badge colorScheme={map[status] || 'gray'} fontSize="10px">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    </HStack>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  );
}

export default function DevicesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [devices, setDevices] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalDevice, setModalDevice] = useState(undefined); // undefined=closed null=add obj=edit
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const cancelRef = useRef();
  const toast = useToast();
  const { containerRef, runAudit, result, isAuditing } = useWcagAudit('Devices');

  const load = useCallback(() => {
    setIsLoading(true);
    setError('');
    getDevices({ page, pageSize, search, status: statusFilter })
      .then(res => { setDevices(res.items); setTotal(res.total); })
      .catch(e => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function handleSave(formData) {
    setIsSaving(true);
    try {
      if (modalDevice) {
        await updateDevice(modalDevice.id, formData);
        // WCAG 4.1.3 – status message via assertive toast
        toast({ title: `${formData.name} updated.`, status: 'success', duration: 3000, isClosable: true, position: 'bottom-right' });
      } else {
        await createDevice(formData);
        toast({ title: `${formData.name} added.`, status: 'success', duration: 3000, isClosable: true, position: 'bottom-right' });
        setPage(1);
      }
      setModalDevice(undefined);
      load();
    } catch (e) {
      toast({ title: 'Save failed.', description: e.message, status: 'error', duration: 4000, isClosable: true, position: 'bottom-right' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteDevice(pendingDelete.id);
      toast({ title: `${pendingDelete.name} removed.`, status: 'info', duration: 3000, isClosable: true, position: 'bottom-right' });
      setPendingDelete(null);
      load();
    } catch (e) {
      toast({ title: 'Delete failed.', description: e.message, status: 'error', duration: 4000, isClosable: true });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Box ref={containerRef}>
      {/* WCAG 2.4.6 – page heading */}
      <Flex justify="space-between" align="flex-start" mb={6} flexWrap="wrap" gap={3}>
        <Box>
          <Heading as="h1" size="lg" color="gray.800" mb={1}>Devices</Heading>
          <Text color="gray.500" fontSize="sm">
            Manage registered RAN inventory — add, update or decommission devices.
          </Text>
          <HStack mt={1} spacing={2}>
            <Badge colorScheme="green" fontSize="9px">WCAG 2.2</Badge>
            <Badge colorScheme="blue" fontSize="9px">Level AA</Badge>
          </HStack>
        </Box>
        {/* WCAG 2.5.8 – min 32px button */}
        <Button
          colorScheme="blue"
          size="md"
          onClick={() => setModalDevice(null)}
          aria-label="Add a new device"
          minH="40px"
          _focusVisible={{ boxShadow: '0 0 0 3px var(--chakra-colors-blue-300)' }}
        >
          + Add device
        </Button>
      </Flex>

      {/* Toolbar */}
      <Flex mb={4} gap={3} flexWrap="wrap">
        {/* WCAG 1.3.5 – search input with autocomplete + aria-label */}
        <InputGroup maxW="340px">
          <InputLeftElement pointerEvents="none" color="gray.400">
            <SearchIcon />
          </InputLeftElement>
          <Input
            id="device-search"
            type="search"
            placeholder="Search by name, ID, IP, type…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            aria-label="Search devices"
            autoComplete="off"
            focusBorderColor="blue.500"
            bg="white"
            fontSize="sm"
          />
        </InputGroup>

        <Select
          maxW="170px"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          aria-label="Filter by status"
          focusBorderColor="blue.500"
          bg="white"
          fontSize="sm"
        >
          <option value="all">All statuses</option>
          {DEVICE_STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </Select>
      </Flex>

      {error && (
        <Alert status="error" mb={4} borderRadius="md" role="alert">
          <AlertIcon /><AlertDescription fontSize="sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* Table — WCAG 1.3.1 semantic table with caption + scope */}
      <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" overflow="hidden">
        <Box overflowX="auto">
          <Table variant="simple" size="sm">
            {/* WCAG 1.3.1 – caption describes the table */}
            <TableCaption
              placement="top"
              textAlign="left"
              px={4}
              py={3}
              fontSize="xs"
              color="gray.500"
              fontWeight="600"
              textTransform="uppercase"
              letterSpacing="wider"
              borderBottom="1px solid"
              borderColor="gray.100"
              m={0}
            >
              {isLoading
                ? 'Loading devices…'
                : `${total} device${total !== 1 ? 's' : ''} — showing ${Math.min((page-1)*pageSize+1,total)}–${Math.min(page*pageSize,total)}`}
            </TableCaption>
            <Thead bg="gray.50">
              <Tr>
                {/* WCAG 1.3.1 – scope="col" on all header cells */}
                {['Device ID','Name','Type','IP Address','Region','Status','Firmware','Actions'].map(h => (
                  <Th
                    key={h}
                    scope="col"
                    fontSize="10px"
                    color="gray.500"
                    fontWeight="700"
                    letterSpacing="wider"
                    py={3}
                    borderColor="gray.200"
                  >
                    {h}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {isLoading && (
                <Tr>
                  <Td colSpan={8}>
                    {/* WCAG 4.1.3 – loading is a live status message */}
                    <Flex justify="center" py={8} role="status" aria-live="polite" aria-label="Loading devices">
                      <Spinner size="md" color="blue.500" mr={3} />
                      <Text color="gray.400" fontSize="sm">Loading…</Text>
                    </Flex>
                  </Td>
                </Tr>
              )}
              {!isLoading && devices.length === 0 && (
                <Tr>
                  <Td colSpan={8}>
                    <Text textAlign="center" color="gray.400" py={8} fontSize="sm">
                      No devices match the current filters.
                    </Text>
                  </Td>
                </Tr>
              )}
              {!isLoading && devices.map((d) => (
                <Tr key={d.id} _hover={{ bg: 'gray.50' }}>
                  <Td fontFamily="mono" fontSize="xs" color="gray.600">{d.id}</Td>
                  <Td fontWeight="500" fontSize="sm" color="gray.800">{d.name}</Td>
                  <Td fontSize="sm" color="gray.600">{d.type}</Td>
                  <Td fontFamily="mono" fontSize="xs" color="gray.600">{d.ipAddress}</Td>
                  <Td fontSize="sm" color="gray.600">{d.region}</Td>
                  <Td><StatusBadge status={d.status} /></Td>
                  <Td fontFamily="mono" fontSize="xs" color="gray.500">{d.firmware}</Td>
                  <Td>
                    <HStack spacing={1}>
                      <Tooltip label={`Edit ${d.name}`} hasArrow>
                        {/* WCAG 2.5.3 – aria-label includes device name for context */}
                        <Button
                          size="xs"
                          colorScheme="blue"
                          variant="ghost"
                          onClick={() => setModalDevice(d)}
                          aria-label={`Edit device ${d.name}`}
                          minH="28px"
                          _focusVisible={{ boxShadow: '0 0 0 3px var(--chakra-colors-blue-300)' }}
                        >
                          Edit
                        </Button>
                      </Tooltip>
                      <Tooltip label={`Delete ${d.name}`} hasArrow>
                        <Button
                          size="xs"
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => setPendingDelete(d)}
                          aria-label={`Delete device ${d.name}`}
                          minH="28px"
                          _focusVisible={{ boxShadow: '0 0 0 3px var(--chakra-colors-red-300)' }}
                        >
                          Delete
                        </Button>
                      </Tooltip>
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </Box>

      {/* Pagination — WCAG 4.1.2 navigation landmark + descriptive labels */}
      <Flex
        as="nav"
        aria-label="Table pagination"
        justify="space-between"
        align="center"
        mt={4}
        flexWrap="wrap"
        gap={3}
      >
        <Text fontSize="sm" color="gray.500" aria-live="polite" aria-atomic="true">
          {total === 0 ? 'No results' : `Showing ${(page-1)*pageSize+1}–${Math.min(page*pageSize,total)} of ${total} devices`}
        </Text>
        <HStack spacing={2}>
          <Select
            size="sm"
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            aria-label="Rows per page"
            w="auto"
            focusBorderColor="blue.500"
          >
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / page</option>)}
          </Select>
          <Button
            size="sm"
            variant="outline"
            isDisabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            aria-label="Go to previous page"
            minH="32px"
            _focusVisible={{ boxShadow: '0 0 0 3px var(--chakra-colors-blue-300)' }}
          >
            ‹ Prev
          </Button>
          <Text
            fontSize="sm"
            color="gray.600"
            fontFamily="mono"
            aria-current="true"
            aria-label={`Page ${page} of ${totalPages}`}
          >
            {page} / {totalPages}
          </Text>
          <Button
            size="sm"
            variant="outline"
            isDisabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            aria-label="Go to next page"
            minH="32px"
            _focusVisible={{ boxShadow: '0 0 0 3px var(--chakra-colors-blue-300)' }}
          >
            Next ›
          </Button>
        </HStack>
      </Flex>

      {/* Device add/edit modal — lazy chunk fetched only on first open */}
      {modalDevice !== undefined && (
        <Suspense fallback={null}>
          <DeviceModal
            device={modalDevice}
            onSave={handleSave}
            onClose={() => setModalDevice(undefined)}
            isSaving={isSaving}
          />
        </Suspense>
      )}

      {/* Delete confirm — WCAG 2.1.1 keyboard trap, 4.1.2 dialog semantics via Chakra AlertDialog */}
      <AlertDialog
        isOpen={Boolean(pendingDelete)}
        leastDestructiveRef={cancelRef}
        onClose={() => setPendingDelete(null)}
        isCentered
      >
        <AlertDialogOverlay bg="blackAlpha.400">
          <AlertDialogContent borderRadius="xl">
            <AlertDialogHeader fontSize="md" fontWeight="700">
              Remove device?
            </AlertDialogHeader>
            <AlertDialogBody fontSize="sm" color="gray.600">
              This will permanently remove <Text as="strong" color="gray.800">{pendingDelete?.name}</Text>{' '}
              ({pendingDelete?.id}) from inventory. This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter gap={2}>
              <Button
                ref={cancelRef}
                variant="ghost"
                onClick={() => setPendingDelete(null)}
                _focusVisible={{ boxShadow: '0 0 0 3px var(--chakra-colors-blue-300)' }}
              >
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDelete}
                isLoading={isDeleting}
                loadingText="Removing…"
                aria-label={`Confirm remove device ${pendingDelete?.name}`}
                _focusVisible={{ boxShadow: '0 0 0 3px var(--chakra-colors-red-300)' }}
              >
                Remove device
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <WcagAuditPanel componentName="Devices" runAudit={runAudit} result={result} isAuditing={isAuditing} />
    </Box>
  );
}
