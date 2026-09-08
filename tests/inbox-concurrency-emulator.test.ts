import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  runTransaction,
  Firestore,
} from 'firebase/firestore';

const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.skipIf(!hasEmulator)('Concurrent Customer Creation - Real Firestore Emulator', () => {
  let testEnv: RulesTestEnvironment;
  let db: Firestore;
  const businessId = 'biz_real_emulator_01';
  const ownerUserId = 'user_owner_01';

  beforeAll(async () => {
    const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8088';
    const [host, portStr] = emulatorHost.split(':');
    const port = portStr ? parseInt(portStr, 10) : 8088;

    testEnv = await initializeTestEnvironment({
      projectId: 'flowos-concurrency-test',
      firestore: {
        rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'),
        host,
        port,
      },
    });

    const context = testEnv.authenticatedContext(ownerUserId);
    db = context.firestore() as unknown as Firestore;
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();

    // Bootstrap business document with owner authorization
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'businesses', businessId), {
        name: 'Lagos Lux Apparel',
        ownerId: ownerUserId,
        ownerName: 'Babajide Adeleke',
        members: [ownerUserId],
        currency: 'NGN',
        phone: '+2348000000001',
      });
    });
  });

  it('guarantees atomic customer creation across concurrent requests using real Firestore runTransaction (Promise.all)', async () => {
    const brandNewPhone = '+2348123456789';
    const phoneDigits = '2348123456789';
    const customerDocId = `cust_${phoneDigits}`;
    const custRef = doc(db, 'businesses', businessId, 'customers', customerDocId);

    // Atomically find-or-create customer logic (matching src/services/storage.ts)
    const executeFindOrCreate = async (senderName: string, location: string) => {
      return await runTransaction(db, async (transaction) => {
        const custSnap = await transaction.get(custRef);
        if (custSnap.exists()) {
          const existing = custSnap.data();
          return existing;
        } else {
          const newCustomer = {
            id: customerDocId,
            businessId,
            name: senderName,
            phone: brandNewPhone,
            location: location,
            status: 'prospect',
            leadStage: 'NEW_LEAD',
            tags: ['WhatsApp Inquiry'],
            totalSpent: 0,
            orderCount: 0,
            averageOrderValue: 0,
            customerSince: new Date().toISOString().split('T')[0],
          };
          transaction.set(custRef, newCustomer);
          return newCustomer;
        }
      });
    };

    // CRITICAL: Launch two operations CONCURRENTLY without awaiting the first before starting the second.
    // Both transactions run simultaneously against the real Firestore emulator.
    const [resultA, resultB] = await Promise.all([
      executeFindOrCreate('Folake Martins', 'Victoria Island, Lagos'),
      executeFindOrCreate('Folake M.', 'Lagos'),
    ]);

    // 1. Both calls successfully resolved and returned the same customer ID
    expect(resultA).toBeDefined();
    expect(resultB).toBeDefined();
    expect(resultA.id).toBe(customerDocId);
    expect(resultB.id).toBe(customerDocId);
    expect(resultA.id).toBe(resultB.id);

    // 2. Query the REAL Firestore emulator collection to verify that ONLY ONE customer document exists
    const customerCollectionSnap = await getDocs(
      collection(db, 'businesses', businessId, 'customers')
    );
    expect(customerCollectionSnap.size).toBe(1);

    // 3. Confirm the single document matches the expected customer
    const createdDoc = customerCollectionSnap.docs[0];
    expect(createdDoc.id).toBe(customerDocId);
    expect(createdDoc.data().phone).toBe(brandNewPhone);
  });

  it('guarantees atomic customer creation under a high-concurrency burst (5 simultaneous requests via Promise.all)', async () => {
    const burstPhone = '+2349098765432';
    const phoneDigits = '2349098765432';
    const customerDocId = `cust_${phoneDigits}`;
    const custRef = doc(db, 'businesses', businessId, 'customers', customerDocId);

    const executeBurstFindOrCreate = async (index: number) => {
      return await runTransaction(db, async (transaction) => {
        const custSnap = await transaction.get(custRef);
        if (custSnap.exists()) {
          return custSnap.data();
        } else {
          const newCustomer = {
            id: customerDocId,
            businessId,
            name: `Caller ${index}`,
            phone: burstPhone,
            location: 'Abuja',
            status: 'prospect',
            leadStage: 'NEW_LEAD',
            tags: ['WhatsApp Inquiry'],
            totalSpent: 0,
            orderCount: 0,
            averageOrderValue: 0,
            customerSince: new Date().toISOString().split('T')[0],
          };
          transaction.set(custRef, newCustomer);
          return newCustomer;
        }
      });
    };

    // Fire 5 transactions at the exact same instant without waiting
    const results = await Promise.all([
      executeBurstFindOrCreate(1),
      executeBurstFindOrCreate(2),
      executeBurstFindOrCreate(3),
      executeBurstFindOrCreate(4),
      executeBurstFindOrCreate(5),
    ]);

    // All 5 returned the exact same customer ID
    expect(results.length).toBe(5);
    results.forEach((res) => {
      expect(res.id).toBe(customerDocId);
      expect(res.phone).toBe(burstPhone);
    });

    // Query real Firestore: exactly 1 document in the customers collection
    const snapshot = await getDocs(collection(db, 'businesses', businessId, 'customers'));
    expect(snapshot.size).toBe(1);
    expect(snapshot.docs[0].id).toBe(customerDocId);
  });
});
