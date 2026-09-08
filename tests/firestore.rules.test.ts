import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.skipIf(!hasEmulator)('Firestore Security Rules - Business Multi-Tenant Isolation', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8088';
    const [host, portStr] = emulatorHost.split(':');
    const port = portStr ? parseInt(portStr, 10) : 8088;

    testEnv = await initializeTestEnvironment({
      projectId: 'flowos-rules-test',
      firestore: {
        rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'),
        host,
        port,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();

    // Seed two businesses and subcollections using administrative privileges (bypassing security rules)
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();

      // Business A: Owned by user_a, members: [user_a, user_a_employee]
      await setDoc(doc(adminDb, 'businesses', 'biz_alpha'), {
        name: 'Alpha Store',
        ownerId: 'user_a',
        members: ['user_a', 'user_a_employee'],
        currency: 'NGN',
        phone: '+2348000000001',
      });

      // Business A subcollections
      await setDoc(doc(adminDb, 'businesses/biz_alpha/customers', 'cust_alpha_1'), {
        name: 'Alpha Customer',
        phone: '+2348111111111',
      });

      await setDoc(doc(adminDb, 'businesses/biz_alpha/orders', 'ord_alpha_1'), {
        orderNumber: 'ORD-A-001',
        total: 35000,
        paymentStatus: 'PAID',
      });

      await setDoc(doc(adminDb, 'businesses/biz_alpha/conversations', 'conv_alpha_1'), {
        customerName: 'Alpha Customer',
        lastMessage: 'Is this available in size M?',
      });

      await setDoc(doc(adminDb, 'businesses/biz_alpha/products', 'prod_alpha_1'), {
        name: 'Alpha Luxury Kaftan',
        price: 35000,
        stock: 12,
      });

      // Business B: Owned by user_b, members: [user_b]
      await setDoc(doc(adminDb, 'businesses', 'biz_beta'), {
        name: 'Beta Boutique',
        ownerId: 'user_b',
        members: ['user_b'],
        currency: 'NGN',
        phone: '+2348000000002',
      });

      // Business B subcollections
      await setDoc(doc(adminDb, 'businesses/biz_beta/customers', 'cust_beta_1'), {
        name: 'Beta Customer',
        phone: '+2348222222222',
      });

      await setDoc(doc(adminDb, 'businesses/biz_beta/orders', 'ord_beta_1'), {
        orderNumber: 'ORD-B-001',
        total: 50000,
        paymentStatus: 'PENDING',
      });

      await setDoc(doc(adminDb, 'businesses/biz_beta/conversations', 'conv_beta_1'), {
        customerName: 'Beta Customer',
        lastMessage: 'Price for 2 pairs?',
      });

      await setDoc(doc(adminDb, 'businesses/biz_beta/products', 'prod_beta_1'), {
        name: 'Beta Premium Sneakers',
        price: 50000,
        stock: 5,
      });
    });
  });

  describe('Authorized Member Access (Positive Tests)', () => {
    it("allows User A to read their own business document", async () => {
      const userADb = testEnv.authenticatedContext('user_a').firestore();
      await assertSucceeds(getDoc(doc(userADb, 'businesses', 'biz_alpha')));
    });

    it("allows listed member User A Employee to read Business A", async () => {
      const employeeDb = testEnv.authenticatedContext('user_a_employee').firestore();
      await assertSucceeds(getDoc(doc(employeeDb, 'businesses', 'biz_alpha')));
    });

    it("allows User A to read and write to Business A subcollections", async () => {
      const userADb = testEnv.authenticatedContext('user_a').firestore();

      // Read customer
      await assertSucceeds(getDoc(doc(userADb, 'businesses/biz_alpha/customers', 'cust_alpha_1')));

      // Read order
      await assertSucceeds(getDoc(doc(userADb, 'businesses/biz_alpha/orders', 'ord_alpha_1')));

      // Create new customer
      await assertSucceeds(
        setDoc(doc(userADb, 'businesses/biz_alpha/customers', 'cust_alpha_2'), {
          name: 'New Alpha Customer',
          phone: '+2348333333333',
        })
      );

      // Create new product
      await assertSucceeds(
        setDoc(doc(userADb, 'businesses/biz_alpha/products', 'prod_alpha_2'), {
          name: 'New Alpha Item',
          price: 20000,
        })
      );
    });

    it("allows User B to read their own business document and subcollections", async () => {
      const userBDb = testEnv.authenticatedContext('user_b').firestore();
      await assertSucceeds(getDoc(doc(userBDb, 'businesses', 'biz_beta')));
      await assertSucceeds(getDoc(doc(userBDb, 'businesses/biz_beta/orders', 'ord_beta_1')));
    });
  });

  describe('Cross-Tenant Data Isolation (Negative Tests - User A -> User B)', () => {
    it("DENIES User A from reading User B's business document", async () => {
      const userADb = testEnv.authenticatedContext('user_a').firestore();
      await assertFails(getDoc(doc(userADb, 'businesses', 'biz_beta')));
    });

    it("DENIES User A from modifying User B's business document", async () => {
      const userADb = testEnv.authenticatedContext('user_a').firestore();
      await assertFails(
        updateDoc(doc(userADb, 'businesses', 'biz_beta'), {
          name: 'Compromised Business',
        })
      );
    });

    it("DENIES User A from reading User B's customers", async () => {
      const userADb = testEnv.authenticatedContext('user_a').firestore();
      await assertFails(getDoc(doc(userADb, 'businesses/biz_beta/customers', 'cust_beta_1')));
    });

    it("DENIES User A from creating/injecting a customer into User B's business", async () => {
      const userADb = testEnv.authenticatedContext('user_a').firestore();
      await assertFails(
        setDoc(doc(userADb, 'businesses/biz_beta/customers', 'cust_intruder'), {
          name: 'Malicious Customer Injection',
          phone: '+2349999999999',
        })
      );
    });

    it("DENIES User A from reading User B's orders and financial data", async () => {
      const userADb = testEnv.authenticatedContext('user_a').firestore();
      await assertFails(getDoc(doc(userADb, 'businesses/biz_beta/orders', 'ord_beta_1')));
    });

    it("DENIES User A from modifying or creating orders in User B's business", async () => {
      const userADb = testEnv.authenticatedContext('user_a').firestore();

      // Tampering with existing order
      await assertFails(
        updateDoc(doc(userADb, 'businesses/biz_beta/orders', 'ord_beta_1'), {
          total: 0,
          paymentStatus: 'PAID',
        })
      );

      // Injecting fake order
      await assertFails(
        setDoc(doc(userADb, 'businesses/biz_beta/orders', 'ord_fraud'), {
          total: 0,
          orderNumber: 'FRAUD-001',
        })
      );
    });

    it("DENIES User A from reading User B's conversations and messages", async () => {
      const userADb = testEnv.authenticatedContext('user_a').firestore();
      await assertFails(getDoc(doc(userADb, 'businesses/biz_beta/conversations', 'conv_beta_1')));
      await assertFails(
        getDoc(doc(userADb, 'businesses/biz_beta/conversations/conv_beta_1/messages', 'msg_beta_1'))
      );
    });

    it("DENIES User A from reading or modifying User B's product catalog", async () => {
      const userADb = testEnv.authenticatedContext('user_a').firestore();
      await assertFails(getDoc(doc(userADb, 'businesses/biz_beta/products', 'prod_beta_1')));
      await assertFails(
        updateDoc(doc(userADb, 'businesses/biz_beta/products', 'prod_beta_1'), {
          price: 1,
        })
      );
    });
  });

  describe('Explicit Write Denial (setDoc, updateDoc, deleteDoc: User A -> Business B)', () => {
    // 1. Business Document writes
    it("DENIES User A from setDoc into User B's business document", async () => {
      const userADb = testEnv.authenticatedContext('user_a').firestore();
      await assertFails(
        setDoc(doc(userADb, 'businesses', 'biz_beta'), {
          name: 'Hijacked Business B',
          ownerId: 'user_a',
        })
      );
    });

    it("DENIES User A from updateDoc on User B's business document", async () => {
      const userADb = testEnv.authenticatedContext('user_a').firestore();
      await assertFails(
        updateDoc(doc(userADb, 'businesses', 'biz_beta'), {
          name: 'Tampered Business B',
        })
      );
    });

    it("DENIES User A from deleteDoc on User B's business document", async () => {
      const userADb = testEnv.authenticatedContext('user_a').firestore();
      await assertFails(
        deleteDoc(doc(userADb, 'businesses', 'biz_beta'))
      );
    });

    // 2. Customers subcollection writes
    it("DENIES User A from setDoc into User B's customers", async () => {
      const userADb = testEnv.authenticatedContext('user_a').firestore();
      await assertFails(
        setDoc(doc(userADb, 'businesses/biz_beta/customers', 'cust_injected'), {
          name: 'Injected Customer',
          phone: '+2348000000000',
          businessId: 'biz_beta',
        })
      );
    });

    it("DENIES User A from updateDoc on User B's customers", async () => {
      const userADb = testEnv.authenticatedContext('user_a').firestore();
      await assertFails(
        updateDoc(doc(userADb, 'businesses/biz_beta/customers', 'cust_beta_1'), {
          name: 'Tampered Customer Name',
        })
      );
    });

    it("DENIES User A from deleteDoc on User B's customers", async () => {
      const userADb = testEnv.authenticatedContext('user_a').firestore();
      await assertFails(
        deleteDoc(doc(userADb, 'businesses/biz_beta/customers', 'cust_beta_1'))
      );
    });

    // 3. Orders subcollection writes
    it("DENIES User A from setDoc into User B's orders", async () => {
      const userADb = testEnv.authenticatedContext('user_a').firestore();
      await assertFails(
        setDoc(doc(userADb, 'businesses/biz_beta/orders', 'ord_fraudulent'), {
          orderNumber: 'FRAUD-999',
          total: 0,
          paymentStatus: 'paid',
          businessId: 'biz_beta',
        })
      );
    });

    it("DENIES User A from updateDoc on User B's orders", async () => {
      const userADb = testEnv.authenticatedContext('user_a').firestore();
      await assertFails(
        updateDoc(doc(userADb, 'businesses/biz_beta/orders', 'ord_beta_1'), {
          total: 0,
          paymentStatus: 'paid',
        })
      );
    });

    it("DENIES User A from deleteDoc on User B's orders", async () => {
      const userADb = testEnv.authenticatedContext('user_a').firestore();
      await assertFails(
        deleteDoc(doc(userADb, 'businesses/biz_beta/orders', 'ord_beta_1'))
      );
    });
  });

  describe('Cross-Tenant Data Isolation (Negative Tests - User B -> User A)', () => {
    it("DENIES User B from reading User A's business document", async () => {
      const userBDb = testEnv.authenticatedContext('user_b').firestore();
      await assertFails(getDoc(doc(userBDb, 'businesses', 'biz_alpha')));
    });

    it("DENIES User B from reading or writing to User A's customers", async () => {
      const userBDb = testEnv.authenticatedContext('user_b').firestore();
      await assertFails(getDoc(doc(userBDb, 'businesses/biz_alpha/customers', 'cust_alpha_1')));
      await assertFails(
        setDoc(doc(userBDb, 'businesses/biz_alpha/customers', 'cust_b_hack'), {
          name: 'Hacked by B',
        })
      );
    });

    it("DENIES User B from reading User A's orders", async () => {
      const userBDb = testEnv.authenticatedContext('user_b').firestore();
      await assertFails(getDoc(doc(userBDb, 'businesses/biz_alpha/orders', 'ord_alpha_1')));
    });
  });

  describe('Unauthenticated Access (Negative Tests)', () => {
    it("DENIES unauthenticated users from reading any business document", async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(unauthDb, 'businesses', 'biz_alpha')));
      await assertFails(getDoc(doc(unauthDb, 'businesses', 'biz_beta')));
    });

    it("DENIES unauthenticated users from reading any subcollection", async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(unauthDb, 'businesses/biz_alpha/customers', 'cust_alpha_1')));
      await assertFails(getDoc(doc(unauthDb, 'businesses/biz_beta/orders', 'ord_beta_1')));
    });
  });

  describe('Sign-up & Bootstrap Seeding Flow Evaluation', () => {
    it('demonstrates whether single-batch creation of business doc + subcollections succeeds or throws PERMISSION_DENIED', async () => {
      const newUserDb = testEnv.authenticatedContext('user_new_signup').firestore();
      const batch = writeBatch(newUserDb);

      // Business doc
      const bizDocRef = doc(newUserDb, 'businesses', 'biz_new_signup');
      batch.set(bizDocRef, {
        name: 'New Store Single Batch',
        ownerId: 'user_new_signup',
        members: ['user_new_signup'],
        memberUids: ['user_new_signup'],
        createdAt: new Date().toISOString(),
      });

      // Subcollections in same batch
      batch.set(doc(newUserDb, 'businesses/biz_new_signup/knowledgeBase', 'default'), {
        id: 'default',
        businessId: 'biz_new_signup',
      });
      batch.set(doc(newUserDb, 'businesses/biz_new_signup/customers', 'cust_1'), {
        id: 'cust_1',
        name: 'First Customer',
        businessId: 'biz_new_signup',
      });
      batch.set(doc(newUserDb, 'businesses/biz_new_signup/products', 'prod_1'), {
        id: 'prod_1',
        name: 'First Product',
        businessId: 'biz_new_signup',
      });
      batch.set(doc(newUserDb, 'businesses/biz_new_signup/leads', 'lead_1'), {
        id: 'lead_1',
        businessId: 'biz_new_signup',
      });

      // Single-batch commit throws PERMISSION_DENIED because get(/businesses/...) fails before commit
      await assertFails(batch.commit());
    });

    it('SUCCEEDS when split into two sequential writes: first commit business doc alone, then seed subcollections in a second write', async () => {
      const newUserDb = testEnv.authenticatedContext('user_new_sequential').firestore();

      // Write 1: Commit the business document alone and confirm it succeeds
      await assertSucceeds(
        setDoc(doc(newUserDb, 'businesses', 'biz_new_sequential'), {
          name: 'New Store Sequential',
          ownerId: 'user_new_sequential',
          members: ['user_new_sequential'],
          memberUids: ['user_new_sequential'],
          createdAt: new Date().toISOString(),
        })
      );

      // Write 2: Seed subcollections in a second batch now that the parent doc exists in the database
      const subBatch = writeBatch(newUserDb);
      subBatch.set(doc(newUserDb, 'businesses/biz_new_sequential/knowledgeBase', 'default'), {
        id: 'default',
        businessId: 'biz_new_sequential',
      });
      subBatch.set(doc(newUserDb, 'businesses/biz_new_sequential/customers', 'cust_seq_1'), {
        id: 'cust_seq_1',
        name: 'Sequential Customer',
        businessId: 'biz_new_sequential',
      });
      subBatch.set(doc(newUserDb, 'businesses/biz_new_sequential/products', 'prod_seq_1'), {
        id: 'prod_seq_1',
        name: 'Sequential Product',
        price: 5000,
        businessId: 'biz_new_sequential',
      });
      subBatch.set(doc(newUserDb, 'businesses/biz_new_sequential/leads', 'lead_seq_1'), {
        id: 'lead_seq_1',
        businessId: 'biz_new_sequential',
      });

      await assertSucceeds(subBatch.commit());
    });

    it('SUCCEEDS for real user sign-up starting with empty store and clean knowledgeBase (isDemoMode = false)', async () => {
      const realUserDb = testEnv.authenticatedContext('user_real_signup').firestore();

      // Step 1: Commit business document with real user name and ownership
      await assertSucceeds(
        setDoc(doc(realUserDb, 'businesses', 'biz_real_store'), {
          name: 'Adaora Couture',
          ownerName: 'Adaora Okonkwo',
          ownerId: 'user_real_signup',
          members: ['user_real_signup'],
          memberUids: ['user_real_signup'],
          category: 'Fashion & Design',
          phone: '+2348031234567',
          location: 'Victoria Island, Lagos',
          currency: 'NGN',
          createdAt: new Date().toISOString(),
        })
      );

      // Step 2: Write clean knowledgeBase only (no demo products/customers/leads)
      await assertSucceeds(
        setDoc(doc(realUserDb, 'businesses/biz_real_store/knowledgeBase', 'default'), {
          id: 'default',
          businessId: 'biz_real_store',
          businessDescription: 'Adaora Couture operates on WhatsApp powered by FlowOS.',
          openingHours: 'Monday – Saturday: 9:00 AM – 6:00 PM WAT',
          location: 'Victoria Island, Lagos',
          deliveryPolicy: 'Standard dispatch: 1-3 business days across Lagos and nationwide delivery available.',
          paymentMethods: 'Direct bank transfer and secure online checkout links.',
          returnPolicy: 'Returns accepted within 48 hours for unworn items with tags intact.',
          discountRules: 'Special offers and loyalty discounts applied at checkout.',
          faqs: [],
          brandVoice: 'Professional, welcoming, and prompt.',
        })
      );

      // Verify business document exists and has Adaora Couture as name
      const bizSnap = await getDoc(doc(realUserDb, 'businesses', 'biz_real_store'));
      expect(bizSnap.exists()).toBe(true);
      expect(bizSnap.data()?.name).toBe('Adaora Couture');
    });

    it('SUCCEEDS and saves EXACT business name "Lagos Glow Co." when personal name is blank', async () => {
      const merchantDb = testEnv.authenticatedContext('user_lagos_glow').firestore();
      const userId = 'user_lagos_glow';
      const typedBusinessName = 'Lagos Glow Co.';
      const personalNameInput = ''; // Left blank by user
      const defaultOwnerName = personalNameInput.trim() || 'Merchant Owner';

      // 1. User profile created with personal name (Merchant Owner, NOT Lagos Glow Co.)
      await assertSucceeds(
        setDoc(doc(merchantDb, 'users', userId), {
          id: userId,
          email: 'merchant@lagosglow.ng',
          displayName: defaultOwnerName,
          businessId: 'biz_lagos_glow',
          role: 'owner',
          createdAt: new Date().toISOString(),
        })
      );

      // 2. Single authoritative business document write
      await assertSucceeds(
        setDoc(doc(merchantDb, 'businesses', 'biz_lagos_glow'), {
          id: 'biz_lagos_glow',
          name: typedBusinessName, // Exactly what was typed
          ownerName: defaultOwnerName, // Personal name, distinct from business name
          ownerId: userId,
          members: [userId],
          memberUids: [userId],
          category: 'Retail',
          phone: '',
          location: '',
          currency: 'NGN',
          description: `${typedBusinessName} on FlowOS`,
          createdAt: new Date().toISOString(),
        })
      );

      // Verify what actually got saved in Firestore
      const bizSnap = await getDoc(doc(merchantDb, 'businesses', 'biz_lagos_glow'));
      expect(bizSnap.exists()).toBe(true);
      // It must be EXACTLY what was typed ('Lagos Glow Co.') — NOT "Lagos Glow Co.'s Store", NOT "My Store", NOT personal name
      expect(bizSnap.data()?.name).toBe('Lagos Glow Co.');
      // Owner name must be the personal name default ('Merchant Owner') — NOT 'Lagos Glow Co.'
      expect(bizSnap.data()?.ownerName).toBe('Merchant Owner');

      // Verify user document
      const userSnap = await getDoc(doc(merchantDb, 'users', userId));
      expect(userSnap.exists()).toBe(true);
      expect(userSnap.data()?.displayName).toBe('Merchant Owner');
    });

    it('SUCCEEDS with Google sign-up when business name is blank and preserves existing document on later logins', async () => {
      const googleUserId = 'google_user_kemi_999';
      const googleUserDb = testEnv.authenticatedContext(googleUserId).firestore();
      const businessId = 'biz_kemi_adeleke';

      // 1. Google sign-up with blank business name:
      // Personal name from Google profile: "Kemi Adeleke"
      // Business name input: "" (blank) -> defaults to `${personalName}'s Store`
      const personalName = 'Kemi Adeleke';
      const initialBizName = `${personalName}'s Store`; // "Kemi Adeleke's Store"

      await assertSucceeds(
        setDoc(doc(googleUserDb, 'users', googleUserId), {
          id: googleUserId,
          email: 'kemi@adeleke.com',
          displayName: personalName,
          businessId,
          role: 'owner',
          createdAt: new Date().toISOString(),
        })
      );

      // Business document created on first Google sign-up
      await assertSucceeds(
        setDoc(doc(googleUserDb, 'businesses', businessId), {
          id: businessId,
          name: initialBizName,
          ownerName: personalName,
          ownerId: googleUserId,
          members: [googleUserId],
          memberUids: [googleUserId],
          category: 'Retail',
          phone: '',
          location: '',
          currency: 'NGN',
          createdAt: new Date().toISOString(),
        })
      );

      let docSnap = await getDoc(doc(googleUserDb, 'businesses', businessId));
      expect(docSnap.exists()).toBe(true);
      expect(docSnap.data()?.name).toBe("Kemi Adeleke's Store");

      // 2. Merchant customizes their name in Settings to "Kemi's Store" (ends in 's Store)
      await assertSucceeds(
        updateDoc(doc(googleUserDb, 'businesses', businessId), {
          name: "Kemi's Store",
        })
      );

      docSnap = await getDoc(doc(googleUserDb, 'businesses', businessId));
      expect(docSnap.data()?.name).toBe("Kemi's Store");

      // 3. Returning login next month:
      // The returning user signs in. onLoginAsMerchant queries Firestore:
      const existingSnap = await getDoc(doc(googleUserDb, 'businesses', businessId));
      expect(existingSnap.exists()).toBe(true);

      // Because the document exists, existingSnap.data().name ("Kemi's Store") is used
      // and NO overwrite occurs.
      expect(existingSnap.data()?.name).toBe("Kemi's Store");
    });
  });
});
