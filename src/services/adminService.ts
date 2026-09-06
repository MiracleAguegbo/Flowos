import { MerchantTenant, PlatformWebhookEvent, PlatformMetrics, TenantStatus, TenantTier } from '../types';
import { INITIAL_TENANTS, INITIAL_WEBHOOK_EVENTS, SAAS_PLANS } from '../data/adminData';

const STORAGE_KEY_TENANTS = 'flowos_superadmin_tenants';
const STORAGE_KEY_WEBHOOKS = 'flowos_superadmin_webhooks';

class AdminServiceManager {
  private tenants: MerchantTenant[] = [];
  private webhookEvents: PlatformWebhookEvent[] = [];

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      const savedTenants = localStorage.getItem(STORAGE_KEY_TENANTS);
      if (savedTenants) {
        this.tenants = JSON.parse(savedTenants);
      } else {
        this.tenants = [...INITIAL_TENANTS];
        this.saveTenants();
      }

      const savedWebhooks = localStorage.getItem(STORAGE_KEY_WEBHOOKS);
      if (savedWebhooks) {
        this.webhookEvents = JSON.parse(savedWebhooks);
      } else {
        this.webhookEvents = [...INITIAL_WEBHOOK_EVENTS];
        this.saveWebhooks();
      }
    } catch {
      this.tenants = [...INITIAL_TENANTS];
      this.webhookEvents = [...INITIAL_WEBHOOK_EVENTS];
    }
  }

  private saveTenants() {
    try {
      localStorage.setItem(STORAGE_KEY_TENANTS, JSON.stringify(this.tenants));
    } catch (e) {
      console.warn('Failed to save tenants', e);
    }
  }

  private saveWebhooks() {
    try {
      localStorage.setItem(STORAGE_KEY_WEBHOOKS, JSON.stringify(this.webhookEvents));
    } catch (e) {
      console.warn('Failed to save webhooks', e);
    }
  }

  public getTenants(): MerchantTenant[] {
    return [...this.tenants];
  }

  public getTenantById(id: string): MerchantTenant | undefined {
    return this.tenants.find((t) => t.id === id);
  }

  public addTenant(
    tenantData: Omit<MerchantTenant, 'id' | 'joinedDate' | 'stats' | 'wabaId' | 'wabaPhoneNumberId' | 'webhookStatus'>
  ): MerchantTenant {
    const plan = SAAS_PLANS.find((p) => p.id === tenantData.tier) || SAAS_PLANS[0];
    const newTenant: MerchantTenant = {
      ...tenantData,
      id: `tenant_${Date.now()}`,
      joinedDate: new Date().toISOString().split('T')[0],
      monthlyFee: plan.price,
      wabaId: `waba_${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      wabaPhoneNumberId: `phone_${Math.floor(10000000000 + Math.random() * 90000000000)}`,
      webhookStatus: 'healthy',
      stats: {
        totalMessages: 0,
        activeConversations: 0,
        totalOrders: 0,
        gmv: 0,
        aiDraftsGenerated: 0,
        lastActive: 'Just provisioned',
      },
    };

    this.tenants = [newTenant, ...this.tenants];
    this.saveTenants();

    // Log a webhook event
    this.simulateWebhookEvent({
      tenantId: newTenant.id,
      tenantName: newTenant.name,
      type: 'account.alert',
      source: 'FlowOS Engine',
      status: 'success',
      details: `New merchant tenant onboarded: ${newTenant.name} (${newTenant.tier.toUpperCase()} tier)`,
      latencyMs: 24,
    });

    return newTenant;
  }

  public updateTenant(id: string, updates: Partial<MerchantTenant>): MerchantTenant | null {
    const index = this.tenants.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const existing = this.tenants[index];
    let updatedFee = existing.monthlyFee;
    if (updates.tier && updates.tier !== existing.tier) {
      const plan = SAAS_PLANS.find((p) => p.id === updates.tier);
      if (plan) updatedFee = plan.price;
    }

    const updated = {
      ...existing,
      ...updates,
      monthlyFee: updatedFee,
    };

    this.tenants[index] = updated;
    this.saveTenants();
    return updated;
  }

  public updateTenantStatus(id: string, status: TenantStatus): void {
    const tenant = this.tenants.find((t) => t.id === id);
    if (tenant) {
      tenant.status = status;
      this.saveTenants();
      this.simulateWebhookEvent({
        tenantId: tenant.id,
        tenantName: tenant.name,
        type: 'account.alert',
        source: 'FlowOS Engine',
        status: status === 'active' ? 'success' : 'warning',
        details: `Merchant status changed to ${status.toUpperCase()} by Super-Admin`,
        latencyMs: 19,
      });
    }
  }

  public updateTenantTier(id: string, tier: TenantTier): void {
    const plan = SAAS_PLANS.find((p) => p.id === tier);
    const tenant = this.tenants.find((t) => t.id === id);
    if (tenant && plan) {
      tenant.tier = tier;
      tenant.monthlyFee = plan.price;
      this.saveTenants();
      this.simulateWebhookEvent({
        tenantId: tenant.id,
        tenantName: tenant.name,
        type: 'account.alert',
        source: 'FlowOS Engine',
        status: 'success',
        details: `Subscription tier upgraded to ${plan.name} (₦${plan.price.toLocaleString()}/mo)`,
        latencyMs: 25,
      });
    }
  }

  public getWebhookEvents(): PlatformWebhookEvent[] {
    return [...this.webhookEvents];
  }

  public simulateWebhookEvent(event?: Partial<PlatformWebhookEvent>): PlatformWebhookEvent {
    const sampleTenants = this.tenants.filter((t) => t.status === 'active');
    const targetTenant =
      (event?.tenantId ? this.tenants.find((t) => t.id === event.tenantId) : null) ||
      sampleTenants[Math.floor(Math.random() * sampleTenants.length)] ||
      this.tenants[0];

    const types: PlatformWebhookEvent['type'][] = [
      'message.received',
      'message.delivered',
      'payment.webhook',
      'lead.created',
    ];

    const chosenType = event?.type || types[Math.floor(Math.random() * types.length)];
    const latencies = [28, 35, 42, 51, 64, 22];

    const newEvent: PlatformWebhookEvent = {
      id: `evt_${Date.now()}`,
      tenantId: targetTenant.id,
      tenantName: targetTenant.name,
      type: chosenType,
      source: chosenType === 'payment.webhook' ? 'Payment Gateway' : 'Meta WhatsApp Cloud API',
      timestamp: 'Just now',
      status: 'success',
      details:
        event?.details ||
        (chosenType === 'message.received'
          ? `Inbound WhatsApp message from customer routed to ${targetTenant.name}`
          : chosenType === 'payment.webhook'
          ? `Bank transfer verified for ${targetTenant.name} order via webhook`
          : chosenType === 'message.delivered'
          ? `Outbound dispatch receipt delivered via Meta Cloud API`
          : `New lead conversation initiated`),
      latencyMs: event?.latencyMs || latencies[Math.floor(Math.random() * latencies.length)],
      ...event,
    };

    this.webhookEvents = [newEvent, ...this.webhookEvents.slice(0, 24)];
    this.saveWebhooks();
    return newEvent;
  }

  public getPlatformMetrics(): PlatformMetrics {
    const activeTenants = this.tenants.filter((t) => t.status === 'active').length;
    const trialTenants = this.tenants.filter((t) => t.status === 'trial').length;
    const mrr = this.tenants
      .filter((t) => t.status === 'active' || t.status === 'trial')
      .reduce((sum, t) => sum + t.monthlyFee, 0);

    const totalMessagesProcessed = this.tenants.reduce(
      (sum, t) => sum + (t.stats?.totalMessages || 0),
      0
    );

    const totalGmvProcessed = this.tenants.reduce(
      (sum, t) => sum + (t.stats?.gmv || 0),
      0
    );

    return {
      totalTenants: this.tenants.length,
      activeTenants,
      trialTenants,
      mrr,
      totalMessagesProcessed,
      messagesToday: Math.round(totalMessagesProcessed * 0.08) + 142,
      totalGmvProcessed,
      webhookSuccessRate: 99.98,
      averageLatencyMs: 38,
    };
  }

  public resetToDefault(): void {
    this.tenants = [...INITIAL_TENANTS];
    this.webhookEvents = [...INITIAL_WEBHOOK_EVENTS];
    this.saveTenants();
    this.saveWebhooks();
  }
}

export const AdminService = new AdminServiceManager();
