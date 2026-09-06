import React, { useState } from 'react';
import {
  Store,
  Smartphone,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Zap,
  Check,
  ShoppingBag,
  Building2,
  HelpCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { TenantTier } from '../../types';
import { SAAS_PLANS } from '../../data/adminData';

interface ClientOnboardingWizardProps {
  onComplete: (onboardingData: {
    businessName: string;
    category: string;
    location: string;
    ownerName: string;
    phone: string;
    email: string;
    tier: TenantTier;
    initialProduct?: {
      name: string;
      price: number;
      stock: number;
    };
  }) => void;
  onCancel: () => void;
}

export const ClientOnboardingWizard: React.FC<ClientOnboardingWizardProps> = ({
  onComplete,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState("Fashion & Women's Apparel");
  const [location, setLocation] = useState('Lekki Phase 1, Lagos');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+234 ');
  const [tier, setTier] = useState<TenantTier>('growth');

  // WhatsApp Meta Embedded Signup Simulation
  const [isVerifyingWA, setIsVerifyingWA] = useState(false);
  const [isWAConnected, setIsWAConnected] = useState(false);
  const [otpCode, setOtpCode] = useState('849-201');

  // Initial Product
  const [productName, setProductName] = useState('Silk Evening Kimono');
  const [productPrice, setProductPrice] = useState('45000');
  const [productStock, setProductStock] = useState('15');
  const [useSampleCatalog, setUseSampleCatalog] = useState(true);

  const categories = [
    "Fashion & Women's Apparel",
    'Footwear, Sneakers & Kicks',
    'Beauty, Skincare & Cosmetics',
    'Electronics, Gadgets & Laptops',
    'Auto Parts & Car Accessories',
    'Food, Groceries & Bakery',
    'Home Decor, Furniture & Kitchen',
    'Jewelry, Luxury Watches & Bags',
    'Other Retail / Services',
  ];

  const handleSimulateMetaConnect = () => {
    setIsVerifyingWA(true);
    setTimeout(() => {
      setIsVerifyingWA(false);
      setIsWAConnected(true);
    }, 1200);
  };

  const handleFinish = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({
      businessName: businessName.trim() || 'My WhatsApp Store',
      category,
      location,
      ownerName: ownerName.trim() || 'Store Owner',
      phone: phone.trim() || '+234 812 000 0000',
      email: email.trim() || `${businessName.toLowerCase().replace(/\s+/g, '')}@flowos.ng`,
      tier,
      initialProduct: useSampleCatalog
        ? undefined
        : {
            name: productName.trim() || 'New Arrival Item',
            price: parseInt(productPrice, 10) || 25000,
            stock: parseInt(productStock, 10) || 10,
          },
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-2xl border border-[#E5E7EB] shadow-xl overflow-hidden">
      {/* Progress Steps Header */}
      <div className="bg-[#0F172A] text-white p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center font-bold text-white shadow-xs">
              <div className="w-4 h-4 bg-white rounded-xs rotate-45" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">FlowOS Client Onboarding</span>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
            Step {currentStep} of 4
          </span>
        </div>

        {/* Step Indicator Circles */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 relative">
          {[
            { num: 1, label: 'Store Profile' },
            { num: 2, label: 'WhatsApp API' },
            { num: 3, label: 'Pick Plan' },
            { num: 4, label: 'Launch' },
          ].map((s) => {
            const isCompleted = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <div key={s.num} className="flex flex-col items-center text-center">
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all mb-1.5 ${
                    isCompleted
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                      ? 'bg-[#2563EB] text-white ring-4 ring-blue-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <span
                  className={`text-[11px] font-medium hidden sm:block ${
                    isCurrent ? 'text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1: Business Identity & Profile */}
      {currentStep === 1 && (
        <div className="p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-extrabold text-[#111827]">Tell us about your business</h2>
            <p className="text-sm text-[#6B7280] mt-1">
              FlowOS will configure your automated WhatsApp catalog, sales pipeline, and AI copilot for your industry.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1.5">
                Business Name *
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Lagos Kicks, Zara Luxe Fashion, Abuja Spares"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D1D5DB] text-sm text-[#111827] focus:ring-2 focus:ring-[#2563EB] outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1.5">
                Industry Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D1D5DB] text-sm text-[#111827] focus:ring-2 focus:ring-[#2563EB] outline-hidden bg-white"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1.5">
                City / Location *
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Lekki, Lagos or Wuse 2, Abuja"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D1D5DB] text-sm text-[#111827] focus:ring-2 focus:ring-[#2563EB] outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1.5">
                Owner / Manager Name *
              </label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Tunde Adeyemi"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D1D5DB] text-sm text-[#111827] focus:ring-2 focus:ring-[#2563EB] outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1.5">
                Business Email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tunde@lagoskicks.ng"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D1D5DB] text-sm text-[#111827] focus:ring-2 focus:ring-[#2563EB] outline-hidden"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-semibold text-[#6B7280] hover:text-[#111827]"
            >
              Back to Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                if (!businessName.trim()) {
                  setBusinessName('Demo Store');
                }
                if (!ownerName.trim()) {
                  setOwnerName('Merchant Owner');
                }
                setCurrentStep(2);
              }}
              className="px-5 py-2.5 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-sm flex items-center gap-2 shadow-xs transition-colors"
            >
              <span>Continue to WhatsApp Setup</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: WhatsApp Cloud API & Meta Setup */}
      {currentStep === 2 && (
        <div className="p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-extrabold text-[#111827]">Connect your WhatsApp Business</h2>
            <p className="text-sm text-[#6B7280] mt-1">
              FlowOS communicates directly with Meta’s official WhatsApp Cloud API so you never get banned.
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2563EB] flex items-center justify-center text-white shrink-0 shadow-2xs">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1E3A8A]">Official Meta WhatsApp Cloud API Gateway</h4>
                <p className="text-xs text-blue-700">Zero third-party scraper risks. 99.98% guaranteed uptime.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1.5">
                Official WhatsApp Business Number *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 814 555 0192"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#D1D5DB] text-sm text-[#111827] focus:ring-2 focus:ring-[#2563EB] outline-hidden font-mono"
                />
              </div>
              <p className="text-xs text-[#9CA3AF] mt-1">
                Must be an active SIM card capable of receiving SMS or phone call verification.
              </p>
            </div>

            {/* Meta Embedded Signup Simulation Box */}
            <div className="p-4 border border-[#E5E7EB] rounded-xl bg-[#F9FAFB] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                  Meta WABA Authorization
                </span>
                {isWAConnected ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified & Linked
                  </span>
                ) : (
                  <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    Pending Verification
                  </span>
                )}
              </div>

              {isWAConnected ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Meta Cloud API Webhook Configured:
                  </p>
                  <p className="font-mono text-[11px] text-emerald-700">
                    Callback: https://api.flowos.ng/webhooks/v1/whatsapp
                  </p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleSimulateMetaConnect}
                    disabled={isVerifyingWA}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {isVerifyingWA ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Verifying with Meta Graph API...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        <span>Connect with Meta WhatsApp (Instant Sim)</span>
                      </>
                    )}
                  </button>
                  <span className="text-xs text-[#6B7280]">
                    (Simulates official Meta Embedded OAuth dialog)
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 text-sm font-semibold text-[#6B7280] hover:text-[#111827] flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isWAConnected) {
                  setIsWAConnected(true);
                }
                setCurrentStep(3);
              }}
              className="px-5 py-2.5 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-sm flex items-center gap-2 shadow-xs transition-colors"
            >
              <span>Continue to Choose Plan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Choose Plan */}
      {currentStep === 3 && (
        <div className="p-6 sm:p-8 space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-[#111827]">Choose your FlowOS Plan</h2>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                14-Day Free Trial • No Card Required
              </span>
            </div>
            <p className="text-sm text-[#6B7280] mt-1">
              Select the tier matching your monthly message volume and sales team requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SAAS_PLANS.filter((p) => p.id !== 'enterprise').map((plan) => {
              const isSelected = tier === plan.id;
              return (
                <div
                  key={plan.id}
                  onClick={() => setTier(plan.id)}
                  className={`p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col relative ${
                    isSelected
                      ? 'border-[#2563EB] bg-blue-50/40 shadow-md ring-2 ring-blue-500/20'
                      : 'border-[#E5E7EB] hover:border-slate-300 bg-white'
                  }`}
                >
                  {plan.id === 'growth' && (
                    <span className="absolute -top-2.5 right-4 bg-[#2563EB] text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-2xs">
                      Recommended
                    </span>
                  )}

                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-extrabold text-base text-[#111827]">{plan.name}</h3>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'border-[#2563EB] bg-[#2563EB] text-white'
                          : 'border-[#D1D5DB] bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                  </div>

                  <div className="mb-3">
                    <span className="text-2xl font-black text-[#111827]">
                      ₦{plan.price.toLocaleString()}
                    </span>
                    <span className="text-xs text-[#6B7280]"> / month</span>
                  </div>

                  <p className="text-xs text-[#6B7280] mb-4">{plan.description}</p>

                  <ul className="space-y-2 mt-auto text-xs text-[#374151] pt-3 border-t border-[#E5E7EB]">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{plan.maxMonthlyMessages.toLocaleString()} monthly chats</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{plan.maxTeamMembers} team user seats</span>
                    </li>
                    {plan.aiIncluded && (
                      <li className="flex items-center gap-2 font-semibold text-[#2563EB]">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>AI Sales Copilot included</span>
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 text-sm font-semibold text-[#6B7280] hover:text-[#111827] flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="px-5 py-2.5 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-sm flex items-center gap-2 shadow-xs transition-colors"
            >
              <span>Continue to Store Setup</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Initial Catalog & Final Launch */}
      {currentStep === 4 && (
        <form onSubmit={handleFinish} className="p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-extrabold text-[#111827]">Quickstart your Catalog & Launch</h2>
            <p className="text-sm text-[#6B7280] mt-1">
              Add your first flagship product, or start with FlowOS’s pre-built Nigerian retail demo dataset.
            </p>
          </div>

          {/* Preset toggle */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3.5 border border-[#E5E7EB] rounded-xl bg-[#F9FAFB] cursor-pointer hover:bg-blue-50/30 transition-colors">
              <input
                type="radio"
                name="catalog_choice"
                checked={useSampleCatalog}
                onChange={() => setUseSampleCatalog(true)}
                className="mt-0.5 text-[#2563EB] focus:ring-[#2563EB]"
              />
              <div>
                <span className="text-sm font-bold text-[#111827] block">
                  Load Complete Demo Catalog & Sample WhatsApp Leads
                </span>
                <span className="text-xs text-[#6B7280] block mt-0.5">
                  Pre-loads 8 trending catalog items, 8 realistic customer WhatsApp threads, sales pipeline deals, and Nigerian bank transfer simulation so you can test immediately.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 border border-[#E5E7EB] rounded-xl bg-white cursor-pointer hover:bg-blue-50/30 transition-colors">
              <input
                type="radio"
                name="catalog_choice"
                checked={!useSampleCatalog}
                onChange={() => setUseSampleCatalog(false)}
                className="mt-0.5 text-[#2563EB] focus:ring-[#2563EB]"
              />
              <div>
                <span className="text-sm font-bold text-[#111827] block">
                  Add My Own First Flagship Product
                </span>
                <span className="text-xs text-[#6B7280] block mt-0.5">
                  Input one product now to test automated WhatsApp inquiries and payment flows.
                </span>
              </div>
            </label>
          </div>

          {!useSampleCatalog && (
            <div className="p-4 border border-[#E5E7EB] rounded-xl bg-[#F9FAFB] space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#374151]">
                Flagship Product Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-[#4B5563] mb-1">Product Name</label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. Nike Air Max 90"
                    className="w-full px-3 py-2 rounded-md border border-[#D1D5DB] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4B5563] mb-1">Price (₦)</label>
                  <input
                    type="number"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    placeholder="45000"
                    className="w-full px-3 py-2 rounded-md border border-[#D1D5DB] text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4B5563] mb-1">Stock Qty</label>
                  <input
                    type="number"
                    value={productStock}
                    onChange={(e) => setProductStock(e.target.value)}
                    placeholder="15"
                    className="w-full px-3 py-2 rounded-md border border-[#D1D5DB] text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Summary Box */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center justify-between text-xs font-medium text-emerald-800">
              <span>Ready to Provision:</span>
              <span className="font-bold">{businessName || 'Your Business'} ({category})</span>
            </div>
            <div className="flex items-center justify-between text-xs text-emerald-700 mt-1">
              <span>Selected Plan:</span>
              <span className="font-bold capitalize">{tier} Tier (14-Day Free Trial)</span>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 text-sm font-semibold text-[#6B7280] hover:text-[#111827] flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center gap-2 shadow-md transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch FlowOS Merchant Workspace</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
