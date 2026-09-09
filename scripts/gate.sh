#!/usr/bin/env bash
#
# GenMentor 静态验收闸门。
#
# 阈值、白名单和检查项是与人类所有者的契约。agent 不得为了通过而放宽它们，应当改代码去适配。
# 需要调整时停下来说明理由并等确认。
#
#   scripts/gate.sh                静态检查
#   GATE_FINAL=1 scripts/gate.sh   额外要求旧的 frontend/ backend/ 已删除
#
set -uo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
APP="$ROOT/app"

FAILED=0
if [ -t 1 ]; then G=$'\033[32m'; R=$'\033[31m'; Y=$'\033[33m'; B=$'\033[1m'; N=$'\033[0m'
else G=""; R=""; Y=""; B=""; N=""; fi
pass()  { printf '  %sPASS%s  %s\n' "$G" "$N" "$1"; }
fail()  { printf '  %sFAIL%s  %s\n' "$R" "$N" "$1"; FAILED=1; }
skip()  { printf '  %sSKIP%s  %s\n' "$Y" "$N" "$1"; }
stage() { printf '\n%s== %s%s\n' "$B" "$1" "$N"; }

TRACKED=""
tracked() { # tracked <包含 ERE> [排除 ERE]
  [ -z "$TRACKED" ] && TRACKED="$(git ls-files -co --exclude-standard)"
  if [ -n "${2:-}" ]; then printf '%s\n' "$TRACKED" | grep -E -- "$1" | grep -v -E -- "$2" || true
  else printf '%s\n' "$TRACKED" | grep -E -- "$1" || true; fi
}

# ---------------------------------------------------------------- 1. 目标布局
stage "1. 目标布局（单体，没有独立后端）"
for p in app/package.json app/src wiki Makefile scripts/verify-ui.sh; do
  if [ -e "$p" ]; then pass "$p"; else fail "${p} 缺失"; fi
done
if [ -d apps ] || [ -d contracts ]; then
  fail "apps/ 或 contracts/ 存在。本项目是单体，应用只在 app/，没有跨语言契约层"
else
  pass "无前后端分离的残留目录"
fi

# ------------------------------------------------------------- 2. 文档结构
stage "2. 文档结构（禁止随手扔的计划与总结）"
DOC_OK='^(AGENTS|README)\.md$|^app/(AGENTS|CLAUDE)\.md$|^docs/rebuild/GO\.md$'
DOC_OK="${DOC_OK}"'|^wiki/[0-9]{2}-[a-z0-9-]+\.md$'
DOC_OK="${DOC_OK}"'|^wiki/specs/spec-[a-z0-9-]+\.md$'
DOC_OK="${DOC_OK}"'|^wiki/refs/[a-z0-9-]+\.md$'
DOC_OK="${DOC_OK}"'|^wiki/reviews/review-[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9-]+\.md$'
DOC_OK="${DOC_OK}"'|^wiki/archive/.+\.md$|^e2e/README\.md$'
EXTRA="docs/rebuild/allowed-docs.txt"
EXTRA_LIST=""
[ -f "$EXTRA" ] && EXTRA_LIST="$(grep -v -E '^[[:space:]]*(#|$)' "$EXTRA")"
BAD_DOCS=""
while IFS= read -r f; do
  [ -z "$f" ] && continue
  printf '%s' "$f" | grep -q -E -- "$DOC_OK" && continue
  [ -n "$EXTRA_LIST" ] && printf '%s\n' "$EXTRA_LIST" | grep -q -x -F -- "$f" && continue
  BAD_DOCS="${BAD_DOCS}${f}"$'\n'
done < <(tracked '\.(md|MD)$' '^(frontend|backend)/')
if [ -z "$BAD_DOCS" ]; then pass "无不符合 wiki 编号方案的 markdown"
else
  fail "以下 markdown 不符合 wiki 编号方案，按 AGENTS.md 的表格归位或删除："
  printf '%s' "$BAD_DOCS" | sed 's/^/        /'
fi

# --------------------------------------------------------------- 3. 体量预算
stage "3. 体量预算"
budget() { # budget <描述> <上限> <包含 ERE> [排除 ERE]
  local label="$1" limit="$2" inc="$3" exc="${4:-}" over="" f n
  while IFS= read -r f; do
    { [ -z "$f" ] || [ ! -f "$f" ]; } && continue
    n=$(wc -l < "$f" | tr -d ' ')
    [ "$n" -gt "$limit" ] && over="${f}: ${n} 行"$'\n'"${over}"
  done < <(tracked "$inc" "$exc")
  if [ -z "$over" ]; then pass "${label} ≤ ${limit} 行"
  else fail "${label} 超过 ${limit} 行，拆分它："; printf '%s' "$over" | sed 's/^/        /'; fi
}
budget "页面 page.tsx"  120 '^app/src/app/(.*/)?page\.tsx$'
budget "路由 route.ts"  120 '^app/src/app/api/.*/route\.ts$'
budget "组件 .tsx"      220 '^app/src/.*\.tsx$'
budget "模块 .ts"       300 '^app/src/.*\.ts$' '\.d\.ts$|/route\.ts$'

# ---------------------------------------------------------- 4. 禁止的代码形态
stage "4. 禁止的代码形态"
forbid() { # forbid <描述> <内容 ERE> <允许命中数> <包含 ERE> [排除 ERE]
  local label="$1" re="$2" allowed="$3" inc="$4" exc="${5:-}" files hits n
  files="$(tracked "$inc" "$exc")"
  if [ -z "$files" ]; then skip "${label}（无匹配文件）"; return; fi
  hits="$(printf '%s\n' "$files" | grep -v '^$' | tr '\n' '\0' \
          | xargs -0 grep -n -I -H -E -- "$re" 2>/dev/null || true)"
  n=$(printf '%s' "$hits" | grep -c . || true)
  if [ "$n" -le "$allowed" ]; then pass "${label}（命中 ${n} / 上限 ${allowed}）"
  else fail "${label} 命中 ${n} 处，上限 ${allowed}："; printf '%s\n' "$hits" | head -15 | sed 's/^/        /'; fi
}
SRC='^app/src/.*\.(tsx|ts)$'
forbid "硬编码颜色（色值只在 globals.css 用 OKLCH 定义）" \
       '#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?\b|\brgba?\(|\boklch\(' 0 "$SRC" '\.d\.ts$'
forbid "TypeScript any"              ':[[:space:]]*any\b|<any>|as any' 0 "$SRC" '\.d\.ts$'
forbid "@ts-ignore / eslint-disable" '@ts-(ignore|expect-error)|eslint-disable' 0 "$SRC" '\.d\.ts$'
forbid "dangerouslySetInnerHTML"     'dangerouslySetInnerHTML' 0 "$SRC" '\.d\.ts$'
forbid "langchain（本项目用官方 SDK）" '@langchain/|from ["'"'"']langchain' 0 "$SRC"
forbid "route 里直接实例化 LLM 客户端" 'new (OpenAI|Anthropic)\(' 0 '^app/src/app/api/.*\.ts$'
forbid "prompt 文本写在 lib/prompts 之外" '[Yy]ou are (a|an|the)\b|你是一(位|个)' 0 \
       "$SRC" '^app/src/lib/prompts/'
forbid "CSS !important" '!important' 5 '^app/src/.*\.css$'

# ------------------------------------------------------- 5. API route 入参校验
stage "5. API route 必须用 zod 校验入参"
ROUTES="$(tracked '^app/src/app/api/.*/route\.ts$')"
if [ -z "$ROUTES" ]; then skip "尚无 API route"
else
  MISSING=""; CHECKED=0
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    # GET-only routes have no body to validate; every route that accepts one must run it through zod.
    grep -q -E 'export (async )?function (POST|PUT|PATCH)\b' "$f" || continue
    CHECKED=$((CHECKED+1))
    grep -q -E 'safeParse|parseBody\(|\.parse\(' "$f" || MISSING="${MISSING}${f}"$'\n'
  done < <(printf '%s\n' "$ROUTES")
  if [ -z "$MISSING" ]; then pass "${CHECKED} 个接收请求体的 route 均有 zod 校验"
  else fail "以下 route 未校验入参："; printf '%s' "$MISSING" | sed 's/^/        /'; fi
fi

# ------------------------------------------------------------- 6. 产品定位守卫
stage "6. 产品定位守卫（无账号、无数据库、无付费）"
BANNED='"(@prisma/client|prisma|drizzle-orm|next-auth|@auth/core|mongoose|pg|mysql2|better-sqlite3|@supabase/supabase-js|firebase|stripe|@stripe/[a-z-]+|@clerk/[a-z-]+)"'
if [ ! -f "$APP/package.json" ]; then skip "app/package.json 尚不存在"
else
  HIT="$(grep -n -E -- "$BANNED" "$APP/package.json" || true)"
  if [ -z "$HIT" ]; then pass "package.json 未引入账号 / 数据库 / 付费依赖"
  else fail "package.json 引入了违反定位的依赖："; printf '%s\n' "$HIT" | sed 's/^/        /'; fi
fi

# --------------------------------------------------------- 7. 类型、lint、构建
stage "7. 类型、lint、构建"
if [ ! -f "$APP/package.json" ]; then skip "前端检查（app/package.json 尚不存在）"
elif [ ! -d "$APP/node_modules" ]; then fail "app/node_modules 缺失，先 make install"
else
  ( cd "$APP" && npx --no-install tsc --noEmit >/tmp/gm_tsc.log 2>&1 ) \
    && pass "tsc --noEmit" \
    || { fail "tsc --noEmit 未通过："; tail -25 /tmp/gm_tsc.log | sed 's/^/        /'; }
  ( cd "$APP" && npm run --silent lint >/tmp/gm_lint.log 2>&1 ) \
    && pass "eslint" \
    || { fail "eslint 未通过："; tail -25 /tmp/gm_lint.log | sed 's/^/        /'; }
  if grep -q '"test":' "$APP/package.json"; then
    ( cd "$APP" && npm run --silent test >/tmp/gm_unit.log 2>&1 ) \
      && pass "unit tests" \
      || { fail "unit tests 未通过："; tail -25 /tmp/gm_unit.log | sed 's/^/        /'; }
  fi
  ( cd "$APP" && npm run --silent build >/tmp/gm_build.log 2>&1 ) \
    && pass "next build" \
    || { fail "next build 未通过："; tail -30 /tmp/gm_build.log | sed 's/^/        /'; }
fi

# ------------------------------------------------------------- 8. 旧树清理
stage "8. 旧树清理"
if [ "${GATE_FINAL:-0}" = "1" ]; then
  for p in frontend backend; do
    if [ -e "$p" ]; then fail "${p}/ 仍存在，收尾阶段要求删除"; else pass "${p}/ 已删除"; fi
  done
else
  skip "未设置 GATE_FINAL，收尾之前旧树可共存"
fi

printf '\n'
if [ "$FAILED" -eq 0 ]; then printf '%s闸门通过%s\n' "$G" "$N"
else printf '%s闸门未通过%s。改代码，不要改阈值。\n' "$R" "$N"; fi
exit "$FAILED"
