// src/ui/tabs.js — Editorial Clinical underline-tab indicator wiring.
//
// The existing event-delegated tab handler (data-action="go" on the .tabs
// container, set up in app.js) is preserved. This module only adds the
// visual sliding indicator: a single .tab-indicator element whose width and
// transform are recomputed from the active tab's getBoundingClientRect().
//
// RTL note: getBoundingClientRect() returns visual-x; we translate the
// indicator using `translateX(left - containerLeft)` which works in both
// LTR and RTL because the bar is positioned with inset-inline-start: 0.

/**
 * Wire underline-tab indicator behavior to a tab container.
 * Idempotent — calling twice on the same container won't add two indicators.
 *
 * @param {HTMLElement} container - the tab bar element (e.g. #tb)
 */
export function wireUnderlineTabs(container) {
  if (!container || container.__indicatorWired) return;
  container.__indicatorWired = true;

  // Ensure the container can host an absolutely-positioned indicator.
  if (getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }

  // Find or create the single indicator element.
  let indicator = container.querySelector('.tab-indicator');
  if (!indicator) {
    indicator = document.createElement('span');
    indicator.className = 'tab-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    container.appendChild(indicator);
  }

  /** Recompute indicator position + width from the active tab. */
  function update() {
    const active =
      container.querySelector('button.on, .tab-link.is-active, [aria-selected="true"]');
    if (!active) {
      indicator.style.opacity = '0';
      return;
    }
    indicator.style.opacity = '1';
    const cRect = container.getBoundingClientRect();
    const aRect = active.getBoundingClientRect();
    // Use logical inset-inline-start (LTR: from left; RTL: from right).
    const dir = getComputedStyle(container).direction;
    let offset;
    if (dir === 'rtl') {
      // Distance from container's right edge to active tab's right edge,
      // negated because we use translateX (which flips sign in RTL writing
      // contexts only when transform is on a flow-root child — keep as
      // numeric translateX so motion is consistent).
      offset = (cRect.right - aRect.right);
      indicator.style.transform = `translateX(${-offset}px)`;
    } else {
      offset = aRect.left - cRect.left;
      indicator.style.transform = `translateX(${offset}px)`;
    }
    indicator.style.width = `${aRect.width}px`;
  }

  // Re-run on tab clicks (after the existing go() handler updates .on).
  container.addEventListener('click', () => {
    // Defer to the next frame so the .on class has been applied by render().
    requestAnimationFrame(() => requestAnimationFrame(update));
  });

  // Recompute on layout changes (resize, font load, orientation change).
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => update());
    ro.observe(container);
  }
  window.addEventListener('resize', update, { passive: true });

  // Re-run after font load — Frank Ruhl Libre arrives async via Google Fonts
  // and changes tab widths. Without this the indicator can mis-align.
  if (document.fonts && typeof document.fonts.ready?.then === 'function') {
    document.fonts.ready.then(update).catch(() => {});
  }

  // Also re-run on MutationObserver of class changes within the tab bar
  // (covers programmatic tab switches like history-back where click handler
  // didn't fire on the tab itself).
  const mo = new MutationObserver(() => update());
  mo.observe(container, { subtree: true, attributes: true, attributeFilter: ['class', 'aria-selected'] });

  // Initial paint.
  requestAnimationFrame(update);
}

export default wireUnderlineTabs;
