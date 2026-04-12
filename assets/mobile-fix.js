/**
 * Scriptwriter — Mobile Cursor Stability Fix
 * ─────────────────────────────────────────────────────────────────
 * Addresses the root causes of cursor-jumping on mobile devices:
 *
 *  1. iOS Safari virtual keyboard shrinks the visual viewport — the
 *     editor's scroll container must adjust to keep the caret visible
 *     without triggering a full layout reflow.
 *
 *  2. Without visualViewport awareness, the browser's own scroll-to-
 *     cursor logic fires asynchronously and can overshoot or collide
 *     with React's state updates, producing a visible jump.
 *
 *  3. contenteditable elements on iOS need explicit touch-action,
 *     autocorrect, and autocapitalize attributes so the keyboard
 *     doesn't interfere with the screenplay editor's FSM.
 *
 *  4. 100vh on iOS does not shrink when the keyboard opens; the app
 *     uses h-screen (100vh). We correct this via a CSS variable kept
 *     in sync with visualViewport.height.
 *
 *  5. Rapid focus/blur cycles (e.g. tapping toolbar buttons while
 *     editing) cause scroll position to reset. We save and restore.
 */
(function () {
  'use strict';

  // ── Wait for the React app to mount ────────────────────────────

  function init() {
    const editorScroll = document.querySelector('.editor-scroll');
    if (!editorScroll) {
      // Not mounted yet — retry
      requestAnimationFrame(init);
      return;
    }
    setupAll(editorScroll);
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Give React time to hydrate
    setTimeout(init, 800);
  });

  // ── Main setup ─────────────────────────────────────────────────

  function setupAll(editorScroll) {
    fixViewportHeight(editorScroll);
    fixEditorScrollContainer(editorScroll);
    observeEditorElements();
    fixScrollOnKeyboard(editorScroll);
    fixFocusScrollPreservation(editorScroll);
    preventDoubleTapZoom();

    // Re-run element fixes whenever new elements are added (typing creates them)
    const mo = new MutationObserver(() => observeEditorElements());
    mo.observe(document.body, { childList: true, subtree: true });
  }

  // ── 1. Dynamic viewport height (iOS 100vh keyboard fix) ────────
  //
  // CSS `100vh` stays fixed even when the iOS keyboard opens.
  // We write `--sw-vh` in real pixels so layout containers can use
  // `height: var(--sw-vh, 100vh)` and truly fill only the visible area.

  function fixViewportHeight(editorScroll) {
    function update() {
      const vvp = window.visualViewport;
      const h = vvp ? vvp.height : window.innerHeight;
      document.documentElement.style.setProperty('--sw-vh', h + 'px');

      // Also directly clamp the editor-scroll height so it never
      // extends behind the keyboard on iOS.
      if (editorScroll && vvp) {
        const toolbar = document.querySelector('[data-testid="top-toolbar"]');
        const menubar = document.querySelector('#sw-menubar');
        const toolbarH = (toolbar ? toolbar.offsetHeight : 0) +
                         (menubar  ? menubar.offsetHeight  : 0);
        const available = Math.round(vvp.height - toolbarH);
        editorScroll.style.maxHeight = available + 'px';
      }
    }

    update();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', update, { passive: true });
      window.visualViewport.addEventListener('scroll', update, { passive: true });
    }
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(update, 250), { passive: true });
  }

  // ── 2. iOS momentum scrolling + overscroll fix ─────────────────

  function fixEditorScrollContainer(editorScroll) {
    // iOS momentum scrolling — without this, scrolling is sticky/jerky
    editorScroll.style.webkitOverflowScrolling = 'touch';

    // Prevent scroll-chaining to body (which resets scroll position)
    editorScroll.style.overscrollBehaviorY = 'contain';
    editorScroll.style.overscrollBehavior  = 'contain';

    // Ensure the scroll container is the one that scrolls, not the body
    editorScroll.style.overflowY = 'auto';
  }

  // ── 3. Editor element mobile attributes ────────────────────────
  //
  // contenteditable on iOS needs explicit attributes or the system
  // keyboard will autocorrect/capitalize in ways that move the caret.

  function patchElement(el) {
    if (el._swMobilePatch) return;
    el._swMobilePatch = true;

    // These prevent the OS autocorrect from inserting characters that
    // move the caret unpredictably mid-word.
    el.setAttribute('autocorrect',   'off');
    el.setAttribute('autocomplete',  'off');
    el.setAttribute('spellcheck',    'false');

    // Scene headings / character / transition are all-caps — iOS
    // autocapitalize "sentences" fires on EVERY keypress for these.
    const type = el.dataset.elementType || '';
    if (/scene-heading|character|transition|shot/.test(type)) {
      el.setAttribute('autocapitalize', 'characters');
    } else {
      el.setAttribute('autocapitalize', 'sentences');
    }

    // Prevent double-tap zoom from repositioning caret
    el.style.touchAction = 'manipulation';

    // Ensure the caret is always visible (lock style is handled elsewhere)
    if (!el.closest('.sw-script-locked')) {
      el.style.caretColor = '';
    }
  }

  function observeEditorElements() {
    document.querySelectorAll('[contenteditable="true"]').forEach(patchElement);
  }

  // ── 4. Scroll cursor into view after keyboard opens ─────────────
  //
  // When the virtual keyboard appears, the visual viewport shrinks.
  // The active caret may now be hidden behind the keyboard.
  // We detect this and smoothly scroll the editor so the caret is
  // always visible above the keyboard.

  let scrollLock = false;

  function scrollCaretIntoView(editorScroll) {
    if (scrollLock) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const rect  = range.getBoundingClientRect();

    const vvp = window.visualViewport;
    const viewTop    = vvp ? vvp.offsetTop  : 0;
    const viewBottom = vvp ? vvp.offsetTop + vvp.height : window.innerHeight;

    // Add padding so the caret isn't right at the edge
    const PADDING = 48;

    if (rect.bottom > viewBottom - PADDING) {
      // Caret is below visible area (hidden by keyboard)
      const overshoot = rect.bottom - (viewBottom - PADDING);
      scrollLock = true;
      editorScroll.scrollTop += overshoot;
      requestAnimationFrame(() => { scrollLock = false; });
    } else if (rect.top < viewTop + PADDING) {
      // Caret is above visible area
      const overshoot = viewTop + PADDING - rect.top;
      scrollLock = true;
      editorScroll.scrollTop -= overshoot;
      requestAnimationFrame(() => { scrollLock = false; });
    }
  }

  function fixScrollOnKeyboard(editorScroll) {
    const vvp = window.visualViewport;
    if (!vvp) return;

    let prevHeight = vvp.height;

    vvp.addEventListener('resize', () => {
      const newHeight = vvp.height;
      const delta = prevHeight - newHeight;

      if (delta > 80) {
        // Keyboard just opened (viewport shrank significantly)
        // Give the browser one frame to re-layout, then fix scroll
        requestAnimationFrame(() => {
          setTimeout(() => scrollCaretIntoView(editorScroll), 100);
        });
      }

      prevHeight = newHeight;
    }, { passive: true });

    // Also fix scroll on every selection change while keyboard is open
    document.addEventListener('selectionchange', () => {
      // Only act on mobile (visualViewport height smaller than window)
      if (vvp.height < window.innerHeight - 100) {
        requestAnimationFrame(() => scrollCaretIntoView(editorScroll));
      }
    }, { passive: true });
  }

  // ── 5. Preserve scroll position across focus/blur cycles ────────
  //
  // Tapping toolbar buttons causes the editor to blur then re-focus.
  // iOS Safari resets the scroll container's scrollTop on blur.
  // We save and restore it.

  function fixFocusScrollPreservation(editorScroll) {
    let savedScrollTop = 0;

    editorScroll.addEventListener('scroll', () => {
      // Save scroll position whenever it changes due to user scrolling
      savedScrollTop = editorScroll.scrollTop;
    }, { passive: true });

    document.addEventListener('focusin', (e) => {
      const target = e.target;
      if (!target || !target.closest) return;

      if (target.getAttribute('contenteditable') === 'true') {
        // Editor element focused — ensure scroll is where it should be
        requestAnimationFrame(() => {
          // Only restore if scroll jumped to 0 unexpectedly
          if (editorScroll.scrollTop === 0 && savedScrollTop > 50) {
            editorScroll.scrollTop = savedScrollTop;
          }
        });
      } else if (!target.closest('.editor-scroll')) {
        // Focus moved to toolbar/sidebar — save scroll before iOS resets it
        savedScrollTop = editorScroll.scrollTop;
      }
    }, { passive: true });

    document.addEventListener('focusout', (e) => {
      const target = e.target;
      if (target && target.getAttribute('contenteditable') === 'true') {
        savedScrollTop = editorScroll.scrollTop;
      }
    }, { passive: true });
  }

  // ── 6. Prevent double-tap zoom on the script page ──────────────
  //
  // Double-tapping on text in the editor on iOS triggers a zoom that
  // repositions the viewport relative to the caret, causing a
  // "jump". The viewport meta has user-scalable=no but some browsers
  // ignore it. We also cancel the touchend shortcut.

  function preventDoubleTapZoom() {
    let lastTap = 0;

    const scriptPage = document.querySelector('[data-testid="screenplay-editor"]');
    if (!scriptPage) return;

    scriptPage.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTap < 300) {
        // Double-tap detected — prevent zoom but allow normal tap
        e.preventDefault();
      }
      lastTap = now;
    }, { passive: false });
  }

  // ── 7. Smooth keyboard-aware scroll-to-caret on input ──────────
  //
  // After every keypress, ensure the caret stays in view. We hook
  // the `input` event on the editor and run a deferred caret check.

  document.addEventListener('input', (e) => {
    const target = e.target;
    if (!target || target.getAttribute('contenteditable') !== 'true') return;

    const editorScroll = document.querySelector('.editor-scroll');
    if (!editorScroll) return;

    // Defer so React has time to update the DOM first
    requestAnimationFrame(() => {
      setTimeout(() => scrollCaretIntoView(editorScroll), 50);
    });
  }, { passive: true });

})();
