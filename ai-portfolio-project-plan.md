# AI-Powered Portfolio Website - Project Plan v2.0

## Project Overview
A personal portfolio website with an AI-powered chat interface that answers visitor questions about professional experience, projects, and work history. Features a split-screen layout with chat on the left and a single-page scrollable portfolio on the right with AI-controlled section navigation.

## Design Goals
- **Simple tech stack**: HTML + CSS + JavaScript (no frameworks)
- **NVIDIA NIM integration**: Leverage NVIDIA's AI inference platform
- **Single-page design**: One continuous scroll with anchor sections
- **AI-controlled navigation**: Agent scrolls to relevant sections via #href
- **Easy to update**: Edit JSON files to update content
- **Cost-effective**: Leverage free/low-cost tiers
- **Extensible**: Easy to add more sections later

---

## Tech Stack

### Frontend
- **Pure HTML/CSS/JavaScript**
  - Single `index.html` with split layout (chat left, single-page content right)
  - Vanilla JS for chat interface and API calls
  - CSS Grid/Flexbox for responsive layout
  - Smooth scroll behavior for section navigation
  - No build process required

### AI Logic - NVIDIA NIM Integration

#### Chosen Approach: Vercel Serverless Functions ✅

**Why Vercel:**
- **Simplest Setup**: Single file backend, deploys with frontend
- **Secure**: Environment variables managed in Vercel dashboard
- **Zero Maintenance**: Auto-scaling, no server management
- **One Deployment**: Frontend + backend in same repo
- **Free Tier**: 100GB bandwidth + 100hrs serverless execution/month
- **Multi-Model Support**: Easy to add fallback AI providers

**How It Works:**
```
User Browser → Vercel Edge Network → Serverless Function → NVIDIA NIM API
                                   → (Fallback: OpenAI/Anthropic)
```

**File Location:**
- Backend: `/api/chat.js` (single file in your repo)
- Frontend calls: `fetch('/api/chat')`
- Environment: `NVIDIA_API_KEY` set in Vercel dashboard

**Multi-Model Fallback Strategy:**
The serverless function intelligently fallback to alternative AI provider:
1. **Primary**: NVIDIA NIM (Llama 3.1)
2. **Fallback**: OpenRouter (supports 100+ models - uses Llama 3.1 equivalent or best available)

This ensures your portfolio chat always works, even if NVIDIA NIM has downtime or issues.

### Content Storage
**Static JSON Files** stored in `/data/` folder:
- `resume.json` - Work experience, skills, education
- `projects.json` - Portfolio projects with descriptions
- `system-prompt.txt` - Instructions for the AI assistant

### Hosting
- **Vercel** (recommended - handles both frontend and backend)
  - Free static hosting + serverless functions
  - Global CDN
  - Automatic HTTPS
  - Git integration (auto-deploy on push)
  - Built-in environment variable management
  - Analytics included
- Alternative: Netlify (similar serverless function support)

---

## Architecture

### File Structure
```
portfolio/
├── api/
│   └── chat.js            # Vercel serverless function (entire backend!)
├── data/
│   ├── config.json        # Site configuration & section order
│   ├── portfolio.json     # All portfolio data (unified structure)
│   └── system-prompt.txt  # AI instructions
├── scripts/
│   ├── chat.js            # Chat interface logic
│   ├── api.js             # Frontend API client
│   ├── scroll-control.js  # Smooth scroll to sections
│   ├── renderer.js        # Dynamic section renderer (JSON → HTML)
│   └── data-loader.js     # Load and manage JSON data
├── styles/
│   ├── main.css           # Layout and theme
│   ├── chat.css           # Chat-specific styles
│   └── sections.css       # Section-specific styles (templates)
├── index.html             # Minimal shell (chat + empty content panel)
├── vercel.json            # Vercel configuration (optional)
└── package.json           # Dependencies for serverless function (optional)
```

### Single-Page Scrolling Architecture

**HTML Structure** - Minimal markup, all content rendered from JSON:
```html
<main id="content-panel">
  <!-- Sections dynamically generated from data files -->
  <!-- JavaScript reads JSON and creates sections on page load -->
</main>
```

**Dynamic Rendering Strategy**:
- On page load, JavaScript fetches all JSON data files
- For each section in the data, generate corresponding HTML
- Insert sections into DOM with proper IDs (#hero, #about, etc.)
- No hardcoded content in HTML - everything comes from JSON
- **Benefits**: 
  - Update content by editing JSON only
  - Add/remove sections without touching HTML
  - Easy to reorder sections via JSON configuration
  - Same data feeds both UI and AI

**AI-Controlled Navigation**:
- AI detects user intent and returns section anchor in response
- JavaScript triggers smooth scroll to `#section-id`
- Visual indicator shows current section
- AI can reference multiple sections in conversation

---

## Dynamic Rendering Approach

### Core Concept
**Zero hardcoded content** - The HTML file is just a shell. All sections, content, and layout are generated from JSON files at runtime.

### How It Works

**1. Page Load Sequence**
```javascript
// On page load:
1. Fetch config.json (defines sections and their order)
2. Fetch portfolio.json (all content data)
3. For each section in config, call renderer
4. Renderer generates HTML from data + templates
5. Insert sections into DOM
6. Initialize scroll behavior and AI
```

**2. Renderer System**
```javascript
// renderer.js - Core rendering logic
const sectionRenderers = {
  hero: (data) => `
    <section id="hero" class="section">
      <h1>${data.name}</h1>
      <p class="title">${data.title}</p>
      <p class="tagline">${data.tagline}</p>
    </section>
  `,
  
  about: (data) => `
    <section id="about" class="section">
      <h2>About</h2>
      <p>${data.summary}</p>
      <p>${data.bio}</p>
    </section>
  `,
  
  experience: (data) => `
    <section id="experience" class="section">
      <h2>Experience</h2>
      ${data.map(job => `
        <div class="experience-item">
          <h3>${job.position} at ${job.company}</h3>
          <span class="duration">${job.duration}</span>
          <p>${job.description}</p>
          <ul>
            ${job.highlights.map(h => `<li>${h}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
    </section>
  `,
  
  projects: (data) => `
    <section id="projects" class="section">
      <h2>Projects</h2>
      <div class="projects-grid">
        ${data.map(project => `
          <div class="project-card">
            <img src="${project.image}" alt="${project.name}">
            <h3>${project.name}</h3>
            <p>${project.description}</p>
            <div class="tech-stack">
              ${project.technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
            </div>
            ${project.link ? `<a href="${project.link}" target="_blank">View Project</a>` : ''}
          </div>
        `).join('')}
      </div>
    </section>
  `,
  
  skills: (data) => `
    <section id="skills" class="section">
      <h2>Skills</h2>
      <div class="skills-container">
        <div class="skill-category">
          <h3>Technical</h3>
          ${data.technical.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
        </div>
        <div class="skill-category">
          <h3>Tools</h3>
          ${data.tools.map(tool => `<span class="skill-tag">${tool}</span>`).join('')}
        </div>
      </div>
    </section>
  `,
  
  contact: (data) => `
    <section id="contact" class="section">
      <h2>Contact</h2>
      <div class="contact-links">
        ${data.email ? `<a href="mailto:${data.email}">Email</a>` : ''}
        ${data.linkedin ? `<a href="${data.linkedin}" target="_blank">LinkedIn</a>` : ''}
        ${data.github ? `<a href="${data.github}" target="_blank">GitHub</a>` : ''}
      </div>
    </section>
  `
};

// Main render function
function renderPortfolio(config, data) {
  const contentPanel = document.getElementById('content-panel');
  
  config.sections.forEach(sectionConfig => {
    const { id, enabled } = sectionConfig;
    
    if (!enabled) return; // Skip disabled sections
    
    const renderer = sectionRenderers[id];
    const sectionData = data[id];
    
    if (renderer && sectionData) {
      const html = renderer(sectionData);
      contentPanel.insertAdjacentHTML('beforeend', html);
    }
  });
}
```

**3. Benefits of This Approach**
- ✅ **Content Updates**: Edit JSON, refresh page - no HTML changes needed
- ✅ **Section Management**: Enable/disable sections in config.json
- ✅ **Reordering**: Change section order in config without touching code
- ✅ **Consistency**: Same data feeds UI and AI (single source of truth)
- ✅ **Extensibility**: Add new section by creating renderer + adding data
- ✅ **A/B Testing**: Swap different data files to test content variations

---

## User Flow

### Example Interaction 1: Simple Navigation
1. **Visitor asks**: "Show me your projects"
2. **Browser** sends message to `/api/chat` (Vercel serverless function)
3. **Vercel Function** tries NVIDIA NIM first
   - If it fails, automatically tries OpenRouter
4. **AI responds**: Conversational answer + `{"scrollTo": "#projects"}`
5. **Frontend** smoothly scrolls right panel to projects section
6. **Result**: Chat answer + automatic navigation to relevant content

### Example Interaction 2: Multi-Section Reference with Fallback
1. **Visitor asks**: "What experience do you have with React?"
2. **Vercel Function** calls NVIDIA NIM with portfolio data
3. **If NVIDIA NIM times out/fails**: Automatically uses OpenRouter as backup
4. **AI analyzes** experience and projects data
5. **AI responds**: "I've used React in several contexts..." + `{"scrollTo": "#experience", "highlight": ["Company X", "Project Y"]}`
6. **Frontend** scrolls to experience, optionally highlights relevant items
7. **Follow-up**: "You can also see React projects below" + gentle scroll hint

### Multi-Model Fallback in Action
```
User sends message
    ↓
Vercel Function receives request
    ├─ Try NVIDIA NIM ✓ (succeeds - use this)
    │
    └─ Try NVIDIA NIM ✗ (fails)
        └─ Try OpenRouter ✓ (succeeds - use this)

User always gets a response (or learns why they can't)
```

### Content Update Flow (Simplified!)
1. Edit `portfolio.json` (e.g., add new project or update experience)
2. Optionally adjust section order in `config.json`
3. Refresh page (or commit to Git for auto-deployment)
4. Renderer automatically generates new HTML from updated data
5. AI automatically has access to new content
6. **No HTML or JavaScript changes needed!**

---

## Vercel Deployment & Environment Setup

### Step 1: Set Up Git Repository
```bash
# Create your portfolio repo
git init portfolio
cd portfolio

# Create the api directory
mkdir -p api data scripts styles

# Create minimal files
touch api/chat.js data/config.json data/portfolio.json index.html
```

### Step 2: Add Environment Variables to Vercel

1. **Push repo to GitHub**
   ```bash
   git remote add origin https://github.com/yourusername/portfolio
   git push -u origin main
   ```

2. **Go to [vercel.com](https://vercel.com)**
   - Click "Import Project"
   - Select your portfolio repository
   - Click "Import"

3. **Add Environment Variables** in Vercel Dashboard:
   - Go to Project Settings → Environment Variables
   - Add the following:

   **Required (NVIDIA NIM - Primary):**
   ```
   NVIDIA_API_KEY = your_nvidia_nim_api_key_here
   ```

   **Fallback Option (Recommended):**
   ```
   OPENROUTER_API_KEY = your_openrouter_api_key_here
   ```

4. **Deploy!**
   - Vercel automatically deploys
   - Your serverless function is now live at `https://yourproject.vercel.app/api/chat`

### Step 3: Call Your API from Frontend

```javascript
// scripts/api.js
async function sendMessage(message, conversationHistory = []) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        conversationHistory
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      message: data.message,
      provider: data.provider || 'unknown', // Shows which AI was used (nvidia, openai, anthropic)
      timestamp: data.timestamp
    };
  } catch (error) {
    console.error('Chat API error:', error);
    throw error;
  }
}

export { sendMessage };
```

### System Prompt Strategy
Include instructions for section navigation in `data/system-prompt.txt`:
```
You are an AI assistant representing [Your Name]'s portfolio.
You have access to their complete resume and project history.

When answering questions:
- Be conversational and helpful
- Reference specific experiences and projects
- When relevant, indicate which section to scroll to using this format:
  SCROLL_TO: #section-id
  
Available sections:
- #hero - Introduction
- #about - About/Summary
- #experience - Work history
- #projects - Portfolio projects
- #skills - Technical skills
- #contact - Contact information

Examples:
- If asked about projects: "I've worked on several projects! SCROLL_TO: #projects"
- If asked about experience: "Here's my work history... SCROLL_TO: #experience"
- If asked about skills: "I have experience with many technologies! SCROLL_TO: #skills"

Always be helpful and guide the visitor to relevant sections.
```

### Key Advantages of This Setup

✅ **No Backend to Manage** - Vercel handles everything  
✅ **Keys Completely Hidden** - Never exposed to frontend  
✅ **Auto-Scaling** - Handles traffic spikes automatically  
✅ **Free Tier** - 100GB bandwidth, 100 hours serverless execution/month  
✅ **One Command Deploy** - Just `git push`  
✅ **Automatic HTTPS** - Built-in security  
✅ **Multi-Provider Fallback** - Always works (tries NVIDIA → OpenAI → Anthropic)  
✅ **Provider Tracking** - Frontend knows which AI responded  
✅ **Easy Updates** - Edit JSON, push to Git, instant deploy

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- [ ] Create GitHub repository with folder structure
- [ ] Create basic HTML layout with chat + content panel
- [ ] Build chat interface UI (messages, input field)
- [ ] Set up Vercel serverless function skeleton (`api/chat.js`)
- [ ] Create `config.json` and `portfolio.json` templates

### Phase 2: Dynamic Rendering & Data (Week 1-2)
- [ ] Implement `renderer.js` with section templates
- [ ] Implement `data-loader.js` to fetch and render JSON
- [ ] Create actual portfolio data in JSON files
- [ ] Write system prompt for AI with navigation instructions
- [ ] Test dynamic rendering with sample data

### Phase 3: AI Integration & Multi-Model Fallback (Week 2)
- [ ] Implement full `api/chat.js` with NVIDIA NIM (primary)
- [ ] Add OpenAI fallback to serverless function
- [ ] Add Anthropic fallback to serverless function
- [ ] Test each provider individually
- [ ] Test fallback chain (NVIDIA → OpenAI → Anthropic)
- [ ] Implement error handling and logging

### Phase 4: Frontend-Backend Connection (Week 2)
- [ ] Implement `scripts/api.js` to call `/api/chat`
- [ ] Build chat message handling and display
- [ ] Connect chat responses to scroll navigation
- [ ] Parse AI responses for SCROLL_TO directives
- [ ] Implement smooth scrolling to sections

### Phase 5: Polish & Deploy (Week 2-3)
- [ ] Responsive design (mobile/tablet/desktop)
- [ ] Loading states and spinners
- [ ] Error messages and retry logic
- [ ] Visual feedback (which AI provider was used)
- [ ] Set up environment variables in Vercel
- [ ] Deploy to Vercel (just push to GitHub!)
- [ ] Custom domain setup (optional)
- [ ] Test full flow end-to-end

### Phase 6: Future Enhancements
- [ ] Section highlighting/emphasis based on context
- [ ] Conversation memory between visits
- [ ] Add blog posts or articles section
- [ ] Analytics integration
- [ ] Voice input support

---

## Key Benefits

✅ **100% Data-Driven** - All content from JSON, zero hardcoded HTML  
✅ **Single-Page Experience** - No page loads, smooth scrolling navigation  
✅ **AI-Guided Navigation** - Intelligent section jumping based on conversation  
✅ **NVIDIA NIM Powered** - Primary AI provider with Llama 3.1  
✅ **OpenRouter Fallback** - Reliable backup with 100+ models to choose from  
✅ **Effortless Updates** - Edit one JSON file, everything updates automatically  
✅ **Section Management** - Enable/disable/reorder sections via config  
✅ **Simple Tech** - Vanilla JavaScript, no frameworks, easy to maintain  
✅ **Secure** - All API keys hidden in Vercel dashboard  
✅ **Scalable** - Frontend on CDN, backend on auto-scaling serverless  
✅ **Extensible** - Add new sections by creating renderer + adding data  
✅ **Single Source of Truth** - Same data feeds both UI and AI  
✅ **Reliable** - Always has a fallback provider if primary fails  

---

## Technical Considerations

### Security
- NVIDIA NIM API key stored in backend environment variables
- Never expose API key to client-side code
- Implement rate limiting on backend (e.g., 10 requests/minute per IP)
- Sanitize user inputs before sending to API
- CORS configuration for frontend-backend communication

### Performance
- All sections load on initial page load (fast with static content)
- Lazy load images in projects section
- Cache AI responses for identical questions (optional)
- Use CSS `scroll-behavior: smooth` for native smooth scrolling
- Debounce scroll events if tracking current section

### Scroll Navigation Logic
```javascript
// Example: Parse AI response and scroll
function handleAIResponse(response) {
  const scrollMatch = response.match(/SCROLL_TO:\s*(#[\w-]+)/);
  
  if (scrollMatch) {
    const sectionId = scrollMatch[1];
    const targetSection = document.querySelector(sectionId);
    
    if (targetSection) {
      targetSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
      
      // Optional: Visual highlight
      targetSection.classList.add('highlighted');
      setTimeout(() => {
        targetSection.classList.remove('highlighted');
      }, 2000);
    }
  }
}
```

### Cost Estimation
- **Vercel Hosting** (Frontend + Serverless): Free tier (100GB bandwidth, 100 hrs/month)
- **NVIDIA NIM API**: Check current pricing (likely per-request or per-token)
- **OpenRouter Fallback** (Optional): Pricing varies by model used (~$0.001-0.01 per request)
- **Domain**: ~$10-15/year (optional)

**Expected monthly cost**: 
- **Just NVIDIA**: $5-30 depending on traffic
- **With OpenRouter fallback**: $5-50 (you pay only for the provider that handles the request)

**Vercel Free Tier is More Than Enough:**
- 100 GB bandwidth/month (easily covers 1000+ visitors)
- 100 hours serverless execution (each chat is ~100ms, so 1000s of chats)
- No costs for the backend infrastructure itself!

---

## Data Structure Examples

### config.json (Site Configuration)
```json
{
  "site": {
    "title": "Your Name - Portfolio",
    "description": "AI-powered portfolio website",
    "theme": "dark"
  },
  "sections": [
    { "id": "hero", "enabled": true },
    { "id": "about", "enabled": true },
    { "id": "experience", "enabled": true },
    { "id": "projects", "enabled": true },
    { "id": "skills", "enabled": true },
    { "id": "contact", "enabled": true }
  ],
  "ai": {
    "model": "meta/llama-3.1-405b-instruct",
    "temperature": 0.7,
    "max_tokens": 1024
  }
}
```

### portfolio.json (Unified Data Structure)
```json
{
  "hero": {
    "name": "Your Name",
    "title": "Full Stack Developer & AI Enthusiast",
    "tagline": "Building intelligent web experiences",
    "avatar": "/images/avatar.jpg"
  },
  "about": {
    "summary": "I'm a developer passionate about creating innovative solutions...",
    "bio": "With over X years of experience in software development, I specialize in..."
  },
  "experience": [
    {
      "id": "exp-1",
      "company": "Company Name",
      "position": "Senior Developer",
      "duration": "2022 - Present",
      "description": "Leading development of scalable web applications...",
      "highlights": [
        "Architected microservices platform serving 1M+ users",
        "Reduced API response time by 60%",
        "Mentored team of 5 junior developers"
      ],
      "technologies": ["React", "Node.js", "PostgreSQL"]
    },
    {
      "id": "exp-2",
      "company": "Previous Company",
      "position": "Developer",
      "duration": "2020 - 2022",
      "description": "Built customer-facing features...",
      "highlights": [
        "Developed real-time chat system",
        "Improved test coverage from 40% to 85%"
      ],
      "technologies": ["Vue.js", "Python", "MongoDB"]
    }
  ],
  "projects": [
    {
      "id": "project-1",
      "name": "AI Portfolio Website",
      "tagline": "Interactive portfolio with AI assistant",
      "description": "A modern portfolio site featuring an AI-powered chat interface that helps visitors learn about my work and experience.",
      "technologies": ["JavaScript", "NVIDIA NIM", "Node.js"],
      "link": "https://yoursite.com",
      "github": "https://github.com/you/portfolio",
      "image": "/images/projects/portfolio.jpg",
      "featured": true,
      "highlights": [
        "Dynamic section rendering from JSON",
        "AI-controlled navigation",
        "Serverless architecture"
      ]
    },
    {
      "id": "project-2",
      "name": "E-Commerce Platform",
      "tagline": "Full-stack shopping experience",
      "description": "Built a complete e-commerce solution with payment processing, inventory management, and admin dashboard.",
      "technologies": ["React", "Express", "Stripe", "PostgreSQL"],
      "link": "https://demo.com",
      "image": "/images/projects/ecommerce.jpg",
      "featured": true
    }
  ],
  "skills": {
    "technical": [
      "JavaScript/TypeScript",
      "Python",
      "React/Vue.js",
      "Node.js/Express",
      "PostgreSQL/MongoDB",
      "Docker/Kubernetes"
    ],
    "tools": [
      "Git/GitHub",
      "VS Code",
      "Figma",
      "Postman",
      "AWS/GCP"
    ],
    "soft": [
      "Technical Leadership",
      "Code Review",
      "Agile/Scrum",
      "Documentation"
    ]
  },
  "education": [
    {
      "institution": "University Name",
      "degree": "B.S. Computer Science",
      "year": "2020",
      "achievements": ["Dean's List", "CS Award"]
    }
  ],
  "contact": {
    "email": "your@email.com",
    "linkedin": "https://linkedin.com/in/yourprofile",
    "github": "https://github.com/yourusername",
    "twitter": "https://twitter.com/yourhandle"
  }
}
```

### Minimal index.html (Just a Shell)
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portfolio</title>
  <link rel="stylesheet" href="/styles/main.css">
  <link rel="stylesheet" href="/styles/chat.css">
  <link rel="stylesheet" href="/styles/sections.css">
</head>
<body>
  <div id="app">
    <!-- Chat Panel (Left) -->
    <aside id="chat-panel">
      <div id="chat-messages"></div>
      <div id="chat-input-container">
        <input type="text" id="chat-input" placeholder="Ask me anything...">
        <button id="send-btn">Send</button>
      </div>
    </aside>
    
    <!-- Content Panel (Right) - Dynamically populated -->
    <main id="content-panel">
      <!-- All sections rendered here from portfolio.json -->
      <div id="loading">Loading portfolio...</div>
    </main>
  </div>
  
  <script type="module" src="/scripts/data-loader.js"></script>
  <script type="module" src="/scripts/renderer.js"></script>
  <script type="module" src="/scripts/scroll-control.js"></script>
  <script type="module" src="/scripts/chat.js"></script>
  <script type="module" src="/scripts/api.js"></script>
  <script type="module">
    // Initialize on page load
    import { loadAndRender } from './scripts/data-loader.js';
    import { initChat } from './scripts/chat.js';
    
    window.addEventListener('DOMContentLoaded', async () => {
      await loadAndRender();
      initChat();
    });
  </script>
</body>
</html>
```

### system-prompt.txt
```
You are an AI assistant representing [Your Name]'s professional portfolio website.

Your role:
- Answer questions about their experience, projects, and skills
- Be conversational, friendly, and professional
- Provide specific examples when possible
- Guide visitors to relevant sections

IMPORTANT - Section Navigation:
When a question relates to a specific section, include this directive:
SCROLL_TO: #section-id

Available sections:
- #hero - Introduction/landing
- #about - About/bio
- #experience - Work history
- #projects - Portfolio projects
- #skills - Technical skills and tools
- #contact - Contact information

Examples:
Q: "What projects have you built?"
A: "I've worked on several interesting projects! [brief overview] SCROLL_TO: #projects"

Q: "Where have you worked?"
A: "I have experience at [companies]... SCROLL_TO: #experience"

Context - Professional Data:
[Resume JSON will be injected here]
[Projects JSON will be injected here]
```

---

## Vercel Serverless Function (Complete Backend)

### api/chat.js - NVIDIA + OpenRouter Fallback
```javascript
// api/chat.js - Your entire backend in one file!

import fs from 'fs';
import path from 'path';

// Helper to load data files
function loadData() {
  try {
    const portfolioData = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'data/portfolio.json'), 'utf8')
    );
    const systemPrompt = fs.readFileSync(
      path.join(process.cwd(), 'data/system-prompt.txt'), 'utf8'
    );
    return { portfolioData, systemPrompt };
  } catch (error) {
    console.error('Error loading data:', error);
    return null;
  }
}

// NVIDIA NIM API call
async function callNvidiaAPI(messages) {
  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'meta/llama-3.1-405b-instruct',
      messages,
      temperature: 0.7,
      max_tokens: 1024,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`NVIDIA API error: ${response.status}`);
  }

  return response.json();
}

// OpenRouter fallback
async function callOpenRouter(messages) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://yourportfolio.com' // Optional - helps with rate limits
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.1-405b-instruct', // Same model as NVIDIA, or let OpenRouter choose best
      messages,
      temperature: 0.7,
      max_tokens: 1024
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  return response.json();
}

// Main handler with intelligent fallback
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Invalid message' });
    }

    // Load portfolio data and system prompt
    const data = loadData();
    if (!data) {
      return res.status(500).json({ error: 'Failed to load portfolio data' });
    }

    const { portfolioData, systemPrompt } = data;

    // Build messages array
    const messages = [
      {
        role: 'system',
        content: `${systemPrompt}\n\nPortfolio Data:\n${JSON.stringify(portfolioData, null, 2)}`
      },
      ...conversationHistory,
      {
        role: 'user',
        content: message
      }
    ];

    let response;
    let provider = 'nvidia';

    try {
      // Try NVIDIA NIM first (primary)
      response = await callNvidiaAPI(messages);
      console.log('✅ NVIDIA NIM successful');
    } catch (nvidiaError) {
      console.warn('⚠️ NVIDIA NIM failed:', nvidiaError.message);
      
      try {
        // Fallback to OpenRouter
        response = await callOpenRouter(messages);
        provider = 'openrouter';
        console.log('✅ OpenRouter fallback successful');
      } catch (openrouterError) {
        console.error('❌ Both NVIDIA NIM and OpenRouter failed');
        throw new Error('AI providers unavailable: ' + openrouterError.message);
      }
    }

    // Extract the AI's response
    const aiMessage = response.choices[0].message.content;

    // Return response with metadata
    return res.status(200).json({
      message: aiMessage,
      provider, // Let frontend know which provider was used
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({ 
      error: 'Failed to get AI response',
      details: error.message 
    });
  }
}
```

### What OpenRouter Offers:
- **100+ models** to choose from
- **Unified API** - works like OpenAI's API
- **No vendor lock-in** - switch models anytime
- **Good pricing** - often cheaper than direct APIs
- **Rate limiting included** - handles abuse prevention
- **Perfect fallback** - if NVIDIA fails, OpenRouter has many alternatives

### package.json (Optional - only if using imports)
```json
{
  "type": "module",
  "dependencies": {}
}
```

### vercel.json (Optional Configuration)
```json
{
  "functions": {
    "api/chat.js": {
      "maxDuration": 30
    }
  }
}
```



---

## Complete Data Loader Example

### data-loader.js
```javascript
// data-loader.js - Load data and trigger rendering
import { renderPortfolio } from './renderer.js';

let portfolioData = null;
let configData = null;

/**
 * Load all data files
 */
async function loadData() {
  try {
    const [config, portfolio] = await Promise.all([
      fetch('/data/config.json').then(r => {
        if (!r.ok) throw new Error('Failed to load config');
        return r.json();
      }),
      fetch('/data/portfolio.json').then(r => {
        if (!r.ok) throw new Error('Failed to load portfolio data');
        return r.json();
      })
    ]);
    
    configData = config;
    portfolioData = portfolio;
    
    return { config, portfolio };
  } catch (error) {
    console.error('Error loading data:', error);
    showError('Failed to load portfolio data. Please refresh the page.');
    throw error;
  }
}

/**
 * Load data and render portfolio
 */
export async function loadAndRender() {
  const loadingEl = document.getElementById('loading');
  
  try {
    const { config, portfolio } = await loadData();
    
    // Remove loading indicator
    if (loadingEl) {
      loadingEl.remove();
    }
    
    // Render all sections
    renderPortfolio(config, portfolio);
    
    // Update page title
    document.title = config.site.title;
    
    return { config, portfolio };
  } catch (error) {
    if (loadingEl) {
      loadingEl.innerHTML = '<p class="error">Failed to load portfolio. Please try again.</p>';
    }
  }
}

/**
 * Get loaded data (for use by other modules)
 */
export function getData() {
  return { config: configData, portfolio: portfolioData };
}

/**
 * Show error message
 */
function showError(message) {
  const contentPanel = document.getElementById('content-panel');
  contentPanel.innerHTML = `
    <div class="error-container">
      <h2>Oops!</h2>
      <p>${message}</p>
    </div>
  `;
}
```

### renderer.js (Complete Implementation)
```javascript
// renderer.js - Transform JSON data into HTML sections
const sectionRenderers = {
  hero: (data) => {
    return `
      <section id="hero" class="section hero-section">
        ${data.avatar ? `<img src="${data.avatar}" alt="${data.name}" class="avatar">` : ''}
        <h1 class="name">${data.name}</h1>
        <p class="title">${data.title}</p>
        <p class="tagline">${data.tagline}</p>
      </section>
    `;
  },
  
  about: (data) => {
    return `
      <section id="about" class="section about-section">
        <h2>About Me</h2>
        <div class="about-content">
          <p class="summary">${data.summary}</p>
          ${data.bio ? `<p class="bio">${data.bio}</p>` : ''}
        </div>
      </section>
    `;
  },
  
  experience: (data) => {
    if (!Array.isArray(data) || data.length === 0) return '';
    
    return `
      <section id="experience" class="section experience-section">
        <h2>Experience</h2>
        <div class="experience-timeline">
          ${data.map(job => `
            <div class="experience-item" data-id="${job.id}">
              <div class="experience-header">
                <h3>${job.position}</h3>
                <span class="company">${job.company}</span>
              </div>
              <span class="duration">${job.duration}</span>
              <p class="description">${job.description}</p>
              ${job.highlights && job.highlights.length > 0 ? `
                <ul class="highlights">
                  ${job.highlights.map(h => `<li>${h}</li>`).join('')}
                </ul>
              ` : ''}
              ${job.technologies && job.technologies.length > 0 ? `
                <div class="tech-tags">
                  ${job.technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </section>
    `;
  },
  
  projects: (data) => {
    if (!Array.isArray(data) || data.length === 0) return '';
    
    return `
      <section id="projects" class="section projects-section">
        <h2>Projects</h2>
        <div class="projects-grid">
          ${data.map(project => `
            <div class="project-card ${project.featured ? 'featured' : ''}" data-id="${project.id}">
              ${project.image ? `
                <div class="project-image">
                  <img src="${project.image}" alt="${project.name}" loading="lazy">
                </div>
              ` : ''}
              <div class="project-content">
                <h3>${project.name}</h3>
                ${project.tagline ? `<p class="tagline">${project.tagline}</p>` : ''}
                <p class="description">${project.description}</p>
                ${project.highlights && project.highlights.length > 0 ? `
                  <ul class="highlights">
                    ${project.highlights.map(h => `<li>${h}</li>`).join('')}
                  </ul>
                ` : ''}
                <div class="tech-stack">
                  ${project.technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
                </div>
                <div class="project-links">
                  ${project.link ? `<a href="${project.link}" target="_blank" rel="noopener" class="btn-primary">View Project</a>` : ''}
                  ${project.github ? `<a href="${project.github}" target="_blank" rel="noopener" class="btn-secondary">GitHub</a>` : ''}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  },
  
  skills: (data) => {
    return `
      <section id="skills" class="section skills-section">
        <h2>Skills</h2>
        <div class="skills-container">
          ${data.technical && data.technical.length > 0 ? `
            <div class="skill-category">
              <h3>Technical Skills</h3>
              <div class="skill-tags">
                ${data.technical.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
              </div>
            </div>
          ` : ''}
          ${data.tools && data.tools.length > 0 ? `
            <div class="skill-category">
              <h3>Tools & Platforms</h3>
              <div class="skill-tags">
                ${data.tools.map(tool => `<span class="skill-tag">${tool}</span>`).join('')}
              </div>
            </div>
          ` : ''}
          ${data.soft && data.soft.length > 0 ? `
            <div class="skill-category">
              <h3>Soft Skills</h3>
              <div class="skill-tags">
                ${data.soft.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </section>
    `;
  },
  
  contact: (data) => {
    return `
      <section id="contact" class="section contact-section">
        <h2>Get In Touch</h2>
        <div class="contact-links">
          ${data.email ? `<a href="mailto:${data.email}" class="contact-link">
            <span class="icon">✉️</span>
            <span>Email</span>
          </a>` : ''}
          ${data.linkedin ? `<a href="${data.linkedin}" target="_blank" rel="noopener" class="contact-link">
            <span class="icon">💼</span>
            <span>LinkedIn</span>
          </a>` : ''}
          ${data.github ? `<a href="${data.github}" target="_blank" rel="noopener" class="contact-link">
            <span class="icon">💻</span>
            <span>GitHub</span>
          </a>` : ''}
          ${data.twitter ? `<a href="${data.twitter}" target="_blank" rel="noopener" class="contact-link">
            <span class="icon">🐦</span>
            <span>Twitter</span>
          </a>` : ''}
        </div>
      </section>
    `;
  }
};

/**
 * Main render function - generates all sections from data
 */
export function renderPortfolio(config, data) {
  const contentPanel = document.getElementById('content-panel');
  
  if (!contentPanel) {
    console.error('Content panel not found');
    return;
  }
  
  // Clear any existing content
  contentPanel.innerHTML = '';
  
  // Render sections in order specified by config
  config.sections.forEach(sectionConfig => {
    const { id, enabled } = sectionConfig;
    
    // Skip disabled sections
    if (!enabled) return;
    
    // Get renderer and data for this section
    const renderer = sectionRenderers[id];
    const sectionData = data[id];
    
    if (renderer && sectionData) {
      try {
        const html = renderer(sectionData);
        if (html.trim()) {
          contentPanel.insertAdjacentHTML('beforeend', html);
        }
      } catch (error) {
        console.error(`Error rendering section ${id}:`, error);
      }
    }
  });
  
  console.log('Portfolio rendered successfully');
}

/**
 * Re-render a specific section (useful for dynamic updates)
 */
export function rerenderSection(sectionId, data) {
  const existingSection = document.getElementById(sectionId);
  const renderer = sectionRenderers[sectionId];
  
  if (existingSection && renderer && data) {
    const html = renderer(data);
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const newSection = temp.firstElementChild;
    
    existingSection.replaceWith(newSection);
  }
}
```

---

## Next Steps

1. **Get API Keys**:
   - NVIDIA NIM API Key: [build.nvidia.com](https://build.nvidia.com)
   - OpenRouter API Key: [openrouter.ai](https://openrouter.ai)

2. **Create GitHub Repository**: Push your code

3. **Connect to Vercel**:
   - Import repository at [vercel.com](https://vercel.com)
   - Add environment variables in Vercel dashboard:
     - `NVIDIA_API_KEY`
     - `OPENROUTER_API_KEY`
   - Deploy! (automatic on each push)

4. **Build Out Content**:
   - Fill in `portfolio.json` with your actual content
   - Customize system prompt for your voice
   - Adjust `config.json` sections as needed

5. **Test Everything**:
   - Test NVIDIA NIM directly
   - Test OpenRouter fallback (temporarily disable NVIDIA key to simulate failure)
   - Verify fallback chain works
   - Test all chat interactions
   - Check responsive design

6. **Polish & Launch**:
   - Add custom domain (optional)
   - Set up analytics (optional)
   - Share with the world!

---

## Resources & Documentation

- [NVIDIA NIM Documentation](https://docs.nvidia.com/nim/)
- [NVIDIA API Catalog & Models](https://build.nvidia.com/)
- [OpenRouter Documentation](https://openrouter.ai/docs)
- [OpenRouter Model Availability](https://openrouter.ai/models)
- [Vercel Docs](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [MDN Smooth Scrolling](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-behavior)
- [MDN Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

---

**Project Status**: Planning Phase - Final Architecture  
**Last Updated**: April 27, 2026  
**Estimated Timeline**: 2-3 weeks for MVP  
**Final Architecture Summary**:
- ✅ Vercel Serverless Functions (no backend to manage)
- ✅ NVIDIA NIM (primary) + OpenRouter (fallback)
- ✅ 100% Data-driven UI (all content from JSON)
- ✅ Single-page scroll design with AI navigation
- ✅ Environment keys completely secure in Vercel dashboard
- ✅ Always reliable (two independent AI providers)
