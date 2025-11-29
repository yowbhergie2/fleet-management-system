import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db } from './firebase';
import type { UserRole } from '@/types';

export interface CreateUserData {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  divisionOffice?: string;
  licenseNumber?: string;
  position?: string;
  phoneNumber?: string;
}

// Firebase config for secondary app (used only for creating users)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * Create a new user with authentication and Firestore profile
 * Note: This should only be called by admin users
 * Uses a secondary Firebase app instance to avoid logging out the current admin
 */
export async function createUser(
  userData: CreateUserData,
  organizationId: string
): Promise<void> {
  let secondaryApp;
  try {
    // Create a secondary Firebase app instance for user creation
    secondaryApp = initializeApp(firebaseConfig, 'Secondary-' + Date.now());
    const secondaryAuth = getAuth(secondaryApp);

    // Create authentication user using secondary app
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
      userData.email,
      userData.password
    );

    const uid = userCredential.user.uid;

    // Create Firestore user document (uses main db instance)
    await setDoc(doc(db, 'users', uid), {
      email: userData.email,
      displayName: userData.displayName,
      role: userData.role,
      organizationId,
      divisionOffice: userData.divisionOffice || null,
      licenseNumber: userData.licenseNumber || null,
      position: userData.position || null,
      phoneNumber: userData.phoneNumber || null,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: null,
    });

    console.log('User created successfully:', uid);
  } catch (error: any) {
    // Handle Firebase errors
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This email address is already registered.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address format.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak. Use at least 6 characters.');
    } else if (error.message) {
      throw error;
    } else {
      throw new Error('Failed to create user. Please try again.');
    }
  } finally {
    // Clean up: delete the secondary app instance
    if (secondaryApp) {
      await deleteApp(secondaryApp);
    }
  }
}
