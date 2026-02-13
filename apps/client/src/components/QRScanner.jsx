import React, { useEffect } from 'react';
// Force Vite re-bundle: v2
import { Html5QrcodeScanner } from 'html5-qrcode';

const QRScanner = ({ onScanSuccess, onScanError }) => {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner('qr-reader', {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      rememberLastUsedCamera: true,
      supportedScanTypes: [0], // 0: HTML5_QRCODE_SCAN_TYPE_CAMERA
    });

    scanner.render(onScanSuccess, onScanError);

    return () => {
      scanner
        .clear()
        .catch((error) => console.error('Failed to clear scanner', error));
    };
  }, [onScanSuccess, onScanError]);

  return (
    <div className="w-full max-w-md mx-auto overflow-hidden rounded-[2rem] border-2 border-primary/20 bg-card shadow-2xl">
      <div id="qr-reader" className="w-full" />
    </div>
  );
};

export default QRScanner;
