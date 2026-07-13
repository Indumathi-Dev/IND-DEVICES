'use strict'
/**
 * server/src/apps/dashboard/controller/dashboard.js
 * PRODUCTION handlers — use httpsInterceptor axios instance.
 */
const api               = require('../../../route/httpsInterceptor')
const dashboardEndPoint = 'v2/dashboard'

const getDashboardStats = async (req, res) => {
  try {
    const r = await api.get(`${dashboardEndPoint}/stats?${new URLSearchParams(req.query)}`)
    res.status(r.status).json(r.data)
  } catch (err) {
    if (!err.response) return res.status(500).json({ message: err.message })
    res.status(err.response.status).json({ message: err.response.data })
  }
}

const getAlertTrend = async (req, res) => {
  try {
    const since = req.params.since || req.query.since || '7d'
    const r = await api.get(`${dashboardEndPoint}/alerts/trend?since=${since}`)
    res.status(r.status).json(r.data)
  } catch (err) {
    if (!err.response) return res.status(500).json({ message: err.message })
    res.status(err.response.status).json({ message: err.response.data })
  }
}

const getCarbonTrendByRegion = async (req, res) => {
  try {
    const r = await api.get(`${dashboardEndPoint}/carbon?${new URLSearchParams(req.query)}`)
    res.status(r.status).json(r.data)
  } catch (err) {
    if (!err.response) return res.status(500).json({ message: err.message })
    res.status(err.response.status).json({ message: err.response.data })
  }
}

module.exports = { getDashboardStats, getAlertTrend, getCarbonTrendByRegion }
