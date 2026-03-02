#!/bin/sh
set -eu

git config core.hooksPath .githooks
for hook in .githooks/*; do
  [ -f "$hook" ] && chmod +x "$hook"
done

echo "Git hooks installed: core.hooksPath=.githooks"
