import React, { useCallback, useEffect, useState } from 'react';
import { getDevices, createDevice, updateDevice, deleteDevice, DEVICE_STATUS_OPTIONS } from '@ind-devices/shared';
import DeviceModal from './DeviceModal';
import './devices.css';

const PAGE_SIZE_OPTIONS = [5, 10, 20];

function StatusBadge({ status }) {
  return (
    <span className={`ind-status-badge ind-status-badge--${status}`}>
      <span className={`signal-dot ${status}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatLastSeen(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function DevicesContent() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [devices, setDevices] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalDevice, setModalDevice] = useState(undefined); // undefined = closed, null = add, object = edit
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState('');

  const loadDevices = useCallback(() => {
    setIsLoading(true);
    setError('');
    getDevices({ page, pageSize, search, status: statusFilter })
      .then((res) => {
        setDevices(res.items);
        setTotal(res.total);
      })
      .catch((err) => setError(err.message || 'Failed to load devices.'))
      .finally(() => setIsLoading(false));
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function handleSearchChange(value) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusFilterChange(value) {
    setStatusFilter(value);
    setPage(1);
  }

  async function handleSave(formData) {
    setIsSaving(true);
    try {
      if (modalDevice) {
        await updateDevice(modalDevice.id, formData);
        setToast(`${formData.name} updated.`);
      } else {
        await createDevice(formData);
        setToast(`${formData.name} added.`);
        setPage(1);
      }
      setModalDevice(undefined);
      loadDevices();
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteDevice(pendingDelete.id);
      setToast(`${pendingDelete.name} removed.`);
      setPendingDelete(null);
      loadDevices();
    } catch (err) {
      setError(err.message || 'Delete failed.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="ind-devices">
      <div className="ind-devices__head">
        <div>
          <h1>Devices</h1>
          <p>Manage registered RAN inventory — add, update or decommission devices.</p>
        </div>
        <button type="button" className="ind-btn ind-btn--primary" onClick={() => setModalDevice(null)}>
          + Add device
        </button>
      </div>

      <div className="ind-devices__toolbar">
        <input
          type="search"
          className="ind-devices__search"
          placeholder="Search by name, ID, IP, type, region…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => handleStatusFilterChange(e.target.value)}>
          <option value="all">All statuses</option>
          {DEVICE_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="ind-devices__error">{error}</div>}

      <div className="ind-table-wrap">
        <table className="ind-table">
          <thead>
            <tr>
              <th>Device ID</th>
              <th>Name</th>
              <th>Type</th>
              <th>IP address</th>
              <th>Region</th>
              <th>Status</th>
              <th>Firmware</th>
              <th>Last seen</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={9} className="ind-table__empty">
                  Loading devices…
                </td>
              </tr>
            )}
            {!isLoading && devices.length === 0 && (
              <tr>
                <td colSpan={9} className="ind-table__empty">
                  No devices match the current filters.
                </td>
              </tr>
            )}
            {!isLoading &&
              devices.map((d) => (
                <tr key={d.id}>
                  <td className="ind-mono">{d.id}</td>
                  <td>{d.name}</td>
                  <td>{d.type}</td>
                  <td className="ind-mono">{d.ipAddress}</td>
                  <td>{d.region}</td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="ind-mono">{d.firmware}</td>
                  <td>{formatLastSeen(d.lastSeen)}</td>
                  <td className="ind-table__actions">
                    <button type="button" className="ind-link-btn" onClick={() => setModalDevice(d)}>
                      Edit
                    </button>
                    <button type="button" className="ind-link-btn ind-link-btn--danger" onClick={() => setPendingDelete(d)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="ind-pagination">
        <div className="ind-pagination__summary">
          Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} devices
        </div>
        <div className="ind-pagination__controls">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </button>
          <span className="ind-mono">
            {page} / {totalPages}
          </span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      </div>

      {modalDevice !== undefined && (
        <DeviceModal device={modalDevice} onSave={handleSave} onClose={() => setModalDevice(undefined)} isSaving={isSaving} />
      )}

      {pendingDelete && (
        <div className="ind-modal-backdrop" onMouseDown={() => setPendingDelete(null)}>
          <div className="ind-modal ind-modal--sm" onMouseDown={(e) => e.stopPropagation()}>
            <h2>Remove device?</h2>
            <p>
              This will permanently remove <strong>{pendingDelete.name}</strong> ({pendingDelete.id}) from inventory.
            </p>
            <div className="ind-modal__actions">
              <button type="button" className="ind-btn ind-btn--ghost" onClick={() => setPendingDelete(null)}>
                Cancel
              </button>
              <button type="button" className="ind-btn ind-btn--danger" onClick={handleConfirmDelete} disabled={isDeleting}>
                {isDeleting ? 'Removing…' : 'Remove device'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="ind-toast">{toast}</div>}
    </div>
  );
}
