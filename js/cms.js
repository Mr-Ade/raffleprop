/* ============================================================
   RaffleProp CMS — Inline content editor for Super Admin
   Lets admin click any text or image on any page to edit it.
   Changes are stored in localStorage and applied on every load.
   ============================================================ */

const CMS = (() => {
  const PAGES_KEY    = 'rp_cms_pages';    // inline page edits
  const MOCKDATA_KEY = 'rp_cms_mockdata'; // campaigns/FAQs/etc
  const SETTINGS_KEY = 'rp_cms_settings'; // site-wide settings

  let _editMode     = false;
  let _barOpen      = false;
  let _targetEl     = null; // element currently being edited

  /* ── Storage ──────────────────────────────────────────────── */
  const getAllPages    = () => JSON.parse(localStorage.getItem(PAGES_KEY)    || '{}');
  const saveAllPages  = d  => localStorage.setItem(PAGES_KEY, JSON.stringify(d));
  const getSettings   = () => JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  const getMockData   = () => JSON.parse(localStorage.getItem(MOCKDATA_KEY) || '{}');

  function pageKey() {
    const p = window.location.pathname.replace(/\\/g, '/');
    const f = p.split('/').pop().replace('.html', '') || 'index';
    return p.includes('/admin/') ? 'admin_' + f : f;
  }

  function basePath() {
    return window.location.pathname.includes('/admin/') ? '../' : '';
  }

  /* ── CSS path (stable element identifier) ─────────────────── */
  function cssPath(el) {
    const parts = [];
    let node = el;
    while (node && node !== document.body && node.parentElement) {
      const idx = Array.from(node.parentElement.children).indexOf(node) + 1;
      parts.unshift(`${node.tagName.toLowerCase()}:nth-child(${idx})`);
      node = node.parentElement;
    }
    return parts.join('>');
  }

  /* ── Apply stored overrides on page load ─────────────────── */
  function apply() {
    const overrides = getAllPages()[pageKey()] || {};
    Object.entries(overrides).forEach(([sel, ov]) => {
      try {
        const el = document.querySelector(sel);
        if (el) { applyTo(el, ov); el.dataset.cmsModified = '1'; }
      } catch (_) {}
    });
  }

  function applyTo(el, ov) {
    if (ov.type === 'src')  { el.src = ov.value; if (ov.alt !== undefined) el.alt = ov.alt; }
    else if (ov.type === 'href') { if (ov.text) el.textContent = ov.text; el.href = ov.value; }
    else el.textContent = ov.value;
  }

  /* ── Persist a change ─────────────────────────────────────── */
  function saveEl(el, ov) {
    const all = getAllPages();
    const k   = pageKey();
    if (!all[k]) all[k] = {};
    all[k][cssPath(el)] = ov;
    saveAllPages(all);
    applyTo(el, ov);
    el.dataset.cmsModified = '1';
  }

  function revertEl(el) {
    const all = getAllPages();
    const k   = pageKey();
    if (all[k]) { delete all[k][cssPath(el)]; if (!Object.keys(all[k]).length) delete all[k]; }
    saveAllPages(all);
    delete el.dataset.cmsModified;
    Toast.info('Reverted', 'This element will show its original content after reload.');
  }

  /* ── Floating admin toolbar ───────────────────────────────── */
  function injectToolbar() {
    if (document.getElementById('cms-toolbar')) return;
    const wrap = document.createElement('div');
    wrap.id = 'cms-toolbar';
    wrap.innerHTML = `
      <!-- collapsed pill -->
      <div id="cms-pill" onclick="CMS._toggleBar()"
        style="position:fixed;bottom:1.5rem;right:1.5rem;z-index:99999;cursor:pointer;
               background:linear-gradient(135deg,#0D5E30,#166534);color:#fff;
               border-radius:100px;padding:.5rem 1.1rem;display:flex;align-items:center;
               gap:.45rem;box-shadow:0 4px 18px rgba(0,0,0,.28);font-size:.8125rem;
               font-weight:700;user-select:none;letter-spacing:-.01em;">
        <i class="fa-solid fa-pen-to-square"></i> Admin Edit
        <i class="fa-solid fa-chevron-up" style="font-size:.6rem;opacity:.7;"></i>
      </div>
      <!-- expanded panel -->
      <div id="cms-panel"
        style="display:none;position:fixed;bottom:1.5rem;right:1.5rem;z-index:99999;
               background:#fff;border-radius:14px;box-shadow:0 10px 36px rgba(0,0,0,.2);
               border:1px solid #e5e7eb;width:230px;overflow:hidden;">
        <!-- header -->
        <div style="background:linear-gradient(135deg,#0D5E30,#166534);color:#fff;
                    padding:.75rem 1rem;display:flex;align-items:center;justify-content:space-between;">
          <span style="font-weight:800;font-size:.875rem;">
            <i class="fa-solid fa-shield-halved" style="margin-right:.35rem;"></i>Super Admin
          </span>
          <button onclick="CMS._toggleBar()" style="background:none;border:none;color:rgba(255,255,255,.7);cursor:pointer;font-size:1.1rem;">&times;</button>
        </div>
        <!-- buttons -->
        <div style="padding:.75rem .875rem;display:flex;flex-direction:column;gap:.5rem;">
          <button id="cms-edit-btn" onclick="CMS._toggleEdit()"
            style="padding:.6rem;border-radius:8px;font-size:.8125rem;font-weight:700;cursor:pointer;
                   border:2px solid #0D5E30;background:#fff;color:#0D5E30;
                   display:flex;align-items:center;justify-content:center;gap:.45rem;transition:all .15s;">
            <i class="fa-solid fa-pencil"></i> Edit This Page
          </button>
          <a href="${basePath()}admin/content.html"
            style="padding:.5rem;border-radius:8px;font-size:.8125rem;font-weight:700;cursor:pointer;
                   border:1px solid #e5e7eb;background:#f9fafb;color:#374151;text-decoration:none;
                   display:flex;align-items:center;justify-content:center;gap:.45rem;">
            <i class="fa-solid fa-sliders"></i> Content Manager
          </a>
          <button onclick="CMS._resetPage()"
            style="padding:.5rem;border-radius:8px;font-size:.75rem;font-weight:600;cursor:pointer;
                   border:1px solid #fee2e2;background:#fff5f5;color:#b91c1c;
                   display:flex;align-items:center;justify-content:center;gap:.4rem;">
            <i class="fa-solid fa-rotate-left"></i> Reset This Page
          </button>
        </div>
        <!-- edit mode hint -->
        <div id="cms-hint" style="display:none;padding:.6rem .875rem;background:#f0fdf4;
                                   border-top:1px solid #dcfce7;font-size:.75rem;color:#166534;">
          <i class="fa-solid fa-circle-info"></i>&nbsp;Click any text or image to edit it
        </div>
      </div>`;
    document.body.appendChild(wrap);
  }

  function _toggleBar() {
    _barOpen = !_barOpen;
    document.getElementById('cms-pill').style.display  = _barOpen ? 'none' : 'flex';
    document.getElementById('cms-panel').style.display = _barOpen ? 'block' : 'none';
  }

  /* ── Edit mode on/off ─────────────────────────────────────── */
  function _toggleEdit() { _editMode ? _exitEdit() : _enterEdit(); }

  function _enterEdit() {
    _editMode = true;
    document.body.classList.add('cms-edit-active');
    const btn = document.getElementById('cms-edit-btn');
    if (btn) { btn.style.background = '#0D5E30'; btn.style.color = '#fff';
               btn.innerHTML = '<i class="fa-solid fa-xmark"></i> Stop Editing'; }
    document.getElementById('cms-hint').style.display = 'block';
    _bindElements();
    Toast.info('Edit Mode ON', 'Click any text or image to edit it.');
  }

  function _exitEdit() {
    _editMode = false;
    document.body.classList.remove('cms-edit-active');
    const btn = document.getElementById('cms-edit-btn');
    if (btn) { btn.style.background = '#fff'; btn.style.color = '#0D5E30';
               btn.innerHTML = '<i class="fa-solid fa-pencil"></i> Edit This Page'; }
    document.getElementById('cms-hint').style.display = 'none';
    _unbindElements();
  }

  const TEXT_SEL = 'h1,h2,h3,h4,h5,h6,p,span,li,td,th,a,button,label,blockquote,caption,small,strong,em,b,i';
  const IMG_SEL  = 'img';

  // Tags that are purely inline — a div containing only these is a text-leaf
  const INLINE = new Set(['I','B','STRONG','EM','SPAN','CODE','BR','SMALL','MARK',
                           'SUB','SUP','IMG','ABBR','S','U','A','BUTTON']);

  // A <div> is editable if: non-trivial text content AND all child elements are inline
  function _isTextLeafDiv(el) {
    if (el.tagName !== 'DIV') return false;
    if (el.isContentEditable) return false;
    if (el.textContent.trim().length < 2) return false;
    // Must not be a layout wrapper (no block-level children)
    return Array.from(el.children).every(c => INLINE.has(c.tagName));
  }

  function _skip(el) {
    return el.closest('#cms-toolbar') || el.closest('#cms-modal') ||
           el.closest('#cookie-banner') || el.closest('#scroll-top-btn') ||
           el.closest('script') || el.closest('style') ||
           el.closest('select') || el.closest('input') || el.closest('textarea');
  }

  function _bind(el, handler) {
    if (_skip(el) || el.classList.contains('cms-el')) return;
    el.classList.add('cms-el');
    el._cmsClick = e => { e.stopPropagation(); e.preventDefault(); handler(el); };
    el.addEventListener('click', el._cmsClick);
  }

  function _bindImg(el) {
    if (_skip(el) || el.classList.contains('cms-img-el')) return;
    el.classList.add('cms-img-el');
    el._cmsClick = e => { e.stopPropagation(); e.preventDefault(); _showImgModal(el); };
    el.addEventListener('click', el._cmsClick);
  }

  function _bindElements() {
    // Named semantic / inline tags
    document.querySelectorAll(TEXT_SEL).forEach(el => _bind(el, _showTextModal));

    // Text-leaf divs — catches value fields like <div style="font-weight:700;">RC-1234567</div>
    document.querySelectorAll('div').forEach(el => {
      if (_isTextLeafDiv(el)) _bind(el, _showTextModal);
    });

    // Images
    document.querySelectorAll(IMG_SEL).forEach(el => _bindImg(el));
  }

  function _unbindElements() {
    document.querySelectorAll('.cms-el').forEach(el => {
      el.classList.remove('cms-el');
      if (el._cmsClick) el.removeEventListener('click', el._cmsClick);
    });
    document.querySelectorAll('.cms-img-el').forEach(el => {
      el.classList.remove('cms-img-el');
      if (el._cmsClick) el.removeEventListener('click', el._cmsClick);
    });
  }

  /* ── Modal helpers ────────────────────────────────────────── */
  function _modal(html) {
    let m = document.getElementById('cms-modal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'cms-modal';
      m.style.cssText = 'position:fixed;inset:0;z-index:9999999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:1rem;';
      m.addEventListener('click', e => { if (e.target === m) _closeModal(); });
      document.body.appendChild(m);
    }
    m.innerHTML = `<div style="background:#fff;border-radius:16px;width:100%;max-width:500px;box-shadow:0 24px 64px rgba(0,0,0,.25);overflow:hidden;">${html}</div>`;
    m.style.display = 'flex';
    return m;
  }

  function _closeModal() {
    const m = document.getElementById('cms-modal');
    if (m) m.style.display = 'none';
    if (_targetEl) { _targetEl.style.outline = ''; _targetEl = null; }
  }

  function _hdr(icon, title, sub) {
    return `<div style="background:linear-gradient(135deg,#0D5E30,#166534);color:#fff;padding:1rem 1.25rem;display:flex;align-items:center;justify-content:space-between;">
      <div><div style="font-weight:800;font-size:1rem;"><i class="fa-solid fa-${icon}" style="margin-right:.5rem;"></i>${title}</div>${sub ? `<div style="font-size:.75rem;opacity:.7;margin-top:.2rem;">${sub}</div>` : ''}</div>
      <button onclick="CMS._closeModal()" style="background:none;border:none;color:rgba(255,255,255,.7);cursor:pointer;font-size:1.3rem;">&times;</button>
    </div>`;
  }

  function _esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  /* ── Text edit modal ─────────────────────────────────────── */
  function _showTextModal(el) {
    _targetEl = el;
    el.style.outline = '2px solid #0D5E30';
    const tag  = el.tagName.toLowerCase();
    const labels = {h1:'Heading 1',h2:'Heading 2',h3:'Heading 3',h4:'Heading 4',
                    h5:'Heading 5',h6:'Heading 6',p:'Paragraph',span:'Text Span',
                    li:'List Item',a:'Link',button:'Button',td:'Table Cell',
                    th:'Table Header',blockquote:'Quote',label:'Label'};
    const typeLabel = labels[tag] || 'Text Element';
    const cur  = el.textContent.trim();
    const isA  = tag === 'a';
    const mod  = el.dataset.cmsModified === '1';

    _modal(`
      ${_hdr('pencil', `Edit ${typeLabel}`, `<${tag}>`)}
      <div style="padding:1.25rem;">
        ${isA ? `
          <div style="margin-bottom:.875rem;">
            <label style="font-size:.8125rem;font-weight:700;color:#374151;display:block;margin-bottom:.375rem;">Link Text</label>
            <input id="cms-t" class="form-input" value="${_esc(cur)}" style="width:100%;">
          </div>
          <div style="margin-bottom:1rem;">
            <label style="font-size:.8125rem;font-weight:700;color:#374151;display:block;margin-bottom:.375rem;">URL</label>
            <input id="cms-h" class="form-input" value="${_esc(el.getAttribute('href')||'')}" placeholder="https://..." style="width:100%;">
          </div>` : `
          <div style="margin-bottom:1rem;">
            <label style="font-size:.8125rem;font-weight:700;color:#374151;display:block;margin-bottom:.375rem;">Content</label>
            <textarea id="cms-t" style="width:100%;min-height:${cur.length>80?110:68}px;padding:.625rem .75rem;border:1px solid #d1d5db;border-radius:8px;font-size:.875rem;font-family:inherit;resize:vertical;">${_esc(cur)}</textarea>
          </div>`}
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:.625rem .875rem;margin-bottom:1rem;font-size:.75rem;color:#6b7280;">
          <strong>Current:</strong> "${_esc(cur.slice(0,90))}${cur.length>90?'…':''}"
        </div>
        <div style="display:flex;gap:.625rem;flex-wrap:wrap;">
          <button onclick="CMS._saveText()" style="flex:1;padding:.625rem;background:#0D5E30;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">
            <i class="fa-solid fa-check"></i> Save
          </button>
          <button onclick="CMS._closeModal()" style="padding:.625rem 1rem;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;font-weight:600;cursor:pointer;color:#374151;">Cancel</button>
          ${mod ? `<button onclick="CMS._revert()" style="padding:.625rem 1rem;background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;font-weight:600;cursor:pointer;color:#b91c1c;"><i class="fa-solid fa-rotate-left"></i> Revert</button>` : ''}
        </div>
      </div>`);
  }

  function _saveText() {
    if (!_targetEl) return;
    const tEl = document.getElementById('cms-t');
    const hEl = document.getElementById('cms-h');
    if (!tEl) return;
    const tag = _targetEl.tagName.toLowerCase();
    if (tag === 'a' && hEl) {
      saveEl(_targetEl, { type:'href', value: hEl.value.trim(), text: tEl.value.trim() });
    } else {
      saveEl(_targetEl, { type:'text', value: tEl.value.trim() });
    }
    _closeModal();
    Toast.success('Saved!', 'Content updated. Changes are live immediately.');
  }

  /* ── Image edit modal ────────────────────────────────────── */
  function _showImgModal(el) {
    _targetEl = el;
    el.style.outline = '3px solid #0D5E30';
    const mod = el.dataset.cmsModified === '1';
    const curSrc = el.src || '';

    _modal(`
      ${_hdr('image', 'Edit Image', 'Replace or update this image')}
      <div style="padding:1.25rem;">
        <div style="text-align:center;margin-bottom:1rem;">
          <img id="cms-ipr" src="${_esc(curSrc)}" alt="${_esc(el.alt||'')}"
            style="max-height:130px;max-width:100%;border-radius:8px;border:1px solid #e5e7eb;object-fit:cover;"
            onerror="this.style.opacity='.3'">
        </div>
        <!-- Tab row -->
        <div style="display:flex;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:1rem;">
          <button id="cms-it-url" onclick="CMS._imgTab('url')"
            style="flex:1;padding:.5rem;font-size:.8125rem;font-weight:700;background:#0D5E30;color:#fff;border:none;cursor:pointer;">
            <i class="fa-solid fa-link"></i> Paste URL
          </button>
          <button id="cms-it-file" onclick="CMS._imgTab('file')"
            style="flex:1;padding:.5rem;font-size:.8125rem;font-weight:700;background:#f9fafb;color:#6b7280;border:none;cursor:pointer;">
            <i class="fa-solid fa-arrow-up-from-bracket"></i> Upload File
          </button>
        </div>
        <!-- URL panel -->
        <div id="cms-ip-url">
          <input id="cms-iu" class="form-input" placeholder="https://..." style="width:100%;margin-bottom:.875rem;"
            value="${curSrc.startsWith('http') ? _esc(curSrc) : ''}"
            oninput="const v=this.value;if(v)document.getElementById('cms-ipr').src=v;">
        </div>
        <!-- Upload panel -->
        <div id="cms-ip-file" style="display:none;">
          <div onclick="document.getElementById('cms-ifile').click()"
            style="border:2px dashed #d1d5db;border-radius:8px;padding:1.25rem;text-align:center;cursor:pointer;margin-bottom:.875rem;"
            onmouseover="this.style.borderColor='#0D5E30';this.style.background='#f0fdf4'"
            onmouseout="this.style.borderColor='#d1d5db';this.style.background=''">
            <i class="fa-solid fa-cloud-arrow-up" style="font-size:1.75rem;color:#9ca3af;display:block;margin-bottom:.375rem;"></i>
            <div style="font-size:.8125rem;font-weight:600;">Click to browse</div>
            <div style="font-size:.75rem;color:#9ca3af;">PNG, JPG, WebP · max 10MB</div>
          </div>
          <input type="file" id="cms-ifile" accept="image/*" style="display:none;" onchange="CMS._imgFile(this)">
        </div>
        <!-- Alt text -->
        <div style="margin-bottom:1rem;">
          <label style="font-size:.8125rem;font-weight:700;color:#374151;display:block;margin-bottom:.375rem;">Alt Text</label>
          <input id="cms-ialt" class="form-input" placeholder="Describe the image..." value="${_esc(el.alt||'')}" style="width:100%;">
        </div>
        <div style="display:flex;gap:.625rem;">
          <button onclick="CMS._saveImg()" style="flex:1;padding:.625rem;background:#0D5E30;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">
            <i class="fa-solid fa-check"></i> Save Image
          </button>
          <button onclick="CMS._closeModal()" style="padding:.625rem 1rem;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;font-weight:600;cursor:pointer;color:#374151;">Cancel</button>
          ${mod ? `<button onclick="CMS._revert()" style="padding:.625rem 1rem;background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;font-weight:600;cursor:pointer;color:#b91c1c;"><i class="fa-solid fa-rotate-left"></i> Revert</button>` : ''}
        </div>
      </div>`);
  }

  function _imgTab(tab) {
    const url = tab === 'url';
    document.getElementById('cms-ip-url').style.display  = url ? '' : 'none';
    document.getElementById('cms-ip-file').style.display = url ? 'none' : '';
    document.getElementById('cms-it-url').style.cssText  += url ? 'background:#0D5E30;color:#fff;' : 'background:#f9fafb;color:#6b7280;';
    document.getElementById('cms-it-file').style.cssText += url ? 'background:#f9fafb;color:#6b7280;' : 'background:#0D5E30;color:#fff;';
  }

  function _imgFile(input) {
    const f = input.files[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { Toast.warning('Too large', 'Max file size is 10 MB.'); return; }
    const r = new FileReader();
    r.onload = e => {
      document.getElementById('cms-ipr').src = e.target.result;
      document.getElementById('cms-iu').value = e.target.result;
    };
    r.readAsDataURL(f);
  }

  function _saveImg() {
    if (!_targetEl) return;
    const src = (document.getElementById('cms-iu').value || '').trim();
    const alt = (document.getElementById('cms-ialt').value || '').trim();
    if (!src) { Toast.error('No image', 'Enter a URL or upload a file.'); return; }
    saveEl(_targetEl, { type:'src', value:src, alt });
    _closeModal();
    Toast.success('Image Updated!', 'The image has been replaced.');
  }

  function _revert() {
    if (_targetEl) revertEl(_targetEl);
    _closeModal();
  }

  function _resetPage() {
    if (!confirm('Remove all edits on this page and restore defaults?')) return;
    const all = getAllPages();
    delete all[pageKey()];
    saveAllPages(all);
    Toast.success('Page Reset', 'All edits removed. Reloading...');
    setTimeout(() => location.reload(), 900);
  }

  /* ── CSS injected into <head> ─────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('cms-style')) return;
    const s = document.createElement('style');
    s.id = 'cms-style';
    s.textContent = `
      /* Edit-mode hover highlights */
      body.cms-edit-active .cms-el {
        cursor: pointer !important;
        outline: 1px dashed rgba(13,94,48,.35) !important;
      }
      body.cms-edit-active .cms-el:hover {
        outline: 2px solid #0D5E30 !important;
        background: rgba(13,94,48,.05) !important;
      }
      body.cms-edit-active .cms-img-el {
        cursor: pointer !important;
        outline: 2px dashed rgba(13,94,48,.5) !important;
      }
      body.cms-edit-active .cms-img-el:hover {
        outline: 3px solid #0D5E30 !important;
        opacity: .85;
      }
      /* Small badge on modified elements in edit mode */
      body.cms-edit-active [data-cms-modified]::before {
        content: '✏';
        position: absolute;
        top: -7px; right: -7px;
        font-size: 9px;
        background: #0D5E30;
        color: #fff;
        border-radius: 50%;
        width: 15px; height: 15px;
        display: flex;
        align-items: center; justify-content: center;
        pointer-events: none;
        z-index: 9999;
      }
      body.cms-edit-active [data-cms-modified] { position: relative; }
    `;
    document.head.appendChild(s);
  }

  /* ── Public init ─────────────────────────────────────────── */
  function init() {
    const u = JSON.parse(localStorage.getItem('rp_user') || '{}');
    if (!u || !u.isAdmin) return; // non-admins: do nothing
    _injectStyles();
    // Apply overrides immediately (before DOMContentLoaded fires for inline scripts)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => { apply(); injectToolbar(); });
    } else {
      apply(); injectToolbar();
    }
  }

  /* ── Expose public API ───────────────────────────────────── */
  return {
    init, apply, pageKey, cssPath,
    getSettings, getMockData, SETTINGS_KEY, MOCKDATA_KEY,
    // toolbar
    _toggleBar, _toggleEdit, _enterEdit, _exitEdit,
    // modals
    _closeModal, _resetPage,
    _showTextModal, _saveText,
    _showImgModal, _saveImg, _imgTab, _imgFile,
    _revert,
  };
})();

CMS.init();
