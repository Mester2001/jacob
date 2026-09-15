import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  getDocs,
  limit,
  query,
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { Order, AuditLogEntry } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore directly with database ID as required by Firebase skill
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Helper to check if error is specifically permission-related
export function isPermissionError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const code = (error as any)?.code;
  return (
    code === 'permission-denied' ||
    msg.includes('permission-denied') ||
    msg.includes('Missing or insufficient permissions')
  );
}

// Operation Types for error handler
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection safely using orders collection query
export async function testConnection(): Promise<boolean> {
  try {
    const q = query(collection(db, 'orders'), limit(1));
    await getDocs(q);
    return true;
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.GET, 'orders');
    }
    console.warn('Firestore connection check (running in resilient offline mode):', error);
    return false;
  }
}

// Test Firestore connection safely
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const ordersCollection = collection(db, 'orders');
    const q = query(ordersCollection, limit(1));
    await getDocs(q);
    return true;
  } catch (error: any) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.GET, 'orders');
    }
    console.warn('Firebase Firestore running in resilient offline/cached mode:', error?.message);
    return false;
  }
}

// User Profile Schema for Firestore
export interface UserProfileDoc {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: string;
  siteCode?: string;
  departmentCode?: string;
  lastLoginAt: string;
  createdAt: string;
}

/**
 * Sign in with Google Popup
 */
export async function signInWithGoogle(): Promise<{ user: FirebaseUser; profile: UserProfileDoc }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const profile = await syncUserProfileToFirestore(result.user);
    return { user: result.user, profile };
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

/**
 * Sign out current user
 */
export async function logOut(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign-Out Error:', error);
    throw error;
  }
}

/**
 * Syncs user profile to /users/{userId} in Firestore
 */
export async function syncUserProfileToFirestore(
  user: FirebaseUser,
  roleOverride?: string
): Promise<UserProfileDoc> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const now = new Date().toISOString();

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const existing = snap.data() as UserProfileDoc;
      const updated: UserProfileDoc = {
        ...existing,
        displayName: user.displayName || existing.displayName || user.email || 'مستخدم',
        photoURL: user.photoURL || existing.photoURL || '',
        lastLoginAt: now,
        role: roleOverride || existing.role || (user.email === 'mhmh4729@gmail.com' ? 'ADMIN' : 'REQUESTER'),
      };
      await setDoc(userRef, updated, { merge: true });
      return updated;
    } else {
      const isDefaultAdmin = user.email === 'mhmh4729@gmail.com';
      const newUser: UserProfileDoc = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'مستخدم الجكوب',
        photoURL: user.photoURL || '',
        role: roleOverride || (isDefaultAdmin ? 'ADMIN' : 'REQUESTER'),
        siteCode: 'MI',
        departmentCode: 'OPS',
        lastLoginAt: now,
        createdAt: now,
      };
      await setDoc(userRef, newUser);
      return newUser;
    }
  } catch (err) {
    if (isPermissionError(err)) {
      handleFirestoreError(err, OperationType.WRITE, userPath);
    }
    console.warn('Profile sync fallback to local object:', err);
    return {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'مستخدم',
      photoURL: user.photoURL || '',
      role: roleOverride || (user.email === 'mhmh4729@gmail.com' ? 'ADMIN' : 'REQUESTER'),
      lastLoginAt: now,
      createdAt: now,
    };
  }
}

/**
 * Fetch user profile from /users/{uid}
 */
export async function getUserProfileFromFirestore(uid: string): Promise<UserProfileDoc | null> {
  const userPath = `users/${uid}`;
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfileDoc;
    }
    return null;
  } catch (err) {
    if (isPermissionError(err)) {
      handleFirestoreError(err, OperationType.GET, userPath);
    }
    console.warn('Could not load user profile from Firestore:', err);
    return null;
  }
}

/**
 * Real-time listener for auth state changes
 */
export function subscribeToAuth(
  onUserChanged: (user: FirebaseUser | null) => void
): () => void {
  return onAuthStateChanged(auth, onUserChanged);
}

/**
 * Real-time listener for a single order by ID.
 * Triggers callback whenever the tracked order is created or modified in Firestore.
 */
export function subscribeToOrderById(
  orderId: string,
  onOrderUpdated: (order: Order) => void,
  onError?: (error: Error) => void
): () => void {
  const orderPath = `orders/${orderId}`;
  const orderRef = doc(db, 'orders', orderId);

  const unsubscribe = onSnapshot(
    orderRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Order;
        onOrderUpdated(data);
      }
    },
    (err) => {
      console.warn(`Firestore subscription notification for order ${orderId}:`, err?.message || err);
      if (onError) {
        onError(err);
      }
      if (isPermissionError(err)) {
        handleFirestoreError(err, OperationType.GET, orderPath);
      }
    }
  );

  return unsubscribe;
}

/**
 * Real-time listener for orders collection.
 * Triggers callback whenever orders are created, updated, or synced in Firestore.
 */
export function subscribeToOrders(
  onOrdersReceived: (orders: Order[]) => void,
  onError?: (error: Error) => void
): () => void {
  const ordersPath = 'orders';
  const ordersCollection = collection(db, ordersPath);

  const unsubscribe = onSnapshot(
    ordersCollection,
    (snapshot) => {
      const ordersList: Order[] = [];
      snapshot.forEach((docSnap) => {
        ordersList.push(docSnap.data() as Order);
      });

      // Sort by creation or reference if available
      ordersList.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      onOrdersReceived(ordersList);
    },
    (err) => {
      console.warn('Firestore orders collection status update:', err?.message || err);
      if (onError) {
        onError(err);
      }
      if (isPermissionError(err)) {
        handleFirestoreError(err, OperationType.GET, ordersPath);
      }
    }
  );

  return unsubscribe;
}

/**
 * Save or update an order in Firestore
 */
export async function saveOrderToFirestore(order: Order): Promise<void> {
  const orderPath = `orders/${order.id}`;
  try {
    const orderRef = doc(db, 'orders', order.id);
    await setDoc(orderRef, order, { merge: true });
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.WRITE, orderPath);
    }
    console.error('Error saving order to Firestore:', error);
    throw error;
  }
}

/**
 * Save and synchronize all orders to Firestore
 */
export async function saveAllOrdersToFirestore(orders: Order[]): Promise<void> {
  try {
    const promises = orders.map((order) => {
      const orderRef = doc(db, 'orders', order.id);
      return setDoc(orderRef, order, { merge: true });
    });
    await Promise.all(promises);
    console.log(`Successfully synced ${orders.length} orders to Firestore.`);
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.WRITE, 'orders');
    }
    console.error('Error batch syncing orders to Firestore:', error);
    throw error;
  }
}

/**
 * Fetch all orders directly from Firestore
 */
export async function fetchOrdersFromFirestore(): Promise<Order[]> {
  const ordersPath = 'orders';
  try {
    const ordersCollection = collection(db, ordersPath);
    const snap = await getDocs(ordersCollection);
    const ordersList: Order[] = [];
    snap.forEach((docSnap) => {
      ordersList.push(docSnap.data() as Order);
    });
    ordersList.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
    return ordersList;
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.LIST, ordersPath);
    }
    console.warn('Error fetching orders from Firestore, fallback to local:', error);
    return [];
  }
}

/**
 * Seed initial sample orders if the Firestore orders collection is currently empty
 */
export async function seedInitialOrdersIfEmpty(sampleOrders: Order[]): Promise<void> {
  try {
    const ordersCollection = collection(db, 'orders');
    const existingSnap = await getDocs(ordersCollection);

    if (existingSnap.empty && sampleOrders.length > 0) {
      console.log('Seeding initial orders into Firestore...');
      for (const sample of sampleOrders) {
        const orderRef = doc(db, 'orders', sample.id);
        await setDoc(orderRef, sample, { merge: true });
      }
      console.log('Initial orders seeded successfully into Firestore.');
    }
  } catch (error) {
    console.warn('Could not seed initial orders to Firestore:', error);
  }
}

/**
 * Save an audit log entry to Firestore
 */
export async function saveAuditLogToFirestore(log: AuditLogEntry): Promise<void> {
  try {
    const logRef = doc(db, 'audit_logs', log.id);
    await setDoc(logRef, log, { merge: true });
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.WRITE, `audit_logs/${log.id}`);
    }
    console.warn('Could not sync audit log to Firestore:', error);
  }
}

/**
 * Fetch audit logs directly from Firestore
 */
export async function fetchAuditLogsFromFirestore(): Promise<AuditLogEntry[]> {
  try {
    const logsCol = collection(db, 'audit_logs');
    const snap = await getDocs(logsCol);
    const logs: AuditLogEntry[] = [];
    snap.forEach((d) => logs.push(d.data() as AuditLogEntry));
    logs.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    return logs;
  } catch (error) {
    console.warn('Could not fetch audit logs from Firestore:', error);
    return [];
  }
}

/**
 * Real-time subscription to audit logs
 */
export function subscribeToAuditLogs(
  onLogsReceived: (logs: AuditLogEntry[]) => void,
  onError?: (error: any) => void
): () => void {
  try {
    const logsCol = collection(db, 'audit_logs');
    return onSnapshot(
      logsCol,
      (snap) => {
        const logs: AuditLogEntry[] = [];
        snap.forEach((d) => logs.push(d.data() as AuditLogEntry));
        logs.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        onLogsReceived(logs);
      },
      (error) => {
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to audit logs:', err);
    return () => {};
  }
}


