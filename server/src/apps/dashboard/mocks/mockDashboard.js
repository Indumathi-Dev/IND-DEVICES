'use strict'
/**
 * server/src/apps/dashboard/mocks/mockDashboard.js
 *
 * Mock request handlers for the Dashboard module.
 *
 * Mirrors mockScheduler.ts EXACTLY:
 *   ✓ Imports static JSON fixture  (mockSchedulesList.json → mockDashboardStats.json)
 *   ✓ logger.info({ status, logMessage }) on every success path
 *   ✓ Three-bucket error handler: ZodError | no-response | has-response
 *   ✓ Same async (req, res) => Promise<any> signature
 *   ✓ Same named-export shape
 *
 * Live StatusCounts / TypeCounts / RegionCounts are derived from the device
 * store at request time so the dashboard charts always match the devices table —
 * the same consistency guarantee a real aggregation endpoint would provide.
 *
 * Selected by dashboard_route.js when process.env.MODE === 'DEVELOPMENT'.
 */

const mockDashboardStats = require('./mockDashboardStats.json')
const mockDevicesList    = require('../../devices/mocks/mockDevicesList.json')
const logger             = require('../../../logger/logger')

// ── Shared error handler — mirrors mockScheduler.ts catch blocks ──────────────
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
// mirrors: getSchedulesSummary — aggregated fleet telemetry for KPI cards + charts
const getDashboardStats = async (req, res) => {
  try {
    // Derive live counts from the device fixture so dashboard + table stay in sync
    const devices       = mockDevicesList.devices
    const StatusCounts  = { online: 0, warning: 0, offline: 0 }
    const TypeCounts    = {}
    const RegionCounts  = {}

    devices.forEach(d => {
      StatusCounts[d.Status]    = (StatusCounts[d.Status]    || 0) + 1
      TypeCounts[d.DeviceType]  = (TypeCounts[d.DeviceType]  || 0) + 1
      RegionCounts[d.Region]    = (RegionCounts[d.Region]    || 0) + 1
    })

    const data = {
      TotalDevices:  devices.length,
      StatusCounts,
      TypeCounts,
      RegionCounts,
      AlertTrend:    mockDashboardStats.AlertTrend,
      AvgUptimePct:  mockDashboardStats.AvgUptimePct,
      OpenIncidents: StatusCounts.offline + Math.round((StatusCounts.warning || 0) / 2),
    }

    const message = { status: 200, logMessage: 'RESPONSE RECEIVED' }
    logger.info(message)
    res.status(200).json(data)
  } catch (err) {
    handleErr(res, err)
  }
}

// ── GET /home/dashboard/getAlertTrend/stats/trend ────────────────────────────
// mirrors: getSchedulesJobs — time-series sub-resource of the parent entity
const getAlertTrend = async (req, res) => {
  try {
    const data = mockDashboardStats.AlertTrend

    const message = { status: 200, logMessage: 'RESPONSE RECEIVED' }
    logger.info(message)
    res.status(200).json(data)
  } catch (err) {
    handleErr(res, err)
  }
}

module.exports = { getDashboardStats, getAlertTrend }
