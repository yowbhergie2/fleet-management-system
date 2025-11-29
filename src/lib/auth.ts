import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { User } from '@/types';

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<User> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

    if (!userDoc.exists()) {
      await signOut(auth);
      throw new Error('User profile not found. Contact your administrator.');
    }

    const userData = userDoc.data();

    // Check if user is active
    if (!userData.isActive) {
      await signOut(auth);
      throw new Error('Your account has been deactivated. Contact your administrator.');
    }

    // Update last login
    const user: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email!,
      displayName: userData.displayName,
      role: userData.role,
      organizationId: userData.organizationId,
      divisionOffice: userData.divisionOffice,
      licenseNumber: userData.licenseNumber,
      isActive: userData.isActive,
      position: userData.position,
      phoneNumber: userData.phoneNumber,
      createdAt: userData.createdAt?.toDate(),
      updatedAt: userData.updatedAt?.toDate(),
      lastLoginAt: new Date(),
    };

    return user;
  } catch (error: any) {
    // Handle Firebase auth errors
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email address.');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('Incorrect password. Please try again.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address format.');
    } else if (error.code === 'auth/user-disabled') {
      throw new Error('This account has been disabled. Contact your administrator.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed login attempts. Please try again later.');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your internet connection.');
    } else if (error.message) {
      throw error;
    } else {
      throw new Error('Login failed. Please try again.');
    }
  }
}

/**
 * Sign out current user
 */
export async function logout(): Promise<void> {
  await signOut(auth);
}

/**
 * Subscribe to auth state changes
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      callback(null);
      return;
    }

    try {
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (!userDoc.exists() || !userDoc.data().isActive) {
        await signOut(auth);
        callback(null);
        return;
      }

      const userData = userDoc.data();
      const user: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName: userData.displayName,
        role: userData.role,
        organizationId: userData.organizationId,
        divisionOffice: userData.divisionOffice,
        licenseNumber: userData.licenseNumber,
        isActive: userData.isActive,
        position: userData.position,
        phoneNumber: userData.phoneNumber,
        createdAt: userData.createdAt?.toDate(),
        updatedAt: userData.updatedAt?.toDate(),
        lastLoginAt: userData.lastLoginAt?.toDate(),
      };

      callback(user);
    } catch (error) {
      console.error('Error fetching user data:', error);
      callback(null);
    }
  });
}
