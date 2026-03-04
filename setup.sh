#!/bin/bash

# =============================================================
# Shopify App Template - One-Command Setup
# =============================================================
# Chay lenh nay trong Terminal:
#
#   curl -fsSL https://raw.githubusercontent.com/sellersmith/shopify-app-template-react-router-sqlite/main/setup.sh | bash
#
# Hoac neu da clone repo:
#
#   chmod +x setup.sh && ./setup.sh
#
# =============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() { echo "" && echo -e "${BLUE}==>${NC} ${1}"; }
print_success() { echo -e "${GREEN}  ✓${NC} ${1}"; }
print_warning() { echo -e "${YELLOW}  ⚠${NC} ${1}"; }
print_error() { echo -e "${RED}  ✗${NC} ${1}"; }

REPO_URL="https://github.com/sellersmith/shopify-app-template-react-router-sqlite.git"
PROJECT_DIR="$HOME/projects/shopify-app-template-react-router-sqlite"

# --------------------------------------------------
# 1. Homebrew
# --------------------------------------------------
print_step "Kiem tra Homebrew..."
if ! command -v brew &>/dev/null; then
  echo "Cai dat Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  if [[ $(uname -m) == "arm64" ]]; then
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi
  print_success "Homebrew da duoc cai dat"
else
  print_success "Homebrew da co san ($(brew --version | head -1))"
fi

# --------------------------------------------------
# 2. Git
# --------------------------------------------------
print_step "Kiem tra Git..."
if ! command -v git &>/dev/null; then
  brew install git
  print_success "Git da duoc cai dat"
else
  print_success "Git da co san ($(git --version))"
fi

# --------------------------------------------------
# 3. Clone repo (skip neu da o trong project)
# --------------------------------------------------
print_step "Kiem tra project..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"

if [[ -f "$SCRIPT_DIR/package.json" ]] && [[ -f "$SCRIPT_DIR/shopify.app.toml" ]]; then
  PROJECT_DIR="$SCRIPT_DIR"
  print_success "Dang o trong project directory"
elif [[ -d "$PROJECT_DIR/.git" ]]; then
  print_success "Project da ton tai tai $PROJECT_DIR"
  cd "$PROJECT_DIR"
  git pull --ff-only || true
else
  mkdir -p "$(dirname "$PROJECT_DIR")"
  git clone "$REPO_URL" "$PROJECT_DIR"
  print_success "Da clone project ve $PROJECT_DIR"
fi

cd "$PROJECT_DIR"

# --------------------------------------------------
# 4. Node.js >= 20
# --------------------------------------------------
print_step "Kiem tra Node.js..."
NEED_NODE=false

if ! command -v node &>/dev/null; then
  NEED_NODE=true
else
  NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
  if [[ "$NODE_MAJOR" -lt 20 ]]; then
    print_warning "Node.js $(node -v) qua cu. Can >=20"
    NEED_NODE=true
  fi
fi

if $NEED_NODE; then
  if ! command -v nvm &>/dev/null; then
    print_step "Cai dat nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  fi
  nvm install 20
  nvm use 20
  print_success "Node.js da duoc cai dat ($(node -v))"
else
  print_success "Node.js da co san ($(node -v))"
fi

# --------------------------------------------------
# 5. npm
# --------------------------------------------------
print_step "Kiem tra npm..."
if command -v npm &>/dev/null; then
  print_success "npm da co san ($(npm -v))"
else
  print_error "npm khong tim thay. Thu cai lai Node.js"
  exit 1
fi

# --------------------------------------------------
# 6. Shopify CLI
# --------------------------------------------------
print_step "Kiem tra Shopify CLI..."
if ! command -v shopify &>/dev/null; then
  npm install -g @shopify/cli
  print_success "Shopify CLI da duoc cai dat ($(shopify version))"
else
  print_success "Shopify CLI da co san ($(shopify version))"
fi

# --------------------------------------------------
# 7. Code editor (optional)
# --------------------------------------------------
print_step "Kiem tra Code Editor..."
if command -v code &>/dev/null; then
  print_success "VS Code da co san"
elif command -v cursor &>/dev/null; then
  print_success "Cursor da co san"
else
  print_warning "Chua co VS Code/Cursor. Tai tai: https://code.visualstudio.com/"
fi

# --------------------------------------------------
# 8. Install dependencies
# --------------------------------------------------
print_step "Cai dat dependencies..."
npm install
print_success "Dependencies da duoc cai dat"

# --------------------------------------------------
# 9. Prisma generate
# --------------------------------------------------
print_step "Setup Prisma..."
npx prisma generate
print_success "Prisma client da duoc generate"

# --------------------------------------------------
# 10. Setup database (SQLite)
# --------------------------------------------------
print_step "Setup database..."
npx prisma migrate deploy
print_success "Database da duoc setup"

# --------------------------------------------------
# Done
# --------------------------------------------------
echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  SETUP HOAN TAT!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo "  Buoc tiep theo:"
echo ""
echo "  1. Dang nhap Shopify Partner:"
echo -e "     ${GREEN}shopify auth login${NC}"
echo ""
echo "  2. Chay app:"
echo -e "     ${GREEN}cd $PROJECT_DIR${NC}"
echo -e "     ${GREEN}npm run dev${NC}"
echo ""
echo "  3. Shopify CLI se hoi ban chon store de test."
echo "     Chon dev store cua team."
echo ""
echo -e "  ${YELLOW}Project directory:${NC} $PROJECT_DIR"
echo ""
