import React, { useState } from 'react';
import {
  Order,
  Product,
  Customer,
  PaymentStatus,
  OrderStatus,
  Business,
  KnowledgeBase,
} from '../../types';
import {
  Search,
  Plus,
  ShoppingBag,
  DollarSign,
  Truck,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Receipt,
  MapPin,
  Calendar,
} from 'lucide-react';
import { PaymentBadge, OrderStatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface OrdersViewProps {
  orders: Order[];
  products: Product[];
  customers: Customer[];
  business?: Business;
  knowledgeBase?: KnowledgeBase;
  onAddOrder: (order: Omit<Order, 'id' | 'orderNumber' | 'businessId' | 'createdDate'>) => void;
  onUpdateStatus: (orderId: string, paymentStatus?: PaymentStatus, orderStatus?: OrderStatus) => void;
  onOpenChat: (customerId: string) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  products,
  customers,
  business,
  knowledgeBase,
  onAddOrder,
  onUpdateStatus,
  onOpenChat,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  // New order form state
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [selectedSize, setSelectedSize] = useState('UK 12');
  const [quantity, setQuantity] = useState(1);
  const [deliveryFee, setDeliveryFee] = useState(3500);
  const [deliveryAddress, setDeliveryAddress] = useState('Lekki Phase 1, Lagos');
  const [initialPaymentStatus, setInitialPaymentStatus] = useState<PaymentStatus>('awaiting_payment');

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerPhone.includes(searchTerm);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'awaiting_payment' && o.paymentStatus === 'awaiting_payment') ||
      (statusFilter === 'paid' && o.paymentStatus === 'paid') ||
      o.orderStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPaidRevenue = orders
    .filter((o) => o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + o.total, 0);

  const totalAwaitingPayment = orders
    .filter((o) => o.paymentStatus === 'awaiting_payment')
    .reduce((sum, o) => sum + o.total, 0);

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find((c) => c.id === selectedCustomerId);
    const product = products.find((p) => p.id === selectedProductId);

    if (!customer || !product) return;

    const subtotal = product.price * quantity;
    const total = subtotal + Number(deliveryFee);

    onAddOrder({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      items: [
        {
          id: `item_${Date.now()}`,
          productId: product.id,
          productName: product.name,
          quantity,
          price: product.price,
          size: selectedSize,
          colour: product.colours[0] || 'Standard',
        },
      ],
      subtotal,
      deliveryFee: Number(deliveryFee),
      discount: 0,
      total,
      paymentStatus: initialPaymentStatus,
      orderStatus: initialPaymentStatus === 'paid' ? 'processing' : 'awaiting_payment',
      deliveryAddress,
    });

    setShowCreateModal(false);
  };

  const generateReceiptText = (order: Order) => {
    const bizName = business?.name || 'ORDER INVOICE';
    const currency = business?.currency || '₦';
    return `🛍️ *${bizName.toUpperCase()} • ORDER INVOICE*
━━━━━━━━━━━━━━━━━━━━━━
Order ID: #${order.orderNumber}
Customer: ${order.customerName}
Phone: ${order.customerPhone}
Delivery Address: ${order.deliveryAddress}

ITEMS:
${order.items
  .map(
    (item) =>
      `• ${item.productName} (${item.size || 'Standard'}) x${item.quantity} — ${currency}${(
        item.price * item.quantity
      ).toLocaleString()}`
  )
  .join('\n')}

Subtotal: ${currency}${order.subtotal.toLocaleString()}
Delivery Fee: ${currency}${order.deliveryFee.toLocaleString()}
${order.discount > 0 ? `Discount: -${currency}${order.discount.toLocaleString()}\n` : ''}
*TOTAL PAYABLE: ${currency}${order.total.toLocaleString()}*
Payment Status: ${order.paymentStatus === 'paid' ? '✅ PAID' : '⏳ AWAITING PAYMENT'}

PAYMENT DETAILS:
${knowledgeBase?.paymentMethods || `Direct transfer to ${bizName}`}

Thank you for choosing ${bizName}! ✨`;
  };

  const handleCopyReceipt = (order: Order) => {
    const text = generateReceiptText(order);
    navigator.clipboard.writeText(text);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Orders & Payment Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track order status, manage delivery dispatches, and verify WhatsApp payments.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Paid Revenue
            </span>
            <span className="text-sm font-bold text-emerald-700">
              ₦{totalPaidRevenue.toLocaleString()}
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-rose-700 block">
              Awaiting ₦
            </span>
            <span className="text-sm font-bold text-rose-900">
              ₦{totalAwaitingPayment.toLocaleString()}
            </span>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-2xs transition-colors flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Order</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by order #, customer, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({orders.length})
          </button>
          <button
            onClick={() => setStatusFilter('awaiting_payment')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === 'awaiting_payment'
                ? 'bg-rose-600 text-white font-semibold'
                : 'bg-slate-50 text-rose-700 hover:bg-rose-50'
            }`}
          >
            Awaiting Payment
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === 'paid'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'bg-slate-50 text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            Paid
          </button>
          <button
            onClick={() => setStatusFilter('delivered')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === 'delivered'
                ? 'bg-teal-600 text-white font-semibold'
                : 'bg-slate-50 text-teal-700 hover:bg-teal-50'
            }`}
          >
            Delivered
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-4">Order #</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Items</th>
                <th className="p-4">Total (₦)</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Delivery Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4 font-bold text-slate-900 whitespace-nowrap">
                      {order.orderNumber}
                      <span className="block text-[10px] font-normal text-slate-400">
                        {order.createdDate.split('T')[0]}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-900">{order.customerName}</div>
                      <div className="text-[11px] text-slate-500">{order.customerPhone}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">
                        {order.deliveryAddress}
                      </div>
                    </td>
                    <td className="p-4 max-w-xs">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="text-slate-700 truncate">
                          {item.quantity}x {item.productName} ({item.size || 'Standard'})
                        </div>
                      ))}
                    </td>
                    <td className="p-4 font-bold text-slate-900 whitespace-nowrap">
                      ₦{order.total.toLocaleString()}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <PaymentBadge status={order.paymentStatus} size="sm" />
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <OrderStatusBadge status={order.orderStatus} size="sm" />
                    </td>
                    <td className="p-4 text-right whitespace-nowrap space-x-1">
                      {order.paymentStatus !== 'paid' && (
                        <button
                          onClick={() => onUpdateStatus(order.id, 'paid', 'processing')}
                          title="Simulate / Mark payment received"
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-bold text-[11px] transition-colors"
                        >
                          Mark Paid
                        </button>
                      )}

                      <button
                        onClick={() => setReceiptOrder(order)}
                        title="View WhatsApp receipt"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      >
                        <Receipt className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onOpenChat(order.customerId)}
                        title="Chat on WhatsApp"
                        className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Order Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Customer Order"
        subtitle="Quickly log a sale negotiated via WhatsApp."
      >
        <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Customer *</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone}) — {c.location}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Product *</label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  const p = products.find((prod) => prod.id === e.target.value);
                  if (p?.sizes[0]) setSelectedSize(p.sizes[0]);
                }}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (₦{p.price.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Size</label>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white"
              >
                {products
                  .find((p) => p.id === selectedProductId)
                  ?.sizes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Quantity</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Delivery Fee (₦)</label>
              <input
                type="number"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(Number(e.target.value))}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Delivery Address *</label>
            <input
              type="text"
              required
              placeholder="e.g. Plot 14 Admiralty Way, Lekki Phase 1, Lagos"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Payment Status</label>
            <select
              value={initialPaymentStatus}
              onChange={(e) => setInitialPaymentStatus(e.target.value as PaymentStatus)}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white"
            >
              <option value="awaiting_payment">Awaiting Payment (Send Invoice)</option>
              <option value="paid">Already Paid (Direct Transfer)</option>
              <option value="pending">Pending Reservation</option>
            </select>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700"
            >
              Save & Generate Invoice
            </button>
          </div>
        </form>
      </Modal>

      {/* WhatsApp Receipt Modal */}
      {receiptOrder && (
        <Modal
          isOpen={Boolean(receiptOrder)}
          onClose={() => setReceiptOrder(null)}
          title={`Invoice #${receiptOrder.orderNumber}`}
          subtitle="Ready to copy & send directly into the customer's WhatsApp chat."
        >
          <div className="space-y-3">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-[11px] whitespace-pre-wrap leading-relaxed text-slate-800 select-all">
              {generateReceiptText(receiptOrder)}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => handleCopyReceipt(receiptOrder)}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 flex items-center space-x-1.5 transition-colors"
              >
                {copiedReceipt ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedReceipt ? 'Copied to Clipboard!' : 'Copy WhatsApp Receipt'}</span>
              </button>

              <button
                onClick={() => {
                  onOpenChat(receiptOrder.customerId);
                  setReceiptOrder(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition-colors"
              >
                Open WhatsApp Chat
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
