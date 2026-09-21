#!/usr/bin/env python3
"""Free flash memory on the NXT by deleting four large stock sound files (~35 KB).

Usage:  python3 tools/free_flash.py
Only deletes a file if a same-sized copy exists in backup/, so it can be restored later.
"""
import os
import sys

try:
    import nxt.locator
except ModuleNotFoundError:
    # Started with the system Python: restart with the project's virtualenv, where nxt-python lives.
    venv_python = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".venv", "bin", "python")
    if os.path.abspath(sys.executable) == os.path.abspath(venv_python) or not os.path.exists(venv_python):
        sys.exit("nxt-python is missing. Run:  uv venv .venv && uv pip install --python .venv/bin/python nxt-python")
    os.execv(venv_python, [venv_python] + sys.argv)

TARGETS = ["! Applause.rso", "! Arm 02.rso", "! Beats 03.rso", "Ahnoo.rso"]
BACKUP_DIR = os.path.join(os.path.dirname(__file__), "..", "backup")

with nxt.locator.find() as brick:
    on_brick = dict(brick.find_files("*.*"))
    for name in TARGETS:
        if name not in on_brick:
            print(f"skip   {name} (not on brick)")
            continue
        copy = os.path.join(BACKUP_DIR, name)
        if not os.path.exists(copy) or os.path.getsize(copy) != on_brick[name]:
            print(f"skip   {name} (no matching backup copy)")
            continue
        brick.file_delete(name)
        print(f"delete {name} ({on_brick[name]} bytes)")
    print(f"Free flash now: {brick.get_device_info()[3]} bytes")
