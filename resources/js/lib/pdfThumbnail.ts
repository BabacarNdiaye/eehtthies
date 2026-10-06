const THUMBNAIL_WIDTH = 400;

/**
 * pdfjs pèse plus de 300 Ko : on ne le télécharge qu'au moment où l'on choisit réellement un PDF, pas à l'ouverture de
 * la page de la bibliothèque.
 */
export async function loadPdfjs() {
    const [pdfjsLib, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
    pdfjsLib.GlobalWorkerOptions.workerSrc = worker.default;

    return pdfjsLib;
}

/**
 * Génère la miniature PNG de la première page d'un PDF entièrement dans le navigateur. La production n'a ni
 * Imagick ni Ghostscript pour la rastérisation PDF côté serveur ; le traitement se fait donc côté client.
 * Renvoie null pour tout ce qui n'est pas un PDF affichable — les appelants se rabattent sur l'icône
 * générique de type de fichier.
 */
export async function generatePdfThumbnail(file: File): Promise<File | null> {
    try {
        const pdfjsLib = await loadPdfjs();
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        const page = await pdf.getPage(1);

        const baseViewport = page.getViewport({ scale: 1 });
        const scale = THUMBNAIL_WIDTH / baseViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        if (!context) return null;

        await page.render({ canvasContext: context, viewport }).promise;

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) return null;

        return new File([blob], 'thumbnail.png', { type: 'image/png' });
    } catch {
        return null;
    }
}
