<?php

use App\Http\Controllers\Admin\AcademicYearController;
use App\Http\Controllers\Admin\AccountController;
use App\Http\Controllers\Admin\AccountingReportController;
use App\Http\Controllers\Admin\ActivityLogController;
use App\Http\Controllers\Admin\HrController;
use App\Http\Controllers\Admin\LeaveController;
use App\Http\Controllers\Admin\LibraryResourceController;
use App\Http\Controllers\Admin\AttendanceController;
use App\Http\Controllers\Admin\BackupController;
use App\Http\Controllers\Admin\CandidatureController as AdminCandidatureController;
use App\Http\Controllers\Admin\ContactMessageController;
use App\Http\Controllers\Admin\MailController;
use App\Http\Controllers\Admin\AnnouncementController;
use App\Http\Controllers\Admin\ClassDiscussionController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\EventController as AdminEventController;
use App\Http\Controllers\Admin\ExamController;
use App\Http\Controllers\Admin\ExpenseController;
use App\Http\Controllers\Admin\FaqController as AdminFaqController;
use App\Http\Controllers\Admin\FinanceController;
use App\Http\Controllers\Admin\FormationController as AdminFormationController;
use App\Http\Controllers\Admin\GalleryController as AdminGalleryController;
use App\Http\Controllers\Admin\InternshipController;
use App\Http\Controllers\Admin\InternshipOfferController as AdminInternshipOfferController;
use App\Http\Controllers\Admin\InvoiceController;
use App\Http\Controllers\Admin\PaymentPlanController;
use App\Http\Controllers\Admin\SkillAssessmentController;
use App\Http\Controllers\Admin\SkillController;
use App\Http\Controllers\Admin\FormationLevelController;
use App\Http\Controllers\Admin\JobOfferController as AdminJobOfferController;
use App\Http\Controllers\Admin\JournalEntryController;
use App\Http\Controllers\Admin\LessonLogController;
use App\Http\Controllers\Admin\NewsController as AdminNewsController;
use App\Http\Controllers\Admin\NewsArticlePhotoController;
use App\Http\Controllers\Admin\OrgChartController;
use App\Http\Controllers\Admin\PartnerController as AdminPartnerController;
use App\Http\Controllers\Admin\PracticalSessionController;
use App\Http\Controllers\Admin\ProductController;
use App\Http\Controllers\Admin\ReportCardController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\RoomController;
use App\Http\Controllers\Admin\SalaryController;
use App\Http\Controllers\Admin\SchoolClassController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\SliderController as AdminSliderController;
use App\Http\Controllers\Admin\StudentController;
use App\Http\Controllers\Admin\StudentDocumentController;
use App\Http\Controllers\Admin\CertificateController;
use App\Http\Controllers\Admin\ClassPromotionController;
use App\Http\Controllers\Admin\StatisticsController;
use App\Http\Controllers\Admin\SubjectController;
use App\Http\Controllers\Admin\SupplierController;
use App\Http\Controllers\Admin\TeacherController;
use App\Http\Controllers\Admin\TestimonialController as AdminTestimonialController;
use App\Http\Controllers\Admin\TimetableController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Portal\ParentPortalController;
use App\Http\Controllers\Portal\StudentPortalController;
use App\Http\Controllers\Portal\TeacherAttendanceController;
use App\Http\Controllers\Portal\TeacherExamController;
use App\Http\Controllers\Portal\TeacherLeaveController;
use App\Http\Controllers\Portal\TeacherLibraryController;
use App\Http\Controllers\Portal\TeacherSkillController;
use App\Http\Controllers\Portal\TeacherLessonLogController;
use App\Http\Controllers\Portal\TeacherPortalController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\DirectoryController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Site\AlumniController;
use App\Http\Controllers\Site\CandidatureController;
use App\Http\Controllers\Site\EventController;
use App\Http\Controllers\Site\FormationController;
use App\Http\Controllers\Site\DiplomaVerificationController;
use App\Http\Controllers\Site\GalleryController;
use App\Http\Controllers\Site\HomeController;
use App\Http\Controllers\Site\InternshipOfferController;
use App\Http\Controllers\Site\JobOfferController;
use App\Http\Controllers\Site\NewsController;
use App\Http\Controllers\Site\PageController;
use App\Http\Controllers\Site\ReportCardVerificationController;
use App\Http\Controllers\PwaManifestController;
use App\Http\Controllers\PushSubscriptionController;
use App\Support\PermissionRouting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Public site
|--------------------------------------------------------------------------
*/

Route::get('/manifest.webmanifest', PwaManifestController::class)->name('pwa.manifest');

Route::get('/', HomeController::class)->name('home');
Route::get('/a-propos', [PageController::class, 'about'])->name('pages.about');
Route::get('/enseignants', [PageController::class, 'teachers'])->name('pages.teachers');
Route::get('/partenaires', [PageController::class, 'partners'])->name('pages.partners');
Route::get('/temoignages', [PageController::class, 'testimonials'])->name('pages.testimonials');
Route::get('/faq', [PageController::class, 'faq'])->name('pages.faq');
Route::get('/contact', [PageController::class, 'contact'])->name('pages.contact');
Route::post('/contact', [PageController::class, 'storeContact'])->name('pages.contact.store');

Route::get('/mentions-legales', [PageController::class, 'legalNotice'])->name('pages.legal-notice');
Route::get('/politique-de-confidentialite', [PageController::class, 'privacyPolicy'])->name('pages.privacy-policy');

Route::get('/formations', [FormationController::class, 'index'])->name('formations.index');
Route::get('/formations/{formation:slug}', [FormationController::class, 'show'])->name('formations.show');

Route::get('/actualites', [NewsController::class, 'index'])->name('news.index');
Route::get('/actualites/{article:slug}', [NewsController::class, 'show'])->name('news.show');

Route::get('/evenements', [EventController::class, 'index'])->name('events.index');
Route::get('/galerie', [GalleryController::class, 'index'])->name('gallery.index');

Route::get('/candidature', [CandidatureController::class, 'create'])->name('candidature.create');
Route::post('/candidature', [CandidatureController::class, 'store'])->name('candidature.store');
Route::get('/candidature/confirmation/{reference}', [CandidatureController::class, 'confirmation'])->name('candidature.confirmation');
Route::get('/suivi-candidature', [CandidatureController::class, 'trackForm'])->name('candidature.track.form');
Route::post('/suivi-candidature', [CandidatureController::class, 'track'])->name('candidature.track');

Route::get('/bulletins/verifier/{token}', ReportCardVerificationController::class)->name('bulletins.verify');
Route::get('/diplomes/verifier/{diplomaNumber}', DiplomaVerificationController::class)->name('diplomas.verify');

Route::get('/offres-de-stage', [InternshipOfferController::class, 'index'])->name('careers.internships.index');
Route::get('/offres-emploi', [JobOfferController::class, 'index'])->name('careers.jobs.index');
Route::get('/anciens-eleves', [AlumniController::class, 'index'])->name('community.alumni.index');

/*
|--------------------------------------------------------------------------
| Authenticated user profile (Breeze)
|--------------------------------------------------------------------------
*/

Route::get('/dashboard', function () {
    $user = request()->user();

    if ($user?->hasAnyRole([
        'super-admin', 'direction', 'administration', 'responsable-pedagogique',
        'comptable', 'caissier', 'responsable-stocks', 'responsable-communication',
        'responsable-marketing',
    ])) {
        return redirect()->route('admin.dashboard');
    }

    if ($user?->hasRole('enseignant')) {
        return redirect()->route('teacher.dashboard');
    }

    if ($user?->hasRole('eleve')) {
        return redirect()->route('student.dashboard');
    }

    if ($user?->hasRole('parent')) {
        return redirect()->route('parent.dashboard');
    }

    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

// Public kiosk endpoints (token-protected, not gated behind a login session so an
// unattended entry-gate tablet can stay on this page indefinitely) — open with
// /borne/pointage/open?token=YOUR_TOKEN&mode=gate
Route::get('/borne/pointage/open', [AttendanceController::class, 'kioskOpen'])->name('borne.pointage.open');
Route::post('/borne/pointage/scan/open', [AttendanceController::class, 'qrScanOpen'])->name('borne.pointage.scan.open');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unreadCount');
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications', [NotificationController::class, 'store'])->name('notifications.store');
    Route::get('/annuaire', [DirectoryController::class, 'index'])->name('directory.index');
    Route::get('/notifications/threads/{thread}', [NotificationController::class, 'show'])->name('notifications.show');
    Route::post('/notifications/threads/{thread}/reply', [NotificationController::class, 'reply'])->name('notifications.reply');

    Route::post('/push-subscriptions', [PushSubscriptionController::class, 'store'])->name('push-subscriptions.store');
    Route::delete('/push-subscriptions', [PushSubscriptionController::class, 'destroy'])->name('push-subscriptions.destroy');

    // Quick public kiosk: no auth (temporary, insecure) — useful for testing on phone when login isn't possible
    Route::get('/borne/pointage', [AttendanceController::class, 'kioskPublic'])->name('borne.pointage');

    Route::middleware(['verified', 'staff'])->group(function () {
        // original admin route still registered under /admin/borne/pointage if needed
        Route::get('/admin/borne/pointage', [AttendanceController::class, 'kiosk'])->name('admin.borne.pointage');
        // dedicated entry point for scanning students' ID card badges (gate mode)
        Route::get('/admin/borne/pointage/entree', [AttendanceController::class, 'kioskGate'])->name('admin.borne.pointage.gate');
    });

    Route::get('/test-push', function (Request $request) {
        $user = $request->user();
        $count = $user->pushSubscriptions()->count();

        if ($count === 0) {
            return response("Aucun abonnement push enregistré pour {$user->name}. Le navigateur n'a jamais confirmé l'activation des notifications pour ce compte.", 200)
                ->header('Content-Type', 'text/plain; charset=UTF-8');
        }

        try {
            $user->notify(new \App\Notifications\PushAlert('Test', 'Ceci est une notification de test.', '/'));

            return response("Notification envoyée sans erreur à {$count} abonnement(s) pour {$user->name}. Si rien ne s'affiche sur l'appareil, le problème est côté navigateur/appareil (permission bloquée, ou abonnement expiré).", 200)
                ->header('Content-Type', 'text/plain; charset=UTF-8');
        } catch (\Throwable $e) {
            return response("ERREUR lors de l'envoi : ".get_class($e).': '.$e->getMessage()."\n\n".$e->getTraceAsString(), 200)
                ->header('Content-Type', 'text/plain; charset=UTF-8');
        }
    })->name('test-push');
});

/*
|--------------------------------------------------------------------------
| Back-office / admin platform
|--------------------------------------------------------------------------
*/

Route::prefix('admin')->name('admin.')->middleware(['auth', 'verified', 'staff'])->group(function () {
    Route::get('/', DashboardController::class)->name('dashboard');
    Route::get('/dashboard', DashboardController::class);

    PermissionRouting::gate(Route::resource('formations', AdminFormationController::class)->except('show'), 'formations');

    // Référentiel de compétences : le définir est une extension du contenu
    // pédagogique d'une filière (réutilise les permissions "formations").
    Route::get('skills', [SkillController::class, 'index'])->name('skills.index')->middleware('permission:voir_formations');
    Route::post('skills', [SkillController::class, 'store'])->name('skills.store')->middleware('permission:ajouter_formations');
    Route::patch('skills/{skill}', [SkillController::class, 'update'])->name('skills.update')->middleware('permission:modifier_formations');
    Route::delete('skills/{skill}', [SkillController::class, 'destroy'])->name('skills.destroy')->middleware('permission:modifier_formations');

    // Niveaux & règles de passage par formation (moteur de progression) —
    // réutilise les permissions "formations" comme le référentiel de compétences.
    Route::get('formation-levels', [FormationLevelController::class, 'index'])->name('formation-levels.index')->middleware('permission:voir_formations');
    Route::post('formation-levels', [FormationLevelController::class, 'store'])->name('formation-levels.store')->middleware('permission:ajouter_formations');
    Route::patch('formation-levels/{formationLevel}', [FormationLevelController::class, 'update'])->name('formation-levels.update')->middleware('permission:modifier_formations');
    Route::delete('formation-levels/{formationLevel}', [FormationLevelController::class, 'destroy'])->name('formation-levels.destroy')->middleware('permission:modifier_formations');

    // Évaluer/consulter est sémantiquement une évaluation, comme une note.
    Route::get('skill-assessments', [SkillAssessmentController::class, 'index'])->name('skill-assessments.index')->middleware('permission:voir_notes');
    Route::get('students/{student}/skills/pdf', [SkillAssessmentController::class, 'studentPdf'])->name('students.skills.pdf')->middleware('permission:voir_notes');

    // Bibliothèque partagée (espace élève/enseignant) : contenu pédagogique,
    // réutilise les permissions "formations" comme le référentiel de compétences.
    Route::get('library', [LibraryResourceController::class, 'index'])->name('library.index')->middleware('permission:voir_formations');
    Route::post('library', [LibraryResourceController::class, 'store'])->name('library.store')->middleware('permission:ajouter_formations');
    Route::patch('library/{libraryResource}', [LibraryResourceController::class, 'update'])->name('library.update')->middleware('permission:modifier_formations');
    Route::delete('library/{libraryResource}', [LibraryResourceController::class, 'destroy'])->name('library.destroy')->middleware('permission:modifier_formations');

    Route::get('candidatures', [AdminCandidatureController::class, 'index'])->name('candidatures.index')->middleware('permission:voir_candidatures');
    Route::get('candidatures/{candidature}', [AdminCandidatureController::class, 'show'])->name('candidatures.show')->middleware('permission:voir_candidatures');
    Route::patch('candidatures/{candidature}/status', [AdminCandidatureController::class, 'updateStatus'])->name('candidatures.updateStatus')->middleware('permission:valider_candidatures');
    Route::post('candidatures/{candidature}/convert', [AdminCandidatureController::class, 'convertToStudent'])->name('candidatures.convert')->middleware('permission:valider_candidatures');

    PermissionRouting::gate(Route::resource('students', StudentController::class)->except('show'), 'eleves');
    Route::post('students/{student}/access', [StudentController::class, 'createAccess'])->name('students.access')->middleware('permission:modifier_eleves');
    Route::post('students/{student}/parent-access', [StudentController::class, 'createParentAccess'])->name('students.parentAccess')->middleware('permission:modifier_eleves');
    Route::post('students/{student}/documents', [StudentDocumentController::class, 'store'])->name('students.documents.store')->middleware('permission:modifier_eleves');
    Route::delete('students/{student}/documents/{document}', [StudentDocumentController::class, 'destroy'])->name('students.documents.destroy')->middleware('permission:modifier_eleves');
    Route::get('students/{student}/diploma', [StudentController::class, 'diplomaPdf'])->name('students.diploma')->middleware('permission:voir_eleves');
    Route::get('students/{student}/attestation', [StudentController::class, 'attestationPdf'])->name('students.attestation')->middleware('permission:voir_eleves');
    Route::post('students/{student}/photo', [StudentController::class, 'updatePhoto'])->name('students.photo')->middleware('permission:modifier_eleves');
    Route::get('students/{student}/card', [StudentController::class, 'idCardPdf'])->name('students.card')->middleware('permission:exporter_eleves');
    Route::get('students/cards/export', [StudentController::class, 'idCardsBulk'])->name('students.cards.export')->middleware('permission:exporter_eleves');
    Route::post('students/generate-missing-emails', [StudentController::class, 'generateMissingEmails'])->name('students.generateMissingEmails')->middleware('permission:modifier_eleves');
    Route::get('students/export/csv', [StudentController::class, 'exportCsv'])->name('students.export.csv')->middleware('permission:exporter_eleves');
    Route::get('students/export/pdf', [StudentController::class, 'exportPdf'])->name('students.export.pdf')->middleware('permission:exporter_eleves');
    Route::get('students/import/template', [StudentController::class, 'importTemplate'])->name('students.import.template')->middleware('permission:ajouter_eleves');
    Route::post('students/import', [StudentController::class, 'importCsv'])->name('students.import')->middleware('permission:ajouter_eleves');

    Route::get('certificates', [CertificateController::class, 'index'])->name('certificates.index')->middleware('permission:voir_eleves');

    PermissionRouting::gate(Route::resource('teachers', TeacherController::class)->except('show'), 'enseignants');
    Route::post('teachers/{teacher}/access', [TeacherController::class, 'createAccess'])->name('teachers.access')->middleware('permission:modifier_enseignants');
    Route::post('teachers/generate-missing-emails', [TeacherController::class, 'generateMissingEmails'])->name('teachers.generateMissingEmails')->middleware('permission:modifier_enseignants');
    Route::get('teachers/export/csv', [TeacherController::class, 'exportCsv'])->name('teachers.export.csv')->middleware('permission:exporter_enseignants');
    Route::get('teachers/export/pdf', [TeacherController::class, 'exportPdf'])->name('teachers.export.pdf')->middleware('permission:exporter_enseignants');
    Route::get('teachers/import/template', [TeacherController::class, 'importTemplate'])->name('teachers.import.template')->middleware('permission:ajouter_enseignants');
    Route::post('teachers/import', [TeacherController::class, 'importCsv'])->name('teachers.import')->middleware('permission:ajouter_enseignants');

    PermissionRouting::gate(Route::resource('news', AdminNewsController::class)->except('show'), 'actualites');
    Route::post('news/{news}/photos', [NewsArticlePhotoController::class, 'store'])->name('news.photos.store')->middleware('permission:modifier_actualites');
    Route::delete('news/{news}/photos/{photo}', [NewsArticlePhotoController::class, 'destroy'])->name('news.photos.destroy')->middleware('permission:modifier_actualites');
    PermissionRouting::gate(Route::resource('events', AdminEventController::class)->except('show'), 'evenements');

    PermissionRouting::gate(Route::resource('galleries', AdminGalleryController::class)->except('show'), 'galerie');
    Route::post('galleries/{gallery}/media', [AdminGalleryController::class, 'storeMedia'])->name('galleries.media.store')->middleware('permission:modifier_galerie');
    Route::delete('galleries/{gallery}/media/{media}', [AdminGalleryController::class, 'destroyMedia'])->name('galleries.media.destroy')->middleware('permission:modifier_galerie');

    PermissionRouting::gate(Route::resource('partners', AdminPartnerController::class)->except('show'), 'partenaires');
    PermissionRouting::gate(Route::resource('testimonials', AdminTestimonialController::class)->except('show'), 'temoignages');
    PermissionRouting::gate(Route::resource('faqs', AdminFaqController::class)->except('show'), 'faq');
    PermissionRouting::gate(Route::resource('sliders', AdminSliderController::class)->except('show'), 'communication');

    Route::get('messages', [ContactMessageController::class, 'index'])->name('messages.index')->middleware('permission:voir_communication');
    Route::get('messages/{message}', [ContactMessageController::class, 'show'])->name('messages.show')->middleware('permission:voir_communication');
    Route::delete('messages/{message}', [ContactMessageController::class, 'destroy'])->name('messages.destroy')->middleware('permission:supprimer_communication');

    Route::get('mail', [MailController::class, 'index'])->name('mail.index')->middleware('permission:voir_communication');
    Route::post('mail/send', [MailController::class, 'send'])->name('mail.send')->middleware('permission:ajouter_communication');
    Route::get('announcements', [AnnouncementController::class, 'index'])->name('announcements.index')->middleware('permission:voir_communication');
    Route::post('announcements', [AnnouncementController::class, 'store'])->name('announcements.store')->middleware('permission:ajouter_communication');
    Route::get('class-discussions', [ClassDiscussionController::class, 'index'])->name('class-discussions.index')->middleware('permission:voir_communication');
    Route::get('class-discussions/{schoolClass}', [ClassDiscussionController::class, 'show'])->name('class-discussions.show')->middleware('permission:voir_communication');
    Route::delete('class-discussions/messages/{classMessage}', [ClassDiscussionController::class, 'destroy'])->name('class-discussions.destroy')->middleware('permission:modifier_communication');

    Route::get('rh', [HrController::class, 'index'])->name('hr.index')->middleware('permission:voir_utilisateurs');

    PermissionRouting::gate(Route::resource('users', UserController::class)->except('show'), 'utilisateurs');
    Route::get('users/export/csv', [UserController::class, 'exportCsv'])
        ->name('users.export.csv')
        ->middleware('permission:exporter_utilisateurs');
    Route::get('users/export/pdf', [UserController::class, 'exportPdf'])
        ->name('users.export.pdf')
        ->middleware('permission:exporter_utilisateurs');

    // Self-service (own requests) — open to any staff member, like admin.dashboard;
    // approve/reject is gated inside the controller (modifier_utilisateurs).
    Route::get('conges', [LeaveController::class, 'index'])->name('leave.index');
    Route::post('conges', [LeaveController::class, 'store'])->name('leave.store');
    Route::post('conges/{leaveRequest}/annuler', [LeaveController::class, 'cancel'])->name('leave.cancel');
    Route::patch('conges/{leaveRequest}/statut', [LeaveController::class, 'updateStatus'])->name('leave.status');

    PermissionRouting::gate(Route::resource('roles', RoleController::class)->except('show'), 'roles');

    Route::get('org-chart', [OrgChartController::class, 'index'])
        ->name('org-chart.index')
        ->middleware('permission:voir_organigramme');

    Route::prefix('backups')->name('backups.')->group(function () {
        Route::get('/', [BackupController::class, 'index'])->name('index')->middleware('permission:voir_sauvegardes');
        Route::post('/', [BackupController::class, 'store'])->name('store')->middleware('permission:ajouter_sauvegardes');
        Route::get('/download', [BackupController::class, 'download'])->name('download')->middleware('permission:voir_sauvegardes');
        Route::delete('/', [BackupController::class, 'destroy'])->name('destroy')->middleware('permission:supprimer_sauvegardes');
    });

    Route::get('activity-log', [ActivityLogController::class, 'index'])
        ->name('activity-log.index')
        ->middleware('permission:voir_activite');

    Route::get('mot-de-passe', fn () => Inertia::render('Admin/Password'))->name('password');

    Route::get('salaries', [SalaryController::class, 'index'])
        ->name('salaries.index')
        ->middleware('permission:voir_salaires');
    Route::post('salaries', [SalaryController::class, 'store'])
        ->name('salaries.store')
        ->middleware('permission:ajouter_salaires');
    Route::delete('salaries/{salaryPayment}', [SalaryController::class, 'destroy'])
        ->name('salaries.destroy')
        ->middleware('permission:supprimer_salaires');
    Route::delete('salaries/teacher-payments/{teacherSalaryPayment}', [SalaryController::class, 'destroyTeacherPayment'])
        ->name('salaries.destroyTeacherPayment')
        ->middleware('permission:supprimer_salaires');
    Route::get('salaries/export/csv', [SalaryController::class, 'exportCsv'])
        ->name('salaries.export.csv')
        ->middleware('permission:exporter_salaires');
    Route::get('salaries/export/pdf', [SalaryController::class, 'exportPdf'])
        ->name('salaries.export.pdf')
        ->middleware('permission:exporter_salaires');
    Route::get('salaries/{salaryPayment}/bulletin', [SalaryController::class, 'payslipUser'])
        ->name('salaries.payslip.user')
        ->middleware('permission:exporter_salaires');
    Route::get('salaries/teacher-payments/{teacherSalaryPayment}/bulletin', [SalaryController::class, 'payslipTeacher'])
        ->name('salaries.payslip.teacher')
        ->middleware('permission:exporter_salaires');

    Route::get('academic-years', [AcademicYearController::class, 'index'])->name('academic-years.index')->middleware('permission:voir_classes');
    Route::post('academic-years', [AcademicYearController::class, 'store'])->name('academic-years.store')->middleware('permission:ajouter_classes');
    Route::patch('academic-years/{academicYear}', [AcademicYearController::class, 'update'])->name('academic-years.update')->middleware('permission:modifier_classes');
    Route::delete('academic-years/{academicYear}', [AcademicYearController::class, 'destroy'])->name('academic-years.destroy')->middleware('permission:supprimer_classes');

    Route::get('school-classes', [SchoolClassController::class, 'index'])->name('school-classes.index')->middleware('permission:voir_classes');
    Route::post('school-classes', [SchoolClassController::class, 'store'])->name('school-classes.store')->middleware('permission:ajouter_classes');
    Route::patch('school-classes/{schoolClass}', [SchoolClassController::class, 'update'])->name('school-classes.update')->middleware('permission:modifier_classes');
    Route::delete('school-classes/{schoolClass}', [SchoolClassController::class, 'destroy'])->name('school-classes.destroy')->middleware('permission:supprimer_classes');

    Route::get('class-promotion', [ClassPromotionController::class, 'index'])->name('class-promotion.index')->middleware('permission:modifier_eleves');
    Route::post('class-promotion', [ClassPromotionController::class, 'store'])->name('class-promotion.store')->middleware('permission:modifier_eleves');

    Route::get('subjects', [SubjectController::class, 'index'])->name('subjects.index')->middleware('permission:voir_matieres');
    Route::post('subjects', [SubjectController::class, 'store'])->name('subjects.store')->middleware('permission:ajouter_matieres');
    Route::patch('subjects/{subject}', [SubjectController::class, 'update'])->name('subjects.update')->middleware('permission:modifier_matieres');
    Route::delete('subjects/{subject}', [SubjectController::class, 'destroy'])->name('subjects.destroy')->middleware('permission:supprimer_matieres');

    Route::middleware('permission:voir_parametres')->group(function () {
        Route::get('settings', [SettingController::class, 'edit'])->name('settings.edit');
        Route::post('settings', [SettingController::class, 'update'])->name('settings.update')->middleware('permission:modifier_parametres');
    });

    Route::get('rooms', [RoomController::class, 'index'])->name('rooms.index')->middleware('permission:voir_salles');
    Route::post('rooms', [RoomController::class, 'store'])->name('rooms.store')->middleware('permission:ajouter_salles');
    Route::patch('rooms/{room}', [RoomController::class, 'update'])->name('rooms.update')->middleware('permission:modifier_salles');
    Route::delete('rooms/{room}', [RoomController::class, 'destroy'])->name('rooms.destroy')->middleware('permission:supprimer_salles');

    Route::get('timetable', [TimetableController::class, 'index'])->name('timetable.index')->middleware('permission:voir_emploi_du_temps');
    Route::get('timetable/pdf', [TimetableController::class, 'pdf'])->name('timetable.pdf')->middleware('permission:voir_emploi_du_temps');
    Route::post('timetable', [TimetableController::class, 'store'])->name('timetable.store')->middleware('permission:ajouter_emploi_du_temps');
    Route::put('timetable/{timetable}', [TimetableController::class, 'update'])->name('timetable.update')->middleware('permission:modifier_emploi_du_temps');
    Route::delete('timetable/{timetable}', [TimetableController::class, 'destroy'])->name('timetable.destroy')->middleware('permission:supprimer_emploi_du_temps');

    Route::get('attendance', [AttendanceController::class, 'index'])->name('attendance.index')->middleware('permission:voir_presences');
    Route::get('pointage', [AttendanceController::class, 'index'])->name('pointage.index')->middleware('permission:voir_presences');
    Route::post('attendance', [AttendanceController::class, 'store'])->name('attendance.store')->middleware('permission:ajouter_presences');
    Route::post('pointage', [AttendanceController::class, 'store'])->name('pointage.store')->middleware('permission:ajouter_presences');
    Route::post('pointage/scan', [AttendanceController::class, 'qrScan'])->name('pointage.scan')->middleware('permission:ajouter_presences');
    Route::post('attendance/scan', [AttendanceController::class, 'qrScan'])->name('attendance.scan')->middleware('permission:ajouter_presences');
    Route::get('attendance/report', [AttendanceController::class, 'report'])->name('attendance.report')->middleware('permission:voir_presences');
    Route::get('pointage/report', [AttendanceController::class, 'report'])->name('pointage.report')->middleware('permission:voir_presences');

    // Cahier d'absence — chronological register (as opposed to the aggregate counts of report()).
    Route::get('pointage/registre', [AttendanceController::class, 'register'])->name('pointage.register')->middleware('permission:voir_presences');
    Route::get('attendance/register', [AttendanceController::class, 'register'])->name('attendance.register')->middleware('permission:voir_presences');
    Route::get('pointage/registre/pdf', [AttendanceController::class, 'registerPdf'])->name('pointage.register.pdf')->middleware('permission:exporter_presences');

    // Cahier de texte — admin oversight of what teachers logged from their own portal.
    Route::get('cahier-de-texte', [LessonLogController::class, 'index'])->name('lesson-logs.index')->middleware('permission:voir_emploi_du_temps');
    Route::get('cahier-de-texte/pdf', [LessonLogController::class, 'pdf'])->name('lesson-logs.pdf')->middleware('permission:exporter_emploi_du_temps');

    PermissionRouting::gate(Route::resource('exams', ExamController::class)->except('show'), 'examens');
    Route::get('exams/pdf', [ExamController::class, 'pdf'])->name('exams.pdf')->middleware('permission:voir_notes');
    Route::get('exams/{exam}/grades', [ExamController::class, 'grades'])->name('exams.grades')->middleware('permission:voir_notes');
    Route::post('exams/{exam}/grades', [ExamController::class, 'storeGrades'])->name('exams.grades.store')->middleware('permission:ajouter_notes');
    Route::patch('exams/{exam}/publish', [ExamController::class, 'togglePublish'])->name('exams.publish')->middleware('permission:valider_examens');

    Route::get('report-cards', [ReportCardController::class, 'index'])->name('report-cards.index')->middleware('permission:voir_bulletins');
    Route::post('report-cards/generate', [ReportCardController::class, 'generate'])->name('report-cards.generate')->middleware('permission:ajouter_bulletins');
    Route::get('report-cards/export-zip', [ReportCardController::class, 'exportZip'])->name('report-cards.export-zip')->middleware('permission:voir_bulletins');
    Route::get('report-cards/{reportCard}', [ReportCardController::class, 'show'])->name('report-cards.show')->middleware('permission:voir_bulletins');
    Route::patch('report-cards/{reportCard}', [ReportCardController::class, 'update'])->name('report-cards.update')->middleware('permission:modifier_bulletins');
    Route::patch('report-cards/{reportCard}/publish', [ReportCardController::class, 'togglePublish'])->name('report-cards.publish')->middleware('permission:valider_bulletins');
    Route::delete('report-cards/{reportCard}', [ReportCardController::class, 'destroy'])->name('report-cards.destroy')->middleware('permission:supprimer_bulletins');
    Route::get('report-cards/{reportCard}/pdf', [ReportCardController::class, 'pdf'])->name('report-cards.pdf')->middleware('permission:voir_bulletins');

    // Finance
    Route::get('finance', [FinanceController::class, 'dashboard'])->name('finance.dashboard')->middleware('permission:voir_comptabilite');
    Route::get('finance/cash-journal', [FinanceController::class, 'cashJournal'])->name('finance.cash-journal')->middleware('permission:voir_comptabilite');
    Route::get('finance/export/invoices', [FinanceController::class, 'exportInvoicesCsv'])->name('finance.export.invoices')->middleware('permission:exporter_comptabilite');
    Route::get('finance/export/expenses', [FinanceController::class, 'exportExpensesCsv'])->name('finance.export.expenses')->middleware('permission:exporter_comptabilite');

    Route::middleware('permission:voir_comptabilite')->group(function () {
        Route::get('invoices/overdue', [InvoiceController::class, 'overdue'])->name('invoices.overdue');
        Route::get('invoices/monthly', [InvoiceController::class, 'monthlyTracker'])->name('invoices.monthly');
    });
    Route::post('invoices/generate-for-formation', [InvoiceController::class, 'generateForFormation'])->name('invoices.generateForFormation')->middleware('permission:ajouter_comptabilite');
    Route::post('invoices/generate-monthly', [InvoiceController::class, 'generateMonthly'])->name('invoices.generateMonthly')->middleware('permission:ajouter_comptabilite');
    PermissionRouting::gate(Route::resource('invoices', InvoiceController::class)->except('edit'), 'comptabilite');
    Route::post('invoices/{invoice}/payments', [InvoiceController::class, 'storePayment'])->name('invoices.payments.store')->middleware('permission:ajouter_comptabilite');
    Route::delete('invoices/{invoice}/payments/{payment}', [InvoiceController::class, 'destroyPayment'])->name('invoices.payments.destroy')->middleware('permission:supprimer_comptabilite');
    Route::get('invoices/{invoice}/payments/{payment}/receipt', [InvoiceController::class, 'receiptPdf'])->name('invoices.payments.receipt')->middleware('permission:voir_comptabilite');

    PermissionRouting::gate(Route::resource('payment-plans', PaymentPlanController::class)->only(['index', 'create', 'store', 'show', 'destroy']), 'comptabilite');

    PermissionRouting::gate(Route::resource('expenses', ExpenseController::class)->except('show'), 'comptabilite');

    // Comptabilité (SYSCOHADA)
    Route::prefix('accounting')->name('accounting.')->group(function () {
        PermissionRouting::gate(Route::resource('accounts', AccountController::class)->except(['create', 'edit', 'show']), 'comptabilite');
        PermissionRouting::gate(Route::resource('journal-entries', JournalEntryController::class)->only(['index', 'create', 'store', 'show', 'destroy']), 'comptabilite');
        Route::middleware('permission:voir_comptabilite')->group(function () {
            Route::get('ledger', [AccountingReportController::class, 'ledger'])->name('ledger');
            Route::get('trial-balance', [AccountingReportController::class, 'trialBalance'])->name('trial-balance');
            Route::get('balance-sheet', [AccountingReportController::class, 'balanceSheet'])->name('balance-sheet');
            Route::get('income-statement', [AccountingReportController::class, 'incomeStatement'])->name('income-statement');
        });
        Route::middleware('permission:exporter_comptabilite')->group(function () {
            Route::get('ledger/export', [AccountingReportController::class, 'exportLedger'])->name('ledger.export');
            Route::get('trial-balance/export', [AccountingReportController::class, 'exportTrialBalance'])->name('trial-balance.export');
            Route::get('balance-sheet/export', [AccountingReportController::class, 'exportBalanceSheet'])->name('balance-sheet.export');
            Route::get('income-statement/export', [AccountingReportController::class, 'exportIncomeStatement'])->name('income-statement.export');
        });
    });

    Route::get('suppliers', [SupplierController::class, 'index'])->name('suppliers.index')->middleware('permission:voir_stocks');
    Route::post('suppliers', [SupplierController::class, 'store'])->name('suppliers.store')->middleware('permission:ajouter_stocks');
    Route::patch('suppliers/{supplier}', [SupplierController::class, 'update'])->name('suppliers.update')->middleware('permission:modifier_stocks');
    Route::delete('suppliers/{supplier}', [SupplierController::class, 'destroy'])->name('suppliers.destroy')->middleware('permission:supprimer_stocks');

    Route::get('products/movements', [ProductController::class, 'movements'])->name('products.movements')->middleware('permission:voir_stocks');
    Route::post('products/{product}/movements', [ProductController::class, 'storeMovement'])->name('products.movements.store')->middleware('permission:modifier_stocks');
    PermissionRouting::gate(Route::resource('products', ProductController::class)->except('show'), 'stocks');

    PermissionRouting::gate(
        Route::resource('practical-sessions', PracticalSessionController::class)
            ->except('show')
            ->parameters(['practical-sessions' => 'practicalSession']),
        'salles',
    );
    Route::post('practical-sessions/{practicalSession}/items', [PracticalSessionController::class, 'storeItem'])->name('practical-sessions.items.store')->middleware('permission:modifier_salles');
    Route::delete('practical-sessions/{practicalSession}/items/{item}', [PracticalSessionController::class, 'destroyItem'])->name('practical-sessions.items.destroy')->middleware('permission:modifier_salles');

    // Stages, insertion professionnelle & alumni
    PermissionRouting::gate(
        Route::resource('internship-offers', AdminInternshipOfferController::class)
            ->except('show')
            ->parameters(['internship-offers' => 'internshipOffer']),
        'insertion',
    );

    Route::get('internships/{internship}/attestation', [InternshipController::class, 'attestationPdf'])->name('internships.attestation')->middleware('permission:voir_insertion');
    PermissionRouting::gate(Route::resource('internships', InternshipController::class)->except('show'), 'insertion');

    PermissionRouting::gate(
        Route::resource('job-offers', AdminJobOfferController::class)
            ->except('show')
            ->parameters(['job-offers' => 'jobOffer']),
        'insertion',
    );

    // Statistiques & Business Intelligence
    Route::middleware('permission:voir_statistiques')->group(function () {
        Route::get('statistics/academic', [StatisticsController::class, 'academic'])->name('statistics.academic');
        Route::get('statistics/financial', [StatisticsController::class, 'financial'])->name('statistics.financial');
        Route::get('statistics/marketing', [StatisticsController::class, 'marketing'])->name('statistics.marketing');
        Route::get('statistics/at-risk', [StatisticsController::class, 'atRisk'])->name('statistics.at-risk');
        Route::get('statistics/traffic', [StatisticsController::class, 'traffic'])->name('statistics.traffic');
    });
});

/*
|--------------------------------------------------------------------------
| Espace élève
|--------------------------------------------------------------------------
*/

Route::prefix('espace-eleve')->name('student.')->middleware(['auth', 'verified', 'role:eleve'])->group(function () {
    Route::get('/', [StudentPortalController::class, 'dashboard'])->name('dashboard');
    Route::get('/emploi-du-temps', [StudentPortalController::class, 'timetable'])->name('timetable');
    Route::get('/emploi-du-temps/pdf', [StudentPortalController::class, 'timetablePdf'])->name('timetable.pdf');
    Route::get('/notes', [StudentPortalController::class, 'grades'])->name('grades');
    Route::get('/notes/pdf', [StudentPortalController::class, 'gradesPdf'])->name('grades.pdf');
    Route::get('/bulletins/{reportCard}/pdf', [StudentPortalController::class, 'reportCardPdf'])->name('report-cards.pdf');
    Route::get('/presences', [StudentPortalController::class, 'attendance'])->name('attendance');
    Route::get('/factures', [StudentPortalController::class, 'invoices'])->name('invoices');
    Route::get('/factures/{invoice}/paiements/{payment}/recu', [StudentPortalController::class, 'invoiceReceiptPdf'])->name('invoices.receipt');
    Route::get('/discussion-classe', [StudentPortalController::class, 'classDiscussion'])->name('class-discussion');
    Route::get('/discussion-classe/messages', [StudentPortalController::class, 'classMessagesJson'])->name('class-discussion.messages');
    Route::post('/discussion-classe', [StudentPortalController::class, 'storeClassMessage'])->name('class-discussion.store');
    Route::get('/messages', [StudentPortalController::class, 'messages'])->name('messages');
    Route::get('/bibliotheque', [StudentPortalController::class, 'library'])->name('library');
    Route::get('/mot-de-passe', fn () => Inertia::render('Portal/Student/Password'))->name('password');
});

/*
|--------------------------------------------------------------------------
| Espace enseignant
|--------------------------------------------------------------------------
*/

Route::prefix('espace-enseignant')->name('teacher.')->middleware(['auth', 'verified', 'role:enseignant'])->group(function () {
    Route::get('/', [TeacherPortalController::class, 'dashboard'])->name('dashboard');
    Route::get('/classes', [TeacherPortalController::class, 'classes'])->name('classes');
    Route::get('/emploi-du-temps', [TeacherPortalController::class, 'timetable'])->name('timetable');
    Route::get('/emploi-du-temps/pdf', [TeacherPortalController::class, 'timetablePdf'])->name('timetable.pdf');
    Route::get('/messages', [TeacherPortalController::class, 'messages'])->name('messages');
    Route::post('/messages/class', [TeacherPortalController::class, 'sendToClass'])->name('messages.class');
    Route::get('/discussion-classe/{schoolClass}', [TeacherPortalController::class, 'classDiscussion'])->name('class-discussion');
    Route::get('/discussion-classe/{schoolClass}/messages', [TeacherPortalController::class, 'classMessagesJson'])->name('class-discussion.messages');
    Route::post('/discussion-classe/{schoolClass}', [TeacherPortalController::class, 'storeClassMessage'])->name('class-discussion.store');

    Route::get('/devoirs', [TeacherExamController::class, 'index'])->name('exams.index');
    Route::get('/devoirs/nouveau', [TeacherExamController::class, 'create'])->name('exams.create');
    Route::post('/devoirs', [TeacherExamController::class, 'store'])->name('exams.store');
    Route::get('/devoirs/{exam}/modifier', [TeacherExamController::class, 'edit'])->name('exams.edit');
    Route::put('/devoirs/{exam}', [TeacherExamController::class, 'update'])->name('exams.update');
    Route::delete('/devoirs/{exam}', [TeacherExamController::class, 'destroy'])->name('exams.destroy');
    Route::get('/devoirs/{exam}/notes', [TeacherExamController::class, 'grades'])->name('exams.grades');
    Route::post('/devoirs/{exam}/notes', [TeacherExamController::class, 'storeGrades'])->name('exams.grades.store');

    Route::get('/cahier-de-texte', [TeacherLessonLogController::class, 'index'])->name('lesson-log.index');
    Route::post('/cahier-de-texte', [TeacherLessonLogController::class, 'store'])->name('lesson-log.store');

    Route::get('/presences', [TeacherAttendanceController::class, 'index'])->name('attendance.index');
    Route::post('/presences', [TeacherAttendanceController::class, 'store'])->name('attendance.store');

    Route::get('/conges', [TeacherLeaveController::class, 'index'])->name('leave.index');
    Route::post('/conges', [TeacherLeaveController::class, 'store'])->name('leave.store');
    Route::post('/conges/{leaveRequest}/annuler', [TeacherLeaveController::class, 'cancel'])->name('leave.cancel');

    Route::get('/competences', [TeacherSkillController::class, 'index'])->name('skills.index');
    Route::post('/competences', [TeacherSkillController::class, 'store'])->name('skills.store');

    Route::get('/bibliotheque', [TeacherLibraryController::class, 'index'])->name('library.index');
    Route::post('/bibliotheque', [TeacherLibraryController::class, 'store'])->name('library.store');
    Route::delete('/bibliotheque/{libraryResource}', [TeacherLibraryController::class, 'destroy'])->name('library.destroy');

    Route::get('/mot-de-passe', fn () => Inertia::render('Portal/Teacher/Password'))->name('password');
});

/*
|--------------------------------------------------------------------------
| Espace parent
|--------------------------------------------------------------------------
*/

Route::prefix('espace-parent')->name('parent.')->middleware(['auth', 'verified', 'role:parent'])->group(function () {
    Route::get('/', [ParentPortalController::class, 'dashboard'])->name('dashboard');
    Route::get('/enfants/{student}', [ParentPortalController::class, 'child'])->name('child');
    Route::get('/enfants/{student}/bulletins/{reportCard}/pdf', [ParentPortalController::class, 'reportCardPdf'])->name('report-cards.pdf');
    Route::get('/enfants/{student}/factures/{invoice}/paiements/{payment}/recu', [ParentPortalController::class, 'invoiceReceiptPdf'])->name('invoices.receipt');
    Route::get('/messages', [ParentPortalController::class, 'messages'])->name('messages');
    Route::get('/mot-de-passe', fn () => Inertia::render('Portal/Parent/Password'))->name('password');
});

require __DIR__.'/auth.php';
