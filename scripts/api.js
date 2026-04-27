/**
 * api.js - Sends chat messages to the Vercel serverless function.
 * Handles timeouts and fallback messages if the API is unreachable.
 */

const API_ENDPOINT = '/api/chat';
const TIMEOUT_MS = 25000;

/**
 * Send a message history to the API and get an AI response.
 * @param {Array<{role:string,content:string}>} messages - conversation so far
 * @param {Object} portfolioData - full portfolio object for context
 * @param {Object} configData - site config (model, temperature, etc.)
 * @returns {Promise<string>} the AI's response text
 */
export async function sendChatMessage(messages, portfolioData, configData) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const body = {
      messages,
      portfolio: portfolioData,
      model: configData?.ai?.model || 'meta/llama-3.1-405b-instruct',
      temperature: configData?.ai?.temperature ?? 0.7,
      max_tokens: configData?.ai?.max_tokens ?? 1024
    };

    const res = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error');
      throw new Error(`API returned ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data.response || 'I apologize, but I could not generate a response at this time.';
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      return 'The request timed out. Please try asking something simpler, or check back later.';
    }

    console.error('API call failed:', err);

    // Provide a fallback response using portfolio data
    return getFallbackResponse(messages, portfolioData);
  }
}

/**
 * Generate a simple fallback response when the AI API is unavailable.
 * Parses the last user message for keywords and matches against portfolio data.
 * @param {Array<{role:string,content:string}>} messages
 * @param {Object} portfolio
 * @returns {string}
 */
function getFallbackResponse(messages, portfolio) {
  const lastUserMsg = [...messages]
    .reverse()
    .find(m => m.role === 'user');

  if (!lastUserMsg) {
    return 'Hello! I\'m an AI assistant for Ryan Johnson. Ask me about his projects, experience, skills, or how to get in touch.';
  }

  const text = lastUserMsg.content.toLowerCase();

  // Projects
  if (/\bprojects?\b/.test(text) || /\bwork\b/.test(text) || /\bbuilt\b/.test(text)) {
    if (portfolio?.projects?.length) {
      const names = portfolio.projects.map(p => `• ${p.title} — ${p.tagline}`);
      return `Here are some of the projects I've worked on:\n${names.join('\n')}\n\nI can tell you more about any of them!`;
    }
  }

  // Experience
  if (/\bexperience\b/.test(text) || /\bcareer\b/.test(text) || /\bjob\b/.test(text) || /\bworked\b/.test(text)) {
    if (portfolio?.experience?.length) {
      const roles = portfolio.experience.map(e => `• ${e.role} at ${e.company} (${e.duration})`);
      return `Here's my career journey:\n${roles.join('\n')}\n\nWant more details about any role?`;
    }
  }

  // Skills
  if (/\bskills?\b/.test(text) || /\btechnologies?\b/.test(text) || /\btech stack\b/.test(text) || /\btools?\b/.test(text)) {
    if (portfolio?.skills) {
      const lines = [];
      if (portfolio.skills.languages?.length) lines.push(`Languages: ${portfolio.skills.languages.join(', ')}`);
      if (portfolio.skills.frameworks?.length) lines.push(`Frameworks: ${portfolio.skills.frameworks.join(', ')}`);
      if (portfolio.skills.cloud?.length) lines.push(`Cloud/DevOps: ${portfolio.skills.cloud.join(', ')}`);
      if (portfolio.skills.ai_ml?.length) lines.push(`AI/ML: ${portfolio.skills.ai_ml.join(', ')}`);
      return `Here's my tech stack:\n${lines.join('\n')}`;
    }
  }

  // Contact
  if (/\bcontact\b/.test(text) || /\bemail\b/.test(text) || /\breach out\b/.test(text) || /\bget in touch\b/.test(text)) {
    if (portfolio?.contact) {
      const contact = portfolio.contact;
      const links = [];
      if (contact.email) links.push(`✉ Email: ${contact.email}`);
      if (contact.github) links.push(` GitHub: ${contact.github}`);
      if (contact.linkedin) links.push(`ℹ LinkedIn: ${contact.linkedin}`);
      return `You can reach me through:\n${links.join('\n')}`;
    }
  }

  // Generic fallback
  return `I'm an AI assistant for Ryan Johnson. You can ask me about his:\n• Projects and portfolio work\n• Professional experience\n• Skills and tech stack\n• Education background\n• Contact information`;
}

/**
 * Fetch the system prompt text from the data file.
 * @returns {Promise<string>}
 */
export async function loadSystemPrompt() {
  try {
    const res = await fetch('/data/system-prompt.txt');
    if (res.ok) return await res.text();
  } catch (_) { /* ignore */ }
  return '';
}