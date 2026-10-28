#!/usr/bin/env bash
# DNMS Video Editing System setup for macOS and Linux.
# Installs the system tools when missing (Homebrew on macOS; apt, dnf or pacman on Linux), then runs
# tools/setup/setup.mjs, which builds everything else. Safe to run again.
# Options pass through: ./install.sh --no-matte   ./install.sh --check   ./install.sh --force
set -euo pipefail
cd "$(dirname "$0")"
echo "== DNMS Video Editing System setup ($(uname -s))"

have() { command -v "$1" >/dev/null 2>&1; }
node_ok() { have node && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 22 ]; }
SUDO=""; [ "$(id -u)" -ne 0 ] && have sudo && SUDO="sudo"

case "$(uname -s)" in
  Darwin)
    have brew || { echo "Homebrew is needed first: https://brew.sh"; exit 1; }
    node_ok || brew install node
    have python3.12 || brew install python@3.12
    have ffmpeg || brew install ffmpeg
    have git || brew install git
    ;;
  Linux)
    if have apt-get; then
      $SUDO apt-get update
      $SUDO apt-get install -y ffmpeg python3 python3-venv python3-pip libarchive-tools fonts-dejavu-core git curl
    elif have dnf; then
      # Fedora's own ffmpeg-free lacks libx264: enable RPM Fusion for the full ffmpeg (docs/INSTALL.md).
      $SUDO dnf install -y ffmpeg python3.12 bsdtar dejavu-sans-fonts git curl || true
    elif have pacman; then
      $SUDO pacman -S --needed --noconfirm ffmpeg python libarchive ttf-dejavu git curl nodejs npm
    else
      echo "Unknown package manager: install FFmpeg, Python 3.12, Node.js 22+ and git yourself (docs/INSTALL.md)."
    fi
    if ! node_ok; then
      echo "Node.js 22 or newer is needed. Install it from https://nodejs.org or with nvm (nvm install 22), then run ./install.sh again."
      exit 1
    fi
    ;;
  *) echo "On Windows run install.bat instead."; exit 1 ;;
esac

if node tools/setup/setup.mjs "$@"; then exit 0; fi
echo "Setup finished with problems: read the FAIL lines above, or docs/INSTALL.md (Troubleshooting)."
exit 1
