// Client-side image helpers shared by the onboarding upload steps (member CNIC,
// nominee CNIC). Compression keeps the base64 payload well under the server's
// 10mb JSON limit and speeds up the Cloudinary upload.

// Max size of an original picked file (before compression), in MB.
export const MAX_IMAGE_MB = 10;

// Resize + re-encode a picked image File to a bounded JPEG data URL. Phone photos
// can be several MB; capping the longest edge keeps the upload small.
export const compressImage = (file, maxDim = 1600, quality = 0.85) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not read the image'));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

// Byte size of a base64 data URL (what actually gets uploaded).
export const dataUrlBytes = (dataUrl) => {
  const base64 = dataUrl.split(',')[1] || '';
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
};

export const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
