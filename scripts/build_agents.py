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
    "company-profile",
    "workflow-company-setup",
    "workflow-launch-offer",
    "workflow-lead-gen-audit",
    "workflow-weekly-review",
    "workflow-retention-recovery",
)

EVAL_IDS = (
    "smoke/company-profile-read",
    "smoke/company-profile-update",
    "smoke/ceo-loads-hooks-skill",
    "smoke/ceo-delegates-growth",
    "smoke/ceo-loads-company-setup-skill",
    "routing/launch-offer-loads-workflow-skill",
    "integration/company-setup-multi-turn",
    "integration/profile-delegate-workflow",
    "integration/profile-persists-collection",
)

DEFAULT_CHUNK_THRESHOLD = 2000
SOURCES_DIR = "sources"
COLLECTION_FILE = "collection.json"
MAX_SECTION_LINES = 500

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


def resolve_sources_dir(input_dir: Path) -> Path:
    sources = input_dir / SOURCES_DIR
    if sources.is_dir():
        return sources
    return input_dir


def find_markdown_sources(input_dir: Path, output_dir: Path) -> list[Path]:
    output_dir = output_dir.resolve()
    sources_dir = resolve_sources_dir(input_dir)
    collection_path = sources_dir / COLLECTION_FILE

    if collection_path.is_file():
        collection = json.loads(collection_path.read_text(encoding="utf-8"))
        discovered: list[Path] = []
        for entry in collection.get("playbooks", []):
            file_name = entry.get("file") or entry.get("path")
            if not file_name:
                continue
            path = (sources_dir / file_name).resolve()
            if not path.is_file():
                continue
            if path.is_relative_to(output_dir):
                continue
            discovered.append(path)
        if discovered:
            return sorted(discovered, key=lambda item: item.name.lower())

    sources: list[Path] = []
    for path in sorted(sources_dir.glob("*.md")):
        if not path.is_file():
            continue
        if path.resolve().is_relative_to(output_dir):
            continue
        sources.append(path)
    return sources


def write_content_collection(
    input_dir: Path,
    playbooks: list[Playbook],
    *,
    dry_run: bool,
) -> None:
    sources_dir = resolve_sources_dir(input_dir)
    if sources_dir.name != SOURCES_DIR:
        return

    payload = {
        "version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "playbooks": [
            {
                "slug": playbook.slug,
                "title": playbook.title,
                "series": playbook.series,
                "file": playbook.path.name,
                "description": playbook.description,
            }
            for playbook in playbooks
        ],
    }
    write_text(
        sources_dir / COLLECTION_FILE,
        json.dumps(payload, indent=2) + "\n",
        overwrite=True,
        dry_run=dry_run,
        label="content collection",
    )


def write_company_profiles_collection(repo_root: Path, *, dry_run: bool) -> None:
    collection_dir = repo_root / "content" / "company-profiles"
    payload = {
        "version": 1,
        "collection": "company-profiles",
        "description": "Persisted company profiles keyed by tenant, user, and company id.",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "items": [],
    }
    write_text(
        collection_dir / "collection.json",
        json.dumps(payload, indent=2) + "\n",
        overwrite=False,
        dry_run=dry_run,
        label="company profiles collection",
    )
    items_dir = collection_dir / "items"
    if not dry_run:
        items_dir.mkdir(parents=True, exist_ok=True)
        gitkeep = items_dir / ".gitkeep"
        if not gitkeep.exists():
            gitkeep.write_text("", encoding="utf-8")


def cleanup_postgres_artifacts(output_dir: Path, *, dry_run: bool) -> None:
    stale_paths = [
        output_dir / "agent" / "lib" / "company-store.ts",
        output_dir / "db",
        output_dir / "scripts" / "db-migrate.ts",
        output_dir / "evals" / "integration" / "profile-persists-postgres.eval.ts",
    ]
    for path in stale_paths:
        if not path.exists():
            continue
        if dry_run:
            print(f"[dry-run] remove stale artifact: {path}")
            continue
        if path.is_dir():
            shutil.rmtree(path)
        else:
            path.unlink()
        print(f"Removed stale artifact: {path}")


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


def count_lines(path: Path) -> int:
    return len(path.read_text(encoding="utf-8").splitlines())


def unique_section_key(base: str, used: set[str]) -> str:
    key = slugify(base)[:50] or "section"
    if key not in used:
        used.add(key)
        return key
    index = 2
    while f"{key}-{index}" in used:
        index += 1
    final = f"{key}-{index}"
    used.add(final)
    return final


def split_long_section(key: str, content: str, max_lines: int, used: set[str]) -> dict[str, str]:
    lines = content.splitlines()
    if len(lines) <= max_lines:
        return {key: content}

    parts: dict[str, str] = {}
    for index, start in enumerate(range(0, len(lines), max_lines), start=1):
        part_key = unique_section_key(f"{key}-part-{index:02d}", used)
        parts[part_key] = "\n".join(lines[start : start + max_lines])
    return parts


def chunk_playbook_markdown(text: str, max_section_lines: int = MAX_SECTION_LINES) -> dict[str, str]:
    used_keys: set[str] = set()
    sections: dict[str, str] = {}
    current_key = unique_section_key("intro", used_keys)
    current_lines: list[str] = []

    for line in text.splitlines():
        if line.startswith("## "):
            if current_lines:
                sections.update(
                    split_long_section(current_key, "\n".join(current_lines), max_section_lines, used_keys)
                )
            current_key = unique_section_key(line[3:].strip(), used_keys)
            current_lines = [line]
        else:
            current_lines.append(line)

    if current_lines:
        sections.update(
            split_long_section(current_key, "\n".join(current_lines), max_section_lines, used_keys)
        )

    return sections


def write_playbook_references(
    skill_dir: Path,
    playbook: Playbook,
    *,
    chunk_threshold: int,
    overwrite: bool,
    dry_run: bool,
) -> tuple[list[str], bool]:
    references_dir = skill_dir / "references"
    playbook_link = references_dir / "playbook.md"
    sections_dir = references_dir / "sections"
    line_count = count_lines(playbook.path)
    chunked = line_count > chunk_threshold

    ensure_symlink(playbook_link, playbook.path, overwrite=overwrite, dry_run=dry_run)

    section_refs: list[str] = []
    if not chunked:
        return section_refs, False

    if dry_run:
        print(f"[dry-run] chunk sections: {sections_dir} ({line_count} lines)")
        return ["references/sections/…"], True

    if sections_dir.exists() and overwrite:
        shutil.rmtree(sections_dir)

    sections = chunk_playbook_markdown(playbook.path.read_text(encoding="utf-8"))
    index_lines = ["# Section index", "", f"Source: `{playbook.path.name}` ({line_count} lines)", ""]

    for section_key, section_body in sections.items():
        section_path = sections_dir / f"{section_key}.md"
        section_path.parent.mkdir(parents=True, exist_ok=True)
        section_path.write_text(section_body + "\n", encoding="utf-8")
        rel = f"references/sections/{section_key}.md"
        section_refs.append(rel)
        index_lines.append(f"- `{rel}`")

    index_lines.extend(
        [
            "",
            "Prefer section files over reading the full `references/playbook.md` for this title.",
        ]
    )
    write_text(
        references_dir / "index.md",
        "\n".join(index_lines) + "\n",
        overwrite=overwrite,
        dry_run=False,
        label=f"section index for {playbook.slug}",
    )
    print(f"Chunked {playbook.slug}: {len(sections)} sections ({line_count} lines)")
    return section_refs, True


def write_playbook_skill(
    skill_dir: Path,
    playbook: Playbook,
    *,
    chunk_threshold: int,
    overwrite: bool,
    dry_run: bool,
) -> None:
    section_refs, chunked = write_playbook_references(
        skill_dir,
        playbook,
        chunk_threshold=chunk_threshold,
        overwrite=overwrite,
        dry_run=dry_run,
    )
    skill_md = skill_dir / "SKILL.md"
    headings = extract_headings(playbook.path.read_text(encoding="utf-8"))
    heading_lines = "\n".join(f"- {heading}" for heading in headings) or "- Full playbook"

    if chunked and section_refs:
        reference_block = "\n".join(
            [
                "Primary reference (large book — prefer sections):",
                "",
                "- `references/index.md`",
                *[f"- `{ref}`" for ref in section_refs[:20]],
                *(["- …"] if len(section_refs) > 20 else []),
                "- `references/playbook.md` (full symlinked source)",
            ]
        )
        step_one = "Read the smallest relevant file under `references/sections/` (use `references/index.md` to choose)."
    else:
        reference_block = "\n".join(
            [
                "Primary reference:",
                "",
                "- `references/playbook.md`",
            ]
        )
        step_one = "Read `references/playbook.md` for the authoritative source material."

    chunked_value = "true" if chunked else "false"
    content = f"""---
description: {playbook.description}
metadata:
  source: "{playbook.path.name}"
  title: "{playbook.title}"
  series: "{playbook.series}"
  chunked: "{chunked_value}"
---

You are applying Alex Hormozi's **{playbook.title}** guidance.

When this skill is loaded:

1. {step_one}
2. Prefer concrete frameworks, checklists, and examples from the reference over generic advice.
3. Name the framework or section you are applying when possible.
4. If the question spans multiple topics, say so and ask whether to load another playbook skill.

{reference_block}

Section guide (read the matching portion of the reference):

{heading_lines}
"""

    write_text(skill_md, content, overwrite=overwrite, dry_run=dry_run, label="skill")


def write_playbook_specialist(
    subagent_dir: Path,
    playbook: Playbook,
    *,
    chunk_threshold: int,
    overwrite: bool,
    dry_run: bool,
) -> None:
    agent_ts = subagent_dir / "agent.ts"
    instructions_md = subagent_dir / "instructions.md"
    skill_dir = subagent_dir / "skills" / playbook.slug

    agent_content = f"""import {{ defineAgent }} from "eve";

import {{ resolveModel }} from "../../../../lib/model.js";

export default defineAgent({{
  description:
    "{playbook.title} specialist. Use for {playbook.title.lower()} frameworks, tactics, audits, and examples from Alex Hormozi's material.",
  model: resolveModel("specialist"),
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
        write_playbook_skill(
            skill_dir,
            playbook,
            chunk_threshold=chunk_threshold,
            overwrite=overwrite,
            dry_run=False,
        )


def write_department(
    dept_dir: Path,
    department: Department,
    playbooks_by_slug: dict[str, Playbook],
    *,
    chunk_threshold: int,
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

import {{ resolveModel }} from "../../lib/model.js";

export default defineAgent({{
  description: "{department.description}",
  model: resolveModel("department"),
}});
"""

    instructions_content = f"""You are the **{department.role}** ({department.title} department) at a Hormozi-style acquisition company.

Your job is to run your department, not to answer from memory alone.

- The CEO's brief includes shared company profile context when relevant — treat it as source of truth for ICP, offer, and metrics.
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
            chunk_threshold=chunk_threshold,
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

## Shared company state

The CEO maintains one canonical company profile for the whole organization:

- Read with `get_company_profile`
- Update with `update_company_profile`
- Load the `company-profile` skill for field definitions and briefing rules

Department heads do not have direct access to those tools. The CEO must paste relevant profile fields into every department brief.

## When to use Workflow vs delegation

- One department owns the outcome → delegate to that department head only.
- Launch, audit, or review spans multiple departments → load the matching `workflow-*` skill, then run `Workflow`.
""",
        "workflow-company-setup": """---
description: Use when onboarding a new company, the profile is empty, or the user wants to set up ICP, offer, metrics, and goals before other work.
---

# Workflow: Company Setup

Run at the start of a new session when `companyName` or `offer` is empty.

## Interview (batch questions)

Ask in 2–3 small batches, not one wall of questions:

1. Company name, core offer, and promise
2. ICP / avatar and primary acquisition channel
3. Price point, current weekly metrics, and top 3 goals

## Persist

After each batch, call `update_company_profile` with confirmed fields.

## Finish

1. Call `get_company_profile` and show a concise summary
2. Recommend the first workflow: launch offer, lead gen audit, or weekly review
3. Do not delegate to departments until offer and avatar are set
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


def write_company_state(output_dir: Path, *, overwrite: bool, dry_run: bool) -> None:
    lib_dir = output_dir / "agent" / "lib"
    tools_dir = output_dir / "agent" / "tools"
    sandbox_dir = output_dir / "agent" / "sandbox" / "workspace" / "company"

    company_state_ts = """import { defineState } from "eve/context";

export type CompanyMetrics = {
  leadsWeekly: number | null;
  adSpendWeekly: number | null;
  cpl: number | null;
  showRate: number | null;
  closeRate: number | null;
  churnRate: number | null;
};

export type CompanyProfile = {
  companyName: string;
  offer: string;
  avatar: string;
  promise: string;
  pricePoint: string;
  channel: string;
  metrics: CompanyMetrics;
  goals: string[];
  updatedAt: string | null;
};

export const emptyCompanyProfile = (): CompanyProfile => ({
  companyName: "",
  offer: "",
  avatar: "",
  promise: "",
  pricePoint: "",
  channel: "",
  metrics: {
    leadsWeekly: null,
    adSpendWeekly: null,
    cpl: null,
    showRate: null,
    closeRate: null,
    churnRate: null,
  },
  goals: [],
  updatedAt: null,
});

export const companyProfile = defineState(
  "hormozi-company.profile",
  emptyCompanyProfile,
);

export function formatProfileMarkdown(profile: CompanyProfile): string {
  const metrics = profile.metrics;
  const goals = profile.goals.length > 0 ? profile.goals.map((g) => `- ${g}`).join("\\n") : "- (none yet)";

  return `# Company Profile

> Shared state for the Hormozi company. Updated by the CEO via \`update_company_profile\`.

## Identity

- **Company:** ${profile.companyName || "(unset)"}
- **Offer:** ${profile.offer || "(unset)"}
- **Avatar (ICP):** ${profile.avatar || "(unset)"}
- **Promise:** ${profile.promise || "(unset)"}
- **Price point:** ${profile.pricePoint || "(unset)"}
- **Primary channel:** ${profile.channel || "(unset)"}

## Metrics

- Leads / week: ${metrics.leadsWeekly ?? "(unset)"}
- Ad spend / week: ${metrics.adSpendWeekly ?? "(unset)"}
- CPL: ${metrics.cpl ?? "(unset)"}
- Show rate: ${metrics.showRate ?? "(unset)"}
- Close rate: ${metrics.closeRate ?? "(unset)"}
- Churn rate: ${metrics.churnRate ?? "(unset)"}

## Goals

${goals}

_Last updated: ${profile.updatedAt ?? "never"}_
`;
}
"""

    model_ts = """import { defineDynamic } from "eve";
import { mockModel } from "eve/evals";

import { createEvalModel } from "./eval-model.js";

export type ModelRole = "ceo" | "department" | "specialist";

const gatewayFallback =
  process.env.HORMOZI_AGENT_MODEL ?? "anthropic/claude-sonnet-4.6";

function evalFixtureModel(role: ModelRole) {
  return role === "ceo"
    ? createEvalModel()
    : mockModel(`${role} eval response.`);
}

function productionModel(role: ModelRole) {
  if (role === "department") {
    return (
      process.env.HORMOZI_DEPARTMENT_MODEL ??
      process.env.HORMOZI_SUBAGENT_MODEL ??
      gatewayFallback
    );
  }

  if (role === "specialist") {
    return (
      process.env.HORMOZI_SPECIALIST_MODEL ??
      process.env.HORMOZI_SUBAGENT_MODEL ??
      gatewayFallback
    );
  }

  return gatewayFallback;
}

export function resolveModel(role: ModelRole = "ceo") {
  return defineDynamic({
    fallback: gatewayFallback,
    events: {
      "session.started": () => productionModel(role),
      "step.started": () => {
        if (process.env.EVE_EVAL !== "1") return null;
        return evalFixtureModel(role);
      },
    },
  });
}
"""

    eval_model_ts = """import { mockModel } from "eve/evals";

export function createEvalModel() {
  return mockModel(({ lastUserMessage, toolResults, messages }) => {
    const respondingToToolResults =
      toolResults.length > 0 && messages.at(-1)?.role === "tool";

    if (respondingToToolResults) {
      const toolNames = toolResults.map((result) =>
        String((result as { toolName?: string }).toolName ?? result.name ?? ""),
      );
      if (toolNames.includes("get_company_profile")) {
        return { text: "Here is the current shared company profile." };
      }
      if (toolNames.includes("update_company_profile")) {
        return { text: "Shared company profile updated." };
      }
      if (toolNames.includes("load_skill")) {
        return { text: "Applied the loaded playbook skill." };
      }
      if (toolNames.includes("growth")) {
        return { text: "Growth department completed the brief." };
      }
      return { text: "Eval fixture step complete." };
    }

    const message = (lastUserMessage ?? "").toLowerCase();

    if (message.includes("read the shared company profile") || message.includes("get_company_profile")) {
      return { toolCalls: [{ name: "get_company_profile", input: {} }] };
    }

    if (message.includes("update the shared company profile") || message.includes("update_company_profile")) {
      return {
        toolCalls: [
          {
            name: "update_company_profile",
            input: {
              companyName: "Eval Fitness Co",
              offer: "12-week transformation program",
              avatar: "Busy professionals who want to lose 20+ lbs",
            },
          },
        ],
      };
    }

    if (message.includes("load hooks skill") || message.includes("load_skill hooks")) {
      return { toolCalls: [{ name: "load_skill", input: { skill: "hooks" } }] };
    }

    if (message.includes("delegate to growth") || message.includes("call growth")) {
      return {
        toolCalls: [{ name: "growth", input: { message: lastUserMessage } }],
      };
    }

    if (message.includes("launch offer workflow") || message.includes("workflow-launch-offer")) {
      return { toolCalls: [{ name: "load_skill", input: { skill: "workflow-launch-offer" } }] };
    }

    if (message.includes("company setup") || message.includes("workflow-company-setup")) {
      return { toolCalls: [{ name: "load_skill", input: { skill: "workflow-company-setup" } }] };
    }

    if (message.includes("multi-turn company setup")) {
      return { toolCalls: [{ name: "load_skill", input: { skill: "workflow-company-setup" } }] };
    }

    if (message.includes("multi-turn persist profile")) {
      return {
        toolCalls: [
          {
            name: "update_company_profile",
            input: {
              companyName: "Eval Fitness Co",
              offer: "12-week transformation program",
              avatar: "Busy professionals who want to lose 20+ lbs",
            },
          },
        ],
      };
    }

    if (message.includes("multi-turn verify profile")) {
      return { toolCalls: [{ name: "get_company_profile", input: {} }] };
    }

    if (message.includes("multi-turn growth brief")) {
      return {
        toolCalls: [{ name: "growth", input: { message: lastUserMessage } }],
      };
    }

    if (message.includes("multi-turn launch workflow")) {
      return { toolCalls: [{ name: "load_skill", input: { skill: "workflow-launch-offer" } }] };
    }

    return { text: "Eval fixture acknowledgment." };
  });
}
"""

    get_profile_ts = """import { defineTool } from "eve/tools";
import { z } from "zod";

import { hydrateCompanyProfile } from "../lib/company-profile-service.js";
import { companyProfile } from "../lib/company-state.js";
import { resolveCompanyScope } from "../lib/tenant.js";

export default defineTool({
  description: "Read the shared company profile used across all departments.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    const scope = resolveCompanyScope(ctx);
    await hydrateCompanyProfile(scope);
    return companyProfile.get();
  },
});
"""

    update_profile_ts = """import { defineTool } from "eve/tools";
import { z } from "zod";

import {
  mergeCompanyProfile,
  persistAndSyncCompanyProfile,
} from "../lib/company-profile-service.js";
import { companyProfile } from "../lib/company-state.js";
import { resolveCompanyScope } from "../lib/tenant.js";

const metricsSchema = z
  .object({
    leadsWeekly: z.number().nullable().optional(),
    adSpendWeekly: z.number().nullable().optional(),
    cpl: z.number().nullable().optional(),
    showRate: z.number().nullable().optional(),
    closeRate: z.number().nullable().optional(),
    churnRate: z.number().nullable().optional(),
  })
  .strict();

const updateSchema = z
  .object({
    companyName: z.string().optional(),
    offer: z.string().optional(),
    avatar: z.string().optional(),
    promise: z.string().optional(),
    pricePoint: z.string().optional(),
    channel: z.string().optional(),
    metrics: metricsSchema.optional(),
    goals: z.array(z.string()).optional(),
  })
  .strict();

export default defineTool({
  description:
    "Update the shared company profile. Partial updates merge into session state, persist to the company-profiles content collection, and sync to /workspace/company/profile.md.",
  inputSchema: updateSchema,
  async execute(input, ctx) {
    const scope = resolveCompanyScope(ctx);
    companyProfile.update((current) => mergeCompanyProfile(current, input));
    const profile = companyProfile.get();
    await persistAndSyncCompanyProfile(scope, profile, ctx);
    return profile;
  },
});
"""

    tenant_ts = """import type { SessionContext } from "eve/context";

export interface CompanyScope {
  tenantId: string;
  userId: string;
  companyId: string;
}

export function resolveCompanyScope(ctx: SessionContext): CompanyScope {
  const caller = ctx.session.auth.current ?? ctx.session.auth.initiator;
  const tenantId =
    typeof caller?.attributes?.tenantId === "string"
      ? caller.attributes.tenantId
      : (caller?.principalId ?? "anonymous");
  const userId =
    caller?.principalType === "user" && caller.principalId
      ? caller.principalId
      : tenantId;

  return {
    tenantId,
    userId,
    companyId: "default",
  };
}
"""

    company_profile_collection_ts = """import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { formatProfileMarkdown, type CompanyProfile } from "./company-state.js";
import type { CompanyScope } from "./tenant.js";

const COLLECTION_NAME = "company-profiles";

type CollectionIndex = {
  version: number;
  collection: string;
  description: string;
  updated_at: string;
  items: CollectionItem[];
};

type CollectionItem = {
  key: string;
  tenant_id: string;
  user_id: string;
  company_id: string;
  file: string;
  markdown: string;
  updated_at: string;
};

export interface CompanyProfileCollection {
  get(scope: CompanyScope): Promise<CompanyProfile | null>;
  put(scope: CompanyScope, profile: CompanyProfile): Promise<CompanyProfile>;
}

function slug(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_") || "anonymous";
}

export function scopeKey(scope: CompanyScope): string {
  return `${slug(scope.tenantId)}__${slug(scope.userId)}__${slug(scope.companyId)}`;
}

function resolveContentRoot(): string {
  if (process.env.CONTENT_COLLECTIONS_ROOT) {
    return process.env.CONTENT_COLLECTIONS_ROOT;
  }

  // Eve dev/eval runs with cwd = hormozi-advisor; repo content lives one level up.
  return join(process.cwd(), "..", "content");
}

function collectionDir(): string {
  return join(resolveContentRoot(), COLLECTION_NAME);
}

function itemsDir(): string {
  return join(collectionDir(), "items");
}

function collectionIndexPath(): string {
  return join(collectionDir(), "collection.json");
}

function profileJsonPath(key: string): string {
  return join(itemsDir(), `${key}.json`);
}

function profileMarkdownPath(key: string): string {
  return join(itemsDir(), `${key}.md`);
}

async function ensureCollectionLayout(): Promise<void> {
  await mkdir(itemsDir(), { recursive: true });
  try {
    await readFile(collectionIndexPath(), "utf8");
  } catch {
    const seed: CollectionIndex = {
      version: 1,
      collection: COLLECTION_NAME,
      description: "Persisted company profiles keyed by tenant, user, and company id.",
      updated_at: new Date().toISOString(),
      items: [],
    };
    await writeFile(collectionIndexPath(), `${JSON.stringify(seed, null, 2)}\\n`, "utf8");
  }
}

async function readIndex(): Promise<CollectionIndex> {
  await ensureCollectionLayout();
  try {
    const raw = await readFile(collectionIndexPath(), "utf8");
    if (!raw.trim()) {
      throw new Error("empty collection index");
    }
    return JSON.parse(raw) as CollectionIndex;
  } catch {
    const seed: CollectionIndex = {
      version: 1,
      collection: COLLECTION_NAME,
      description: "Persisted company profiles keyed by tenant, user, and company id.",
      updated_at: new Date().toISOString(),
      items: [],
    };
    await writeIndex(seed);
    return seed;
  }
}

async function writeIndex(index: CollectionIndex): Promise<void> {
  index.updated_at = new Date().toISOString();
  await writeFile(collectionIndexPath(), `${JSON.stringify(index, null, 2)}\\n`, "utf8");
}

class FileCompanyProfileCollection implements CompanyProfileCollection {
  async get(scope: CompanyScope): Promise<CompanyProfile | null> {
    const key = scopeKey(scope);
    try {
      const raw = await readFile(profileJsonPath(key), "utf8");
      return JSON.parse(raw) as CompanyProfile;
    } catch {
      return null;
    }
  }

  async put(scope: CompanyScope, profile: CompanyProfile): Promise<CompanyProfile> {
    await ensureCollectionLayout();
    const key = scopeKey(scope);
    const updatedAt = profile.updatedAt ?? new Date().toISOString();
    const jsonRel = `items/${key}.json`;
    const mdRel = `items/${key}.md`;

    await writeFile(profileJsonPath(key), `${JSON.stringify(profile, null, 2)}\\n`, "utf8");
    await writeFile(profileMarkdownPath(key), formatProfileMarkdown(profile), "utf8");

    const index = await readIndex();
    const item: CollectionItem = {
      key,
      tenant_id: scope.tenantId,
      user_id: scope.userId,
      company_id: scope.companyId,
      file: jsonRel,
      markdown: mdRel,
      updated_at: updatedAt,
    };
    const existing = index.items.findIndex((entry) => entry.key === key);
    if (existing >= 0) {
      index.items[existing] = item;
    } else {
      index.items.push(item);
    }
    await writeIndex(index);
    return profile;
  }
}

let collection: CompanyProfileCollection | undefined;

export function getCompanyProfileCollection(): CompanyProfileCollection {
  if (!collection) {
    collection = new FileCompanyProfileCollection();
  }
  return collection;
}
"""

    company_profile_service_ts = """import type { ToolContext } from "eve/tools";

import { getCompanyProfileCollection } from "./company-profile-collection.js";
import {
  companyProfile,
  formatProfileMarkdown,
  type CompanyMetrics,
  type CompanyProfile,
} from "./company-state.js";
import type { CompanyScope } from "./tenant.js";

export function mergeCompanyProfile(
  current: CompanyProfile,
  patch: Partial<Omit<CompanyProfile, "metrics" | "goals">> & {
    metrics?: Partial<CompanyMetrics>;
    goals?: string[];
  },
): CompanyProfile {
  const metrics: CompanyMetrics = {
    ...current.metrics,
    ...(patch.metrics ?? {}),
  };

  return {
    ...current,
    ...patch,
    metrics,
    goals: patch.goals ?? current.goals,
    updatedAt: new Date().toISOString(),
  };
}

export async function hydrateCompanyProfile(scope: CompanyScope): Promise<void> {
  const stored = await getCompanyProfileCollection().get(scope);
  if (stored) {
    companyProfile.update(() => stored);
  }
}

export async function persistCompanyProfile(
  scope: CompanyScope,
  profile: CompanyProfile,
): Promise<void> {
  await getCompanyProfileCollection().put(scope, profile);
}

export async function syncProfileToSandbox(
  profile: CompanyProfile,
  ctx: ToolContext,
): Promise<void> {
  try {
    const sandbox = await ctx.getSandbox();
    await sandbox.writeTextFile({
      path: "company/profile.md",
      content: formatProfileMarkdown(profile),
    });
  } catch {
    // Sandbox may be unavailable during discovery or some runtime modes.
  }
}

export async function persistAndSyncCompanyProfile(
  scope: CompanyScope,
  profile: CompanyProfile,
  ctx: ToolContext,
): Promise<void> {
  await persistCompanyProfile(scope, profile);
  await syncProfileToSandbox(profile, ctx);
}
"""

    load_profile_hook_ts = """import { defineHook } from "eve/hooks";

import { hydrateCompanyProfile } from "../lib/company-profile-service.js";
import { resolveCompanyScope } from "../lib/tenant.js";

export default defineHook({
  events: {
    async "session.started"(_event, ctx) {
      const scope = resolveCompanyScope(ctx);
      await hydrateCompanyProfile(scope);
    },
  },
});
"""

    profile_seed = """# Company Profile

> Shared state for the Hormozi company. The CEO updates this via `update_company_profile`.

## Identity

- **Company:** (unset)
- **Offer:** (unset)
- **Avatar (ICP):** (unset)
- **Promise:** (unset)
- **Price point:** (unset)
- **Primary channel:** (unset)

## Metrics

- Leads / week: (unset)
- Ad spend / week: (unset)
- CPL: (unset)
- Show rate: (unset)
- Close rate: (unset)
- Churn rate: (unset)

## Goals

- (none yet)

_Last updated: never_
"""

    company_profile_skill = """---
description: Use when reading or updating the shared company profile, briefing departments, or aligning work to ICP, offer, metrics, and goals.
metadata:
  kind: company-state
---

# Shared Company Profile

One canonical profile drives the whole company. Profiles persist in the `content/company-profiles` content collection (JSON + markdown per tenant/user) and hydrate into session state on startup.

## Tools (CEO only)

- `get_company_profile` — read current profile (hydrates from the content collection)
- `update_company_profile` — merge partial updates and persist to the collection

The synced markdown mirror lives at `/workspace/company/profile.md` in the sandbox.

## Required fields

| Field | Purpose |
| --- | --- |
| `companyName` | Business name |
| `offer` | Core offer being sold |
| `avatar` | ICP / dream customer |
| `promise` | Transformation promised |
| `pricePoint` | Primary price or range |
| `channel` | Main acquisition channel |
| `metrics` | Weekly operating metrics |
| `goals` | Current company priorities |

## Briefing departments

When delegating to `growth`, `monetization`, `sales`, `success`, or `brand`, include:

1. Relevant profile fields (offer, avatar, metrics, goals)
2. The specific outcome you want back
3. Constraints (budget, timeline, tone)

Department heads cannot read the profile tools directly — your brief is their source of truth.

See `references/profile-schema.md` for the full schema.
"""

    profile_schema_ref = """# Company Profile Schema

```json
{
  "companyName": "string",
  "offer": "string",
  "avatar": "string",
  "promise": "string",
  "pricePoint": "string",
  "channel": "string",
  "metrics": {
    "leadsWeekly": "number | null",
    "adSpendWeekly": "number | null",
    "cpl": "number | null",
    "showRate": "number | null",
    "closeRate": "number | null",
    "churnRate": "number | null"
  },
  "goals": ["string"],
  "updatedAt": "ISO-8601 string | null"
}
```
"""

    hooks_dir = output_dir / "agent" / "hooks"

    for path, content, label in [
        (lib_dir / "company-state.ts", company_state_ts, "company-state.ts"),
        (lib_dir / "tenant.ts", tenant_ts, "tenant.ts"),
        (lib_dir / "company-profile-collection.ts", company_profile_collection_ts, "company-profile-collection.ts"),
        (lib_dir / "company-profile-service.ts", company_profile_service_ts, "company-profile-service.ts"),
        (lib_dir / "model.ts", model_ts, "model.ts"),
        (lib_dir / "eval-model.ts", eval_model_ts, "eval-model.ts"),
        (hooks_dir / "load-company-profile.ts", load_profile_hook_ts, "load-company-profile hook"),
        (tools_dir / "get_company_profile.ts", get_profile_ts, "get_company_profile tool"),
        (tools_dir / "update_company_profile.ts", update_profile_ts, "update_company_profile tool"),
        (sandbox_dir / "profile.md", profile_seed, "sandbox company profile seed"),
        (
            output_dir / "agent" / "skills" / "company-profile" / "SKILL.md",
            company_profile_skill,
            "company-profile skill",
        ),
        (
            output_dir / "agent" / "skills" / "company-profile" / "references" / "profile-schema.md",
            profile_schema_ref,
            "company-profile schema reference",
        ),
    ]:
        write_text(path, content, overwrite=overwrite, dry_run=dry_run, label=label)


def write_evals(output_dir: Path, *, overwrite: bool, dry_run: bool) -> None:
    evals_dir = output_dir / "evals"

    evals_config = """import { defineEvalConfig } from "eve/evals";

export default defineEvalConfig({
  timeoutMs: 120_000,
});
"""

    tsconfig = """{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["agent/**/*.ts", "evals/**/*.ts", "scripts/**/*.ts"]
}
"""

    eval_files = {
        "smoke/company-profile-read.eval.ts": """import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO reads the shared company profile via get_company_profile.",
  tags: ["smoke", "company-state"],
  async test(t) {
    await t.send("EVE_EVAL: read the shared company profile using get_company_profile.");
    t.succeeded();
    t.calledTool("get_company_profile", { count: 1 });
  },
});
""",
        "smoke/company-profile-update.eval.ts": """import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO updates the shared company profile via update_company_profile.",
  tags: ["smoke", "company-state"],
  async test(t) {
    await t.send("EVE_EVAL: update the shared company profile for Eval Fitness Co.");
    t.succeeded();
    t.calledTool("update_company_profile", { count: 1 });
  },
});
""",
        "smoke/ceo-loads-hooks-skill.eval.ts": """import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO loads the hooks playbook skill on demand.",
  tags: ["smoke", "skills"],
  async test(t) {
    await t.send("EVE_EVAL: load hooks skill for this answer.");
    t.succeeded();
    t.loadedSkill("hooks", { count: 1 });
  },
});
""",
        "smoke/ceo-delegates-growth.eval.ts": """import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO delegates a brief to the growth department head.",
  tags: ["smoke", "routing"],
  async test(t) {
    await t.send("EVE_EVAL: delegate to growth to audit our top-of-funnel.");
    t.succeeded();
    t.calledSubagent("growth", { count: 1 });
  },
});
""",
        "routing/launch-offer-loads-workflow-skill.eval.ts": """import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO loads the launch-offer workflow skill before orchestration.",
  tags: ["routing", "workflows"],
  async test(t) {
    await t.send("EVE_EVAL: launch offer workflow for a new coaching program.");
    t.succeeded();
    t.loadedSkill("workflow-launch-offer", { count: 1 });
  },
});
""",
        "smoke/ceo-loads-company-setup-skill.eval.ts": """import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO loads the company setup workflow for onboarding.",
  tags: ["smoke", "onboarding"],
  async test(t) {
    await t.send("EVE_EVAL: run company setup workflow for a new business.");
    t.succeeded();
    t.loadedSkill("workflow-company-setup", { count: 1 });
  },
});
""",
        "integration/company-setup-multi-turn.eval.ts": """import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO runs onboarding across setup, update, and read turns.",
  tags: ["integration", "multi-turn", "company-state"],
  async test(t) {
    await t.send("EVE_EVAL: multi-turn company setup workflow for a new business.");
    t.loadedSkill("workflow-company-setup", { count: 1 });

    await t.send("EVE_EVAL: multi-turn persist profile for Eval Fitness Co.");
    t.calledTool("update_company_profile", { count: 1 });

    await t.send("EVE_EVAL: multi-turn verify profile still set.");
    t.calledTool("get_company_profile", { count: 1 });
    t.succeeded();
  },
});
""",
        "integration/profile-delegate-workflow.eval.ts": """import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO updates profile, delegates to growth, then loads launch workflow.",
  tags: ["integration", "multi-turn", "routing"],
  async test(t) {
    await t.send("EVE_EVAL: multi-turn persist profile for Eval Fitness Co.");
    t.calledTool("update_company_profile", { count: 1 });

    await t.send("EVE_EVAL: multi-turn growth brief using the company profile.");
    t.calledSubagent("growth", { count: 1 });

    await t.send("EVE_EVAL: multi-turn launch workflow for our coaching program.");
    t.loadedSkill("workflow-launch-offer", { count: 1 });
    t.succeeded();
  },
});
""",
        "integration/profile-persists-collection.eval.ts": """import { defineEval } from "eve/evals";
import { includes } from "eve/evals/expect";

export default defineEval({
  description: "Company profile survives a new session via the content collection.",
  tags: ["integration", "persistence", "content-collection"],
  async test(t) {
    await t.send("EVE_EVAL: multi-turn persist profile for Eval Fitness Co.");
    t.calledTool("update_company_profile", { count: 1 });

    const session = t.newSession();
    const readTurn = await session.send("EVE_EVAL: multi-turn verify profile still set.");
    session.succeeded();
    const call = readTurn.requireToolCall("get_company_profile");
    await t.require(JSON.stringify(call.output), includes("Eval Fitness Co"));
  },
});
""",
    }

    write_text(evals_dir / "evals.config.ts", evals_config, overwrite=overwrite, dry_run=dry_run, label="evals.config.ts")
    write_text(output_dir / "tsconfig.json", tsconfig, overwrite=overwrite, dry_run=dry_run, label="tsconfig.json")

    for relative_path, content in eval_files.items():
        write_text(
            evals_dir / relative_path,
            content,
            overwrite=overwrite,
            dry_run=dry_run,
            label=f"eval {relative_path}",
        )


def write_eve_channel(output_dir: Path, *, overwrite: bool, dry_run: bool) -> None:
    content = """import { eveChannel } from "eve/channels/eve";
import { localDev, vercelOidc } from "eve/channels/auth";

export default eveChannel({
  auth: [vercelOidc(), localDev()],
  cors: true,
});
"""
    write_text(
        output_dir / "agent" / "channels" / "eve.ts",
        content,
        overwrite=overwrite,
        dry_run=dry_run,
        label="eve channel",
    )


def write_env_example(output_dir: Path, *, overwrite: bool, dry_run: bool) -> None:
    content = """# Copy to .env and fill in for local development or deployment.

# Model routing (Vercel AI Gateway model ids)
HORMOZI_AGENT_MODEL=anthropic/claude-sonnet-4.6
HORMOZI_DEPARTMENT_MODEL=
HORMOZI_SPECIALIST_MODEL=

# Vercel AI Gateway — required for non-eval runs
AI_GATEWAY_API_KEY=

# Root directory for writable content collections (default: ../content from hormozi-advisor)
CONTENT_COLLECTIONS_ROOT=

# Set to 1 for deterministic eve eval fixtures (npm run eval)
EVE_EVAL=0
"""
    write_text(
        output_dir / ".env.example",
        content,
        overwrite=overwrite,
        dry_run=dry_run,
        label=".env.example",
    )


def write_github_ci(repo_root: Path, *, overwrite: bool, dry_run: bool) -> None:
    workflow = """name: Hormozi evals

on:
  push:
    branches: [main]
  pull_request:

jobs:
  eval:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: hormozi-advisor
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: npm
          cache-dependency-path: hormozi-advisor/package-lock.json
      - run: npm ci
      - run: npm run typecheck
      - run: npm run eval:strict
        env:
          EVE_EVAL: "1"
"""
    write_text(
        repo_root / ".github" / "workflows" / "hormozi-evals.yml",
        workflow,
        overwrite=overwrite,
        dry_run=dry_run,
        label="GitHub Actions eval workflow",
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

import { resolveModel } from "./lib/model.js";

const evalMode = process.env.EVE_EVAL === "1";

export default defineAgent({
  ...(evalMode ? {} : { compaction: { thresholdPercent: 0.9 } }),
  model: resolveModel("ceo"),
});
"""

    instructions_content = f"""You are the **CEO** of a Hormozi-style acquisition company powered by Alex Hormozi's playbooks.

You do not guess frameworks. You route work through skills, department heads, specialists, workflows, and shared company state.

## Shared company state

Maintain one canonical company profile for the session:

- `get_company_profile` — read ICP, offer, metrics, and goals
- `update_company_profile` — merge updates as the business evolves
- Load `company-profile` when briefing departments or running workflows

Always include relevant profile fields when delegating to department heads.

## Onboarding

On the first message of a session (or when the user says "set up my company"):

1. Call `get_company_profile`
2. If `companyName` or `offer` is empty, load `workflow-company-setup` and run the interview before other work
3. Persist answers with `update_company_profile` as you go

## Starter prompts

When the user is unsure where to start, suggest:

- "Set up my company profile"
- "Launch a new offer end-to-end"
- "Audit my lead generation"
- "Run a weekly operating review"
- "Write 5 hooks for my core offer"

## Execution modes

1. **Skills** — `load_skill` for quick answers from a single playbook or company workflow doc.
2. **Departments** — delegate to a department head when one function owns the outcome.
3. **Workflow** — use the `Workflow` tool for cross-functional launches, audits, or reviews spanning 2+ departments.

## Routing rules

- Load `company-operating-system` at the start of complex or ambiguous requests.
- Load `company-profile` before cross-department work if profile fields are missing or stale.
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
                "eval": "EVE_EVAL=1 eve eval",
                "eval:strict": "EVE_EVAL=1 eve eval --strict",
                "typecheck": "tsc --noEmit",
            },
            "dependencies": {
                "ai": "^7.0.38",
                "eve": "^0.30.8",
                "zod": "^4.0.0",
            },
            "devDependencies": {
                "@types/node": "^24.0.0",
                "typescript": "^5.9.0",
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

- **Shared company state** — session profile via `get_company_profile` / `update_company_profile`, persisted in `content/company-profiles`
- **Evals** — smoke, routing, integration, and content-collection persistence checks with `npm run eval`
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

Playbook references are symlinked to markdown files under `sources/`. Metadata is indexed in `sources/collection.json`.

## Content collections

Company profiles persist in `content/company-profiles/` as JSON + markdown files, indexed by `collection.json`. Override the root with `CONTENT_COLLECTIONS_ROOT` if needed.

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
            "company_state_tools": ["get_company_profile", "update_company_profile"],
            "persistence": "content-collection",
            "content_collections": {
                "playbooks": "sources/collection.json",
                "company_profiles": "content/company-profiles/collection.json",
            },
            "evals": list(EVAL_IDS),
            "schedules": ["weekly-operating-review", "monthly-unit-economics"],
            "chunk_threshold_default": DEFAULT_CHUNK_THRESHOLD,
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
    repo_root: Path,
    *,
    chunk_threshold: int = DEFAULT_CHUNK_THRESHOLD,
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
    write_company_state(output_dir, overwrite=overwrite, dry_run=dry_run)
    cleanup_postgres_artifacts(output_dir, dry_run=dry_run)
    write_company_profiles_collection(input_dir, dry_run=dry_run)
    write_eve_channel(output_dir, overwrite=overwrite, dry_run=dry_run)
    write_env_example(output_dir, overwrite=overwrite, dry_run=dry_run)
    write_github_ci(repo_root, overwrite=overwrite, dry_run=dry_run)
    write_workflow_tool(output_dir, overwrite=overwrite, dry_run=dry_run)
    write_schedules(output_dir, overwrite=overwrite, dry_run=dry_run)
    write_company_skills(output_dir, overwrite=overwrite, dry_run=dry_run)
    write_evals(output_dir, overwrite=overwrite, dry_run=dry_run)

    for playbook in playbooks:
        write_playbook_skill(
            output_dir / "agent" / "skills" / playbook.slug,
            playbook,
            chunk_threshold=chunk_threshold,
            overwrite=overwrite,
            dry_run=dry_run,
        )

    for department in DEPARTMENTS:
        write_department(
            output_dir / "agent" / "subagents" / department.slug,
            department,
            playbooks_by_slug,
            chunk_threshold=chunk_threshold,
            overwrite=overwrite,
            dry_run=dry_run,
        )

    write_manifest(output_dir, playbooks, dry_run=dry_run)
    write_content_collection(input_dir, playbooks, dry_run=dry_run)

    specialist_count = sum(len(dept.playbook_slugs) for dept in DEPARTMENTS)
    print(
        f"\nDone. Generated Hormozi company in {output_dir}: "
        f"{len(DEPARTMENTS)} departments, {specialist_count} specialists, "
        f"{len(playbooks)} root skills, {len(COMPANY_SKILL_SLUGS)} company skills, "
        f"2 company-state tools, {len(EVAL_IDS)} evals, 1 workflow tool, 2 schedules"
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
    parser.add_argument(
        "--chunk-threshold",
        type=int,
        default=DEFAULT_CHUNK_THRESHOLD,
        help=f"Line count above which playbook references are chunked (default: {DEFAULT_CHUNK_THRESHOLD})",
    )
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
        input_dir,
        chunk_threshold=args.chunk_threshold,
        overwrite=args.overwrite,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    raise SystemExit(main())
