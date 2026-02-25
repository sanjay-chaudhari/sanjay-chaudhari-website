# sanjay.dev — Personal Portfolio

Personal portfolio website built with [Astro](https://astro.build), Tailwind CSS, and Markdown. Features a blog, projects showcase, and resume/about page. Content is managed via MD files in the repo — no CMS, no database.

## Stack

- **Framework** — Astro 5 (static site generation)
- **Styling** — Tailwind CSS v4
- **Content** — Markdown files via Astro Content Collections
- **Deployment** — Cloudflare Pages (auto-deploy on push)
- **Fonts** — Inter + JetBrains Mono (Google Fonts)

## Project Structure

```
src/
├── content/
│   ├── blog/           ← Blog post .md files
│   ├── projects/       ← Project .md files
│   └── config.ts       ← Collection schemas
├── layouts/
│   └── Layout.astro    ← Base layout (nav, footer, SEO)
├── pages/
│   ├── index.astro     ← Homepage (hero + latest posts + featured projects)
│   ├── blog/
│   │   ├── index.astro ← All posts list
│   │   └── [slug].astro← Individual post
│   ├── projects.astro  ← All projects
│   ├── about.astro     ← Resume / about
│   └── sitemap.xml.astro
└── styles/
    └── global.css
```

## Commands

```bash
npm install       # Install dependencies
npm run dev       # Dev server at localhost:4321
npm run build     # Build to ./dist
npm run preview   # Preview production build locally
```

## Adding Content

### New Blog Post

Create `src/content/blog/my-post-slug.md`:

```md
---
title: My Post Title
description: A short summary shown in listings and meta tags.
date: 2026-02-25
tags: ['.NET', 'AWS']
readingTime: 5
---

Your content here...
```

### New Project

Create `src/content/projects/my-project.md`:

```md
---
name: My Project
description: What it does in one or two sentences.
tags: ['C#', 'Docker', 'AWS']
github: https://github.com/you/repo
demo: https://demo.example.com
status: Active        # Active | Beta | Stable
featured: true        # true = shows on homepage (max 3)
---
```

## Content Flow

```
Write .md file → git push → Cloudflare Pages detects push
→ runs `npm run build` → Astro reads MD files via getCollection()
→ generates static HTML → deploys to CDN → live in ~30s
```

## SEO

Every page includes:
- Unique `<title>` and `<meta name="description">`
- Canonical URL
- Open Graph tags (title, description, image, type, site_name)
- Twitter card tags
- JSON-LD structured data (`Person` on all pages, `BlogPosting` on posts)
- `robots.txt` and XML sitemap

After deploying, submit your sitemap at [Google Search Console](https://search.google.com/search-console):
```
https://yourdomain.com/sitemap.xml
```

## Deployment (Cloudflare Pages)

### One-time setup (recommended)

1. Push repo to GitHub
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages → Create → Pages → Connect to Git
3. Select repo and set:
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Deploy — every `git push` auto-deploys after this

### Manual deploy

```bash
npm install -g wrangler
wrangler login
npm run build && wrangler pages deploy dist --project-name=your-project-name
```

## Configuration

Update these before deploying:

| File | What to change |
|---|---|
| `astro.config.mjs` | `site` URL |
| `src/layouts/Layout.astro` | Default description, social links |
| `src/pages/about.astro` | Your bio, experience, skills |
| `public/robots.txt` | Sitemap URL |
