# Professional Business Operations Guide: Getting Started with Our Ecosystem

Welcome to the comprehensive guide for launching and scaling your financial enterprise using our state-of-the-art platform. This document outlines every step of your journey, from initial registration to advanced financial management.

---

## 1. Initial Business Registration & Setup

Your journey begins with establishing your digital presence.

- **Admin Account Creation**: Sign up as the primary business owner. This account grants full oversight of your financial ecosystem.
- **Business Identity**:
  - Navigate to **Settings > Profile**.
  - **Business Abbreviation**: Set a unique 3-4 character abbreviation (e.g., "MLO"). This prefix will be used for all generated account numbers (Current, Saving, and Loan accounts).
  - **Dynamic Branding**: Once set, your business name will automatically appear on all dashboard headers, reports, and browser tabs (e.g., "Dashboard | Finflo Banking OS").
  - **Custom Domains**: The platform supports deployment on custom subdomains like `app.finflo.org`, ensuring a white-label experience for your team and members.
  - **Security Code**: Generate or set your organization's unique **Security Code**. This code is vital for member self-registration.
- **Financial Localization**: Choose your **Preferred Currency** (e.g., Rs., $, €) to ensure all ledgers and reports align with your local operations.

## 2. Establishing Your Infrastructure

Scale your business by defining your organizational structure.

- **Branch Management**:
  - Navigate to **Branches**. Create multiple physical or virtual branches to organize your customer base effectively.
  - Assign a **Branch Manager** and specify contact details for each location.
  - Each branch maintains its own **independent cash balance**, allowing decentralized cash-in-hand tracking across your organization.
- **Team & Roles**:
  - Add **Staff Members** to specific branches.
  - Use the **Roles & Permissions** module to define exactly what each staff member can see and do (e.g., Manager, Teller, Auditor).
- **Security Protocols**: Enable **Two-Factor Authentication (2FA)** for both administrative and member accounts to ensure the highest level of security.

## 3. Onboarding & Community Building

Build your community with advanced registration and guidance tools.

- **Interactive Onboarding**: New staff and admins are greeted by an automated high-resolution onboarding guide that walks through key system modules. Users have the flexibility to skip the guide at any step.

### Customer Registration

- Access **Customers > Add New**.
- **KYC & OCR Scanning**: Use our built-in OCR scanner to auto-fill details from Government Issued IDs (CNIC/NID), minimizing human error and speeding up the process.
- **Digital Signatures**: Capture customer signatures directly on screen for legal compliance.
- **Account Generation**: Generate 13-digit dynamic account numbers instantly based on your business abbreviation and sequential history. Three account types are auto-generated per member: **Current (CUR)**, **Saving (SAV)**, and **Loan (LON)**.

### Member (Investor) Portal

- **Self-Registration**: Provide your **Security Code** to potential investors. They can register themselves via the public portal, including **Google OAuth** sign-up for a frictionless experience.
- **Verification Queue**: All self-registrations land in the **Verification Queue**. Review their credentials and approve them to grant access to the member portal.
- **Investment Management**: Track member investments, profit rates, and distribution history with precision.
- **Smart Wallet Dashboard**: Members have a comprehensive wallet with **Current**, **Saving**, and **Loan** account tabs.
  - **Loan Tab**: If the member has an active loan, the wallet automatically displays their **Outstanding Balance** (remaining amount to pay), along with their **EMI amount** and a **paid vs. total progress** indicator. If no active loan exists, it shows their **Available Credit Limit** instead.
- **Member Loans**: Members can view their active, completed, and overdue loans directly from their portal, including full repayment schedules.
- **Grantor Requests**: Members can review and approve/reject **grantor (guarantor) requests** for other members' loans directly from their portal.
- **Business Shares**: Members can track their separate **business share balance**, deposits, withdrawals, and share profit distributions.
- **Saving Goals**: Members can create personalized **saving goals** with target amounts, deadlines, and category tags (e.g., Emergency, Education, Travel, Home) to help track their financial objectives.
- **Fund Transfers**: Members can transfer funds between their own accounts and to other members within the same business.
- **Member Notifications**: Real-time notifications keep members informed about loan updates, payment reminders, and account activity with infinite scroll support.

## 4. Financial Product Design

Define how you lend and grow.

- **Loan Products**: Create diverse lending products (e.g., Micro-loans, Car Loans, Business Loans).
- **Custom Logic**: Define interest rates (simple or EMI-based), repayment cycles (monthly, weekly), and penalty rules.
- **Grantor Requirements**: Set rules for requiring grantors (guarantors) to secure high-value loans. Grantors approve via their member portal with digital signatures and agreement acceptance.
- **Risk Assessment**: Each loan can include an automated **risk assessment** with grade scoring (A+ to F), risk score (0–100), approval suggestion, and contributing factors.

## 5. System Configuration

Fine-tune your platform behavior from the **Settings** panel.

- **Late Fee & Penalty Configuration**: Enable or disable automated late fees with configurable type (fixed amount or percentage), rate, and grace period (in days). Late fees can be applied in bulk via the **Communication > Apply Late Fees** scan.
- **Checkbook Configuration**: Set the issuance fee for checkbooks. Checkbooks are issued per member from their profile page with configurable leaf counts (25, 50, or 100). Checkbooks can be cancelled with optional refund.
- **Term Deposit Rates**: Configure profit rates for various term deposit durations (3, 6, 12, 18, 24 months) and early-break penalty percentages.
- **Subscription Plans**: Manage tiered subscription plans (Free, Basic, Pro) with limits on customers, loans, members, and branches.
- **SMTP & Email**: Configure custom SMTP settings and email templates for system notifications.
- **Maintenance Mode**: Toggle system-wide maintenance mode with an estimated downtime display.

## 6. Daily Financial Operations

The core of your business activity.

- **Loan Applications**: Process requests through a streamlined workflow from **Pending Review** to **Approved** and **Disbursed**. The **Loan Lookup** page provides quick search and filtering across all loans.
- **Repayment Tracking**: Automated tracking of installments with payment schedule views (table on desktop, card-based layout on mobile). View real-time status: **Paid**, **Partially Paid**, or **Overdue**.
- **The Ledger**: Every transaction (Deposits, Withdrawals, Expenses, Loan Repayments) is automatically recorded in the **Transaction Ledger**, providing a transparent audit trail.
- **Distribution Hub**: Manage your profit-sharing logic centrally. Allocate earnings to members based on their investment shares with a single click.
- **External Fund Reconciliation**: Seamless fund movements to external accounts (bank transfers, mobile wallets like JazzCash) with integrated ledger reconciliation, category tagging, and automated branch reporting.
- **Teller Mode**: A dedicated POS-style operational interface for frontline tellers:
  - **Quick Member Search**: Look up any member by name, CNIC, phone, or account number with real-time search.
  - **Deposits & Withdrawals**: Process current or saving account deposits/withdrawals with cash or online payment method selection.
  - **Loan Repayments**: Direct loan repayment with installment or full-balance options, auto-deduction from deposit, and overdue loan handling.
  - **Transaction Journal**: A date-range-filtered journal view of all ledger entries, exportable to PDF.
  - **Cash Book**: Track daily cash-in-hand with opening balance, denomination breakdown, branch-level filtering, and closing cash calculations. Set cash openings per branch and export daily cash reports.
  - **Member Statement Export**: Generate professional PDF statements for any member's full transaction history with business branding, signatures, and watermarks.

## 7. Real-Time Communication & Support

Stay connected with your team and clients.

- **Enterprise Chat**: A real-time, encrypted chat system for staff-to-member and staff-to-admin communication.
  - Support for **Voice Messages**, **Image Sharing**, and **Typing Status**.
  - **Privacy**: Each user can clear their chat history independently without affecting the other party.
- **Member Chat**: Members have access to a dedicated chat interface to communicate with the business team (available on premium plans).
- **Notifications**: Instant alerts for new registrations, loan approvals, overdue payments, and grantor requests ensure nothing falls through the cracks.
- **Support Tickets**: Submit and track support tickets with categories (Bug Report, Feature Request, Billing, General Assistance), priority levels (Low to Urgent), file attachments, and threaded replies.

## 8. Intelligence & Compliance

Data-driven decisions and regulatory peace of mind.

- **Dynamic Dashboards**: View critical metrics at a glance—**Total Recovered**, **Active Loans**, **Expected Profits**, and **Member Balances**.
- **Advanced Reports Suite**:
  - **Performance Analytics**: Monthly lending velocity charts, collection rates, and growth trend analysis.
  - **Trial Balance**: Real-time assets, liabilities, and equity statement with PDF export.
  - **Profit & Loss**: Date-range-filtered income statement with revenue, operating expenses, distributions, and net income breakdown.
  - **Balance Sheet**: Comprehensive financial position snapshot.
  - **Branch Analytics**: Cross-branch comparison with aggregated KPIs per branch (admin only).
- **Regulatory Center**:
  - **IFRS 9 Compliance**: Generate Expected Credit Loss (ECL) reports.
  - **Basel III Compliance**: Capital adequacy and risk metrics.
  - **Regulatory Snapshots**: Save and archive compliance reports for audit purposes.
- **Executive Summary Export**: Generate comprehensive PDF reports covering KPIs, lending velocity, and portfolio overview with professional business branding.
- **CSV Export**: Export raw lending data for external analysis.
- **Audit Logs**: A permanent record of every administrative action, ensuring accountability across your entire staff.
- **Data Continuity**: Utilize the **Backup & Export** module to safeguard your data or migrate information as needed.

## 9. Public-Facing Pages

Professional landing pages to attract and inform.

- **Landing Page**: A high-conversion landing page with animated hero section, loan calculator, feature showcase, testimonials, pricing tiers, and FAQ.
- **Documentation**: Comprehensive technical documentation and API reference for integrators.
- **FAQ Page**: Searchable frequently asked questions to reduce support load.
- **Legal Pages**: Privacy Policy and Terms of Service pages for regulatory compliance.

---

_This platform is designed to grow with you. From your first branch to an international financial network, our tools provide the precision and security you need to succeed._
