/* ============================================================
   RaffleProp — admin.js
   Admin panel: sidebar, Chart.js, tables, draw manager, CSV
   ============================================================ */

'use strict';

/* ── Admin Sidebar ──────────────────────────────────────────── */
function injectAdminSidebar(activePage) {
  const nav = [
    { key: 'dashboard', icon: 'fa-gauge-high', label: 'Dashboard', href: 'index.html' },
    { key: 'campaigns', icon: 'fa-trophy', label: 'Campaigns', href: 'campaigns.html' },
    { key: 'draw', icon: 'fa-dice', label: 'Draw Manager', href: 'draw.html', badge: '1' },
    { key: 'users', icon: 'fa-users', label: 'Users', href: 'users.html' },
    { key: 'tickets', icon: 'fa-ticket', label: 'Ticket Registry', href: 'tickets.html' },
    { key: 'content', icon: 'fa-pen-to-square', label: 'Content Manager', href: 'content.html' }
  ];

  const complianceNav = [
    { key: 'calculator', icon: 'fa-calculator', label: 'Profit Calculator', href: 'calculator.html' },
    { key: 'compliance', icon: 'fa-shield-halved', label: 'FCCPC Approvals', href: 'compliance.html' },
    { key: 'regulatory-calendar', icon: 'fa-calendar-check', label: 'Reg. Calendar', href: 'regulatory-calendar.html' },
    { key: 'property-manager', icon: 'fa-folder-open', label: 'Property Manager', href: 'property-manager.html' },
    { key: 'post-draw', icon: 'fa-file-circle-check', label: 'Post-Draw Filing', href: 'post-draw.html', badge: '2' },
    { key: 'refund-manager', icon: 'fa-rotate-left', label: 'Refund Manager', href: 'refund-manager.html' }
  ];

  const operationsNav = [
    { key: 'influencer', icon: 'fa-star', label: 'Influencer Compliance', href: 'influencer.html' },
    { key: 'comms', icon: 'fa-paper-plane', label: 'Comms Hub', href: 'comms.html' }
  ];

  const sidebar = document.getElementById('admin-sidebar');
  if (!sidebar) return;

  sidebar.innerHTML = `
    <div class="admin-sidebar-logo">
      <div class="logo-text">Raffle<span>Prop</span></div>
      <div class="logo-sub">Admin Panel</div>
    </div>
    <nav class="admin-nav">
      <div class="admin-nav-label">Main Menu</div>
      ${nav.map(item => `
        <a href="${item.href}" class="admin-nav-item${activePage === item.key ? ' active' : ''}">
          <i class="fa-solid ${item.icon}"></i>
          <span>${item.label}</span>
          ${item.badge ? `<span class="badge-count">${item.badge}</span>` : ''}
        </a>`).join('')}
      <div class="admin-nav-label" style="margin-top:1.5rem;">Compliance</div>
      ${complianceNav.map(item => `
        <a href="${item.href}" class="admin-nav-item${activePage === item.key ? ' active' : ''}">
          <i class="fa-solid ${item.icon}"></i>
          <span>${item.label}</span>
          ${item.badge ? `<span class="badge-count">${item.badge}</span>` : ''}
        </a>`).join('')}
      <div class="admin-nav-label" style="margin-top:1.5rem;">Operations</div>
      ${operationsNav.map(item => `
        <a href="${item.href}" class="admin-nav-item${activePage === item.key ? ' active' : ''}">
          <i class="fa-solid ${item.icon}"></i>
          <span>${item.label}</span>
        </a>`).join('')}
      <div class="admin-nav-label" style="margin-top:1.5rem;">System</div>
      <a href="../index.html" class="admin-nav-item" target="_blank">
        <i class="fa-solid fa-arrow-up-right-from-square"></i><span>View Website</span>
      </a>
      <a href="../trust-legal.html" class="admin-nav-item">
        <i class="fa-solid fa-scale-balanced"></i><span>Legal Centre</span>
      </a>
    </nav>
    <div class="admin-sidebar-footer">
      <div class="admin-user-card">
        <div class="admin-user-avatar">A</div>
        <div>
          <div class="admin-user-name">Admin User</div>
          <div class="admin-user-role">Super Admin</div>
        </div>
      </div>
      <button onclick="Auth.logout()" style="display:flex;align-items:center;gap:0.5rem;width:100%;padding:0.625rem 0.75rem;color:rgba(255,255,255,0.5);font-size:0.8125rem;font-weight:500;border-radius:6px;margin-top:0.5rem;transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='none'">
        <i class="fa-solid fa-right-from-bracket"></i> Log Out
      </button>
    </div>`;
}

/* ── Chart.js Helpers ───────────────────────────────────────── */
const chartDefaults = {
  font: { family: 'Inter, sans-serif', size: 12 },
  color: '#6b7280'
};

function initRevenueChart() {
  const ctx = document.getElementById('revenue-chart');
  if (!ctx) return;
  const labels = ['Apr 1','Apr 2','Apr 3','Apr 4','Apr 5','Apr 6','Apr 7','Apr 8','Apr 9','Apr 10','Apr 11'];
  const data = [1250000,1875000,2100000,1650000,2450000,3100000,2800000,3250000,2950000,3500000,3150000];
  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Daily Revenue',
        data,
        borderColor: '#0D5E30',
        backgroundColor: 'rgba(13,94,48,0.08)',
        borderWidth: 2.5,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#0D5E30',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: v => '₦' + (v.raw/1000000).toFixed(2) + 'M' } } },
      scales: {
        x: { grid: { display: false }, ticks: { ...chartDefaults } },
        y: { grid: { color: '#f3f4f6' }, ticks: { ...chartDefaults, callback: v => '₦' + (v/1000000).toFixed(1) + 'M' } }
      }
    }
  });
}

function initTicketChart() {
  const ctx = document.getElementById('ticket-chart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Lekki Duplex', 'Gwarinpa Abuja', 'Banana Island'],
      datasets: [{
        label: 'Tickets Sold',
        data: [18420, 8100, 0],
        backgroundColor: ['#0D5E30', '#15803d', '#C8922A'],
        borderRadius: 8,
        borderSkipped: false
      }, {
        label: 'Remaining',
        data: [6580, 6900, 50000],
        backgroundColor: ['#dcfce7', '#dcfce7', '#fef9c3'],
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { ...chartDefaults, boxWidth: 12, borderRadius: 4 } } },
      scales: {
        x: { grid: { display: false }, ticks: { ...chartDefaults }, stacked: false },
        y: { grid: { color: '#f3f4f6' }, ticks: { ...chartDefaults, callback: v => v.toLocaleString() } }
      }
    }
  });
}

function initDailyTicketsChart() {
  const ctx = document.getElementById('daily-tickets-chart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Tickets Sold',
        data: [420, 580, 390, 710, 650, 890, 540],
        backgroundColor: '#C8922A',
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { ...chartDefaults } },
        y: { grid: { color: '#f3f4f6' }, ticks: { ...chartDefaults } }
      }
    }
  });
}

function initGatewayChart() {
  const ctx = document.getElementById('gateway-chart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Paystack', 'Flutterwave', 'Bank Transfer'],
      datasets: [{
        data: [62, 23, 15],
        backgroundColor: ['#0D5E30', '#C8922A', '#2563eb'],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: { position: 'right', labels: { ...chartDefaults, boxWidth: 12, padding: 16 } },
        tooltip: { callbacks: { label: v => v.label + ': ' + v.raw + '%' } }
      }
    }
  });
}

/* ── Live Sales Feed ────────────────────────────────────────── */
const liveNames = ['Chukwuemeka O.','Adaeze N.','Tunde F.','Blessing A.','Dr. Seun K.','Funmi S.','Ibrahim M.','Ngozi E.','Babatunde L.','Chioma O.'];
const liveCities = ['Lagos','Abuja','Port Harcourt','London','Houston','Dubai','Ibadan','Kano','Enugu','Benin City'];
const liveBundles = [{qty:1,price:2500},{qty:5,price:10000},{qty:10,price:18000},{qty:20,price:32000}];

function generateLiveFeedItem() {
  const name = liveNames[Math.floor(Math.random() * liveNames.length)];
  const city = liveCities[Math.floor(Math.random() * liveCities.length)];
  const bundle = liveBundles[Math.floor(Math.random() * liveBundles.length)];
  const campaigns = ['Lekki Phase 1 Duplex', 'Gwarinpa Abuja'];
  const campaign = campaigns[Math.floor(Math.random() * campaigns.length)];
  return { name, city, bundle, campaign, time: 'just now' };
}

function initLiveFeed() {
  const feed = document.getElementById('live-feed');
  if (!feed) return;

  function addFeedItem() {
    const item = generateLiveFeedItem();
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:0.875rem 1rem;border-bottom:1px solid var(--border-light);animation:fadeInUp 0.3s ease;';
    row.innerHTML = `
      <div style="display:flex;align-items:center;gap:0.75rem;">
        <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--green-primary),var(--green-light));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.875rem;flex-shrink:0;">${item.name[0]}</div>
        <div>
          <div style="font-size:0.875rem;font-weight:600;color:var(--text-primary);">${item.name}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">${item.city} · ${item.campaign}</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:0.875rem;font-weight:700;color:var(--green-primary);">${Utils.formatNaira(item.bundle.price)}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">${item.bundle.qty} ticket${item.bundle.qty > 1 ? 's' : ''} · just now</div>
      </div>`;
    feed.insertBefore(row, feed.firstChild);
    if (feed.children.length > 8) feed.removeChild(feed.lastChild);
  }

  // Initial items
  for (let i = 0; i < 6; i++) addFeedItem();
  // Live updates
  setInterval(addFeedItem, Math.random() * 5000 + 4000);
}

/* ── Data Tables ────────────────────────────────────────────── */
function renderCampaignsTable(campaigns = MOCK_DATA.campaigns) {
  const tbody = document.getElementById('campaigns-tbody');
  if (!tbody) return;
  const statusClasses = { active: 'badge-green', upcoming: 'badge-gold', sold_out: 'badge-red', closed: 'badge-gray', draw_complete: 'badge-purple' };
  const statusLabels = { active: 'Active', upcoming: 'Upcoming', sold_out: 'Sold Out', closed: 'Closed', draw_complete: 'Draw Complete' };

  tbody.innerHTML = campaigns.map(c => {
    const pct = Utils.pct(c.soldTickets, c.totalTickets);
    const revenue = c.soldTickets * c.ticketPrice;
    return `<tr>
      <td data-label="Campaign"><div style="font-weight:600;color:var(--text-primary);">${c.title}</div><div style="font-size:0.8125rem;color:var(--text-muted);">${c.location}</div></td>
      <td data-label="Status"><span class="badge ${statusClasses[c.status] || 'badge-gray'}">${statusLabels[c.status] || c.status}</span></td>
      <td data-label="Tickets">
        <div style="font-size:0.875rem;font-weight:600;">${Utils.formatNumber(c.soldTickets)} / ${Utils.formatNumber(c.totalTickets)}</div>
        <div class="progress-wrap" style="margin-top:4px;"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div style="font-size:0.75rem;color:var(--text-muted);">${pct}%</div>
      </td>
      <td data-label="Revenue"><strong>${Utils.formatNaira(revenue)}</strong></td>
      <td data-label="Worth">${Utils.formatNaira(c.worth)}</td>
      <td data-label="Actions">
        <div style="display:flex;gap:0.375rem;flex-wrap:wrap;">
          <button onclick="editCampaign('${c.id}')" class="btn btn-outline btn-sm"><i class="fa-solid fa-pen"></i></button>
          ${c.status === 'active' ? `<button onclick="pauseCampaign('${c.id}',this)" class="btn btn-sm" style="background:#fef9c3;color:#a16207;border:1px solid #fde68a;"><i class="fa-solid fa-pause"></i></button>` : ''}
          ${c.status === 'active' || c.status === 'sold_out' ? `<a href="draw.html?campaign=${c.id}" class="btn btn-primary btn-sm"><i class="fa-solid fa-dice"></i> Draw</a>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
}

function renderUsersTable(users = MOCK_DATA.adminUsers, filtered = false) {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  const kycClass = { verified: 'badge-green', pending: 'badge-gold', unverified: 'badge-gray' };

  tbody.innerHTML = users.map(u => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:0.625rem;">
          <div style="width:34px;height:34px;border-radius:50%;background:var(--green-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8125rem;flex-shrink:0;">${u.name[0]}</div>
          <div><div style="font-weight:600;font-size:0.875rem;">${u.name}</div><div style="font-size:0.8125rem;color:var(--text-muted);">${u.email}</div></div>
        </div>
      </td>
      <td style="font-size:0.875rem;">${u.phone}</td>
      <td><span class="badge ${kycClass[u.kyc] || 'badge-gray'}">${u.kyc.charAt(0).toUpperCase()+u.kyc.slice(1)}</span></td>
      <td><strong>${u.tickets}</strong> tickets</td>
      <td>${Utils.formatNaira(u.spent)}</td>
      <td>${u.referrals} refs</td>
      <td style="font-size:0.8125rem;color:var(--text-muted);">${u.joined}</td>
      <td>
        <div style="display:flex;gap:0.375rem;">
          <button onclick="viewUser('${u.id}')" class="btn btn-outline btn-sm"><i class="fa-solid fa-eye"></i></button>
          ${u.kyc === 'pending' ? `<button onclick="approveKYC('${u.id}',this)" class="btn btn-primary btn-sm">Approve KYC</button>` : ''}
          <button onclick="flagUser('${u.id}',this)" class="btn btn-sm" style="background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;"><i class="fa-solid fa-flag"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

function renderTicketsTable(campaignId) {
  const tbody = document.getElementById('tickets-tbody');
  if (!tbody) return;
  const c = MOCK_DATA.campaigns.find(c => c.id === campaignId) || MOCK_DATA.campaigns[0];
  const tickets = generateMockTickets(c, 20);
  tbody.innerHTML = tickets.map((t, i) => `
    <tr>
      <td><code style="font-size:0.8125rem;font-weight:700;color:var(--green-primary);">${t.number}</code></td>
      <td style="font-size:0.875rem;">${t.buyer}</td>
      <td style="font-size:0.875rem;">${t.email}</td>
      <td>${Utils.formatNaira(t.price)}</td>
      <td style="font-size:0.8125rem;">${t.method}</td>
      <td style="font-size:0.8125rem;color:var(--text-muted);">${t.date}</td>
      <td><span class="badge badge-green">Confirmed</span></td>
    </tr>`).join('');
}

function generateMockTickets(campaign, count) {
  const names = MOCK_DATA.adminUsers.map(u => ({ name: u.name, email: u.email }));
  const methods = ['Paystack', 'Flutterwave', 'Bank Transfer'];
  return Array.from({ length: count }, (_, i) => {
    const user = names[i % names.length];
    const prefix = campaign.id.split('-')[0].toUpperCase().slice(0, 3);
    return {
      number: `RP-${prefix}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`,
      buyer: user.name,
      email: user.email,
      price: 2500,
      method: methods[Math.floor(Math.random() * methods.length)],
      date: new Date(Date.now() - Math.random() * 7 * 86400000).toLocaleDateString('en-GB')
    };
  });
}

/* ── Admin Table Actions ────────────────────────────────────── */
function editCampaign(id) { window.location.href = 'campaigns.html?edit=' + id; }
function pauseCampaign(id, btn) {
  btn.innerHTML = '<i class="fa-solid fa-play"></i>';
  btn.title = 'Resume campaign';
  Toast.success('Campaign Paused', 'Ticket sales are now suspended.');
}
function viewUser(id) { Toast.info('User Details', 'Full user profile panel would open here.'); }
function approveKYC(id, btn) {
  btn.innerHTML = '<i class="fa-solid fa-check"></i> Approved';
  btn.disabled = true;
  btn.style.background = '#dcfce7';
  btn.style.color = '#15803d';
  Toast.success('KYC Approved', 'User has been verified.');
}
function flagUser(id, btn) {
  if (confirm('Flag this user for review?')) {
    btn.style.background = '#fee2e2';
    Toast.warning('User Flagged', 'This account has been flagged for manual review.');
  }
}

/* ── Draw Manager ───────────────────────────────────────────── */
let drawState = { step: 0, campaign: null, winnerTicket: '', winnerUser: null };

function initDrawManager() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('campaign') || 'lekki-duplex-001';
  drawState.campaign = MOCK_DATA.campaigns.find(c => c.id === id) || MOCK_DATA.campaigns[0];

  // Populate campaign select
  const sel = document.getElementById('draw-campaign-select');
  if (sel) {
    sel.innerHTML = MOCK_DATA.campaigns.filter(c => c.status === 'active' || c.status === 'sold_out').map(c =>
      `<option value="${c.id}" ${c.id === id ? 'selected' : ''}>${c.title} — ${c.location}</option>`).join('');
    sel.addEventListener('change', () => { drawState.campaign = MOCK_DATA.campaigns.find(c => c.id === sel.value); updateDrawInfo(); });
  }
  updateDrawInfo();
  showDrawStep(1);
}

function updateDrawInfo() {
  const c = drawState.campaign;
  if (!c) return;
  setEl('draw-campaign-name', c.title);
  setEl('draw-campaign-location', c.location);
  setEl('draw-total-tickets', Utils.formatNumber(c.soldTickets));
  setEl('draw-ticket-range', 'RP-' + c.id.split('-')[0].toUpperCase().slice(0,3) + '-00001 to -' + String(c.soldTickets).padStart(5,'0'));
}

function showDrawStep(n) {
  drawState.step = n;
  document.querySelectorAll('.draw-step').forEach(el => el.style.display = 'none');
  const el = document.getElementById('draw-step-' + n);
  if (el) { el.style.display = 'block'; }
  document.querySelectorAll('.draw-step-tab').forEach((t, i) => {
    t.classList.remove('active');
    if (i + 1 === n) t.classList.add('active');
  });
}

function lockTicketRegistry() {
  showDrawStep(2);
  Toast.success('Registry Locked', 'No new tickets can be purchased for this campaign.');
}

function initiateDraw() {
  showDrawStep(3);
  runDrawAnimation();
}

function runDrawAnimation() {
  const slotEl = document.getElementById('draw-slot');
  if (!slotEl) return;
  const c = drawState.campaign;
  const prefix = 'RP-' + c.id.split('-')[0].toUpperCase().slice(0,3) + '-';
  const winnerNum = Math.floor(Math.random() * c.soldTickets) + 1;
  const winnerTicket = prefix + String(winnerNum).padStart(5, '0');
  drawState.winnerTicket = winnerTicket;

  let iterations = 0;
  const maxIterations = 30;
  const interval = setInterval(() => {
    const randNum = Math.floor(Math.random() * c.soldTickets) + 1;
    slotEl.textContent = prefix + String(randNum).padStart(5, '0');
    slotEl.style.color = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
    iterations++;
    if (iterations >= maxIterations) {
      clearInterval(interval);
      // Slow down final reveal
      setTimeout(() => {
        slotEl.textContent = winnerTicket;
        slotEl.style.color = '#0D5E30';
        slotEl.style.fontSize = '2.5rem';
        slotEl.style.animation = 'successPop 0.5s ease';
        setTimeout(() => showDrawStep(4), 1000);
        setEl('winner-ticket-display', winnerTicket);
        // Find winner from mock
        const user = MOCK_DATA.adminUsers[Math.floor(Math.random() * MOCK_DATA.adminUsers.length)];
        drawState.winnerUser = user;
        setEl('winner-name-display', user.name);
        setEl('winner-email-display', user.email);
        setEl('winner-phone-display', user.phone);
      }, 500);
    }
  }, 80 + (iterations * 3)); // Slow down progressively
}

function confirmWinner() {
  showDrawStep(5);
  setEl('final-winner-ticket', drawState.winnerTicket);
  setEl('final-winner-name', drawState.winnerUser ? drawState.winnerUser.name : 'Winner');
  setEl('final-campaign', drawState.campaign ? drawState.campaign.title : '');
  Toast.success('Draw Complete!', 'Winner has been notified via email, SMS and WhatsApp.');
}

function notifyWinner() {
  Toast.success('Notifications Sent!', `Email, SMS and WhatsApp sent to ${drawState.winnerUser ? drawState.winnerUser.name : 'winner'}.`);
  const btn = document.getElementById('notify-winner-btn');
  if (btn) { btn.innerHTML = '<i class="fa-solid fa-check"></i> Notified!'; btn.disabled = true; }
}

/* ── Campaign Form ──────────────────────────────────────────── */
function initCampaignForm() {
  const form = document.getElementById('campaign-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    Toast.success('Campaign Saved!', 'Campaign has been created and will be reviewed before publishing.');
    setTimeout(() => window.location.href = 'campaigns.html', 1500);
  });

  // Auto-populate edit mode
  const params = new URLSearchParams(window.location.search);
  const editId = params.get('edit');
  if (editId) {
    const c = MOCK_DATA.campaigns.find(c => c.id === editId);
    if (c) {
      document.querySelector('h1').textContent = 'Edit Campaign';
      const titleEl = document.getElementById('form-title');
      const priceEl = document.getElementById('form-price');
      const capEl = document.getElementById('form-cap');
      if (titleEl) titleEl.value = c.title;
      if (priceEl) priceEl.value = c.ticketPrice;
      if (capEl) capEl.value = c.totalTickets;
    }
  }
}

/* ── CSV Export ─────────────────────────────────────────────── */
function exportCSV(data, filename) {
  if (!data || !data.length) { Toast.error('No data', 'Nothing to export.'); return; }
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([headers + '\n' + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  Toast.success('Exported!', `${data.length} rows saved to ${filename}`);
}

function exportTickets() {
  const c = MOCK_DATA.campaigns[0];
  const tickets = generateMockTickets(c, 50);
  exportCSV(tickets, `tickets-${c.id}-${new Date().toISOString().split('T')[0]}.csv`);
}

function exportUsers() {
  const users = MOCK_DATA.adminUsers.map(u => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, tickets: u.tickets, spent: u.spent, kyc: u.kyc, joined: u.joined, referrals: u.referrals }));
  exportCSV(users, `users-${new Date().toISOString().split('T')[0]}.csv`);
}

function setEl(id, content) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = content;
}

/* ── Auto-init ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Charts
  if (typeof Chart !== 'undefined') {
    Chart.defaults.font.family = 'Inter, sans-serif';
    initRevenueChart();
    initTicketChart();
    initDailyTicketsChart();
    initGatewayChart();
  }
  initLiveFeed();
  renderCampaignsTable();
  renderUsersTable();
  initDrawManager();
  initCampaignForm();
});
