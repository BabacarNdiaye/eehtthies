/**
 * Affiche un texte riche. Le HTML vient du serveur, qui le nettoie à l'enregistrement et à la lecture (App\Support\RichText) :
 * seules des balises de mise en forme simples arrivent ici. Un texte brut ancien arrive déjà mis en paragraphes.
 */
export default function RichTextView({ html, className = '' }: { html: string | null | undefined; className?: string }) {
    if (!html) return null;

    return <div className={`rich-text ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
