'use strict'
/**
 * auth_route.js  — mirrors scheduler_route.ts pattern
 */

const express = require('express')
const router  = express.Router()

let { login, logout, getSession } = require('../controllers/auth')

if (process.env.MODE === 'DEVELOPMENT') {
  const mockHandlers = require('../mocks/auth/mockAuth')
  login      = mockHandlers.login
  logout     = mockHandlers.logout
  getSession = mockHandlers.getSession
}

router.post('/home/auth/login/auth',    login)
router.post('/home/auth/logout/auth',   logout)
router.get ('/home/auth/session/auth',  getSession)

module.exports = router
