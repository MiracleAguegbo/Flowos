import { describe, it, expect, vi, beforeEach } from 'vitest';

const writeOperations: Array<{ type: 'setDoc' | 'updateDoc'; path: string; data: any }> = [];
const inMemoryFirestoreDb = new Map<string, any>();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, ...paths) => paths.join('/')),
  doc: vi.fn((_db, ...paths) => paths.join('/')),
  getDoc: vi.fn(async (ref) => {
    const data = inMemoryFirestoreDb.get(String(ref));
    return {
      exists: () => !!data,
      data: () => data,
    };
  }),
  getDocs: vi.fn(async () => ({ empty: true, docs: [] })),
  setDoc: vi.fn(async (ref, data) => {
    inMemoryFirestoreDb.set(String(ref), data);
    writeOperations.push({ type: 'setDoc', path: String(ref), data });
  }),
  updateDoc: vi.fn(async (ref, data) => {
    const existing = inMemoryFirestoreDb.get(String(ref)) || {};
    const updated = { ...existing, ...data };
    inMemoryFirestoreDb.set(String(ref), updated);
    writeOperations.push({ type: 'updateDoc', path: String(ref), data });
  }),
  runTransaction: vi.fn(async (_db, updateFn) => {
    const transaction = {
      get: async (ref: any) => {
        const path = String(ref);
        const data = inMemoryFirestoreDb.get(path);
        return {
          exists: () => !!data,
          data: () => data,
        };
      },
      set: (ref: any, data: any) => {
        const path = String(ref);
        inMemoryFirestoreDb.set(path, data);
        writeOperations.push({ type: 'setDoc', path, data });
      },
      update: (ref: any, data: any) => {
        const path = String(ref);
        const existing = inMemoryFirestoreDb.get(path) || {};
        const updated = { ...existing, ...data };
        inMemoryFirestoreDb.set(path, updated);
        writeOperations.push({ type: 'updateDoc', path, data });
      },
    };
    return await updateFn(transaction);
  }),
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
      uid: 'user_amaka_01',
      email: 'amaka@aurafashion.ng',
      displayName: 'Amaka Owner',
    },
  },
  handleFirestoreError: vi.fn(),
  OperationType: {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    LIST: 'list',
    GET: 'get',
  },
}));

describe('Inbox Sequential Firestore Persistence', () => {
  let StorageServiceModule: typeof import('../src/services/storage');

  beforeEach(async () => {
    vi.clearAllMocks();
    writeOperations.length = 0;
    inMemoryFirestoreDb.clear();
    vi.resetModules();
    StorageServiceModule = await import('../src/services/storage');
    // Ensure business context is set
    await StorageServiceModule.storage.setBusinessContext('biz_fashion_01', 'user_amaka_01');
    writeOperations.length = 0;
  });

  it('persists inbound message in strict sequence: Customer -> Conversation -> Message under business path', async () => {
    const result = await StorageServiceModule.storage.handleInboundMessage({
      phone: '+234 819 999 8888',
      name: 'Chioma Adebayo',
      location: 'Ikoyi, Lagos',
      text: 'Good day! Is the Emerald wrap dress available in size 12?',
      estimatedValue: 125000,
    });

    expect(result.customer).toBeDefined();
    expect(result.conversation).toBeDefined();
    expect(result.message).toBeDefined();

    // Verify exactly 3 writes were recorded in strict order
    expect(writeOperations.length).toBe(3);

    const [firstWrite, secondWrite, thirdWrite] = writeOperations;

    // 1. Customer write must come first
    expect(firstWrite.type).toBe('setDoc');
    expect(firstWrite.path).toBe(`businesses/biz_fashion_01/customers/${result.customer.id}`);
    expect(firstWrite.data.name).toBe('Chioma Adebayo');
    expect(firstWrite.data.location).toBe('Ikoyi, Lagos');

    // 2. Conversation write must come second
    expect(secondWrite.type).toBe('setDoc');
    expect(secondWrite.path).toBe(`businesses/biz_fashion_01/conversations/${result.conversation.id}`);
    expect(secondWrite.data.customerId).toBe(result.customer.id);
    expect(secondWrite.data.lastMessage).toBe('Good day! Is the Emerald wrap dress available in size 12?');

    // 3. Message write must come third under the conversation subcollection
    expect(thirdWrite.type).toBe('setDoc');
    expect(thirdWrite.path).toBe(
      `businesses/biz_fashion_01/conversations/${result.conversation.id}/messages/${result.message.id}`
    );
    expect(thirdWrite.data.content).toBe('Good day! Is the Emerald wrap dress available in size 12?');
    expect(thirdWrite.data.direction).toBe('inbound');
  });

  it('reuses existing customer and updates conversation in sequence when second message lands', async () => {
    // First message lands
    const initial = await StorageServiceModule.storage.handleInboundMessage({
      phone: '+234 814 111 2233',
      name: 'Ngozi Eze',
      location: 'Enugu',
      text: 'Hello, what colors do you have?',
    });

    writeOperations.length = 0;

    // Second message lands from same phone
    const subsequent = await StorageServiceModule.storage.handleInboundMessage({
      phone: '+234 814 111 2233',
      text: 'Can you deliver by Friday?',
    });

    // Reuses the customer
    expect(subsequent.customer.id).toBe(initial.customer.id);
    expect(subsequent.conversation.id).toBe(initial.conversation.id);

    // Sequence for existing contact:
    // Conversation updated -> Message created
    expect(writeOperations.length).toBe(2);
    expect(writeOperations[0].type).toBe('updateDoc');
    expect(writeOperations[0].path).toBe(`businesses/biz_fashion_01/conversations/${initial.conversation.id}`);
    expect(writeOperations[0].data.lastMessage).toBe('Can you deliver by Friday?');

    expect(writeOperations[1].type).toBe('setDoc');
    expect(writeOperations[1].path).toBe(
      `businesses/biz_fashion_01/conversations/${initial.conversation.id}/messages/${subsequent.message.id}`
    );
  });

  it('persists outbound merchant message to conversation subcollection and updates conversation document', async () => {
    const inbound = await StorageServiceModule.storage.handleInboundMessage({
      phone: '+234 807 555 4433',
      name: 'Zainab Ahmed',
      text: 'Can I pay via transfer?',
    });

    writeOperations.length = 0;

    const reply = await StorageServiceModule.storage.sendMessage(
      inbound.conversation.id,
      'Yes! We accept Zenith and GTBank transfers. Let me send the invoice.',
      'business'
    );

    expect(reply.direction).toBe('outbound');
    expect(writeOperations.length).toBe(2);

    // 1. Message created under subcollection
    expect(writeOperations[0].type).toBe('setDoc');
    expect(writeOperations[0].path).toBe(
      `businesses/biz_fashion_01/conversations/${inbound.conversation.id}/messages/${reply.id}`
    );
    expect(writeOperations[0].data.content).toContain('Zenith and GTBank');

    // 2. Conversation lastMessage updated
    expect(writeOperations[1].type).toBe('updateDoc');
    expect(writeOperations[1].path).toBe(`businesses/biz_fashion_01/conversations/${inbound.conversation.id}`);
    expect(writeOperations[1].data.lastMessage).toContain('Zenith and GTBank');
  });

  it('normalizes Nigerian phone variations (+2348011223344 and 08011223344) to the exact same customer and conversation', async () => {
    // First message lands with +234 international format
    const msg1 = await StorageServiceModule.storage.handleInboundMessage({
      phone: '+2348011223344',
      name: 'Tunde Bakare',
      text: 'Hello from +234 format',
    });

    writeOperations.length = 0;

    // Second message lands from local 080 format
    const msg2 = await StorageServiceModule.storage.handleInboundMessage({
      phone: '08011223344',
      text: 'Follow-up from 080 format',
    });

    // Both messages MUST resolve to the exact same customer ID
    expect(msg2.customer.id).toBe(msg1.customer.id);
    expect(msg2.conversation.id).toBe(msg1.conversation.id);

    // Only conversation update and message write occurred, NO duplicate customer setDoc
    const customerWrites = writeOperations.filter((op) =>
      op.path.includes('/customers/')
    );
    expect(customerWrites.length).toBe(0);

    expect(writeOperations.some((op) => op.type === 'updateDoc' && op.path.includes(`/conversations/${msg1.conversation.id}`))).toBe(true);
  });

  it('handles race conditions: two concurrent messages from a brand-new number within milliseconds create only ONE customer', async () => {
    const brandNewPhone = '+2348099887766';

    // Simulate two messages dispatched concurrently at almost the exact same instant
    const [res1, res2] = await Promise.all([
      StorageServiceModule.storage.handleInboundMessage({
        phone: brandNewPhone,
        name: 'Simisola Ogundipe',
        text: 'Message 1 arriving simultaneously',
      }),
      StorageServiceModule.storage.handleInboundMessage({
        phone: brandNewPhone,
        text: 'Message 2 arriving simultaneously',
      }),
    ]);

    // Both results MUST share the identical customer and conversation
    expect(res1.customer.id).toBe(res2.customer.id);
    expect(res1.conversation.id).toBe(res2.conversation.id);

    // Verify in all recorded Firestore write operations that only ONE customer document was created
    const customerCreations = writeOperations.filter(
      (op) => op.type === 'setDoc' && op.path.includes('/customers/')
    );
    expect(customerCreations.length).toBe(1);
    expect(customerCreations[0].path).toBe(`businesses/biz_fashion_01/customers/${res1.customer.id}`);
  });

  it("assigns team member based on active business's real owner data (not hardcoded Amaka)", async () => {
    // Switch to another business: e.g. Emeka Electronics with owner 'Emeka Eze'
    await StorageServiceModule.storage.setBusinessContext('biz_electronics_02', 'user_emeka_02', {
      name: 'Emeka Electronics',
      ownerName: 'Emeka Eze',
    });

    const result = await StorageServiceModule.storage.handleInboundMessage({
      phone: '+234 802 333 4455',
      name: 'Kelechi Nwosu',
      text: 'Do you have wireless power banks in stock?',
    });

    expect(result.conversation.assignedTeamMember).toBe('Emeka Eze (Owner)');
    expect(result.conversation.assignedTeamMember).not.toContain('Amaka');
  });

  it('guarantees atomic customer creation via Firestore runTransaction even across concurrent processes', async () => {
    const concurrentPhone = '+2347012345678';

    // Simulate two concurrent callers executing handleInboundMessage at the same instant
    const [resultA, resultB] = await Promise.all([
      StorageServiceModule.storage.handleInboundMessage({
        phone: concurrentPhone,
        name: 'Blessing Chukwuma',
        text: 'Price for bulk delivery to Port Harcourt?',
      }),
      StorageServiceModule.storage.handleInboundMessage({
        phone: concurrentPhone,
        text: 'Also need delivery timeline please',
      }),
    ]);

    expect(resultA.customer.id).toBe(resultB.customer.id);
    const customerCreations = writeOperations.filter(
      (op) => op.type === 'setDoc' && op.path.includes('/customers/')
    );
    expect(customerCreations.length).toBe(1);
    expect(customerCreations[0].path).toBe(`businesses/biz_fashion_01/customers/${resultA.customer.id}`);
  });
});
