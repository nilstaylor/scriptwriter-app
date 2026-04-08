/**
 * Scriptwriter — Studio Features
 * ──────────────────────────────────────────────────────────────────
 * Additional features matching StudioBinder's scriptwriting software:
 *   - Title Page editor/generator
 *   - Watermark for print/PDF
 *   - Lock Screenplay toggle
 *   - Auto-save status indicator
 *   - Revision History (localStorage snapshots)
 *   - Scene Numbering toggle
 *
 * Depends on: menubar.js (menu structure), format-fix.css (styles)
 */
(function () {
  'use strict';

  const STORAGE = {
    TITLE_PAGE: 'sw_title_page',
    WATERMARK: 'sw_watermark',
    REVISIONS: 'sw_revisions',
    HEADER_FOOTER: 'sw_header_footer',
    AUTOSAVE_INTERVAL: 'sw_autosave_interval',
  };

  // ══════════════════════════════════════════════════════════════════
  // 1. TITLE PAGE
  // ══════════════════════════════════════════════════════════════════

  function getTitlePageData() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.TITLE_PAGE) || '{}');
    } catch { return {}; }
  }

  function saveTitlePageData(data) {
    localStorage.setItem(STORAGE.TITLE_PAGE, JSON.stringify(data));
  }

  function showTitlePageDialog() {
    const existing = document.getElementById('sw-titlepage-dialog');
    if (existing) { existing.remove(); return; }

    const data = getTitlePageData();

    const overlay = document.createElement('div');
    overlay.id = 'sw-titlepage-dialog';
    overlay.style.cssText = `
      position:fixed; inset:0; z-index:10000; background:rgba(0,0,0,0.6);
      display:flex; align-items:center; justify-content:center;
      font-family:'Satoshi',system-ui,sans-serif;
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    const box = document.createElement('div');
    box.style.cssText = `
      background:hsl(224,71%,5%); border:1px solid hsl(215,28%,20%);
      border-radius:8px; padding:24px; width:420px; max-width:90vw;
      max-height:85vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,0.5);
    `;

    const title = document.createElement('h2');
    title.textContent = 'Title Page';
    title.style.cssText = 'margin:0 0 16px; font-size:15px; color:hsl(0,0%,90%); font-weight:700;';
    box.appendChild(title);

    const fields = [
      { key: 'title', label: 'Title', placeholder: 'Untitled Screenplay', type: 'text' },
      { key: 'subtitle', label: 'Subtitle (optional)', placeholder: 'A Feature Film', type: 'text' },
      { key: 'author', label: 'Written By', placeholder: 'Author Name', type: 'text' },
      { key: 'basedOn', label: 'Based On (optional)', placeholder: 'Based on the novel by...', type: 'text' },
      { key: 'draftDate', label: 'Draft Date', placeholder: 'April 2026', type: 'text' },
      { key: 'draftNumber', label: 'Draft', placeholder: 'First Draft', type: 'text' },
      { key: 'contact', label: 'Contact Info', placeholder: 'Name\nAddress\nPhone\nEmail', type: 'textarea' },
    ];

    const inputs = {};

    fields.forEach(f => {
      const label = document.createElement('label');
      label.style.cssText = 'display:block; margin-bottom:12px;';

      const lText = document.createElement('span');
      lText.textContent = f.label;
      lText.style.cssText = 'display:block; font-size:11px; color:hsl(215,20%,50%); margin-bottom:4px; font-weight:600;';
      label.appendChild(lText);

      let input;
      if (f.type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = 3;
        input.style.cssText = `
          width:100%; background:hsl(224,71%,8%); border:1px solid hsl(215,28%,20%);
          border-radius:5px; padding:8px 10px; color:hsl(0,0%,85%); font-size:12px;
          font-family:inherit; resize:vertical; outline:none;
        `;
      } else {
        input = document.createElement('input');
        input.type = 'text';
        input.style.cssText = `
          width:100%; background:hsl(224,71%,8%); border:1px solid hsl(215,28%,20%);
          border-radius:5px; padding:8px 10px; color:hsl(0,0%,85%); font-size:12px;
          font-family:inherit; outline:none; box-sizing:border-box;
        `;
      }
      input.placeholder = f.placeholder;
      input.value = data[f.key] || '';
      inputs[f.key] = input;
      label.appendChild(input);
      box.appendChild(label);
    });

    // Checkbox: show title page in print
    const showInPrint = document.createElement('label');
    showInPrint.style.cssText = 'display:flex; align-items:center; gap:8px; margin:16px 0 8px; cursor:pointer;';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = data.showInPrint !== false;
    checkbox.style.cssText = 'accent-color:hsl(43,96%,56%);';
    const checkLabel = document.createElement('span');
    checkLabel.textContent = 'Include title page when printing / exporting PDF';
    checkLabel.style.cssText = 'font-size:12px; color:hsl(215,20%,65%);';
    showInPrint.appendChild(checkbox);
    showInPrint.appendChild(checkLabel);
    box.appendChild(showInPrint);

    // Buttons
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex; gap:8px; margin-top:16px; justify-content:flex-end;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      padding:6px 16px; background:transparent; border:1px solid hsl(215,28%,25%);
      border-radius:5px; color:hsl(215,20%,60%); font-size:12px; cursor:pointer;
      font-family:inherit;
    `;
    cancelBtn.addEventListener('click', () => overlay.remove());

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save Title Page';
    saveBtn.style.cssText = `
      padding:6px 16px; background:hsl(43,96%,40%); border:none;
      border-radius:5px; color:#000; font-size:12px; font-weight:600; cursor:pointer;
      font-family:inherit;
    `;
    saveBtn.addEventListener('click', () => {
      const newData = {};
      Object.keys(inputs).forEach(k => { newData[k] = inputs[k].value; });
      newData.showInPrint = checkbox.checked;
      saveTitlePageData(newData);
      renderTitlePage(newData);
      overlay.remove();
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);
    box.appendChild(btnRow);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
    inputs.title.focus();
  }

  function renderTitlePage(data) {
    let tp = document.getElementById('sw-title-page');
    const editorArea = document.querySelector('.script-page');
    if (!editorArea) return;

    if (!tp) {
      tp = document.createElement('div');
      tp.id = 'sw-title-page';
      editorArea.parentNode.insertBefore(tp, editorArea);
    }

    if (!data || (!data.title && !data.author)) {
      tp.classList.remove('sw-visible');
      return;
    }

    tp.innerHTML = `
      ${data.title ? `<div class="sw-tp-title">${escapeHtml(data.title)}</div>` : ''}
      ${data.subtitle ? `<div class="sw-tp-byline" style="margin-top:0.5em;font-style:italic;">${escapeHtml(data.subtitle)}</div>` : ''}
      ${data.author ? `<div class="sw-tp-byline">Written by</div><div class="sw-tp-author">${escapeHtml(data.author)}</div>` : ''}
      ${data.basedOn ? `<div class="sw-tp-byline" style="margin-top:1em;font-size:10pt;">${escapeHtml(data.basedOn)}</div>` : ''}
      ${data.contact ? `<div class="sw-tp-contact">${escapeHtml(data.contact)}</div>` : ''}
      ${(data.draftDate || data.draftNumber) ? `<div class="sw-tp-draft">${escapeHtml(data.draftNumber || '')}${data.draftNumber && data.draftDate ? '<br>' : ''}${escapeHtml(data.draftDate || '')}</div>` : ''}
    `;

    tp.classList.toggle('sw-visible', data.showInPrint !== false);
  }

  // ══════════════════════════════════════════════════════════════════
  // 2. WATERMARK
  // ══════════════════════════════════════════════════════════════════

  function getWatermarkData() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.WATERMARK) || '{}');
    } catch { return {}; }
  }

  function showWatermarkDialog() {
    const existing = document.getElementById('sw-watermark-dialog');
    if (existing) { existing.remove(); return; }

    const data = getWatermarkData();

    const overlay = document.createElement('div');
    overlay.id = 'sw-watermark-dialog';
    overlay.style.cssText = `
      position:fixed; inset:0; z-index:10000; background:rgba(0,0,0,0.6);
      display:flex; align-items:center; justify-content:center;
      font-family:'Satoshi',system-ui,sans-serif;
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    const box = document.createElement('div');
    box.style.cssText = `
      background:hsl(224,71%,5%); border:1px solid hsl(215,28%,20%);
      border-radius:8px; padding:24px; width:360px; max-width:90vw;
      box-shadow:0 20px 60px rgba(0,0,0,0.5);
    `;

    box.innerHTML = `
      <h2 style="margin:0 0 16px; font-size:15px; color:hsl(0,0%,90%); font-weight:700;">Watermark</h2>
      <p style="margin:0 0 12px; font-size:11px; color:hsl(215,20%,50%);">
        Add a diagonal watermark to your screenplay for security when sharing drafts.
      </p>
    `;

    const enableLabel = document.createElement('label');
    enableLabel.style.cssText = 'display:flex; align-items:center; gap:8px; margin-bottom:12px; cursor:pointer;';
    const enableCheck = document.createElement('input');
    enableCheck.type = 'checkbox';
    enableCheck.checked = data.enabled || false;
    enableCheck.style.cssText = 'accent-color:hsl(43,96%,56%);';
    const enableText = document.createElement('span');
    enableText.textContent = 'Enable watermark';
    enableText.style.cssText = 'font-size:12px; color:hsl(215,20%,65%);';
    enableLabel.appendChild(enableCheck);
    enableLabel.appendChild(enableText);
    box.appendChild(enableLabel);

    const presets = ['DRAFT', 'CONFIDENTIAL', 'DO NOT COPY', 'FOR YOUR EYES ONLY'];
    const presetsRow = document.createElement('div');
    presetsRow.style.cssText = 'display:flex; flex-wrap:wrap; gap:4px; margin-bottom:12px;';
    presets.forEach(p => {
      const btn = document.createElement('button');
      btn.textContent = p;
      btn.style.cssText = `
        padding:3px 8px; background:hsl(224,71%,10%); border:1px solid hsl(215,28%,20%);
        border-radius:4px; color:hsl(215,20%,60%); font-size:10px; cursor:pointer;
        font-family:inherit; transition: background 100ms;
      `;
      btn.addEventListener('click', () => { textInput.value = p; });
      btn.addEventListener('mouseenter', () => { btn.style.background = 'hsl(215,28%,17%)'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = 'hsl(224,71%,10%)'; });
      presetsRow.appendChild(btn);
    });
    box.appendChild(presetsRow);

    const textLabel = document.createElement('label');
    textLabel.style.cssText = 'display:block; margin-bottom:16px;';
    const tLabelText = document.createElement('span');
    tLabelText.textContent = 'Custom text';
    tLabelText.style.cssText = 'display:block; font-size:11px; color:hsl(215,20%,50%); margin-bottom:4px; font-weight:600;';
    textLabel.appendChild(tLabelText);
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.value = data.text || 'DRAFT';
    textInput.maxLength = 30;
    textInput.style.cssText = `
      width:100%; background:hsl(224,71%,8%); border:1px solid hsl(215,28%,20%);
      border-radius:5px; padding:8px 10px; color:hsl(0,0%,85%); font-size:12px;
      font-family:inherit; outline:none; box-sizing:border-box;
    `;
    textLabel.appendChild(textInput);
    box.appendChild(textLabel);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex; gap:8px; justify-content:flex-end;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `padding:6px 16px; background:transparent; border:1px solid hsl(215,28%,25%); border-radius:5px; color:hsl(215,20%,60%); font-size:12px; cursor:pointer; font-family:inherit;`;
    cancelBtn.addEventListener('click', () => overlay.remove());

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Apply';
    saveBtn.style.cssText = `padding:6px 16px; background:hsl(43,96%,40%); border:none; border-radius:5px; color:#000; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit;`;
    saveBtn.addEventListener('click', () => {
      const wm = { enabled: enableCheck.checked, text: textInput.value || 'DRAFT' };
      localStorage.setItem(STORAGE.WATERMARK, JSON.stringify(wm));
      applyWatermark(wm);
      overlay.remove();
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);
    box.appendChild(btnRow);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  function applyWatermark(data) {
    const body = document.body;
    const pages = document.querySelectorAll('.script-page');
    if (data && data.enabled) {
      body.classList.add('sw-watermark-active');
      pages.forEach(p => p.setAttribute('data-watermark', data.text || 'DRAFT'));
    } else {
      body.classList.remove('sw-watermark-active');
      pages.forEach(p => p.removeAttribute('data-watermark'));
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // 3. LOCK SCREENPLAY
  // ══════════════════════════════════════════════════════════════════

  let scriptLocked = false;

  function toggleLockScript() {
    scriptLocked = !scriptLocked;
    const editables = document.querySelectorAll('[contenteditable]');
    editables.forEach(el => {
      el.setAttribute('contenteditable', scriptLocked ? 'false' : 'true');
    });
    document.body.classList.toggle('sw-script-locked', scriptLocked);

    // Show/hide lock banner
    let banner = document.getElementById('sw-lock-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'sw-lock-banner';
      banner.innerHTML = '🔒 Script is locked — <button id="sw-unlock-btn" style="background:none;border:none;color:inherit;text-decoration:underline;cursor:pointer;font:inherit;padding:0;">Click to unlock</button>';
      const wrapper = document.getElementById('sw-menubar-wrapper');
      const menubar = document.getElementById('sw-menubar');
      if (wrapper && menubar) {
        wrapper.insertBefore(banner, menubar.nextSibling);
      }
      document.getElementById('sw-unlock-btn')?.addEventListener('click', toggleLockScript);
    }

    // Update menu item label
    const lockItem = document.getElementById('sw-menu-lock-script');
    if (lockItem) {
      const lbl = lockItem.querySelector('.sw-item-label');
      if (lbl) lbl.textContent = scriptLocked ? 'Unlock Screenplay' : 'Lock Screenplay';
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // 4. AUTO-SAVE STATUS
  // ══════════════════════════════════════════════════════════════════

  let lastSaveTime = null;

  function updateAutoSaveStatus() {
    let el = document.getElementById('sw-autosave-status');
    if (!el) {
      const toolbar = document.querySelector('[data-testid="top-toolbar"]');
      if (!toolbar) return;
      el = document.createElement('span');
      el.id = 'sw-autosave-status';
      // Insert before the right-side group
      const rightGroup = toolbar.querySelector('.ml-auto');
      if (rightGroup) {
        rightGroup.insertBefore(el, rightGroup.firstChild);
      } else {
        toolbar.appendChild(el);
      }
    }

    if (lastSaveTime) {
      const ago = Math.round((Date.now() - lastSaveTime) / 1000);
      if (ago < 5) {
        el.textContent = '✓ Saved';
        el.style.color = '#4ade80';
      } else if (ago < 60) {
        el.textContent = `Saved ${ago}s ago`;
        el.style.color = 'hsl(215,20%,40%)';
      } else {
        const mins = Math.round(ago / 60);
        el.textContent = `Saved ${mins}m ago`;
        el.style.color = 'hsl(215,20%,40%)';
      }
    }
  }

  function detectAutoSave() {
    // Watch for the app's auto-save activity by observing localStorage changes
    // and input events in the editor
    const editor = document.querySelector('.script-page, [data-testid="screenplay-editor"]');
    if (!editor || editor._swAutoSaveWatcher) return;
    editor._swAutoSaveWatcher = true;

    let saveTimer = null;
    editor.addEventListener('input', () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        lastSaveTime = Date.now();
        updateAutoSaveStatus();
        takeRevisionSnapshot();
      }, 2000);
    }, true);

    // Initial status
    lastSaveTime = Date.now();
    updateAutoSaveStatus();

    // Update the display every 10s
    setInterval(updateAutoSaveStatus, 10000);
  }

  // ══════════════════════════════════════════════════════════════════
  // 5. REVISION HISTORY
  // ══════════════════════════════════════════════════════════════════

  const MAX_REVISIONS = 25;
  let lastSnapshotContent = '';

  function getRevisions() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.REVISIONS) || '[]');
    } catch { return []; }
  }

  function takeRevisionSnapshot() {
    const editor = document.querySelector('.script-page, [data-testid="screenplay-editor"]');
    if (!editor) return;

    const content = editor.innerText || '';
    // Only save if content changed significantly (>20 chars diff)
    if (Math.abs(content.length - lastSnapshotContent.length) < 20 && content === lastSnapshotContent) return;
    lastSnapshotContent = content;

    const revisions = getRevisions();
    const now = Date.now();

    // Don't save more than one revision per 2 minutes
    if (revisions.length > 0 && (now - revisions[0].timestamp) < 120000) return;

    const html = editor.innerHTML;
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

    revisions.unshift({
      timestamp: now,
      wordCount,
      preview: content.slice(0, 120).replace(/\n/g, ' '),
      html,
    });

    // Keep only last N revisions
    if (revisions.length > MAX_REVISIONS) revisions.length = MAX_REVISIONS;

    try {
      localStorage.setItem(STORAGE.REVISIONS, JSON.stringify(revisions));
    } catch (e) {
      // localStorage full — prune old revisions
      revisions.length = Math.floor(revisions.length / 2);
      try { localStorage.setItem(STORAGE.REVISIONS, JSON.stringify(revisions)); } catch {}
    }
  }

  function showRevisionHistory() {
    const existing = document.getElementById('sw-revision-dialog');
    if (existing) { existing.remove(); return; }

    const revisions = getRevisions();

    const overlay = document.createElement('div');
    overlay.id = 'sw-revision-dialog';
    overlay.style.cssText = `
      position:fixed; inset:0; z-index:10000; background:rgba(0,0,0,0.6);
      display:flex; align-items:center; justify-content:center;
      font-family:'Satoshi',system-ui,sans-serif;
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    const box = document.createElement('div');
    box.style.cssText = `
      background:hsl(224,71%,5%); border:1px solid hsl(215,28%,20%);
      border-radius:8px; padding:24px; width:480px; max-width:90vw;
      max-height:80vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,0.5);
    `;

    const title = document.createElement('h2');
    title.textContent = 'Revision History';
    title.style.cssText = 'margin:0 0 4px; font-size:15px; color:hsl(0,0%,90%); font-weight:700;';
    box.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.textContent = `${revisions.length} revision${revisions.length !== 1 ? 's' : ''} saved locally`;
    subtitle.style.cssText = 'margin:0 0 16px; font-size:11px; color:hsl(215,20%,45%);';
    box.appendChild(subtitle);

    if (revisions.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No revisions yet. Revisions are saved automatically as you write.';
      empty.style.cssText = 'font-size:12px; color:hsl(215,20%,50%); margin:20px 0;';
      box.appendChild(empty);
    } else {
      revisions.forEach((rev, i) => {
        const row = document.createElement('div');
        row.style.cssText = `
          padding:10px 12px; border:1px solid hsl(215,28%,15%); border-radius:6px;
          margin-bottom:8px; cursor:pointer; transition:background 100ms;
        `;
        row.addEventListener('mouseenter', () => { row.style.background = 'hsl(224,71%,8%)'; });
        row.addEventListener('mouseleave', () => { row.style.background = ''; });

        const date = new Date(rev.timestamp);
        const timeStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
                        ' at ' + date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

        row.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-size:12px; color:hsl(0,0%,85%); font-weight:600;">${timeStr}</span>
            <span style="font-size:10px; color:hsl(215,20%,45%);">${rev.wordCount} words</span>
          </div>
          <div style="font-size:11px; color:hsl(215,20%,55%); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${escapeHtml(rev.preview)}
          </div>
        `;

        row.addEventListener('click', () => {
          if (confirm('Restore this revision? Your current work will be replaced.')) {
            const editor = document.querySelector('.script-page, [data-testid="screenplay-editor"]');
            if (editor && rev.html) {
              editor.innerHTML = rev.html;
              // Trigger input event so the app picks up the change
              editor.dispatchEvent(new Event('input', { bubbles: true }));
              overlay.remove();
            }
          }
        });

        box.appendChild(row);
      });
    }

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
      margin-top:12px; padding:6px 20px; background:hsl(43,96%,40%);
      color:#000; border:none; border-radius:5px; font-size:12px;
      font-weight:600; cursor:pointer; font-family:inherit;
    `;
    closeBtn.addEventListener('click', () => overlay.remove());
    box.appendChild(closeBtn);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  // ══════════════════════════════════════════════════════════════════
  // 6. SCENE NUMBERING TOGGLE
  // ══════════════════════════════════════════════════════════════════

  let sceneNumbersVisible = true;

  function toggleSceneNumbers() {
    sceneNumbersVisible = !sceneNumbersVisible;
    const sceneNumbers = document.querySelectorAll('.scene-number, [data-testid="scene-number"], .page-number');
    sceneNumbers.forEach(sn => {
      sn.style.display = sceneNumbersVisible ? '' : 'none';
    });

    // Update menu item
    const menuItem = document.getElementById('sw-menu-scene-numbers');
    if (menuItem) {
      const icon = menuItem.querySelector('.sw-item-icon');
      if (icon) icon.textContent = sceneNumbersVisible ? '✓' : '';
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // 7. HEADER & FOOTER FOR PRINT
  // ══════════════════════════════════════════════════════════════════

  function showHeaderFooterDialog() {
    const existing = document.getElementById('sw-headerfooter-dialog');
    if (existing) { existing.remove(); return; }

    let data;
    try { data = JSON.parse(localStorage.getItem(STORAGE.HEADER_FOOTER) || '{}'); } catch { data = {}; }

    const overlay = document.createElement('div');
    overlay.id = 'sw-headerfooter-dialog';
    overlay.style.cssText = `
      position:fixed; inset:0; z-index:10000; background:rgba(0,0,0,0.6);
      display:flex; align-items:center; justify-content:center;
      font-family:'Satoshi',system-ui,sans-serif;
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    const box = document.createElement('div');
    box.style.cssText = `
      background:hsl(224,71%,5%); border:1px solid hsl(215,28%,20%);
      border-radius:8px; padding:24px; width:380px; max-width:90vw;
      box-shadow:0 20px 60px rgba(0,0,0,0.5);
    `;

    box.innerHTML = `
      <h2 style="margin:0 0 16px; font-size:15px; color:hsl(0,0%,90%); font-weight:700;">Header & Footer</h2>
      <p style="margin:0 0 12px; font-size:11px; color:hsl(215,20%,50%);">
        Customize the header and footer that appear when printing or exporting to PDF.
      </p>
    `;

    function makeField(label, key) {
      const wrap = document.createElement('label');
      wrap.style.cssText = 'display:block; margin-bottom:12px;';
      const lbl = document.createElement('span');
      lbl.textContent = label;
      lbl.style.cssText = 'display:block; font-size:11px; color:hsl(215,20%,50%); margin-bottom:4px; font-weight:600;';
      wrap.appendChild(lbl);
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.value = data[key] || '';
      inp.placeholder = key === 'header' ? 'e.g., CONFIDENTIAL — Draft 2' : 'e.g., © 2026 Author Name';
      inp.style.cssText = `
        width:100%; background:hsl(224,71%,8%); border:1px solid hsl(215,28%,20%);
        border-radius:5px; padding:8px 10px; color:hsl(0,0%,85%); font-size:12px;
        font-family:inherit; outline:none; box-sizing:border-box;
      `;
      wrap.appendChild(inp);
      box.appendChild(wrap);
      return inp;
    }

    const headerInput = makeField('Header Text', 'header');
    const footerInput = makeField('Footer Text', 'footer');

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex; gap:8px; justify-content:flex-end; margin-top:16px;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `padding:6px 16px; background:transparent; border:1px solid hsl(215,28%,25%); border-radius:5px; color:hsl(215,20%,60%); font-size:12px; cursor:pointer; font-family:inherit;`;
    cancelBtn.addEventListener('click', () => overlay.remove());

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.style.cssText = `padding:6px 16px; background:hsl(43,96%,40%); border:none; border-radius:5px; color:#000; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit;`;
    saveBtn.addEventListener('click', () => {
      const hf = { header: headerInput.value, footer: footerInput.value };
      localStorage.setItem(STORAGE.HEADER_FOOTER, JSON.stringify(hf));
      applyHeaderFooter(hf);
      overlay.remove();
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);
    box.appendChild(btnRow);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  function applyHeaderFooter(data) {
    let header = document.querySelector('.sw-print-header');
    let footer = document.querySelector('.sw-print-footer');

    if (data.header) {
      if (!header) {
        header = document.createElement('div');
        header.className = 'sw-print-header';
        document.body.appendChild(header);
      }
      header.textContent = data.header;
    } else if (header) {
      header.remove();
    }

    if (data.footer) {
      if (!footer) {
        footer = document.createElement('div');
        footer.className = 'sw-print-footer';
        document.body.appendChild(footer);
      }
      footer.textContent = data.footer;
    } else if (footer) {
      footer.remove();
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════════════

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ══════════════════════════════════════════════════════════════════
  // EXPOSE API for menu bar integration
  // ══════════════════════════════════════════════════════════════════

  window.swStudioFeatures = {
    showTitlePageDialog,
    showWatermarkDialog,
    toggleLockScript,
    showRevisionHistory,
    toggleSceneNumbers,
    showHeaderFooterDialog,
    isLocked: () => scriptLocked,
  };

  // ══════════════════════════════════════════════════════════════════
  // BOOTSTRAP
  // ══════════════════════════════════════════════════════════════════

  function boot() {
    // Restore watermark state
    const wmData = getWatermarkData();
    if (wmData.enabled) applyWatermark(wmData);

    // Restore header/footer
    try {
      const hf = JSON.parse(localStorage.getItem(STORAGE.HEADER_FOOTER) || '{}');
      applyHeaderFooter(hf);
    } catch {}

    // Restore title page
    const tpData = getTitlePageData();
    if (tpData.title || tpData.author) renderTitlePage(tpData);

    // Set up auto-save detection (retry until editor is available)
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      detectAutoSave();
      if (attempts > 60) clearInterval(interval);
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 500));
  } else {
    setTimeout(boot, 500);
  }

})();
