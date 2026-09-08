import React, { useState } from 'react';
import {
  Business,
  DashboardMetrics,
  Product,
  Order,
  Lead,
  FollowUp,
  KnowledgeBase,
} from '../../types';
import {
  Bot,
  Send,
  Sparkles,
  User,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface AICopilotViewProps {
  business: Business;
  metrics: DashboardMetrics;
  products: Product[];
  orders: Order[];
  leads: Lead[];
  followUps: FollowUp[];
  knowledgeBase?: KnowledgeBase;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const AICopilotView: React.FC<AICopilotViewProps> = ({
  business,
  metrics,
  products,
  orders,
  leads,
  followUps,
  knowledgeBase,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello ${business.ownerName || 'there'}! I'm your FlowOS AI Business Copilot for ${business.name || 'your store'}.

I have full real-time access to your WhatsApp sales pipeline, product catalog, customer orders, and pending follow-ups.

Ask me anything about your revenue, unpaid orders, best-selling products, or who to nudge on WhatsApp today!`,
      timestamp: 'Just now',
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const samplePrompts = [
    'How much revenue did we make this month?',
    'Which customers haven’t completed payment yet?',
    'What are our best-selling products?',
    'Who are the most urgent follow-ups due today?',
    'How can we reduce drop-offs between invoice and payment?',
  ];

  const handleSendMessage = async (queryText?: string) => {
    const q = queryText || inputQuery;
    if (!q.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          workspaceContext: {
            business,
            knowledgeBase,
            metrics,
            products,
            orders,
            leads,
            followUps,
          },
        }),
      });

      const data = await response.json();
      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'assistant',
        text: data.answer || "I couldn't process that query.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e) {
      console.error('Error sending query to AI Copilot:', e);
      const isNewBiz = metrics.totalOrders === 0 && products.length === 0;
      const fallbackMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'assistant',
        text: isNewBiz
          ? `Welcome! ${business.name || 'Your business'} is active and ready for its first orders. Add products to your catalog or connect WhatsApp to start receiving customer inquiries and tracking sales.`
          : `${business.name || 'Your business'} has generated ${business.currency || '₦'}${metrics.revenueThisMonth.toLocaleString()} this month across ${metrics.totalOrders} orders. You currently have ${business.currency || '₦'}${metrics.outstandingPayments.toLocaleString()} in pending payments and ${metrics.followUpsDue} follow-ups due.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3.5 pb-4 border-b border-slate-200">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-xs">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              AI Sales Copilot
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Grounded Gemini 3.8
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time conversational intelligence trained on your WhatsApp CRM, catalog, and sales data.
          </p>
        </div>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
          Suggested Business Queries
        </span>
        <div className="flex flex-wrap gap-2">
          {samplePrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/60 text-slate-700 hover:text-emerald-900 text-xs font-medium transition-all shadow-2xs text-left"
            >
              💡 {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Conversation Scroll Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col h-[520px]">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.id}
                className={`flex items-start space-x-3 ${
                  isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    isUser
                      ? 'bg-slate-800 text-white'
                      : 'bg-emerald-600 text-white shadow-2xs'
                  }`}
                >
                  {isUser ? 'A' : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-slate-900 text-white rounded-tr-none'
                      : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-none shadow-2xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  <span
                    className={`block text-[10px] mt-1.5 ${
                      isUser ? 'text-slate-400 text-right' : 'text-slate-400'
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center space-x-3 text-slate-400 text-xs italic p-2">
              <Bot className="w-4 h-4 text-emerald-600 animate-spin" />
              <span>Analyzing {business.name || 'workspace'} data with Gemini...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-slate-50/80 border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              placeholder="Ask anything about sales, unpaid orders, customers, or stock..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isLoading}
              className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 shadow-2xs transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
