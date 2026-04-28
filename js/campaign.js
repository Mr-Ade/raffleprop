/* ============================================================
   RaffleProp — campaign.js
   Campaign detail page: gallery, bundle selector,
   multi-step purchase flow, payment simulation
   ============================================================ */

'use strict';

/* ── State ─────────────────────────────────────────────────── */
let campaign = null;
let currentImageIndex = 0;
let currentStep = 1;
let selectedBundle = null;
let touchStartX = 0;

const purchase = {
  campaignId: '',
  qty: 1,
  price: 2500,
  bundleLabel: 'Single',
  name: '',
  email: '',
  phone: '',
  payMethod: 'paystack',
  termsAccepted: false,
  ticketNumbers: []
};

/* ── Init ───────────────────────────────────────────────────── */
function initCampaignPage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id') || 'lekki-duplex-001';
  campaign = Utils.getCampaign(id);
  if (!campaign) { window.location.href = 'campaigns.html'; return; }

  purchase.campaignId = campaign.id;
  renderCampaignDetail();
  initGallery();
  initBundleSelector();
  initPurchaseWidget();
  prefillUserDetails();
}

/* ── Campaign Detail Render ─────────────────────────────────── */
function renderComplianceBanners() {
  const bannersEl = document.getElementById('compliance-banners');
  if (!bannersEl) return;
  let html = '';

  // FCCPC banner — exact wording mandated by FCCPC Guidelines
  html += `<div style="background:var(--green-50,#f0fdf4);border:2px solid var(--green-primary,#0D5E30);border-radius:10px;padding:0.875rem 1rem;display:flex;align-items:flex-start;gap:0.75rem;">
    <i class="fa-solid fa-shield-halved" style="color:var(--green-primary,#0D5E30);font-size:1.25rem;flex-shrink:0;margin-top:0.1rem;"></i>
    <div>
      <div style="font-size:0.875rem;font-weight:600;color:#166534;line-height:1.5;">This promotional competition has been approved by the Federal Competition and Consumer Protection Commission. Approval Reference: <span style="font-family:monospace;font-weight:800;">${campaign.fccpcRef || '—'}</span></div>
      <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem;">Approved ${campaign.fccpcApprovalDate ? new Date(campaign.fccpcApprovalDate).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}) : '—'} · FCCPA 2018 §123</div>
    </div>
  </div>`;

  // LSLGA — Lagos campaigns only
  if (campaign.isLagos && campaign.lslgaRef) {
    html += `<div style="background:#eff6ff;border:2px solid #3b82f6;border-radius:10px;padding:0.875rem 1rem;display:flex;align-items:flex-start;gap:0.75rem;">
      <i class="fa-solid fa-building-columns" style="color:#3b82f6;font-size:1.25rem;flex-shrink:0;margin-top:0.1rem;"></i>
      <div>
        <div style="font-size:0.875rem;font-weight:600;color:#1e40af;line-height:1.5;">Licensed by the Lagos State Lotteries and Gaming Authority. Licence Number: <span style="font-family:monospace;font-weight:800;">${campaign.lslgaRef}</span></div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem;">Lagos State promotional competitions are additionally regulated by the LSLGA under the Lagos State Lottery Law 2004.</div>
      </div>
    </div>`;
  }

  // Escrow — must name bank and account type
  if (campaign.escrowBank) {
    const acctType = campaign.escrowAccountType || 'Dedicated Escrow Account';
    html += `<div style="background:#fefce8;border:2px solid var(--gold,#C8922A);border-radius:10px;padding:0.875rem 1rem;display:flex;align-items:flex-start;gap:0.75rem;">
      <i class="fa-solid fa-vault" style="color:var(--gold,#C8922A);font-size:1.25rem;flex-shrink:0;margin-top:0.1rem;"></i>
      <div>
        <div style="font-size:0.875rem;font-weight:600;color:#92400e;line-height:1.5;">All ticket proceeds are held in escrow at <strong>${campaign.escrowBank}, ${acctType}</strong>. Funds are released only after draw completion and winner verification.</div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem;">Full refund guaranteed if minimum ticket threshold is not reached — FCCPA 2018 §123.</div>
      </div>
    </div>`;
  }

  // NIESV — must show NGN amount, full valuer name, NIESV reg, + download link
  if (campaign.valuationBy) {
    const nisvDetail = campaign.nisvRegNo
      ? `Independent market value: <strong>NGN ${Utils.formatNaira(campaign.worth).replace('₦','')}</strong> — Verified by ${campaign.valuationBy}, NIESV Reg. <span style="font-family:monospace;font-weight:700;">${campaign.nisvRegNo}</span>`
      : `Independent market value: <strong>NGN ${Utils.formatNaira(campaign.worth).replace('₦','')}</strong> — Verified by ${campaign.valuationBy}`;
    html += `<div style="background:var(--bg-secondary,#f9fafb);border:1px solid var(--border,#e5e7eb);border-radius:10px;padding:0.875rem 1rem;display:flex;align-items:flex-start;gap:0.75rem;">
      <i class="fa-solid fa-file-certificate" style="color:#6d28d9;font-size:1.25rem;flex-shrink:0;margin-top:0.1rem;"></i>
      <div>
        <div style="font-size:0.875rem;line-height:1.6;">${nisvDetail}</div>
        <button onclick="downloadDoc('NIESV Valuation Report')" style="font-size:0.75rem;color:var(--green-primary,#0D5E30);margin-top:0.375rem;background:none;border:none;cursor:pointer;padding:0;font-weight:600;text-decoration:underline;"><i class="fa-solid fa-download" style="margin-right:0.25rem;"></i>Download Full NIESV Valuation Report (PDF)</button>
      </div>
    </div>`;
  }

  bannersEl.innerHTML = html;

  // Also update escrow bank references in the widget
  setEl('escrow-bank-text', campaign.escrowBank);
  setEl('escrow-bank-text-2', campaign.escrowBank);
}

function renderCampaignDetail() {
  // Title & meta
  document.title = `${campaign.title} — ${campaign.location} | RaffleProp`;
  setEl('campaign-title', campaign.title);
  setEl('campaign-title-hero', campaign.title);
  setEl('campaign-subtitle', campaign.subtitle);
  setEl('campaign-location-text', campaign.location);
  setEl('campaign-worth-text', Utils.formatNaira(campaign.worth));

  // Property specs
  setEl('spec-address', campaign.address);
  setEl('spec-type', campaign.type);
  setEl('spec-beds', campaign.beds + ' Bedrooms');
  setEl('spec-baths', campaign.baths + ' Bathrooms');
  setEl('spec-toilets', campaign.toilets + ' Toilets');
  setEl('spec-sqm', campaign.sqm + ' m²');
  setEl('spec-land', campaign.landSqm + ' m²');
  setEl('spec-cof', campaign.cOfO ? '<span class="badge badge-green"><i class="fa-solid fa-check"></i> Confirmed C of O</span>' : '<span class="badge badge-red">No C of O</span>');
  setEl('spec-floor', campaign.floor);
  setEl('spec-parking', campaign.parking + ' Spaces');
  setEl('spec-lawyer', campaign.lawyer);
  setEl('spec-valuation', campaign.valuationBy);
  setEl('spec-escrow', campaign.escrowBank);

  // Features list
  const featEl = document.getElementById('spec-features');
  if (featEl) {
    featEl.innerHTML = campaign.features.map(f => `<li style="padding:0.375rem 0;border-bottom:1px solid var(--border-light);font-size:0.875rem;display:flex;align-items:center;gap:0.5rem;"><i class="fa-solid fa-check-circle" style="color:var(--success);"></i>${f}</li>`).join('');
  }

  // Valuation badge — must show NGN amount, full valuer name, and NIESV Reg. number per spec
  const nisvRegSuffix = campaign.nisvRegNo ? `, NIESV Reg. ${campaign.nisvRegNo}` : '';
  setEl('valuation-badge-text', `Independent market value: NGN ${Utils.formatNaira(campaign.worth).replace('₦','')} — Verified by ${campaign.valuationBy}${nisvRegSuffix}`);

  // Escrow notice
  setEl('escrow-bank-text', campaign.escrowBank);

  // Description
  setEl('campaign-description', campaign.description);

  // Live stats
  renderLiveStats();

  // Countdown
  const cdEl = document.getElementById('detail-countdown');
  if (cdEl && campaign.daysToClose) {
    cdEl.dataset.countdownEnd = Utils.getCountdownDate(campaign.daysToClose);
    Countdown.init();
  }

  // Compliance banners (requires campaign data — must run here, not in inline DOMContentLoaded)
  renderComplianceBanners();

  // Share buttons
  initShareButtons();

  // Status banner
  const statusBanner = document.getElementById('status-banner');
  if (statusBanner) {
    if (campaign.status === 'active') statusBanner.style.display = 'none';
    else if (campaign.status === 'upcoming') {
      statusBanner.innerHTML = `<div style="background:#fef9c3;border:1px solid #fde68a;border-radius:10px;padding:1rem 1.25rem;color:#92400e;font-weight:600;text-align:center;">⏳ This campaign launches in <strong>${campaign.daysToLaunch} days</strong>. Ticket sales not yet open.</div>`;
    } else if (campaign.status === 'sold_out') {
      statusBanner.innerHTML = `<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:10px;padding:1rem;color:#b91c1c;font-weight:600;text-align:center;">🎟 Sold Out — Draw date announced soon!</div>`;
    }
  }
}

function renderLiveStats() {
  const pct = Utils.pct(campaign.soldTickets, campaign.totalTickets);
  const remaining = campaign.totalTickets - campaign.soldTickets;

  setEl('live-sold', Utils.formatNumber(campaign.soldTickets));
  setEl('live-total', Utils.formatNumber(campaign.totalTickets));
  setEl('live-remaining', Utils.formatNumber(remaining));
  setEl('live-pct-text', pct + '%');

  const fill = document.getElementById('live-progress-fill');
  if (fill) { fill.dataset.pct = pct; fill.dataset.livePct = campaign.id; setTimeout(() => fill.style.width = pct + '%', 100); }

  // Update live counter elements
  document.querySelectorAll(`[data-live-counter="${campaign.id}"]`).forEach(el => { el.textContent = Utils.formatNumber(campaign.soldTickets); });
}

function setEl(id, content) {
  const el = document.getElementById(id);
  if (el) { el.innerHTML = content; }
}

/* ── Gallery ────────────────────────────────────────────────── */
function initGallery() {
  const mainImg = document.getElementById('gallery-main');
  const thumbsEl = document.getElementById('gallery-thumbs');
  if (!mainImg || !thumbsEl) return;

  mainImg.src = campaign.images[0];
  mainImg.alt = campaign.title;
  mainImg.addEventListener('click', () => openLightbox(currentImageIndex));

  thumbsEl.innerHTML = campaign.images.map((src, i) =>
    `<img src="${src}" class="gallery-thumb${i === 0 ? ' active' : ''}" alt="Property photo ${i+1}" loading="lazy"
      role="button" tabindex="0"
      aria-label="View property photo ${i+1}"
      onclick="setGalleryImage(${i})"
      onkeydown="if(event.key==='Enter'||event.key===' '){setGalleryImage(${i});event.preventDefault();}">`
  ).join('');

  // Touch swipe on main image
  mainImg.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
  mainImg.addEventListener('touchend', e => {
    const delta = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) { delta > 0 ? nextImage() : prevImage(); }
  });

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') prevImage();
  });
}

function setGalleryImage(index) {
  currentImageIndex = index;
  const mainImg = document.getElementById('gallery-main');
  if (mainImg) { mainImg.src = campaign.images[index]; mainImg.style.opacity = '0'; setTimeout(() => mainImg.style.opacity = '1', 50); mainImg.style.transition = 'opacity 0.25s ease'; }
  document.querySelectorAll('.gallery-thumb').forEach((t, i) => t.classList.toggle('active', i === index));
}

function nextImage() { setGalleryImage((currentImageIndex + 1) % campaign.images.length); }
function prevImage() { setGalleryImage((currentImageIndex - 1 + campaign.images.length) % campaign.images.length); }

/* ── Lightbox ───────────────────────────────────────────────── */
function openLightbox(index) {
  let lb = document.getElementById('lightbox-overlay');
  if (!lb) {
    lb = document.createElement('div');
    lb.className = 'lightbox-overlay';
    lb.id = 'lightbox-overlay';
    lb.innerHTML = `
      <button class="lightbox-close" onclick="closeLightbox()"><i class="fa-solid fa-xmark"></i></button>
      <img id="lightbox-img" class="lightbox-img" src="" alt="Property">
      <button onclick="lbPrev()" style="position:absolute;left:1.5rem;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.1);border:none;color:#fff;font-size:1.5rem;width:44px;height:44px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class="fa-solid fa-chevron-left"></i></button>
      <button onclick="lbNext()" style="position:absolute;right:1.5rem;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.1);border:none;color:#fff;font-size:1.5rem;width:44px;height:44px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class="fa-solid fa-chevron-right"></i></button>`;
    lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
    document.body.appendChild(lb);
  }
  document.getElementById('lightbox-img').src = campaign.images[index];
  currentImageIndex = index;
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  const lb = document.getElementById('lightbox-overlay');
  if (lb) { lb.classList.remove('open'); document.body.style.overflow = ''; }
}
function lbNext() { const ni = (currentImageIndex + 1) % campaign.images.length; currentImageIndex = ni; document.getElementById('lightbox-img').src = campaign.images[ni]; }
function lbPrev() { const pi = (currentImageIndex - 1 + campaign.images.length) % campaign.images.length; currentImageIndex = pi; document.getElementById('lightbox-img').src = campaign.images[pi]; }

/* ── Bundle Selector ────────────────────────────────────────── */
const BUNDLES = [
  { qty: 1, price: 2500, label: 'Single', saving: null, popular: false },
  { qty: 5, price: 10000, label: 'Bundle', saving: '₦2,500 saved', popular: false },
  { qty: 10, price: 18000, label: 'Value', saving: '₦7,000 saved', popular: true },
  { qty: 20, price: 32000, label: 'Premium', saving: '₦18,000 saved', popular: false }
];

function initBundleSelector() {
  const grid = document.getElementById('bundle-grid');
  if (!grid) return;
  grid.innerHTML = BUNDLES.map((b, i) => {
    const unitPrice = Utils.formatNaira(Math.round(b.price / b.qty));
    return `
    <div class="bundle-card${i === 0 ? ' selected' : ''}" id="bundle-${i}" onclick="selectBundle(${i})">
      ${b.popular ? `<span class="bundle-popular">Most Popular</span>` : ''}
      <div class="bundle-qty">${b.qty}</div>
      <div class="bundle-label">${b.qty === 1 ? 'ticket' : 'tickets'} · ${b.label}</div>
      <div class="bundle-price">${Utils.formatNaira(b.price)}</div>
      <div style="font-size:0.6875rem;color:var(--text-muted);margin-top:0.125rem;">${unitPrice} each</div>
      ${b.saving ? `<div class="bundle-saving">${b.saving}</div>` : `<div class="bundle-saving" style="color:transparent;">—</div>`}
    </div>`;
  }).join('');

  selectBundle(0);

  // Populate winning odds
  if (campaign) {
    const remaining = campaign.totalTickets - campaign.soldTickets;
    const oddsEl = document.getElementById('winning-odds');
    if (oddsEl) oddsEl.textContent = Utils.formatNumber(remaining);
  }
}

function selectBundle(i) {
  selectedBundle = BUNDLES[i];
  purchase.qty = selectedBundle.qty;
  purchase.price = selectedBundle.price;
  purchase.bundleLabel = selectedBundle.label;

  document.querySelectorAll('.bundle-card').forEach((c, idx) => c.classList.toggle('selected', idx === i));
  updateOrderSummary();
}

function updateOrderSummary() {
  if (!selectedBundle) return;
  setEl('order-qty', selectedBundle.qty + ' ticket' + (selectedBundle.qty > 1 ? 's' : ''));
  setEl('order-price', Utils.formatNaira(selectedBundle.price));
  setEl('order-campaign', campaign.title);
  setEl('order-unit-price', Utils.formatNaira(selectedBundle.price / selectedBundle.qty) + ' each');
  if (selectedBundle.saving) setEl('order-saving', `<span style="color:var(--success);font-weight:600;">${selectedBundle.saving}</span>`);
}

/* ── Purchase Widget ────────────────────────────────────────── */
function initPurchaseWidget() {
  updateOrderSummary();
  showStep(1);

  // Skill question
  const sq = document.getElementById('skill-question-text');
  if (sq && campaign.skillQuestion) {
    sq.textContent = campaign.skillQuestion.q;
    const opts = document.getElementById('skill-options');
    if (opts) {
      opts.innerHTML = campaign.skillQuestion.options.map(opt =>
        `<label class="checkbox-wrap" style="margin-bottom:0.5rem;">
          <input type="radio" name="skill-answer" value="${opt}">
          <span class="checkbox-label">${opt}</span>
        </label>`).join('');
    }
  }

  // Payment tabs
  document.querySelectorAll('.pay-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.pay-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.pay-content').forEach(c => c.style.display = 'none');
      tab.classList.add('active');
      purchase.payMethod = tab.dataset.method;
      const content = document.getElementById('pay-' + tab.dataset.method);
      if (content) content.style.display = 'block';
    });
  });
  // Show first tab content
  const firstContent = document.querySelector('.pay-content');
  if (firstContent) firstContent.style.display = 'block';

  // Sync USSD ref to same reference as bank transfer
  const ussdRef = document.getElementById('ussd-ref');
  const bankRef = document.getElementById('bank-ref');
  if (ussdRef && bankRef) ussdRef.textContent = bankRef.textContent;

  // T&Cs
  const termsCheck = document.getElementById('terms-checkbox');
  if (termsCheck) termsCheck.addEventListener('change', () => {
    purchase.termsAccepted = termsCheck.checked;
    const confirmBtn = document.getElementById('confirm-pay-btn');
    if (confirmBtn) confirmBtn.disabled = !termsCheck.checked;
  });
}

function prefillUserDetails() {
  const user = Auth.getUser();
  if (!user) return;
  const nameEl = document.getElementById('buyer-name');
  const emailEl = document.getElementById('buyer-email');
  const phoneEl = document.getElementById('buyer-phone');
  if (nameEl) nameEl.value = user.name || '';
  if (emailEl) emailEl.value = user.email || '';
  if (phoneEl) phoneEl.value = user.phone || '';
}

/* ── Purchase Steps ─────────────────────────────────────────── */
function showStep(n) {
  currentStep = n;
  document.querySelectorAll('.purchase-step').forEach(el => el.style.display = 'none');
  const stepEl = document.getElementById('step-' + n);
  if (stepEl) { stepEl.style.display = 'block'; stepEl.classList.add('animate-fade-up'); }

  // Update indicator
  document.querySelectorAll('.p-step-dot').forEach((dot, i) => {
    dot.classList.remove('active', 'done');
    if (i + 1 < n) dot.classList.add('done');
    else if (i + 1 === n) dot.classList.add('active');
  });
  document.querySelectorAll('.p-step-line').forEach((line, i) => line.classList.toggle('done', i + 1 < n));

  // Scroll to widget and move keyboard focus to the step heading
  const widget = document.getElementById('purchase-widget');
  if (widget) setTimeout(() => widget.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  const heading = document.querySelector('#step-' + n + ' h3');
  if (heading) { heading.setAttribute('tabindex', '-1'); setTimeout(() => heading.focus(), 150); }
}

// ── New step functions (Skill Q first flow) ──────────────────
// Step 1 → 2: validate skill answer
function pwStep1Next() {
  const answer = document.querySelector('input[name="skill-answer"]:checked');
  if (!answer) { Toast.error('Please answer the question', 'This is required for competition entry.'); return; }
  if (answer.value !== campaign.skillQuestion.a) {
    Toast.error('Incorrect answer', 'Please try again and select the correct option.');
    document.querySelectorAll('input[name="skill-answer"]').forEach(r => r.checked = false);
    return;
  }
  showStep(2);
}

// Step 2 → 3: validate bundle selected
function pwStep2Next() {
  if (!selectedBundle) { Toast.error('Select a ticket bundle', 'Please choose how many tickets you want.'); return; }
  updateOrderSummary();
  showStep(3);
}

// Step 3 → 4: validate contact details
function pwStep3Next() {
  const name = document.getElementById('buyer-name');
  const email = document.getElementById('buyer-email');
  const phone = document.getElementById('buyer-phone');
  if (name && !name.value.trim()) { name.classList.add('error'); Toast.error('Name required', ''); return; }
  if (email && !validateEmail(email.value)) { email.classList.add('error'); Toast.error('Valid email required', ''); return; }
  if (phone && !phone.value.trim()) { phone.classList.add('error'); Toast.error('Phone number required', ''); return; }
  if (name) { purchase.name = name.value.trim(); name.classList.remove('error'); }
  if (email) { purchase.email = email.value.trim(); email.classList.remove('error'); }
  if (phone) { purchase.phone = phone.value.trim(); phone.classList.remove('error'); }
  showStep(4);
}

// Step 4 → 5: show review
function pwStep4Next() {
  showStep(5);
  setEl('review-campaign', campaign.title);
  setEl('review-tickets', purchase.qty + ' ticket' + (purchase.qty > 1 ? 's' : ''));
  setEl('review-price', Utils.formatNaira(purchase.price));
  setEl('review-method', purchase.payMethod.charAt(0).toUpperCase() + purchase.payMethod.slice(1));
  setEl('review-name', purchase.name || (Auth.getUser() ? Auth.getUser().name : 'Guest'));
  // Populate FCCPC ref
  const fccpcEl = document.getElementById('pay-fccpc-ref');
  if (fccpcEl && campaign.fccpcRef) fccpcEl.textContent = campaign.fccpcRef;
}

// Legacy aliases (kept for any external references)
function goToStep2() { pwStep1Next(); }
function goToStep3() { pwStep3Next(); }
function goToStep4() { pwStep4Next(); }

function confirmPayment() {
  if (!purchase.termsAccepted) { Toast.error('Accept Terms & Conditions', 'Please check the T&Cs box to proceed.'); return; }
  showStep(6);
  processPayment();
}

function processPayment() {
  const progressEl = document.getElementById('payment-progress-text');
  const steps = ['Connecting to payment gateway...', 'Securing transaction...', 'Verifying payment...', 'Assigning ticket numbers...', 'Complete!'];
  let i = 0;
  const interval = setInterval(() => {
    if (progressEl && steps[i]) progressEl.textContent = steps[i];
    i++;
    if (i >= steps.length) {
      clearInterval(interval);
      setTimeout(showSuccess, 500);
    }
  }, 700);
}

function showSuccess() {
  // Generate ticket numbers
  purchase.ticketNumbers = Array.from({ length: purchase.qty }, () =>
    'RP-' + campaign.id.split('-')[0].toUpperCase().slice(0, 3) + '-' + String(Math.floor(Math.random() * 99999)).padStart(5, '0')
  );

  const txnDate = new Date();
  const txnRef = 'TXN' + Date.now();
  const unitPrice = Math.round(purchase.price / purchase.qty);
  const subtotal = purchase.price;
  const vatRate = 0.075;
  const vatAmt = Math.round(subtotal * vatRate);
  const totalIncVat = subtotal + vatAmt;
  const user = Auth.getUser() || { name: purchase.name, email: purchase.email };

  // §118 compliant full record — all 12 required fields
  const txnRecord = {
    id: txnRef,
    // §118(a) Company full registered name
    companyName: 'RaffleProp Limited',
    // §118(b) Registered business address
    companyAddress: '14 Admiralty Way, Lekki Phase 1, Lagos, Nigeria. RC-1234567',
    // §118(c) Date of transaction
    date: txnDate.toISOString(),
    // §118(d) Description: ticket number(s) + campaign name
    description: `Promotional competition entry — ${campaign.title}. Ticket(s): ${purchase.ticketNumbers.join(', ')}`,
    // §118(e) Unit price per ticket
    unitPrice: unitPrice,
    // §118(f) Number of tickets purchased
    qty: purchase.qty,
    // §118(g) Total price before taxes
    subtotal: subtotal,
    // §118(h) VAT (7.5%)
    vat: vatAmt,
    // §118(i) Total price including taxes
    totalIncVat: totalIncVat,
    // FCCPC Guidelines §4(h) Approval reference
    fccpcRef: campaign.fccpcRef || '—',
    // FCCPC Form CPC A §16 Draw date and method
    drawDate: campaign.drawDate || '—',
    drawMethod: 'Verifiable Random Number Generator (RNG) — Live-streamed draw',
    // Escrow confirmation
    escrowBank: campaign.escrowBank || '—',
    escrowAccountType: campaign.escrowAccountType || 'Dedicated Escrow Account',
    // Additional fields
    campaignId: campaign.id,
    campaignTitle: campaign.title,
    location: campaign.location,
    tickets: purchase.ticketNumbers,
    method: purchase.payMethod,
    buyerName: purchase.name,
    buyerEmail: purchase.email,
    status: 'confirmed'
  };

  // Save to localStorage
  const existing = JSON.parse(localStorage.getItem('rp_tickets') || '[]');
  existing.push(txnRecord);
  localStorage.setItem('rp_tickets', JSON.stringify(existing));

  showStep(7);

  // Render ticket numbers
  setEl('success-tickets', purchase.ticketNumbers.map(t =>
    `<div style="background:var(--green-50);border:1px solid var(--green-100);border-radius:8px;padding:0.5rem 1rem;font-family:monospace;font-size:0.875rem;font-weight:700;color:var(--green-primary);">${t}</div>`
  ).join(''));
  setEl('success-campaign', campaign.title + ' — ' + campaign.location);
  setEl('success-name', purchase.name || (user.name || 'you'));

  // Render §118 fields in receipt block
  const receiptEl = document.getElementById('success-receipt-fields');
  if (receiptEl) {
    const fmt = (label, val, mono) => `<div style="display:flex;justify-content:space-between;gap:0.5rem;padding:0.25rem 0;border-bottom:1px solid var(--border-light);"><span style="color:var(--text-muted);flex-shrink:0;">${label}</span><span style="font-weight:600;text-align:right;${mono?'font-family:monospace;':''}">${val}</span></div>`;
    receiptEl.innerHTML = [
      fmt('Company', txnRecord.companyName),
      fmt('Registered Address', txnRecord.companyAddress),
      fmt('Transaction Date', txnDate.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})),
      fmt('Transaction Ref', txnRef, true),
      fmt('FCCPC Approval Ref', txnRecord.fccpcRef, true),
      fmt('Campaign', campaign.title),
      fmt('Ticket Number(s)', purchase.ticketNumbers.join(', '), true),
      fmt('Unit Price (NGN)', Utils.formatNaira(unitPrice)),
      fmt('Qty', purchase.qty + ' ticket' + (purchase.qty > 1 ? 's' : '')),
      fmt('Subtotal (before VAT)', Utils.formatNaira(subtotal)),
      fmt('VAT (7.5%)', Utils.formatNaira(vatAmt)),
      fmt('TOTAL (incl. VAT)', Utils.formatNaira(totalIncVat)),
      fmt('Draw Date', txnRecord.drawDate),
      fmt('Draw Method', 'RNG — Live-streamed'),
      fmt('Escrow', `${txnRecord.escrowBank} — ${txnRecord.escrowAccountType}`),
    ].join('');
  }

  Toast.success('Purchase Complete!', `${purchase.qty} ticket${purchase.qty > 1 ? 's' : ''} confirmed for ${campaign.title}`);
}

function validateEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function resetPurchase() {
  currentStep = 1;
  selectedBundle = null;
  purchase.termsAccepted = false;
  initBundleSelector();
  showStep(1);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Share ──────────────────────────────────────────────────── */
function initShareButtons() {
  const url = window.location.href;
  const text = `Win a ${campaign.title} in ${campaign.location} — worth ${Utils.formatNaira(campaign.worth)}! Tickets from ₦2,500. Enter now:`;
  const waBtn = document.getElementById('share-whatsapp');
  const twBtn = document.getElementById('share-twitter');
  const fbBtn = document.getElementById('share-facebook');
  const cpBtn = document.getElementById('share-copy');
  const user = Auth.getUser();
  const refSuffix = user && user.referralCode ? '?ref=' + user.referralCode : '';
  const shareUrl = url + refSuffix;

  if (waBtn) waBtn.addEventListener('click', () => shareWhatsApp(text + ' ' + shareUrl));
  if (twBtn) twBtn.addEventListener('click', () => shareTwitter(text, shareUrl));
  if (fbBtn) fbBtn.addEventListener('click', () => shareFacebook(shareUrl));
  if (cpBtn) cpBtn.addEventListener('click', () => copyLink(shareUrl));

  // Show referral prompt if logged in
  if (user) {
    const refEl = document.getElementById('referral-share-prompt');
    if (refEl) {
      refEl.style.display = 'block';
      setEl('referral-code-display', user.referralCode || 'REF-' + user.name.replace(/\s/g, '').toUpperCase().slice(0, 6) + '25');
    }
  }
}

/* ── Document Downloads (simulated) ───────────────────────────── */
function downloadDoc(name) {
  Toast.info('Download Started', `${name} is being prepared. In the live platform, this would download the actual document.`);
}

/* ── Auto-init ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', initCampaignPage);
