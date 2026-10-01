# Money Companion

A friendly personal expense tracker built as a **UI-only Anna App**.

Architecture:

    React 19 + TypeScript + Vite
        -> Anna static-spa bundle
        -> Anna App Runtime
        -> Anna Host APIs (anna.llm.complete, anna.storage)

- No Node/Express/Next server.
- No SQLite/PostgreSQL/Prisma/Drizzle.
- No Executa (add one only if a future capability truly requires it).

## Status

Phase 1 (Foundation) is implemented: Anna contract, Vite build, hash routing,
design tokens, responsive shell, reusable UI components, Anna runtime
abstraction, minimal Anna Storage abstraction, and the LlmService interface.

Not implemented yet: expense CRUD persistence, budgets, analytics, AI behavior,
chat, merchant analysis, and publishing.

## Scripts

| Command | Purpose |
| --- | --- |
| npm run dev | Vite dev server (standalone browser) |
| npm run build | Build the Anna bundle into bundle/ |
| npm run typecheck | TypeScript check |
| npm test | Vitest unit tests |
| npm run validate | anna-app validate --strict |
| npm run harness | Run the Anna local harness |

## Build output

npm run build produces the Anna static-spa bundle:

    bundle/
      index.html
      app.js
      styles.css

## Anna contract

- app.json - CLI project identity (slug, name, version).
- manifest.json - schema 2, UI-only, least-privilege permissions.

## Runtime behaviour

Outside the Anna host the app runs in standalone mode using localStorage for
persistence and reporting the LLM as unavailable. Inside Anna it uses the Host
API. See Settings for a live connection and storage round-trip check.
