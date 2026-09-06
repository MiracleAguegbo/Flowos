import { Message, WhatsAppConnectionStatus } from '../../types';
import { MessagingProvider, InboundWhatsAppMessageEvent, SendWhatsAppMessageParams } from './types';

const INBOUND_SIMULATION_TEMPLATES = [
  {
    senderName: 'Zainab Bello',
    senderPhone: '+234 802 884 9210',
    content: 'Good afternoon sis! Do you have the Emerald Silk Slip Dress in UK 12 available for delivery to Victoria Island today?',
    estimatedValue: 85000,
    productInterest: 'Emerald Silk Slip Dress',
    customerLocation: 'Victoria Island, Lagos',
  },
  {
    senderName: 'Chioma Eze',
    senderPhone: '+234 812 345 6789',
    content: 'Hi Amaka! Just paid ₦120,000 for the Cream Linen Two-Piece Set via Zenith mobile app. Sending the transfer receipt now! ✨',
    estimatedValue: 120000,
    productInterest: 'Cream Linen Two-Piece Set',
    customerLocation: 'Lekki Phase 1, Lagos',
  },
  {
    senderName: 'Fatima Aliyu',
    senderPhone: '+234 803 711 0022',
    content: 'Hello Queen, I saw your Instagram reel with the Black Satin Slip Midi Dress. How much is delivery to Wuse 2, Abuja?',
    estimatedValue: 92000,
    productInterest: 'Black Satin Slip Midi Dress',
    customerLocation: 'Wuse 2, Abuja',
  },
  {
    senderName: 'Ngozi Okonkwo',
    senderPhone: '+234 809 432 1199',
    content: 'Please send your bank details again for the Royal Blue Palazzo Set. Want to confirm payment before 2pm so rider can bring it today.',
    estimatedValue: 95000,
    productInterest: 'Royal Blue Palazzo Set',
    customerLocation: 'Ikeja GRA, Lagos',
  },
  {
    senderName: 'Yetunde Adeyemi',
    senderPhone: '+234 805 678 1234',
    content: 'Hello, I need 2 of the Crisp Linen Shirts (White and Beige in UK 14). Is there any discount if I pick up directly at Lekki showroom?',
    estimatedValue: 90000,
    productInterest: 'Crisp Linen Shirt',
    customerLocation: 'Oniru, Lagos',
  },
];

export class DemoMessagingProvider implements MessagingProvider {
  readonly id = 'demo-provider-01';
  readonly name = 'FlowOS Demo WhatsApp Provider';
  readonly providerType = 'demo' as const;

  private connectionStatus: WhatsAppConnectionStatus = 'demo_connected';
  private listeners: Set<(event: InboundWhatsAppMessageEvent) => void> = new Set();
  private templateIndex = 0;

  constructor(initialStatus: WhatsAppConnectionStatus = 'demo_connected') {
    this.connectionStatus = initialStatus;
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

  public async sendMessage(params: SendWhatsAppMessageParams): Promise<Message> {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const message: Message = {
      id: `msg_demo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId: params.conversationId,
      businessId: 'biz_luma_01',
      sender: 'business',
      direction: 'outbound',
      channel: 'whatsapp',
      content: params.content,
      timestamp,
      status: 'delivered',
      mediaUrl: params.mediaUrl,
      metadata: {
        isSimulated: true,
        deliveredAt: new Date().toISOString(),
        templateName: params.templateName,
      },
    };
    return message;
  }

  /**
   * Generates a simulated inbound WhatsApp customer message.
   * This represents a message sent by a customer on standard WhatsApp
   * that was forwarded via WhatsApp Business Platform webhook into FlowOS.
   */
  public generateSimulatedInboundMessage(): InboundWhatsAppMessageEvent {
    const template = INBOUND_SIMULATION_TEMPLATES[this.templateIndex % INBOUND_SIMULATION_TEMPLATES.length];
    this.templateIndex++;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const event: InboundWhatsAppMessageEvent = {
      messageId: `wamid.HBgL${Date.now()}${Math.random().toString(36).substring(2, 6)}==`,
      senderPhone: template.senderPhone,
      senderName: template.senderName,
      content: template.content,
      timestamp,
      channel: 'whatsapp',
      isSimulated: true,
      estimatedValue: template.estimatedValue,
      productInterest: template.productInterest,
      customerLocation: template.customerLocation,
    };

    // Notify listeners
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in DemoMessagingProvider listener:', err);
      }
    });

    return event;
  }
}
