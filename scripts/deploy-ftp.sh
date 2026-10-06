#!/usr/bin/env bash
# =============================================================================
# Met à jour le site en ligne depuis votre poste, par FTP, en une commande :
# prépare les fichiers de production puis n'envoie que ce qui a changé.
#
# Prérequis (macOS) : brew install lftp php composer node
#
# Usage :
#   scripts/deploy-ftp.sh                 # hôte/compte par défaut ci-dessous
#   FTP_HOST=65.21.8.38 FTP_USER=eeht@eeht.onits.sn scripts/deploy-ftp.sh
#   scripts/deploy-ftp.sh --dry-run       # affiche ce qui serait envoyé, sans rien envoyer
#
# Le mot de passe FTP est demandé au clavier : il n'est jamais écrit sur disque.
# Ne sont JAMAIS envoyés ni supprimés sur le serveur : .env, storage/ (fichiers
# téléversés, journaux, sessions), public/storage, la base de données.
# =============================================================================
set -euo pipefail

FTP_HOST="${FTP_HOST:-65.21.8.38}"
FTP_USER="${FTP_USER:-eeht@eeht.onits.sn}"
# Dossier distant de l'application, vu depuis le compte FTP (ce compte
# démarre déjà dans /home/onitssn/eeht, d'où « . »).
FTP_DIR="${FTP_DIR:-.}"
DRY_RUN=""
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN="--dry-run"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

for tool in lftp php composer npm; do
    command -v "$tool" >/dev/null || { echo "✗ « $tool » est introuvable (macOS : brew install $tool)." >&2; exit 1; }
done
php -r 'exit(version_compare(PHP_VERSION, "8.4.1", ">=") ? 0 : 1);' || {
    echo "✗ PHP $(php -r 'echo PHP_VERSION;') détecté : PHP 8.4.1 minimum est requis." >&2
    exit 1
}

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
    echo "⚠ Vous avez des modifications non commitées : elles seront envoyées telles quelles."
    read -r -p "Continuer ? [o/N] " answer
    [[ "$answer" =~ ^[oOyY]$ ]] || exit 1
fi

echo "→ Dépendances PHP de production…"
composer install --no-dev --optimize-autoloader --no-interaction --no-progress

echo "→ Compilation du front (Vite)…"
npm install --ignore-scripts --no-audit --no-fund
npm run build

# Remet les outils de développement sur le poste, même en cas d'échec de l'envoi.
restore_dev() {
    echo "→ Réinstallation des dépendances de développement sur le poste…"
    composer install --no-interaction --no-progress >/dev/null 2>&1 || true
}
trap restore_dev EXIT

echo "→ Envoi vers ${FTP_USER}@${FTP_HOST} (seuls les fichiers modifiés)…"
read -r -s -p "Mot de passe FTP : " LFTP_PASSWORD
echo
export LFTP_PASSWORD

# Le mot de passe passe par la variable LFTP_PASSWORD (--env-password) : il
# n'apparaît ni dans la ligne de commande ni dans l'historique.
# Le certificat TLS n'est pas vérifié car la connexion se fait par adresse
# IP (le certificat de l'hébergeur porte un nom de domaine) ; la connexion
# reste chiffrée.
lftp --env-password -u "$FTP_USER" "$FTP_HOST" <<LFTP
set ftp:ssl-allow yes
set ftp:ssl-force no
set ssl:verify-certificate no
set net:max-retries 3
set net:timeout 30
set mirror:parallel-transfer-count 4
cd "$FTP_DIR"
mirror --reverse --only-newer --no-perms --verbose=1 $DRY_RUN \
  --exclude-glob .git/ \
  --exclude-glob .github/ \
  --exclude-glob .vscode/ \
  --exclude-glob .idea/ \
  --exclude-glob .claude/ \
  --exclude-glob node_modules/ \
  --exclude-glob tests/ \
  --exclude-glob dist/ \
  --exclude-glob storage/ \
  --exclude-glob public/storage \
  --exclude-glob public/hot \
  --exclude-glob .env \
  --exclude-glob .env.backup \
  --exclude-glob '.DS_Store' \
  --exclude-glob database/database.sqlite \
  --exclude-glob bootstrap/cache/config.php \
  --exclude-glob bootstrap/cache/routes-v7.php \
  --exclude-glob .phpunit.result.cache \
  ./ ./
bye
LFTP
unset LFTP_PASSWORD

echo
echo "✓ Fichiers envoyés."
echo "  À lancer maintenant dans le Terminal cPanel :"
echo "    cd /home/onitssn/eeht && php artisan migrate --force && php artisan optimize"
