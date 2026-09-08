import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from './firebase';
import { User } from '../types';

export class AuthService {
  static async signInWithGoogle(): Promise<FirebaseUser> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error: unknown) {
      console.error('Google Sign In failed:', error);
      throw error;
    }
  }

  static async signInWithEmail(email: string, pass: string): Promise<FirebaseUser> {
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      return result.user;
    } catch (error: unknown) {
      console.error('Email Sign In failed:', error);
      throw error;
    }
  }

  static async signUpWithEmail(email: string, pass: string, displayName?: string): Promise<FirebaseUser> {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      if (displayName && result.user) {
        await updateProfile(result.user, { displayName });
      }
      return result.user;
    } catch (error: unknown) {
      console.error('Email Sign Up failed:', error);
      throw error;
    }
  }

  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: unknown) {
      console.error('Sign Out failed:', error);
      throw error;
    }
  }

  static onAuthChange(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  static getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  /**
   * Ensures the /users/{userId} document exists in Firestore per firebase-blueprint.json.
   * If not present, creates it linking to an assigned businessId.
   */
  static async syncUserProfile(firebaseUser: FirebaseUser, defaultDisplayName?: string): Promise<User> {
    const userPath = `users/${firebaseUser.uid}`;
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        return snap.data() as User;
      }

      // Generate a clean deterministic businessId for this user
      const businessId = `biz_${firebaseUser.uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) || 'luma'}`;
      const newUserProfile: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || defaultDisplayName || 'Merchant Owner',
        businessId,
        role: 'owner',
        createdAt: new Date().toISOString(),
      };

      await setDoc(userRef, newUserProfile);
      return newUserProfile;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, userPath);
      // Fallback in case of temporary rule check
      return {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || defaultDisplayName || 'Merchant Owner',
        businessId: `biz_${firebaseUser.uid.slice(0, 10)}`,
        role: 'owner',
        createdAt: new Date().toISOString(),
      };
    }
  }
}
