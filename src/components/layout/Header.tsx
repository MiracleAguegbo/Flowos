import React, { useState } from 'react';
import {
  Menu,
  Bell,
  Search,
  MessageSquare,
  DollarSign,
  TrendingUp,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Business, WhatsAppIntegrationConfig } from '../../types';

interface HeaderProps {
  business?: Business;
  whatsAppConfig?: WhatsAppIntegrationConfig;
  activeView?: string;
  onNavigate?: (view: string) => void;
  onOpenMobileMenu?: () => void;
  onSimulateIncomingMessage?: () => void;
  onSimulateMessage?: () => void;
  onSimulatePayment?: () => void;
  onSimulateLeadAdvance?: () => void;
  onResetData?: () => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  business,
  whatsAppConfig,
  activeView = 'dashboard',
  onNavigate,
  onOpenMobileMenu,
  onSimulateIncomingMessage,
  onSimulateMessage,
  onSimulatePayment,
  onSimulateLeadAdvance,
  onResetData,
  onOpenSettings,
}) => {
  const [showSearchModal, setShowSearchModal] = useState(false);
  const handleSimMsg = onSimulateIncomingMessage || onSimulateMessage;

  return (
    <header className="h-16 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-4 sm:px-8 shrink-0">
      {/* Left: Mobile Toggle & Online WhatsApp Status Pill */}
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-1.5 rounded-md text-[#4B5563] hover:bg-[#F3F4F6]"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] hidden sm:inline">
            Status:
          </span>
          <span className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60">
            <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full animate-pulse"></span>
            {whatsAppConfig?.status === 'connected' ? 'WhatsApp Connected' : 'WhatsApp Business • Demo Connected'}
          </span>
        </div>

        <div className="hidden md:flex items-center text-xs text-[#9CA3AF] ml-2">
          <span className="text-[#D1D5DB] mr-2">/</span>
          <span className="capitalize text-[#4B5563] font-medium">
            {activeView.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Right: Clean Minimalist Simulation Buttons & Search */}
      <div className="flex items-center gap-2 sm:gap-3">
        {handleSimMsg && (
          <button
            onClick={handleSimMsg}
            id="btn-simulate-message"
            className="bg-[#F3F4F6] hover:bg-[#E5E7EB] rounded-full px-3.5 py-1.5 flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#4B5563] transition-colors border border-transparent hover:border-[#E5E7EB]"
            title="Simulate incoming WhatsApp customer inquiry"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Simulate Message</span>
          </button>
        )}

        {onSimulatePayment && (
          <button
            onClick={onSimulatePayment}
            id="btn-simulate-payment"
            className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-full px-3.5 py-1.5 flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-colors shadow-2xs"
            title="Simulate verified WhatsApp bank transfer"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Simulate ₦ Pay</span>
            <span className="sm:hidden">₦ Pay</span>
          </button>
        )}

        {onSimulateLeadAdvance && (
          <button
            onClick={onSimulateLeadAdvance}
            id="btn-simulate-advance"
            className="hidden md:flex bg-white hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-full px-3 py-1.5 items-center gap-1.5 text-xs font-medium text-[#4B5563] transition-colors"
            title="Advance a deal through the sales pipeline"
          >
            <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
            <span>Advance Lead</span>
          </button>
        )}

        {/* Search button in black circle per Design HTML */}
        <button
          onClick={() => setShowSearchModal(true)}
          className="h-8 w-8 bg-black hover:bg-slate-800 rounded-full flex items-center justify-center text-white transition-colors shrink-0"
          title="Search workspace"
        >
          <Search className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quick Search Modal */}
      {showSearchModal && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-start justify-center pt-20 p-4"
          onClick={() => setShowSearchModal(false)}
        >
          <div
            className="bg-white rounded-xl border border-[#E5E7EB] shadow-xl w-full max-w-lg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[#E5E7EB] pb-3">
              <Search className="w-4 h-4 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search WhatsApp messages, orders, customers..."
                className="w-full text-sm outline-hidden text-[#111827] placeholder-[#9CA3AF]"
                autoFocus
              />
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-xs text-[#9CA3AF] hover:text-[#111827] px-1.5 py-0.5 rounded bg-[#F3F4F6]"
              >
                ESC
              </button>
            </div>
            <div className="pt-3 text-xs text-[#6B7280]">
              <p className="font-semibold text-[#9CA3AF] uppercase text-[10px] tracking-wider mb-2">
                Quick Shortcuts
              </p>
              <div className="space-y-1">
                <div className="p-2 rounded-lg hover:bg-[#F9FAFB] cursor-pointer flex justify-between">
                  <span>Ada Okoro (₦85,000 interested)</span>
                  <span className="text-[#2563EB]">WhatsApp Thread</span>
                </div>
                <div className="p-2 rounded-lg hover:bg-[#F9FAFB] cursor-pointer flex justify-between">
                  <span>Emeka Nwosu (₦120,000 awaiting payment)</span>
                  <span className="text-amber-600">Pending Transfer</span>
                </div>
                <div className="p-2 rounded-lg hover:bg-[#F9FAFB] cursor-pointer flex justify-between">
                  <span>Black Satin Slip Midi Dress</span>
                  <span className="text-[#6B7280]">Catalog</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
