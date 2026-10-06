<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;

/**
 * Recherche « par mots » partagée par la palette de l'administration et l'écran d'encaissement : chaque mot tapé doit
 * se retrouver dans au moins une colonne (« diop awa » et « awa diop » ramènent donc le même élève) ; « % » et « _ »
 * sont des caractères comme les autres.
 */
final class TermSearch
{
    /** @return list<string> les mots tapés, la saisie étant tronquée à $maxLength caractères */
    public static function terms(string $query, int $maxLength = 60): array
    {
        $query = trim(mb_substr($query, 0, $maxLength));

        return preg_split('/\s+/u', $query, -1, PREG_SPLIT_NO_EMPTY) ?: [];
    }

    /**
     * @param  list<string>  $terms
     * @param  list<string>  $columns
     */
    public static function whereEveryTerm(Builder $query, array $terms, array $columns): Builder
    {
        foreach ($terms as $term) {
            $query->where(fn (Builder $where) => self::orLike($where, $columns, $term));
        }

        return $query;
    }

    /**
     * « colonne LIKE %mot% » pour chaque colonne, reliées par OU. Le mot est protégé : « % » et « _ » n'y sont plus des
     * jokers. Le caractère d'échappement est déclaré (ESCAPE '!') car MySQL et SQLite n'ont pas le même par défaut.
     *
     * @param  list<string>  $columns
     */
    public static function orLike(Builder $query, array $columns, string $term): void
    {
        $pattern = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $term).'%';
        $grammar = $query->getQuery()->getGrammar();

        foreach ($columns as $column) {
            $query->orWhereRaw($grammar->wrap($column)." LIKE ? ESCAPE '!'", [$pattern]);
        }
    }
}
