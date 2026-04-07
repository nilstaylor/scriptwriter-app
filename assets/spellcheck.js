/**
 * Scriptwriter — Spell Checker
 * Uses nspell (Hunspell-compatible) with the en-US dictionary.
 * Underlines misspelled words with a red squiggle, right-click for suggestions.
 *
 * Screenplay-aware: ignores ALL-CAPS element headings, scene slugs,
 * character names, transitions, and common screenplay abbreviations.
 */
(function () {
  'use strict';

  // ── Load nspell-browser (en-US, ~2 MB, loaded lazily) ────────────

  const NSPELL_CDN = 'https://cdn.jsdelivr.net/npm/nspell-browser@1.0.0/build/nspell.browser.en-US.js';

  let spell = null;         // nspell instance (set after load)
  let spellReady = false;

  // Custom screenplay dictionary — words the standard en-US dict doesn't know
  const SCREENPLAY_WORDS = [
    // Scene/slug prefixes
    'INT', 'EXT', 'INT/EXT', 'I/E',
    // Time of day
    'DAY', 'NIGHT', 'DUSK', 'DAWN', 'CONTINUOUS', 'LATER', 'MOMENTS', 'SIMULTANEOUSLY',
    // Transitions
    'CUT', 'SMASH', 'MATCH', 'DISSOLVE', 'INTERCUT', 'PRELAP', 'WIPE',
    // Dialogue extensions
    'VO', 'OS', 'OC', "CONT'D", 'MOS', 'POV', 'SUBTITLE', 'SUPER', 'TITLES',
    // Common screenplay terms
    'SCREENPLAY', 'TELEPLAY', 'SPEC', 'LOGLINE', 'SLUGLINE', 'MONTAGE',
    'FLASHBACK', 'FLASHFORWARD', 'INSERT', 'CLOSE', 'WIDER', 'ANGLE',
    'SERIES', 'SHOTS', 'OMITTED', 'CONTINUED', 'OVERHEARD',
    // Common names / proper nouns likely to appear
    'FADE', 'BACK',
    // Numbers as words
    'ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN',
  ];

  function loadSpellChecker() {
    if (spellReady || document.getElementById('sw-nspell-script')) return;

    const script = document.createElement('script');
    script.id = 'sw-nspell-script';
    script.src = NSPELL_CDN;
    script.async = true;

    script.onload = () => {
      // nspell-browser sets window.nspell as the pre-initialized instance
      if (window.nspell && typeof window.nspell.correct === 'function') {
        spell = window.nspell;
        // Add screenplay-specific words
        SCREENPLAY_WORDS.forEach(w => spell.add(w));
        // NOW apply personal dictionary (spell was null when loadPersonalDict() ran at boot)
        try {
          const saved = JSON.parse(localStorage.getItem(PERSONAL_KEY) || '[]');
          saved.forEach(w => spell.add(w));
        } catch {}
        spellReady = true;
        // Run an initial pass
        setTimeout(() => checkAll(), 500);
      }
    };

    script.onerror = () => {
      console.warn('[Scriptwriter] Spell checker dictionary failed to load.');
    };

    document.head.appendChild(script);
  }

  // ── CSS for squiggles and context menu ───────────────────────────

  function injectStyles() {
    if (document.getElementById('sw-spellcheck-styles')) return;
    const style = document.createElement('style');
    style.id = 'sw-spellcheck-styles';
    style.textContent = `
      /* Spell error underline */
      .sw-spell-error {
        text-decoration: underline wavy #f87171;
        text-decoration-skip-ink: none;
        cursor: text;
        position: relative;
      }

      /* Context menu */
      #sw-spell-menu {
        position: fixed;
        z-index: 10001;
        background: hsl(224, 71%, 6%);
        border: 1px solid hsl(215, 28%, 20%);
        border-radius: 6px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.55);
        padding: 4px;
        min-width: 180px;
        font-family: 'Satoshi', system-ui, sans-serif;
        font-size: 12.5px;
      }

      .sw-spell-menu-item {
        display: block;
        width: 100%;
        padding: 5px 12px;
        border: none;
        background: transparent;
        color: hsl(215, 20%, 70%);
        text-align: left;
        border-radius: 4px;
        cursor: pointer;
        transition: background 80ms, color 80ms;
        font-family: inherit;
        font-size: inherit;
      }

      .sw-spell-menu-item:hover {
        background: hsl(215, 28%, 17%);
        color: hsl(0, 0%, 90%);
      }

      .sw-spell-menu-item.sw-suggestion {
        font-weight: 600;
        color: hsl(43, 96%, 60%);
      }

      .sw-spell-menu-item.sw-suggestion:hover {
        color: hsl(43, 96%, 75%);
      }

      .sw-spell-separator {
        height: 1px;
        background: hsl(215, 28%, 17%);
        margin: 3px 6px;
      }

      .sw-spell-label {
        padding: 3px 12px 2px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: hsl(215, 20%, 38%);
      }

      /* Status indicator in menu bar */
      #sw-spell-status {
        margin-left: auto;
        padding: 0 8px;
        font-size: 10.5px;
        color: hsl(215, 20%, 38%);
        display: flex;
        align-items: center;
        gap: 5px;
        cursor: pointer;
        border-radius: 4px;
        transition: background 100ms;
        user-select: none;
        white-space: nowrap;
      }
      #sw-spell-status:hover {
        background: hsl(215, 28%, 17%);
        color: hsl(0, 0%, 70%);
      }
      #sw-spell-status .sw-spell-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        flex-shrink: 0;
        background: hsl(215, 20%, 38%);
      }
      #sw-spell-status.sw-spell-on .sw-spell-dot  { background: #4ade80; }
      #sw-spell-status.sw-spell-error-dot .sw-spell-dot { background: #f87171; }
    `;
    document.head.appendChild(style);
  }

  // ── Screenplay-aware word filter ──────────────────────────────────

  // Tokens we never spell-check
  const ALWAYS_SKIP = /^(INT|EXT|INT\/EXT|I\/E|CUT|DISSOLVE|SMASH|MATCH|WIPE|FADE|MOS|POV|VO|OS|OC|OOV)\.?(:)?$/i;

  // All-caps words in a screenplay context = character names, transitions, etc.
  // Skip them unless they're in a clearly prose/action line
  function isScriptElement(node) {
    // Walk up to find the element's data-type or class
    let el = node.parentElement;
    while (el) {
      const type = el.getAttribute('data-type') || el.getAttribute('data-element') || el.className || '';
      const typeStr = type.toString().toLowerCase();
      if (typeStr.includes('scene-heading') || typeStr.includes('transition') ||
          typeStr.includes('character') || typeStr.includes('parenthetical')) {
        return true;
      }
      el = el.parentElement;
    }
    return false;
  }

  function shouldSkipWord(word, node) {
    // Skip very short tokens
    if (word.length <= 1) return true;

    // Skip pure numbers
    if (/^\d+$/.test(word)) return true;

    // Skip words with numbers in them (100th, EXT.1, etc.)
    if (/\d/.test(word)) return true;

    // Skip screenplay abbreviations
    if (ALWAYS_SKIP.test(word)) return true;

    // Skip ALL-CAPS words (character names, transitions, slugs)
    if (word === word.toUpperCase() && word.length > 1) return true;

    // Skip possessives of proper nouns (He's, I'm handled by dict)
    // Skip words starting with uppercase that are likely proper nouns in character/scene context
    if (isScriptElement(node) && /^[A-Z]/.test(word)) return true;

    // Skip common screenplay formatting tokens
    if (/^\(.*\)$/.test(word)) return true;  // (parenthetical)

    return false;
  }

  function cleanWord(word) {
    // Strip surrounding punctuation but keep apostrophes in contractions
    return word.replace(/^[^a-zA-Z']+|[^a-zA-Z']+$/g, '');
  }

  // ── Spell-checking engine ─────────────────────────────────────────

  // Personal dictionary stored in localStorage
  const PERSONAL_KEY = 'sw_personal_dict';
  let personalDict = new Set();

  function loadPersonalDict() {
    try {
      const saved = JSON.parse(localStorage.getItem(PERSONAL_KEY) || '[]');
      personalDict = new Set(saved.map(w => w.toLowerCase()));
      if (spell) saved.forEach(w => spell.add(w));
    } catch {}
  }

  function savePersonalDict() {
    try {
      localStorage.setItem(PERSONAL_KEY, JSON.stringify([...personalDict]));
    } catch {}
  }

  function addToPersonalDict(word) {
    const lw = word.toLowerCase();
    personalDict.add(lw);
    if (spell) spell.add(word);
    savePersonalDict();
  }

  function isCorrect(word) {
    if (!spellReady) return true;
    const cleaned = cleanWord(word);
    if (!cleaned || cleaned.length <= 1) return true;
    if (personalDict.has(cleaned.toLowerCase())) return true;
    return spell.correct(cleaned);
  }

  function getSuggestions(word) {
    if (!spellReady) return [];
    const cleaned = cleanWord(word);
    if (!cleaned) return [];
    try {
      return spell.suggest(cleaned).slice(0, 6);
    } catch {
      return [];
    }
  }

  // ── DOM walker + squiggle injector ───────────────────────────────

  let checkTimer = null;
  let enabled = true;
  let errorCount = 0;

  function checkAll() {
    if (!enabled || !spellReady) return;
    const editor = getEditor();
    if (!editor) return;
    checkNode(editor);
    updateStatus();
  }

  function scheduleCheck() {
    clearTimeout(checkTimer);
    checkTimer = setTimeout(checkAll, 800);
  }

  function getEditor() {
    return (
      document.querySelector('[contenteditable="true"][data-testid="screenplay-editor"]') ||
      document.querySelector('[contenteditable="true"].screenplay-editor') ||
      document.querySelector('[contenteditable="true"]')
    );
  }

  function checkNode(root) {
    errorCount = 0;

    // First remove all existing marks
    root.querySelectorAll('.sw-spell-error').forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent), el);
        parent.normalize();
      }
    });

    // Walk text nodes
    walkTextNodes(root, node => {
      if (!node.nodeValue || !node.nodeValue.trim()) return;
      if (isScriptElement(node)) return; // skip scene headings, character names, etc.

      const text = node.nodeValue;
      const wordPattern = /[a-zA-Z']+/g;
      let match;
      const errors = [];

      while ((match = wordPattern.exec(text)) !== null) {
        const rawWord = match[0];
        const word = cleanWord(rawWord);
        if (!word || shouldSkipWord(rawWord, node)) continue;
        if (!isCorrect(word)) {
          errors.push({ start: match.index, end: match.index + match[0].length, word });
          errorCount++;
        }
      }

      if (errors.length === 0) return;

      // Wrap each error in a span
      let offset = 0;
      const fragment = document.createDocumentFragment();
      errors.forEach(({ start, end, word }) => {
        if (start > offset) {
          fragment.appendChild(document.createTextNode(text.slice(offset, start)));
        }
        const span = document.createElement('span');
        span.className = 'sw-spell-error';
        span.dataset.word = word;
        span.textContent = text.slice(start, end);
        fragment.appendChild(span);
        offset = end;
      });
      if (offset < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(offset)));
      }

      node.parentNode.replaceChild(fragment, node);
    });
  }

  function walkTextNodes(root, callback) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          // Skip nodes inside our own spell menu or UI elements
          if (node.parentElement?.closest('#sw-spell-menu, #sw-menubar, #sw-scratchpad-panel')) {
            return NodeFilter.FILTER_REJECT;
          }
          // Skip nodes already inside a spell-error span (prevent double-wrapping)
          if (node.parentElement?.classList.contains('sw-spell-error')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    let node;
    while ((node = walker.nextNode())) {
      callback(node);
    }
  }

  // ── Context menu ──────────────────────────────────────────────────

  let activeMenu = null;

  function closeSpellMenu() {
    if (activeMenu) { activeMenu.remove(); activeMenu = null; }
    document.removeEventListener('click', closeSpellMenu, true);
    document.removeEventListener('keydown', closeSpellMenuOnEsc);
  }

  function closeSpellMenuOnEsc(e) {
    if (e.key === 'Escape') closeSpellMenu();
  }

  function showSpellMenu(x, y, span) {
    closeSpellMenu();
    const word = span.dataset.word;
    const suggestions = getSuggestions(word);

    const menu = document.createElement('div');
    menu.id = 'sw-spell-menu';
    menu.setAttribute('role', 'menu');

    // Header
    const label = document.createElement('div');
    label.className = 'sw-spell-label';
    label.textContent = `"${word}"`;
    menu.appendChild(label);

    if (suggestions.length > 0) {
      const sep1 = document.createElement('div');
      sep1.className = 'sw-spell-separator';
      menu.appendChild(sep1);

      suggestions.forEach(sug => {
        const btn = document.createElement('button');
        btn.className = 'sw-spell-menu-item sw-suggestion';
        btn.textContent = sug;
        btn.setAttribute('role', 'menuitem');
        btn.addEventListener('click', () => {
          replaceWord(span, sug);
          closeSpellMenu();
          scheduleCheck();
        });
        menu.appendChild(btn);
      });
    } else {
      const none = document.createElement('div');
      none.className = 'sw-spell-menu-item sw-disabled';
      none.style.opacity = '0.45';
      none.style.pointerEvents = 'none';
      none.textContent = 'No suggestions';
      menu.appendChild(none);
    }

    const sep2 = document.createElement('div');
    sep2.className = 'sw-spell-separator';
    menu.appendChild(sep2);

    // Add to dictionary
    const addBtn = document.createElement('button');
    addBtn.className = 'sw-spell-menu-item';
    addBtn.textContent = 'Add to dictionary';
    addBtn.setAttribute('role', 'menuitem');
    addBtn.addEventListener('click', () => {
      addToPersonalDict(word);
      // Remove the error span
      const text = document.createTextNode(span.textContent);
      span.replaceWith(text);
      closeSpellMenu();
      updateStatus();
    });
    menu.appendChild(addBtn);

    // Ignore
    const ignoreBtn = document.createElement('button');
    ignoreBtn.className = 'sw-spell-menu-item';
    ignoreBtn.textContent = 'Ignore all';
    ignoreBtn.setAttribute('role', 'menuitem');
    ignoreBtn.addEventListener('click', () => {
      // Temporarily add to session dict (not persisted)
      if (spell) spell.add(word);
      // Remove all instances of this error
      const editor = getEditor();
      if (editor) {
        editor.querySelectorAll(`.sw-spell-error[data-word="${word}"]`).forEach(el => {
          el.replaceWith(document.createTextNode(el.textContent));
        });
      }
      closeSpellMenu();
      updateStatus();
    });
    menu.appendChild(ignoreBtn);

    document.body.appendChild(menu);
    activeMenu = menu;

    // Position, keeping within viewport
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    let left = x, top = y;
    if (left + mw > window.innerWidth - 8) left = window.innerWidth - mw - 8;
    if (top + mh > window.innerHeight - 8) top = y - mh - 4;
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', closeSpellMenu, true);
      document.addEventListener('keydown', closeSpellMenuOnEsc);
    }, 0);
  }

  function replaceWord(span, replacement) {
    const textNode = document.createTextNode(replacement);
    span.replaceWith(textNode);
    // Move cursor after replacement
    const sel = window.getSelection();
    const range = document.createRange();
    range.setStartAfter(textNode);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // ── Status indicator in menu bar ──────────────────────────────────

  function updateStatus() {
    const statusEl = document.getElementById('sw-spell-status');
    if (!statusEl) return;

    if (!enabled) {
      statusEl.className = 'sw-spell-status';
      statusEl.querySelector('.sw-spell-text').textContent = 'Spell Check Off';
      return;
    }
    if (!spellReady) {
      statusEl.className = 'sw-spell-status';
      statusEl.querySelector('.sw-spell-text').textContent = 'Loading…';
      return;
    }

    const count = document.querySelectorAll('.sw-spell-error').length;
    if (count === 0) {
      statusEl.className = 'sw-spell-status sw-spell-on';
      statusEl.querySelector('.sw-spell-text').textContent = 'No errors';
    } else {
      statusEl.className = 'sw-spell-status sw-spell-error-dot';
      statusEl.querySelector('.sw-spell-text').textContent = `${count} error${count !== 1 ? 's' : ''}`;
    }
  }

  function injectStatusIndicator() {
    if (document.getElementById('sw-spell-status')) return true;
    const bar = document.getElementById('sw-menubar');
    if (!bar) return false;

    const status = document.createElement('div');
    status.id = 'sw-spell-status';
    status.setAttribute('title', 'Click to toggle spell check');
    status.innerHTML = `<span class="sw-spell-dot"></span><span class="sw-spell-text">Loading…</span>`;
    status.style.marginLeft = 'auto';

    status.addEventListener('click', () => {
      enabled = !enabled;
      if (!enabled) {
        // Clear all squiggles
        document.querySelectorAll('.sw-spell-error').forEach(el => {
          el.replaceWith(document.createTextNode(el.textContent));
        });
      } else {
        if (!spellReady) loadSpellChecker();
        else scheduleCheck();
      }
      updateStatus();
    });

    bar.appendChild(status);
    return true;
  }

  // ── Wire up editor events ─────────────────────────────────────────

  let editorWatcher = null;

  function attachEditorListeners(editor) {
    if (editor._swSpellAttached) return;
    editor._swSpellAttached = true;

    editor.addEventListener('input', () => {
      if (enabled) scheduleCheck();
    });

    editor.addEventListener('contextmenu', e => {
      const span = e.target.closest('.sw-spell-error');
      if (span) {
        e.preventDefault();
        e.stopPropagation();
        showSpellMenu(e.clientX, e.clientY, span);
      }
    });

    // Initial check
    if (spellReady) setTimeout(() => checkAll(), 300);
  }

  function watchForEditor() {
    const editor = getEditor();
    if (editor) {
      attachEditorListeners(editor);
      return true;
    }
    return false;
  }

  // ── Tools menu integration ───────────────────────────────────────

  function injectToolsMenu() {
    // Add "Spelling & Grammar" entry to the Edit menu in the menu bar
    const editMenuId = 'sw-dropdown-edit';
    const editDropdown = document.getElementById(editMenuId);
    if (!editDropdown || editDropdown.dataset.spellInjected) return;
    editDropdown.dataset.spellInjected = 'true';

    const sep = document.createElement('div');
    sep.className = 'sw-menu-separator';

    const btn = document.createElement('button');
    btn.className = 'sw-menu-item';
    btn.setAttribute('role', 'menuitem');
    btn.setAttribute('data-spell-toggle', 'true');
    btn.innerHTML = `
      <span class="sw-item-icon" aria-hidden="true">🔤</span>
      <span class="sw-item-label">Spelling &amp; Grammar</span>
      <span class="sw-item-shortcut">⌘;</span>
    `;
    btn.addEventListener('click', () => {
      enabled = !enabled;
      if (!enabled) {
        document.querySelectorAll('.sw-spell-error').forEach(el => {
          el.replaceWith(document.createTextNode(el.textContent));
        });
      } else {
        if (!spellReady) loadSpellChecker();
        else scheduleCheck();
      }
      updateStatus();
    });

    editDropdown.appendChild(sep);
    editDropdown.appendChild(btn);
  }

  // ── Bootstrap ────────────────────────────────────────────────────

  function boot() {
    injectStyles();
    loadPersonalDict();

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;

      // Inject status indicator into menu bar when available
      injectStatusIndicator();
      injectToolsMenu();

      // Attach to editor when available
      watchForEditor();

      // Load spell checker once we know we're in the editor (not landing page)
      const inEditor = !!getEditor();
      if (inEditor && !spellReady && !document.getElementById('sw-nspell-script')) {
        loadSpellChecker();
      }

      if (attempts > 60) clearInterval(interval);
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 300));
  } else {
    setTimeout(boot, 300);
  }

  // Re-attach when the editor is remounted (e.g. opening a new screenplay)
  const observer = new MutationObserver(() => {
    watchForEditor();
    injectStatusIndicator();
  });
  observer.observe(document.body, { childList: true, subtree: true });

})();
