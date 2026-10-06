<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NewsArticlePhoto extends Model
{
    protected $fillable = ['news_article_id', 'path', 'caption', 'order'];

    public function article()
    {
        return $this->belongsTo(NewsArticle::class, 'news_article_id');
    }
}
