<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>Diagnostic des photos</title>
    <style>
        body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; background: #f6f7f9; color: #0b1728; margin: 0; padding: 24px 16px; }
        main { max-width: 820px; margin: 0 auto; }
        h1 { font-size: 24px; margin: 0 0 4px; }
        h2 { font-size: 16px; margin: 28px 0 8px; text-transform: uppercase; letter-spacing: .06em; color: #5c697e; }
        p.lead { color: #5c697e; margin: 0 0 20px; }
        .card { background: #fff; border: 1px solid #e8ebf0; border-radius: 14px; padding: 16px 18px; margin-bottom: 12px; }
        .v { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 12px; margin-bottom: 8px; font-size: 15px; line-height: 1.45; }
        .v b { flex: none; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; padding: 2px 8px; border-radius: 99px; margin-top: 2px; }
        .ok { background: #ecfdf5; } .ok b { background: #059669; color: #fff; }
        .warn { background: #fffbeb; } .warn b { background: #d97706; color: #fff; }
        .bad { background: #fef2f2; } .bad b { background: #dc2626; color: #fff; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        td { padding: 6px 0; border-bottom: 1px solid #f0f2f5; vertical-align: top; }
        td:first-child { color: #5c697e; width: 38%; }
        code { background: #f0f2f5; padding: 1px 6px; border-radius: 6px; font-size: 13px; word-break: break-all; }
        img.test { width: 48px; height: 48px; border: 1px solid #e8ebf0; border-radius: 8px; vertical-align: middle; background: #fff; }
        ul { margin: 6px 0 0; padding-left: 18px; font-size: 14px; }
        .muted { color: #5c697e; font-size: 13px; }
    </style>
</head>
<body>
<main>
    <h1>Diagnostic des photos</h1>
    <p class="lead">Pourquoi les photos ne s'affichent pas ? Cette page contrôle le dossier, le raccourci et les fichiers. Réservée à la direction.</p>

    <h2>Résultat</h2>
    @forelse ($verdicts as [$level, $text])
        <div class="v {{ $level }}"><b>{{ ['ok' => 'OK', 'warn' => 'À voir', 'bad' => 'Problème'][$level] }}</b><span>{{ $text }}</span></div>
    @empty
        <div class="v ok"><b>OK</b><span>Rien d'anormal détecté.</span></div>
    @endforelse

    <h2>Test d'affichage</h2>
    <div class="card">
        <p style="margin:0 0 8px">Voyez-vous un petit carré vert ici ? <img class="test" src="{{ $testUrl }}?t={{ time() }}" alt="Carré vert de test"></p>
        <p class="muted" style="margin:0">Oui : l'adresse <code>/storage/…</code> fonctionne, les photos présentes sur le disque s'afficheront. Non (image cassée) : l'adresse <code>{{ $testUrl }}</code> est bloquée par l'hébergement ; envoyez-moi une capture de cette page.</p>
    </div>

    <h2>Dossier des fichiers publics</h2>
    <div class="card">
        <table>
            <tr><td>Chemin</td><td><code>{{ $root }}</code></td></tr>
            <tr><td>Existe</td><td>{{ $rootExists ? 'oui' : 'NON' }}</td></tr>
            <tr><td>Fichiers</td><td>{{ number_format($files, 0, ',', ' ') }} ({{ $megabytes }} Mo)</td></tr>
            <tr><td>Adresse du site (APP_URL)</td><td><code>{{ $appUrl }}</code></td></tr>
        </table>
    </div>

    <h2>Raccourci public/storage</h2>
    <div class="card">
        <table>
            <tr><td>Chemin</td><td><code>{{ $link['path'] }}</code></td></tr>
            <tr><td>Présent</td><td>{{ $link['exists'] ? 'oui' : 'non' }}{{ $link['is_link'] ? ' (raccourci)' : ($link['exists'] ? ' (dossier ordinaire)' : '') }}</td></tr>
            @if ($link['target'])<tr><td>Pointe vers</td><td><code>{{ $link['target'] }}</code></td></tr>@endif
            <tr><td>Fonctionnel</td><td>{{ $link['works'] ? 'oui' : 'non' }}</td></tr>
            <tr><td>Raccourcis permis par l'hébergeur</td><td>{{ $link['can_symlink'] ? 'oui' : 'non (fonction symlink désactivée)' }}</td></tr>
        </table>
    </div>

    @foreach ($groups as $label => $group)
        <h2>Photos : {{ mb_strtolower($label) }}</h2>
        <div class="card">
            <table>
                <tr><td>Enregistrées dans la base</td><td>{{ $group['total'] }}</td></tr>
                <tr><td>Fichier introuvable sur le disque</td><td>{{ $group['missing'] }}</td></tr>
            </table>
            @if ($group['samples'])
                <ul>
                    @foreach ($group['samples'] as $sample)
                        <li><code>{{ $sample['path'] }}</code> : {{ $sample['exists'] ? 'présent' : 'INTROUVABLE' }}</li>
                    @endforeach
                </ul>
            @endif
        </div>
    @endforeach

    <p class="muted" style="margin-top:24px">Cette page écrit une image de test dans <code>storage/app/public/diagnostic/</code>. Elle ne modifie rien d'autre.</p>
</main>
</body>
</html>
