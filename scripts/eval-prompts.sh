#!/usr/bin/env bash
#
# Run every agent over e2e/fixtures/eval/cases.json twice against the live model: once with
# the prompts at the `prompts-baseline` tag, once with the working tree. Outputs land in
# e2e/artifacts/eval/{baseline,current}/<case>--<agent>.json for side-by-side review.
#
#   scripts/eval-prompts.sh                 both variants, all cases
#   scripts/eval-prompts.sh current         one variant
#   EVAL_CASES=analyst-to-ds,pm-to-product-analytics scripts/eval-prompts.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
VARIANTS="${1:-baseline current}"
[ "$VARIANTS" = "both" ] && VARIANTS="baseline current"

[ -f app/.env.local ] || { echo "app/.env.local with an LLM key is required"; exit 1; }
set -a; . app/.env.local; set +a
export GENMENTOR_LLM_MODE=live

BASE="$(mktemp -d)"
trap 'rm -rf "$BASE"' EXIT
for f in $(git ls-tree --name-only prompts-baseline app/src/lib/prompts/); do
  git show "prompts-baseline:$f" > "$BASE/$(basename "$f")"
done
printf 'baseline prompts: %s files from tag prompts-baseline (%s)\n' "$(ls "$BASE" | wc -l | tr -d ' ')" "$(git rev-parse --short prompts-baseline)"

for v in $VARIANTS; do
  out="$ROOT/e2e/artifacts/eval/$v"
  rm -rf "$out"; mkdir -p "$out"
  start=$(date +%s)
  printf '\n== %s\n' "$v"
  if [ "$v" = "baseline" ]; then dir="$BASE"; else dir="$ROOT/app/src/lib/prompts"; fi
  ( cd app && EVAL_PROMPTS_DIR="$dir" EVAL_OUT="$out" npx --no-install vitest run --config vitest.eval.config.mts 2>&1 | grep -E '✓|✗|×|Tests|Error' || true )
  printf '%s: %s outputs, %s errors, %ss\n' "$v" "$(ls "$out" | wc -l | tr -d ' ')" "$(grep -l '"error"' "$out"/*.json 2>/dev/null | wc -l | tr -d ' ')" "$(( $(date +%s) - start ))"
done
