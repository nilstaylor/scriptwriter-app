/**
 * Scriptwriter — Menu Bar Enhancement
 * Injects a native-style menu bar above the existing toolbar.
 * Communicates with the app via DOM events and querySelector.
 */
(function () {
  'use strict';

  // ── Helpers ──────────────────────────────────────────────────────

  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const mod = isMac ? '⌘' : 'Ctrl';
  const opt = isMac ? '⌥' : 'Alt';
  const shift = '⇧';

  function shortcut(keys) {
    return keys
      .replace(/Cmd|Ctrl/g, mod)
      .replace(/Opt|Alt/g, opt)
      .replace(/Shift/g, shift);
  }

  // Simulate keyboard shortcut events into the focused editor
  function triggerKey(key, modifiers = {}) {
    const target = document.activeElement || document.body;
    const opts = {
      key,
      code: `Key${key.toUpperCase()}`,
      bubbles: true,
      cancelable: true,
      metaKey: modifiers.meta || false,
      ctrlKey: modifiers.ctrl || false,
      shiftKey: modifiers.shift || false,
      altKey: modifiers.alt || false,
    };
    target.dispatchEvent(new KeyboardEvent('keydown', opts));
    target.dispatchEvent(new KeyboardEvent('keyup', opts));
  }

  function clickTestId(testId) {
    const el = document.querySelector(`[data-testid="${testId}"]`);
    if (el) el.click();
  }

  // ── Fullscreen toggle ────────────────────────────────────────────

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  function isFullscreen() {
    return !!document.fullscreenElement;
  }

  function focusEditor() {
    const editor = document.querySelector('[data-testid="screenplay-editor"], .screenplay-editor, [contenteditable="true"]');
    if (editor) editor.focus();
  }

  // ── Menu Structure ───────────────────────────────────────────────

  const MENUS = [
    {
      id: 'file',
      label: 'File',
      items: [
        {
          label: 'New Screenplay',
          shortcut: shortcut('Cmd+N'),
          icon: '📄',
          action: () => clickTestId('back-btn'),
        },
        {
          label: 'Open FDX…',
          shortcut: shortcut('Cmd+O'),
          icon: '📂',
          action: () => clickTestId('open-fdx-btn') || document.querySelector('[data-testid="open-fdx-btn"], button[title*="Open FDX"], button[title*="Import"]')?.click(),
        },
        { type: 'separator' },
        {
          label: 'Save',
          shortcut: shortcut('Cmd+S'),
          icon: '💾',
          action: () => {
            focusEditor();
            triggerKey('s', isMac ? { meta: true } : { ctrl: true });
          },
        },
        { type: 'separator' },
        {
          label: 'Export as FDX…',
          shortcut: shortcut('Cmd+Shift+E'),
          icon: '⬆️',
          action: () => {
            // Click the Export FDX button in toolbar (look for text content)
            const toolbar = document.querySelector('[data-testid="top-toolbar"]') || document.body;
            const btns = [...toolbar.querySelectorAll('button')];
            const fdx = btns.find(b => b.textContent.trim().includes('Export') && (b.textContent.includes('FDX') || b.title?.includes('FDX')));
            if (fdx) fdx.click();
            else triggerKey('e', isMac ? { meta: true, shift: true } : { ctrl: true, shift: true });
          },
        },
        {
          label: 'Export as PDF…',
          shortcut: shortcut('Cmd+Shift+P'),
          icon: '🖨️',
          action: () => {
            const toolbar2 = document.querySelector('[data-testid="top-toolbar"]') || document.body;
            const btns2 = [...toolbar2.querySelectorAll('button')];
            const pdf = btns2.find(b => (b.textContent.trim().includes('Export') || b.textContent.trim() === 'PDF') && (b.textContent.includes('PDF') || b.title?.includes('PDF')));
            if (pdf) pdf.click();
            else triggerKey('p', isMac ? { meta: true, shift: true } : { ctrl: true, shift: true });
          },
        },
        { type: 'separator' },
        {
          label: 'Title Page…',
          icon: '🏷️',
          action: () => {
            const titleEl = document.querySelector('[data-testid="script-title"]');
            if (titleEl) titleEl.click();
          },
        },
        { type: 'separator' },
        {
          label: 'Print…',
          shortcut: shortcut('Cmd+P'),
          icon: '🖨️',
          action: () => window.print(),
        },
      ],
    },
    {
      id: 'edit',
      label: 'Edit',
      items: [
        {
          label: 'Undo',
          shortcut: shortcut('Cmd+Z'),
          icon: '↩',
          action: () => {
            focusEditor();
            document.execCommand('undo');
          },
        },
        {
          label: 'Redo',
          shortcut: shortcut('Cmd+Shift+Z'),
          icon: '↪',
          action: () => {
            focusEditor();
            document.execCommand('redo');
          },
        },
        { type: 'separator' },
        {
          label: 'Cut',
          shortcut: shortcut('Cmd+X'),
          icon: '✂️',
          action: () => { focusEditor(); document.execCommand('cut'); },
        },
        {
          label: 'Copy',
          shortcut: shortcut('Cmd+C'),
          icon: '📋',
          action: () => { focusEditor(); document.execCommand('copy'); },
        },
        {
          label: 'Paste',
          shortcut: shortcut('Cmd+V'),
          icon: '📌',
          action: () => { focusEditor(); document.execCommand('paste'); },
        },
        {
          label: 'Select All',
          shortcut: shortcut('Cmd+A'),
          action: () => { focusEditor(); document.execCommand('selectAll'); },
        },
        { type: 'separator' },
        {
          label: 'Find & Replace…',
          shortcut: shortcut('Cmd+F'),
          icon: '🔍',
          action: () => clickTestId('find-btn'),
        },
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: [
        {
          label: 'Toggle Left Panel',
          shortcut: shortcut('Cmd+['),
          icon: '◧',
          action: () => clickTestId('toggle-left-panel'),
        },
        {
          label: 'Toggle Right Panel',
          shortcut: shortcut('Cmd+]'),
          icon: '◨',
          action: () => clickTestId('toggle-right-panel'),
        },
        { type: 'separator' },
        {
          label: 'Enter Full Screen',
          shortcut: 'F11',
          icon: '⛶',
          id: 'sw-menu-fullscreen',
          action: () => toggleFullscreen(),
        },
        {
          label: 'Distraction-Free Mode',
          shortcut: shortcut('Cmd+Shift+F'),
          icon: '▭',
          action: () => clickTestId('distraction-free-btn'),
        },
        { type: 'separator' },
        {
          label: 'Zoom In',
          shortcut: shortcut('Cmd+='),
          icon: '＋',
          action: () => clickTestId('zoom-in'),
        },
        {
          label: 'Zoom Out',
          shortcut: shortcut('Cmd+-'),
          icon: '－',
          action: () => clickTestId('zoom-out'),
        },
        { type: 'separator' },
        {
          label: 'Dark / Light Mode',
          shortcut: shortcut('Cmd+Shift+D'),
          icon: '◑',
          action: () => clickTestId('dark-mode-btn'),
        },
        { type: 'separator' },
        {
          label: 'Script Summary',
          icon: '📊',
          action: () => {
            // Navigate to summary panel if available
            const btns = [...document.querySelectorAll('button')];
            const summary = btns.find(b => b.textContent.trim() === 'Script Summary' || b.textContent.includes('Summary'));
            if (summary) summary.click();
          },
        },
      ],
    },
    {
      id: 'script',
      label: 'Script',
      items: [
        { type: 'label', label: 'Element Type' },
        {
          label: 'Scene Heading',
          shortcut: '1',
          action: () => { focusEditor(); triggerKey('1'); },
        },
        {
          label: 'Action',
          shortcut: '2',
          action: () => { focusEditor(); triggerKey('2'); },
        },
        {
          label: 'Character Name',
          shortcut: '3',
          action: () => { focusEditor(); triggerKey('3'); },
        },
        {
          label: 'Parenthetical',
          shortcut: '4',
          action: () => { focusEditor(); triggerKey('4'); },
        },
        {
          label: 'Dialogue',
          shortcut: '5',
          action: () => { focusEditor(); triggerKey('5'); },
        },
        {
          label: 'Transition',
          shortcut: '6',
          action: () => { focusEditor(); triggerKey('6'); },
        },
        {
          label: 'General / Note',
          shortcut: '7',
          action: () => { focusEditor(); triggerKey('7'); },
        },
        { type: 'separator' },
        { type: 'label', label: 'Navigation' },
        {
          label: 'Scenes Panel',
          icon: '🎬',
          action: () => {
            const btns = [...document.querySelectorAll('button, [role="button"]')];
            const scenes = btns.find(b => b.textContent.trim() === 'Scenes');
            if (scenes) scenes.click();
          },
        },
        {
          label: 'Characters Panel',
          icon: '👤',
          action: () => {
            const btns = [...document.querySelectorAll('button, [role="button"]')];
            const chars = btns.find(b => b.textContent.trim() === 'Characters');
            if (chars) chars.click();
          },
        },
        { type: 'separator' },
        {
          label: 'Script Analysis',
          icon: '📈',
          action: () => {
            const btns = [...document.querySelectorAll('button')];
            const analysis = btns.find(b => b.textContent.includes('Analysis') || b.textContent.includes('Summary'));
            if (analysis) analysis.click();
          },
        },
      ],
    },
    {
      id: 'format',
      label: 'Format',
      items: [
        { type: 'label', label: 'Scene Heading Prefix' },
        {
          label: 'INT.',
          action: () => insertAtCursor('INT. '),
        },
        {
          label: 'EXT.',
          action: () => insertAtCursor('EXT. '),
        },
        {
          label: 'INT./EXT.',
          action: () => insertAtCursor('INT./EXT. '),
        },
        { type: 'separator' },
        { type: 'label', label: 'Time of Day' },
        { label: 'DAY', action: () => insertAtCursor(' - DAY') },
        { label: 'NIGHT', action: () => insertAtCursor(' - NIGHT') },
        { label: 'DUSK', action: () => insertAtCursor(' - DUSK') },
        { label: 'DAWN', action: () => insertAtCursor(' - DAWN') },
        { label: 'CONTINUOUS', action: () => insertAtCursor(' - CONTINUOUS') },
        { label: 'LATER', action: () => insertAtCursor(' - LATER') },
        { type: 'separator' },
        { type: 'label', label: 'Transitions' },
        { label: 'CUT TO:', action: () => insertAtCursor('CUT TO:') },
        { label: 'SMASH CUT TO:', action: () => insertAtCursor('SMASH CUT TO:') },
        { label: 'MATCH CUT TO:', action: () => insertAtCursor('MATCH CUT TO:') },
        { label: 'DISSOLVE TO:', action: () => insertAtCursor('DISSOLVE TO:') },
        { label: 'FADE IN:', action: () => insertAtCursor('FADE IN:') },
        { label: 'FADE OUT.', action: () => insertAtCursor('FADE OUT.') },
        { label: 'FADE TO BLACK.', action: () => insertAtCursor('FADE TO BLACK.') },
        { type: 'separator' },
        { type: 'label', label: 'Intercut' },
        { label: 'INTERCUT WITH:', action: () => insertAtCursor('INTERCUT WITH:') },
        { label: 'BACK TO:', action: () => insertAtCursor('BACK TO:') },
        { label: '(CONT\'D)', action: () => insertAtCursor("(CONT'D)") },
        { label: '(V.O.)', action: () => insertAtCursor('(V.O.)') },
        { label: '(O.S.)', action: () => insertAtCursor('(O.S.)') },
        { label: '(O.C.)', action: () => insertAtCursor('(O.C.)') },
      ],
    },
    {
      id: 'window',
      label: 'Window',
      items: [
        {
          label: 'Scratch Pad / Notes',
          shortcut: shortcut('Cmd+Shift+N'),
          icon: '📝',
          action: () => {
            // Ensure right panel is open and switch to notes tab
            const rightPanelToggle = document.querySelector('[data-testid="toggle-right-panel"]');
            const rightPanel = document.querySelector('[data-testid="right-panel"]');
            if (rightPanel && rightPanel.offsetWidth < 10) {
              rightPanelToggle?.click();
            }
            setTimeout(() => {
              const noteTab = document.getElementById('sw-scratchpad-tab-btn');
              if (noteTab) noteTab.click();
            }, 150);
          },
        },
        {
          label: 'Writing Guidance',
          icon: '💡',
          action: () => {
            clickTestId('toggle-right-panel');
            setTimeout(() => {
              const tabs = [...document.querySelectorAll('[role="tab"]')];
              const guidance = tabs.find(t => t.textContent.includes('Guidance'));
              if (guidance) guidance.click();
            }, 150);
          },
        },
        {
          label: 'Characters',
          icon: '👤',
          action: () => {
            clickTestId('toggle-right-panel');
            setTimeout(() => {
              const tabs = [...document.querySelectorAll('[role="tab"]')];
              const chars = tabs.find(t => t.textContent.includes('Characters'));
              if (chars) chars.click();
            }, 150);
          },
        },
      ],
    },
    {
      id: 'help',
      label: 'Help',
      items: [
        {
          label: 'Keyboard Shortcuts',
          icon: '⌨️',
          action: () => showShortcutsDialog(),
        },
        {
          label: 'Industry Format Guide',
          icon: '📖',
          action: () => {
            window.open('https://www.finaldraft.com/learn/how-to-write-a-screenplay/', '_blank');
          },
        },
        {
          label: 'Screenwriting Tips',
          icon: '✏️',
          action: () => {
            window.open('https://www.masterclass.com/articles/screenwriting-tips', '_blank');
          },
        },
        { type: 'separator' },
        {
          label: 'Watch Tutorial (68 sec)',
          icon: '▶️',
          action: () => {
            const videoArea = document.querySelector('[data-testid="tutorial-video"], video');
            if (videoArea) videoArea.scrollIntoView({ behavior: 'smooth' });
            else window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          },
        },
        { type: 'separator' },
        {
          label: 'About Scriptwriter',
          icon: 'ℹ️',
          action: () => showAboutDialog(),
        },
      ],
    },
  ];

  // ── Insert at Cursor (for format menu items) ─────────────────────

  function insertAtCursor(text) {
    focusEditor();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const node = document.createTextNode(text);
      range.insertNode(node);
      range.setStartAfter(node);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      document.execCommand('insertText', false, text);
    }
  }

  // ── Build DOM ─────────────────────────────────────────────────────

  let activeMenu = null;

  function closeAll() {
    document.querySelectorAll('.sw-dropdown').forEach(d => {
      d.classList.remove('sw-open');
    });
    document.querySelectorAll('.sw-menu-trigger').forEach(t => {
      t.setAttribute('aria-expanded', 'false');
    });
    document.getElementById('sw-menu-backdrop')?.classList.remove('sw-active');
    activeMenu = null;
  }

  function openMenu(menuId, triggerEl) {
    if (activeMenu === menuId) { closeAll(); return; }
    closeAll();
    activeMenu = menuId;
    triggerEl.setAttribute('aria-expanded', 'true');
    const dropdown = document.getElementById(`sw-dropdown-${menuId}`);
    if (!dropdown) return;

    // Position relative to trigger
    const rect = triggerEl.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + 2}px`;
    dropdown.style.left = `${rect.left}px`;

    // Prevent overflow off right edge
    dropdown.classList.add('sw-open');
    const dRect = dropdown.getBoundingClientRect();
    if (dRect.right > window.innerWidth - 8) {
      dropdown.style.left = `${window.innerWidth - dRect.width - 8}px`;
    }
    document.getElementById('sw-menu-backdrop')?.classList.add('sw-active');
  }

  function buildMenuBar() {
    const bar = document.createElement('div');
    bar.id = 'sw-menubar';
    bar.setAttribute('role', 'menubar');
    bar.setAttribute('aria-label', 'Application menu');

    const backdrop = document.createElement('div');
    backdrop.id = 'sw-menu-backdrop';
    backdrop.addEventListener('click', closeAll);
    document.body.appendChild(backdrop);

    MENUS.forEach(menu => {
      // Trigger button
      const trigger = document.createElement('button');
      trigger.className = 'sw-menu-trigger';
      trigger.setAttribute('role', 'menuitem');
      trigger.setAttribute('aria-haspopup', 'true');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-controls', `sw-dropdown-${menu.id}`);
      trigger.textContent = menu.label;
      trigger.addEventListener('click', () => openMenu(menu.id, trigger));
      trigger.addEventListener('mouseenter', () => {
        if (activeMenu && activeMenu !== menu.id) openMenu(menu.id, trigger);
      });
      bar.appendChild(trigger);

      // Dropdown panel
      const dropdown = document.createElement('div');
      dropdown.id = `sw-dropdown-${menu.id}`;
      dropdown.className = 'sw-dropdown';
      dropdown.setAttribute('role', 'menu');

      menu.items.forEach(item => {
        if (item.type === 'separator') {
          const sep = document.createElement('div');
          sep.className = 'sw-menu-separator';
          sep.setAttribute('role', 'separator');
          dropdown.appendChild(sep);
        } else if (item.type === 'label') {
          const lbl = document.createElement('div');
          lbl.className = 'sw-menu-label';
          lbl.textContent = item.label;
          dropdown.appendChild(lbl);
        } else {
          const btn = document.createElement('button');
          btn.className = 'sw-menu-item';
          if (item.id) btn.id = item.id;
          btn.setAttribute('role', 'menuitem');
          if (item.disabled) btn.classList.add('sw-disabled');

          if (item.icon) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'sw-item-icon';
            iconSpan.setAttribute('aria-hidden', 'true');
            iconSpan.textContent = item.icon;
            btn.appendChild(iconSpan);
          }

          const labelSpan = document.createElement('span');
          labelSpan.className = 'sw-item-label';
          labelSpan.textContent = item.label;
          btn.appendChild(labelSpan);

          if (item.shortcut) {
            const kbdSpan = document.createElement('span');
            kbdSpan.className = 'sw-item-shortcut';
            kbdSpan.textContent = item.shortcut;
            btn.appendChild(kbdSpan);
          }

          btn.addEventListener('click', () => {
            closeAll();
            setTimeout(() => { if (item.action) item.action(); }, 50);
          });
          dropdown.appendChild(btn);
        }
      });

      document.body.appendChild(dropdown);
    });

    // Close on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && activeMenu) { closeAll(); e.stopPropagation(); }
    });

    return bar;
  }

  // ── Keyboard Shortcuts Dialog ─────────────────────────────────────

  function showShortcutsDialog() {
    const existing = document.getElementById('sw-shortcuts-dialog');
    if (existing) { existing.remove(); return; }

    const shortcuts = [
      ['New Screenplay', `${mod}+N`],
      ['Open FDX', `${mod}+O`],
      ['Save', `${mod}+S`],
      ['Export FDX', `${mod}+⇧+E`],
      ['Export PDF', `${mod}+⇧+P`],
      ['Find & Replace', `${mod}+F`],
      ['Toggle Left Panel', `${mod}+[`],
      ['Toggle Right Panel', `${mod}+]`],
      ['Full Screen', 'F11'],
      ['Distraction-Free', `${mod}+⇧+F`],
      ['Dark / Light Mode', `${mod}+⇧+D`],
      ['Scratch Pad', `${mod}+⇧+N`],
      ['Zoom In', `${mod}+=`],
      ['Zoom Out', `${mod}+-`],
      ['Scene Heading', 'Tab → 1'],
      ['Action', 'Tab → 2'],
      ['Character', 'Tab → 3'],
      ['Dialogue', 'Tab → 5'],
      ['Transition', 'Tab → 6'],
    ];

    const overlay = document.createElement('div');
    overlay.id = 'sw-shortcuts-dialog';
    overlay.style.cssText = `
      position:fixed; inset:0; z-index:10000; background:rgba(0,0,0,0.6);
      display:flex; align-items:center; justify-content:center;
      font-family:'Satoshi',system-ui,sans-serif;
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    const box = document.createElement('div');
    box.style.cssText = `
      background:hsl(224,71%,5%); border:1px solid hsl(215,28%,20%);
      border-radius:8px; padding:24px; min-width:380px; max-width:460px;
      max-height:80vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,0.5);
    `;

    const title = document.createElement('h2');
    title.textContent = 'Keyboard Shortcuts';
    title.style.cssText = 'margin:0 0 16px; font-size:15px; color:hsl(0,0%,90%); font-weight:700;';
    box.appendChild(title);

    shortcuts.forEach(([label, keys]) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid hsl(215,28%,13%);';

      const l = document.createElement('span');
      l.textContent = label;
      l.style.cssText = 'font-size:12.5px; color:hsl(215,20%,65%);';

      const k = document.createElement('kbd');
      k.textContent = keys;
      k.style.cssText = `
        font-size:11px; color:hsl(43,96%,56%); background:hsl(215,28%,12%);
        border:1px solid hsl(215,28%,22%); border-radius:4px; padding:2px 7px;
        font-family:'Satoshi',monospace;
      `;

      row.appendChild(l);
      row.appendChild(k);
      box.appendChild(row);
    });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
      margin-top:16px; padding:6px 20px; background:hsl(43,96%,40%);
      color:#000; border:none; border-radius:5px; font-size:12px;
      font-weight:600; cursor:pointer; font-family:'Satoshi',system-ui,sans-serif;
    `;
    closeBtn.addEventListener('click', () => overlay.remove());
    box.appendChild(closeBtn);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  // ── About Dialog ──────────────────────────────────────────────────

  function showAboutDialog() {
    const existing = document.getElementById('sw-about-dialog');
    if (existing) { existing.remove(); return; }

    const overlay = document.createElement('div');
    overlay.id = 'sw-about-dialog';
    overlay.style.cssText = `
      position:fixed; inset:0; z-index:10000; background:rgba(0,0,0,0.6);
      display:flex; align-items:center; justify-content:center;
      font-family:'Satoshi',system-ui,sans-serif;
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    const box = document.createElement('div');
    box.style.cssText = `
      background:hsl(224,71%,5%); border:1px solid hsl(215,28%,20%);
      border-radius:8px; padding:28px 32px; min-width:300px; text-align:center;
      box-shadow:0 20px 60px rgba(0,0,0,0.5);
    `;

    box.innerHTML = `
      <div style="font-size:32px; margin-bottom:12px;">📝</div>
      <h2 style="margin:0 0 6px; font-size:16px; color:hsl(0,0%,90%); font-weight:700;">Scriptwriter</h2>
      <p style="margin:0 0 4px; font-size:12px; color:hsl(43,96%,56%);">Professional Screenplay Editor</p>
      <p style="margin:0 0 16px; font-size:11px; color:hsl(215,20%,40%);">Browser-based · No install required · FDX & PDF export</p>
      <p style="margin:0; font-size:11px; color:hsl(215,20%,35%);">Industry-standard formatting · Real-time autosave</p>
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
      margin-top:20px; padding:6px 20px; background:hsl(43,96%,40%);
      color:#000; border:none; border-radius:5px; font-size:12px;
      font-weight:600; cursor:pointer; font-family:'Satoshi',system-ui,sans-serif;
    `;
    closeBtn.addEventListener('click', () => overlay.remove());
    box.appendChild(closeBtn);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  // ── Mount menu bar above the app ─────────────────────────────────

  function mount() {
    // Wrap the existing #root so we can prepend the menubar
    const root = document.getElementById('root');
    if (!root) return;

    // Create wrapper if not already done
    if (!document.getElementById('sw-menubar-wrapper')) {
      const wrapper = document.createElement('div');
      wrapper.id = 'sw-menubar-wrapper';
      root.parentNode.insertBefore(wrapper, root);
      wrapper.appendChild(buildMenuBar());
      wrapper.appendChild(root);
    }
  }

  // ── Inject fullscreen button into toolbar ───────────────────────

  function injectFullscreenButton() {
    if (document.getElementById('sw-fullscreen-btn')) return true;
    const toolbar = document.querySelector('[data-testid="top-toolbar"]');
    if (!toolbar) return false;

    // Find the right-side group (ml-auto div)
    const rightGroup = toolbar.querySelector('.ml-auto');
    if (!rightGroup) return false;

    const btn = document.createElement('button');
    btn.id = 'sw-fullscreen-btn';
    btn.setAttribute('title', 'Full Screen (F11)');
    btn.setAttribute('aria-label', 'Toggle full screen');
    btn.style.cssText = [
      'display:inline-flex', 'align-items:center', 'justify-content:center',
      'width:32px', 'height:32px', 'border-radius:6px', 'border:none',
      'background:transparent', 'cursor:pointer', 'color:hsl(215,20%,55%)',
      'transition:color 120ms, background 120ms', 'flex-shrink:0',
      'padding:0',
    ].join(';');

    btn.innerHTML = getFullscreenIcon(false);

    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'hsl(215,28%,17%)';
      btn.style.color = 'hsl(0,0%,90%)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'transparent';
      btn.style.color = 'hsl(215,20%,55%)';
    });
    btn.addEventListener('click', () => toggleFullscreen());

    // Insert before the first child of the right group
    rightGroup.insertBefore(btn, rightGroup.firstChild);

    // Update icon & menu label when fullscreen state changes
    document.addEventListener('fullscreenchange', () => {
      const fs = isFullscreen();
      btn.innerHTML = getFullscreenIcon(fs);
      btn.setAttribute('title', fs ? 'Exit Full Screen (F11)' : 'Full Screen (F11)');
      // Update View menu label
      const menuItem = document.getElementById('sw-menu-fullscreen');
      if (menuItem) {
        const lbl = menuItem.querySelector('.sw-item-label');
        if (lbl) lbl.textContent = fs ? 'Exit Full Screen' : 'Enter Full Screen';
      }
    });

    return true;
  }

  function getFullscreenIcon(active) {
    if (active) {
      // Exit fullscreen icon — inward arrows
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
        <path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
      </svg>`;
    }
    // Enter fullscreen icon — outward arrows
    return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 7V3h4"/><path d="M21 7V3h-4"/>
      <path d="M3 17v4h4"/><path d="M21 17v4h-4"/>
    </svg>`;
  }

  // Wait for React to hydrate
  function mountAndRetryFullscreen() {
    mount();
    let attempts = 0;
    const retryBtn = setInterval(() => {
      attempts++;
      if (injectFullscreenButton() || attempts > 40) clearInterval(retryBtn);
    }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(mountAndRetryFullscreen, 200));
  } else {
    setTimeout(mountAndRetryFullscreen, 200);
  }

  // ── Global keyboard shortcuts ─────────────────────────────────────

  // F11 — fullscreen (no modifier needed, must be separate listener)
  document.addEventListener('keydown', e => {
    if (e.key === 'F11') {
      e.preventDefault();
      toggleFullscreen();
    }
  }, true);

  document.addEventListener('keydown', e => {
    const metaOrCtrl = isMac ? e.metaKey : e.ctrlKey;
    if (!metaOrCtrl) return;

    // Scratch pad: Cmd/Ctrl+Shift+N
    if (e.shiftKey && e.key === 'N') {
      e.preventDefault();
      const noteTab = document.getElementById('sw-scratchpad-tab-btn');
      if (noteTab) {
        const rightPanel = document.querySelector('[data-testid="right-panel"]');
        const toggle = document.querySelector('[data-testid="toggle-right-panel"]');
        if (rightPanel && rightPanel.offsetWidth < 10) toggle?.click();
        setTimeout(() => noteTab.click(), 150);
      }
    }

    // Spelling & Grammar: Cmd/Ctrl+;
    if (e.key === ';') {
      e.preventDefault();
      const spellingBtn = document.querySelector('#sw-dropdown-edit [data-spell-toggle]');
      if (spellingBtn) spellingBtn.click();
    }

    // Toggle left panel: Cmd+[
    if (e.key === '[') {
      e.preventDefault();
      clickTestId('toggle-left-panel');
    }

    // Toggle right panel: Cmd+]
    if (e.key === ']') {
      e.preventDefault();
      clickTestId('toggle-right-panel');
    }

    // Distraction-free: Cmd+Shift+F
    if (e.shiftKey && e.key === 'F') {
      e.preventDefault();
      clickTestId('distraction-free-btn');
    }

    // Dark mode: Cmd+Shift+D
    if (e.shiftKey && e.key === 'D') {
      e.preventDefault();
      clickTestId('dark-mode-btn');
    }
  }, true);

  // ── Mobile landscape: auto-collapse sidebars ─────────────────────

  const mobileLandscapeMQ = window.matchMedia('(orientation: landscape) and (max-height: 500px)');

  function collapsePanelsForLandscape(mq) {
    if (!mq.matches) return;
    // Only act inside the editor (panels exist only there)
    const leftPanel  = document.querySelector('[data-testid="left-panel"]');
    const rightPanel = document.querySelector('[data-testid="right-panel"]');
    if (leftPanel && leftPanel.offsetWidth > 10) {
      clickTestId('toggle-left-panel');
    }
    if (rightPanel && rightPanel.offsetWidth > 10) {
      clickTestId('toggle-right-panel');
    }
  }

  mobileLandscapeMQ.addEventListener('change', collapsePanelsForLandscape);
  // Also check on first load / navigation into editor
  setTimeout(() => collapsePanelsForLandscape(mobileLandscapeMQ), 600);

})();
