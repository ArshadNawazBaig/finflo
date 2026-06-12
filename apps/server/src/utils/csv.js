// Shared CSV generation. Single source of truth so every export (backups,
// accounting export, …) gets the same quoting + formula-injection defense.

// Defuse CSV formula-injection: Excel / Sheets will execute a cell starting with
// `=`, `+`, `-`, `@`, TAB or CR as a formula. Prefix any such cell with a single
// quote so it's treated as text.
const defuseFormula = (s) => {
  // A plain number (incl. negatives/decimals) is data, not a formula — leave it
  // intact so downstream parsers (Excel, QuickBooks, Xero) read it as a number.
  // Without this, a legit amount like "-5000.00" would be quoted and break import.
  if (/^-?\d+(?:\.\d+)?$/.test(s)) return s;
  if (s.length > 0 && /^[=+\-@\t\r]/.test(s)) return `'${s}`;
  return s;
};

/**
 * Convert an array of objects to a CSV string.
 * @param {object[]} data rows
 * @param {(string | {key: string, label: string})[]} fields columns; a string is
 *   both the dotted key path and the header; an object lets the header differ.
 * @returns {string} CSV (header + rows, `\n`-joined), or '' for empty data.
 */
const jsonToCSV = (data, fields) => {
  if (!data || data.length === 0) return '';

  const headers = fields
    .map((f) => (typeof f === 'object' ? f.label : f))
    .join(',');

  const rows = data.map((item) =>
    fields
      .map((field) => {
        const fieldKey = typeof field === 'object' ? field.key : field;
        const value = fieldKey
          .split('.')
          .reduce((obj, key) => obj?.[key], item);
        if (value === null || value === undefined) return '';
        const stringValue = defuseFormula(String(value));
        if (
          stringValue.includes(',') ||
          stringValue.includes('"') ||
          stringValue.includes('\n')
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(','),
  );

  return [headers, ...rows].join('\n');
};

module.exports = { jsonToCSV, defuseFormula };
