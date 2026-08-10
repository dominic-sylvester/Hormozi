# Hormozi Company

Eve agent company generated from Alex Hormozi markdown playbooks and books.

## Company structure

- **CEO (root agent)** — routes work, runs workflows, sets priorities
- **5 departments** — growth, monetization, sales, success, brand
- **15 playbook specialists** — nested under their department
- **Workflow tool** — cross-department orchestration
- **Schedules** — weekly operating review, monthly unit economics

- **Shared company state** — session profile via `get_company_profile` / `update_company_profile`, persisted in `content/company-profiles`
- **URL onboarding** — `research_company_from_url` fetches public pages and builds a draft profile for confirmation
- **Evals** — smoke, routing, integration, and content-collection persistence checks with `npm run eval`
- **HTTP channel** — `agent/channels/eve.ts` for API clients and future UI
- **Onboarding** — `workflow-company-setup` skill for empty profiles (manual interview or website URL research)
- **Chunked references** — large books split under `references/sections/`

## Regenerate

From the repository root:

```bash
python3 scripts/build_agents.py --input . --output ./hormozi-advisor --overwrite
```

Optional: `--chunk-threshold 2000` (default) splits large books into section files.

Copy environment variables:

```bash
cp .env.example .env
```

Playbook references are symlinked to markdown files under `sources/`. Metadata is indexed in `sources/collection.json`.

## Content collections

Company profiles persist in `content/company-profiles/` as JSON + markdown files, indexed by `collection.json`. Override the root with `CONTENT_COLLECTIONS_ROOT` if needed.

## Run locally

### Agent (Eve dev server)

```bash
cd hormozi-advisor
npm install
npm run dev
npx eve info --json
```

The Eve HTTP channel listens on port **2000** by default (`/eve/v1/*`).

### Web UI (Vite + React)

In a second terminal:

```bash
cd hormozi-advisor
npm install --prefix web
npm run dev:web
```

Open http://localhost:5173 — the Vite dev server proxies `/eve` to the Eve agent.

Requires Node.js 24+. Set `HORMOZI_AGENT_MODEL`, `HORMOZI_DEPARTMENT_MODEL`, and `HORMOZI_SPECIALIST_MODEL` as needed (agent `.env`).

## Evals

Deterministic evals use `EVE_EVAL=1` and a mock CEO model fixture:

```bash
npm run eval
npm run eval:strict
npm run typecheck
```
