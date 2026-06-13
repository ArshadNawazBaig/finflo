import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './utils';
import { isCreditType } from './transactionDirection';
import { savePdf } from './nativeDownload';
import { PDF_FONT, registerJakartaFonts } from './pdfFonts';

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

// ─── Member Context Helper ──────────────────────────────────────────────────
// Reads member details from localStorage as a fallback when the passed member
// object is missing fields (e.g. during mobile PDF downloads where the member
// atom may only contain login-response fields).
export const getMemberContext = (passedMember = null) => {
  try {
    const stored = JSON.parse(localStorage.getItem('member') || '{}');
    // Merge: passed member takes priority, then stored atom data
    const m = { ...stored, ...passedMember };
    return {
      name: m.name || m.customer?.name || '',
      cnic: m.cnic || m.customer?.cnic || '',
      phone: m.phone || m.customer?.phone || '',
      email: m.email || m.customer?.email || '',
      memberId: m.memberId || m._id?.slice?.(-6)?.toUpperCase?.() || '',
      currentAccountNumber: m.currentAccountNumber || m.customer?.currentAccountNumber || '',
      savingAccountNumber: m.savingAccountNumber || m.customer?.savingAccountNumber || '',
      currentBalance: m.currentBalance ?? 0,
    };
  } catch {
    const m = passedMember || {};
    return {
      name: m.name || '',
      cnic: m.cnic || '',
      phone: m.phone || '',
      email: m.email || '',
      memberId: m.memberId || m._id?.slice?.(-6)?.toUpperCase?.() || '',
      currentAccountNumber: m.currentAccountNumber || '',
      savingAccountNumber: m.savingAccountNumber || '',
      currentBalance: m.currentBalance ?? 0,
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

  // Helper to get image dimensions
  const getDims = (base64) => new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve({ w: img.width, h: img.height });
    img.onerror = () => resolve({ w: 1, h: 1 });
    img.src = base64;
  });

  // ── Logo (top-left) ──
  const logoBase64 = await loadImageAsBase64(businessLogo);
  if (logoBase64) {
    try {
      const dims = await getDims(logoBase64);
      const ratio = dims.w / dims.h;
      const maxHeightMm = 21.16; // ~80px max height
      let renderH = maxHeightMm;
      let renderW = renderH * ratio;
      // Cap width to prevent overlapping right side
      if (renderW > 60) {
        renderW = 60;
        renderH = renderW / ratio;
      }
      doc.addImage(logoBase64, 'PNG', 14, currentY, renderW, renderH);
      currentY += renderH + 2;
      // Business Name below logo
      doc.setFontSize(10);
      doc.setFont(PDF_FONT, 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text(businessName, 14, currentY);
      currentY += 5;
      // Tagline / Address below name (like "The Premier Islamic Bank")
      if (businessAddress) {
        doc.setFontSize(6.5);
        doc.setFont(PDF_FONT, 'italic');
        doc.setTextColor(100, 100, 100);
        const addressLines = doc.splitTextToSize(businessAddress, 80);
        doc.text(addressLines, 14, currentY);
        currentY += addressLines.length * 3.5;
      }
    } catch {
      // Fallback to text-only
      doc.setFontSize(14);
      doc.setFont(PDF_FONT, 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text(businessName, 14, currentY + 6);
      currentY += 12;
      if (businessAddress) {
        doc.setFontSize(6.5);
        doc.setFont(PDF_FONT, 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text(businessAddress, 14, currentY);
        currentY += 5;
      }
    }
  } else {
    // No logo — render business name as large text header
    doc.setFontSize(14);
    doc.setFont(PDF_FONT, 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text(businessName, 14, currentY + 6);
    currentY += 12;
    if (businessAddress) {
      doc.setFontSize(6.5);
      doc.setFont(PDF_FONT, 'italic');
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
          doc.setFontSize(9);
          doc.setFont(PDF_FONT, 'bold');
          doc.setTextColor(30, 30, 30);
          doc.text(String(value || '—'), 14, lY);
          lY += 5;
        } else {
          // Subsequent items — normal text like address lines
          doc.setFontSize(7.5);
          doc.setFont(PDF_FONT, 'normal');
          doc.setTextColor(60, 60, 60);
          doc.text(String(value || '—'), 14, lY);
          lY += 4.5;
        }
      });
    }

    // Right column — "LABEL:    VALUE" format with right-aligned values
    if (rightDetails.length > 0) {
      let rY = detailStartY;
      rightDetails.forEach(({ label, value }) => {
        // Label (bold)
        doc.setFontSize(7.5);
        doc.setFont(PDF_FONT, 'bold');
        doc.setTextColor(30, 30, 30);
        doc.text(label.toUpperCase() + ':', rightLabelX, rY);

        // Value (right-aligned)
        doc.setFontSize(7.5);
        doc.setFont(PDF_FONT, 'normal');
        doc.setTextColor(30, 30, 30);
        doc.text(String(value || '—'), rightValueX, rY, { align: 'right' });
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
    doc.setFontSize(10);
    doc.setFont(PDF_FONT, 'bold');
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
    doc.setFontSize(8);
    doc.setFont(PDF_FONT, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(businessName, pageWidth / 2, pageHeight - 15, { align: 'center' });

    // Business Address (centered, normal, light)
    if (businessAddress) {
      doc.setFontSize(6.5);
      doc.setFont(PDF_FONT, 'italic');
      doc.setTextColor(220, 220, 230);
      doc.text(businessAddress, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    // Page number + disclaimer (very small, light)
    doc.setFontSize(5.5);
    doc.setFont(PDF_FONT, 'normal');
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

  const getDims = (base64) => new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve({ w: img.width, h: img.height });
    img.onerror = () => resolve({ w: 1, h: 1 });
    img.src = base64;
  });

  const maxHeightMm = 13.23; // ~50px max height

  // CEO Signature (Right side)
  if (ceoSignature) {
    const sigBase64 = await loadImageAsBase64(ceoSignature);
    if (sigBase64) {
      const dims = await getDims(sigBase64);
      const ratio = dims.w / dims.h;
      let renderH = maxHeightMm;
      let renderW = renderH * ratio;
      // Cap width to prevent it from overlapping text/stamp
      if (renderW > 50) {
        renderW = 50;
        renderH = renderW / ratio;
      }
      doc.addImage(sigBase64, 'PNG', pageWidth - margin - renderW, currentY - renderH, renderW, renderH);
    }
    doc.line(pageWidth - 64, currentY, pageWidth - margin, currentY);
    doc.setFontSize(7.5);
    doc.setFont(PDF_FONT, 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text('Authorized Signature (CEO)', pageWidth - 14, currentY + 5, {
      align: 'right',
    });
  }

  // Business Stamp (Left/Center-left side)
  if (businessStamp) {
    const stampBase64 = await loadImageAsBase64(businessStamp);
    if (stampBase64) {
      const dims = await getDims(stampBase64);
      const ratio = dims.w / dims.h;
      let renderH = maxHeightMm;
      let renderW = renderH * ratio;
      if (renderW > 40) {
        renderW = 40;
        renderH = renderW / ratio;
      }
      // Draw stamp resting on the baseline
      doc.addImage(stampBase64, 'PNG', margin, currentY - renderH, renderW, renderH);
    }
    doc.setFontSize(7.5);
    doc.setFont(PDF_FONT, 'bold');
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
  const mCtx = getMemberContext(member);
  const doc = new jsPDF();
  await registerJakartaFonts(doc);

  const customerName = toTitleCase(loan.customer?.name || mCtx.name || 'Valued Customer');
  const customerContact = loan.customer?.phone || loan.customer?.email || mCtx.phone || mCtx.email || '—';

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
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, 'bold');
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
    headStyles: { fillColor: [64, 53, 100], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { font: PDF_FONT, fontSize: 8, cellPadding: 3 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    alternateRowStyles: { fillColor: [250, 250, 255] },
    margin: { left: 14, right: 14 },
  });

  // ── Transaction History ──
  const repaymentY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, 'bold');
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
      headStyles: { fillColor: [64, 53, 100], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      styles: { font: PDF_FONT, fontSize: 8, cellPadding: 3 },
      columnStyles: { 2: { halign: 'right' } },
      alternateRowStyles: { fillColor: [250, 250, 255] },
      margin: { left: 14, right: 14 },
    });
  } else {
    doc.setFontSize(8);
    doc.setFont(PDF_FONT, 'normal');
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
  const mCtx = getMemberContext(member);
  const doc = new jsPDF();
  await registerJakartaFonts(doc);

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
      { label: 'Member Name', value: toTitleCase(mCtx.name) || 'Valued Member' },
      { label: 'Contact', value: mCtx.phone || mCtx.email || '—' },
      { label: 'CNIC', value: mCtx.cnic || '—' },
      { label: 'Member ID', value: mCtx.memberId || member._id?.slice(-6).toUpperCase() },
    ],
    rightDetails: [
      { label: 'Currency', value: ctx.currency || 'Rs.' },
      { label: 'Statement Date', value: new Date().toLocaleDateString() },
      { label: 'Joined', value: new Date(member.joinDate || member.createdAt).toLocaleDateString() },
      { label: 'Account Type', value: 'Member Account' },
    ],
  });

  // ── Financial Summary ──
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, 'bold');
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
    headStyles: { fillColor: [64, 53, 100], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { font: PDF_FONT, fontSize: 8, cellPadding: 3 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    alternateRowStyles: { fillColor: [250, 250, 255] },
    margin: { left: 14, right: 14 },
  });

  // ── Transaction Ledger ──
  const transactions = [
    ...investments.map((inv) => {
      // Sign follows the actual wallet movement (see lib/transactionDirection):
      // loan disbursements / received transfers are inflows (+), not withdrawals.
      const credit = isCreditType(inv.type);
      return {
        date: new Date(inv.date),
        type: TX_TYPE_LABELS[inv.type] || (credit ? 'Credit' : 'Debit'),
        description: inv.description || 'System Entry',
        amount: credit ? inv.amount : -inv.amount,
        color: credit ? [59, 130, 246] : [239, 68, 68],
      };
    }),
    ...distributions.map((dist) => ({
      date: new Date(dist.distributionDate || dist.createdAt),
      type: dist.type === 'share' ? 'Business Share Profit' : 'Regular Profit',
      description: dist.notes || 'Automated Distribution',
      amount: dist.amount,
      color: [16, 185, 129],
    })),
  ].sort((a, b) => b.date - a.date);

  const ledgerY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, 'bold');
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
      headStyles: { fillColor: [64, 53, 100], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      styles: { font: PDF_FONT, fontSize: 8, cellPadding: 3 },
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
    doc.setFontSize(8);
    doc.setFont(PDF_FONT, 'normal');
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
//  EXPORT: Account Statement (Current / Saving)
// ═══════════════════════════════════════════════════════════════════════════════
// Generalized monthly statement for a single member account. Expects the
// payload shape returned by GET /api/members/:id/account-statement (or the
// /portal/account-statement variant): { account, period, opening, closing,
// totals, transactions }.
const TX_TYPE_LABELS = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  transfer_send: 'Transfer Out',
  transfer_receive: 'Transfer In',
  external_send: 'Bank Transfer Out',
  external_receive: 'Bank Transfer In',
  p2p_send: 'Transfer Out',
  p2p_receive: 'Transfer In',
  profit: 'Profit Credit',
  loan_disbursement: 'Loan Disbursement',
};

export const exportAccountStatement = async (
  statement,
  member = null,
  businessContext = null,
) => {
  if (!statement || !statement.account) return;

  const ctx = businessContext || getBusinessContext();
  const mCtx = getMemberContext(member);
  const doc = new jsPDF();
  await registerJakartaFonts(doc);

  const { account, period, opening, closing, totals, transactions = [] } = statement;
  const periodFrom = new Date(period.from);
  const periodTo = new Date(period.to);

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

  const accountLabel = account.type === 'saving' ? 'Saving Account' : 'Current Account';
  const holderName = toTitleCase(account.holderName || mCtx.name || 'Valued Member');

  const startY = await renderPdfHeader(doc, {
    businessContext: ctx,
    title: `${accountLabel} Statement`,
    leftDetails: [
      { label: 'Account Holder', value: holderName },
      { label: 'CNIC', value: mCtx.cnic || '—' },
      { label: 'Contact', value: mCtx.phone || mCtx.email || '—' },
      { label: 'Member ID', value: mCtx.memberId || '—' },
    ],
    rightDetails: [
      { label: 'Currency', value: ctx.currency || 'Rs.' },
      { label: 'Account Type', value: accountLabel },
      { label: 'Account #', value: account.number || '—' },
      { label: 'Statement Period', value: `${fmtDate(periodFrom)} — ${fmtDate(periodTo)}` },
    ],
  });

  // ── Balance Summary ──
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, 'bold');
  doc.setTextColor(0);
  doc.text('Balance Summary', 14, startY);

  autoTable(doc, {
    startY: startY + 4,
    head: [['Description', 'Amount']],
    body: [
      ['Opening Balance', formatCurrency(opening)],
      ['Total Credits', `+${formatCurrency(totals?.credits || 0)}`],
      ['Total Debits', `-${formatCurrency(totals?.debits || 0)}`],
      ['Net Movement', formatCurrency(totals?.net || 0)],
      ['Closing Balance', formatCurrency(closing)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [64, 53, 100], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { font: PDF_FONT, fontSize: 8, cellPadding: 3 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    alternateRowStyles: { fillColor: [250, 250, 255] },
    margin: { left: 14, right: 14 },
  });

  // ── Transaction Ledger ──
  const ledgerY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, 'bold');
  doc.setTextColor(0);
  doc.text('Transaction Ledger', 14, ledgerY);

  if (transactions.length > 0) {
    autoTable(doc, {
      startY: ledgerY + 4,
      head: [['Date', 'Type', 'Description', 'Debit', 'Credit', 'Balance']],
      body: [
        // Opening balance row
        [
          {
            content: fmtDate(periodFrom),
            styles: { fontStyle: 'italic', textColor: [100, 100, 100] },
          },
          { content: 'Opening Balance', colSpan: 4, styles: { fontStyle: 'italic', textColor: [100, 100, 100] } },
          { content: formatCurrency(opening), styles: { halign: 'right', fontStyle: 'bold' } },
        ],
        ...transactions.map((t) => [
          fmtDate(t.date),
          TX_TYPE_LABELS[t.type] || t.type,
          t.description || '—',
          t.direction === 'debit' ? `-${formatCurrency(t.amount)}` : '—',
          t.direction === 'credit' ? `+${formatCurrency(t.amount)}` : '—',
          formatCurrency(t.balanceAfter),
        ]),
        // Closing balance row
        [
          {
            content: fmtDate(periodTo),
            styles: { fontStyle: 'italic', fillColor: [240, 240, 250] },
          },
          {
            content: 'Closing Balance',
            colSpan: 4,
            styles: { fontStyle: 'bold', fillColor: [240, 240, 250] },
          },
          {
            content: formatCurrency(closing),
            styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 250] },
          },
        ],
      ],
      theme: 'grid',
      headStyles: { fillColor: [64, 53, 100], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      styles: { font: PDF_FONT, fontSize: 8, cellPadding: 3 },
      columnStyles: {
        3: { halign: 'right', textColor: [225, 29, 72] },
        4: { halign: 'right', textColor: [16, 185, 129] },
        5: { halign: 'right', fontStyle: 'bold' },
      },
      alternateRowStyles: { fillColor: [250, 250, 255] },
      margin: { left: 14, right: 14 },
    });
  } else {
    doc.setFontSize(8);
    doc.setFont(PDF_FONT, 'normal');
    doc.setTextColor(150);
    doc.text('No transactions in the selected period.', 14, ledgerY + 10);
  }

  const finalY = doc.lastAutoTable?.finalY || ledgerY + 15;
  await renderPdfSignatures(doc, { startY: finalY, businessContext: ctx });
  renderPdfFooter(doc, { businessContext: ctx });

  const periodTag = `${periodFrom.getFullYear()}${String(periodFrom.getMonth() + 1).padStart(2, '0')}`;
  const accTag = (account.number || account.type).toString().replace(/\s+/g, '');
  const fileName = `Statement_${accTag}_${periodTag}_${holderName.replace(/\s+/g, '_')}.pdf`;
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
  const mCtx = getMemberContext(member);
  const doc = new jsPDF({ format: 'a5' });
  await registerJakartaFonts(doc);
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
      { label: 'Account Holder', value: toTitleCase(mCtx.name) || 'Valued Member' },
      { label: 'CNIC', value: mCtx.cnic || mCtx.phone || mCtx.email || '—' },
    ],
    rightDetails: [
      { label: 'Account #', value: mCtx.currentAccountNumber || mCtx.memberId || '—' },
      { label: 'Account Type', value: accountType === 'saving' ? 'Saving Account' : 'Current Account' },
    ],
  });

  // ── Transaction Details ──
  doc.setFontSize(9);
  doc.setFont(PDF_FONT, 'bold');
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
    styles: { font: PDF_FONT, fontSize: 8, cellPadding: 3 },
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

  const fileName = `Receipt_${refCode}_${toTitleCase(mCtx.name || 'TXN').replace(/\s+/g, '_')}.pdf`;
  await savePdf(doc, fileName);
};

// ═══════════════════════════════════════════════════════════════════════════════
//  EXPORT: End-of-Day Close Report
// ═══════════════════════════════════════════════════════════════════════════════
// Comprehensive daily-close PDF. Combines cash position summary, denomination
// breakdown, variance line, and the full list of cash transactions for the
// day. Designed for re-print from the persisted DailyClose record — so it
// also works as an audit document long after the day was closed.
const EOD_DENOMS = [5000, 1000, 500, 100, 50, 20, 10, 5, 2, 1];

export const exportEndOfDayReport = async ({
  close,
  transactions = [],
  branchName = null,
  user = null,
  businessContext = null,
}) => {
  if (!close) return;
  const ctx = businessContext || getBusinessContext();
  const doc = new jsPDF();
  await registerJakartaFonts(doc);
  const { format } = await import('date-fns');

  const closeDate = new Date(close.date);
  const closedAt = close.closedAt ? new Date(close.closedAt) : new Date();
  const closedByName =
    close.closedByName ||
    close.closedBy?.name ||
    user?.name ||
    'Teller';

  const variance = Math.round(close.variance ?? 0);
  const varianceLabel =
    variance === 0 ? 'BALANCED' : variance > 0 ? 'OVER' : 'SHORT';
  const varianceColor =
    variance === 0 ? [16, 185, 129] : variance > 0 ? [37, 99, 235] : [225, 29, 72];

  const startY = await renderPdfHeader(doc, {
    businessContext: ctx,
    title: 'End-of-Day Close Report',
    leftDetails: [
      { label: 'Closed By', value: toTitleCase(closedByName) },
      { label: 'Branch', value: branchName || '— All Branches —' },
      { label: 'Report Type', value: 'Daily Cash Close' },
    ],
    rightDetails: [
      { label: 'Business Date', value: format(closeDate, 'MMMM dd, yyyy') },
      { label: 'Closed At', value: format(closedAt, 'MMM dd, yyyy hh:mm a') },
      { label: 'Currency', value: ctx.currency || 'Rs.' },
    ],
  });

  // ── Cash Position Summary ──
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, 'bold');
  doc.setTextColor(0);
  doc.text('Cash Position Summary', 14, startY);

  autoTable(doc, {
    startY: startY + 4,
    head: [['Description', 'Amount']],
    body: [
      ['Opening Cash', formatCurrency(close.openingCash || 0)],
      ['Total Cash In', `+${formatCurrency(close.cashIn || 0)}`],
      ['Total Cash Out', `-${formatCurrency(close.cashOut || 0)}`],
      ['Expected Closing (System)', formatCurrency(close.expectedClosing || 0)],
      ['Counted Closing (Physical)', formatCurrency(close.countedClosing || 0)],
      [
        {
          content: `Variance (${varianceLabel})`,
          styles: { fontStyle: 'bold', textColor: varianceColor },
        },
        {
          content: `${variance > 0 ? '+' : ''}${formatCurrency(variance)}`,
          styles: {
            halign: 'right',
            fontStyle: 'bold',
            textColor: varianceColor,
          },
        },
      ],
      ['Cash Transactions Recorded', String(close.transactionCount ?? transactions.length)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [64, 53, 100], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { font: PDF_FONT, fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [100, 100, 100] },
      1: { halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [250, 250, 255] },
    margin: { left: 14, right: 14 },
  });

  // ── Denomination Breakdown ──
  const denomY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, 'bold');
  doc.setTextColor(0);
  doc.text('Denomination Breakdown', 14, denomY);

  const denomRows = EOD_DENOMS.map((d) => {
    const count = Number(close.denominations?.[`d${d}`] || 0);
    const subtotal = count * d;
    return [
      `Rs. ${d.toLocaleString()}`,
      String(count),
      formatCurrency(subtotal),
    ];
  });
  const denomTotal = EOD_DENOMS.reduce(
    (sum, d) => sum + d * Number(close.denominations?.[`d${d}`] || 0),
    0,
  );
  denomRows.push([
    { content: 'Total Counted', styles: { fontStyle: 'bold', fillColor: [240, 240, 250] } },
    { content: '', styles: { fillColor: [240, 240, 250] } },
    {
      content: formatCurrency(denomTotal),
      styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 250] },
    },
  ]);

  autoTable(doc, {
    startY: denomY + 4,
    head: [['Denomination', 'Count', 'Subtotal']],
    body: denomRows,
    theme: 'grid',
    headStyles: { fillColor: [64, 53, 100], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { font: PDF_FONT, fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [250, 250, 255] },
    margin: { left: 14, right: 14 },
  });

  // ── Variance Notes ──
  if (close.notes) {
    const notesY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFont(PDF_FONT, 'bold');
    doc.setTextColor(0);
    doc.text('Notes', 14, notesY);
    doc.setFontSize(8);
    doc.setFont(PDF_FONT, 'normal');
    doc.setTextColor(60, 60, 60);
    const wrapped = doc.splitTextToSize(close.notes, doc.internal.pageSize.width - 28);
    doc.text(wrapped, 14, notesY + 5);
  }

  // ── Transaction Ledger ──
  if (transactions.length > 0) {
    const tableY = (doc.lastAutoTable?.finalY || denomY + 60) + 10;
    doc.setFontSize(10);
    doc.setFont(PDF_FONT, 'bold');
    doc.setTextColor(0);
    doc.text('Cash Transaction Detail', 14, tableY);

    const rows = transactions.map((txn) => {
      const isIn =
        txn.type === 'income' ||
        txn.type === 'credit' ||
        (txn.category || '').includes('deposit') ||
        (txn.category || '').includes('repayment') ||
        (txn.category || '') === 'investment';
      return [
        format(new Date(txn.date || txn.createdAt), 'hh:mm a'),
        txn.member?.name || '—',
        (txn.category || '').replace(/_/g, ' ').toUpperCase(),
        txn.description || txn.notes || '—',
        !isIn ? `-${formatCurrency(txn.amount)}` : '—',
        isIn ? `+${formatCurrency(txn.amount)}` : '—',
      ];
    });

    autoTable(doc, {
      startY: tableY + 4,
      head: [['Time', 'Member', 'Category', 'Description', 'Cash Out', 'Cash In']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [64, 53, 100], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      styles: { font: PDF_FONT, fontSize: 7.5, cellPadding: 3 },
      columnStyles: {
        4: { halign: 'right', fontStyle: 'bold', textColor: [225, 29, 72] },
        5: { halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] },
      },
      alternateRowStyles: { fillColor: [250, 250, 255] },
      margin: { left: 14, right: 14 },
    });
  }

  const finalY = doc.lastAutoTable?.finalY || startY + 40;
  await renderPdfSignatures(doc, { startY: finalY, businessContext: ctx });
  renderPdfFooter(doc, { businessContext: ctx });

  const fileName = `EOD_Close_${format(closeDate, 'yyyyMMdd')}${
    branchName ? `_${branchName.replace(/\s+/g, '_')}` : ''
  }.pdf`;
  await savePdf(doc, fileName);
};

// ─── Export Journal PDF ──────────────────────────────────────────────────────
export const exportJournalPDF = async (data, selectedDate, user) => {
  const ctx = getBusinessContext();
  const doc = new jsPDF();
  await registerJakartaFonts(doc);
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
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, 'bold');
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
    headStyles: { fillColor: [64, 53, 100], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { font: PDF_FONT, fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [100, 100, 100] },
      1: { fontStyle: 'bold', textColor: [0, 0, 0], halign: 'right' },
    },
    alternateRowStyles: { fillColor: [250, 250, 255] },
    margin: { left: 14, right: 14 },
  });

  // ── Transaction Details ──
  const tableY = (doc.lastAutoTable?.finalY || 80) + 10;
  doc.setFontSize(10);
  doc.setFont(PDF_FONT, 'bold');
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
    headStyles: { fillColor: [64, 53, 100], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    styles: { font: PDF_FONT, fontSize: 8, cellPadding: 3 },
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

