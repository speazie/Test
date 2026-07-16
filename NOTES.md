# TEST marketing site — build notes (running list)

Phase 2 complete: all four pages built on the shared design system.

## Assumptions made
- **Branch contents**: this branch previously carried the pie clicker files; since this
  project is unrelated, they were removed here (they remain untouched on their own branch).
- **Brand voice**: "TEST" rendered as a plain wordmark in deep teal; tagline
  "Care at home, for everyone involved" is placeholder copy — replace freely.
- **The model as described**: caregivers are screened (background + reference checks +
  in-person interviews) and trained; agreements are written and plain-language; TEST
  stays involved after matching (check-ins, support contact); the senior side is also
  screened and the home visited. If any of these aren't part of the real model, the
  copy needs editing — they appear on every page.
- **Non-medical care only**: all pages state caregivers are not nurses and don't
  replace medical care.
- **Financial language**: kept general and non-promissory everywhere. The
  reverse-mortgage/HELOC comparison appears on the seniors and investors pages in
  the general "value funds care instead of bank fees and interest" framing from the
  business brief — no rates, terms, structures, or outcomes stated. The investors
  page carries an explicit not-an-offer / not-advice disclaimer box and an honest
  "where we are today" section (nothing exists yet beyond the concept and this site).
- **Per-page registers**: seniors page bumps main-content type to 1.1rem (largest-type
  page); caregivers page uses the warm amber hero as its "energetic" lever; investors
  page uses a dark hero/closing and stat-tile/diagram components. All scoped in
  per-page stylesheets (`css/seniors.css`, `css/caregivers.css`, `css/investors.css`)
  under body classes; shared `css/styles.css` untouched by page-specific styling.
- **US-English, single locale**; no i18n scaffolding.

## Decisions deferred (need your input)
- Real brand name, tagline, and any logo mark.
- Whether caregiver compensation/equity should be described more concretely once the
  structure is settled.
- Form backend (fields have stable `name` attributes: `name`, `email`, `role`,
  `message` — wire `action`/`method` when a backend exists).
- Real photography/illustration (current visuals are zero-download CSS/emoji).

## Labeled placeholders to fill in (all rendered as amber dashed boxes)
Home:
- Testimonial quote + attribution ("Built around trust" section)
- `[Contact email placeholder]` / `[Mailing address placeholder]` (footer, all pages)

Seniors:
- `[Senior/family testimonial placeholder …]` + `[Name, early participant or family member]`
- `[average monthly facility cost figure]` (affordability section)

Caregivers:
- `[Typical monthly housing cost savings figure]` ("A place to live" card)
- `[Testimonial placeholder …]` + `[Name, caregiver with TEST]` (fairness section)

Investors:
- `[share of U.S. seniors who prefer to age in place — figure]`
- `[caregiver shortage statistic]`
- `[housing affordability statistic for younger adults]`
- `[typical home equity held by senior homeowners — figure]`
- `[U.S. seniors aging-in-place market size figure]`
- `[raise stage and amount placeholder]`
- `[intended use of funds placeholder]`
- `[pitch deck link]`

## Design-system conventions (for anyone editing pages)
- One shared stylesheet: `css/styles.css`; per-page extensions live in
  `css/<page>.css`, every rule scoped under `body.page-<name>`, linked after the
  shared sheet. One script: `js/main.js`. All pages share identical header/footer.
- Base text is 18px (`html { font-size: 112.5% }`); everything is rem/em so the
  header A−/A+ control scales the whole site to 200% without breaking layout.
- 200%-text hardening patterns (learned the hard way — keep using them):
  `overflow-wrap: break-word` is inherited from `body` as a last resort; flex-item
  text blocks need `min-width: 0` (see `.trust-list`); anonymous flex items (like
  `summary` text) and tight pills need `overflow-wrap: anywhere`; wide components
  cap side padding with `min(var(--space-4), 5vw)` (see `.btn`, `.card`, `.steps li`).
- Palette pairs are contrast-checked ≥ 4.5:1 (most ≥ 7:1) — if you add a color
  pair, check it. Investors-page dark-register pairs are documented at the top of
  `css/investors.css` with their ratios.
- Buttons/links/inputs: ≥ 3rem (48px) tap targets via `--tap-min`.
- Placeholders the owner must replace use `.placeholder-note` (amber dashed box).
