const Tesseract = require('tesseract.js');
const pdf = require('pdf-parse');
const os = require('os');

/**
 * Service to handle OCR operations
 */
const ocrService = {
  /**
   * Extract data from an ID card image or PDF
   * @param {Buffer} buffer - Buffer of the file
   * @param {String} mimetype - Original file mimetype
   * @returns {Promise<Object>} Extracted data
   */
  extractIdData: async (buffer, mimetype) => {
    try {
      let text = '';

      if (
        mimetype === 'application/pdf' ||
        buffer.slice(0, 4).toString() === '%PDF'
      ) {
        // Process PDF
        const pdfData = await pdf(buffer);
        text = pdfData.text;
      } else {
        // Process Image with Tesseract
        const {
          data: { text: tesseractText },
        } = await Tesseract.recognize(buffer, 'eng', {
          cachePath: os.tmpdir(),
          logger: (m) => console.log(m),
        });
        text = tesseractText;
      }

      console.log('Raw Extracted Text:', text);

      return ocrService.parseIdText(text);
    } catch (error) {
      console.error('OCR Service Error:', error);
      throw new Error(
        'Failed to process document. Please ensure it is a clear image or PDF.',
      );
    }
  },

  /**
   * Parse raw text to find Name, CNIC, Email, and Phone
   * @param {String} text - Raw extracted text
   * @returns {Object} Parsed data
   */
  parseIdText: (text) => {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // CNIC Regex (Pakistan format: 00000-0000000-0)
    const cnicRegex = /(\d{5}-\d{7}-\d{1})/;
    const cnicMatch = text.match(cnicRegex);

    // Email Regex
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/;
    const emailMatch = text.match(emailRegex);

    // Phone Regex (Multiple formats)
    const phoneRegex = /((\+92|92|0|0092)?\s*3\d{2}\s*[-]?\s*\d{7})/;
    const phoneMatch = text.match(phoneRegex);

    // Basic Name heuristic
    let name = '';
    const nameKeywords = ['Name', 'Full Name', 'Father Name', 'Customer Name'];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (
        nameKeywords.some((kw) => line.toLowerCase().includes(kw.toLowerCase()))
      ) {
        if (line.split(':').length > 1) {
          name = line.split(':')[1].trim();
        } else if (i + 1 < lines.length) {
          // Check if next line is not a keyword itself
          if (
            !nameKeywords.some((kw) =>
              lines[i + 1].toLowerCase().includes(kw.toLowerCase()),
            )
          ) {
            name = lines[i + 1].trim();
          }
        }
        if (name) break;
      }
    }

    // Heuristic for name if not found
    if (!name) {
      const nameCandidateRegex = /^[A-Z][A-Z\s]+$/;
      for (const line of lines) {
        if (
          line.length > 5 &&
          nameCandidateRegex.test(line) &&
          line.split(' ').length >= 2
        ) {
          // Filter out some common non-names found in ID cards
          if (
            !['PAKISTAN', 'IDENTITY', 'NATIONAL', 'CARD'].some((kw) =>
              line.includes(kw),
            )
          ) {
            name = line;
            break;
          }
        }
      }
    }

    return {
      name: name || '',
      cnic: cnicMatch ? cnicMatch[1] : '',
      email: emailMatch ? emailMatch[1].toLowerCase() : '',
      phone: phoneMatch ? phoneMatch[1].replace(/\s+/g, '') : '',
      confidence: 0.85,
      raw: text,
    };
  },
};

module.exports = ocrService;
