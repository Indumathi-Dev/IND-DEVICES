/**
 * ind-devices-login.js
 *
 * Exposed as './bootstrap' in mf.config.js:
 *   exposes: { './bootstrap': './src/ind-devices-login.js' }
 *
 * The root-config imports this lazily via Module Federation:
 *   registerApplication({ app: () => import('login/bootstrap') })
 *
 * single-spa-react wraps App.jsx in the standard lifecycle:
 *   bootstrap → mount → unmount
 *
 * App.jsx itself uses React.lazy() for LoginPage so the heavy page
 * chunk is only fetched when the component first renders (double lazy:
 * MF lazy-loads the MFE, React.lazy lazy-loads the page within it).
 */
import React from 'react'
import ReactDOMClient from 'react-dom/client'
import singleSpaReact from 'single-spa-react'
import App from './App.jsx'

const lifecycles = singleSpaReact({
  React,
  ReactDOMClient,
  rootComponent: App,
  errorBoundary: (err, _info, _props) => (
    <div role="alert" aria-live="assertive" style={{ color: '#C53030', padding: 24, fontFamily: 'system-ui' }}>
      <strong>Login MFE failed to load.</strong> {err.message}
    </div>
  ),
})

export const { bootstrap, mount, unmount } = lifecycles
