/**
 * Vercel Serverless Function: /api/chat
 *
 * Primary:   NVIDIA Nim API (stepfun-ai/step-3.5-flash)
 * Fallback:  OpenRouter (minimax/minimax-m2.5:free)
 *
 * Environment Variables:
 *   NVIDIA_API_KEY      - API key for NVIDIA Nim
 *   NVIDIA_BASE_URL     - (optional) custom NVIDIA endpoint
 *   OPENROUTER_API_KEY   - API key for OpenRouter (fallback)
 *   OPENROUTER_BASE_URL  - (optional) custom OpenRouter endpoint
 */

import OpenAI from 'openai';

// ---- Configuration ----
const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

// Build the system prompt from portfolio data
function buildSystemMessage(portfolio) {
  if (!portfolio) return '';

  const { personal, about, experience, projects, skills, education, contact } = portfolio;

  let prompt = `You are an AI portfolio assistant for ${personal?.name || 'the portfolio owner'}. `;
  prompt += `Answer questions about their professional background, projects, skills, and experience. `;
  prompt += `Be concise (2-4 sentences). Reference specific projects/experience when relevant. `;
  prompt += `Keep it professional and slightly technical.\n\n`;

  if (personal) {
    prompt += `Name: ${personal.name}\nTitle: ${personal.title}\nTagline: ${personal.tagline}\n`;
    if (personal.bio) prompt += `Bio: ${personal.bio}\n`;
  }

  if (about) {
    prompt += `\nSummary: ${about.summary || ''}\n`;
    prompt += `Bio: ${about.bio || ''}\n`;
  }

  if (experience && experience.length) {
    prompt += `\nExperience:\n`;
    experience.forEach(e => {
      prompt += `- ${e.role} at ${e.company} (${e.duration}): ${e.description || ''}\n`;
      if (e.highlights) e.highlights.forEach(h => prompt += `  • ${h}\n`);
      if (e.tech) prompt += `  Technologies: ${e.tech.join(', ')}\n`;
    });
  }

  if (projects && projects.length) {
    prompt += `\nProjects:\n`;
    projects.forEach(p => {
      prompt += `- ${p.title}: ${p.tagline || ''} — ${p.description || ''}\n`;
      if (p.highlights) p.highlights.forEach(h => prompt += `  • ${h}\n`);
      if (p.tech) prompt += `  Tech: ${p.tech.join(', ')}\n`;
    });
  }

  if (skills) {
    prompt += `\nSkills:\n`;
    Object.entries(skills).forEach(([cat, items]) => {
      if (items?.length) prompt += `  ${cat}: ${items.join(', ')}\n`;
    });
  }

  if (education && education.length) {
    prompt += `\nEducation:\n`;
    education.forEach(e => {
      prompt += `- ${e.degree} at ${e.institution} (${e.year})\n`;
    });
  }

  if (contact) {
    prompt += `\nContact:\n`;
    if (contact.email) prompt += `  Email: ${contact.email}\n`;
    if (contact.github) prompt += `  GitHub: ${contact.github}\n`;
    if (contact.linkedin) prompt += `  LinkedIn: ${contact.linkedin}\n`;
  }

  prompt += `\nKeep responses concise and professional. Don't fabricate information.`;
  return prompt;
}

// ---- NVIDIA Nim API (via OpenAI SDK) ----
async function callNVIDIA(messages, model, temperature, max_tokens) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error('NVIDIA_API_KEY not configured');

  const nvidia = new OpenAI({
    apiKey,
    baseURL: NVIDIA_BASE_URL,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const completion = await nvidia.chat.completions.create({
      model: model || 'stepfun-ai/step-3.5-flash',
      messages,
      temperature: temperature ?? 1,
      top_p: 0.9,
      max_tokens: max_tokens ?? 2048
    });
    return completion.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---- OpenRouter Fallback ----
async function callOpenRouter(messages, model, temperature, max_tokens) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

  const url = `${OPENROUTER_BASE_URL}/chat/completions`;

  const body = {
    model: model || 'minimax/minimax-m2.5:free',
    messages,
    temperature: temperature ?? 0.7,
    max_tokens: max_tokens ?? 1024
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.VERCEL_URL || 'https://portfolio.vercel.app',
      'X-Title': 'AI Portfolio'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`OpenRouter API ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ---- Vercel Serverless Handler ----
export default async function handler(req, res) {
  // CORS headers for development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { messages, portfolio, model, temperature, max_tokens } = req.body || {};

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Invalid or missing messages array' });
    return;
  }

  // Build messages with system context
  const systemContent = buildSystemMessage(portfolio);
  const fullMessages = systemContent
    ? [{ role: 'system', content: systemContent }, ...messages]
    : messages;

  let response = '';
  let usedProvider = 'none';
  let error = null;

  // Primary: NVIDIA Nim
  if (process.env.NVIDIA_API_KEY) {
    try {
      console.log('Attempting NVIDIA Nim API call...');
      response = await callNVIDIA(fullMessages, model, temperature, max_tokens);
      usedProvider = 'nvidia';
      console.log('NVIDIA API succeeded');
    } catch (err) {
      error = err.message;
      console.warn('NVIDIA API failed:', err.message);
    }
  }

  // Fallback: OpenRouter
  if (!response && process.env.OPENROUTER_API_KEY) {
    try {
      console.log('Falling back to OpenRouter...');
      response = await callOpenRouter(fullMessages, model, temperature, max_tokens);
      usedProvider = 'openrouter';
      console.log('OpenRouter succeeded');
    } catch (err2) {
      error = (error ? `${error} | ` : '') + `OpenRouter: ${err2.message}`;
      console.warn('OpenRouter also failed:', err2.message);
    }
  }

  // If both failed
  if (!response) {
    res.status(503).json({
      error: 'All AI providers unavailable',
      details: error || 'No API keys configured. Set NVIDIA_API_KEY or OPENROUTER_API_KEY.'
    });
    return;
  }

  res.json({ response, provider: usedProvider });
}