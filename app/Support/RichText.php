<?php

namespace App\Support;

use DOMDocument;
use DOMElement;
use DOMNode;

/**
 * Texte riche (éditeur TipTap) : on ne garde que des balises de mise en forme simples, sans aucun attribut sauf le lien
 * (adresses http, https, mailto ou tel). Tout le reste — scripts, styles, gestionnaires d'événements, images,
 * formulaires, cadres — est retiré ; un texte brut ancien (sans balises) est converti en paragraphes. La liste est
 * volontairement courte : c'est elle qui rend l'affichage du HTML sûr.
 */
class RichText
{
    /** Balises conservées (nom => attributs permis). */
    private const ALLOWED = [
        'p' => [], 'br' => [], 'strong' => [], 'b' => [], 'em' => [], 'i' => [], 'u' => [], 's' => [], 'code' => [],
        'ul' => [], 'ol' => [], 'li' => [], 'h2' => [], 'h3' => [], 'blockquote' => [], 'hr' => [],
        'a' => ['href'],
    ];

    /** Balises supprimées avec leur contenu (le texte qu'elles contiennent n'est pas du contenu). */
    private const DROP_WITH_CONTENT = ['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template', 'svg', 'math', 'form', 'textarea', 'select', 'button', 'head', 'title'];

    /** Balises de niveau « bloc » : elles forment un paragraphe à elles seules. */
    private const BLOCKS = ['p', 'ul', 'ol', 'h2', 'h3', 'blockquote', 'hr'];

    private const SAFE_SCHEMES = ['http', 'https', 'mailto', 'tel'];

    /** Vrai si la chaîne contient des balises HTML (et non du texte brut). */
    public static function looksLikeHtml(?string $value): bool
    {
        return $value !== null && preg_match('/<\/?[a-z][a-z0-9]*(\s[^>]*)?>/i', $value) === 1;
    }

    /** HTML sûr à stocker ou à afficher ; chaîne vide s'il ne reste aucun texte. */
    public static function clean(?string $value): string
    {
        $value = trim((string) $value);

        if ($value === '') {
            return '';
        }

        if (! self::looksLikeHtml($value)) {
            return self::fromPlain($value);
        }

        $previous = libxml_use_internal_errors(true);
        $doc = new DOMDocument('1.0', 'UTF-8');
        $doc->loadHTML('<?xml encoding="UTF-8"><body>'.$value.'</body>', LIBXML_NOERROR | LIBXML_NOWARNING | LIBXML_NONET);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $body = $doc->getElementsByTagName('body')->item(0);
        $out = '';

        if ($body) {
            // Les passages « en vrac » (texte ou balises de mise en forme hors paragraphe) sont rangés dans des paragraphes.
            $run = '';
            $flush = function () use (&$out, &$run) {
                if (trim(strip_tags($run)) !== '' || str_contains($run, '<br')) {
                    $out .= '<p>'.self::breaks(trim($run)).'</p>';
                }
                $run = '';
            };

            foreach (iterator_to_array($body->childNodes) as $child) {
                $isBlock = $child instanceof DOMElement && in_array(strtolower($child->tagName), self::BLOCKS, true);

                if ($isBlock) {
                    $flush();
                    $out .= self::render($child);
                } else {
                    $run .= self::render($child);
                }
            }

            $flush();
        }

        $out = trim($out);

        // Rien d'autre que des paragraphes vides : pas de contenu.
        return trim(strip_tags(str_replace(['&nbsp;', "\u{00A0}"], ' ', $out))) === '' && ! str_contains($out, '<hr') ? '' : $out;
    }

    /**
     * Valeur à enregistrer : le texte brut reste tel quel (il sera mis en paragraphes à l'affichage), le HTML est nettoyé
     * avant d'être gardé ; rien d'exploitable donne null.
     */
    public static function forStorage(?string $value): ?string
    {
        $value = trim((string) $value);

        if ($value === '') {
            return null;
        }

        if (! self::looksLikeHtml($value)) {
            return $value;
        }

        return self::clean($value) ?: null;
    }

    /** Texte brut d'un contenu (annonces, exports, aperçus) : les blocs deviennent des lignes, les listes des tirets. */
    public static function plain(?string $value): string
    {
        $value = (string) $value;

        if (! self::looksLikeHtml($value)) {
            return trim($value);
        }

        $html = self::clean($value);
        $html = preg_replace('/<li[^>]*>/i', "\n- ", $html);
        $html = preg_replace('/<\/li>/i', '', $html);
        $html = preg_replace('/<\/(p|h2|h3|blockquote|ul|ol)>|<br\s*\/?>|<hr\s*\/?>/i', "\n", $html);
        $text = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');

        return trim(preg_replace("/\n{3,}/", "\n\n", str_replace("\u{00A0}", ' ', $text)));
    }

    /** Sauts de ligne en <br>, sans garder le saut dans le texte. */
    private static function breaks(string $text): string
    {
        return preg_replace('/\R/u', '<br>', $text) ?? $text;
    }

    private static function fromPlain(string $text): string
    {
        $paragraphs = preg_split('/\R{2,}/u', $text) ?: [$text];

        return implode('', array_map(
            fn (string $p) => '<p>'.self::breaks(e(trim($p))).'</p>',
            array_filter($paragraphs, fn (string $p) => trim($p) !== '')
        ));
    }

    private static function render(DOMNode $node): string
    {
        if ($node->nodeType === XML_TEXT_NODE) {
            return htmlspecialchars($node->nodeValue ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        }

        if (! $node instanceof DOMElement) {
            return ''; // commentaires, instructions de traitement, CDATA
        }

        $tag = strtolower($node->tagName);

        if (in_array($tag, self::DROP_WITH_CONTENT, true)) {
            return '';
        }

        $inner = '';
        foreach (iterator_to_array($node->childNodes) as $child) {
            $inner .= self::render($child);
        }

        if (! isset(self::ALLOWED[$tag])) {
            return $inner; // balise inconnue : on garde son texte, pas sa forme
        }

        if (in_array($tag, ['br', 'hr'], true)) {
            return "<{$tag}>";
        }

        if ($tag === 'a') {
            $href = self::safeHref($node->getAttribute('href'));

            return $href === null ? $inner : '<a href="'.htmlspecialchars($href, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8').'" target="_blank" rel="noopener noreferrer nofollow">'.$inner.'</a>';
        }

        return "<{$tag}>{$inner}</{$tag}>";
    }

    private static function safeHref(string $href): ?string
    {
        $href = trim(preg_replace('/[\x00-\x20\x7f]+/u', '', $href) ?? '');

        if ($href === '') {
            return null;
        }

        if (preg_match('/^([a-z][a-z0-9+.\-]*):/i', $href, $m)) {
            return in_array(strtolower($m[1]), self::SAFE_SCHEMES, true) ? $href : null;
        }

        // Adresses relatives (« /page », « #ancre ») : acceptées ; « //hote » (protocole relatif) l'est aussi, il reste http(s).
        return str_starts_with($href, '/') || str_starts_with($href, '#') ? $href : null;
    }
}
