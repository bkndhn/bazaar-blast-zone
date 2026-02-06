import { useState, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface ImageZoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  alt: string;
}

export function ImageZoomModal({ open, onOpenChange, imageUrl, alt }: ImageZoomModalProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastPosition = useRef({ x: 0, y: 0 });
  const startPosition = useRef({ x: 0, y: 0 });

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.5, 4));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.5, 1));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      startPosition.current = {
        x: e.touches[0].clientX - lastPosition.current.x,
        y: e.touches[0].clientY - lastPosition.current.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || scale <= 1) return;
    
    const newX = e.touches[0].clientX - startPosition.current.x;
    const newY = e.touches[0].clientY - startPosition.current.y;
    
    setPosition({ x: newX, y: newY });
    lastPosition.current = { x: newX, y: newY };
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    startPosition.current = {
      x: e.clientX - lastPosition.current.x,
      y: e.clientY - lastPosition.current.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    
    const newX = e.clientX - startPosition.current.x;
    const newY = e.clientY - startPosition.current.y;
    
    setPosition({ x: newX, y: newY });
    lastPosition.current = { x: newX, y: newY };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setScale(1);
      setPosition({ x: 0, y: 0 });
      lastPosition.current = { x: 0, y: 0 };
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-full h-[100dvh] p-0 bg-black/95 border-none">
        <VisuallyHidden>
          <DialogTitle>Image Zoom View</DialogTitle>
        </VisuallyHidden>
        
        {/* Controls */}
        <div className="absolute top-4 right-4 z-50 flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="bg-white/10 hover:bg-white/20 text-white"
            onClick={handleZoomIn}
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-white/10 hover:bg-white/20 text-white"
            onClick={handleZoomOut}
          >
            <ZoomOut className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-white/10 hover:bg-white/20 text-white"
            onClick={handleReset}
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-white/10 hover:bg-white/20 text-white"
            onClick={() => handleOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Zoom indicator */}
        <div className="absolute bottom-4 left-4 z-50 bg-white/10 px-3 py-1 rounded-full text-white text-sm">
          {Math.round(scale * 100)}%
        </div>

        {/* Image container */}
        <div 
          className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={imageUrl}
            alt={alt}
            className="max-w-full max-h-full object-contain transition-transform select-none"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center center',
            }}
            draggable={false}
          />
        </div>

        {/* Instructions */}
        <div className="absolute bottom-4 right-4 z-50 text-white/60 text-xs text-right">
          <p>Scroll to zoom • Drag to pan</p>
          <p>Double-tap to zoom on mobile</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
