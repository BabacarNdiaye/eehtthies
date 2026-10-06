<?php

use App\Http\Controllers\Admin\AcademicYearController;
use App\Http\Controllers\Admin\AccountController;
use App\Http\Controllers\Admin\AccountingReportController;
use App\Http\Controllers\Admin\ActivityLogController;
use App\Http\Controllers\Admin\AnnouncementController;
use App\Http\Controllers\Admin\AttendanceController;
use App\Http\Controllers\Admin\BackupController;
use App\Http\Controllers\Admin\CandidatureController as AdminCandidatureController;
use App\Http\Controllers\Admin\CashierController;
use App\Http\Controllers\Admin\CertificateController;
use App\Http\Controllers\Admin\ClassDiscussionController;
use App\Http\Controllers\Admin\ClassPromotionController;
use App\Http\Controllers\Admin\ContactMessageController;
use App\Http\Controllers\Admin\CouncilAuditController;
use App\Http\Controllers\Admin\CouncilController;
use App\Http\Controllers\Admin\CouncilDashboardController;
use App\Http\Controllers\Admin\CouncilDocumentController;
use App\Http\Controllers\Admin\CouncilFamilyNoticeController;
use App\Http\Controllers\Admin\CouncilFollowUpController;
use App\Http\Controllers\Admin\CouncilInternshipController;
use App\Http\Controllers\Admin\CouncilMinutesController;
use App\Http\Controllers\Admin\CouncilRectificationController;
use App\Http\Controllers\Admin\CouncilSettingsController;
use App\Http\Controllers\Admin\CouncilSittingController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\DataResetController;
use App\Http\Controllers\Admin\DisciplineController;
use App\Http\Controllers\Admin\EventController as AdminEventController;
use App\Http\Controllers\Admin\ExamController;
use App\Http\Controllers\Admin\ExpenseController;
use App\Http\Controllers\Admin\FaqController as AdminFaqController;
use App\Http\Controllers\Admin\FinanceController;
use App\Http\Controllers\Admin\FinanceSettingsController;
use App\Http\Controllers\Admin\FormationController as AdminFormationController;
use App\Http\Controllers\Admin\FormationLevelController;
use App\Http\Controllers\Admin\GalleryController as AdminGalleryController;
use App\Http\Controllers\Admin\HrController;
use App\Http\Controllers\Admin\InternshipController;
use App\Http\Controllers\Admin\InternshipOfferController as AdminInternshipOfferController;
use App\Http\Controllers\Admin\InvoiceController;
use App\Http\Controllers\Admin\JobOfferController as AdminJobOfferController;
use App\Http\Controllers\Admin\JournalEntryController;
use App\Http\Controllers\Admin\LeaveController;
use App\Http\Controllers\Admin\LessonLogController;
use App\Http\Controllers\Admin\LibraryResourceController;
use App\Http\Controllers\Admin\MailController;
use App\Http\Controllers\Admin\MyPayslipController;
use App\Http\Controllers\Admin\NewsArticlePhotoController;
use App\Http\Controllers\Admin\NewsController as AdminNewsController;
use App\Http\Controllers\Admin\OnlinePaymentController as AdminOnlinePaymentController;
use App\Http\Controllers\Admin\OrgChartController;
use App\Http\Controllers\Admin\PartnerController as AdminPartnerController;
use App\Http\Controllers\Admin\PaymentPlanController;
use App\Http\Controllers\Admin\PayrollController;
use App\Http\Controllers\Admin\PracticalSessionController;
use App\Http\Controllers\Admin\EconomatDashboardController;
use App\Http\Controllers\Admin\InventoryController;
use App\Http\Controllers\Admin\ProductController;
use App\Http\Controllers\Admin\PurchaseOrderController;
use App\Http\Controllers\Admin\SupplyRequestController;
use App\Http\Controllers\Admin\ReportCardController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\RoomController;
use App\Http\Controllers\Admin\SalaryController;
use App\Http\Controllers\Admin\SchoolClassController;
use App\Http\Controllers\Admin\SearchController as AdminSearchController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\SkillAssessmentController;
use App\Http\Controllers\Admin\SkillController;
use App\Http\Controllers\Admin\SliderController as AdminSliderController;
use App\Http\Controllers\Admin\StatisticsController;
use App\Http\Controllers\Admin\StorageDiagnosticController;
use App\Http\Controllers\Admin\StudentController;
use App\Http\Controllers\Admin\StudentPresenceController;
use App\Http\Controllers\Admin\StudentDocumentController;
use App\Http\Controllers\Admin\SubjectController;
use App\Http\Controllers\Admin\SupplierController;
use App\Http\Controllers\Admin\TeacherController;
use App\Http\Controllers\Admin\TestimonialController as AdminTestimonialController;
use App\Http\Controllers\Admin\TimetableController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\CallController;
use App\Http\Controllers\ConnectController;
use App\Http\Controllers\Council\MeetingController as CouncilMeetingController;
use App\Http\Controllers\Council\SessionController as CouncilSessionController;
use App\Http\Controllers\Council\VoteController as CouncilVoteController;
use App\Http\Controllers\Portal\ParentPortalController;
use App\Http\Controllers\Portal\PaymentAttemptController;
use App\Http\Controllers\Portal\StudentPortalController;
use App\Http\Controllers\Portal\TeacherAttendanceController;
use App\Http\Controllers\Portal\TeacherCouncilController;
use App\Http\Controllers\Portal\TeacherExamController;
use App\Http\Controllers\Portal\TeacherLeaveController;
use App\Http\Controllers\Portal\TeacherLessonLogController;
use App\Http\Controllers\Portal\TeacherLibraryController;
use App\Http\Controllers\Portal\TeacherPayslipController;
use App\Http\Controllers\Portal\TeacherPortalController;
use App\Http\Controllers\Portal\TeacherPreCouncilController;
use App\Http\Controllers\Portal\TeacherSkillController;
use App\Http\Controllers\Portal\TeacherSupplyRequestController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PushSubscriptionController;
use App\Http\Controllers\PwaManifestController;
use App\Http\Controllers\Site\AlumniController;
use App\Http\Controllers\Site\CandidatureController;
use App\Http\Controllers\Site\DiplomaVerificationController;
use App\Http\Controllers\Site\EventController;
use App\Http\Controllers\Site\FormationController;
use App\Http\Controllers\Site\GalleryController;
use App\Http\Controllers\Site\HomeController;
use App\Http\Controllers\Site\InternshipOfferController;
use App\Http\Controllers\Site\JobOfferController;
use App\Http\Controllers\Site\NewsController;
use App\Http\Controllers\Site\PageController;
use App\Http\Controllers\Site\PaymentWebhookController;
use App\Http\Controllers\Site\PublicStorageController;
use App\Http\Controllers\Site\ReceiptVerificationController;
use App\Http\Controllers\Site\ReportCardVerificationController;
use App\Http\Controllers\Site\SitemapController;
use App\Support\PermissionRouting;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Site public
|--------------------------------------------------------------------------
*/

Route::get('/manifest.webmanifest', PwaManifestController::class)->name('pwa.manifest');
Route::get('/sitemap.xml', SitemapController::class)->name('sitemap');

// Photos et fichiers publics quand le raccourci public/storage est absent (voir PublicStorageController).
Route::get('/storage/{path}', PublicStorageController::class)->where('path', '.*')->name('public.storage');

// Diagnostic des photos (direction) : dit pourquoi elles ne s'affichent pas, sans terminal. Hors du menu d'administration.
Route::get('/diagnostic/photos', StorageDiagnosticController::class)->middleware(['auth', 'verified', 'role:super-admin|direction'])->name('diagnostic.storage');

Route::get('/', HomeController::class)->name('home');
Route::get('/a-propos', [PageController::class, 'about'])->name('pages.about');
Route::get('/enseignants', [PageController::class, 'teachers'])->name('pages.teachers');
Route::get('/partenaires', [PageController::class, 'partners'])->name('pages.partners');
Route::get('/temoignages', [PageController::class, 'testimonials'])->name('pages.testimonials');
Route::get('/faq', [PageController::class, 'faq'])->name('pages.faq');
Route::get('/contact', [PageController::class, 'contact'])->name('pages.contact');
Route::post('/contact', [PageController::class, 'storeContact'])->middleware('throttle:5,1')->name('pages.contact.store');

Route::get('/mentions-legales', [PageController::class, 'legalNotice'])->name('pages.legal-notice');
Route::get('/politique-de-confidentialite', [PageController::class, 'privacyPolicy'])->name('pages.privacy-policy');

Route::get('/formations', [FormationController::class, 'index'])->name('formations.index');
Route::get('/formations/{formation:slug}', [FormationController::class, 'show'])->name('formations.show');

Route::get('/actualites', [NewsController::class, 'index'])->name('news.index');
Route::get('/actualites/{article:slug}', [NewsController::class, 'show'])->name('news.show');

Route::get('/evenements', [EventController::class, 'index'])->name('events.index');
Route::get('/galerie', [GalleryController::class, 'index'])->name('gallery.index');

Route::get('/candidature', [CandidatureController::class, 'create'])->name('candidature.create');
Route::post('/candidature', [CandidatureController::class, 'store'])->middleware('throttle:5,10')->name('candidature.store');
Route::get('/candidature/confirmation/{reference}', [CandidatureController::class, 'confirmation'])->name('candidature.confirmation');
Route::get('/suivi-candidature', [CandidatureController::class, 'trackForm'])->name('candidature.track.form');
Route::post('/suivi-candidature', [CandidatureController::class, 'track'])->middleware('throttle:10,1')->name('candidature.track');

Route::get('/bulletins/verifier/{token}', ReportCardVerificationController::class)->name('bulletins.verify');
Route::get('/diplomes/verifier/{diplomaNumber}', DiplomaVerificationController::class)->name('diplomas.verify');
Route::get('/recus/verifier/{token}', ReceiptVerificationController::class)->middleware('throttle:60,1')->name('receipts.verify');

// Paiement en ligne. Les notifications du fournisseur n'ont ni connexion ni jeton CSRF (bootstrap/app.php) : leur signature
// les authentifie, et seul le pilote actif répond. Les pages de suivi et de simulation exigent une connexion et un lien
// avec l'élève (ou la comptabilité) : il n'existe aucun lien de paiement utilisable sans compte.
Route::post('/paiements/webhook/{driver}', PaymentWebhookController::class)->middleware('throttle:120,1')->name('payments.webhook');

Route::middleware(['auth', 'verified'])->prefix('paiements')->name('payments.')->group(function () {
    Route::get('{attempt}', [PaymentAttemptController::class, 'show'])->name('show');
    Route::get('{attempt}/simulation', [PaymentAttemptController::class, 'simulation'])->name('simulation.show');
    Route::post('{attempt}/simulation', [PaymentAttemptController::class, 'completeSimulation'])->middleware('throttle:30,1')->name('simulation.complete');
});

Route::get('/offres-de-stage', [InternshipOfferController::class, 'index'])->name('careers.internships.index');
Route::get('/offres-emploi', [JobOfferController::class, 'index'])->name('careers.jobs.index');
Route::get('/anciens-eleves', [AlumniController::class, 'index'])->name('community.alumni.index');

/*
|--------------------------------------------------------------------------
| Profil de l'utilisateur authentifié (Breeze)
|--------------------------------------------------------------------------
*/

Route::get('/dashboard', function () {
    $user = request()->user();

    if ($user?->hasAnyRole([
        'super-admin', 'direction', 'administration', 'responsable-pedagogique',
        'comptable', 'caissier', 'responsable-stocks', 'responsable-communication',
        'responsable-marketing', 'vie-scolaire', 'secretariat',
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

// Points d'entrée publics de la borne (protégés par jeton, non soumis à une session de connexion pour qu'une
// tablette de portique sans surveillance puisse rester indéfiniment sur cette page) — ouvrir avec
// /borne/pointage/open?token=VOTRE_JETON&mode=gate
Route::get('/borne/pointage/open', [AttendanceController::class, 'kioskOpen'])->middleware('throttle:30,1')->name('borne.pointage.open');
Route::post('/borne/pointage/scan/open', [AttendanceController::class, 'qrScanOpen'])->middleware('throttle:120,1')->name('borne.pointage.scan.open');

// Conseil de classe : mode séance (E05) et vue projetée (E06), hors de /admin pour qu'un président enseignant y accède.
// Les droits sont ceux de CouncilPolicy (lecture : membre ou personnel habilité ; écriture : conduct).
Route::middleware(['auth', 'verified'])->prefix('conseils/{council}')->name('council.')->group(function () {
    Route::get('/seance', [CouncilSessionController::class, 'show'])->name('session.show');
    Route::put('/seance/eleves/{councilStudent}', [CouncilSessionController::class, 'save'])->middleware('throttle:240,1,council-session.save')->name('session.save');
    Route::post('/seance/focus', [CouncilSessionController::class, 'focus'])->middleware('throttle:240,1,council-session.focus')->name('session.focus');
    Route::put('/seance/notes', [CouncilSessionController::class, 'notes'])->middleware('throttle:120,1,council-session.notes')->name('session.notes');
    Route::post('/seance/terminer', [CouncilSessionController::class, 'end'])->name('session.end');
    Route::get('/projection', [CouncilSessionController::class, 'projection'])->name('projection.show');
    Route::get('/projection/etat', [CouncilSessionController::class, 'state'])->middleware('throttle:120,1,council-projection.state')->name('projection.state');
    // Lot V3 : votes (VOT-01 à VOT-05). Page de vote des membres au téléphone, sondée toutes les 3 s.
    Route::get('/vote', [CouncilVoteController::class, 'show'])->name('vote.show');
    Route::get('/votes/etat', [CouncilVoteController::class, 'state'])->middleware('throttle:120,1,council-votes.state')->name('votes.state');
    Route::post('/votes', [CouncilVoteController::class, 'store'])->middleware('throttle:60,1,council-votes.store')->name('votes.store');
    Route::post('/votes/{vote}/bulletin', [CouncilVoteController::class, 'ballot'])->middleware('throttle:60,1,council-votes.ballot')->name('votes.ballot');
    Route::post('/votes/{vote}/cloture', [CouncilVoteController::class, 'close'])->middleware('throttle:60,1,council-votes.close')->name('votes.close');
    // Visioconférence du conseil (pendant la séance) : présence et mise en relation interrogées chaque seconde.
    Route::get('/visio', [CouncilMeetingController::class, 'show'])->name('meeting.show');
    Route::post('/visio', [CouncilMeetingController::class, 'start'])->middleware('throttle:20,1,council-meeting.start')->name('meeting.start');
    Route::post('/visio/rejoindre', [CouncilMeetingController::class, 'join'])->middleware('throttle:30,1,council-meeting.join')->name('meeting.join');
    Route::post('/visio/etat', [CouncilMeetingController::class, 'poll'])->middleware('throttle:240,1,council-meeting.poll')->name('meeting.poll');
    Route::post('/visio/signal', [CouncilMeetingController::class, 'signal'])->middleware('throttle:1200,1,council-meeting.signal')->name('meeting.signal');
    Route::post('/visio/quitter', [CouncilMeetingController::class, 'leave'])->name('meeting.leave');
    Route::post('/visio/terminer', [CouncilMeetingController::class, 'end'])->name('meeting.end');
});

Route::middleware(['auth', 'verified'])->prefix('documents')->name('attachments.')->group(function () {
    Route::post('/', [AttachmentController::class, 'store'])->name('store')->middleware('throttle:30,1');
    Route::get('/{attachment}', [AttachmentController::class, 'download'])->name('download');
    Route::delete('/{attachment}', [AttachmentController::class, 'destroy'])->name('destroy');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Anciennes adresses de la messagerie (liens de notifications push déjà
    // envoyées, favoris) — tout est désormais dans EEHT Connect.
    Route::redirect('/notifications', '/connect');
    Route::redirect('/annuaire', '/connect?section=contacts');
    Route::redirect('/espace-eleve/messages', '/connect');
    Route::redirect('/espace-eleve/discussion-classe', '/connect?section=groups');
    Route::redirect('/espace-enseignant/messages', '/connect');
    Route::get('/espace-enseignant/discussion-classe/{schoolClass}', fn (int $schoolClass) => redirect("/connect?class={$schoolClass}"));
    Route::redirect('/espace-parent/messages', '/connect');

    Route::post('/push-subscriptions', [PushSubscriptionController::class, 'store'])->name('push-subscriptions.store');
    Route::delete('/push-subscriptions', [PushSubscriptionController::class, 'destroy'])->name('push-subscriptions.destroy');

    Route::middleware(['verified', 'staff'])->group(function () {
        Route::get('/borne/pointage', [AttendanceController::class, 'kioskPublic'])->name('borne.pointage');
        // l'ancienne route d'administration reste enregistrée sous /admin/borne/pointage si besoin
        Route::get('/admin/borne/pointage', [AttendanceController::class, 'kiosk'])->name('admin.borne.pointage');
        // point d'entrée dédié au scan des badges des cartes d'élève (mode portique)
        Route::get('/admin/borne/pointage/entree', [AttendanceController::class, 'kioskGate'])->name('admin.borne.pointage.gate');
    });
});

/*
|--------------------------------------------------------------------------
| Back-office / plateforme d'administration
|--------------------------------------------------------------------------
*/

Route::prefix('admin')->name('admin.')->middleware(['auth', 'verified', 'staff'])->group(function () {
    Route::get('/', DashboardController::class)->name('dashboard');
    Route::get('/dashboard', DashboardController::class);

    // Palette de recherche (Ctrl/⌘ K) : les familles de résultats suivent les permissions du rôle (voir le contrôleur).
    Route::get('recherche', AdminSearchController::class)->name('search')->middleware('throttle:60,1');

    Route::get('formations/import/template', [AdminFormationController::class, 'importTemplate'])->name('formations.import.template')->middleware('permission:ajouter_formations');
    Route::post('formations/import', [AdminFormationController::class, 'importCsv'])->name('formations.import')->middleware('permission:ajouter_formations');
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

    // « Élèves en ligne » : déclarée avant la ressource (students/{student}) ; mêmes droits que la liste des élèves.
    Route::get('students/online', [StudentPresenceController::class, 'index'])->name('students.online')->middleware('permission:voir_eleves');
    PermissionRouting::gate(Route::resource('students', StudentController::class)->except('show'), 'eleves');
    Route::post('students/{student}/access', [StudentController::class, 'createAccess'])->name('students.access')->middleware('permission:modifier_eleves');
    Route::post('students/{student}/parent-access', [StudentController::class, 'createParentAccess'])->name('students.parentAccess')->middleware('permission:modifier_eleves');
    Route::post('students/{student}/documents', [StudentDocumentController::class, 'store'])->name('students.documents.store')->middleware('permission:modifier_eleves');
    Route::get('students/{student}/documents/{document}', [StudentDocumentController::class, 'show'])->name('students.documents.show')->middleware('permission:voir_eleves');
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

    // Libre-service (ses propres demandes) — ouvert à tout membre du personnel, comme admin.dashboard ;
    // l'approbation ou le refus est contrôlé dans le contrôleur (modifier_utilisateurs).
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

    // Paie mensuelle : préparer, vérifier, valider, puis verser. Valider est une permission distincte (« valider_salaires »)
    // pour pouvoir séparer celui qui prépare de celui qui approuve ; l'ordre de paiement contient des comptes : « exporter ».
    Route::prefix('payroll')->name('payroll.')->group(function () {
        Route::get('/', [PayrollController::class, 'index'])->name('index')->middleware('permission:voir_salaires');
        Route::post('/', [PayrollController::class, 'store'])->name('store')->middleware('permission:ajouter_salaires');
        Route::get('{payrollRun}', [PayrollController::class, 'show'])->name('show')->middleware('permission:voir_salaires');
        Route::delete('{payrollRun}', [PayrollController::class, 'destroy'])->name('destroy')->middleware('permission:supprimer_salaires');
        Route::post('{payrollRun}/refresh', [PayrollController::class, 'refresh'])->name('refresh')->middleware('permission:modifier_salaires');
        Route::put('{payrollRun}/lines/{payrollLine}', [PayrollController::class, 'updateLine'])->name('lines.update')->middleware('permission:modifier_salaires');
        Route::post('{payrollRun}/validate', [PayrollController::class, 'approve'])->name('validate')->middleware('permission:valider_salaires');
        Route::post('{payrollRun}/reopen', [PayrollController::class, 'reopen'])->name('reopen')->middleware('permission:valider_salaires');
        Route::post('{payrollRun}/pay', [PayrollController::class, 'payAll'])->name('pay')->middleware('permission:ajouter_salaires');
        Route::post('{payrollRun}/lines/{payrollLine}/pay', [PayrollController::class, 'payLine'])->name('lines.pay')->middleware('permission:ajouter_salaires');
        Route::get('{payrollRun}/lines/{payrollLine}/bulletin', [PayrollController::class, 'payslip'])->name('lines.payslip')->middleware('permission:exporter_salaires');
        Route::get('{payrollRun}/ordre-de-paiement.csv', [PayrollController::class, 'payoutCsv'])->name('payout.csv')->middleware('permission:exporter_salaires');
        Route::get('{payrollRun}/ordre-de-paiement.pdf', [PayrollController::class, 'payoutPdf'])->name('payout.pdf')->middleware('permission:exporter_salaires');
    });

    // « Ma paie » : libre-service, ouvert à tout membre du personnel comme « mot-de-passe » ; chaque bulletin est vérifié
    // contre son propriétaire dans le contrôleur.
    Route::get('ma-paie', [MyPayslipController::class, 'index'])->name('my-payslips.index');
    Route::get('ma-paie/{payrollLine}', [MyPayslipController::class, 'download'])->name('my-payslips.download');

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
    Route::get('subjects/import/template', [SubjectController::class, 'importTemplate'])->name('subjects.import.template')->middleware('permission:ajouter_matieres');
    Route::post('subjects/import', [SubjectController::class, 'importCsv'])->name('subjects.import')->middleware('permission:ajouter_matieres');
    Route::post('subjects', [SubjectController::class, 'store'])->name('subjects.store')->middleware('permission:ajouter_matieres');
    Route::patch('subjects/{subject}', [SubjectController::class, 'update'])->name('subjects.update')->middleware('permission:modifier_matieres');
    Route::delete('subjects/{subject}', [SubjectController::class, 'destroy'])->name('subjects.destroy')->middleware('permission:supprimer_matieres');

    Route::middleware('permission:voir_parametres')->group(function () {
        Route::get('settings', [SettingController::class, 'edit'])->name('settings.edit');
        Route::post('settings', [SettingController::class, 'update'])->name('settings.update')->middleware('permission:modifier_parametres');
    });

    // Réinitialisation sélective des données : opération destructive, réservée au super-administrateur.
    Route::middleware('role:super-admin')->prefix('settings/reset')->name('settings.reset.')->group(function () {
        Route::get('/', [DataResetController::class, 'index'])->name('index');
        Route::post('/', [DataResetController::class, 'store'])->name('store')->middleware('throttle:5,1');
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

    // Cahier d'absence — registre chronologique (par opposition aux totaux agrégés de report()).
    Route::get('pointage/registre', [AttendanceController::class, 'register'])->name('pointage.register')->middleware('permission:voir_presences');
    Route::get('attendance/register', [AttendanceController::class, 'register'])->name('attendance.register')->middleware('permission:voir_presences');
    Route::get('pointage/registre/pdf', [AttendanceController::class, 'registerPdf'])->name('pointage.register.pdf')->middleware('permission:exporter_presences');

    // Conseils de classe (E01–E03) : droits fins dans CouncilPolicy (permission ET fonction dans le conseil).
    Route::get('councils/proposal', [CouncilController::class, 'proposal'])->name('councils.proposal');
    // Séance commune de plusieurs classes (un conseil et un PV par classe, tenus ensemble).
    Route::get('council-sittings/create', [CouncilSittingController::class, 'create'])->name('council-sittings.create');
    Route::post('council-sittings', [CouncilSittingController::class, 'store'])->name('council-sittings.store');
    Route::get('council-sittings/{councilSitting}', [CouncilSittingController::class, 'show'])->name('council-sittings.show');
    Route::post('council-sittings/{councilSitting}/schedule', [CouncilSittingController::class, 'schedule'])->name('council-sittings.schedule');
    Route::patch('council-sittings/{councilSitting}/attendance', [CouncilSittingController::class, 'attendance'])->name('council-sittings.attendance');
    Route::post('council-sittings/{councilSitting}/start', [CouncilSittingController::class, 'start'])->name('council-sittings.start');
    Route::get('councils', [CouncilController::class, 'index'])->name('councils.index')->middleware('permission:voir_conseils');
    Route::resource('councils', CouncilController::class)->except('index');
    Route::post('councils/{council}/schedule', [CouncilController::class, 'schedule'])->name('councils.schedule');
    Route::post('councils/{council}/unschedule', [CouncilController::class, 'unschedule'])->name('councils.unschedule');
    Route::post('councils/{council}/snapshot', [CouncilController::class, 'refreshSnapshot'])->name('councils.snapshot');
    Route::post('councils/{council}/start', [CouncilController::class, 'start'])->name('councils.start');
    Route::patch('councils/{council}/members/{member}/attendance', [CouncilController::class, 'attendance'])->name('councils.attendance');

    // Procès-verbal et validation (E07), journal d'audit (E08).
    Route::get('councils/minutes/{minute}/shared', [CouncilMinutesController::class, 'shared'])->middleware('signed')->name('councils.minutes.shared');
    Route::get('councils/{council}/minutes', [CouncilMinutesController::class, 'show'])->name('councils.minutes');
    Route::prefix('councils/{council}/minutes')->name('councils.minutes.')->group(function () {
        Route::get('draft', [CouncilMinutesController::class, 'draft'])->name('draft');
        Route::put('observations', [CouncilMinutesController::class, 'saveObservations'])->name('observations');
        Route::post('submit', [CouncilMinutesController::class, 'submit'])->name('submit');
        Route::post('validate', [CouncilMinutesController::class, 'validatePedagogical'])->name('validate');
        Route::post('return', [CouncilMinutesController::class, 'returnToDrafting'])->name('return');
        Route::post('close', [CouncilMinutesController::class, 'close'])->name('close');
        Route::get('{minute}/pdf', [CouncilMinutesController::class, 'download'])->name('download');
        Route::get('{minute}/link', [CouncilMinutesController::class, 'link'])->name('link');
        Route::post('{minute}/scan', [CouncilMinutesController::class, 'uploadScan'])->name('scan');
        Route::get('{minute}/scan', [CouncilMinutesController::class, 'downloadScan'])->name('scan.download');
    });
    // Lot V2 : stage, rectification et recours, documents, convocations, duplication ; actions de suivi (E09, E10).
    Route::get('councils/{council}/internship', [CouncilInternshipController::class, 'show'])->name('councils.internship');
    Route::put('councils/{council}/internship/{councilStudent}', [CouncilInternshipController::class, 'save'])->name('councils.internship.save');
    Route::post('councils/{council}/students/{councilStudent}/rectify', [CouncilRectificationController::class, 'rectify'])->name('councils.rectify');
    Route::post('councils/{council}/decisions/{decision}/appeals', [CouncilRectificationController::class, 'fileAppeal'])->name('councils.appeals.store');
    Route::post('council-appeals/{appeal}/decide', [CouncilRectificationController::class, 'decideAppeal'])->name('councils.appeals.decide');
    Route::get('councils/{council}/documents/convocation', [CouncilDocumentController::class, 'convocation'])->name('councils.documents.convocation');
    Route::get('councils/{council}/documents/preparatory', [CouncilDocumentController::class, 'preparatory'])->name('councils.documents.preparatory');
    Route::get('councils/{council}/documents/students/{councilStudent}', [CouncilDocumentController::class, 'decisionRecord'])->name('councils.documents.record');
    Route::post('councils/{council}/convocations', [CouncilDocumentController::class, 'sendConvocations'])->name('councils.convocations');
    Route::post('councils/{council}/duplicate', [CouncilDocumentController::class, 'duplicate'])->name('councils.duplicate');
    Route::post('councils/{council}/family-notices', [CouncilFamilyNoticeController::class, 'store'])->middleware('throttle:10,1')->name('councils.family-notices.store');
    // Lot V3 : tableau de bord Direction (E11).
    Route::get('council-dashboard', [CouncilDashboardController::class, 'index'])->name('council-dashboard.index')->middleware('permission:voir_conseils_direction');
    Route::get('council-dashboard/export', [CouncilDashboardController::class, 'export'])->name('council-dashboard.export')->middleware('permission:voir_conseils_direction');
    Route::get('follow-ups', [CouncilFollowUpController::class, 'index'])->name('follow-ups.index')->middleware('permission:voir_conseils');
    Route::get('follow-ups/mine', [CouncilFollowUpController::class, 'mine'])->name('follow-ups.mine');
    Route::patch('follow-ups/{followUp}', [CouncilFollowUpController::class, 'update'])->name('follow-ups.update');
    Route::get('follow-ups/{followUp}/interview', [CouncilFollowUpController::class, 'interviewPdf'])->name('follow-ups.interview');
    Route::get('councils/{council}/audit', [CouncilAuditController::class, 'index'])->name('councils.audit');
    Route::get('councils/{council}/audit/csv', [CouncilAuditController::class, 'exportCsv'])->name('councils.audit.csv');

    // Conseil de classe — paramétrage (E12) : référentiels, seuils d'alerte, groupes de matières, règles du PV.
    Route::prefix('council-settings')->name('council-settings.')->group(function () {
        Route::get('/', [CouncilSettingsController::class, 'index'])->name('index')->middleware('permission:voir_parametrage_conseils');

        Route::middleware('permission:modifier_parametrage_conseils')->group(function () {
            Route::post('decision-types', [CouncilSettingsController::class, 'storeDecisionType'])->name('decision-types.store');
            Route::patch('decision-types/{decisionType}', [CouncilSettingsController::class, 'updateDecisionType'])->name('decision-types.update');
            Route::delete('decision-types/{decisionType}', [CouncilSettingsController::class, 'destroyDecisionType'])->name('decision-types.destroy');
            Route::put('decision-types/{decisionType}/incompatibilities', [CouncilSettingsController::class, 'syncIncompatibilities'])->name('decision-types.incompatibilities');

            Route::put('alert-thresholds', [CouncilSettingsController::class, 'updateThresholds'])->name('alert-thresholds.update');
            Route::delete('alert-thresholds/{formation}', [CouncilSettingsController::class, 'resetThresholds'])->name('alert-thresholds.destroy');

            Route::post('subject-groups', [CouncilSettingsController::class, 'storeSubjectGroup'])->name('subject-groups.store');
            Route::put('subject-groups/assignments', [CouncilSettingsController::class, 'assignSubjects'])->name('subject-groups.assign');
            Route::patch('subject-groups/{subjectGroup}', [CouncilSettingsController::class, 'updateSubjectGroup'])->name('subject-groups.update');
            Route::delete('subject-groups/{subjectGroup}', [CouncilSettingsController::class, 'destroySubjectGroup'])->name('subject-groups.destroy');

            Route::put('rules', [CouncilSettingsController::class, 'updateRules'])->name('rules.update');
            Route::put('vote-rules', [CouncilSettingsController::class, 'updateVoteRules'])->name('vote-rules.update');
            Route::put('messages', [CouncilSettingsController::class, 'updateMessages'])->name('messages.update');

            Route::post('appreciations', [CouncilSettingsController::class, 'storeTemplate'])->name('appreciations.store');
            Route::patch('appreciations/{appreciationTemplate}', [CouncilSettingsController::class, 'updateTemplate'])->name('appreciations.update');
            Route::delete('appreciations/{appreciationTemplate}', [CouncilSettingsController::class, 'destroyTemplate'])->name('appreciations.destroy');
            Route::post('internship-criteria', [CouncilSettingsController::class, 'storeCriterion'])->name('internship-criteria.store');
            Route::patch('internship-criteria/{internshipCriterion}', [CouncilSettingsController::class, 'updateCriterion'])->name('internship-criteria.update');
            Route::delete('internship-criteria/{internshipCriterion}', [CouncilSettingsController::class, 'destroyCriterion'])->name('internship-criteria.destroy');
        });
    });

    // Registre des sanctions de la vie scolaire : lu par le conseil de classe (pastille rouge, fiche de l'élève).
    Route::get('discipline/export/csv', [DisciplineController::class, 'exportCsv'])->name('discipline.export.csv')->middleware('permission:exporter_discipline');
    PermissionRouting::gate(Route::resource('discipline', DisciplineController::class)->except('show')->parameters(['discipline' => 'disciplineRecord']), 'discipline');

    // Cahier de texte — supervision par l'administration de ce que les enseignants ont saisi depuis leur
    // propre portail.
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
    Route::get('finance/settings', [FinanceSettingsController::class, 'edit'])->name('finance.settings')->middleware('permission:modifier_comptabilite');
    Route::put('finance/settings', [FinanceSettingsController::class, 'update'])->name('finance.settings.update')->middleware('permission:modifier_comptabilite');
    Route::get('finance/export/invoices', [FinanceController::class, 'exportInvoicesCsv'])->name('finance.export.invoices')->middleware('permission:exporter_comptabilite');
    Route::get('finance/export/expenses', [FinanceController::class, 'exportExpensesCsv'])->name('finance.export.expenses')->middleware('permission:exporter_comptabilite');

    // Guichet : encaissement groupé (une somme, plusieurs factures, un reçu).
    Route::middleware('permission:ajouter_comptabilite')->group(function () {
        Route::get('encaissement', [CashierController::class, 'index'])->name('cashier.create');
        Route::get('encaissement/eleves', [CashierController::class, 'students'])->name('cashier.students')->middleware('throttle:60,1');
        Route::post('encaissement', [CashierController::class, 'store'])->name('cashier.store');
        Route::post('encaissement/renvoyer', [CashierController::class, 'resend'])->name('cashier.resend')->middleware('throttle:10,1');
    });

    Route::middleware('permission:voir_comptabilite')->group(function () {
        Route::get('invoices/overdue', [InvoiceController::class, 'overdue'])->name('invoices.overdue');
        Route::get('invoices/monthly', [InvoiceController::class, 'monthlyTracker'])->name('invoices.monthly');
    });
    Route::post('invoices/generate-for-formation', [InvoiceController::class, 'generateForFormation'])->name('invoices.generateForFormation')->middleware('permission:ajouter_comptabilite');
    Route::post('invoices/generate-monthly', [InvoiceController::class, 'generateMonthly'])->name('invoices.generateMonthly')->middleware('permission:ajouter_comptabilite');
    Route::post('invoices/fix-due-dates', [InvoiceController::class, 'fixDueDates'])->name('invoices.fixDueDates')->middleware('permission:modifier_comptabilite');
    Route::post('invoices/remind', [InvoiceController::class, 'remind'])->name('invoices.remind')->middleware('permission:modifier_comptabilite');

    Route::get('paiements-en-ligne', [AdminOnlinePaymentController::class, 'index'])->name('online-payments.index')->middleware('permission:voir_comptabilite');
    Route::post('paiements-en-ligne/reconcile', [AdminOnlinePaymentController::class, 'reconcile'])->name('online-payments.reconcile')->middleware('permission:modifier_comptabilite');
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

    // Économat : tableau de bord, bons de commande, demandes de matériel et inventaire.
    Route::get('economat', [EconomatDashboardController::class, 'index'])->name('economat.dashboard')->middleware('permission:voir_stocks');

    PermissionRouting::gate(Route::resource('purchase-orders', PurchaseOrderController::class)->only(['index', 'create', 'store', 'show']), 'stocks');
    Route::post('purchase-orders/{purchaseOrder}/send', [PurchaseOrderController::class, 'send'])->name('purchase-orders.send')->middleware('permission:modifier_stocks');
    Route::post('purchase-orders/{purchaseOrder}/receive', [PurchaseOrderController::class, 'receive'])->name('purchase-orders.receive')->middleware('permission:modifier_stocks');
    Route::post('purchase-orders/{purchaseOrder}/expense', [PurchaseOrderController::class, 'expense'])->name('purchase-orders.expense')->middleware('permission:ajouter_comptabilite');
    Route::post('purchase-orders/{purchaseOrder}/cancel', [PurchaseOrderController::class, 'cancel'])->name('purchase-orders.cancel')->middleware('permission:modifier_stocks');
    Route::get('purchase-orders/{purchaseOrder}/pdf', [PurchaseOrderController::class, 'pdf'])->name('purchase-orders.pdf')->middleware('permission:voir_stocks');

    PermissionRouting::gate(Route::resource('supply-requests', SupplyRequestController::class)->only(['index', 'create', 'store', 'show']), 'stocks');
    Route::post('supply-requests/{supplyRequest}/approve', [SupplyRequestController::class, 'approve'])->name('supply-requests.approve')->middleware('permission:modifier_stocks');
    Route::post('supply-requests/{supplyRequest}/refuse', [SupplyRequestController::class, 'refuse'])->name('supply-requests.refuse')->middleware('permission:modifier_stocks');
    Route::post('supply-requests/{supplyRequest}/deliver', [SupplyRequestController::class, 'deliver'])->name('supply-requests.deliver')->middleware('permission:modifier_stocks');

    Route::get('inventory', [InventoryController::class, 'index'])->name('inventory.index')->middleware('permission:voir_stocks');
    Route::post('inventory', [InventoryController::class, 'store'])->name('inventory.store')->middleware('permission:modifier_stocks');

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

    // Statistiques & pilotage
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
    Route::get('/carte', [StudentPortalController::class, 'card'])->name('card');
    Route::get('/emploi-du-temps', [StudentPortalController::class, 'timetable'])->name('timetable');
    Route::get('/emploi-du-temps/pdf', [StudentPortalController::class, 'timetablePdf'])->name('timetable.pdf');
    Route::get('/notes', [StudentPortalController::class, 'grades'])->name('grades');
    Route::get('/notes/pdf', [StudentPortalController::class, 'gradesPdf'])->name('grades.pdf');
    Route::get('/bulletins/{reportCard}/pdf', [StudentPortalController::class, 'reportCardPdf'])->name('report-cards.pdf');
    Route::get('/presences', [StudentPortalController::class, 'attendance'])->name('attendance');
    Route::get('/factures', [StudentPortalController::class, 'invoices'])->name('invoices');
    Route::get('/factures/{invoice}/paiements/{payment}/recu', [StudentPortalController::class, 'invoiceReceiptPdf'])->name('invoices.receipt');
    Route::post('/paiements', [PaymentAttemptController::class, 'startForStudent'])->middleware('throttle:20,1')->name('payments.start');
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

    Route::get('/materiel', [TeacherSupplyRequestController::class, 'index'])->name('supplies.index');
    Route::post('/materiel', [TeacherSupplyRequestController::class, 'store'])->name('supplies.store');
    Route::delete('/materiel/{supplyRequest}', [TeacherSupplyRequestController::class, 'cancel'])->name('supplies.cancel');

    Route::get('/bibliotheque', [TeacherLibraryController::class, 'index'])->name('library.index');
    Route::post('/bibliotheque', [TeacherLibraryController::class, 'store'])->name('library.store');
    Route::delete('/bibliotheque/{libraryResource}', [TeacherLibraryController::class, 'destroy'])->name('library.destroy');

    Route::get('/conseils', [TeacherCouncilController::class, 'index'])->name('councils.index');
    Route::get('/conseils/{council}', [TeacherCouncilController::class, 'show'])->name('councils.show');
    Route::get('/conseils/{council}/preconseil', [TeacherPreCouncilController::class, 'show'])->name('councils.precouncil');
    Route::put('/conseils/{council}/preconseil', [TeacherPreCouncilController::class, 'save'])->middleware('throttle:120,1')->name('councils.precouncil.save');
    Route::get('/mes-actions', [CouncilFollowUpController::class, 'teacherIndex'])->name('follow-ups.index');
    Route::patch('/mes-actions/{followUp}', [CouncilFollowUpController::class, 'update'])->name('follow-ups.update');
    Route::get('/mes-actions/{followUp}/entretien', [CouncilFollowUpController::class, 'interviewPdf'])->name('follow-ups.interview');
    Route::patch('/conseils/{council}/eleves/{councilStudent}/synthese', [TeacherCouncilController::class, 'updateSynthesis'])->name('councils.synthesis');

    Route::get('/ma-paie', [TeacherPayslipController::class, 'index'])->name('payslips.index');
    Route::get('/ma-paie/{payrollLine}', [TeacherPayslipController::class, 'download'])->name('payslips.download');

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
    Route::post('/enfants/{student}/paiements', [PaymentAttemptController::class, 'startForChild'])->middleware('throttle:20,1')->name('payments.start');
    Route::get('/mot-de-passe', fn () => Inertia::render('Portal/Parent/Password'))->name('password');
});

/*
|--------------------------------------------------------------------------
| EEHT Connect — messagerie interne (tous profils)
|--------------------------------------------------------------------------
*/

// Bouton « Refuser » d'une notification d'appel (adresse signée, sans session).
Route::post('/connect/calls/{call}/push-decline', [CallController::class, 'pushDecline'])
    ->middleware(['signed:relative', 'throttle:30,1'])->name('connect.calls.push-decline');

Route::prefix('connect')->name('connect.')->middleware(['auth', 'verified'])->group(function () {
    Route::get('/', [ConnectController::class, 'index'])->name('index');

    Route::prefix('api')->group(function () {
        Route::get('/unread-count', [ConnectController::class, 'unreadCount'])->name('unread-count');
        Route::get('/conversations', [ConnectController::class, 'conversations'])->name('conversations');
        Route::get('/classes/{schoolClass}', [ConnectController::class, 'conversationForClass'])->whereNumber('schoolClass')->name('class');
        Route::post('/direct', [ConnectController::class, 'openDirect'])->name('direct');
        Route::post('/groups', [ConnectController::class, 'storeGroup'])->name('groups.store');
        Route::get('/conversations/{conversation}/messages', [ConnectController::class, 'messages'])->name('messages');
        Route::post('/conversations/{conversation}/messages', [ConnectController::class, 'send'])->name('send');
        Route::get('/conversations/{conversation}/details', [ConnectController::class, 'details'])->name('details');
        Route::post('/conversations/{conversation}/favorite', [ConnectController::class, 'toggleFavorite'])->name('favorite');
        Route::post('/conversations/{conversation}/unread', [ConnectController::class, 'markUnread'])->name('unread');
        Route::post('/conversations/{conversation}/leave', [ConnectController::class, 'leave'])->name('leave');
        Route::post('/conversations/{conversation}/mute', [ConnectController::class, 'mute'])->name('mute');
        Route::post('/conversations/{conversation}/typing', [ConnectController::class, 'typing'])->middleware('throttle:60,1')->name('typing');
        Route::patch('/conversations/{conversation}/group', [ConnectController::class, 'updateGroup'])->name('group.update');
        Route::post('/conversations/{conversation}/group/avatar', [ConnectController::class, 'updateGroupAvatar'])->name('group.avatar');
        Route::post('/conversations/{conversation}/members', [ConnectController::class, 'addMembers'])->name('members.add');
        Route::delete('/conversations/{conversation}/members/{user}', [ConnectController::class, 'removeMember'])->name('members.remove');
        Route::post('/conversations/{conversation}/members/{user}/admin', [ConnectController::class, 'toggleAdmin'])->name('members.admin');
        Route::get('/messages/{message}/attachment', [ConnectController::class, 'attachment'])->name('attachment');
        Route::post('/messages/{message}/reactions', [ConnectController::class, 'react'])->name('react');
        Route::post('/messages/{message}/pin', [ConnectController::class, 'pin'])->name('pin');
        Route::patch('/messages/{message}', [ConnectController::class, 'updateMessage'])->name('messages.update');
        Route::delete('/messages/{message}', [ConnectController::class, 'destroyMessage'])->name('messages.destroy');
        Route::get('/messages/{message}/readers', [ConnectController::class, 'readers'])->name('messages.readers');
        Route::get('/search', [ConnectController::class, 'search'])->name('search');

        // Appels audio/vidéo en ligne (WebRTC, mise en relation par interrogation).
        Route::post('/conversations/{conversation}/calls', [CallController::class, 'start'])->name('calls.start');
        Route::get('/calls/incoming', [CallController::class, 'incoming'])->name('calls.incoming');
        Route::get('/calls/{call}', [CallController::class, 'show'])->name('calls.show');
        Route::post('/calls/{call}/answer', [CallController::class, 'answer'])->name('calls.answer');
        Route::post('/calls/{call}/decline', [CallController::class, 'decline'])->name('calls.decline');
        Route::post('/calls/{call}/hangup', [CallController::class, 'hangup'])->name('calls.hangup');
        Route::post('/calls/{call}/signals', [CallController::class, 'signal'])->middleware('throttle:600,1')->name('calls.signal');

        // Assistant IA (Claude) — limité pour maîtriser le coût.
        Route::middleware('throttle:20,1')->prefix('ai')->name('ai.')->group(function () {
            Route::post('/conversations/{conversation}/suggest', [ConnectController::class, 'aiSuggest'])->name('suggest');
            Route::post('/conversations/{conversation}/summarize', [ConnectController::class, 'aiSummarize'])->name('summarize');
            Route::post('/rewrite', [ConnectController::class, 'aiRewrite'])->name('rewrite');
            Route::post('/translate', [ConnectController::class, 'aiTranslate'])->name('translate');
        });
        Route::get('/contacts', [ConnectController::class, 'contacts'])->name('contacts');
        Route::get('/announcements', [ConnectController::class, 'announcements'])->name('announcements');
        Route::post('/announcements/{announcement}/read', [ConnectController::class, 'readAnnouncement'])->name('announcements.read');
        Route::get('/documents', [ConnectController::class, 'documents'])->name('documents');
    });
});

require __DIR__.'/auth.php';
