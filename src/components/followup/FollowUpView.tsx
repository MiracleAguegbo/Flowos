import React, { useState } from 'react';
import {
  FollowUp,
  FollowUpCategory,
  FollowUpPriority,
  Order,
  Lead,
} from '../../types';
import {
  Clock,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  Calendar,
  Send,
  Plus,
  Filter,
  Check,
} from 'lucide-react';
import { Modal } from '../common/Modal';

interface FollowUpViewProps {
  followUps: FollowUp[];
  orders?: Order[];
  leads?: Lead[];
  onUpdateStatus: (id: string, status: FollowUp['status']) => void;
  onOpenChatWithDraft: (customerId: string, draftMessage?: string) => void;
  onAddFollowUp: (data: Omit<FollowUp, 'id' | 'businessId'>) => void;
}

export const FollowUpView: React.FC<FollowUpViewProps> = ({
  followUps,
  orders = [],
  leads = [],
  onUpdateStatus,
  onOpenChatWithDraft,
  onAddFollowUp,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFollowUp, setNewFollowUp] = useState({
    customerId: '',
    customerName: '',
    customerPhone: '',
    reason: '',
    category: 'payment' as FollowUpCategory,
    potentialValue: 85000,
    lastContact: 'Today',
    lastMessage: '',
    recommendedAction: '',
    dueDate: 'Today',
    priority: 'high' as FollowUpPriority,
    status: 'pending' as FollowUp['status'],
  });

  const getFollowUpDetails = (item: FollowUp) => {
    const isFulfillment =
      item.category === 'fulfillment' ||
      item.category === 'dispatch' ||
      item.reason.toLowerCase().includes('fulfillment') ||
      item.reason.toLowerCase().includes('dispatch') ||
      item.reason.toLowerCase().includes('delivery') ||
      item.reason.toLowerCase().includes('courier');

    // Match order first if there's an order number in reason or lastMessage or by customer
    let matchedOrder = orders.find(
      (o) =>
        (o.orderNumber && item.reason.includes(o.orderNumber)) ||
        (o.orderNumber && item.lastMessage?.includes(o.orderNumber))
    );
    if (!matchedOrder && item.customerId && orders.length > 0) {
      const custOrders = orders.filter((o) => o.customerId === item.customerId);
      if (custOrders.length > 0) {
        matchedOrder = custOrders[custOrders.length - 1];
      }
    }

    // Match lead if any
    const matchedLead = leads.find(
      (l) =>
        l.customerId === item.customerId ||
        (item.customerName && l.customerName.toLowerCase() === item.customerName.toLowerCase())
    );

    let displayValue = item.potentialValue || 0;
    if (displayValue === 0) {
      if (matchedOrder && matchedOrder.total > 0) {
        displayValue = matchedOrder.total;
      } else if (matchedLead && matchedLead.potentialValue > 0) {
        displayValue = matchedLead.potentialValue;
      }
    }

    return {
      isFulfillment,
      displayValue,
      matchedOrder,
      matchedLead,
    };
  };

  const isRecoverableFollowUp = (item: FollowUp) => {
    if (item.status !== 'pending') return false;
    const { isFulfillment, matchedOrder } = getFollowUpDetails(item);
    if (isFulfillment) return false;
    if (matchedOrder && matchedOrder.paymentStatus === 'paid') return false;
    return true;
  };

  const pendingFollowUps = followUps.filter((f) => f.status === 'pending');
  const recoverableFollowUps = pendingFollowUps.filter(isRecoverableFollowUp);
  const totalRecoverable = recoverableFollowUps.reduce((sum, f) => {
    const { displayValue } = getFollowUpDetails(f);
    return sum + displayValue;
  }, 0);

  const fulfillmentFollowUps = pendingFollowUps.filter((f) => {
    const { isFulfillment, matchedOrder } = getFollowUpDetails(f);
    return isFulfillment || (matchedOrder && matchedOrder.paymentStatus === 'paid');
  });
  const fulfillmentTotalValue = fulfillmentFollowUps.reduce((sum, f) => {
    const { displayValue } = getFollowUpDetails(f);
    return sum + displayValue;
  }, 0);

  const filteredFollowUps = followUps.filter((f) => {
    if (activeCategory === 'all') return f.status === 'pending';
    if (activeCategory === 'completed') return f.status === 'completed';
    const { isFulfillment } = getFollowUpDetails(f);
    if (activeCategory === 'fulfillment') return isFulfillment && f.status === 'pending';
    return f.category === activeCategory && f.status === 'pending';
  });

  const handleCreateFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFollowUp.customerName.trim() || !newFollowUp.reason.trim()) return;
    onAddFollowUp(newFollowUp);
    setShowAddModal(false);
    setNewFollowUp({
      customerId: '',
      customerName: '',
      customerPhone: '',
      reason: '',
      category: 'payment',
      potentialValue: 50000,
      lastContact: 'Today',
      lastMessage: '',
      recommendedAction: '',
      dueDate: 'Today',
      priority: 'medium',
      status: 'pending',
    });
  };

  const getPriorityBadge = (priority: FollowUpPriority) => {
    switch (priority) {
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">High Priority</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">Medium</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">Low</span>;
    }
  };

  const getCategoryBadge = (category: FollowUpCategory) => {
    switch (category) {
      case 'payment':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">Payment</span>;
      case 'fulfillment':
      case 'dispatch':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">Fulfillment / Dispatch</span>;
      case 'no_response':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">No Response</span>;
      case 'abandoned_purchase':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">Stalled Cart</span>;
      case 'repeat_customer':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">VIP / Repeat</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-50 text-slate-700 border border-slate-200">Follow-up</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Top Banner: Recoverable Revenue */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 text-white rounded-2xl p-6 shadow-md border border-emerald-800/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-400/30 inline-flex items-center space-x-1 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Follow-up Revenue Engine</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            ₦{totalRecoverable.toLocaleString()}
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
            Recoverable revenue locked in stalled WhatsApp chats, unpaid reservations, and awaiting transfers.
          </p>
          {fulfillmentFollowUps.length > 0 && (
            <p className="text-emerald-300 text-xs mt-1.5 flex items-center gap-1.5 font-medium">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>
                ₦{fulfillmentTotalValue.toLocaleString()} across {fulfillmentFollowUps.length} order{fulfillmentFollowUps.length === 1 ? '' : 's'} is already paid and in active fulfillment/dispatch.
              </span>
            </p>
          )}
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-400 transition-colors shadow-xs flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Log Follow-up</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            activeCategory === 'all'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Pending ({pendingFollowUps.length})
        </button>
        <button
          onClick={() => setActiveCategory('payment')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            activeCategory === 'payment'
              ? 'bg-rose-600 text-white shadow-2xs'
              : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
          }`}
        >
          Awaiting Payment
        </button>
        <button
          onClick={() => setActiveCategory('fulfillment')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            activeCategory === 'fulfillment'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
          }`}
        >
          Fulfillment / Dispatch
        </button>
        <button
          onClick={() => setActiveCategory('no_response')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            activeCategory === 'no_response'
              ? 'bg-amber-600 text-white shadow-2xs'
              : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
          }`}
        >
          No Response
        </button>
        <button
          onClick={() => setActiveCategory('abandoned_purchase')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            activeCategory === 'abandoned_purchase'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
          }`}
        >
          Stalled Cart
        </button>
        <button
          onClick={() => setActiveCategory('repeat_customer')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            activeCategory === 'repeat_customer'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          VIP / Repeat
        </button>
        <button
          onClick={() => setActiveCategory('completed')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            activeCategory === 'completed'
              ? 'bg-slate-700 text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Completed
        </button>
      </div>

      {/* Follow-ups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFollowUps.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            No follow-ups in this category. All clear!
          </div>
        ) : (
          filteredFollowUps.map((item) => {
            const { isFulfillment, displayValue } = getFollowUpDetails(item);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {item.customerName}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">{item.customerPhone}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isFulfillment ? getCategoryBadge('fulfillment') : getCategoryBadge(item.category)}
                      {getPriorityBadge(item.priority)}
                    </div>
                  </div>

                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="font-medium">
                        {item.status === 'completed'
                          ? 'Recovered / Paid:'
                          : isFulfillment
                          ? 'Order Value (Paid):'
                          : 'Potential Sale (Unpaid):'}
                      </span>
                      <strong className={isFulfillment ? "text-slate-800 font-bold" : "text-emerald-700 font-bold"}>
                        ₦{displayValue.toLocaleString()}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>Reason:</span>
                      <span className="text-slate-700 font-medium text-right truncate max-w-[170px]" title={item.reason}>
                        {item.reason}
                      </span>
                    </div>
                  </div>

                  {item.lastMessage && (
                    <div className="mt-3 text-xs text-slate-600 bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-100/60">
                      <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                        Last WhatsApp Message:
                      </span>
                      <p className="italic mt-0.5">"{item.lastMessage}"</p>
                    </div>
                  )}

                  {item.recommendedAction && (
                    <div className="mt-2.5 text-xs text-slate-700">
                      <strong className="text-slate-900">Recommended Action:</strong>{' '}
                      {item.recommendedAction}
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() =>
                      onOpenChatWithDraft(
                        item.customerId,
                        isFulfillment
                          ? `Hello ${item.customerName.split(' ')[0]}! We're coordinating delivery of your order right now. Could you please confirm your delivery address and contact number?`
                          : `Hello Queen ${item.customerName.split(' ')[0]}! Just checking in regarding your reservation for LUMA Fashion. Would you like us to hold this piece for you today?`
                      )
                    }
                    className="flex-1 inline-flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-colors shadow-2xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Nudge on WhatsApp</span>
                  </button>

                  {item.status === 'pending' ? (
                    <button
                      onClick={() => onUpdateStatus(item.id, 'completed')}
                      title="Mark Won / Completed"
                      className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-800 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => onUpdateStatus(item.id, 'pending')}
                      title="Re-open"
                      className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      Re-open
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Follow-Up Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Schedule WhatsApp Follow-up"
        subtitle="Log an inquiry or deal reminder to prevent revenue leakage."
      >
        <form onSubmit={handleCreateFollowUp} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Customer Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Adaeze Okonkwo"
              value={newFollowUp.customerName}
              onChange={(e) => setNewFollowUp({ ...newFollowUp, customerName: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="+234 803 000 0000"
                value={newFollowUp.customerPhone}
                onChange={(e) => setNewFollowUp({ ...newFollowUp, customerPhone: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Potential Value (₦)</label>
              <input
                type="number"
                value={newFollowUp.potentialValue}
                onChange={(e) =>
                  setNewFollowUp({ ...newFollowUp, potentialValue: Number(e.target.value) })
                }
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Category</label>
              <select
                value={newFollowUp.category}
                onChange={(e) =>
                  setNewFollowUp({ ...newFollowUp, category: e.target.value as FollowUpCategory })
                }
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white"
              >
                <option value="payment">Awaiting Payment</option>
                <option value="fulfillment">Fulfillment / Dispatch</option>
                <option value="no_response">No Response</option>
                <option value="abandoned_purchase">Stalled Purchase</option>
                <option value="repeat_customer">Repeat Customer</option>
                <option value="reminder">General Reminder</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Priority</label>
              <select
                value={newFollowUp.priority}
                onChange={(e) =>
                  setNewFollowUp({ ...newFollowUp, priority: e.target.value as FollowUpPriority })
                }
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Reason / Context *</label>
            <input
              type="text"
              required
              placeholder="e.g. Inquired about size 12 Black Dress, awaiting transfer"
              value={newFollowUp.reason}
              onChange={(e) => setNewFollowUp({ ...newFollowUp, reason: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Recommended Action</label>
            <input
              type="text"
              placeholder="e.g. Send video swatch and confirm delivery slot"
              value={newFollowUp.recommendedAction}
              onChange={(e) => setNewFollowUp({ ...newFollowUp, recommendedAction: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700"
            >
              Save Follow-up
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
