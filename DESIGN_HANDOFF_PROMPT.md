# Prompt template for ChatGPT design handoffs

Reusable prompt for asking ChatGPT to design a new page/section for this site in a way
Claude Code can integrate cleanly on the first try. Copy the block below, fill in the
`[[...]]` placeholders, and paste it into ChatGPT. Save whatever it returns as a zip in
Downloads and tell Claude Code to work on it.

This exists because past handoffs that skipped these constraints caused real integration
bugs: duplicate headers/footers, CSS variables that didn't map to this project's actual
tokens, heroes that didn't account for the floating nav's height, and interaction scripts
that silently broke on page navigation. Every constraint below was added after hitting one
of those specifically — don't trim them down.

---

TASK: Design [[page name / feature, e.g. "a Careers page" or "a Testimonials section for the homepage"]] for an existing Astro + Tailwind site. Produce a self-contained handoff package — clean, real, designed source that another AI (Claude Code) will wire into the live project. This is a design deliverable, not the final integrated code.

PROJECT CONTEXT — do not deviate from this:
- Astro 7, static output, TypeScript, Tailwind CSS 4.3 (CSS-based config — there is no tailwind.config.js).
- GSAP + ScrollTrigger are already installed and fine to use for animation. Do not add any other npm package or touch build/Astro/Tailwind config.
- A shared `BaseLayout` component already renders the site's Header and Footer and wraps page content in `<main>`. Your page must NOT include its own header, nav, or footer — supply only the page's own content section(s).
- The site uses Astro View Transitions for SPA-like client-side navigation between pages. If you supply an interaction script, write its init logic as a function and note that it must be invoked on `document.addEventListener('astro:page-load', fn)` — NOT `DOMContentLoaded` and NOT a bare top-level call, since neither re-fires on client-side navigation.
- Use this project's actual CSS variables directly rather than inventing your own: `--color-paper` (white), `--color-deep` (#071b2a, dark navy), `--color-navy` (#0b2940), `--color-ink` (#0a0e17), `--color-cta` / `--color-accent` (#fcbd17, gold), `--color-muted` (#69808e), `--color-line`. Do not invent shorthand names like `--paper` or `--yellow` that would need remapping later.
- If your section is a full-bleed hero meant to sit under the site's floating pill-shaped nav (rather than starting below it), say so explicitly rather than assuming a nav height or leaving a gap.

FILES TO DELIVER (all required):
1. One `.astro` page (or component) per route/section — real markup, real copy, no lorem ipsum.
2. One scoped stylesheet in plain CSS (not Tailwind utility classes), every class name uniquely prefixed (e.g. `xyz-*`) so nothing collides with the site's existing classes.
3. One dependency-free (or GSAP-only) TypeScript file for any client-side behavior, stating clearly which DOM elements/data-attributes it expects to find.
4. Any image/media assets referenced, already placed at their intended final path under `public/`.
5. A short `PROMPT.md` (or `.txt`) stating: which existing route(s) this replaces, if any; anything that must be preserved from the current version (see the form/replacement rules below); and anything intentionally left for Claude to wire up.

IF THIS REPLACES A FORM OR OTHER INTERACTIVE PAGE:
- Do not invent a submission endpoint or backend — state explicitly that submission wiring is Claude's job, and whether existing behavior needs preserving.
- Do not rename, remove, or add form fields without saying so — list every field `name`, type, and required flag exactly as intended.
- Include a success/confirmation state design, or explicitly say none is included and Claude should design one — don't leave this ambiguous; a missing success state is easy to miss until someone actually submits the form.

WHAT NOT TO DO:
- Don't design your own header, nav, or footer.
- Don't add npm packages or touch build config.
- Don't invent your own global CSS variable/token names — use the ones listed above.
