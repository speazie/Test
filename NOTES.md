# TEST marketing site — build notes (running list)

Phase 1: shared design system + home page. Audience pages are stubs pending review.

## Assumptions made
- **Branch contents**: this branch previously carried the pie clicker files; since this
  project is unrelated, they were removed here (they remain untouched on their own branch).
- **Brand voice**: "TEST" rendered as a plain wordmark in deep teal; tagline
  "Care at home, for everyone involved" is placeholder copy — replace freely.
- **The model described on the home page**: caregivers are *screened* (background +
  reference checks + interviews), agreements are *written*, and TEST *stays involved
  after matching*. These are stated as how the concept works, not as existing operations.
  If any of these aren't part of the real model, the copy needs editing.
- **Non-medical care only**: FAQ explicitly says caregivers don't replace nurses/medical
  care, to stay out of regulated-care territory.
- **No compensation/equity specifics** anywhere yet — the caregiver value proposition is
  described as "housing + training + support + a path forward."
- **US-English, single locale**; no i18n scaffolding.

## Decisions deferred (need your input)
- Real brand name, tagline, and any logo mark.
- Whether caregiver compensation/equity should be mentioned more concretely.
- Form backend (fields have stable `name` attributes: `name`, `email`, `role`,
  `message` — wire `action`/`method` when a backend exists).
- Whether the audience pages get their own hero art / visual variants.

## Labeled placeholders to fill in (search for "placeholder")
- Testimonial quote + attribution (home page, "Built around trust" section).
- Contact email (footer, all pages).
- Mailing address (footer, all pages).
- Investor-page market figures will use `[market size figure]`-style placeholders
  when that page is built (phase 2).

## Design-system conventions (for anyone editing pages)
- One stylesheet: `css/styles.css`. One script: `js/main.js`. All pages share the
  same header/footer markup.
- Base text is 18px (`html { font-size: 112.5% }`); everything is rem/em so the
  header A−/A+ control scales the whole site to 200% without breaking layout.
- Palette pairs are contrast-checked ≥ 4.5:1 (most ≥ 7:1) — if you add a color
  pair, check it.
- Buttons/links/inputs: ≥ 3rem (48px) tap targets via `--tap-min`.
- Placeholders the owner must replace use `.placeholder-note` (amber dashed box).
- Page-tone hooks for phase 2: add a body class per page if a page needs its own
  register (e.g. larger type on seniors, darker fintech styling on investors)
  rather than forking the stylesheet.
