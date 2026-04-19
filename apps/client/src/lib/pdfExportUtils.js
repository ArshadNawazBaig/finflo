import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './utils';
import { savePdf } from './nativeDownload';

// ─── Title Case Helper ──────────────────────────────────────────────────────
// Converts "john doe" or "JOHN DOE" → "John Doe"
export const toTitleCase = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// ─── Business Context Helper ────────────────────────────────────────────────
// Reads business branding data from localStorage (user or member atom).
export const getBusinessContext = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const member = JSON.parse(localStorage.getItem('member') || '{}');
    const session = user && Object.keys(user).length > 0 ? user : member || {};

    return {
      businessName: session.businessName || session.business?.businessName || 'FinFlo',
      businessLogo: session.businessLogo || session.business?.businessLogo || '',
      businessAddress: session.businessAddress || session.business?.businessAddress || '',
      businessStamp: session.businessStamp || session.business?.businessStamp || '',
      ceoSignature: session.ceoSignature || session.business?.ceoSignature || '',
      currency: session.currency || session.business?.currency || 'Rs.',
    };
  } catch {
    return {
      businessName: 'FinFlo',
      businessLogo: '',
      businessAddress: '',
      businessStamp: '',
      ceoSignature: '',
      currency: 'Rs.',
    };
  }
};

// ─── Load Image as Base64 ───────────────────────────────────────────────────
const loadImageAsBase64 = (url) => {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

// ─── Shared PDF Header ──────────────────────────────────────────────────────
// Matches the Meezan Bank statement reference design:
// Logo (top-left) → Business Name below logo → Customer details left, Account details right
// Returns the Y position to start content after the header.
export const renderPdfHeader = async (doc, {
  businessContext = {},
  leftDetails = [],   // Array of { label, value } for left column (customer info)
  rightDetails = [],  // Array of { label, value } for right column (account info)
  title = '',         // Section title below header (e.g. "ACCOUNT SUMMARY")
} = {}) => {
  const pageWidth = doc.internal.pageSize.width;
  const { businessName, businessLogo, businessAddress } = {
    ...getBusinessContext(),
    ...businessContext,
  };

  let currentY = 14;

  // ── Logo (top-left) ──
  const logoBase64 = await loadImageAsBase64(businessLogo);
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 14, currentY, 24, 24);
      currentY += 26;
      // Business Name below logo
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text(businessName, 14, currentY);
      currentY += 5;
      // Tagline / Address below name (like "The Premier Islamic Bank")
      if (businessAddress) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        const addressLines = doc.splitTextToSize(businessAddress, 80);
        doc.text(addressLines, 14, currentY);
        currentY += addressLines.length * 3.5;
      }
    } catch {
      // Fallback to text-only
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text(businessName, 14, currentY + 6);
      currentY += 12;
      if (businessAddress) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text(businessAddress, 14, currentY);
        currentY += 5;
      }
    }
  } else {
    // No logo — render business name as large text header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text(businessName, 14, currentY + 6);
    currentY += 12;
    if (businessAddress) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text(businessAddress, 14, currentY);
      currentY += 5;
    }
  }

  // ── Thin separator line below logo section ──
  currentY += 4;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(14, currentY, pageWidth - 14, currentY);
  currentY += 6;

  // ── Side-by-side: Customer Details (left) | Account Details (right) ──
  if (leftDetails.length > 0 || rightDetails.length > 0) {
    const rightLabelX = pageWidth / 2 + 5; // Where right-side labels start
    const rightValueX = pageWidth - 14;     // Right-aligned values
    const detailStartY = currentY;

    // Left column — Customer name/address style (bold name, normal address lines)
    if (leftDetails.length > 0) {
      let lY = detailStartY;
      leftDetails.forEach(({ label, value }, idx) => {
        if (idx === 0) {
          // First item is the name — render bold and larger
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 30, 30);
          doc.text(String(value || 'N/A'), 14, lY);
          lY += 5;
        } else {
          // Subsequent items — normal text like address lines
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(60, 60, 60);
          doc.text(String(value || 'N/A'), 14, lY);
          lY += 4.5;
        }
      });
    }

    // Right column — "LABEL:    VALUE" format with right-aligned values
    if (rightDetails.length > 0) {
      let rY = detailStartY;
      rightDetails.forEach(({ label, value }) => {
        // Label (bold)
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 30);
        doc.text(label.toUpperCase() + ':', rightLabelX, rY);

        // Value (right-aligned)
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 30, 30);
        doc.text(String(value || 'N/A'), rightValueX, rY, { align: 'right' });
        rY += 5;
      });
    }

    const leftHeight = leftDetails.length > 0 ? 5 + (leftDetails.length - 1) * 4.5 : 0;
    const rightHeight = rightDetails.length * 5;
    currentY = detailStartY + Math.max(leftHeight, rightHeight) + 6;
  }

  // ── Section Title (e.g. "ACCOUNT SUMMARY") ──
  if (title) {
    currentY += 2;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(title.toUpperCase(), 14, currentY);

    // Underline the title
    const titleWidth = doc.getTextWidth(title.toUpperCase());
    currentY += 1.5;
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.5);
    doc.line(14, currentY, 14 + titleWidth, currentY);
    currentY += 6;
  }

  return currentY;
};

// ─── Shared PDF Footer ──────────────────────────────────────────────────────
// Dark purple bar at the bottom with business name, address, and page numbers
export const renderPdfFooter = (doc, { businessContext = {} } = {}) => {
  const { businessName, businessAddress } = {
    ...getBusinessContext(),
    ...businessContext,
  };
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const pageCount = doc.internal.getNumberOfPages();
  const footerHeight = 22;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Dark purple footer band
    doc.setFillColor(64, 53, 100);
    doc.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F');

    // Business Name (centered, bold, white)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(businessName, pageWidth / 2, pageHeight - 15, { align: 'center' });

    // Business Address (centered, normal, light)
    if (businessAddress) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(220, 220, 230);
      doc.text(businessAddress, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    // Page number + disclaimer (very small, light)
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 180, 200);

    const hasSignature = businessContext.ceoSignature;
    const disclaimer = hasSignature
      ? `Page ${i} of ${pageCount}  •  This is a computer-generated statement authorized by ${businessName}.`
      : `Page ${i} of ${pageCount}  •  This is a computer-generated statement and does not require a signature.`;

    doc.text(disclaimer, pageWidth / 2, pageHeight - 4, { align: 'center' });
  }
};

// ─── Shared Signatures & Stamp block ────────────────────────────────────────
// Renders the stamp and CEO signature at the bottom of the page
export const renderPdfSignatures = async (doc, { startY, businessContext = {} } = {}) => {
  const { businessStamp, ceoSignature } = {
    ...getBusinessContext(),
    ...businessContext,
  };

  if (!businessStamp && !ceoSignature) return startY;

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 14;

  // Add some spacing
  let currentY = Math.max(startY + 20, pageHeight - 60);

  // If we're too close to the footer, add a new page
  if (currentY > pageHeight - 40) {
    doc.addPage();
    currentY = 40;
  }

  // Draw lines for signature/stamp
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);

  // CEO Signature (Right side)
  if (ceoSignature) {
    const sigBase64 = await loadImageAsBase64(ceoSignature);
    if (sigBase64) {
      doc.addImage(sigBase64, 'PNG', pageWidth - 64, currentY - 15, 50, 15);
    }
    doc.line(pageWidth - 64, currentY, pageWidth - margin, currentY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text('Authorized Signature (CEO)', pageWidth - 14, currentY + 5, {
      align: 'right',
    });
  }

  // Business Stamp (Left/Center-left side)
  if (businessStamp) {
    const stampBase64 = await loadImageAsBase64(businessStamp);
    if (stampBase64) {
      doc.addImage(stampBase64, 'PNG', margin, currentY - 20, 25, 25);
    }
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text('Official Business Stamp', margin, currentY + 5, {
      align: 'left',
    });
  }

  return currentY + 15;
};

// ═══════════════════════════════════════════════════════════════════════════════
//  EXPORT: Loan Statement
// ═══════════════════════════════════════════════════════════════════════════════
export const exportLoanStatement = async (
  loan,
  repayments = [],
  member = null,
  businessContext = null,
) => {
  if (!loan) return;

  const ctx = businessContext || getBusinessContext();
  const doc = new jsPDF();

  const customerName = toTitleCase(loan.customer?.name || member?.name || 'Unknown');
  const customerContact = loan.customer?.phone || loan.customer?.email || member?.phone || 'N/A';

  const startY = await renderPdfHeader(doc, {
    businessContext: ctx,
    title: 'Loan Account Statement',
    leftDetails: [
      { label: 'Borrower Name', value: customerName },
      { label: 'Contact', value: customerContact },
      { label: 'Loan ID', value: loan.loanId || loan._id?.slice(-6).toUpperCase() },
      { label: 'Status', value: (loan.status || '').toUpperCase() },
    ],
    rightDetails: [
      { label: 'Currency', value: ctx.currency || 'Rs.' },
      { label: 'Statement Date', value: new Date().toLocaleDateString() },
      { label: 'Start Date', value: new Date(loan.startDate || loan.createdAt).toLocaleDateString() },
      { label: 'Duration', value: `${loan.duration} Months` },
    ],
  });

  // ── Financial Summary Table ──
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Loan Financial Summary', 14, startY);

  autoTable(doc, {
    startY: startY + 4,
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
    ],
    theme: 'grid',
    headStyles: { fillColor: [64, 53, 100], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    alternateRowStyles: { fillColor: [250, 250, 255] },
    margin: { left: 14, right: 14 },
  });

  // ── Transaction History ──
  const repaymentY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Transaction History', 14, repaymentY);

  if (repayments && repayments.length > 0) {
    autoTable(doc, {
      startY: repaymentY + 4,
      head: [['Date', 'Description', 'Amount', 'Status']],
      body: repayments.map((rp) => [
        new Date(rp.date).toLocaleDateString(),
        rp.description || 'Loan Repayment',
        `-${formatCurrency(rp.amount)}`,
        'Confirmed',
      ]),
      theme: 'grid',
      headStyles: { fillColor: [64, 53, 100], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 2: { halign: 'right' } },
      alternateRowStyles: { fillColor: [250, 250, 255] },
      margin: { left: 14, right: 14 },
    });
  } else {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text('No transaction records found.', 14, repaymentY + 10);
  }

  const finalY = doc.lastAutoTable?.finalY || repaymentY + 15;
  await renderPdfSignatures(doc, { startY: finalY, businessContext: ctx });

  renderPdfFooter(doc, { businessContext: ctx });

  const fileName = `Statement_${(loan.loanId || loan._id?.slice(-6) || 'LOAN').toUpperCase()}_${(customerName).replace(/\s+/g, '_')}.pdf`;
  await savePdf(doc, fileName);
};

// ═══════════════════════════════════════════════════════════════════════════════
//  EXPORT: Member Statement
// ═══════════════════════════════════════════════════════════════════════════════
export const exportMemberStatement = async (
  member,
  investments = [],
  distributions = [],
  businessContext = null,
) => {
  if (!member) return;

  const ctx = businessContext || getBusinessContext();
  const doc = new jsPDF();

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

  const startY = await renderPdfHeader(doc, {
    businessContext: ctx,
    title: 'Member Account Statement',
    leftDetails: [
      { label: 'Member Name', value: toTitleCase(member.name) || 'Unknown' },
      { label: 'Contact', value: member.phone || member.email || 'N/A' },
      { label: 'CNIC', value: member.cnic || 'N/A' },
      { label: 'Member ID', value: member.memberId || member._id?.slice(-6).toUpperCase() },
    ],
    rightDetails: [
      { label: 'Currency', value: ctx.currency || 'Rs.' },
      { label: 'Statement Date', value: new Date().toLocaleDateString() },
      { label: 'Joined', value: new Date(member.joinDate || member.createdAt).toLocaleDateString() },
      { label: 'Account Type', value: 'Member Account' },
    ],
  });

  // ── Financial Summary ──
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Financial Summary', 14, startY);

  autoTable(doc, {
    startY: startY + 4,
    head: [['Description', 'Amount']],
    body: [
      ['Total Capital Invested', formatCurrency(totalDeposits)],
      ['Total Capital Withdrawn', formatCurrency(totalWithdrawals)],
      ['Total Profits Earned', formatCurrency(totalProfits)],
      ['Net Current Balance', formatCurrency(member.currentBalance || 0)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [64, 53, 100], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    alternateRowStyles: { fillColor: [250, 250, 255] },
    margin: { left: 14, right: 14 },
  });

  // ── Transaction Ledger ──
  const transactions = [
    ...investments.map((inv) => ({
      date: new Date(inv.date),
      type: inv.type === 'deposit' ? 'Capital Deposit' : 'Capital Withdrawal',
      description: inv.description || 'System Entry',
      amount: inv.type === 'withdrawal' ? -inv.amount : inv.amount,
      color: inv.type === 'withdrawal' ? [239, 68, 68] : [59, 130, 246],
    })),
    ...distributions.map((dist) => ({
      date: new Date(dist.distributionDate || dist.createdAt),
      type: dist.type === 'share' ? 'Business Share Profit' : 'Regular Profit',
      description: dist.notes || 'Automated Distribution',
      amount: dist.amount,
      color: [16, 185, 129],
    })),
  ].sort((a, b) => b.date - a.date);

  const ledgerY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Transaction Ledger', 14, ledgerY);

  if (transactions.length > 0) {
    autoTable(doc, {
      startY: ledgerY + 4,
      head: [['Date', 'Type', 'Description', 'Amount']],
      body: transactions.map((t) => [
        t.date.toLocaleDateString(),
        t.type,
        t.description,
        formatCurrency(Math.abs(t.amount)),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [64, 53, 100], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 3: { halign: 'right' } },
      alternateRowStyles: { fillColor: [250, 250, 255] },
      margin: { left: 14, right: 14 },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 3) {
          data.cell.styles.textColor = transactions[data.row.index].color;
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
  } else {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text('No transaction records found.', 14, ledgerY + 10);
  }

  const finalY = doc.lastAutoTable?.finalY || ledgerY + 15;
  await renderPdfSignatures(doc, { startY: finalY, businessContext: ctx });

  renderPdfFooter(doc, { businessContext: ctx });

  const fileName = `Member_Statement_${toTitleCase(member.name || 'User').replace(/\s+/g, '_')}.pdf`;
  await savePdf(doc, fileName);
};

// ═══════════════════════════════════════════════════════════════════════════════
//  EXPORT: Transaction Receipt
// ═══════════════════════════════════════════════════════════════════════════════
export const generateTransactionReceipt = async ({
  member,
  type,
  amount,
  description = '',
  date = new Date(),
  balanceAfter = null,
  referenceId = '',
  accountType = 'current',
  extra = {},
  businessName: _bn,
  businessContext: _bc,
}) => {
  const ctx = _bc || getBusinessContext();
  const doc = new jsPDF({ format: 'a5' });
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

  const startY = await renderPdfHeader(doc, {
    businessContext: ctx,
    title,
    leftDetails: [
      { label: 'Account Holder', value: toTitleCase(member?.name) || 'N/A' },
      { label: 'CNIC', value: member?.cnic || 'N/A' },
    ],
    rightDetails: [
      { label: 'Account #', value: member?.currentAccountNumber || member?.memberId || 'N/A' },
      { label: 'Account Type', value: accountType === 'saving' ? 'Saving Account' : 'Current Account' },
    ],
  });

  // ── Transaction Details ──
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Transaction Details', 14, startY);

  const txDetails = [
    ['Reference', refCode],
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

  Object.entries(extra).forEach(([key, value]) => {
    txDetails.push([key, String(value)]);
  });

  autoTable(doc, {
    startY: startY + 4,
    body: txDetails,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40, textColor: [100, 100, 100] },
      1: { fontStyle: 'bold', halign: 'right' },
    },
    alternateRowStyles: { fillColor: [250, 250, 255] },
    margin: { left: 14, right: 14 },
  });

  const signatureStartY = doc.lastAutoTable?.finalY || 100;
  // For receipts, we place signatures on the same page (A5 has limited space)
  await renderPdfSignatures(doc, { startY: signatureStartY, businessContext: ctx });

  renderPdfFooter(doc, { businessContext: ctx });

  const fileName = `Receipt_${refCode}_${toTitleCase(member?.name || 'TXN').replace(/\s+/g, '_')}.pdf`;
  await savePdf(doc, fileName);
};

// ─── Export Journal PDF ──────────────────────────────────────────────────────
export const exportJournalPDF = async (data, selectedDate, user) => {
  const ctx = getBusinessContext();
  const doc = new jsPDF();
  const { format } = await import('date-fns');

  const reportData = data?.data || [];
  if (!reportData.length) return false;

  const startY = await renderPdfHeader(doc, {
    businessContext: ctx,
    title: 'Daily Transaction Journal',
    leftDetails: [
      { label: 'Generated By', value: toTitleCase(user?.name || 'Teller') },
      { label: 'Report Type', value: 'Transaction Journal' },
    ],
    rightDetails: [
      { label: 'Statement Period', value: selectedDate?.to ? `${format(selectedDate.from, 'MMM dd, yyyy')} - ${format(selectedDate.to, 'MMM dd, yyyy')}` : format(selectedDate.from, 'MMM dd, yyyy') },
      { label: 'Generated On', value: new Date().toLocaleDateString() },
    ],
  });

  // ── Performance Summary ──
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Financial Performance Summary', 14, startY);

  const cashIn = data.summary?.totalIncome || 0;
  const cashOut = data.summary?.totalExpense || 0;
  const netPosition = cashIn - cashOut;

  autoTable(doc, {
    startY: startY + 4,
    head: [['Metric', 'Value']],
    body: [
      ['Total Cash Inflow', formatCurrency(cashIn)],
      ['Total Cash Outflow', `-${formatCurrency(cashOut)}`],
      ['Net Position', formatCurrency(netPosition)],
      ['Total Transactions', reportData.length.toString()],
    ],
    theme: 'grid',
    headStyles: { fillColor: [64, 53, 100], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [100, 100, 100] },
      1: { fontStyle: 'bold', textColor: [0, 0, 0], halign: 'right' },
    },
    alternateRowStyles: { fillColor: [250, 250, 255] },
    margin: { left: 14, right: 14 },
  });

  // ── Transaction Details ──
  const tableY = (doc.lastAutoTable?.finalY || 80) + 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Detailed Transaction Statement', 14, tableY);

  const tableColumn = ['Date & Time', 'Member', 'Category', 'Notes', 'Debit', 'Credit', 'Balance'];
  let cumulativeBalance = 0;
  const tableRows = [...reportData]
    .reverse()
    .map((txn) => {
      const isIn =
        txn.type === 'income' ||
        (txn.category || '').includes('repayment') ||
        (txn.category || '').includes('deposit');

      cumulativeBalance += txn.amount * (isIn ? 1 : -1);

      return [
        format(new Date(txn.date), 'MMM dd, yyyy p'),
        txn.member?.name || '—',
        (txn.category || '').replace(/_/g, ' ').toUpperCase(),
        txn.description || txn.notes || '—',
        !isIn ? `-${formatCurrency(txn.amount)}` : '—',
        isIn ? `+${formatCurrency(txn.amount)}` : '—',
        formatCurrency(cumulativeBalance),
      ];
    })
    .reverse();

  // ── Total Summary Row ──
  tableRows.push([
    {
      content: 'TOTAL SUMMARY',
      colSpan: 4,
      styles: { halign: 'right', fontStyle: 'bold', fillColor: [245, 245, 250] },
    },
    {
      content: `-${formatCurrency(cashOut)}`,
      styles: { halign: 'right', fontStyle: 'bold', textColor: [225, 29, 72] },
    },
    {
      content: `+${formatCurrency(cashIn)}`,
      styles: { halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] },
    },
    {
      content: formatCurrency(netPosition),
      styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 250] },
    },
  ]);

  autoTable(doc, {
    startY: tableY + 4,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [64, 53, 100], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      4: { halign: 'right', fontStyle: 'bold' },
      5: { halign: 'right', fontStyle: 'bold' },
      6: { halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [250, 250, 255] },
    margin: { left: 14, right: 14 },
  });

  const finalY = doc.lastAutoTable?.finalY || tableY + 20;

  await renderPdfSignatures(doc, { startY: finalY, businessContext: ctx });

  renderPdfFooter(doc, { businessContext: ctx });

  const fileName = `Journal_Report_${format(selectedDate.from, 'yyyyMMdd')}.pdf`;
  await savePdf(doc, fileName);
  return true;
};

