import { doc, getDoc } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { db } from './firebase';
import { AuthService } from './authService';
import { StorageService } from './storage';
import { AdminService } from './adminService';
import { Business } from '../types';

export interface AuthStateChangeDependencies {
  db?: any;
  syncUserProfile?: (user: FirebaseUser) => Promise<{ id: string; businessId: string; displayName?: string; email?: string }>;
  getDoc?: (docRef: any) => Promise<any>;
  setBusinessContext?: (
    businessId: string,
    userId: string,
    initialMeta?: any,
    isDemoMode?: boolean
  ) => Promise<void>;
  onRestored?: (businessId: string, businessData: any) => void;
  onPendingOnboarding?: (businessId: string) => void;
  onUnauthenticated?: () => void;
}

export interface AuthStateChangeResult {
  action: 'restored' | 'pending_onboarding' | 'unauthenticated' | 'error';
  businessId?: string;
  userId?: string;
  businessData?: any;
  error?: any;
}

/**
 * Authoritative handler for Firebase Auth state changes.
 * 
 * CRITICAL ARCHITECTURAL INVARIANT:
 * - Returning users with an existing business doc in Firestore have their context safely restored.
 * - New users whose business doc does not exist yet are set to pending_onboarding.
 * - This function NEVER creates or writes a business document into Firestore!
 *   Business document creation is strictly reserved for onLoginAsMerchant / handleMerchantLogin.
 */
export async function handleAuthStateChange(
  firebaseUser: FirebaseUser | null,
  deps: AuthStateChangeDependencies = {}
): Promise<AuthStateChangeResult> {
  const firestoreDb = deps.db || db;
  const getDocFn = deps.getDoc || getDoc;
  const syncProfileFn = deps.syncUserProfile || AuthService.syncUserProfile;
  const setContextFn = deps.setBusinessContext || StorageService.setBusinessContext;

  if (!firebaseUser) {
    deps.onUnauthenticated?.();
    return { action: 'unauthenticated' };
  }

  try {
    const profile = await syncProfileFn(firebaseUser);
    const bizDocRef = doc(firestoreDb, 'businesses', profile.businessId);

    try {
      const bizSnap = await getDocFn(bizDocRef);

      if (bizSnap.exists()) {
        // RETURNING USER / SESSION RESTORE:
        // The business document already exists in Firestore.
        // Safely attach to it without overwriting.
        const existingBizData = bizSnap.data();
        await setContextFn(
          profile.businessId,
          profile.id,
          {
            name: existingBizData?.name || 'My Store',
            ownerName: existingBizData?.ownerName || profile.displayName || 'Merchant Owner',
            category: existingBizData?.category || 'Retail',
            phone: existingBizData?.phone || '',
            location: existingBizData?.location || '',
          },
          false
        );
        deps.onRestored?.(profile.businessId, existingBizData);
        return {
          action: 'restored',
          businessId: profile.businessId,
          userId: profile.id,
          businessData: existingBizData,
        };
      } else {
        // NEW SIGN-UP IN PROGRESS:
        // The business document does NOT exist in Firestore yet!
        // CRITICAL: DO NOT write or seed a business document here.
        // Single-creation path guarantees that handleMerchantLogin will create it
        // with the merchant's exact chosen name and owner.
        deps.onPendingOnboarding?.(profile.businessId);
        return {
          action: 'pending_onboarding',
          businessId: profile.businessId,
          userId: profile.id,
        };
      }
    } catch (getDocError: any) {
      console.error('[handleAuthStateChange] getDoc check failed for business document:', profile.businessId, getDocError);
      return {
        action: 'error',
        businessId: profile.businessId,
        userId: profile.id,
        error: getDocError,
      };
    }
  } catch (err: any) {
    console.error('[handleAuthStateChange] Error syncing auth profile:', err);
    return {
      action: 'error',
      error: err,
    };
  }
}

export interface MerchantLoginParams {
  merchantId: string;
  email: string;
  displayName: string;
  businessName: string;
  category?: string;
  phone?: string;
  location?: string;
}

export interface MerchantLoginDependencies {
  db?: any;
  getTenantById?: (merchantId: string) => any;
  getDoc?: (docRef: any) => Promise<any>;
  setBusinessContext?: (
    businessId: string,
    userId: string,
    initialMeta?: any,
    isDemoMode?: boolean
  ) => Promise<void>;
  getCurrentUserId?: () => string;
  onUpdateBusiness?: (biz: Partial<Business>) => void;
  onSuccess?: (businessId: string, businessData: Partial<Business>) => void;
  timeoutMs?: number;
  isCancelled?: () => boolean;
}

export interface MerchantLoginResult {
  success: boolean;
  businessId: string;
  business: Partial<Business>;
  cancelled?: boolean;
  error?: any;
}

/**
 * Authoritative single-path handler for merchant onboarding and store workspace initialization.
 * 
 * This is the ONLY code path responsible for creating or updating store workspace context
 * during merchant onboarding / login.
 */
export async function handleMerchantLogin(
  params: MerchantLoginParams,
  deps: MerchantLoginDependencies = {}
): Promise<MerchantLoginResult> {
  const firestoreDb = deps.db || db;
  const getDocFn = deps.getDoc || getDoc;
  const getTenantFn = deps.getTenantById || ((id: string) => AdminService.getTenantById(id));
  const setContextFn = deps.setBusinessContext || StorageService.setBusinessContext;
  const getUserIdFn = deps.getCurrentUserId || (() => AuthService.getCurrentUser()?.uid || 'merchant_user');
  const timeoutMs = deps.timeoutMs ?? 15000;

  const tenant = getTenantFn(params.merchantId);
  let finalBizName = tenant ? tenant.name : (params.businessName?.trim() || 'My WhatsApp Store');
  let finalOwnerName = tenant ? tenant.ownerName : (params.displayName?.trim() || 'Merchant Owner');
  let finalCategory = tenant ? tenant.category : (params.category || 'Retail');
  let finalPhone = tenant ? tenant.whatsappNumber : (params.phone || '');
  let finalLocation = tenant ? tenant.location : (params.location || '');

  try {
    const bizDocRef = doc(firestoreDb, 'businesses', params.merchantId);
    const bizSnap = await getDocFn(bizDocRef);
    if (bizSnap.exists()) {
      // RETURNING USER: Respect their true existing Firestore document! Never overwrite!
      const existingBiz = bizSnap.data();
      if (existingBiz?.name) finalBizName = existingBiz.name;
      if (existingBiz?.ownerName) finalOwnerName = existingBiz.ownerName;
      if (existingBiz?.category) finalCategory = existingBiz.category;
      if (existingBiz?.phone) finalPhone = existingBiz.phone;
      if (existingBiz?.location) finalLocation = existingBiz.location;
    }
  } catch (err) {
    console.warn('[handleMerchantLogin] Could not inspect existing business document, using input values', err);
  }

  const resolvedBusiness: Partial<Business> = {
    name: finalBizName,
    category: finalCategory,
    phone: finalPhone,
    ownerName: finalOwnerName,
    location: finalLocation,
  };

  deps.onUpdateBusiness?.(resolvedBusiness);

  // Check if cancelled before launching async network setup
  if (deps.isCancelled?.()) {
    return {
      success: false,
      businessId: params.merchantId,
      business: resolvedBusiness,
      cancelled: true,
    };
  }

  const isDemo = params.merchantId === 'biz_luma_main' || params.merchantId === 'biz_luma_01';
  const userId = getUserIdFn();

  // Timeout safeguard: Reject after timeoutMs so caller is never stuck indefinitely
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () =>
        reject(
          new Error(`Workspace initialization timed out after ${Math.round(timeoutMs / 1000)} seconds. Please check your network connection.`)
        ),
      timeoutMs
    );
  });

  await Promise.race([
    setContextFn(
      params.merchantId,
      userId,
      {
        name: finalBizName,
        ownerName: finalOwnerName,
      },
      isDemo
    ),
    timeoutPromise,
  ]);

  // Check cancellation guard again after setup resolves to prevent late state hijacking
  if (deps.isCancelled?.()) {
    return {
      success: false,
      businessId: params.merchantId,
      business: resolvedBusiness,
      cancelled: true,
    };
  }

  deps.onSuccess?.(params.merchantId, resolvedBusiness);

  return {
    success: true,
    businessId: params.merchantId,
    business: resolvedBusiness,
  };
}
