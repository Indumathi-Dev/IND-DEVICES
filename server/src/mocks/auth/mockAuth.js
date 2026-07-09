'use strict'
/**
 * mockAuth.js
 *
 * Mock handlers for the Auth module.
 * Mirrors mockScheduler.ts pattern — validates against static
 * user fixture, returns a mock session token shaped like Keycloak's kc_token.
 */

const mockUsersList = require('./mockUsersList.json')

const SESSION_TTL_MS = 1000 * 60 * 60 // 1 h

function log(status, action) {
  console.log(JSON.stringify({ status, logMessage: 'RESPONSE RECEIVED', action, ts: new Date().toISOString() }))
}

function makeMockToken(user) {
  const header  = Buffer.from(JSON.stringify({ alg: 'mock', typ: 'JWT' })).toString('base64')
  const payload = Buffer.from(JSON.stringify({
    sub:   user.UserId,
    name:  user.DisplayName,
    roles: user.Roles,
    iat:   Date.now(),
    exp:   Date.now() + SESSION_TTL_MS,
  })).toString('base64')
  return `${header}.${payload}.mocksignature`
}

// ── POST /home/auth/login/auth ────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { username, password } = req.body
    const user = mockUsersList.users.find(
      u => u.Username === username && u.Password === password && u.Enabled
    )
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password.' })
    }

    const token = makeMockToken(user)
    log(200, 'login')
    res.status(200).json({
      kc_token:    token,
      Username:    user.Username,
      DisplayName: user.DisplayName,
      Roles:       user.Roles,
      Tenant:      user.Tenant,
      ExpiresAt:   Date.now() + SESSION_TTL_MS,
      LoginTime:   new Date().toISOString(),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: err.message || err })
  }
}

// ── POST /home/auth/logout/auth ───────────────────────────────────────────────
const logout = async (req, res) => {
  try {
    log(200, 'logout')
    res.status(200).json({ message: 'Successfully logged out' })
  } catch (err) {
    res.status(500).json({ message: err.message || err })
  }
}

// ── GET /home/auth/session/auth ───────────────────────────────────────────────
const getSession = async (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '')
    if (!token) return res.status(401).json({ message: 'No session token provided' })
    log(200, 'getSession')
    res.status(200).json({ valid: true, token })
  } catch (err) {
    res.status(500).json({ message: err.message || err })
  }
}

module.exports = { login, logout, getSession }
