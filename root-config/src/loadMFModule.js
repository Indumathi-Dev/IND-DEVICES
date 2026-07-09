/**
 * loadMFModule.js
 *
 * Dynamic Module Federation remote loader.
 *
 * In DTIAS, registerLocalApp uses moduleFederationProps containing a URL
 * that points to the remote entry on a CDN or PVC path. This loader
 * mirrors that behaviour — it can fetch a remote entry from ANY URL at
 * runtime, not just the ones declared statically in webpack config.
 *
 * Usage (mirrors DTIAS registerApps.ts registerLocalApp call):
 *   const mod = await loadMFModule(
 *     'http://cdn.example.com/login/login_remote_entry.js',
 *     'login',
 *     './bootstrap'
 *   )
 *   // mod === { bootstrap, mount, unmount }  (single-spa lifecycle)
 *
 * How it works:
 *   1. Injects <script> for the remote entry if not already loaded
 *   2. Calls __webpack_init_sharing__('default') to set up the shared scope
 *   3. Initialises the container: container.init(__webpack_share_scopes__.default)
 *   4. Calls container.get(module) to get the factory function
 *   5. Returns factory() — the actual ES module
 *
 * Reference: https://webpack.js.org/concepts/module-federation/#dynamic-remote-containers
 */

const loadedScripts = new Set()

/**
 * Injects a <script> tag for the given URL and waits for it to load.
 * Idempotent — a second call for the same URL resolves immediately.
 */
function loadRemoteEntry(url) {
  if (loadedScripts.has(url)) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = url
    script.type = 'text/javascript'
    script.async = true

    script.onload = () => {
      loadedScripts.add(url)
      resolve()
    }
    script.onerror = () =>
      reject(new Error(`[loadMFModule] Failed to load remote entry: ${url}`))

    document.head.appendChild(script)
  })
}

/**
 * Loads a module from a dynamically-specified Module Federation remote.
 *
 * @param {string} url    - Full URL to the remote entry JS file
 *                          e.g. 'http://localhost:8081/login_remote_entry.js'
 * @param {string} scope  - MF container name (must match `name` in mf.config.js)
 *                          e.g. 'login'
 * @param {string} module - Exposed module path  e.g. './bootstrap' or './App'
 * @returns {Promise<any>} Resolves to the exposed module's exports
 */
export async function loadMFModule(url, scope, module) {
  // 1. Fetch the remote entry script
  await loadRemoteEntry(url)

  // 2. Initialise webpack's shared scope so singletons are deduplicated
  // eslint-disable-next-line no-undef
  await __webpack_init_sharing__('default')

  // 3. Get the MF container that the remote entry registered on window
  const container = window[scope]
  if (!container) {
    throw new Error(
      `[loadMFModule] Container "${scope}" not found on window after loading ${url}. ` +
      'Verify that the remote entry filename and the mf.config.js `name` match.'
    )
  }

  // 4. Share the host's scope with the remote container
  // eslint-disable-next-line no-undef
  await container.init(__webpack_share_scopes__.default)

  // 5. Get the module factory and call it to obtain the module
  const factory = await container.get(module)
  return factory()
}
