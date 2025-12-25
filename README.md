# LedgerLink - Personal Finance Manager

LedgerLink is a **premium personal finance application** designed to help users track their income, expenses, and manage bills effectively. It features a modern, responsive design and robust data tracking.

## ✨ Key Features

- **Dynamic Dashboard**: Real-time stats for balance, income, and expenses with timeframe toggles (Daily/Weekly/Monthly/Yearly).
- **Advanced Filtering**:
    - **Transactions**: Search and filter by category or transaction type (Income/Expense/Transfer).
    - **Scheduled Bills**: Search and filter by category, status (Paid/Pending/Overdue), and frequency.
- **Automated Bill Processing**: 
    - **Recurring Bills**: Automatically generates upcoming bills based on set frequencies (daily, weekly, monthly).
    - **Auto-Deduct**: Option to automatically pay bills directly from specified wallets on their due dates.
- **Multi-Currency Support**: Real-time exchange rate integration via Frankfurter API. View your unified balance in your preferred base currency.
- **Smart Categorization**: Intelligent icon and category suggestions as you type.
- **Data Export**: Export your transaction history to **PDF** or **Excel** with active filters maintained.
- **Responsive & Premium UI**: A mobile-first experience built with Material UI, featuring dark mode, custom fonts, and interactive wallet cards.

## 🛠️ Technology Stack

- **Frontend**: React (Vite), TypeScript
- **State Management**: React Context API
- **UI Framework**: Material UI (MUI v7+)
- **Backend/Database**: Firebase (Firestore, Authentication)
- **External APIs**: Frankfurter (Currency Exchange)
- **Utilities**: Date-fns, React-hot-toast, SheetJS, jsPDF

## 🚀 Deployment

### Vercel Deployment

This project is optimized for Vercel. To deploy:

1. **Connect your Repository**: Connect your GitHub/GitLab repo to Vercel.
2. **Environment Variables**: Add the following secrets to your Vercel project settings:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
3. **Build Settings**: Vercel will automatically detect the Vite setup. The build command should be `npm run build` and output directory `dist`.

### Firebase Free Tier Optimization

- **Efficient Reads**: Data listeners are limited by pagination and filters to minimize Firestore usage.
- **Conflict Prevention**: Automated bill processing uses refs and safety checks to prevent redundant database writes.

## 📱 Mobile Experience

The application is optimized for mobile usage, featuring:
- **Vertical Stack Alignment**: Settings and forms adapt to mobile screens to prevent text truncation.
- **Mobile Navigation**: Intuitive bottom navigation and sidebar for easy access on the go.
- **Touch-friendly Controls**: High-contrast buttons and accessible form elements.

