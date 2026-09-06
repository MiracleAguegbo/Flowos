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
  private initialized = false;

  constructor() {
    this.user = DEMO_USER;
    this.business = DEMO_BUSINESS;
    this.knowledgeBase = DEMO_KNOWLEDGE_BASE;
    this.products = [...DEMO_PRODUCTS];
    this.customers = [...DEMO_CUSTOMERS];
    this.conversations = [...DEMO_CONVERSATIONS];
    this.messages = [...DEMO_MESSAGES];
    this.leads = [...DEMO_LEADS];
    this.orders = [...DEMO_ORDERS];
    this.followUps = [...DEMO_FOLLOW_UPS];
    this.notifications = [...DEMO_NOTIFICATIONS];

    if (typeof window !== 'undefined') {
      this.loadFromStorage();
    }
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('flowos_data_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.user = parsed.user || this.user;
        this.business = parsed.business || this.business;
        this.knowledgeBase = parsed.knowledgeBase || this.knowledgeBase;
        this.products = parsed.products || this.products;
        this.customers = parsed.customers || this.customers;
        this.conversations = parsed.conversations || this.conversations;
        this.messages = parsed.messages || this.messages;
        this.leads = parsed.leads || this.leads;
        this.orders = parsed.orders || this.orders;
        this.followUps = parsed.followUps || this.followUps;
        this.notifications = parsed.notifications || this.notifications;
      } else {
        this.saveToStorage();
      }
    } catch (e) {
      console.warn('Failed to load from storage, using seed data:', e);
    }
    this.initialized = true;
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      const data = {
        user: this.user,
        business: this.business,
        knowledgeBase: this.knowledgeBase,
        products: this.products,
        customers: this.customers,
        conversations: this.conversations,
        messages: this.messages,
        leads: this.leads,
        orders: this.orders,
        followUps: this.followUps,
        notifications: this.notifications,
      };
      localStorage.setItem('flowos_data_v1', JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  private notify() {
    this.saveToStorage();
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

  public resetToDemoData() {
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
    this.notify();
  }

  // Business & User
  public getUser(): User {
    return this.user;
  }

  public setUser(user: Partial<User>) {
    this.user = { ...this.user, ...user };
    this.notify();
  }

  public getBusiness(): Business {
    return this.business;
  }

  public updateBusiness(business: Partial<Business>) {
    this.business = { ...this.business, ...business };
    this.notify();
  }

  // Knowledge Base
  public getKnowledgeBase(): KnowledgeBase {
    return this.knowledgeBase;
  }

  public updateKnowledgeBase(kb: Partial<KnowledgeBase>) {
    this.knowledgeBase = { ...this.knowledgeBase, ...kb };
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
      this.notify();
    }
  }

  public addCustomer(customer: Omit<Customer, 'id' | 'businessId'>): Customer {
    const newCustomer: Customer = {
      ...customer,
      id: `cust_${Date.now()}`,
      businessId: this.business.id,
    };
    this.customers.unshift(newCustomer);
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

  public sendMessage(
    conversationId: string,
    content: string,
    sender: 'customer' | 'business' | 'system' = 'business'
  ): Message {
    const isCustomer = sender === 'customer';
    const isDemo = messagingService.getConfig().isDemoMode;

    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId,
      businessId: this.business.id,
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
    if (convIndex !== -1) {
      const conv = this.conversations[convIndex];
      this.conversations[convIndex] = {
        ...conv,
        channel: 'whatsapp',
        lastMessage: content,
        lastMessageTime: newMessage.timestamp,
        unreadCount: sender === 'customer' ? conv.unreadCount + 1 : 0,
      };
      // Move active conversation to top of list
      const [updatedConv] = this.conversations.splice(convIndex, 1);
      this.conversations.unshift(updatedConv);
    }

    this.notify();
    return newMessage;
  }

  public markConversationRead(conversationId: string) {
    const conv = this.conversations.find((c) => c.id === conversationId);
    if (conv && conv.unreadCount > 0) {
      conv.unreadCount = 0;
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
      businessId: this.business.id,
      createdDate: new Date().toISOString(),
    };
    this.orders.unshift(newOrder);

    // Update customer totalSpent and orderCount if paid
    if (newOrder.paymentStatus === 'paid') {
      const cust = this.customers.find((c) => c.id === newOrder.customerId);
      if (cust) {
        cust.totalSpent += newOrder.total;
        cust.orderCount += 1;
        cust.averageOrderValue = Math.round(cust.totalSpent / cust.orderCount);
        cust.lastPurchaseDate = new Date().toISOString().split('T')[0];
      }
    }

    this.notify();
    return newOrder;
  }

  public updateOrderStatus(orderId: string, paymentStatus?: PaymentStatus, orderStatus?: OrderStatus) {
    const order = this.orders.find((o) => o.id === orderId);
    if (order) {
      if (paymentStatus) {
        const wasUnpaid = order.paymentStatus !== 'paid';
        order.paymentStatus = paymentStatus;
        if (paymentStatus === 'paid') {
          order.paymentDate = new Date().toISOString();
          if (wasUnpaid) {
            // Update customer totals
            const cust = this.customers.find((c) => c.id === order.customerId);
            if (cust) {
              cust.totalSpent += order.total;
              cust.orderCount += 1;
              cust.averageOrderValue = Math.round(cust.totalSpent / cust.orderCount);
              cust.lastPurchaseDate = new Date().toISOString().split('T')[0];
            }
            // Update pipeline lead if exists
            const lead = this.leads.find((l) => l.customerId === order.customerId);
            if (lead && lead.stage !== 'COMPLETED') {
              lead.stage = 'PAID';
            }
          }
        }
      }
      if (orderStatus) {
        order.orderStatus = orderStatus;
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
      businessId: this.business.id,
    };
    this.products.unshift(newProduct);
    this.notify();
    return newProduct;
  }

  public updateProduct(id: string, updates: Partial<Product>) {
    const index = this.products.findIndex((p) => p.id === id);
    if (index !== -1) {
      this.products[index] = { ...this.products[index], ...updates };
      this.notify();
    }
  }

  public deleteProduct(id: string) {
    this.products = this.products.filter((p) => p.id !== id);
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
      this.notify();
    }
  }

  public addFollowUp(followUp: Omit<FollowUp, 'id' | 'businessId'>): FollowUp {
    const newFollowUp: FollowUp = {
      ...followUp,
      id: `fol_${Date.now()}`,
      businessId: this.business.id,
    };
    this.followUps.unshift(newFollowUp);
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
    // Calculated live with consistent baseline offset for rich demo visuals
    const paidOrders = this.orders.filter((o) => o.paymentStatus === 'paid');
    const unpaidOrders = this.orders.filter((o) => o.paymentStatus === 'awaiting_payment' || o.paymentStatus === 'pending');
    
    // Live calculated components
    const liveUnpaidSum = unpaidOrders.reduce((sum, o) => sum + o.total, 0);
    const livePaidSum = paidOrders.reduce((sum, o) => sum + o.total, 0);

    // Sum of unresolved followups (pending)
    const activeFollowUps = this.followUps.filter((f) => f.status === 'pending');
    const recoverableRevenue = activeFollowUps.reduce((sum, f) => sum + f.potentialValue, 0);

    return {
      revenueToday: 438500 + (livePaidSum > 600000 ? livePaidSum - 600000 : 0),
      revenueThisMonth: 8420000 + (livePaidSum > 600000 ? livePaidSum - 600000 : 0),
      totalOrders: 342 + (this.orders.length - 10),
      newLeads: 87 + (this.leads.filter((l) => l.stage === 'NEW_LEAD').length - 3),
      conversionRate: 18.7,
      outstandingPayments: Math.max(420000, liveUnpaidSum),
      followUpsDue: activeFollowUps.length,
      recoverableRevenue: Math.max(1240000, recoverableRevenue),
    };
  }

  // Simulation Methods (Requested in section 17)
  public simulateIncomingMessage(): { conversation: Conversation; message: Message } {
    const simulationTemplates = [
      {
        text: 'Hi Amaka! Is the black satin dress still available in size 14?',
        product: 'Black Satin Slip Midi Dress',
        estimatedValue: 85000,
        customerName: 'Folashade Adeyemi',
        phone: '+234 803 555 1928',
        location: 'Lekki Phase 2, Lagos',
      },
      {
        text: 'How much is express dispatch to Lekki Phase 1 for this afternoon?',
        product: 'Cream Linen Two-Piece Set',
        estimatedValue: 110000,
        customerName: 'Jennifer Eke',
        phone: '+234 812 777 4432',
        location: 'Lekki Phase 1, Lagos',
      },
      {
        text: 'I want to buy two of the cream sets for me and my sister!',
        product: 'Cream Linen Two-Piece Set',
        estimatedValue: 220000,
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

    // Check if customer already exists, or create
    let customer = this.customers.find((c) => c.phone === template.phone);
    if (!customer) {
      customer = this.addCustomer({
        name: template.customerName,
        phone: template.phone,
        location: template.location,
        status: 'prospect',
        leadStage: 'NEW_LEAD',
        tags: ['Simulation', 'WhatsApp Inquiry'],
        totalSpent: 0,
        orderCount: 0,
        averageOrderValue: 0,
        customerSince: new Date().toISOString().split('T')[0],
      });
    }

    // Check or create conversation
    let conv = this.conversations.find((c) => c.customerId === customer?.id);
    if (!conv) {
      conv = {
        id: `conv_${Date.now()}`,
        businessId: this.business.id,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        whatsappNumber: customer.phone,
        channel: 'whatsapp',
        assignedTeamMember: 'Amaka (Owner)',
        lastMessage: template.text,
        lastMessageTime: 'Just now',
        unreadCount: 1,
        leadStage: 'NEW_LEAD',
        estimatedOrderValue: template.estimatedValue,
        status: 'open',
      };
      this.conversations.unshift(conv);
    } else {
      conv.whatsappNumber = conv.whatsappNumber || customer.phone;
      conv.channel = 'whatsapp';
      conv.assignedTeamMember = conv.assignedTeamMember || 'Amaka (Owner)';
    }

    const message = this.sendMessage(conv.id, template.text, 'customer');

    // Add notification
    this.notifications.unshift({
      id: `notif_${Date.now()}`,
      businessId: this.business.id,
      title: `New WhatsApp: ${customer.name}`,
      message: `Inbound inquiry from connected WhatsApp Business number (${customer.phone})`,
      type: 'message',
      timestamp: 'Just now',
      read: false,
      link: 'inbox',
    });

    return { conversation: conv, message };
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

    // Add notification
    this.notifications.unshift({
      id: `notif_${Date.now()}`,
      businessId: this.business.id,
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

    // Pick a lead that is not COMPLETED or LOST
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

// Exported singleton facade matching App expectations
export class StorageServiceFacade {
  static getData() {
    return storage.getData();
  }

  static subscribe(listener: (data: ReturnType<typeof storage.getData>) => void) {
    return storage.subscribe(() => listener(storage.getData()));
  }

  static simulateIncomingMessage() {
    const { conversation, message } = storage.simulateIncomingMessage();
    const customer = storage.getCustomer(conversation.customerId) || {
      name: conversation.customerName,
      phone: conversation.customerPhone,
    };
    return { customer, message };
  }

  static simulatePayment(orderId?: string) {
    return storage.simulatePayment(orderId);
  }

  static simulateLeadAdvance() {
    return storage.simulateLeadAdvance();
  }

  static addMessage(conversationId: string, content: string, sender: 'business' | 'customer' = 'business') {
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

