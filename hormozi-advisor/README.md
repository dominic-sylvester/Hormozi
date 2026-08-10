# Hormozi Company

Eve agent company generated from Alex Hormozi markdown playbooks and books.

## Company structure

- **CEO (root agent)** — routes work, runs workflows, sets priorities
- **5 departments** — growth, monetization, sales, success, brand
- **15 playbook specialists** — nested under their department
- **Workflow tool** — cross-department orchestration
- **Schedules** — weekly operating review, monthly unit economics

- **Shared company state** — session profile via `get_company_profile` / `update_company_profile`
- **Evals** — smoke and routing checks with `npm run eval`
- **HTTP channel** — `agent/channels/eve.ts` for API clients and future UI
- **Onboarding** — `workflow-company-setup` skill for empty profiles
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

Playbook references are symlinked to markdown files in the repository root.

## Run locally

```bash
cd hormozi-advisor
npm install
npm run dev
npx eve info --json
```

Requires Node.js 24+. Set `HORMOZI_AGENT_MODEL`, `HORMOZI_DEPARTMENT_MODEL`, and `HORMOZI_SPECIALIST_MODEL` as needed.

## Evals

Deterministic evals use `EVE_EVAL=1` and a mock CEO model fixture:

```bash
npm run eval
npm run eval:strict
npm run typecheck
```
