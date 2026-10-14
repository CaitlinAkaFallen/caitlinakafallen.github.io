/* =====================================================
   Caitlin's Admin — page logic
   Same shell as coding.js (theme, nav, modals, palette,
   toasts, shortcuts) + announcement editor
   ===================================================== */
(() => {
  'use strict';

  const API = 'https://caitlins-announcement-api.onrender.com/api/announcements';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
  };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function safeUrl(raw) {
    if (!raw || !String(raw).trim()) return '';
    try {
      const u = new URL(String(raw).trim(), window.location.href);
      return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : '';
    } catch (e) { return ''; }
  }

  function highlight(text, q) {
    const t = String(text ?? '');
    if (!q) return esc(t);
    const re = new RegExp(escRe(q), 'gi');
    let out = '', last = 0, m;
    while ((m = re.exec(t)) !== null) {
      if (m[0] === '') { re.lastIndex++; continue; }
      out += esc(t.slice(last, m.index)) + '<mark>' + esc(m[0]) + '</mark>';
      last = m.index + m[0].length;
    }
    return out + esc(t.slice(last));
  }

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const dateFmt = new Intl.DateTimeFormat('en', { dateStyle: 'medium' });
  const timeFmt = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' });

  function relTime(ts) {
    const diff = (ts - Date.now()) / 1000;
    const abs = Math.abs(diff);
    if (abs < 45) return 'just now';
    if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
    if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
    if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day');
    return dateFmt.format(ts);
  }

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    /* ===== 1. Clean URL (hide .html) ===== */
    (function hideHtmlInURL() {
      const p = window.location.pathname;
      if (p.endsWith('.html')) {
        window.history.replaceState({}, '', p.replace(/\.html$/, '').toLowerCase() + window.location.search + window.location.hash);
      }
    })();

    const yearEl = $('#year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    /* ===== 2. Loading overlay ===== */
    const overlay = $('#loading-overlay');
    const hideOverlay = () => overlay && overlay.classList.add('done');
    if (document.readyState === 'complete') hideOverlay();
    else { window.addEventListener('load', hideOverlay); setTimeout(hideOverlay, 2500); }

    /* ===== 3. Toasts ===== */
    const toastHost = $('#toasts');
    function toast(msg, { icon = 'fa-circle-check', kind = '' } = {}) {
      if (!toastHost) return;
      const t = document.createElement('div');
      t.className = 'toast ' + kind;
      t.innerHTML = `<i class="fa-solid ${esc(icon)}"></i><span>${esc(msg)}</span>`;
      toastHost.appendChild(t);
      requestAnimationFrame(() => t.classList.add('in'));
      setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 350); }, 3200);
    }

    /* ===== 4. Layers (modals + palette) ===== */
    const layers = {
      stack: [],
      open(el, focusEl) {
        if (!el || this.stack.includes(el)) return;
        el._returnFocus = document.activeElement;
        el.classList.add('show');
        el.setAttribute('aria-hidden', 'false');
        document.body.classList.add('no-scroll');
        this.stack.push(el);
        const target = focusEl || $('.modal-content', el) || $('.palette', el);
        if (target) setTimeout(() => target.focus({ preventScroll: true }), 30);
      },
      close(el) {
        if (!el) return;
        el.classList.remove('show');
        el.setAttribute('aria-hidden', 'true');
        this.stack = this.stack.filter((x) => x !== el);
        if (!this.stack.length) document.body.classList.remove('no-scroll');
        if (el._returnFocus && el._returnFocus.focus) el._returnFocus.focus({ preventScroll: true });
      },
      top() { return this.stack[this.stack.length - 1]; },
      closeTop() { const t = this.top(); if (t) this.close(t); return !!t; }
    };

    const tosModal = $('#tos-modal');
    const privacyModal = $('#privacy-modal');
    $('#open-tos')?.addEventListener('click', (e) => { e.preventDefault(); layers.open(tosModal); });
    $('#open-privacy')?.addEventListener('click', (e) => { e.preventDefault(); layers.open(privacyModal); });
    $$('.modal .close').forEach((b) => b.addEventListener('click', () => layers.close(b.closest('.modal'))));
    $$('.modal').forEach((m) => m.addEventListener('mousedown', (e) => { if (e.target === m) layers.close(m); }));

    // Focus trap
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const top = layers.top();
      if (!top) return;
      const f = $$('button, [href], input, select, [tabindex]:not([tabindex="-1"])', top).filter((n) => !n.hasAttribute('disabled') && n.offsetParent !== null);
      if (!f.length) { e.preventDefault(); return; }
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || !top.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    /* ===== 5. Theme ===== */
    const themeBtn = $('#theme-toggle');
    function setTheme(t, persist = true) {
      document.documentElement.setAttribute('data-theme', t);
      themeBtn?.setAttribute('aria-pressed', String(t === 'light'));
      const meta = $('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', t === 'light' ? '#f3f4ff' : '#06061a');
      if (persist) store.set('ccs-theme', t);
    }
    const toggleTheme = () => {
      const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      setTheme(next);
      toast(`${next === 'light' ? 'Light' : 'Dark'} theme on`, { icon: next === 'light' ? 'fa-sun' : 'fa-moon' });
    };
    setTheme(document.documentElement.getAttribute('data-theme') || 'dark', false);
    themeBtn?.addEventListener('click', toggleTheme);

    /* ===== 6. Navigation (mobile drawer, scroll effects) ===== */
    const nav = $('#site-nav');
    const burger = $('#nav-burger');
    const navLinks = $('#nav-links');
    function setMenu(open) {
      navLinks?.classList.toggle('open', open);
      burger?.setAttribute('aria-expanded', String(open));
      const i = $('i', burger);
      if (i) i.className = open ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
    }
    burger?.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
    navLinks?.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('click', (e) => {
      if (navLinks?.classList.contains('open') && !e.target.closest('#nav-links, #nav-burger')) setMenu(false);
    });

    const progress = $('#scroll-progress');
    const toTop = $('#to-top');
    let ticking = false;
    function onScroll() {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progress) progress.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
      nav?.classList.toggle('scrolled', y > 8);
      toTop?.classList.toggle('show', y > 600);
      ticking = false;
    }
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();
    toTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

    // Spotlight hover
    document.addEventListener('pointermove', (e) => {
      const s = e.target.closest?.('.spot');
      if (!s) return;
      const r = s.getBoundingClientRect();
      s.style.setProperty('--mx', `${e.clientX - r.left}px`);
      s.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { passive: true });

    /* ===== 7. Announcements state ===== */
    const state = {
      items: [],            // every announcement, as stored on the server
      tab: 'normal',
      query: '',
      editing: null,        // the item object being edited, or null
      loaded: false,        // saving is blocked until the server list has loaded
      loading: true,
      saving: false,
      error: null,
      lastSync: null
    };

    const el = {
      list: $('#announcement-list'),
      heading: $('#announcement-heading'),
      status: $('#ann-status'),
      seg: $('#ann-seg'),
      tabs: $$('[data-tab]'),
      search: $('#ann-search'),
      clear: $('#ann-clear'),
      refresh: $('#ann-refresh'),
      livePill: $('#live-pill'),
      liveText: $('#live-text'),
      countNormal: $('#count-normal'),
      countRelease: $('#count-release'),
      statTotal: $('#stat-total'),
      statRelease: $('#stat-release'),
      statVersion: $('#stat-version'),
      statSync: $('#stat-sync'),
      editor: $('#editor'),
      editorTitle: $('#editor-title'),
      editorSub: $('#editor-sub'),
      form: $('#announcement-form'),
      fTitle: $('#announcement-title'),
      fLink: $('#announcement-link'),
      fVersion: $('#announcement-version'),
      fNotes: $('#announcement-notes'),
      releaseFields: $$('.release-only'),
      submit: $('#submit-btn'),
      cancel: $('#cancel-btn'),
      del: $('#delete-btn')
    };

    function normalizeItem(raw) {
      const r = raw && typeof raw === 'object' ? raw : {};
      return {
        title: String(r.title ?? ''),
        link: String(r.link ?? ''),
        version: String(r.version ?? ''),
        notes: String(r.notes ?? ''),
        type: r.type === 'release' ? 'release' : 'normal',
        date: String(r.date ?? '')
      };
    }

    const tsOf = (i) => (i.date ? Date.parse(i.date) : NaN);

    function visibleEntries() {
      const q = state.query.trim().toLowerCase();
      let arr = state.items.map((item, idx) => ({ item, idx })).filter((x) => x.item.type === state.tab);
      if (q) arr = arr.filter((x) => `${x.item.title} ${x.item.version} ${x.item.notes}`.toLowerCase().includes(q));
      arr.sort((a, b) => {
        const ta = tsOf(a.item), tb = tsOf(b.item);
        if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return tb - ta;
        return b.idx - a.idx;
      });
      return arr;
    }

    /* ===== 8. Rendering ===== */
    function animateNumber(node, to) {
      if (!node) return;
      const from = parseInt(node.textContent, 10) || 0;
      if (reduceMotion || from === to) { node.textContent = to; return; }
      const start = performance.now(), dur = 600;
      (function step(t) {
        const p = Math.min((t - start) / dur, 1);
        node.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      })(start);
    }

    function updateStats() {
      const total = state.items.length;
      const releases = state.items.filter((i) => i.type === 'release');
      animateNumber(el.statTotal, total);
      animateNumber(el.statRelease, releases.length);
      animateNumber(el.countNormal, total - releases.length);
      animateNumber(el.countRelease, releases.length);
      const latest = releases
        .filter((i) => i.version)
        .sort((a, b) => (tsOf(b) || 0) - (tsOf(a) || 0))[0];
      if (el.statVersion) el.statVersion.textContent = latest ? latest.version : '—';
      if (el.statSync) el.statSync.textContent = state.lastSync ? timeFmt.format(state.lastSync) : '—';
    }

    function renderCard({ item: i, idx }, n, q) {
      const isRelease = i.type === 'release';
      const link = safeUrl(i.link);
      const ts = tsOf(i);
      const titleText = i.title || 'Untitled announcement';
      const titleHtml = link
        ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">${highlight(titleText, q)}</a>`
        : highlight(titleText, q);
      const when = Number.isFinite(ts)
        ? `<span><i class="fa-regular fa-clock"></i><time datetime="${new Date(ts).toISOString()}" data-ts="${ts}" title="${esc(dateFmt.format(ts))}">${esc(relTime(ts))}</time></span>`
        : (i.date ? `<span><i class="fa-regular fa-clock"></i>${esc(i.date)}</span>` : '');
      const notes = i.notes
        ? `<p class="ann-notes">${highlight(i.notes, q)}</p>`
        : '<p class="ann-notes plain">No additional notes.</p>';
      const selected = state.editing === i;
      return `
        <li class="ann${selected ? ' is-selected' : ''}" data-type="${i.type}" data-idx="${idx}" style="--i:${Math.min(n, 10)}">
          <div class="ann-icon" aria-hidden="true"><i class="fa-solid ${isRelease ? 'fa-rocket' : 'fa-bullhorn'}"></i></div>
          <div class="ann-body">
            <div class="ann-head">
              <h3 class="ann-title">${titleHtml}</h3>
              <div class="ann-badges">
                <span class="badge badge-type">${isRelease ? 'Release' : 'Update'}</span>
                ${i.version ? `<span class="badge badge-ver">${highlight(i.version, q)}</span>` : ''}
              </div>
            </div>
            ${notes}
            <div class="ann-meta">${when}</div>
          </div>
          <div class="ann-actions">
            <button class="icon-btn" type="button" data-action="edit" aria-label="Edit announcement" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button class="icon-btn danger" type="button" data-action="delete" aria-label="Delete announcement" title="Delete"><i class="fa-regular fa-trash-can"></i></button>
          </div>
        </li>`;
    }

    function renderState(icon, title, text, action) {
      return `<li class="state ${action === 'retry' ? 'is-error' : ''}">
        <div class="state-icon"><i class="fa-solid ${icon}"></i></div>
        <h3>${esc(title)}</h3><p>${esc(text)}</p>
        ${action === 'retry' ? '<button class="btn btn-ghost" type="button" data-action="retry"><i class="fa-solid fa-rotate"></i> Try again</button>' : ''}
        ${action === 'clear' ? '<button class="btn btn-ghost" type="button" data-action="clear"><i class="fa-solid fa-xmark"></i> Clear search</button>' : ''}
      </li>`;
    }

    function setStatus(shown) {
      if (!el.status) return;
      if (state.loading && !state.loaded) { el.status.textContent = 'Loading…'; return; }
      if (state.error && !state.loaded) { el.status.textContent = 'Unable to load'; return; }
      const total = state.items.filter((i) => i.type === state.tab).length;
      const label = state.tab === 'release' ? 'release' : 'announcement';
      const count = typeof shown === 'number' ? shown : total;
      const bits = [state.query.trim() ? `${count} of ${total} ${label}${total === 1 ? '' : 's'}` : `${total} ${label}${total === 1 ? '' : 's'}`];
      if (state.lastSync) bits.push(`synced ${timeFmt.format(state.lastSync)}`);
      el.status.textContent = bits.join(' · ');
    }

    function setLive() {
      if (!el.livePill) return;
      const offline = !!state.error && !state.saving;
      el.livePill.classList.toggle('error', offline);
      el.livePill.classList.toggle('saving', state.saving);
      if (el.liveText) el.liveText.textContent = state.saving ? 'Saving' : (offline ? 'Offline' : (state.loaded ? 'Synced' : 'Connecting'));
    }

    function render() {
      const isRelease = state.tab === 'release';
      if (el.heading) el.heading.textContent = isRelease ? 'Release Announcements' : 'Normal Announcements';
      el.seg?.setAttribute('data-active', state.tab);
      el.tabs.forEach((b) => {
        const on = b.dataset.tab === state.tab;
        b.classList.toggle('active-toggle', on);
        b.setAttribute('aria-selected', String(on));
        b.tabIndex = on ? 0 : -1;
      });
      updateStats();
      syncEditorChrome();

      if (state.loading && !state.loaded) {
        el.list.innerHTML = '<li class="sk" aria-hidden="true"></li>'.repeat(3);
        el.list.setAttribute('aria-busy', 'true');
        setStatus(); setLive(); return;
      }
      el.list.removeAttribute('aria-busy');

      if (state.error && !state.loaded) {
        el.list.innerHTML = renderState('fa-triangle-exclamation', "Couldn't load announcements", 'The server may be waking up. Try again in a few seconds.', 'retry');
        setStatus(); setLive(); return;
      }

      const q = state.query.trim();
      const entries = visibleEntries();
      if (!entries.length) {
        el.list.innerHTML = q
          ? renderState('fa-magnifying-glass', 'No matches', `Nothing in ${isRelease ? 'releases' : 'announcements'} matches "${q}".`, 'clear')
          : renderState('fa-inbox', isRelease ? 'No release notes yet' : 'No announcements yet', 'Use the form to post your first one.');
      } else {
        el.list.innerHTML = entries.map((x, n) => renderCard(x, n, q)).join('');
      }
      setStatus(entries.length);
      setLive();
    }

    /* ===== 9. Editor ===== */
    function syncEditorChrome() {
      const editing = !!state.editing;
      const isRelease = state.tab === 'release';
      el.releaseFields.forEach((f) => { f.hidden = !isRelease; });
      el.editor?.classList.toggle('is-editing', editing);
      if (el.editorTitle) el.editorTitle.textContent = editing ? 'Edit announcement' : (isRelease ? 'New release' : 'New announcement');
      if (el.editorSub) el.editorSub.textContent = editing ? 'Update the details, then save your changes.' : `Posts to the ${isRelease ? 'Releases' : 'Normal'} tab.`;
      const label = $('span', el.submit);
      const icon = $('i', el.submit);
      if (label) label.textContent = editing ? 'Save changes' : (isRelease ? 'Add release' : 'Add announcement');
      if (icon) icon.className = editing ? 'fa-solid fa-floppy-disk' : 'fa-solid fa-plus';
      el.cancel.hidden = !editing;
      el.del.hidden = !editing;
      el.submit.disabled = state.saving;
      el.del.disabled = state.saving;
    }

    function resetForm() {
      el.form.reset();
      el.fTitle.classList.remove('invalid');
      state.editing = null;
    }

    function startEdit(item) {
      state.editing = item;
      el.fTitle.value = item.title;
      el.fLink.value = item.link;
      el.fVersion.value = item.version;
      el.fNotes.value = item.notes;
      el.fTitle.classList.remove('invalid');
      render();
      if (window.innerWidth <= 980) el.editor?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      el.fTitle.focus({ preventScroll: true });
    }

    function cancelEdit() {
      resetForm();
      render();
    }

    /* ===== 10. Server I/O ===== */
    async function load({ silent = false } = {}) {
      el.refresh?.classList.add('spinning');
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 20000); // Render free tier can be slow to wake
      try {
        const res = await fetch(API, { cache: 'no-store', signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let data = await res.json();
        if (!Array.isArray(data)) data = Array.isArray(data?.announcements) ? data.announcements : [];
        state.items = data.map(normalizeItem);
        state.loaded = true;
        state.error = null;
        state.lastSync = new Date();
        if (state.editing) state.editing = null; // item objects were replaced
        if (!silent) toast('Reloaded from server', { icon: 'fa-rotate' });
      } catch (err) {
        console.warn('Announcement fetch error:', err);
        state.error = err;
        if (state.loaded) toast("Couldn't reach the server", { icon: 'fa-triangle-exclamation', kind: 'err' });
      } finally {
        clearTimeout(timer);
        state.loading = false;
        el.refresh?.classList.remove('spinning');
        render();
      }
    }

    // Writes the whole list. Blocked until the server list has loaded once,
    // so an empty/failed load can never overwrite real data.
    async function save() {
      if (!state.loaded) {
        toast("Server data hasn't loaded yet — reload first", { icon: 'fa-triangle-exclamation', kind: 'warn' });
        return false;
      }
      state.saving = true; render();
      try {
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state.items)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        state.lastSync = new Date();
        state.error = null;
        return true;
      } catch (err) {
        console.error('Failed to save announcements:', err);
        state.error = err;
        return false;
      } finally {
        state.saving = false;
      }
    }

    async function submitForm() {
      const title = el.fTitle.value.trim();
      const notes = el.fNotes.value.trim();
      if (!title && !notes) {
        el.fTitle.classList.add('invalid');
        el.fTitle.focus();
        toast('Add a title or notes first', { icon: 'fa-triangle-exclamation', kind: 'warn' });
        return;
      }
      el.fTitle.classList.remove('invalid');

      const data = {
        title,
        link: el.fLink.value.trim().replace(/\.html$/, ''),
        version: state.tab === 'release' ? el.fVersion.value.trim() : '',
        notes
      };

      const prev = state.items.slice();
      const wasEditing = !!state.editing;
      if (wasEditing) {
        const idx = state.items.indexOf(state.editing);
        if (idx === -1) { cancelEdit(); return; }
        state.items[idx] = { ...state.editing, ...data };
      } else {
        state.items.push({ ...data, type: state.tab, date: new Date().toISOString() });
      }

      const ok = await save();
      if (ok) {
        resetForm();
        toast(wasEditing ? 'Changes saved' : 'Announcement posted', { icon: 'fa-bullhorn' });
      } else {
        state.items = prev;
        toast("Couldn't save — the server rejected the update", { icon: 'fa-triangle-exclamation', kind: 'err' });
      }
      render();
    }

    async function deleteItem(item) {
      if (!item) return;
      if (!window.confirm(`Delete "${item.title || 'this announcement'}"? This can't be undone.`)) return;
      const prev = state.items.slice();
      state.items = state.items.filter((i) => i !== item);
      if (state.editing === item) resetForm();
      const ok = await save();
      if (ok) toast('Announcement deleted', { icon: 'fa-trash-can' });
      else { state.items = prev; toast("Couldn't delete — the server rejected the update", { icon: 'fa-triangle-exclamation', kind: 'err' }); }
      render();
    }

    /* ===== 11. Wiring ===== */
    function setTab(tab, { focus = false } = {}) {
      if (tab !== 'normal' && tab !== 'release') return;
      if (tab === state.tab) return;
      state.tab = tab;
      resetForm();
      render();
      if (focus) $(`[data-tab="${tab}"]`)?.focus();
    }

    function setQuery(v) {
      state.query = v;
      if (el.search && el.search.value !== v) el.search.value = v;
      if (el.clear) el.clear.hidden = !v;
      render();
    }

    el.tabs.forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); setTab(b.dataset.tab); }));
    el.seg?.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); setTab(state.tab === 'normal' ? 'release' : 'normal', { focus: true }); }
    });
    el.search?.addEventListener('input', (e) => setQuery(e.target.value));
    el.search?.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.query) { e.stopPropagation(); setQuery(''); } });
    el.clear?.addEventListener('click', () => { setQuery(''); el.search?.focus(); });
    el.refresh?.addEventListener('click', () => load());

    el.form?.addEventListener('submit', (e) => { e.preventDefault(); submitForm(); });
    el.cancel?.addEventListener('click', cancelEdit);
    el.del?.addEventListener('click', () => deleteItem(state.editing));
    el.fTitle?.addEventListener('input', () => el.fTitle.classList.remove('invalid'));

    el.list?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'retry') { state.loading = true; render(); load({ silent: true }); return; }
      if (action === 'clear') { setQuery(''); el.search?.focus(); return; }
      const item = state.items[Number(btn.closest('.ann')?.dataset.idx)];
      if (!item) return;
      if (action === 'edit') startEdit(item);
      else if (action === 'delete') deleteItem(item);
    });

    // Keep relative times fresh
    setInterval(() => {
      $$('time[data-ts]').forEach((t) => { t.textContent = relTime(Number(t.dataset.ts)); });
    }, 30000);

    // Deep link (#release)
    if (window.location.hash === '#release') state.tab = 'release';

    render();
    load({ silent: true });

    /* ===== 12. Command palette ===== */
    const pal = { el: $('#palette'), input: $('#palette-input'), list: $('#palette-list'), idx: 0, items: [], cmds: [] };

    function focusNew() {
      cancelEdit();
      el.editor?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      el.fTitle?.focus({ preventScroll: true });
    }

    function buildCommands() {
      const pages = $$('[data-cmd]').map((a) => ({
        label: a.dataset.cmd,
        hint: 'Go to page',
        icon: 'fa-solid ' + (a.dataset.icon || 'fa-arrow-right'),
        run: () => { window.location.href = a.href; }
      }));
      const seen = new Set();
      const uniquePages = pages.filter((p) => (seen.has(p.label) ? false : seen.add(p.label)));
      return [
        ...uniquePages,
        { label: 'New announcement', hint: 'Action · N', icon: 'fa-solid fa-plus', run: () => { setTab('normal'); focusNew(); } },
        { label: 'New release', hint: 'Action', icon: 'fa-solid fa-rocket', run: () => { setTab('release'); focusNew(); } },
        { label: 'Show announcements', hint: 'Action · 1', icon: 'fa-solid fa-bullhorn', run: () => setTab('normal') },
        { label: 'Show release notes', hint: 'Action · 2', icon: 'fa-solid fa-rocket', run: () => setTab('release') },
        { label: 'Reload from server', hint: 'Action · R', icon: 'fa-solid fa-rotate', run: () => load() },
        { label: 'Toggle light / dark theme', hint: 'Action', icon: 'fa-solid fa-circle-half-stroke', run: toggleTheme },
        { label: 'Terms of Service', hint: 'Legal', icon: 'fa-solid fa-file-contract', run: () => layers.open(tosModal) },
        { label: 'Privacy Policy', hint: 'Legal', icon: 'fa-solid fa-shield-halved', run: () => layers.open(privacyModal) },
        { label: 'Back to top', hint: 'Action', icon: 'fa-solid fa-arrow-up', run: () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }) }
      ];
    }

    function renderPalette() {
      const q = pal.input.value.trim().toLowerCase();
      pal.items = pal.cmds
        .filter((c) => !q || `${c.label} ${c.hint}`.toLowerCase().includes(q))
        .sort((a, b) => (q ? Number(b.label.toLowerCase().startsWith(q)) - Number(a.label.toLowerCase().startsWith(q)) : 0));
      pal.idx = Math.min(pal.idx, Math.max(pal.items.length - 1, 0));
      pal.list.innerHTML = pal.items.length
        ? pal.items.map((c, i) => `<li class="pal-item" role="option" id="pal-${i}" data-i="${i}" aria-selected="${i === pal.idx}"><i class="${esc(c.icon)}"></i><span>${esc(c.label)}</span><small>${esc(c.hint)}</small></li>`).join('')
        : '<li class="pal-empty">No matching commands</li>';
      pal.input.setAttribute('aria-activedescendant', pal.items.length ? `pal-${pal.idx}` : '');
    }

    function selectPalette(i) {
      pal.idx = (i + pal.items.length) % Math.max(pal.items.length, 1);
      $$('.pal-item', pal.list).forEach((n, k) => n.setAttribute('aria-selected', String(k === pal.idx)));
      $(`#pal-${pal.idx}`)?.scrollIntoView({ block: 'nearest' });
      pal.input.setAttribute('aria-activedescendant', `pal-${pal.idx}`);
    }

    function runPalette(i) {
      const c = pal.items[i];
      if (!c) return;
      layers.close(pal.el);
      setTimeout(c.run, 60);
    }

    function openPalette() {
      if (!pal.el) return;
      if (layers.top() && layers.top() !== pal.el) layers.closeTop();
      pal.cmds = buildCommands();
      pal.input.value = '';
      pal.idx = 0;
      renderPalette();
      layers.open(pal.el, pal.input);
    }

    $('#open-palette')?.addEventListener('click', openPalette);
    pal.input?.addEventListener('input', () => { pal.idx = 0; renderPalette(); });
    pal.input?.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); selectPalette(pal.idx + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); selectPalette(pal.idx - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); runPalette(pal.idx); }
    });
    pal.list?.addEventListener('click', (e) => { const li = e.target.closest('.pal-item'); if (li) runPalette(Number(li.dataset.i)); });
    pal.list?.addEventListener('mousemove', (e) => { const li = e.target.closest('.pal-item'); if (li && Number(li.dataset.i) !== pal.idx) selectPalette(Number(li.dataset.i)); });

    /* ===== 13. Keyboard shortcuts ===== */
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (layers.top() === pal.el) layers.close(pal.el); else openPalette();
        return;
      }
      if (e.key === 'Escape') {
        if (layers.closeTop()) return;
        if (navLinks?.classList.contains('open')) { setMenu(false); return; }
        if (state.editing) cancelEdit();
        return;
      }
      const t = e.target;
      const typing = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
      if (typing || e.metaKey || e.ctrlKey || e.altKey || layers.top()) return;
      if (e.key === '/') { e.preventDefault(); el.search?.focus(); }
      else if (e.key === '1') setTab('normal');
      else if (e.key === '2') setTab('release');
      else if (e.key.toLowerCase() === 'n') { e.preventDefault(); focusNew(); }
      else if (e.key.toLowerCase() === 'r') load();
    });
  }
})();
