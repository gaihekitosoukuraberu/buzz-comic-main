#!/bin/bash
set -euo pipefail

# =============================================================================
# Buzz Comic - Manual Deploy Script
# Xserver: xs997058@sv16424.xserver.jp (port 10022)
# =============================================================================

REMOTE_USER="xs997058"
REMOTE_HOST="sv16424.xserver.jp"
REMOTE_PORT="10022"
REMOTE_DIR="/home/xs997058/buzz-comic"
SSH_KEY="${SSH_KEY_PATH:-$HOME/.ssh/xserver_deploy}"
SSH_OPTS="-p ${REMOTE_PORT} -i ${SSH_KEY} -o StrictHostKeyChecking=no"

echo "==> [1/5] Building application..."
npm run build

echo "==> [2/5] Transferring standalone server..."
rsync -avz --delete \
  -e "ssh ${SSH_OPTS}" \
  .next/standalone/ \
  "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/"

echo "==> [3/5] Transferring static assets..."
rsync -avz \
  -e "ssh ${SSH_OPTS}" \
  .next/static/ \
  "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/.next/static/"

echo "==> [4/5] Transferring public directory..."
rsync -avz \
  -e "ssh ${SSH_OPTS}" \
  --exclude='uploads/' \
  --exclude='videos/' \
  public/ \
  "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/public/"

echo "==> [5/5] Running migrations and restarting PM2..."
ssh ${SSH_OPTS} "${REMOTE_USER}@${REMOTE_HOST}" "
  cd ${REMOTE_DIR}
  export \$(cat .env | grep -v '^#' | xargs)
  npx prisma migrate deploy
  pm2 restart buzz-comic || pm2 start server.js --name buzz-comic
  pm2 save
"

echo ""
echo "Deploy complete!"
