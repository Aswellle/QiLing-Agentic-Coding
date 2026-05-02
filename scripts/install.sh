#!/usr/bin/env bash
# 启灵 (QiLing) 安装脚本
# 用法: curl -fsSL https://raw.githubusercontent.com/Aswellle/QiLing-Agentic-Coding/main/scripts/install.sh | bash
# 或:   bash install.sh [--version v0.2.0] [--dir /usr/local/bin]

set -euo pipefail

# ─── Homebrew 优先 ─────────────────────────────────────────────────────────
# 如果系统安装了 Homebrew，优先推荐使用更易维护的 brew 安装方式
if command -v brew &>/dev/null && [[ "${QILING_SKIP_BREW:-}" != "1" ]]; then
  echo ""
  echo "  检测到 Homebrew，推荐使用:"
  echo ""
  echo "    brew tap Aswellle/qiling"
  echo "    brew install qiling"
  echo ""
  read -r -p "  是否使用 Homebrew 安装? [Y/n] " BREW_REPLY
  BREW_REPLY="${BREW_REPLY:-Y}"
  if [[ "$BREW_REPLY" =~ ^[Yy]$ ]]; then
    brew tap Aswellle/qiling 2>/dev/null || true
    brew install qiling
    echo ""
    echo "✨ 通过 Homebrew 安装完成！"
    echo "   升级: brew upgrade qiling"
    exit 0
  fi
  echo "  跳过 Homebrew，继续使用直接安装方式..."
  echo ""
fi

# ─── 配置 ──────────────────────────────────────────────────────────────────
REPO="${QILING_REPO:-Aswellle/QiLing-Agentic-Coding}"
INSTALL_DIR="${QILING_INSTALL_DIR:-$HOME/.local/bin}"
REQUESTED_VERSION="${QILING_VERSION:-}"
BINARY_NAME="qiling"

# ─── 颜色输出 ──────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${CYAN}→${NC} $*"; }
success() { echo -e "${GREEN}✓${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠${NC} $*"; }
error()   { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

# ─── 解析参数 ──────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --version) REQUESTED_VERSION="$2"; shift 2 ;;
    --dir)     INSTALL_DIR="$2"; shift 2 ;;
    *) warn "Unknown argument: $1"; shift ;;
  esac
done

# ─── 平台检测 ──────────────────────────────────────────────────────────────
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$OS" in
  linux)  PLATFORM="linux"  ;;
  darwin) PLATFORM="macos"  ;;
  *)      error "不支持的系统: $OS (支持: linux, macos)" ;;
esac

case "$ARCH" in
  x86_64|amd64) ARCH_NAME="x64"   ;;
  arm64|aarch64) ARCH_NAME="arm64" ;;
  *) error "不支持的架构: $ARCH (支持: x64, arm64)" ;;
esac

ARTIFACT="${BINARY_NAME}-${PLATFORM}-${ARCH_NAME}"

# ─── 获取最新版本 ──────────────────────────────────────────────────────────
if [[ -z "$REQUESTED_VERSION" ]]; then
  info "获取最新版本信息..."
  API_URL="https://api.github.com/repos/${REPO}/releases/latest"
  if command -v curl &>/dev/null; then
    RELEASE_JSON=$(curl -fsSL "$API_URL" 2>/dev/null || echo "{}")
  else
    RELEASE_JSON=$(wget -qO- "$API_URL" 2>/dev/null || echo "{}")
  fi
  REQUESTED_VERSION=$(echo "$RELEASE_JSON" | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"\(.*\)".*/\1/')
  [[ -z "$REQUESTED_VERSION" ]] && error "无法获取版本信息，请手动指定: --version v0.2.0"
fi

DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${REQUESTED_VERSION}/${ARTIFACT}"

# ─── 下载 ──────────────────────────────────────────────────────────────────
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

info "下载 QiLing ${REQUESTED_VERSION} (${PLATFORM}/${ARCH_NAME})..."
DOWNLOAD_PATH="${TMP_DIR}/${BINARY_NAME}"

if command -v curl &>/dev/null; then
  curl -fL --progress-bar "$DOWNLOAD_URL" -o "$DOWNLOAD_PATH" ||
    error "下载失败: $DOWNLOAD_URL"
else
  wget -q --show-progress "$DOWNLOAD_URL" -O "$DOWNLOAD_PATH" ||
    error "下载失败: $DOWNLOAD_URL"
fi

chmod +x "$DOWNLOAD_PATH"

# ─── 验证 ──────────────────────────────────────────────────────────────────
if ! "$DOWNLOAD_PATH" --version &>/dev/null; then
  error "二进制文件验证失败，请检查下载是否完整"
fi
INSTALLED_VERSION=$("$DOWNLOAD_PATH" --version 2>/dev/null || echo "unknown")

# ─── 安装 ──────────────────────────────────────────────────────────────────
mkdir -p "$INSTALL_DIR"
cp "$DOWNLOAD_PATH" "${INSTALL_DIR}/${BINARY_NAME}"
success "已安装 ${INSTALL_DIR}/${BINARY_NAME}"

# ─── PATH 设置 ─────────────────────────────────────────────────────────────
if ! command -v "$BINARY_NAME" &>/dev/null; then
  warn "注意：${INSTALL_DIR} 不在 PATH 中"
  echo ""
  echo "  请将以下内容添加到你的 ~/.bashrc 或 ~/.zshrc："
  echo ""
  echo "    export PATH=\"${INSTALL_DIR}:\$PATH\""
  echo ""

  # 自动添加到 shell 配置
  SHELL_CONFIG=""
  if [[ "$SHELL" == *"zsh"* ]] && [[ -f "$HOME/.zshrc" ]]; then
    SHELL_CONFIG="$HOME/.zshrc"
  elif [[ -f "$HOME/.bashrc" ]]; then
    SHELL_CONFIG="$HOME/.bashrc"
  fi

  if [[ -n "$SHELL_CONFIG" ]]; then
    read -r -p "  是否自动添加到 ${SHELL_CONFIG}? [Y/n] " REPLY
    REPLY="${REPLY:-Y}"
    if [[ "$REPLY" =~ ^[Yy]$ ]]; then
      echo "" >> "$SHELL_CONFIG"
      echo "# QiLing (启灵) 编程代理" >> "$SHELL_CONFIG"
      echo "export PATH=\"${INSTALL_DIR}:\$PATH\"" >> "$SHELL_CONFIG"
      success "已添加到 ${SHELL_CONFIG}，请运行: source ${SHELL_CONFIG}"
    fi
  fi
else
  success "PATH 已正确配置"
fi

# ─── 完成 ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}✨ QiLing ${INSTALLED_VERSION} 安装完成！${NC}"
echo ""
echo "  在任意目录运行:  qiling"
echo "  查看帮助:        qiling --help"
echo "  查看版本:        qiling --version"
echo ""
