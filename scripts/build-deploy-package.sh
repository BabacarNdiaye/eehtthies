#!/usr/bin/env bash
# =============================================================================
# Construit une archive prête à téléverser sur un hébergement mutualisé
# (cPanel / FTP) : dépendances PHP de production, assets front compilés,
# sans node_modules, tests, .env ni base de données locale.
#
# Usage : scripts/build-deploy-package.sh [dossier-de-sortie]
# Résultat : <dossier-de-sortie>/eeht-deploy-AAAAMMJJ-HHMM.zip
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${1:-$ROOT/dist}"
mkdir -p "$OUT_DIR"
OUT_DIR="$(cd "$OUT_DIR" && pwd)"
STAMP="$(date +%Y%m%d-%H%M)"

cd "$ROOT"

# Outils nécessaires (fonctionne sous Linux et macOS).
for tool in git php composer npm zip tar; do
    command -v "$tool" >/dev/null || { echo "✗ « $tool » est introuvable : installez-le puis relancez." >&2; exit 1; }
done
php -r 'exit(version_compare(PHP_VERSION, "8.4.1", ">=") ? 0 : 1);' || {
    echo "✗ PHP $(php -r 'echo PHP_VERSION;') détecté : PHP 8.4.1 minimum est requis (Symfony 8.1)." >&2
    exit 1
}

# Ce script n'emballe que les fichiers que git suit : un fichier nouveau, pas encore ajouté, manquerait dans l'archive et le
# site planterait dès qu'une route, une migration ou une classe y renvoie. On refuse donc de construire plutôt que de livrer
# une archive incomplète. Un dossier qui est lui-même un dépôt git (entrée terminée par « / ») n'est pas concerné.
UNTRACKED="$(git ls-files --others --exclude-standard | grep -v '/$' || true)"
if [ -n "$UNTRACKED" ]; then
    echo "✗ Ces fichiers ne sont pas suivis par git, ils manqueraient dans l'archive :" >&2
    echo "$UNTRACKED" | sed 's/^/    /' >&2
    echo "  Ajoutez-les (git add) ou commitez-les, puis relancez." >&2
    exit 1
fi

STAGE="$(mktemp -d)"
PKG="$STAGE/eeht"

echo "→ Compilation des assets front (Vite)…"
npm install --ignore-scripts --no-audit --no-fund
npm run build

echo "→ Copie des fichiers de l'application…"
mkdir -p "$PKG"
# git ls-files : uniquement les fichiers suivis (exclut .env, node_modules,
# vendor, base SQLite locale, fichiers d'éditeur…). Copie via tar pour
# fonctionner aussi sous macOS (pas de `cp --parents`).
git ls-files -z | tar --null -T - -cf - | tar -xf - -C "$PKG"
cp -r public/build "$PKG/public/build"

# Fichiers inutiles en production
rm -rf "$PKG/tests" "$PKG/.claude" "$PKG/.github" "$PKG/node_modules" \
       "$PKG/phpunit.xml"

echo "→ Installation des dépendances PHP de production…"
composer install --working-dir="$PKG" --no-dev --optimize-autoloader \
    --no-interaction --no-progress --no-scripts
# Si Composer a dû cloner certains paquets depuis git (téléchargement dist
# indisponible), leur historique .git gonflerait inutilement l'archive.
find "$PKG/vendor" -type d -name .git -prune -exec rm -rf {} +
# package:discover est normalement lancé par les scripts composer ; on le
# rejoue ici sans .env (le cache généré ne dépend pas de la configuration).
(cd "$PKG" && APP_KEY=base64:$(head -c 32 /dev/urandom | base64) \
    php artisan package:discover --ansi >/dev/null)
rm -f "$PKG/bootstrap/cache/config.php" "$PKG/bootstrap/cache/routes-v7.php"

# Dossiers d'écriture attendus par Laravel (vides)
mkdir -p "$PKG/storage/app/public" "$PKG/storage/app/private" \
         "$PKG/storage/framework/cache/data" "$PKG/storage/framework/sessions" \
         "$PKG/storage/framework/views" "$PKG/storage/logs"
find "$PKG/storage" -type f ! -name '.gitignore' -delete

mkdir -p "$OUT_DIR"
ZIP="$OUT_DIR/eeht-deploy-$STAMP.zip"
(cd "$STAGE" && zip -qr "$ZIP" eeht)
rm -rf "$STAGE"

echo "✓ Archive prête : $ZIP ($(du -h "$ZIP" | cut -f1))"
echo "  Suivez ensuite DEPLOIEMENT.md."
