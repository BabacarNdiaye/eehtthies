import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Heading2, Italic, Link2, List, ListOrdered, Quote, Redo2, Strikethrough, Undo2 } from 'lucide-react';
import { useEffect, useId } from 'react';

/** Texte brut ancien (sans balises) : mis en paragraphes pour l'éditeur. */
function toEditorHtml(value: string): string {
    if (!value) return '';
    if (/<\/?[a-z][a-z0-9]*(\s[^>]*)?>/i.test(value)) return value;

    const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return value
        .split(/\n{2,}/)
        .filter((p) => p.trim() !== '')
        .map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`)
        .join('');
}

function Tool({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            className={`flex h-8 w-8 items-center justify-center rounded-lg outline-none transition focus-visible:ring-2 focus-visible:ring-gold-500 disabled:opacity-30 ${active ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-100'}`}
        >
            {children}
        </button>
    );
}

/**
 * Éditeur de texte riche (TipTap) pour les textes à rédiger : cahier de texte, annonces… Il produit du HTML simple
 * (paragraphes, gras, italique, titres, listes, citations, liens) ; le serveur le nettoie encore à l'enregistrement.
 * Une zone vide donne une chaîne vide.
 */
export default function RichTextEditor({
    value,
    onChange,
    placeholder = 'Écrivez ici…',
    label,
    minHeight = '9rem',
    error,
}: {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    label: string;
    minHeight?: string;
    error?: string;
}) {
    const id = useId();
    const editor = useEditor({
        extensions: [
            StarterKit.configure({ heading: { levels: [2] }, codeBlock: false, code: false, horizontalRule: false }),
            Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' } }),
            Placeholder.configure({ placeholder }),
        ],
        content: toEditorHtml(value),
        editorProps: {
            attributes: { id, 'aria-label': label, 'aria-multiline': 'true', role: 'textbox', class: 'rich-text focus:outline-none' },
        },
        onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
    });

    // Remise à zéro depuis l'extérieur (après un enregistrement, un changement de séance…).
    useEffect(() => {
        if (editor && value !== (editor.isEmpty ? '' : editor.getHTML())) {
            editor.commands.setContent(toEditorHtml(value), false);
        }
    }, [value, editor]);

    if (!editor) return <div className="rounded-xl border border-ink-200 bg-white" style={{ minHeight }} />;

    const setLink = () => {
        const previous = editor.getAttributes('link').href as string | undefined;
        const url = window.prompt('Adresse du lien (https://…) — laissez vide pour retirer le lien', previous ?? 'https://');

        if (url === null) return;
        if (url.trim() === '' || url.trim() === 'https://') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();

            return;
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
    };

    return (
        <div>
            <div className={`overflow-hidden rounded-xl border bg-white shadow-sm transition focus-within:border-gold-500 focus-within:ring-2 focus-within:ring-gold-500/25 ${error ? 'border-red-400' : 'border-ink-200'}`}>
                <div role="toolbar" aria-label={`Mise en forme : ${label}`} className="flex flex-wrap items-center gap-0.5 border-b border-ink-100 bg-ink-50/60 px-2 py-1.5">
                    <Tool label="Gras" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
                        <Bold className="h-4 w-4" />
                    </Tool>
                    <Tool label="Italique" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
                        <Italic className="h-4 w-4" />
                    </Tool>
                    <Tool label="Barré" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
                        <Strikethrough className="h-4 w-4" />
                    </Tool>
                    <span className="mx-1 h-5 w-px bg-ink-200" aria-hidden="true" />
                    <Tool label="Titre" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                        <Heading2 className="h-4 w-4" />
                    </Tool>
                    <Tool label="Liste à puces" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
                        <List className="h-4 w-4" />
                    </Tool>
                    <Tool label="Liste numérotée" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                        <ListOrdered className="h-4 w-4" />
                    </Tool>
                    <Tool label="Citation" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                        <Quote className="h-4 w-4" />
                    </Tool>
                    <Tool label="Lien" active={editor.isActive('link')} onClick={setLink}>
                        <Link2 className="h-4 w-4" />
                    </Tool>
                    <span className="ml-auto flex gap-0.5">
                        <Tool label="Annuler" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
                            <Undo2 className="h-4 w-4" />
                        </Tool>
                        <Tool label="Rétablir" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
                            <Redo2 className="h-4 w-4" />
                        </Tool>
                    </span>
                </div>
                <EditorContent editor={editor} className="px-3.5 py-3 text-sm text-ink-900" style={{ minHeight }} />
            </div>
            {error && (
                <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                    {error}
                </p>
            )}
        </div>
    );
}
