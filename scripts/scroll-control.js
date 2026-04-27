/**
 * scroll-control.js - Smooth scroll navigation with section highlighting.
 * Provides programmatic scroll and scroll-to-section logic for the content panel.
 */

let sectionElements = [];

/**
 * After rendering, call this to register sections for scroll control.
 */
export function registerSections() {
  sectionElements = Array.from(
    document.querySelectorAll('.panel-section[data-section-id]')
  );
}

/**
 * Scroll the content panel to the section whose dataset.sectionId matches `id`.
 * Highlights the target section briefly.
 * @param {string} id - section id (e.g., "projects", "experience")
 */
export function scrollToSection(id) {
  const panel = document.getElementById('content-panel');
  const target = document.querySelector(`.panel-section[data-section-id="${id}"]`);
  if (!target || !panel) return;

  panel.scrollTo({
    top: target.offsetTop - 16, // small padding
    behavior: 'smooth'
  });

  // Flash highlight animation
  target.classList.remove('highlighted');
  // Force reflow so the animation re-triggers
  void target.offsetWidth;
  target.classList.add('highlighted');
}

/**
 * Returns the id of the currently visible section (the first one near the top).
 * Defaults to 'hero' if none found.
 * @returns {string}
 */
export function getCurrentSectionId() {
  const panel = document.getElementById('content-panel');
  if (!panel || sectionElements.length === 0) return 'hero';

  const panelRect = panel.getBoundingClientRect();
  const scrollTop = panel.scrollTop;

  for (const el of sectionElements) {
    const offsetTop = el.offsetTop;
    if (offsetTop >= scrollTop - 100 && offsetTop <= scrollTop + panelRect.height / 2) {
      return el.dataset.sectionId;
    }
  }

  return sectionElements[0]?.dataset?.sectionId || 'hero';
}