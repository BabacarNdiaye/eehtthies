# Déploiement sur un hébergement mutualisé (cPanel)

Ce guide met en ligne l'application EEHT de Thiès sur un hébergement cPanel
(avec ou sans accès FTP). Comptez environ 30 minutes la première fois.

## 0. Prérequis chez l'hébergeur

Vérifiez dans **cPanel › Sélectionner une version de PHP** (ou « MultiPHP ») :

| Élément | Exigence |
|---|---|
| PHP | **8.3 minimum** (8.4 conseillé) |
| Extensions | `bcmath` **ou** `gmp` (**obligatoire**, sinon l'envoi de messages plante à cause des notifications push), `pdo_mysql`, `mbstring`, `openssl`, `gd`, `zip`, `fileinfo`, `exif`, `intl`, `xml`, `curl` |
| `memory_limit` | 256M ou plus (génération des bulletins PDF et des exports Excel) |
| `upload_max_filesize` / `post_max_size` | 20M ou plus |
| Base de données | MySQL 8 ou MariaDB 10.6+ |
| Terminal | **cPanel › Terminal** ou accès SSH, fortement recommandé (sinon voir l'annexe) |

## 1. Construire l'archive (sur votre poste)

```bash
scripts/build-deploy-package.sh
```

Le script compile le front (Vite), installe les dépendances PHP de production
et produit `dist/eeht-deploy-AAAAMMJJ-HHMM.zip` (environ 100 Mo). L'archive ne
contient ni `.env`, ni base de données, ni `node_modules`.

## 2. Créer la base MySQL

**cPanel › Bases de données MySQL** :
1. Créez une base, par exemple `moncompte_eeht`.
2. Créez un utilisateur avec un mot de passe fort.
3. Ajoutez l'utilisateur à la base avec **TOUS LES PRIVILÈGES**.

Notez les trois valeurs : nom de la base, utilisateur, mot de passe.

## 3. Téléverser et décompresser

**cPanel › Gestionnaire de fichiers**, dans votre dossier personnel
(`/home/moncompte`, **pas** dans `public_html`) :
1. Téléversez le `.zip`.
2. Clic droit › **Extraire**. Vous obtenez `/home/moncompte/eeht/`.

> Le code doit rester **hors** de `public_html`. Seul le dossier
> `eeht/public` doit être visible depuis le web, sinon le `.env` (mots de
> passe) serait téléchargeable.

## 4. Faire pointer le domaine sur `eeht/public`

Choisissez **une** des options :

- **Option A (recommandée)** : **cPanel › Domaines**, modifiez la
  « Racine du document » du domaine en `eeht/public`.
- **Option B** : si la racine du domaine principal n'est pas modifiable,
  remplacez `public_html` par un lien symbolique (Terminal) :
  ```bash
  mv ~/public_html ~/public_html.ancien
  ln -s ~/eeht/public ~/public_html
  ```

Activez ensuite le certificat HTTPS gratuit : **cPanel › SSL/TLS Status ›
Run AutoSSL**.

## 5. Configurer le `.env`

Dans `eeht/`, copiez `.env.production.example` en `.env`, puis éditez-le et
remplissez toutes les lignes marquées **« À REMPLIR »** :

- `APP_URL` : l'adresse exacte du site, en `https://`
- `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` : les valeurs de l'étape 2
- `MAIL_USERNAME`, `MAIL_PASSWORD` : identifiants SMTP (Brevo ou autre)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` : **les mêmes** que sur le poste
  local. Si c'est une première mise en ligne sans clés, générez-les une fois
  avec `php artisan webpush:vapid`
- `KIOSK_TOKEN` : une longue valeur aléatoire (borne de pointage)

Vérifiez bien que `APP_ENV=production` et `APP_DEBUG=false`.

**Assistant IA (facultatif)** : pour activer les suggestions de réponses,
résumés, corrections et traductions dans EEHT Connect, renseignez
`ANTHROPIC_API_KEY` (clé créée sur https://platform.claude.com, facturée à
l'usage). Sans clé, l'assistant est simplement masqué.

## 6. Initialiser l'application (Terminal cPanel)

```bash
cd ~/eeht
php artisan key:generate --force     # une seule fois, à la première mise en ligne
php artisan migrate --force
php artisan storage:link
php artisan optimize
chmod -R 775 storage bootstrap/cache
```

> Si `php` ne pointe pas sur la bonne version, utilisez le chemin complet
> indiqué par l'hébergeur, par exemple `/opt/cpanel/ea-php84/root/usr/bin/php`
> ou `/usr/local/bin/ea-php84`.

### Données initiales : choisissez un cas

**Cas 1 : reprendre les données réelles du poste local (SQLite)**

Sur le poste local :
```bash
php artisan app:export-data-for-production
```
Puis importez `production-data.sql` dans la base via **cPanel › phpMyAdmin ›
Importer**, **après** le `migrate` ci-dessus. Les comptes et mots de passe
existants sont conservés.

**Cas 2 : démarrer avec une base vierge**

```bash
php artisan db:seed --class=RolesAndPermissionsSeeder --force
php artisan db:seed --class=FormationsCatalogSeeder --force
php artisan db:seed --class=FaqCatalogSeeder --force
php artisan db:seed --class=AccountingSeeder --force
```
Ceci crée les rôles, le catalogue des formations, la FAQ, les journaux
comptables, et le compte **`admin@eeht-thies.sn` / `password`**.
**Connectez-vous et changez ce mot de passe immédiatement.**

N'exécutez **pas** `php artisan db:seed` sans `--class` en production : il
charge aussi des données de démonstration (classes, élèves, fournisseurs
fictifs).

## 7. Tâches planifiées (cron)

**cPanel › Tâches Cron**, ajoutez ces deux lignes (adaptez le chemin de PHP
et votre identifiant) :

```
* * * * *  cd /home/moncompte/eeht && php artisan schedule:run >> /dev/null 2>&1
* * * * *  cd /home/moncompte/eeht && php artisan queue:work --stop-when-empty --max-time=55 >> /dev/null 2>&1
```

- La première déclenche les sauvegardes quotidiennes, les rappels de
  factures impayées, les alertes d'absence et les synthèses, ainsi que les
  rappels automatiques d'EEHT Connect (examens J-7 et veille, changements
  d'emploi du temps) et ses notifications push différées.
- La seconde traite la file d'attente : **sans elle, les e-mails ne partent
  pas.** Un mutualisé n'autorise pas de processus permanent, d'où
  l'exécution chaque minute.

## 8. Vérifications après mise en ligne

- [ ] La page d'accueil s'affiche en `https://`
- [ ] Connexion admin, puis changement du mot de passe
- [ ] « Mot de passe oublié » : l'e-mail arrive bien (SMTP et cron de la file)
- [ ] Téléverser une image (galerie ou actualité), puis vérifier qu'elle s'affiche (`storage:link`)
- [ ] Générer un bulletin PDF
- [ ] Envoyer un message interne, sans erreur 500 (extension `bcmath`/`gmp`)
- [ ] Le lendemain : **Admin › Sauvegardes**, vérifier qu'une sauvegarde de 02:00 existe

## Déploiement automatique (GitHub Actions + FTP)

Au lieu de construire et téléverser l'archive à la main, GitHub peut le faire
à chaque mise à jour de la branche `main` (workflow
`.github/workflows/deploy.yml`). Il lance les tests, compile le site, puis
envoie **uniquement les fichiers modifiés** par FTP. Si un test échoue, rien
n'est envoyé.

**Mise en place (une seule fois)**

1. **cPanel › Comptes FTP** : créez un compte FTP dont le dossier racine est
   votre dossier personnel (`/home/moncompte`), ou utilisez le compte FTP
   principal. Notez le serveur (souvent `ftp.votre-domaine.sn`),
   l'identifiant et le mot de passe.
2. **GitHub › dépôt › Settings › Secrets and variables › Actions ›
   New repository secret**, créez :

   | Secret | Valeur |
   |---|---|
   | `FTP_SERVER` | ex. `ftp.eeht-thies.sn` |
   | `FTP_USERNAME` | l'identifiant FTP |
   | `FTP_PASSWORD` | le mot de passe FTP |
   | `FTP_SERVER_DIR` | le dossier de l'application vu depuis le FTP, terminé par `/` : `eeht/` (jamais `public_html/`) |
   | `FTP_PROTOCOL` | *(facultatif)* `ftps` par défaut ; mettez `ftp` si l'hébergeur refuse le chiffrement |

3. Faites les étapes 2, 4, 5, 6 et 7 de ce guide (base MySQL, domaine sur
   `eeht/public`, `.env`, initialisation, cron). Le premier envoi automatique
   remplace l'étape 3 : lancez-le depuis **GitHub › Actions › Déploiement ›
   Run workflow**. Il est long la première fois (environ 30 000 fichiers) ;
   les suivants ne transfèrent que les changements.

**À chaque mise à jour** : dès que des changements arrivent sur `main`, les
fichiers du site sont mis à jour tout seuls. Une fois l'envoi terminé (coche
verte dans GitHub › Actions), lancez dans le Terminal cPanel — pour appliquer
les éventuelles migrations et rafraîchir le cache de configuration et de
routes (sinon les nouvelles pages peuvent rester introuvables jusqu'à une
heure) :

```bash
cd ~/eeht && php artisan migrate --force && php artisan optimize
```

Le `.env`, les fichiers téléversés (`storage/`) et la base de données ne sont
jamais touchés par l'envoi automatique.

## Mettre à jour le site plus tard (sans GitHub Actions)

1. Sur le poste : `scripts/build-deploy-package.sh`
2. Sur le serveur : `php artisan down`
3. Extraire la nouvelle archive par-dessus `eeht/`. **Ne supprimez pas**
   `.env` ni `storage/` : ils contiennent la configuration et les fichiers
   téléversés, et l'archive ne les écrase pas.
4. Puis :
   ```bash
   php artisan migrate --force
   php artisan optimize
   php artisan up
   ```

## Annexe : sans Terminal ni SSH

Certaines offres n'ont ni Terminal ni SSH. Les commandes `php artisan` de
l'étape 6 peuvent alors être lancées une par une en **tâche cron ponctuelle**
(programmée à la minute suivante, puis supprimée), par exemple :

```
cd /home/moncompte/eeht && php artisan migrate --force >> storage/logs/deploy.log 2>&1
```

Consultez ensuite `storage/logs/deploy.log` dans le Gestionnaire de fichiers.
Pour `key:generate`, générez plutôt la clé en local (`php artisan key:generate
--show`) et collez-la dans `APP_KEY` du `.env`.

## Dépannage

| Symptôme | Cause probable |
|---|---|
| Erreur 500 blanche | Consultez `eeht/storage/logs/laravel-AAAA-MM-JJ.log` |
| « No application encryption key » | `APP_KEY` vide dans `.env` |
| 500 à l'envoi d'un message (« GMP or BCMath ») | Activer l'extension `bcmath` dans le sélecteur PHP |
| Images cassées | `php artisan storage:link` non exécuté |
| Styles absents, page brute | Le domaine ne pointe pas sur `eeht/public` |
| E-mails jamais reçus | Cron `queue:work` absent, ou identifiants SMTP erronés |
| « Permission denied » dans `storage` | `chmod -R 775 storage bootstrap/cache` |
