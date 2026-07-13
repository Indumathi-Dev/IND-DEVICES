'use strict'
/**
 * server/src/apps/devices/mocks/mockDevices.js
 *
 * Mock handlers — mirrors mockScheduler.ts exactly:
 *   ✓ logger.info({ status, logMessage }) on every success
 *   ✓ Three-bucket error handler: ZodError | no-response | has-response
 *
 * Carbon emission is calculated per device using carbonUtils.enrichWithCarbon()
 * so every item in the list response carries CarbonEmissionKgPerDay derived
 * live from its PowerControl[].AverageConsumedWatts and Region.
 */

const mockDevicesList                = require('./mockDevicesList.json')
const logger                         = require('../../../logger/logger')
const { enrichWithCarbon }           = require('../../../utils/carbonUtils')

// In-memory mutable store — deep clone so require() cache is never mutated
let store = JSON.parse(JSON.stringify(mockDevicesList.devices))

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

// ── GET /home/devices/getDevicesList/devices ──────────────────────────────────
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
    if (status !== 'all') filtered = filtered.filter(d => d.Status === status)

    const totalCount = filtered.length
    const p          = Math.max(1, parseInt(page, 10))
    const ps         = Math.max(1, parseInt(pageSize, 10))

    // Enrich each device with live CarbonEmissionKgPerDay
    const devices = filtered
      .slice((p - 1) * ps, p * ps)
      .map(enrichWithCarbon)

    logger.info({ status: 200, logMessage: 'RESPONSE RECEIVED' })
    res.status(200).json({ devices, totalCount, page: p, pageSize: ps })
  } catch (err) { handleErr(res, err) }
}

// ── GET /home/devices/getDeviceStats/devices/stats ────────────────────────────
const getDeviceStats = async (req, res) => {
  try {
    const StatusCounts = { online: 0, warning: 0, offline: 0 }
    const TypeCounts   = {}
    const RegionCounts = {}

    store.forEach(d => {
      StatusCounts[d.Status]   = (StatusCounts[d.Status]   || 0) + 1
      TypeCounts[d.DeviceType] = (TypeCounts[d.DeviceType] || 0) + 1
      RegionCounts[d.Region]   = (RegionCounts[d.Region]   || 0) + 1
    })

    logger.info({ status: 200, logMessage: 'RESPONSE RECEIVED' })
    res.status(200).json({ TotalDevices: store.length, StatusCounts, TypeCounts, RegionCounts })
  } catch (err) { handleErr(res, err) }
}

// ── POST /home/devices/createDevice/devices ───────────────────────────────────
const createDevice = async (req, res) => {
  try {
    const b = req.body
    const newDevice = {
      DeviceId:   `DEV-${1000 + store.length + 1}`,
      DeviceName:  b.DeviceName  || b.name      || 'Unknown',
      DeviceType:  b.DeviceType  || b.type      || 'gNodeB',
      IPAddress:   b.IPAddress   || b.ipAddress || '0.0.0.0',
      Region:      b.Region      || b.region    || 'North',
      Status:      b.Status      || b.status    || 'online',
      Firmware:    b.Firmware    || b.firmware  || 'v1.0.0',
      Tenant:      b.Tenant      || b.tenant    || 'TenantA',
      CreatedBy:   b.CreatedBy   || 'operator',
      LastSeen:    new Date().toISOString(),
      PowerControl: b.PowerControl || [{ PowerConsumedWatts: 250, AverageConsumedWatts: 220 }],
    }
    store.unshift(newDevice)

    logger.info({ status: 200, logMessage: 'RESPONSE RECEIVED' })
    res.status(200).json(enrichWithCarbon(newDevice))
  } catch (err) {
    if (!err.response) return res.status(500).json({ message: "Couldn't make request to server, connection refused." })
    res.status(err.response.status).json({ message: err.response.data })
  }
}

// ── PUT /home/devices/updateDevice/devices/:deviceId ─────────────────────────
const updateDevice = async (req, res) => {
  try {
    const { deviceId } = req.params
    const idx = store.findIndex(d => d.DeviceId === deviceId)
    if (idx === -1) return res.status(404).json({ message: `Device ${deviceId} not found` })

    store[idx] = { ...store[idx], ...req.body }

    logger.info({ status: 200, logMessage: 'RESPONSE RECEIVED' })
    res.status(200).json(enrichWithCarbon(store[idx]))
  } catch (err) {
    if (!err.response) return res.status(500).json({ message: "Couldn't make request to server, connection refused." })
    res.status(err.response.status).json({ message: err.response.data })
  }
}

// ── DELETE /home/devices/deleteDevice/devices/:deviceId ──────────────────────
const deleteDevice = async (req, res) => {
  try {
    const deviceId = req.params.deviceId || req.url.split('/').pop()
    const before   = store.length
    store          = store.filter(d => d.DeviceId !== deviceId)
    if (store.length === before) return res.status(404).json({ message: `Device ${deviceId} not found` })

    logger.info({ status: 200, logMessage: 'RESPONSE RECEIVED' })
    res.status(200).json('Successfully deleted Device')
  } catch (err) {
    if (!err.response) return res.status(500).json({ message: "Couldn't make request to server, connection refused." })
    res.status(err.response.status).json({ message: err.response.data })
  }
}

module.exports = { getDevicesList, getDeviceStats, createDevice, updateDevice, deleteDevice }
