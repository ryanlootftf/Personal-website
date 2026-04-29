/**
 * scroll-control.js - Smooth scroll navigation with section highlighting.
 * Provides programmatic scroll and scroll-to-section logic for the content panel.
 */

let sectionElements = [];

/**
 * Animate scrolling of a container from its current position to a target position.
 * Uses requestAnimationFrame for smooth, controllable scrolling.
 * @param {HTMLElement} container - The scrollable element
 * @param {number} targetTop - The target scrollTop value
 * @param {number} [duration=500] - Duration in milliseconds
 */
export function animateScroll(container, targetTop, duration = 500) {
  const startTop = container.scrollTop;
  const distance = targetTop - startTop;
  const startTime = performance.now();

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic for a natural deceleration
    const ease = 1 - Math.pow(1 - progress, 3);
    container.scrollTop = startTop + distance * ease;
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  requestAnimationFrame(step);
}

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

  animateScroll(panel, target.offsetTop - 16, 500);

  // Flash highlight animation
  target.classList.remove('highlighted');
  // Force reflow so the animation re-triggers
  void target.offsetWidth;
  target.classList.add('highlighted');
}

/**
 * Scroll to a specific element (e.g. a project card or experience item)
 * within a section. Falls back to scrolling the section if the element
 * isn't found.
 * @param {string} sectionId - e.g. "projects", "experience"
 * @param {string} elementId - e.g. "devops-automation-suite"
 */
export function scrollToElement(sectionId, elementId) {
  const panel = document.getElementById('content-panel');
  if (!panel || !elementId) {
    scrollToSection(sectionId);
    return;
  }

  // Try to find the element anywhere
  const target = document.querySelector(`[data-element-id="${elementId}"]`);
  if (!target || !panel.contains(target)) {
    // Fallback to section scroll
    scrollToSection(sectionId);
    return;
  }

  animateScroll(panel, target.offsetTop - 16, 500);

  target.classList.remove('highlighted');
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