import { WhatsAppConnectionStatus, WhatsAppIntegrationConfig, Message } from '../../types';
import { MessagingProvider, InboundWhatsAppMessageEvent, SendWhatsAppMessageParams } from './types';
import { DemoMessagingProvider } from './DemoMessagingProvider';
import { WhatsAppProvider } from './WhatsAppProvider';

export * from './types';
export * from './DemoMessagingProvider';
export * from './WhatsAppProvider';

const DEFAULT_WHATSAPP_CONFIG: WhatsAppIntegrationConfig = {
  status: 'demo_connected',
  phoneNumber: '+2348145550192',
  phoneNumberDisplay: '+234 814 555 0192',
  businessAccountId: 'WABA_LUMA_902188',
  businessAccountName: 'LUMA FASHION',
  verifiedName: 'Luma Fashion Official',
  isDemoMode: true,
  qualityRating: 'GREEN',
  messagingTier: 'Tier 1 (1,000 conversations/24h)',
  webhookUrl: 'https://api.flowos.ng/v1/webhooks/whatsapp',
  lastSyncTime: 'Just now',
};

class MessagingServiceManager {
  private demoProvider: DemoMessagingProvider;
  private liveProvider: WhatsAppProvider;
  private config: WhatsAppIntegrationConfig;
  private listeners: Set<(config: WhatsAppIntegrationConfig) => void> = new Set();

  constructor() {
    this.demoProvider = new DemoMessagingProvider('demo_connected');
    this.liveProvider = new WhatsAppProvider('not_connected');
    this.config = { ...DEFAULT_WHATSAPP_CONFIG };
  }

  public getConfig(): WhatsAppIntegrationConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<WhatsAppIntegrationConfig>): WhatsAppIntegrationConfig {
    this.config = { ...this.config, ...updates };

    if (this.config.isDemoMode) {
      this.config.status = 'demo_connected';
      this.demoProvider.setConnectionStatus('demo_connected');
      this.liveProvider.setConnectionStatus('not_connected');
    } else if (updates.status === 'connected') {
      this.config.status = 'connected';
      this.liveProvider.setConnectionStatus('connected');
      this.demoProvider.setConnectionStatus('not_connected');
    } else if (updates.status === 'not_connected') {
      this.config.status = 'not_connected';
      this.demoProvider.setConnectionStatus('not_connected');
      this.liveProvider.setConnectionStatus('not_connected');
    }

    this.notifyConfigChange();
    return this.getConfig();
  }

  public setDemoMode(enabled: boolean): WhatsAppIntegrationConfig {
    return this.updateConfig({
      isDemoMode: enabled,
      status: enabled ? 'demo_connected' : 'not_connected',
    });
  }

  public getActiveProvider(): MessagingProvider {
    if (this.config.isDemoMode || this.config.status === 'demo_connected') {
      return this.demoProvider;
    }
    return this.liveProvider;
  }

  public async sendMessage(params: SendWhatsAppMessageParams): Promise<Message> {
    const provider = this.getActiveProvider();
    return provider.sendMessage(params);
  }

  public simulateInboundMessage(): InboundWhatsAppMessageEvent {
    return this.demoProvider.generateSimulatedInboundMessage();
  }

  public onInboundMessage(callback: (event: InboundWhatsAppMessageEvent) => void): () => void {
    const unDemo = this.demoProvider.onInboundMessage(callback);
    const unLive = this.liveProvider.onInboundMessage(callback);
    return () => {
      unDemo();
      unLive();
    };
  }

  public subscribeConfig(callback: (config: WhatsAppIntegrationConfig) => void): () => void {
    this.listeners.add(callback);
    callback(this.getConfig());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyConfigChange() {
    const current = this.getConfig();
    this.listeners.forEach((listener) => {
      try {
        listener(current);
      } catch (err) {
        console.error('Error notifying config change:', err);
      }
    });
  }
}

export const messagingService = new MessagingServiceManager();
