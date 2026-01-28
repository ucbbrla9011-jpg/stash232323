#!/usr/bin/env python3
"""
Apply patch map entries from scripts/patch-map.json.

This script is intended for non-technical users:
- It validates that each source file exists before copying.
- It creates a timestamped .bak backup of any existing target file.
- It logs every action in plain language.
- It prints a friendly success/failure summary at the end.
"""

from __future__ import annotations

import json
import shutil
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable


@dataclass(frozen=True)
class PatchEntry:
    source: str
    target: str
    comment: str | None = None


def load_patch_map(patch_map_path: Path) -> list[PatchEntry]:
    data = json.loads(patch_map_path.read_text(encoding="utf-8"))
    entries = data.get("entries", [])
    parsed_entries: list[PatchEntry] = []
    for entry in entries:
        parsed_entries.append(
            PatchEntry(
                source=str(entry.get("source", "")).strip(),
                target=str(entry.get("target", "")).strip(),
                comment=str(entry.get("comment", "")).strip() or None,
            )
        )
    return parsed_entries


def timestamp_suffix() -> str:
    return datetime.now().strftime("%Y%m%d%H%M%S")


def ensure_parent_dir(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def describe_entry(entry: PatchEntry) -> str:
    detail = f"{entry.source} -> {entry.target}"
    if entry.comment:
        return f"{detail} ({entry.comment})"
    return detail


def copy_with_backup(repo_root: Path, entry: PatchEntry) -> tuple[bool, str]:
    source_path = repo_root / entry.source
    target_path = repo_root / entry.target

    if not source_path.exists():
        return False, f"Source file not found: {source_path}"

    ensure_parent_dir(target_path)

    if target_path.exists():
        backup_path = target_path.with_suffix(
            f"{target_path.suffix}.bak-{timestamp_suffix()}"
        )
        shutil.copy2(target_path, backup_path)
        backup_message = f"Backed up existing file to {backup_path}"
    else:
        backup_message = "No existing file to back up"

    shutil.copy2(source_path, target_path)
    return True, f"Copied to {target_path}. {backup_message}."


def log_heading(message: str) -> None:
    print("\n" + message)
    print("-" * len(message))


def log_action(message: str) -> None:
    print(f"- {message}")


def summarize(results: Iterable[tuple[PatchEntry, bool, str]]) -> None:
    successes = [result for result in results if result[1]]
    failures = [result for result in results if not result[1]]

    log_heading("Summary")
    if not failures:
        log_action(
            "All files were copied successfully. You can now find them under the .stash folder."
        )
    else:
        log_action(
            "Some files could not be copied. You can fix the issues below and run the script again."
        )

    log_action(f"Successful copies: {len(successes)}")
    if failures:
        log_action(f"Files that need attention: {len(failures)}")
        for entry, _, message in failures:
            log_action(f"{describe_entry(entry)} -> {message}")


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    patch_map_path = repo_root / "scripts" / "patch-map.json"

    if not patch_map_path.exists():
        print(
            "Patch map file not found. Please create scripts/patch-map.json first."
        )
        raise SystemExit(1)

    entries = load_patch_map(patch_map_path)
    if not entries:
        print(
            "Patch map is empty. Add entries to scripts/patch-map.json and try again."
        )
        raise SystemExit(1)

    log_heading("Applying patch map")
    results: list[tuple[PatchEntry, bool, str]] = []

    for entry in entries:
        if not entry.source or not entry.target:
            message = "Entry is missing a source or target path."
            log_action(f"Skipping entry: {message}")
            results.append((entry, False, message))
            continue

        log_action(f"Processing {describe_entry(entry)}")
        success, message = copy_with_backup(repo_root, entry)
        if success:
            log_action(f"Success: {message}")
        else:
            log_action(f"Failed: {message}")
        results.append((entry, success, message))

    summarize(results)


if __name__ == "__main__":
    main()
