/**
 * ind-devices-dashboard.js
 *
 * Exposed as './bootstrap' in dashboard/mf.config.js.
 * Consumed by root-config: import('dashboard/bootstrap')
 */
import React from 'react'
import ReactDOMClient from 'react-dom/client'
import singleSpaReact from 'single-spa-react'
import App from './App.jsx'

const lifecycles = singleSpaReact({
  React,
  ReactDOMClient,
  rootComponent: App,
  errorBoundary: (err) => (
    <div role="alert" aria-live="assertive" style={{ color: '#C53030', padding: 24, fontFamily: 'system-ui' }}>
      <strong>Dashboard MFE failed to load.</strong> {err.message}
    </div>
  ),
})

export const { bootstrap, mount, unmount } = lifecycles
