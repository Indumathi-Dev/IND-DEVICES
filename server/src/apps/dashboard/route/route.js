'use strict'
/**
 * server/src/apps/dashboard/route/route.js
 *
 * Mirrors scheduler_route.ts pattern exactly:
 *   1. Import real controller as default
 *   2. MODE-gate: swap to mock handlers when MODE === 'DEVELOPMENT'
 *   3. Register routes with /home/{app}/{action}/{resource} pattern
 *
 * Dynamically imported by server/src/index.js:
 *   const mod = require(`./apps/${appName}/route/route.js`)
 *   app.use('/api', mod)
 */

const router = require('express').Router()

// ── 1. Default to real (production) handlers ──────────────────────────────────
let {
  getDashboardStats,
  getAlertTrend,
} = require('../controller/dashboard')

// ── 2. MODE-gate ──────────────────────────────────────────────────────────────
//    mirrors: if (process.env.MODE == 'DEVELOPMENT') { ... }
if (process.env.MODE === 'DEVELOPMENT') {
  const mock = require('../mocks/mockDashboard')
  getDashboardStats = mock.getDashboardStats
  getAlertTrend     = mock.getAlertTrend
}

// ── 3. Register routes ────────────────────────────────────────────────────────
//    mirrors scheduler_route.ts:
//      router.get('/home/scheduler/getSchedulesSummary/schedules/jobs/summary/since/:since?', ...)

router.get(
  '/home/dashboard/getStats/stats',
  getDashboardStats
)
router.get(
  '/home/dashboard/getAlertTrend/stats/trend',
  getAlertTrend
)

module.exports = router
