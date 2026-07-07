import React, { useEffect, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { getDashboardStats } from '@ind-devices/shared';
import './dashboard.css';

const COLORS = {
  cyan: '#0d9488',
  amber: '#d97706',
  red: '#e11d48',
  violet: '#4f46e5',
  textMuted: '#5c6b85',
  border: '#dde2ec',
  panel: '#ffffff',
};

const baseTheme = {
  chart: {
    backgroundColor: 'transparent',
    style: { fontFamily: "'Inter', sans-serif" },
  },
  title: { text: undefined },
  credits: { enabled: false },
  legend: { itemStyle: { color: COLORS.textMuted, fontSize: '11.5px' } },
  xAxis: {
    labels: { style: { color: COLORS.textMuted, fontSize: '11px' } },
    lineColor: COLORS.border,
    tickColor: COLORS.border,
  },
  yAxis: {
    gridLineColor: COLORS.border,
    labels: { style: { color: COLORS.textMuted, fontSize: '11px' } },
    title: { text: undefined },
  },
};

function KpiCard({ label, value, accent, sub }) {
  return (
    <div className="ind-kpi" style={{ '--ind-kpi-accent': accent }}>
      <span className="ind-kpi__label">{label}</span>
      <strong className="ind-kpi__value">{value}</strong>
      {sub && <span className="ind-kpi__sub">{sub}</span>}
    </div>
  );
}

export default function DashboardContent() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getDashboardStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load dashboard data.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <div className="ind-dashboard__error">{error}</div>;
  if (!stats) return <div className="ind-dashboard__loading">Loading fleet telemetry…</div>;

  const statusPieOptions = {
    ...baseTheme,
    chart: { ...baseTheme.chart, type: 'pie', height: 260 },
    tooltip: { valueSuffix: ' devices' },
    plotOptions: {
      pie: {
        innerSize: '62%',
        borderWidth: 0,
        dataLabels: { enabled: false },
      },
    },
    series: [
      {
        name: 'Devices',
        data: [
          { name: 'Online', y: stats.statusCounts.online, color: COLORS.cyan },
          { name: 'Warning', y: stats.statusCounts.warning, color: COLORS.amber },
          { name: 'Offline', y: stats.statusCounts.offline, color: COLORS.red },
        ],
      },
    ],
  };

  const typeColumnOptions = {
    ...baseTheme,
    chart: { ...baseTheme.chart, type: 'column', height: 260 },
    xAxis: {
      ...baseTheme.xAxis,
      categories: Object.keys(stats.typeCounts),
    },
    plotOptions: {
      column: { borderRadius: 4, borderWidth: 0, color: COLORS.violet },
    },
    series: [{ name: 'Devices', data: Object.values(stats.typeCounts), showInLegend: false }],
  };

  const alertTrendOptions = {
    ...baseTheme,
    chart: { ...baseTheme.chart, type: 'area', height: 260 },
    xAxis: {
      ...baseTheme.xAxis,
      categories: stats.alertTrend.map((d) => d.label),
    },
    plotOptions: {
      area: { fillOpacity: 0.18, marker: { enabled: false } },
    },
    series: [
      { name: 'Warning alerts', data: stats.alertTrend.map((d) => d.warning), color: COLORS.amber },
      { name: 'Critical alerts', data: stats.alertTrend.map((d) => d.critical), color: COLORS.red },
    ],
  };

  return (
    <div className="ind-dashboard">
      <div className="ind-dashboard__head">
        <h1>Fleet overview</h1>
        <p>Live snapshot of registered RAN devices across all regions.</p>
      </div>

      <div className="ind-kpi-row">
        <KpiCard label="Total devices" value={stats.totalDevices} accent={COLORS.violet} />
        <KpiCard
          label="Online"
          value={stats.statusCounts.online}
          accent={COLORS.cyan}
          sub={`${Math.round((stats.statusCounts.online / stats.totalDevices) * 100)}% of fleet`}
        />
        <KpiCard label="Open incidents" value={stats.openIncidents} accent={COLORS.red} />
        <KpiCard label="Avg. uptime" value={`${stats.avgUptimePct}%`} accent={COLORS.amber} sub="Trailing 30 days" />
      </div>

      <div className="ind-chart-grid">
        <div className="ind-card">
          <h2>Status distribution</h2>
          <HighchartsReact highcharts={Highcharts} options={statusPieOptions} />
        </div>
        <div className="ind-card">
          <h2>Devices by type</h2>
          <HighchartsReact highcharts={Highcharts} options={typeColumnOptions} />
        </div>
        <div className="ind-card ind-card--wide">
          <h2>Alert trend (7 days)</h2>
          <HighchartsReact highcharts={Highcharts} options={alertTrendOptions} />
        </div>
      </div>
    </div>
  );
}
