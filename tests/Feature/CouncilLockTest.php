<?php

namespace Tests\Feature;

use App\Exceptions\CouncilException;
use App\Models\Council;
use App\Support\CouncilLock;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsCouncils;
use Tests\TestCase;

/**
 * RG-18 : dès l'état « Clôturé », aucune écriture, même appelée directement sur les modèles. Seule la rectification de la
 * Direction passe (CouncilLock::rectifying).
 */
class CouncilLockTest extends TestCase
{
    use BuildsCouncils, RefreshDatabase;

    private Council $council;

    protected function setUp(): void
    {
        parent::setUp();
        $this->councilWorld();
        $this->pupil('Awa');
        $this->council = $this->makeCouncil();
        Council::whereKey($this->council->id)->update(['status' => Council::CLOSED]);
        $this->council->refresh();
    }

    private function assertLocked(callable $write): void
    {
        try {
            $write();
        } catch (CouncilException $exception) {
            $this->assertSame(423, $exception->status);
            $this->assertSame('COUNCIL_LOCKED', $exception->errorCode);

            return;
        }

        $this->fail("L'écriture sur un conseil clôturé aurait dû être refusée.");
    }

    public function test_the_council_itself_cannot_be_changed(): void
    {
        $this->assertLocked(fn () => $this->council->update(['room' => 'Autre salle']));
        $this->assertSame('Salle 3', $this->council->fresh()->room);
    }

    public function test_its_students_cannot_be_changed(): void
    {
        $row = $this->council->students()->firstOrFail();

        $this->assertLocked(fn () => $row->update(['general_appreciation' => 'Réécriture']));
        $this->assertNull($row->fresh()->general_appreciation);
    }

    public function test_its_members_cannot_be_added_changed_or_removed(): void
    {
        $member = $this->council->members()->firstOrFail();

        $this->assertLocked(fn () => $member->update(['attendance' => 'absent']));
        $this->assertLocked(fn () => $member->delete());
        $this->assertLocked(fn () => $this->council->members()->create(['function' => 'other', 'external_name' => 'Intrus']));
    }

    public function test_a_closed_council_cannot_be_deleted(): void
    {
        $this->assertLocked(fn () => $this->council->delete());
        $this->assertTrue(Council::whereKey($this->council->id)->exists());
    }

    public function test_only_a_rectification_may_write(): void
    {
        $row = $this->council->students()->firstOrFail();

        CouncilLock::rectifying(fn () => $row->update(['general_appreciation' => 'Rectifiée']));

        $this->assertSame('Rectifiée', $row->fresh()->general_appreciation);
        $this->assertLocked(fn () => $row->update(['general_appreciation' => 'Après la rectification']));
    }

    public function test_a_council_that_is_not_a_draft_cannot_be_deleted(): void
    {
        Council::whereKey($this->council->id)->update(['status' => Council::SCHEDULED]);

        try {
            $this->council->fresh()->delete();
            $this->fail('Un conseil programmé ne se supprime pas.');
        } catch (CouncilException $exception) {
            $this->assertSame('COUNCIL_NOT_DRAFT', $exception->errorCode);
        }
    }
}
