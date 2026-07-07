import React, { useEffect, useState } from 'react';
import {
  Alert, AlertDescription, AlertIcon, Badge, Box, Grid, GridItem,
  Heading, HStack, Spinner, Stat, StatArrow, StatHelpText, StatLabel,
  StatNumber, Text, VStack, VisuallyHidden,
} from '@chakra-ui/react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { getDashboardStats, useWcagAudit, WcagAuditPanel } from '@ind-devices/shared';

/* Accessible Highcharts base — applies across all charts */
const BASE = {
  chart: { backgroundColor: 'transparent', style: { fontFamily: 'inherit' } },
  title: { text: undefined },
  credits: { enabled: false },
  accessibility: {
    enabled: true,
    // WCAG 1.1.1 – charts declare their content to screen readers
    description: 'Chart showing device telemetry data',
    keyboardNavigation: { enabled: true },
  },
  xAxis: { labels: { style: { color: '#4A5568', fontSize: '11px' } }, lineColor: '#E2E8F0', tickColor: '#E2E8F0' },
  yAxis: { gridLineColor: '#EDF2F7', labels: { style: { color: '#4A5568', fontSize: '11px' } }, title: { text: null } },
  legend: { itemStyle: { color: '#4A5568', fontSize: '11.5px', fontWeight: '500' } },
  tooltip: { borderRadius: 8, shadow: false },
};

function KpiCard({ label, value, sub, colorScheme, icon, description }) {
  return (
    <Box
      bg="white"
      borderRadius="xl"
      border="1px solid"
      borderColor="gray.200"
      p={5}
      borderTop="3px solid"
      borderTopColor={`${colorScheme}.400`}
      /* WCAG 4.1.2 – stat card is role=figure with label */
      role="figure"
      aria-label={`${label}: ${value}${sub ? '. ' + sub : ''}`}
    >
      <Stat>
        <HStack justify="space-between" mb={1}>
          <StatLabel fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wider" fontWeight="600">
            {label}
          </StatLabel>
          {/* WCAG 1.1.1 – decorative icon hidden from AT */}
          <Text fontSize="xl" aria-hidden="true">{icon}</Text>
        </HStack>
        <StatNumber fontSize="2xl" fontWeight="700" color="gray.800">{value}</StatNumber>
        {sub && <StatHelpText fontSize="xs" color="gray.500" mb={0}>{sub}</StatHelpText>}
      </Stat>
    </Box>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const { containerRef, runAudit, result, isAuditing } = useWcagAudit('Dashboard');

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  /* ── Loading state ── WCAG 4.1.3 status message */
  if (loading) return (
    <VStack py={16} role="status" aria-live="polite" aria-label="Loading dashboard data">
      <Spinner size="xl" color="blue.500" thickness="3px" />
      <Text color="gray.500" fontSize="sm">Loading fleet telemetry…</Text>
    </VStack>
  );

  if (error) return (
    <Alert status="error" borderRadius="md" role="alert">
      <AlertIcon /><AlertDescription>{error}</AlertDescription>
    </Alert>
  );

  /* ── Highcharts options ── */
  const statusPie = {
    ...BASE,
    chart: { ...BASE.chart, type: 'pie', height: 240 },
    accessibility: { ...BASE.accessibility, description: `Device status: ${stats.statusCounts.online} online, ${stats.statusCounts.warning} warning, ${stats.statusCounts.offline} offline` },
    plotOptions: { pie: { innerSize: '60%', borderWidth: 0, dataLabels: { enabled: true, style: { fontSize: '11px', color: '#2D3748' } } } },
    series: [{ name: 'Devices', data: [
      { name: 'Online',  y: stats.statusCounts.online,  color: '#38A169' },
      { name: 'Warning', y: stats.statusCounts.warning, color: '#D69E2E' },
      { name: 'Offline', y: stats.statusCounts.offline, color: '#E53E3E' },
    ]}],
  };

  const typeColumn = {
    ...BASE,
    chart: { ...BASE.chart, type: 'column', height: 240 },
    accessibility: { ...BASE.accessibility, description: 'Column chart showing device count by type' },
    xAxis: { ...BASE.xAxis, categories: Object.keys(stats.typeCounts) },
    plotOptions: { column: { borderRadius: 4, borderWidth: 0, color: '#4299E1' } },
    series: [{ name: 'Devices', data: Object.values(stats.typeCounts), showInLegend: false }],
  };

  const alertArea = {
    ...BASE,
    chart: { ...BASE.chart, type: 'area', height: 240 },
    accessibility: { ...BASE.accessibility, description: '7-day alert trend showing critical and warning alert counts per day' },
    xAxis: { ...BASE.xAxis, categories: stats.alertTrend.map(d => d.label) },
    plotOptions: { area: { fillOpacity: 0.15, marker: { enabled: false }, lineWidth: 2 } },
    series: [
      { name: 'Warning', data: stats.alertTrend.map(d => d.warning), color: '#D69E2E' },
      { name: 'Critical', data: stats.alertTrend.map(d => d.critical), color: '#E53E3E' },
    ],
  };

  return (
    <Box ref={containerRef}>
      {/* WCAG 2.4.6 – page-level heading */}
      <Box mb={6}>
        <Heading as="h1" size="lg" color="gray.800" mb={1}>Fleet Overview</Heading>
        <Text color="gray.500" fontSize="sm">
          Live snapshot of registered RAN devices across all regions.
        </Text>
        <HStack mt={2} spacing={2}>
          <Badge colorScheme="green" fontSize="9px">WCAG 2.2</Badge>
          <Badge colorScheme="blue" fontSize="9px">Level AA</Badge>
        </HStack>
      </Box>

      {/* KPI row */}
      <Grid templateColumns={{ base: '1fr 1fr', md: 'repeat(4, 1fr)' }} gap={4} mb={6}>
        <KpiCard label="Total Devices" value={stats.totalDevices} icon="🖥️" colorScheme="blue" />
        <KpiCard label="Online" value={stats.statusCounts.online}
          sub={`${Math.round((stats.statusCounts.online / stats.totalDevices) * 100)}% of fleet`}
          icon="✅" colorScheme="green" />
        <KpiCard label="Open Incidents" value={stats.openIncidents} icon="⚠️" colorScheme="red" />
        <KpiCard label="Avg Uptime" value={`${stats.avgUptimePct}%`} sub="Trailing 30 days" icon="📈" colorScheme="purple" />
      </Grid>

      {/* Charts */}
      <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4} mb={4}>
        <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" p={4}>
          {/* WCAG 2.4.6 – chart section heading */}
          <Heading as="h2" size="sm" color="gray.700" mb={3}>Status Distribution</Heading>
          <HighchartsReact highcharts={Highcharts} options={statusPie} />
          {/* WCAG 1.1.1 – visually-hidden data table fallback for screen readers */}
          <VisuallyHidden as="table" aria-label="Status distribution data">
            <thead><tr><th>Status</th><th>Count</th></tr></thead>
            <tbody>
              <tr><td>Online</td><td>{stats.statusCounts.online}</td></tr>
              <tr><td>Warning</td><td>{stats.statusCounts.warning}</td></tr>
              <tr><td>Offline</td><td>{stats.statusCounts.offline}</td></tr>
            </tbody>
          </VisuallyHidden>
        </Box>

        <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" p={4}>
          <Heading as="h2" size="sm" color="gray.700" mb={3}>Devices by Type</Heading>
          <HighchartsReact highcharts={Highcharts} options={typeColumn} />
          <VisuallyHidden as="table" aria-label="Devices by type data">
            <thead><tr><th>Type</th><th>Count</th></tr></thead>
            <tbody>
              {Object.entries(stats.typeCounts).map(([t, n]) => <tr key={t}><td>{t}</td><td>{n}</td></tr>)}
            </tbody>
          </VisuallyHidden>
        </Box>
      </Grid>

      <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" p={4}>
        <Heading as="h2" size="sm" color="gray.700" mb={3}>Alert Trend — 7 days</Heading>
        <HighchartsReact highcharts={Highcharts} options={alertArea} />
        <VisuallyHidden as="table" aria-label="7-day alert trend data">
          <thead><tr><th>Day</th><th>Warning</th><th>Critical</th></tr></thead>
          <tbody>
            {stats.alertTrend.map(d => <tr key={d.label}><td>{d.label}</td><td>{d.warning}</td><td>{d.critical}</td></tr>)}
          </tbody>
        </VisuallyHidden>
      </Box>

      <WcagAuditPanel componentName="Dashboard" runAudit={runAudit} result={result} isAuditing={isAuditing} />
    </Box>
  );
}
