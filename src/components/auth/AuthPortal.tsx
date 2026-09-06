import React, { useState } from 'react';
import {
  ShieldCheck,
  Store,
  ArrowRight,
  Sparkles,
  Lock,
  Mail,
  User,
  Smartphone,
  CheckCircle2,
  Building2,
  Layers,
  Zap,
} from 'lucide-react';
import { ClientOnboardingWizard } from './ClientOnboardingWizard';
import { User as UserType, TenantTier } from '../../types';

interface AuthPortalProps {
  onLoginAsMerchant: (merchantId: string, email: string, displayName: string, businessName: string) => void;
  onLoginAsSuperAdmin: () => void;
  onRegisterMerchant: (onboardingData: {
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
}

export const AuthPortal: React.FC<AuthPortalProps> = ({
  onLoginAsMerchant,
  onLoginAsSuperAdmin,
  onRegisterMerchant,
}) => {
  const [activeTab, setActiveTab] = useState<'merchant_login' | 'merchant_signup' | 'superadmin_login'>('merchant_login');

  // Merchant login form state
  const [merchantEmail, setMerchantEmail] = useState('amaka@lumafashion.ng');
  const [merchantPassword, setMerchantPassword] = useState('••••••••••••');

  // Super-admin login form state
  const [adminEmail, setAdminEmail] = useState('admin@flowos.ng');
  const [adminKey, setAdminKey] = useState('flowos_master_key_99');

  const demoMerchants = [
    {
      id: 'tenant_luma_01',
      name: 'Luma Fashion',
      ownerName: 'Amaka M.',
      email: 'amaka@lumafashion.ng',
      category: "Women's Fashion & Luxury RTW",
      location: 'Lekki Phase 1, Lagos',
      badge: 'Growth Tier',
    },
    {
      id: 'tenant_kicks_02',
      name: 'Kicks Naija',
      ownerName: 'Tunde Adeyemi',
      email: 'tunde@kicksnaija.ng',
      category: 'Footwear & Streetwear',
      location: 'Ikeja, Lagos',
      badge: 'Starter Tier',
    },
    {
      id: 'tenant_abuja_03',
      name: 'Abuja Auto Spares',
      ownerName: 'Ibrahim Danladi',
      email: 'ibrahim@abujaspareparts.com',
      category: 'Automotive Parts & Accessories',
      location: 'Central Business District, Abuja',
      badge: 'Scale Tier',
    },
  ];

  const handleMerchantLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Default or matched merchant
    const matched = demoMerchants.find((m) => m.email.toLowerCase() === merchantEmail.toLowerCase()) || demoMerchants[0];
    onLoginAsMerchant(matched.id, matched.email, matched.ownerName, matched.name);
  };

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLoginAsSuperAdmin();
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-[#0F172A]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#2563EB] rounded-xl flex items-center justify-center shadow-md">
              <div className="w-4 h-4 bg-white rounded-xs rotate-45" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white">FlowOS</span>
              <span className="text-[10px] uppercase tracking-widest text-blue-400 block font-bold">
                WhatsApp Commerce Operating System
              </span>
            </div>
          </div>

          {/* Portal switcher pills */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('merchant_login')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'merchant_login' || activeTab === 'merchant_signup'
                  ? 'bg-[#2563EB] text-white shadow-xs font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Merchant Portal</span>
            </button>

            <button
              onClick={() => setActiveTab('superadmin_login')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'superadmin_login'
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Platform HQ (Admin)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 flex flex-col items-center justify-center">
        {/* If user selected Merchant Sign-Up Wizard */}
        {activeTab === 'merchant_signup' && (
          <ClientOnboardingWizard
            onComplete={onRegisterMerchant}
            onCancel={() => setActiveTab('merchant_login')}
          />
        )}

        {/* Merchant Portal Login */}
        {activeTab === 'merchant_login' && (
          <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 mx-auto flex items-center justify-center mb-3">
                <Store className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-white">Merchant Portal Sign In</h2>
              <p className="text-xs text-slate-400">
                Log in to access your WhatsApp sales pipeline, customer orders, and AI Copilot.
              </p>
            </div>

            {/* Quick Demo Merchant Switcher */}
            <div className="space-y-2 pt-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Quick Demo Merchant Access (1-Click)
              </label>
              <div className="space-y-1.5">
                {demoMerchants.map((merchant) => (
                  <button
                    key={merchant.id}
                    type="button"
                    onClick={() =>
                      onLoginAsMerchant(merchant.id, merchant.email, merchant.ownerName, merchant.name)
                    }
                    className="w-full p-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/50 text-left transition-all flex items-center justify-between group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white group-hover:text-blue-300">
                          {merchant.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium">
                          {merchant.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {merchant.ownerName} • {merchant.category}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800" />
              <span className="shrink-0 mx-3 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                Or Sign In with Credentials
              </span>
              <div className="flex-grow border-t border-slate-800" />
            </div>

            {/* Standard Credentials Form */}
            <form onSubmit={handleMerchantLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={merchantEmail}
                    onChange={(e) => setMerchantEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={merchantPassword}
                    onChange={(e) => setMerchantPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
              >
                <span>Enter Merchant Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Switch to Onboarding */}
            <div className="pt-2 text-center border-t border-slate-800">
              <p className="text-xs text-slate-400">
                New business owner?{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('merchant_signup')}
                  className="text-blue-400 hover:text-blue-300 font-bold underline"
                >
                  Onboard your store (14-Day Free Trial)
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Super-Admin Platform HQ Login */}
        {activeTab === 'superadmin_login' && (
          <div className="w-full max-w-md bg-[#111827] border border-indigo-950/80 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 mx-auto flex items-center justify-center mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-2xl font-extrabold tracking-tight text-white">FlowOS Super-Admin</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 uppercase font-extrabold">
                  Platform HQ
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Restricted access for FlowOS founders, platform managers, and system infrastructure engineers.
              </p>
            </div>

            <div className="p-3 bg-indigo-950/40 border border-indigo-800/50 rounded-xl text-xs text-indigo-300 space-y-1">
              <div className="flex items-center gap-2 font-bold text-indigo-200">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Super-Admin Capabilities:</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Monitor all merchant tenants, view platform MRR, supervise Meta WhatsApp Cloud API webhooks, and inspect tenant accounts.
              </p>
            </div>

            <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Admin Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:ring-2 focus:ring-indigo-500 outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Master Access Key</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:ring-2 focus:ring-indigo-500 outline-hidden font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Launch FlowOS Platform Super-Admin Console</span>
              </button>
            </form>

            <div className="text-center pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('merchant_login')}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                ← Return to Client Merchant Portal
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        <p>FlowOS Enterprise SaaS Platform • Official Meta WhatsApp Cloud API Provider • Nigeria & Pan-Africa</p>
      </footer>
    </div>
  );
};
