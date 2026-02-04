import { useState, useRef } from 'react';
import { Upload, X, GripVertical, Star } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface MultiImageUploadProps {
  images: { url: string; is_primary?: boolean }[];
  onChange: (images: { url: string; is_primary?: boolean }[]) => void;
  onUpload: (files: File[]) => Promise<string[]>;
  uploading?: boolean;
  maxImages?: number;
  className?: string;
}

export function MultiImageUpload({
  images,
  onChange,
  onUpload,
  uploading = false,
  maxImages = 5,
  className,
}: MultiImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Limit number of files
    const remainingSlots = maxImages - images.length;
    const filesToUpload = files.slice(0, remainingSlots);
    
    if (filesToUpload.length < files.length) {
      // Could add a toast here if needed
    }

    const urls = await onUpload(filesToUpload);
    if (urls.length) {
      const newImages = urls.map((url, i) => ({
        url,
        is_primary: images.length === 0 && i === 0, // First image is primary if no images exist
      }));
      onChange([...images, ...newImages]);
    }

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleRemove = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    // If we removed the primary image, make the first one primary
    if (images[index].is_primary && newImages.length > 0) {
      newImages[0].is_primary = true;
    }
    onChange(newImages);
  };

  const handleSetPrimary = (index: number) => {
    const newImages = images.map((img, i) => ({
      ...img,
      is_primary: i === index,
    }));
    onChange(newImages);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const [draggedItem] = newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedItem);
    onChange(newImages);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {images.map((image, index) => (
          <div
            key={image.url}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              'group relative aspect-square cursor-move rounded-lg border-2 border-border bg-muted overflow-hidden transition-all',
              draggedIndex === index && 'opacity-50 border-dashed',
              image.is_primary && 'ring-2 ring-primary'
            )}
          >
            <img
              src={image.url}
              alt={`Product image ${index + 1}`}
              className="h-full w-full object-cover"
            />
            
            {/* Drag handle */}
            <div className="absolute left-1 top-1 rounded bg-background/80 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="h-3 w-3 text-muted-foreground" />
            </div>

            {/* Primary badge */}
            {image.is_primary && (
              <div className="absolute left-1 bottom-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                Primary
              </div>
            )}

            {/* Actions */}
            <div className="absolute right-1 top-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!image.is_primary && (
                <button
                  type="button"
                  onClick={() => handleSetPrimary(index)}
                  className="rounded bg-background/80 p-1 text-muted-foreground hover:text-primary transition-colors"
                  title="Set as primary"
                >
                  <Star className="h-3 w-3" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="rounded bg-background/80 p-1 text-muted-foreground hover:text-destructive transition-colors"
                title="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}

        {/* Upload button */}
        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              'flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 text-muted-foreground transition-colors hover:border-primary hover:text-primary',
              uploading && 'cursor-not-allowed opacity-50'
            )}
          >
            <Upload className="h-5 w-5" />
            <span className="mt-1 text-xs">
              {uploading ? 'Uploading...' : 'Add'}
            </span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      <p className="text-xs text-muted-foreground">
        {images.length}/{maxImages} images • Drag to reorder • Max 100KB each
      </p>
    </div>
  );
}
