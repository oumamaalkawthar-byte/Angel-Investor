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
- Two Markdown content collections defined in `src/content.config.ts`: `portfolio` (`src/content/portfolio/*.md` — company, industry, stage, summary, `featured` flag) and `blog` (`src/content/blog/*.md` — title, description, pubDate, author, plus optional `category`/`readTime`/`art`/`image` used by the blog index's card artwork). The `featured` flag isn't consumed by anything right now — the homepage's old "Featured Portfolio" grid that used to filter on it was removed (see status section); `src/pages/blog/[slug].astro` renders any collection entry automatically. Portfolio still only has one placeholder entry (`example-startup.md`) — real companies need to be added before launch. The blog collection has 8 entries with real copy and (where `art: photo`) real event photos from `public/events/`, but the *articles themselves* are still placeholder/sample editorial content, not real published posts — see status section below.
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

`/apply-as-startup`, `/join-as-investor` and `/contact` were rebuilt from a supplied design package (`src/components/forms/FormShell.astro` + `src/styles/form-pages.css` + `src/scripts/form-pages.ts`, all `.ai-*`-prefixed and isolated like the blog/legal pages — see the note below on that pattern). `FormShell` wraps `BaseLayout` itself (so each page just passes props + slotted content, no duplicate Header/Footer) and renders a shared full-bleed dark hero that bleeds under the floating nav (`margin-top:-80px` cancelling `<main class="pt-20">`, same trick as the homepage/About heroes).

The supplied package deliberately ships **no submission logic or success state** (see its own `CLAUDE_PROMPT.txt` — visual-only handoff, backend explicitly out of scope). `form-pages.ts` adds all of it, following this project's `astro:page-load` pattern (not the package's original `DOMContentLoaded`, which would never re-fire on Astro's client-side view-transition navigation):
- **Startup** (4-step wizard, up to 3 co-founders): `validatePanel()` runs each step's `[required]` fields via `checkValidity()`/`reportValidity()` before advancing *or* on final submit — needed because a step's fields sit in a `display:none` panel while inactive, and hidden-required fields are silently skipped by native HTML validation, so without this a user could reach the end without ever filling steps 1–3.
- **Investor** is a single page (not paginated) — native `form.reportValidity()` is sufficient.
- **Contact** — same pattern, no reference number.
- All three: `preventDefault()`, generate a **fake** client-side reference (`AI-2026-1234` / `AI-INV-2026-1234`, `Math.random()`), swap `[data-form-view]` for a `[data-success-view]` block (added fresh in each page — the supplied markup had neither). **No data is sent anywhere** — no fetch/POST, no email, no sheet, no database. Wiring a real backend is still the biggest piece of remaining work before launch.
- Field `name`s changed with the redesign (e.g. investor fields are all `investor_*`-prefixed) — if you ever do wire a backend, read the *current* markup's `name` attributes rather than assuming the old ones still apply.

The old `src/scripts/apply-wizard.ts` / `investor-form.ts` and their bespoke `src/components/form/{ChipGroup,FileUpload,CheckLine}.astro` were deleted as part of this swap. `FormField.astro` and `RadioCardGroup.astro` survived — `ValuationCalculator.astro` still uses them and is unrelated to this redesign.

### Deployment (static output, no Node on the server)

Production host is cPanel with **no persistent Node runtime**, so the site is deployed as a prebuilt static `dist/` via cPanel's Git Version Control feature pulling a dedicated `deploy` branch — the `main` branch itself is never deployed directly.

- `scripts/deploy-dist.sh`: refuses to run with a dirty working tree, runs `npm run build`, then stages the contents of `dist/` (plus `.cpanel.yml.template` renamed to `.cpanel.yml`) as a commit on an orphan `deploy` branch (via a temporary `git worktree`, cleaned up after). **It does not push** — review `git log deploy --oneline -5`, then `git push origin deploy` yourself.
- `.cpanel.yml.template` is the template copied into that commit; its one deployment task copies everything to `/home/akuedu/public_html/new.angelinvestor.pk/`. It's a template on `main` (not itself deployed) — the real `.cpanel.yml` only exists on the `deploy` branch.
- Because `public/api/*.php` is copied verbatim into `dist/`, the PHP endpoints deploy automatically as part of the same static payload — no separate backend deploy step.

### Content editing (Decap CMS) — makes blog posts & portfolio entries editable without touching code

`public/admin/` is a self-hosted [Decap CMS](https://decapcms.org) admin UI (loaded from its CDN build, no build step of its own, not part of the Astro app) at `/admin`. It edits the `blog` and `portfolio` content collections directly as Markdown files and commits straight to the `main` branch on GitHub — same files `astro:content` already reads, so there's no second source of truth.

- `public/admin/index.html` + `public/admin/config.yml` — the CMS UI and its collection/field definitions (kept in sync with `src/content.config.ts`'s Zod schemas by hand; if you add/change a field in one, update the other).
- `public/api/decap-auth.php` + `public/api/decap-callback.php` — a small custom OAuth handshake with GitHub (Decap's `github` backend needs one), because there's no persistent Node server here to run the usual Netlify/Vercel/Cloudflare-function version. Mirrors the existing `public/api/psx-*.php` "tiny stateless PHP endpoint" pattern. Implements the exact `authorizing:github` / `authorization:github:success:{...}` postMessage handshake Decap's `decap-cms-lib-auth` expects (verified against its actual source, not guessed).
- **The GitHub OAuth App itself has to be created by hand** — that's a one-time step only the account owner can do (needs a GitHub login to github.com/settings/developers). Homepage URL `https://new.angelinvestor.pk`, callback `https://new.angelinvestor.pk/api/decap-callback.php`.
- **The Client ID/Secret are never committed to this repo** (the repo is on GitHub — anything in it is effectively public). They live in a file one level *above* `public_html` on the server (`~/decap-oauth-secret.php`, outside anything web-accessible, outside the git-deployed tree too). Copy `decap-oauth-secret.php.example` there and fill it in — full steps are in that file's own comments.
- **Important limitation, not a bug:** saving in the CMS commits to `main` (the Astro *source*). It does **not** rebuild or redeploy the live site — that's still the same manual `scripts/deploy-dist.sh` + `git push origin deploy` step as any other code change. The CMS makes editing content easy; it doesn't change the deploy model.
- Not yet wired into the CMS: the homepage's "Featured Portfolio" flag, the two legal pages (their content lives as hardcoded arrays in `.astro` files, not Markdown — out of scope for a first pass), and the three forms. Only `blog` and `portfolio` are editable collections right now.

## Current status / outstanding work

Keep this section current — update it whenever a work session ends, so picking the project up on a different machine starts from an accurate picture instead of stale assumptions.

**Later the same day (22 Aug 2026):** Continued from the audit below with a mobile-hero decluttering pass, then two follow-up bug-fixing rounds against regressions/pre-existing bugs it surfaced.
- Homepage hero (`HeroVideo.astro`): fixed the same `-mt-20` overflow-past-the-fold bug documented elsewhere in this file (the "$18M+ CAPITAL DEPLOYED" stat box and the CTAs were getting cut off at the bottom of the viewport) by adding `-mt-20` to the hero section; also hid the eyebrow label and description paragraph on mobile (`max-sm:hidden`), matching the "title + CTA only" pattern applied sitewide next.
- Sitewide mobile hero simplification: every other page's hero (About, Market Insights, Portfolio, the standalone Valuation Calculator page, all 3 form pages, both legal pages, Blog index) now shows only the title + CTA (if one exists) on mobile — bullets/subheadings/eyebrow/description removed from view via `max-sm:hidden`. `/blog/[slug].astro` and `/portfolio/[slug].astro` were deliberately left alone — their header is genuine article metadata (breadcrumb/author/date/cover image), not decorative hero copy.
  - **Real bug found doing this:** `max-sm:hidden` silently failed to hide three elements — the investor/startup form's `.ai-form-meta` stat row, the legal pages' `.legal-document-mark` badge, and the blog index's `.ai-blog-featured` card — because each already had an unconditional `display` property in its own scoped stylesheet (`form-pages.css` / `legal-page.css` / `blog-page.css`) that won the cascade over the Tailwind utility at equal specificity. Fixed by adding the hide directly inside each stylesheet's own mobile `@media` block instead of relying on the utility class in markup. See the new Notes bullet below — this will bite again on the next handoff package that mixes plain CSS with Tailwind utilities in markup.
- **Follow-up round 1 — the simplification pass above left real gaps/overlaps, not just a style nitpick:** `.ai-blog-hero`, `.ai-form-hero` and `.legal-hero` all had a hardcoded mobile `min-height`/`height` (720–860px) sized for the *old*, fuller hero content. Once that content was hidden, the box didn't shrink, leaving a large empty gap under the title on Blog/Investor/Startup/Contact/Privacy/Terms. Switching those to content-driven height then exposed two decorative elements tuned for the old tall box: `.ai-form-hero:after` (a solid yellow circle, hardcoded `min-width/min-height:420px`) swallowed the entire shrunken hero, and the absolutely-positioned `.ai-form-mark` badge dropped down onto the title text. Both decorative elements are now hidden on mobile like the rest of the simplification; the fixed heights were replaced with content-driven sizing (plus a sensible padding-bottom).
- **Follow-up round 2 — two more pre-existing bugs found while testing the above, unrelated to the mobile pass:**
  - `ImpactHighlights.astro`'s number/oval wasn't horizontally centered on laptop-width screens (reported via a MacBook screenshot). Root cause: the desktop 3-column grid (`grid-cols-[.55fr_1.45fr_.78fr]`) had unequal side columns, so the oval's own column center landed left of the section's true center. Fixed by balancing both side columns to `.665fr` each (same combined total) so the oval always sits at true center regardless of label/copy text width.
  - `MarketPulse.astro`'s homepage section heading ("See the market. Read the momentum.") was completely invisible — it never set a text color, so it inherited the site's global default (white, set on `<html>` for the mostly-dark theme) against this section's white `bg-paper` background. Looked like a huge empty gap in a screenshot, not obviously a color bug. Fixed by adding `text-ink` (matching the same pattern `StartupCTA.astro` already uses for its own light-background heading) and giving the shared `.section-intro h2 em` rule the site's accent-yellow italic treatment already used for emphasized words in every other big heading.

**Site-wide audit (22 Aug 2026):** Ran a full responsiveness/breakage pass across all 20 routes at 375/768/1440px (3 parallel agents, Playwright). Zero console errors, zero horizontal overflow, zero broken images anywhere. Fixed the 3 real issues found:
- Header nav was crammed against the "Apply as startup" button at exactly tablet width (768px) on every page — the desktop nav/CTA breakpoint moved from `md` (768px) to `lg` (1024px) in `Header.astro`, so tablet now gets the hamburger menu instead of a squeezed row.
- `/blog/[slug].astro` never rendered the post's hero photo (only the `/blog` index card did) — added a conditional hero `<img>` using `post.data.image`.
- `/terms-and-conditions` at 375px had its long intro paragraph crowding the decorative "DOCUMENT" badge label — hid that label at the same mobile breakpoint `.legal-document-mark span`/`small` already hides at (`legal-page.css`).

Reviewed and left as-is (not bugs): a GSAP-pinned section's text can transiently show in the gaps around the floating pill-shaped header during mid-scroll — inherent to the header's intentional translucent floating-pill design (not full-width), not a z-index defect. The `/blog` index card grid renders blank in a synthetic full-page screenshot tool that doesn't simulate real scrolling (IntersectionObserver-driven reveal) — confirmed via incremental-scroll test that real users always see the cards; not a fix candidate.

**Second machine, same day (21 Aug 2026):** Picked up the branch after the audit above shipped from elsewhere, then did a separate round of work:
- Fixed Impact Highlights: removed a 20%-opacity "peek" of the adjacent number/label (read as a broken partial-preview, not a deliberate effect) and fixed the mobile layout, where the left counter and right copy overlapped the pill because they were absolutely positioned for a tablet-sized viewport.
- Homepage hero video: reverted an object-contain/pillarbox experiment back to full-bleed `object-cover` per direction — the vertical-source-video crop trade-off is expected until a landscape source exists. A landscape 1080p replacement then arrived from the other machine's session and is now in place.
- Removed the "One pitch, matched to the right investors" (`PitchMatch.astro`) homepage section and the "Featured Portfolio" grid, both per direction.
- Added the Blog Preview marquee section (see "Done" below) and rebuilt the three form pages (see "Forms are UI-only stubs" above).
- About page: fixed the hero overflowing 80px past the fold (bottom controls/marquee fell below the viewport on load) by adding the `margin-top:-80px` header-bleed trick now documented in "Notes" below: without it, `<main class="pt-20">`'s padding pushes a `100svh`-tall hero 80px past the actual viewport bottom. Also removed the hero's prev/next arrow buttons and dropped autoplay to 3s, per direction.
- Found and cleared a stale local Astro content-cache (`.astro/` — gitignored, machine-local) that was silently blanking the blog collection's `category`/`readTime` fields on this machine only; not a code bug, nothing to fix in the repo.

**Done:**
- Full homepage rebuild (hero video, Impact Highlights number reel, Market Pulse with ticker/search/chart, Pitch Episodes, How It Works pinned-card sequence, Valuation Calculator, an auto-scrolling Blog Preview marquee, Startup CTA) plus a redesigned About page with real event photography (`public/events/`). The homepage's old "Featured Portfolio" grid was removed (it only ever had the one placeholder entry) — re-add it once real portfolio companies exist.
- Apply as Startup / Join as Investor / Contact rebuilt with a new shared design (`FormShell.astro` + `form-pages.css/.ts`) — see "Forms are UI-only stubs" above. Visual redesign only; submission behavior is unchanged (still fake/client-only).
- Blog: real `/blog` index (hero, category filters, artwork-per-post cards) and working `/blog/[slug]` detail pages, backed by 8 content-collection entries — see caveat below.
- Privacy Policy and Terms and Conditions replaced with comprehensive, sectioned documents (`src/components/legal/LegalPage.astro`) — see caveat below.
- Live PSX market data wired end-to-end (PHP proxy + client rendering).
- Valuation calculator fully functional in both places it appears (dedicated page and homepage), sharing one component/script — no duplicated logic.
- Real brand assets in use: logo (`public/logo-*.png`), gold/navy palette, real YouTube episode thumbnails, a compressed real landscape event video in the hero.
- Decap CMS wired up for editing blog posts and portfolio entries at `/admin` (see "Content editing" above) — code-complete, but **needs the one manual GitHub OAuth App step before it actually works live**; untested end-to-end until that's done.

**Not done — don't assume otherwise:**
- **The GitHub OAuth App for Decap CMS hasn't been created yet.** `/admin` will show a server-side "not configured" message until someone creates the OAuth App and drops `~/decap-oauth-secret.php` onto the server — see "Content editing" above for the exact steps. Can't be done by Claude; needs the account owner's GitHub login.
- **Apply as Startup / Join as Investor / Contact forms do not submit anywhere.** Redesigned visually (21 Aug 2026), but still UI-only stubs (see "Forms are UI-only stubs" above). Wiring a real backend for these is the biggest piece of remaining work before launch.
- **The 8 blog posts are sample/placeholder editorial content**, not real published articles — realistic-sounding startup/investment advice generated to fill out the design, not fact-checked or written by the team. Replace with real posts (or explicitly approve the sample copy) before launch.
- **Privacy Policy and Terms and Conditions are an unreviewed draft.** Comprehensive and website-ready in structure, but per the package's own instruction: have qualified Pakistani legal counsel review the wording before public launch — don't treat it as final as-is.
- Portfolio content collection still only has one placeholder entry — no real portfolio companies yet.
- Site is `noindex` everywhere (`PUBLIC_ALLOW_INDEXING` unset) and `robots.txt` disallows everything — intentional pre-launch state, needs a deliberate flip before going live.

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
- GSAP (`gsap`) is the only animation dependency — used for scroll-reveals (`motion.ts`), the valuation calculator's animated counters/range bar, and scrolly-driven sections (`episode-scroll.ts`, `impact-scroll.ts`, and the inline pinned-card script in `HowItWorks.astro`).
- The homepage, blog, legal and form pages were assembled by copying self-contained "handoff" packages (their own scoped CSS, `ai-`/`hiw-`/`legal-` prefixed classes) into the existing `BaseLayout`/`Header`/`Footer` shell rather than being hand-built against the site's own Tailwind tokens — that's why their color values and class-naming don't match the rest of the site. Don't "fix" that mismatch as a drive-by; it's how these were integrated on purpose. When integrating a new one of these packages, check for (a) a duplicate Header/Footer to strip, (b) bare CSS variable names that need remapping to this project's actual `--color-*` tokens, (c) a hero that needs `margin-top:-80px` to bleed under the floating nav instead of leaving an 80px gap, and (d) any interaction script using `DOMContentLoaded`/`beforeunload` instead of `astro:page-load` — all four have bitten past integrations here.
- `src/scripts/form-widgets.ts` is shared UI plumbing (custom radio-cards, chip groups, file upload widgets) — as of the forms redesign, only `ValuationCalculator.astro` still uses it (via `FormField`/`RadioCardGroup`). The three form pages have their own separate `.ai-choice-pills`/`.ai-choice-cards` widget system in `form-pages.ts` now.
- New pages/sections in this project keep arriving as ChatGPT-designed handoff packages (zips containing an `.astro` page, a scoped CSS file, an interaction script, assets, and a prompt file). `DESIGN_HANDOFF_PROMPT.md` at the repo root is a reusable prompt template for requesting the *next* one, written to front-load every constraint that's caused integration bugs so far (duplicate Header/Footer, mismatched CSS variable names, heroes not accounting for the floating nav, `DOMContentLoaded` instead of `astro:page-load`). Point the user at it before they go generate another package.
- Two more integration gotchas specific to these handoff packages' scoped CSS files (found while doing the sitewide mobile-hero simplification, 22 Aug 2026): (1) a Tailwind utility like `max-sm:hidden` in markup silently loses to a plain unconditional `display` rule for the same selector already sitting in the package's own scoped stylesheet, at equal specificity, if that rule appears later in the bundled CSS — always verify a "hidden" element actually disappeared in a screenshot, don't trust the class alone; fix it inside that stylesheet's own mobile `@media` block instead. (2) if you shrink/hide content inside a hero that has a hardcoded mobile `height`/`min-height`, that fixed size was almost always sized for the *original* fuller content — check for it and switch to content-driven sizing, and also check for decorative absolutely-positioned elements (badges, oversized background circles) whose position/size assumed that original tall box, or they'll overlap the remaining content once the box shrinks.
