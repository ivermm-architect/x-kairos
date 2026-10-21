@AGENTS.md

# Agent rules — x-kairos

Project-specific rules for any AI agent working in this repo. These complement the global
user rules and `CONTRIBUTING.md`. If a rule here conflicts with the global rules, the global
rules win.

## Language
- **Everything in the repo is English**: code, comments, identifiers, file/branch names,
  commits, issues, milestones, PRs, docs.
- Conversation with the maintainer happens in Spanish; nothing else.

## Commit & push policy
- **The maintainer commits and pushes. Agents never run `git commit`, `git push`, or rewrite
  history.** Agents generate/edit files; the maintainer reviews, then commits.
- No AI co-author trailers.

## Command execution
- **Never run shell commands without the maintainer's authorization** — this includes `git`,
  `npm`, `npx`, `supabase`, `gh`, build/test runners, migrations or any destructive action.
  Propose the command and wait for approval; the maintainer runs it (or explicitly allows it).

## Boundaries (do not cross without coordination)
- `area:db` → `supabase/`, `src/lib/db/`, `src/lib/auth/`
- `area:design-system` → `src/components/ui/`, `src/styles/`
- `area:admin` → `src/app/(admin)/`, `src/components/admin/`
- `area:storefront` → `src/app/(public)/`, `src/components/public/`
- `src/lib/queries/` is the shared Front↔DB contract — changes are coordinated, not unilateral.

## Engineering
- **Read before write**: never edit code you have not read; never invent APIs, RPC, env vars,
  imports or file paths.
- **Verify before commit**: what you claim "works" must be checked (build/tsc/test). If it
  cannot be verified, say so.
- **Security lives in the data**: this app has no backend server — the browser talks to
  Supabase directly. Business rules and authorization live in Postgres (RLS + `SECURITY DEFINER`
  RPC with `assert_staff()`), not in the UI. UI guards are cosmetic.
- **Static export**: `output: "export"`. No server components, no server-only APIs, no Next
  image optimization. Everything runs client-side.
- **Tokens before literals**: consume design tokens from `src/styles/tokens.css`; never
  hardcode colors/spacing/radii.
- **A11y by default**: WCAG 2.2, ≥44px touch targets, visible focus, semantic HTML.
- **Explicit UI states**: default / hover / focus / active / disabled / loading / empty / error.
- **Mobile-first**: design the phone viewport first, scale up.
- **Non-obvious decisions → short ADR** in `docs/adr/`.

## Workflow
- Follow `CONTRIBUTING.md`: issue → branch → PR → squash merge, Conventional Commits,
  `type:`+`priority:`+`area:` on every issue.
- Keep scope tight. Flag scope creep instead of silently expanding.
