import re
import sys
import yaml
from pathlib import Path

def extract_yaml(markdown: str) -> dict:
    pattern = r"```yaml\s*(.*?)```"
    matches = re.findall(pattern, markdown, flags=re.DOTALL)

    if not matches:
        raise ValueError("YAML 코드블록을 찾지 못했습니다.")

    return yaml.safe_load(matches[-1])

def bullet_list(items):
    if not items:
        return "- 없음"
    return "\n".join(f"- {item}" for item in items)

def format_target_files(target_files):
    if not target_files:
        return "- 없음"

    lines = []

    for kind in ["new", "modify", "delete"]:
        files = target_files.get(kind) or []
        if files:
            label = {
                "new": "신규",
                "modify": "수정",
                "delete": "삭제",
            }[kind]

            for file in files:
                lines.append(f"- {label}: {file}")

    return "\n".join(lines) if lines else "- 없음"

def render(template: str, data: dict) -> str:
    replacements = {
        "ISSUE_NUMBER": str(data.get("issue_number", "")),
        "SHORT_NAME": data.get("short_name", ""),
        "ISSUE_GOAL": data.get("issue_goal", ""),
        "CORE_PRINCIPLES": bullet_list(data.get("core_principles", [])),
        "DO_NOT_TOUCH_LIST": bullet_list(data.get("do_not_touch", [])),
        "TARGET_FILES": format_target_files(data.get("target_files", {})),
        "IMPLEMENTATION_REQUIREMENTS": bullet_list(data.get("implementation_requirements", [])),
        "TEST_REQUIREMENTS": bullet_list(data.get("test_requirements", [])),
        "TEST_COMMANDS": "\n".join(f"```bash\n{cmd}\n```" for cmd in data.get("test_commands", [])) or "```bash\n# 없음\n```",
    }

    for key, value in replacements.items():
        template = template.replace("{{" + key + "}}", value)

    return template

def main():
    if len(sys.argv) != 4:
        print("Usage: python scripts/render_agent_prompt.py <agent-output.md> <template.md> <output.md>")
        sys.exit(1)

    agent_output_path = Path(sys.argv[1])
    template_path = Path(sys.argv[2])
    output_path = Path(sys.argv[3])

    markdown = agent_output_path.read_text(encoding="utf-8")
    template = template_path.read_text(encoding="utf-8")

    data = extract_yaml(markdown)
    result = render(template, data)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(result, encoding="utf-8")

    print(f"Generated: {output_path}")

if __name__ == "__main__":
    main()