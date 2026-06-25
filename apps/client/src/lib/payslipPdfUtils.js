import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './utils';
import { savePdf } from './nativeDownload';
import { PDF_FONT, registerJakartaFonts } from './pdfFonts';
import {
  renderPdfHeader,
  renderPdfFooter,
  renderPdfSignatures,
  getBusinessContext,
  toTitleCase,
} from './pdfExportUtils';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Generate and download a professional payslip PDF, reusing the shared branded
 * header/footer/signature blocks. Server has no PDF capability — this renders
 * client-side from the JSON returned by GET /api/payroll/payslips/:id.
 *
 * @param {object} payslip - Payslip with populated `employee` and `payrollRun`.
 * @param {object} [business] - { businessName, businessLogo, businessAddress, currency }.
 */
export const exportPayslip = async (payslip, business = null) => {
  if (!payslip) return;

  const ctx = business
    ? { ...getBusinessContext(), ...business }
    : getBusinessContext();
  const doc = new jsPDF();
  await registerJakartaFonts(doc);

  const emp = payslip.employee || {};
  const run = payslip.payrollRun || {};
  const monthLabel = `${MONTHS[(payslip.month || run.month || 1) - 1]} ${payslip.year || run.year || ''}`;
  const employeeName = toTitleCase(emp.name || 'Employee');

  const startY = await renderPdfHeader(doc, {
    businessContext: ctx,
    title: `Payslip — ${monthLabel}`,
    leftDetails: [
      { label: 'Employee', value: employeeName },
      { label: 'Employee ID', value: emp.employeeId || '—' },
      { label: 'Designation', value: emp.designation || '—' },
      { label: 'Department', value: emp.department || '—' },
    ],
    rightDetails: [
      { label: 'Currency', value: ctx.currency || 'Rs.' },
      { label: 'Pay Period', value: monthLabel },
      { label: 'Status', value: (payslip.status || 'draft').toUpperCase() },
      {
        label: 'Bank',
        value: emp.bankName ? toTitleCase(emp.bankName) : '—',
      },
    ],
  });

  const e = payslip.earnings || {};
  const d = payslip.deductions || {};

  // ── Earnings ──
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, 'bold');
  doc.setTextColor(0);
  doc.text('Earnings', 14, startY);

  autoTable(doc, {
    startY: startY + 4,
    head: [['Component', 'Amount']],
    body: [
      ['Basic Salary', formatCurrency(e.basic || 0)],
      ['House Rent Allowance', formatCurrency(e.hra || 0)],
      ['Medical Allowance', formatCurrency(e.medical || 0)],
      ['Transport Allowance', formatCurrency(e.transport || 0)],
      ['Other Allowances', formatCurrency(e.otherAllowances || 0)],
      ['Overtime', formatCurrency(e.overtime || 0)],
      [
        { content: 'Gross Earnings', styles: { fontStyle: 'bold', fillColor: [240, 240, 250] } },
        {
          content: formatCurrency(payslip.gross || 0),
          styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 250] },
        },
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [64, 53, 100], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { font: PDF_FONT, fontSize: 8, cellPadding: 3 },
    columnStyles: { 1: { halign: 'right' } },
    alternateRowStyles: { fillColor: [250, 250, 255] },
    margin: { left: 14, right: 14 },
  });

  // ── Deductions ──
  const dedY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, 'bold');
  doc.setTextColor(0);
  doc.text('Deductions', 14, dedY);

  // Itemise admin-added deduction lines; fall back to the single rolled-up
  // "Other Deductions" number for older payslips with no line items.
  const customLines = (d.customDeductions || []).filter(
    (x) => (x.amount || 0) > 0,
  );
  const otherRows = customLines.length
    ? customLines.map((x) => [
        x.label || 'Deduction',
        formatCurrency(x.amount || 0),
      ])
    : [['Other Deductions', formatCurrency(d.otherDeductions || 0)]];

  autoTable(doc, {
    startY: dedY + 4,
    head: [['Component', 'Amount']],
    body: [
      ['Income Tax', formatCurrency(d.tax || 0)],
      ['Provident Fund', formatCurrency(d.providentFund || 0)],
      ['EOBI', formatCurrency(d.eobi || 0)],
      ['Loan EMI', formatCurrency(d.loanEMI || 0)],
      ['Savings Contribution', formatCurrency(d.savingsContribution || 0)],
      ...otherRows,
      [
        { content: 'Total Deductions', styles: { fontStyle: 'bold', fillColor: [240, 240, 250] } },
        {
          content: formatCurrency(payslip.totalDeductions || 0),
          styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 250] },
        },
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [64, 53, 100], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { font: PDF_FONT, fontSize: 8, cellPadding: 3 },
    columnStyles: { 1: { halign: 'right' } },
    alternateRowStyles: { fillColor: [250, 250, 255] },
    margin: { left: 14, right: 14 },
  });

  // ── Net Pay banner ──
  const netY = doc.lastAutoTable.finalY + 8;
  autoTable(doc, {
    startY: netY,
    body: [
      [
        { content: 'NET PAY', styles: { fontStyle: 'bold', textColor: [255, 255, 255], fillColor: [64, 53, 100] } },
        {
          content: formatCurrency(payslip.netPay || 0),
          styles: { halign: 'right', fontStyle: 'bold', textColor: [255, 255, 255], fillColor: [64, 53, 100], fontSize: 11 },
        },
      ],
    ],
    theme: 'grid',
    styles: { font: PDF_FONT, fontSize: 10, cellPadding: 4 },
    margin: { left: 14, right: 14 },
  });

  const finalY = doc.lastAutoTable?.finalY || netY + 15;
  await renderPdfSignatures(doc, { startY: finalY, businessContext: ctx });
  renderPdfFooter(doc, { businessContext: ctx });

  const fileName = `Payslip_${(emp.employeeId || 'EMP')}_${monthLabel.replace(/\s+/g, '_')}.pdf`;
  await savePdf(doc, fileName);
};
