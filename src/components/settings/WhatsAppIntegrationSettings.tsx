import React, { useState } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Building2,
  ShieldCheck,
  Zap,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Sliders,
  Check,
  X,
  Info,
} from 'lucide-react';
import { WhatsAppIntegrationConfig, Business } from '../../types';

interface WhatsAppIntegrationSettingsProps {
  config: WhatsAppIntegrationConfig;
  business: Business;
  onUpdateConfig: (updates: Partial<WhatsAppIntegrationConfig>) => void;
  onSimulateIncomingMessage?: () => void;
  onSimulatePayment?: () => void;
}

export const WhatsAppIntegrationSettings: React.FC<WhatsAppIntegrationSettingsProps> = ({
  config,
  business,
  onUpdateConfig,
  onSimulateIncomingMessage,
  onSimulatePayment,
}) => {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState(1);

  const isDemo = config.isDemoMode || config.status === 'demo_connected';
  const isConnected = config.status === 'connected';

  const handleToggleDemoMode = (enable: boolean) => {
    onUpdateConfig({
      isDemoMode: enable,
      status: enable ? 'demo_connected' : 'not_connected',
    });
  };

  const handleSimulateConnect = () => {
    onUpdateConfig({
      status: 'connected',
      isDemoMode: false,
      lastSyncTime: 'Just now',
    });
    setShowConnectModal(false);
  };

  const handleDisconnect = () => {
    onUpdateConfig({
      status: 'not_connected',
      isDemoMode: false,
    });
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center text-xs text-[#6B7280]">
        <span>Settings</span>
        <span className="mx-1.5 text-[#D1D5DB]">/</span>
        <span>Integrations</span>
        <span className="mx-1.5 text-[#D1D5DB]">/</span>
        <span className="font-semibold text-[#111827]">WhatsApp</span>
      </div>

      {/* Demo Mode Notice Banner if in Demo Mode */}
      {isDemo && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[#2563EB]/10 text-[#2563EB] shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#1E40AF]">
                Demo Mode — WhatsApp conversations are simulated.
              </h4>
              <p className="text-xs text-[#1E3A8A] mt-0.5 leading-relaxed">
                FlowOS is in simulation mode. Messages in your WhatsApp Inbox behave exactly like real inbound customer inquiries received via the WhatsApp Business Platform.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800">
              Demo Active
            </span>
          </div>
        </div>
      )}

      {/* Main Connection Status Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E7EB]">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center text-green-600 shrink-0 shadow-2xs">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-[#111827]">WhatsApp Business</h3>
                {/* Status Badge */}
                {config.status === 'connected' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    Connected
                  </span>
                )}
                {config.status === 'demo_connected' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#2563EB] border border-blue-200">
                    <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full animate-pulse" />
                    Demo Connected
                  </span>
                )}
                {config.status === 'not_connected' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]">
                    <span className="w-1.5 h-1.5 bg-[#9CA3AF] rounded-full" />
                    Not Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6B7280] mt-1">
                Receive messages from your customers on standard WhatsApp, route conversations to FlowOS, and power AI sales replies.
              </p>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="flex items-center gap-2 shrink-0">
            {config.status === 'not_connected' ? (
              <button
                type="button"
                id="btn-connect-whatsapp"
                onClick={() => setShowConnectModal(true)}
                className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Connect WhatsApp Business</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(true)}
                  className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] text-xs font-medium text-[#374151] transition-colors"
                >
                  View Connection
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-xs font-medium text-red-600 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Integration Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
            <span className="text-[10px] uppercase font-bold text-[#9CA3AF] tracking-wider block">
              Phone Number
            </span>
            <span className="text-sm font-semibold text-[#111827] mt-1 block">
              {config.phoneNumberDisplay || '+234 814 555 0192'}
            </span>
            <span className="text-[10px] text-green-600 font-medium mt-0.5 inline-block">
              ✓ Verified Meta Number
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
            <span className="text-[10px] uppercase font-bold text-[#9CA3AF] tracking-wider block">
              Business Account
            </span>
            <span className="text-sm font-semibold text-[#111827] mt-1 block truncate">
              {config.businessAccountName || business.name || 'LUMA FASHION'}
            </span>
            <span className="text-[10px] text-[#6B7280] font-mono mt-0.5 inline-block">
              {config.businessAccountId || 'WABA_LUMA_902188'}
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
            <span className="text-[10px] uppercase font-bold text-[#9CA3AF] tracking-wider block">
              Quality Rating
            </span>
            <span className="text-sm font-semibold text-green-600 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              High (Green)
            </span>
            <span className="text-[10px] text-[#6B7280] mt-0.5 inline-block">
              Tier 1 • 1k limits / 24h
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
            <span className="text-[10px] uppercase font-bold text-[#9CA3AF] tracking-wider block">
              Webhook Endpoint
            </span>
            <span className="text-xs font-mono text-[#4B5563] mt-1 block truncate">
              /api/webhooks/whatsapp
            </span>
            <span className="text-[10px] text-green-600 font-medium mt-0.5 inline-block">
              ● Active & Listening
            </span>
          </div>
        </div>

        {/* Demo Mode Controller Card */}
        <div className="pt-4 border-t border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#111827]">Demo Mode</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E5E7EB] text-[#4B5563]">
                PROTOTYPE ENVIRONMENT
              </span>
            </div>
            <p className="text-xs text-[#6B7280] max-w-xl">
              Enable Demo Mode to simulate incoming WhatsApp customer inquiries and test your pipeline, AI replies, and order workflows safely.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              id="toggle-demo-mode-btn"
              onClick={() => handleToggleDemoMode(!isDemo)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                isDemo ? 'bg-[#2563EB]' : 'bg-[#D1D5DB]'
              }`}
              role="switch"
              aria-checked={isDemo}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isDemo ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-xs font-semibold text-[#111827]">
              {isDemo ? 'Demo Enabled' : 'Disabled'}
            </span>
          </div>
        </div>

        {/* Simulation Triggers within Settings */}
        {isDemo && (
          <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#111827] uppercase tracking-wide">
                Simulate WhatsApp Platform Events
              </span>
              <span className="text-[11px] text-[#6B7280]">
                Dispatches simulated webhook events into FlowOS
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {onSimulateIncomingMessage && (
                <button
                  type="button"
                  onClick={onSimulateIncomingMessage}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB] hover:bg-[#F3F4F6] text-xs font-semibold text-[#111827] flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Simulate Inbound Customer Message</span>
                </button>
              )}
              {onSimulatePayment && (
                <button
                  type="button"
                  onClick={onSimulatePayment}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#E5E7EB] hover:bg-[#F3F4F6] text-xs font-semibold text-[#111827] flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Simulate Verified WhatsApp Bank Transfer (₦)</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Conceptual Architecture Diagram */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 text-xs space-y-4">
        <h4 className="font-bold text-[#111827] text-sm">
          How FlowOS Integrates with WhatsApp
        </h4>
        <p className="text-[#6B7280] leading-relaxed">
          FlowOS is <strong className="text-[#111827]">not a replacement for WhatsApp</strong>. Your customers continue using normal WhatsApp on their phones. Your business connects its official WhatsApp Business account, turning FlowOS into your centralized sales, CRM, and AI operations workspace.
        </p>

        {/* Step Flow Diagram */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
          <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] text-center">
            <span className="text-[10px] font-bold text-[#9CA3AF] uppercase block">Step 1</span>
            <p className="font-bold text-[#111827] mt-1">Customer</p>
            <p className="text-[11px] text-[#6B7280] mt-0.5">Sends WhatsApp text to your business</p>
          </div>

          <div className="hidden sm:flex items-center justify-center text-[#9CA3AF]">
            <ArrowRight className="w-4 h-4" />
          </div>

          <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] text-center">
            <span className="text-[10px] font-bold text-[#9CA3AF] uppercase block">Step 2</span>
            <p className="font-bold text-[#111827] mt-1">WhatsApp Cloud API</p>
            <p className="text-[11px] text-[#6B7280] mt-0.5">Meta delivers webhook to FlowOS</p>
          </div>

          <div className="hidden sm:flex items-center justify-center text-[#9CA3AF]">
            <ArrowRight className="w-4 h-4" />
          </div>

          <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 text-center">
            <span className="text-[10px] font-bold text-[#2563EB] uppercase block">Step 3</span>
            <p className="font-bold text-[#111827] mt-1">FlowOS Workspace</p>
            <p className="text-[11px] text-[#2563EB] mt-0.5">Inbox + AI CRM + Orders + Pipeline</p>
          </div>
        </div>
      </div>

      {/* Onboarding Flow Modal */}
      {showConnectModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowConnectModal(false)}
        >
          <div
            className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-lg w-full p-6 space-y-6 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div>
                <h3 className="text-base font-bold text-[#111827]">
                  Connect WhatsApp Business Account
                </h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Authorize FlowOS to manage your connected WhatsApp number
                </p>
              </div>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-[#9CA3AF] hover:text-[#111827] p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 4 Step Onboarding Explanation */}
            <div className="space-y-3.5">
              <div
                onClick={() => setCurrentOnboardingStep(1)}
                className={`p-3.5 rounded-xl border transition-colors cursor-pointer flex items-start gap-3 ${
                  currentOnboardingStep === 1
                    ? 'border-[#2563EB] bg-blue-50/50'
                    : 'border-[#E5E7EB] hover:bg-[#F9FAFB]'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-[#111827]">Connect your WhatsApp Business account</h4>
                  <p className="text-[#6B7280] mt-0.5 text-[11px] leading-relaxed">
                    Log in with your Meta Business Manager account that owns your business brand (e.g. <strong>LUMA FASHION</strong>).
                  </p>
                </div>
              </div>

              <div
                onClick={() => setCurrentOnboardingStep(2)}
                className={`p-3.5 rounded-xl border transition-colors cursor-pointer flex items-start gap-3 ${
                  currentOnboardingStep === 2
                    ? 'border-[#2563EB] bg-blue-50/50'
                    : 'border-[#E5E7EB] hover:bg-[#F9FAFB]'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-[#111827]">Authorize FlowOS</h4>
                  <p className="text-[#6B7280] mt-0.5 text-[11px] leading-relaxed">
                    Grant FlowOS permissions for <code className="bg-white px-1 py-0.5 rounded border border-[#E5E7EB]">whatsapp_business_messaging</code> to send & receive customer inquiries.
                  </p>
                </div>
              </div>

              <div
                onClick={() => setCurrentOnboardingStep(3)}
                className={`p-3.5 rounded-xl border transition-colors cursor-pointer flex items-start gap-3 ${
                  currentOnboardingStep === 3
                    ? 'border-[#2563EB] bg-blue-50/50'
                    : 'border-[#E5E7EB] hover:bg-[#F9FAFB]'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-[#111827]">Select the business phone number</h4>
                  <p className="text-[#6B7280] mt-0.5 text-[11px] leading-relaxed">
                    Link your verified Nigerian phone number: <strong>+234 814 555 0192</strong>.
                  </p>
                </div>
              </div>

              <div
                onClick={() => setCurrentOnboardingStep(4)}
                className={`p-3.5 rounded-xl border transition-colors cursor-pointer flex items-start gap-3 ${
                  currentOnboardingStep === 4
                    ? 'border-[#2563EB] bg-blue-50/50'
                    : 'border-[#E5E7EB] hover:bg-[#F9FAFB]'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  4
                </div>
                <div>
                  <h4 className="font-bold text-[#111827]">Start receiving conversations in FlowOS</h4>
                  <p className="text-[#6B7280] mt-0.5 text-[11px] leading-relaxed">
                    Your WhatsApp Inbox will automatically log conversations, recognize buyers, suggest AI replies, and sync orders.
                  </p>
                </div>
              </div>
            </div>

            {/* Prototype Notice */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
              <strong>Prototype Notice:</strong> In this environment, you can use <strong>Demo Mode</strong> to test the full CRM and sales workflow without connecting live Meta credentials.
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={handleSimulateConnect}
                className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors"
              >
                Confirm WhatsApp Connection
              </button>
              <button
                type="button"
                onClick={() => {
                  handleToggleDemoMode(true);
                  setShowConnectModal(false);
                }}
                className="px-3.5 py-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#374151] font-semibold text-xs transition-colors"
              >
                Use Demo Mode Instead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
