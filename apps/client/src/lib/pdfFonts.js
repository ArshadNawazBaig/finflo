export const PDF_FONT = 'PlusJakartaSans';

let cached = null;
let inflight = null;

const arrayBufferToBase64 = (buf) => {
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunk),
    );
  }
  return btoa(binary);
};

const fetchFont = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load font ${url}: ${res.status}`);
  return arrayBufferToBase64(await res.arrayBuffer());
};

const loadFonts = () => {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = Promise.all([
      fetchFont('/fonts/PlusJakartaSans-Regular.ttf'),
      fetchFont('/fonts/PlusJakartaSans-Italic.ttf'),
      fetchFont('/fonts/PlusJakartaSans-Bold.ttf'),
    ])
      .then(([regular, italic, bold]) => {
        cached = { regular, italic, bold };
        return cached;
      })
      .catch((err) => {
        inflight = null;
        throw err;
      });
  }
  return inflight;
};

export const registerJakartaFonts = async (doc) => {
  try {
    const { regular, italic, bold } = await loadFonts();
    doc.addFileToVFS('PlusJakartaSans-Regular.ttf', regular);
    doc.addFont('PlusJakartaSans-Regular.ttf', PDF_FONT, 'normal');
    doc.addFileToVFS('PlusJakartaSans-Italic.ttf', italic);
    doc.addFont('PlusJakartaSans-Italic.ttf', PDF_FONT, 'italic');
    doc.addFileToVFS('PlusJakartaSans-Bold.ttf', bold);
    doc.addFont('PlusJakartaSans-Bold.ttf', PDF_FONT, 'bold');
    doc.setFont(PDF_FONT, 'normal');
    return PDF_FONT;
  } catch (err) {
    console.warn('[pdfFonts] Falling back to helvetica:', err);
    doc.setFont('helvetica', 'normal');
    return 'helvetica';
  }
};
