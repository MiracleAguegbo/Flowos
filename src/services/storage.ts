import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
  writeBatch,
  query,
  where,
  runTransaction,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import {
  Business,
  Customer,
  Conversation,
  Message,
  Lead,
  Order,
  Product,
  FollowUp,
  KnowledgeBase,
  NotificationItem,
  User,
  DashboardMetrics,
  LeadStage,
  PaymentStatus,
  OrderStatus,
  WhatsAppIntegrationConfig,
} from '../types';
import { messagingService } from './messaging';
import {
  DEMO_USER,
  DEMO_BUSINESS,
  DEMO_KNOWLEDGE_BASE,
  DEMO_PRODUCTS,
  DEMO_CUSTOMERS,
  DEMO_CONVERSATIONS,
  DEMO_MESSAGES,
  DEMO_LEADS,
  DEMO_ORDERS,
  DEMO_FOLLOW_UPS,
  DEMO_NOTIFICATIONS,
} from '../data/seedData';

type Listener = () => void;

/**
 * Normalizes phone numbers to standard E.164 format (+234...) for Nigerian & international numbers.
 * Handles:
 *  - '08011223344' -> '+2348011223344'
 *  - '+2348011223344' -> '+2348011223344'
 *  - '2348011223344' -> '+2348011223344'
 *  - '+234 801 122 3344' -> '+2348011223344'
 *  - '0801 122 3344' -> '+2348011223344'
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');

  // Nigerian national 11-digit format starting with 0: 080..., 081..., 090..., 070...
  if (digits.startsWith('0') && digits.length === 11) {
    return `+234${digits.slice(1)}`;
  }
  // Nigerian 13-digit format starting with 234 without + prefix: 23480...
  if (digits.startsWith('234') && digits.length === 13) {
    return `+${digits}`;
  }
  // 10-digit national number without leading zero: 801..., 81..., 90..., 70...
  if (digits.length === 10 && ['7', '8', '9'].includes(digits[0])) {
    return `+234${digits}`;
  }
  // Explicit international format with plus
  if (trimmed.startsWith('+')) {
    return `+${digits}`;
  }
  return digits ? `+${digits}` : '';
}

class StorageService {
  private user: User;
  private business: Business;
  private knowledgeBase: KnowledgeBase;
  private products: Product[];
  private customers: Customer[];
  private conversations: Conversation[];
  private messages: Message[];
  private leads: Lead[];
  private orders: Order[];
  private followUps: FollowUp[];
  private notifications: NotificationItem[];

  private listeners: Set<Listener> = new Set();
  private unsubs: Unsubscribe[] = [];
  private currentBusinessId: string = DEMO_BUSINESS.id;
  private currentUserId: string = DEMO_USER.id;
  private isFirebaseSyncing = false;
  private isConnecting = false;
  private connectingPromise: Promise<void> | null = null;
  private inFlightInbound: Map<string, Promise<void>> = new Map();

  constructor() {
    this.user = { ...DEMO_USER };
    this.business = { ...DEMO_BUSINESS };
    this.knowledgeBase = { ...DEMO_KNOWLEDGE_BASE };
    this.products = [...DEMO_PRODUCTS];
    this.customers = [...DEMO_CUSTOMERS];
    this.conversations = [...DEMO_CONVERSATIONS];
    this.messages = [...DEMO_MESSAGES];
    this.leads = [...DEMO_LEADS];
    this.orders = [...DEMO_ORDERS];
    this.followUps = [...DEMO_FOLLOW_UPS];
    this.notifications = [...DEMO_NOTIFICATIONS];

    // Wire inbound message events from messaging service
    messagingService.onInboundMessage((event) => {
      this.handleInboundMessage({
        phone: event.senderPhone,
        name: event.senderName,
        location: event.customerLocation,
        text: event.content,
        productInterest: event.productInterest,
        estimatedValue: event.estimatedValue,
        timestamp: event.timestamp,
        isSimulated: event.isSimulated,
      }).catch((err) => {
        console.warn('Inbound WhatsApp messaging event error:', err);
      });
    });
  }

  public hasAttachedListeners(): boolean {
    return this.unsubs.length > 0;
  }

  public getListenerCount(): number {
    return this.unsubs.length;
  }

  public isConnectingContext(): boolean {
    return this.isConnecting;
  }

  /**
   * Sets the active business and user context, binding real-time Firestore listeners
   * to all subcollections scoped under /businesses/{businessId}.
   */
  public async setBusinessContext(
    businessId: string,
    userId: string,
    initialMeta?: Partial<Business>,
    isDemoMode: boolean = false
  ): Promise<void> {
    // (2) log the businessId being passed into setBusinessContext
    console.log('(2) [setBusinessContext] businessId passed into setBusinessContext:', businessId, {
      userId,
      isDemoMode,
      initialMeta,
    });
    // 1. Guard: if listeners are already attached for this business, merge updated meta and return
    if (this.currentBusinessId === businessId && this.unsubs.length > 0) {
      if (initialMeta) {
        if (initialMeta.name) this.business.name = initialMeta.name;
        if (initialMeta.ownerName) this.business.ownerName = initialMeta.ownerName;
        this.notify();
      }
      return;
    }

    // 2. Guard: if a leading call is currently in-flight connecting for this business, merge meta and await its outcome
    if (this.currentBusinessId === businessId && this.connectingPromise) {
      if (initialMeta) {
        if (initialMeta.name) this.business.name = initialMeta.name;
        if (initialMeta.ownerName) this.business.ownerName = initialMeta.ownerName;
        this.notify();
      }

      try {
        await this.connectingPromise;
      } catch {
        // Leading call failure handled
      }

      // If the leading call successfully attached listeners, we are done
      if (this.unsubs.length > 0) {
        return;
      }

      // If the leading call failed and listeners were never attached, detect that and retry
      // real setup instead of assuming it succeeded.
      // If another overlapping caller already began the retry, recursively await it.
      if (this.connectingPromise) {
        return this.setBusinessContext(businessId, userId, initialMeta, isDemoMode);
      }
    }

    this.currentBusinessId = businessId;
    this.currentUserId = userId;

    this.business = {
      ...this.business,
      ...initialMeta,
      id: businessId,
      ownerId: userId,
      members: [userId],
      memberUids: [userId],
    };

    // If this is a real merchant sign-up (isDemoMode = false and not default demo tenant),
    // clear in-memory arrays so the user starts with a clean empty business.
    if (!isDemoMode && businessId !== 'biz_luma_main') {
      this.customers = [];
      this.orders = [];
      this.products = [];
      this.leads = [];
      this.followUps = [];
      this.conversations = [];
      this.messages = [];
    }

    // Detach any previous listeners
    this.clearListeners();

    if (!auth.currentUser) {
      this.notify();
      return;
    }

    const connectTask = async () => {
      this.isConnecting = true;
      this.isFirebaseSyncing = true;
      try {
        await this.ensureBusinessDocumentAndSeed(businessId, userId, initialMeta, isDemoMode);
        this.attachFirestoreListeners(businessId);
      } catch (err) {
        console.warn('Could not complete Firestore initialization:', err);
      } finally {
        this.isFirebaseSyncing = false;
        this.isConnecting = false;
        this.connectingPromise = null;
      }
    };

    this.connectingPromise = connectTask();
    await this.connectingPromise;
  }

  private clearListeners() {
    this.unsubs.forEach((u) => {
      try {
        u();
      } catch (e) {
        console.error('Error detaching listener', e);
      }
    });
    this.unsubs = [];
  }

  /**
   * Checks if /businesses/{businessId} exists in Firestore.
   * If not, writes the business document.
   * Gated behind isDemoMode: Only seeds mock products/customers/leads/orders/conversations
   * if isDemoMode is explicitly true. Real sign-ups start with a clean, empty business.
   */
  private async ensureBusinessDocumentAndSeed(
    businessId: string,
    userId: string,
    initialMeta?: Partial<Business>,
    isDemoMode: boolean = false
  ) {
    const bizPath = `businesses/${businessId}`;
    try {
      const bizDocRef = doc(db, 'businesses', businessId);
      // (3) log whether the getDoc check for that business document succeeds or fails
      console.log('(3) [ensureBusinessDocumentAndSeed] Executing getDoc check for business document path:', bizPath);
      const snap = await getDoc(bizDocRef);
      console.log('(3) [ensureBusinessDocumentAndSeed] getDoc check SUCCEEDED for', bizPath, {
        exists: snap.exists(),
        id: snap.id,
      });

      if (!snap.exists()) {
        // Step 1: Write and commit the Business Document first so that the parent document
        // exists in Firestore and subsequent subcollection security rules can verify membership.
        const newBiz: Business = {
          ...DEMO_BUSINESS,
          ...initialMeta,
          id: businessId,
          ownerId: userId,
          ownerName: initialMeta?.ownerName || auth.currentUser?.displayName || DEMO_BUSINESS.ownerName,
          name: initialMeta?.name || 'My Store',
          category: initialMeta?.category || 'Retail',
          phone: initialMeta?.phone || '',
          location: initialMeta?.location || '',
          currency: 'NGN',
          description: initialMeta?.description || `${initialMeta?.name || 'My Store'} on FlowOS`,
          members: [userId],
          memberUids: [userId],
          createdAt: new Date().toISOString(),
        };
        await setDoc(bizDocRef, newBiz);

        // Step 2: Only seed demo subcollections if isDemoMode is explicitly true.
        // Real user sign-ups start with empty collections.
        if (isDemoMode) {
          const subBatch = writeBatch(db);

          // Knowledge Base with demo entries
          const kbRef = doc(db, 'businesses', businessId, 'knowledgeBase', 'default');
          const newKb: KnowledgeBase = {
            ...DEMO_KNOWLEDGE_BASE,
            id: 'default',
            businessId,
          };
          subBatch.set(kbRef, newKb);

          // Products
          DEMO_PRODUCTS.forEach((prod) => {
            const pRef = doc(db, 'businesses', businessId, 'products', prod.id);
            subBatch.set(pRef, { ...prod, businessId });
          });

          // Customers
          DEMO_CUSTOMERS.forEach((cust) => {
            const cRef = doc(db, 'businesses', businessId, 'customers', cust.id);
            subBatch.set(cRef, { ...cust, businessId });
          });

          // Leads
          DEMO_LEADS.forEach((lead) => {
            const lRef = doc(db, 'businesses', businessId, 'leads', lead.id);
            subBatch.set(lRef, { ...lead, businessId });
          });

          // Orders
          DEMO_ORDERS.forEach((ord) => {
            const oRef = doc(db, 'businesses', businessId, 'orders', ord.id);
            subBatch.set(oRef, { ...ord, businessId });
          });

          // Follow-ups
          DEMO_FOLLOW_UPS.forEach((fol) => {
            const fRef = doc(db, 'businesses', businessId, 'followUps', fol.id);
            subBatch.set(fRef, { ...fol, businessId });
          });

          // Conversations & Messages
          DEMO_CONVERSATIONS.forEach((conv) => {
            const convRef = doc(db, 'businesses', businessId, 'conversations', conv.id);
            subBatch.set(convRef, { ...conv, businessId });
          });

          DEMO_MESSAGES.forEach((msg) => {
            const msgRef = doc(
              db,
              'businesses',
              businessId,
              'conversations',
              msg.conversationId,
              'messages',
              msg.id
            );
            subBatch.set(msgRef, { ...msg, businessId });
          });

          await subBatch.commit();
        } else {
          // Real merchant accounts start with clean, empty subcollections.
          // Seed only the initial knowledge base configuration with default operational guidelines.
          const kbRef = doc(db, 'businesses', businessId, 'knowledgeBase', 'default');
          const realKb: KnowledgeBase = {
            id: 'default',
            businessId,
            businessDescription: `${newBiz.name} operates on WhatsApp powered by FlowOS.`,
            openingHours: 'Monday – Saturday: 9:00 AM – 6:00 PM WAT',
            location: newBiz.location || 'Lagos, Nigeria',
            deliveryPolicy: 'Standard dispatch: 1-3 business days across Lagos and nationwide delivery available.',
            paymentMethods: 'Direct bank transfer and secure online checkout links.',
            returnPolicy: 'Returns accepted within 48 hours for unworn items with tags intact.',
            discountRules: 'Special offers and loyalty discounts applied at checkout.',
            faqs: [],
            brandVoice: 'Professional, welcoming, and prompt.',
          };
          await setDoc(kbRef, realKb);
        }
      }
    } catch (err: any) {
      console.error('(3) [ensureBusinessDocumentAndSeed] getDoc or initial setup FAILED for', bizPath, ':', {
        message: err?.message,
        code: err?.code,
      });
      handleFirestoreError(err, OperationType.WRITE, bizPath);
    }
  }

  /**
   * Attaches real-time Firestore onSnapshot listeners to parent business and subcollections.
   */
  private attachFirestoreListeners(businessId: string) {
    // 1. Parent Business document
    const bizPath = `businesses/${businessId}`;
    const unsubBiz = onSnapshot(
      doc(db, 'businesses', businessId),
      (snap) => {
        if (snap.exists()) {
          this.business = { ...this.business, ...(snap.data() as Business) };
          this.notifyListeners();
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, bizPath);
      }
    );
    this.unsubs.push(unsubBiz);

    // 2. Knowledge Base
    const kbPath = `businesses/${businessId}/knowledgeBase`;
    const unsubKb = onSnapshot(
      collection(db, 'businesses', businessId, 'knowledgeBase'),
      (snap) => {
        if (!snap.empty) {
          this.knowledgeBase = snap.docs[0].data() as KnowledgeBase;
          this.notifyListeners();
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, kbPath);
      }
    );
    this.unsubs.push(unsubKb);

    // 3. Customers subcollection
    const custPath = `businesses/${businessId}/customers`;
    const unsubCust = onSnapshot(
      collection(db, 'businesses', businessId, 'customers'),
      (snap) => {
        this.customers = snap.docs.map((d) => d.data() as Customer);
        this.notifyListeners();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, custPath);
      }
    );
    this.unsubs.push(unsubCust);

    // 4. Products subcollection
    const prodPath = `businesses/${businessId}/products`;
    const unsubProd = onSnapshot(
      collection(db, 'businesses', businessId, 'products'),
      (snap) => {
        this.products = snap.docs.map((d) => d.data() as Product);
        this.notifyListeners();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, prodPath);
      }
    );
    this.unsubs.push(unsubProd);

    // 5. Orders subcollection
    const ordPath = `businesses/${businessId}/orders`;
    const unsubOrd = onSnapshot(
      collection(db, 'businesses', businessId, 'orders'),
      (snap) => {
        this.orders = snap.docs.map((d) => d.data() as Order);
        this.notifyListeners();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, ordPath);
      }
    );
    this.unsubs.push(unsubOrd);

    // 6. Leads subcollection
    const leadPath = `businesses/${businessId}/leads`;
    const unsubLead = onSnapshot(
      collection(db, 'businesses', businessId, 'leads'),
      (snap) => {
        this.leads = snap.docs.map((d) => d.data() as Lead);
        this.notifyListeners();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, leadPath);
      }
    );
    this.unsubs.push(unsubLead);

    // 7. FollowUps subcollection
    const folPath = `businesses/${businessId}/followUps`;
    const unsubFol = onSnapshot(
      collection(db, 'businesses', businessId, 'followUps'),
      (snap) => {
        this.followUps = snap.docs.map((d) => d.data() as FollowUp);
        this.notifyListeners();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, folPath);
      }
    );
    this.unsubs.push(unsubFol);

    // 8. Conversations subcollection & their message streams
    const convPath = `businesses/${businessId}/conversations`;
    const unsubConv = onSnapshot(
      collection(db, 'businesses', businessId, 'conversations'),
      (snap) => {
        this.conversations = snap.docs.map((d) => d.data() as Conversation);
        this.syncConversationMessages(businessId, this.conversations);
        this.notifyListeners();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, convPath);
      }
    );
    this.unsubs.push(unsubConv);
  }

  private messageUnsubs: Map<string, Unsubscribe> = new Map();

  private syncConversationMessages(businessId: string, conversations: Conversation[]) {
    conversations.forEach((conv) => {
      if (!this.messageUnsubs.has(conv.id)) {
        const msgPath = `businesses/${businessId}/conversations/${conv.id}/messages`;
        const unsub = onSnapshot(
          collection(db, 'businesses', businessId, 'conversations', conv.id, 'messages'),
          (snap) => {
            const newMessages = snap.docs.map((d) => d.data() as Message);
            // Merge with local messages preserving uniqueness
            const otherMessages = this.messages.filter((m) => m.conversationId !== conv.id);
            this.messages = [...otherMessages, ...newMessages];
            this.notifyListeners();
          },
          (error) => {
            handleFirestoreError(error, OperationType.LIST, msgPath);
          }
        );
        this.messageUnsubs.set(conv.id, unsub);
        this.unsubs.push(unsub);
      }
    });
  }

  private notify() {
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error('Error in storage listener', e);
      }
    });
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async resetToDemoData() {
    this.user = { ...DEMO_USER };
    this.business = {
      ...DEMO_BUSINESS,
      id: this.currentBusinessId,
      ownerId: this.currentUserId,
      members: [this.currentUserId],
      memberUids: [this.currentUserId],
    };
    this.knowledgeBase = { ...DEMO_KNOWLEDGE_BASE, businessId: this.currentBusinessId };
    this.products = DEMO_PRODUCTS.map((p) => ({ ...p, businessId: this.currentBusinessId }));
    this.customers = DEMO_CUSTOMERS.map((c) => ({ ...c, businessId: this.currentBusinessId }));
    this.conversations = DEMO_CONVERSATIONS.map((c) => ({ ...c, businessId: this.currentBusinessId }));
    this.messages = DEMO_MESSAGES.map((m) => ({ ...m, businessId: this.currentBusinessId }));
    this.leads = DEMO_LEADS.map((l) => ({ ...l, businessId: this.currentBusinessId }));
    this.orders = DEMO_ORDERS.map((o) => ({ ...o, businessId: this.currentBusinessId }));
    this.followUps = DEMO_FOLLOW_UPS.map((f) => ({ ...f, businessId: this.currentBusinessId }));
    this.notifications = [...DEMO_NOTIFICATIONS];

    if (auth.currentUser) {
      await this.ensureBusinessDocumentAndSeed(
        this.currentBusinessId,
        this.currentUserId,
        DEMO_BUSINESS
      );
    }
    this.notify();
  }

  // Business & User
  public getUser(): User {
    return this.user;
  }

  public setUser(user: Partial<User>) {
    this.user = { ...this.user, ...user };
    if (auth.currentUser) {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      setDoc(userRef, this.user, { merge: true }).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser?.uid}`);
      });
    }
    this.notify();
  }

  public getBusiness(): Business {
    return this.business;
  }

  public updateBusiness(business: Partial<Business>) {
    this.business = { ...this.business, ...business };
    if (auth.currentUser) {
      const bizRef = doc(db, 'businesses', this.currentBusinessId);
      updateDoc(bizRef, business as Record<string, unknown>).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `businesses/${this.currentBusinessId}`);
      });
    }
    this.notify();
  }

  // Knowledge Base
  public getKnowledgeBase(): KnowledgeBase {
    return this.knowledgeBase;
  }

  public updateKnowledgeBase(kb: Partial<KnowledgeBase>) {
    this.knowledgeBase = { ...this.knowledgeBase, ...kb };
    if (auth.currentUser) {
      const kbRef = doc(db, 'businesses', this.currentBusinessId, 'knowledgeBase', 'default');
      setDoc(kbRef, { ...this.knowledgeBase, ...kb }, { merge: true }).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `businesses/${this.currentBusinessId}/knowledgeBase/default`);
      });
    }
    this.notify();
  }

  // Customers
  public getCustomers(): Customer[] {
    return [...this.customers];
  }

  public getCustomer(id: string): Customer | undefined {
    return this.customers.find((c) => c.id === id);
  }

  public updateCustomer(id: string, updates: Partial<Customer>) {
    const index = this.customers.findIndex((c) => c.id === id);
    if (index !== -1) {
      this.customers[index] = { ...this.customers[index], ...updates };
      if (auth.currentUser) {
        const custRef = doc(db, 'businesses', this.currentBusinessId, 'customers', id);
        updateDoc(custRef, updates as Record<string, unknown>).catch((err) => {
          handleFirestoreError(err, OperationType.UPDATE, `businesses/${this.currentBusinessId}/customers/${id}`);
        });
      }
      this.notify();
    }
  }

  public addCustomer(customer: Omit<Customer, 'id' | 'businessId'>): Customer {
    const newCustomer: Customer = {
      ...customer,
      id: `cust_${Date.now()}`,
      businessId: this.currentBusinessId,
    };
    this.customers.unshift(newCustomer);

    if (auth.currentUser) {
      const custRef = doc(db, 'businesses', this.currentBusinessId, 'customers', newCustomer.id);
      setDoc(custRef, newCustomer).catch((err) => {
        handleFirestoreError(err, OperationType.CREATE, `businesses/${this.currentBusinessId}/customers/${newCustomer.id}`);
      });
    }

    this.notify();
    return newCustomer;
  }

  // Conversations & Messages
  public getConversations(): Conversation[] {
    return [...this.conversations];
  }

  public getConversation(id: string): Conversation | undefined {
    return this.conversations.find((c) => c.id === id);
  }

  public getMessages(conversationId: string): Message[] {
    return this.messages.filter((m) => m.conversationId === conversationId);
  }

  public async sendMessage(
    conversationId: string,
    content: string,
    sender: 'customer' | 'business' | 'system' = 'business'
  ): Promise<Message> {
    const isCustomer = sender === 'customer';
    const isDemo = messagingService.getConfig().isDemoMode;

    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId,
      businessId: this.currentBusinessId,
      sender,
      direction: isCustomer ? 'inbound' : 'outbound',
      channel: 'whatsapp',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: isCustomer ? 'read' : 'delivered',
      metadata: {
        isSimulated: isDemo,
        deliveredAt: new Date().toISOString(),
      },
    };

    this.messages.push(newMessage);

    // Update conversation lastMessage & time
    const convIndex = this.conversations.findIndex((c) => c.id === conversationId);
    let convUpdate: Partial<Conversation> = {};
    if (convIndex !== -1) {
      const conv = this.conversations[convIndex];
      convUpdate = {
        channel: 'whatsapp',
        lastMessage: content,
        lastMessageTime: newMessage.timestamp,
        unreadCount: sender === 'customer' ? conv.unreadCount + 1 : 0,
      };
      this.conversations[convIndex] = {
        ...conv,
        ...convUpdate,
      };
      const [updatedConv] = this.conversations.splice(convIndex, 1);
      this.conversations.unshift(updatedConv);
    }

    if (auth.currentUser) {
      // 1. Write message to nested subcollection per blueprint
      const msgPath = `businesses/${this.currentBusinessId}/conversations/${conversationId}/messages/${newMessage.id}`;
      const msgRef = doc(
        db,
        'businesses',
        this.currentBusinessId,
        'conversations',
        conversationId,
        'messages',
        newMessage.id
      );
      try {
        await setDoc(msgRef, newMessage);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, msgPath);
      }

      // 2. Update conversation doc
      const convPath = `businesses/${this.currentBusinessId}/conversations/${conversationId}`;
      const convRef = doc(db, 'businesses', this.currentBusinessId, 'conversations', conversationId);
      try {
        await updateDoc(convRef, convUpdate as Record<string, unknown>);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, convPath);
      }
    }

    this.notify();
    return newMessage;
  }

  public markConversationRead(conversationId: string) {
    const conv = this.conversations.find((c) => c.id === conversationId);
    if (conv && conv.unreadCount > 0) {
      conv.unreadCount = 0;
      if (auth.currentUser) {
        const convRef = doc(db, 'businesses', this.currentBusinessId, 'conversations', conversationId);
        updateDoc(convRef, { unreadCount: 0 }).catch((err) => {
          handleFirestoreError(err, OperationType.UPDATE, `businesses/${this.currentBusinessId}/conversations/${conversationId}`);
        });
      }
      this.notify();
    }
  }

  // Leads & Pipeline
  public getLeads(): Lead[] {
    return [...this.leads];
  }

  public updateLeadStage(leadId: string, stage: LeadStage) {
    const lead = this.leads.find((l) => l.id === leadId);
    if (lead) {
      lead.stage = stage;
      lead.daysInStage = 0;
      lead.lastInteraction = 'Just now';

      // Keep customer leadStage synced
      const cust = this.customers.find((c) => c.id === lead.customerId);
      if (cust) {
        cust.leadStage = stage;
      }
      const conv = this.conversations.find((c) => c.customerId === lead.customerId);
      if (conv) {
        conv.leadStage = stage;
      }

      if (auth.currentUser) {
        const leadRef = doc(db, 'businesses', this.currentBusinessId, 'leads', leadId);
        updateDoc(leadRef, { stage, daysInStage: 0, lastInteraction: 'Just now' }).catch((err) => {
          handleFirestoreError(err, OperationType.UPDATE, `businesses/${this.currentBusinessId}/leads/${leadId}`);
        });

        if (cust) {
          const custRef = doc(db, 'businesses', this.currentBusinessId, 'customers', cust.id);
          updateDoc(custRef, { leadStage: stage }).catch(() => {});
        }
        if (conv) {
          const convRef = doc(db, 'businesses', this.currentBusinessId, 'conversations', conv.id);
          updateDoc(convRef, { leadStage: stage }).catch(() => {});
        }
      }

      this.notify();
    }
  }

  // Orders
  public getOrders(): Order[] {
    return [...this.orders];
  }

  public getOrder(id: string): Order | undefined {
    return this.orders.find((o) => o.id === id);
  }

  public addOrder(orderData: Omit<Order, 'id' | 'orderNumber' | 'businessId' | 'createdDate'>): Order {
    const orderNumber = `ORD-2025-${Math.floor(100 + Math.random() * 900)}`;
    const newOrder: Order = {
      ...orderData,
      id: `ord_${Date.now()}`,
      orderNumber,
      businessId: this.currentBusinessId,
      createdDate: new Date().toISOString(),
    };
    this.orders.unshift(newOrder);

    // Update customer totalSpent and orderCount if paid
    let custUpdate: Partial<Customer> | null = null;
    if (newOrder.paymentStatus === 'paid') {
      const cust = this.customers.find((c) => c.id === newOrder.customerId);
      if (cust) {
        cust.totalSpent += newOrder.total;
        cust.orderCount += 1;
        cust.averageOrderValue = cust.orderCount > 0 ? Math.round(cust.totalSpent / cust.orderCount) : 0;
        cust.lastPurchaseDate = new Date().toISOString().split('T')[0];
        custUpdate = {
          totalSpent: cust.totalSpent,
          orderCount: cust.orderCount,
          averageOrderValue: cust.averageOrderValue,
          lastPurchaseDate: cust.lastPurchaseDate,
        };
      }
    }

    if (auth.currentUser) {
      const ordRef = doc(db, 'businesses', this.currentBusinessId, 'orders', newOrder.id);
      setDoc(ordRef, newOrder).catch((err) => {
        handleFirestoreError(err, OperationType.CREATE, `businesses/${this.currentBusinessId}/orders/${newOrder.id}`);
      });

      if (custUpdate) {
        const custRef = doc(db, 'businesses', this.currentBusinessId, 'customers', newOrder.customerId);
        updateDoc(custRef, custUpdate as Record<string, unknown>).catch(() => {});
      }
    }

    this.notify();
    return newOrder;
  }

  public updateOrderStatus(orderId: string, paymentStatus?: PaymentStatus, orderStatus?: OrderStatus) {
    const order = this.orders.find((o) => o.id === orderId);
    if (order) {
      const orderUpdates: Partial<Order> = {};
      let custUpdate: Partial<Customer> | null = null;

      if (paymentStatus) {
        const wasUnpaid = order.paymentStatus !== 'paid';
        order.paymentStatus = paymentStatus;
        orderUpdates.paymentStatus = paymentStatus;

        if (paymentStatus === 'paid') {
          order.paymentDate = new Date().toISOString();
          orderUpdates.paymentDate = order.paymentDate;

          if (wasUnpaid) {
            const cust = this.customers.find((c) => c.id === order.customerId);
            if (cust) {
              cust.totalSpent += order.total;
              cust.orderCount += 1;
              cust.averageOrderValue = cust.orderCount > 0 ? Math.round(cust.totalSpent / cust.orderCount) : 0;
              cust.lastPurchaseDate = new Date().toISOString().split('T')[0];
              custUpdate = {
                totalSpent: cust.totalSpent,
                orderCount: cust.orderCount,
                averageOrderValue: cust.averageOrderValue,
                lastPurchaseDate: cust.lastPurchaseDate,
              };
            }
            const lead = this.leads.find((l) => l.customerId === order.customerId);
            if (lead && lead.stage !== 'COMPLETED') {
              this.updateLeadStage(lead.id, 'PAID');
            }
          }
        }
      }
      if (orderStatus) {
        order.orderStatus = orderStatus;
        orderUpdates.orderStatus = orderStatus;
      }

      if (auth.currentUser) {
        const ordRef = doc(db, 'businesses', this.currentBusinessId, 'orders', orderId);
        updateDoc(ordRef, orderUpdates as Record<string, unknown>).catch((err) => {
          handleFirestoreError(err, OperationType.UPDATE, `businesses/${this.currentBusinessId}/orders/${orderId}`);
        });

        if (custUpdate) {
          const custRef = doc(db, 'businesses', this.currentBusinessId, 'customers', order.customerId);
          updateDoc(custRef, custUpdate as Record<string, unknown>).catch(() => {});
        }
      }

      this.notify();
    }
  }

  // Products
  public getProducts(): Product[] {
    return [...this.products];
  }

  public addProduct(product: Omit<Product, 'id' | 'businessId'>): Product {
    const newProduct: Product = {
      ...product,
      id: `prod_${Date.now()}`,
      businessId: this.currentBusinessId,
    };
    this.products.unshift(newProduct);

    if (auth.currentUser) {
      const prodRef = doc(db, 'businesses', this.currentBusinessId, 'products', newProduct.id);
      setDoc(prodRef, newProduct).catch((err) => {
        handleFirestoreError(err, OperationType.CREATE, `businesses/${this.currentBusinessId}/products/${newProduct.id}`);
      });
    }

    this.notify();
    return newProduct;
  }

  public updateProduct(id: string, updates: Partial<Product>) {
    const index = this.products.findIndex((p) => p.id === id);
    if (index !== -1) {
      this.products[index] = { ...this.products[index], ...updates };
      if (auth.currentUser) {
        const prodRef = doc(db, 'businesses', this.currentBusinessId, 'products', id);
        updateDoc(prodRef, updates as Record<string, unknown>).catch((err) => {
          handleFirestoreError(err, OperationType.UPDATE, `businesses/${this.currentBusinessId}/products/${id}`);
        });
      }
      this.notify();
    }
  }

  public deleteProduct(id: string) {
    this.products = this.products.filter((p) => p.id !== id);
    if (auth.currentUser) {
      const prodRef = doc(db, 'businesses', this.currentBusinessId, 'products', id);
      deleteDoc(prodRef).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `businesses/${this.currentBusinessId}/products/${id}`);
      });
    }
    this.notify();
  }

  // Follow-ups
  public getFollowUps(): FollowUp[] {
    return [...this.followUps];
  }

  public updateFollowUpStatus(id: string, status: FollowUp['status']) {
    const item = this.followUps.find((f) => f.id === id);
    if (item) {
      item.status = status;
      if (auth.currentUser) {
        const folRef = doc(db, 'businesses', this.currentBusinessId, 'followUps', id);
        updateDoc(folRef, { status }).catch((err) => {
          handleFirestoreError(err, OperationType.UPDATE, `businesses/${this.currentBusinessId}/followUps/${id}`);
        });
      }
      this.notify();
    }
  }

  public addFollowUp(followUp: Omit<FollowUp, 'id' | 'businessId'>): FollowUp {
    const newFollowUp: FollowUp = {
      ...followUp,
      id: `fol_${Date.now()}`,
      businessId: this.currentBusinessId,
    };
    this.followUps.unshift(newFollowUp);

    if (auth.currentUser) {
      const folRef = doc(db, 'businesses', this.currentBusinessId, 'followUps', newFollowUp.id);
      setDoc(folRef, newFollowUp).catch((err) => {
        handleFirestoreError(err, OperationType.CREATE, `businesses/${this.currentBusinessId}/followUps/${newFollowUp.id}`);
      });
    }

    this.notify();
    return newFollowUp;
  }

  // Notifications
  public getNotifications(): NotificationItem[] {
    return [...this.notifications];
  }

  public markNotificationRead(id: string) {
    const item = this.notifications.find((n) => n.id === id);
    if (item) {
      item.read = true;
      this.notify();
    }
  }

  // Dynamic Dashboard Metrics
  public getMetrics(): DashboardMetrics {
    const paidOrders = this.orders.filter((o) => o.paymentStatus === 'paid');
    const unpaidOrders = this.orders.filter(
      (o) => o.paymentStatus === 'awaiting_payment' || o.paymentStatus === 'pending'
    );

    const liveUnpaidSum = unpaidOrders.reduce((sum, o) => sum + o.total, 0);
    const livePaidSum = paidOrders.reduce((sum, o) => sum + o.total, 0);

    const activeFollowUps = this.followUps.filter((f) => f.status === 'pending');
    const recoverableRevenue = activeFollowUps.reduce((sum, f) => sum + f.potentialValue, 0);

    const isDefaultDemo =
      messagingService.getConfig().isDemoMode ||
      this.currentBusinessId === 'biz_luma_main' ||
      this.currentBusinessId === DEMO_BUSINESS.id;

    if (!isDefaultDemo) {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayPaidSum = paidOrders
        .filter((o) => o.createdDate && o.createdDate.startsWith(todayStr))
        .reduce((sum, o) => sum + o.total, 0);

      const totalLeadsCount = this.leads.length;
      // Explicit guard: zero denominator check for conversion rate
      const conversionRate =
        totalLeadsCount > 0
          ? Math.round((paidOrders.length / totalLeadsCount) * 1000) / 10
          : 0;

      return {
        revenueToday: todayPaidSum,
        revenueThisMonth: livePaidSum,
        totalOrders: this.orders.length,
        newLeads: this.leads.filter((l) => l.stage === 'NEW_LEAD').length,
        conversionRate,
        outstandingPayments: liveUnpaidSum,
        followUpsDue: activeFollowUps.length,
        recoverableRevenue,
      };
    }

    // Demo store metrics with dynamic adjustments
    const demoTotalLeads = Math.max(1, 87 + (this.leads.filter((l) => l.stage === 'NEW_LEAD').length - 3));
    const demoPaidOrders = 16 + paidOrders.length;
    // Explicit guard: zero denominator check for conversion rate
    const demoConversionRate =
      demoTotalLeads > 0
        ? Math.round((demoPaidOrders / demoTotalLeads) * 1000) / 10
        : 18.7;

    return {
      revenueToday: 438500 + (livePaidSum > 600000 ? livePaidSum - 600000 : 0),
      revenueThisMonth: 8420000 + (livePaidSum > 600000 ? livePaidSum - 600000 : 0),
      totalOrders: 342 + (this.orders.length - 10),
      newLeads: demoTotalLeads,
      conversionRate: demoConversionRate,
      outstandingPayments: Math.max(420000, liveUnpaidSum),
      followUpsDue: activeFollowUps.length,
      recoverableRevenue: Math.max(1240000, recoverableRevenue),
    };
  }

  /**
   * When an inbound message lands in the inbox:
   * Sequentially writes to Firestore under /businesses/{businessId}:
   *   1. Find-or-create the Customer document (/businesses/{businessId}/customers/{customerId})
   *   2. Create or update the Conversation document (/businesses/{businessId}/conversations/{conversationId})
   *   3. Create the Message document (/businesses/{businessId}/conversations/{conversationId}/messages/{messageId})
   * Strictly in sequence (Step 1 -> Step 2 -> Step 3) before finalizing state.
   */
  public async handleInboundMessage(params: {
    phone: string;
    name?: string;
    location?: string;
    text: string;
    productInterest?: string;
    estimatedValue?: number;
    leadStage?: LeadStage;
    timestamp?: string;
    isSimulated?: boolean;
  }): Promise<{ customer: Customer; conversation: Conversation; message: Message }> {
    const businessId = this.currentBusinessId;
    const normalizedPhone = normalizePhoneNumber(params.phone);
    const cleanPhone = normalizedPhone || params.phone.trim();

    // Guard against concurrent rapid-fire messages for the same phone number within milliseconds/seconds
    const pendingInbound = this.inFlightInbound.get(normalizedPhone);
    if (pendingInbound) {
      try {
        await pendingInbound;
      } catch {
        // Proceed even if previous message handler errored
      }
    }

    let resolveInFlight!: () => void;
    const inFlightPromise = new Promise<void>((resolve) => {
      resolveInFlight = resolve;
    });
    this.inFlightInbound.set(normalizedPhone, inFlightPromise);

    try {
      // =========================================================================
      // STEP 1: FIND OR CREATE CUSTOMER DOCUMENT IN FIRESTORE (VIA runTransaction)
      // Target Path: /businesses/{businessId}/customers/{customerId}
      // =========================================================================
      const phoneDigits = normalizedPhone.replace(/\D/g, '') || cleanPhone.replace(/\D/g, '');
      const existingInMem = this.customers.find(
        (c) => normalizePhoneNumber(c.phone) === normalizedPhone
      );
      const customerDocId = existingInMem ? existingInMem.id : `cust_${phoneDigits}`;
      let customer: Customer;

      if (auth.currentUser) {
        const custPath = `businesses/${businessId}/customers/${customerDocId}`;
        const custRef = doc(db, 'businesses', businessId, 'customers', customerDocId);

        try {
          customer = await runTransaction(db, async (transaction) => {
            const custSnap = await transaction.get(custRef);
            if (custSnap.exists()) {
              const existingData = custSnap.data() as Customer;
              let needsUpdate = false;
              const custUpdates: Partial<Customer> = {};
              if (params.name && (existingData.name === 'Customer' || existingData.name.startsWith('Customer ('))) {
                existingData.name = params.name;
                custUpdates.name = params.name;
                needsUpdate = true;
              }
              if (params.location && (!existingData.location || existingData.location === 'Not specified')) {
                existingData.location = params.location;
                custUpdates.location = params.location;
                needsUpdate = true;
              }
              if (needsUpdate) {
                transaction.update(custRef, custUpdates as Record<string, unknown>);
              }
              return existingData;
            } else {
              // Customer document does not exist: create it atomically inside this transaction
              const newCustomer: Customer = {
                id: customerDocId,
                businessId,
                name: params.name || `Customer (${cleanPhone.slice(-4)})`,
                phone: cleanPhone,
                location: params.location || 'Not specified',
                status: 'prospect',
                leadStage: params.leadStage || 'NEW_LEAD',
                tags: params.isSimulated ? ['WhatsApp Inquiry', 'Simulation'] : ['WhatsApp Inquiry'],
                totalSpent: 0,
                orderCount: 0,
                averageOrderValue: 0,
                customerSince: new Date().toISOString().split('T')[0],
              };
              transaction.set(custRef, newCustomer);
              return newCustomer;
            }
          });

          // Sync in-memory array
          const inMemIdx = this.customers.findIndex((c) => c.id === customer.id);
          if (inMemIdx >= 0) {
            this.customers[inMemIdx] = customer;
          } else {
            this.customers.unshift(customer);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, custPath);
          customer = existingInMem || {
            id: customerDocId,
            businessId,
            name: params.name || `Customer (${cleanPhone.slice(-4)})`,
            phone: cleanPhone,
            location: params.location || 'Not specified',
            status: 'prospect',
            leadStage: params.leadStage || 'NEW_LEAD',
            tags: params.isSimulated ? ['WhatsApp Inquiry', 'Simulation'] : ['WhatsApp Inquiry'],
            totalSpent: 0,
            orderCount: 0,
            averageOrderValue: 0,
            customerSince: new Date().toISOString().split('T')[0],
          };
          if (!this.customers.some((c) => c.id === customer.id)) {
            this.customers.unshift(customer);
          }
        }
      } else {
        // Offline / Unauthenticated fallback
        if (existingInMem) {
          customer = existingInMem;
        } else {
          customer = {
            id: customerDocId,
            businessId,
            name: params.name || `Customer (${cleanPhone.slice(-4)})`,
            phone: cleanPhone,
            location: params.location || 'Not specified',
            status: 'prospect',
            leadStage: params.leadStage || 'NEW_LEAD',
            tags: params.isSimulated ? ['WhatsApp Inquiry', 'Simulation'] : ['WhatsApp Inquiry'],
            totalSpent: 0,
            orderCount: 0,
            averageOrderValue: 0,
            customerSince: new Date().toISOString().split('T')[0],
          };
          this.customers.unshift(customer);
        }
      }

      // =========================================================================
      // STEP 2: CREATE OR UPDATE CONVERSATION DOCUMENT IN FIRESTORE
      // Target Path: /businesses/{businessId}/conversations/{conversationId}
      // =========================================================================
      let conv = this.conversations.find(
        (c) =>
          c.customerId === customer.id ||
          (c.customerPhone && normalizePhoneNumber(c.customerPhone) === normalizedPhone) ||
          (c.whatsappNumber && normalizePhoneNumber(c.whatsappNumber) === normalizedPhone)
      );

      if (!conv && auth.currentUser) {
        try {
          const convCol = collection(db, 'businesses', businessId, 'conversations');
          const q = query(convCol, where('customerId', '==', customer.id));
          const snap = await getDocs(q);
          if (!snap.empty) {
            conv = snap.docs[0].data() as Conversation;
            if (!this.conversations.some((c) => c.id === conv!.id)) {
              this.conversations.unshift(conv);
            }
          }
        } catch (err) {
          console.warn('Could not query conversation in Firestore:', err);
        }
      }

      const timeDisplay =
        params.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const assignedTeamMember = this.business.ownerName
        ? (this.business.ownerName.includes('(') ? this.business.ownerName : `${this.business.ownerName} (Owner)`)
        : (this.business.name ? `${this.business.name} Team` : 'Business Owner');

      if (!conv) {
        const convId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        conv = {
          id: convId,
          businessId,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          whatsappNumber: customer.phone,
          channel: 'whatsapp',
          assignedTeamMember,
          lastMessage: params.text,
          lastMessageTime: timeDisplay,
          unreadCount: 1,
          leadStage: customer.leadStage || params.leadStage || 'NEW_LEAD',
          estimatedOrderValue: params.estimatedValue || 0,
          status: 'open',
        };

        if (auth.currentUser) {
          const convPath = `businesses/${businessId}/conversations/${conv.id}`;
          const convRef = doc(db, 'businesses', businessId, 'conversations', conv.id);
          try {
            await setDoc(convRef, conv);
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, convPath);
          }
        }

        this.conversations.unshift(conv);
      } else {
        const convUpdates: Partial<Conversation> = {
          channel: 'whatsapp',
          lastMessage: params.text,
          lastMessageTime: timeDisplay,
          unreadCount: (conv.unreadCount || 0) + 1,
          customerName: customer!.name,
          customerPhone: customer!.phone,
          whatsappNumber: customer!.phone,
          status: 'open',
        };
        if (params.estimatedValue && (!conv.estimatedOrderValue || conv.estimatedOrderValue === 0)) {
          convUpdates.estimatedOrderValue = params.estimatedValue;
        }
        if (params.leadStage) {
          convUpdates.leadStage = params.leadStage;
        }

        if (auth.currentUser) {
          const convPath = `businesses/${businessId}/conversations/${conv.id}`;
          const convRef = doc(db, 'businesses', businessId, 'conversations', conv.id);
          try {
            await updateDoc(convRef, convUpdates as Record<string, unknown>);
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, convPath);
          }
        }

        Object.assign(conv, convUpdates);
        const convIdx = this.conversations.findIndex((c) => c.id === conv!.id);
        if (convIdx > 0) {
          const [activeItem] = this.conversations.splice(convIdx, 1);
          this.conversations.unshift(activeItem);
        }
      }

      // =========================================================================
      // STEP 3: CREATE MESSAGE DOCUMENT IN FIRESTORE
      // Target Path: /businesses/{businessId}/conversations/{conversationId}/messages/{messageId}
      // =========================================================================
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newMessage: Message = {
        id: messageId,
        conversationId: conv.id,
        businessId,
        sender: 'customer',
        direction: 'inbound',
        channel: 'whatsapp',
        content: params.text,
        timestamp: timeDisplay,
        status: 'read',
        metadata: {
          isSimulated: params.isSimulated ?? messagingService.getConfig().isDemoMode,
          deliveredAt: new Date().toISOString(),
        },
      };

      if (auth.currentUser) {
        const msgPath = `businesses/${businessId}/conversations/${conv.id}/messages/${newMessage.id}`;
        const msgRef = doc(
          db,
          'businesses',
          businessId,
          'conversations',
          conv.id,
          'messages',
          newMessage.id
        );
        try {
          await setDoc(msgRef, newMessage);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, msgPath);
        }
      }

      this.messages.push(newMessage);

      // =========================================================================
      // STEP 4: RECORD NOTIFICATION & BROADCAST
      // =========================================================================
      this.notifications.unshift({
        id: `notif_${Date.now()}`,
        businessId,
        title: `New WhatsApp: ${customer.name}`,
        message: `Inbound inquiry from connected WhatsApp Business number (${customer.phone})`,
        type: 'message',
        timestamp: 'Just now',
        read: false,
        link: 'inbox',
      });

      this.notify();
      return { customer, conversation: conv, message: newMessage };
    } finally {
      resolveInFlight();
      if (this.inFlightInbound.get(normalizedPhone) === inFlightPromise) {
        this.inFlightInbound.delete(normalizedPhone);
      }
    }
  }

  public async simulateIncomingMessage(): Promise<{ customer: Customer; conversation: Conversation; message: Message }> {
    const simulationTemplates = [
      {
        text: 'Hi there! Is the Ankara Midi Dress still available in Size M?',
        product: 'Ankara Print Peplum Midi Dress',
        estimatedValue: 38000,
        customerName: 'Kemi Badmus',
        phone: '+234 816 888 9012',
        location: 'Victoria Island, Lagos',
      },
      {
        text: 'Good afternoon! Do you have the Emerald wrap dress in size 16?',
        product: 'Emerald Green Evening Wrap Dress',
        estimatedValue: 125000,
        customerName: 'Blessing Okafor',
        phone: '+234 809 333 7788',
        location: 'Maitama, Abuja',
      },
      {
        text: 'Hello, please send account details for the Classic Linen Shirt in White.',
        product: 'Classic Crisp Linen Shirt',
        estimatedValue: 45000,
        customerName: 'Tariere Briggs',
        phone: '+234 802 444 6611',
        location: 'GRA Phase 2, Port Harcourt',
      },
    ];

    const template = simulationTemplates[Math.floor(Math.random() * simulationTemplates.length)];

    return this.handleInboundMessage({
      phone: template.phone,
      name: template.customerName,
      location: template.location,
      text: template.text,
      productInterest: template.product,
      estimatedValue: template.estimatedValue,
      leadStage: 'NEW_LEAD',
      isSimulated: true,
    });
  }

  public async receiveInboundMessage(params: {
    phone: string;
    name?: string;
    location?: string;
    text: string;
    productInterest?: string;
    estimatedValue?: number;
    leadStage?: LeadStage;
    timestamp?: string;
    isSimulated?: boolean;
  }): Promise<{ customer: Customer; conversation: Conversation; message: Message }> {
    return this.handleInboundMessage(params);
  }

  public getWhatsAppConfig(): WhatsAppIntegrationConfig {
    return messagingService.getConfig();
  }

  public updateWhatsAppConfig(updates: Partial<WhatsAppIntegrationConfig>): WhatsAppIntegrationConfig {
    const updated = messagingService.updateConfig(updates);
    this.notify();
    return updated;
  }

  public setDemoMode(enabled: boolean): WhatsAppIntegrationConfig {
    const updated = messagingService.setDemoMode(enabled);
    this.notify();
    return updated;
  }

  public getData() {
    return {
      user: this.user,
      business: this.business,
      knowledgeBase: this.knowledgeBase,
      whatsAppConfig: this.getWhatsAppConfig(),
      products: [...this.products],
      customers: [...this.customers],
      conversations: [...this.conversations],
      messages: [...this.messages],
      leads: [...this.leads],
      orders: [...this.orders],
      followUps: [...this.followUps],
      notifications: [...this.notifications],
      metrics: this.getMetrics(),
    };
  }

  public simulatePayment(orderId?: string): { order: Order; customer: Customer } {
    let targetOrder = orderId
      ? this.orders.find((o) => o.id === orderId)
      : this.orders.find((o) => o.paymentStatus === 'awaiting_payment');

    if (!targetOrder) {
      targetOrder = this.orders.find((o) => o.paymentStatus !== 'paid');
    }

    if (!targetOrder) {
      targetOrder = this.orders[0];
    }

    this.updateOrderStatus(targetOrder.id, 'paid', 'processing');

    const customer =
      this.customers.find((c) => c.id === targetOrder!.customerId) || this.customers[0];

    this.notifications.unshift({
      id: `notif_${Date.now()}`,
      businessId: this.currentBusinessId,
      title: `₦${targetOrder.total.toLocaleString()} Payment Received!`,
      message: `${customer.name} paid for Order #${targetOrder.orderNumber} via WhatsApp transfer.`,
      type: 'payment',
      timestamp: 'Just now',
      read: false,
      link: 'orders',
    });

    return { order: targetOrder, customer };
  }

  public simulateLeadAdvance(): { lead: Lead; previousStage: string; newStage: string } {
    const stageOrder: LeadStage[] = [
      'NEW_LEAD',
      'INTERESTED',
      'PRODUCT_SELECTED',
      'AWAITING_PAYMENT',
      'PAID',
      'COMPLETED',
    ];

    const eligibleLeads = this.leads.filter(
      (l) => l.stage !== 'COMPLETED' && l.stage !== 'LOST'
    );
    const targetLead =
      eligibleLeads[Math.floor(Math.random() * eligibleLeads.length)] || this.leads[0];
    const currentIndex = stageOrder.indexOf(targetLead.stage);
    const previousStage = targetLead.stage;
    const nextStage =
      currentIndex < stageOrder.length - 1 ? stageOrder[currentIndex + 1] : 'COMPLETED';

    this.updateLeadStage(targetLead.id, nextStage);

    return { lead: targetLead, previousStage, newStage: nextStage };
  }
}

export const storage = new StorageService();

// Exported singleton facade matching App expectations exactly
export class StorageServiceFacade {
  static setBusinessContext(
    businessId: string,
    userId: string,
    initialMeta?: Partial<Business>,
    isDemoMode: boolean = false
  ) {
    return storage.setBusinessContext(businessId, userId, initialMeta, isDemoMode);
  }

  static hasAttachedListeners(): boolean {
    return storage.hasAttachedListeners();
  }

  static getListenerCount(): number {
    return storage.getListenerCount();
  }

  static isConnectingContext(): boolean {
    return storage.isConnectingContext();
  }

  static getData() {
    return storage.getData();
  }

  static subscribe(listener: (data: ReturnType<typeof storage.getData>) => void) {
    return storage.subscribe(() => listener(storage.getData()));
  }

  static async simulateIncomingMessage() {
    return storage.simulateIncomingMessage();
  }

  static async receiveInboundMessage(params: {
    phone: string;
    name?: string;
    location?: string;
    text: string;
    productInterest?: string;
    estimatedValue?: number;
    leadStage?: LeadStage;
    timestamp?: string;
    isSimulated?: boolean;
  }) {
    return storage.receiveInboundMessage(params);
  }

  static simulatePayment(orderId?: string) {
    return storage.simulatePayment(orderId);
  }

  static simulateLeadAdvance() {
    return storage.simulateLeadAdvance();
  }

  static async addMessage(conversationId: string, content: string, sender: 'business' | 'customer' = 'business') {
    return storage.sendMessage(conversationId, content, sender);
  }

  static updateCustomerLeadStage(customerId: string, stage: LeadStage) {
    const lead = storage.getLeads().find((l) => l.customerId === customerId);
    if (lead) {
      storage.updateLeadStage(lead.id, stage);
    } else {
      storage.updateCustomer(customerId, { leadStage: stage });
    }
  }

  static createOrder(orderData: Omit<Order, 'id' | 'orderNumber' | 'businessId' | 'createdDate'>) {
    return storage.addOrder(orderData);
  }

  static updateOrderStatus(orderId: string, paymentStatus?: PaymentStatus, orderStatus?: OrderStatus) {
    return storage.updateOrderStatus(orderId, paymentStatus, orderStatus);
  }

  static addProduct(product: Omit<Product, 'id' | 'businessId'>) {
    return storage.addProduct(product);
  }

  static deleteProduct(id: string) {
    return storage.deleteProduct(id);
  }

  static addCustomer(customer: Omit<Customer, 'id' | 'businessId'>) {
    return storage.addCustomer(customer);
  }

  static addFollowUp(followUp: Omit<FollowUp, 'id' | 'businessId'>) {
    return storage.addFollowUp(followUp);
  }

  static updateFollowUpStatus(id: string, status: FollowUp['status']) {
    return storage.updateFollowUpStatus(id, status);
  }

  static updateBusiness(biz: Partial<Business>) {
    return storage.updateBusiness(biz);
  }

  static updateKnowledgeBase(kb: Partial<KnowledgeBase>) {
    return storage.updateKnowledgeBase(kb);
  }

  static resetToSeed() {
    return storage.resetToDemoData();
  }

  static markConversationAsRead(id: string) {
    return storage.markConversationRead(id);
  }

  static getWhatsAppConfig() {
    return storage.getWhatsAppConfig();
  }

  static updateWhatsAppConfig(updates: Partial<WhatsAppIntegrationConfig>) {
    return storage.updateWhatsAppConfig(updates);
  }

  static setDemoMode(enabled: boolean) {
    return storage.setDemoMode(enabled);
  }
}

export { StorageServiceFacade as StorageService };
