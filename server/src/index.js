'use strict'
/**
 * server/src/index.js
 *
 * Express BFF — mirrors DTIAS server/src/index.ts architecture:
 *
 *   ─ Dynamic route loading (mirrors index.ts:121-158):
 *       When /api/home/<app>/... is hit, the router checks if
 *       apps/<appName>/route/route.js exists and loads it.
 *       Static pre-loading at startup (more predictable than on-demand).
 *
 *   ─ MODE-gating: every route file swaps real ↔ mock handlers
 *       based on process.env.MODE === 'DEVELOPMENT'
 *
 *   ─ WCAG AI agent: /api/wcag/* (Anthropic SDK)
 *
 * Ports:
 *   8090 — this server (BFF / agent)
 *   8080 — ind-shared MF remote
 *   8081 — login MFE
 *   8082 — dashboard MFE
 *   8083 — devices MFE
 *   9000 — root-config / shell
 */

require('dotenv').config()

const express = require('express')
const cors    = require('cors')
const path    = require('path')
const fs      = require('fs')
const logger  = require('./logger/logger')

const app  = express()
const PORT = process.env.PORT || 8090
const MODE = process.env.MODE || 'DEVELOPMENT'

// ── CORS — allow all MFE dev-server origins ────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:9000',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:8083',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json({ limit: '256kb' }))

// ── WCAG AI audit agent ────────────────────────────────────────────────────
const wcagRouter = require('./routes/wcag')
app.use('/api/wcag', wcagRouter)

// ── Dynamic app route loader ───────────────────────────────────────────────
// Mirrors DTIAS server/src/index.ts:121-158:
//   When /gui/api/<app>/<module> is hit it checks if the app folder exists
//   and dynamically imports ./apps/<appName>/route/route.js
//
// We pre-load at startup (rather than on-demand) for predictability.
// Each route file is self-contained with its own MODE-gate.

const APPS_DIR = path.join(__dirname, 'apps')

function loadAppRoutes() {
  if (!fs.existsSync(APPS_DIR)) {
    logger.warn({ message: 'apps/ directory not found — skipping dynamic route load' })
    return
  }

  const appNames = fs.readdirSync(APPS_DIR).filter(name => {
    const routeFile = path.join(APPS_DIR, name, 'route', 'route.js')
    return fs.existsSync(routeFile)
  })

  appNames.forEach(appName => {
    try {
      const routeModule = require(path.join(APPS_DIR, appName, 'route', 'route.js'))
      // Mount at /api — route files use /home/<appName>/... prefix
      app.use('/api', routeModule)
      logger.info({
        message: `Route loaded`,
        app: appName,
        mode: MODE,
        prefix: `/api/home/${appName}`,
      })
    } catch (err) {
      logger.error({ message: `Failed to load route for ${appName}`, error: err.message })
    }
  })

  logger.info({ message: `Dynamic routes loaded`, count: appNames.length, apps: appNames })
}

loadAppRoutes()

// ── Auth route (static — login is a special case with no real backend) ─────
try {
  const authRouter = require('./routes/auth_route')
  app.use('/api', authRouter)
} catch { /* optional */ }

// ── Health ─────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({
    status: 'ok',
    mode:   MODE,
    ts:     new Date().toISOString(),
    routes: {
      wcag:      '/api/wcag/audit',
      devices:   '/api/home/devices/getDevicesList/devices',
      dashboard: '/api/home/dashboard/getStats/stats',
    },
  })
)

// ── 404 catch-all ──────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }))

app.listen(PORT, () =>
  logger.info({
    message: '▶  IND-DEVICES agent-server started',
    port:    PORT,
    mode:    MODE,
    wcag:    `http://localhost:${PORT}/api/wcag/audit`,
    health:  `http://localhost:${PORT}/health`,
  })
)
