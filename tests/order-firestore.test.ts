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
    set: vi.fn((ref, data) => {
      inMemoryFirestoreDb.set(String(ref), data);
    }),
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
      email: 'maguegbo@gmail.com',
      displayName: 'Amaka Fashion Hub',
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

describe('Order Creation, Firestore Document, Customer Stats & Live Dashboard Revenue (Task 2.3)', () => {
  let StorageServiceModule: typeof import('../src/services/storage');

  beforeEach(async () => {
    vi.clearAllMocks();
    writeOperations.length = 0;
    inMemoryFirestoreDb.clear();
    vi.resetModules();
    StorageServiceModule = await import('../src/services/storage');
    // Set active business context
    await StorageServiceModule.storage.setBusinessContext('biz_fashion_01', 'user_amaka_01');
    writeOperations.length = 0;
  });

  it('creates an Order document in Firestore under business path, updates customer stats, and increments Dashboard Revenue Today', async () => {
    const initialMetrics = StorageServiceModule.storage.getMetrics();
    const initialRevenueToday = initialMetrics.revenueToday;

    // 1. Create a customer and lead first via handleInboundMessage
    const inbound = await StorageServiceModule.storage.handleInboundMessage({
      phone: '+234 803 123 4567',
      name: 'Ngozi Okonkwo',
      location: 'Victoria Island, Lagos',
      text: 'Hello, I want to purchase the Silk Boubou gown for ₦75,000.',
    });

    const customerId = inbound.customer.id;
    const initialCustomer = StorageServiceModule.storage.getCustomers().find((c) => c.id === customerId);
    expect(initialCustomer).toBeDefined();
    expect(initialCustomer!.orderCount).toBe(0);
    expect(initialCustomer!.totalSpent).toBe(0);

    writeOperations.length = 0;

    // 2. Create Order for this customer with paymentStatus: 'paid'
    const orderAmount = 75000;
    const order = StorageServiceModule.storage.addOrder({
      customerId: customerId,
      customerName: initialCustomer!.name,
      customerPhone: initialCustomer!.phone,
      items: [
        {
          id: 'item_01',
          productId: 'prod_01',
          productName: 'Silk Boubou Gown',
          quantity: 1,
          price: orderAmount,
          size: 'UK 14',
          colour: 'Royal Emerald',
        },
      ],
      subtotal: orderAmount,
      deliveryFee: 3000,
      discount: 0,
      total: orderAmount + 3000,
      paymentStatus: 'paid',
      orderStatus: 'processing',
      deliveryAddress: '14 Adeola Odeku, Victoria Island, Lagos',
    });

    const expectedTotal = orderAmount + 3000;

    // 3. Verify Order document in Firestore under businesses/biz_fashion_01/orders/{orderId}
    const orderDocPath = `businesses/biz_fashion_01/orders/${order.id}`;
    const orderDocInDb = inMemoryFirestoreDb.get(orderDocPath);
    expect(orderDocInDb).toBeDefined();
    expect(orderDocInDb.id).toBe(order.id);
    expect(orderDocInDb.orderNumber).toBe(order.orderNumber);
    expect(orderDocInDb.total).toBe(expectedTotal);
    expect(orderDocInDb.paymentStatus).toBe('paid');
    expect(orderDocInDb.businessId).toBe('biz_fashion_01');

    // 4. Verify Customer stats updated in Firestore under businesses/biz_fashion_01/customers/{customerId}
    const customerDocPath = `businesses/biz_fashion_01/customers/${customerId}`;
    const customerDocInDb = inMemoryFirestoreDb.get(customerDocPath);
    expect(customerDocInDb).toBeDefined();
    expect(customerDocInDb.orderCount).toBe(1);
    expect(customerDocInDb.totalSpent).toBe(expectedTotal);
    expect(customerDocInDb.averageOrderValue).toBe(expectedTotal);
    expect(customerDocInDb.lastPurchaseDate).toBeDefined();

    // 5. Verify local customer object matches
    const updatedCustomer = StorageServiceModule.storage.getCustomers().find((c) => c.id === customerId);
    expect(updatedCustomer!.orderCount).toBe(1);
    expect(updatedCustomer!.totalSpent).toBe(expectedTotal);
    expect(updatedCustomer!.averageOrderValue).toBe(expectedTotal);

    // 6. Verify Follow-up scheduled for delivery fulfillment in Firestore
    const followUps = StorageServiceModule.storage.getFollowUps();
    const fulfillmentFollowUp = followUps.find((f) => f.customerId === customerId);
    expect(fulfillmentFollowUp).toBeDefined();
    expect(fulfillmentFollowUp!.category).toBe('fulfillment');
    expect(fulfillmentFollowUp!.status).toBe('pending');

    const folDocPath = `businesses/biz_fashion_01/followUps/${fulfillmentFollowUp!.id}`;
    const folDocInDb = inMemoryFirestoreDb.get(folDocPath);
    expect(folDocInDb).toBeDefined();
    expect(folDocInDb.customerId).toBe(customerId);

    // 7. Verify Lead stage moved to PAID
    const lead = StorageServiceModule.storage.getLeads().find((l) => l.customerId === customerId);
    expect(lead).toBeDefined();
    expect(lead!.stage).toBe('PAID');

    // 8. Verify Dashboard's Revenue Today increases to match
    const updatedMetrics = StorageServiceModule.storage.getMetrics();
    expect(updatedMetrics.revenueToday).toBe(initialRevenueToday + expectedTotal);
    expect(updatedMetrics.revenueToday).toBeGreaterThan(0);
  });

  it('updates Order, Customer stats, schedules follow-up, and increases Revenue Today when Simulate ₦ Pay is called', async () => {
    // 1. Create a lead and order with awaiting_payment
    const inbound = await StorageServiceModule.storage.handleInboundMessage({
      phone: '+234 812 345 6789',
      name: 'Bimpe Adeleke',
      location: 'Ikeja GRA, Lagos',
      text: 'I will take the Adire jacket for ₦45,000.',
    });

    const customerId = inbound.customer.id;
    const initialMetrics = StorageServiceModule.storage.getMetrics();
    const initialRevenueToday = initialMetrics.revenueToday;

    const orderAmount = 45000;
    const unpaidOrder = StorageServiceModule.storage.addOrder({
      customerId: customerId,
      customerName: 'Bimpe Adeleke',
      customerPhone: '+234 812 345 6789',
      items: [
        {
          id: 'item_02',
          productId: 'prod_02',
          productName: 'Adire Kimono Jacket',
          quantity: 1,
          price: orderAmount,
          size: 'M',
          colour: 'Indigo',
        },
      ],
      subtotal: orderAmount,
      deliveryFee: 2500,
      discount: 0,
      total: orderAmount + 2500,
      paymentStatus: 'awaiting_payment',
      orderStatus: 'pending',
      deliveryAddress: 'Ikeja GRA, Lagos',
    });

    const expectedTotal = orderAmount + 2500;

    // Verify initial state is awaiting payment
    expect(unpaidOrder.paymentStatus).toBe('awaiting_payment');
    const customerBeforePay = StorageServiceModule.storage.getCustomers().find((c) => c.id === customerId);
    expect(customerBeforePay!.orderCount).toBe(0);
    expect(customerBeforePay!.totalSpent).toBe(0);

    // 2. Call simulatePayment for this specific order
    const { order: paidOrder, customer } = StorageServiceModule.storage.simulatePayment(unpaidOrder.id);
    expect(paidOrder.id).toBe(unpaidOrder.id);
    expect(paidOrder.paymentStatus).toBe('paid');

    // 3. Confirm Order document updated in Firestore
    const orderDocPath = `businesses/biz_fashion_01/orders/${paidOrder.id}`;
    const orderDocInDb = inMemoryFirestoreDb.get(orderDocPath);
    expect(orderDocInDb).toBeDefined();
    expect(orderDocInDb.paymentStatus).toBe('paid');
    expect(orderDocInDb.orderStatus).toBe('processing');
    expect(orderDocInDb.paymentDate).toBeDefined();

    // 4. Confirm Customer stats updated in Firestore
    const customerDocPath = `businesses/biz_fashion_01/customers/${customerId}`;
    const customerDocInDb = inMemoryFirestoreDb.get(customerDocPath);
    expect(customerDocInDb).toBeDefined();
    expect(customerDocInDb.orderCount).toBe(1);
    expect(customerDocInDb.totalSpent).toBe(expectedTotal);
    expect(customerDocInDb.averageOrderValue).toBe(expectedTotal);

    // 5. Confirm Dashboard Revenue Today increased by the paid order amount
    const metricsAfterPay = StorageServiceModule.storage.getMetrics();
    expect(metricsAfterPay.revenueToday).toBe(initialRevenueToday + expectedTotal);

    // 6. Confirm Lead stage is PAID
    const lead = StorageServiceModule.storage.getLeads().find((l) => l.customerId === customerId);
    expect(lead!.stage).toBe('PAID');
  });
});
