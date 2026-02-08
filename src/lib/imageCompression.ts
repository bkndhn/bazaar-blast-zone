/**
 * Compresses an image file to a target size (default 100KB).
 * Uses HTML Canvas API to resize and adjust quality.
 */
export async function compressImage(file: File, maxSizeMB: number = 0.1, maxWidthOrHeight: number = 1024): Promise<File> {
    // If file is already small enough, return it
    if (file.size / 1024 / 1024 <= maxSizeMB) {
        return file;
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Resize if dimensions are too large
                if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
                    if (width > height) {
                        height = Math.round((height * maxWidthOrHeight) / width);
                        width = maxWidthOrHeight;
                    } else {
                        width = Math.round((width * maxWidthOrHeight) / height);
                        height = maxWidthOrHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);

                // Binary search / Iterative approach for quality
                // For simplicity, we'll try a few quality steps
                let quality = 0.8;

                const tryCompress = (q: number) => {
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('Compression failed'));
                                return;
                            }

                            // If good enough or quality too low, resolve
                            if (blob.size / 1024 / 1024 <= maxSizeMB || q <= 0.1) {
                                const compressedFile = new File([blob], file.name, {
                                    type: file.type,
                                    lastModified: Date.now(),
                                });
                                resolve(compressedFile);
                            } else {
                                // Try lower quality
                                tryCompress(q - 0.1);
                            }
                        },
                        file.type,
                        q
                    );
                };

                tryCompress(quality);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}
