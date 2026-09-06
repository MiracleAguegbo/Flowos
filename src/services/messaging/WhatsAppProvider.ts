import { Message, WhatsAppConnectionStatus } from '../../types';
import { MessagingProvider, InboundWhatsAppMessageEvent, SendWhatsAppMessageParams } from './types';

/**
 * WhatsAppProvider
 *
 * Production messaging provider architecture for the WhatsApp Business Cloud API (Graph API v20.0).
 *
 * Real-world workflow:
 * 1. Customer sends a WhatsApp message to the business's verified phone number.
 * 2. Meta's WhatsApp Business Platform forwards a webhook POST payload to /api/webhooks/whatsapp.
 * 3. FlowOS receives the event, normalizes it via this provider, creates/matches the Customer,
 *    attaches it to the WhatsApp Inbox conversation, and triggers AI analysis.
 * 4. Business sends an outbound reply from FlowOS Inbox via POST /v20.0/{phone_number_id}/messages.
 */
export class WhatsAppProvider implements MessagingProvider {
  readonly id = 'whatsapp-cloud-api-provider';
  readonly name = 'WhatsApp Business Cloud API';
  readonly providerType = 'whatsapp_cloud_api' as const;

  private connectionStatus: WhatsAppConnectionStatus = 'not_connected';
  private listeners: Set<(event: InboundWhatsAppMessageEvent) => void> = new Set();

  constructor(status: WhatsAppConnectionStatus = 'not_connected') {
    this.connectionStatus = status;
  }

  public getConnectionStatus(): WhatsAppConnectionStatus {
    return this.connectionStatus;
  }

  public setConnectionStatus(status: WhatsAppConnectionStatus) {
    this.connectionStatus = status;
  }

  public onInboundMessage(callback: (event: InboundWhatsAppMessageEvent) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Dispatch an outbound WhatsApp message through Meta's WhatsApp Business Cloud API.
   * In a live environment with configured Meta credentials, this posts to:
   * `POST https://graph.facebook.com/v20.0/{PHONE_NUMBER_ID}/messages`
   */
  public async sendMessage(params: SendWhatsAppMessageParams): Promise<Message> {
    if (this.connectionStatus !== 'connected') {
      throw new Error(
        'WhatsApp Business is not live connected. Please connect via Settings → Integrations or switch to Demo Mode.'
      );
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const response = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: params.recipientPhone,
        text: { body: params.content },
        mediaUrl: params.mediaUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(`WhatsApp API responded with status ${response.status}`);
    }

    const result = await response.json();

    const message: Message = {
      id: result.messages?.[0]?.id || `wamid.out_${Date.now()}`,
      conversationId: params.conversationId,
      businessId: 'biz_luma_01',
      sender: 'business',
      direction: 'outbound',
      channel: 'whatsapp',
      content: params.content,
      timestamp,
      status: 'sent',
      mediaUrl: params.mediaUrl,
      metadata: {
        isSimulated: false,
        providerMessageId: result.messages?.[0]?.id,
        deliveredAt: new Date().toISOString(),
      },
    };

    return message;
  }

  /**
   * Parses and handles an incoming Meta Cloud API webhook payload.
   */
  public handleWebhookPayload(payload: any) {
    const entry = payload?.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const messageData = change?.messages?.[0];
    const contactData = change?.contacts?.[0];

    if (!messageData) return;

    const event: InboundWhatsAppMessageEvent = {
      messageId: messageData.id,
      senderPhone: messageData.from,
      senderName: contactData?.profile?.name || messageData.from,
      content: messageData.text?.body || (messageData.type === 'image' ? '[Image received]' : '[Media]'),
      timestamp: new Date(parseInt(messageData.timestamp, 10) * 1000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      channel: 'whatsapp',
      isSimulated: false,
    };

    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in WhatsApp webhook listener:', err);
      }
    });
  }
}
