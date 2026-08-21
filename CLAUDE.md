# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Angel Investor** (`new.angelinvestor.pk`) — a marketing/pitch site for a Pakistan-based angel investor, built with Astro 7 + Tailwind v4. No SPA framework, no server-side app framework, no database — every page is static-rendered at build time. The only server-side code is a handful of tiny PHP endpoints (`public/api/*.php`) that proxy live PSX (Pakistan Stock Exchange) data for the homepage ticker, because the production host is plain cPanel with PHP but no persistent Node process.

Repo: https://github.com/oumamaalkawthar-byte/Angel-Investor (branch `main`). Same Hostinger/cPanel account (`akuedu`) as the unrelated `faithfuture` project, but a separate site/domain.

## Commands

```bash
npm install            # install dependencies (Node >=22.12.0 required, see package.json engines)
npm run dev             # dev server at localhost:4321
npm run build            # production build -> ./dist/
npm run preview          # preview the production build locally
npm run astro -- --help  # Astro CLI help (astro add, astro check, ...)
```

There is no test suite and no linter script configured. `astro dev --background` / `astro dev stop` / `astro dev status` / `astro dev logs` can be used to run the dev server in the background instead of foreground.

Copy `.env.example` to `.env` before running anything. Currently the only var is `PUBLIC_ALLOW_INDEXING` (see SEO note below) — leave it unset/`false` locally.

## Architecture

### Pages & content collections

- Pages live in `src/pages/**` (file-based routing, standard Astro). `astro.config.mjs` adds one redirect: `/apply` → `/apply-as-startup`.
- Two Markdown content collections defined in `src/content.config.ts`: `portfolio` (`src/content/portfolio/*.md` — company, industry, stage, summary, `featured` flag) and `blog` (`src/content/blog/*.md`). The homepage's "Featured Portfolio" grid filters on `data.featured`. Currently only placeholder/example entries exist in both (`example-startup.md`, `welcome.md`) — real content needs to be added there before launch.
- `src/layouts/BaseLayout.astro` is the single shared layout: sets title/description, includes `Header`/`Footer`, wires up Astro's `ClientRouter` (view transitions), and loads `src/scripts/motion.ts` globally for scroll-reveal (`[data-reveal]`) animations via GSAP.
- Client-side interactivity is plain TypeScript in `src/scripts/*.ts`, each attached via `document.addEventListener('astro:page-load', ...)` (so it re-runs correctly across Astro view-transition navigations, not just on first load) rather than any component framework.

### SEO indexing safety switch

`BaseLayout.astro` defaults to `<meta name="robots" content="noindex, nofollow">` on **every** page unless `PUBLIC_ALLOW_INDEXING=true` is set in the environment. `public/robots.txt` currently also blocks everything (`Disallow: /`). Both are intentional — the site is pre-launch. Before a real production go-live, both need to flip (env var to `true` on the production build, and `robots.txt` updated to a real sitemap-friendly policy) — don't do this as a side effect of an unrelated change.

### Market Pulse (live PSX data)

- `public/api/_lib.php` + `psx-quotes.php` / `psx-history.php` / `psx-symbols.php` are minimal PHP endpoints that scrape `dps.psx.com.pk` (mirroring the headers/approach of the `psxdata` Python project) and disk-cache the result under `public/api/cache/` (gitignored) — quotes 5 min, history 15 min per symbol, symbol list 24h — so PSX itself is polled at most once per cache window regardless of site traffic. Each falls back to serving a stale cached copy (up to several days old) rather than erroring, if the live PSX fetch fails.
- These are plain PHP files with **no build step** — Astro just copies `public/` verbatim into `dist/`, so they ride along in the static build and only actually work once deployed to a PHP-capable host. They will 404/do nothing in `npm run dev` or `npm run preview` — that's expected, not a bug; the Market Pulse panel degrades to a "Live market data is temporarily unavailable" state when the API calls fail, and you can rely on that state for local dev.
- `src/scripts/market-pulse.ts` is the client consumer: fetches quotes+symbols on load, renders a marquee ticker, a top-6 list, a symbol search box, and a hand-drawn SVG line/area chart with 1W/1M/3M/1Y range toggles, all from those three endpoints — no charting library.

### Valuation calculator

`src/components/ValuationCalculator.astro` + `src/scripts/valuation-calculator.ts` is a **fully client-side, no-backend** startup valuation tool in PKR:
- **Pre-revenue** stage → Berkus Method (5 qualitative factors scored via sliders, each capped by market-size factor).
- **Revenue-generating** stages → Revenue Multiple Method (ARR × sector base multiple × growth/stage/team/market adjustments).
Renders its own inline SVG bar charts (stacked for Berkus breakdown, diverging for Revenue Multiple adjustments) using a fixed 5-hue palette — no chart library. Nothing here is persisted or sent anywhere; it's a lead-gen/engagement tool, not a real valuation source.

### Forms are UI-only stubs — not wired to a backend yet

`src/scripts/apply-wizard.ts` (multi-step "Apply as Startup" wizard with a co-founder repeater) and `src/scripts/investor-form.ts` ("Join as Investor") both do this on submit: `preventDefault()`, generate a **fake** client-side reference number (`AI-2026-1234` style, `Math.random()`), and swap to a success view. **No data is sent anywhere** — no fetch/POST, no email, no sheet, no database. Contact form (`src/pages/contact.astro`) should be checked the same way before assuming any form on this site actually delivers submissions. Wiring these up to a real backend (an API route, a form service, email, etc.) is outstanding work, not something already done — don't assume submissions are being captured anywhere.

### Deployment (static output, no Node on the server)

Production host is cPanel with **no persistent Node runtime**, so the site is deployed as a prebuilt static `dist/` via cPanel's Git Version Control feature pulling a dedicated `deploy` branch — the `main` branch itself is never deployed directly.

- `scripts/deploy-dist.sh`: refuses to run with a dirty working tree, runs `npm run build`, then stages the contents of `dist/` (plus `.cpanel.yml.template` renamed to `.cpanel.yml`) as a commit on an orphan `deploy` branch (via a temporary `git worktree`, cleaned up after). **It does not push** — review `git log deploy --oneline -5`, then `git push origin deploy` yourself.
- `.cpanel.yml.template` is the template copied into that commit; its one deployment task copies everything to `/home/akuedu/public_html/new.angelinvestor.pk/`. It's a template on `main` (not itself deployed) — the real `.cpanel.yml` only exists on the `deploy` branch.
- Because `public/api/*.php` is copied verbatim into `dist/`, the PHP endpoints deploy automatically as part of the same static payload — no separate backend deploy step.

## Resuming this project on a new machine

```bash
git clone https://github.com/oumamaalkawthar-byte/Angel-Investor.git
cd Angel-Investor
cp .env.example .env
npm install
npm run dev
```

Git identity / auth for this account (`oumamaalkawthar-byte`) is the same across this user's repos — see that account's `gh` setup if pushing fails.

## Notes

- Tailwind v4 is wired in purely via the `@tailwindcss/vite` plugin in `astro.config.mjs` (no `tailwind.config.js` — v4 uses CSS-based config; check `src/styles/global.css` for theme tokens).
- GSAP (`gsap`) is the only animation dependency — used for scroll-reveals (`motion.ts`), the valuation calculator's animated counters/range bar, and scrolly-driven sections (`scrolly-steps.ts`, `episode-scroll.ts`, `impact-scroll.ts`).
- `src/scripts/form-widgets.ts` is shared UI plumbing (custom radio-cards, chip groups, file upload widgets) used by all three form-bearing pages/components — check there first for any cross-form widget bug.
