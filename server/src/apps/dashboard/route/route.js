'use strict'
/**
 * server/src/apps/dashboard/route/route.js
 * Mirrors scheduler_route.ts: MODE-gate + URL pattern /home/dashboard/action/resource
 */
const router = require('express').Router()

let { getDashboardStats, getAlertTrend, getCarbonTrendByRegion } =
      require('../controller/dashboard')

if (process.env.MODE === 'DEVELOPMENT') {
  const mock = require('../mocks/mockDashboard')
  getDashboardStats        = mock.getDashboardStats
  getAlertTrend            = mock.getAlertTrend
  getCarbonTrendByRegion   = mock.getCarbonTrendByRegion
}

router.get('/home/dashboard/getStats/stats',                   getDashboardStats)
router.get('/home/dashboard/getAlertTrend/stats/trend',        getAlertTrend)
router.get('/home/dashboard/getCarbonTrend/stats/carbon',      getCarbonTrendByRegion)

module.exports = router
