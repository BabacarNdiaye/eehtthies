<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Council;
use App\Services\Council\FamilyCouncilService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * DIR-07 : prévenir les familles d'un conseil clôturé, à la demande (quand l'envoi automatique est désactivé, ou pour
 * les familles ajoutées depuis). Une famille déjà prévenue ne l'est jamais deux fois.
 */
class CouncilFamilyNoticeController extends Controller
{
    public function store(Request $request, Council $council, FamilyCouncilService $families)
    {
        Gate::authorize('notifyFamilies', $council);

        $sent = $families->notify($council, $request->user());

        return back()->with('success', $sent > 0
            ? "{$sent} famille(s) prévenue(s) : la notification annonce que les résultats sont disponibles dans leur espace."
            : 'Aucune famille à prévenir : toutes l’ont déjà été, ou aucune n’a d’adresse ni de compte.');
    }
}
