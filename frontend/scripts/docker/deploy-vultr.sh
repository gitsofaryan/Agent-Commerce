#!/usr/bin/env bash
set -euo pipefail

IMAGE="${1:-}"
ENV_FILE="${2:-/opt/agent-commerce/.env.production}"
CONTAINER_NAME="${CONTAINER_NAME:-agent-commerce}"

if [[ -z "$IMAGE" ]]; then
  echo "Usage: bash scripts/docker/deploy-vultr.sh <docker-image> [env-file]"
  echo "Example: bash scripts/docker/deploy-vultr.sh myuser/agent-commerce:latest"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  apt-get update
  apt-get install -y ca-certificates curl
  curl -fsSL https://get.docker.com | sh
fi

mkdir -p "$(dirname "$ENV_FILE")"

if [[ ! -f "$ENV_FILE" ]]; then
  cat > "$ENV_FILE" <<'EOF'
NEXT_PUBLIC_SITE_URL=http://66.42.126.85
NEXT_PUBLIC_SPACETIME_ENABLED=false
NEXT_PUBLIC_SPACETIME_API_URL=http://localhost:8000
NEXT_PUBLIC_ARMORIQ_ENABLED=false
NEXT_PUBLIC_ARMORIQ_API_URL=http://localhost:8001
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
EOF
  echo "Created default env file at $ENV_FILE"
fi

docker pull "$IMAGE"
docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  --env-file "$ENV_FILE" \
  -p 80:3000 \
  "$IMAGE"

if command -v ufw >/dev/null 2>&1; then
  ufw allow 22/tcp || true
  ufw allow 80/tcp || true
  ufw allow 443/tcp || true
  ufw --force enable || true
fi

echo "Container status:"
docker ps --filter "name=$CONTAINER_NAME"
echo "Health check:"
curl -sS http://127.0.0.1/api/health || true
