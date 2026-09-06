import React, { useState } from 'react';
import { Business, KnowledgeBase, FAQItem, WhatsAppIntegrationConfig } from '../../types';
import {
  Settings,
  Store,
  BookOpen,
  MessageSquare,
  RotateCcw,
  Save,
  Check,
  Plus,
  Trash2,
  HelpCircle,
  Sparkles,
  Download,
  Share2,
} from 'lucide-react';
import { WhatsAppIntegrationSettings } from './WhatsAppIntegrationSettings';

interface SettingsViewProps {
  business: Business;
  knowledgeBase: KnowledgeBase;
  whatsAppConfig?: WhatsAppIntegrationConfig;
  onUpdateBusiness: (business: Partial<Business>) => void;
  onUpdateKnowledgeBase: (kb: Partial<KnowledgeBase>) => void;
  onUpdateWhatsAppConfig?: (updates: Partial<WhatsAppIntegrationConfig>) => void;
  onResetData: () => void;
  onSimulateIncomingMessage?: () => void;
  onSimulatePayment?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  business,
  knowledgeBase,
  whatsAppConfig,
  onUpdateBusiness,
  onUpdateKnowledgeBase,
  onUpdateWhatsAppConfig,
  onResetData,
  onSimulateIncomingMessage,
  onSimulatePayment,
}) => {
  const [activeTab, setActiveTab] = useState<'integrations' | 'business' | 'knowledge' | 'faqs' | 'templates' | 'system'>('integrations');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Business Form State
  const [bizForm, setBizForm] = useState({ ...business });

  // Knowledge Base State
  const [kbForm, setKbForm] = useState({ ...knowledgeBase });

  // FAQ State
  const [faqs, setFaqs] = useState<FAQItem[]>([...(knowledgeBase.faqs || [])]);
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');

  const handleSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBusiness(bizForm);
    triggerSuccess();
  };

  const handleSaveKnowledgeBase = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateKnowledgeBase({ ...kbForm, faqs });
    triggerSuccess();
  };

  const handleAddFaq = () => {
    if (!newFaqQ.trim() || !newFaqA.trim()) return;
    const updated = [...faqs, { question: newFaqQ.trim(), answer: newFaqA.trim() }];
    setFaqs(updated);
    onUpdateKnowledgeBase({ faqs: updated });
    setNewFaqQ('');
    setNewFaqA('');
    triggerSuccess();
  };

  const handleDeleteFaq = (index: number) => {
    const updated = faqs.filter((_, i) => i !== index);
    setFaqs(updated);
    onUpdateKnowledgeBase({ faqs: updated });
    triggerSuccess();
  };

  const triggerSuccess = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleExportData = () => {
    const data = localStorage.getItem('flowos_data_v1');
    if (!data) return;
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flowos-luma-fashion-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Business Settings & Knowledge Base
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure LUMA FASHION workspace parameters, delivery policies, and AI operating rules.
          </p>
        </div>

        {savedSuccess && (
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center space-x-1.5 animate-fade-in shadow-2xs">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveTab('integrations')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'integrations'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-green-600" />
          <span>WhatsApp Business</span>
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        </button>
        <button
          onClick={() => setActiveTab('business')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'business'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Business Profile
        </button>
        <button
          onClick={() => setActiveTab('knowledge')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'knowledge'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          AI Knowledge Base & Rules
        </button>
        <button
          onClick={() => setActiveTab('faqs')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'faqs'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Brand FAQs ({faqs.length})
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'templates'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          WhatsApp Quick Templates
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'system'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Data & System
        </button>
      </div>

      {/* Tab 0: WhatsApp Business Integrations */}
      {activeTab === 'integrations' && (
        <WhatsAppIntegrationSettings
          config={
            whatsAppConfig || {
              status: 'demo_connected',
              phoneNumber: '+2348145550192',
              phoneNumberDisplay: '+234 814 555 0192',
              businessAccountId: 'WABA_LUMA_902188',
              businessAccountName: business.name || 'LUMA FASHION',
              verifiedName: 'Luma Fashion Official',
              isDemoMode: true,
              qualityRating: 'GREEN',
              messagingTier: 'Tier 1 (1k/day)',
              webhookUrl: '/api/webhooks/whatsapp',
              lastSyncTime: 'Just now',
            }
          }
          business={business}
          onUpdateConfig={(updates) => {
            if (onUpdateWhatsAppConfig) onUpdateWhatsAppConfig(updates);
            triggerSuccess();
          }}
          onSimulateIncomingMessage={onSimulateIncomingMessage}
          onSimulatePayment={onSimulatePayment}
        />
      )}

      {/* Tab 1: Business Profile */}
      {activeTab === 'business' && (
        <form onSubmit={handleSaveBusiness} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Business Name</label>
              <input
                type="text"
                value={bizForm.name}
                onChange={(e) => setBizForm({ ...bizForm, name: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Founder / Owner Name</label>
              <input
                type="text"
                value={bizForm.ownerName}
                onChange={(e) => setBizForm({ ...bizForm, ownerName: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">WhatsApp Business Phone</label>
              <input
                type="text"
                value={bizForm.phone}
                onChange={(e) => setBizForm({ ...bizForm, phone: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Primary Currency</label>
              <input
                type="text"
                value={bizForm.currency}
                onChange={(e) => setBizForm({ ...bizForm, currency: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Category</label>
              <input
                type="text"
                value={bizForm.category}
                onChange={(e) => setBizForm({ ...bizForm, category: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Showroom & Physical Address</label>
            <input
              type="text"
              value={bizForm.location}
              onChange={(e) => setBizForm({ ...bizForm, location: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Business Description</label>
            <textarea
              rows={3}
              value={bizForm.description}
              onChange={(e) => setBizForm({ ...bizForm, description: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-2xs flex items-center space-x-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Business Profile</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Knowledge Base & AI Rules */}
      {activeTab === 'knowledge' && (
        <form onSubmit={handleSaveKnowledgeBase} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 text-xs">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/80 flex items-start space-x-3 text-xs text-emerald-900">
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold">Grounded AI Operating Rules</h5>
              <p className="mt-0.5 text-emerald-800 leading-relaxed">
                The Gemini AI reply assistant grounds every WhatsApp response in the exact delivery policies, payment bank accounts, and brand voice specified below.
              </p>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Delivery Policy & Turnaround *</label>
            <textarea
              rows={3}
              value={kbForm.deliveryPolicy}
              onChange={(e) => setKbForm({ ...kbForm, deliveryPolicy: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-xs leading-relaxed"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Payment Accounts & Channels *</label>
            <textarea
              rows={3}
              value={kbForm.paymentMethods}
              onChange={(e) => setKbForm({ ...kbForm, paymentMethods: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-xs leading-relaxed"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Return, Refund & Exchange Policy</label>
            <textarea
              rows={2}
              value={kbForm.returnPolicy}
              onChange={(e) => setKbForm({ ...kbForm, returnPolicy: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Discounts & Promotion Rules</label>
            <textarea
              rows={2}
              value={kbForm.discountRules}
              onChange={(e) => setKbForm({ ...kbForm, discountRules: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Brand Voice & Hospitality Instructions</label>
            <textarea
              rows={2}
              value={kbForm.brandVoice}
              onChange={(e) => setKbForm({ ...kbForm, brandVoice: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-2xs flex items-center space-x-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save AI Operating Rules</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: FAQs */}
      {activeTab === 'faqs' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6 text-xs">
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900">Current Knowledge Base FAQs</h3>
            <div className="divide-y divide-slate-100">
              {faqs.map((faq, index) => (
                <div key={index} className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">{faq.question}</h5>
                    <p className="text-slate-600 text-xs mt-1 leading-relaxed">{faq.answer}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteFaq(index)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded-md"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add FAQ Form */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <h4 className="font-bold text-xs text-slate-900">Add New FAQ</h4>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Customer Question</label>
              <input
                type="text"
                placeholder="e.g. Do you deliver on weekends?"
                value={newFaqQ}
                onChange={(e) => setNewFaqQ(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Brand Answer</label>
              <textarea
                rows={2}
                placeholder="e.g. Yes Queen! Saturday deliveries run until 6 PM in Lagos..."
                value={newFaqA}
                onChange={(e) => setNewFaqA(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <button
              type="button"
              onClick={handleAddFaq}
              className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add FAQ</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Quick WhatsApp Templates */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <h4 className="font-bold text-slate-900">1. Zenith Bank Account Card</h4>
            <div className="p-3 bg-slate-50 rounded-xl font-mono text-[11px] text-slate-700">
              🏦 Bank: Zenith Bank{'\n'}
              💼 Account: LUMA FASHION APPAREL NIG LTD{'\n'}
              🔢 Number: 1018945203{'\n'}
              📍 Branch: Lekki Phase 1, Lagos{'\n'}
              Please send proof of transfer here once done! ✨
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <h4 className="font-bold text-slate-900">2. Lagos Express Dispatch Notice</h4>
            <div className="p-3 bg-slate-50 rounded-xl font-mono text-[11px] text-slate-700">
              Hello Queen! Your package has been securely packed and handed to our dispatch rider.{'\n'}
              🏍️ Rider: Ibrahim (+234 812 888 3321){'\n'}
              Estimated arrival: 2:00 PM – 4:00 PM today!
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <h4 className="font-bold text-slate-900">3. Gentle Follow-Up / Reservation Nudge</h4>
            <div className="p-3 bg-slate-50 rounded-xl font-mono text-[11px] text-slate-700">
              Hi Queen! Just checking in regarding your dress reservation. Would you like us to hold this size for you before 1 PM dispatch cutoff?
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <h4 className="font-bold text-slate-900">4. First Purchase Discount (LUMAFIRST)</h4>
            <div className="p-3 bg-slate-50 rounded-xl font-mono text-[11px] text-slate-700">
              Welcome to the LUMA family! Enjoy 5% off your first ready-to-wear order with discount code *LUMAFIRST*.
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Data & System */}
      {activeTab === 'system' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6 text-xs">
          <div>
            <h4 className="font-bold text-sm text-slate-900">Backup & Export Workspace Data</h4>
            <p className="text-slate-500 mt-1">
              Download a complete JSON snapshot of all LUMA FASHION customers, orders, catalog products, and follow-ups.
            </p>
            <button
              onClick={handleExportData}
              className="mt-3 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold flex items-center space-x-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export JSON Backup</span>
            </button>
          </div>

          <div className="pt-5 border-t border-slate-200">
            <h4 className="font-bold text-sm text-rose-900">Reset Demo Data</h4>
            <p className="text-slate-500 mt-1">
              Restore the application to the original seeded LUMA FASHION data (Nigerian currency ₦, 30+ customers, ₦8.42M monthly revenue, and active pipeline).
            </p>
            <button
              onClick={() => {
                if (window.confirm('Reset all data to the initial LUMA FASHION demo seed data?')) {
                  onResetData();
                  triggerSuccess();
                }
              }}
              className="mt-3 px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold flex items-center space-x-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset to Seed Data</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
