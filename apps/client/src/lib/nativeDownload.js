/**
 * Native Download Utility for Capacitor (Android/iOS) apps.
 *
 * On the web, downloads work via anchor elements with `download` attribute.
 * In Capacitor WebViews, that approach is silently ignored. This utility
 * detects the native environment and uses Capacitor Filesystem + Share
 * to save files and present a share/open dialog to the user.
 */
import { Capacitor } from '@capacitor/core';

/**
 * Returns true if the app is running inside a Capacitor native shell.
 */
export const isNativePlatform = () => {
  return Capacitor.isNativePlatform();
};

/**
 * Save a Blob/File to the device and trigger a share dialog (native)
 * or fall back to the normal browser download (web).
 *
 * @param {Blob} blob       - The file content as a Blob
 * @param {string} fileName - The desired file name (e.g., "report.pdf")
 * @param {string} [mimeType] - Optional MIME type override
 */
export const saveFile = async (blob, fileName, mimeType) => {
  if (!isNativePlatform()) {
    // Standard web download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  // Native path: write to cache directory and share
  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');

    // Convert blob to base64
    const base64 = await blobToBase64(blob);

    // Write to cache directory (no special permissions needed)
    const result = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
    });

    // Share the file so the user can save/open it
    await Share.share({
      title: fileName,
      url: result.uri,
      dialogTitle: `Save ${fileName}`,
    });
  } catch (error) {
    console.error('Native file save failed:', error);
    // Last resort: try the web approach anyway
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

/**
 * Save a jsPDF document. Replaces doc.save(fileName) for native compatibility.
 *
 * @param {import('jspdf').jsPDF} doc - The jsPDF document instance
 * @param {string} fileName           - Desired filename (e.g., "statement.pdf")
 */
export const savePdf = async (doc, fileName) => {
  if (!isNativePlatform()) {
    // Normal web: jsPDF's built-in save works fine
    doc.save(fileName);
    return;
  }

  // Native: get the PDF as a blob and use the native save flow
  const pdfBlob = doc.output('blob');
  await saveFile(pdfBlob, fileName, 'application/pdf');
};

/**
 * Convert a Blob to a base64 string (without data URI prefix).
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // reader.result is "data:<mime>;base64,<data>"
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
