<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Support\StudentDossier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Un dossier d'élève est « complet » quand cinq pièces essentielles sont renseignées. La règle existe deux fois : en PHP
 * pour la fiche de chaque élève, en SQL pour compter et filtrer les dossiers incomplets d'une promotion entière. Ces
 * tests la verrouillent, surtout leur accord : un écart ferait afficher « 3 à compléter » sur une carte et en lister 4.
 */
class StudentDossierTest extends TestCase
{
    use RefreshDatabase;

    private int $sequence = 0;

    private function student(array $attributes = []): Student
    {
        $this->sequence++;

        return Student::create(array_merge([
            'matricule' => 'M-'.$this->sequence,
            'first_name' => 'Awa',
            'last_name' => 'Diop'.$this->sequence,
            'status' => 'actif',
        ], $attributes));
    }

    private function complete(array $overrides = []): array
    {
        return array_merge([
            'photo' => 'students/photos/awa.jpg',
            'birth_date' => '2005-03-14',
            'phone' => '77 187 79 18',
            'address' => 'Quartier Randoulène, Thiès',
            'guardian_name' => 'Mamadou Diop',
        ], $overrides);
    }

    public function test_a_complete_dossier_has_all_five_items(): void
    {
        $summary = StudentDossier::summarize($this->student($this->complete()));

        $this->assertSame(5, $summary['total']);
        $this->assertSame(5, $summary['done']);
        $this->assertSame([], $summary['missing']);
        $this->assertSame(['photo', 'birth_date', 'phone', 'address', 'emergency'], array_column($summary['items'], 'key'));
        $this->assertSame([true, true, true, true, true], array_column($summary['items'], 'ok'));
    }

    public function test_an_empty_dossier_misses_every_item_and_names_them_for_the_reader(): void
    {
        $summary = StudentDossier::summarize($this->student());

        $this->assertSame(0, $summary['done']);
        $this->assertSame(['Photo', 'Date de naissance', 'Téléphone', 'Adresse', 'Personne à prévenir'], $summary['missing']);
    }

    public function test_the_guardian_phone_makes_the_student_reachable(): void
    {
        $this->assertSame(['Téléphone'], StudentDossier::summarize($this->student($this->complete(['phone' => null])))['missing']);

        $withGuardianPhone = StudentDossier::summarize($this->student($this->complete(['phone' => null, 'guardian_phone' => '76 111 22 33'])));
        $this->assertSame([], $withGuardianPhone['missing']);
    }

    public function test_the_person_to_warn_is_the_guardian_or_the_emergency_contact(): void
    {
        $this->assertSame(['Personne à prévenir'], StudentDossier::summarize($this->student($this->complete(['guardian_name' => null])))['missing']);
        $this->assertSame([], StudentDossier::summarize($this->student($this->complete(['guardian_name' => null, 'emergency_contact' => 'Tante Fatou 77 000 00 00'])))['missing']);
    }

    public function test_empty_strings_count_as_missing_like_null(): void
    {
        $student = $this->student($this->complete(['photo' => '', 'address' => '', 'phone' => '', 'guardian_phone' => '', 'guardian_name' => '']));

        $this->assertSame(['Photo', 'Téléphone', 'Adresse', 'Personne à prévenir'], StudentDossier::summarize($student)['missing']);
    }

    public function test_the_sql_rule_selects_exactly_the_dossiers_the_php_rule_calls_incomplete(): void
    {
        $this->student($this->complete());
        $this->student($this->complete(['photo' => null]));
        $this->student($this->complete(['birth_date' => null]));
        $this->student($this->complete(['phone' => null]));
        $this->student($this->complete(['phone' => null, 'guardian_phone' => '76 111 22 33']));
        $this->student($this->complete(['address' => '']));
        $this->student($this->complete(['guardian_name' => null]));
        $this->student($this->complete(['guardian_name' => '', 'emergency_contact' => '']));
        $this->student($this->complete(['guardian_name' => null, 'emergency_contact' => 'Tante Fatou']));
        $this->student($this->complete(['photo' => '', 'phone' => '']));
        $this->student();

        $viaSql = Student::query()->whereRaw(StudentDossier::incompleteSql())->orderBy('id')->pluck('id')->all();
        $viaPhp = Student::query()->orderBy('id')->get()
            ->filter(fn (Student $student) => StudentDossier::summarize($student)['done'] < StudentDossier::summarize($student)['total'])
            ->pluck('id')->values()->all();

        $this->assertSame($viaPhp, $viaSql);
        $this->assertCount(8, $viaSql, 'onze dossiers dont trois complets : le complet, celui où le tuteur remplace l\'élève au téléphone et celui qui a un contact d\'urgence');
    }

    public function test_the_sql_rule_can_be_summed_per_group(): void
    {
        $this->student($this->complete());
        $this->student($this->complete(['photo' => null]));
        $this->student();

        $incomplete = Student::query()->toBase()
            ->selectRaw('sum(case when '.StudentDossier::incompleteSql().' then 1 else 0 end) as incomplete')
            ->value('incomplete');

        $this->assertSame(2, (int) $incomplete);
    }
}
