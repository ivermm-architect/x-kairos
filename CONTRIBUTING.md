# Contributing to x-kairos

Working agreement for this repo. **Everything in the repository is in English** — code,
comments, file/branch names, commits, issues, milestones, PRs and docs.

---

## Getting started

- Prerequisites: Node 20+, npm.
- Install dependencies: `npm install`
- Create your local env: `cp .env.example .env.local` and fill in the Supabase credentials.
- Run the dev server: `npm run dev`
- Build the static export: `npm run build` (outputs `out/`).

---

## Areas & ownership

Each `area:` label maps to a set of paths. Keep changes within one area per branch/PR to avoid
collisions:

| Area label               | Paths |
|--------------------------|-------|
| `area:db`                | `supabase/`, `src/lib/db/`, `src/lib/auth/` |
| `area:design-system`     | `src/components/ui/`, `src/styles/` |
| `area:admin`             | `src/app/(admin)/`, `src/components/admin/` |
| `area:storefront`        | `src/app/(public)/`, `src/components/public/` |
| `area:queries`           | `src/lib/queries/` (shared contract — coordinate changes) |
| `area:ci` / `area:infra` | `.github/`, root config |

`src/lib/queries/` is the only Front↔DB contact point — changes there are coordinated.

---

## Review & commit policy

- The **maintainer performs all commits and pushes**. Agents generate code only.
- Nothing is committed until the maintainer has reviewed it.
- No AI co-author trailers in commits.

---

## Branches

- Never commit directly to `main` once branch protection is on (from M2).
- During M0/M1 setup, small config changes may go straight to `main`.
- Branch naming: `<type>/<issue#>` — e.g. `feat/21`, `fix/34`, `security/12`. The issue number
  is unique and carries the context; no slug needed.

---

## Commits

[Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <imperative subject, <70 chars>

<body: why, not how>

Refs #<issue#>      # or "Closes #<issue#>" on the commit/PR that finishes the issue
```

The issue reference goes at the **end** of the message, keeping the commit↔issue link explicit.

Commit types map **1:1** to the `type:` labels:

| Commit type | Label           | When to use                              |
|-------------|-----------------|------------------------------------------|
| `feat`      | `type:feat`     | New capability                           |
| `fix`       | `type:fix`      | Bug fix                                   |
| `chore`     | `type:chore`    | Tooling, config, housekeeping            |
| `docs`      | `type:docs`     | Documentation                            |
| `refactor`  | `type:refactor` | Code change, no behavior change          |
| `test`      | `type:test`     | Tests                                     |
| `security`  | `type:security` | RLS / RPC / auth hardening               |

- `security` is a non-standard extension of Conventional Commits, kept because security weighs
  heavily in this project (all authorization lives in Postgres).
- Scope = the area, e.g. `feat(pos):`, `chore(infra):`, `security(rls):`.
- Reference the issue: put `Closes #<n>` (or `Refs #<n>`) in the commit body or PR.

---

## Issues

- Use the templates (Feature / Technical). Blank issues are disabled.
- Every issue carries three axes: `type:*` + `priority:*` + `area:*`. Progress is tracked on
  the Project board (Todo / In progress / Done), not with labels.
- Priority uses MoSCoW: `must` / `should` / `could` / `wont`.
- Keep issues vertical and small (INVEST). If the text has *and/or/unless* or a generic role,
  split into several issues. The issue is a trigger for a conversation, not a full spec.
- Record the **Owner** and **Blocked by** so dependencies are explicit.

---

## Pull requests

- One issue → one branch → one PR.
- PR title in Conventional Commits style; body must `Closes #<n>`.
- **Squash merge** into `main` (keeps history clean; agents produce many WIP commits).
- Move the Project card to In progress while the PR is open; merge only when acceptance
  criteria are checked and CI is green (CI lands in M6), then the card goes to Done.

---

## Line endings

`.gitattributes` stores all text as LF. On Windows you may see "LF will be replaced by CRLF"
warnings locally — that is expected and harmless. After editing `.gitattributes`, run once:

```
git add --renormalize .
```
