<?php

namespace Tests\Unit;

use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use App\Support\InstitutionalEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InstitutionalEmailTest extends TestCase
{
    use RefreshDatabase;

    public function test_generates_a_prenom_nom_address_on_the_institutional_domain(): void
    {
        $email = InstitutionalEmail::generate('Awa Diop');

        $this->assertEquals('awa.diop@eeht-thies.sn', $email);
    }

    public function test_strips_accents_and_lowercases(): void
    {
        $email = InstitutionalEmail::generate('Aïssatou NDIAYE');

        $this->assertEquals('aissatou.ndiaye@eeht-thies.sn', $email);
    }

    public function test_falls_back_to_a_single_name_when_only_one_word_is_given(): void
    {
        $email = InstitutionalEmail::generate('Madické');

        $this->assertEquals('madicke@eeht-thies.sn', $email);
    }

    public function test_appends_a_numeric_suffix_when_the_address_already_exists_on_a_user(): void
    {
        User::factory()->create(['email' => 'fatou.diagne@eeht-thies.sn']);

        $email = InstitutionalEmail::generate('Fatou Diagne');

        $this->assertEquals('fatou.diagne2@eeht-thies.sn', $email);
    }

    public function test_checks_uniqueness_across_students_teachers_and_users_together(): void
    {
        Student::create([
            'matricule' => 'ELV-TEST-1',
            'first_name' => 'Modou',
            'last_name' => 'Fall',
            'professional_email' => 'modou.fall@eeht-thies.sn',
        ]);

        Teacher::create([
            'matricule' => 'ENS-TEST-1',
            'first_name' => 'Modou',
            'last_name' => 'Fall',
        ]);

        // L'adresse générée pour l'enseignant doit éviter celle déjà prise par l'élève.
        $email = InstitutionalEmail::generate('Modou Fall');

        $this->assertEquals('modou.fall2@eeht-thies.sn', $email);
    }
}
