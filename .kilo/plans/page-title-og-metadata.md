# Page title + Open Graph link preview

## Why

Pasted links currently preview as "AI Portfolio - Interactive Experience" with no description. Setting the page title to name + role and adding basic og: metadata makes the link card look right when pasted into an application or message.

## Change — `index.html` `<head>` only (single file)

Replace:

```html
<title>AI Portfolio - Interactive Experience</title>
```

with:

```html
<title>Ryan Loo Tuck Fatt — AI-Focused Software Engineer</title>
<meta name="description" content="Building practical AI-powered applications and intelligent systems that solve real-world problems.">
<meta property="og:title" content="Ryan Loo Tuck Fatt — AI-Focused Software Engineer">
<meta property="og:description" content="Building practical AI-powered applications and intelligent systems that solve real-world problems.">
<meta property="og:type" content="website">
```

Text sources (current `data/portfolio.json`):
- name: `personal.name` = "Ryan Loo Tuck Fatt"
- role: `personal.title` = "AI-Focused Software Engineer" (the hero role; note `resume.title` still reads "Full Stack Developer & AI Enthusiast" — that one is resume-only)
- description: `personal.tagline`

`meta name="description` is the standard fallback many unfurlers/search engines use when og:description is absent — same text, one line.

## Not in scope

- `og:image` / `twitter:card` — need an image asset; good follow-up for richer preview cards
- `og:url` — canonical domain is a Vercel-generated URL; add once a custom domain exists
- `config.json` `site.title` / `site.description` — editable in the admin but unused by the frontend (pre-existing quirk, untouched)
- Making these admin-editable — link crawlers don't run JS, so meta tags must stay in the static HTML head

## Verification

- Inspect `index.html` head: title + og:title + og:description present with the exact strings above
- After push, fetch the deployed site HTML and confirm the tags are served

## Deliverable

- Commit `index.html` only: `Add page title and Open Graph meta tags for link previews`, push to `origin/master`
