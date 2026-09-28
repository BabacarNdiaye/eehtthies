<?php
// generate_pdf.php
// Génère un PDF combiné (emploi du temps + liste des notes) pour une classe
// Dépendances: dompdf/dompdf (installer avec `composer require dompdf/dompdf` dans le dossier du projet)

declare(strict_types=1);

session_start();

// === Simple protection: adapter selon votre système d'auth ===
if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo 'Accès non autorisé. Veuillez vous connecter.';
    exit;
}

require __DIR__ . '/vendor/autoload.php';
use Dompdf\Dompdf;

// Récupérer et valider les paramètres
$class_id = isset($_GET['class_id']) ? intval($_GET['class_id']) : 0;
$period = isset($_GET['period']) ? trim($_GET['period']) : ''; // e.g., 'trimester1' optional
if ($class_id <= 0) {
    http_response_code(400);
    echo 'Paramètre class_id manquant ou invalide.';
    exit;
}

// === Config DB : modifier avec vos identifiants ===
$db_host = '127.0.0.1';
$db_name = 'your_db_name';
$db_user = 'your_db_user';
$db_pass = 'your_db_pass';
$dsn = "mysql:host={$db_host};dbname={$db_name};charset=utf8mb4";

try {
    $pdo = new PDO($dsn, $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo 'Connexion base de données échouée : ' . htmlspecialchars($e->getMessage());
    exit;
}

// 1) Récupérer les métadonnées de la classe (nom, établissement si disponible)
$stmt = $pdo->prepare('SELECT name FROM classes WHERE id = ? LIMIT 1');
$stmt->execute([$class_id]);
$classMeta = $stmt->fetch();
$className = $classMeta['name'] ?? ('Classe ' . $class_id);

// 2) Emploi du temps
// ATTENTION: adaptez le nom des colonnes / tables à votre schéma
$sqlTimetable = 'SELECT day, start_time, end_time, subject, teacher FROM timetable WHERE class_id = ?';
$params = [$class_id];
if ($period !== '') {
    // Exemple si vous avez une colonne `period` qui filtre le trimestre
    $sqlTimetable .= ' AND period = ?';
    $params[] = $period;
}
$sqlTimetable .= ' ORDER BY day, start_time';
$stmt = $pdo->prepare($sqlTimetable);
$stmt->execute($params);
$timetable = $stmt->fetchAll();

// 3) Notes
// ATTENTION: adaptez le JOIN et les noms de colonnes selon votre schéma
$sqlGrades = 'SELECT s.name AS student_name, g.subject, g.grade FROM grades g JOIN students s ON g.student_id = s.id WHERE g.class_id = ?';
$params2 = [$class_id];
if ($period !== '') {
    $sqlGrades .= ' AND g.period = ?';
    $params2[] = $period;
}
$sqlGrades .= ' ORDER BY s.name, g.subject';
$stmt = $pdo->prepare($sqlGrades);
$stmt->execute($params2);
$grades = $stmt->fetchAll();

// === Construire le HTML pour le PDF ===
// Utiliser DejaVu Sans pour les accents — dompdf supporte DejaVu par défaut
$html = '<!doctype html><html><head><meta charset="utf-8"><style>
  body{font-family:"DejaVu Sans", sans-serif; font-size:12px; color:#222}
  header{ text-align:center; margin-bottom:12px }
  h1{font-size:18px; margin:6px 0}
  h2{font-size:14px; margin:12px 0 6px}
  table{width:100%; border-collapse:collapse; margin-bottom:12px}
  th,td{border:1px solid #ccc; padding:6px; text-align:left}
  th{background:#f5f5f5}
  .small{font-size:11px}
  .timetable-time{width:130px}
</style></head><body>';

$html .= '<header>';
$html .= '<div class="small">Établissement: [Votre établissement]</div>';
$html .= '<h1>Rapport — ' . htmlspecialchars($className) . '</h1>';
if ($period !== '') {
    $html .= '<div class="small">Période: ' . htmlspecialchars($period) . '</div>';
}
$html .= '</header>';

// Emploi du temps
$html .= '<h2>Emploi du temps</h2>';
$html .= '<table><thead><tr><th>Jour</th><th class="timetable-time">Heure</th><th>Matière</th><th>Professeur</th></tr></thead><tbody>';
if (count($timetable) === 0) {
    $html .= '<tr><td colspan="4">Aucun emploi du temps trouvé pour cette classe.</td></tr>';
} else {
    foreach ($timetable as $r) {
        $time = htmlspecialchars(($r['start_time'] ?? '') . ' - ' . ($r['end_time'] ?? ''));
        $html .= '<tr>'
            . '<td>' . htmlspecialchars($r['day'] ?? '') . '</td>'
            . '<td>' . $time . '</td>'
            . '<td>' . htmlspecialchars($r['subject'] ?? '') . '</td>'
            . '<td>' . htmlspecialchars($r['teacher'] ?? '') . '</td>'
            . '</tr>';
    }
}
$html .= '</tbody></table>';

// Liste des notes
$html .= '<h2>Liste des notes</h2>';
$html .= '<table><thead><tr><th>Élève</th><th>Matière</th><th>Note</th></tr></thead><tbody>';
if (count($grades) === 0) {
    $html .= '<tr><td colspan="3">Aucune note trouvée pour cette classe.</td></tr>';
} else {
    foreach ($grades as $g) {
        $html .= '<tr>'
            . '<td>' . htmlspecialchars($g['student_name'] ?? '') . '</td>'
            . '<td>' . htmlspecialchars($g['subject'] ?? '') . '</td>'
            . '<td>' . htmlspecialchars($g['grade'] ?? '') . '</td>'
            . '</tr>';
    }
}
$html .= '</tbody></table>';

$html .= '<footer class="small">Généré le ' . date('Y-m-d H:i') . '</footer>';
$html .= '</body></html>';

// === Générer le PDF avec Dompdf ===
try {
    $dompdf = new Dompdf();
    $dompdf->loadHtml($html);
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();

    $filename = 'classe_' . $class_id . '.pdf';
    // Envoi au navigateur en téléchargement
    $dompdf->stream($filename, ['Attachment' => true]);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo 'Erreur lors de la génération du PDF : ' . htmlspecialchars($e->getMessage());
    exit;
}
