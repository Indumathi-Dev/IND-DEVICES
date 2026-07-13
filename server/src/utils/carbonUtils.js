'use strict'
/**
 * server/src/utils/carbonUtils.js
 *
 * Carbon emission calculation utilities shared across devices and dashboard handlers.
 *
 * Formula:
 *   CarbonEmissionKgPerDay = (AverageConsumedWatts / 1000) × 24h × CarbonIntensity
 *
 * Carbon intensity values (kg CO₂ / kWh) are sourced from regional grid data:
 *   North   → 0.48  (Northeast — higher coal/gas mix)
 *   South   → 0.42  (Southeast — natural gas dominant)
 *   East    → 0.45  (Mid-Atlantic — balanced grid)
 *   West    → 0.35  (West Coast — higher renewables share)
 *   Central → 0.52  (Midwest — highest coal dependency)
 *
 * Daily variation seeds used to generate realistic 7-day trend data
 * without requiring a time-series database.
 */

const REGION_CARBON_INTENSITY = {
  North:   0.48,
  South:   0.42,
  East:    0.45,
  West:    0.35,
  Central: 0.52,
}

const DEFAULT_INTENSITY = 0.45

/**
 * Calculate daily carbon emission for a single device.
 * @param {number} averageConsumedWatts
 * @param {string} region
 * @returns {number} kg CO₂ per day (rounded to 3 dp)
 */
function calcCarbonKgPerDay(averageConsumedWatts, region) {
  const intensity = REGION_CARBON_INTENSITY[region] || DEFAULT_INTENSITY
  return parseFloat(((averageConsumedWatts / 1000) * 24 * intensity).toFixed(3))
}

/**
 * Enrich a device object with CarbonEmissionKgPerDay derived from its
 * PowerControl array — same field added to the JSON fixture at generation time,
 * but re-derived here so mutations (updateDevice) stay consistent.
 * @param {object} device  — must have PowerControl[] and Region
 * @returns {object} device with CarbonEmissionKgPerDay added
 */
function enrichWithCarbon(device) {
  const avgWatts = device.PowerControl?.[0]?.AverageConsumedWatts ?? 0
  return {
    ...device,
    CarbonEmissionKgPerDay: calcCarbonKgPerDay(avgWatts, device.Region),
  }
}

/**
 * Generate a 7-day carbon trend for a region (or all regions).
 * Uses a deterministic pseudo-random seed so the chart looks stable across
 * reloads while still showing realistic day-to-day variation (±8 %).
 *
 * @param {object[]} devices  — full device list
 * @param {string}   region   — 'all' or a specific region name
 * @returns {object[]}  Array of { Day, TotalCarbonKgPerDay, [perRegion?] }
 */
function buildWeeklyTrend(devices, region) {
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  // ±8 % variation factors — deterministic so chart is stable
  const VARIATION = [1.0, 1.04, 0.97, 1.06, 0.99, 0.93, 1.02]

  if (region === 'all') {
    const REGIONS = Object.keys(REGION_CARBON_INTENSITY)
    return DAYS.map((day, i) => {
      const entry = { Day: day }
      REGIONS.forEach(r => {
        const total = devices
          .filter(d => d.Region === r)
          .reduce((sum, d) => {
            const avg = d.PowerControl?.[0]?.AverageConsumedWatts ?? 0
            return sum + calcCarbonKgPerDay(avg, r)
          }, 0)
        entry[r] = parseFloat((total * VARIATION[i]).toFixed(2))
      })
      return entry
    })
  }

  // Single region — return daily totals + per-device breakdown for latest day
  const regionDevices = devices.filter(d => d.Region === region)
  return DAYS.map((day, i) => {
    const total = regionDevices.reduce((sum, d) => {
      const avg = d.PowerControl?.[0]?.AverageConsumedWatts ?? 0
      return sum + calcCarbonKgPerDay(avg, region)
    }, 0)
    return {
      Day:                day,
      TotalCarbonKgPerDay: parseFloat((total * VARIATION[i]).toFixed(2)),
    }
  })
}

/**
 * Summarise carbon by region from a device list.
 * @param {object[]} devices
 * @returns {object[]} [{ Region, TotalDevices, TotalCarbonKgPerDay, AvgCarbonPerDevice }]
 */
function buildRegionSummary(devices) {
  const map = {}
  devices.forEach(d => {
    const r   = d.Region
    const avg = d.PowerControl?.[0]?.AverageConsumedWatts ?? 0
    const co2 = calcCarbonKgPerDay(avg, r)
    if (!map[r]) map[r] = { Region: r, TotalDevices: 0, TotalCarbonKgPerDay: 0 }
    map[r].TotalDevices        += 1
    map[r].TotalCarbonKgPerDay = parseFloat((map[r].TotalCarbonKgPerDay + co2).toFixed(3))
  })
  return Object.values(map).map(row => ({
    ...row,
    AvgCarbonPerDevice: parseFloat((row.TotalCarbonKgPerDay / row.TotalDevices).toFixed(3)),
    CarbonIntensity:    REGION_CARBON_INTENSITY[row.Region] || DEFAULT_INTENSITY,
  }))
}

module.exports = {
  REGION_CARBON_INTENSITY,
  calcCarbonKgPerDay,
  enrichWithCarbon,
  buildWeeklyTrend,
  buildRegionSummary,
}
