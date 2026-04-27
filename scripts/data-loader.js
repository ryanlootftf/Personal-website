/**
 * data-loader.js - Loads config.json and portfolio.json, then triggers rendering.
 * Sets up suggested prompts from config.
 */

import { renderPortfolio } from './renderer.js';

let portfolioData = null;
let configData = null;

/**
 * Fetch a JSON file from a relative path.
 * @param {string} path
 * @returns {Promise<Object>}
 */
async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.statusText}`);
  return res.json();
}

/**
 * Load config.json and portfolio.json, render content, show error on failure.
 * @returns {Promise<boolean>} true if data loaded successfully
 */
export async function loadAndRender() {
  try {
    [configData, portfolioData] = await Promise.all([
      fetchJSON('/data/config.json'),
      fetchJSON('/data/portfolio.json')
    ]);

    renderPortfolio(portfolioData);
    setupSuggestedPrompts();
    setupLogoText();
    return true;
  } catch (err) {
    console.error('Data load error:', err);
    const panel = document.getElementById('content-panel');
    panel.innerHTML = `
      <div class="error-container">
        <h2>⚠ Load Error</h2>
        <p>Could not load portfolio data. Please try refreshing the page.</p>
      </div>
    `;
    return false;
  }
}

/**
 * Set the logo text in the header from config (keeps the ◆ prefix).
 */
function setupLogoText() {
  const logoEl = document.querySelector('.logo');
  if (!logoEl || !configData?.site?.logoText) return;
  logoEl.textContent = '◆ ' + configData.site.logoText;
}

/**
 * @returns {Object|null} portfolio data
 */
export function getPortfolioData() {
  return portfolioData;
}

/**
 * @returns {Object|null} config data
 */
export function getConfigData() {
  return configData;
}

/**
 * Populate the suggested prompts row from config (or fallback defaults).
 */
function setupSuggestedPrompts() {
  const container = document.getElementById('suggested-prompts');
  if (!container) return;

  const prompts = configData?.suggestedPrompts || [
    'What projects have you worked on?',
    'Tell me about your experience',
    'What are your skills?',
    'How can I contact you?'
  ];

  container.innerHTML = '';
  prompts.forEach(text => {
    const chip = document.createElement('div');
    chip.className = 'prompt-chip';
    chip.textContent = text;
    chip.addEventListener('click', () => {
      const input = document.getElementById('chat-input');
      if (input) {
        input.value = text;
        input.dispatchEvent(new Event('input')); // trigger auto-resize
        // Trigger the send button programmatically
        const sendBtn = document.getElementById('send-btn');
        if (sendBtn) sendBtn.click();
      }
    });
    container.appendChild(chip);
  });
}