import React, { useState } from 'react';
import {
  Lead,
  LeadStage,
  Customer,
} from '../../types';
import {
  DollarSign,
  Clock,
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { StageBadge } from '../common/Badge';

interface PipelineViewProps {
  leads: Lead[];
  customers: Customer[];
  onUpdateStage: (leadId: string, stage: LeadStage) => void;
  onOpenChat: (customerId: string) => void;
}

const STAGES: { id: LeadStage; title: string; color: string; border: string; bg: string }[] = [
  { id: 'NEW_LEAD', title: 'New Lead', color: 'text-blue-700', border: 'border-blue-200', bg: 'bg-blue-50/50' },
  { id: 'INTERESTED', title: 'Interested', color: 'text-amber-700', border: 'border-amber-200', bg: 'bg-amber-50/50' },
  { id: 'PRODUCT_SELECTED', title: 'Product Selected', color: 'text-purple-700', border: 'border-purple-200', bg: 'bg-purple-50/50' },
  { id: 'AWAITING_PAYMENT', title: 'Awaiting Payment', color: 'text-rose-700', border: 'border-rose-200', bg: 'bg-rose-50/50' },
  { id: 'PAID', title: 'Paid', color: 'text-emerald-700', border: 'border-emerald-200', bg: 'bg-emerald-50/50' },
  { id: 'COMPLETED', title: 'Completed', color: 'text-teal-700', border: 'border-teal-200', bg: 'bg-teal-50/50' },
  { id: 'LOST', title: 'Lost', color: 'text-slate-600', border: 'border-slate-200', bg: 'bg-slate-50' },
];

export const PipelineView: React.FC<PipelineViewProps> = ({
  leads,
  customers,
  onUpdateStage,
  onOpenChat,
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  const stageOrder: LeadStage[] = [
    'NEW_LEAD',
    'INTERESTED',
    'PRODUCT_SELECTED',
    'AWAITING_PAYMENT',
    'PAID',
    'COMPLETED',
    'LOST',
  ];

  const totalPipelineValue = leads
    .filter((l) => l.stage !== 'COMPLETED' && l.stage !== 'LOST')
    .reduce((sum, l) => sum + l.potentialValue, 0);

  const awaitingPaymentValue = leads
    .filter((l) => l.stage === 'AWAITING_PAYMENT')
    .reduce((sum, l) => sum + l.potentialValue, 0);

  const activeLeadsCount = leads.filter((l) => l.stage !== 'LOST').length;

  const handleAdvance = (lead: Lead) => {
    const currentIndex = stageOrder.indexOf(lead.stage);
    if (currentIndex < stageOrder.length - 2) {
      // Don't advance directly into LOST
      const nextStage = stageOrder[currentIndex + 1];
      onUpdateStage(lead.id, nextStage);
    }
  };

  const handleRegress = (lead: Lead) => {
    const currentIndex = stageOrder.indexOf(lead.stage);
    if (currentIndex > 0) {
      const prevStage = stageOrder[currentIndex - 1];
      onUpdateStage(lead.id, prevStage);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Top Header Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Sales Pipeline Kanban
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Turn WhatsApp conversations into paid orders across 7 organized stages.
          </p>
        </div>

        {/* Pipeline Value Stats */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2.5 rounded-xl bg-white border border-[#E5E7EB]">
            <span className="text-[10px] uppercase font-medium text-[#9CA3AF] tracking-wide block">
              Active Pipeline Value
            </span>
            <span className="text-base font-bold text-[#111827]">
              ₦{totalPipelineValue.toLocaleString()}
            </span>
          </div>

          <div className="px-4 py-2.5 rounded-xl bg-white border border-[#E5E7EB]">
            <span className="text-[10px] uppercase font-medium text-[#9CA3AF] tracking-wide block">
              Awaiting Payment ₦
            </span>
            <span className="text-base font-bold text-red-500">
              ₦{awaitingPaymentValue.toLocaleString()}
            </span>
          </div>

          <div className="px-4 py-2.5 rounded-xl bg-white border border-[#E5E7EB]">
            <span className="text-[10px] uppercase font-medium text-[#9CA3AF] tracking-wide block">
              Active Inquiries
            </span>
            <span className="text-base font-bold text-[#2563EB]">
              {activeLeadsCount} deals
            </span>
          </div>
        </div>
      </div>

      {/* Kanban Board Horizontal Scroll Container */}
      <div className="overflow-x-auto pb-4 pt-1">
        <div className="flex items-start space-x-3.5 min-w-[1300px]">
          {STAGES.map((stage) => {
            const stageLeads = leads.filter(
              (l) =>
                l.stage === stage.id &&
                (l.customerName.toLowerCase().includes(filterQuery.toLowerCase()) ||
                  l.productInterest.toLowerCase().includes(filterQuery.toLowerCase()))
            );

            const stageTotal = stageLeads.reduce((sum, l) => sum + l.potentialValue, 0);

            return (
              <div
                key={stage.id}
                className="w-72 shrink-0 bg-[#F3F4F6]/70 rounded-xl p-3 border border-[#E5E7EB] flex flex-col max-h-[calc(100vh-210px)]"
              >
                {/* Column Header */}
                <div className="pb-2.5 mb-2 border-b border-[#E5E7EB]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#111827]">
                      {stage.title}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-[#4B5563] border border-[#E5E7EB]">
                      {stageLeads.length}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-[#6B7280] font-medium">
                    <span>Total Value</span>
                    <span className="font-bold text-[#111827]">
                      ₦{stageTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
                  {stageLeads.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#9CA3AF] bg-white/60 rounded-lg border border-dashed border-[#E5E7EB]">
                      No deals in this stage
                    </div>
                  ) : (
                    stageLeads.map((lead) => {
                      const customer = customers.find((c) => c.id === lead.customerId);
                      return (
                        <div
                          key={lead.id}
                          className="p-3.5 bg-white rounded-lg border border-[#E5E7EB] hover:border-[#D1D5DB] transition-all space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <h4 className="font-bold text-xs text-[#111827] leading-snug">
                              {lead.customerName}
                            </h4>
                            <span className="text-[10px] font-medium text-[#9CA3AF]">
                              {lead.daysInStage}d ago
                            </span>
                          </div>

                          <div className="text-xs text-[#4B5563]">
                            <p className="truncate">{lead.productInterest}</p>
                            <p className="font-bold text-[#111827] mt-1 text-sm">
                              ₦{lead.potentialValue.toLocaleString()}
                            </p>
                          </div>

                          {/* Quick Card Controls */}
                          <div className="pt-2 border-t border-[#F3F4F6] flex items-center justify-between">
                            <button
                              onClick={() => onOpenChat(lead.customerId)}
                              className="text-xs text-[#2563EB] font-semibold hover:underline flex items-center gap-1"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>Chat</span>
                            </button>

                            <div className="flex items-center gap-1">
                              {lead.stage !== 'NEW_LEAD' && (
                                <button
                                  onClick={() => handleRegress(lead)}
                                  className="p-1 rounded text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6]"
                                  title="Previous stage"
                                >
                                  <ArrowLeft className="w-3 h-3" />
                                </button>
                              )}
                              {lead.stage !== 'COMPLETED' && (
                                <button
                                  onClick={() => handleAdvance(lead)}
                                  className="p-1 rounded text-[#2563EB] hover:bg-blue-50"
                                  title="Advance stage"
                                >
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
