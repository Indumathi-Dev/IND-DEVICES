'use strict'
const axios = require('axios')
const BASE_URL   = process.env.API_BASE_URL || 'http://localhost:7000'
const AUTH_ENDPOINT = 'v2/auth'
const api = axios.create({ baseURL: BASE_URL, headers: { 'Content-Type': 'application/json' } })

const login = async (req, res) => {
  try {
    const response = await api.post(`${AUTH_ENDPOINT}/login`, req.body)
    res.status(200).json(response.data)
  } catch (err) {
    if (!err.response) return res.status(500).json({ message: err.message })
    res.status(err.response.status).json({ message: err.response.data })
  }
}
const logout    = async (req, res) => {
  try { res.status(200).json({ message: 'Logged out' }) } catch (err) { res.status(500).json({ message: err.message }) }
}
const getSession = async (req, res) => {
  try { res.status(200).json({ valid: true }) } catch (err) { res.status(500).json({ message: err.message }) }
}

module.exports = { login, logout, getSession }
