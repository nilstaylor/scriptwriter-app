/**
 * Scriptwriter — Scratch Pad / Notes Tab
 * Injects a "Notes" tab into the right inspector panel.
 * Content is persisted per-screenplay in localStorage.
 */
(function () {
  'use strict';

  const STORAGE_KEY_PREFIX = 'sw_scratchpad_';

  function getScreenplayId() {
    // Try to get the screenplay title from the DOM (app renders it in the toolbar)
    const titleEl = document.querySelector('[data-testid="script-title"], .script-title, [data-screenplay-title]');
    if (titleEl) {
      const title = (titleEl.textContent || titleEl.value || '').trim();
      if (title && title !== 'Untitled Screenplay' && title.length > 0) {
        return 'title_' + title.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40);
      }
    }
    // Fall back to a single shared key (acceptable since most sessions = one screenplay)
    return 'default';
  }

  function loadNotes() {
    try {
      return localStorage.getItem(STORAGE_KEY_PREFIX + getScreenplayId()) || '';
    } catch { return ''; }
  }

  function saveNotes(text) {
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + getScreenplayId(), text);
    } catch {}
  }

  function getWordCount(text) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    return words.length;
  }

  function injectScratchpadTab(tabsContainer, tabPanelsContainer) {
    // ── Tab button ──────────────────────────────────────────────
    const tabBtn = document.createElement('button');
    tabBtn.id = 'sw-scratchpad-tab-btn';
    tabBtn.setAttribute('role', 'tab');
    tabBtn.setAttribute('aria-selected', 'false');
    tabBtn.setAttribute('aria-controls', 'sw-scratchpad-panel');

    // Pencil icon SVG
    tabBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
      </svg>
      Notes
    `;

    tabsContainer.appendChild(tabBtn);

    // ── Panel ───────────────────────────────────────────────────
    const panel = document.createElement('div');
    panel.id = 'sw-scratchpad-panel';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', 'sw-scratchpad-tab-btn');

    const textarea = document.createElement('textarea');
    textarea.id = 'sw-scratchpad-textarea';
    textarea.placeholder = 'Jot down ideas, reminders, research notes, character thoughts…';
    textarea.value = loadNotes();
    textarea.setAttribute('spellcheck', 'true');

    const footer = document.createElement('div');
    footer.id = 'sw-scratchpad-footer';

    const wordCount = document.createElement('span');
    wordCount.id = 'sw-scratchpad-wordcount';
    wordCount.textContent = `${getWordCount(textarea.value)} words`;

    const clearBtn = document.createElement('button');
    clearBtn.id = 'sw-scratchpad-clear';
    clearBtn.textContent = 'Clear';
    clearBtn.setAttribute('title', 'Clear all notes');

    footer.appendChild(wordCount);
    footer.appendChild(clearBtn);
    panel.appendChild(textarea);
    panel.appendChild(footer);

    tabPanelsContainer.appendChild(panel);

    // ── Auto-save with debounce ─────────────────────────────────
    let saveTimer = null;
    textarea.addEventListener('input', () => {
      wordCount.textContent = `${getWordCount(textarea.value)} words`;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => saveNotes(textarea.value), 500);
    });

    // ── Clear with confirmation ──────────────────────────────────
    clearBtn.addEventListener('click', () => {
      if (textarea.value.trim() === '') return;
      if (confirm('Clear all notes for this screenplay?')) {
        textarea.value = '';
        wordCount.textContent = '0 words';
        saveNotes('');
        textarea.focus();
      }
    });

    // ── Tab switching logic ─────────────────────────────────────
    tabBtn.addEventListener('click', () => {
      const isActive = panel.classList.contains('sw-visible');

      if (isActive) {
        // Toggle OFF — deactivate our tab, re-show previous panels
        tabBtn.setAttribute('aria-selected', 'false');
        tabBtn.classList.remove('sw-tab-active');
        panel.classList.remove('sw-visible');
        panel.style.display = 'none';
        // Re-show panels we hid
        hiddenByUs.forEach(p => {
          p.style.display = '';
          p.setAttribute('data-state', 'active');
        });
        hiddenByUs.clear();
        // Re-activate the first Radix tab as fallback
        const firstTab = tabsContainer.querySelector('[role="tab"]:not(#sw-scratchpad-tab-btn)');
        if (firstTab) {
          firstTab.setAttribute('data-state', 'active');
          firstTab.click();
        }
        return;
      }

      // Toggle ON — deactivate all existing tabs, show scratchpad
      const allTabs = tabsContainer.querySelectorAll('[role="tab"], button');
      allTabs.forEach(t => {
        t.setAttribute('aria-selected', 'false');
        t.classList.remove('sw-tab-active');
        t.setAttribute('data-state', 'inactive');
        t.style.borderBottomColor = '';
        t.style.color = '';
      });

      // Hide all existing tab panels (track which ones we hide)
      hiddenByUs.clear();
      const allPanels = tabPanelsContainer.querySelectorAll('[role="tabpanel"], [data-state]');
      allPanels.forEach(p => {
        if (p.id !== 'sw-scratchpad-panel') {
          p.setAttribute('data-state', 'inactive');
          p.style.display = 'none';
          hiddenByUs.add(p);
        }
      });

      // Activate our tab
      tabBtn.setAttribute('aria-selected', 'true');
      tabBtn.setAttribute('data-state', 'active');
      tabBtn.classList.add('sw-tab-active');
      panel.classList.add('sw-visible');
      panel.style.display = 'flex';
      textarea.focus();
    });

    // ── When other tabs are clicked, hide the scratchpad ────────
    // Track exactly which panels WE hid so we only un-hide those
    const hiddenByUs = new Set();
    const observer = new MutationObserver(() => {
      const activePanels = tabPanelsContainer.querySelectorAll('[data-state="active"]:not(#sw-scratchpad-panel)');
      if (activePanels.length > 0 && panel.classList.contains('sw-visible')) {
        // Another tab became active — deactivate ours
        tabBtn.setAttribute('aria-selected', 'false');
        tabBtn.classList.remove('sw-tab-active');
        panel.classList.remove('sw-visible');

        // Only re-show panels we explicitly hid
        hiddenByUs.forEach(p => { p.style.display = ''; });
        hiddenByUs.clear();
      }
    });

    observer.observe(tabPanelsContainer, {
      attributes: true,
      subtree: true,
      attributeFilter: ['data-state'],
    });

    // Watch for screenplay navigation changes to reload notes
    let lastId = getScreenplayId();
    setInterval(() => {
      const currentId = getScreenplayId();
      if (currentId !== lastId) {
        lastId = currentId;
        textarea.value = loadNotes();
        wordCount.textContent = `${getWordCount(textarea.value)} words`;
      }
    }, 1000);

    return { tabBtn, panel };
  }

  // ── Find and inject into the right panel ─────────────────────────

  function tryInject() {
    // The right panel contains a Radix Tabs component with role="tablist"
    const rightPanel = document.querySelector('[data-testid="right-panel"]');
    if (!rightPanel) return false;

    // Already injected?
    if (document.getElementById('sw-scratchpad-tab-btn')) return true;

    // Find the tabs list (the row of tab buttons)
    const tabsList = rightPanel.querySelector('[role="tablist"]');
    if (!tabsList) return false;

    // Find the panels container (parent of the tab content divs)
    const tabContent = rightPanel.querySelector('[role="tabpanel"]');
    if (!tabContent) return false;

    const panelsContainer = tabContent.parentElement;
    if (!panelsContainer) return false;

    injectScratchpadTab(tabsList, panelsContainer);
    return true;
  }

  // Retry until the React app has rendered the panel
  function waitAndInject() {
    if (tryInject()) return;
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (tryInject() || attempts > 60) clearInterval(interval);
    }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(waitAndInject, 400));
  } else {
    setTimeout(waitAndInject, 400);
  }

  // Re-inject if the right panel becomes visible after being hidden
  const bodyObserver = new MutationObserver(() => {
    if (!document.getElementById('sw-scratchpad-tab-btn')) {
      tryInject();
    }
  });
  bodyObserver.observe(document.body, { childList: true, subtree: true });

})();
