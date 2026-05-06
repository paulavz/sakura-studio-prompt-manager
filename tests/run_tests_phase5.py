#!/usr/bin/env python3
"""Run Phase 5 tests via pytest with automatic server lifecycle and DB cleanup."""
import subprocess
import sys
from pathlib import Path

SKILL_SCRIPT = (
    Path(__file__).resolve().parent.parent
    / ".agents" / "skills" / "webapp-testing" / "scripts" / "with_server.py"
)

if not SKILL_SCRIPT.exists():
    print(f"ERROR: with_server.py not found at {SKILL_SCRIPT}")
    print("Install the webapp-testing skill or run the server manually.")
    sys.exit(1)

cmd = [
    sys.executable, str(SKILL_SCRIPT),
    "--server", "npm run dev",
    "--port", "3000",
    "--", sys.executable, "-m", "pytest", "tests/test_phase5.py", "-s", "-v",
]

sys.exit(subprocess.call(cmd))
