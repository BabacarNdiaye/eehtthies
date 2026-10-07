import { EditorContent, useEditor } from '@tiptap/react';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Heading2, Italic, List, ListOrdered, Quote, Redo2, Underline as UnderlineIcon, Undo2 } from 'lucide-react';
import { useEffect } from 'react';

interface Props {
    value: string;
    onChange: (html: string) => void;
    error?: string;
    minHeight?: number;
}

/** Contenu des zones riches : listes, titres et citations ont besoin de leur style que Tailwind remet à zéro. */
export const richContentClass =
    '[&_p]:mb-2 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-0.5 ' +
    '[&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-bold [&_h3]:mb-1.5 [&_h3]:mt-2 [&_h3]:font-semibold ' +
    '[&_blockquote]:mb-2 [&_blockquote]:border-l-4 [&_blockquote]:border-gold-500 [&_blockquote]:pl-3 [&_blockquote]:text-ink-600 [&_a]:text-gold-700 [&_a]:underline';

export default function RichTextEditor({ value, onChange, error, minHeight = 220 }: Props) {
    const editor = useEditor({
        extensions: [StarterKit.configure({ heading: { levels: [2] } }), Underline],
        content: value,
        editorProps: {
            attributes: {
                class: `px-4 py-3 text-sm leading-relaxed text-ink-900 focus:outline-none ${richContentClass}`,
                style: `min-height:${minHeight}px`,
            },
        },
        onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
    });

    // Remet l'éditeur à zéro quand le formulaire est réinitialisé après l'envoi.
    useEffect(() => {
        if (editor && value === '' && !editor.isEmpty) editor.commands.clearContent();
    }, [value, editor]);

    if (!editor) return <div className="rounded-lg border border-ink-200" style={{ minHeight }} />;

    const buttons: { label: string; icon: typeof Bold; run: () => void; active: boolean; disabled?: boolean }[] = [
        { label: 'Gras', icon: Bold, run: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold') },
        { label: 'Italique', icon: Italic, run: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic') },
        { label: 'Souligné', icon: UnderlineIcon, run: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline') },
        { label: 'Titre', icon: Heading2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading') },
        { label: 'Liste à puces', icon: List, run: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList') },
        { label: 'Liste numérotée', icon: ListOrdered, run: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList') },
        { label: 'Citation', icon: Quote, run: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive('blockquote') },
        { label: 'Annuler', icon: Undo2, run: () => editor.chain().focus().undo().run(), active: false, disabled: !editor.can().undo() },
        { label: 'Rétablir', icon: Redo2, run: () => editor.chain().focus().redo().run(), active: false, disabled: !editor.can().redo() },
    ];

    return (
        <div>
            <div
                className={`overflow-hidden rounded-lg border bg-white shadow-sm focus-within:border-gold-500 focus-within:ring-1 focus-within:ring-gold-500 ${
                    error ? 'border-red-400' : 'border-ink-200'
                }`}
            >
                <div className="flex flex-wrap items-center gap-0.5 border-b border-ink-100 bg-ink-50 px-2 py-1.5">
                    {buttons.map(({ label, icon: Icon, run, active, disabled }, i) => (
                        <span key={label} className="flex items-center">
                            {(i === 3 || i === 7) && <span className="mx-1.5 h-5 w-px bg-ink-200" />}
                            <button
                                type="button"
                                title={label}
                                aria-label={label}
                                aria-pressed={active}
                                disabled={disabled}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={run}
                                className={`rounded-md p-1.5 transition disabled:opacity-30 ${
                                    active ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-200/70'
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                            </button>
                        </span>
                    ))}
                </div>
                <EditorContent editor={editor} />
            </div>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}
