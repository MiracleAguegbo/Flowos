import React from 'react';
import {
  DashboardMetrics,
  Lead,
  FollowUp,
  Order,
  Conversation,
  LeadStage,
} from '../../types';
import {
  ArrowRight,
  ArrowUpRight,
  MessageSquare,
  ShoppingBag,
} from 'lucide-react';
import { StageBadge, PaymentBadge } from '../common/Badge';

interface DashboardViewProps {
  metrics: DashboardMetrics;
  leads: Lead[];
  followUps: FollowUp[];
  recentOrders: Order[];
  conversations: Conversation[];
  onNavigate: (view: string) => void;
  onOpenChat: (customerId: string, draftMessage?: string) => void;
  onUpdateLeadStage: (customerId: string, stage: LeadStage) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  leads,
  followUps,
  recentOrders,
  conversations,
  onNavigate,
  onOpenChat,
}) => {
  const urgentFollowUps = followUps.filter((f) => f.status === 'pending').slice(0, 4);

  // Sales funnel counts
  const newLeadsCount = leads.filter((l) => l.stage === 'NEW_LEAD').length || 87;
  const interestedCount = leads.filter((l) => l.stage === 'INTERESTED').length || 52;
  const productSelectedCount = leads.filter((l) => l.stage === 'PRODUCT_SELECTED').length || 31;
  const awaitingPaymentCount = leads.filter((l) => l.stage === 'AWAITING_PAYMENT').length || 12;
  const paidCount = leads.filter((l) => l.stage === 'PAID' || l.stage === 'COMPLETED').length || 25;

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Good morning, Amaka</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">
            Here is what is happening at{' '}
            <span className="text-[#2563EB] font-medium">Luma Fashion</span> today.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('inbox')}
            className="px-4 py-2 rounded-full bg-[#2563EB] text-white text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-2xs"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Open WhatsApp Inbox</span>
          </button>
          <button
            onClick={() => onNavigate('pipeline')}
            className="px-4 py-2 rounded-full bg-white border border-[#E5E7EB] text-[#4B5563] text-xs font-semibold hover:bg-[#F9FAFB] transition-colors"
          >
            <span>Sales Pipeline</span>
          </button>
        </div>
      </div>

      {/* Stats Row (Clean Minimalism 4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB]">
          <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wide mb-1">
            Revenue Today
          </p>
          <p className="text-xl font-bold text-[#111827]">
            ₦{metrics.revenueToday.toLocaleString()}
          </p>
          <p className="text-xs text-green-600 font-medium mt-2 flex items-center gap-1">
            <span>↑ 12% from yesterday</span>
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB]">
          <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wide mb-1">
            New Leads
          </p>
          <p className="text-xl font-bold text-[#111827]">{metrics.newLeads}</p>
          <p className="text-xs text-[#9CA3AF] mt-2">Last 24 hours</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB]">
          <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wide mb-1">
            Outstanding
          </p>
          <p className="text-xl font-bold text-red-500">
            ₦{metrics.outstandingPayments.toLocaleString()}
          </p>
          <p className="text-xs text-[#9CA3AF] mt-2">
            {leads.filter((l) => l.stage === 'AWAITING_PAYMENT').length} pending payments
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB]">
          <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wide mb-1">
            Follow-ups Due
          </p>
          <p className="text-xl font-bold text-[#111827]">{metrics.followUpsDue}</p>
          <p className="text-xs text-[#2563EB] font-medium mt-2">
            ₦{(metrics.recoverableRevenue / 1000000).toFixed(1)}M potential revenue
          </p>
        </div>
      </div>

      {/* Grid: Sales Funnel & Priority Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Funnel (1 Column) */}
        <div className="col-span-1 bg-white p-6 rounded-xl border border-[#E5E7EB] flex flex-col">
          <h2 className="text-sm font-bold text-[#111827] mb-6 flex items-center justify-between">
            <span>Sales Funnel</span>
            <span className="text-xs font-normal text-[#9CA3AF]">This month</span>
          </h2>

          <div className="space-y-4 flex-1">
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium text-[#4B5563]">
                <span>New Leads</span>
                <span className="font-bold text-[#111827]">{newLeadsCount}</span>
              </div>
              <div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium text-[#4B5563]">
                <span>Interested</span>
                <span className="font-bold text-[#111827]">{interestedCount}</span>
              </div>
              <div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 w-[60%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium text-[#4B5563]">
                <span>Product Selected</span>
                <span className="font-bold text-[#111827]">{productSelectedCount}</span>
              </div>
              <div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                <div className="h-full bg-blue-300 w-[35%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium text-[#4B5563]">
                <span>Awaiting Payment</span>
                <span className="font-bold text-amber-600">{awaitingPaymentCount}</span>
              </div>
              <div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                <div className="h-full bg-yellow-400 w-[20%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium text-[#4B5563]">
                <span>Paid Deals</span>
                <span className="font-bold text-green-600">{paidCount}</span>
              </div>
              <div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                <div className="h-full bg-green-500 w-[30%]" />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#F3F4F6] flex items-center justify-between">
            <span className="text-xs text-[#6B7280]">Overall Conversion</span>
            <span className="text-xs font-bold text-green-600">{metrics.conversionRate}%</span>
          </div>
        </div>

        {/* Priority Follow-up Opportunities (2 Columns) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-[#E5E7EB] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#111827]">
              Priority Follow-up Opportunities
            </h2>
            <button
              onClick={() => onNavigate('followups')}
              className="text-xs text-[#2563EB] font-semibold hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-[#9CA3AF] border-b border-[#F3F4F6]">
                  <th className="pb-3 font-semibold">Customer</th>
                  <th className="pb-3 font-semibold">Potential Value</th>
                  <th className="pb-3 font-semibold">Stage</th>
                  <th className="pb-3 font-semibold">Reason</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-[#F3F4F6]">
                {urgentFollowUps.map((item) => {
                  const initials = item.customerName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  const isPendingPayment =
                    item.reason.toLowerCase().includes('payment') ||
                    item.reason.toLowerCase().includes('account');

                  return (
                    <tr key={item.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="py-3.5 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center text-xs font-bold shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-[#111827] text-xs leading-tight">
                            {item.customerName}
                          </p>
                          <p className="text-[10px] text-[#9CA3AF] leading-tight mt-0.5">
                            Lekki, Lagos
                          </p>
                        </div>
                      </td>
                      <td className="py-3.5 font-bold text-[#111827] text-xs">
                        ₦{item.potentialValue.toLocaleString()}
                      </td>
                      <td className="py-3.5">
                        {isPendingPayment ? (
                          <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded text-[10px] font-bold border border-yellow-200/60">
                            PENDING PAYMENT
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold border border-blue-200/60">
                            INTERESTED
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-xs text-[#6B7280] max-w-xs truncate">
                        {item.reason}
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          onClick={() =>
                            onOpenChat(
                              item.customerId,
                              `Hello Queen ${
                                item.customerName.split(' ')[0]
                              }! Following up from Luma Fashion regarding your order reservation. Can we reserve this for you today?`
                            )
                          }
                          className="text-[#2563EB] font-bold text-xs hover:underline cursor-pointer"
                        >
                          {isPendingPayment ? 'Remind' : 'Follow up'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 2-Column: Live WhatsApp Threads & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent WhatsApp Threads */}
        <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#111827]">Live WhatsApp Threads</h3>
            <button
              onClick={() => onNavigate('inbox')}
              className="text-xs text-[#2563EB] font-semibold hover:underline flex items-center gap-1"
            >
              <span>View all ({conversations.length})</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-[#F3F4F6]">
            {conversations.slice(0, 4).map((conv) => (
              <div
                key={conv.id}
                onClick={() => onOpenChat(conv.customerId)}
                className="py-3 flex items-center justify-between hover:bg-[#F9FAFB] cursor-pointer px-2 rounded-md transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#F3F4F6] text-[#4B5563] flex items-center justify-center font-bold text-xs shrink-0">
                    {conv.customerName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-[#111827] truncate">
                      {conv.customerName}
                    </p>
                    <p className="text-[11px] text-[#6B7280] truncate max-w-xs">
                      {conv.lastMessage}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-[#9CA3AF] block">{conv.lastMessageTime}</span>
                  <StageBadge stage={conv.leadStage} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#111827]">Recent Customer Orders</h3>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs text-[#2563EB] font-semibold hover:underline flex items-center gap-1"
            >
              <span>Manage Orders</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider border-b border-[#F3F4F6]">
                  <th className="pb-2">Order #</th>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Total (₦)</th>
                  <th className="pb-2 text-right">Payment</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-[#F3F4F6]">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="py-2.5 font-semibold text-[#111827]">{order.orderNumber}</td>
                    <td className="py-2.5 text-[#4B5563]">{order.customerName}</td>
                    <td className="py-2.5 font-bold text-[#111827]">
                      ₦{order.total.toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right">
                      <PaymentBadge status={order.paymentStatus} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
