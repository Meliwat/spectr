#!/usr/bin/env bash
# Spectr Claude Code skill installer.
#
# Drops the Spectr skill into your Claude Code skills directory so
# Claude can invoke it when you share a screen recording in chat.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Meliwat/spectr/master/claude_skill/install.sh | bash
#
# Or download and inspect first:
#   curl -fsSL https://raw.githubusercontent.com/Meliwat/spectr/master/claude_skill/install.sh -o install.sh
#   less install.sh
#   bash install.sh
#
# No sudo. Writes a single file to ~/.claude/skills/spectr/SKILL.md.
# Idempotent — re-running just overwrites the existing skill.

set -euo pipefail

REPO="${SPECTR_SKILL_REPO:-Meliwat/spectr}"
REF="${SPECTR_SKILL_REF:-master}"
SKILL_DIR="${HOME}/.claude/skills/spectr"
SKILL_URL="https://raw.githubusercontent.com/${REPO}/${REF}/claude_skill/spectr/SKILL.md"

echo "spectr-skill: installing from ${REPO}@${REF}"
mkdir -p "${SKILL_DIR}"

# Download with curl + fallback to wget.
if command -v curl >/dev/null 2>&1; then
  if ! curl -fsSL "${SKILL_URL}" -o "${SKILL_DIR}/SKILL.md"; then
    echo "spectr-skill: failed to download from ${SKILL_URL}" >&2
    exit 1
  fi
elif command -v wget >/dev/null 2>&1; then
  if ! wget -q "${SKILL_URL}" -O "${SKILL_DIR}/SKILL.md"; then
    echo "spectr-skill: failed to download from ${SKILL_URL}" >&2
    exit 1
  fi
else
  echo "spectr-skill: need curl or wget on PATH" >&2
  exit 1
fi

# Sanity check — the file should be non-empty and start with the YAML
# frontmatter every Claude Code skill begins with.
if [ ! -s "${SKILL_DIR}/SKILL.md" ]; then
  echo "spectr-skill: downloaded file is empty" >&2
  exit 1
fi

if ! head -1 "${SKILL_DIR}/SKILL.md" | grep -q '^---'; then
  echo "spectr-skill: downloaded file does not look like a SKILL.md (no frontmatter)" >&2
  rm -f "${SKILL_DIR}/SKILL.md"
  exit 1
fi

echo "spectr-skill: installed at ${SKILL_DIR}/SKILL.md"
echo "spectr-skill: drop a .mp4 in any Claude Code conversation and ask Claude to spec it."
