# EEHT Thiès — application de gestion et site public

Application web de l'**Élite École Hôtelière et Touristique de Thiès** : site public, candidatures, gestion des élèves,
des enseignants et des classes, notes et bulletins, conseils de classe, frais de scolarité et paiements, comptabilité, paie,
stocks, messagerie EEHT Connect, espaces élève, parent et enseignant.

**Technologies** : Laravel 13, PHP 8.4 minimum, Inertia + React 18 + TypeScript, Vite, Tailwind CSS. Base MySQL 8 en production,
SQLite en local.

## Démarrer en local

Prérequis : PHP 8.4 (extensions `bcmath` ou `gmp`, `gd`, `intl`, `mbstring`, `pdo_sqlite`, `zip`), Composer, Node.js 22.18 ou plus.

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
php artisan db:seed            # contenu de base (rôles, formations, pages du site)
```

Puis, dans deux terminaux :

```bash
php artisan serve              # http://127.0.0.1:8000
npm run dev                    # interface en direct (garder ouvert)
```

Si l'interface ne change pas, vérifiez que `npm run dev` tourne, ou lancez `npm run build` et supprimez `public/hot`.

### Données fictives du conseil de classe (local uniquement)

```bash
php artisan db:seed --class="Tests\Support\LocalDemoSeeder"
```

Crée des classes, des élèves, des notes et un conseil à chaque étape (brouillon, programmé, en séance, clôturé). Comptes
(mot de passe `password`) : `direction@demo.local`, `vieScolaire@demo.local`, `secretariat@demo.local`, `pedagogie@demo.local`,
`prof1@demo.local`. Ce fichier est dans `tests/` : il n'est jamais déployé et refuse de tourner hors `APP_ENV=local`.

## Tests

```bash
php artisan test                                  # toute la suite
php artisan test --filter=CouncilAllFormationsTest
```

Le test du menu d'administration (`AdminMenuCoverageTest`) a besoin de Node.js 22.18 ou plus.

## Déploiement

Voir [DEPLOIEMENT.md](DEPLOIEMENT.md) (hébergement cPanel). `scripts/build-deploy-package.sh` construit l'archive à téléverser
(PHP 8.4 requis sur la machine qui la construit). Modèle de configuration : `.env.production.example`.

Deux tâches cron sont nécessaires en production (chaque minute) : `php artisan schedule:run` (rappels, sauvegardes, caches)
et `php artisan queue:work --stop-when-empty --max-time=55` (envoi des e-mails et notifications).

## Sécurité : à savoir

- Aucun mot de passe commun : chaque accès élève, parent ou enseignant reçoit un mot de passe provisoire aléatoire à changer
  à la première connexion.
- Les documents d'élèves sont sur le disque **privé** (`storage/app/private`) et s'ouvrent par une page qui vérifie les droits.
- Le jeton de la borne de pointage (`KIOSK_TOKEN`) se lit dans `config('eeht.kiosk_token')`, jamais avec `env()` dans le code :
  la configuration en cache ferait sinon refuser tout le monde.
- Ne jamais versionner `.env`, `production-data.sql` (export de données) ni `vendor/` / `node_modules/`.
