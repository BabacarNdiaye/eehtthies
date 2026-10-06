<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\MonthlyInvoiceGenerator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Réglages des paiements : jour d'échéance des mensualités, rappel avant échéance et génération automatique. */
class FinanceSettingsController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('Admin/Finance/Settings', [
            'settings' => [
                'due_day' => MonthlyInvoiceGenerator::dueDay(),
                'remind_before_due' => Setting::flag('finance_remind_before_due'),
                'auto_generate_monthly' => Setting::flag('finance_auto_generate_monthly'),
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'due_day' => ['required', 'integer', 'between:1,28'],
            'remind_before_due' => ['sometimes', 'boolean'],
            'auto_generate_monthly' => ['sometimes', 'boolean'],
        ]);

        Setting::set('finance_due_day', $data['due_day'], 'finance');

        // Les deux options sont désactivées par défaut ; un champ absent de la requête ne les modifie pas.
        foreach (['remind_before_due' => 'finance_remind_before_due', 'auto_generate_monthly' => 'finance_auto_generate_monthly'] as $field => $key) {
            if ($request->has($field)) {
                Setting::set($key, $request->boolean($field) ? '1' : '0', 'finance');
            }
        }

        return back()->with('success', 'Réglages des paiements enregistrés.');
    }
}
