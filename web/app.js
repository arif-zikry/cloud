async function api(path, opts = {}) {
  const res = await fetch(path, opts);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || res.statusText);
  }
  return res.json();
}

const statusEl = document.getElementById('status');
const tbody = document.querySelector('#rides-table tbody');

const STATUS_SEQUENCE = ['requested', 'accepted', 'ongoing', 'completed'];

function getNextStatus(currentStatus) {
  const idx = STATUS_SEQUENCE.indexOf(currentStatus);
  return idx < STATUS_SEQUENCE.length - 1 ? STATUS_SEQUENCE[idx + 1] : currentStatus;
}

function render(rides) {
  tbody.innerHTML = '';
  for (const r of rides) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.passenger || ''}</td>
      <td>${r.origin || ''}</td>
      <td>${r.destination || ''}</td>
      <td>${r.status || 'requested'}</td>
      <td>
        <button data-id="${r._id}" class="status">Next status</button>
        <button data-id="${r._id}" class="del">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

async function load() {
  try {
    statusEl.textContent = 'Loading rides...';
    const list = await api('/rides');
    render(list);
    statusEl.textContent = `Loaded ${list.length} rides`;
  } catch (err) {
    statusEl.textContent = 'Error: ' + err.message;
  }
}

document.getElementById('add-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const data = {
    passenger: f.passenger.value,
    origin: f.origin.value,
    destination: f.destination.value,
    status: f.status.value
  };
  try {
    await api('/rides', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    f.reset();
    load();
  } catch (err) {
    alert('Error: ' + err.message);
  }
});

tbody.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const id = btn.getAttribute('data-id');
  if (btn.classList.contains('status')) {
    try {
      const rides = await api('/rides');
      const ride = rides.find(r => r._id === id);
      if (!ride) throw new Error('Ride not found');
      const nextStatus = getNextStatus(ride.status || 'requested');
      await api(`/rides/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      load();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  } else if (btn.classList.contains('del')) {
    if (!confirm('Delete this ride?')) return;
    try {
      await api(`/rides/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }
});

load();