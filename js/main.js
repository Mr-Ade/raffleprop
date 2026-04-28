/* ============================================================
   RaffleProp — main.js
   Shared utilities, mock data, nav/footer injection,
   countdowns, live counters, auth, toasts
   ============================================================ */

'use strict';

/* ── Mock Data ─────────────────────────────────────────────── */
const MOCK_DATA = {
  site: {
    name: 'RaffleProp',
    tagline: "Nigeria's Most Transparent Property Raffle Platform",
    email: 'hello@raffleprop.ng',
    phone: '+234 901 234 5678',
    whatsapp: '2349012345678',
    address: '14 Admiralty Way, Lekki Phase 1, Lagos, Nigeria',
    cac: 'RC-1234567',
    scuml: 'SCUML/DNFBP/2024/RP/8821',
    instagram: '#',
    twitter: '#',
    facebook: '#',
    tiktok: '#',
    youtube: '#'
  },

  campaigns: [
    {
      id: 'lekki-duplex-001',
      slug: 'lekki-duplex-001',
      title: '4-Bedroom Detached Duplex',
      subtitle: 'Luxury Living in the Heart of Lekki',
      location: 'Lekki Phase 1, Lagos',
      address: '15 Admiralty Way, Lekki Phase 1, Lagos',
      type: 'Detached Duplex',
      worth: 95000000,
      totalTickets: 25000,
      minThreshold: 20000,
      soldTickets: 18420,
      ticketPrice: 2500,
      bundles: { 5: 10000, 10: 18000, 20: 32000 },
      status: 'active',
      daysToClose: 23,
      daysToMidDraw: 5,
      beds: 4, baths: 4, toilets: 5,
      sqm: 320, landSqm: 600,
      cOfO: true,
      floor: 'Ground + 1st Floor',
      parking: 3,
      features: ['Swimming Pool', 'BQ (Boys Quarters)', 'Fitted Kitchen', 'Air Conditioning', 'CCTV & Security', '24/7 Power (Solar + Generator)', 'Smart Home Features', 'Gym Room'],
      images: [
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=80',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=80',
        'https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=900&q=80',
        'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=900&q=80',
        'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=900&q=80',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&q=80'
      ],
      valuationBy: 'Emeka Johnson, FNIVS — Lagos Valuers & Associates',
      nisvRegNo: 'NIESV/LOS/2019/0847',
      escrowBank: 'GTBank Plc',
      escrowAccountType: 'Dedicated Escrow/Trust Account',
      escrowAccount: '0123456789',
      lawyer: 'Adaeze Obi-Nwosu (Esq.) — Obi-Nwosu & Partners',
      featured: true,
      description: 'Win a stunning 4-bedroom detached duplex in the prestigious Lekki Phase 1 neighbourhood of Lagos. This luxurious property features a swimming pool, BQ, fitted kitchen, and smart home features. CAC-registered, escrow-protected, and independently valued at ₦95 million.',
      mapEmbed: '',
      fccpcRef: 'FCCPC/SP/2024/001',
      fccpcApprovalDate: '2024-01-15',
      lslgaRef: 'LSLGA/2024/RP/001',
      isLagos: true,
      drawDate: '2024-12-15',
      skillQuestion: { q: 'What is the capital of Lagos State?', a: 'Ikeja', options: ['Lagos Island', 'Ikeja', 'Victoria Island', 'Lekki'] }
    },
    {
      id: 'gwarinpa-abuja-002',
      slug: 'gwarinpa-abuja-002',
      title: '3-Bedroom Semi-Detached',
      subtitle: 'Modern Family Home in Abuja',
      location: 'Gwarinpa Estate, Abuja',
      address: '7 1st Avenue, Gwarinpa Estate, Abuja (FCT)',
      type: 'Semi-Detached Bungalow',
      worth: 45000000,
      totalTickets: 15000,
      minThreshold: 12000,
      soldTickets: 8100,
      ticketPrice: 2500,
      bundles: { 5: 10000, 10: 18000, 20: 32000 },
      status: 'active',
      daysToClose: 41,
      beds: 3, baths: 3, toilets: 4,
      sqm: 210, landSqm: 450,
      cOfO: true,
      floor: 'Ground Floor (Bungalow)',
      parking: 2,
      features: ['Fitted Kitchen', 'Tiled Floors', 'Air Conditioning', 'Perimeter Fence', '24/7 Security', 'PHCN + Generator Backup', 'Estate Road'],
      images: [
        'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&q=80',
        'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=900&q=80',
        'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=900&q=80',
        'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=900&q=80',
        'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=900&q=80'
      ],
      valuationBy: 'Tunde Adeyemi, MNIQS — Abuja Valuers Network',
      nisvRegNo: 'NIESV/ABJ/2020/1134',
      escrowBank: 'Zenith Bank Plc',
      escrowAccountType: 'Dedicated Escrow/Trust Account',
      escrowAccount: '9876543210',
      lawyer: 'Chukwuemeka Eze (Esq.) — Eze & Co. Solicitors',
      featured: false,
      description: 'Win a 3-bedroom semi-detached bungalow in Abuja\'s popular Gwarinpa Estate. This well-maintained family home sits in a secure, serviced estate with excellent road access to central Abuja.',
      fccpcRef: 'FCCPC/SP/2024/002',
      fccpcApprovalDate: '2024-02-20',
      isLagos: false,
      drawDate: '2025-03-30',
      skillQuestion: { q: 'What is the capital of Nigeria?', a: 'Abuja', options: ['Lagos', 'Abuja', 'Kano', 'Ibadan'] }
    },
    {
      id: 'banana-island-003',
      slug: 'banana-island-003',
      title: '5-Bedroom Luxury Mansion',
      subtitle: "Nigeria's Most Exclusive Address",
      location: 'Banana Island, Ikoyi, Lagos',
      address: 'Banana Island, Ikoyi, Lagos',
      type: 'Detached Mansion',
      worth: 250000000,
      totalTickets: 50000,
      minThreshold: 40000,
      soldTickets: 0,
      ticketPrice: 2500,
      bundles: { 5: 10000, 10: 18000, 20: 32000 },
      status: 'upcoming',
      daysToClose: 90,
      daysToLaunch: 14,
      beds: 5, baths: 5, toilets: 6,
      sqm: 750, landSqm: 1200,
      cOfO: true,
      floor: 'Ground + 2 Floors',
      parking: 5,
      features: ['Olympic-size Pool', 'Home Cinema', 'Smart Home System', '4 BQs', 'Gym & Spa', 'Panic Room', 'Elevator', 'Wine Cellar', 'Rooftop Terrace', 'Generator House'],
      images: [
        'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=900&q=80',
        'https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?w=900&q=80',
        'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=900&q=80',
        'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=900&q=80'
      ],
      valuationBy: 'Dr. Akin Fashola, FNIVS — Premium Property Consultants',
      nisvRegNo: 'NIESV/LOS/2021/2291',
      escrowBank: 'First Bank of Nigeria',
      escrowAccountType: 'Dedicated Escrow/Trust Account',
      escrowAccount: '3456789012',
      lawyer: 'Chief Mrs. Ngozi Adimora (SAN) — Adimora Chambers',
      featured: true,
      description: 'The grandest prize in RaffleProp history. Win a magnificent 5-bedroom luxury mansion on Banana Island, valued at ₦250 million. This once-in-a-lifetime opportunity opens in 14 days.',
      fccpcRef: 'FCCPC/SP/2024/003',
      fccpcApprovalDate: '2024-03-01',
      lslgaRef: 'LSLGA/2024/RP/003',
      isLagos: true,
      drawDate: '2025-06-30',
      skillQuestion: { q: 'In which state is Banana Island located?', a: 'Lagos', options: ['Abuja', 'Ogun', 'Lagos', 'Rivers'] }
    }
  ],

  winners: [
    {
      id: 'w001',
      name: 'Adaeze O.',
      location: 'Benin City, Edo State',
      property: '3-Bedroom Terrace, Ikeja GRA',
      worth: 38000000,
      date: 'January 14, 2025',
      ticketNumber: 'RP-001-14203',
      photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&q=80',
      drawVideo: '#',
      fccpcWinnerRef: 'FCCPC/WV/2025/001',
      consentGiven: true,
      testimonial: 'I still can\'t believe it! I bought 10 tickets for ₦18,000 and won a house worth ₦38 million. Everything was transparent — I watched the live draw and my ticket number appeared. RaffleProp is 100% legit!'
    },
    {
      id: 'w002',
      name: 'Tunde B.',
      location: 'Abuja',
      property: '2-Bedroom Flat, Maitama',
      worth: 28000000,
      date: 'October 2, 2024',
      ticketNumber: 'RP-002-08877',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
      drawVideo: '#',
      fccpcWinnerRef: 'FCCPC/WV/2024/002',
      consentGiven: true,
      testimonial: 'My referral earnings alone paid for my ticket bundles. Then I won the main draw! Thank you RaffleProp for keeping everything open and transparent.'
    }
  ],

  testimonials: [
    { name: 'Chidinma A.', location: 'Port Harcourt', stars: 5, text: 'I was very skeptical at first. But I watched the live draw on YouTube, saw the lawyer, the bank rep, everything. Very professional. Will definitely enter the next campaign!', avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&q=80' },
    { name: 'Emeka O.', location: 'Lagos Island', stars: 5, text: 'Bought 20 tickets in the bundle deal. Great value for money. The ticket confirmation came instantly on WhatsApp and email. Waiting anxiously for draw day!', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&q=80' },
    { name: 'Dr. Funmi S.', location: 'London, UK', stars: 5, text: 'As a Nigerian in the diaspora, I was worried about legitimacy. But seeing the CAC cert, escrow details, and independent valuation certificate removed all doubts. Entered 3 campaigns so far.', avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=80&q=80' }
  ],

  faqs: [
    { cat: 'legal', q: 'Is this legal in Nigeria?', a: 'Yes. RaffleProp is structured as a "Promotional Competition" under Nigerian law — not a lottery — meaning we do not require a federal lottery licence. Our business is registered with the Corporate Affairs Commission (CAC) under RC-1234567. All operations are overseen by an independent property lawyer and escrow is held at a reputable Nigerian bank.' },
    { cat: 'legal', q: 'Which regulators have approved this?', a: 'All RaffleProp campaigns are reviewed and approved by the Federal Competition & Consumer Protection Commission (FCCPC) under the Federal Competition & Consumer Protection Act 2018 (FCCPA). For Lagos-based properties, we also hold a licence from the Lagos State Lotteries & Gaming Authority (LSLGA). Approval certificates are publicly available on our Trust & Legal Centre.' },
    { cat: 'payment', q: 'Where is my money held?', a: 'All ticket sale proceeds are held in a dedicated, ring-fenced escrow account at a reputable Nigerian bank — separate from RaffleProp\'s operating funds. The specific escrow bank and account number are published on the Trust & Legal Centre for each campaign. Funds are released to RaffleProp only after the draw is completed and the FCCPC winner list is verified. If the minimum threshold is not reached, all funds are automatically returned.' },
    { cat: 'payment', q: 'How do I pay for tickets?', a: 'We accept Paystack (card/bank transfer/USSD), Flutterwave, and direct bank transfer. All payments are processed through PCI-DSS compliant gateways. We never store your card details.' },
    { cat: 'tickets', q: 'When will I receive my ticket numbers?', a: 'Immediately after payment confirmation. You will receive your unique ticket number(s) by email, SMS, and WhatsApp within minutes. Your tickets also appear in your dashboard under "My Tickets".' },
    { cat: 'draw', q: 'How is the draw conducted?', a: 'The draw is conducted using a certified Random Number Generator (Random.org) AND a physical ballot for double verification. It is live-streamed on YouTube, Facebook, and Instagram. Present at the draw: independent lawyer, notary public, bank escrow representative, and two community witnesses.' },
    { cat: 'refund', q: 'What if the minimum ticket target isn\'t reached?', a: 'If ticket sales do not reach the stated minimum threshold before the campaign close date, ALL buyers receive a 100% full refund within 5–10 business days via the original payment method. This is guaranteed in writing in our T&Cs and enforced through the escrow arrangement.' },
    { cat: 'winner', q: 'What happens after I win?', a: 'Winners have 48–72 hours to respond to the notification. You will be required to submit a valid ID and BVN for verification. Our property lawyer will then prepare a Deed of Assignment transferring ownership. You will pay no additional fees — property legal costs are covered by RaffleProp.' },
    { cat: 'payment', q: 'Can I pay from abroad (diaspora)?', a: 'Yes. We accept international Visa/Mastercard via Flutterwave. Prices are shown in NGN with USD/GBP equivalents. Diaspora participants are welcome and many of our ticket buyers are Nigerians in the UK, USA, and Canada.' },
    { cat: 'tickets', q: 'Can I buy tickets for someone else?', a: 'Yes. During checkout, you can enter a different name and contact details. However, the winning verification will be conducted in the name on the ticket. We recommend gifting tickets as a digital gift for special occasions.' },
    { cat: 'legal', q: 'How does RaffleProp comply with anti-money laundering laws?', a: 'RaffleProp is registered with the Special Control Unit against Money Laundering (SCUML) under the Money Laundering (Prohibition) Act as a Designated Non-Financial Business and Profession (DNFBP). This means we carry out Customer Due Diligence (KYC) on all ticket buyers, file Suspicious Transaction Reports (STRs) with the Nigerian Financial Intelligence Unit (NFIU) where required, maintain full transaction records for a minimum of 5 years, and have a dedicated AML/CFT Compliance Officer. Our SCUML registration number is SCUML/DNFBP/2024/RP/8821.' },
    { cat: 'legal', q: 'How do I verify the property title?', a: 'All campaigns include a downloadable Certificate of Occupancy (C of O), independent NIESV valuation certificate, and survey plan. You can verify the property at the Lagos or Abuja Land Registry. Our lawyer\'s name and contact details are publicly listed on our Trust & Legal page.' },
    { cat: 'referral', q: 'How does the referral programme work?', a: 'Every registered user gets a unique referral code. Share your link. For every 5 confirmed referral purchases (after payment), you earn 1 FREE ticket. You can also earn ₦300 cash per confirmed referral, accumulated in your wallet and withdrawable after the draw.' }
  ],

  adminUsers: [
    { id: 'u001', name: 'Adaeze Okonkwo', email: 'adaeze@example.com', phone: '08012345678', tickets: 15, spent: 37500, kyc: 'verified', joined: '2024-11-01', referrals: 12, campaigns: ['lekki-duplex-001'] },
    { id: 'u002', name: 'Emeka Obi', email: 'emeka@example.com', phone: '08023456789', tickets: 5, spent: 10000, kyc: 'pending', joined: '2025-01-15', referrals: 3, campaigns: ['gwarinpa-abuja-002'] },
    { id: 'u003', name: 'Tunde Fashola', email: 'tunde@example.com', phone: '08034567890', tickets: 20, spent: 32000, kyc: 'verified', joined: '2024-12-10', referrals: 8, campaigns: ['lekki-duplex-001', 'gwarinpa-abuja-002'] },
    { id: 'u004', name: 'Chidinma Eze', email: 'chidinma@example.com', phone: '07045678901', tickets: 10, spent: 18000, kyc: 'unverified', joined: '2025-02-20', referrals: 0, campaigns: ['lekki-duplex-001'] },
    { id: 'u005', name: 'Dr. Funmi Salami', email: 'funmi@example.co.uk', phone: '+447911123456', tickets: 30, spent: 60000, kyc: 'verified', joined: '2025-03-05', referrals: 25, campaigns: ['lekki-duplex-001', 'banana-island-003'] }
  ]
};

/* ── Utilities ──────────────────────────────────────────────── */
const Utils = {
  formatNaira(n) {
    if (!n && n !== 0) return '₦0';
    return '₦' + Number(n).toLocaleString('en-NG');
  },
  formatNumber(n) {
    return Number(n).toLocaleString('en-NG');
  },
  debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  },
  getCountdownDate(daysFromNow) {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString();
  },
  timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    return Math.floor(h / 24) + 'd ago';
  },
  getCampaign(id) {
    return MOCK_DATA.campaigns.find(c => c.id === id) || MOCK_DATA.campaigns[0];
  },
  pct(sold, total) {
    return Math.min(100, Math.round((sold / total) * 100));
  }
};

/* ── Auth ───────────────────────────────────────────────────── */
const Auth = {
  getUser() {
    try { return JSON.parse(localStorage.getItem('rp_user')); } catch { return null; }
  },
  setUser(user) {
    localStorage.setItem('rp_user', JSON.stringify(user));
  },
  logout() {
    localStorage.removeItem('rp_user');
    localStorage.removeItem('rp_cart');
    window.location.href = getBasePath() + 'index.html';
  },
  isLoggedIn() {
    return !!this.getUser();
  },
  isAdmin() {
    const u = this.getUser();
    return u && u.isAdmin;
  },
  requireLogin(redirectBack = true) {
    if (!this.isLoggedIn()) {
      const redirect = redirectBack ? encodeURIComponent(window.location.pathname + window.location.search) : '';
      window.location.replace(getBasePath() + 'login.html' + (redirect ? '?redirect=' + redirect : ''));
      return false;
    }
    return true;
  },
  requireAdmin() {
    if (!this.isAdmin()) {
      window.location.replace(getBasePath() + 'login.html');
      return false;
    }
    return true;
  }
};

/* ── Base path helper ────────────────────────────────────────── */
function getBasePath() {
  const path = window.location.pathname;
  return path.includes('/admin/') ? '../' : '';
}

/* ── Toast ──────────────────────────────────────────────────── */
const Toast = {
  container: null,
  init() {
    if (!document.getElementById('toast-container')) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('toast-container');
    }
  },
  show(type, title, msg, duration = 4000) {
    if (!this.container) this.init();
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `
      <i class="fa-solid ${icons[type] || icons.info} toast-icon"></i>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
      </div>
      <i class="fa-solid fa-xmark toast-close" onclick="this.parentElement.remove()"></i>`;
    this.container.appendChild(t);
    setTimeout(() => { t.classList.add('hiding'); setTimeout(() => t.remove(), 300); }, duration);
  },
  success(title, msg) { this.show('success', title, msg); },
  error(title, msg) { this.show('error', title, msg); },
  warning(title, msg) { this.show('warning', title, msg); },
  info(title, msg) { this.show('info', title, msg); }
};

/* ── Live Counter ───────────────────────────────────────────── */
const LiveCounter = {
  animateTo(el, from, to, duration = 1800) {
    if (!el) return;
    const start = performance.now();
    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      el.textContent = Utils.formatNumber(Math.round(from + (to - from) * easeOut(p)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },
  init() {
    document.querySelectorAll('[data-counter-to]').forEach(el => {
      const to = parseInt(el.dataset.counterTo, 10);
      const from = parseInt(el.dataset.counterFrom || '0', 10);
      // Trigger when visible
      const obs = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          this.animateTo(el, from, to);
          obs.disconnect();
        }
      }, { threshold: 0.3 });
      obs.observe(el);
    });
  }
};

/* ── Progress Bars ──────────────────────────────────────────── */
const ProgressBar = {
  init() {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const fill = entry.target.querySelector('.progress-fill');
          if (fill) fill.style.width = fill.dataset.pct + '%';
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.progress-wrap').forEach(el => obs.observe(el));
  }
};

/* ── Countdown Timers ───────────────────────────────────────── */
const Countdown = {
  init() {
    document.querySelectorAll('[data-countdown-end]').forEach(el => {
      const end = new Date(el.dataset.countdownEnd);
      const vals = el.querySelectorAll('.c-val');
      const tick = () => {
        const diff = end - Date.now();
        if (diff <= 0) { el.innerHTML = '<span style="color:#dc2626;font-weight:700;">Draw in Progress</span>'; return; }
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        if (vals[0]) vals[0].textContent = String(d).padStart(2, '0');
        if (vals[1]) vals[1].textContent = String(h).padStart(2, '0');
        if (vals[2]) vals[2].textContent = String(m).padStart(2, '0');
        if (vals[3]) vals[3].textContent = String(s).padStart(2, '0');
      };
      tick();
      setInterval(tick, 1000);
    });
  }
};

/* ── Simulate Live Sales ────────────────────────────────────── */
function simulateLiveSales() {
  setInterval(() => {
    const c = MOCK_DATA.campaigns[0];
    if (c.soldTickets >= c.totalTickets) return;
    const inc = Math.floor(Math.random() * 3) + 1;
    c.soldTickets += inc;
    // Update any live counter showing this campaign
    document.querySelectorAll(`[data-live-counter="${c.id}"]`).forEach(el => {
      LiveCounter.animateTo(el, c.soldTickets - inc, c.soldTickets, 1000);
    });
    document.querySelectorAll(`[data-live-pct="${c.id}"]`).forEach(el => {
      el.style.width = Utils.pct(c.soldTickets, c.totalTickets) + '%';
    });
    document.querySelectorAll(`[data-live-pct-text="${c.id}"]`).forEach(el => {
      el.textContent = Utils.pct(c.soldTickets, c.totalTickets) + '%';
    });
  }, Math.random() * 7000 + 8000);
}

/* ── Campaign Card Renderer ─────────────────────────────────── */
function renderCampaignCard(c, base = '') {
  const pct = Utils.pct(c.soldTickets, c.totalTickets);
  const endDate = c.daysToClose ? Utils.getCountdownDate(c.daysToClose) : '';
  const launchDate = c.daysToLaunch ? Utils.getCountdownDate(c.daysToLaunch) : '';
  const statusLabels = { active: 'Live Now', upcoming: 'Coming Soon', sold_out: 'Sold Out', closed: 'Closed', draw_complete: 'Winner Announced' };
  const statusClasses = { active: 'status-active', upcoming: 'status-upcoming', sold_out: 'status-sold-out', closed: 'status-closed', draw_complete: 'status-draw-complete' };

  return `
  <div class="campaign-card animate-fade-up">
    <div class="campaign-card-image">
      <img src="${c.images[0]}" alt="${c.title}" loading="lazy">
      <span class="campaign-status-badge ${statusClasses[c.status] || 'status-active'}">${statusLabels[c.status] || c.status}</span>
      ${c.featured ? `<div style="position:absolute;top:0.75rem;right:0.75rem;background:linear-gradient(135deg,#C8922A,#f0c060);color:#fff;font-size:0.6875rem;font-weight:700;padding:0.25rem 0.625rem;border-radius:100px;text-transform:uppercase;letter-spacing:0.05em;">⭐ Featured</div>` : ''}
    </div>
    <div class="campaign-card-body">
      <div class="campaign-location"><i class="fa-solid fa-location-dot"></i>${c.location}</div>
      <div class="campaign-card-title">${c.title}</div>
      <div class="campaign-worth">${Utils.formatNaira(c.worth)}<small>Independently Valued</small></div>
      ${c.status === 'active' || c.status === 'sold_out' ? `
      <div class="progress-wrap">
        <div class="progress-fill" data-pct="${pct}" data-live-pct="${c.id}" style="width:0%"></div>
      </div>
      <div class="ticket-stats">
        <span><strong data-live-counter="${c.id}">${Utils.formatNumber(c.soldTickets)}</strong> / ${Utils.formatNumber(c.totalTickets)} tickets</span>
        <span data-live-pct-text="${c.id}">${pct}% sold</span>
      </div>
      <div class="countdown-row" data-countdown-end="${endDate}">
        <div class="countdown-unit"><span class="c-val value">00</span><span class="label">Days</span></div>
        <div class="countdown-unit"><span class="c-val value">00</span><span class="label">Hrs</span></div>
        <div class="countdown-unit"><span class="c-val value">00</span><span class="label">Min</span></div>
        <div class="countdown-unit"><span class="c-val value">00</span><span class="label">Sec</span></div>
      </div>` : ''}
      ${c.status === 'upcoming' ? `
      <div style="margin:0.875rem 0;padding:0.75rem;background:#fef9c3;border:1px solid #fde68a;border-radius:8px;font-size:0.875rem;color:#92400e;font-weight:500;">
        <i class="fa-regular fa-clock" style="margin-right:0.375rem;"></i>Opens in <strong>${c.daysToLaunch} days</strong>
      </div>
      <div class="countdown-row" data-countdown-end="${launchDate}">
        <div class="countdown-unit"><span class="c-val value">00</span><span class="label">Days</span></div>
        <div class="countdown-unit"><span class="c-val value">00</span><span class="label">Hrs</span></div>
        <div class="countdown-unit"><span class="c-val value">00</span><span class="label">Min</span></div>
        <div class="countdown-unit"><span class="c-val value">00</span><span class="label">Sec</span></div>
      </div>` : ''}
      <div class="campaign-price-row">
        <div class="campaign-price">₦2,500 <small>per ticket</small></div>
        ${c.status === 'active' ? `
        <a href="${base}campaign-detail.html?id=${c.id}" class="btn btn-primary btn-sm">Enter Now <i class="fa-solid fa-arrow-right"></i></a>` : ''}
        ${c.status === 'upcoming' ? `
        <button onclick="handleNotifyMe('${c.id}',this)" class="btn btn-outline btn-sm"><i class="fa-regular fa-bell"></i> Notify Me</button>` : ''}
        ${c.status === 'sold_out' ? `
        <span class="badge badge-red">Sold Out</span>` : ''}
      </div>
      ${c.fccpcRef ? `<div style="display:flex;align-items:center;gap:0.375rem;margin-top:0.625rem;font-size:0.75rem;color:var(--green-primary);font-weight:600;"><i class="fa-solid fa-shield-halved" style="font-size:0.6875rem;"></i>FCCPC Approved &middot; <span style="font-family:monospace;font-weight:700;">${c.fccpcRef}</span></div>` : ''}
      ${c.status === 'active' ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem;"><i class="fa-regular fa-clock" style="margin-right:0.25rem;"></i>Ticket sale closes in <strong>${c.daysToClose} days</strong></div>` : ''}
      <div class="refund-notice" style="margin-top:0.75rem;">
        <i class="fa-solid fa-shield-halved"></i>
        <span>Full refund if &lt;${Utils.formatNumber(c.minThreshold)} tickets sold</span>
      </div>
    </div>
  </div>`;
}

function handleNotifyMe(id, btn) {
  if (!Auth.isLoggedIn()) {
    Toast.info('Login Required', 'Please log in or register to get notified.');
    return;
  }
  btn.innerHTML = '<i class="fa-solid fa-check"></i> Notified!';
  btn.disabled = true;
  Toast.success('You\'re on the list!', 'We\'ll notify you when this campaign launches.');
}

/* ── Navigation HTML ────────────────────────────────────────── */
function buildNavHTML(base) {
  const user = Auth.getUser();
  const isAdmin = user && user.isAdmin;
  return `
  <header id="site-header">
    <div class="container" style="display:flex;align-items:center;justify-content:space-between;height:65px;">
      <a href="${base}index.html" class="nav-logo">Raffle<span>Prop</span></a>
      <nav class="desktop-only" style="display:flex;align-items:center;gap:0.25rem;">
        <a href="${base}campaigns.html" class="nav-link" data-nav="campaigns">Campaigns</a>
        <a href="${base}how-it-works.html" class="nav-link" data-nav="how">How It Works</a>
        <a href="${base}winners.html" class="nav-link" data-nav="winners">Winners</a>
        <a href="${base}about.html" class="nav-link" data-nav="about">About</a>
        <a href="${base}faq.html" class="nav-link" data-nav="faq">FAQ</a>
      </nav>
      <div class="desktop-only" style="display:flex;align-items:center;gap:0.75rem;">
        ${user ? `
        <a href="${base}dashboard.html" style="display:flex;align-items:center;gap:0.5rem;font-size:0.875rem;font-weight:600;color:var(--text-secondary);">
          <div style="width:32px;height:32px;border-radius:50%;background:var(--green-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8125rem;">${user.name ? user.name[0].toUpperCase() : 'U'}</div>
          ${user.name ? user.name.split(' ')[0] : 'Account'}
        </a>
        ${isAdmin ? `<a href="${base}admin/index.html" class="btn-nav-login" style="margin-right:0.25rem;">Admin</a>` : ''}
        <button onclick="Auth.logout()" class="btn-nav-login">Logout</button>
        ` : `
        <a href="${base}login.html" class="btn-nav-login">Log In</a>
        <a href="${base}campaigns.html" class="btn-nav-cta">Buy Tickets</a>
        `}
      </div>
      <button id="hamburger" class="mobile-only btn-icon" onclick="toggleMobileMenu()" style="background:none;font-size:1.25rem;color:var(--text-primary);" aria-label="Toggle navigation menu" aria-expanded="false" aria-controls="mobile-menu">
        <i class="fa-solid fa-bars" id="hamburger-icon"></i>
      </button>
    </div>
  </header>
  <div id="mobile-menu" class="mobile-menu">
    <a href="${base}campaigns.html" data-nav="campaigns">Campaigns</a>
    <a href="${base}how-it-works.html" data-nav="how">How It Works</a>
    <a href="${base}winners.html" data-nav="winners">Winners</a>
    <a href="${base}about.html" data-nav="about">About</a>
    <a href="${base}faq.html" data-nav="faq">FAQ</a>
    <a href="${base}contact.html" data-nav="contact">Contact</a>
    ${user ? `
    <a href="${base}dashboard.html">My Dashboard</a>
    <a href="${base}my-tickets.html">My Tickets</a>
    <button onclick="Auth.logout()" style="display:block;width:100%;text-align:left;padding:0.75rem 1rem;color:#dc2626;font-weight:500;">Log Out</button>
    ` : `
    <a href="${base}login.html">Log In</a>
    <a href="${base}campaigns.html" class="btn-mobile-cta">Buy Tickets</a>
    `}
  </div>`;
}

function buildFooterHTML(base) {
  const s = MOCK_DATA.site;
  return `
  <footer id="site-footer">
    <div class="container" style="padding-top:3.5rem;padding-bottom:2rem;">
      <div class="footer-grid">
        <div>
          <div class="footer-logo">Raffle<span>Prop</span></div>
          <p style="font-size:0.875rem;color:rgba(255,255,255,0.5);margin-top:0.75rem;line-height:1.7;max-width:280px;">${s.tagline}. CAC Registered · Escrow Protected · Lawyer Verified.</p>
          <div style="margin-top:1.25rem;display:flex;gap:0.625rem;">
            <a href="${s.instagram}" class="social-icon" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
            <a href="${s.twitter}" class="social-icon" aria-label="Twitter"><i class="fab fa-x-twitter"></i></a>
            <a href="${s.facebook}" class="social-icon" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
            <a href="${s.tiktok}" class="social-icon" aria-label="TikTok"><i class="fab fa-tiktok"></i></a>
            <a href="${s.youtube}" class="social-icon" aria-label="YouTube"><i class="fab fa-youtube"></i></a>
            <a href="https://wa.me/${s.whatsapp}" class="social-icon" aria-label="WhatsApp"><i class="fab fa-whatsapp"></i></a>
          </div>
          <div style="margin-top:1.25rem;font-size:0.8125rem;color:rgba(255,255,255,0.35);">CAC Reg: ${s.cac} &nbsp;·&nbsp; SCUML: ${s.scuml}</div>
        </div>
        <div>
          <div class="footer-heading">Campaigns</div>
          <a href="${base}campaigns.html" class="footer-link">Active Campaigns</a>
          <a href="${base}campaigns.html?filter=upcoming" class="footer-link">Upcoming Draws</a>
          <a href="${base}winners.html" class="footer-link">Past Winners</a>
          <a href="${base}how-it-works.html" class="footer-link">How It Works</a>
        </div>
        <div>
          <div class="footer-heading">Company</div>
          <a href="${base}about.html" class="footer-link">About Us</a>
          <a href="${base}trust-legal.html" class="footer-link">Trust & Legal</a>
          <a href="${base}faq.html" class="footer-link">FAQ</a>
          <a href="${base}contact.html" class="footer-link">Contact</a>
        </div>
        <div>
          <div class="footer-heading">Legal</div>
          <a href="${base}regulatory-compliance.html" class="footer-link">Regulatory Framework</a>
          <a href="${base}trust-legal.html#fccpc" class="footer-link">FCCPC Approvals</a>
          <a href="${base}trust-legal.html#terms" class="footer-link">Terms & Conditions</a>
          <a href="${base}trust-legal.html#privacy" class="footer-link">Privacy Policy</a>
          <a href="${base}trust-legal.html#escrow" class="footer-link">Escrow Details</a>
          <a href="${base}trust-legal.html#cac" class="footer-link">CAC Certificate</a>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2025 RaffleProp Ltd. All rights reserved. RaffleProp is a promotional competition operator, not a lottery.</p>
        <p>${s.email} &nbsp;·&nbsp; ${s.phone}</p>
      </div>
    </div>
  </footer>`;
}

/* ── Nav Injection & Highlighting ───────────────────────────── */
function injectNav() {
  const base = getBasePath();
  const ph = document.getElementById('nav-placeholder');
  if (ph) ph.outerHTML = buildNavHTML(base);
  const fp = document.getElementById('footer-placeholder');
  if (fp) fp.outerHTML = buildFooterHTML(base);

  // Highlight active nav link
  const path = window.location.pathname.toLowerCase();
  document.querySelectorAll('[data-nav]').forEach(el => {
    const key = el.dataset.nav;
    if (
      (key === 'campaigns' && (path.includes('campaigns') || path.includes('campaign-detail'))) ||
      (key === 'how' && path.includes('how-it-works')) ||
      (key === 'winners' && path.includes('winners')) ||
      (key === 'about' && path.includes('about')) ||
      (key === 'faq' && path.includes('faq')) ||
      (key === 'contact' && path.includes('contact'))
    ) { el.classList.add('active'); }
  });

  // Scroll effect
  window.addEventListener('scroll', () => {
    const h = document.getElementById('site-header');
    if (h) h.classList.toggle('scrolled', window.scrollY > 20);
  });
}


function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  const btn  = document.getElementById('hamburger');
  const icon = document.getElementById('hamburger-icon');
  if (!menu) return;
  const isOpen = menu.classList.toggle('open');
  if (btn)  btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  if (icon) icon.className = isOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
}

/* ── Cookie Banner ──────────────────────────────────────────── */
function initCookieBanner() {
  if (localStorage.getItem('rp_cookies')) return;
  const banner = document.createElement('div');
  banner.id = 'cookie-banner';
  banner.innerHTML = `
    <p>We use cookies to improve your experience and analyse site traffic. By continuing, you agree to our <a href="${getBasePath()}trust-legal.html#privacy">Privacy Policy</a>.</p>
    <div class="cookie-btns">
      <button class="btn-cookie-decline" onclick="document.getElementById('cookie-banner').remove()">Decline</button>
      <button class="btn-cookie-accept" onclick="localStorage.setItem('rp_cookies','1');document.getElementById('cookie-banner').remove()">Accept All</button>
    </div>`;
  document.body.appendChild(banner);
}

/* ── Scroll To Top ──────────────────────────────────────────── */
function initScrollTop() {
  const btn = document.createElement('button');
  btn.id = 'scroll-top';
  btn.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
  btn.setAttribute('aria-label', 'Scroll to top');
  btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  document.body.appendChild(btn);
  window.addEventListener('scroll', () => btn.classList.toggle('show', window.scrollY > 400));
}

/* ── FAQ Accordion ──────────────────────────────────────────── */
function initFaqAccordion() {
  document.querySelectorAll('.faq-question').forEach((btn, i) => {
    // Wire up aria-expanded + aria-controls
    const answerId = 'faq-ans-' + i;
    const answer = btn.nextElementSibling;
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', answerId);
    if (answer) answer.id = answerId;

    btn.addEventListener('click', () => {
      const isOpen = btn.classList.contains('open');
      // Close all
      document.querySelectorAll('.faq-question.open').forEach(b => {
        b.classList.remove('open');
        b.setAttribute('aria-expanded', 'false');
        if (b.nextElementSibling) b.nextElementSibling.classList.remove('open');
      });
      if (!isOpen) {
        btn.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
        if (answer) answer.classList.add('open');
      }
    });
  });
}

/* ── Document download helper ───────────────────────────────── */
function downloadDoc(docKey) {
  const docs = JSON.parse(localStorage.getItem('rp_cms_documents') || '{}');
  // Match by key or by display name (fallback)
  const doc = docs[docKey] || Object.values(docs).find(d =>
    d.name && d.name.toLowerCase().replace(/\s+/g,'-') === docKey.toLowerCase().replace(/\s+/g,'-')
  );

  if (!doc || !doc.value) {
    Toast.info('Not Yet Uploaded',
      'This document has not been uploaded yet. Contact us at ' + MOCK_DATA.site.email + ' to request a copy.');
    return;
  }

  Toast.success('Opening Document', `${doc.name} is loading…`);

  if (doc.value.startsWith('data:')) {
    // Stored as base64 — trigger real file download
    const a = document.createElement('a');
    a.href = doc.value;
    a.download = doc.filename || doc.name.replace(/\s+/g, '-').toLowerCase() + '.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    // External URL — open in new tab
    window.open(doc.value, '_blank');
  }
}

/* ── Share Helpers ──────────────────────────────────────────── */
function shareWhatsApp(text) {
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
}
function shareTwitter(text, url) {
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
}
function shareFacebook(url) {
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
}
function copyLink(url) {
  navigator.clipboard.writeText(url).then(() => Toast.success('Link Copied!', 'Share it with friends to earn referral rewards.')).catch(() => Toast.error('Could not copy', 'Please copy the link manually.'));
}

/* ── CMS: merge stored content overrides into MOCK_DATA ─────── */
(function () {
  try {
    const md = JSON.parse(localStorage.getItem('rp_cms_mockdata') || '{}');
    if (md.campaigns    && md.campaigns.length)    MOCK_DATA.campaigns    = md.campaigns;
    if (md.winners      && md.winners.length)      MOCK_DATA.winners      = md.winners;
    if (md.testimonials && md.testimonials.length) MOCK_DATA.testimonials = md.testimonials;
    if (md.faqs         && md.faqs.length)         MOCK_DATA.faqs         = md.faqs;

    const st = JSON.parse(localStorage.getItem('rp_cms_settings') || '{}');
    if (st.name)      MOCK_DATA.site.name      = st.name;
    if (st.tagline)   MOCK_DATA.site.tagline   = st.tagline;
    if (st.email)     MOCK_DATA.site.email     = st.email;
    if (st.phone)     MOCK_DATA.site.phone     = st.phone;
    if (st.whatsapp)  MOCK_DATA.site.whatsapp  = st.whatsapp;
    if (st.address)   MOCK_DATA.site.address   = st.address;
    if (st.cac)       MOCK_DATA.site.cac       = st.cac;
    if (st.instagram) MOCK_DATA.site.instagram = st.instagram;
    if (st.twitter)   MOCK_DATA.site.twitter   = st.twitter;
    if (st.facebook)  MOCK_DATA.site.facebook  = st.facebook;
    if (st.tiktok)    MOCK_DATA.site.tiktok    = st.tiktok;
    if (st.youtube)   MOCK_DATA.site.youtube   = st.youtube;
  } catch (_) {}
})();

/* ── Load CMS inline editor for admin users ─────────────────── */
(function () {
  try {
    const u = JSON.parse(localStorage.getItem('rp_user') || '{}');
    if (!u || !u.isAdmin) return;
    const base = window.location.pathname.replace(/\\/g, '/').includes('/admin/') ? '../' : '';
    const s = document.createElement('script');
    s.src = base + 'js/cms.js';
    document.head.appendChild(s);
  } catch (_) {}
})();

/* ── Init ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  injectNav();
  Toast.init();
  LiveCounter.init();
  ProgressBar.init();
  Countdown.init();
  initCookieBanner();
  initScrollTop();
  initFaqAccordion();
  simulateLiveSales();
});
