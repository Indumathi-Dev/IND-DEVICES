import React, { useEffect, useState } from 'react';
import {
  Alert, AlertDescription, AlertIcon, Badge, Box, Grid,
  Heading, HStack, Select, Spinner, Stat, StatHelpText,
  StatLabel, StatNumber, Text, VStack, VisuallyHidden, Divider,
} from '@chakra-ui/react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { getDashboardStats, useWcagAudit, WcagAuditPanel } from '@ind-devices/shared';

const SERVER = 'http://localhost:8090/api/home/dashboard';
const REGIONS = ['North', 'South', 'East', 'West', 'Central'];

// ── Shared Highcharts base theme (light palette) ─────────────────────────────
const BASE = {
  chart:   { backgroundColor: 'transparent', style: { fontFamily: 'inherit' } },
  title:   { text: undefined },
  credits: { enabled: false },
  accessibility: { enabled: true, keyboardNavigation: { enabled: true } },
  xAxis: {
    labels: { style: { color: '#4A5568', fontSize: '11px' } },
    lineColor: '#E2E8F0', tickColor: '#E2E8F0',
  },
  yAxis: {
    gridLineColor: '#EDF2F7',
    labels: { style: { color: '#4A5568', fontSize: '11px' } },
    title: { text: null },
  },
  legend: { itemStyle: { color: '#4A5568', fontSize: '11.5px', fontWeight: '500' } },
  tooltip: { borderRadius: 8, shadow: false },
};

// ── Carbon palette — 5 distinct region colours ───────────────────────────────
const REGION_COLORS = {
  North: '#3B82F6', South: '#10B981', East: '#F59E0B', West: '#8B5CF6', Central: '#EF4444',
};

// ── Data fetchers ─────────────────────────────────────────────────────────────
async function fetchDashboardStats() {
  try {
    const r = await fetch(`${SERVER}/getStats/stats`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  } catch {
    return getDashboardStats(); // client-side fallback
  }
}

async function fetchCarbonTrend(region = 'all') {
  const r = await fetch(`${SERVER}/getCarbonTrend/stats/carbon?region=${region}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// ── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, colorScheme, icon, description }) {
  return (
    <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200"
      p={5} borderTop="3px solid" borderTopColor={`${colorScheme}.400`}
      role="figure" aria-label={`${label}: ${value}${sub ? '. ' + sub : ''}`}>
      <Stat>
        <HStack justify="space-between" mb={1}>
          <StatLabel fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wider" fontWeight="600">
            {label}
          </StatLabel>
          <Text fontSize="xl" aria-hidden="true">{icon}</Text>
        </HStack>
        <StatNumber fontSize="2xl" fontWeight="700" color="gray.800">{value}</StatNumber>
        {sub && <StatHelpText fontSize="xs" color="gray.500" mb={0}>{sub}</StatHelpText>}
      </Stat>
    </Box>
  );
}

// ── Carbon summary card ───────────────────────────────────────────────────────
function CarbonKpiRow({ summary }) {
  if (!summary?.length) return null;
  const total = summary.reduce((s, r) => s + r.TotalCarbonKgPerDay, 0);
  const worst = summary.reduce((a, b) => a.TotalCarbonKgPerDay > b.TotalCarbonKgPerDay ? a : b);
  return (
    <Grid templateColumns={{ base: '1fr 1fr', md: 'repeat(4, 1fr)' }} gap={4} mb={6}>
      <KpiCard label="Fleet CO₂/day"
        value={`${total.toFixed(2)} kg`} sub="All regions combined" colorScheme="orange" icon="🌱" />
      <KpiCard label="Yearly CO₂"
        value={`${(total * 365 / 1000).toFixed(2)} t`} sub="Tonnes CO₂ per year" colorScheme="red" icon="🏭" />
      <KpiCard label="Highest Region"
        value={worst.Region} sub={`${worst.TotalCarbonKgPerDay.toFixed(2)} kg/day`} colorScheme="yellow" icon="⚠️" />
      <KpiCard label="Best Region"
        value={summary.reduce((a,b) => a.TotalCarbonKgPerDay < b.TotalCarbonKgPerDay ? a : b).Region}
        sub="Lowest grid intensity" colorScheme="green" icon="✅" />
    </Grid>
  );
}

export default function DashboardPage() {
  const [stats,        setStats]        = useState(null);
  const [carbon,       setCarbon]       = useState(null);
  const [region,       setRegion]       = useState('all');
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingCarbon,setLoadingCarbon]= useState(true);
  const [error,        setError]        = useState('');
  const { containerRef, runAudit, result, isAuditing } = useWcagAudit('Dashboard');

  // Load fleet stats once
  useEffect(() => {
    fetchDashboardStats()
      .then(setStats).catch(e => setError(e.message))
      .finally(() => setLoadingStats(false));
  }, []);

  // Reload carbon trend whenever region filter changes
  useEffect(() => {
    setLoadingCarbon(true);
    fetchCarbonTrend(region)
      .then(setCarbon).catch(e => setError(e.message))
      .finally(() => setLoadingCarbon(false));
  }, [region]);

  if (loadingStats) return (
    <VStack py={16} role="status" aria-live="polite" aria-label="Loading dashboard">
      <Spinner size="xl" color="blue.500" thickness="3px" />
      <Text color="gray.500" fontSize="sm">Loading fleet telemetry…</Text>
    </VStack>
  );

  if (error) return (
    <Alert status="error" borderRadius="md" role="alert">
      <AlertIcon /><AlertDescription>{error}</AlertDescription>
    </Alert>
  );

  // ── Highcharts options — fleet overview ────────────────────────────────────
  const statusPie = {
    ...BASE,
    chart: { ...BASE.chart, type: 'pie', height: 220 },
    accessibility: { ...BASE.accessibility, description: `Device status: ${stats.StatusCounts.online} online, ${stats.StatusCounts.warning} warning, ${stats.StatusCounts.offline} offline` },
    plotOptions: { pie: { innerSize: '60%', borderWidth: 0, dataLabels: { enabled: true, style: { fontSize: '10px', color: '#2D3748' } } } },
    series: [{ name: 'Devices', data: [
      { name: 'Online',  y: stats.StatusCounts.online,  color: '#38A169' },
      { name: 'Warning', y: stats.StatusCounts.warning, color: '#D69E2E' },
      { name: 'Offline', y: stats.StatusCounts.offline, color: '#E53E3E' },
    ]}],
  };

  const typeColumn = {
    ...BASE,
    chart: { ...BASE.chart, type: 'column', height: 220 },
    accessibility: { ...BASE.accessibility, description: 'Devices by type' },
    xAxis: { ...BASE.xAxis, categories: Object.keys(stats.TypeCounts) },
    plotOptions: { column: { borderRadius: 4, borderWidth: 0, color: '#4299E1' } },
    series: [{ name: 'Devices', data: Object.values(stats.TypeCounts), showInLegend: false }],
  };

  const alertArea = {
    ...BASE,
    chart: { ...BASE.chart, type: 'area', height: 220 },
    accessibility: { ...BASE.accessibility, description: '7-day alert trend' },
    xAxis: { ...BASE.xAxis, categories: stats.AlertTrend.map(d => d.Day) },
    plotOptions: { area: { fillOpacity: 0.15, marker: { enabled: false }, lineWidth: 2 } },
    series: [
      { name: 'Warning',  data: stats.AlertTrend.map(d => d.Warning),  color: '#D69E2E' },
      { name: 'Critical', data: stats.AlertTrend.map(d => d.Critical), color: '#E53E3E' },
    ],
  };

  // ── Highcharts options — carbon charts (region-aware) ──────────────────────

  // Chart A — All regions: stacked column CO₂/day per region over 7 days
  const carbonAllRegions = region === 'all' && carbon ? {
    ...BASE,
    chart: { ...BASE.chart, type: 'column', height: 280 },
    accessibility: {
      ...BASE.accessibility,
      description: '7-day carbon emission trend (kg CO₂/day) for all regions combined as a stacked column chart',
    },
    xAxis: { ...BASE.xAxis, categories: carbon.WeeklyTrend.map(d => d.Day) },
    yAxis: {
      ...BASE.yAxis,
      title: { text: 'kg CO₂ / day', style: { color: '#718096', fontSize: '11px' } },
      stackLabels: { enabled: true, style: { fontWeight: '600', fontSize: '10px', color: '#4A5568' } },
    },
    tooltip: {
      ...BASE.tooltip,
      formatter: function () {
        return `<b>${this.x}</b><br/>${this.series.name}: <b>${this.y.toFixed(2)} kg CO₂</b><br/>Stack: <b>${this.point.stackTotal?.toFixed(2)} kg</b>`;
      },
    },
    plotOptions: {
      column: { stacking: 'normal', borderWidth: 0, borderRadius: 3 },
    },
    series: REGIONS.map(r => ({
      name: r,
      color: REGION_COLORS[r],
      data: carbon.WeeklyTrend.map(d => d[r] ?? 0),
    })),
  } : null;

  // Chart B — Single region: line trend + device breakdown bar
  const carbonRegionTrend = region !== 'all' && carbon ? {
    ...BASE,
    chart: { ...BASE.chart, type: 'area', height: 260 },
    accessibility: {
      ...BASE.accessibility,
      description: `7-day total carbon emission trend for ${region} region`,
    },
    xAxis: { ...BASE.xAxis, categories: carbon.WeeklyTrend.map(d => d.Day) },
    yAxis: { ...BASE.yAxis, title: { text: 'kg CO₂ / day', style: { color: '#718096', fontSize: '11px' } } },
    tooltip: { ...BASE.tooltip, valueSuffix: ' kg CO₂' },
    plotOptions: { area: { fillOpacity: 0.15, marker: { enabled: true, radius: 4 }, lineWidth: 2 } },
    series: [{
      name: `${region} — Total CO₂/day`,
      color: REGION_COLORS[region] || '#4299E1',
      data: carbon.WeeklyTrend.map(d => d.TotalCarbonKgPerDay),
    }],
  } : null;

  // Chart C — Device breakdown bar (only for single region)
  const carbonDeviceBar = region !== 'all' && carbon?.DeviceBreakdown?.length ? {
    ...BASE,
    chart: { ...BASE.chart, type: 'bar', height: Math.max(180, carbon.DeviceBreakdown.length * 36 + 60) },
    accessibility: {
      ...BASE.accessibility,
      description: `Carbon emission per device in ${region} region, sorted by emission`,
    },
    xAxis: {
      ...BASE.xAxis,
      categories: carbon.DeviceBreakdown.map(d => d.DeviceName),
      title: { text: null },
    },
    yAxis: { ...BASE.yAxis, title: { text: 'kg CO₂ / day', style: { color: '#718096', fontSize: '11px' } } },
    tooltip: {
      ...BASE.tooltip,
      formatter: function () {
        const d = carbon.DeviceBreakdown[this.point.index];
        return `<b>${d.DeviceName}</b> (${d.DeviceType})<br/>Avg: <b>${d.AverageConsumedWatts}W</b><br/>CO₂: <b>${d.CarbonEmissionKgPerDay} kg/day</b>`;
      },
    },
    plotOptions: { bar: { borderWidth: 0, borderRadius: 3, colorByPoint: false } },
    series: [{
      name: 'CO₂ kg/day',
      color: REGION_COLORS[region] || '#4299E1',
      data: carbon.DeviceBreakdown.map(d => d.CarbonEmissionKgPerDay),
      showInLegend: false,
    }],
  } : null;

  return (
    <Box ref={containerRef}>
      {/* Page heading */}
      <HStack justify="space-between" mb={6} flexWrap="wrap" gap={3}>
        <Box>
          <Heading as="h1" size="lg" color="gray.800" mb={1}>Fleet Overview</Heading>
          <Text color="gray.500" fontSize="sm">Live RAN device telemetry and carbon emission analytics.</Text>
          <HStack mt={1} spacing={2}>
            <Badge colorScheme="green" fontSize="9px">WCAG 2.2</Badge>
            <Badge colorScheme="blue" fontSize="9px">Level AA</Badge>
            <Badge colorScheme="orange" fontSize="9px">Carbon Aware</Badge>
          </HStack>
        </Box>
      </HStack>

      {/* ── Fleet KPI row ── */}
      <Grid templateColumns={{ base: '1fr 1fr', md: 'repeat(4, 1fr)' }} gap={4} mb={6}>
        <KpiCard label="Total Devices" value={stats.TotalDevices} icon="🖥️" colorScheme="blue" />
        <KpiCard label="Online" value={stats.StatusCounts.online}
          sub={`${Math.round((stats.StatusCounts.online / stats.TotalDevices) * 100)}% of fleet`}
          icon="✅" colorScheme="green" />
        <KpiCard label="Open Incidents" value={stats.OpenIncidents} icon="⚠️" colorScheme="red" />
        <KpiCard label="Avg Uptime" value={`${stats.AvgUptimePct}%`} sub="Trailing 30 days" icon="📈" colorScheme="purple" />
      </Grid>

      {/* ── Fleet overview charts ── */}
      <Heading as="h2" size="sm" color="gray.600" mb={3} textTransform="uppercase" letterSpacing="wider" fontSize="11px">
        Fleet Telemetry
      </Heading>
      <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4} mb={6}>
        <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" p={4}>
          <Heading as="h3" size="sm" color="gray.700" mb={3}>Status Distribution</Heading>
          <HighchartsReact highcharts={Highcharts} options={statusPie} />
          <VisuallyHidden as="table" aria-label="Status distribution data">
            <thead><tr><th>Status</th><th>Count</th></tr></thead>
            <tbody>
              <tr><td>Online</td><td>{stats.StatusCounts.online}</td></tr>
              <tr><td>Warning</td><td>{stats.StatusCounts.warning}</td></tr>
              <tr><td>Offline</td><td>{stats.StatusCounts.offline}</td></tr>
            </tbody>
          </VisuallyHidden>
        </Box>

        <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" p={4}>
          <Heading as="h3" size="sm" color="gray.700" mb={3}>Devices by Type</Heading>
          <HighchartsReact highcharts={Highcharts} options={typeColumn} />
          <VisuallyHidden as="table" aria-label="Devices by type">
            <thead><tr><th>Type</th><th>Count</th></tr></thead>
            <tbody>{Object.entries(stats.TypeCounts).map(([t,n]) => <tr key={t}><td>{t}</td><td>{n}</td></tr>)}</tbody>
          </VisuallyHidden>
        </Box>
      </Grid>

      <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" p={4} mb={8}>
        <Heading as="h3" size="sm" color="gray.700" mb={3}>Alert Trend — 7 days</Heading>
        <HighchartsReact highcharts={Highcharts} options={alertArea} />
        <VisuallyHidden as="table" aria-label="7-day alert trend">
          <thead><tr><th>Day</th><th>Warning</th><th>Critical</th></tr></thead>
          <tbody>{stats.AlertTrend.map(d => <tr key={d.Day}><td>{d.Day}</td><td>{d.Warning}</td><td>{d.Critical}</td></tr>)}</tbody>
        </VisuallyHidden>
      </Box>

      {/* ─────────────────────────────────────────────────────────────────────
          CARBON EMISSIONS SECTION
          ───────────────────────────────────────────────────────────────────── */}
      <Divider mb={6} borderColor="gray.200" />

      <HStack justify="space-between" align="flex-end" mb={4} flexWrap="wrap" gap={3}>
        <Box>
          <Heading as="h2" size="md" color="gray.800" mb={1}>Carbon Emissions</Heading>
          <Text color="gray.500" fontSize="sm">
            CO₂ output derived from PowerControl readings.
            Formula: <Box as="code" fontFamily="mono" fontSize="xs" bg="gray.100" px={1} borderRadius="sm">
              (AverageConsumedWatts ÷ 1000) × 24h × grid intensity (kg CO₂/kWh)
            </Box>
          </Text>
        </Box>

        {/* Region filter — drives both charts and KPI cards */}
        <HStack spacing={2} aria-label="Carbon region filter">
          <Text fontSize="sm" color="gray.600" fontWeight="500" whiteSpace="nowrap">Filter by region:</Text>
          <Select
            size="sm" w="160px" value={region}
            onChange={e => setRegion(e.target.value)}
            aria-label="Select region for carbon emission analysis"
            focusBorderColor="orange.400" bg="white"
            _focusVisible={{ boxShadow: '0 0 0 3px var(--chakra-colors-orange-300)' }}
          >
            <option value="all">All Regions</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </Select>
        </HStack>
      </HStack>

      {/* Carbon KPI cards — always shown */}
      {carbon && !loadingCarbon && (
        <CarbonKpiRow summary={carbon.RegionSummary} />
      )}

      {/* Loading state for carbon */}
      {loadingCarbon && (
        <VStack py={10} role="status" aria-live="polite" aria-label="Loading carbon data">
          <Spinner size="lg" color="orange.400" />
          <Text fontSize="sm" color="gray.400">Loading carbon emission data…</Text>
        </VStack>
      )}

      {/* All regions — stacked column 7-day trend */}
      {!loadingCarbon && region === 'all' && carbonAllRegions && (
        <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" p={4} mb={4}>
          <HStack justify="space-between" mb={3}>
            <Heading as="h3" size="sm" color="gray.700">CO₂ Trend — All Regions (7 days, kg CO₂/day)</Heading>
            <HStack spacing={2} flexWrap="wrap">
              {REGIONS.map(r => (
                <HStack key={r} spacing={1}>
                  <Box w="10px" h="10px" borderRadius="2px" bg={REGION_COLORS[r]} aria-hidden="true" />
                  <Text fontSize="10px" color="gray.600">{r}</Text>
                </HStack>
              ))}
            </HStack>
          </HStack>
          <HighchartsReact highcharts={Highcharts} options={carbonAllRegions} />
          {/* WCAG 1.1.1 — screen reader data table */}
          <VisuallyHidden as="table" aria-label="7-day carbon emission by region">
            <thead><tr><th>Day</th>{REGIONS.map(r => <th key={r}>{r}</th>)}</tr></thead>
            <tbody>{carbon.WeeklyTrend.map(d => (
              <tr key={d.Day}><td>{d.Day}</td>{REGIONS.map(r => <td key={r}>{d[r]}</td>)}</tr>
            ))}</tbody>
          </VisuallyHidden>
        </Box>
      )}

      {/* Single region — trend line + device breakdown bar */}
      {!loadingCarbon && region !== 'all' && carbon && (
        <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={4} mb={4}>
          {/* Trend line */}
          {carbonRegionTrend && (
            <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" p={4}>
              <Heading as="h3" size="sm" color="gray.700" mb={3}>
                {region} — CO₂ Trend (7 days)
              </Heading>
              <HighchartsReact highcharts={Highcharts} options={carbonRegionTrend} />
              <VisuallyHidden as="table" aria-label={`${region} 7-day carbon trend`}>
                <thead><tr><th>Day</th><th>kg CO₂/day</th></tr></thead>
                <tbody>{carbon.WeeklyTrend.map(d => (
                  <tr key={d.Day}><td>{d.Day}</td><td>{d.TotalCarbonKgPerDay}</td></tr>
                ))}</tbody>
              </VisuallyHidden>
            </Box>
          )}

          {/* Device breakdown */}
          {carbonDeviceBar && (
            <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" p={4}>
              <Heading as="h3" size="sm" color="gray.700" mb={3}>
                {region} — CO₂ per Device (today)
              </Heading>
              <HighchartsReact highcharts={Highcharts} options={carbonDeviceBar} />
              <VisuallyHidden as="table" aria-label={`${region} device carbon breakdown`}>
                <thead><tr><th>Device</th><th>Type</th><th>Avg W</th><th>kg CO₂/day</th></tr></thead>
                <tbody>{carbon.DeviceBreakdown.map(d => (
                  <tr key={d.DeviceId}>
                    <td>{d.DeviceName}</td><td>{d.DeviceType}</td>
                    <td>{d.AverageConsumedWatts}</td><td>{d.CarbonEmissionKgPerDay}</td>
                  </tr>
                ))}</tbody>
              </VisuallyHidden>
            </Box>
          )}
        </Grid>
      )}

      <WcagAuditPanel componentName="Dashboard" runAudit={runAudit} result={result} isAuditing={isAuditing} />
    </Box>
  );
}
