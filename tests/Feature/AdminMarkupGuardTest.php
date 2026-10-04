<?php

namespace Tests\Feature;

use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use Tests\TestCase;

/**
 * Garde-fous sur le balisage de l'administration. Les fichiers React sont lus comme du texte : un bouton ou un lien
 * réduit à une icône (crayon, corbeille, œil…) sans nom accessible est muet pour un lecteur d'écran et ne dit rien
 * au toucher ; Lighthouse en comptait 77 avant la refonte. Les composants IconButton et IconLink rendent le nom
 * obligatoire (TypeScript refuse la compilation sans `label`) : ce test attrape les retours en arrière, c'est-à-dire
 * un <button> ou <Link> écrit à la main avec une icône pour seul contenu.
 */
class AdminMarkupGuardTest extends TestCase
{
    /** @return array<string, string> chemin relatif à resources/js => contenu */
    private function adminSources(): array
    {
        $sources = [];

        foreach (['Pages/Admin', 'Components/Admin'] as $directory) {
            $files = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator(resource_path("js/{$directory}"), RecursiveDirectoryIterator::SKIP_DOTS)
            );

            foreach ($files as $file) {
                if ($file->getExtension() === 'tsx') {
                    $sources[substr($file->getPathname(), strlen(resource_path('js/')))] = file_get_contents($file->getPathname());
                }
            }
        }

        ksort($sources);

        return $sources;
    }

    public function test_the_guard_reads_the_admin_sources(): void
    {
        $sources = $this->adminSources();

        $this->assertGreaterThan(100, count($sources), 'Moins de 100 fichiers lus : le garde-fou ne regarde plus au bon endroit.');
        $this->assertArrayHasKey('Pages/Admin/Students/Index.tsx', $sources);
        $this->assertArrayHasKey('Components/Admin/IconButton.tsx', $sources);
    }

    public function test_icon_only_controls_have_an_accessible_name(): void
    {
        $violations = [];

        foreach ($this->adminSources() as $path => $source) {
            preg_match_all(
                '/<(button|Link|a)\b((?:[^<>]|=>)*?)>\s*<([A-Z][A-Za-z0-9]*)\b(?:[^<>]|=>)*?\/>\s*<\/\1>/s',
                $source,
                $matches,
                PREG_SET_ORDER | PREG_OFFSET_CAPTURE
            );

            foreach ($matches as $match) {
                if (preg_match('/aria-label\s*=|title\s*=/', $match[2][0])) {
                    continue;
                }

                $line = substr_count(substr($source, 0, $match[0][1]), "\n") + 1;
                $violations[] = "{$path}:{$line} : <{$match[1][0]}> réduit à l'icône <{$match[3][0]}> sans aria-label ni title (utiliser IconButton ou IconLink)";
            }
        }

        $this->assertSame([], $violations, "Contrôles-icônes sans nom :\n".implode("\n", $violations));
    }

    public function test_every_table_is_a_list_of_cards_or_an_explicit_scrolling_matrix(): void
    {
        $violations = [];

        foreach ($this->adminSources() as $path => $source) {
            preg_match_all('/<table\b([^>]*)>(.*?)<\/table>/s', $source, $tables, PREG_SET_ORDER | PREG_OFFSET_CAPTURE);

            foreach ($tables as $table) {
                $explicitScroll = str_contains($table[1][0], 'data-table="scroll"');
                $hasHeader = str_contains($table[2][0], '<thead');

                if ($explicitScroll || $hasHeader) {
                    continue;
                }

                $line = substr_count(substr($source, 0, $table[0][1]), "\n") + 1;
                $violations[] = "{$path}:{$line} : <table> sans <thead> ni data-table=\"scroll\" : sur téléphone il ne deviendrait pas une carte et ne serait pas lisible";
            }
        }

        $this->assertSame([], $violations, "Tableaux ni en cartes ni en défilement :\n".implode("\n", $violations));
    }

    public function test_no_native_browser_dialog_is_left_in_the_admin(): void
    {
        $violations = [];

        foreach ($this->adminSources() as $path => $source) {
            // `confirmAction(` et `alertAction(` n'ont pas la même racine : seul l'appel natif est repéré.
            if (preg_match_all('/(?<![\w.])(?:window\.)?(?:confirm|alert|prompt)\(/', $source, $matches, PREG_OFFSET_CAPTURE)) {
                foreach ($matches[0] as $match) {
                    $line = substr_count(substr($source, 0, $match[1]), "\n") + 1;
                    $violations[] = "{$path}:{$line} : {$match[0]} natif (utiliser confirmAction ou alertAction de @/lib/confirm)";
                }
            }
        }

        $this->assertSame([], $violations, "Boîtes natives du navigateur :\n".implode("\n", $violations));
    }

    public function test_the_guard_does_catch_an_unnamed_icon_button(): void
    {
        $pattern = '/<(button|Link|a)\b((?:[^<>]|=>)*?)>\s*<([A-Z][A-Za-z0-9]*)\b(?:[^<>]|=>)*?\/>\s*<\/\1>/s';

        $unnamed = '<button onClick={() => destroy(row)} className="p-2"><Trash2 className="h-4 w-4" /></button>';
        $named = '<button onClick={() => destroy(row)} aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button>';
        $withText = '<button onClick={save}><Save className="h-4 w-4" /> Enregistrer</button>';

        $this->assertSame(1, preg_match($pattern, $unnamed, $found));
        $this->assertSame(0, preg_match('/aria-label\s*=|title\s*=/', $found[2]), 'Le bouton sans nom doit être signalé.');

        $this->assertSame(1, preg_match($pattern, $named, $found));
        $this->assertSame(1, preg_match('/aria-label\s*=|title\s*=/', $found[2]), "L'attribut innocente le bouton nommé.");

        $this->assertSame(0, preg_match($pattern, $withText), 'Une icône accompagnée de texte a déjà un nom.');
    }
}
