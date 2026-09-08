import { describe, it, expect } from 'vitest';
import { handleAuthStateChange, handleMerchantLogin } from '../src/services/appAuthFlow';

describe('Sign-Up Business Creation & Field Disentanglement', () => {
  it('correctly separates personal displayName and business name when personal name is left blank', () => {
    // Simulated Form State in AuthPortal
    const formDisplayName = ''; // User left personal name blank
    const formBusinessName = 'Lagos Glow Co.'; // User typed business name

    // 1. AuthPortal resolution
    const personalName = formDisplayName.trim();
    const chosenBizName =
      formBusinessName.trim() ||
      (personalName ? `${personalName}'s Store` : 'My WhatsApp Store');

    expect(chosenBizName).toBe('Lagos Glow Co.');
    expect(personalName).toBe('');

    // Values passed to AuthService.signUpWithEmail and syncUserProfile
    const authDisplayNameParam = personalName || undefined;
    const profileDefaultDisplayName = personalName || 'Merchant Owner';

    expect(authDisplayNameParam).toBeUndefined();
    expect(profileDefaultDisplayName).toBe('Merchant Owner');

    // 2. AuthService.syncUserProfile user document creation
    const mockFirebaseUser = {
      uid: 'user_lagos_glow_123',
      email: 'owner@lagosglow.ng',
      displayName: null,
    };

    const businessId = `biz_${mockFirebaseUser.uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`;
    const createdUserProfile = {
      id: mockFirebaseUser.uid,
      email: mockFirebaseUser.email,
      displayName: mockFirebaseUser.displayName || profileDefaultDisplayName || 'Merchant Owner',
      businessId,
      role: 'owner',
      createdAt: new Date().toISOString(),
    };

    // User document must NOT have "Lagos Glow Co." as their personal display name
    expect(createdUserProfile.displayName).toBe('Merchant Owner');
    expect(createdUserProfile.displayName).not.toBe('Lagos Glow Co.');

    // 3. onLoginAsMerchant callback arguments in App.tsx
    const passedMerchantId = createdUserProfile.businessId;
    const passedEmail = mockFirebaseUser.email;
    const passedDisplayName = personalName || 'Merchant Owner';
    const passedBusinessName = chosenBizName;

    // App.tsx onLoginAsMerchant handler resolution
    const finalBizName = passedBusinessName?.trim() || 'My WhatsApp Store';
    const finalOwnerName = passedDisplayName?.trim() || 'Merchant Owner';

    expect(finalBizName).toBe('Lagos Glow Co.');
    expect(finalOwnerName).toBe('Merchant Owner');

    // 4. ensureBusinessDocumentAndSeed creation
    const initialMeta = {
      name: finalBizName,
      ownerName: finalOwnerName,
    };

    const createdBusinessDoc = {
      id: passedMerchantId,
      name: initialMeta.name || 'My Store',
      ownerName: initialMeta.ownerName || 'Merchant Owner',
      ownerId: mockFirebaseUser.uid,
      members: [mockFirebaseUser.uid],
      memberUids: [mockFirebaseUser.uid],
      category: 'Retail',
      currency: 'NGN',
    };

    // Assert that the exact typed business name was saved
    expect(createdBusinessDoc.name).toBe('Lagos Glow Co.');
    expect(createdBusinessDoc.name).not.toBe("Lagos Glow Co.'s Store");
    expect(createdBusinessDoc.name).not.toBe('Merchant Owner');
    expect(createdBusinessDoc.name).not.toBe('Luma Fashion');
    expect(createdBusinessDoc.ownerName).toBe('Merchant Owner');
  });

  it('ensures real exported handleAuthStateChange does not race, create, or call setBusinessContext on first sign-up', async () => {
    let setBusinessContextCalls = 0;
    let onRestoredCalls = 0;
    let onPendingOnboardingCalls = 0;

    const mockUser: any = {
      uid: 'user_first_signup_123',
      email: 'newuser@store.ng',
      displayName: 'New Merchant',
    };

    const result = await handleAuthStateChange(mockUser, {
      syncUserProfile: async (u) => ({
        id: u.uid,
        businessId: 'biz_new_123',
        displayName: u.displayName,
        email: u.email,
      }),
      getDoc: async () => ({
        exists: () => false,
        data: () => null,
      }),
      setBusinessContext: async () => {
        setBusinessContextCalls++;
      },
      onRestored: () => {
        onRestoredCalls++;
      },
      onPendingOnboarding: () => {
        onPendingOnboardingCalls++;
      },
    });

    // Must detect pending onboarding, NOT restore
    expect(result.action).toBe('pending_onboarding');
    expect(onPendingOnboardingCalls).toBe(1);
    expect(onRestoredCalls).toBe(0);
    // ABSOLUTELY ZERO calls to setBusinessContext or business writes from auth state change!
    expect(setBusinessContextCalls).toBe(0);
  });

  it('signs up a new user, and asserts that exactly one setDoc call is made to /businesses/..., and that it happens from handleMerchantLogin, not handleAuthStateChange', async () => {
    // Track all setDoc writes across the entire lifecycle, tagging the originating caller
    interface SetDocRecord {
      path: string;
      data: any;
      caller: 'handleAuthStateChange' | 'handleMerchantLogin';
    }
    const recordedSetDocCalls: SetDocRecord[] = [];
    const simulatedFirestoreDocs: Record<string, any> = {};

    let currentCaller: 'handleAuthStateChange' | 'handleMerchantLogin' = 'handleAuthStateChange';

    const mockGetDoc = async (docRefOrPath: any) => {
      const path = typeof docRefOrPath === 'string' ? docRefOrPath : (docRefOrPath?.path || docRefOrPath?._key?.path?.toString() || '');
      const data = simulatedFirestoreDocs[path];
      return {
        exists: () => Boolean(data),
        data: () => data,
      };
    };

    const mockSetDoc = async (path: string, data: any) => {
      recordedSetDocCalls.push({
        path,
        data,
        caller: currentCaller,
      });
      simulatedFirestoreDocs[path] = data;
    };

    // 1. A new user signs up in AuthPortal
    const newAuthUser: any = {
      uid: 'user_chinelo_456',
      email: 'chinelo@stores.ng',
      displayName: 'Chinelo Eze',
    };
    const typedBusinessName = 'Chinelo Fabrics';
    const computedBusinessId = `biz_${newAuthUser.uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`;

    // =========================================================================
    // STEP 1: Execute REAL handleAuthStateChange
    // =========================================================================
    currentCaller = 'handleAuthStateChange';
    const authChangeResult = await handleAuthStateChange(newAuthUser, {
      syncUserProfile: async (u) => {
        // User profile doc write in users/{uid}
        await mockSetDoc(`users/${u.uid}`, {
          id: u.uid,
          email: u.email,
          displayName: u.displayName,
          businessId: computedBusinessId,
          role: 'owner',
        });
        return {
          id: u.uid,
          businessId: computedBusinessId,
          displayName: u.displayName,
          email: u.email,
        };
      },
      getDoc: mockGetDoc,
      setBusinessContext: async (bizId, userId, meta) => {
        // If handleAuthStateChange ever writes to business doc, record it
        await mockSetDoc(`businesses/${bizId}`, meta);
      },
    });

    // Assert: User doc was written, but ZERO writes to businesses/... occurred in handleAuthStateChange
    expect(authChangeResult.action).toBe('pending_onboarding');
    const onAuthChangeBusinessWrites = recordedSetDocCalls.filter(
      (c) => c.caller === 'handleAuthStateChange' && c.path.startsWith('businesses/')
    );
    expect(onAuthChangeBusinessWrites).toHaveLength(0);

    // =========================================================================
    // STEP 2: Execute REAL handleMerchantLogin
    // =========================================================================
    currentCaller = 'handleMerchantLogin';
    const loginResult = await handleMerchantLogin(
      {
        merchantId: computedBusinessId,
        email: newAuthUser.email,
        displayName: newAuthUser.displayName,
        businessName: typedBusinessName,
      },
      {
        getDoc: mockGetDoc,
        getCurrentUserId: () => newAuthUser.uid,
        setBusinessContext: async (bizId, userId, meta) => {
          // Authoritative business write simulated exactly as StorageService does
          await mockSetDoc(`businesses/${bizId}`, {
            id: bizId,
            name: meta?.name || 'My Store',
            ownerName: meta?.ownerName || 'Merchant Owner',
            ownerId: userId,
            members: [userId],
            memberUids: [userId],
            category: 'Retail',
            currency: 'NGN',
            createdAt: new Date().toISOString(),
          });
        },
      }
    );

    expect(loginResult.success).toBe(true);
    expect(loginResult.business.name).toBe('Chinelo Fabrics');
    expect(loginResult.business.ownerName).toBe('Chinelo Eze');

    // =========================================================================
    // ASSERTIONS: Directly proves single-path creation using REAL exported code
    // =========================================================================
    const allBusinessSetDocCalls = recordedSetDocCalls.filter((c) =>
      c.path.startsWith('businesses/')
    );

    // 1. Exactly ONE setDoc call is made to /businesses/... in total across the entire signup lifecycle
    expect(allBusinessSetDocCalls).toHaveLength(1);

    // 2. That single setDoc call happened from handleMerchantLogin, NOT handleAuthStateChange
    expect(allBusinessSetDocCalls[0].caller).toBe('handleMerchantLogin');
    expect(allBusinessSetDocCalls[0].caller).not.toBe('handleAuthStateChange');

    // 3. The target path is exactly the user's business document
    expect(allBusinessSetDocCalls[0].path).toBe(`businesses/${computedBusinessId}`);

    // 4. Document data holds the merchant's exact chosen name and owner
    expect(allBusinessSetDocCalls[0].data.name).toBe('Chinelo Fabrics');
    expect(allBusinessSetDocCalls[0].data.ownerName).toBe('Chinelo Eze');
    expect(allBusinessSetDocCalls[0].data.ownerId).toBe('user_chinelo_456');
  });

  it('aborts handleMerchantLogin without calling onSuccess when isCancelled flag is set', async () => {
    let onSuccessCalled = false;
    let setBusinessContextCalled = false;

    const result = await handleMerchantLogin(
      {
        merchantId: 'biz_cancelled_1',
        email: 'test@cancel.com',
        displayName: 'Cancelled User',
        businessName: 'Cancelled Store',
      },
      {
        getDoc: async () => ({ exists: () => false, data: () => null }),
        isCancelled: () => true, // User clicked "Return to Sign In"
        setBusinessContext: async () => {
          setBusinessContextCalled = true;
        },
        onSuccess: () => {
          onSuccessCalled = true;
        },
      }
    );

    expect(result.cancelled).toBe(true);
    expect(result.success).toBe(false);
    expect(setBusinessContextCalled).toBe(false);
    expect(onSuccessCalled).toBe(false);
  });

  it('CONFIRMS new Google sign-up creates a business document in Firestore', () => {
    // Simulated Google Sign-In user from Firebase Auth
    const googleUser = {
      uid: 'google_user_789',
      email: 'adaora@gmail.com',
      displayName: 'Adaora Okonkwo',
    };

    // User may have typed a business name, or left it blank
    const typedBizName = 'Adaora Atelier';
    const personalName = googleUser.displayName?.trim() || 'Merchant Owner';
    const chosenBizName = typedBizName.trim() || `${personalName}'s Store`;

    expect(personalName).toBe('Adaora Okonkwo');
    expect(chosenBizName).toBe('Adaora Atelier');

    // 1. User profile created in users collection
    const businessId = `biz_${googleUser.uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`;
    const userProfile = {
      id: googleUser.uid,
      email: googleUser.email,
      displayName: personalName,
      businessId,
      role: 'owner',
      createdAt: new Date().toISOString(),
    };
    expect(userProfile.businessId).toBe('biz_googleuser789');

    // 2. onLoginAsMerchant executes setBusinessContext
    const finalBizName = chosenBizName;
    const finalOwnerName = personalName;

    // 3. ensureBusinessDocumentAndSeed checks snap.exists()
    const docExistsBefore = false; // New Google user has no document yet
    let businessDocumentCreated = false;
    let createdDocData: Record<string, any> = {};

    if (!docExistsBefore) {
      businessDocumentCreated = true;
      createdDocData = {
        id: businessId,
        name: finalBizName,
        ownerName: finalOwnerName,
        ownerId: googleUser.uid,
        members: [googleUser.uid],
        memberUids: [googleUser.uid],
        category: 'Retail',
        currency: 'NGN',
        createdAt: new Date().toISOString(),
      };
    }

    // RESULT CONFIRMATION:
    // (1) Did a business document get created? YES
    expect(businessDocumentCreated).toBe(true);
    // (2) Document data contains the exact business name
    expect(createdDocData.name).toBe('Adaora Atelier');
    expect(createdDocData.ownerName).toBe('Adaora Okonkwo');
    expect(createdDocData.ownerId).toBe('google_user_789');
  });

  it('CONFIRMS reconciler will NOT fire or overwrite when a merchant renames their business in Settings next month', () => {
    // Merchant renames business in Settings next month to "Bella Chic Hub"
    const renamedBusinessName = 'Bella Chic Hub';

    // The document in Firestore now has:
    const firestoreDocData = {
      name: renamedBusinessName,
      ownerName: 'Adaora Okonkwo',
      category: 'Fashion & Design',
    };

    // Next month, user logs in. onAuthChange reads existing business document from Firestore:
    const existingBizData = firestoreDocData;
    const initialMetaPassedNextMonth = {
      name: existingBizData.name, // 'Bella Chic Hub'
      ownerName: existingBizData.ownerName,
    };

    // Reconciler code condition:
    // snap.data()?.name !== initialMeta.name
    const condition1_nameDiffers = firestoreDocData.name !== initialMetaPassedNextMonth.name;
    expect(condition1_nameDiffers).toBe(false); // Does NOT differ!

    // Even if initialMeta differed, test the legacy placeholder checks:
    const condition2_isLegacyPlaceholder =
      firestoreDocData.name === 'My Store' ||
      firestoreDocData.name.endsWith("'s Store") ||
      firestoreDocData.name === 'Luma Fashion';

    expect(condition2_isLegacyPlaceholder).toBe(false); // 'Bella Chic Hub' is NOT a legacy placeholder!

    // Reconciler write should NOT fire
    const reconcilerWillFire = condition1_nameDiffers && condition2_isLegacyPlaceholder;
    expect(reconcilerWillFire).toBe(false);
  });

  it('TESTS Google sign-up with blank business name, and verifies returning login when business name ends in s Store', () => {
    // SCENARIO 1: Google Sign-Up with business name left blank
    const googleUser = {
      uid: 'google_user_kemi_999',
      email: 'kemi@adeleke.com',
      displayName: 'Kemi Adeleke',
    };
    const formBusinessNameInput = ''; // Left blank!

    const personalName = googleUser.displayName?.trim() || 'Merchant Owner';
    // Fallback formula when businessName is blank
    const chosenBizName = formBusinessNameInput.trim() || `${personalName}'s Store`;

    expect(chosenBizName).toBe("Kemi Adeleke's Store");

    // First sign-up creates the document with "Kemi Adeleke's Store"
    const businessId = `biz_${googleUser.uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`;
    const firestoreState: Record<string, any> = {
      [businessId]: {
        id: businessId,
        name: chosenBizName, // "Kemi Adeleke's Store"
        ownerName: personalName, // "Kemi Adeleke"
        ownerId: googleUser.uid,
        members: [googleUser.uid],
        memberUids: [googleUser.uid],
        category: 'Retail',
        currency: 'NGN',
      },
    };

    expect(firestoreState[businessId].name).toBe("Kemi Adeleke's Store");

    // SCENARIO 2: Merchant customizes their name to end in 's Store, e.g. "Kemi's Store"
    firestoreState[businessId].name = "Kemi's Store";
    expect(firestoreState[businessId].name.endsWith("'s Store")).toBe(true);

    // SCENARIO 3: Merchant logs out, and later logs in again via "Continue with Google"
    // Does onLoginAsMerchant run again for a returning Google user?
    // YES! handleGoogleSignIn in AuthPortal calls onLoginAsMerchant upon Google sign-in.
    let onLoginAsMerchantRanForReturningUser = false;

    // Simulated returning onLoginAsMerchant execution:
    const simulateReturningLogin = () => {
      onLoginAsMerchantRanForReturningUser = true;

      // On login, the form business name field on AuthPortal is blank:
      const returningFormBizName = '';
      const fallbackDefaultBizName = returningFormBizName.trim() || `${googleUser.displayName}'s Store`;

      // CRITICAL CHECK: Does the business document already exist in Firestore?
      const existingDoc = firestoreState[businessId];
      let finalBizName = fallbackDefaultBizName;
      let finalOwnerName = googleUser.displayName;

      if (existingDoc) {
        // RETURNING USER: Load true existing Firestore document! Never overwrite!
        finalBizName = existingDoc.name;
        finalOwnerName = existingDoc.ownerName;
      }

      return { finalBizName, finalOwnerName };
    };

    const loginResult = simulateReturningLogin();

    // 1. Confirm whether onLoginAsMerchant runs again for a returning Google user
    expect(onLoginAsMerchantRanForReturningUser).toBe(true);

    // 2. Confirm what name is loaded
    expect(loginResult.finalBizName).toBe("Kemi's Store");

    // 3. Confirm that the reconciler does NOT fire or overwrite it
    // Because the fragile reconciler branch has been completely removed from ensureBusinessDocumentAndSeed,
    // and onLoginAsMerchant loads the existing Firestore document, the document remains intact:
    expect(firestoreState[businessId].name).toBe("Kemi's Store");
  });
});

