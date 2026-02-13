import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatPKR } from './utils';

/**
 * Generates a standardized PDF statement for a loan.
 * @param {Object} loan - The loan object data.
 * @param {Array} repayments - List of repayment records.
 * @param {Object} member - Current member/user data (applies for portal views).
 */
export const exportLoanStatement = async (
  loan,
  repayments = [],
  member = null,
) => {
  if (!loan) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header Logo/App Name
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // Primary Emerald color
  doc.text('ACE WEALTH PORTAL', 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Financial Statement Generated on: ${new Date().toLocaleString()}`,
    14,
    30,
  );
  doc.line(14, 35, pageWidth - 14, 35);

  // Borrower & Loan Info Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Account Information', 14, 45);

  const borrowerInfo = [
    ['Borrower Name', loan.customer?.name || 'Unknown'],
    ['Contact', loan.customer?.phone || loan.customer?.email || 'N/A'],
    ['Loan ID', loan._id.slice(-6).toUpperCase()],
    ['Status', loan.status.toUpperCase()],
  ];

  autoTable(doc, {
    startY: 50,
    body: borrowerInfo,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', width: 40 } },
  });

  // Loan Financial Summary
  const currentY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Loan Financial Summary', 14, currentY);

  autoTable(doc, {
    startY: currentY + 5,
    head: [['Description', 'Detail']],
    body: [
      ['Principal Amount', formatPKR(loan.principal)],
      ['Interest Rate', `${loan.rate}% APR`],
      ['Duration', `${loan.duration} Months`],
      ['Total Repayable', formatPKR(loan.totalAmount)],
      ['Amount Paid', formatPKR(loan.paidAmount || 0)],
      [
        'Outstanding Balance',
        formatPKR(
          loan.remainingAmount || loan.totalAmount - (loan.paidAmount || 0),
        ),
      ],
      [
        'Start Date',
        new Date(loan.startDate || loan.createdAt).toLocaleDateString(),
      ],
    ],
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] }, // Indigo header
    styles: { fontSize: 10 },
  });

  // Repayment Schedule/History
  const repaymentY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Transaction History', 14, repaymentY);

  if (repayments && repayments.length > 0) {
    autoTable(doc, {
      startY: repaymentY + 5,
      head: [['Date', 'Description', 'Amount', 'Status']],
      body: repayments.map((rp) => [
        new Date(rp.date).toLocaleDateString(),
        rp.description || 'Loan Repayment',
        formatPKR(rp.amount),
        'Confirmed',
      ]),
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] }, // Emerald header
      styles: { fontSize: 9 },
      columnStyles: { 2: { halign: 'right' } },
    });
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', ' ');
    doc.setTextColor(150);
    doc.text('No transaction records found.', 14, repaymentY + 12);
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - 25,
      doc.internal.pageSize.height - 10,
    );
    doc.text(
      'This is an electronically generated statement and does not require a signature.',
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' },
    );
  }

  const fileName = `Statement_${loan._id.slice(-6).toUpperCase()}_${(loan.customer?.name || 'Loan').replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
};
