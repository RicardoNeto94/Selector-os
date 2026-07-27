# Project: VAXERON (Selector-OS)

## What this project is
VAXERON is a hospitality operations platform: guest-facing digital experiences
(menus, wine cellar, room service, spa, pillow menus), team/venue management,
and the public marketing site (Vaxeron.com). Built for luxury hotel operators.

Sibling project **Ceramic Club** (`~/Development/ceramic-club`) is a fully
separate codebase for a Portuguese ceramic studio. Never edit Ceramic Club
while working in this repo, and never bring Ceramic Club patterns/assumptions
into VAXERON.

## Design direction
- Quiet luxury aesthetic: ivory, warm beige, gold, charcoal (terracotta added
  for the public Vaxeron.com site).
- References: Aman, Six Senses, Rosewood, Apple, Stripe/Notion-level clarity.
- Calm, cinematic, editorial — never generic SaaS patterns.
- Brand voice: minimal, confident, not salesy. No fluff, no emojis, no
  generic startup language.

## Workflow rules (follow these without being asked each time)

1. **One file at a time.** Confirm the exact file path before editing. Do not
   touch other files unless explicitly asked.
2. **Full file replacements only.** No partial snippets, no omitted
   "// unchanged" placeholder comments, no truncation. If a file is too long
   to return in one block, split into clearly labeled parts but still treat
   it as one file, one task.
3. **Wait for confirmation** ("done") before moving to the next file or next
   step. Do not bundle multiple files or steps into one response.
4. **No unrequested redesigns.** Preserve existing architecture and all
   working functionality. Refinement over redesign — polish, hierarchy,
   consistency, and readability are the goals, not novelty.
5. **Keep explanations short.** State what changed and why in 1-3 sentences,
   not a full essay. If something is ambiguous, ask one short question.
6. **Cross-device by default.** Any guest-facing or UI work must work on
   desktop, tablet portrait, tablet landscape, mobile portrait, and mobile
   landscape — including in-room hotel iPads.
7. **Guest-facing modal rule:** static Overview-style pages must fit without
   scrolling; longer content (menus, Treatments, Information) may scroll.
8. **Git workflow:** after a confirmed milestone change, provide the exact
   git add/commit/push commands (or run them directly if operating with
   file-system access) rather than assuming.

## Stack notes
- Next.js app (`src/app/...` routing), CSS split across multiple files under
  `src/styles/` (`vaxeron.css`, `burman.css`, `dashboard.css`, `guest.css`,
  `theme.css`, `auth.css`, `globals.css`, plus a `burman/` subfolder).
- Tailwind config present (`tailwind.config.js`) — confirm whether a given
  section uses Tailwind utilities or the custom `vx-*` class system in
  `vaxeron.css` before editing; don't mix approaches within one component
  without asking.
- When editing CSS, only touch the specific selector blocks required for the
  task — do not reformat or reorder unrelated rules in the same file.