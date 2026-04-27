/**
 * chat.js - Manages the chat UI, message history, and interaction flow.
 * Integrates with api.js for AI responses and scroll-control.js for context-aware replies.
 */

import { sendChatMessage, loadSystemPrompt } from './api.js';
import { getPortfolioData, getConfigData } from './data-loader.js';
import { scrollToSection, registerSections } from './scroll-control.js';

/** @type {Array<{role:string,content:string}>} */
let messageHistory = [];
let isProcessing = false;

/**
 * Initialize chat: bind events, load system prompt, set up welcome.
 */
export async function initChat() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');

  if (!input || !sendBtn) return;

  // Load system prompt
  const systemPrompt = await loadSystemPrompt();
  if (systemPrompt) {
    messageHistory.push({ role: 'system', content: systemPrompt });
  }

  // Bind events
  sendBtn.addEventListener('click', () => handleSend());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Auto-resize textarea on input
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 150) + 'px';
  });

  // Register sections after render (call after chat init too since render is async)
  registerSections();
}

/**
 * Add the initial welcome message from the AI.
 */
export function addWelcomeMessage() {
  const portfolio = getPortfolioData();
  const name = portfolio?.personal?.name || 'the portfolio owner';
  const greeting = `👋 Hello! I'm an AI assistant that knows all about ${name}'s work. Feel free to ask me about projects, work experience, technical skills, or anything else you'd like to know!`;
  addMessage('ai', greeting);
}

/**
 * Handle sending a user message.
 */
async function handleSend() {
  if (isProcessing) return;

  const input = document.getElementById('chat-input');
  const text = input?.value.trim();
  if (!text) return;

  // Clear input
  input.value = '';
  input.style.height = 'auto';

  // Add user message to UI and history
  addMessage('user', text);
  messageHistory.push({ role: 'user', content: text });

  // Show typing indicator
  showTypingIndicator();
  isProcessing = true;

  try {
    const portfolio = getPortfolioData();
    const config = getConfigData();

    // Send to API (with fallback)
    const response = await sendChatMessage(
      messageHistory.filter(m => m.role !== 'system'),
      portfolio,
      config
    );

    // Remove typing indicator
    removeTypingIndicator();

    // Add AI response
    addMessage('ai', response);
    messageHistory.push({ role: 'assistant', content: response });

    // Try to navigate based on content keywords
    navigateToRelevantSection(response);
  } catch (err) {
    console.error('Chat error:', err);
    removeTypingIndicator();
    addMessage('ai', 'I encountered an error. Please try again.');
  } finally {
    isProcessing = false;
  }
}

/**
 * Add a message bubble to the chat UI.
 * @param {'user'|'ai'|'system-info'} role
 * @param {string} content
 */
function addMessage(role, content) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const div = document.createElement('div');
  div.className = `message ${role}`;

  // Handle newlines in content
  content.split('\n').forEach((line, i, arr) => {
    const p = document.createElement('p');
    p.textContent = line;
    div.appendChild(p);
    if (i < arr.length - 1 && line === '') {
      // Add spacing for blank lines
      const br = document.createElement('br');
      div.appendChild(br);
    }
  });

  container.appendChild(div);
  scrollChatToBottom();
}

/**
 * Show the typing indicator (3 bouncing dots).
 */
function showTypingIndicator() {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.id = 'typing-indicator';
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('div');
    dot.className = 'typing-dot';
    indicator.appendChild(dot);
  }
  container.appendChild(indicator);
  scrollChatToBottom();
}

/**
 * Remove the typing indicator.
 */
function removeTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) indicator.remove();
}

/**
 * Auto-scroll chat messages to the bottom.
 */
function scrollChatToBottom() {
  const container = document.getElementById('chat-messages');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

/**
 * Attempt to navigate the content panel to a section relevant to the AI's response.
 * Looks for section IDs mentioned in the response text.
 * @param {string} responseText
 */
function navigateToRelevantSection(responseText) {
  const sectionKeywords = {
    projects: ['project', 'portfolio', 'built', 'developed', 'created'],
    experience: ['experience', 'career', 'job', 'worked at', 'role'],
    skills: ['skills', 'technolog', 'tech stack', 'tools', 'languages'],
    education: ['education', 'degree', 'university', 'college', 'academic'],
    contact: ['contact', 'email', 'reach out', 'get in touch', 'social'],
    about: ['about', 'background', 'bio', 'summary'],
    hero: ['hero', 'introduction', 'welcome']
  };

  const text = responseText.toLowerCase();
  let bestSection = null;
  let maxScore = 0;

  for (const [sectionId, keywords] of Object.entries(sectionKeywords)) {
    const score = keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);
    if (score > maxScore) {
      maxScore = score;
      bestSection = sectionId;
    }
  }

  if (bestSection && maxScore > 0) {
    // Small delay to allow rendering before scrolling
    setTimeout(() => scrollToSection(bestSection), 300);
  }
}