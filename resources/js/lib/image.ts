const COMPRESS_ABOVE = 1.5 * 1024 * 1024;
const MAX_SIDE = 2000;

/**
 * Allège une photo de document avant l'envoi : une photo de téléphone pèse 3 à 8 Mo, ce qui est long à envoyer en
 * 3G/4G. Au-delà de 1,5 Mo, elle est redimensionnée (2 000 px au plus) et recompressée en JPEG. Les PDF et les
 * petites images sont laissés tels quels, et on garde l'original dès que quelque chose ne se passe pas comme prévu
 * ou que le résultat n'est pas plus léger.
 */
export async function shrinkImage(file: File): Promise<File> {
    if (!/^image\/(jpeg|png)$/.test(file.type) || file.size <= COMPRESS_ABOVE) return file;

    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');

        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);

        const context = canvas.getContext('2d');

        if (!context) return file;

        // Fond blanc : un PNG transparent deviendrait noir en JPEG.
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close?.();

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));

        if (!blob || blob.size >= file.size) return file;

        return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: file.lastModified });
    } catch {
        return file;
    }
}

/** « 1,4 Mo », « 320 Ko » : poids lisible d'un fichier. */
export function formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`;

    return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}
