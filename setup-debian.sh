#!/usr/bin/env bash
set -Eeuo pipefail

REQUIRED_NODE_MAJOR=24
CHECK_ONLY=0
if [[ "${1:-}" == "--check" ]]; then CHECK_ONLY=1; shift; fi
if [[ $# -ne 0 ]]; then
  echo "Uso: ./setup-debian.sh [--check]" >&2
  exit 2
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
if [[ ! -f package.json || ! -f package-lock.json ]]; then
  echo "Ejecuta este script desde una copia completa del repositorio de Astra." >&2
  exit 1
fi
if [[ ! -r /etc/os-release ]]; then
  echo "No se pudo identificar la distribución. Este instalador requiere Debian o una derivada." >&2
  exit 1
fi
# shellcheck disable=SC1091
source /etc/os-release
case " ${ID:-} ${ID_LIKE:-} " in
  *" debian "*|*" ubuntu "*|*" linuxmint "*) ;;
  *) echo "Distribución no compatible: ${PRETTY_NAME:-desconocida}. Usa Debian, Ubuntu o una derivada." >&2; exit 1 ;;
esac
command -v apt-get >/dev/null 2>&1 || { echo "No se encontró apt-get en esta distribución." >&2; exit 1; }
command -v dpkg >/dev/null 2>&1 || { echo "No se encontró dpkg en esta distribución." >&2; exit 1; }

version_major() { "$1" --version 2>/dev/null | sed -E 's/^[^0-9]*([0-9]+).*/\1/' | head -n 1; }
node_ok() { command -v node >/dev/null 2>&1 && [[ "$(version_major node)" -ge "$REQUIRED_NODE_MAJOR" ]]; }
cloudflared_ok() { command -v cloudflared >/dev/null 2>&1 || [[ -x .local/bin/cloudflared ]]; }

show_status() {
  printf '%-16s %s\n' "Sistema" "${PRETTY_NAME}"
  printf '%-16s %s\n' "Git" "$(command -v git >/dev/null 2>&1 && git --version || echo 'no instalado')"
  printf '%-16s %s\n' "Node.js" "$(command -v node >/dev/null 2>&1 && node --version || echo 'no instalado')"
  printf '%-16s %s\n' "npm" "$(command -v npm >/dev/null 2>&1 && npm --version || echo 'no instalado')"
  if command -v cloudflared >/dev/null 2>&1; then printf '%-16s %s\n' "cloudflared" "$(cloudflared --version | head -n 1)"
  elif [[ -x .local/bin/cloudflared ]]; then printf '%-16s %s\n' "cloudflared" "$(.local/bin/cloudflared --version | head -n 1)"
  else printf '%-16s %s\n' "cloudflared" "no instalado"; fi
}

echo "Comprobando el entorno de Astra…"
show_status
if [[ "$CHECK_ONLY" -eq 1 ]]; then
  missing=0
  command -v git >/dev/null 2>&1 || { echo "Falta Git." >&2; missing=1; }
  node_ok || { echo "Se requiere Node.js ${REQUIRED_NODE_MAJOR} o posterior." >&2; missing=1; }
  command -v npm >/dev/null 2>&1 || { echo "Falta npm." >&2; missing=1; }
  cloudflared_ok || { echo "Falta cloudflared para publicar mediante túnel." >&2; missing=1; }
  if [[ "${EUID}" -ne 0 ]] && ! command -v sudo >/dev/null 2>&1; then echo "Falta sudo para actualizar paquetes." >&2; missing=1; fi
  [[ "$missing" -eq 0 ]] && echo "El entorno cumple todos los requisitos."
  exit "$missing"
fi

if [[ "${EUID}" -eq 0 ]]; then SUDO=();
elif command -v sudo >/dev/null 2>&1; then SUDO=(sudo);
else echo "Se necesita sudo para instalar paquetes del sistema." >&2; exit 1; fi

echo "Actualizando herramientas base con apt…"
"${SUDO[@]}" apt-get update
"${SUDO[@]}" apt-get install -y ca-certificates curl git

if ! node_ok; then
  echo "Instalando Node.js ${REQUIRED_NODE_MAJOR}…"
  NODE_SETUP="$(mktemp)"
  trap 'rm -f "$NODE_SETUP"' EXIT
  curl -fsSL "https://deb.nodesource.com/setup_${REQUIRED_NODE_MAJOR}.x" -o "$NODE_SETUP"
  "${SUDO[@]}" bash "$NODE_SETUP"
  "${SUDO[@]}" apt-get install -y nodejs
  rm -f "$NODE_SETUP"; trap - EXIT
else
  echo "Node.js $(node --version) ya es compatible."
  if dpkg-query -W -f='${Status}' nodejs 2>/dev/null | grep -q 'install ok installed'; then
    echo "Buscando actualizaciones de Node.js instaladas mediante apt…"
    "${SUDO[@]}" apt-get install --only-upgrade -y nodejs
  fi
fi

if ! node_ok || ! command -v npm >/dev/null 2>&1; then
  echo "No se pudo preparar Node.js ${REQUIRED_NODE_MAJOR} o posterior con npm." >&2
  exit 1
fi

case "$(dpkg --print-architecture)" in
  amd64) CF_ARCH=amd64 ;;
  arm64) CF_ARCH=arm64 ;;
  *) echo "Arquitectura no compatible con el instalador de cloudflared: $(dpkg --print-architecture)" >&2; exit 1 ;;
esac
echo "Instalando o actualizando Cloudflare Tunnel…"
mkdir -p .local/bin
CF_TMP="$(mktemp)"
trap 'rm -f "$CF_TMP"' EXIT
curl -fL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CF_ARCH}" -o "$CF_TMP"
install -m 0755 "$CF_TMP" .local/bin/cloudflared
rm -f "$CF_TMP"; trap - EXIT

echo "Restaurando dependencias fijadas y compilando…"
npm ci
npm run build
if [[ -d .git ]]; then npm run git:setup; else echo "No se configuraron hooks porque esta carpeta no es un clon de Git."; fi

echo
echo "Astra está preparado. Ejecuta: npm start"
echo "Para publicar temporalmente: npm run tunnel"
show_status
