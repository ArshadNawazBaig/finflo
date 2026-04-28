# FinFlo Financial Ecosystem Overview

Welcome to the FinFlo technical overview. This document explains the core financial structures and mechanisms of the platform, including the Tri-Account system, Loan Lifecycle management, Profit Distribution, Penalty systems, Business Shares, Term Deposits, Checkbook issuance, Teller Operations, Payment Method tracking, and Reporting & Compliance modules.

---

## 1. Tri-Account Structure

Every member in the FinFlo ecosystem is automatically assigned three distinct, dynamically generated account numbers using the business abbreviation prefix (e.g., `MLO-CUR-00001`, `MLO-SAV-00001`, `MLO-LON-00001`).

### Current Account (CUR)
The Current Account serves as the member's operational hub for daily financial activities.
- **Functionality**: Handles internal transfers, external withdrawals, everyday deposits, and loan repayment deductions.
- **Auto-Deductions**: When a deposit is made with the "Apply Deduction" flag, the system can automatically route a portion toward active loan repayment.
- **Profitability**: Does not earn any profit. It is strictly for transaction routing and immediate liquidity.

### Saving Account (SAV)
The Saving Account acts as the member's wealth-building portfolio.
- **Functionality**: Operates similarly to a high-yield savings vault. Members and admins can transfer funds into this account, but it is sheltered from automated operational deductions (such as loan repayments).
- **Profitability**: Accrues daily automatic profits based on an administrative Global Annual Profit Rate.
- **Saving Goals**: Members can create personalized saving goals with target amounts, deadlines, and categories (Emergency, Education, Travel, Home) to track their financial objectives.

### Loan Account (LON)
The Loan Account provides a unified view of the member's lending activity.
- **Smart Wallet Display**: When a member has an active or overdue loan, the wallet dashboard automatically switches to show the **Outstanding Balance** (remaining amount), **EMI amount**, and **paid vs. total progress**. When no active loan exists, it displays the **Available Credit Limit** instead.
- **Credit Limit**: Dynamically recalculated upon loan completion based on the member's repayment history and trust rating.

---

## 2. Profit Distribution System

FinFlo automates the wealth-building process, ensuring a seamless and transparent accrual of profit for all users holding funds in their Saving Accounts.

### Automated Daily Accruals
- **Mechanism**: A daily automated job runs across the platform, calculating and depositing profit into every eligible active member's Saving Account.
- **Calculation Formula**: `Daily Profit = Saving Balance × (Global Annual Percentage Rate / 365)`
- **Global Control**: The business administrator maintains complete control over the Global Annual Profit Rate via the settings dashboard, allowing the platform to adjust yields depending on internal business models or prevailing market conditions.
- **Ledger Recording**: Every profit accrual is recorded as a `saving_profit` transaction in the Financial Ledger for full auditability.

---

## 3. Loan Lifecycle Management

The system features a robust, automated loan engine designed to mitigate risk and enforce scheduled repayments while offering flexibility.

### Interest Calculation Models
- **Simple Interest**: `Total = Principal + (Principal × Rate × Duration / 1200)`. EMI is evenly split across the duration.
- **EMI (Reducing Balance)**: Standard amortization formula where interest is calculated on the outstanding principal each period, resulting in a decreasing interest component over time.
- **Compound Interest**: Dynamic interest-on-interest model. While the initial schedule is flat, any missed installments trigger automated daily compounding, where one month's interest is added to the outstanding balance, causing the debt to grow over time.
- **Daily-Based Precision**: All repayment interest calculations use exact days elapsed since the last payment rather than fixed monthly periods, ensuring fairness for early or late payments.

### Loan Approval and Disbursal
- Loans can be requested with up to two designated **grantors** (guarantors), each requiring digital signature and agreement acceptance.
- Grantors approve or reject requests directly from their member portal with a captured digital signature.
- Once approved by both the grantors and the administrator, the loan principal is disbursed directly to the member's Current Account.
- **Disbursement Treatment**: All loan disbursements are recorded as `paymentMethod: 'online'` in the financial ledger, ensuring they **do not affect the branch's cash-in-hand** balance.
- **Risk Assessment**: Each loan includes an automated risk assessment with a grade (A+ to F), a numerical score (0–100), an approval suggestion, and contributing risk factors.

### Repayment Processing
- **Payment Method**: All repayment flows (Admin Teller, Member Self-Repayment) support **Cash** or **Online** payment method selection, correctly tracking which payments affect cash-in-hand vs. digital transactions.
- **Admin/Teller Repayments**: Staff can process repayments via Teller Mode with Cash/Online toggle. Defaults to Cash.
- **Member Self-Repayments**: Members can repay from their wallet with Cash/Online toggle. Defaults to Online.
- **Auto-Deductions**: When enabled during a deposit, the system automatically routes funds to loan repayment.
- Repayments are split into **principal** and **interest** components based on exact days elapsed since the last payment.

### Early Settlement
- Members and admins can opt for **Early Settlement**, where the system recalculates the total owed based on the exact number of days the loan was active.
- For Simple Interest loans: `Settlement = Principal + (Daily Interest × Days Active)`
- For EMI loans: `Settlement = Paid Amount + Remaining Principal + Accrued Interest Since Last Payment`
- For Compound Interest loans: `Settlement = Current Remaining Amount` (as compounded interest is already integrated into the living balance).
- The overpaid interest from the original amortization schedule is automatically waived.

### Automated Reminders
- The Communication module sends automated reminders for upcoming and overdue installments.
- Reminder events are stored per loan for audit trail purposes.

---

## 4. Penalty (Late Fee) Structure

To ensure the health of the lending ecosystem, FinFlo enforces penalties on delinquent loans **after the full loan tenure expires**.

### Post-Tenure Late Fee Accrual
- Late fees are **not** applied during the loan period. Members are free to manage their installment schedule during the tenure.
- Once the full loan tenure has expired (e.g., after 12 months for a 12-month loan) and there is still an outstanding balance, the system identifies the loan as delinquent.
- After a configurable grace period (in days), a Late Fee (Penalty) is automatically calculated and added to the member's outstanding debt.
- This automated process can be triggered via the **Communication > Apply Late Fees** admin action, ensuring that post-tenure amounts are consistently penalized.

### Configuration
- **Late Fee Toggle**: Enable or disable late fees globally.
- **Fee Type**: Fixed amount or percentage of outstanding balance.
- **Fee Rate**: Configurable amount or percentage.
- **Grace Period**: Configurable number of days after tenure expiry before fees are applied.

---

## 5. Loan Defaulter Mechanism

FinFlo provides an automated loan default detection system to protect the lending ecosystem from chronic non-payment.

### Auto-Default Detection
- If a loan remains unpaid for a configurable number of months **after the loan tenure expires** (default: 3 months), it is automatically marked as **defaulted**.
- When a loan is defaulted:
  - The borrower's member account is frozen (set to Inactive).
  - The borrower's trust rating drops significantly (-3.0 points).
  - Both the borrower and the admin are notified via in-app notifications.
  - If grantors (guarantors) were assigned, they are also notified.
  - The event is logged in the activity log for audit purposes.

### Trust Rating System
- Each customer maintains a **Trust Rating** (0–10 scale).
- On-time repayments within the grace period increase the rating (+0.2 per installment).
- Late repayments decrease the rating (-0.5 per installment).
- Defaults trigger a severe drop (-3.0 points).

### Configuration
- The **Loan Default Threshold** (months after tenure) is configurable per-business from the admin Settings dashboard.

---

## 6. Business Shares

FinFlo supports a complete **Business Shares** module for cooperative or equity-based financial models.

### Share Operations
- **Share Deposits**: Members can purchase business shares, increasing their ownership stake.
- **Share Withdrawals**: Members can liquidate shares back into their account.
- **Share Profit**: Administrators can distribute share-based profits to members, typically on a periodic basis (e.g., monthly).

### Tracking
- Each share transaction records the member's `shareBalanceAfter` for point-in-time auditing.
- Share balances are maintained independently from Current and Saving accounts.

---

## 7. Term Deposits

FinFlo provides a structured **Term Deposit** product for members seeking guaranteed fixed-term returns.

### Lifecycle
1. **Creation**: A member locks a principal amount from their Current or Saving account for a fixed duration (3, 6, 12, 18, or 24 months) at a configured annual profit rate.
2. **Active Phase**: The deposit accrues projected profit over the term. The status remains `active` until maturity.
3. **Maturity**: Upon reaching the maturity date, the deposit transitions to `matured` and the full principal plus calculated profit (actual profit) is available for withdrawal.
4. **Early Break**: If a member breaks the deposit before maturity, the system applies an **Early Break Penalty** — a configurable percentage of the earned profit is forfeited. The deposit transitions to `broken`.
5. **Withdrawal**: The matured or broken deposit is paid out to the member's account. Status transitions to `withdrawn`.

### Configuration
- **Rates per Duration**: Configurable annual profit rates per term length (e.g., 6% for 3 months, 12% for 24 months).
- **Early Break Penalty**: Default 50% of the accrued profit is forfeited — configurable per business.

---

## 8. Checkbook Issuance

FinFlo supports physical **Checkbook Issuance** for member accounts.

### Process
- Administrators issue checkbooks from a member's profile page.
- Each checkbook is assigned a unique, auto-generated number (e.g., `CHK-00001`).
- Configurable leaf counts: **25**, **50**, or **100** leaves per checkbook.
- An **Issuance Fee** (configurable in Settings) is charged and deducted from the member's Current Account.
- The fee is recorded as a `checkbook_fee` transaction in the Financial Ledger.

### Lifecycle Management
- **Active**: Checkbook is in use.
- **Used**: All leaves consumed.
- **Cancelled**: Cancelled by admin with an optional refund of the issuance fee.

---

## 9. Teller Operations & Cash Management

FinFlo provides a dedicated **Teller Mode** — a POS-style interface for frontline cash operations.

### Core Operations
- **Quick Member Search**: Real-time search by name, CNIC, phone, or account number.
- **Deposits**: Process deposits to Current or Saving accounts with Cash/Online method selection.
- **Withdrawals**: Process withdrawals with method selection targeting either account type.
- **Loan Repayments**: Direct loan repayment with installment or full-balance options, auto-deduction toggle, and **Cash/Online payment method selection**.

### Cash-in-Hand Tracking
- **Branch-Scoped**: Each branch maintains its own independent cash balance.
- **Daily Cash Opening**: Tellers set a daily opening cash amount with optional denomination breakdown per branch.
- **Real-Time Summary**: `Closing Cash = Opening Cash + Cash In − Cash Out`
- **Denomination Tracking**: Track note counts (₹10 through ₹5000) for physical cash reconciliation.
- **Online vs Cash Separation**: Only transactions with `paymentMethod: 'cash'` affect the cash-in-hand balance. Online/digital transactions are tracked separately.

### Transaction Journal
- Date-range-filtered view of all ledger entries.
- Exportable to professional PDF with business branding and signatures.

### Cash Book Reports
- Daily cash position summaries exportable to PDF.
- Per-transaction detail with time, member, category, and amount.

---

## 10. Payment Method Architecture

All financial transactions in FinFlo carry a `paymentMethod` field (`'cash'` or `'online'`), enabling precise tracking of physical vs. digital money flows.

### Default Behavior by Transaction Type

| Transaction Type | Default Method | User Configurable? |
|---|---|---|
| Member Deposit (Teller) | Cash | ✅ Yes |
| Member Withdrawal (Teller) | Cash | ✅ Yes |
| Loan Repayment (Teller) | Cash | ✅ Yes |
| Loan Repayment (Member Self) | Online | ✅ Yes |
| Auto-Deduction from Deposit | Inherits from Deposit | ❌ |
| Loan Disbursement | **Online (forced)** | ❌ |
| Cash Opening | Cash | ❌ |
| Branch Expenses | Cash | ✅ Yes |

### Impact on Cash-in-Hand
- Only `paymentMethod: 'cash'` transactions are included in cash-in-hand calculations.
- Loan disbursements are always `'online'` to prevent artificial inflation of cash outflow reporting.

---

## 11. Reporting & Compliance

FinFlo includes a comprehensive financial reporting suite with regulatory compliance capabilities.

### Financial Reports
- **Trial Balance**: Real-time assets (Loans Receivable, Cash at Hand), liabilities (Member Capital), and equity (Retained Earnings) with PDF export.
- **Profit & Loss Statement**: Date-range-filtered income statement showing revenue (interest earned), operating expenses, distributions, and net income.
- **Balance Sheet**: Full financial position snapshot.
- **Branch Analytics**: Cross-branch KPI comparison (admin only).
- **Executive Summary**: Comprehensive PDF combining KPIs, lending velocity, and portfolio overview.

### Regulatory Center
- **IFRS 9**: Expected Credit Loss (ECL) reporting.
- **Basel III**: Capital adequacy and risk metrics.
- **Regulatory Snapshots**: Save and archive compliance reports for audit purposes with timestamped titles.

### Export Capabilities
- **PDF Export**: All reports support professional PDF generation with business branding, custom logos, and digital signature blocks.
- **CSV Export**: Raw data export for external analysis.
- **Member Statements**: Individual transaction history PDFs with business watermarks.

---

## 12. External Fund Transfers

FinFlo supports fund movements to external destinations for inter-system reconciliation.

- **Transfer Types**: Bank transfers, mobile wallet transfers (e.g., JazzCash/EasyPaisa).
- **Ledger Integration**: All external transfers are recorded in the Financial Ledger with category tagging.
- **Branch Reporting**: External transfers are scoped to branches for localized reporting.

---

## 13. Support & Communication

### Enterprise Chat
- Real-time encrypted messaging between staff and members.
- Support for voice messages, image sharing, and typing indicators.
- Independent chat history clearing per user.

### Support Tickets
- Members and staff can submit tickets with categories (Bug Report, Feature Request, Billing, General Assistance).
- Priority levels: Low, Medium, High, Urgent.
- File attachments and threaded reply support.

### Automated Communications
- **Loan Reminders**: Automated upcoming and overdue installment notifications.
- **Late Fee Scans**: Bulk late fee application via admin action.
- **Email Notifications**: Transactional emails for deposits, withdrawals, repayments, and loan status changes via configurable SMTP.

---

## Summary for Potential Clients

FinFlo provides a comprehensive, automated financial operating system built on atomic idempotent operations with full white-label custom branding. By strictly separating operational funds (Current Account) from investment funds (Saving Account) and lending activity (Loan Account), the platform offers a distinct value proposition to its members. The administrative burden is heavily reduced through automated daily savings profits, daily-based precise interest calculations, post-tenure loan penalties, intelligent loan default detection, Cash/Online payment method tracking for accurate cash-in-hand management, checkbook issuance, term deposits, business shares, regulatory-compliant reporting (IFRS 9 & Basel III), and a branch-scoped teller operation system — making FinFlo an ideal, scalable engine for next-generation digital lending and wealth management.
