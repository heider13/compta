#!/usr/bin/env bash
# Setup auto du VPS OVH pour le proxy Compta INPI.
# À lancer en root : sudo bash setup.sh

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/heider13/compta.git}"
APP_DIR="/opt/compta-proxy"
ENV_FILE="/etc/compta-proxy.env"

echo "==> apt update + paquets de base"
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg git ufw debian-keyring debian-archive-keyring apt-transport-https

echo "==> Node.js 22 (NodeSource)"
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1)" != "v22" ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi
node -v

echo "==> Caddy (reverse proxy + Let's Encrypt auto)"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  apt-get install -y -qq caddy
fi

echo "==> Clone / pull du repo"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch --quiet origin
  git -C "$APP_DIR" reset --hard origin/main
else
  rm -rf "$APP_DIR"
  git clone --quiet "$REPO_URL" "$APP_DIR"
fi
chown -R ubuntu:ubuntu "$APP_DIR"

echo "==> npm install (proxy server)"
sudo -u ubuntu bash -c "cd $APP_DIR/server && npm install --production --silent"

if [ ! -f "$ENV_FILE" ]; then
  echo "==> Création $ENV_FILE — À ÉDITER ENSUITE pour mettre les vraies valeurs"
  cat > "$ENV_FILE" <<'EOF'
PORT=3000
INPI_BASE_URL=https://guichet-unique.inpi.fr
INPI_USERNAME=
INPI_PASSWORD=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CORS_ALLOWED_ORIGINS=https://compta-navy.vercel.app
EOF
  chmod 600 "$ENV_FILE"
  echo "    --> Édite-le avec : sudo nano $ENV_FILE"
fi

echo "==> systemd unit"
cp "$APP_DIR/server/compta-proxy.service" /etc/systemd/system/compta-proxy.service
systemctl daemon-reload
systemctl enable compta-proxy >/dev/null
touch /var/log/compta-proxy.log
chown ubuntu:ubuntu /var/log/compta-proxy.log

echo "==> Caddy"
cp "$APP_DIR/server/Caddyfile" /etc/caddy/Caddyfile
systemctl enable caddy >/dev/null

echo "==> Firewall (80/443/22)"
ufw allow 22/tcp >/dev/null 2>&1 || true
ufw allow 80/tcp >/dev/null 2>&1 || true
ufw allow 443/tcp >/dev/null 2>&1 || true
ufw --force enable >/dev/null 2>&1 || true

echo ""
echo "✅ Setup OK."
echo ""
echo "Étapes suivantes :"
echo "  1. Édite l'env : sudo nano $ENV_FILE"
echo "  2. Démarre tout : sudo systemctl restart compta-proxy caddy"
echo "  3. Test          : curl https://vps-84ac2579.vps.ovh.net/health"
echo "  4. Logs proxy    : sudo tail -f /var/log/compta-proxy.log"
echo "  5. Logs Caddy    : sudo journalctl -u caddy -f"
