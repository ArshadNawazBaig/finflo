import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './utils';

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
  doc.text('FINFLO PORTAL', 14, 22);

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
      ['Principal Amount', formatCurrency(loan.principal)],
      ['Interest Rate', `${loan.rate}% APR`],
      ['Duration', `${loan.duration} Months`],
      ['Total Repayable', formatCurrency(loan.totalAmount)],
      ['Amount Paid', formatCurrency(loan.paidAmount || 0)],
      [
        'Outstanding Balance',
        formatCurrency(
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
        formatCurrency(rp.amount),
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

/**
 * Generates a standardized PDF statement for a member.
 * @param {Object} member - The member object data.
 * @param {Array} investments - List of investment records (deposits/withdrawals).
 * @param {Array} distributions - List of profit distribution records.
 */
export const exportMemberStatement = async (
  member,
  investments = [],
  distributions = [],
) => {
  if (!member) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header Logo/App Name
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // Primary Emerald color
  doc.text('FINFLO PORTAL', 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Financial Statement Generated on: ${new Date().toLocaleString()}`,
    14,
    30,
  );
  doc.line(14, 35, pageWidth - 14, 35);

  // Member Info Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Member Information', 14, 45);

  const memberInfo = [
    ['Name', member.name || 'Unknown'],
    ['Contact', member.phone || member.email || 'N/A'],
    ['Member ID', member.memberId || member._id.slice(-6).toUpperCase()],
    [
      'Joined',
      new Date(member.joinDate || member.createdAt).toLocaleDateString(),
    ],
  ];

  autoTable(doc, {
    startY: 50,
    body: memberInfo,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', width: 40 } },
  });

  // Calculate Financials
  const totalDeposits = investments
    .filter((inv) => inv.type === 'deposit')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalWithdrawals = investments
    .filter((inv) => inv.type === 'withdrawal')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalProfits = distributions.reduce(
    (sum, dist) => sum + dist.amount,
    0,
  );

  // Financial Summary
  const currentY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Financial Summary', 14, currentY);

  autoTable(doc, {
    startY: currentY + 5,
    head: [['Description', 'Amount']],
    body: [
      ['Total Capital Invested', formatCurrency(totalDeposits)],
      ['Total Capital Withdrawn', formatCurrency(totalWithdrawals)],
      ['Total Profits Earned', formatCurrency(totalProfits)],
      ['Net Current Balance', formatCurrency(member.currentBalance || 0)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] }, // Indigo header
    styles: { fontSize: 10 },
  });

  // Prepare combined transaction ledger
  const transactions = [
    ...investments.map((inv) => ({
      date: new Date(inv.date),
      type: inv.type === 'deposit' ? 'Capital Deposit' : 'Capital Withdrawal',
      description: inv.description || 'System Entry',
      amount: inv.type === 'withdrawal' ? -inv.amount : inv.amount,
      color: inv.type === 'withdrawal' ? [239, 68, 68] : [59, 130, 246], // Red, Blue
    })),
    ...distributions.map((dist) => ({
      date: new Date(dist.distributionDate || dist.createdAt),
      type: dist.type === 'share' ? 'Business Share Profit' : 'Regular Profit',
      description: dist.notes || 'Automated Distribution',
      amount: dist.amount,
      color: [16, 185, 129], // Emerald
    })),
  ].sort((a, b) => b.date - a.date); // Sort newest first

  // Transaction Ledger
  const ledgerY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Transaction Ledger', 14, ledgerY);

  if (transactions.length > 0) {
    autoTable(doc, {
      startY: ledgerY + 5,
      head: [['Date', 'Type', 'Description', 'Amount']],
      body: transactions.map((t) => [
        t.date.toLocaleDateString(),
        t.type,
        t.description,
        formatCurrency(Math.abs(t.amount)),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] }, // Emerald header
      styles: { fontSize: 9 },
      columnStyles: { 3: { halign: 'right' } },
      didParseCell: function (data) {
        // Color amount text based on type
        if (data.section === 'body' && data.column.index === 3) {
          data.cell.styles.textColor = transactions[data.row.index].color;
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', ' ');
    doc.setTextColor(150);
    doc.text('No transaction records found.', 14, ledgerY + 12);
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

  const fileName = `Member_Statement_${(member.name || 'User').replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
};

/**
 * Generates a professional PDF receipt/voucher for any financial transaction.
 * @param {Object} options - Receipt configuration.
 * @param {Object} options.member - Member object { name, email, phone, cnic, memberId, currentAccountNumber }.
 * @param {string} options.type - Transaction type: 'deposit', 'withdrawal', 'repayment', 'checkbook_fee', 'transfer_send', 'transfer_receive', 'late_fee', 'share_deposit', 'share_withdrawal'.
 * @param {number} options.amount - Transaction amount.
 * @param {string} [options.description] - Transaction description.
 * @param {Date|string} [options.date] - Transaction date.
 * @param {number} [options.balanceAfter] - Balance after transaction.
 * @param {string} [options.referenceId] - Transaction reference ID.
 * @param {string} [options.accountType] - 'current' or 'saving'.
 * @param {Object} [options.extra] - Extra fields to display (key-value pairs).
 * @param {string} [options.businessName] - Business/platform name.
 */
export const generateTransactionReceipt = ({
  member,
  type,
  amount,
  description = '',
  date = new Date(),
  balanceAfter = null,
  referenceId = '',
  accountType = 'current',
  extra = {},
  businessName = 'FinFlo',
}) => {
  const doc = new jsPDF({ format: 'a5' });
  const pageWidth = doc.internal.pageSize.width;
  const txDate = new Date(date);
  const refCode = referenceId
    ? referenceId.toString().slice(-8).toUpperCase()
    : `TXN-${Date.now().toString(36).toUpperCase()}`;

  const typeLabels = {
    deposit: 'Deposit Receipt',
    withdrawal: 'Withdrawal Receipt',
    repayment: 'Loan Repayment Receipt',
    checkbook_fee: 'Checkbook Fee Receipt',
    transfer_send: 'Fund Transfer Receipt',
    transfer_receive: 'Fund Received Receipt',
    late_fee: 'Late Fee Receipt',
    share_deposit: 'Share Investment Receipt',
    share_withdrawal: 'Share Withdrawal Receipt',
    profit: 'Profit Distribution Receipt',
  };

  const title = typeLabels[type] || 'Transaction Receipt';

  // ── Header ─────────────────────────────────────────────────────────────
  doc.setFillColor(79, 70, 229); // Indigo
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(businessName.toUpperCase(), 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Official Transaction Receipt', 14, 22);

  doc.setFontSize(8);
  doc.text(`Ref: ${refCode}`, pageWidth - 14, 14, { align: 'right' });
  doc.text(
    txDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    pageWidth - 14,
    22,
    { align: 'right' },
  );

  // ── Title Bar ──────────────────────────────────────────────────────────
  doc.setFillColor(245, 245, 255);
  doc.rect(0, 32, pageWidth, 14, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text(title.toUpperCase(), pageWidth / 2, 41, { align: 'center' });

  // ── Member Info ────────────────────────────────────────────────────────
  let y = 56;
  doc.setTextColor(0);

  const memberInfo = [
    ['Account Holder', member?.name || 'N/A'],
    ['Account #', member?.currentAccountNumber || member?.memberId || 'N/A'],
    ['CNIC', member?.cnic || 'N/A'],
    ['Account Type', accountType === 'saving' ? 'Saving Account' : 'Current Account'],
  ];

  autoTable(doc, {
    startY: y,
    body: memberInfo,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35, textColor: [100, 100, 100] },
      1: { fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  // ── Transaction Details ────────────────────────────────────────────────
  y = doc.lastAutoTable.finalY + 8;
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);

  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Transaction Details', 14, y);

  const txDetails = [
    ['Transaction Type', title.replace(' Receipt', '')],
    ['Amount', formatCurrency(amount)],
    ['Date', txDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })],
  ];

  if (description) {
    txDetails.push(['Description', description]);
  }

  if (balanceAfter !== null && balanceAfter !== undefined) {
    txDetails.push(['Balance After', formatCurrency(balanceAfter)]);
  }

  // Add any extra fields
  Object.entries(extra).forEach(([key, value]) => {
    txDetails.push([key, String(value)]);
  });

  autoTable(doc, {
    startY: y + 4,
    body: txDetails,
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { fontStyle: 'bold', halign: 'right' },
    },
    alternateRowStyles: { fillColor: [248, 248, 255] },
    margin: { left: 14, right: 14 },
  });

  // ── Amount Highlight Box ───────────────────────────────────────────────
  y = doc.lastAutoTable.finalY + 8;
  const isCredit = ['deposit', 'transfer_receive', 'profit', 'share_deposit'].includes(type);

  doc.setFillColor(isCredit ? 16 : 239, isCredit ? 185 : 68, isCredit ? 129 : 68);
  doc.roundedRect(14, y, pageWidth - 28, 20, 3, 3, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text(isCredit ? 'AMOUNT CREDITED' : 'AMOUNT DEBITED', 20, y + 8);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(amount), pageWidth - 20, y + 14, { align: 'right' });

  // ── Footer ─────────────────────────────────────────────────────────────
  const pageHeight = doc.internal.pageSize.height;

  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(14, pageHeight - 30, pageWidth - 14, pageHeight - 30);

  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'This is a computer-generated receipt and does not require a physical signature.',
    pageWidth / 2,
    pageHeight - 22,
    { align: 'center' },
  );
  doc.text(
    `${businessName} • Generated on ${new Date().toLocaleString()}`,
    pageWidth / 2,
    pageHeight - 16,
    { align: 'center' },
  );
  doc.text(`Reference: ${refCode}`, pageWidth / 2, pageHeight - 10, {
    align: 'center',
  });

  const fileName = `Receipt_${refCode}_${(member?.name || 'TXN').replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
};
