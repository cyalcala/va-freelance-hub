#!/usr/bin/env python3
"""
autonomous_continue.py - Antigravity Stop Hook for Bounded Autonomous Continuation

When an Antigravity execution cycle reaches its natural termination
(model_stop or max_steps_exceeded), this hook prevents termination and
re-injects continuation instructions into the conversation until either:
  1. The mission is explicitly complete (.agents/MISSION_COMPLETE or CURRENT.md)
  2. An explicit stop sentinel is detected (.agents/STOP_AUTONOMY or AUTONOMY_STOP: true)
  3. The maximum cycle safety guard (default 32) is reached
  4. An unrecoverable fatal error occurs
"""

import datetime
import json
import os
import re
import subprocess
import sys


def find_workspace_root(payload: dict) -> str:
    """Resolve repository workspace root from hook payload, __file__, or CWD."""
    workspace_paths = payload.get("workspacePaths") or []
    if workspace_paths and os.path.isdir(workspace_paths[0]):
        return os.path.abspath(workspace_paths[0])

    # Walk up from script location
    cur = os.path.abspath(os.path.dirname(__file__))
    while cur and os.path.dirname(cur) != cur:
        if os.path.exists(os.path.join(cur, ".git")) or os.path.exists(
            os.path.join(cur, ".agents")
        ):
            return cur
        cur = os.path.dirname(cur)

    return os.path.abspath(os.getcwd())


def find_current_md_files(workspace_root: str) -> list[str]:
    """Find potential CURRENT.md locations."""
    candidates = [
        os.path.join(workspace_root, "CURRENT.md"),
        os.path.join(workspace_root, "docs", "bootloaders", "CURRENT.md"),
        os.path.join(workspace_root, "docs", "CURRENT.md"),
    ]
    return [p for p in candidates if os.path.isfile(p)]


def check_stop_sentinels(workspace_root: str) -> tuple[bool, str]:
    """
    Check if user or mission explicitly requested stopping.
    Returns (should_stop, reason).
    """
    agents_dir = os.path.join(workspace_root, ".agents")

    # 1. Check file sentinels
    stop_file = os.path.join(agents_dir, "STOP_AUTONOMY")
    if os.path.exists(stop_file):
        return True, "STOP_AUTONOMY sentinel detected (.agents/STOP_AUTONOMY). Autonomous execution halted."

    complete_file = os.path.join(agents_dir, "MISSION_COMPLETE")
    if os.path.exists(complete_file):
        return True, "MISSION_COMPLETE sentinel detected (.agents/MISSION_COMPLETE). Mission successfully concluded."

    # 2. Check CURRENT.md files for flags
    current_files = find_current_md_files(workspace_root)
    stop_re = re.compile(r"^\s*AUTONOMY_STOP:\s*true\b", re.IGNORECASE | re.MULTILINE)
    complete_re = re.compile(r"^\s*MISSION_COMPLETE:\s*true\b", re.IGNORECASE | re.MULTILINE)

    for path in current_files:
        try:
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
                if stop_re.search(content):
                    return True, f"AUTONOMY_STOP: true flag detected in {os.path.relpath(path, workspace_root)}. Halting."
                if complete_re.search(content):
                    return True, f"MISSION_COMPLETE: true flag detected in {os.path.relpath(path, workspace_root)}. Halting."
        except Exception as ex:
            sys.stderr.write(f"[WARN] Error reading {path}: {ex}\n")

    return False, ""


def is_recoverable_error(error_str: str) -> bool:
    """Determine if a termination error is transient and recoverable."""
    if not error_str:
        return True

    err_lower = error_str.lower()

    # Fatal / unrecoverable error patterns
    fatal_patterns = [
        "invalid_api_key",
        "invalid api key",
        "api key not found",
        "authentication failed",
        "unauthorized",
        "401 unauthorized",
        "account suspended",
        "billing not active",
        "quota exceeded",
        "insufficient balance",
        "disk full",
        "no space left on device",
        "permission denied (publickey)",
    ]

    for pat in fatal_patterns:
        if pat in err_lower:
            return False

    # Transient errors are considered recoverable
    return True


def inspect_git_state(workspace_root: str) -> dict:
    """Quick summary of git working tree status."""
    result = {"dirty": False, "summary": "clean"}
    try:
        proc = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=workspace_root,
            capture_output=True,
            text=True,
            timeout=5,
        )
        if proc.returncode == 0:
            lines = [l for l in proc.stdout.splitlines() if l.strip()]
            if lines:
                result["dirty"] = True
                result["summary"] = f"{len(lines)} uncommitted file(s)"
            else:
                result["dirty"] = False
                result["summary"] = "clean working tree"
    except Exception as ex:
        result["summary"] = f"git status unavailable ({ex})"
    return result


def inspect_unfinished_work(workspace_root: str) -> tuple[bool, str]:
    """Inspect CURRENT.md and docs to evaluate remaining objectives."""
    current_files = find_current_md_files(workspace_root)
    unresolved_items = []

    for path in current_files:
        try:
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
                for line in lines:
                    if re.match(r"^\s*-\s*\[\s*\]", line):
                        unresolved_items.append(line.strip())
        except Exception:
            pass

    git_info = inspect_git_state(workspace_root)
    summary_parts = []
    if unresolved_items:
        summary_parts.append(f"{len(unresolved_items)} open checklist item(s) in CURRENT.md")
    if git_info["dirty"]:
        summary_parts.append(f"uncommitted work ({git_info['summary']})")

    if summary_parts:
        return True, ", ".join(summary_parts)

    return True, "Active repository mission with potential pipeline, tests, or backlog objectives."


def load_autonomy_state(state_file: str) -> dict:
    """Load persisted autonomy cycle state."""
    default_state = {
        "conversationId": "",
        "currentCycle": 0,
        "maxCycles": 32,
        "history": [],
    }
    if not os.path.exists(state_file):
        return default_state
    try:
        with open(state_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, dict):
                return {**default_state, **data}
    except Exception as ex:
        sys.stderr.write(f"[WARN] Failed to load {state_file}: {ex}\n")
    return default_state


def save_autonomy_state(state_file: str, state: dict) -> None:
    """Atomically save autonomy state to disk."""
    try:
        os.makedirs(os.path.dirname(state_file), exist_ok=True)
        tmp_file = f"{state_file}.tmp"
        with open(tmp_file, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
        os.replace(tmp_file, state_file)
    except Exception as ex:
        sys.stderr.write(f"[ERROR] Failed to save {state_file}: {ex}\n")


def build_continuation_reason(
    cycle: int,
    max_cycles: int,
    reason: str,
    work_summary: str,
    git_info: dict,
) -> str:
    """Construct rigorous continuation directives for the next agent turn."""
    return (
        f"[AUTONOMOUS CONTINUATION CYCLE {cycle}/{max_cycles}]\n"
        f"Execution boundary reached ({reason}). Remaining work identified: {work_summary}.\n"
        f"Git status: {git_info.get('summary', 'unknown')}.\n\n"
        "MANDATORY CONTINUATION DIRECTIVES:\n"
        "1. Re-read the repository bootloader (e.g. docs/bootloaders/CURRENT.md or AGENTS.md).\n"
        "2. Re-read MASTER_OPERATING_PROMPT.md and MASTER_OPERATING_CONSTITUTION.md / CONSTITUTION.md.\n"
        "3. Re-read CURRENT.md to confirm the latest pointer, incident state, and next single action.\n"
        "4. Inspect git status (`git status -s`) and recent commit history to verify clean working tree and latest SHAs.\n"
        "5. Recover the latest verified repository state from evidence rather than assumptions.\n"
        "6. Identify the highest-value unfinished work and proceed with the smallest verifiable slice.\n"
        "7. Test changes rigorously (run project tests/validation commands).\n"
        "8. Update durable repository memory (CURRENT.md, savepoints, documentation).\n"
        "9. Commit coherent completed work where appropriate.\n"
        "10. Do not stop or declare the overall mission complete merely because one task finished.\n"
        "11. Proceed immediately to the next highest-value task."
    )


def main():
    # 1. Read Antigravity hook payload from stdin
    raw_stdin = sys.stdin.read()
    payload = {}
    if raw_stdin.strip():
        try:
            payload = json.loads(raw_stdin)
        except Exception as ex:
            sys.stderr.write(f"[WARN] Failed to parse stdin JSON: {ex}\n")

    # 2. Resolve workspace paths and environment
    workspace_root = find_workspace_root(payload)
    agents_dir = os.path.join(workspace_root, ".agents")
    runtime_dir = os.path.join(agents_dir, "runtime")
    state_file = os.path.join(runtime_dir, "autonomy-state.json")
    diagnostics_file = os.path.join(runtime_dir, "diagnostics.json")

    conversation_id = payload.get("conversationId", "")
    execution_num = payload.get("executionNum", 1)
    termination_reason = payload.get("terminationReason", "model_stop")
    error_str = payload.get("error", "")

    # 3. Check explicit STOP mechanisms (Rule 9)
    should_stop, stop_reason = check_stop_sentinels(workspace_root)
    if should_stop:
        out = {"decision": "stop", "reason": stop_reason}
        print(json.dumps(out))
        sys.stdout.flush()
        return

    # 4. Check error recoverability (Rule 8)
    if termination_reason == "error":
        if not is_recoverable_error(error_str):
            diag = {
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "conversationId": conversation_id,
                "executionNum": execution_num,
                "terminationReason": termination_reason,
                "error": error_str,
                "status": "FATAL_UNRECOVERABLE",
            }
            try:
                os.makedirs(runtime_dir, exist_ok=True)
                with open(diagnostics_file, "w", encoding="utf-8") as df:
                    json.dump(diag, df, indent=2)
            except Exception:
                pass
            out = {
                "decision": "stop",
                "reason": f"Fatal unrecoverable error encountered: {error_str}. Diagnostics recorded at .agents/runtime/diagnostics.json",
            }
            print(json.dumps(out))
            sys.stdout.flush()
            return
        else:
            sys.stderr.write(f"[INFO] Recoverable error detected: {error_str}. Will continue cycle.\n")

    # Only continue on supported termination reasons
    allowed_reasons = {"model_stop", "max_steps_exceeded", "error"}
    if termination_reason not in allowed_reasons:
        out = {
            "decision": "stop",
            "reason": f"Stopping on termination reason '{termination_reason}'.",
        }
        print(json.dumps(out))
        sys.stdout.flush()
        return

    # 5. Load and update cycle state (Rule 10)
    state = load_autonomy_state(state_file)
    max_cycles = int(os.environ.get("AUTONOMY_MAX_CYCLES", state.get("maxCycles", 32)))

    # Reset counter if a new top-level mission starts
    reset_sentinel = os.path.join(agents_dir, "RESET_AUTONOMY")
    new_mission_sentinel = os.path.join(agents_dir, "NEW_MISSION")
    sentinel_reset = False
    if os.path.exists(reset_sentinel):
        try:
            os.remove(reset_sentinel)
        except OSError:
            pass
        sentinel_reset = True
    if os.path.exists(new_mission_sentinel):
        try:
            os.remove(new_mission_sentinel)
        except OSError:
            pass
        sentinel_reset = True

    saved_conversation = state.get("conversationId", "")
    if sentinel_reset or (conversation_id and conversation_id != saved_conversation):
        current_cycle = 1
    else:
        current_cycle = state.get("currentCycle", 0) + 1

    # Check finite execution guard limit (32 cycles)
    if current_cycle > max_cycles:
        out = {
            "decision": "stop",
            "reason": (
                f"Maximum autonomous execution cycles ({max_cycles}) reached for conversation "
                f"'{conversation_id or 'default'}'. Pausing to prevent runaway loop and enable human inspection."
            ),
        }
        state["currentCycle"] = current_cycle
        state["lastDecision"] = "stop"
        state["lastReason"] = out["reason"]
        save_autonomy_state(state_file, state)
        print(json.dumps(out))
        sys.stdout.flush()
        return

    # 6. Evaluate remaining work (Rule 11)
    has_work, work_summary = inspect_unfinished_work(workspace_root)
    git_info = inspect_git_state(workspace_root)

    # 7. Build continuation instruction (Rules 6 & 7)
    continuation_instruction = build_continuation_reason(
        cycle=current_cycle,
        max_cycles=max_cycles,
        reason=termination_reason,
        work_summary=work_summary,
        git_info=git_info,
    )

    out = {
        "decision": "continue",
        "reason": continuation_instruction,
    }

    # 8. Persist state and output JSON response
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    state["conversationId"] = conversation_id
    state["currentCycle"] = current_cycle
    state["maxCycles"] = max_cycles
    state["lastUpdate"] = now_iso
    state["lastTerminationReason"] = termination_reason
    state["lastDecision"] = "continue"

    history = state.get("history", [])
    history.append({
        "cycle": current_cycle,
        "timestamp": now_iso,
        "terminationReason": termination_reason,
        "decision": "continue",
    })
    state["history"] = history[-50:]  # Keep last 50 entries
    save_autonomy_state(state_file, state)

    print(json.dumps(out))
    sys.stdout.flush()


if __name__ == "__main__":
    main()
