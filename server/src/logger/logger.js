'use strict'
/**
 * server/src/logger/logger.js
 *
 * Lightweight structured logger that mirrors the Winston interface
 * used in DTIAS (logger.info({ status, logMessage }) calls in mockScheduler.ts).
 * Emits JSON-line output compatible with any log aggregator.
 */

function write(level, data) {
  const entry = typeof data === 'string' ? { message: data } : data
  process.stdout.write(
    JSON.stringify({ level, ts: new Date().toISOString(), ...entry }) + '\n'
  )
}

const logger = {
  info:  (data) => write('INFO',  data),
  warn:  (data) => write('WARN',  data),
  error: (data) => write('ERROR', data),
  debug: (data) => write('DEBUG', data),
}

module.exports = logger
