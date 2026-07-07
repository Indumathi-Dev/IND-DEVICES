import { getDevices } from './devicesApi.js';

function seededRand(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

export async function getDashboardStats() {
  await new Promise(r => setTimeout(r, 400));
  const { items } = await getDevices({ page: 1, pageSize: 10000 });
  const statusCounts = { online: 0, warning: 0, offline: 0 };
  const typeCounts = {};
  const regionCounts = {};
  items.forEach(d => {
    statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
    typeCounts[d.type] = (typeCounts[d.type] || 0) + 1;
    regionCounts[d.region] = (regionCounts[d.region] || 0) + 1;
  });
  const rand = seededRand(42);
  const today = new Date();
  const alertTrend = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today); day.setDate(today.getDate() - (6 - i));
    return { label: day.toLocaleDateString(undefined, { weekday: 'short' }), critical: Math.round(rand() * 6), warning: Math.round(rand() * 12) + 2 };
  });
  return {
    totalDevices: items.length,
    statusCounts,
    typeCounts,
    regionCounts,
    alertTrend,
    avgUptimePct: 98.4,
    openIncidents: statusCounts.offline + Math.round(statusCounts.warning / 2),
  };
}
