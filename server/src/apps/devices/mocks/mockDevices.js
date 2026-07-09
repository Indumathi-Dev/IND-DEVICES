'use strict'
/**
 * server/src/apps/devices/mocks/mockDevices.js
 *
 * Mock request handlers for the Devices module.
 *
 * Mirrors mockScheduler.ts EXACTLY:
 *   ✓ Imports static JSON fixture  (mockSchedulesList.json → mockDevicesList.json)
 *   ✓ logger.info({ status, logMessage }) on every success
 *   ✓ Three-bucket error handler: ZodError | no-response | has-response
 *   ✓ Same async function signature: (req, res) => Promise<any>
 *   ✓ Same export shape: named exports per handler
 *
 * In-memory store initialised from fixture so mutations (create/update/delete)
 * persist for the lifetime of the server process and reset on restart —
 * same behaviour as the scheduler mock's stateless approach.
 *
 * Selected by devices_route.js when process.env.MODE === 'DEVELOPMENT'.
 */

const mockDevicesList = require('./mockDevicesList.json')
const logger          = require('../../../logger/logger')

// In-memory mutable store — deep clone so we never mutate the require() cache
let store = JSON.parse(JSON.stringify(mockDevicesList.devices))

// ── Shared error handler (mirrors mockScheduler.ts catch blocks) ─────────────
function handleErr(res, err) {
  console.log(err)
  // Simulate z.ZodError check from the reference
  if (err && err.name === 'ZodError') {
    return res.status(500).json({ message: err.issues })
  } else if (!err.response) {
    return res.status(500).json({ message: err.message || err })
  } else {
    return res.status(err.response.status).json({ message: err.response.data })
  }
}

// ── GET /home/devices/getDevicesList/devices ─────────────────────────────────
// mirrors: getSchedulesList — returns list with server-side filter + pagination
const getDevicesList = async (req, res) => {
  try {
    const { page = '1', pageSize = '10', search = '', status = 'all' } = req.query
    let filtered = [...store]

    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(d =>
        d.DeviceName.toLowerCase().includes(q) ||
        d.DeviceId.toLowerCase().includes(q)   ||
        d.IPAddress.includes(q)                ||
        d.DeviceType.toLowerCase().includes(q) ||
        d.Region.toLowerCase().includes(q)
      )
    }
    if (status !== 'all') {
      filtered = filtered.filter(d => d.Status === status)
    }

    const totalCount = filtered.length
    const p  = Math.max(1, parseInt(page,     10))
    const ps = Math.max(1, parseInt(pageSize, 10))
    const devices = filtered.slice((p - 1) * ps, p * ps)

    const message = { status: 200, logMessage: 'RESPONSE RECEIVED' }
    logger.info(message)
    res.status(200).json({ devices, totalCount, page: p, pageSize: ps })
  } catch (err) {
    handleErr(res, err)
  }
}

// ── GET /home/devices/getDeviceStats/devices/stats ───────────────────────────
// mirrors: getSchedulesSummary — aggregated telemetry used by Dashboard charts
const getDeviceStats = async (req, res) => {
  try {
    const StatusCounts  = { online: 0, warning: 0, offline: 0 }
    const TypeCounts    = {}
    const RegionCounts  = {}

    store.forEach(d => {
      StatusCounts[d.Status]    = (StatusCounts[d.Status]    || 0) + 1
      TypeCounts[d.DeviceType]  = (TypeCounts[d.DeviceType]  || 0) + 1
      RegionCounts[d.Region]    = (RegionCounts[d.Region]    || 0) + 1
    })

    const message = { status: 200, logMessage: 'RESPONSE RECEIVED' }
    logger.info(message)
    res.status(200).json({
      TotalDevices: store.length,
      StatusCounts,
      TypeCounts,
      RegionCounts,
    })
  } catch (err) {
    handleErr(res, err)
  }
}

// ── POST /home/devices/createDevice/devices ──────────────────────────────────
// mirrors: createSchedule → res.status(200).json('Successfully Created Resource Group')
const createDevice = async (req, res) => {
  try {
    const body = req.body
    const newDevice = {
      DeviceId:   `DEV-${1000 + store.length + 1}`,
      DeviceName: body.DeviceName  || body.name       || 'Unknown',
      DeviceType: body.DeviceType  || body.type       || 'gNodeB',
      IPAddress:  body.IPAddress   || body.ipAddress  || '0.0.0.0',
      Region:     body.Region      || body.region     || 'North',
      Status:     body.Status      || body.status     || 'online',
      Firmware:   body.Firmware    || body.firmware   || 'v1.0.0',
      Tenant:     body.Tenant      || body.tenant     || 'TenantA',
      CreatedBy:  body.CreatedBy   || 'operator',
      LastSeen:   new Date().toISOString(),
    }
    store.unshift(newDevice)

    const message = { status: 200, logMessage: 'RESPONSE RECEIVED' }
    logger.info(message)
    res.status(200).json(newDevice)
  } catch (err) {
    if (!err.response) {
      return res.status(500).json({ message: "Couldn't make request to server, connection refused." })
    }
    res.status(err.response.status).json({ message: err.response.data })
  }
}

// ── PUT /home/devices/updateDevice/devices/:deviceId ─────────────────────────
// mirrors: updateSchedule → res.status(200).json('successfully updated Schedule')
const updateDevice = async (req, res) => {
  try {
    const { deviceId } = req.params
    const idx = store.findIndex(d => d.DeviceId === deviceId)
    if (idx === -1)
      return res.status(404).json({ message: `Device ${deviceId} not found` })

    store[idx] = { ...store[idx], ...req.body }

    const message = { status: 200, logMessage: 'RESPONSE RECEIVED' }
    logger.info(message)
    res.status(200).json(store[idx])
  } catch (err) {
    if (!err.response) {
      return res.status(500).json({ message: "Couldn't make request to server, connection refused." })
    }
    res.status(err.response.status).json({ message: err.response.data })
  }
}

// ── DELETE /home/devices/deleteDevice/devices/:deviceId ──────────────────────
// mirrors: deleteSchedule → res.status(200).json('Successfully deleted Schedule')
const deleteDevice = async (req, res) => {
  try {
    const deviceId = req.params.deviceId || req.url.split('/').pop()
    const before   = store.length
    store          = store.filter(d => d.DeviceId !== deviceId)

    if (store.length === before)
      return res.status(404).json({ message: `Device ${deviceId} not found` })

    const message = { status: 200, logMessage: 'RESPONSE RECEIVED' }
    logger.info(message)
    res.status(200).json('Successfully deleted Device')
  } catch (err) {
    if (!err.response) {
      return res.status(500).json({ message: "Couldn't make request to server, connection refused." })
    }
    res.status(err.response.status).json({ message: err.response.data })
  }
}

module.exports = { getDevicesList, getDeviceStats, createDevice, updateDevice, deleteDevice }
