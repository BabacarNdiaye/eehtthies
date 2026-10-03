<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\DataResetService;
use App\Support\DataResetCatalog;
use App\Support\DataResetException;
use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Réinitialisation sélective des données, réservée au super-administrateur (voir DataResetCatalog). */
class DataResetController extends Controller
{
    public function index(Request $request, DataResetService $service): Response
    {
        return Inertia::render('Admin/Settings/Reset', [
            'groups' => $service->overview($request->user()),
            'confirmationWord' => DataResetCatalog::CONFIRMATION_WORD,
        ]);
    }

    public function store(Request $request, DataResetService $service): RedirectResponse
    {
        $data = $request->validate([
            'categories' => ['required', 'array', 'min:1'],
            'categories.*' => ['string', Rule::in(DataResetCatalog::keys())],
            'restore' => ['nullable', 'array'],
            'restore.*' => ['string', Rule::in(DataResetCatalog::restorableKeys())],
            'confirmation' => ['required', 'string', function (string $attribute, mixed $value, Closure $fail) {
                if (mb_strtoupper(trim($value)) !== DataResetCatalog::CONFIRMATION_WORD) {
                    $fail('Saisissez exactement le mot « '.DataResetCatalog::CONFIRMATION_WORD.' » pour confirmer.');
                }
            }],
            'password' => ['required', 'current_password'],
        ], [
            'categories.required' => 'Choisissez au moins une catégorie à réinitialiser.',
            'categories.min' => 'Choisissez au moins une catégorie à réinitialiser.',
            'categories.*.in' => 'Catégorie inconnue.',
            'confirmation.required' => 'Saisissez le mot de confirmation.',
            'password.required' => 'Saisissez votre mot de passe.',
            'password.current_password' => 'Le mot de passe est incorrect.',
        ]);

        try {
            $result = $service->run(
                array_values(array_unique($data['categories'])),
                $data['restore'] ?? [],
                $request->user(),
            );
        } catch (DataResetException $e) {
            return back()->with('error', $e->getMessage());
        }

        return redirect()->route('admin.settings.reset.index')->with('success', $this->summary($result));
    }

    private function summary(array $result): string
    {
        $s = fn (int $count): string => $count > 1 ? 's' : '';
        $categories = count($result['categories']);

        $message = sprintf(
            'Réinitialisation terminée : %d catégorie%s traitée%s — %d enregistrement%s et %d fichier%s supprimés. Une sauvegarde de la base a été créée juste avant (Administration › Sauvegardes).',
            $categories, $s($categories), $s($categories), $result['rows'], $s($result['rows']), $result['files'], $s($result['files']),
        );

        if ($result['warnings'] !== []) {
            $message .= ' Attention : '.implode(' ', $result['warnings']);
        }

        return $message;
    }
}
