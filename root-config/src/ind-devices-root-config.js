import { registerApplication, start } from 'single-spa';

const SESSION_KEY = 'ind-devices:session';
function isAuthenticated() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    return s && (!s.expiresAt || Date.now() <= s.expiresAt);
  } catch { return false; }
}

registerApplication({
  name: '@ind-devices/login',
  app: () => System.import('@ind-devices/login'),
  activeWhen: () => !isAuthenticated(),
});
registerApplication({
  name: '@ind-devices/dashboard',
  app: () => System.import('@ind-devices/dashboard'),
  activeWhen: (loc) => isAuthenticated() && (loc.pathname === '/' || loc.pathname.startsWith('/dashboard')),
});
registerApplication({
  name: '@ind-devices/devices',
  app: () => System.import('@ind-devices/devices'),
  activeWhen: (loc) => isAuthenticated() && loc.pathname.startsWith('/devices'),
});

window.addEventListener('ind-devices:session-changed', () =>
  window.dispatchEvent(new PopStateEvent('popstate')));

start({ urlRerouteOnly: true });
