'use strict'
/**
 * controllers/devices.js  — PRODUCTION handler
 *
 * Mirrors scheduler.ts exactly:
 *   - Imports axios instance (httpsInterceptor equivalent)
 *   - Calls real backend endpoint `v2/devices`
 *   - Passes through query params, body, and path params
 *   - Identical error-handling shape to the mock handlers
 *
 * Swapped in by devices_route.js when MODE !== DEVELOPMENT.
 */

const axios = require('axios')

const BASE_URL       = process.env.API_BASE_URL || 'http://localhost:7000'
const DEVICES_ENDPOINT = 'v2/devices'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach auth token from request headers (mirrors httpsInterceptor pattern)
api.interceptors.request.use(cfg => {
  const token = cfg._reqHeaders?.authorization
  if (token) cfg.headers['Authorization'] = token
  return cfg
})

// ── GET /home/devices/getDevicesList/devices ─────────────────────────────────
const getDevicesList = async (req, res) => {
  try {
    const params   = new URLSearchParams(req.query)
    const response = await api.get(`${DEVICES_ENDPOINT}?${params.toString()}`)
    res.status(response.status).json(response.data)
  } catch (err) {
    if (!err.response) return res.status(500).json({ message: err.message })
    res.status(err.response.status).json({ message: err.response.data })
  }
}

// ── GET /home/devices/getDeviceStats/devices/stats ───────────────────────────
const getDeviceStats = async (req, res) => {
  try {
    const response = await api.get(`${DEVICES_ENDPOINT}/stats`)
    res.status(response.status).json(response.data)
  } catch (err) {
    if (!err.response) return res.status(500).json({ message: err.message })
    res.status(err.response.status).json({ message: err.response.data })
  }
}

// ── POST /home/devices/createDevice/devices ──────────────────────────────────
const createDevice = async (req, res) => {
  try {
    const response = await api.post(DEVICES_ENDPOINT, req.body)
    res.status(200).json(response.data)
  } catch (err) {
    if (!err.response) return res.status(500).json({ message: err.message })
    res.status(err.response.status).json({ message: err.response.data })
  }
}

// ── PUT /home/devices/updateDevice/devices/:deviceId ─────────────────────────
const updateDevice = async (req, res) => {
  try {
    const response = await api.put(`${DEVICES_ENDPOINT}/${req.params.deviceId}`, req.body)
    res.status(200).json(response.data)
  } catch (err) {
    if (!err.response) return res.status(500).json({ message: err.message })
    res.status(err.response.status).json({ message: err.response.data })
  }
}

// ── DELETE /home/devices/deleteDevice/devices/:deviceId ──────────────────────
const deleteDevice = async (req, res) => {
  try {
    const deviceId = req.params.deviceId || req.url.split('/').pop()
    const response = await api.delete(`${DEVICES_ENDPOINT}/${deviceId}`)
    res.status(200).json(response.data)
  } catch (err) {
    if (!err.response) return res.status(500).json({ message: err.message })
    res.status(err.response.status).json({ message: err.response.data })
  }
}

module.exports = { getDevicesList, getDeviceStats, createDevice, updateDevice, deleteDevice }
