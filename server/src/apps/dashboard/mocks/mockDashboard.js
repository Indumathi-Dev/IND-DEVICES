'use strict'
/**
 * server/src/apps/dashboard/mocks/mockDashboard.js
 *
 * Mock handlers — mirrors mockScheduler.ts error shape exactly.
 * New handler: getCarbonTrendByRegion — drives the Region-filtered
 * Highcharts carbon chart on the dashboard.
 */

const mockDashboardStats             = require('./mockDashboardStats.json')
const mockDevicesList                = require('../../devices/mocks/mockDevicesList.json')
const logger                         = require('../../../logger/logger')
const { buildWeeklyTrend, buildRegionSummary, enrichWithCarbon } = require('../../../utils/carbonUtils')

function handleErr(res, err) {
  console.log(err)
  if (err && err.name === 'ZodError') {
    return res.status(500).json({ message: err.issues })
  } else if (!err.response) {
    return res.status(500).json({ message: err.message || err })
  } else {
    return res.status(err.response.status).json({ message: err.response.data })
  }
}

// ── GET /home/dashboard/getStats/stats ───────────────────────────────────────
const getDashboardStats = async (req, res) => {
  try {
    const devices      = mockDevicesList.devices
    const StatusCounts = { online: 0, warning: 0, offline: 0 }
    const TypeCounts   = {}
    const RegionCounts = {}

    devices.forEach(d => {
      StatusCounts[d.Status]   = (StatusCounts[d.Status]   || 0) + 1
      TypeCounts[d.DeviceType] = (TypeCounts[d.DeviceType] || 0) + 1
      RegionCounts[d.Region]   = (RegionCounts[d.Region]   || 0) + 1
    })

    logger.info({ status: 200, logMessage: 'RESPONSE RECEIVED' })
    res.status(200).json({
      TotalDevices:  devices.length,
      StatusCounts,
      TypeCounts,
      RegionCounts,
      AlertTrend:    mockDashboardStats.AlertTrend,
      AvgUptimePct:  mockDashboardStats.AvgUptimePct,
      OpenIncidents: StatusCounts.offline + Math.round((StatusCounts.warning || 0) / 2),
    })
  } catch (err) { handleErr(res, err) }
}

// ── GET /home/dashboard/getAlertTrend/stats/trend ───────────────────────────
const getAlertTrend = async (req, res) => {
  try {
    logger.info({ status: 200, logMessage: 'RESPONSE RECEIVED' })
    res.status(200).json(mockDashboardStats.AlertTrend)
  } catch (err) { handleErr(res, err) }
}

// ── GET /home/dashboard/getCarbonTrend/stats/carbon?region=all|<Region> ──────
//
// Returns:
//   RegionSummary[]  — total/avg CO₂ per region (always returned)
//   WeeklyTrend[]    — 7-day CO₂ history:
//                        region=all  → { Day, North, South, East, West, Central }
//                        region=X    → { Day, TotalCarbonKgPerDay }
//   DeviceBreakdown[]— per-device breakdown (only when a specific region is selected)
//
const getCarbonTrendByRegion = async (req, res) => {
  try {
    const region  = req.query.region || 'all'
    const devices = mockDevicesList.devices

    const RegionSummary  = buildRegionSummary(devices)
    const WeeklyTrend    = buildWeeklyTrend(devices, region)

    // Per-device carbon breakdown for the selected region (not shown for 'all')
    let DeviceBreakdown = []
    if (region !== 'all') {
      DeviceBreakdown = devices
        .filter(d => d.Region === region)
        .map(d => {
          const enriched = enrichWithCarbon(d)
          return {
            DeviceId:             d.DeviceId,
            DeviceName:           d.DeviceName,
            DeviceType:           d.DeviceType,
            Status:               d.Status,
            PowerConsumedWatts:   d.PowerControl?.[0]?.PowerConsumedWatts   ?? 0,
            AverageConsumedWatts: d.PowerControl?.[0]?.AverageConsumedWatts ?? 0,
            CarbonEmissionKgPerDay: enriched.CarbonEmissionKgPerDay,
          }
        })
        .sort((a, b) => b.CarbonEmissionKgPerDay - a.CarbonEmissionKgPerDay)
    }

    logger.info({ status: 200, logMessage: 'RESPONSE RECEIVED' })
    res.status(200).json({ region, RegionSummary, WeeklyTrend, DeviceBreakdown })
  } catch (err) { handleErr(res, err) }
}

module.exports = { getDashboardStats, getAlertTrend, getCarbonTrendByRegion }
