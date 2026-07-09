'use strict'
/**
 * server/src/apps/dashboard/controller/dashboard.js
 *
 * PRODUCTION request handlers — mirrors scheduler.ts exactly:
 *   - Uses shared axios instance from httpsInterceptor.js (api import)
 *   - Versioned endpoint constant (schedulesEndPoint → dashboardEndPoint)
 *   - Same error handling shape as the mock handlers
 *
 * Swapped in by dashboard_route.js when MODE !== DEVELOPMENT.
 */

const api               = require('../../../route/httpsInterceptor')
const dashboardEndPoint = 'v2/dashboard'   // mirrors schedulesEndPoint = 'v2/schedules'

// ── GET /home/dashboard/getStats/stats (mirrors getSchedulesList) ─────────────
const getDashboardStats = async (req, res) => {
  try {
    const params   = new URLSearchParams(req.query)
    const response = await api.get(`${dashboardEndPoint}/stats?${params.toString()}`)
    res.status(response.status).json(response.data)
  } catch (err) {
    if (!err.response) return res.status(500).json({ message: err.message })
    res.status(err.response.status).json({ message: err.response.data })
  }
}

// ── GET /home/dashboard/getAlertTrend/stats/trend (mirrors getSchedulesSummary) ──
const getAlertTrend = async (req, res) => {
  try {
    const since    = req.params.since || req.query.since || '7d'
    const response = await api.get(`${dashboardEndPoint}/alerts/trend?since=${since}`)
    res.status(response.status).json(response.data)
  } catch (err) {
    if (!err.response) return res.status(500).json({ message: err.message })
    res.status(err.response.status).json({ message: err.response.data })
  }
}

module.exports = { getDashboardStats, getAlertTrend }
