import { Message, WhatsAppConnectionStatus } from '../../types';

export interface InboundWhatsAppMessageEvent {
  messageId: string;
  senderPhone: string;
  senderName: string;
  content: string;
  timestamp: string;
  channel: 'whatsapp';
  isSimulated: boolean;
  mediaUrl?: string;
  estimatedValue?: number;
  productInterest?: string;
  customerLocation?: string;
}

export interface SendWhatsAppMessageParams {
  conversationId: string;
  recipientPhone: string;
  content: string;
  mediaUrl?: string;
  templateName?: string;
}

export interface MessagingProvider {
  readonly id: string;
  readonly name: string;
  readonly providerType: 'demo' | 'whatsapp_cloud_api';
  getConnectionStatus(): WhatsAppConnectionStatus;
  sendMessage(params: SendWhatsAppMessageParams): Promise<Message>;
  onInboundMessage(callback: (event: InboundWhatsAppMessageEvent) => void): () => void;
}
