#!/bin/bash
set -euo pipefail

# =============================================================================
# Buzz Comic - Xserver Initial Setup Script
# Run this script ON the Xserver via SSH once before first deploy:
#   ssh -p 10022 xs997058@sv16424.xserver.jp "bash -s" < scripts/setup-xserver.sh
# =============================================================================

REMOTE_DIR="/home/xs997058/buzz-comic"
NODE_VERSION="22"

echo "==> [1/6] Checking Node.js version..."
if command -v node &>/dev/null; then
  CURRENT_NODE=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$CURRENT_NODE" -ge "$NODE_VERSION" ]; then
    echo "    Node.js $(node -v) is already installed."
  else
    echo "    Node.js $(node -v) found but v${NODE_VERSION}+ required."
    echo "    Please install Node.js ${NODE_VERSION} via nvm or Xserver panel."
    exit 1
  fi
else
  echo "    Node.js not found. Installing via nvm..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  # shellcheck source=/dev/null
  export NVM_DIR="$HOME/.nvm"
  # shellcheck disable=SC1091
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  nvm install "${NODE_VERSION}"
  nvm alias default "${NODE_VERSION}"
  nvm use default
fi

echo "    Node.js: $(node -v)"
echo "    npm: $(npm -v)"

echo "==> [2/6] Installing PM2 globally..."
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
  pm2 startup
else
  echo "    PM2 is already installed: $(pm2 -v)"
fi

echo "==> [3/6] Creating application directory..."
mkdir -p "${REMOTE_DIR}"
mkdir -p "${REMOTE_DIR}/.next/static"
mkdir -p "${REMOTE_DIR}/public/uploads/mangas"
mkdir -p "${REMOTE_DIR}/public/videos"
echo "    Directory: ${REMOTE_DIR}"

echo "==> [4/6] Creating PM2 ecosystem config..."
cat > "${REMOTE_DIR}/ecosystem.config.js" << 'ECOSYSTEM'
module.exports = {
  apps: [
    {
      name: 'buzz-comic',
      script: './server.js',
      cwd: '/home/xs997058/buzz-comic',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
    },
  ],
};
ECOSYSTEM
echo "    PM2 ecosystem config created."

echo "==> [5/6] MySQL database setup reminder..."
echo ""
echo "    Run the following in MySQL (via Xserver panel or mysql CLI):"
echo "    ----------------------------------------------------------------"
echo "    CREATE DATABASE IF NOT EXISTS buzz_comic CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo "    CREATE USER IF NOT EXISTS 'buzz_user'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD';"
echo "    GRANT ALL PRIVILEGES ON buzz_comic.* TO 'buzz_user'@'localhost';"
echo "    FLUSH PRIVILEGES;"
echo "    ----------------------------------------------------------------"
echo ""

echo "==> [6/6] .env file reminder..."
if [ ! -f "${REMOTE_DIR}/.env" ]; then
  cat > "${REMOTE_DIR}/.env.example" << 'ENVEXAMPLE'
# Database
DATABASE_URL="mysql://buzz_user:YOUR_PASSWORD@localhost:3306/buzz_comic"

# NextAuth
NEXTAUTH_URL="https://yourdomain.xserver.jp"
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"

# App
NEXT_PUBLIC_APP_URL="https://yourdomain.xserver.jp"
PORT=3000
HOSTNAME=0.0.0.0

# Google OAuth (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Google Sheets (optional)
GOOGLE_SHEETS_ID=""
GOOGLE_SERVICE_ACCOUNT_KEY=""

# FLUX.2 / AI Image Generation (optional)
FAL_API_KEY=""

# Redis / BullMQ (optional)
REDIS_URL="redis://localhost:6379"
ENVEXAMPLE
  echo "    .env.example created at ${REMOTE_DIR}/.env.example"
  echo "    IMPORTANT: Copy to .env and fill in real values before deploying!"
else
  echo "    .env already exists."
fi

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Fill in ${REMOTE_DIR}/.env (copy from .env.example)"
echo "  2. Run the MySQL commands shown above"
echo "  3. Deploy with: npm run deploy  (from your local machine)"
