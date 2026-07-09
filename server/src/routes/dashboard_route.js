'use strict'
/**
 * dashboard_route.js  — mirrors scheduler_route.ts pattern
 */

const express = require('express')
const router  = express.Router()

let { getDashboardStats, getAlertTrend } = require('../controllers/dashboard')

if (process.env.MODE === 'DEVELOPMENT') {
  const mockHandlers = require('../mocks/dashboard/mockDashboard')
  getDashboardStats = mockHandlers.getDashboardStats
  getAlertTrend     = mockHandlers.getAlertTrend
}

router.get('/home/dashboard/getStats/stats',              getDashboardStats)
router.get('/home/dashboard/getAlertTrend/stats/trend',   getAlertTrend)

module.exports = router
