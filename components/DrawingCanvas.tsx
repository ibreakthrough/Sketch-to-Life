import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';

interface DrawingCanvasProps {
  color: string;
  brushSize: number;
  tool: 'pencil' | 'eraser';
  onCanvasChange: () => void;
}

export interface DrawingCanvasRef {
  clear: () => void;
  getDataURL: () => string;
  loadDataURL: (url: string) => void;
}

const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(({ color, brushSize, tool, onCanvasChange }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Only set dimensions if they haven't been set or if window resized (simplified here)
    if (canvas.width !== rect.width * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Fill white background initially
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width, rect.height);
    }

    setContext(ctx);
  }, []);

  // Update context properties when props change
  useEffect(() => {
    if (!context) return;
    context.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    context.lineWidth = brushSize;
  }, [context, color, brushSize, tool]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    clear: () => {
      if (!context || !canvasRef.current) return;
      const canvas = canvasRef.current;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
      onCanvasChange();
    },
    getDataURL: () => {
      return canvasRef.current?.toDataURL('image/png') || '';
    },
    loadDataURL: (url: string) => {
        const img = new Image();
        img.onload = () => {
             if (!context || !canvasRef.current) return;
             const canvas = canvasRef.current;
             // Clear before loading? Or draw over? Let's clear.
             context.fillStyle = '#ffffff';
             context.fillRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
             
             // Draw image centered and contained
             const dpr = window.devicePixelRatio || 1;
             const w = canvas.width / dpr;
             const h = canvas.height / dpr;
             
             // Simple draw for now, stretch to fit if needed or center
             // Let's keep aspect ratio and center
             const scale = Math.min(w / img.width, h / img.height);
             const x = (w / 2) - (img.width / 2) * scale;
             const y = (h / 2) - (img.height / 2) * scale;
             
             context.drawImage(img, x, y, img.width * scale, img.height * scale);
             onCanvasChange();
        };
        img.src = url;
    }
  }));

  const getCoordinates = (event: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in event) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = (event as React.MouseEvent).clientX;
      clientY = (event as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault(); // Prevent scrolling on touch
    setIsDrawing(true);
    const { x, y } = getCoordinates(event);
    lastPos.current = { x, y };
    
    // Draw a single dot
    if (context) {
        context.beginPath();
        context.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        context.fillStyle = tool === 'eraser' ? '#ffffff' : color;
        context.fill();
        context.beginPath(); // Reset path for strokes
        context.moveTo(x, y);
    }
    onCanvasChange();
  };

  const draw = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !context || !lastPos.current) return;
    event.preventDefault();

    const { x, y } = getCoordinates(event);

    context.beginPath();
    context.moveTo(lastPos.current.x, lastPos.current.y);
    context.lineTo(x, y);
    context.stroke();

    lastPos.current = { x, y };
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPos.current = null;
    if (context) context.beginPath(); // Close path
    onCanvasChange();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          if (!context || !canvasRef.current) return;
          // Calculate position to center the dropped image or put at mouse coordinates
          const rect = canvasRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left - (img.width / 4); // rough centering on mouse
          const y = e.clientY - rect.top - (img.height / 4);
          
          // Draw image (scaled down if too big)
          const maxDim = 300;
          let drawW = img.width;
          let drawH = img.height;
          if (drawW > maxDim || drawH > maxDim) {
              const ratio = Math.min(maxDim / drawW, maxDim / drawH);
              drawW *= ratio;
              drawH *= ratio;
          }
          
          context.drawImage(img, x, y, drawW, drawH);
          onCanvasChange();
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="relative w-full h-full bg-white rounded-lg overflow-hidden shadow-inner cursor-crosshair touch-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      />
      {/* Helper text overlay if empty? Nah, keep it clean. */}
    </div>
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';
export default DrawingCanvas;