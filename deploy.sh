#!/bin/bash
# ════════════════════════════════════════════════════════════════
#  MedAI Healthcare Platform — One-command server setup
#  Run on fresh Ubuntu 22.04 ARM (Oracle Cloud Free Tier)
#  Usage: curl -fsSL https://raw.githubusercontent.com/YOUR/REPO/main/deploy.sh | bash
#  Or:    bash deploy.sh
# ════════════════════════════════════════════════════════════════
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERR]${NC} $1"; exit 1; }

APP_DIR="/opt/healthcare-platform"
REPO_URL="${REPO_URL:-https://github.com/YOUR_USERNAME/healthcare-platform.git}"

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   MedAI Healthcare Platform Deploy       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── 1. System packages ──────────────────────────────────────────
info "Installing system packages..."
sudo apt-get update -qq
sudo apt-get install -y -qq \
    git curl wget unzip \
    ca-certificates gnupg \
    lsb-release apt-transport-https \
    ufw fail2ban

# ── 2. Docker ───────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    info "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker "$USER"
    sudo systemctl enable docker
    sudo systemctl start docker
    success "Docker installed"
else
    success "Docker already installed: $(docker --version)"
fi

# Docker Compose plugin
if ! docker compose version &>/dev/null; then
    info "Installing Docker Compose plugin..."
    COMPOSE_VERSION="v2.27.0"
    sudo curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-aarch64" \
        -o /usr/local/lib/docker/cli-plugins/docker-compose
    sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
    success "Docker Compose installed"
fi

# ── 3. Firewall ─────────────────────────────────────────────────
info "Configuring firewall..."
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
success "Firewall configured (80, 443, SSH allowed)"

# ── 4. Clone / update repo ──────────────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
    info "Updating existing repository..."
    cd "$APP_DIR"
    git pull origin main
else
    info "Cloning repository..."
    sudo mkdir -p "$APP_DIR"
    sudo chown "$USER:$USER" "$APP_DIR"
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# ── 5. Environment file ─────────────────────────────────────────
if [ ! -f "$APP_DIR/.env" ]; then
    warn ".env not found — copying from .env.prod.example"
    cp "$APP_DIR/.env.prod.example" "$APP_DIR/.env"
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}  ACTION REQUIRED: Fill in your .env file${NC}"
    echo -e "${YELLOW}  Run: nano $APP_DIR/.env${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    read -rp "Press ENTER after filling .env to continue..." _
else
    success ".env already exists"
fi

# ── 6. Generate secrets if placeholders remain ──────────────────
info "Checking secrets..."
source "$APP_DIR/.env"

if [[ "$JWT_SECRET" == *"CHANGE_ME"* ]]; then
    JWT_SECRET=$(openssl rand -hex 64)
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" "$APP_DIR/.env"
    success "Generated JWT_SECRET"
fi

if [[ "$AI_SERVICE_INTERNAL_TOKEN" == *"CHANGE_ME"* ]]; then
    TOKEN=$(openssl rand -hex 32)
    sed -i "s|^AI_SERVICE_INTERNAL_TOKEN=.*|AI_SERVICE_INTERNAL_TOKEN=${TOKEN}|" "$APP_DIR/.env"
    success "Generated AI_SERVICE_INTERNAL_TOKEN"
fi

# ── 7. Configure Caddyfile with domain ──────────────────────────
source "$APP_DIR/.env"
DOMAIN_VALUE="${DOMAIN:-http://$(curl -s ifconfig.me)}"

info "Configuring Caddy for: $DOMAIN_VALUE"
sed -i "s|\${DOMAIN}|${DOMAIN_VALUE}|g" "$APP_DIR/Caddyfile" 2>/dev/null || true
success "Caddyfile configured"

# ── 8. Build and start ──────────────────────────────────────────
info "Building Docker images (this takes ~5 minutes)..."
cd "$APP_DIR"
docker compose -f docker-compose.prod.yml --env-file .env build

info "Starting all services..."
docker compose -f docker-compose.prod.yml --env-file .env up -d

# ── 9. Health check ─────────────────────────────────────────────
info "Waiting for services to start (30s)..."
sleep 30

BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/v1/actuator/health 2>/dev/null || echo "000")
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Deployment Complete!             ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Frontend:  ${BLUE}${DOMAIN_VALUE}${NC}  (HTTP $FRONTEND_STATUS)"
echo -e "  Backend:   ${BLUE}${DOMAIN_VALUE}/api/v1${NC}  (HTTP $BACKEND_STATUS)"
echo -e "  Logs:      ${YELLOW}docker compose -f $APP_DIR/docker-compose.prod.yml logs -f${NC}"
echo -e "  Update:    ${YELLOW}cd $APP_DIR && git pull && docker compose -f docker-compose.prod.yml up -d --build${NC}"
echo ""

if [[ "$FRONTEND_STATUS" != "200" ]] || [[ "$BACKEND_STATUS" != "200" ]]; then
    warn "Some services may still be starting. Check logs:"
    echo "  docker compose -f $APP_DIR/docker-compose.prod.yml logs --tail=50"
fi
