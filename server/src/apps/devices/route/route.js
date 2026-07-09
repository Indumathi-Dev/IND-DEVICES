'use strict'
/**
 * server/src/apps/devices/route/route.js
 *
 * Mirrors scheduler_route.ts pattern exactly:
 *
 *   1.  Import real controller functions as the default handlers
 *   2.  If MODE === 'DEVELOPMENT', overwrite each binding with the
 *       corresponding mock handler (same function signature)
 *   3.  Register routes on the shared router instance
 *
 * URL pattern mirrors scheduler_route.ts:
 *   /home/scheduler/getSchedulesList/schedules
 *   /home/devices/getDevicesList/devices
 *
 * Dynamically imported by server/src/index.js via the DTIAS-style
 * dynamic route loader: import(`./apps/${appName}/route/route.js`)
 */

const router = require('express').Router()

// ── 1. Default to real (production) handlers ──────────────────────────────────
//    mirrors: import { getSchedulesList as getSchedulesListAPI, ... } from '../controller/scheduler.js'
let {
  getDevicesList,
  getDeviceStats,
  createDevice,
  updateDevice,
  deleteDevice,
} = require('../controller/devices')

// ── 2. MODE-gate — swap to mock handlers in DEVELOPMENT ───────────────────────
//    mirrors: if (process.env.MODE == 'DEVELOPMENT') { const { ... } = await import(...) }
if (process.env.MODE === 'DEVELOPMENT') {
  const mock = require('../mocks/mockDevices')
  getDevicesList = mock.getDevicesList
  getDeviceStats = mock.getDeviceStats
  createDevice   = mock.createDevice
  updateDevice   = mock.updateDevice
  deleteDevice   = mock.deleteDevice
}

// ── 3. Register routes ────────────────────────────────────────────────────────
//    URL pattern: /home/{app}/{handlerName}/{resourceName}[/:param]
//    mirrors scheduler_route.ts:
//      router.get('/home/scheduler/getSchedulesList/schedules', getSchedulesList)

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
