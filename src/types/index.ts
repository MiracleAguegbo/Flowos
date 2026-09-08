export type LeadStage = 
  | 'NEW_LEAD'
  | 'INTERESTED'
  | 'PRODUCT_SELECTED'
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'COMPLETED'
  | 'LOST';

export type PaymentStatus = 'pending' | 'awaiting_payment' | 'paid' | 'refunded';

export type OrderStatus = 
  | 'pending'
  | 'awaiting_payment'
  | 'paid'
  | 'processing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export type FollowUpCategory = 
  | 'payment'
  | 'no_response'
  | 'abandoned_purchase'
  | 'repeat_customer'
  | 'reminder'
  | 'custom';

export type FollowUpPriority = 'high' | 'medium' | 'low';
export type FollowUpStatus = 'pending' | 'snoozed' | 'completed';

export interface User {
  id: string;
  email: string;
  displayName: string;
  businessId: string;
  role: 'super_admin' | 'owner' | 'admin' | 'sales_agent';
  createdAt: string;
}

export interface Business {
  id: string;
  name: string;
  ownerName: string;
  category: string;
  phone: string;
  location: string;
  currency: string;
  description: string;
  createdAt: string;
  ownerId?: string;
  members?: string[];
  memberUids?: string[];
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email?: string;
  location: string;
  status: 'active' | 'prospect' | 'inactive' | 'vip';
  leadStage: LeadStage;
  tags: string[];
  totalSpent: number;
  orderCount: number;
  lastPurchaseDate?: string;
  averageOrderValue: number;
  customerSince: string;
  avatar?: string;
  aiSummary?: string;
  recommendedAction?: string;
}

export type WhatsAppConnectionStatus = 'not_connected' | 'demo_connected' | 'connected';

export interface WhatsAppIntegrationConfig {
  status: WhatsAppConnectionStatus;
  phoneNumber: string;
  phoneNumberDisplay: string;
  businessAccountId: string;
  businessAccountName: string;
  verifiedName: string;
  isDemoMode: boolean;
  qualityRating: 'GREEN' | 'YELLOW' | 'RED';
  messagingTier: string;
  webhookUrl: string;
  lastSyncTime?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  businessId: string;
  sender: 'customer' | 'business' | 'system';
  direction?: 'inbound' | 'outbound';
  channel?: 'whatsapp';
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'simulated';
  mediaUrl?: string;
  metadata?: {
    isSimulated?: boolean;
    providerMessageId?: string;
    deliveredAt?: string;
    readAt?: string;
    templateName?: string;
  };
}

export interface Conversation {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  whatsappNumber?: string;
  channel?: 'whatsapp';
  assignedTeamMember?: string;
  customerAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  leadStage: LeadStage;
  estimatedOrderValue: number;
  status: 'open' | 'closed' | 'flagged';
}

export interface Lead {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  productInterest: string;
  potentialValue: number;
  stage: LeadStage;
  daysInStage: number;
  lastInteraction: string;
  notes?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  size?: string;
  colour?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  businessId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  deliveryAddress: string;
  createdDate: string;
  paymentDate?: string;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  sizes: string[];
  colours: string[];
  description: string;
  image: string;
  isActive: boolean;
}

export interface FollowUp {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  reason: string;
  category: FollowUpCategory;
  potentialValue: number;
  lastContact: string;
  lastMessage: string;
  recommendedAction: string;
  dueDate: string;
  priority: FollowUpPriority;
  status: FollowUpStatus;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface KnowledgeBase {
  id: string;
  businessId: string;
  businessDescription: string;
  openingHours: string;
  location: string;
  deliveryPolicy: string;
  paymentMethods: string;
  returnPolicy: string;
  discountRules: string;
  faqs: FAQItem[];
  brandVoice: string;
}

export interface NotificationItem {
  id: string;
  businessId: string;
  title: string;
  message: string;
  type: 'order' | 'payment' | 'lead' | 'message' | 'followup';
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface DashboardMetrics {
  revenueToday: number;
  revenueThisMonth: number;
  totalOrders: number;
  newLeads: number;
  conversionRate: number;
  outstandingPayments: number;
  followUpsDue: number;
  recoverableRevenue: number;
}

export type TenantTier = 'starter' | 'growth' | 'scale' | 'enterprise';
export type TenantStatus = 'active' | 'trial' | 'suspended' | 'pending_setup';

export interface MerchantTenant {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  category: string;
  whatsappNumber: string;
  location: string;
  status: TenantStatus;
  tier: TenantTier;
  monthlyFee: number;
  billingCycle: 'monthly' | 'annually';
  joinedDate: string;
  wabaId: string;
  wabaPhoneNumberId: string;
  webhookStatus: 'healthy' | 'degraded' | 'disconnected';
  stats: {
    totalMessages: number;
    activeConversations: number;
    totalOrders: number;
    gmv: number;
    aiDraftsGenerated: number;
    lastActive: string;
  };
}

export interface PlatformWebhookEvent {
  id: string;
  tenantId: string;
  tenantName: string;
  type: 'message.received' | 'message.delivered' | 'message.read' | 'payment.webhook' | 'lead.created' | 'account.alert';
  source: 'Meta WhatsApp Cloud API' | 'FlowOS Engine' | 'Payment Gateway';
  timestamp: string;
  status: 'success' | 'warning' | 'error';
  details: string;
  latencyMs: number;
}

export interface PlatformMetrics {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  mrr: number;
  totalMessagesProcessed: number;
  messagesToday: number;
  totalGmvProcessed: number;
  webhookSuccessRate: number;
  averageLatencyMs: number;
}

export interface SaaSSubscriptionPlan {
  id: TenantTier;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  maxMonthlyMessages: number;
  maxTeamMembers: number;
  aiIncluded: boolean;
  dedicatedWebhook: boolean;
}
