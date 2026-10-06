// Audit du menu de l'administration, lancé par AdminMenuCoverageTest.
//
// Le menu vit dans resources/js/lib/adminNav.ts : ses fonctions `active` ne se lisent pas avec une expression
// régulière, il faut les exécuter. Node (≥ 22.18) sait charger le TypeScript tel quel ; ce script importe donc le
// vrai fichier, le confronte à la liste des routes et aux permissions des rôles que le test lui transmet, et
// écrit un rapport JSON sur la sortie standard.
//
// Usage : node --no-warnings admin-nav-audit.mjs <racine du projet> <fichier d'entrée JSON>
// Entrée : { routes: [{name, uri, methods, middleware}], roles: {rôle: [permissions]}, crumbs: [noms de route] }
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [, , root, inputFile] = process.argv;
const nav = await import(pathToFileURL(path.join(root, 'resources/js/lib/adminNav.ts')).href);
const { navGroups, utilityPages, visibleGroups, crumbsFor } = nav;
const input = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

const problems = [];
const entries = navGroups.flatMap((group) => group.items.map((item) => ({ item, group })));
const iconName = (icon) => icon.displayName ?? icon.name ?? '?';
const duplicates = (values) => values.filter((value, index) => values.indexOf(value) !== index);

// 1. Adresses, libellés et icônes : chacun se reconnaît d'un coup d'œil, dans la barre latérale comme dans la palette.
for (const href of new Set(duplicates(entries.map(({ item }) => item.href)))) problems.push(`La rubrique « ${href} » figure deux fois dans le menu.`);
for (const label of new Set(duplicates(entries.map(({ item }) => item.label)))) problems.push(`Le libellé « ${label} » est porté par deux rubriques.`);

const labelled = navGroups.filter((group) => group.label);
for (const label of new Set(duplicates(labelled.map((group) => group.label)))) problems.push(`Le groupe « ${label} » figure deux fois.`);

for (const group of labelled) {
    if (!group.icon) problems.push(`Le groupe « ${group.label} » n'a pas d'icône (sa tuile du menu mobile serait vide).`);
    if (group.items.length === 0) problems.push(`Le groupe « ${group.label} » est vide.`);

    const used = group.items.map((item) => item.icon);
    for (const icon of new Set(duplicates(used))) {
        const labels = group.items.filter((item) => item.icon === icon).map((item) => item.label);
        problems.push(`Dans « ${group.label} », l'icône ${iconName(icon)} sert à ${labels.join(' et ')}.`);
    }
}

const groupIcons = labelled.map((group) => group.icon).filter(Boolean);
for (const icon of new Set(duplicates(groupIcons))) {
    const labels = labelled.filter((group) => group.icon === icon).map((group) => group.label);
    problems.push(`L'icône ${iconName(icon)} sert à plusieurs groupes : ${labels.join(', ')}.`);
}

// 2. Chaque rubrique s'allume sur sa propre page.
for (const { item } of entries) {
    if (!item.active(item.href)) problems.push(`« ${item.label} » ne s'allume pas sur sa propre page (${item.href}).`);
}

// 3. Chaque page d'administration appartient à une et une seule rubrique : sans cela, pas de surlignage ni de fil
// d'Ariane (aucune rubrique) ou une rubrique voisine s'allume à tort (plusieurs). Les téléchargements, les
// réponses JSON et les redirections ne sont pas des pages.
const notPages = /\.(export|import|template|csv|pdf|download|search)\b/;
const jsonEndpoints = new Set(['admin.cashier.students']);
const pages = input.routes.filter(
    (route) =>
        route.name &&
        /^admin\./.test(route.name) &&
        route.name !== 'admin.' &&
        route.methods.includes('GET') &&
        !route.uri.includes('{') &&
        !notPages.test(route.name) &&
        !jsonEndpoints.has(route.name),
);

for (const page of pages) {
    const owners = [...entries.map(({ item, group }) => ({ item, where: group.label ?? 'racine' })), ...utilityPages.map((item) => ({ item, where: 'pages utilitaires' }))].filter(({ item }) => item.active(page.name));

    if (owners.length === 0) problems.push(`La page ${page.name} (/${page.uri}) n'appartient à aucune rubrique du menu.`);
    if (owners.length > 1) problems.push(`La page ${page.name} est revendiquée par ${owners.map(({ item, where }) => `« ${where} > ${item.label} »`).join(' et ')}.`);
}

// 4. La permission d'une rubrique est celle que sa route exige : plus faible, le menu montrerait un lien qui mène à un
// refus (403) ; plus forte, il cacherait une page à ceux qui ont le droit de s'en servir. Une route sans permission
// (tableau de bord, congés, borne) peut, elle, être réservée par le menu.
const routesByName = Object.fromEntries(input.routes.filter((route) => route.name).map((route) => [route.name, route]));
for (const { item } of entries) {
    const guard = (routesByName[item.href]?.middleware ?? []).find((middleware) => middleware.startsWith('permission:'));
    const required = guard ? guard.slice('permission:'.length) : null;

    if (required && item.permission !== required) {
        problems.push(`« ${item.label} » demande ${item.permission ? `« ${item.permission} »` : 'aucune permission'} mais sa page (${item.href}) exige « ${required} ».`);
    }
}

// 5. Ce que voit chaque rôle (adresses des rubriques, dans l'ordre du menu) et le fil d'Ariane de quelques pages.
const visible = {};
for (const [role, permissions] of Object.entries(input.roles)) {
    visible[role] = visibleGroups(permissions).flatMap((group) => group.items.map((item) => item.href));
}

const all = visibleGroups(input.roles['super-admin'] ?? []);
const crumbs = {};
for (const name of input.crumbs) {
    const found = crumbsFor(all, name);
    crumbs[name] = { group: found.group, item: found.item?.label ?? null, leaf: found.leaf, isSubPage: found.isSubPage };
}

console.log(JSON.stringify({ problems, visible, crumbs, counts: { groups: labelled.length, items: entries.length, pages: pages.length } }));
