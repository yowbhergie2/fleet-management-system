# Firebase Setup Instructions

## Step 1: Enable Firestore Database

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **dtt-ris**
3. Click **Firestore Database** in the left sidebar
4. Click **Create database**
5. Choose **Start in production mode**
6. Select location: **asia-southeast1 (Singapore)**
7. Click **Enable**

## Step 2: Update Firestore Security Rules

⚠️ **IMPORTANT**: You need to update the security rules to allow setup!

1. In Firestore Database, click the **Rules** tab
2. **Delete all existing content**
3. **Copy the entire content** from the `firestore.rules` file in this project
4. **Paste it** into the Rules editor
5. Click **Publish**

The rules allow:
- ✅ Public access to create organization and users during setup
- ✅ Role-based access after setup is complete
- ✅ Secure access to all collections

## Step 3: Enable Firebase Authentication

1. Click **Authentication** in the left sidebar
2. Click **Get started** (if first time)
3. Click the **Sign-in method** tab
4. Click **Email/Password**
5. **Enable** the Email/Password toggle
6. Click **Save**

## Step 4: Test the Setup

1. Make sure dev server is running: `npm run dev`
2. Open browser: http://localhost:5174
3. You should see the **Setup Page** (not an error!)
4. Fill in the form and click **Complete Setup**

### Expected Result:
✅ Setup completes successfully
✅ Organization is created
✅ Admin user is created
✅ Redirected to login page

### If You Get Errors:

#### Error: "Missing or insufficient permissions"
**Solution**: Make sure you updated the Firestore Security Rules (Step 2)

#### Error: "Failed to create user"
**Solution**:
- Check that Authentication is enabled
- Make sure Email/Password is enabled
- Try a different email or stronger password

#### Error: "Network error"
**Solution**:
- Check your internet connection
- Verify Firebase API key in `.env` file is correct

## Step 5: After Setup

Once setup is complete:

1. **Login** with your admin credentials
2. Go to **Manage Users** to create more users
3. Create drivers, SPMS staff, etc.

## Security Notes

🔒 **The firestore.rules file**:
- Allows public access ONLY during initial setup
- After setup is complete, requires authentication
- Role-based permissions for all operations
- Safe for production use

⚠️ **DO NOT** use "Test mode" rules in production!

## Troubleshooting

### Setup keeps failing
1. Check browser console (F12) for detailed errors
2. Verify Firestore is enabled
3. Verify Authentication is enabled
4. Make sure you published the security rules

### Can't login after setup
1. Go to Firebase Console → Authentication → Users
2. Verify your admin user exists
3. Try resetting password if needed

### Need to reset and start over?
1. Go to Firestore Database
2. Delete the `config` collection
3. Delete the `organizations` collection
4. Delete the `users` collection
5. Go to Authentication → Users
6. Delete all users
7. Refresh your app - setup page will appear again

## Next Steps

After successful setup:
1. ✅ Create additional users (drivers, SPMS staff)
2. ✅ Add vehicles (coming soon)
3. ✅ Configure organization settings (coming soon)
4. ✅ Start creating trip tickets!

---

**Need help?** Check `QUICKSTART.md` for usage guide.
