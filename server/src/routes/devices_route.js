'use strict'
/**
 * devices_route.js
 *
 * Mirrors scheduler_route.ts EXACTLY:
 *  1. Import real controller handlers as defaults
 *  2. If MODE=DEVELOPMENT, overwrite with mock handlers (same function signatures)
 *  3. Register routes using /home/{app}/{action}/{resource} URL pattern
 *
 * Route pattern: /home/devices/{handlerName}/{resourceName}[/:param]
 */

const express = require('express')
const router  = express.Router()

// ── 1. Default to real (production) handlers ─────────────────────────────────
let {
  getDevicesList,
  getDeviceStats,
  createDevice,
  updateDevice,
  deleteDevice,
} = require('../controllers/devices')

// ── 2. MODE-gate: swap to mock handlers in DEVELOPMENT ───────────────────────
//    Mirrors: if (process.env.MODE == 'DEVELOPMENT') { const { ... } = await import(...) }
if (process.env.MODE === 'DEVELOPMENT') {
  const mockHandlers = require('../mocks/devices/mockDevices')
  getDevicesList = mockHandlers.getDevicesList
  getDeviceStats = mockHandlers.getDeviceStats
  createDevice   = mockHandlers.createDevice
  updateDevice   = mockHandlers.updateDevice
  deleteDevice   = mockHandlers.deleteDevice
}

// ── 3. Register routes (/home/devices/{action}/{resource}) ───────────────────
router.get(
  '/home/devices/getDevicesList/devices',
  getDevicesList
)
router.get(
  '/home/devices/getDeviceStats/devices/stats',
  getDeviceStats
)
router.post(
  '/home/devices/createDevice/devices',
  createDevice
)
router.put(
  '/home/devices/updateDevice/devices/:deviceId',
  updateDevice
)
router.delete(
  '/home/devices/deleteDevice/devices/:deviceId?',
  deleteDevice
)

module.exports = router
