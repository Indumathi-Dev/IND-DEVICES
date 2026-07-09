'use strict'
/**
 * controllers/dashboard.js  — PRODUCTION handler
 * Mirrors scheduler.ts — calls real backend aggregation endpoint.
 */

const axios = require('axios')

const BASE_URL         = process.env.API_BASE_URL || 'http://localhost:7000'
const DASHBOARD_ENDPOINT = 'v2/dashboard'

const api = axios.create({ baseURL: BASE_URL, headers: { 'Content-Type': 'application/json' } })

const getDashboardStats = async (req, res) => {
  try {
    const response = await api.get(`${DASHBOARD_ENDPOINT}/stats`)
    res.status(response.status).json(response.data)
  } catch (err) {
    if (!err.response) return res.status(500).json({ message: err.message })
    res.status(err.response.status).json({ message: err.response.data })
  }
}

const getAlertTrend = async (req, res) => {
  try {
    const params   = new URLSearchParams(req.query)
    const response = await api.get(`${DASHBOARD_ENDPOINT}/trend?${params.toString()}`)
    res.status(response.status).json(response.data)
  } catch (err) {
    if (!err.response) return res.status(500).json({ message: err.message })
    res.status(err.response.status).json({ message: err.response.data })
  }
}

module.exports = { getDashboardStats, getAlertTrend }
