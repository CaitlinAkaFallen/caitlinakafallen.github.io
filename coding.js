/* =====================================================
   Caitlin's Programming — page logic
   Announcements (search / sort / tabs / auto-refresh),
   theme, command palette, toasts, shortcuts, effects
   ===================================================== */
(() => {
  'use strict';

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
        window.history.replaceState({}, '', p.replace(/\.html$/, '') + window.location.search + window.location.hash);
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

    async function copyText(text) {
      try { await navigator.clipboard.writeText(text); return true; }
      catch (e) {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
        ta.remove();
        return ok;
      }
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

    /* ===== 7. Reveal on scroll + spotlight ===== */
    const revealEls = $$('[data-reveal]');
    if ('IntersectionObserver' in window && !reduceMotion) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
      }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
      revealEls.forEach((el, i) => { el.style.transitionDelay = `${Math.min(i % 6, 5) * 60}ms`; io.observe(el); });
    } else {
      revealEls.forEach((el) => el.classList.add('in'));
    }

    document.addEventListener('pointermove', (e) => {
      const s = e.target.closest?.('.spot');
      if (!s) return;
      const r = s.getBoundingClientRect();
      s.style.setProperty('--mx', `${e.clientX - r.left}px`);
      s.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { passive: true });

    /* ===== 8. Hero rotator ===== */
    const rotator = $('#rotator');
    if (rotator && !reduceMotion) {
      const phrases = ['custom web experiences', 'Streamer.bot C# scripts', 'interactive stream tools', 'automation that just works'];
      let n = 0;
      setInterval(() => {
        rotator.classList.add('out');
        setTimeout(() => { n = (n + 1) % phrases.length; rotator.textContent = phrases[n]; rotator.classList.remove('out'); }, 260);
      }, 3000);
    }

    /* ===== 9. Announcements ===== */
    const REFRESH_MS = 60000;
    const state = {
      items: [], sig: null, tab: 'normal', query: '', sort: store.get('ccs-sort', 'newest'),
      auto: store.get('ccs-auto', '1') !== '0', loading: true, error: null, lastSync: null, fetching: false
    };

    const el = {
      list: $('#announcement-list'),
      heading: $('#announcement-heading'),
      status: $('#ann-status'),
      seg: $('#ann-seg'),
      tabs: $$('[data-tab]'),
      search: $('#ann-search'),
      clear: $('#ann-clear'),
      sort: $('#ann-sort'),
      refresh: $('#ann-refresh'),
      auto: $('#ann-auto'),
      livePill: $('#live-pill'),
      liveText: $('#live-text'),
      countNormal: $('#count-normal'),
      countRelease: $('#count-release'),
      statTotal: $('#stat-total'),
      statRelease: $('#stat-release'),
      statVersion: $('#stat-version'),
      statSync: $('#stat-sync')
    };

    function normalize(raw, idx) {
      const r = raw && typeof raw === 'object' ? raw : {};
      const type = r.type === 'release' ? 'release' : 'normal';
      const title = String(r.title ?? '').trim() || 'Untitled';
      const version = String(r.version ?? '').trim();
      const notes = String(r.notes ?? '').trim();
      const date = String(r.date ?? '').trim();
      const ts = date ? Date.parse(date) : NaN;
      return { id: `${type}|${title}|${version}|${date}|${idx}`, idx, type, title, version, notes, date, ts, link: safeUrl(r.link) };
    }

    function sortedItems(list) {
      const arr = list.slice();
      const newest = (a, b) => {
        if (Number.isFinite(a.ts) && Number.isFinite(b.ts) && a.ts !== b.ts) return b.ts - a.ts;
        return b.idx - a.idx;
      };
      if (state.sort === 'oldest') arr.sort((a, b) => newest(b, a));
      else if (state.sort === 'az') arr.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
      else arr.sort(newest);
      return arr;
    }

    function visibleItems() {
      const q = state.query.trim().toLowerCase();
      let arr = state.items.filter((i) => i.type === state.tab);
      if (q) arr = arr.filter((i) => `${i.title} ${i.version} ${i.notes}`.toLowerCase().includes(q));
      return sortedItems(arr);
    }

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
      const latest = sortedItems(releases.filter((i) => i.version))[0];
      if (el.statVersion) el.statVersion.textContent = latest ? latest.version : '—';
      if (el.statSync) el.statSync.textContent = state.lastSync ? timeFmt.format(state.lastSync) : '—';
    }

    function skeletons() {
      el.list.innerHTML = '<li class="sk" aria-hidden="true"></li>'.repeat(3);
      el.list.setAttribute('aria-busy', 'true');
    }

    function renderCard(i, n, q) {
      const isRelease = i.type === 'release';
      const recent = Number.isFinite(i.ts) && Date.now() - i.ts < 7 * 86400000 && i.ts <= Date.now() + 86400000;
      const titleHtml = i.link
        ? `<a href="${esc(i.link)}" target="_blank" rel="noopener noreferrer">${highlight(i.title, q)}</a>`
        : highlight(i.title, q);
      const when = Number.isFinite(i.ts)
        ? `<span><i class="fa-regular fa-clock"></i><time datetime="${new Date(i.ts).toISOString()}" data-ts="${i.ts}" title="${esc(dateFmt.format(i.ts))}">${esc(relTime(i.ts))}</time></span>`
        : (i.date ? `<span><i class="fa-regular fa-clock"></i>${esc(i.date)}</span>` : '');
      const notesHtml = i.notes
        ? `<p class="ann-notes clamped" id="notes-${n}">${highlight(i.notes, q)}</p>
           <button class="link-btn" type="button" data-action="toggle" aria-expanded="false" aria-controls="notes-${n}" hidden>Show more</button>`
        : '<p class="ann-notes">No additional notes.</p>';
      return `
        <li class="ann" data-type="${i.type}" data-id="${esc(i.id)}" style="--i:${Math.min(n, 10)}">
          <div class="ann-icon" aria-hidden="true"><i class="fa-solid ${isRelease ? 'fa-rocket' : 'fa-bullhorn'}"></i></div>
          <div class="ann-body">
            <div class="ann-head">
              <h3 class="ann-title">${titleHtml}</h3>
              <div class="ann-badges">
                <span class="badge badge-type">${isRelease ? 'Release' : 'Update'}</span>
                ${i.version ? `<span class="badge badge-ver">${highlight(i.version, q)}</span>` : ''}
                ${recent ? '<span class="badge badge-new">New</span>' : ''}
              </div>
            </div>
            ${notesHtml}
            <div class="ann-meta">${when}</div>
          </div>
          <div class="ann-actions">
            <button class="icon-btn" type="button" data-action="copy" aria-label="Copy announcement" title="Copy"><i class="fa-regular fa-copy"></i></button>
            ${i.link ? `<a class="icon-btn" href="${esc(i.link)}" target="_blank" rel="noopener noreferrer" aria-label="Open link" title="Open link"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ''}
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

      if (state.loading && !state.items.length) { skeletons(); setStatus(); return; }
      el.list.removeAttribute('aria-busy');

      if (state.error && !state.items.length) {
        el.list.innerHTML = renderState('fa-triangle-exclamation', "Couldn't load announcements", 'Check your connection and try again.', 'retry');
        setStatus(); return;
      }

      const q = state.query.trim();
      const items = visibleItems();
      if (!items.length) {
        el.list.innerHTML = q
          ? renderState('fa-magnifying-glass', 'No matches', `Nothing in ${isRelease ? 'releases' : 'announcements'} matches "${q}".`, 'clear')
          : renderState('fa-inbox', isRelease ? 'No release notes yet' : 'No announcements yet', 'Check back soon — new updates will show up here automatically.');
      } else {
        el.list.innerHTML = items.map((i, n) => renderCard(i, n, q)).join('');
        // show "Show more" only where text is actually clamped
        $$('.ann-notes.clamped', el.list).forEach((p) => {
          if (p.scrollHeight > p.clientHeight + 1) $('.link-btn', p.parentElement)?.removeAttribute('hidden');
          else p.classList.remove('clamped');
        });
      }
      setStatus(items.length);
    }

    function setStatus(shown) {
      if (!el.status) return;
      if (state.loading && !state.items.length) { el.status.textContent = 'Loading…'; return; }
      if (state.error && !state.items.length) { el.status.textContent = 'Unable to load'; return; }
      const total = state.items.filter((i) => i.type === state.tab).length;
      const label = state.tab === 'release' ? 'release' : 'announcement';
      const count = typeof shown === 'number' ? shown : total;
      const bits = [state.query.trim() ? `${count} of ${total} ${label}${total === 1 ? '' : 's'}` : `${total} ${label}${total === 1 ? '' : 's'}`];
      if (state.lastSync) bits.push(`updated ${timeFmt.format(state.lastSync)}`);
      el.status.textContent = bits.join(' · ');
    }

    function setLive() {
      if (!el.livePill) return;
      el.livePill.classList.toggle('paused', !state.auto);
      el.livePill.classList.toggle('error', !!state.error && state.auto);
      if (el.liveText) el.liveText.textContent = !state.auto ? 'Paused' : (state.error ? 'Offline' : 'Live');
      if (el.auto) {
        el.auto.setAttribute('aria-pressed', String(state.auto));
        el.auto.setAttribute('aria-label', state.auto ? 'Pause auto-refresh' : 'Resume auto-refresh');
        const i = $('i', el.auto);
        if (i) i.className = state.auto ? 'fa-solid fa-pause' : 'fa-solid fa-play';
      }
    }

    async function load({ silent = false } = {}) {
      if (state.fetching) return;
      state.fetching = true;
      el.refresh?.classList.add('spinning');
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      try {
        const res = await fetch(`/announcements.json?t=${Date.now()}`, { cache: 'no-store', signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let data = await res.json();
        if (!Array.isArray(data)) data = Array.isArray(data?.announcements) ? data.announcements : [];
        const sig = JSON.stringify(data);
        state.error = null;
        state.lastSync = new Date();
        if (sig !== state.sig) {
          const prevKeys = new Set(state.items.map((i) => i.id));
          const next = data.map(normalize);
          const added = next.filter((i) => !prevKeys.has(i.id)).length;
          const hadData = state.sig !== null;
          state.items = next;
          state.sig = sig;
          if (hadData && added > 0) toast(`${added} new announcement${added === 1 ? '' : 's'} posted`, { icon: 'fa-bullhorn' });
        } else if (!silent) {
          toast("You're up to date", { icon: 'fa-circle-check' });
        }
      } catch (err) {
        console.warn('Announcement fetch error:', err);
        state.error = err;
        if (!silent && state.items.length) toast("Couldn't refresh announcements", { icon: 'fa-triangle-exclamation', kind: 'err' });
      } finally {
        clearTimeout(timer);
        state.fetching = false;
        state.loading = false;
        el.refresh?.classList.remove('spinning');
        render();
        setLive();
      }
    }

    function setTab(tab, { focus = false } = {}) {
      if (tab !== 'normal' && tab !== 'release') return;
      state.tab = tab;
      try { history.replaceState(null, '', window.location.pathname + window.location.search + '#' + (tab === 'release' ? 'release' : 'announcements')); } catch (e) { /* ignore */ }
      render();
      if (focus) $(`[data-tab="${tab}"]`)?.focus();
    }

    function setQuery(v) {
      state.query = v;
      if (el.search && el.search.value !== v) el.search.value = v;
      if (el.clear) el.clear.hidden = !v;
      render();
    }

    function setAuto(on, announce = true) {
      state.auto = on;
      store.set('ccs-auto', on ? '1' : '0');
      setLive();
      if (announce) toast(on ? 'Auto-refresh on' : 'Auto-refresh paused', { icon: on ? 'fa-play' : 'fa-pause' });
    }

    // Wire up controls
    el.tabs.forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); setTab(b.dataset.tab); }));
    el.seg?.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); setTab(state.tab === 'normal' ? 'release' : 'normal', { focus: true }); }
    });
    el.search?.addEventListener('input', (e) => setQuery(e.target.value));
    el.search?.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.query) { e.stopPropagation(); setQuery(''); } });
    el.clear?.addEventListener('click', () => { setQuery(''); el.search?.focus(); });
    if (el.sort) {
      if (['newest', 'oldest', 'az'].includes(state.sort)) el.sort.value = state.sort; else state.sort = 'newest';
      el.sort.addEventListener('change', (e) => { state.sort = e.target.value; store.set('ccs-sort', state.sort); render(); });
    }
    el.refresh?.addEventListener('click', () => load());
    el.auto?.addEventListener('click', () => setAuto(!state.auto));

    el.list?.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'retry') { state.loading = true; render(); load(); }
      else if (action === 'clear') { setQuery(''); el.search?.focus(); }
      else if (action === 'toggle') {
        const p = document.getElementById(btn.getAttribute('aria-controls'));
        if (!p) return;
        const open = p.classList.toggle('clamped') === false;
        btn.setAttribute('aria-expanded', String(open));
        btn.textContent = open ? 'Show less' : 'Show more';
      } else if (action === 'copy') {
        const item = state.items.find((i) => i.id === btn.closest('.ann')?.dataset.id);
        if (!item) return;
        const parts = [item.version ? `${item.title} (${item.version})` : item.title];
        if (item.notes) parts.push(item.notes);
        if (item.link) parts.push(item.link);
        const ok = await copyText(parts.join('\n'));
        toast(ok ? 'Copied to clipboard' : "Couldn't copy", ok ? {} : { icon: 'fa-triangle-exclamation', kind: 'err' });
      }
    });

    // Keep relative times fresh
    setInterval(() => {
      $$('time[data-ts]').forEach((t) => { t.textContent = relTime(Number(t.dataset.ts)); });
    }, 30000);

    // Auto-refresh loop (skips when tab hidden)
    setInterval(() => { if (state.auto && !document.hidden) load({ silent: true }); }, REFRESH_MS);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && state.auto && (!state.lastSync || Date.now() - state.lastSync > REFRESH_MS)) load({ silent: true });
    });

    // Deep link (#release)
    if (window.location.hash === '#release') state.tab = 'release';

    skeletons();
    setLive();
    render();
    load({ silent: true });

    /* ===== 10. Command palette ===== */
    const pal = { el: $('#palette'), input: $('#palette-input'), list: $('#palette-list'), idx: 0, items: [], cmds: [] };

    function buildCommands() {
      const pages = $$('[data-cmd]').map((a) => {
        const external = a.hostname && a.hostname !== window.location.hostname;
        return {
          label: a.dataset.cmd,
          hint: external ? 'Open in new tab' : 'Go to page',
          icon: 'fa-solid ' + (a.dataset.icon || 'fa-arrow-right'),
          run: () => { if (external) window.open(a.href, '_blank', 'noopener'); else window.location.href = a.href; }
        };
      });
      const seen = new Set();
      const uniquePages = pages.filter((p) => (seen.has(p.label) ? false : seen.add(p.label)));
      return [
        ...uniquePages,
        { label: 'Show announcements', hint: 'Action', icon: 'fa-solid fa-bullhorn', run: () => { setTab('normal'); $('#announcements')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); } },
        { label: 'Show release notes', hint: 'Action', icon: 'fa-solid fa-rocket', run: () => { setTab('release'); $('#announcements')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); } },
        { label: 'Refresh announcements', hint: 'Action · R', icon: 'fa-solid fa-rotate', run: () => load() },
        { label: state.auto ? 'Pause auto-refresh' : 'Resume auto-refresh', hint: 'Action', icon: state.auto ? 'fa-solid fa-pause' : 'fa-solid fa-play', run: () => setAuto(!state.auto) },
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
    $('#hero-palette')?.addEventListener('click', openPalette);
    pal.input?.addEventListener('input', () => { pal.idx = 0; renderPalette(); });
    pal.input?.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); selectPalette(pal.idx + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); selectPalette(pal.idx - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); runPalette(pal.idx); }
    });
    pal.list?.addEventListener('click', (e) => { const li = e.target.closest('.pal-item'); if (li) runPalette(Number(li.dataset.i)); });
    pal.list?.addEventListener('mousemove', (e) => { const li = e.target.closest('.pal-item'); if (li && Number(li.dataset.i) !== pal.idx) selectPalette(Number(li.dataset.i)); });

    /* ===== 11. Keyboard shortcuts ===== */
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (layers.top() === pal.el) layers.close(pal.el); else openPalette();
        return;
      }
      if (e.key === 'Escape') {
        if (layers.closeTop()) return;
        if (navLinks?.classList.contains('open')) setMenu(false);
        return;
      }
      const t = e.target;
      const typing = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
      if (typing || e.metaKey || e.ctrlKey || e.altKey || layers.top()) return;
      if (e.key === '/') { e.preventDefault(); $('#announcements')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); el.search?.focus({ preventScroll: true }); }
      else if (e.key === '1') setTab('normal');
      else if (e.key === '2') setTab('release');
      else if (e.key.toLowerCase() === 'r') load();
    });
  }
})();
