const STORAGE_KEY = 'ind-devices:mock-devices';
const DEVICE_TYPES = ['gNodeB', 'eNodeB', 'Small Cell', 'Router', 'Switch', 'RRU'];
const REGIONS = ['North', 'South', 'East', 'West', 'Central'];
const STATUSES = ['online', 'warning', 'offline'];

function seedDevices() {
  return Array.from({ length: 47 }, (_, i) => {
    const n = i + 1;
    return {
      id: `DEV-${1000 + n}`,
      name: `Cell-Site-${String(n).padStart(3, '0')}`,
      type: DEVICE_TYPES[n % DEVICE_TYPES.length],
      ipAddress: `10.${(n % 8) + 10}.${(n % 16) + 1}.${(n % 250) + 2}`,
      region: REGIONS[n % REGIONS.length],
      status: n % 9 === 0 ? 'offline' : n % 7 === 0 ? 'warning' : 'online',
      firmware: `v${2 + (n % 3)}.${n % 10}.${n % 5}`,
      lastSeen: new Date(Date.now() - n * 1000 * 60 * 17).toISOString(),
    };
  });
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const s = seedDevices(); writeStore(s); return s;
}

function writeStore(devices) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
}

const delay = (ms = 350) => new Promise(r => setTimeout(r, ms));

export async function getDevices({ page = 1, pageSize = 10, search = '', status = 'all' } = {}) {
  await delay();
  let all = readStore();
  if (search.trim()) {
    const q = search.toLowerCase();
    all = all.filter(d =>
      d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q) ||
      d.ipAddress.includes(q) || d.type.toLowerCase().includes(q));
  }
  if (status !== 'all') all = all.filter(d => d.status === status);
  const total = all.length;
  return { items: all.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize };
}

export async function createDevice(device) {
  await delay();
  const all = readStore();
  const newDevice = { id: `DEV-${1000 + all.length + 1}`, status: 'online', lastSeen: new Date().toISOString(), ...device };
  all.unshift(newDevice); writeStore(all);
  return newDevice;
}

export async function updateDevice(id, patch) {
  await delay();
  const all = readStore();
  const idx = all.findIndex(d => d.id === id);
  if (idx === -1) throw Object.assign(new Error(`Device ${id} not found`), { code: 'NOT_FOUND' });
  all[idx] = { ...all[idx], ...patch }; writeStore(all);
  return all[idx];
}

export async function deleteDevice(id) {
  await delay();
  writeStore(readStore().filter(d => d.id !== id));
  return { id };
}

export const DEVICE_TYPE_OPTIONS = DEVICE_TYPES;
export const DEVICE_REGION_OPTIONS = REGIONS;
export const DEVICE_STATUS_OPTIONS = STATUSES;
