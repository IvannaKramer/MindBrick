#!/usr/bin/env python3
"""Find a LEGO Mindstorms NXT brick (USB or Bluetooth) and print what it tells us.

Usage:  python3 tools/probe_nxt.py
Needs:  pip install nxt-python   (and the udev rule in this folder on Linux)
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
from nxt.error import DirectProtocolError

with nxt.locator.find() as brick:
    name, bt_address, _signal, free_flash = brick.get_device_info()
    protocol, firmware = brick.get_firmware_version()
    print(f"Brick name      : {name}")
    print(f"Bluetooth addr  : {bt_address}")
    print(f"Firmware        : {firmware[0]}.{firmware[1]:02d}  (protocol {protocol[0]}.{protocol[1]})")
    print(f"Free flash      : {free_flash} bytes")
    print(f"Battery         : {brick.get_battery_level()} mV")

    # List the files stored on the brick (programs end in .rxe, sounds in .rso).
    print("Files on brick  :")
    for fname, size in brick.find_files("*.*"):
        print(f"  {fname:<20} {size:>7} bytes")

    try:
        print(f"Running program : {brick.get_current_program_name()}")
    except DirectProtocolError:
        print("Running program : (none)")

    brick.play_tone(880, 200)  # short beep so you can hear that it worked
