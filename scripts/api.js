/**
 * api.js - Sends chat messages to the Vercel serverless function.
 * Handles client-side retry: 3 attempts NVIDIA → 3 attempts OpenRouter.
 * Each attempt is a fresh Vercel invocation (avoids 30s hard limit).
 * Only retries on timeouts — 4xx/5xx provider errors skip remaining attempts.
 */

const API_ENDPOINT = '/api/chat';
const PER_ATTEMPT_TIMEOUT = 28000; // 28s per attempt (just under Vercel's 30s)
const RETRY_DELAY = 1000;          // 1s delay between retries
const MAX_RETRIES = 3;

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is a timeout/abort (should trigger a retry).
 */
function isTimeoutError(err) {
  return err?.name === 'AbortError'
    || err?.message?.toLowerCase().includes('abort')
    || err?.message?.toLowerCase().includes('timeout')
    || err?.message?.toLowerCase().includes('timed out');
}

/**
 * Attempt a single API call to the specified provider.
 * @param {Object} body - request body (messages, portfolio, model, etc.)
 * @param {string} provider - 'nvidia' | 'openrouter'
 * @returns {Promise<{success: boolean, response?: string, isProviderError?: boolean}>}
 */
async function attemptProviderCall(body, provider) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PER_ATTEMPT_TIMEOUT);

  try {
    const res = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, provider }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // 4xx/5xx — provider error, should NOT retry
    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error');
      return { success: false, isProviderError: true, error: `API ${res.status}: ${errText}` };
    }

    const data = await res.json();
    return { success: true, response: data.response || 'I could not generate a response at this time.' };
  } catch (err) {
    clearTimeout(timeoutId);

    if (isTimeoutError(err)) {
      return { success: false, isProviderError: false, error: 'timeout' };
    }

    // Network error, fetch failed, etc.
    return { success: false, isProviderError: true, error: err.message };
  }
}

/**
 * Send a message history to the API and get an AI response.
 * Retry sequence: 3× NVIDIA → 3× OpenRouter
 * Only retries on timeouts; 4xx/5xx skips remaining attempts for that provider.
 * @param {Array<{role:string,content:string}>} messages - conversation so far
 * @param {Object} portfolioData - full portfolio object for context
 * @param {Object} configData - site config (model, temperature, etc.)
 * @returns {Promise<string>} the AI's response text
 */
export async function sendChatMessage(messages, portfolioData, configData) {
  const ai = configData?.ai || {};
  const baseBody = {
    messages,
    portfolio: portfolioData,
    nvidiaConfig: ai.nvidia || {
      model: 'stepfun-ai/step-3.5-flash',
      temperature: 1,
      max_tokens: 2048
    },
    openrouterConfig: ai.openrouter || {
      model: 'minimax/minimax-m2.5:free',
      temperature: 0.7,
      max_tokens: 1024
    }
  };

  // Phase 1: NVIDIA (3 attempts, retry only on timeout)
  for (let i = 1; i <= MAX_RETRIES; i++) {
    console.log(`🔵 NVIDIA attempt ${i}/${MAX_RETRIES} starting...`);
    const result = await attemptProviderCall(baseBody, 'nvidia');
    if (result.success) {
      console.log(`✅ NVIDIA attempt ${i}/${MAX_RETRIES} succeeded`);
      return result.response;
    }
    if (result.isProviderError) {
      console.error(`❌ NVIDIA attempt ${i}/${MAX_RETRIES} provider error (no retry): ${result.error}`);
      break; // real error → skip remaining NVIDIA attempts
    }
    // Timeout — retry with fresh Vercel invocation
    console.warn(`⏱  NVIDIA attempt ${i}/${MAX_RETRIES} timed out${i < MAX_RETRIES ? ', retrying...' : ' — no retries left'}`);
    if (i < MAX_RETRIES) {
      await sleep(RETRY_DELAY);
    }
  }

  // Phase 2: OpenRouter (3 attempts, retry only on timeout)
  for (let i = 1; i <= MAX_RETRIES; i++) {
    console.log(`🟢 OpenRouter attempt ${i}/${MAX_RETRIES} starting...`);
    const result = await attemptProviderCall(baseBody, 'openrouter');
    if (result.success) {
      console.log(`✅ OpenRouter attempt ${i}/${MAX_RETRIES} succeeded`);
      return result.response;
    }
    if (result.isProviderError) {
      console.error(`❌ OpenRouter attempt ${i}/${MAX_RETRIES} provider error (no retry): ${result.error}`);
      break; // real error → skip remaining OpenRouter attempts
    }
    // Timeout — retry with fresh Vercel invocation
    console.warn(`⏱  OpenRouter attempt ${i}/${MAX_RETRIES} timed out${i < MAX_RETRIES ? ', retrying...' : ' — no retries left'}`);
    if (i < MAX_RETRIES) {
      await sleep(RETRY_DELAY);
    }
  }

  // All 6 attempts failed — use portfolio fallback response
  console.warn('⚠️  All 6 AI provider attempts (3 NVIDIA + 3 OpenRouter) failed, using portfolio fallback');
  return getFallbackResponse(messages, portfolioData);
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