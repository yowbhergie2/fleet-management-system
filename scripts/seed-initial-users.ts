/**
 * Script to create initial users in Firebase
 *
 * Instructions:
 * 1. Install Firebase Admin SDK: npm install firebase-admin
 * 2. Download service account key from Firebase Console:
 *    - Go to Project Settings > Service Accounts
 *    - Click "Generate new private key"
 *    - Save as serviceAccountKey.json in project root
 * 3. Run: npx ts-node scripts/seed-initial-users.ts
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();

// Organization ID (you can change this)
const ORG_ID = 'org_dtt_ris';

interface UserData {
  email: string;
  password: string;
  displayName: string;
  role: 'driver' | 'spms' | 'admin';
  divisionOffice?: string;
  licenseNumber?: string;
  position?: string;
  phoneNumber?: string;
}

const initialUsers: UserData[] = [
  // Admin User
  {
    email: 'admin@dtt-ris.gov.ph',
    password: 'Admin@123456',
    displayName: 'System Administrator',
    role: 'admin',
    position: 'IT Administrator',
    phoneNumber: '+63 917 123 4567',
  },

  // SPMS Staff
  {
    email: 'spms@dtt-ris.gov.ph',
    password: 'SPMS@123456',
    displayName: 'Maria Santos',
    role: 'spms',
    divisionOffice: 'Supply & Property Management Section',
    position: 'SPMS Officer',
    phoneNumber: '+63 917 234 5678',
  },

  // Driver 1
  {
    email: 'driver1@dtt-ris.gov.ph',
    password: 'Driver@123456',
    displayName: 'Juan Dela Cruz',
    role: 'driver',
    divisionOffice: 'Administrative Division',
    licenseNumber: 'N01-12-345678',
    position: 'Government Driver I',
    phoneNumber: '+63 917 345 6789',
  },

  // Driver 2
  {
    email: 'driver2@dtt-ris.gov.ph',
    password: 'Driver@123456',
    displayName: 'Pedro Reyes',
    role: 'driver',
    divisionOffice: 'Finance Division',
    licenseNumber: 'N01-12-987654',
    position: 'Government Driver II',
    phoneNumber: '+63 917 456 7890',
  },
];

async function createUser(userData: UserData) {
  try {
    // Create authentication user
    const userRecord = await auth.createUser({
      email: userData.email,
      password: userData.password,
      displayName: userData.displayName,
    });

    console.log(`✓ Created auth user: ${userData.email}`);

    // Create Firestore user document
    await db.collection('users').doc(userRecord.uid).set({
      email: userData.email,
      displayName: userData.displayName,
      role: userData.role,
      organizationId: ORG_ID,
      divisionOffice: userData.divisionOffice || null,
      licenseNumber: userData.licenseNumber || null,
      position: userData.position || null,
      phoneNumber: userData.phoneNumber || null,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✓ Created Firestore document for: ${userData.email}`);
    console.log(`  UID: ${userRecord.uid}`);
    console.log(`  Role: ${userData.role}`);
    console.log('');

    return userRecord;
  } catch (error: any) {
    console.error(`✗ Error creating user ${userData.email}:`, error.message);
    throw error;
  }
}

async function createOrganization() {
  try {
    await db.collection('organizations').doc(ORG_ID).set({
      name: 'DTT-RIS',
      fullName: 'Driver Trip Ticket - Requisition Information System',
      type: 'government',
      address: 'Manila, Philippines',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('✓ Created organization: DTT-RIS\n');
  } catch (error: any) {
    console.error('✗ Error creating organization:', error.message);
    throw error;
  }
}

async function seedUsers() {
  console.log('Starting user seeding process...\n');

  try {
    // Create organization first
    await createOrganization();

    // Create all users
    for (const userData of initialUsers) {
      await createUser(userData);
    }

    console.log('✓ All users created successfully!\n');
    console.log('Login credentials:');
    console.log('━'.repeat(60));
    console.log('Admin:');
    console.log('  Email: admin@dtt-ris.gov.ph');
    console.log('  Password: Admin@123456');
    console.log('');
    console.log('SPMS Staff:');
    console.log('  Email: spms@dtt-ris.gov.ph');
    console.log('  Password: SPMS@123456');
    console.log('');
    console.log('Driver 1:');
    console.log('  Email: driver1@dtt-ris.gov.ph');
    console.log('  Password: Driver@123456');
    console.log('');
    console.log('Driver 2:');
    console.log('  Email: driver2@dtt-ris.gov.ph');
    console.log('  Password: Driver@123456');
    console.log('━'.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding
seedUsers();
