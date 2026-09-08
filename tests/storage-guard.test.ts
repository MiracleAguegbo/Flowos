import { describe, it, expect, vi, beforeEach } from 'vitest';

// Track listener attachments and unsubscribes
let onSnapshotCallCount = 0;
const mockUnsubscribes: Array<() => void> = [];

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, ...paths) => paths.join('/')),
  doc: vi.fn((_db, ...paths) => paths.join('/')),
  getDoc: vi.fn(async () => {
    // Simulate real Firestore async network latency
    await new Promise((resolve) => setTimeout(resolve, 25));
    return {
      exists: () => true,
      data: () => ({ id: 'biz_test_456', name: 'Original Store Name', ownerName: 'Original Owner' }),
    };
  }),
  getDocs: vi.fn(async () => ({ docs: [] })),
  setDoc: vi.fn(async () => {}),
  updateDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
  onSnapshot: vi.fn(() => {
    onSnapshotCallCount++;
    const unsub = vi.fn();
    mockUnsubscribes.push(unsub);
    return unsub;
  }),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    commit: vi.fn(async () => {}),
  })),
  query: vi.fn((col) => col),
  where: vi.fn(() => ({})),
}));

vi.mock('../src/services/firebase', () => ({
  db: {},
  auth: {
    currentUser: {
      uid: 'user_merchant_456',
      email: 'merchant@example.com',
      displayName: 'Original Owner',
    },
  },
  handleFirestoreError: vi.fn(),
  OperationType: {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    LIST: 'list',
    GET: 'get',
    WRITE: 'write',
  },
}));

import { storage, StorageService } from '../src/services/storage';

describe('StorageService.setBusinessContext guard for consecutive calls', () => {
  beforeEach(() => {
    onSnapshotCallCount = 0;
    mockUnsubscribes.length = 0;
  });

  it('calling setBusinessContext twice in a row with the same businessId skips clearing arrays and skips re-subscribing listeners', async () => {
    const businessId = 'biz_test_456';
    const userId = 'user_merchant_456';

    // =========================================================================
    // FIRST CALL: Initial context attachment
    // =========================================================================
    await storage.setBusinessContext(
      businessId,
      userId,
      { name: 'Original Store Name', ownerName: 'Original Owner' },
      false
    );

    // Verify Firestore listeners were attached on first call
    const initialListenerCount = storage.getListenerCount();
    expect(storage.hasAttachedListeners()).toBe(true);
    expect(initialListenerCount).toBe(8); // 8 root subcollection/doc onSnapshot streams
    expect(onSnapshotCallCount).toBe(8);

    // Populate in-memory arrays to simulate active store data
    const testCustomer = {
      name: 'Chioma Eze',
      phone: '+2348011223344',
      email: 'chioma@example.com',
      location: 'Lagos, Nigeria',
      status: 'active' as const,
      leadStage: 'COMPLETED' as const,
      tags: ['VIP'],
      totalSpent: 45000,
      orderCount: 3,
      averageOrderValue: 15000,
      customerSince: '2026-09-07',
    };
    storage.addCustomer(testCustomer);

    // Verify data exists in memory
    expect(storage.getCustomers().length).toBeGreaterThan(0);
    const customerCountBeforeSecondCall = storage.getCustomers().length;
    const ordersBeforeSecondCall = storage.getOrders().length;
    const productsBeforeSecondCall = storage.getProducts().length;

    // Snapshot snapshot calls before second invocation
    const snapshotCallsBeforeSecondCall = onSnapshotCallCount;

    // =========================================================================
    // SECOND CALL: Returning login with same businessId and updated meta
    // =========================================================================
    await storage.setBusinessContext(
      businessId,
      userId,
      { name: 'Updated Store Name', ownerName: 'Updated Owner Name' },
      false
    );

    // 1. CONFIRMATION: In-memory arrays are NOT cleared
    expect(storage.getCustomers().length).toBe(customerCountBeforeSecondCall);
    expect(storage.getCustomers().some((c) => c.name === 'Chioma Eze')).toBe(true);
    expect(storage.getOrders().length).toBe(ordersBeforeSecondCall);
    expect(storage.getProducts().length).toBe(productsBeforeSecondCall);

    // 2. CONFIRMATION: Firestore listeners are NOT re-subscribed or duplicated
    expect(onSnapshotCallCount).toBe(snapshotCallsBeforeSecondCall); // 0 new onSnapshot calls!
    expect(storage.getListenerCount()).toBe(initialListenerCount); // Listener count unchanged!
    // Verify none of the existing unsubscribe functions were triggered
    for (const unsub of mockUnsubscribes) {
      expect(unsub).not.toHaveBeenCalled();
    }

    // 3. CONFIRMATION: Updated meta was cleanly merged
    expect(storage.getBusiness().name).toBe('Updated Store Name');
    expect(storage.getBusiness().ownerName).toBe('Updated Owner Name');
  });

  it('overlapping concurrent calls (Promise.all) result in exactly 8 listeners, not 16', async () => {
    // Reset storage to a fresh business context first
    const businessId = 'biz_concurrent_789';
    const userId = 'user_concurrent_789';

    // Reset counters
    onSnapshotCallCount = 0;
    mockUnsubscribes.length = 0;

    // Call setBusinessContext twice concurrently without awaiting the first before launching the second
    const p1 = storage.setBusinessContext(
      businessId,
      userId,
      { name: 'Initial Biz Name', ownerName: 'Initial Owner' },
      false
    );
    const p2 = storage.setBusinessContext(
      businessId,
      userId,
      { name: 'Updated Overlapping Name', ownerName: 'Updated Overlapping Owner' },
      false
    );

    // Await both overlapping promises
    await Promise.all([p1, p2]);

    // CONFIRMATION: Exactly 8 listeners attached, NOT 16!
    expect(storage.getListenerCount()).toBe(8);
    expect(onSnapshotCallCount).toBe(8);
    expect(storage.hasAttachedListeners()).toBe(true);

    // CONFIRMATION: Final business state captures the merged meta from the overlapping call
    expect(storage.getBusiness().name).toBe('Updated Overlapping Name');
    expect(storage.getBusiness().ownerName).toBe('Updated Overlapping Owner');

    // CONFIRMATION: isConnecting flag is cleanly reset to false in finally
    expect(storage.isConnectingContext()).toBe(false);
  });

  it('resets isConnecting to false via finally even if initialization throws an error', async () => {
    const errorBizId = 'biz_error_999';
    const userId = 'user_error_999';

    // Mock ensureBusinessDocumentAndSeed failure by making getDoc reject once
    const { getDoc } = await import('firebase/firestore');
    vi.mocked(getDoc).mockRejectedValueOnce(new Error('Network connection timeout'));

    // Should reject or handle gracefully
    await storage.setBusinessContext(
      errorBizId,
      userId,
      { name: 'Failing Store' },
      false
    );

    // CONFIRMATION: isConnecting flag was reset to false via finally block
    expect(storage.isConnectingContext()).toBe(false);
  });

  it('retries real setup when the leading call fails and listeners are never attached', async () => {
    const businessId = 'biz_retry_after_fail';
    const userId = 'user_retry_123';

    // Reset counters
    onSnapshotCallCount = 0;
    mockUnsubscribes.length = 0;

    const { getDoc } = await import('firebase/firestore');
    // Reject on the first getDoc call (simulating leading call failure in ensureBusinessDocumentAndSeed),
    // then succeed on subsequent calls (for the retry)
    vi.mocked(getDoc).mockRejectedValueOnce(new Error('Transient network glitch'));

    // Launch leading call and overlapping call concurrently
    const p1 = storage.setBusinessContext(
      businessId,
      userId,
      { name: 'Store First Attempt' },
      false
    );
    const p2 = storage.setBusinessContext(
      businessId,
      userId,
      { name: 'Store Second Attempt' },
      false
    );

    // Await both promises
    await Promise.all([p1, p2]);

    // CONFIRMATION: The second call detected that the leading call failed without attaching listeners,
    // retried real setup, and successfully attached all 8 Firestore listeners instead of assuming success!
    expect(storage.getListenerCount()).toBe(8);
    expect(storage.hasAttachedListeners()).toBe(true);
    expect(onSnapshotCallCount).toBe(8);

    // Business name is updated
    expect(storage.getBusiness().name).toBe('Store Second Attempt');
    expect(storage.isConnectingContext()).toBe(false);
  });
});
