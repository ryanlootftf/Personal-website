# Fix resume PDF text-extraction order for ATS parsers

## Problem

`LooTuckFatt_Resume.pdf` renders correctly (visual = reference screenshot), but text extraction reads all `<li>` bullet groups at the **end** of the document (after Certifications & Skills) instead of under their entries. ATS systems parse the text stream, so this breaks resume parsing.

User's dump shows: name → contact → PROFILE → all company/role headings (no bullets) → EDUCATION → CERTIFICATIONS & SKILLS → then all bullets (TYM ×4, Independent ×3, Fujitsu ×3, Education ×2) in list order.

## Root cause

`scripts/generate-resume-pdf.js` → `buildHTML()` `<style>` block:

- `li { position: relative; ... }` (line 161)
- `li::before { content: '\\2022'; position: absolute; left: 3pt; }` (lines 164–168)

`position: relative` makes every `li` a positioned element. Per CSS painting order (Appendix E, step 8), positioned descendants with `z-index: auto` paint **after** all in-flow content of the stacking context. Chrome's PDF writer emits text into the PDF content stream in paint order, so all list-item text runs are written after every heading/paragraph. Glyph coordinates are correct (visual unaffected), but stream-order extraction — what pdfminer.six / pypdf / pdftotext (and therefore ATS parsers) use — sees bullets last.

The dump matches exactly: all `li`s in tree order (TYM list → Independent list → Fujitsu list → Education list) after all in-flow content. No other element in the template is positioned; `li` is the only culprit.

## Fix — keep visuals identical

In the `<style>` block of `buildHTML()`:

1. `li`: remove `position: relative;` (keep `padding-left: 12pt` so wrapped lines keep the hanging indent).
2. `li::before`: remove `position: absolute; left: 3pt;`, make it an in-flow inline glyph pulled into the padding:

```css
li::before {
  content: '\\2022';
  color: #888;
  margin-left: -9pt;
  margin-right: 5pt;
}
```

Tune `margin-left` / `margin-right` so the bullet lands at ~3pt and text stays at 12pt, matching the reference screenshot. Bullet color `#888` unchanged.

**Fallback** if spacing is awkward or Chrome still misorders: native markers —

```css
ul { list-style: disc outside; padding-left: 12pt; margin-bottom: 2pt; }
li { padding-left: 0; }
li::marker { color: #888; }
```

(hanging indent for free; bullet sits closer to the text — minor visual difference).

**Do not change:** visibility gating, section assembly/heading logic, `visibleSections` (currently `projects: false` — keep), or anything else.

## Tasks

1. Apply the CSS fix in `scripts/generate-resume-pdf.js` `buildHTML()`.
2. Regenerate: `node scripts/generate-resume-pdf.js` → writes `LooTuckFatt_Resume.pdf`.
3. Verify extraction order with a throwaway script in `C:\Users\ryanj\AppData\Local\Temp\kilo\` (do NOT add to the repo):
   - Inflate the page content streams (zlib), walk text-showing ops (`Tj`/`TJ`) in stream order, tracking `Tm`/`Td` positions and `Tf` font switches.
   - Decode glyph hex strings (`<0035>`-style CIDs) via each font's ToUnicode CMap (`bfchar`/`bfrange`) to get the true text dump.
   - Assert the dump reads in visual order: name → contact → PROFILE text → each entry's company/role lines **immediately followed by that entry's bullets** → EDUCATION (+ its bullets) → CERTIFICATIONS & SKILLS. No bullet group after the skills block.
   - Secondary assertion: text-run y-coordinates are non-increasing in stream order (single-column layout; equal y allowed for same-line runs).
4. Visual check: regenerated PDF matches the reference screenshot (bullet position, indents, spacing).
5. Commit only `scripts/generate-resume-pdf.js` + `LooTuckFatt_Resume.pdf` (NOT `git add -A`) and push to `origin/master`. Message e.g. `Fix resume PDF text extraction order for ATS parsers`. Alternative: click the admin dashboard's "🚀 Publish to GitHub" button.

## Validation

- Extracted text dump reads in visual order (bullets inline under their entries).
- Visual output unchanged vs the screenshot.
- `git status` clean after push; `git ls-remote origin master` shows the new commit.

## Risks

- Bullet x-position drift from negative margins — tune against the screenshot; fallback is native markers.
- The pseudo-element still emits its own text run (`•` separate from the sentence text) — harmless, same as today's output.
- If positioned/transformed CSS is added to the template later, the bug can return — keep list styling in-flow.

## Out of scope

- `visibleSections` config — Featured Projects stays hidden exactly as currently configured (matches the reference screenshot). Flag to the user in case it was unintentional.
- Empty `<h3>${e.company}</h3>` when company is `""` (small cosmetic gap on the "Independent Learning" entry) — noted, not changed unless requested.
- `admin/` panel (gitignored) — no changes needed there; this is generator-side only.
