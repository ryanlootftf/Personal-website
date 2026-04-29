/**
 * chat.js - Manages the chat UI, message history, and interaction flow.
 * Integrates with api.js for AI responses and scroll-control.js for context-aware replies.
 */

import { sendChatMessage, loadSystemPrompt } from './api.js';
import { getPortfolioData, getConfigData } from './data-loader.js';
import { scrollToSection, scrollToElement, registerSections, animateScroll } from './scroll-control.js';

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
 * Known technology keywords that are explicitly in the portfolio data.
 * Used by the hallucination detector to verify AI claims.
 * @returns {Set<string>}
 */
function getKnownPortfolioTech() {
  const portfolio = getPortfolioData();
  if (!portfolio) return new Set();

  const tech = new Set();

  // Collect all tech from experience entries
  if (portfolio.experience) {
    portfolio.experience.forEach(e => {
      if (e.tech) e.tech.forEach(t => tech.add(t.toLowerCase()));
    });
  }

  // Collect all tech from projects
  if (portfolio.projects) {
    portfolio.projects.forEach(p => {
      if (p.tech) p.tech.forEach(t => tech.add(t.toLowerCase()));
    });
  }

  // Collect all skills
  if (portfolio.skills) {
    Object.values(portfolio.skills).forEach(list => {
      if (Array.isArray(list)) list.forEach(s => tech.add(s.toLowerCase()));
    });
  }

  // Add common aliases
  const aliases = {
    'javascript': ['js', 'ecmascript', 'es6', 'es2015'],
    'typescript': ['ts'],
    'python': ['py'],
    'react': ['react.js', 'reactjs'],
    'tensorflow': ['tf', 'tensorflow.js'],
    'websocket': ['ws', 'socket.io', 'socketio'],
  };

  // Check if each known tech has any of its aliases
  // Also add common generic domain terms that are safe
  const safeGeneric = [
    'rest', 'restful', 'api', 'real-time', 'realtime', 'realtime',
    'scalable', 'cloud-native', 'microservices', 'serverless',
    'ci/cd', 'cicd', 'pipeline', 'automation', 'monitoring'
  ];
  safeGeneric.forEach(t => tech.add(t));

  return tech;
}

/**
 * Detect potential hallucinations in the AI response.
 * Checks if the response mentions specific technical implementation details
 * that are NOT present in the portfolio data.
 * @param {string} response
 * @returns {boolean} true if likely hallucinated content detected
 */
function detectHallucinations(response) {
  // Patterns that suggest invented implementation details
  const hallucinationPatterns = [
    // Specific library versions: "ws library", "Express v4", "Socket.io"
    /\b(ws\s+library|socket\.io|socketio|express\s+v?\d|fastify|hapi|knex|mongoose|prisma|typeorm)\b/i,
    // Specific architectural patterns with library names
    /\b(redis\s+pub[/-]?sub|rabbitmq|kafka|nats)\b/i,
    // Specific deployment tools not in portfolio
    /\b(alb|elb|ec2|s3\s+bucket|cloudfront|route53|nginx\s+config|docker[\s-]?compose|helm|istio)\b/i,
    // Specific database details
    /\b(mongodb\s+atlas|postgresql\s+(with\s+)?pg|aurora|dynamodb\s+(tables|streams))\b/i,
    // Specific API patterns
    /\b(\/api\/|\/v1\/|\/v2\/|\/graphql|rest\s+(endpoints?|apis?))\b/i,
    // Claiming specific implementation techniques
    /\b(implemented\s+(a\s+)?(custom\s+)?(middleware|plugin|hook|decorator|pipeline\s+(using\s+)?))\b/i,
  ];

  // Check for hallucination patterns
  for (const pattern of hallucinationPatterns) {
    if (pattern.test(response)) {
      console.warn('🔍 Hallucination detector: matched pattern', pattern);
      return true;
    }
  }

  return false;
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

    // Try to navigate based on the AI's navigation tag
    const { cleanResponse, navSection, navElement } = parseNavigationTag(response);

    // Run hallucination detection on the cleaned response
    let displayResponse = cleanResponse;
    if (detectHallucinations(cleanResponse)) {
      displayResponse += '\n\n*Note: Some implementation details were not specified in the portfolio data. Please refer to the portfolio section for verified information.*';
    }

    // Add AI response (tag stripped from display)
    addMessage('ai', displayResponse);
    messageHistory.push({ role: 'assistant', content: response });
    if (navSection) {
      setTimeout(() => {
        if (navElement) {
          scrollToElement(navSection, navElement);
        } else {
          scrollToSection(navSection);
        }
      }, 300);
    } else {
      // Fall back to keyword-based navigation
      navigateToRelevantSection(response);
    }
  } catch (err) {
    console.error('Chat error:', err);
    removeTypingIndicator();
    addMessage('ai', 'I encountered an error. Please try again.');
  } finally {
    isProcessing = false;
  }
}

/**
 * Parse a line of text into an array of text and code segments.
 * Splits on backtick-wrapped sections: `code`
 * @param {string} line
 * @returns {Array<{type:'text'|'code', value:string}>}
 */
function parseLineSegments(line) {
  const segments = [];
  const regex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(line)) !== null) {
    // Text before the backtick
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: line.slice(lastIndex, match.index) });
    }
    // Code segment
    segments.push({ type: 'code', value: match[1] });
    lastIndex = regex.lastIndex;
  }
  // Remaining text after last backtick
  if (lastIndex < line.length) {
    segments.push({ type: 'text', value: line.slice(lastIndex) });
  }
  // If no backticks found, return the whole line as text
  if (segments.length === 0) {
    segments.push({ type: 'text', value: line });
  }
  return segments;
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
    const segments = parseLineSegments(line);

    segments.forEach(seg => {
      if (seg.type === 'code') {
        const code = document.createElement('code');
        code.textContent = seg.value;
        p.appendChild(code);
      } else {
        p.appendChild(document.createTextNode(seg.value));
      }
    });

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
    animateScroll(container, container.scrollHeight, 400);
  }
}

/**
 * Parse a navigation tag from the AI response.
 * Format: [navigate:sectionId] or [navigate:sectionId:elementId]
 * Returns the cleaned response (with tag stripped) and the nav params.
 * @param {string} text
 * @returns {{cleanResponse:string, navSection:string|null, navElement:string|null}}
 */
function parseNavigationTag(text) {
  const match = text.match(/\[navigate:([a-z-]+)(?::([a-z0-9-]+))?\]/i);
  if (!match) {
    return { cleanResponse: text, navSection: null, navElement: null };
  }

  const navSection = match[1].toLowerCase();
  const navElement = match[2] || null;
  const cleanResponse = text.replace(match[0], '').trim();

  return { cleanResponse, navSection, navElement };
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