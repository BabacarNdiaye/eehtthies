<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PayrollLine;
use App\Support\Payslip;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * « Ma paie » du personnel : chacun retrouve ses propres bulletins une fois le salaire versé. Libre-service, sans permission
 * (comme le changement de mot de passe) : c'est le propriétaire de la ligne qui est vérifié, jamais un droit général.
 */
class MyPayslipController extends Controller
{
    public function index(Request $request): Response
    {
        $lines = PayrollLine::where('user_id', $request->user()->id)->whereNotNull('salary_payment_id')->get();

        return Inertia::render('Admin/MyPayslips/Index', [
            'payslips' => Payslip::paidSummaries($lines),
        ]);
    }

    public function download(Request $request, PayrollLine $payrollLine)
    {
        // 404 plutôt que 403 : on ne confirme pas l'existence du bulletin d'un autre.
        abort_unless($payrollLine->user_id === $request->user()->id && $payrollLine->is_paid, 404);

        return Payslip::pdf($payrollLine)->stream(Payslip::filename($payrollLine));
    }
}
