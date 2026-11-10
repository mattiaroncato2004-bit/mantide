# Working on Mantide

For people and coding agents. What the app does and how it is built: [README.md](README.md). Where it is going: the [design](docs/superpowers/specs/2026-11-10-mantide-v1-design.md) and the plans in [docs/superpowers/plans/](docs/superpowers/plans/).

## Where things are

| Path | What |
|---|---|
| `mobile/` | The Expo app. Specific guidance in [mobile/AGENTS.md](mobile/AGENTS.md) |
| `local-ai/` | Gemma 4 on your computer: setup, test and batch scripts |
| `demo-data/` | The demo gallery (invented GPS and dates) and the script that builds it |
| `docs/` | Android setup, market research, the hackathon story, design and plans |
| `CHANGELOG.md` | What changed, release by release |

## Every change

- Update `CHANGELOG.md` under `## Unreleased` **in the same commit**: one line on what changed for a person using the app or the repo.
- Before committing to `mobile/`: `npm run typecheck && npm test`. For changes to the web build: `npm run export:web && npm run e2e`.
- Every visible string goes through `t()` in `mobile/src/i18n/`, in English and Italian; `npm test` fails on text written directly in a screen.
- A commit that needs the Android app rebuilt (`mobile/app.json`, native dependencies in `mobile/package.json`, native code) has `[native: rebuild]` in its title.
- Keep the README honest: a claim goes in only after it has been checked by a run. Say what is untested.

## Conventions

- English for code, comments, docs and commit messages.
- Personal photos go in `demo-photos/` and models in `models/`: both are ignored by git.
- Each piece of information lives in one place; elsewhere, link to it.
