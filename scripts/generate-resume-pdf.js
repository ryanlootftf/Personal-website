/**
 * generate-resume-pdf.js
 * Run locally to generate resume.pdf from portfolio.json data.
 *
 * Usage:
 *   node scripts/generate-resume-pdf.js
 *
 * Requires puppeteer (devDependency):
 *   npm install --save-dev puppeteer
 *
 * Output: ./resume.pdf
 */

import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function loadJSON(relativePath) {
  return JSON.parse(readFileSync(resolve(ROOT, relativePath), 'utf-8'));
}

function buildHTML(resume) {
  const { name, title, profile, contact, links, featuredProjects, experience, education, technicalSkills, certifications, languages } = resume;

  // Contact + links merged into one line with clickable labels
  const parts = [];
  if (contact.email) parts.push(contact.email);
  if (contact.phone) parts.push(contact.phone);
  if (links.linkedin) parts.push(`<a href="${links.linkedin}">LinkedIn</a>`);
  if (links.github) parts.push(`<a href="${links.github}">GitHub</a>`);
  if (links.website) parts.push(`<a href="${links.website}">Website</a>`);
  const contactLine = parts.join('  |  ');

  // Featured Projects
  const fpHTML = (featuredProjects || []).map(fp => `
    <div class="entry">
      <h3>${fp.title}</h3>
      <p class="desc">${fp.description}</p>
      ${fp.highlights?.length ? `<ul>${fp.highlights.map(h => `<li>${h}</li>`).join('')}</ul>` : ''}
    </div>
  `).join('');

  // Experience — company as header, then italicized role + duration
  const expHTML = experience.map(e => `
    <div class="entry">
      <h3>${e.company}</h3>
      <div class="role-line"><em>${e.role}</em> — ${e.duration}</div>
      ${e.highlights?.length ? `<ul>${e.highlights.map(h => `<li>${h}</li>`).join('')}</ul>` : ''}
    </div>
  `).join('');

  // Education — institution as header, then italicized degree + year
  const eduHTML = education.map(e => `
    <div class="entry">
      <h3>${e.institution}</h3>
      <div class="role-line"><em>${e.degree}</em> — ${e.year}</div>
      ${e.achievements?.length ? `<ul>${e.achievements.map(a => `<li>${a}</li>`).join('')}</ul>` : ''}
    </div>
  `).join('');

  // Skills & Certifications merged section
  const tsHTML = technicalSkills?.length ? `<div class="inline-line"><strong>Technical Skills:</strong> ${technicalSkills.join(', ')}</div>` : '';
  const certHTML = certifications?.length ? `<div class="inline-line"><strong>Certifications:</strong> ${certifications.join(', ')}</div>` : '';
  const langHTML = languages?.length ? `<div class="inline-line"><strong>Languages:</strong> ${languages.join(', ')}</div>` : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 15mm 15mm 20mm 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.45;
    color: #1a1a1a;
  }
  h1 {
    font-size: 18pt;
    font-weight: 700;
    margin-bottom: 4pt;
    text-transform: uppercase;
    letter-spacing: 0.5pt;
  }
  .contact-line {
    font-size: 9pt;
    color: #555;
    margin-bottom: 8pt;
  }
  a { color: #2563eb; text-decoration: none; }

  h2 {
    font-size: 11pt;
    text-transform: uppercase;
    letter-spacing: 1.5pt;
    border-bottom: 1px solid #aaa;
    padding-bottom: 3pt;
    margin-top: 16pt;
    margin-bottom: 8pt;
  }
  h3 {
    font-size: 11pt;
    font-weight: 600;
    margin-bottom: 1pt;
  }
  .profile-text {
    font-size: 9.5pt;
    line-height: 1.5;
    color: #333;
    margin-bottom: 2pt;
  }
  .entry {
    margin-bottom: 9pt;
  }
  .role-line {
    font-size: 9.5pt;
    color: #444;
    margin-bottom: 3pt;
  }
  .desc {
    font-size: 9pt;
    color: #444;
    margin-bottom: 3pt;
    line-height: 1.4;
  }
  ul {
    list-style: none;
    padding-left: 0;
    margin-bottom: 2pt;
  }
  li {
    font-size: 9pt;
    color: #444;
    padding-left: 12pt;
    position: relative;
    line-height: 1.4;
  }
  li::before {
    content: '\\2022';
    position: absolute;
    left: 3pt;
    color: #888;
  }
  .inline-line {
    font-size: 9pt;
    color: #444;
    margin-bottom: 3pt;
    line-height: 1.45;
  }
</style>
</head>
<body>
  <h1>${name}</h1>
  ${contactLine ? `<div class="contact-line">${contactLine}</div>` : ''}

  <h2>Profile</h2>
  <p class="profile-text">${profile}</p>

  <h2>Work Experience</h2>
  ${expHTML}

  <h2>Featured Projects</h2>
  ${fpHTML}

  <h2>Education</h2>
  ${eduHTML}

  <h2>Certifications & Skills</h2>
  ${tsHTML}
  ${certHTML}
  ${langHTML}
</body>
</html>`;
}

async function main() {
  const portfolio = loadJSON('data/portfolio.json');
  const resume = portfolio.resume;
  if (!resume) {
    console.error('❌ No "resume" key found in data/portfolio.json');
    process.exit(1);
  }

  const html = buildHTML(resume);
  const htmlPath = resolve(ROOT, '_resume_temp.html');
  writeFileSync(htmlPath, html);

  const pdfPath = resolve(ROOT, 'resume.pdf');

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', right: '15mm', bottom: '20mm', left: '15mm' },
  });

  await browser.close();

  // Clean up temp HTML
  try { writeFileSync(htmlPath, ''); } catch {}

  console.log(`✅ PDF generated: ${pdfPath}`);
}

main().catch(err => {
  console.error('❌ PDF generation failed:', err);
  process.exit(1);
});