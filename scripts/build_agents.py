#!/usr/bin/env python3
"""Generate an eve agent project with skills, subagents, and symlinked references."""

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


@dataclass(frozen=True)
class Playbook:
    path: Path
    slug: str
    title: str
    series: str
    description: str


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


def ensure_symlink(link_path: Path, target_path: Path, *, overwrite: bool) -> None:
    link_path.parent.mkdir(parents=True, exist_ok=True)
    relative_target = Path(
        os_path_relpath(target_path.resolve(), link_path.parent.resolve())
    )

    if link_path.is_symlink() or link_path.exists():
        if not overwrite:
            if link_path.is_symlink() and link_path.resolve() == target_path.resolve():
                return
            raise FileExistsError(f"Refusing to overwrite existing path: {link_path}")
        link_path.unlink()

    link_path.symlink_to(relative_target)


def os_path_relpath(target: Path, start: Path) -> str:
    # pathlib.Path.relative_to requires target to be under start; relpath handles siblings.
    import os

    return os.path.relpath(target, start)


def write_skill(
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

    if dry_run:
        print(f"[dry-run] skill: {skill_md}")
        print(f"[dry-run] symlink: {reference_link} -> {playbook.path}")
        return

    skill_dir.mkdir(parents=True, exist_ok=True)
    if skill_md.exists() and not overwrite:
        print(f"Skipping skill (exists): {skill_md}")
    else:
        skill_md.write_text(content, encoding="utf-8")
        print(f"Wrote skill: {skill_md}")

    ensure_symlink(reference_link, playbook.path, overwrite=overwrite)
    print(f"Linked reference: {reference_link} -> {playbook.path.name}")


def write_subagent(
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
    "Specialist for Alex Hormozi's {playbook.title} material. Use when the question is primarily about {playbook.title.lower()} frameworks, tactics, or examples.",
  model: process.env.HORMOZI_SUBAGENT_MODEL ?? process.env.HORMOZI_AGENT_MODEL,
}});
"""

    instructions_content = f"""You are the **{playbook.title}** specialist for Alex Hormozi's Acquisition.com material.

- Load your `{playbook.slug}` skill before answering playbook-specific questions.
- Read `references/playbook.md` through that skill when you need exact language, steps, or examples.
- Stay inside this playbook unless the user explicitly asks to combine it with another domain.
- Be direct and tactical. Prefer numbered steps and concrete recommendations.
"""

    if dry_run:
        print(f"[dry-run] subagent: {subagent_dir}")
        return

    subagent_dir.mkdir(parents=True, exist_ok=True)

    if agent_ts.exists() and not overwrite:
        print(f"Skipping subagent config (exists): {agent_ts}")
    else:
        agent_ts.write_text(agent_content, encoding="utf-8")
        print(f"Wrote subagent config: {agent_ts}")

    if instructions_md.exists() and not overwrite:
        print(f"Skipping subagent instructions (exists): {instructions_md}")
    else:
        instructions_md.write_text(instructions_content, encoding="utf-8")
        print(f"Wrote subagent instructions: {instructions_md}")

    write_skill(skill_dir, playbook, overwrite=overwrite, dry_run=False)


def write_root_agent(
    output_dir: Path,
    playbooks: list[Playbook],
    *,
    overwrite: bool,
    dry_run: bool,
) -> None:
    agent_dir = output_dir / "agent"
    agent_ts = agent_dir / "agent.ts"
    instructions_md = agent_dir / "instructions.md"

    skill_lines = "\n".join(
        f"- `{playbook.slug}` — {playbook.title}" for playbook in playbooks
    )
    subagent_lines = "\n".join(
        f"- `{playbook.slug}` — {playbook.title} specialist" for playbook in playbooks
    )

    agent_content = """import { defineAgent } from "eve";

export default defineAgent({
  model: process.env.HORMOZI_AGENT_MODEL ?? "anthropic/claude-sonnet-4.6",
});
"""

    instructions_content = f"""You are a business growth advisor grounded in Alex Hormozi's Acquisition.com library.

You have two ways to reach playbook knowledge:

1. **Skills** — load the relevant skill with `load_skill` when you need on-demand playbook guidance in this conversation.
2. **Subagents** — delegate to a specialist subagent when the task needs focused execution inside one playbook domain.

Routing rules:

- Prefer `load_skill` for quick answers, summaries, and single-framework questions.
- Delegate to a subagent when the user wants a deep workflow, audit, plan, or multi-step implementation in one domain.
- Load or delegate to every playbook that materially affects the answer.
- Do not invent frameworks that are not present in the loaded reference material.

Available skills:

{skill_lines}

Available subagents:

{subagent_lines}
"""

    package_json = output_dir / "package.json"
    package_content = json.dumps(
        {
            "name": "hormozi-advisor",
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

    gitignore = output_dir / ".gitignore"
    gitignore_content = "\n".join(
        [
            "node_modules/",
            ".eve/",
            ".env",
            ".env.*",
            "!.env.example",
            "",
        ]
    )

    npmrc = output_dir / ".npmrc"
    npmrc_content = "legacy-peer-deps=true\n"

    readme = output_dir / "README.md"
    readme_content = f"""# Hormozi Advisor

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
"""

    if dry_run:
        print(f"[dry-run] root agent in {agent_dir}")
        return

    agent_dir.mkdir(parents=True, exist_ok=True)

    for path, content, label in [
        (agent_ts, agent_content, "agent.ts"),
        (instructions_md, instructions_content, "instructions.md"),
        (package_json, package_content, "package.json"),
        (gitignore, gitignore_content, ".gitignore"),
        (npmrc, npmrc_content, ".npmrc"),
        (readme, readme_content, "README.md"),
    ]:
        if path.exists() and not overwrite:
            print(f"Skipping {label} (exists): {path}")
        else:
            path.write_text(content, encoding="utf-8")
            print(f"Wrote {label}: {path}")


def write_manifest(output_dir: Path, playbooks: list[Playbook], *, dry_run: bool) -> None:
    manifest_path = output_dir / "build-manifest.json"
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
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

    if dry_run:
        print(f"[dry-run] manifest: {manifest_path}")
        return

    manifest_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote manifest: {manifest_path}")


def cleanup_stale_generated(output_dir: Path, playbooks: list[Playbook], *, dry_run: bool) -> None:
    active_slugs = {playbook.slug for playbook in playbooks}
    for slot in ("skills", "subagents"):
        slot_dir = output_dir / "agent" / slot
        if not slot_dir.exists():
            continue
        for path in slot_dir.iterdir():
            if not path.is_dir() or path.name in active_slugs:
                continue
            if dry_run:
                print(f"[dry-run] remove stale {slot}: {path}")
                continue
            shutil.rmtree(path)
            print(f"Removed stale {slot}: {path}")


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
    slug_counts: dict[str, int] = {}
    for playbook in playbooks:
        slug_counts[playbook.slug] = slug_counts.get(playbook.slug, 0) + 1

    duplicates = [slug for slug, count in slug_counts.items() if count > 1]
    if duplicates:
        print(f"Duplicate slugs detected: {', '.join(sorted(duplicates))}", file=sys.stderr)
        return 1

    if not dry_run:
        output_dir.mkdir(parents=True, exist_ok=True)

    if overwrite:
        cleanup_stale_generated(output_dir, playbooks, dry_run=dry_run)

    write_root_agent(output_dir, playbooks, overwrite=overwrite, dry_run=dry_run)

    for playbook in playbooks:
        skill_dir = output_dir / "agent" / "skills" / playbook.slug
        subagent_dir = output_dir / "agent" / "subagents" / playbook.slug
        write_skill(skill_dir, playbook, overwrite=overwrite, dry_run=dry_run)
        write_subagent(subagent_dir, playbook, overwrite=overwrite, dry_run=dry_run)

    write_manifest(output_dir, playbooks, dry_run=dry_run)

    print(
        f"\nDone. Generated {len(playbooks)} skills and {len(playbooks)} subagents in {output_dir}"
    )
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build an eve agent with skills, subagents, and symlinked playbook references.",
    )
    parser.add_argument(
        "-i",
        "--input",
        type=Path,
        default=Path("."),
        help="Directory containing source markdown files (default: .)",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("hormozi-advisor"),
        help="Output directory for the generated eve project (default: ./hormozi-advisor)",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite generated files and recreate symlinks",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print planned changes without writing files",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_dir = args.input.resolve()
    output_dir = args.output.resolve()

    if not input_dir.exists():
        print(f"Input directory does not exist: {input_dir}", file=sys.stderr)
        return 1

    if not input_dir.is_dir():
        print(f"Input path is not a directory: {input_dir}", file=sys.stderr)
        return 1

    return build_agents(
        input_dir,
        output_dir,
        overwrite=args.overwrite,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    raise SystemExit(main())
