import React, { useState } from 'react';
import {
  ShieldCheck,
  Store,
  ArrowRight,
  Sparkles,
  Lock,
  Mail,
  User,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { ClientOnboardingWizard } from './ClientOnboardingWizard';
import { TenantTier } from '../../types';
import { AuthService } from '../../services/authService';

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
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [businessName, setBusinessName] = useState('');

  // UI status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Super-admin login form state
  const [adminEmail, setAdminEmail] = useState('admin@flowos.ng');
  const [adminKey, setAdminKey] = useState('flowos_master_key_99');

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const fbUser = await AuthService.signInWithGoogle();
      const personalName = fbUser.displayName?.trim() || 'Merchant Owner';
      const chosenBizName = businessName.trim() || `${personalName}'s Store`;
      const profile = await AuthService.syncUserProfile(fbUser, personalName);
      onLoginAsMerchant(
        profile.businessId,
        fbUser.email || '',
        personalName,
        chosenBizName
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('auth/popup-closed-by-user')) {
        setErrorMessage('Google Sign-In was cancelled before completing.');
      } else {
        setErrorMessage(`Sign-in error: ${msg}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const personalName = displayName.trim();
      if (authMode === 'signup') {
        const chosenBizName = businessName.trim() || (personalName ? `${personalName}'s Store` : 'My WhatsApp Store');
        // Critical: pass ONLY personal name (or undefined) to signUpWithEmail. Never conflate chosenBizName with user's personal name!
        const fbUser = await AuthService.signUpWithEmail(email, password, personalName || undefined);
        const profile = await AuthService.syncUserProfile(fbUser, personalName || 'Merchant Owner');
        onLoginAsMerchant(
          profile.businessId,
          fbUser.email || email,
          personalName || 'Merchant Owner',
          chosenBizName
        );
      } else {
        const fbUser = await AuthService.signInWithEmail(email, password);
        const profile = await AuthService.syncUserProfile(fbUser);
        const userBizName = businessName.trim() || (profile.displayName ? `${profile.displayName}'s Store` : 'My WhatsApp Store');
        onLoginAsMerchant(
          profile.businessId,
          fbUser.email || email,
          fbUser.displayName || profile.displayName || 'Merchant Owner',
          userBizName
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('auth/operation-not-allowed')) {
        setErrorMessage(
          'Email/Password sign-in is disabled in your Firebase console. Please use "Continue with Google" above.'
        );
      } else if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
        setErrorMessage('Invalid email or password. Please check your credentials or create a new account.');
      } else if (msg.includes('auth/email-already-in-use')) {
        setErrorMessage('This email already has an account. Please switch to "Sign In".');
      } else if (msg.includes('auth/weak-password')) {
        setErrorMessage('Password must be at least 6 characters.');
      } else {
        setErrorMessage(`Authentication failed: ${msg}`);
      }
    } finally {
      setIsLoading(false);
    }
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
                Firebase Authenticated WhatsApp Commerce
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

        {/* Real Firebase Merchant Portal Login */}
        {activeTab === 'merchant_login' && (
          <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 mx-auto flex items-center justify-center mb-3">
                <Store className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-white">
                {authMode === 'signin' ? 'Merchant Portal Sign In' : 'Create Merchant Account'}
              </h2>
              <p className="text-xs text-slate-400">
                {authMode === 'signin'
                  ? 'Access your WhatsApp commerce store, synced in real-time with Firestore.'
                  : 'Register your business on FlowOS with secure Firebase Authentication.'}
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Google Authentication Button */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-3 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800" />
                <span className="shrink-0 mx-3 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                  Or Email & Password
                </span>
                <div className="flex-grow border-t border-slate-800" />
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailAuthSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Your Full Name (Optional)</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="e.g. Amaka Madu"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Business Name</label>
                    <div className="relative">
                      <Store className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Luma Fashion"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="merchant@yourstore.ng"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <span>{authMode === 'signin' ? 'Sign In to Workspace' : 'Create Account'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Switch Sign In vs Sign Up */}
            <div className="text-center pt-1 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
              {authMode === 'signin' ? (
                <>
                  <span>Don't have an account?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setErrorMessage(null);
                    }}
                    className="text-blue-400 hover:text-blue-300 font-bold underline"
                  >
                    Register new store
                  </button>
                </>
              ) : (
                <>
                  <span>Already have an account?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setErrorMessage(null);
                    }}
                    className="text-blue-400 hover:text-blue-300 font-bold underline"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>

            {/* Quick Demo Fill Button */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setEmail('amaka@lumafashion.ng');
                  setPassword('FlowOS2025*');
                  setDisplayName('Amaka M.');
                  setBusinessName('Luma Fashion');
                  setAuthMode('signin');
                  setErrorMessage(null);
                }}
                className="text-[11px] text-slate-500 hover:text-slate-300 underline"
              >
                Auto-fill demo credentials
              </button>
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
