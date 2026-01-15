// Utility function for API calls
async function api(path, opts = {}) {
  const token = localStorage.getItem('authToken');
  
  // Initialize headers if not present
  if (!opts.headers) {
    opts.headers = {};
  }
  
  // Add Authorization header if token exists
  if (token) {
    opts.headers['Authorization'] = `Bearer ${token}`;
  }
  
  const res = await fetch(path, opts);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || res.statusText);
  }
  return res.json();
}

// Auth utilities
function getAuthData() {
  const token = localStorage.getItem('authToken');
  const role = localStorage.getItem('userRole');
  const userId = localStorage.getItem('userId');
  return { token, role, userId };
}

function setAuthData(token, role, userId) {
  localStorage.setItem('authToken', token);
  localStorage.setItem('userRole', role);
  localStorage.setItem('userId', userId);
}

function clearAuthData() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userId');
}

function logout() {
  clearAuthData();
  window.location.href = 'login.html';
}

// Page access control
const PAGE_ACCESS = {
  'index.html': ['admin', 'user', 'driver'],
  'rides.html': ['admin'],
  'my-rides.html': ['user'],
  'driver-rides.html': ['driver'],
  'register-vehicle.html': ['driver'],
  'users.html': ['admin'],
  'drivers.html': ['admin'],
  'transactions.html': ['admin'],
  'analytics.html': ['admin'],
  'add-ride.html': ['admin', 'user'],
  'profile.html': ['admin', 'user', 'driver']
};

function checkPageAccess() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  if (currentPage === 'login.html' || currentPage === 'register.html') return;
  
  const { token, role } = getAuthData();
  
  if (!token) {
    window.location.href = 'login.html';
    return;
  }
  
  const allowedRoles = PAGE_ACCESS[currentPage];
  if (allowedRoles && !allowedRoles.includes(role)) {
    alert('Access denied. You do not have permission to view this page.');
    window.location.href = 'index.html';
  }
}

function setupNavigation() {
  const { role } = getAuthData();
  const nav = document.querySelector('nav ul');
  if (!nav) return;
  
  // Add logout button
  const logoutLi = document.createElement('li');
  logoutLi.innerHTML = '<a href="#" onclick="logout(); return false;">Logout</a>';
  nav.appendChild(logoutLi);
  
  // Hide nav items based on role
  const navItems = nav.querySelectorAll('li a');
  navItems.forEach(link => {
    const href = link.getAttribute('href');
    if (href && PAGE_ACCESS[href]) {
      if (!PAGE_ACCESS[href].includes(role)) {
        link.parentElement.style.display = 'none';
      }
    }
  });
  
  // Add role badge
  const header = document.querySelector('header h1');
  if (header && role) {
    const badge = document.createElement('span');
    badge.className = 'role-badge';
    badge.textContent = role.toUpperCase();
    header.appendChild(badge);
  }
}

// Status progression
const STATUS_SEQUENCE = ['requested', 'accepted', 'ongoing', 'completed'];

function getNextStatus(currentStatus) {
  const idx = STATUS_SEQUENCE.indexOf(currentStatus);
  return idx < STATUS_SEQUENCE.length - 1 ? STATUS_SEQUENCE[idx + 1] : currentStatus;
}

// Check access on page load
checkPageAccess();
if (document.querySelector('nav')) {
  setupNavigation();
}

// ============================================
// LOGIN PAGE (login.html)
// ============================================
if (window.location.pathname.endsWith('login.html')) {
  const form = document.getElementById('login-form');
  const statusEl = document.getElementById('status');
  
  // Clear any existing auth data
  clearAuthData();
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = form.email.value;
    const password = form.password.value;
    
    try {
      statusEl.textContent = 'Logging in...';
      statusEl.className = 'login-status';
      
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        throw new Error('Invalid credentials');
      }
      
      const data = await response.json();
      
      // Decode JWT to get role (simple base64 decode)
      const tokenParts = data.token.split('.');
      const payload = JSON.parse(atob(tokenParts[1]));
      
      setAuthData(data.token, payload.role, payload.userId);
      
      statusEl.textContent = 'Login successful! Redirecting...';
      statusEl.className = 'login-status success';
      
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 500);
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
      statusEl.className = 'login-status error';
    }
  });
}

// ============================================
// REGISTER PAGE (register.html)
// ============================================
if (window.location.pathname.endsWith('register.html')) {
  const form = document.getElementById('register-form');
  const statusEl = document.getElementById('status');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
      name: form.name.value,
      email: form.email.value,
      password: form.password.value,
      role: form.role.value
    };
    
    try {
      statusEl.textContent = 'Creating account...';
      statusEl.className = 'login-status';
      
      const response = await fetch('/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Registration failed');
      }
      
      statusEl.textContent = 'Account created! Redirecting to login...';
      statusEl.className = 'login-status success';
      
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
      statusEl.className = 'login-status error';
    }
  });
}

// ============================================
// HOME PAGE (index.html)
// ============================================
if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
  const statusEl = document.getElementById('status');
  const { role, userId } = getAuthData();
  
  async function loadStats() {
    try {
      statusEl.textContent = 'Loading...';
      
      if (role === 'admin') {
        // Admin dashboard with all stats
        const [rides, users, drivers, transactions] = await Promise.all([
          api('/rides').catch(() => []),
          api('/users').catch(() => []),
          api('/drivers').catch(() => []),
          api('/transactions').catch(() => [])
        ]);
        
        statusEl.innerHTML = `
          <h2>Dashboard Overview</h2>
          <div class="stats">
            <div class="stat-card">
              <h3>${rides.length}</h3>
              <p>Total Rides</p>
            </div>
            <div class="stat-card">
              <h3>${users.length}</h3>
              <p>Total Users</p>
            </div>
            <div class="stat-card">
              <h3>${drivers.length}</h3>
              <p>Total Drivers</p>
            </div>
            <div class="stat-card">
              <h3>${transactions.length}</h3>
              <p>Transactions</p>
            </div>
          </div>
          <div class="stats">
            <div class="stat-card">
              <h3>${rides.filter(r => r.status === 'requested').length}</h3>
              <p>Requested</p>
            </div>
            <div class="stat-card">
              <h3>${rides.filter(r => r.status === 'ongoing').length}</h3>
              <p>Ongoing</p>
            </div>
            <div class="stat-card">
              <h3>${rides.filter(r => r.status === 'completed').length}</h3>
              <p>Completed</p>
            </div>
            <div class="stat-card">
              <h3>${drivers.filter(d => d.isAvailable).length}</h3>
              <p>Available Drivers</p>
            </div>
          </div>
        `;
      } else {
        // User/Driver dashboard with personal stats
        const rides = await api('/rides').catch(() => []);
        
        if (role === 'driver') {
          // Driver-specific dashboard
          const myAcceptedRides = rides.filter(r => r.driverID === userId);
          const availableRides = rides.filter(r => !r.driverID && r.status === 'requested');
          
          statusEl.innerHTML = `
            <h2>Driver Dashboard</h2>
            <div class="stats">
              <div class="stat-card">
                <h3>${myAcceptedRides.length}</h3>
                <p>Your Accepted Rides</p>
              </div>
              <div class="stat-card">
                <h3>${availableRides.length}</h3>
                <p>Available Rides</p>
              </div>
              <div class="stat-card">
                <h3>${myAcceptedRides.filter(r => r.status === 'ongoing').length}</h3>
                <p>Currently In Progress</p>
              </div>
              <div class="stat-card">
                <h3>${myAcceptedRides.filter(r => r.status === 'completed').length}</h3>
                <p>Completed Rides</p>
              </div>
            </div>
            <div class="quick-actions" style="margin-top: 2rem; text-align: center;">
              <h3>Quick Actions</h3>
              <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 1rem;">
                <button onclick="window.location.href='driver-rides.html'" class="add-btn">View Available Rides</button>
                <button onclick="window.location.href='register-vehicle.html'" class="add-btn" style="background-color: #36A2EB;">Register Vehicle</button>
              </div>
            </div>
          `;
        } else {
          // User dashboard
          const myRides = rides.filter(r => r.user_id === userId);
          
          statusEl.innerHTML = `
            <h2>Welcome Back!</h2>
            <div class="stats">
              <div class="stat-card">
                <h3>${myRides.length}</h3>
                <p>Your Total Rides</p>
              </div>
              <div class="stat-card">
                <h3>${myRides.filter(r => r.status === 'requested').length}</h3>
                <p>Pending</p>
              </div>
              <div class="stat-card">
                <h3>${myRides.filter(r => r.status === 'ongoing').length}</h3>
                <p>In Progress</p>
              </div>
              <div class="stat-card">
                <h3>${myRides.filter(r => r.status === 'completed').length}</h3>
                <p>Completed</p>
              </div>
            </div>
            <div class="quick-actions" style="margin-top: 2rem; text-align: center;">
              <h3>Quick Actions</h3>
              <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 1rem;">
                <button onclick="window.location.href='add-ride.html'" class="add-btn">+ Request New Ride</button>
                <button onclick="window.location.href='my-rides.html'" class="add-btn" style="background-color: #36A2EB;">View My Rides</button>
              </div>
            </div>
          `;
        }
      }
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
    }
  }
  
  loadStats();
}

// ============================================
// RIDES PAGE (rides.html)
// ============================================
if (window.location.pathname.endsWith('rides.html') && !window.location.pathname.endsWith('my-rides.html')) {
  const statusEl = document.getElementById('status');
  const tbody = document.querySelector('#rides-table tbody');
  const cardsContainer = document.getElementById('rides-cards');
  const tableView = document.getElementById('table-view');
  const searchInput = document.getElementById('search-rides');
  const statusFilter = document.getElementById('status-filter');
  const cardViewBtn = document.getElementById('card-view-btn');
  const tableViewBtn = document.getElementById('table-view-btn');
  
  let allRides = [];
  let allUsers = {};
  let currentView = 'card';
  
  // Status colors
  const statusColors = {
    requested: '#FF6384',
    accepted: '#36A2EB',
    ongoing: '#FFCE56',
    completed: '#4BC0C0'
  };
  
  async function loadUsers() {
    try {
      const users = await api('/users');
      users.forEach(user => {
        allUsers[user._id] = user.name || user.email || 'Unknown User';
      });
    } catch (err) {
      console.log('Could not load user names (permission denied)');
    }
  }
  
  function getUserName(userId) {
    return allUsers[userId] || `User ${userId}` || 'N/A';
  }
  
  function getRideDate(ride) {
    if (ride.createdAt) {
      return new Date(ride.createdAt).toLocaleDateString();
    }
    // Fallback: Extract date from MongoDB ObjectId if createdAt doesn't exist
    if (ride._id) {
      const timestamp = parseInt(ride._id.substring(0, 8), 16) * 1000;
      return new Date(timestamp).toLocaleDateString();
    }
    return 'N/A';
  }
  
  function renderCards(rides) {
    cardsContainer.innerHTML = '';
    if (rides.length === 0) {
      cardsContainer.innerHTML = '<div class="no-rides">No rides found</div>';
      return;
    }
    
    for (const r of rides) {
      const card = document.createElement('div');
      card.className = 'ride-card';
      card.style.borderLeft = `4px solid ${statusColors[r.status] || '#ccc'}`;
      
      const date = getRideDate(r);
      const userName = getUserName(r.user_id);
      
      card.innerHTML = `
        <div class="ride-card-header">
          <span class="ride-status" style="background-color: ${statusColors[r.status] || '#ccc'}">${r.status || 'requested'}</span>
          <span class="ride-date">${date}</span>
        </div>
        <div class="ride-card-body">
          <div class="ride-info">
            <div class="info-item">
              <span class="info-label">👤 Passenger:</span>
              <span class="info-value">${userName}</span>
            </div>
            <div class="info-item">
              <span class="info-label">📍 Pickup:</span>
              <span class="info-value">${r.pickup || r.origin || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">🎯 Destination:</span>
              <span class="info-value">${r.destination || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">📏 Distance:</span>
              <span class="info-value">${r.distance ? r.distance + ' km' : 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">💰 Fare:</span>
              <span class="info-value">${r.fare ? 'RM' + r.fare : 'N/A'}</span>
            </div>
            ${r.driverID ? `
            <div class="info-item">
              <span class="info-label">🚗 Driver ID:</span>
              <span class="info-value">${r.driverID}</span>
            </div>` : ''}
          </div>
        </div>
        <div class="ride-card-actions">
          <button data-id="${r._id}" class="status-btn">Next Status</button>
          <button data-id="${r._id}" class="del-btn">Delete</button>
        </div>
      `;
      cardsContainer.appendChild(card);
    }
  }
  
  function renderTable(rides) {
    tbody.innerHTML = '';
    if (rides.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No rides found</td></tr>';
      return;
    }
    
    for (const r of rides) {
      const tr = document.createElement('tr');
      const date = getRideDate(r);
      const userName = getUserName(r.user_id);
      
      tr.innerHTML = `
        <td>${userName}</td>
        <td>${r.pickup || r.origin || 'N/A'}</td>
        <td>${r.destination || 'N/A'}</td>
        <td>${r.distance ? r.distance + ' km' : 'N/A'}</td>
        <td>${r.fare ? 'RM' + r.fare : 'N/A'}</td>
        <td><span class="status-badge" style="background-color: ${statusColors[r.status] || '#ccc'}">${r.status || 'requested'}</span></td>
        <td>${date}</td>
        <td>
          <button data-id="${r._id}" class="status-btn">Next Status</button>
          <button data-id="${r._id}" class="del-btn">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    }
  }
  
  function filterRides() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusValue = statusFilter.value;
    
    const filtered = allRides.filter(ride => {
      const userName = getUserName(ride.user_id).toLowerCase();
      const matchesSearch = 
        userName.includes(searchTerm) ||
        (ride.pickup && ride.pickup.toLowerCase().includes(searchTerm)) ||
        (ride.destination && ride.destination.toLowerCase().includes(searchTerm)) ||
        (ride.user_id && ride.user_id.toString().includes(searchTerm));
      
      const matchesStatus = statusValue === 'all' || ride.status === statusValue;
      
      return matchesSearch && matchesStatus;
    });
    
    if (currentView === 'card') {
      renderCards(filtered);
    } else {
      renderTable(filtered);
    }
    
    statusEl.textContent = `Showing ${filtered.length} of ${allRides.length} rides`;
  }
  
  async function loadRides() {
    try {
      statusEl.textContent = 'Loading rides...';
      await loadUsers();
      const list = await api('/rides');
      allRides = list;
      filterRides();
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
    }
  }
  
  // View toggle
  if (cardViewBtn) {
    cardViewBtn.addEventListener('click', () => {
      currentView = 'card';
      cardsContainer.style.display = 'grid';
      tableView.style.display = 'none';
      cardViewBtn.classList.add('active');
      tableViewBtn.classList.remove('active');
      filterRides();
    });
  }
  
  if (tableViewBtn) {
    tableViewBtn.addEventListener('click', () => {
      currentView = 'table';
      cardsContainer.style.display = 'none';
      tableView.style.display = 'block';
      cardViewBtn.classList.remove('active');
      tableViewBtn.classList.add('active');
      filterRides();
    });
  }
  
  // Search and filter
  if (searchInput) searchInput.addEventListener('input', filterRides);
  if (statusFilter) statusFilter.addEventListener('change', filterRides);
  
  // Event delegation for buttons
  if (cardsContainer) cardsContainer.addEventListener('click', handleRideAction);
  if (tbody) tbody.addEventListener('click', handleRideAction);
  
  async function handleRideAction(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    
    if (btn.classList.contains('status-btn')) {
      try {
        const ride = allRides.find(r => r._id === id);
        if (!ride) throw new Error('Ride not found');
        const nextStatus = getNextStatus(ride.status || 'requested');
        await api(`/rides/${id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: nextStatus })
        });
        loadRides();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    } else if (btn.classList.contains('del-btn')) {
      if (!confirm('Delete this ride?')) return;
      try {
        await api(`/rides/${id}`, { method: 'DELETE' });
        loadRides();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }
  }
  
  loadRides();
}

// ============================================
// DRIVER RIDES PAGE (driver-rides.html)
// ============================================
if (window.location.pathname.endsWith('driver-rides.html')) {
  const statusEl = document.getElementById('status');
  const cardsContainer = document.getElementById('driver-rides-cards');
  const searchInput = document.getElementById('search-rides');
  const statusFilter = document.getElementById('status-filter');
  
  let allRides = [];
  let allUsers = {};
  const { userId } = getAuthData();
  
  // Status colors
  const statusColors = {
    requested: '#FF6384',
    accepted: '#36A2EB',
    ongoing: '#FFCE56',
    completed: '#4BC0C0'
  };
  
  async function loadUsers() {
    try {
      const users = await api('/users');
      users.forEach(user => {
        allUsers[user._id] = user.name || user.email || 'Unknown User';
      });
    } catch (err) {
      console.log('Could not load user names (permission denied)');
    }
  }
  
  function getUserName(userId) {
    return allUsers[userId] || `User ${userId}` || 'N/A';
  }
  
  function getRideDate(ride) {
    if (ride.createdAt) {
      return new Date(ride.createdAt).toLocaleDateString();
    }
    if (ride._id) {
      const timestamp = parseInt(ride._id.substring(0, 8), 16) * 1000;
      return new Date(timestamp).toLocaleDateString();
    }
    return 'N/A';
  }
  
  function renderDriverRides(rides) {
    cardsContainer.innerHTML = '';
    if (rides.length === 0) {
      cardsContainer.innerHTML = '<div class="no-rides">No rides available at the moment</div>';
      return;
    }
    
    for (const r of rides) {
      const card = document.createElement('div');
      card.className = 'ride-card';
      card.style.borderLeft = `4px solid ${statusColors[r.status] || '#ccc'}`;
      
      const date = getRideDate(r);
      const userName = getUserName(r.user_id);
      // Convert both to strings for comparison
      const isMyRide = r.driverID && String(r.driverID) === String(userId);
      
      // Debug logging
      console.log('Ride:', r._id, 'Status:', r.status, 'DriverID:', r.driverID, 'MyUserID:', userId, 'IsMyRide:', isMyRide);
      
      card.innerHTML = `
        <div class="ride-card-header">
          <span class="ride-status" style="background-color: ${statusColors[r.status] || '#ccc'}">${r.status || 'requested'}</span>
          <span class="ride-date">${date}</span>
        </div>
        <div class="ride-card-body">
          <div class="ride-info">
            <div class="info-item">
              <span class="info-label">👤 Passenger:</span>
              <span class="info-value">${userName}</span>
            </div>
            <div class="info-item">
              <span class="info-label">📍 Pickup:</span>
              <span class="info-value">${r.pickup || r.origin || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">🎯 Destination:</span>
              <span class="info-value">${r.destination || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">📏 Distance:</span>
              <span class="info-value">${r.distance ? r.distance + ' km' : 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">💰 Fare:</span>
              <span class="info-value">${r.fare ? 'RM' + r.fare : 'N/A'}</span>
            </div>
            ${isMyRide ? `
            <div class="info-item" style="color: #4BC0C0; font-weight: bold;">
              <span>✓ You accepted this ride</span>
            </div>` : ''}
          </div>
        </div>
        <div class="ride-card-actions">
          ${!r.driverID && (r.status === 'requested' || r.status === 'accepted') ? `
            <button data-id="${r._id}" class="accept-btn" style="background-color: #4BC0C0;">Accept Ride</button>
          ` : ''}
          ${r.driverID && isMyRide && r.status === 'accepted' ? `
            <button data-id="${r._id}" class="start-btn" style="background-color: #FFCE56;">Start Ride (Pickup)</button>
          ` : ''}
          ${r.driverID && isMyRide && r.status === 'ongoing' ? `
            <button data-id="${r._id}" class="complete-btn" style="background-color: #4BC0C0;">Complete Ride (Finish)</button>
          ` : ''}
        </div>
      `;
      cardsContainer.appendChild(card);
    }
  }
  
  function filterRides() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusValue = statusFilter.value;
    
    const filtered = allRides.filter(ride => {
      const userName = getUserName(ride.user_id).toLowerCase();
      const matchesSearch = 
        userName.includes(searchTerm) ||
        (ride.pickup && ride.pickup.toLowerCase().includes(searchTerm)) ||
        (ride.destination && ride.destination.toLowerCase().includes(searchTerm));
      
      const matchesStatus = statusValue === 'all' || ride.status === statusValue;
      
      return matchesSearch && matchesStatus;
    });
    
    renderDriverRides(filtered);
  }
  
  async function loadDriverRides() {
    try {
      statusEl.textContent = 'Loading rides...';
      await loadUsers();
      const list = await api('/rides');
      allRides = list;
      renderDriverRides(allRides);
      statusEl.textContent = `${allRides.length} ride${allRides.length !== 1 ? 's' : ''} available`;
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
      cardsContainer.innerHTML = '<div class="no-rides">Failed to load rides</div>';
    }
  }
  
  async function handleRideAction(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    
    if (btn.classList.contains('accept-btn')) {
      try {
        // Get driver's vehicle
        const vehicles = await api('/vehicles');
        const myVehicle = vehicles.find(v => v.driverID === userId);
        
        if (!myVehicle) {
          alert('Please register your vehicle first!');
          window.location.href = 'register-vehicle.html';
          return;
        }
        
        await api(`/rides/${id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ 
            driverID: userId, 
            vehicleID: myVehicle._id,
            status: 'accepted',
            acceptedAt: new Date().toISOString()
          })
        });
        statusEl.textContent = 'Ride accepted!';
        loadDriverRides();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    } else if (btn.classList.contains('start-btn')) {
      try {
        await api(`/rides/${id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ 
            status: 'ongoing',
            startedAt: new Date().toISOString()
          })
        });
        statusEl.textContent = 'Ride started! On your way to pickup.';
        loadDriverRides();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    } else if (btn.classList.contains('complete-btn')) {
      try {
        await api(`/rides/${id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ 
            status: 'completed',
            completedAt: new Date().toISOString()
          })
        });
        statusEl.textContent = 'Ride completed!';
        loadDriverRides();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    } else if (btn.classList.contains('status-btn')) {
      try {
        const ride = allRides.find(r => r._id === id);
        if (!ride) throw new Error('Ride not found');
        const nextStatus = getNextStatus(ride.status || 'accepted');
        await api(`/rides/${id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: nextStatus })
        });
        loadDriverRides();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }
  }
  
  if (searchInput) searchInput.addEventListener('input', filterRides);
  if (statusFilter) statusFilter.addEventListener('change', filterRides);
  if (cardsContainer) cardsContainer.addEventListener('click', handleRideAction);
  
  loadDriverRides();
}

// ============================================
// MY RIDES PAGE (my-rides.html)
// ============================================
if (window.location.pathname.endsWith('my-rides.html')) {
  const statusEl = document.getElementById('status');
  const cardsContainer = document.getElementById('my-rides-cards');
  const searchInput = document.getElementById('search-rides');
  const statusFilter = document.getElementById('status-filter');
  
  let allRides = [];
  const { userId } = getAuthData();
  
  // Status colors
  const statusColors = {
    requested: '#FF6384',
    accepted: '#36A2EB',
    ongoing: '#FFCE56',
    completed: '#4BC0C0'
  };
  
  function getRideDate(ride) {
    if (ride.createdAt) {
      return new Date(ride.createdAt).toLocaleDateString();
    }
    if (ride._id) {
      const timestamp = parseInt(ride._id.substring(0, 8), 16) * 1000;
      return new Date(timestamp).toLocaleDateString();
    }
    return 'N/A';
  }
  
  function renderMyRides(rides) {
    cardsContainer.innerHTML = '';
    if (rides.length === 0) {
      cardsContainer.innerHTML = '<div class="no-rides">No rides found. Request your first ride!</div>';
      return;
    }
    
    for (const r of rides) {
      const card = document.createElement('div');
      card.className = 'ride-card';
      card.style.borderLeft = `4px solid ${statusColors[r.status] || '#ccc'}`;
      
      const date = getRideDate(r);
      
      card.innerHTML = `
        <div class="ride-card-header">
          <span class="ride-status" style="background-color: ${statusColors[r.status] || '#ccc'}">${r.status || 'requested'}</span>
          <span class="ride-date">${date}</span>
        </div>
        <div class="ride-card-body">
          <div class="ride-info">
            <div class="info-item">
              <span class="info-label">📍 Pickup:</span>
              <span class="info-value">${r.pickup || r.origin || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">🎯 Destination:</span>
              <span class="info-value">${r.destination || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">📏 Distance:</span>
              <span class="info-value">${r.distance ? r.distance + ' km' : 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">💰 Fare:</span>
              <span class="info-value">${r.fare ? 'RM' + r.fare : 'N/A'}</span>
            </div>
            ${r.driverID ? `
            <div class="info-item">
              <span class="info-label">🚗 Driver ID:</span>
              <span class="info-value">${r.driverID}</span>
            </div>` : ''}
          </div>
        </div>
        ${r.status === 'requested' || r.status === 'accepted' ? `
        <div class="ride-card-actions">
          <button class="cancel-btn" data-id="${r._id}">Cancel Ride</button>
        </div>` : ''}
      `;
      cardsContainer.appendChild(card);
    }
  }
  
  function filterRides() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusValue = statusFilter.value;
    
    const filtered = allRides.filter(ride => {
      const matchesSearch = 
        (ride.pickup && ride.pickup.toLowerCase().includes(searchTerm)) ||
        (ride.destination && ride.destination.toLowerCase().includes(searchTerm));
      
      const matchesStatus = statusValue === 'all' || ride.status === statusValue;
      
      return matchesSearch && matchesStatus;
    });
    
    renderMyRides(filtered);
  }
  
  async function loadMyRides() {
    try {
      statusEl.textContent = 'Loading your rides...';
      const list = await api('/rides');
      console.log('Current userId:', userId);
      console.log('All rides:', list);
      console.log('First ride user_id:', list.length > 0 ? list[0].user_id : 'No rides');
      // Filter to only show rides for the current user (excluding cancelled)
      // Compare as strings to handle both string and ObjectId formats
      allRides = list.filter(ride => {
        const match = String(ride.user_id) === String(userId);
        console.log(`Comparing ride.user_id: ${ride.user_id} with userId: ${userId} = ${match}`);
        return match && ride.status !== 'cancelled';
      });
      console.log('Filtered rides:', allRides);
      renderMyRides(allRides);
      statusEl.textContent = `${allRides.length} ride${allRides.length !== 1 ? 's' : ''} found`;
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
      cardsContainer.innerHTML = '<div class="no-rides">Failed to load rides</div>';
    }
  }
  
  async function handleCancelRide(e) {
    if (!e.target.classList.contains('cancel-btn')) return;
    
    const rideId = e.target.getAttribute('data-id');
    if (!confirm('Are you sure you want to cancel this ride?')) return;
    
    try {
      await api(`/rides/${rideId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      });
      loadMyRides();
    } catch (err) {
      alert('Error cancelling ride: ' + err.message);
    }
  }
  
  if (searchInput) searchInput.addEventListener('input', filterRides);
  if (statusFilter) statusFilter.addEventListener('change', filterRides);
  if (cardsContainer) cardsContainer.addEventListener('click', handleCancelRide);
  
  loadMyRides();
}

// ============================================
// ADD RIDE PAGE (add-ride.html)
// ============================================
if (window.location.pathname.endsWith('add-ride.html')) {
  const form = document.getElementById('add-form');
  const statusEl = document.getElementById('status');
  const { userId } = getAuthData();
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const data = {
      pickup: f.pickup.value,
      destination: f.destination.value,
      status: f.status.value || 'requested',
      user_id: userId
    };
    
    try {
      statusEl.textContent = 'Adding ride...';
      await api('/rides', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data)
      });
      statusEl.textContent = 'Ride added successfully!';
      f.reset();
      setTimeout(() => {
        const { role } = getAuthData();
        window.location.href = role === 'admin' ? 'rides.html' : 'my-rides.html';
      }, 1000);
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
    }
  });
}

// ============================================
// USERS PAGE (users.html)
// ============================================
if (window.location.pathname.endsWith('users.html')) {
  const statusEl = document.getElementById('status');
  const tbody = document.querySelector('#users-table tbody');
  const form = document.getElementById('user-form');
  
  function renderUsers(users) {
    tbody.innerHTML = '';
    for (const u of users) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.name || ''}</td>
        <td>${u.email || ''}</td>
        <td>${u.age || ''}</td>
        <td>${u._id || ''}</td>
        <td>
          <button data-id="${u._id}" class="del-btn">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    }
  }
  
  async function loadUsers() {
    try {
      statusEl.textContent = 'Loading users...';
      const list = await api('/users');
      renderUsers(list);
      statusEl.textContent = `Loaded ${list.length} users`;
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
    }
  }
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      name: form.name.value,
      email: form.email.value,
      password: form.password.value,
      age: parseInt(form.age.value) || undefined,
      userID: parseInt(form.userID.value) || undefined
    };
    
    try {
      statusEl.textContent = 'Adding user...';
      await api('/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data)
      });
      statusEl.textContent = 'User added successfully!';
      form.reset();
      loadUsers();
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
    }
  });
  
  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    
    if (btn.classList.contains('del-btn')) {
      if (!confirm('Delete this user?')) return;
      try {
        await api(`/users/${id}`, { method: 'DELETE' });
        loadUsers();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }
  });
  
  loadUsers();
}

// ============================================
// DRIVERS PAGE (drivers.html)
// ============================================
if (window.location.pathname.endsWith('drivers.html')) {
  const statusEl = document.getElementById('status');
  const tbody = document.querySelector('#drivers-table tbody');
  const form = document.getElementById('driver-form');
  
  function renderDrivers(drivers) {
    tbody.innerHTML = '';
    for (const d of drivers) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${d.name || ''}</td>
        <td>${d.email || ''}</td>
        <td>${d.age || ''}</td>
        <td>${d.isAvailable ? 'Yes' : 'No'}</td>
        <td>${d.ridesDone || 0}</td>
        <td>
          <button data-id="${d._id}" class="toggle-btn">Toggle Available</button>
          <button data-id="${d._id}" class="del-btn">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    }
  }
  
  async function loadDrivers() {
    try {
      statusEl.textContent = 'Loading drivers...';
      const list = await api('/drivers');
      renderDrivers(list);
      statusEl.textContent = `Loaded ${list.length} drivers`;
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
    }
  }
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      name: form.name.value,
      email: form.email.value,
      password: form.password.value,
      age: parseInt(form.age.value) || undefined,
      isAvailable: form.isAvailable.value === 'true',
      ridesDone: 0
    };
    
    try {
      statusEl.textContent = 'Adding driver...';
      await api('/drivers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data)
      });
      statusEl.textContent = 'Driver added successfully!';
      form.reset();
      loadDrivers();
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
    }
  });
  
  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    
    if (btn.classList.contains('toggle-btn')) {
      try {
        const drivers = await api('/drivers');
        const driver = drivers.find(d => d._id === id);
        if (!driver) throw new Error('Driver not found');
        await api(`/drivers/${id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ isAvailable: !driver.isAvailable })
        });
        loadDrivers();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    } else if (btn.classList.contains('del-btn')) {
      if (!confirm('Delete this driver?')) return;
      try {
        await api(`/drivers/${id}`, { method: 'DELETE' });
        loadDrivers();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }
  });
  
  loadDrivers();
}

// ============================================
// TRANSACTIONS PAGE (transactions.html)
// ============================================
if (window.location.pathname.endsWith('transactions.html')) {
  const statusEl = document.getElementById('status');
  const tbody = document.querySelector('#transactions-table tbody');
  const form = document.getElementById('transaction-form');
  let currentFilter = null;
  
  function renderTransactions(transactions) {
    tbody.innerHTML = '';
    for (const t of transactions) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${t.userID || ''}</td>
        <td>${t.driverID || ''}</td>
        <td>RM${parseFloat(t.amount || 0).toFixed(2)}</td>
        <td>${t.status || ''}</td>
        <td>
          <button data-id="${t._id}" class="edit-btn">Edit</button>
        </td>
      `;
      tbody.appendChild(tr);
    }
  }
  
  async function loadTransactions(driverID = null) {
    try {
      statusEl.textContent = 'Loading transactions...';
      const url = driverID ? `/transactions?DriverID=${driverID}` : '/transactions';
      const list = await api(url);
      renderTransactions(list);
      statusEl.textContent = `Loaded ${list.length} transactions`;
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
    }
  }
  
  window.filterTransactions = () => {
    const driverID = document.getElementById('driverFilter').value;
    currentFilter = driverID || null;
    loadTransactions(currentFilter);
  };
  
  window.clearFilter = () => {
    document.getElementById('driverFilter').value = '';
    currentFilter = null;
    loadTransactions();
  };
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      userID: parseInt(form.userID.value),
      driverID: parseInt(form.driverID.value),
      amount: parseFloat(form.amount.value),
      status: form.status.value
    };
    
    try {
      statusEl.textContent = 'Creating transaction...';
      await api('/transactions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data)
      });
      statusEl.textContent = 'Transaction created successfully!';
      form.reset();
      loadTransactions(currentFilter);
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
    }
  });
  
  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    
    if (btn.classList.contains('edit-btn')) {
      const newAmount = prompt('Enter new amount:');
      const newStatus = prompt('Enter new status (pending/completed/failed):');
      if (!newAmount && !newStatus) return;
      
      try {
        const data = {};
        if (newAmount) data.amount = parseFloat(newAmount);
        if (newStatus) data.status = newStatus;
        
        await api(`/transactions/${id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(data)
        });
        loadTransactions(currentFilter);
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }
  });
  
  loadTransactions();
}

// ============================================
// ANALYTICS PAGE (analytics.html)
// ============================================
if (window.location.pathname.endsWith('analytics.html')) {
  const statusEl = document.getElementById('status');
  
  async function loadAnalytics() {
    try {
      statusEl.textContent = 'Loading analytics...';
      
      // Fetch all data
      const [rides, drivers, transactions, users, passengerAnalytics, driverAnalytics] = await Promise.all([
        api('/rides').catch(() => []),
        api('/drivers').catch(() => []),
        api('/transactions').catch(() => []),
        api('/users').catch(() => []),
        api('/analytics/passengers/').catch(() => []),
        api('/analytics/drivers/').catch(() => [])
      ]);
      
      console.log('Driver Analytics:', driverAnalytics);
      console.log('Drivers:', drivers);
      console.log('Rides with driverID:', rides.filter(r => r.driverID));
      
      // Rides Status Chart
      const ridesStatusCounts = {
        requested: rides.filter(r => r.status === 'requested').length,
        accepted: rides.filter(r => r.status === 'accepted').length,
        ongoing: rides.filter(r => r.status === 'ongoing').length,
        completed: rides.filter(r => r.status === 'completed').length
      };
      
      new Chart(document.getElementById('ridesChart'), {
        type: 'doughnut',
        data: {
          labels: ['Requested', 'Accepted', 'Ongoing', 'Completed'],
          datasets: [{
            data: Object.values(ridesStatusCounts),
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
      
      // Drivers Availability Chart
      const availableDrivers = drivers.filter(d => d.status === 'available' || (!d.status && d.isAvailable)).length;
      const busyDrivers = drivers.filter(d => d.status === 'busy').length;
      const unavailableDrivers = drivers.length - availableDrivers - busyDrivers;
      
      new Chart(document.getElementById('driversChart'), {
        type: 'pie',
        data: {
          labels: ['Available', 'Busy', 'Unavailable'],
          datasets: [{
            data: [availableDrivers, busyDrivers, unavailableDrivers],
            backgroundColor: ['#4CAF50', '#FF9800', '#f44336']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
      
      // Transactions Status Chart
      const transStatusCounts = {
        pending: transactions.filter(t => t.status === 'pending').length,
        completed: transactions.filter(t => t.status === 'completed').length,
        failed: transactions.filter(t => t.status === 'failed').length
      };
      
      new Chart(document.getElementById('transactionsChart'), {
        type: 'bar',
        data: {
          labels: ['Pending', 'Completed', 'Failed'],
          datasets: [{
            label: 'Transactions',
            data: Object.values(transStatusCounts),
            backgroundColor: ['#FFCE56', '#4BC0C0', '#FF6384']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
      
      // Monthly Trend Chart (simulated data)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const monthlyRides = months.map(() => Math.floor(Math.random() * 50) + 10);
      
      new Chart(document.getElementById('trendChart'), {
        type: 'line',
        data: {
          labels: months,
          datasets: [{
            label: 'Rides per Month',
            data: monthlyRides,
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
      
      // Revenue by Driver Chart (using driver analytics from backend)
      if (driverAnalytics && driverAnalytics.length > 0) {
        const topDrivers = driverAnalytics
          .sort((a, b) => (b.totalFare || 0) - (a.totalFare || 0))
          .slice(0, 10);
        
        new Chart(document.getElementById('revenueChart'), {
          type: 'bar',
          data: {
            labels: topDrivers.map(d => d.name || 'Driver'),
            datasets: [{
              label: 'Revenue (RM)',
              data: topDrivers.map(d => d.totalFare || 0),
              backgroundColor: '#2196F3'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const driver = topDrivers[context.dataIndex];
                    return [
                      `Revenue: RM${(driver.totalFare || 0).toFixed(2)}`,
                      `Total Rides: ${driver.totalRides || 0}`,
                      `Avg Distance: ${(driver.avgDistance || 0).toFixed(2)} km`
                    ];
                  }
                }
              }
            },
            scales: {
              x: { beginAtZero: true }
            }
          }
        });
      } else {
        // Fallback to transaction-based calculation if no driver analytics available
        const revenueByDriver = {};
        transactions.forEach(t => {
          const driverId = t.driverID || 'Unknown';
          if (!revenueByDriver[driverId]) {
            revenueByDriver[driverId] = 0;
          }
          revenueByDriver[driverId] += parseFloat(t.amount || 0);
        });
        
        const topDrivers = Object.entries(revenueByDriver)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);
        
        new Chart(document.getElementById('revenueChart'), {
          type: 'bar',
          data: {
            labels: topDrivers.map(d => `Driver ${d[0]}`),
            datasets: [{
              label: 'Revenue (RM)',
              data: topDrivers.map(d => d[1]),
              backgroundColor: '#2196F3'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: {
              legend: { display: false }
            },
            scales: {
              x: { beginAtZero: true }
            }
          }
        });
      }
      
      // Passenger Statistics Chart (Total Fare, Avg Distance, Rides per User)
      if (passengerAnalytics && passengerAnalytics.length > 0) {
        const topPassengers = passengerAnalytics.slice(0, 10);
        
        new Chart(document.getElementById('passengerStatsChart'), {
          type: 'bar',
          data: {
            labels: topPassengers.map(p => p.name || 'User'),
            datasets: [
              {
                label: 'Total Fare ($)',
                data: topPassengers.map(p => p.totalFare || 0),
                backgroundColor: '#4CAF50',
                yAxisID: 'y'
              },
              {
                label: 'Avg Distance (km)',
                data: topPassengers.map(p => (p.avgDistance || 0).toFixed(2)),
                backgroundColor: '#FF9800',
                yAxisID: 'y1'
              },
              {
                label: 'Total Rides',
                data: topPassengers.map(p => p.totalRides || 0),
                backgroundColor: '#9C27B0',
                yAxisID: 'y2'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
              mode: 'index',
              intersect: false
            },
            plugins: {
              legend: { 
                position: 'top',
                labels: {
                  usePointStyle: true
                }
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    let label = context.dataset.label || '';
                    if (label) {
                      label += ': ';
                    }
                    if (context.parsed.y !== null) {
                      if (context.datasetIndex === 0) {
                        label += 'RM' + context.parsed.y.toFixed(2);
                      } else if (context.datasetIndex === 1) {
                        label += context.parsed.y + ' km';
                      } else {
                        label += context.parsed.y;
                      }
                    }
                    return label;
                  }
                }
              }
            },
            scales: {
              y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: {
                  display: true,
                  text: 'Total Fare ($)'
                }
              },
              y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: {
                  display: true,
                  text: 'Avg Distance (km)'
                },
                grid: {
                  drawOnChartArea: false
                }
              },
              y2: {
                type: 'linear',
                display: false,
                position: 'right'
              }
            }
          }
        });
      }
      
      statusEl.textContent = `Analytics loaded: ${rides.length} rides, ${drivers.length} drivers, ${transactions.length} transactions`;
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
    }
  }
  
  loadAnalytics();
}

// ============================================
// REGISTER VEHICLE PAGE (register-vehicle.html)
// ============================================
if (window.location.pathname.endsWith('register-vehicle.html')) {
  const form = document.getElementById('vehicle-form');
  const statusEl = document.getElementById('status');
  const vehicleInfo = document.getElementById('vehicle-info');
  const { userId } = getAuthData();
  
  async function loadVehicle() {
    try {
      const vehicles = await api('/vehicles');
      const myVehicle = vehicles.find(v => v.driverID === userId);
      
      if (myVehicle) {
        vehicleInfo.innerHTML = `
          <div class="info-item"><strong>Make:</strong> ${myVehicle.make}</div>
          <div class="info-item"><strong>Model:</strong> ${myVehicle.model}</div>
          <div class="info-item"><strong>Year:</strong> ${myVehicle.year}</div>
          <div class="info-item"><strong>License Plate:</strong> ${myVehicle.licensePlate}</div>
          <div class="info-item"><strong>Color:</strong> ${myVehicle.color}</div>
          <div class="info-item"><strong>Capacity:</strong> ${myVehicle.capacity} passengers</div>
        `;
        
        // Pre-fill form with existing data
        form.make.value = myVehicle.make;
        form.model.value = myVehicle.model;
        form.year.value = myVehicle.year;
        form.licensePlate.value = myVehicle.licensePlate;
        form.color.value = myVehicle.color;
        form.capacity.value = myVehicle.capacity;
      } else {
        vehicleInfo.innerHTML = '<p>No vehicle registered yet. Please fill out the form above to register your vehicle.</p>';
      }
    } catch (err) {
      vehicleInfo.innerHTML = '<p>Error loading vehicle information</p>';
    }
  }
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const vehicleData = {
      driverID: userId,
      make: form.make.value,
      model: form.model.value,
      year: parseInt(form.year.value),
      licensePlate: form.licensePlate.value.toUpperCase(),
      color: form.color.value,
      capacity: parseInt(form.capacity.value)
    };
    
    try {
      statusEl.textContent = 'Registering vehicle...';
      statusEl.className = '';
      
      await api('/vehicles', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(vehicleData)
      });
      
      statusEl.textContent = 'Vehicle registered successfully!';
      statusEl.className = 'success';
      loadVehicle();
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
      statusEl.className = 'error';
    }
  });
  
  loadVehicle();
}

// ============================================
// PROFILE PAGE (profile.html)
// ============================================
if (window.location.pathname.endsWith('profile.html')) {
  const statusEl = document.getElementById('status');
  const profileForm = document.getElementById('profile-form');
  const paymentForm = document.getElementById('payment-form');
  const passwordForm = document.getElementById('password-form');
  const { userId } = getAuthData();
  
  // Load user profile
  async function loadProfile() {
    try {
      statusEl.textContent = 'Loading profile...';
      const user = await api(`/users/${userId}`);
      
      // Populate profile form
      profileForm.name.value = user.name || '';
      profileForm.email.value = user.email || '';
      profileForm.age.value = user.age || '';
      profileForm.phone.value = user.phone || '';
      
      // Populate payment form if data exists
      if (user.paymentMethod) {
        paymentForm.cardNumber.value = user.paymentMethod.cardNumber || '';
        paymentForm.cardHolder.value = user.paymentMethod.cardHolder || '';
        paymentForm.expiryDate.value = user.paymentMethod.expiryDate || '';
        paymentForm.billingAddress.value = user.paymentMethod.billingAddress || '';
      }
      
      statusEl.textContent = 'Profile loaded successfully';
    } catch (err) {
      statusEl.textContent = 'Error loading profile: ' + err.message;
    }
  }
  
  // Update profile
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
      name: profileForm.name.value,
      email: profileForm.email.value,
      age: parseInt(profileForm.age.value) || undefined,
      phone: profileForm.phone.value
    };
    
    try {
      statusEl.textContent = 'Updating profile...';
      await api(`/users/${userId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data)
      });
      statusEl.textContent = 'Profile updated successfully!';
      statusEl.style.color = '#4CAF50';
    } catch (err) {
      statusEl.textContent = 'Error updating profile: ' + err.message;
      statusEl.style.color = '#f44336';
    }
  });
  
  // Update payment method
  paymentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const paymentData = {
      paymentMethod: {
        cardNumber: paymentForm.cardNumber.value,
        cardHolder: paymentForm.cardHolder.value,
        expiryDate: paymentForm.expiryDate.value,
        billingAddress: paymentForm.billingAddress.value
      }
    };
    
    try {
      statusEl.textContent = 'Updating payment method...';
      await api(`/users/${userId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(paymentData)
      });
      statusEl.textContent = 'Payment method updated successfully!';
      statusEl.style.color = '#4CAF50';
      // Clear CVV for security
      paymentForm.cvv.value = '';
    } catch (err) {
      statusEl.textContent = 'Error updating payment method: ' + err.message;
      statusEl.style.color = '#f44336';
    }
  });
  
  // Change password
  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newPassword = passwordForm.newPassword.value;
    const confirmPassword = passwordForm.confirmPassword.value;
    
    if (newPassword !== confirmPassword) {
      statusEl.textContent = 'Error: Passwords do not match';
      statusEl.style.color = '#f44336';
      return;
    }
    
    const data = {
      password: newPassword
    };
    
    try {
      statusEl.textContent = 'Changing password...';
      await api(`/users/${userId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data)
      });
      statusEl.textContent = 'Password changed successfully!';
      statusEl.style.color = '#4CAF50';
      passwordForm.reset();
    } catch (err) {
      statusEl.textContent = 'Error changing password: ' + err.message;
      statusEl.style.color = '#f44336';
    }
  });
  
  // Delete account function
  window.deleteAccount = async function() {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone!')) {
      return;
    }
    
    if (!confirm('This will permanently delete all your data. Are you absolutely sure?')) {
      return;
    }
    
    try {
      statusEl.textContent = 'Deleting account...';
      await api(`/users/${userId}`, { method: 'DELETE' });
      alert('Account deleted successfully');
      logout();
    } catch (err) {
      statusEl.textContent = 'Error deleting account: ' + err.message;
      statusEl.style.color = '#f44336';
    }
  };
  
  // Format card number input
  paymentForm.cardNumber.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\s/g, '');
    let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
    e.target.value = formattedValue;
  });
  
  // Format expiry date input
  paymentForm.expiryDate.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2, 4);
    }
    e.target.value = value;
  });
  
  // Only allow numbers in CVV
  paymentForm.cvv.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
  });
  
  loadProfile();
}