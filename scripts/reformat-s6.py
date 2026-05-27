"""Reformat dev-plan-wechat-flow-s6.md from YAML-block style to bullet-list style (matching s0-s5).

Transformations per task:
- `## T-NNN — title`  →  `### T-NNN: title`
- ```yaml ... ```  block  →  bullet list `- **field**: value`
- `**目标**：text`  →  `- **目标**: text`
- `**deliverables**：` + dash list  →  `- **deliverables**:` + `- [ ]` checkbox list
- `**AC**：` + numbered list  →  `- **acceptance_criteria**:` + `- [ ] AC-NNN: ...` checkbox list
- `**验证清单**：` (validation task) →  `- **acceptance_criteria**:` checkbox list (no AC-NNN prefix, raw items)
- Inject `tdd_acceptance: all` for feature tasks; `tdd_mode: skip` + `tdd_skip_reason` for design/validation
- `depends_on:` → `dependencies:`

Idempotent — won't reprocess already-converted tasks (checks heading style).

Run: python scripts/reformat-s6.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

TARGET_FILE = Path(__file__).resolve().parent.parent / "docs/dev-plan/dev-plan-wechat-flow-s6.md"

SKIP_REASONS = {
    "design": "Penpot 设计稿，由用户视觉验证 sign-off",
    "validation": "由 orchestrator 触发用户手动验证，不进 TDD 流程",
    "chore": "脚手架/配置任务，无单元测试价值",
    "config": "配置文件初始化，无单元测试价值",
}


def parse_yaml_block(yaml_text: str) -> dict:
    """Simple YAML parser for the limited subset used in task blocks.

    Handles:
    - scalar: `key: value`
    - list inline: `key: [a, b, c]`
    - list multiline: `key:\n  - item1\n  - item2`
    - nested map (1 level deep): `key:\n  subkey: value`
    """
    result = {}
    lines = yaml_text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.rstrip()
        if not stripped or stripped.startswith("#"):
            i += 1
            continue
        # Top-level key: must start with non-whitespace
        m = re.match(r"^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$", line)
        if not m:
            i += 1
            continue
        key, value = m.group(1), m.group(2).strip()
        if value:
            # inline value
            result[key] = value
            i += 1
        else:
            # multiline list or map; peek at indented lines
            items = []
            j = i + 1
            sub_map = {}
            while j < len(lines):
                sub = lines[j]
                if sub.startswith("  - "):
                    items.append(sub[4:].strip())
                    j += 1
                elif sub.startswith("  "):
                    m2 = re.match(r"^  ([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$", sub)
                    if m2:
                        sub_map[m2.group(1)] = m2.group(2).strip()
                        j += 1
                    else:
                        break
                else:
                    break
            if items:
                result[key] = items
            elif sub_map:
                result[key] = sub_map
            else:
                result[key] = None
            i = j
    return result


def normalize_list_value(raw: str | list) -> list[str]:
    """Convert YAML scalar inline list `[a, b, c]` or `[T-001, T-002]` to Python list."""
    if isinstance(raw, list):
        return [item.strip() for item in raw]
    if not raw:
        return []
    raw = raw.strip()
    if raw.startswith("[") and raw.endswith("]"):
        inner = raw[1:-1]
        return [item.strip() for item in inner.split(",") if item.strip()]
    return [raw]


def parse_task_block(task_text: str) -> dict:
    """Parse a single task block (from heading to next `---`)."""
    info = {
        "heading_raw": "",
        "task_id": "",
        "title": "",
        "yaml": {},
        "goal": "",
        "deliverables": [],
        "ac": [],
        "ac_format": "numbered",  # "numbered" | "validation_checklist"
        "extra_sections": [],  # list of (label, content) tuples
    }

    lines = task_text.splitlines()
    if not lines:
        return info

    # Heading
    heading = lines[0]
    info["heading_raw"] = heading
    m = re.match(r"^##\s+(T-[A-Z0-9-]+)\s*[—:\-]\s*(.+)$", heading)
    if m:
        info["task_id"] = m.group(1).strip()
        info["title"] = m.group(2).strip()
    else:
        m = re.match(r"^###?\s+(T-[A-Z0-9-]+):\s*(.+)$", heading)
        if m:
            info["task_id"] = m.group(1).strip()
            info["title"] = m.group(2).strip()

    # YAML block
    body = "\n".join(lines[1:])
    yaml_m = re.search(r"```yaml\s*\n(.*?)\n```", body, flags=re.DOTALL)
    if yaml_m:
        info["yaml"] = parse_yaml_block(yaml_m.group(1))
        body_after = body[yaml_m.end() :]
    else:
        body_after = body

    # Parse body sections (各 **xxx**：... 块)
    # Sections are separated by blank lines + `**Label**：` markers
    # Known labels: 目标, deliverables, AC, 验证清单, 新增规则清单, 8 维度守卫, 优化策略
    section_pattern = re.compile(
        r"\*\*([^*]+)\*\*[：:]\s*\n?(.*?)(?=\n\n\*\*|\n---|\Z)",
        flags=re.DOTALL,
    )
    for sm in section_pattern.finditer(body_after):
        label = sm.group(1).strip()
        content = sm.group(2).strip()
        if label == "目标":
            info["goal"] = content.strip().lstrip("：:").strip()
        elif label.lower() == "deliverables":
            info["deliverables"] = [
                line.lstrip("- ").strip() for line in content.split("\n") if line.strip().startswith("-")
            ]
        elif label.upper() == "AC":
            info["ac"] = parse_ac_list(content)
            info["ac_format"] = "numbered"
        elif "验证清单" in label:
            info["ac"] = parse_validation_checklist(content)
            info["ac_format"] = "validation_checklist"
        else:
            info["extra_sections"].append((label, content))

    return info


def parse_ac_list(content: str) -> list[str]:
    """Parse numbered AC list `1. ... 2. ...` into list of item texts."""
    items = []
    for line in content.split("\n"):
        line = line.strip()
        m = re.match(r"^(\d+)\.\s+(.+)$", line)
        if m:
            items.append(m.group(2).strip())
        elif items and line and not line.startswith("**"):
            # Continuation of previous AC
            items[-1] += " " + line
    return items


def parse_validation_checklist(content: str) -> list[str]:
    """Parse validation checklist (含 `1. **xxx**：...` 或 markdown bullet) into list of item texts."""
    items = []
    for line in content.split("\n"):
        line = line.strip()
        m = re.match(r"^(\d+)\.\s+(.+)$", line)
        if m:
            items.append(m.group(2).strip())
        elif line.startswith("- "):
            items.append(line[2:].strip())
        elif items and line and not line.startswith("**"):
            items[-1] += " " + line
    return items


def emit_task(info: dict) -> str:
    """Emit task in s5-style bullet-list format."""
    y = info["yaml"]
    task_kind = y.get("task_kind", "feature")
    is_feature = task_kind in ("feature", "fix", "code")
    is_design = task_kind == "design"
    is_validation = task_kind == "validation"

    lines = []
    # Heading: ### T-NNN: title
    lines.append(f"### {info['task_id']}: {info['title']}")
    lines.append("")
    # 目标
    if info["goal"]:
        lines.append(f"- **目标**: {info['goal']}")
    # task_kind
    lines.append(f"- **task_kind**: {task_kind}")
    # priority
    if y.get("priority"):
        lines.append(f"- **priority**: {y['priority']}")
    # complexity
    if y.get("complexity"):
        lines.append(f"- **complexity**: {y['complexity']}")
    # sprint
    if y.get("sprint"):
        lines.append(f"- **sprint**: {y['sprint']}")
    # tdd_mode / tdd_acceptance / tdd_refactor / security_sensitive
    if is_feature:
        lines.append(f"- **tdd_mode**: {y.get('tdd_mode', 'light')}")
        lines.append("- **tdd_acceptance**: all")
        if y.get("tdd_refactor"):
            lines.append(f"- **tdd_refactor**: {y['tdd_refactor']}")
        if "security_sensitive" in y:
            lines.append(f"- **security_sensitive**: {y['security_sensitive']}")
    else:
        # design / validation / chore
        reason = SKIP_REASONS.get(task_kind, "由 orchestrator/用户验证，不进 TDD 流程")
        lines.append("- **tdd_mode**: skip")
        lines.append(f'- **tdd_skip_reason**: "{reason}"')

    # validation tasks: user_facing_critical_path
    if is_validation:
        lines.append("- **user_facing_critical_path**: true")

    # dependencies (from depends_on)
    deps_raw = y.get("depends_on") or y.get("dependencies")
    deps = normalize_list_value(deps_raw)
    if deps:
        lines.append(f"- **dependencies**: [{', '.join(deps)}]")

    # acceptance_criteria
    if info["ac"]:
        lines.append("- **acceptance_criteria**:")
        if info["ac_format"] == "numbered":
            for i, item in enumerate(info["ac"], start=1):
                lines.append(f"  - [ ] AC-{i:03d}: {item}")
        else:
            for item in info["ac"]:
                lines.append(f"  - [ ] {item}")

    # deliverables
    if info["deliverables"]:
        lines.append("- **deliverables**:")
        for item in info["deliverables"]:
            lines.append(f"  - [ ] {item}")

    # context_load
    context = y.get("context_load")
    if context:
        ctx_list = normalize_list_value(context)
        if ctx_list:
            lines.append("- **context_load**:")
            for c in ctx_list:
                lines.append(f"  - {c}")

    # estimated_loc → notes
    notes_parts = []
    if y.get("estimated_loc"):
        notes_parts.append(f"预估 LOC: {y['estimated_loc']}")
    # penpot_sync 字段
    if y.get("penpot_sync"):
        ps = y["penpot_sync"]
        if isinstance(ps, dict):
            ui_ref = ps.get("ui_spec_ref")
            if ui_ref:
                refs = normalize_list_value(ui_ref)
                notes_parts.append(f"Penpot 同步参考: {', '.join(refs)}")
    if notes_parts:
        lines.append(f"- **notes**: {'; '.join(notes_parts)}")

    # extra sections (preserve as additional info under notes/freeform)
    for label, content in info["extra_sections"]:
        # Reformat as supplementary bullet section
        lines.append("")
        lines.append(f"**{label}**:")
        # Preserve list-like content
        for raw_line in content.split("\n"):
            line = raw_line.rstrip()
            if line:
                lines.append(line if line.startswith("-") else f"- {line}")

    return "\n".join(lines)


def reformat(content: str) -> str:
    """Reformat the whole s6 file."""
    # Preamble: keep everything up to first task heading
    parts = re.split(r"(?=^##\s+T-)", content, flags=re.MULTILINE)
    if len(parts) < 2:
        print("WARN: no tasks detected with `## T-` pattern; file may already be converted.")
        return content

    preamble = parts[0]
    task_chunks = parts[1:]

    # Process each task chunk: strip trailing `---` separator if present
    new_tasks = []
    for chunk in task_chunks:
        # Find the `---` separator that ends this task block
        # If present, strip it (we'll re-add separator uniformly)
        m = re.search(r"\n---\s*\n", chunk)
        if m:
            task_text = chunk[: m.start()]
        else:
            task_text = chunk
        info = parse_task_block(task_text)
        new_tasks.append(emit_task(info))

    # Ensure preamble ends with a clean separator
    preamble = preamble.rstrip() + "\n\n---\n\n"

    body = preamble + "\n\n---\n\n".join(new_tasks) + "\n"
    return body


def main() -> int:
    if not TARGET_FILE.exists():
        print(f"ERROR: {TARGET_FILE} not found")
        return 1
    content = TARGET_FILE.read_text(encoding="utf-8")

    # Idempotent guard: if no `## T-` patterns exist, already converted
    if not re.search(r"^##\s+T-", content, flags=re.MULTILINE):
        print("Already in s5 format (no `## T-` headings). No-op.")
        return 0

    new_content = reformat(content)
    TARGET_FILE.write_text(new_content, encoding="utf-8")
    print(f"Reformatted {TARGET_FILE}")

    # Count
    new_task_count = len(re.findall(r"^### T-", new_content, flags=re.MULTILINE))
    print(f"  {new_task_count} tasks now in s5-style format")
    return 0


if __name__ == "__main__":
    sys.exit(main())
