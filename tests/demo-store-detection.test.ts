import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, ...paths) => paths.join('/')),
  doc: vi.fn((_db, ...paths) => paths.join('/')),
  getDoc: vi.fn(async (ref) => {
    const path = String(ref);
    if (path.includes('biz_luma_01') || path.includes('biz_luma_main')) {
      return {
        exists: () => true,
        data: () => ({ id: 'biz_luma_01', name: 'LUMA FASHION', ownerName: 'Amaka' }),
      };
    }
    return {
      exists: () => true,
      data: () => ({ id: path.split('/').pop(), name: 'Chioma Couture', ownerName: 'Chioma Adebayo' }),
    };
  }),
  getDocs: vi.fn(async () => ({ empty: true, docs: [] })),
  setDoc: vi.fn(async () => {}),
  updateDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
  onSnapshot: vi.fn(() => vi.fn()),
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
      uid: 'usr_chioma_789',
      email: 'chioma@example.ng',
      displayName: 'Chioma Adebayo',
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

import { storage, StorageServiceFacade as StorageService } from '../src/services/storage';
import { DEMO_BUSINESS } from '../src/data/seedData';

describe('Demo vs. Real Business Detection (isDemoStore)', () => {
  beforeEach(async () => {
    await storage.resetToDemoData();
  });

  it('verifies that a real new business returns isDemoStore() === false AND the actual Luma Fashion demo business returns isDemoStore() === true', async () => {
    // 1. Check Luma Fashion demo business (Default state)
    expect(StorageService.isDemoStore()).toBe(true);
    expect(storage.isDemoStore()).toBe(true);
    expect(storage.getBusiness().id).toBe(DEMO_BUSINESS.id);
    expect(storage.getBusiness().name).toBe('LUMA FASHION');
    expect(storage.getBusiness().ownerName).toBe('Amaka');
    expect(storage.getUser().displayName).toBe('Amaka');

    // 2. Transition into a real new business (e.g. Chioma Couture)
    await StorageService.setBusinessContext(
      'biz_chioma_couture_789',
      'usr_chioma_789',
      {
        name: 'Chioma Couture',
        ownerName: 'Chioma Adebayo',
        category: 'Fashion & Apparel',
        phone: '+234 801 234 5678',
        location: 'Victoria Island, Lagos',
      },
      false // Explicit real merchant account (isDemoMode = false)
    );

    // Assert that real business returns isDemoStore() === false
    expect(StorageService.isDemoStore()).toBe(false);
    expect(storage.isDemoStore()).toBe(false);
    expect(storage.getBusiness().id).toBe('biz_chioma_couture_789');
    expect(storage.getBusiness().name).toBe('Chioma Couture');
    expect(storage.getBusiness().ownerName).toBe('Chioma Adebayo');
    expect(storage.getUser().displayName).toBe('Chioma Adebayo');
    expect(storage.getLeads().length).toBe(0);
    expect(storage.getOrders().length).toBe(0);
    expect(storage.getMetrics().revenueToday).toBe(0);

    // 3. Switch back to the actual Luma Fashion demo business
    await StorageService.setBusinessContext(
      DEMO_BUSINESS.id,
      'usr_amaka_01',
      DEMO_BUSINESS,
      true // Demo mode = true
    );

    // Assert that Luma Fashion demo returns isDemoStore() === true
    expect(StorageService.isDemoStore()).toBe(true);
    expect(storage.isDemoStore()).toBe(true);
    expect(storage.getBusiness().id).toBe('biz_luma_01');
    expect(storage.getBusiness().name).toBe('LUMA FASHION');
    expect(storage.getBusiness().ownerName).toBe('Amaka');
    expect(storage.getUser().displayName).toBe('Amaka');

    // 4. Verify another distinct real merchant without demo flags defaults isDemoStore() === false
    await StorageService.setBusinessContext(
      'biz_ibrahim_tech_456',
      'usr_ibrahim_456',
      {
        name: 'Ibrahim Gadgets',
        ownerName: 'Ibrahim Musa',
      },
      false
    );

    expect(StorageService.isDemoStore()).toBe(false);
    expect(storage.isDemoStore()).toBe(false);
    expect(storage.getBusiness().name).toBe('Ibrahim Gadgets');
    expect(storage.getBusiness().ownerName).toBe('Ibrahim Musa');
    expect(storage.getUser().displayName).toBe('Ibrahim Musa');
  });
});
