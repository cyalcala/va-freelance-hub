#!/usr/bin/env python3
"""
test_autonomous_continue.py - Validation test suite for autonomous continuation Stop hook.
"""

import json
import os
import subprocess
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
HOOK_SCRIPT = os.path.join(SCRIPT_DIR, "autonomous_continue.py")
STATE_FILE = os.path.join(WORKSPACE_ROOT, ".agents", "runtime", "autonomy-state.json")
STOP_SENTINEL = os.path.join(WORKSPACE_ROOT, ".agents", "STOP_AUTONOMY")


def run_hook(payload: dict) -> dict:
    """Execute autonomous_continue.py with JSON payload over stdin."""
    proc = subprocess.run(
        [sys.executable, HOOK_SCRIPT],
        input=json.dumps(payload),
        text=True,
        capture_output=True,
        cwd=WORKSPACE_ROOT,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"Hook failed with exit code {proc.returncode}. Stderr: {proc.stderr}")
    return json.loads(proc.stdout.strip())


def cleanup():
    if os.path.exists(STOP_SENTINEL):
        try:
            os.remove(STOP_SENTINEL)
        except OSError:
            pass
    if os.path.exists(STATE_FILE):
        try:
            os.remove(STATE_FILE)
        except OSError:
            pass


def main():
    print("=== Testing Antigravity Autonomous Continue Stop Hook ===")
    cleanup()

    try:
        # Test 1: First cycle on model_stop
        print("\n[Test 1] First cycle model_stop payload...")
        payload1 = {
            "conversationId": "test-uuid-001",
            "executionNum": 1,
            "terminationReason": "model_stop",
            "workspacePaths": [WORKSPACE_ROOT],
        }
        res1 = run_hook(payload1)
        assert res1["decision"] == "continue", f"Expected continue, got {res1['decision']}"
        assert "AUTONOMOUS CONTINUATION CYCLE 1/32" in res1["reason"]
        print("  -> PASS: Decision is continue, cycle 1 recorded.")

        # Test 2: Second consecutive cycle
        print("\n[Test 2] Second consecutive cycle...")
        payload2 = {
            "conversationId": "test-uuid-001",
            "executionNum": 2,
            "terminationReason": "model_stop",
            "workspacePaths": [WORKSPACE_ROOT],
        }
        res2 = run_hook(payload2)
        assert res2["decision"] == "continue"
        assert "AUTONOMOUS CONTINUATION CYCLE 2/32" in res2["reason"]
        print("  -> PASS: Consecutive execution properly incremented to cycle 2.")

        # Test 3: max_steps_exceeded terminationReason
        print("\n[Test 3] max_steps_exceeded boundary...")
        payload3 = {
            "conversationId": "test-uuid-001",
            "executionNum": 3,
            "terminationReason": "max_steps_exceeded",
            "workspacePaths": [WORKSPACE_ROOT],
        }
        res3 = run_hook(payload3)
        assert res3["decision"] == "continue"
        assert "max_steps_exceeded" in res3["reason"]
        print("  -> PASS: max_steps_exceeded correctly triggers continuation.")

        # Test 4: Explicit STOP_AUTONOMY sentinel file
        print("\n[Test 4] STOP_AUTONOMY file sentinel...")
        with open(STOP_SENTINEL, "w") as f:
            f.write("STOP")
        res4 = run_hook(payload1)
        assert res4["decision"] == "stop", f"Expected stop, got {res4['decision']}"
        assert "STOP_AUTONOMY sentinel detected" in res4["reason"]
        os.remove(STOP_SENTINEL)
        print("  -> PASS: STOP_AUTONOMY sentinel halts execution immediately.")

        # Test 5: Cycle limit safety guard (32 cycles)
        print("\n[Test 5] Cycle guard threshold (reaching max cycles)...")
        # Artificially set state to cycle 32
        with open(STATE_FILE, "r") as f:
            state = json.load(f)
        state["currentCycle"] = 32
        with open(STATE_FILE, "w") as f:
            json.dump(state, f)

        res5 = run_hook(payload2)
        assert res5["decision"] == "stop", f"Expected stop on cycle > 32, got {res5['decision']}"
        assert "Maximum autonomous execution cycles (32) reached" in res5["reason"]
        print("  -> PASS: Cycle guard stops runaway loops at 32 cycles.")

        # Test 6: Reset counter on new conversation
        print("\n[Test 6] Counter reset on new conversation ID...")
        payload_new_conv = {
            "conversationId": "test-uuid-002-fresh",
            "executionNum": 1,
            "terminationReason": "model_stop",
            "workspacePaths": [WORKSPACE_ROOT],
        }
        res6 = run_hook(payload_new_conv)
        assert res6["decision"] == "continue"
        assert "AUTONOMOUS CONTINUATION CYCLE 1/32" in res6["reason"]
        print("  -> PASS: New conversation ID resets cycle counter to 1.")

        # Test 7: Fatal unrecoverable error handling
        print("\n[Test 7] Fatal unrecoverable error handling...")
        payload_fatal = {
            "conversationId": "test-uuid-002-fresh",
            "executionNum": 2,
            "terminationReason": "error",
            "error": "Error: 401 Unauthorized - invalid_api_key provided",
            "workspacePaths": [WORKSPACE_ROOT],
        }
        res7 = run_hook(payload_fatal)
        assert res7["decision"] == "stop"
        assert "Fatal unrecoverable error" in res7["reason"]
        print("  -> PASS: Fatal error halted execution and wrote diagnostics.")

        # Test 8: Transient recoverable error handling
        print("\n[Test 8] Transient recoverable error handling...")
        payload_transient = {
            "conversationId": "test-uuid-002-fresh",
            "executionNum": 2,
            "terminationReason": "error",
            "error": "ETIMEDOUT: Connection to remote host timed out after 30000ms",
            "workspacePaths": [WORKSPACE_ROOT],
        }
        res8 = run_hook(payload_transient)
        assert res8["decision"] == "continue"
        print("  -> PASS: Transient recoverable error allowed continuation.")

        print("\n=== ALL TESTS PASSED SUCCESSFULLY! ===")

    finally:
        cleanup()


if __name__ == "__main__":
    main()
