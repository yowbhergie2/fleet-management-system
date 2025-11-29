import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  DocumentReference,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebase';

// Collection references
export const collections = {
  users: collection(db, 'users'),
  organizations: collection(db, 'organizations'),
  vehicles: collection(db, 'vehicles'),
  tripTickets: collection(db, 'trip_tickets'),
  fuelRequests: collection(db, 'fuel_requests'),
  fuelContracts: collection(db, 'fuel_contracts'),
  distanceMatrix: collection(db, 'distance_matrix'),
  serialNumbers: collection(db, 'serial_numbers'),
  notifications: collection(db, 'notifications'),
};

// Helper: Convert Firestore Timestamp to Date
export const timestampToDate = (timestamp: Timestamp | null): Date | null => {
  return timestamp ? timestamp.toDate() : null;
};

// Helper: Get server timestamp
export const getServerTimestamp = () => serverTimestamp();

// Helper: Create a document
export async function createDocument<T extends object>(
  collectionName: keyof typeof collections,
  data: T
): Promise<string> {
  const docRef = await addDoc(collections[collectionName], {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

// Helper: Update a document
export async function updateDocument<T extends object>(
  collectionName: keyof typeof collections,
  docId: string,
  data: Partial<T>
): Promise<void> {
  const docRef = doc(collections[collectionName], docId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// Helper: Get a document by ID
export async function getDocument<T>(
  collectionName: keyof typeof collections,
  docId: string
): Promise<T | null> {
  const docRef = doc(collections[collectionName], docId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as T;
  }
  return null;
}

// Helper: Query documents
export async function queryDocuments<T>(
  collectionName: keyof typeof collections,
  ...constraints: QueryConstraint[]
): Promise<T[]> {
  const q = query(collections[collectionName], ...constraints);
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as T[];
}

// Export query helpers for use in components
export { where, orderBy, limit, Timestamp };