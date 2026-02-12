# Loan Management SaaS

A comprehensive Loan Management System designed to streamline the lending process for financial institutions. This SaaS application manages the entire loan lifecycle, from customer onboarding and loan issuance to repayment tracking and status management.

## 🚀 Key Features

- **Dashboard & Analytics**: Real-time overview of active loans, revenue, and customer statistics with modern, interactive charts.
- **Loan Management**:
  - **Issue Loans**: Flexible configuration for loan amount, interest rate, tenure, and repayment frequency.
  - **Repayments**: Track manual payments and update loan balances automatically.
  - **Status Tracking**: Monitor loans through various stages (Active, Paid, Defaulted, etc.).
- **Customer Management**:
  - **Onboarding**: comprehensive customer profiles with contact details and employment information.
  - **History**: View loan history and repayment behavior for each customer.
- **Authentication & Security**:
  - Secure user registration and login using JWT (JSON Web Tokens).
  - Role-based access control (Admin/User).
- **File Uploads**: Integrated with **Cloudinary** for secure document storage (e.g., ID proofs, collateral documents).
- **Email Notifications**: Automated email alerts for loan approvals, due dates, and payment receipts using **SMTP/Mailtrap**.
- **Payments**: Integrated **Stripe** for subscription management and potential loan processing.

## 🛠 Tech Stack

### Frontend (Client)

- **Framework**: React (Vite)
- **Styling**: Tailwind CSS, PostCSS
- **UI Components**: Radix UI, Headless UI, Lucide React (Icons)
- **State Management**: Jotai
- **Data Fetching**: Axios
- **Visualization**: Recharts
- **Forms**: React Hook Form
- **Utilities**: date-fns, clsx, tailwind-merge

### Backend (Server)

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JSON Web Token (JWT), bcryptjs
- **File Storage**: Cloudinary (Multer storage)
- **Payments**: Stripe API
- **Logging**: Morgan

## 📋 Prerequisites

Ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (v16+ recommended)
- [Yarn](https://yarnpkg.com/) (or npm)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas URI)

## 📦 Installation

1.  **Clone the repository**

    ```bash
    git clone <repository-url>
    cd loan-management-app
    ```

2.  **Install Dependencies**
    We use `yarn` workspaces to manage dependencies for both client and server from the root.
    ```bash
    yarn install
    ```

## ⚙️ Configuration

### Server Configuration

Create a `.env` file in the `apps/server` directory and configure the following variables:

```env
# Server Port
PORT=5001

# Database
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/loan-management

# Security
JWT_SECRET=your_jwt_secret_key

# Payment Gateway (Stripe)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_BASIC=price_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PORTAL_CONFIGURATION_ID=bpc_...

# Client URL (CORS)
CLIENT_URL=http://localhost:5173

# Email Service (SMTP)
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_EMAIL=your_mailtrap_user
SMTP_PASSWORD=your_mailtrap_password
FROM_EMAIL=noreply@loanapp.com
FROM_NAME=FinancialPortal

# File Storage (Cloudinary)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_URL=cloudinary://...
```

### Client Configuration

The client primarily connects to the server. Ensure the proxy in `apps/client/vite.config.js` or API base URL matches your server port (default 5001).

## 🏃‍♂️ Running the Application

You can run both the client and server concurrently from the root directory.

### Development Mode

data

```bash
yarn dev
```

This command sends:

- **Server** on [http://localhost:5001](http://localhost:5001)
- **Client** on [http://localhost:5173](http://localhost:5173) (or similar)

### Individual Startup

If you prefer to run them separately:

- **Server only**:
  ```bash
  yarn workspace server dev
  ```
- **Client only**:
  ```bash
  yarn workspace client dev
  ```

## 🧪 Testing

To run tests (if configured):

```bash
yarn test
```

## 📄 License

[MIT](LICENSE)
