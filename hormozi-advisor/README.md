# Hormozi Advisor

Eve agent generated from Alex Hormozi markdown playbooks and books.

## Regenerate

From the repository root:

```bash
python scripts/build_agents.py --input . --output ./hormozi-advisor --overwrite
```

References are symlinked to the source markdown files in the repository root.

## Run locally

```bash
cd hormozi-advisor
npm install
npm run dev
```

Set `HORMOZI_AGENT_MODEL` (and optionally `HORMOZI_SUBAGENT_MODEL`) before running in production.

Requires Node.js 24 or newer (`nvm install 24`).
