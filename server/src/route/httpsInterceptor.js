'use strict'
/**
 * server/src/route/httpsInterceptor.js
 *
 * Mirrors DTIAS httpsInterceptor.js — shared axios instance imported by
 * every real controller (scheduler.ts does `import api from '...httpsInterceptor.js'`).
 *
 * Responsibilities:
 *   - Sets base URL from API_BASE_URL env variable
 *   - Forwards Authorization header from the incoming Express request
 *     (Bearer token injected by request interceptor)
 *   - Consistent timeout and content-type defaults
 *
 * Usage in controllers (mirrors scheduler.ts):
 *   const api = require('../../../route/httpsInterceptor')
 *   const response = await api.get('v2/devices')
 */

const axios = require('axios')

const api = axios.create({
  baseURL: process.env.API_BASE_URL || 'http://localhost:7000',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor — attaches token forwarded from MFE (via Express req)
// The token is injected into the axios config by the controller before calling api.*
api.interceptors.request.use(
  (config) => {
    // Token injected via config.headers['Authorization'] by caller if present
    return config
  },
  (err) => Promise.reject(err)
)

// Response interceptor — log errors centrally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const logger = require('../logger/logger')
    logger.error({
      message: 'API call failed',
      url:    err.config?.url,
      status: err.response?.status,
      data:   err.response?.data,
    })
    return Promise.reject(err)
  }
)

module.exports = api
