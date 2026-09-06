import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Send,
  Sparkles,
  DollarSign,
  ShoppingBag,
  CreditCard,
  Clock,
  Phone,
  MapPin,
  Tag,
  CheckCheck,
  Check,
  Paperclip,
  Smile,
  Copy,
  Plus,
  RefreshCw,
  Zap,
  ArrowRight,
  ArrowLeft,
  Menu,
  UserCheck,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  Info,
} from 'lucide-react';
import {
  Conversation,
  Message,
  Customer,
  Product,
  KnowledgeBase,
  LeadStage,
  Order,
  WhatsAppIntegrationConfig,
} from '../../types';
import { StageBadge } from '../common/Badge';

interface InboxViewProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  messages: Message[];
  customer?: Customer;
  products: Product[];
  knowledgeBase: KnowledgeBase;
  whatsAppConfig?: WhatsAppIntegrationConfig;
  onSendMessage: (conversationId: string, content: string) => void;
  onUpdateLeadStage: (customerId: string, stage: LeadStage) => void;
  onCreateOrderForCustomer: (customer: Customer) => void;
  onSimulateIncomingMessage?: () => void;
  onNavigateToSettings?: () => void;
  onNavigate?: (view: string) => void;
  onOpenMobileMenu?: () => void;
}

export const InboxView: React.FC<InboxViewProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  messages,
  customer,
  products,
  knowledgeBase,
  whatsAppConfig,
  onSendMessage,
  onUpdateLeadStage,
  onCreateOrderForCustomer,
  onSimulateIncomingMessage,
  onNavigateToSettings,
  onNavigate,
  onOpenMobileMenu,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [messageInput, setMessageInput] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>(
    activeConversationId ? 'chat' : 'list'
  );

  useEffect(() => {
    if (activeConversationId) {
      setMobileView('chat');
    }
  }, [activeConversationId]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiActionType, setAiActionType] = useState<string>('generate_reply');
  const [copiedText, setCopiedText] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find((c) => c.id === activeConversationId) || conversations[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeConv]);

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customerPhone.includes(searchTerm);
    const matchesStage = filterStage === 'all' || c.leadStage === filterStage;
    return matchesSearch && matchesStage;
  });

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || !activeConv) return;
    onSendMessage(activeConv.id, messageInput.trim());
    setMessageInput('');
    setAiSuggestion(null);
  };

  const handleFetchAiReply = async (actionType = 'generate_reply') => {
    if (!activeConv) return;
    setIsAiLoading(true);
    setAiActionType(actionType);
    try {
      const response = await fetch('/api/ai/reply-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: activeConv.lastMessage,
          history: messages.slice(-5),
          customer,
          knowledgeBase,
          products,
          actionType,
        }),
      });
      const data = await response.json();
      if (data.suggestion) {
        setAiSuggestion(data.suggestion);
      }
    } catch (err) {
      console.error('Error fetching AI reply:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleApplyAiSuggestion = () => {
    if (aiSuggestion) {
      setMessageInput(aiSuggestion);
    }
  };

  const handleSendQuickBankDetails = () => {
    const bankMsg = `Here are our official LUMA Fashion payment details:
🏦 Bank: Zenith Bank
💼 Account Name: LUMA FASHION APPAREL NIG LTD
🔢 Account Number: 1018945203
💳 Branch: Lekki Phase 1, Lagos

Please send your transfer receipt here once completed for instant dispatch confirmation! ✨`;
    setMessageInput(bankMsg);
  };

  const handleSendProductCard = (p: Product) => {
    const productMsg = `✨ *${p.name}*
💰 Price: ₦${p.price.toLocaleString()}
👗 Available Sizes: ${p.sizes.join(', ')}
🎨 Colours: ${p.colours.join(', ')}
📍 Showroom: Lekki Phase 1, Lagos

${p.description}

Would you like me to reserve your size today?`;
    setMessageInput(productMsg);
    setShowCatalogModal(false);
  };

  const isDemoMode = whatsAppConfig ? whatsAppConfig.isDemoMode || whatsAppConfig.status === 'demo_connected' : true;
  const statusLabel = whatsAppConfig?.status === 'connected'
    ? 'WhatsApp Business • Connected'
    : 'WhatsApp Business • Demo Connected';

  return (
    <div className="h-full flex-1 flex flex-col overflow-hidden bg-white">
      {/* 0. Top Header: WhatsApp Inbox Header & Status */}
      <div className="bg-white border-b border-slate-200 px-3 sm:px-4 py-2.5 shrink-0 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile menu hamburger toggle to open sidebar */}
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shrink-0"
              aria-label="Open navigation menu"
              title="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Quick Return to Dashboard button */}
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-[#2563EB] hover:bg-blue-50 border border-slate-200 shrink-0 transition-colors"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="inline font-bold">Dashboard</span>
            </button>
          )}

          <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 border border-green-200 items-center justify-center shrink-0 hidden xs:flex">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0 hidden sm:block">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 truncate">WhatsApp Inbox</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-[#2563EB] border border-blue-200 whitespace-nowrap">
                <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full animate-pulse" />
                {statusLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate hidden md:block">
              Manage conversations from your connected WhatsApp Business account.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onSimulateIncomingMessage && (
            <button
              type="button"
              onClick={onSimulateIncomingMessage}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="hidden sm:inline">Simulate Inbound Message</span>
              <span className="sm:hidden">Simulate</span>
            </button>
          )}
          {onNavigateToSettings && (
            <button
              type="button"
              onClick={onNavigateToSettings}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">WhatsApp Settings</span>
              <span className="sm:hidden">Settings</span>
            </button>
          )}
        </div>
      </div>

      {/* 0.1 Demo Mode Banner */}
      {isDemoMode && (
        <div className="bg-blue-50 border-b border-blue-200 px-3 sm:px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 text-[#1E40AF]">
            <Info className="w-4 h-4 text-[#2563EB] shrink-0" />
            <span className="font-semibold">Demo Mode — WhatsApp conversations are simulated.</span>
            <span className="text-[#1E3A8A] hidden md:inline">
              Inbound messages simulate customer chats received via the WhatsApp Business Platform.
            </span>
          </div>
          <span className="text-[11px] font-mono text-blue-800 bg-blue-100 px-2 py-0.5 rounded font-medium">
            +234 814 555 0192 (Simulated)
          </span>
        </div>
      )}

      {/* Main Inbox Columns */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* 1. Left Column: WhatsApp Conversations List */}
        <div
          className={`${
            mobileView === 'list' ? 'flex w-full' : 'hidden'
          } md:flex md:w-80 lg:w-96 border-r border-slate-200 flex-col bg-white shrink-0`}
        >
          {/* Subtitle */}
          <div className="px-3.5 pt-2.5 pb-1 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Connected WhatsApp Number
            </span>
            <span className="text-[10px] font-mono text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
              +234 814 555 0192
            </span>
          </div>

          {/* Search & Filter Header */}
          <div className="p-3.5 border-b border-slate-100 space-y-2.5 bg-slate-50/50">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search WhatsApp chats or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Quick Stage Filters */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setFilterStage('all')}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap text-[11px] font-medium transition-colors ${
                  filterStage === 'all'
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                All ({conversations.length})
              </button>
              <button
                onClick={() => setFilterStage('AWAITING_PAYMENT')}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap text-[11px] font-medium transition-colors ${
                  filterStage === 'AWAITING_PAYMENT'
                    ? 'bg-rose-600 text-white font-semibold'
                    : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                }`}
              >
                Awaiting ₦
              </button>
              <button
                onClick={() => setFilterStage('INTERESTED')}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap text-[11px] font-medium transition-colors ${
                  filterStage === 'INTERESTED'
                    ? 'bg-amber-600 text-white font-semibold'
                    : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
                }`}
              >
                Interested
              </button>
              <button
                onClick={() => setFilterStage('PAID')}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap text-[11px] font-medium transition-colors ${
                  filterStage === 'PAID'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                Paid
              </button>
            </div>
          </div>

        {/* Conversation Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No conversations found.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = activeConv?.id === conv.id;
              return (
                <div
                  key={conv.id}
                  id={`conversation-item-${conv.id}`}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    setMobileView('chat');
                  }}
                  className={`p-3.5 flex items-start space-x-3 cursor-pointer transition-colors relative ${
                    isSelected
                      ? 'bg-emerald-50/70 border-r-3 border-emerald-600'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="relative shrink-0">
                    {conv.customerAvatar ? (
                      <img
                        src={conv.customerAvatar}
                        alt={conv.customerName}
                        className="w-11 h-11 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
                        {conv.customerName.charAt(0)}
                      </div>
                    )}
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4
                        className={`text-xs truncate ${
                          conv.unreadCount > 0 ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'
                        }`}
                      >
                        {conv.customerName}
                      </h4>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap ml-1">
                        {conv.lastMessageTime}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 truncate mt-0.5 leading-snug">
                      {conv.lastMessage}
                    </p>

                    <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-100/60">
                      <StageBadge stage={conv.leadStage} size="sm" />
                      {conv.estimatedOrderValue > 0 && (
                        <span className="text-[11px] font-semibold text-slate-700">
                          ₦{conv.estimatedOrderValue.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Center Column: WhatsApp Chat Area */}
      <div
        className={`${
          mobileView === 'chat' ? 'flex w-full' : 'hidden'
        } md:flex flex-1 flex-col bg-[#efeae2]/30 relative min-w-0`}
      >
        {activeConv ? (
          <>
            {/* Chat Top Header */}
            <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between shadow-2xs z-10 shrink-0">
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                {/* Mobile Back button to list */}
                <button
                  type="button"
                  onClick={() => setMobileView('list')}
                  className="md:hidden p-1.5 -ml-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shrink-0"
                  aria-label="Back to conversations list"
                  title="Back to conversations"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="relative">
                  {activeConv.customerAvatar ? (
                    <img
                      src={activeConv.customerAvatar}
                      alt={activeConv.customerName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                      {activeConv.customerName.charAt(0)}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>
                <div className="truncate">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {activeConv.customerName}
                    </h3>
                    <StageBadge stage={activeConv.leadStage} size="sm" />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {activeConv.customerPhone} • Inbound WhatsApp Thread • Assigned to {activeConv.assignedTeamMember || 'Amaka (Owner)'}
                  </p>
                </div>
              </div>

              {/* Quick Chat Header Actions */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => customer && onCreateOrderForCustomer(customer)}
                  className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-colors"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Create Order</span>
                </button>
                <button
                  onClick={handleSendQuickBankDetails}
                  className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                  <span>Bank Info</span>
                </button>
              </div>
            </div>

            {/* Message Thread Scroll View */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {/* Connected WhatsApp Business Thread Notice */}
              <div className="text-center my-2">
                <span className="px-3 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium inline-flex items-center gap-1.5 shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                  Connected WhatsApp Business Thread • Inbound messages via WhatsApp Cloud API
                </span>
              </div>

              {messages.map((msg) => {
                const isBusiness = msg.sender === 'business';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isBusiness ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-md sm:max-w-lg rounded-2xl px-4 py-2.5 shadow-2xs text-xs sm:text-sm leading-relaxed ${
                        isBusiness
                          ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none'
                          : 'bg-white text-slate-900 rounded-tl-none border border-slate-100'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <div className="flex items-center justify-end space-x-1 mt-1 text-[10px] text-slate-400">
                        <span>{msg.timestamp}</span>
                        {isBusiness && (
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* AI Reply Suggestion Box (when available) */}
            {aiSuggestion && (
              <div className="mx-4 mb-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-900 mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Gemini AI Suggestion ({aiActionType.replace('_', ' ')})</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={handleApplyAiSuggestion}
                      className="px-2 py-0.5 rounded text-[11px] bg-emerald-700 text-white font-medium hover:bg-emerald-800"
                    >
                      Insert into Input
                    </button>
                    <button
                      onClick={() => setAiSuggestion(null)}
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-700 bg-white/80 p-2 rounded-lg border border-emerald-100 leading-relaxed">
                  {aiSuggestion}
                </p>
              </div>
            )}

            {/* Composer Bar */}
            <div className="p-3 bg-white border-t border-slate-200">
              {/* Quick AI & Template Action Bar */}
              <div className="flex items-center justify-between pb-2 text-xs">
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                  <span className="text-[11px] text-slate-400 font-medium">AI Assist:</span>
                  <button
                    onClick={() => handleFetchAiReply('generate_reply')}
                    disabled={isAiLoading}
                    className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 flex items-center space-x-1 font-medium text-[11px] transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span>Smart Reply</span>
                  </button>
                  <button
                    onClick={() => handleFetchAiReply('shorten')}
                    disabled={isAiLoading}
                    className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 text-[11px] transition-colors"
                  >
                    Shorten
                  </button>
                  <button
                    onClick={() => handleFetchAiReply('friendlier')}
                    disabled={isAiLoading}
                    className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 text-[11px] transition-colors"
                  >
                    Friendlier
                  </button>
                  <button
                    onClick={() => handleFetchAiReply('followup')}
                    disabled={isAiLoading}
                    className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 text-[11px] transition-colors"
                  >
                    Nudge Follow-up
                  </button>
                </div>

                <button
                  onClick={() => setShowCatalogModal(true)}
                  className="hidden md:inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Insert Catalog Item</span>
                </button>
              </div>

              {/* Input Form */}
              <form onSubmit={handleSend} className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCatalogModal(true)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Attach catalog product"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                <input
                  id="chat-message-input"
                  type="text"
                  placeholder="Type a WhatsApp message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />

                <button
                  id="chat-send-btn"
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <ShoppingBag className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="font-semibold text-slate-700 text-base">Select a conversation</h3>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              Choose an active WhatsApp buyer thread on the left to start messaging and tracking revenue.
            </p>
          </div>
        )}
      </div>

      {/* 3. Right Column: Customer Intelligence Drawer */}
      {customer && (
        <div className="hidden xl:flex w-80 lg:w-88 border-l border-slate-200 flex-col bg-slate-50/50 overflow-y-auto">
          {/* Customer Overview Card */}
          <div className="p-5 border-b border-slate-200/80 bg-white">
            <div className="flex items-center space-x-3.5">
              {customer.avatar ? (
                <img
                  src={customer.avatar}
                  alt={customer.name}
                  className="w-12 h-12 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base">
                  {customer.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 text-sm truncate">
                  {customer.name}
                </h4>
                <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                  <Phone className="w-3 h-3" />
                  <span>{customer.phone}</span>
                </p>
                <p className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5 truncate">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>{customer.location}</span>
                </p>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mt-3">
              {customer.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Spent</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  ₦{customer.totalSpent.toLocaleString()}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Orders</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  {customer.orderCount} completed
                </p>
              </div>
            </div>
          </div>

          {/* WhatsApp Channel Metadata */}
          <div className="p-4 border-b border-slate-200/80 bg-white space-y-2 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              WhatsApp Channel Details
            </span>
            <div className="space-y-1.5 text-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Channel:</span>
                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-emerald-600" />
                  WhatsApp Business
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Connected Number:</span>
                <span className="font-mono text-[11px] text-slate-900">+234 814 555 0192</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Assigned Team:</span>
                <span className="font-medium text-slate-900">{activeConv?.assignedTeamMember || 'Amaka (Owner)'}</span>
              </div>
            </div>
          </div>

          {/* Lead Stage Selector */}
          <div className="p-4 border-b border-slate-200/80 bg-white">
            <label className="text-xs font-bold text-slate-700 block mb-2">
              Pipeline Stage
            </label>
            <select
              id="drawer-lead-stage-select"
              value={customer.leadStage}
              onChange={(e) => onUpdateLeadStage(customer.id, e.target.value as LeadStage)}
              className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="NEW_LEAD">New Lead</option>
              <option value="INTERESTED">Interested</option>
              <option value="PRODUCT_SELECTED">Product Selected</option>
              <option value="AWAITING_PAYMENT">Awaiting Payment</option>
              <option value="PAID">Paid</option>
              <option value="COMPLETED">Completed</option>
              <option value="LOST">Lost</option>
            </select>
          </div>

          {/* AI Customer Summary */}
          {customer.aiSummary && (
            <div className="p-4 border-b border-slate-200/80 bg-emerald-50/40">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-900 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>AI Buyer Insight</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {customer.aiSummary}
              </p>
              {customer.recommendedAction && (
                <div className="mt-2.5 pt-2 border-t border-emerald-100 text-[11px] text-emerald-800">
                  <strong>Recommended Next Step:</strong> {customer.recommendedAction}
                </div>
              )}
            </div>
          )}

          {/* Quick Action Buttons */}
          <div className="p-4 space-y-2">
            <button
              onClick={() => onCreateOrderForCustomer(customer)}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 shadow-2xs transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Create Order for Customer</span>
            </button>

            <button
              onClick={handleSendQuickBankDetails}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
            >
              <CreditCard className="w-4 h-4 text-slate-500" />
              <span>Send Bank Transfer Info</span>
            </button>
          </div>
        </div>
      )}
      </div>

      {/* Catalog Item Inserter Modal */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-5 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-bold text-slate-900 text-sm">Select Product to Share</h4>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 mt-2">
              {products.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSendProductCard(p)}
                  className="py-2.5 px-2 flex items-center justify-between hover:bg-slate-50 cursor-pointer rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <div>
                      <h5 className="text-xs font-semibold text-slate-900">{p.name}</h5>
                      <span className="text-[11px] text-slate-500">
                        {p.sizes.join(', ')}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-700">
                    ₦{p.price.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
