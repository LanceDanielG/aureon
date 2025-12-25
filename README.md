# LedgerLink - Personal Finance Manager

LedgerLink is a **personal finance application** designed to help users track their income, expenses, and manage bills effectively. It is built as a portfolio project to demonstrate modern web development practices using React, TypeScript, and Firebase.

## 🚀 Purpose & Constraints

This application is intended for **personal use** and is currently hosted on **Firebase's Free Tier**.
- **Personal Scope**: Designed for individual users to manage their personal finances.
- **Free Tier Limits**: Database operations and hosting resources are limited by Firebase's free tier quotas. Users may experience rate limiting if usage exceeds these free quotas (e.g., extensive daily reads/writes).

## ✨ Key Features

- **Smart Categorization**: The app uses intelligent suggestions to automatically recommend categories and icons based on your input (e.g., typing "Netflix" suggests the "Entertainment" category).
- **Multi-Currency Support**: Seamlessly manage wallets in different currencies with real-time exchange rate conversion for a unified portfolio view.
- **Automated Bill Processing**: 
    - **Recurring Bills**: Automatically generates upcoming bills based on set frequencies (daily, weekly, monthly).
    - **Auto-Deduct**: Option to automatically deduct bill amounts from specified wallets on their due dates.
- **Atomic Transactions**: Ensures data integrity by treating related operations (e.g., paying a bill and updating wallet balance) as single, indivisible units.
- **Real-time Updates**: changes to your data are reflected instantly across all devices.
- **Responsive Design**: A premium, mobile-first UI built with Material UI, ensuring a great experience on phones, tablets, and desktops.

## 🛠️ Technology Stack

- **Frontend**: React (Vite), TypeScript
- **UI Framework**: Material UI (MUI)
- **Backend/Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **State Management**: React Context API
- **Others**: React Router, Recharts, React Hot Toast

## 📱 Mobile Experience

The application is optimized for mobile usage, featuring:
- **Card-based Layouts**: Easy to read and interact with on touch screens.
- **Collapsible Lists**: Efficient use of screen space for wallets and transactions.
- **Touch-friendly Controls**: Large buttons and intuitive forms.
