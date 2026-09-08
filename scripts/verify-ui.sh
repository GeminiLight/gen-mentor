#!/usr/bin/env bash
#
# GenMentor 的 UI 验收闸门。它做三件 gate.sh 做不到的事：真的把应用跑起来、真的用浏览器
# 走完每条旅程、真的把每个页面在三个视口两套主题下截下来。
#
# 截图覆盖率从 app/src/app 里实际存在的 page.tsx 反推，新增页面必然要求新增证据，
# 无法通过缩小清单绕过。阈值与检查项是契约，agent 不得放宽。
#
set -uo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
APP="$ROOT/app"
ART="$ROOT/e2e/artifacts"
PORT="${PORT:-3100}"
VIEWPORTS="mobile tablet desktop"
THEMES="light dark"
MIN_PNG_BYTES=8000   # 低于此值几乎必然是空白页或渲染失败

FAILED=0
if [ -t 1 ]; then G=$'\033[32m'; R=$'\033[31m'; B=$'\033[1m'; N=$'\033[0m'
else G=""; R=""; B=""; N=""; fi
pass()  { printf '  %sPASS%s  %s\n' "$G" "$N" "$1"; }
fail()  { printf '  %sFAIL%s  %s\n' "$R" "$N" "$1"; FAILED=1; }
stage() { printf '\n%s== %s%s\n' "$B" "$1" "$N"; }
die()   { printf '\n%s%s%s\n' "$R" "$1" "$N"; exit 1; }

[ -f "$ROOT/e2e/playwright.config.ts" ] || die "e2e/playwright.config.ts 缺失，先搭好 E2E 工程"
[ -d "$APP/node_modules" ] || die "app/node_modules 缺失，先 make install"

stage "构建并启动"
mkdir -p "$ART" /tmp/gm
# `pnpm start` forks node, so killing the subshell alone leaves a listener behind and the
# next run silently screenshots a stale build. Kill by port, before and after.
kill_port() { lsof -ti "tcp:${PORT}" 2>/dev/null | xargs kill 2>/dev/null; return 0; }
PID=""
cleanup() { [ -n "$PID" ] && kill "$PID" 2>/dev/null; kill_port; return 0; }
trap cleanup EXIT INT TERM
if lsof -ti "tcp:${PORT}" >/dev/null 2>&1; then
  printf '  端口 %s 被占用，清理残留进程\n' "$PORT"; kill_port; sleep 1
fi

( cd "$APP" && pnpm build >/tmp/gm/build.log 2>&1 ) \
  || { tail -30 /tmp/gm/build.log; die "next build 失败"; }
( cd "$APP" && pnpm start --port "$PORT" >/tmp/gm/app.log 2>&1 ) &
PID=$!

READY=0
for _ in $(seq 1 60); do
  curl -sf -o /dev/null "http://127.0.0.1:${PORT}/" && { READY=1; break; }
  sleep 1
done
[ "$READY" = "1" ] && pass "应用就绪" || { tail -20 /tmp/gm/app.log; die "应用 60 秒内未就绪"; }

stage "Playwright 旅程、a11y 断言与截图采集"
rm -rf "$ART/screenshots" && mkdir -p "$ART/screenshots"
if ( cd "$ROOT/e2e" && BASE_URL="http://127.0.0.1:${PORT}" \
       npx --no-install playwright test >/tmp/gm/e2e.log 2>&1 ); then
  pass "playwright test 全绿"
else
  fail "playwright test 未通过："
  tail -40 /tmp/gm/e2e.log | sed 's/^/        /'
fi

stage "截图覆盖率（每个页面 × 3 视口 × 2 主题）"
ROUTES="$(
  git ls-files -co --exclude-standard 'app/src/app' \
    | grep -E '^app/src/app/(.*/)?page\.tsx$' \
    | sed -e 's|^app/src/app||' -e 's|/page\.tsx$||' \
    | sed -e 's|/([^/]*)||g' -e 's|^$|/|'
)"
[ -z "$ROUTES" ] && fail "未发现任何 page.tsx"
slug() { printf '%s' "$1" | sed -e 's|^/||' -e 's|/|_|g' -e 's|\[|:|g' -e 's|\]||g' -e 's|^$|index|'; }
for route in $ROUTES; do
  s="$(slug "$route")"
  for vp in $VIEWPORTS; do
    for th in $THEMES; do
      f="$ART/screenshots/${s}--${vp}--${th}.png"
      if [ ! -f "$f" ]; then
        fail "缺少截图 ${s}--${vp}--${th}.png（路由 ${route}）"
      else
        sz=$(wc -c < "$f" | tr -d ' ')
        [ "$sz" -lt "$MIN_PNG_BYTES" ] && fail "截图 ${s}--${vp}--${th}.png 仅 ${sz} 字节，疑似空白页"
      fi
    done
  done
done
[ "$FAILED" -eq 0 ] && pass "$(printf '%s\n' $ROUTES | grep -c .) 个路由截图齐全且非空白"

printf '\n证据目录 %s\n' "$ART/screenshots"
if [ "$FAILED" -eq 0 ]; then
  printf '%sUI 闸门通过。现在自己打开截图看一遍，不好看就继续改。%s\n' "$G" "$N"
else
  printf '%sUI 闸门未通过。%s\n' "$R" "$N"
fi
exit "$FAILED"
