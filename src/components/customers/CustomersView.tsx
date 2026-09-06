import React, { useState } from 'react';
import { Customer, LeadStage } from '../../types';
import {
  Search,
  Users,
  Phone,
  MapPin,
  Tag,
  DollarSign,
  ShoppingBag,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Plus,
  Calendar,
} from 'lucide-react';
import { StageBadge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface CustomersViewProps {
  customers: Customer[];
  onOpenChat: (customerId: string) => void;
  onAddCustomer: (customer: Omit<Customer, 'id' | 'businessId'>) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  onOpenChat,
  onAddCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Customer Form
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    location: 'Lekki Phase 1, Lagos',
    status: 'prospect' as Customer['status'],
    leadStage: 'NEW_LEAD' as LeadStage,
    tags: 'WhatsApp Lead',
    totalSpent: 0,
    orderCount: 0,
    averageOrderValue: 0,
    customerSince: new Date().toISOString().split('T')[0],
  });

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name.trim() || !newCustomer.phone.trim()) return;

    onAddCustomer({
      ...newCustomer,
      tags: newCustomer.tags.split(',').map((t) => t.trim()).filter(Boolean),
    });

    setShowAddModal(false);
    setNewCustomer({
      name: '',
      phone: '',
      email: '',
      location: 'Lekki Phase 1, Lagos',
      status: 'prospect',
      leadStage: 'NEW_LEAD',
      tags: 'WhatsApp Lead',
      totalSpent: 0,
      orderCount: 0,
      averageOrderValue: 0,
      customerSince: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Customer Directory & CRM
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Profiles, purchase history, and WhatsApp conversation records for all buyers.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-2xs transition-colors flex items-center space-x-1.5 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by customer name, phone (+234...), or location..."
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
            All ({customers.length})
          </button>
          <button
            onClick={() => setStatusFilter('vip')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === 'vip'
                ? 'bg-purple-600 text-white font-semibold'
                : 'bg-slate-50 text-purple-700 hover:bg-purple-50'
            }`}
          >
            VIP Patrons
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'bg-slate-50 text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            Active Buyers
          </button>
          <button
            onClick={() => setStatusFilter('prospect')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === 'prospect'
                ? 'bg-blue-600 text-white font-semibold'
                : 'bg-slate-50 text-blue-700 hover:bg-blue-50'
            }`}
          >
            Prospects
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-4">Customer</th>
                <th className="p-4">Location</th>
                <th className="p-4">Status & Stage</th>
                <th className="p-4">Total Spent (₦)</th>
                <th className="p-4">Orders</th>
                <th className="p-4">Avg Order Value</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      {customer.avatar ? (
                        <img
                          src={customer.avatar}
                          alt={customer.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {customer.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{customer.name}</h4>
                        <p className="text-[11px] text-slate-500">{customer.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-slate-600 whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{customer.location}</span>
                    </div>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <StageBadge stage={customer.leadStage} size="sm" />
                      {customer.status === 'vip' && (
                        <span className="block text-[10px] font-bold text-purple-700 uppercase">
                          ★ VIP Patron
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-bold text-slate-900 whitespace-nowrap">
                    ₦{customer.totalSpent.toLocaleString()}
                  </td>
                  <td className="p-4 font-semibold text-slate-700 whitespace-nowrap">
                    {customer.orderCount} orders
                  </td>
                  <td className="p-4 text-slate-600 whitespace-nowrap">
                    ₦{customer.averageOrderValue.toLocaleString()}
                  </td>
                  <td className="p-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onOpenChat(customer.id)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-bold text-[11px] transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomer && (
        <Modal
          isOpen={Boolean(selectedCustomer)}
          onClose={() => setSelectedCustomer(null)}
          title={selectedCustomer.name}
          subtitle={`Customer profile • ${selectedCustomer.location}`}
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center space-x-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              {selectedCustomer.avatar ? (
                <img
                  src={selectedCustomer.avatar}
                  alt={selectedCustomer.name}
                  className="w-14 h-14 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg">
                  {selectedCustomer.name.charAt(0)}
                </div>
              )}
              <div>
                <h4 className="font-bold text-base text-slate-900">{selectedCustomer.name}</h4>
                <p className="text-xs text-slate-500">{selectedCustomer.phone}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <StageBadge stage={selectedCustomer.leadStage} size="sm" />
                  <span className="text-[10px] text-slate-400">
                    Customer since {selectedCustomer.customerSince}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Lifetime Spend</span>
                <p className="text-sm font-bold text-emerald-700 mt-0.5">
                  ₦{selectedCustomer.totalSpent.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Orders</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  {selectedCustomer.orderCount}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Avg Value</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  ₦{selectedCustomer.averageOrderValue.toLocaleString()}
                </p>
              </div>
            </div>

            {/* AI Summary */}
            {selectedCustomer.aiSummary && (
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-100 space-y-1">
                <span className="font-bold text-emerald-900 flex items-center space-x-1 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>AI Buyer Summary</span>
                </span>
                <p className="text-slate-700 leading-relaxed">{selectedCustomer.aiSummary}</p>
                {selectedCustomer.recommendedAction && (
                  <p className="text-emerald-800 font-semibold text-[11px] pt-1">
                    Action: {selectedCustomer.recommendedAction}
                  </p>
                )}
              </div>
            )}

            {/* Tags */}
            <div>
              <span className="font-bold text-slate-700 block mb-1.5">Tags</span>
              <div className="flex flex-wrap gap-1">
                {selectedCustomer.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-full text-slate-700 bg-slate-100 border border-slate-200 text-[11px] font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  onOpenChat(selectedCustomer.id);
                  setSelectedCustomer(null);
                }}
                className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors flex items-center space-x-2 shadow-2xs"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Open WhatsApp Conversation</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Customer Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Customer"
        subtitle="Manually register a WhatsApp client profile."
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Zainab Ibrahim"
              value={newCustomer.name}
              onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Phone Number *</label>
              <input
                type="text"
                required
                placeholder="+234 803 123 4567"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Location *</label>
              <input
                type="text"
                required
                placeholder="Lekki Phase 1, Lagos"
                value={newCustomer.location}
                onChange={(e) => setNewCustomer({ ...newCustomer, location: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Tier / Status</label>
              <select
                value={newCustomer.status}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, status: e.target.value as Customer['status'] })
                }
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white"
              >
                <option value="prospect">Prospect</option>
                <option value="active">Active Buyer</option>
                <option value="vip">VIP Patron</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Pipeline Stage</label>
              <select
                value={newCustomer.leadStage}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, leadStage: e.target.value as LeadStage })
                }
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white"
              >
                <option value="NEW_LEAD">New Lead</option>
                <option value="INTERESTED">Interested</option>
                <option value="PRODUCT_SELECTED">Product Selected</option>
                <option value="AWAITING_PAYMENT">Awaiting Payment</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={newCustomer.tags}
              onChange={(e) => setNewCustomer({ ...newCustomer, tags: e.target.value })}
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
              Save Customer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
