'use strict'
/**
 * mockDashboard.js
 *
 * Mock handlers for the Dashboard module.
 * Mirrors mockScheduler.ts pattern — imports static fixtures,
 * logs, returns aggregated telemetry data used by Highcharts widgets.
 */

const mockDashboardStats = require('./mockDashboardStats.json')
const mockDevicesList    = require('../devices/mockDevicesList.json')

function log(status, action) {
  console.log(JSON.stringify({ status, logMessage: 'RESPONSE RECEIVED', action, ts: new Date().toISOString() }))
}

function handleErr(res, err) {
  console.error(err)
  if (!err.response) return res.status(500).json({ message: err.message || err })
  return res.status(err.response.status).json({ message: err.response.data })
}

// ── GET /home/dashboard/getStats/stats ───────────────────────────────────────
const getDashboardStats = async (req, res) => {
  try {
    // Derive live counts from the device store so dashboard + table stay in sync
    const devices = mockDevicesList.devices
    const StatusCounts  = { online: 0, warning: 0, offline: 0 }
    const TypeCounts    = {}
    const RegionCounts  = {}

    devices.forEach(d => {
      StatusCounts[d.Status]   = (StatusCounts[d.Status]   || 0) + 1
      TypeCounts[d.DeviceType] = (TypeCounts[d.DeviceType] || 0) + 1
      RegionCounts[d.Region]   = (RegionCounts[d.Region]   || 0) + 1
    })

    const data = {
      ...mockDashboardStats,
      TotalDevices: devices.length,
      StatusCounts,
      TypeCounts,
      RegionCounts,
      OpenIncidents: StatusCounts.offline + Math.round(StatusCounts.warning / 2),
    }

    log(200, 'getDashboardStats')
    res.status(200).json(data)
  } catch (err) {
    handleErr(res, err)
  }
}

// ── GET /home/dashboard/getAlertTrend/stats/trend ────────────────────────────
const getAlertTrend = async (req, res) => {
  try {
    log(200, 'getAlertTrend')
    res.status(200).json({ AlertTrend: mockDashboardStats.AlertTrend })
  } catch (err) {
    handleErr(res, err)
  }
}

module.exports = { getDashboardStats, getAlertTrend }
