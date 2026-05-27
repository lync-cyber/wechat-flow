"""One-shot fixer: inject tdd_acceptance for feature tasks and tdd_mode: skip for design/validation tasks across dev-plan sprint volumes.

Idempotent — skips tasks that already have tdd_acceptance or tdd_mode: skip.

Run from project root:
    python scripts/fix-dev-plan-tdd-fields.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

SPRINT_FILES = [
    "docs/dev-plan/dev-plan-wechat-flow-s0.md",
    "docs/dev-plan/dev-plan-wechat-flow-s1.md",
    "docs/dev-plan/dev-plan-wechat-flow-s2.md",
    "docs/dev-plan/dev-plan-wechat-flow-s3.md",
    "docs/dev-plan/dev-plan-wechat-flow-s4.md",
    "docs/dev-plan/dev-plan-wechat-flow-s5.md",
    "docs/dev-plan/dev-plan-wechat-flow-s6.md",
]

# Skip reasons by task_kind
SKIP_REASONS = {
    "design": "Penpot 设计稿，由用户视觉验证 sign-off",
    "validation": "由 orchestrator 触发用户手动验证，不进 TDD 流程",
    "chore": "脚手架/配置任务，无单元测试价值",
    "config": "配置文件初始化，无单元测试价值",
}


def split_into_tasks(content: str) -> list[tuple[str, str]]:
    """Split markdown content into (preamble, task_blocks).

    A task block starts with a heading like `### T-NNN:` or `## T-NNN —` etc.
    Supports h2/h3/h4 heading levels and any separator after the ID.
    """
    # Split on task headings (## or ### or #### T-... starting a line)
    parts = re.split(r"(?=^#{2,4} T-[A-Z0-9-]+)", content, flags=re.MULTILINE)
    if not parts:
        return content, []
    preamble = parts[0]
    tasks = parts[1:]
    return preamble, tasks


def detect_task_kind(task_block: str) -> str | None:
    m = re.search(r"^- \*\*task_kind\*\*:\s*(\S+)", task_block, flags=re.MULTILINE)
    return m.group(1).strip() if m else None


def has_tdd_acceptance(task_block: str) -> bool:
    return bool(
        re.search(r"^- \*\*tdd_acceptance\*\*:", task_block, flags=re.MULTILINE)
    )


def has_tdd_skip(task_block: str) -> bool:
    return bool(
        re.search(r"^- \*\*tdd_mode\*\*:\s*skip", task_block, flags=re.MULTILINE)
    )


def has_tdd_mode(task_block: str) -> bool:
    return bool(re.search(r"^- \*\*tdd_mode\*\*:", task_block, flags=re.MULTILINE))


def count_acs(task_block: str) -> int:
    """Count AC-NNN occurrences in acceptance_criteria block."""
    return len(re.findall(r"AC-\d+", task_block))


def inject_tdd_acceptance(task_block: str) -> str:
    """Insert `- **tdd_acceptance**: all` immediately after `- **tdd_mode**: <value>` line."""
    if has_tdd_acceptance(task_block):
        return task_block

    pattern = re.compile(r"(^- \*\*tdd_mode\*\*:\s*\S+.*$)", flags=re.MULTILINE)
    return pattern.sub(r"\1\n- **tdd_acceptance**: all", task_block, count=1)


def inject_tdd_skip(task_block: str, task_kind: str) -> str:
    """Insert tdd_mode: skip + tdd_acceptance: skip + tdd_skip_reason after task_kind line.

    `tdd_acceptance: skip` satisfies the doc-review Layer 1 checker which requires the keyword
    `tdd_acceptance` to appear in every task section regardless of task_kind.
    """
    reason = SKIP_REASONS.get(task_kind, "由 orchestrator/用户验证，不进 TDD 流程")
    has_mode = has_tdd_mode(task_block)
    has_acc = has_tdd_acceptance(task_block)

    if has_mode and has_acc:
        return task_block

    inject_lines = []
    if not has_mode:
        inject_lines.append("- **tdd_mode**: skip")
    if not has_acc:
        inject_lines.append("- **tdd_acceptance**: skip")
    if not has_mode:
        inject_lines.append(f'- **tdd_skip_reason**: "{reason}"')
    injection = "\n" + "\n".join(inject_lines)

    # Try to insert after task_kind line
    pattern = re.compile(r"(^- \*\*task_kind\*\*:\s*\S+.*$)", flags=re.MULTILINE)
    new_block, count = pattern.subn(
        r"\1" + injection.replace("\\", "\\\\"), task_block, count=1
    )
    if count > 0:
        return new_block

    # Fallback: append before deliverables
    pattern = re.compile(r"(^- \*\*deliverables\*\*:)", flags=re.MULTILINE)
    return pattern.sub(injection.lstrip() + r"\n\1", task_block, count=1)


def process_task(task_block: str) -> tuple[str, str]:
    """Return (new_block, action_taken).

    action_taken: 'tdd_acceptance_added' | 'tdd_skip_added' | 'tdd_acceptance_only_added' | 'skipped_existing' | 'unknown_kind'
    """
    kind = detect_task_kind(task_block)
    if kind in ("feature", "fix", "code"):
        if has_tdd_acceptance(task_block):
            return task_block, "skipped_existing"
        return inject_tdd_acceptance(task_block), "tdd_acceptance_added"
    if kind in ("design", "validation", "chore", "config", "docs"):
        has_mode = has_tdd_mode(task_block)
        has_acc = has_tdd_acceptance(task_block)
        if has_mode and has_acc:
            return task_block, "skipped_existing"
        return inject_tdd_skip(task_block, kind), "tdd_skip_added"
    return task_block, f"unknown_kind:{kind}"


def fix_s6_frontmatter(content: str) -> tuple[str, list[str]]:
    """Fix Sprint 6 specific frontmatter issues: add consumers, split_from, fix volume, add [NAV]."""
    changes = []

    # Ensure consumers field
    if "consumers:" not in content.split("---", 2)[1]:
        # Add after `status: draft` line
        content = re.sub(
            r"(^status:\s*draft\s*$)",
            r"\1\nconsumers: [developer, qa-engineer]",
            content,
            count=1,
            flags=re.MULTILINE,
        )
        changes.append("added consumers")

    # Ensure split_from field
    if "split_from:" not in content.split("---", 2)[1]:
        content = re.sub(
            r"(^volume_type:\s*sprint\s*$)",
            r"\1\nsplit_from: \"dev-plan-wechat-flow\"",
            content,
            count=1,
            flags=re.MULTILINE,
        )
        changes.append("added split_from")

    # Fix volume value if it's `s6`
    new_content = re.sub(
        r"^volume:\s*s6\s*$", "volume: sprint", content, count=1, flags=re.MULTILINE
    )
    if new_content != content:
        content = new_content
        changes.append("volume: s6 → sprint")

    # Ensure split_policy
    if "split_policy:" not in content.split("---", 2)[1]:
        content = re.sub(
            r"(^split_from:\s*\"dev-plan-wechat-flow\"\s*$)",
            r"\1\nsplit_policy: no-further-split",
            content,
            count=1,
            flags=re.MULTILINE,
        )
        changes.append("added split_policy: no-further-split")

    # Ensure [NAV] block exists after main heading
    if "[NAV]" not in content:
        # Find first `# ` heading and insert [NAV] after first blank line following it
        heading_match = re.search(r"^# .+$", content, flags=re.MULTILINE)
        if heading_match:
            heading_end = heading_match.end()
            # Extract task IDs from content
            task_ids = re.findall(r"^### (T-[A-Z0-9-]+)", content, flags=re.MULTILINE)
            ids_str = ", ".join(task_ids[:8])
            if len(task_ids) > 8:
                ids_str += f" ...（共 {len(task_ids)} 个任务）"
            nav_block = f"\n\n[NAV]\n- Sprint 6 任务卡 → {ids_str}\n[/NAV]"
            content = content[:heading_end] + nav_block + content[heading_end:]
            changes.append("added [NAV] block")

    return content, changes


def bump_version(content: str) -> tuple[str, bool]:
    """Bump version 0.1.0 → 0.1.1 in frontmatter."""
    new_content, count = re.subn(
        r'^version:\s*"0\.1\.0"\s*$',
        'version: "0.1.1"',
        content,
        count=1,
        flags=re.MULTILINE,
    )
    return new_content, count > 0


def process_file(path: Path) -> dict:
    content = path.read_text(encoding="utf-8")
    original = content

    summary = {
        "file": str(path),
        "tasks_total": 0,
        "tdd_acceptance_added": 0,
        "tdd_skip_added": 0,
        "skipped_existing": 0,
        "unknown_kind": 0,
        "frontmatter_changes": [],
        "version_bumped": False,
    }

    # Sprint 6 specific frontmatter fix
    if path.name.endswith("-s6.md"):
        content, fm_changes = fix_s6_frontmatter(content)
        summary["frontmatter_changes"] = fm_changes

    # Split into tasks and process each
    preamble, task_blocks = split_into_tasks(content)
    new_task_blocks = []
    for task in task_blocks:
        summary["tasks_total"] += 1
        new_block, action = process_task(task)
        new_task_blocks.append(new_block)
        if action == "tdd_acceptance_added":
            summary["tdd_acceptance_added"] += 1
        elif action == "tdd_skip_added":
            summary["tdd_skip_added"] += 1
        elif action == "skipped_existing":
            summary["skipped_existing"] += 1
        else:
            summary["unknown_kind"] += 1

    content = preamble + "".join(new_task_blocks)

    # Version bump
    content, bumped = bump_version(content)
    summary["version_bumped"] = bumped

    if content != original:
        path.write_text(content, encoding="utf-8")
        summary["written"] = True
    else:
        summary["written"] = False

    return summary


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    print(f"Project root: {root}")

    for rel in SPRINT_FILES:
        path = root / rel
        if not path.exists():
            print(f"  SKIP: {rel} (not found)")
            continue
        summary = process_file(path)
        print(
            f"  {rel}: "
            f"+tdd_acceptance={summary['tdd_acceptance_added']}, "
            f"+tdd_skip={summary['tdd_skip_added']}, "
            f"skipped={summary['skipped_existing']}, "
            f"unknown={summary['unknown_kind']}, "
            f"version_bumped={summary['version_bumped']}, "
            f"fm={summary['frontmatter_changes']}, "
            f"written={summary['written']}"
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())
