<?php

namespace App\Http\Controllers;

use App\Models\InternalMessage;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;

class NotificationController extends Controller
{
    private const ALLOWED_ATTACHMENT_TYPES = 'pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png';

    /** @return array{attachment_path?: string, attachment_name?: string, attachment_size?: int} */
    private function attachmentAttributes(Request $request): array
    {
        // TEMPORARY guard — remove once the attachment columns migration has
        // run on this environment (EEHT Connect Phase 1 deploy, 2026-09-28).
        if (! $request->hasFile('attachment') || ! Schema::hasColumn('internal_messages', 'attachment_path')) {
            return [];
        }

        /** @var UploadedFile $file */
        $file = $request->file('attachment');
        $path = $file->store('message-attachments', 'public');

        return [
            'attachment_path' => $path,
            'attachment_name' => $file->getClientOriginalName(),
            'attachment_size' => $file->getSize(),
        ];
    }

    public function unreadCount(Request $request)
    {
        return response()->json([
            'count' => InternalMessage::where('recipient_id', $request->user()->id)->unread()->count(),
        ]);
    }

    /**
     * List the current user's conversations, one row per thread, newest first.
     */
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $threads = InternalMessage::where('sender_id', $userId)
            ->orWhere('recipient_id', $userId)
            ->with(['sender:id,name', 'recipient:id,name'])
            ->get()
            ->groupBy('thread_id')
            ->map(function ($messages) use ($userId) {
                $ordered = $messages->sortBy('created_at')->values();
                $first = $ordered->first();
                $last = $ordered->last();
                $other = $last->sender_id === $userId ? $last->recipient : $last->sender;

                return [
                    'thread_id' => $first->thread_id,
                    'subject' => $first->subject,
                    'last_body' => $last->body,
                    'last_at' => $last->created_at,
                    'other' => $other ? ['id' => $other->id, 'name' => $other->name] : null,
                    'unread_count' => $messages->where('recipient_id', $userId)->whereNull('read_at')->count(),
                ];
            })
            ->sortByDesc('last_at')
            ->values();

        return response()->json(['threads' => $threads]);
    }

    /**
     * Full message history for one thread, and marks the current user's
     * unread messages in it as read.
     */
    public function show(Request $request, int $thread)
    {
        $userId = $request->user()->id;

        $messages = InternalMessage::where('thread_id', $thread)
            ->where(function ($q) use ($userId) {
                $q->where('sender_id', $userId)->orWhere('recipient_id', $userId);
            })
            ->with('sender:id,name')
            ->orderBy('created_at')
            ->get();

        abort_if($messages->isEmpty(), 404);

        InternalMessage::where('thread_id', $thread)
            ->where('recipient_id', $userId)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['messages' => $messages]);
    }

    /**
     * Start a brand-new thread with someone — used by the "Contacter" button
     * on the directory, since reply() requires an existing thread id.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'recipient_id' => ['required', 'integer', 'exists:users,id'],
            'subject' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:5000'],
            'attachment' => ['nullable', 'file', 'mimes:'.self::ALLOWED_ATTACHMENT_TYPES, 'max:10240'],
        ]);

        abort_if((int) $data['recipient_id'] === $request->user()->id, 422, 'Vous ne pouvez pas vous envoyer un message à vous-même.');

        $message = InternalMessage::create([
            'sender_id' => $request->user()->id,
            'recipient_id' => $data['recipient_id'],
            'subject' => $data['subject'],
            'body' => $data['body'],
            ...$this->attachmentAttributes($request),
        ]);

        return response()->json(['message' => $message->load('sender:id,name', 'recipient:id,name'), 'thread_id' => $message->thread_id]);
    }

    public function reply(Request $request, int $thread)
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
            'attachment' => ['nullable', 'file', 'mimes:'.self::ALLOWED_ATTACHMENT_TYPES, 'max:10240'],
        ]);
        $userId = $request->user()->id;

        $threadMessages = InternalMessage::where('thread_id', $thread)
            ->where(function ($q) use ($userId) {
                $q->where('sender_id', $userId)->orWhere('recipient_id', $userId);
            })
            ->orderBy('created_at')
            ->get();

        abort_if($threadMessages->isEmpty(), 404);

        $first = $threadMessages->first();
        $last = $threadMessages->last();
        $other = $last->sender_id === $userId ? $last->recipient_id : $last->sender_id;

        $message = InternalMessage::create([
            'sender_id' => $userId,
            'recipient_id' => $other,
            'thread_id' => $thread,
            'subject' => str_starts_with($first->subject, 'Re: ') ? $first->subject : 'Re: '.$first->subject,
            'body' => $data['body'],
            ...$this->attachmentAttributes($request),
        ]);

        return response()->json(['message' => $message->load('sender:id,name')]);
    }
}
