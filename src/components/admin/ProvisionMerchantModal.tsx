import React, { useState } from 'react';
import { X, Building2, Phone, Mail, User, MapPin, Tag, Sparkles } from 'lucide-react';
import { TenantTier, TenantStatus, MerchantTenant } from '../../types';
import { SAAS_PLANS } from '../../data/adminData';

interface ProvisionMerchantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProvision: (tenantData: Omit<MerchantTenant, 'id' | 'joinedDate' | 'stats' | 'wabaId' | 'wabaPhoneNumberId' | 'webhookStatus'>) => void;
}

export const ProvisionMerchantModal: React.FC<ProvisionMerchantModalProps> = ({
  isOpen,
  onClose,
  onProvision,
}) => {
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('+234 ');
  const [whatsappNumber, setWhatsappNumber] = useState('+234 ');
  const [category, setCategory] = useState("Fashion & Apparel");
  const [location, setLocation] = useState('Lagos, Nigeria');
  const [tier, setTier] = useState<TenantTier>('growth');
  const [status, setStatus] = useState<TenantStatus>('active');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !ownerName.trim()) return;

    onProvision({
      name: name.trim(),
      ownerName: ownerName.trim(),
      ownerEmail: ownerEmail.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      ownerPhone: ownerPhone.trim(),
      whatsappNumber: whatsappNumber.trim() || ownerPhone.trim(),
      category,
      location,
      tier,
      status,
      monthlyFee: SAAS_PLANS.find((p) => p.id === tier)?.price || 35000,
      billingCycle: 'monthly',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Provision New Merchant</h3>
              <p className="text-xs text-slate-500">Onboard a business tenant to the FlowOS platform</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Business Name *
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="e.g. Lagos Sneaker Vault"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Owner / Primary Contact *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Chinedu Eze"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Owner Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  placeholder="chinedu@sneakers.ng"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                WhatsApp Business Number *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="+234 803 000 0000"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Business Category
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] bg-white"
                >
                  <option value="Fashion & Apparel">Fashion & Apparel</option>
                  <option value="Footwear & Sneakers">Footwear & Sneakers</option>
                  <option value="Beauty, Hair & Skincare">Beauty, Hair & Skincare</option>
                  <option value="Consumer Electronics & Gadgets">Consumer Electronics & Gadgets</option>
                  <option value="Food, Catering & Groceries">Food, Catering & Groceries</option>
                  <option value="Automotive & Spare Parts">Automotive & Spare Parts</option>
                  <option value="Health & Pharmaceuticals">Health & Pharmaceuticals</option>
                  <option value="Home & Interior Decor">Home & Interior Decor</option>
                  <option value="General Retail">General Retail</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                City / Location
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Lekki, Lagos"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TenantStatus)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] bg-white"
              >
                <option value="active">Active (Full Access)</option>
                <option value="trial">14-Day Free Trial</option>
                <option value="pending_setup">Pending WABA Setup</option>
              </select>
            </div>
          </div>

          {/* Subscription Tier Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Subscription Plan
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {SAAS_PLANS.filter((p) => p.id !== 'enterprise').map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setTier(plan.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    tier === plan.id
                      ? 'border-[#2563EB] bg-blue-50/50 shadow-xs ring-1 ring-[#2563EB]'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{plan.name}</span>
                    {tier === plan.id && <Sparkles className="w-3 h-3 text-[#2563EB]" />}
                  </div>
                  <p className="text-sm font-extrabold text-[#2563EB] mt-1">
                    ₦{(plan.price / 1000).toFixed(0)}k
                    <span className="text-[10px] font-normal text-slate-500">/mo</span>
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Up to {plan.maxMonthlyMessages.toLocaleString()} msgs
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Provision & Connect WABA</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
