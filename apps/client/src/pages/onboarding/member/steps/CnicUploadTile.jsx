/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useRef, useState } from 'react';
import { Upload, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  compressImage,
  dataUrlBytes,
  formatBytes,
  MAX_IMAGE_MB,
} from '@/lib/image';

// One upload tile for a single CNIC side. `preview` is a data URL (fresh capture)
// or a Cloudinary URL (already on file); either renders the image. Re-picking
// replaces the current image. Shared by the member's and the nominee's CNIC steps.
const CnicUploadTile = ({ label, required = false, preview, onSelect }) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      toast.error(`Image must be ${MAX_IMAGE_MB} MB or smaller`);
      return;
    }
    try {
      setBusy(true);
      onSelect(await compressImage(file));
    } catch (err) {
      toast.error(err.message || 'Could not process the image');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 transition-all hover:border-primary/50 hover:text-primary dark:border-white/[0.08] dark:bg-white/[0.03]"
        aria-label={`Upload ${label}`}
      >
        {preview ? (
          <img
            src={preview}
            alt={label}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={22} strokeWidth={2.25} />
            <span className="text-xs font-bold">Tap to upload</span>
          </div>
        )}
        {busy ? (
          <span className="absolute inset-0 flex items-center justify-center bg-slate-900/45">
            <Loader2 size={20} className="animate-spin text-white" />
          </span>
        ) : (
          preview && (
            <span className="absolute inset-0 flex items-center justify-center bg-slate-900/45 opacity-0 transition-opacity group-hover:opacity-100">
              <Upload size={20} className="text-white" />
            </span>
          )
        )}
      </button>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[13px] font-bold text-slate-900 dark:text-white">
          {preview && <Check size={14} className="text-emerald-500" />}
          {label} {required && <span className="text-rose-500">*</span>}
        </p>
        {preview?.startsWith('data:') && (
          <span className="shrink-0 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            {formatBytes(dataUrlBytes(preview))}
          </span>
        )}
      </div>
      <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
        JPG or PNG · max {MAX_IMAGE_MB} MB
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
};

export default CnicUploadTile;
