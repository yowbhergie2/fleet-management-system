# How to Create Initial Users

## Method 1: Manual Creation (Easiest)

### Step 1: Create Users in Firebase Authentication

1. Go to Firebase Console: https://console.firebase.google.com
2. Select project: **dtt-ris**
3. Go to **Authentication** → **Users** tab
4. Click **Add user** for each user below:

#### Admin User
- Email: `admin@dtt-ris.gov.ph`
- Password: `Admin@123456`
- Click **Add user**
- **Copy the User UID** (you'll need this in Step 2)

#### SPMS Staff
- Email: `spms@dtt-ris.gov.ph`
- Password: `SPMS@123456`
- Click **Add user**
- **Copy the User UID**

#### Driver 1
- Email: `driver1@dtt-ris.gov.ph`
- Password: `Driver@123456`
- Click **Add user**
- **Copy the User UID**

#### Driver 2
- Email: `driver2@dtt-ris.gov.ph`
- Password: `Driver@123456`
- Click **Add user**
- **Copy the User UID**

### Step 2: Create Organization in Firestore

1. Go to **Firestore Database**
2. Click **Start collection**
3. Collection ID: `organizations`
4. Document ID: `org_dtt_ris`
5. Add fields:
   ```
   name (string): "DTT-RIS"
   fullName (string): "Driver Trip Ticket - Requisition Information System"
   type (string): "government"
   address (string): "Manila, Philippines"
   isActive (boolean): true
   createdAt (timestamp): [Click "Use server timestamp"]
   updatedAt (timestamp): [Click "Use server timestamp"]
   ```
6. Click **Save**

### Step 3: Create User Documents in Firestore

For each user you created in Step 1, create a document in Firestore:

1. Go to **Firestore Database**
2. Click **Start collection** (if first time) or click the `+` icon
3. Collection ID: `users`
4. Document ID: **[Paste the User UID from Step 1]**
5. Add fields based on user role:

#### For Admin (use Admin's UID as Document ID):
```
email (string): "admin@dtt-ris.gov.ph"
displayName (string): "System Administrator"
role (string): "admin"
organizationId (string): "org_dtt_ris"
divisionOffice (string): ""
licenseNumber (string): ""
position (string): "IT Administrator"
phoneNumber (string): "+63 917 123 4567"
isActive (boolean): true
createdAt (timestamp): [Use server timestamp]
updatedAt (timestamp): [Use server timestamp]
```

#### For SPMS Staff (use SPMS's UID as Document ID):
```
email (string): "spms@dtt-ris.gov.ph"
displayName (string): "Maria Santos"
role (string): "spms"
organizationId (string): "org_dtt_ris"
divisionOffice (string): "Supply & Property Management Section"
licenseNumber (string): ""
position (string): "SPMS Officer"
phoneNumber (string): "+63 917 234 5678"
isActive (boolean): true
createdAt (timestamp): [Use server timestamp]
updatedAt (timestamp): [Use server timestamp]
```

#### For Driver 1 (use Driver 1's UID as Document ID):
```
email (string): "driver1@dtt-ris.gov.ph"
displayName (string): "Juan Dela Cruz"
role (string): "driver"
organizationId (string): "org_dtt_ris"
divisionOffice (string): "Administrative Division"
licenseNumber (string): "N01-12-345678"
position (string): "Government Driver I"
phoneNumber (string): "+63 917 345 6789"
isActive (boolean): true
createdAt (timestamp): [Use server timestamp]
updatedAt (timestamp): [Use server timestamp]
```

#### For Driver 2 (use Driver 2's UID as Document ID):
```
email (string): "driver2@dtt-ris.gov.ph"
displayName (string): "Pedro Reyes"
role (string): "driver"
organizationId (string): "org_dtt_ris"
divisionOffice (string): "Finance Division"
licenseNumber (string): "N01-12-987654"
position (string): "Government Driver II"
phoneNumber (string): "+63 917 456 7890"
isActive (boolean): true
createdAt (timestamp): [Use server timestamp]
updatedAt (timestamp): [Use server timestamp]
```

## Test Login Credentials

After creating all users, you can login with:

### Admin
- Email: `admin@dtt-ris.gov.ph`
- Password: `Admin@123456`

### SPMS Staff
- Email: `spms@dtt-ris.gov.ph`
- Password: `SPMS@123456`

### Driver 1
- Email: `driver1@dtt-ris.gov.ph`
- Password: `Driver@123456`

### Driver 2
- Email: `driver2@dtt-ris.gov.ph`
- Password: `Driver@123456`

## Important Notes

⚠️ **IMPORTANT**: The Document ID in Firestore MUST match the User UID from Authentication!

🔒 **Security**: Change these passwords after first login in production!

📝 **Fields**: Make sure all field names and types are exactly as shown above.

✅ **Verification**: After creating all users, check:
1. Authentication → Users (should show 4 users)
2. Firestore → organizations (should have 1 document)
3. Firestore → users (should have 4 documents)

## Method 2: Using Script (Advanced)

If you want to use the automated script:

1. Install Firebase Admin SDK:
   ```bash
   npm install firebase-admin
   ```

2. Download service account key:
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save as `serviceAccountKey.json` in project root

3. Run the script:
   ```bash
   npx ts-node scripts/seed-initial-users.ts
   ```

⚠️ **Note**: Keep `serviceAccountKey.json` secret! Add it to `.gitignore`
