#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${PINKROOT_REPO:-https://github.com/Amienigma/pinkroot.git}"
INSTALL_DIR="${PINKROOT_HOME:-$HOME/pinkroot}"
PORT="${PORT:-8108}"

if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
elif command -v sudo >/dev/null 2>&1; then
  SUDO="sudo"
else
  SUDO=""
fi

run_root() {
  if [ -n "$SUDO" ]; then
    $SUDO "$@"
  else
    "$@"
  fi
}

echo "==> Installing system packages (curl git build-essential python3)"
if command -v apt-get >/dev/null 2>&1; then
  run_root apt-get update -y
  run_root apt-get install -y curl git build-essential python3 ca-certificates
else
  echo "apt-get not found. Install curl, git, a C toolchain, and python3 yourself, then re-run."
fi

node_major() {
  node -p "parseInt(process.versions.node.split('.')[0], 10)" 2>/dev/null || echo 0
}

need_node() {
  command -v node >/dev/null 2>&1 && [ "$(node_major)" -ge 20 ]
}

echo "==> Checking Node.js 20+"
if ! need_node; then
  if command -v apt-get >/dev/null 2>&1 && curl -fsSL https://deb.nodesource.com/setup_20.x | run_root bash -; then
    run_root apt-get install -y nodejs
  fi
fi

if ! need_node && command -v apt-get >/dev/null 2>&1; then
  echo "==> NodeSource failed or too old; falling back to distro nodejs/npm"
  run_root apt-get install -y nodejs npm || true
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Could not install Node.js. Install Node 20 or newer and re-run."
  exit 1
fi

if ! need_node; then
  echo "Warning: Node $(node -v) is older than 20. Continuing anyway."
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is not available. Install npm and re-run."
  exit 1
fi

echo "==> Using Node $(node -v) / npm $(npm -v)"

echo "==> Fetching PINKROOT into $INSTALL_DIR"
if [ -d "$INSTALL_DIR/.git" ]; then
  git -C "$INSTALL_DIR" pull --ff-only origin main || git -C "$INSTALL_DIR" pull --ff-only
else
  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

echo "==> Building frontend"
npm install
npm run build

echo "==> Installing server"
(
  cd server
  npm install
)

GENERATED_NEW_ENV=0
if [ ! -f "$INSTALL_DIR/server/.env" ]; then
  if command -v openssl >/dev/null 2>&1; then
    JWT_SECRET="$(openssl rand -hex 32)"
    PINKROOT_PASSWORD="$(openssl rand -hex 12)"
  else
    JWT_SECRET="$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
    PINKROOT_PASSWORD="$(head -c 12 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  fi
  cat > "$INSTALL_DIR/server/.env" <<EOF
PORT=${PORT}
JWT_SECRET=${JWT_SECRET}
PINKROOT_PASSWORD=${PINKROOT_PASSWORD}
EOF
  chmod 600 "$INSTALL_DIR/server/.env"
  GENERATED_NEW_ENV=1
else
  # Keep existing secrets; refresh PORT if missing.
  if ! grep -q '^PORT=' "$INSTALL_DIR/server/.env"; then
    echo "PORT=${PORT}" >> "$INSTALL_DIR/server/.env"
  fi
  # shellcheck disable=SC1091
  set -a; . "$INSTALL_DIR/server/.env"; set +a
fi

chmod +x "$INSTALL_DIR/start.sh" "$INSTALL_DIR/install.sh" 2>/dev/null || true

echo "==> Starting PINKROOT"
"$INSTALL_DIR/start.sh"

echo
echo "=========================================="
echo "  PINKROOT is installed"
echo "=========================================="
echo "  URL:      http://localhost:${PORT}"
if [ "$GENERATED_NEW_ENV" = "1" ]; then
  echo "  Password: ${PINKROOT_PASSWORD}"
  echo
  echo "  This password was just generated and saved"
  echo "  to $INSTALL_DIR/server/.env"
  echo "  It will not be printed again."
else
  echo "  Password: already set in $INSTALL_DIR/server/.env (not reprinted)"
fi
echo
echo "  Restart:  $INSTALL_DIR/start.sh"
echo "  Stop:     kill \$(cat $INSTALL_DIR/pinkroot.pid)"
echo "  Logs:     $INSTALL_DIR/logs/pinkroot.log"
echo "=========================================="
echo
echo "Open the URL, click the Wi-Fi icon (Connect to server),"
echo "leave the server URL as http://localhost:${PORT}, and paste the password."
echo "Keep this Linux session open — Android may stop background processes."
