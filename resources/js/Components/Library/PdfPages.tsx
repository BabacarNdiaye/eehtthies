import { loadPdfjs } from '@/lib/pdfThumbnail';
import { Loader2, TriangleAlert } from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useEffect, useRef, useState } from 'react';

/** Une page : le canevas n'est dessiné que lorsque la page approche de l'écran (un livre de 300 pages reste fluide). */
function Page({ pdf, number, ratio }: { pdf: PDFDocumentProxy; number: number; ratio: number }) {
    const box = useRef<HTMLDivElement>(null);
    const canvas = useRef<HTMLCanvasElement>(null);
    const [drawn, setDrawn] = useState(false);

    useEffect(() => {
        const el = box.current;

        if (!el || drawn) return;

        let cancelled = false;
        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some((e) => e.isIntersecting)) return;

                observer.disconnect();
                void (async () => {
                    const page = await pdf.getPage(number);
                    const base = page.getViewport({ scale: 1 });
                    const cssWidth = el.clientWidth || 800;
                    const scale = (cssWidth / base.width) * Math.min(window.devicePixelRatio || 1, 2);
                    const viewport = page.getViewport({ scale });
                    const c = canvas.current;
                    const ctx = c?.getContext('2d');

                    if (cancelled || !c || !ctx) return;

                    c.width = viewport.width;
                    c.height = viewport.height;
                    await page.render({ canvasContext: ctx, viewport }).promise;

                    if (!cancelled) {
                        el.style.aspectRatio = `${base.width} / ${base.height}`;
                        setDrawn(true);
                    }
                })();
            },
            { rootMargin: '600px 0px' },
        );

        observer.observe(el);

        return () => {
            cancelled = true;
            observer.disconnect();
        };
    }, [pdf, number, drawn]);

    return (
        <div ref={box} className="relative w-full overflow-hidden rounded-md bg-white shadow-soft ring-1 ring-ink-200/60" style={{ aspectRatio: `1 / ${ratio}` }}>
            {!drawn && (
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-ink-400">
                    Page {number}
                </span>
            )}
            <canvas ref={canvas} className="block h-full w-full" aria-label={`Page ${number}`} role="img" />
        </div>
    );
}

/**
 * Lecture d'un PDF dans la page, avec pdfjs : il s'affiche pareil sur ordinateur, tablette et téléphone, y compris sur
 * les navigateurs de téléphone qui ne savent pas afficher un PDF dans un cadre. Les pages défilent les unes sous les autres.
 */
export default function PdfPages({ url, onFail }: { url: string; onFail?: () => void }) {
    const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
    const [ratio, setRatio] = useState(1.414);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        let loaded: PDFDocumentProxy | null = null;

        (async () => {
            try {
                const pdfjs = await loadPdfjs();
                const doc = await pdfjs.getDocument({ url, withCredentials: false }).promise;
                const first = await doc.getPage(1);
                const v = first.getViewport({ scale: 1 });

                if (cancelled) return void doc.destroy();

                loaded = doc;
                setRatio(v.height / v.width);
                setPdf(doc);
            } catch {
                if (!cancelled) {
                    setFailed(true);
                    onFail?.();
                }
            }
        })();

        return () => {
            cancelled = true;
            void loaded?.destroy();
        };
    }, [url]);

    if (failed) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-ink-500">
                <TriangleAlert className="h-8 w-8 text-amber-500" aria-hidden="true" />
                <p className="text-sm font-medium text-ink-800">Ce PDF n'a pas pu être affiché ici.</p>
                <p className="text-xs">Utilisez « Nouvel onglet » ou « Télécharger ».</p>
            </div>
        );
    }

    if (!pdf) {
        return (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-ink-500">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Chargement du document…
            </div>
        );
    }

    return (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 p-3 sm:p-5">
            {Array.from({ length: pdf.numPages }, (_, i) => (
                <Page key={i + 1} pdf={pdf} number={i + 1} ratio={ratio} />
            ))}
        </div>
    );
}
