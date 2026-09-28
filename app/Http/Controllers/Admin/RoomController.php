<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Room;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RoomController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Rooms/Index', [
            'rooms' => Room::orderBy('name')->get(),
        ]);
    }

    private function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:100'],
            'capacity' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function store(Request $request)
    {
        Room::create($request->validate($this->rules()));

        return back()->with('success', 'Salle créée avec succès.');
    }

    public function update(Request $request, Room $room)
    {
        $room->update($request->validate($this->rules()));

        return back()->with('success', 'Salle mise à jour avec succès.');
    }

    public function destroy(Room $room)
    {
        $room->delete();

        return back()->with('success', 'Salle supprimée.');
    }
}
