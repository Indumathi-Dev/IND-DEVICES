import React, { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import {
  Alert, AlertDescription, AlertDialog, AlertDialogBody, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay, AlertIcon,
  Badge, Box, Button, Flex, Heading, HStack, Input, InputGroup,
  InputLeftElement, Select, Spinner, Table, TableCaption,
  Tbody, Td, Text, Th, Thead, Tooltip, Tr, useToast, VStack,
} from '@chakra-ui/react';
import { DEVICE_STATUS_OPTIONS, useWcagAudit, WcagAuditPanel } from '@ind-devices/shared';

/** DeviceModal — lazy-loaded; chunk only fetched on first Add/Edit click */
const DeviceModal = React.lazy(() => import('./DeviceModal'));

const PAGE_SIZES = [5, 10, 20];
const SERVER = 'http://localhost:8090/api/home/devices';

// ── API helpers (call server; no client-side localStorage mock) ────────────
async function fetchDevices({ page, pageSize, search, status }) {
  const p = new URLSearchParams({ page, pageSize, search, status });
  const r = await fetch(`${SERVER}/getDevicesList/devices?${p}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json(); // { devices, totalCount, page, pageSize }
}

async function apiCreate(body) {
  const r = await fetch(`${SERVER}/createDevice/devices`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function apiUpdate(id, body) {
  const r = await fetch(`${SERVER}/updateDevice/devices/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function apiDelete(id) {
  const r = await fetch(`${SERVER}/deleteDevice/devices/${id}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// ── Carbon emission badge — green/amber/red by kg/day threshold ────────────
function CarbonBadge({ value }) {
  if (value == null) return <Text color="gray.400" fontSize="xs">—</Text>;
  const scheme = value < 1.5 ? 'green' : value < 3 ? 'yellow' : 'red';
  return (
    <Tooltip
      label={`${value} kg CO₂/day • ${(value * 365).toFixed(1)} kg CO₂/year`}
      hasArrow placement="top"
    >
      {/* WCAG 1.4.1 — colour + text label, never colour alone */}
      <Badge colorScheme={scheme} fontSize="10px" px={2} py="2px" borderRadius="full">
        {value.toFixed(3)} kg
      </Badge>
    </Tooltip>
  );
}

function StatusBadge({ status }) {
  const map = { online: 'green', warning: 'yellow', offline: 'red' };
  return (
    <HStack spacing={2}>
      <Box w="7px" h="7px" borderRadius="full" bg={`${map[status] || 'gray'}.400`} aria-hidden="true" flexShrink={0} />
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
  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(10);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatus]     = useState('all');
  const [devices, setDevices]         = useState([]);
  const [total, setTotal]             = useState(0);
  const [isLoading, setLoading]       = useState(true);
  const [error, setError]             = useState('');
  const [modalDevice, setModal]       = useState(undefined); // undefined=closed null=add obj=edit
  const [isSaving, setSaving]         = useState(false);
  const [pendingDelete, setDelete]    = useState(null);
  const [isDeleting, setDeleting]     = useState(false);
  const cancelRef                     = useRef();
  const toast                         = useToast();
  const { containerRef, runAudit, result, isAuditing } = useWcagAudit('Devices');

  const load = useCallback(() => {
    setLoading(true); setError('');
    fetchDevices({ page, pageSize, search, status: statusFilter })
      .then(res => { setDevices(res.devices); setTotal(res.totalCount); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function handleSave(formData) {
    setSaving(true);
    try {
      if (modalDevice) {
        await apiUpdate(modalDevice.DeviceId, formData);
        toast({ title: `${formData.DeviceName || formData.name} updated.`, status: 'success', duration: 3000, isClosable: true, position: 'bottom-right' });
      } else {
        await apiCreate(formData);
        toast({ title: 'Device added.', status: 'success', duration: 3000, isClosable: true, position: 'bottom-right' });
        setPage(1);
      }
      setModal(undefined); load();
    } catch (e) {
      toast({ title: 'Save failed.', description: e.message, status: 'error', duration: 4000, isClosable: true, position: 'bottom-right' });
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiDelete(pendingDelete.DeviceId);
      toast({ title: `${pendingDelete.DeviceName} removed.`, status: 'info', duration: 3000, isClosable: true, position: 'bottom-right' });
      setDelete(null); load();
    } catch (e) {
      toast({ title: 'Delete failed.', description: e.message, status: 'error', duration: 4000, isClosable: true });
    } finally { setDeleting(false); }
  }

  return (
    <Box ref={containerRef}>
      {/* Page header */}
      <Flex justify="space-between" align="flex-start" mb={5} flexWrap="wrap" gap={3}>
        <Box>
          <Heading as="h1" size="lg" color="gray.800" mb={1}>Devices</Heading>
          <Text color="gray.500" fontSize="sm">
            Manage RAN inventory — carbon emission calculated from PowerControl readings.
          </Text>
          <HStack mt={1} spacing={2}>
            <Badge colorScheme="green" fontSize="9px">WCAG 2.2</Badge>
            <Badge colorScheme="blue" fontSize="9px">Level AA</Badge>
            <Badge colorScheme="orange" fontSize="9px">Carbon Aware</Badge>
          </HStack>
        </Box>
        <Button colorScheme="blue" size="md" onClick={() => setModal(null)}
          aria-label="Add a new device" minH="40px"
          _focusVisible={{ boxShadow: '0 0 0 3px var(--chakra-colors-blue-300)' }}>
          + Add device
        </Button>
      </Flex>

      {/* Toolbar */}
      <Flex mb={4} gap={3} flexWrap="wrap">
        <InputGroup maxW="340px">
          <InputLeftElement pointerEvents="none" color="gray.400"><SearchIcon /></InputLeftElement>
          <Input id="device-search" type="search"
            placeholder="Search by name, ID, IP, type, region…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            aria-label="Search devices" autoComplete="off"
            focusBorderColor="blue.500" bg="white" fontSize="sm" />
        </InputGroup>

        <Select maxW="170px" value={statusFilter}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          aria-label="Filter by status" focusBorderColor="blue.500" bg="white" fontSize="sm">
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

      {/* ── Table ── */}
      <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" overflow="hidden">
        <Box overflowX="auto">
          <Table variant="simple" size="sm">
            {/* WCAG 1.3.1 – caption describes table purpose */}
            <TableCaption placement="top" textAlign="left" px={4} py={3}
              fontSize="xs" color="gray.500" fontWeight="600"
              textTransform="uppercase" letterSpacing="wider"
              borderBottom="1px solid" borderColor="gray.100" m={0}>
              {isLoading ? 'Loading devices…'
                : `${total} device${total !== 1 ? 's' : ''} — showing ${Math.min((page-1)*pageSize+1, total)}–${Math.min(page*pageSize, total)}`}
            </TableCaption>
            <Thead bg="gray.50">
              <Tr>
                {['Device ID','Name','Type','IP Address','Region','Status','Firmware',
                  'Power (W)','Avg (W)','CO₂ kg/day','Actions'].map(h => (
                  <Th key={h} scope="col" fontSize="10px" color="gray.500" fontWeight="700"
                    letterSpacing="wider" py={3} borderColor="gray.200" whiteSpace="nowrap">{h}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {isLoading && (
                <Tr><Td colSpan={11}>
                  <Flex justify="center" py={8} role="status" aria-live="polite" aria-label="Loading devices">
                    <Spinner size="md" color="blue.500" mr={3} />
                    <Text color="gray.400" fontSize="sm">Loading…</Text>
                  </Flex>
                </Td></Tr>
              )}
              {!isLoading && devices.length === 0 && (
                <Tr><Td colSpan={11}>
                  <Text textAlign="center" color="gray.400" py={8} fontSize="sm">
                    No devices match the current filters.
                  </Text>
                </Td></Tr>
              )}
              {!isLoading && devices.map(d => {
                const pc = d.PowerControl?.[0] ?? {};
                return (
                  <Tr key={d.DeviceId} _hover={{ bg: 'gray.50' }}>
                    <Td fontFamily="mono" fontSize="xs" color="gray.600">{d.DeviceId}</Td>
                    <Td fontWeight="500" fontSize="sm" color="gray.800">{d.DeviceName}</Td>
                    <Td fontSize="sm" color="gray.600">{d.DeviceType}</Td>
                    <Td fontFamily="mono" fontSize="xs" color="gray.600">{d.IPAddress}</Td>
                    <Td fontSize="sm" color="gray.600">{d.Region}</Td>
                    <Td><StatusBadge status={d.Status} /></Td>
                    <Td fontFamily="mono" fontSize="xs" color="gray.500">{d.Firmware}</Td>

                    {/* PowerControl columns */}
                    <Td fontFamily="mono" fontSize="xs" color="gray.600" isNumeric>
                      {pc.PowerConsumedWatts ?? '—'}
                    </Td>
                    <Td fontFamily="mono" fontSize="xs" color="gray.600" isNumeric>
                      {pc.AverageConsumedWatts ?? '—'}
                    </Td>

                    {/* Carbon emission — colour-coded badge */}
                    <Td>
                      <CarbonBadge value={d.CarbonEmissionKgPerDay} />
                    </Td>

                    <Td>
                      <HStack spacing={1}>
                        <Tooltip label={`Edit ${d.DeviceName}`} hasArrow>
                          <Button size="xs" colorScheme="blue" variant="ghost"
                            onClick={() => setModal(d)} aria-label={`Edit device ${d.DeviceName}`}
                            minH="28px"
                            _focusVisible={{ boxShadow: '0 0 0 3px var(--chakra-colors-blue-300)' }}>
                            Edit
                          </Button>
                        </Tooltip>
                        <Tooltip label={`Delete ${d.DeviceName}`} hasArrow>
                          <Button size="xs" colorScheme="red" variant="ghost"
                            onClick={() => setDelete(d)} aria-label={`Delete device ${d.DeviceName}`}
                            minH="28px"
                            _focusVisible={{ boxShadow: '0 0 0 3px var(--chakra-colors-red-300)' }}>
                            Delete
                          </Button>
                        </Tooltip>
                      </HStack>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Box>
      </Box>

      {/* Pagination */}
      <Flex as="nav" aria-label="Table pagination"
        justify="space-between" align="center" mt={4} flexWrap="wrap" gap={3}>
        <Text fontSize="sm" color="gray.500" aria-live="polite" aria-atomic="true">
          {total === 0 ? 'No results'
            : `Showing ${(page-1)*pageSize+1}–${Math.min(page*pageSize, total)} of ${total} devices`}
        </Text>
        <HStack spacing={2}>
          <Select size="sm" value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            aria-label="Rows per page" w="auto" focusBorderColor="blue.500">
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / page</option>)}
          </Select>
          <Button size="sm" variant="outline" isDisabled={page <= 1}
            onClick={() => setPage(p => p - 1)} aria-label="Go to previous page" minH="32px"
            _focusVisible={{ boxShadow: '0 0 0 3px var(--chakra-colors-blue-300)' }}>
            ‹ Prev
          </Button>
          <Text fontSize="sm" color="gray.600" fontFamily="mono"
            aria-label={`Page ${page} of ${totalPages}`}>{page} / {totalPages}</Text>
          <Button size="sm" variant="outline" isDisabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)} aria-label="Go to next page" minH="32px"
            _focusVisible={{ boxShadow: '0 0 0 3px var(--chakra-colors-blue-300)' }}>
            Next ›
          </Button>
        </HStack>
      </Flex>

      {/* Device modal — lazy */}
      {modalDevice !== undefined && (
        <Suspense fallback={null}>
          <DeviceModal device={modalDevice} onSave={handleSave}
            onClose={() => setModal(undefined)} isSaving={isSaving} />
        </Suspense>
      )}

      {/* Delete confirmation */}
      <AlertDialog isOpen={Boolean(pendingDelete)} leastDestructiveRef={cancelRef}
        onClose={() => setDelete(null)} isCentered>
        <AlertDialogOverlay bg="blackAlpha.400">
          <AlertDialogContent borderRadius="xl">
            <AlertDialogHeader fontSize="md" fontWeight="700">Remove device?</AlertDialogHeader>
            <AlertDialogBody fontSize="sm" color="gray.600">
              Permanently remove <Text as="strong" color="gray.800">{pendingDelete?.DeviceName}</Text>{' '}
              ({pendingDelete?.DeviceId}). This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter gap={2}>
              <Button ref={cancelRef} variant="ghost" onClick={() => setDelete(null)}
                _focusVisible={{ boxShadow: '0 0 0 3px var(--chakra-colors-blue-300)' }}>Cancel</Button>
              <Button colorScheme="red" onClick={handleDelete} isLoading={isDeleting} loadingText="Removing…"
                aria-label={`Confirm remove ${pendingDelete?.DeviceName}`}
                _focusVisible={{ boxShadow: '0 0 0 3px var(--chakra-colors-red-300)' }}>
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
