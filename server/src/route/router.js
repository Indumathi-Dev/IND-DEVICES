'use strict'
/**
 * server/src/route/router.js
 *
 * Shared Express Router instance.
 * Mirrors DTIAS route/router.js — every *_route.ts does:
 *   import router from '../../../../route/router.js'
 *
 * Centralising the router here means all route files share one
 * Express Router that gets mounted into app.use('/api', router)
 * in index.js — matching the DTIAS server/src/index.ts:121-158 pattern
 * where routes are dynamically loaded and attached to a shared router.
 */

const { Router } = require('express')

module.exports = Router()
