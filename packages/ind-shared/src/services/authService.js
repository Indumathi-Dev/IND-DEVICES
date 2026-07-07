const SESSION_KEY = 'ind-devices:session';
const MOCK_USERNAME = 'admin';
const MOCK_PASSWORD = 'admin@123!';
const SESSION_TTL_MS = 1000 * 60 * 60;

function networkDelay(ms = 450) {
  return new Promise(r => setTimeout(r, ms));
}

function makeMockToken(username) {
  const header = btoa(JSON.stringify({ alg: 'mock', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: username,
    roles: ['NOC_OPERATOR', 'DEVICE_ADMIN'],
    iat: Date.now(),
    exp: Date.now() + SESSION_TTL_MS,
  }));
  return `${header}.${payload}.mocksignature`;
}

export async function login(username, password) {
  await networkDelay();
  if (username !== MOCK_USERNAME || password !== MOCK_PASSWORD) {
    const err = new Error('Invalid username or password.');
    err.code = 'AUTH_INVALID_CREDENTIALS';
    throw err;
  }
  const session = {
    username,
    displayName: 'Admin User',
    roles: ['NOC_OPERATOR', 'DEVICE_ADMIN'],
    token: makeMockToken(username),
    loginTime: new Date().toISOString(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent('ind-devices:session-changed', { detail: session }));
  return session;
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent('ind-devices:session-changed', { detail: null }));
}

export function getSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    if (session.expiresAt && Date.now() > session.expiresAt) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch { return null; }
}

export function isAuthenticated() {
  return Boolean(getSession());
}
