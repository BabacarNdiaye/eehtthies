<?php

namespace App\Services;

use App\Models\Announcement;
use App\Models\NewsArticle;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * Éléments du carrousel « À la une » de l'accueil des espaces élève, parent et enseignant : d'abord les
 * annonces officielles reçues par l'utilisateur (non lues en premier), puis les dernières actualités publiées
 * pour compléter. Les annonces d'un autre utilisateur n'y figurent jamais.
 */
class PortalFeed
{
    /**
     * @return list<array{id: string, kind: 'announcement'|'news', title: string, excerpt: string, priority: ?string, unread: bool, date: string, url: string, image: ?string}>
     */
    public function forUser(User $user, int $limit = 5): array
    {
        $announcements = $user->announcementsReceived()
            ->orderByDesc('announcements.created_at')
            ->limit($limit)
            ->get()
            ->sortBy(fn (Announcement $announcement) => $announcement->pivot->read_at === null ? 0 : 1)
            ->values()
            ->map(fn (Announcement $announcement) => [
                'id' => 'announcement-'.$announcement->id,
                'kind' => 'announcement',
                'title' => $announcement->title,
                'excerpt' => Str::limit(trim(strip_tags($announcement->body)), 140),
                'priority' => $announcement->priority,
                'unread' => $announcement->pivot->read_at === null,
                'date' => $announcement->created_at->toIso8601String(),
                'url' => route('connect.index', ['section' => 'announcements']),
                'image' => null,
            ]);

        $remaining = $limit - $announcements->count();

        $news = $remaining > 0
            ? NewsArticle::where('is_published', true)
                ->orderByDesc('published_at')
                ->orderByDesc('id')
                ->limit($remaining)
                ->get()
                ->map(fn (NewsArticle $article) => [
                    'id' => 'news-'.$article->id,
                    'kind' => 'news',
                    'title' => $article->title,
                    'excerpt' => Str::limit(trim(strip_tags($article->excerpt ?: $article->content)), 140),
                    'priority' => null,
                    'unread' => false,
                    'date' => ($article->published_at ?? $article->created_at)->toIso8601String(),
                    'url' => route('news.show', $article->slug),
                    'image' => $article->image ? '/storage/'.$article->image : null,
                ])
            : collect();

        return $announcements->concat($news)->values()->all();
    }
}
