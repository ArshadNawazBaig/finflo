import React, { useRef, useState, useEffect } from 'react';
import { Button } from './button';
import { Eraser, Check, Upload } from 'lucide-react';
import { toast } from 'sonner';

const SignaturePad = ({ onSave, onClear, minWidth = 2, maxWidth = 4 }) => {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    // Only init if we have valid dimensions
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    context.scale(dpr, dpr);

    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#2563eb';

    // Set display size
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
  };

  useEffect(() => {
    initCanvas();
    window.addEventListener('resize', initCanvas);
    return () => window.removeEventListener('resize', initCanvas);
  }, []);

  // Also try to init once more if it was initially zero (common in modals)
  useEffect(() => {
    if (isEmpty) {
      const timer = setTimeout(initCanvas, 100);
      return () => clearTimeout(timer);
    }
  }, [isEmpty]);

  const getCoordinates = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (event) => {
    const coords = getCoordinates(event);
    if (!coords) return;

    const context = canvasRef.current.getContext('2d');
    context.beginPath();
    context.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    setIsEmpty(false);
    setIsSaved(false); // Reset saved status on new drawing
  };

  const draw = (event) => {
    if (!isDrawing) return;
    event.preventDefault();

    const coords = getCoordinates(event);
    if (!coords) return;

    const context = canvasRef.current.getContext('2d');
    context.lineTo(coords.x, coords.y);
    context.lineWidth = Math.random() * (maxWidth - minWidth) + minWidth;
    context.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const context = canvasRef.current.getContext('2d');
      context.closePath();
      setIsDrawing(false);
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    setIsSaved(false);
    if (onClear) onClear();
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Clear canvas first
        context.clearRect(0, 0, canvas.width, canvas.height);

        const rect = canvas.getBoundingClientRect();
        const canvasWidth = rect.width;
        const canvasHeight = rect.height;

        const scale = Math.min(
          canvasWidth / img.width,
          canvasHeight / img.height,
        );
        const x = (canvasWidth - img.width * scale) / 2;
        const y = (canvasHeight - img.height * scale) / 2;

        context.drawImage(img, x, y, img.width * scale, img.height * scale);
        setIsEmpty(false);
        setIsSaved(false);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (isEmpty) return;
    try {
      setIsSaving(true);
      const dataUrl = canvasRef.current.toDataURL('image/png');
      await onSave(dataUrl);
      setIsSaved(true);
      toast.success('Signature captured successfully!');
    } catch (error) {
      console.error('Failed to capture signature:', error);
      toast.error('Failed to capture signature');
    } finally {
      setIsSaving(true); // Keep it true or false? Let's stay false.
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-border/50 rounded-2xl bg-muted/5 p-1 relative overflow-hidden group">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-64 cursor-crosshair touch-none bg-white/50 backdrop-blur-sm transition-colors group-hover:bg-white/80"
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Sign or Upload Here
            </p>
          </div>
        )}
        {isSaved && (
          <div className="absolute top-4 right-4 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 px-3 py-1.5 rounded-full border border-emerald-500/20 shadow-sm backdrop-blur-md">
              <Check size={12} strokeWidth={3} />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Captured
              </span>
            </div>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-1 gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-xl h-12 uppercase text-[10px] font-black tracking-widest gap-2"
            onClick={clear}
          >
            <Eraser size={14} />
            Clear
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-xl h-12 uppercase text-[10px] font-black tracking-widest gap-2"
            onClick={() => fileInputRef.current.click()}
          >
            <Upload size={14} />
            Upload
          </Button>
        </div>
        <Button
          type="button"
          variant={isSaved ? 'success' : 'gradient'}
          className={`sm:flex-1 rounded-xl h-12 uppercase text-[10px] font-black tracking-widest gap-2 shadow-lg transition-all duration-300 ${isSaved ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'shadow-primary/20'}`}
          onClick={handleSave}
          disabled={isEmpty || isSaving}
        >
          {isSaving ? (
            <span className="animate-pulse">Processing...</span>
          ) : isSaved ? (
            <>
              <Check size={14} />
              Signature Captured
            </>
          ) : (
            <>
              <Check size={14} />
              Finalize Signature
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default SignaturePad;
