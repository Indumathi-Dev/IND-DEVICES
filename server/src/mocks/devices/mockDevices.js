'use strict'
/**
 * mockDevices.js
 *
 * Mock request handlers for the Devices module.
 * Mirrors the pattern in mockScheduler.ts:
 *   - Imports static JSON fixtures
 *   - Logs response receipt
 *   - Implements server-side filtering and pagination
 *   - Consistent error handling (zod-style bucket)
 *
 * Selected by scheduler_route.ts's MODE-gate when MODE=DEVELOPMENT.
 */

const mockDevicesList = require('./mockDevicesList.json')

// In-memory store so create/update/delete mutations survive
// for the lifetime of the server process (reset on restart).
let store = JSON.parse(JSON.stringify(mockDevicesList.devices))

function log(status, action) {
  console.log(JSON.stringify({ status, logMessage: 'RESPONSE RECEIVED', action, ts: new Date().toISOString() }))
}

function handleErr(res, err) {
  console.error(err)
  if (!err.response) {
    return res.status(500).json({ message: err.message || err })
  }
  return res.status(err.response.status).json({ message: err.response.data })
}

// ── GET /home/devices/getDevicesList/devices ─────────────────────────────────
const getDevicesList = async (req, res) => {
  try {
    const { page = '1', pageSize = '10', search = '', status = 'all' } = req.query
    let filtered = [...store]

    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        d =>
          d.DeviceName.toLowerCase().includes(q) ||
          d.DeviceId.toLowerCase().includes(q)  ||
          d.IPAddress.includes(q)               ||
          d.DeviceType.toLowerCase().includes(q)||
          d.Region.toLowerCase().includes(q)
      )
    }
    if (status !== 'all') {
      filtered = filtered.filter(d => d.Status === status)
    }

    const totalCount = filtered.length
    const p  = Math.max(1, parseInt(page, 10))
    const ps = Math.max(1, parseInt(pageSize, 10))
    const devices = filtered.slice((p - 1) * ps, p * ps)

    log(200, 'getDevicesList')
    res.status(200).json({ devices, totalCount, page: p, pageSize: ps })
  } catch (err) {
    handleErr(res, err)
  }
}

// ── GET /home/devices/getDeviceStats/devices/stats ───────────────────────────
const getDeviceStats = async (req, res) => {
  try {
    const statusCounts = { online: 0, warning: 0, offline: 0 }
    const typeCounts   = {}
    const regionCounts = {}

    store.forEach(d => {
      statusCounts[d.Status]  = (statusCounts[d.Status]  || 0) + 1
      typeCounts[d.DeviceType]= (typeCounts[d.DeviceType]|| 0) + 1
      regionCounts[d.Region]  = (regionCounts[d.Region]  || 0) + 1
    })

    log(200, 'getDeviceStats')
    res.status(200).json({
      TotalDevices: store.length,
      StatusCounts: statusCounts,
      TypeCounts:   typeCounts,
      RegionCounts: regionCounts,
    })
  } catch (err) {
    handleErr(res, err)
  }
}

// ── POST /home/devices/createDevice/devices ──────────────────────────────────
const createDevice = async (req, res) => {
  try {
    const body = req.body
    const newDevice = {
      DeviceId:   `DEV-${1000 + store.length + 1}`,
      DeviceName: body.DeviceName  || body.name        || 'Unknown',
      DeviceType: body.DeviceType  || body.type        || 'gNodeB',
      IPAddress:  body.IPAddress   || body.ipAddress   || '0.0.0.0',
      Region:     body.Region      || body.region      || 'North',
      Status:     body.Status      || body.status      || 'online',
      Firmware:   body.Firmware    || body.firmware    || 'v1.0.0',
      Tenant:     body.Tenant      || body.tenant      || 'TenantA',
      LastSeen:   new Date().toISOString(),
    }
    store.unshift(newDevice)
    log(200, 'createDevice')
    res.status(200).json(newDevice)
  } catch (err) {
    handleErr(res, err)
  }
}

// ── PUT /home/devices/updateDevice/devices/:deviceId ─────────────────────────
const updateDevice = async (req, res) => {
  try {
    const { deviceId } = req.params
    const idx = store.findIndex(d => d.DeviceId === deviceId)
    if (idx === -1) return res.status(404).json({ message: `Device ${deviceId} not found` })

    store[idx] = { ...store[idx], ...req.body }
    log(200, 'updateDevice')
    res.status(200).json(store[idx])
  } catch (err) {
    handleErr(res, err)
  }
}

// ── DELETE /home/devices/deleteDevice/devices/:deviceId ──────────────────────
const deleteDevice = async (req, res) => {
  try {
    const deviceId = req.params.deviceId || req.url.split('/').pop()
    const before = store.length
    store = store.filter(d => d.DeviceId !== deviceId)
    if (store.length === before) return res.status(404).json({ message: `Device ${deviceId} not found` })

    log(200, 'deleteDevice')
    res.status(200).json({ message: 'Successfully deleted Device', DeviceId: deviceId })
  } catch (err) {
    handleErr(res, err)
  }
}

module.exports = { getDevicesList, getDeviceStats, createDevice, updateDevice, deleteDevice }
