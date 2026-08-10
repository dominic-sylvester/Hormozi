#!/usr/bin/env python3
"""Generate a Hormozi-style eve company with skills, departments, workflows, and schedules."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


PLAYBOOK_PREFIX = "$100M Playbook_ "
LEADS_PREFIX = "$100M Leads_"
MONEY_MODELS_PREFIX = "$100M Money Models_ "
OFFERS_MARKER = "offers_"

COMPANY_SKILL_SLUGS = (
    "company-operating-system",
    "workflow-launch-offer",
    "workflow-lead-gen-audit",
    "workflow-weekly-review",
    "workflow-retention-recovery",
)

DEPARTMENT_SLUGS = ("growth", "monetization", "sales", "success", "brand")


@dataclass(frozen=True)
class Playbook:
    path: Path
    slug: str
    title: str
    series: str
    description: str


@dataclass(frozen=True)
class Department:
    slug: str
    title: str
    role: str
    description: str
    playbook_slugs: tuple[str, ...]


DEPARTMENTS: tuple[Department, ...] = (
    Department(
        slug="growth",
        title="Growth",
        role="Head of Growth",
        description=(
            "Owns lead generation, hooks, paid/organic ads, lead nurture, and the marketing machine. "
            "Use when the user needs traffic, attention, or pipeline."
        ),
        playbook_slugs=("leads", "lead-nurture", "hooks", "goated-ads", "marketing-machine"),
    ),
    Department(
        slug="monetization",
        title="Monetization",
        role="Head of Monetization",
        description=(
            "Owns offers, pricing, money models, price raises, and fast-cash plays. "
            "Use when the user needs revenue model, pricing, or offer design."
        ),
        playbook_slugs=("offers", "pricing", "money-models", "price-raise", "fast-cash"),
    ),
    Department(
        slug="sales",
        title="Sales",
        role="Head of Sales",
        description=(
            "Owns closing frameworks and proof assets that convert interest into customers. "
            "Use when the user needs sales process, objections, or proof."
        ),
        playbook_slugs=("closing", "proof-checklist"),
    ),
    Department(
        slug="success",
        title="Customer Success",
        role="Head of Customer Success",
        description=(
            "Owns retention systems and lifetime value expansion after the sale. "
            "Use when the user needs churn reduction, onboarding, or ascension."
        ),
        playbook_slugs=("retention", "lifetime-value"),
    ),
    Department(
        slug="brand",
        title="Brand",
        role="Head of Brand",
        description=(
            "Owns positioning, brand strategy, and market perception. "
            "Use when the user needs brand voice, identity, or reputation."
        ),
        playbook_slugs=("branding",),
    ),
)


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug or "playbook"


def parse_playbook(path: Path) -> Playbook:
    stem = path.stem

    if PLAYBOOK_PREFIX in stem:
        title = stem.split(PLAYBOOK_PREFIX, 1)[1].split(" -- ")[0].strip()
        series = "playbook"
    elif stem.startswith(LEADS_PREFIX):
        title = "Leads"
        series = "book"
    elif MONEY_MODELS_PREFIX in stem:
        title = "Money Models"
        series = "book"
    elif OFFERS_MARKER in stem.lower():
        title = "Offers"
        series = "book"
    else:
        title = stem.split(" -- ")[0].strip()
        series = "book"

    slug = slugify(title)
    description = build_description(title, series)
    return Playbook(
        path=path.resolve(),
        slug=slug,
        title=title,
        series=series,
        description=description,
    )


def build_description(title: str, series: str) -> str:
    label = "playbook" if series == "playbook" else "book"
    return (
        f"Use when the user asks about Alex Hormozi's {title} material "
        f"from the $100M {label} on offers, marketing, sales, pricing, retention, or growth."
    )


def extract_headings(markdown: str, limit: int = 12) -> list[str]:
    skip = {
        "table of contents",
        "alex hormozi",
        "acquisition.com",
        "legal disclaimer",
    }
    headings: list[str] = []
    for line in markdown.splitlines():
        if not (line.startswith("# ") or line.startswith("## ")):
            continue
        heading = line.lstrip("# ").strip()
        normalized = heading.lower()
        if normalized in skip or normalized.startswith("$100m playbook:"):
            continue
        if heading in headings:
            continue
        headings.append(heading)
        if len(headings) >= limit:
            break
    return headings


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()


def find_markdown_sources(input_dir: Path, output_dir: Path) -> list[Path]:
    output_dir = output_dir.resolve()
    sources: list[Path] = []
    for path in sorted(input_dir.glob("*.md")):
        if not path.is_file():
            continue
        if path.resolve().is_relative_to(output_dir):
            continue
        sources.append(path)
    return sources


def os_path_relpath(target: Path, start: Path) -> str:
    import os

    return os.path.relpath(target, start)


def write_text(path: Path, content: str, *, overwrite: bool, dry_run: bool, label: str) -> None:
    if dry_run:
        print(f"[dry-run] {label}: {path}")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and not overwrite:
        print(f"Skipping {label} (exists): {path}")
        return
    path.write_text(content, encoding="utf-8")
    print(f"Wrote {label}: {path}")


def ensure_symlink(link_path: Path, target_path: Path, *, overwrite: bool, dry_run: bool) -> None:
    if dry_run:
        print(f"[dry-run] symlink: {link_path} -> {target_path}")
        return

    link_path.parent.mkdir(parents=True, exist_ok=True)
    relative_target = Path(os_path_relpath(target_path.resolve(), link_path.parent.resolve()))

    if link_path.is_symlink() or link_path.exists():
        if not overwrite:
            if link_path.is_symlink() and link_path.resolve() == target_path.resolve():
                return
            raise FileExistsError(f"Refusing to overwrite existing path: {link_path}")
        link_path.unlink()

    link_path.symlink_to(relative_target)
    print(f"Linked reference: {link_path} -> {target_path.name}")


def write_playbook_skill(
    skill_dir: Path,
    playbook: Playbook,
    *,
    overwrite: bool,
    dry_run: bool,
) -> None:
    skill_md = skill_dir / "SKILL.md"
    reference_link = skill_dir / "references" / "playbook.md"
    headings = extract_headings(playbook.path.read_text(encoding="utf-8"))
    heading_lines = "\n".join(f"- {heading}" for heading in headings) or "- Full playbook"

    content = f"""---
description: {playbook.description}
metadata:
  source: "{playbook.path.name}"
  title: "{playbook.title}"
  series: "{playbook.series}"
---

You are applying Alex Hormozi's **{playbook.title}** guidance.

When this skill is loaded:

1. Read `references/playbook.md` for the authoritative source material.
2. Prefer concrete frameworks, checklists, and examples from the reference over generic advice.
3. Name the framework or section you are applying when possible.
4. If the question spans multiple topics, say so and ask whether to load another playbook skill.

Primary reference:

- `references/playbook.md`

Section guide (read the matching portion of the reference):

{heading_lines}
"""

    write_text(skill_md, content, overwrite=overwrite, dry_run=dry_run, label="skill")
    ensure_symlink(reference_link, playbook.path, overwrite=overwrite, dry_run=dry_run)


def write_playbook_specialist(
    subagent_dir: Path,
    playbook: Playbook,
    *,
    overwrite: bool,
    dry_run: bool,
) -> None:
    agent_ts = subagent_dir / "agent.ts"
    instructions_md = subagent_dir / "instructions.md"
    skill_dir = subagent_dir / "skills" / playbook.slug

    agent_content = f"""import {{ defineAgent }} from "eve";

export default defineAgent({{
  description:
    "{playbook.title} specialist. Use for {playbook.title.lower()} frameworks, tactics, audits, and examples from Alex Hormozi's material.",
  model: process.env.HORMOZI_SPECIALIST_MODEL ?? process.env.HORMOZI_SUBAGENT_MODEL ?? process.env.HORMOZI_AGENT_MODEL,
}});
"""

    instructions_content = f"""You are the **{playbook.title}** specialist on a Hormozi-style acquisition team.

- Load your `{playbook.slug}` skill before answering playbook-specific questions.
- Read `references/playbook.md` through that skill when you need exact language, steps, or examples.
- Return tactical output: numbered steps, checklists, scripts, or audits — not generic summaries.
- Stay inside this playbook unless your brief explicitly requires another domain.
"""

    write_text(agent_ts, agent_content, overwrite=overwrite, dry_run=dry_run, label="specialist config")
    write_text(
        instructions_md,
        instructions_content,
        overwrite=overwrite,
        dry_run=dry_run,
        label="specialist instructions",
    )
    if not dry_run:
        write_playbook_skill(skill_dir, playbook, overwrite=overwrite, dry_run=False)


def write_department(
    dept_dir: Path,
    department: Department,
    playbooks_by_slug: dict[str, Playbook],
    *,
    overwrite: bool,
    dry_run: bool,
) -> None:
    agent_ts = dept_dir / "agent.ts"
    instructions_md = dept_dir / "instructions.md"

    specialist_lines = "\n".join(
        f"- `{slug}` — {playbooks_by_slug[slug].title} specialist"
        for slug in department.playbook_slugs
    )

    agent_content = f"""import {{ defineAgent }} from "eve";

export default defineAgent({{
  description: "{department.description}",
  model: process.env.HORMOZI_DEPARTMENT_MODEL ?? process.env.HORMOZI_SUBAGENT_MODEL ?? process.env.HORMOZI_AGENT_MODEL,
}});
"""

    instructions_content = f"""You are the **{department.role}** ({department.title} department) at a Hormozi-style acquisition company.

Your job is to run your department, not to answer from memory alone.

- Delegate to the right specialist for playbook-specific work.
- Write self-contained briefs: goal, constraints, context, and desired output format.
- Synthesize specialist outputs into one department recommendation for the CEO.
- Load `{department.slug}-leadership` when you need department operating guidance.

Your specialists:

{specialist_lines}
"""

    write_text(agent_ts, agent_content, overwrite=overwrite, dry_run=dry_run, label="department config")
    write_text(
        instructions_md,
        instructions_content,
        overwrite=overwrite,
        dry_run=dry_run,
        label="department instructions",
    )

    leadership_skill = dept_dir / "skills" / f"{department.slug}-leadership" / "SKILL.md"
    leadership_content = f"""---
description: Leadership guidance for the {department.title} department and when to delegate to its specialists.
metadata:
  department: "{department.slug}"
---

# {department.role}

{department.description}

## Specialists

{specialist_lines}

## Delegation rules

- Pick the smallest set of specialists that can answer the brief.
- When multiple specialists are needed, run them in dependency order and merge outputs.
- Prefer specialist delegation over guessing from general knowledge.
"""
    write_text(
        leadership_skill,
        leadership_content,
        overwrite=overwrite,
        dry_run=dry_run,
        label="department leadership skill",
    )

    for slug in department.playbook_slugs:
        write_playbook_specialist(
            dept_dir / "subagents" / slug,
            playbooks_by_slug[slug],
            overwrite=overwrite,
            dry_run=dry_run,
        )


def write_company_skills(output_dir: Path, *, overwrite: bool, dry_run: bool) -> None:
    skills: dict[str, str] = {
        "company-operating-system": """---
description: Use for company structure, routing, operating principles, and cross-department coordination at a Hormozi-style acquisition company.
---

# Hormozi Company Operating System

## Org chart

- **CEO (you)** — routes work, runs cross-functional workflows, sets priorities.
- **growth** — leads, nurture, hooks, ads, marketing machine.
- **monetization** — offers, pricing, money models, price raises, fast cash.
- **sales** — closing, proof checklist.
- **success** — retention, lifetime value.
- **brand** — branding and positioning.

## Execution modes

1. **Skills** — load a playbook skill for quick, single-domain answers.
2. **Department delegation** — send a brief to `growth`, `monetization`, `sales`, `success`, or `brand`.
3. **Workflow** — use the `Workflow` tool when 2+ departments must run in sequence or parallel.

## Principles

- Make the offer so good people feel stupid saying no before scaling ads.
- Solve getting strangers to want your stuff (leads) before optimizing closing alone.
- Price to value; raise prices with proof, not hope.
- Retention and LTV fund acquisition — never optimize front-end without back-end.
- Brand is the promise kept in public; proof beats claims.

## When to use Workflow vs delegation

- One department owns the outcome → delegate to that department head only.
- Launch, audit, or review spans multiple departments → load the matching `workflow-*` skill, then run `Workflow`.
""",
        "workflow-launch-offer": """---
description: Use when launching a new offer, product, or campaign that needs offer design, proof, hooks, and a go-to-market plan.
---

# Workflow: Launch Offer

Run with the `Workflow` tool when the user wants to launch or relaunch an offer.

## Sequence

1. **monetization** — design the grand slam offer, pricing, and money model.
2. **brand** — align positioning and brand promise with the offer.
3. **sales** — build proof checklist and closing talk track.
4. **growth** — create hooks, ad angles, and lead nurture path.

## Workflow template

```js
const context = "<paste user context>";
const offer = await tools.monetization({
  message: `Design the offer stack and pricing. Context: ${context}`,
});
const brand = await tools.brand({
  message: `Align brand promise and positioning to this offer: ${offer}`,
});
const proof = await tools.sales({
  message: `Build proof checklist and closing outline for: ${offer}`,
});
const gtm = await tools.growth({
  message: `Create hooks, ad angles, and nurture plan for: ${offer}. Brand: ${brand}`,
});
return { offer, brand, proof, gtm };
```

Adjust parallel steps only when outputs are independent.
""",
        "workflow-lead-gen-audit": """---
description: Use when auditing lead generation, ads, hooks, nurture, or top-of-funnel performance.
---

# Workflow: Lead Gen Audit

## Sequence

1. **growth** — audit leads, hooks, ads, nurture, and marketing machine.
2. **monetization** — check whether the front-end offer matches traffic quality.
3. **sales** — verify proof and conversion path from lead to sale.

## Workflow template

```js
const context = "<paste metrics and context>";
const funnel = await tools.growth({
  message: `Audit lead gen, hooks, ads, and nurture. Context: ${context}`,
});
const offerFit = await tools.monetization({
  message: `Review offer and pricing fit for this traffic audit: ${funnel}`,
});
const conversion = await tools.sales({
  message: `Review proof and closing path given this audit: ${funnel}. Offer review: ${offerFit}`,
});
return { funnel, offerFit, conversion };
```
""",
        "workflow-weekly-review": """---
description: Use for weekly operating reviews across growth, monetization, sales, and retention metrics.
---

# Workflow: Weekly Operating Review

## Parallel department reviews

1. **growth** — pipeline, CPL, hook/ad performance, nurture conversion.
2. **monetization** — revenue, ARPU, offer mix, pricing tests.
3. **sales** — close rate, proof gaps, objection patterns.
4. **success** — churn, retention, LTV expansion.

## Workflow template

```js
const week = "<week label and metrics>";
const [growth, monetization, salesReview, success] = await Promise.all([
  tools.growth({ message: `Weekly growth review for ${week}` }),
  tools.monetization({ message: `Weekly monetization review for ${week}` }),
  tools.sales({ message: `Weekly sales review for ${week}` }),
  tools.success({ message: `Weekly retention and LTV review for ${week}` }),
]);
return { growth, monetization, salesReview, success };
```

CEO synthesizes into priorities for next week.
""",
        "workflow-retention-recovery": """---
description: Use when churn is rising, refunds increase, or the user needs a retention and ascension recovery plan.
---

# Workflow: Retention Recovery

## Sequence

1. **success** — diagnose churn, onboarding gaps, and LTV leaks.
2. **monetization** — adjust offer ascension path and pricing where needed.
3. **sales** — update proof and expectations set at sale.
4. **growth** — pause or fix messaging that attracts wrong customers.

## Workflow template

```js
const context = "<churn metrics and context>";
const retention = await tools.success({
  message: `Diagnose retention and LTV issues. Context: ${context}`,
});
const offerPath = await tools.monetization({
  message: `Recommend offer/pricing/ascension fixes: ${retention}`,
});
const proof = await tools.sales({
  message: `Fix proof and expectation-setting from this diagnosis: ${retention}`,
});
const traffic = await tools.growth({
  message: `Adjust acquisition messaging to match fixed offer and proof: ${offerPath}`,
});
return { retention, offerPath, proof, traffic };
```
""",
    }

    for slug, content in skills.items():
        write_text(
            output_dir / "agent" / "skills" / slug / "SKILL.md",
            content,
            overwrite=overwrite,
            dry_run=dry_run,
            label=f"company skill {slug}",
        )


def write_workflow_tool(output_dir: Path, *, overwrite: bool, dry_run: bool) -> None:
    content = """import { experimental_workflow } from "eve/tools";

export default experimental_workflow({
  maxSubagents: 8,
});
"""
    write_text(
        output_dir / "agent" / "tools" / "workflow.ts",
        content,
        overwrite=overwrite,
        dry_run=dry_run,
        label="workflow tool",
    )


def write_schedules(output_dir: Path, *, overwrite: bool, dry_run: bool) -> None:
    schedules = {
        "weekly-operating-review.ts": """import { defineSchedule } from "eve/schedules";

export default defineSchedule({
  cron: "0 14 * * 1",
  markdown: `You are the CEO running the weekly Hormozi company operating review.

Load the workflow-weekly-review skill, then use the Workflow tool to run parallel reviews across growth, monetization, sales, and success for the last 7 days.

If the user has not provided metrics, ask for: leads, ad spend, CPL, show rate, close rate, cash collected, churn, and refund rate.

Deliver:
1. What worked
2. What broke
3. Top 3 priorities for next week
4. Which department owns each priority`,
});
""",
        "monthly-unit-economics.ts": """import { defineSchedule } from "eve/schedules";

export default defineSchedule({
  cron: "0 15 1 * *",
  markdown: `You are the CEO reviewing monthly unit economics.

Delegate to monetization for offer/pricing/LTV analysis, then success for retention trends, then growth for CAC and pipeline quality.

Deliver a one-page summary with: CAC, LTGP, payback period, gross margin, and one pricing or retention lever to pull next month.`,
});
""",
    }

    for filename, content in schedules.items():
        write_text(
            output_dir / "agent" / "schedules" / filename,
            content,
            overwrite=overwrite,
            dry_run=dry_run,
            label=f"schedule {filename}",
        )


def write_root_agent(
    output_dir: Path,
    playbooks: list[Playbook],
    *,
    overwrite: bool,
    dry_run: bool,
) -> None:
    agent_dir = output_dir / "agent"
    playbook_lines = "\n".join(
        f"- `{playbook.slug}` — {playbook.title}" for playbook in playbooks
    )
    department_lines = "\n".join(
        f"- `{dept.slug}` — {dept.role} ({dept.title})" for dept in DEPARTMENTS
    )
    workflow_lines = "\n".join(f"- `{slug}`" for slug in COMPANY_SKILL_SLUGS if slug.startswith("workflow-"))

    agent_content = """import { defineAgent } from "eve";

export default defineAgent({
  compaction: { thresholdPercent: 0.9 },
  model: process.env.HORMOZI_AGENT_MODEL ?? "anthropic/claude-sonnet-4.6",
});
"""

    instructions_content = f"""You are the **CEO** of a Hormozi-style acquisition company powered by Alex Hormozi's playbooks.

You do not guess frameworks. You route work through skills, department heads, specialists, and workflows.

## Execution modes

1. **Skills** — `load_skill` for quick answers from a single playbook or company workflow doc.
2. **Departments** — delegate to a department head when one function owns the outcome.
3. **Workflow** — use the `Workflow` tool for cross-functional launches, audits, or reviews spanning 2+ departments.

## Routing rules

- Load `company-operating-system` at the start of complex or ambiguous requests.
- Load a `workflow-*` skill before running a multi-department `Workflow`.
- Delegate to department heads; they delegate to playbook specialists.
- Use root playbook skills only for fast CEO-level answers that do not need a full department run.
- Never invent frameworks missing from loaded references.

## Department heads

{department_lines}

## Company workflows

{workflow_lines}

## Root playbook skills (fast path)

{playbook_lines}
"""

    package_json = output_dir / "package.json"
    package_content = json.dumps(
        {
            "name": "hormozi-company",
            "private": True,
            "type": "module",
            "engines": {"node": ">=24"},
            "scripts": {
                "dev": "eve dev",
                "build": "eve build",
                "start": "eve start",
                "info": "eve info --json",
            },
            "dependencies": {
                "ai": "^7.0.38",
                "eve": "^0.30.8",
                "zod": "^4.0.0",
            },
        },
        indent=2,
    )
    package_content += "\n"

    readme = output_dir / "README.md"
    readme_content = """# Hormozi Company

Eve agent company generated from Alex Hormozi markdown playbooks and books.

## Company structure

- **CEO (root agent)** — routes work, runs workflows, sets priorities
- **5 departments** — growth, monetization, sales, success, brand
- **15 playbook specialists** — nested under their department
- **Workflow tool** — cross-department orchestration
- **Schedules** — weekly operating review, monthly unit economics

## Regenerate

From the repository root:

```bash
python3 scripts/build_agents.py --input . --output ./hormozi-advisor --overwrite
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
"""

    for path, content, label in [
        (agent_dir / "agent.ts", agent_content, "CEO agent.ts"),
        (agent_dir / "instructions.md", instructions_content, "CEO instructions"),
        (output_dir / "package.json", package_content, "package.json"),
        (output_dir / ".gitignore", "node_modules/\n.eve/\n.env\n.env.*\n!.env.example\n", ".gitignore"),
        (output_dir / ".npmrc", "legacy-peer-deps=true\n", ".npmrc"),
        (readme, readme_content, "README.md"),
    ]:
        write_text(path, content, overwrite=overwrite, dry_run=dry_run, label=label)


def write_manifest(
    output_dir: Path,
    playbooks: list[Playbook],
    *,
    dry_run: bool,
) -> None:
    manifest_path = output_dir / "build-manifest.json"
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "company": {
            "departments": [
                {
                    "slug": dept.slug,
                    "title": dept.title,
                    "role": dept.role,
                    "playbook_slugs": list(dept.playbook_slugs),
                }
                for dept in DEPARTMENTS
            ],
            "workflow_skills": [slug for slug in COMPANY_SKILL_SLUGS if slug.startswith("workflow-")],
            "schedules": ["weekly-operating-review", "monthly-unit-economics"],
        },
        "playbooks": [
            {
                "slug": playbook.slug,
                "title": playbook.title,
                "series": playbook.series,
                "source": os_path_relpath(playbook.path, output_dir.resolve()),
                "sha256": sha256(playbook.path),
            }
            for playbook in playbooks
        ],
    }

    write_text(manifest_path, json.dumps(payload, indent=2) + "\n", overwrite=True, dry_run=dry_run, label="manifest")


def validate_departments(playbooks_by_slug: dict[str, Playbook]) -> list[str]:
    errors: list[str] = []
    assigned: set[str] = set()
    for department in DEPARTMENTS:
        for slug in department.playbook_slugs:
            if slug not in playbooks_by_slug:
                errors.append(f"Department `{department.slug}` references missing playbook `{slug}`")
            if slug in assigned:
                errors.append(f"Playbook `{slug}` assigned to multiple departments")
            assigned.add(slug)
    missing = set(playbooks_by_slug) - assigned
    if missing:
        errors.append(f"Playbooks not assigned to any department: {', '.join(sorted(missing))}")
    return errors


def cleanup_stale_generated(
    output_dir: Path,
    playbooks: list[Playbook],
    *,
    dry_run: bool,
) -> None:
    active_playbook_slugs = {playbook.slug for playbook in playbooks}
    active_root_skills = active_playbook_slugs | set(COMPANY_SKILL_SLUGS)
    active_root_subagents = set(DEPARTMENT_SLUGS)

    skills_dir = output_dir / "agent" / "skills"
    if skills_dir.exists():
        for path in skills_dir.iterdir():
            if path.is_dir() and path.name not in active_root_skills:
                if dry_run:
                    print(f"[dry-run] remove stale root skill: {path}")
                else:
                    shutil.rmtree(path)
                    print(f"Removed stale root skill: {path}")

    subagents_dir = output_dir / "agent" / "subagents"
    if subagents_dir.exists():
        for path in subagents_dir.iterdir():
            if not path.is_dir():
                continue
            if path.name in active_root_subagents:
                continue
            if dry_run:
                print(f"[dry-run] remove stale root subagent: {path}")
            else:
                shutil.rmtree(path)
                print(f"Removed stale root subagent: {path}")


def build_agents(
    input_dir: Path,
    output_dir: Path,
    *,
    overwrite: bool = False,
    dry_run: bool = False,
) -> int:
    sources = find_markdown_sources(input_dir, output_dir)
    if not sources:
        print(f"No markdown sources found in {input_dir}", file=sys.stderr)
        return 1

    playbooks = [parse_playbook(path) for path in sources]
    playbooks_by_slug = {playbook.slug: playbook for playbook in playbooks}

    slug_counts: dict[str, int] = {}
    for playbook in playbooks:
        slug_counts[playbook.slug] = slug_counts.get(playbook.slug, 0) + 1
    duplicates = [slug for slug, count in slug_counts.items() if count > 1]
    if duplicates:
        print(f"Duplicate slugs detected: {', '.join(sorted(duplicates))}", file=sys.stderr)
        return 1

    department_errors = validate_departments(playbooks_by_slug)
    if department_errors:
        for error in department_errors:
            print(error, file=sys.stderr)
        return 1

    if not dry_run:
        output_dir.mkdir(parents=True, exist_ok=True)

    if overwrite:
        cleanup_stale_generated(output_dir, playbooks, dry_run=dry_run)

    write_root_agent(output_dir, playbooks, overwrite=overwrite, dry_run=dry_run)
    write_workflow_tool(output_dir, overwrite=overwrite, dry_run=dry_run)
    write_schedules(output_dir, overwrite=overwrite, dry_run=dry_run)
    write_company_skills(output_dir, overwrite=overwrite, dry_run=dry_run)

    for playbook in playbooks:
        write_playbook_skill(
            output_dir / "agent" / "skills" / playbook.slug,
            playbook,
            overwrite=overwrite,
            dry_run=dry_run,
        )

    for department in DEPARTMENTS:
        write_department(
            output_dir / "agent" / "subagents" / department.slug,
            department,
            playbooks_by_slug,
            overwrite=overwrite,
            dry_run=dry_run,
        )

    write_manifest(output_dir, playbooks, dry_run=dry_run)

    specialist_count = sum(len(dept.playbook_slugs) for dept in DEPARTMENTS)
    print(
        f"\nDone. Generated Hormozi company in {output_dir}: "
        f"{len(DEPARTMENTS)} departments, {specialist_count} specialists, "
        f"{len(playbooks)} root skills, {len(COMPANY_SKILL_SLUGS)} company skills, "
        f"1 workflow tool, 2 schedules"
    )
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a Hormozi-style eve company with departments, workflows, and symlinked references.",
    )
    parser.add_argument("-i", "--input", type=Path, default=Path("."))
    parser.add_argument("-o", "--output", type=Path, default=Path("hormozi-advisor"))
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_dir = args.input.resolve()
    output_dir = args.output.resolve()

    if not input_dir.exists() or not input_dir.is_dir():
        print(f"Input directory does not exist: {input_dir}", file=sys.stderr)
        return 1

    return build_agents(
        input_dir,
        output_dir,
        overwrite=args.overwrite,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    raise SystemExit(main())
