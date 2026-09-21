#!/usr/bin/env bash
# Installs the udev rule that lets a normal user talk to the NXT over USB (Linux only).
# Usage:  bash tools/install_udev.sh      (asks for your sudo password)
set -e
cd "$(dirname "$0")"
sudo cp 60-lego-nxt.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules
sudo udevadm trigger
echo "Done. Unplug and re-plug the NXT, then run:  .venv/bin/python tools/probe_nxt.py"
