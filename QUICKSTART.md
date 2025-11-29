# DTT, RIS and Fuel Contract Management System - Quick Start Guide

## 🎉 Your System is Ready!

The dev server is running at: **http://localhost:5174/**

## What Happens When You Visit the App:

### 1️⃣ First-Time Setup (Only Once)
When you first open the app, you'll see a **Setup Page** with 2 steps:

#### Step 1: Organization Information
- Organization Short Name: `DTT-RIS` (already filled)
- Organization Full Name: `Driver Trip Ticket - Requisition Information System` (already filled)
- Address: `Manila, Philippines` (already filled)

#### Step 2: Create Admin Account
Fill in your admin details:
- Full Name (e.g., Juan Dela Cruz)
- Email (e.g., admin@dtt-ris.gov.ph)
- Password (minimum 6 characters)
- Confirm Password
- Position (optional)
- Phone Number (optional)

Click **"Complete Setup"** to create your organization and admin account.

### 2️⃣ Login Page
After setup is complete, you'll be redirected to the login page.

Login with the admin credentials you just created:
- Email: (the one you entered)
- Password: (the one you entered)

### 3️⃣ Dashboard (After Login)
You'll see the main dashboard with:
- Your name and role in the header
- **"Manage Users"** button (for admins only)
- Trip Ticket Form
- Sign Out button

## 🔐 Admin Features

### Creating More Users

1. Click **"Manage Users"** button in the dashboard header
2. Fill in the user registration form:
   - Full Name
   - Email (e.g., driver1@dtt-ris.gov.ph)
   - Initial Password (user should change after first login)
   - **User Role**: Choose from:
     - **Driver** - Can create trip tickets
     - **SPMS Staff** - Can approve trip tickets
     - **Admin** - Full system access
     - **EMD Staff** - For future fuel module
   - Additional info based on role
3. Click **"Create User"**

### User Roles & Permissions

#### 👤 Driver
- Create trip ticket (draft)
- Submit trip ticket for approval
- Edit own draft tickets
- Request cancellation
- Request edit of approved tickets
- Complete trip with actual data
- View own trip history

#### 📋 SPMS Staff
- View all pending trip tickets
- Approve/reject trip tickets
- Print PDF for wet signatures
- Approve/deny cancellation requests
- Approve/deny edit requests
- View all trip tickets in organization

#### ⚙️ Admin
- Everything SPMS can do
- Create and manage users
- Manage vehicles
- View system-wide reports
- Access audit logs

## 🔥 Firebase Setup Required

Before you can use the app, make sure:

### 1. Firestore Database is Enabled
- Go to Firebase Console → Firestore Database
- Click "Create database" if not yet created
- Choose **Production mode**
- Select **asia-southeast1** (Singapore)

### 2. Firebase Authentication is Enabled
- Go to Authentication → Get started
- Enable **Email/Password** sign-in method

### 3. Firestore Security Rules (Optional but Recommended)
Copy the rules from `SETUP-USERS.md` to your Firestore Rules tab

## 📝 Current Features

✅ User authentication & authorization
✅ Role-based access control (RBAC)
✅ First-time setup wizard
✅ Admin panel for user management
✅ Trip ticket form (UI ready)
✅ PDF generation (preview mode)
✅ Protected routes
✅ Beautiful UI with Tailwind CSS

## 🚀 Next Steps

After creating your admin account:

1. **Create Users**: Add drivers and SPMS staff
2. **Add Vehicles**: (Coming soon - you'll need this for trip tickets)
3. **Configure Settings**: (Coming soon)
4. **Start Using**: Drivers can create trip tickets!

## 🐛 Troubleshooting

### "Cannot connect to Firebase"
- Check your `.env` file has correct Firebase credentials
- Make sure Firestore is enabled in Firebase Console

### "User not found" or "Access denied"
- Make sure you've completed the setup process
- Check that the user exists in Firebase Authentication
- Verify user profile exists in Firestore → users collection

### Page keeps loading
- Check browser console for errors (F12)
- Verify Firebase configuration is correct

## 💡 Tips

- **First login** might take a few seconds
- **Change passwords** after first login in production
- **Backup your data** regularly
- **Test with different roles** to understand permissions

---

**Need help?** Check the files:
- `SETUP-USERS.md` - Manual user creation guide
- `README.md` - Full documentation (coming soon)

**Built with:** React + TypeScript + Firebase + Tailwind CSS v4
**Version:** 1.0.0
**COA Compliant** ✓
