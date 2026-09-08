# GenMentor 命令入口。scripts/gate.sh 依赖这些目标名，不要重命名。
SHELL := /bin/bash
.DEFAULT_GOAL := help
APP := app
PORT ?= 3000

.PHONY: help install dev build start gate verify-ui fmt clean

help: ## 列出可用目标
	@grep -hE '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) | awk -F':.*?## ' '{printf "  \033[1m%-12s\033[0m %s\n", $$1, $$2}'

install: ## 安装依赖
	cd $(APP) && pnpm install

dev: ## 起应用
	cd $(APP) && pnpm dev --port $(PORT)

build: ## 生产构建
	cd $(APP) && pnpm build

start: ## 起生产构建
	cd $(APP) && pnpm start --port $(PORT)

gate: ## 静态验收闸门
	./scripts/gate.sh

verify-ui: ## 起服务后的 E2E、a11y 与截图闸门
	./scripts/verify-ui.sh

fmt: ## 格式化
	cd $(APP) && npx --no-install prettier --write src && npx --no-install eslint --fix src

clean:
	rm -rf $(APP)/.next e2e/artifacts
