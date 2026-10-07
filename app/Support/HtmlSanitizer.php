<?php

namespace App\Support;

use DOMDocument;
use DOMElement;
use DOMNode;

/**
 * Nettoie le HTML saisi dans l'éditeur de texte riche (TipTap) : seules des balises de mise en forme simples sont
 * conservées, sans aucun attribut (hors href des liens http, https et mailto). Le résultat est sûr à afficher tel
 * quel dans un PDF, un e-mail ou une page.
 */
class HtmlSanitizer
{
    private const ALLOWED = [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'h2', 'h3', 'blockquote', 'a', 'hr',
    ];

    public static function clean(?string $html): string
    {
        $html = trim((string) $html);
        if ($html === '') {
            return '';
        }

        $doc = new DOMDocument('1.0', 'UTF-8');
        $previous = libxml_use_internal_errors(true);
        $doc->loadHTML('<?xml encoding="UTF-8"><div id="root">'.$html.'</div>', LIBXML_HTML_NODEFDTD | LIBXML_HTML_NOIMPLIED);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $root = $doc->getElementById('root');
        if (! $root) {
            return e(strip_tags($html));
        }

        self::sanitizeChildren($root);

        $out = '';
        foreach ($root->childNodes as $child) {
            $out .= $doc->saveHTML($child);
        }

        return trim($out);
    }

    /** Version texte brut (retours à la ligne conservés), pour les annonces affichées sans mise en forme. */
    public static function toText(?string $html): string
    {
        $text = preg_replace(['#<br\s*/?>#i', '#</(p|li|h2|h3|blockquote)>#i'], "\n", (string) $html);
        $text = html_entity_decode(strip_tags($text), ENT_QUOTES | ENT_HTML5, 'UTF-8');

        return trim(preg_replace("/\n{3,}/", "\n\n", $text));
    }

    private static function sanitizeChildren(DOMNode $node): void
    {
        foreach (iterator_to_array($node->childNodes) as $child) {
            if (! $child instanceof DOMElement) {
                continue;
            }

            $tag = strtolower($child->tagName);
            self::sanitizeChildren($child);

            if (! in_array($tag, self::ALLOWED, true)) {
                // Balise inconnue : on garde son contenu, pas la balise (script et style sont supprimés avec).
                if (in_array($tag, ['script', 'style', 'iframe', 'object', 'embed'], true)) {
                    $node->removeChild($child);
                } else {
                    while ($child->firstChild) {
                        $node->insertBefore($child->firstChild, $child);
                    }
                    $node->removeChild($child);
                }

                continue;
            }

            $href = $tag === 'a' ? $child->getAttribute('href') : null;
            foreach (iterator_to_array($child->attributes) as $attribute) {
                $child->removeAttribute($attribute->name);
            }
            if ($href !== null && preg_match('#^(https?://|mailto:)#i', $href)) {
                $child->setAttribute('href', $href);
            }
        }
    }
}
