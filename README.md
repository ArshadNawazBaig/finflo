# finflo - Finance Management SaaS

A comprehensive Finance Management System designed to streamline the lending process for financial institutions. This SaaS application manages the entire loan lifecycle, from customer onboarding and loan issuance to repayment tracking and status management.

## 🚀 Key Features

- **Dashboard & Analytics**: Real-time overview of active loans, revenue, and customer statistics with modern, interactive charts.
- **Multi-Branch Infrastructure**: Centralized management with branch-specific staff access and localized branding.
- **Business Branding & Identity**: Customize your organizational identity with a unique **Business Abbreviation**. This abbreviation is automatically used to generate professional, 13-digit dynamic account numbers for all customers and members.
- **Intelligent Risk & Credit Engine**: Automated credit limits and ECL calculations based on investment balance and historical behavior.
- **Finance Management**:
  - **Issue Loans**: Flexible configuration for loan amount, interest rate, tenure, and repayment frequency.
  - **Repayments**: Track manual payments and update loan balances automatically.
  - **Smart Fund Movement**: Automatic loan auto-deduction from member deposits to ensure timely repayments.
  - **Status Tracking**: Monitor loans through various stages (Active, Paid, Defaulted, etc.).
- **Customer & Member Management**:
  - **Automated Credit Limits**: Real-time ceiling updates based on investment portfolio and repayment history.
  - **Account Generation**: Professional 13-digit account numbers (Saving and Current) generated using your unique business prefix and sequential tracking.
  - **KYC & AML Document Vault**: Securely store and manage identification and collateral documents.
- **Communication & Engagement**:
  - **Encrypted Live Chat**: Real-time messaging with typing indicators, voice notes, and media support. Includes per-user history clearing for enhanced privacy.
  - **Notifications**: Comprehensive automated alerts for all transaction types and due dates via Sockets and Email.
- **Compliance & Security**:

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

- **Runtime**: Node.js (Express.js)
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT, bcryptjs
- **File Storage**: Cloudinary (Multer)
- **Payments**: Stripe API
- **ECL Engine**: Expected Credit Loss calculations for IFRS 9 compliance
- **Logging**: Morgan & Internal Audit Trail Ledger

## 📋 Prerequisites

Ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (v22+ recommended)
- [npm](https://www.npmjs.com/) (Standard for project build scripts)
- [Docker & Docker Compose](https://www.docker.com/) (For containerized deployment)
- [MongoDB Atlas](https://www.mongodb.com/) (With IP whitelisting configured)

## 📦 Installation

1.  **Clone the repository**

    ```bash
    git clone <repository-url>
    cd finflo
    ```

2.  **Install Dependencies**
    We use npm workspaces to manage dependencies for both client and server from the root.
    ```bash
    npm install
    ```

## ⚙️ Configuration

### Server Configuration

Create a `.env` file in the `apps/server` directory and configure the following variables:

```env
# Server Port
PORT=5001

# Database
MONGO_URI=mongodb+srv://arshadnawazbaig:arshadnawazbaig@cluster0.ds395jn.mongodb.net/loan-management

# Security
JWT_SECRET=dev_secret_key_123

# Payment Gateway (Stripe)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_BASIC=price_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PORTAL_CONFIGURATION_ID=bpc_...

# Client URL (CORS)
CLIENT_URL=http://localhost:5174

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

# Google Auth
GOOGLE_CLIENT_ID=52862721923-1ut2ktl2fdm15chs5rsfej989911b4mm.apps.googleusercontent.com
```

### Client Configuration

The client primarily connects to the server via a reverse proxy in Docker or direct URL in development. Ensure `VITE_BACKEND_URL` in `apps/client/.env` (if used) matches `http://localhost:5001`.

## 🏃‍♂️ Running the Application

### 🐳 Docker Deployment (Recommended)

To run the entire stack (Frontend + Backend + Nginx) with Docker:

1.  **Build and Start**:
    ```bash
    docker compose up --build -d
    ```
    - **Frontend**: [http://localhost:5174](http://localhost:5174)
    - **Backend API**: [http://localhost:5001](http://localhost:5001)

2.  **Stop Containers**:
    ```bash
    docker compose down
    ```

### ⬆️ Pushing to Docker Hub

This project is configured for easy deployment to Docker Hub under the `arshadnawazbaig` registry.

1.  **Build Images**: `docker compose build`
2.  **Login**: `docker login`
3.  **Push**: `docker compose push`

### 💻 Local Development Mode

To run both concurrently without Docker:

```bash
npm run dev
```

- **Server**: [http://localhost:5001](http://localhost:5001)
- **Client**: [http://localhost:5174](http://localhost:5174)

## 📱 Mobile Deployment (Capacitor)

This project uses **Capacitor** to target iOS and Android.

### Prerequisites

- **iOS**: Mac with [Xcode](https://developer.apple.com/xcode/) installed.
- **Android**: [Android Studio](https://developer.android.com/studio) installed.

### Build and Sync

Every time you make changes to the frontend, you must rebuild the web assets and sync them to the native projects:

```bash
# 1. Build the web app
npm run build --workspace=apps/client

# 2. Sync to mobile platforms
cd apps/client
npx cap sync
```

### Run on Devices

To open the native IDEs and run the application:

- **iOS**: `npx cap open ios` (Opens Xcode)
- **Android**: `npx cap open android` (Opens Android Studio)

For **Live Reload** during development:

```bash
npx cap run ios
# or
npx cap run android
```

## 📄 License

[MIT](LICENSE)
