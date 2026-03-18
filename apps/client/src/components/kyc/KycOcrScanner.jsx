import { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  CheckCircle2,
  RefreshCw,
  Scan,
  FileText,
} from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * KycOcrScanner Component
 * Allows uploading/capturing ID image and extracting data via OCR
 */
const KycOcrScanner = ({ onDataExtracted }) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Process OCR
    processOcr(file);
  };

  const processOcr = async (file) => {
    setLoading(true);
    setScanning(true);

    const formData = new FormData();
    formData.append('idImage', file);

    try {
      const response = await api.post('/ocr/process-id', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        toast.success('ID Card scanned successfully!');
        onDataExtracted(response.data.data);
      }
    } catch (error) {
      console.error('OCR Processing Error:', error);
      toast.error('Failed to extract data from ID. Please enter manually.');
    } finally {
      setLoading(false);
      setScanning(false);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="w-full space-y-4">
      <div
        onClick={!loading ? triggerUpload : undefined}
        className={`relative group cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center min-h-[180px] ${
          preview ||
          fileInputRef.current?.files?.[0]?.type === 'application/pdf'
            ? 'border-primary/50 bg-primary/5'
            : 'border-border/50 hover:border-primary/50 hover:bg-muted/30'
        } ${loading ? 'cursor-not-allowed opacity-80' : ''}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          disabled={loading}
        />

        {preview || fileInputRef.current?.files?.[0] ? (
          <div className="absolute inset-0 w-full h-full">
            {fileInputRef.current?.files?.[0]?.type === 'application/pdf' ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-primary/5">
                <FileText className="w-12 h-12 text-primary/40 mb-2" />
                <span className="text-[10px] font-bold text-primary/60 truncate max-w-[80%]">
                  {fileInputRef.current?.files?.[0]?.name}
                </span>
              </div>
            ) : (
              <img
                src={preview}
                alt="ID Preview"
                className="w-full h-full object-cover opacity-40 blur-[2px]"
              />
            )}

            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/20 backdrop-blur-[2px]">
              {scanning ? (
                <div className="flex flex-col items-center gap-3 animate-pulse">
                  <div className="p-4 rounded-full bg-primary/20 text-primary">
                    <Scan className="w-8 h-8 animate-spin-slow" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                    Analyzing Document...
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 rounded-full bg-emerald-500/20 text-emerald-500">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                    Scan Complete
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 h-8 rounded-full text-[9px] font-black uppercase tracking-tighter"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Change File
                  </Button>
                </div>
              )}
            </div>

            {/* Animated Scanning Line */}
            {scanning && (
              <div className="absolute top-0 left-0 w-full h-[2px] bg-primary shadow-[0_0_15px_rgba(var(--primary),0.8)] animate-scan"></div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 p-6 text-center">
            <div className="p-4 rounded-3xl bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-500">
              <Camera className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black uppercase tracking-tight">
                Scan ID or Documents
              </h4>
              <p className="text-[10px] font-medium text-muted-foreground max-w-[200px]">
                Upload a photo or PDF to automatically fill the form.
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 text-primary text-[9px] font-black uppercase tracking-widest">
              <Upload className="w-3 h-3" /> Select Image or PDF
            </div>
          </div>
        )}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes scan {
          0% { top: 0% }
          100% { top: 100% }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
      `,
        }}
      />
    </div>
  );
};

export default KycOcrScanner;
