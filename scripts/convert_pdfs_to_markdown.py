#!/usr/bin/env python3
"""Convert all PDF files in a directory to Markdown using MarkItDown."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from markitdown import MarkItDown


def find_pdfs(input_dir: Path, recursive: bool) -> list[Path]:
    pattern = "**/*.pdf" if recursive else "*.pdf"
    return sorted(path for path in input_dir.glob(pattern) if path.is_file())


def output_path_for(
    pdf_path: Path,
    input_dir: Path,
    output_dir: Path,
    preserve_structure: bool,
) -> Path:
    if preserve_structure:
        relative = pdf_path.relative_to(input_dir)
        return output_dir / relative.with_suffix(".md")

    return output_dir / f"{pdf_path.stem}.md"


def convert_pdfs(
    input_dir: Path,
    output_dir: Path,
    *,
    recursive: bool = True,
    preserve_structure: bool = False,
    overwrite: bool = False,
) -> int:
    pdfs = find_pdfs(input_dir, recursive)
    if not pdfs:
        print(f"No PDF files found in {input_dir}", file=sys.stderr)
        return 1

    converter = MarkItDown(enable_plugins=False)
    succeeded = 0
    failed = 0
    skipped = 0

    for pdf_path in pdfs:
        destination = output_path_for(pdf_path, input_dir, output_dir, preserve_structure)

        if destination.exists() and not overwrite:
            print(f"Skipping (exists): {destination}")
            skipped += 1
            continue

        destination.parent.mkdir(parents=True, exist_ok=True)

        try:
            result = converter.convert_local(pdf_path)
            destination.write_text(result.markdown, encoding="utf-8")
            print(f"Converted: {pdf_path} -> {destination}")
            succeeded += 1
        except Exception as error:
            print(f"Failed: {pdf_path} ({error})", file=sys.stderr)
            failed += 1

    print(
        f"\nDone. Converted: {succeeded}, skipped: {skipped}, failed: {failed}, total: {len(pdfs)}"
    )
    return 0 if failed == 0 else 1


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert PDF files to Markdown using MarkItDown.",
    )
    parser.add_argument(
        "-i",
        "--input",
        type=Path,
        default=Path("pdfs"),
        help="Directory containing PDF files (default: ./pdfs)",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("markdown"),
        help="Directory for Markdown output (default: ./markdown)",
    )
    parser.add_argument(
        "--no-recursive",
        action="store_true",
        help="Only convert PDFs in the top-level input directory",
    )
    parser.add_argument(
        "--preserve-structure",
        action="store_true",
        help="Mirror input subdirectories in the output folder",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing Markdown files",
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

    output_dir.mkdir(parents=True, exist_ok=True)

    return convert_pdfs(
        input_dir,
        output_dir,
        recursive=not args.no_recursive,
        preserve_structure=args.preserve_structure,
        overwrite=args.overwrite,
    )


if __name__ == "__main__":
    raise SystemExit(main())
