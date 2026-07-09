'use strict'
/**
 * server/src/apps/devices/controller/devices.js
 *
 * PRODUCTION request handlers — mirrors scheduler.ts exactly:
 *   - Imports the shared axios instance from httpsInterceptor.js
 *   - Uses a versioned endpoint constant (schedulesEndPoint → devicesEndPoint)
 *   - Each handler: extracts params → calls api.* → proxies response
 *   - Identical error-handling shape to the mock handlers
 *
 * Swapped in by devices_route.js when MODE !== DEVELOPMENT.
 */

const api              = require('../../../route/httpsInterceptor')
const devicesEndPoint  = 'v2/devices'   // mirrors schedulesEndPoint = 'v2/schedules'

// ── GET list (mirrors getSchedulesList) ──────────────────────────────────────
const getDevicesList = async (req, res) => {
  try {
    const params   = new URLSearchParams(req.query)
    const response = await api.get(`${devicesEndPoint}?${params.toString()}`)
    res.status(response.status).json(response.data)
  } catch (err) {
    if (!err.response) return res.status(500).json({ message: err.message })
    res.status(err.response.status).json({ message: err.response.data })
  }
}

// ── GET stats (mirrors getSchedulesSummary) ───────────────────────────────────
const getDeviceStats = async (req, res) => {
  try {
    const response = await api.get(`${devicesEndPoint}/stats`)
    res.status(response.status).json(response.data)
  } catch (err) {
    if (!err.response) return res.status(500).json({ message: err.message })
    res.status(err.response.status).json({ message: err.response.data })
  }
}

// ── POST create (mirrors createSchedule) ─────────────────────────────────────
const createDevice = async (req, res) => {
  try {
    const response = await api.post(devicesEndPoint, req.body)
    res.status(200).json(response.data)
  } catch (err) {
    if (!err.response)
      return res.status(500).json({ message: "Couldn't make request to server, connection refused." })
    res.status(err.response.status).json({ message: err.response.data })
  }
}

// ── PUT update (mirrors updateSchedule) ──────────────────────────────────────
const updateDevice = async (req, res) => {
  try {
    const response = await api.put(
      `${devicesEndPoint}/${req.params.deviceId}`,
      req.body
    )
    res.status(200).json(response.data)
  } catch (err) {
    if (!err.response)
      return res.status(500).json({ message: "Couldn't make request to server, connection refused." })
    res.status(err.response.status).json({ message: err.response.data })
  }
}

// ── DELETE (mirrors deleteSchedule) ──────────────────────────────────────────
const deleteDevice = async (req, res) => {
  try {
    const deviceId = req.params.deviceId || req.url.split('/').pop()
    const response = await api.delete(`${devicesEndPoint}/${deviceId}`)
    res.status(200).json(response.data)
  } catch (err) {
    if (!err.response)
      return res.status(500).json({ message: "Couldn't make request to server, connection refused." })
    res.status(err.response.status).json({ message: err.response.data })
  }
}

module.exports = { getDevicesList, getDeviceStats, createDevice, updateDevice, deleteDevice }
