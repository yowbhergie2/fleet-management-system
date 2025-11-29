# DTT, RIS and Fuel Contract Management System

**DPWH Regional Office II - DTT, RIS and Fuel Contract Management System**

A comprehensive DTT, RIS and Fuel Contract Management System designed for DPWH Regional Office II, compliant with COA regulations.

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Firebase**
   - Copy `.env.example` to `.env`
   - Add your Firebase credentials to `.env`

3. **Setup Firebase Services**
   - Follow the instructions in [FIREBASE-SETUP.md](FIREBASE-SETUP.md)
   - ⚠️ **IMPORTANT**: Update Firestore security rules before running setup!

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Complete First-Time Setup**
   - Visit http://localhost:5174
   - Follow the setup wizard to create your organization and admin account
   - See [QUICKSTART.md](QUICKSTART.md) for detailed guide

## 📚 Documentation

- **[FIREBASE-SETUP.md](FIREBASE-SETUP.md)** - Firebase configuration guide (READ THIS FIRST!)
- **[QUICKSTART.md](QUICKSTART.md)** - User guide and feature walkthrough
- **[SETUP-USERS.md](SETUP-USERS.md)** - Manual user creation guide (if needed)

## ✨ Features

### Module 1: Driver Trip Ticket System
- ✅ Role-based access control (Driver, SPMS Staff, Admin, EMD)
- ✅ Trip ticket creation and management
- ✅ Multi-level approval workflow
- ✅ PDF generation with wet signatures
- ✅ Cancellation and edit request system
- ✅ Trip completion tracking

### User Roles
- **Driver** - Create and submit trip tickets
- **SPMS Staff** - Approve/reject trip tickets, print PDFs
- **Admin** - Full system access, user management
- **EMD Staff** - Fuel module access (Module 2 - coming soon)

### Module 2: Fuel Requisition System (Coming Soon)
- Fuel request creation
- Fuel contract management
- Serial number tracking
- Supplier management

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Backend**: Firebase (Auth + Firestore + Storage)
- **Forms**: React Hook Form + Zod
- **State**: Zustand
- **Routing**: React Router DOM v7
- **PDF**: jsPDF

## 🔐 Security

- Firebase Authentication with email/password
- Role-based access control (RBAC)
- Firestore security rules
- Environment variable protection
- COA compliance

## 📋 Requirements

- Node.js 18+
- npm 9+
- Firebase project (free tier works)

## 🏗️ Project Structure

```
src/
├── components/        # Reusable UI components
├── features/          # Feature modules (trip-tickets, fuel, etc.)
├── hooks/             # Custom React hooks
├── lib/               # Utilities and services
├── pages/             # Page components
├── stores/            # Zustand state stores
└── types/             # TypeScript definitions
```

## 🚦 Getting Started for Developers

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure Firebase
4. Follow [FIREBASE-SETUP.md](FIREBASE-SETUP.md) to enable Firebase services
5. Run dev server: `npm run dev`
6. Complete setup wizard at http://localhost:5174

## 📝 License

This project is for DPWH Regional Office II use.

## 🤝 Contributing

This is a government project. Please contact the administrators for contribution guidelines.

## 📞 Support

For issues or questions, please refer to:
- [FIREBASE-SETUP.md](FIREBASE-SETUP.md) for setup problems
- [QUICKSTART.md](QUICKSTART.md) for usage questions
- [SETUP-USERS.md](SETUP-USERS.md) for user management

---

**Version:** 1.0.0
**COA Compliant** ✓
**Built with:** React + TypeScript + Firebase + Tailwind CSS v4
