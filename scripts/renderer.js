/**
 * renderer.js - Renders portfolio sections into the content panel.
 * Takes portfolio data from data-loader and builds each section's DOM.
 */

/**
 * @param {Object} data - The full portfolio.json object
 */
export function renderPortfolio(data) {
  const panel = document.getElementById('content-panel');
  panel.innerHTML = ''; // Clear loading state

  const sections = [];

  // ---------- Hero ----------
  sections.push(renderHero(data.personal));

  // ---------- About ----------
  if (data.about) {
    sections.push(renderAbout(data.about));
  }

  // ---------- Experience ----------
  if (data.experience && data.experience.length) {
    sections.push(renderExperience(data.experience));
  }

  // ---------- Projects ----------
  if (data.projects && data.projects.length) {
    sections.push(renderProjects(data.projects));
  }

  // ---------- Skills ----------
  if (data.skills) {
    sections.push(renderSkills(data.skills));
  }

  // ---------- Education ----------
  if (data.education && data.education.length) {
    sections.push(renderEducation(data.education));
  }

  // ---------- Contact ----------
  if (data.contact) {
    sections.push(renderContact(data.contact));
  }

  sections.forEach(el => panel.appendChild(el));
}

/* ---------- Utility ---------- */

function createSection(id, label, title) {
  const div = document.createElement('div');
  div.className = 'panel-section';
  div.dataset.sectionId = id;

  if (label) {
    const labelEl = document.createElement('div');
    labelEl.className = 'section-label';
    labelEl.textContent = label;
    div.appendChild(labelEl);
  }

  if (title) {
    const titleEl = document.createElement('h2');
    titleEl.className = 'section-title';
    titleEl.textContent = title;
    div.appendChild(titleEl);
  }

  return div;
}

/**
 * Convert a string to a URL-safe slug for use as an element ID.
 * "DevOps Automation Suite" -> "devops-automation-suite"
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/* ---------- Individual section renderers ---------- */

function renderHero(personal) {
  const section = createSection('hero');

  const heroDiv = document.createElement('div');
  heroDiv.className = 'hero-section';

  const avatarUrl = personal.avatar;
  if (avatarUrl) {
    const img = document.createElement('img');
    img.className = 'avatar';
    img.src = avatarUrl;
    img.alt = personal.name;
    heroDiv.appendChild(img);
  }

  const nameEl = document.createElement('h1');
  nameEl.className = 'name';
  nameEl.textContent = personal.name;

  const titleEl = document.createElement('p');
  titleEl.className = 'title';
  titleEl.textContent = personal.title;

  const taglineEl = document.createElement('p');
  taglineEl.className = 'tagline';
  taglineEl.textContent = personal.tagline;

  heroDiv.appendChild(nameEl);
  heroDiv.appendChild(titleEl);
  heroDiv.appendChild(taglineEl);

  section.appendChild(heroDiv);
  return section;
}

function renderAbout(about) {
  const section = createSection('about', 'About', 'About Me');

  const aboutDiv = document.createElement('div');
  aboutDiv.className = 'about-section';

  const summary = document.createElement('p');
  summary.className = 'summary';
  summary.textContent = about.summary;

  const bio = document.createElement('p');
  bio.className = 'bio';
  bio.textContent = about.bio;

  aboutDiv.appendChild(summary);
  aboutDiv.appendChild(bio);
  section.appendChild(aboutDiv);
  return section;
}

function renderExperience(experiences) {
  const section = createSection('experience', 'Career Journey', 'Experience');

  const timeline = document.createElement('div');
  timeline.className = 'experience-timeline';

  experiences.forEach(exp => {
    const item = document.createElement('div');
    item.className = 'experience-item';
    item.setAttribute('data-element-id', slugify(exp.company));

    const duration = document.createElement('span');
    duration.className = 'duration';
    duration.textContent = exp.duration;

    const role = document.createElement('h3');
    role.textContent = exp.role;

    const company = document.createElement('span');
    company.className = 'company';
    company.textContent = exp.company;

    const desc = document.createElement('p');
    desc.className = 'description';
    desc.textContent = exp.description;

    item.appendChild(duration);
    item.appendChild(role);
    item.appendChild(company);
    item.appendChild(desc);

    if (exp.highlights && exp.highlights.length) {
      const ul = document.createElement('ul');
      ul.className = 'highlights';
      exp.highlights.forEach(h => {
        const li = document.createElement('li');
        li.textContent = h;
        ul.appendChild(li);
      });
      item.appendChild(ul);
    }

    if (exp.tech && exp.tech.length) {
      const tags = document.createElement('div');
      tags.className = 'tech-tags';
      exp.tech.forEach(t => {
        const span = document.createElement('span');
        span.className = 'tech-tag';
        span.textContent = t;
        tags.appendChild(span);
      });
      item.appendChild(tags);
    }

    timeline.appendChild(item);
  });

  section.appendChild(timeline);
  return section;
}

function renderProjects(projects) {
  const section = createSection('projects', 'Featured Projects', 'Recent Work');

  const grid = document.createElement('div');
  grid.className = 'projects-grid';

  projects.forEach(proj => {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.setAttribute('data-element-id', slugify(proj.title));
    if (proj.featured) card.classList.add('featured');

    const title = document.createElement('h3');
    title.textContent = proj.title;

    const tagline = document.createElement('p');
    tagline.className = 'tagline';
    tagline.textContent = proj.tagline;

    const desc = document.createElement('p');
    desc.className = 'description';
    desc.textContent = proj.description;

    card.appendChild(title);
    card.appendChild(tagline);
    card.appendChild(desc);

    if (proj.highlights && proj.highlights.length) {
      const ul = document.createElement('ul');
      ul.className = 'highlights';
      proj.highlights.forEach(h => {
        const li = document.createElement('li');
        li.textContent = h;
        ul.appendChild(li);
      });
      card.appendChild(ul);
    }

    if (proj.tech && proj.tech.length) {
      const techStack = document.createElement('div');
      techStack.className = 'tech-stack';
      proj.tech.forEach(t => {
        const span = document.createElement('span');
        span.className = 'tech-tag';
        span.textContent = t;
        techStack.appendChild(span);
      });
      card.appendChild(techStack);
    }

    if (proj.links) {
      const linksDiv = document.createElement('div');
      linksDiv.className = 'project-links';
      if (proj.links.live) {
        const a = document.createElement('a');
        a.href = proj.links.live;
        a.target = '_blank';
        a.textContent = 'Live Demo';
        linksDiv.appendChild(a);
      }
      if (proj.links.github) {
        const a = document.createElement('a');
        a.href = proj.links.github;
        a.target = '_blank';
        a.textContent = 'Source';
        a.className = 'btn-secondary';
        linksDiv.appendChild(a);
      }
      if (linksDiv.children.length) {
        card.appendChild(linksDiv);
      }
    }

    grid.appendChild(card);
  });

  section.appendChild(grid);
  return section;
}

function renderSkills(skills) {
  const section = createSection('skills', 'Technologies', 'Skills & Tools');

  const container = document.createElement('div');
  container.className = 'skills-container';

  const categoryMap = {
    languages: 'Languages',
    frameworks: 'Frameworks & Libraries',
    databases: 'Databases & Storage',
    cloud: 'Cloud & DevOps',
    ai_ml: 'AI / Machine Learning'
  };

  Object.entries(categoryMap).forEach(([key, label]) => {
    if (skills[key] && skills[key].length) {
      const cat = document.createElement('div');
      cat.className = 'skill-category';

      const h3 = document.createElement('h3');
      h3.textContent = label;
      cat.appendChild(h3);

      const tags = document.createElement('div');
      tags.className = 'skill-tags';
      skills[key].forEach(s => {
        const span = document.createElement('span');
        span.className = 'skill-tag';
        span.textContent = s;
        tags.appendChild(span);
      });
      cat.appendChild(tags);
      container.appendChild(cat);
    }
  });

  section.appendChild(container);
  return section;
}

function renderEducation(education) {
  const section = createSection('education', 'Education', 'Academic Background');

  const list = document.createElement('div');
  list.className = 'education-list';

  education.forEach(edu => {
    const item = document.createElement('div');
    item.className = 'education-item';

    const h3 = document.createElement('h3');
    h3.textContent = edu.institution;

    const degree = document.createElement('p');
    degree.className = 'degree';
    degree.textContent = edu.degree;

    const year = document.createElement('p');
    year.className = 'year';
    year.textContent = edu.year;

    item.appendChild(h3);
    item.appendChild(degree);
    item.appendChild(year);

    if (edu.achievements && edu.achievements.length) {
      const ul = document.createElement('ul');
      ul.className = 'achievements';
      edu.achievements.forEach(a => {
        const li = document.createElement('li');
        li.textContent = a;
        ul.appendChild(li);
      });
      item.appendChild(ul);
    }

    list.appendChild(item);
  });

  section.appendChild(list);
  return section;
}

function renderContact(contact) {
  const section = createSection('contact', 'Get In Touch', 'Contact');

  const linksDiv = document.createElement('div');
  linksDiv.className = 'contact-links';

  const mapping = [
    { key: 'email', icon: '✉', href: `mailto:${contact.email}` },
    { key: 'github', icon: '', href: contact.github },
    { key: 'linkedin', icon: 'ℹ', href: contact.linkedin },
    { key: 'twitter', icon: '𝕏', href: contact.twitter }
  ];

  mapping.forEach(m => {
    if (contact[m.key]) {
      const a = document.createElement('a');
      a.className = 'contact-link';
      a.href = m.href;
      a.target = '_blank';

      const icon = document.createElement('span');
      icon.className = 'icon';
      icon.textContent = m.icon;

      const label = document.createElement('span');
      label.textContent = m.key.charAt(0).toUpperCase() + m.key.slice(1);

      a.appendChild(icon);
      a.appendChild(label);
      linksDiv.appendChild(a);
    }
  });

  section.appendChild(linksDiv);
  return section;
}