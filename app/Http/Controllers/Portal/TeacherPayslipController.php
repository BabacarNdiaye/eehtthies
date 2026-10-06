<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\PayrollLine;
use App\Models\Teacher;
use App\Support\Payslip;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/** « Ma paie » de l'enseignant : ses bulletins une fois le salaire versé, jamais ceux d'un autre. */
class TeacherPayslipController extends Controller
{
    public function index(Request $request): Response
    {
        $lines = PayrollLine::whereIn('teacher_id', $this->teacherIds($request))->whereNotNull('teacher_salary_payment_id')->get();

        return Inertia::render('Portal/Teacher/Payslips', [
            'payslips' => Payslip::paidSummaries($lines),
        ]);
    }

    public function download(Request $request, PayrollLine $payrollLine)
    {
        abort_unless($payrollLine->teacher_id && $this->teacherIds($request)->contains($payrollLine->teacher_id) && $payrollLine->is_paid, 404);

        return Payslip::pdf($payrollLine)->stream(Payslip::filename($payrollLine));
    }

    /** @return Collection<int, int> les fiches enseignant rattachées au compte connecté */
    private function teacherIds(Request $request): Collection
    {
        return Teacher::where('user_id', $request->user()->id)->pluck('id');
    }
}
