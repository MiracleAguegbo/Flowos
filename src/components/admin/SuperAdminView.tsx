import React, { useState } from 'react';
import {
  Building2,
  Users,
  CreditCard,
  Radio,
  Sparkles,
  Search,
  Filter,
  ArrowUpRight,
  ExternalLink,
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  Plus,
  ArrowLeft,
  Smartphone,
  MessageSquare,
  TrendingUp,
  RefreshCw,
  Sliders,
  DollarSign,
  LogOut,
} from 'lucide-react';
import { MerchantTenant, PlatformMetrics, PlatformWebhookEvent, TenantStatus, TenantTier } from '../../types';
import { AdminService } from '../../services/adminService';
import { SAAS_PLANS } from '../../data/adminData';
import { ProvisionMerchantModal } from './ProvisionMerchantModal';

interface SuperAdminViewProps {
  onSwitchToMerchant: (tenant: MerchantTenant) => void;
  activeMerchantId?: string;
  onOpenMobileMenu?: () => void;
  onLogout?: () => void;
}

export const SuperAdminView: React.FC<SuperAdminViewProps> = ({
  onSwitchToMerchant,
  activeMerchantId = 'tenant_luma_01',
  onOpenMobileMenu,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'merchants' | 'webhooks' | 'plans'>('overview');
  const [tenants, setTenants] = useState<MerchantTenant[]>(() => AdminService.getTenants());
  const [webhooks, setWebhooks] = useState<PlatformWebhookEvent[]>(() => AdminService.getWebhookEvents());
  const [metrics, setMetrics] = useState<PlatformMetrics>(() => AdminService.getPlatformMetrics());

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);

  // Refresh data
  const refreshData = () => {
    setTenants(AdminService.getTenants());
    setWebhooks(AdminService.getWebhookEvents());
    setMetrics(AdminService.getPlatformMetrics());
  };

  const handleSimulateWebhook = () => {
    AdminService.simulateWebhookEvent();
    refreshData();
  };

  const handleProvisionTenant = (tenantData: Omit<MerchantTenant, 'id' | 'joinedDate' | 'stats' | 'wabaId' | 'wabaPhoneNumberId' | 'webhookStatus'>) => {
    AdminService.addTenant(tenantData);
    refreshData();
  };

  const handleStatusChange = (tenantId: string, newStatus: TenantStatus) => {
    AdminService.updateTenantStatus(tenantId, newStatus);
    refreshData();
  };

  const handleTierChange = (tenantId: string, newTier: TenantTier) => {
    AdminService.updateTenantTier(tenantId, newTier);
    refreshData();
  };

  // Filtered tenants
  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.whatsappNumber.includes(searchTerm) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesTier = tierFilter === 'all' || t.tier === tierFilter;

    return matchesSearch && matchesStatus && matchesTier;
  });

  return (
    <div className="min-h-full flex flex-col bg-[#F8FAFC]">
      {/* 1. Super-Admin Top Navigation Bar */}
      <header className="bg-[#0F172A] text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-inner ring-2 ring-blue-400/30">
              HQ
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-white">FlowOS Super-Admin</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Platform HQ
                </span>
              </div>
              <p className="text-xs text-slate-400">
                SaaS Provider Console • Managing {tenants.length} Merchant Tenants
              </p>
            </div>
          </div>

          {/* Quick Actions & Workspace Jump */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleSimulateWebhook}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
              title="Simulate Meta WhatsApp Cloud API event"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Simulate Meta Webhook</span>
            </button>

            <button
              onClick={() => setIsProvisionModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#2563EB] hover:bg-blue-600 text-white flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Onboard Merchant</span>
            </button>

            {/* Jump to default active merchant workspace */}
            {tenants.length > 0 && (
              <button
                onClick={() => {
                  const target = tenants.find((t) => t.id === activeMerchantId) || tenants[0];
                  onSwitchToMerchant(target);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 transition-colors"
                title="Switch into Luma Fashion Merchant Workspace"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Inspect:</span>
                <span className="font-bold underline">Luma Fashion</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}

            {onLogout && (
              <button
                onClick={onLogout}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-800/60 flex items-center gap-1.5 transition-colors"
                title="Sign out of Super-Admin Console"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Super-Admin Sub-tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center gap-1 border-t border-slate-800/80 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-[#2563EB] text-[#60A5FA] bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Platform Overview & MRR</span>
          </button>

          <button
            onClick={() => setActiveTab('merchants')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'merchants'
                ? 'border-[#2563EB] text-[#60A5FA] bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Merchant Tenants Directory</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-700 text-slate-300">
              {tenants.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('webhooks')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'webhooks'
                ? 'border-[#2563EB] text-[#60A5FA] bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>Meta WhatsApp API & Webhooks</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          <button
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'plans'
                ? 'border-[#2563EB] text-[#60A5FA] bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>SaaS Pricing & Plans</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {/* ========================================================
            TAB 1: OVERVIEW & SAAS KPIS
        ======================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Top SaaS KPI Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* MRR Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Monthly Recurring Revenue (MRR)
                  </span>
                  <div className="p-2 rounded-xl bg-blue-50 text-[#2563EB]">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900 mt-2">
                  ₦{(metrics.mrr).toLocaleString()}
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-600">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>+28.4% from last month</span>
                </div>
              </div>

              {/* Active Tenants Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Total Businesses Onboarded
                  </span>
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900 mt-2">
                  {metrics.totalTenants}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  <span className="font-bold text-emerald-600">{metrics.activeTenants} Active</span> •{' '}
                  <span className="font-bold text-amber-600">{metrics.trialTenants} Trial</span>
                </p>
              </div>

              {/* WhatsApp Messages Processed */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    WhatsApp Messages Routed
                  </span>
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900 mt-2">
                  {metrics.totalMessagesProcessed.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-2 font-medium">
                  +{metrics.messagesToday.toLocaleString()} processed today
                </p>
              </div>

              {/* Meta Cloud API Health */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Meta Cloud API Uptime
                  </span>
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900 mt-2">
                  {metrics.webhookSuccessRate}%
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Avg Latency: <strong className="text-slate-800">{metrics.averageLatencyMs}ms</strong></span>
                </div>
              </div>
            </div>

            {/* Middle Section: Platform GMV & Tier Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* GMV Banner & Core Value Proposition */}
              <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-[#1E293B] to-slate-900 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-md">
                <div className="relative z-10 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold uppercase tracking-wider">
                    <Zap className="w-3.5 h-3.5" />
                    Gross Merchandise Value (GMV)
                  </div>
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-black text-white">
                      ₦{(metrics.totalGmvProcessed).toLocaleString()}
                    </h2>
                    <p className="text-sm text-slate-300 mt-1 max-w-lg">
                      Total sales orders closed by your {tenants.length} merchants over WhatsApp using the FlowOS sales engine, CRM, and AI Copilot.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center gap-6 text-xs text-slate-300">
                    <div>
                      <span className="text-slate-400 block">Avg Merchant GMV</span>
                      <strong className="text-base text-white">
                        ₦{(metrics.totalGmvProcessed / (metrics.activeTenants || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </strong>
                    </div>
                    <div className="w-[1px] h-8 bg-slate-800 hidden sm:block" />
                    <div>
                      <span className="text-slate-400 block">Active FlowOS Conversations</span>
                      <strong className="text-base text-white">
                        {tenants.reduce((sum, t) => sum + (t.stats?.activeConversations || 0), 0)} Leads
                      </strong>
                    </div>
                    <div className="w-[1px] h-8 bg-slate-800 hidden sm:block" />
                    <div>
                      <span className="text-slate-400 block">AI Drafts Generated</span>
                      <strong className="text-base text-white">
                        {tenants.reduce((sum, t) => sum + (t.stats?.aiDraftsGenerated || 0), 0).toLocaleString()}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Plan Distribution Breakdown */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4">
                    Subscription Tiers
                  </h3>
                  <div className="space-y-3.5">
                    {SAAS_PLANS.filter((p) => p.id !== 'enterprise').map((plan) => {
                      const count = tenants.filter((t) => t.tier === plan.id).length;
                      const percentage = Math.round((count / (tenants.length || 1)) * 100);
                      return (
                        <div key={plan.id} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800">{plan.name} (₦{(plan.price / 1000).toFixed(0)}k/mo)</span>
                            <span className="font-semibold text-slate-500">
                              {count} merchants ({percentage}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#2563EB] rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-6 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Pricing Model</span>
                  <button
                    onClick={() => setActiveTab('plans')}
                    className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1"
                  >
                    <span>View Plan Matrix</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Live Webhook Event Stream (Recent 5) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">Live Meta WhatsApp Webhook Stream</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <button
                  onClick={() => setActiveTab('webhooks')}
                  className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1"
                >
                  <span>View All Stream Logs</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {webhooks.slice(0, 5).map((evt) => (
                  <div key={evt.id} className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${evt.status === 'success' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 truncate">{evt.tenantName}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                            {evt.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{evt.details}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 text-right">
                      <span className="text-[11px] text-slate-400 font-mono">{evt.latencyMs}ms</span>
                      <span className="text-xs text-slate-400 font-medium">{evt.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: MERCHANTS (TENANTS DIRECTORY)
        ======================================================== */}
        {activeTab === 'merchants' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header / Filter Toolbar */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Merchant Directory</h2>
                  <p className="text-xs text-slate-500">
                    Manage client businesses subscribed to FlowOS, assign tiers, and inspect workspace health.
                  </p>
                </div>
                <button
                  onClick={() => setIsProvisionModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2563EB] hover:bg-blue-700 text-white flex items-center gap-2 shadow-xs transition-colors shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Onboard New Merchant</span>
                </button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search by business name, owner, phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] bg-white font-medium text-slate-700"
                >
                  <option value="all">All Merchant Statuses</option>
                  <option value="active">Active Tenants</option>
                  <option value="trial">14-Day Free Trial</option>
                  <option value="pending_setup">Pending WABA Setup</option>
                  <option value="suspended">Suspended Accounts</option>
                </select>

                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] bg-white font-medium text-slate-700"
                >
                  <option value="all">All Subscription Tiers</option>
                  <option value="starter">Starter (₦15k/mo)</option>
                  <option value="growth">Growth (₦35k/mo)</option>
                  <option value="scale">Scale (₦75k/mo)</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>

            {/* Merchant Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Business & Category</th>
                      <th className="px-6 py-3.5">Owner & WhatsApp Number</th>
                      <th className="px-6 py-3.5">Plan & Fee</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">WhatsApp Volume / GMV</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal">
                    {filteredTenants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                          No merchants found matching your filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredTenants.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                            <div className="text-slate-500 text-[11px] mt-0.5">{t.category}</div>
                            <div className="text-slate-400 text-[10px] mt-0.5">{t.location}</div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-800">{t.ownerName}</div>
                            <div className="text-emerald-700 font-mono text-[11px] font-semibold flex items-center gap-1 mt-0.5">
                              <Smartphone className="w-3 h-3 text-emerald-600" />
                              <span>{t.whatsappNumber}</span>
                            </div>
                            <div className="text-slate-400 text-[10px]">{t.ownerEmail}</div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <select
                                value={t.tier}
                                onChange={(e) => handleTierChange(t.id, e.target.value as TenantTier)}
                                className="px-2 py-1 rounded border border-slate-200 font-bold text-xs bg-white text-slate-800"
                              >
                                <option value="starter">Starter</option>
                                <option value="growth">Growth</option>
                                <option value="scale">Scale</option>
                                <option value="enterprise">Enterprise</option>
                              </select>
                            </div>
                            <div className="text-slate-500 font-semibold mt-1">
                              ₦{t.monthlyFee.toLocaleString()}/mo
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <select
                              value={t.status}
                              onChange={(e) => handleStatusChange(t.id, e.target.value as TenantStatus)}
                              className={`px-2 py-1 rounded text-[11px] font-bold border ${
                                t.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : t.status === 'trial'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : t.status === 'pending_setup'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              <option value="active">Active</option>
                              <option value="trial">14d Trial</option>
                              <option value="pending_setup">Pending Setup</option>
                              <option value="suspended">Suspended</option>
                            </select>
                          </td>

                          <td className="px-6 py-4">
                            <div className="text-slate-800 font-medium">
                              <strong>{t.stats?.totalMessages.toLocaleString()}</strong> msgs
                            </div>
                            <div className="text-slate-500 font-semibold text-[11px] mt-0.5">
                              GMV: ₦{((t.stats?.gmv || 0) / 1000000).toFixed(1)}M
                            </div>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => onSwitchToMerchant(t)}
                              className="px-3 py-1.5 rounded-lg font-bold text-xs text-white bg-[#2563EB] hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                              title={`Log in as ${t.name}`}
                            >
                              <span>Open Workspace</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: META WHATSAPP CLOUD API & WEBHOOKS
        ======================================================== */}
        {activeTab === 'webhooks' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Gateway Configuration Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-600" />
                    <h2 className="text-lg font-bold text-slate-900">Meta WhatsApp Cloud API Gateway</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    FlowOS handles centralized webhook routing from Meta Graph API v20.0 to each merchant workspace.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSimulateWebhook}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Trigger Test Inbound Webhook</span>
                  </button>
                </div>
              </div>

              {/* Endpoint Specs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs">
                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Meta Webhook Callback URL
                  </span>
                  <span className="text-[#2563EB] font-bold">https://api.flowos.ng/webhooks/v1/whatsapp</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs">
                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Verify Token
                  </span>
                  <span className="text-slate-800 font-bold">flowos_live_waba_prod_token_92</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs">
                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Active Subscriptions
                  </span>
                  <span className="text-emerald-700 font-bold">messages, message_deliveries, status</span>
                </div>
              </div>
            </div>

            {/* Live Webhook Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Real-Time Webhook Event Log</h3>
                <span className="text-xs text-slate-400 font-medium">Last 25 events</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Event Type</th>
                      <th className="px-6 py-3">Target Merchant</th>
                      <th className="px-6 py-3">Source</th>
                      <th className="px-6 py-3">Payload Details</th>
                      <th className="px-6 py-3">Latency</th>
                      <th className="px-6 py-3 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal">
                    {webhooks.map((evt) => (
                      <tr key={evt.id} className="hover:bg-slate-50/70">
                        <td className="px-6 py-3.5 font-bold">
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-blue-50 text-[#2563EB] border border-blue-100">
                            {evt.type}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 font-semibold text-slate-900">
                          {evt.tenantName}
                        </td>
                        <td className="px-6 py-3.5 text-slate-500">{evt.source}</td>
                        <td className="px-6 py-3.5 text-slate-600 max-w-md truncate">{evt.details}</td>
                        <td className="px-6 py-3.5 font-mono text-slate-500">{evt.latencyMs}ms</td>
                        <td className="px-6 py-3.5 text-right text-slate-400">{evt.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: SAAS PRICING & SUBSCRIPTION PLANS
        ======================================================== */}
        {activeTab === 'plans' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-2xl font-black text-slate-900">FlowOS SaaS Subscription Plans</h2>
              <p className="text-sm text-slate-500">
                Monthly pricing tiers for Nigerian SMEs and growing commerce brands connecting WhatsApp to FlowOS.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {SAAS_PLANS.map((plan) => {
                const enrolledCount = tenants.filter((t) => t.tier === plan.id).length;
                return (
                  <div
                    key={plan.id}
                    className={`bg-white rounded-2xl border p-6 flex flex-col justify-between shadow-2xs relative ${
                      plan.id === 'growth'
                        ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20'
                        : 'border-slate-200'
                    }`}
                  >
                    {plan.id === 'growth' && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2563EB] text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                        Most Popular for Brands
                      </span>
                    )}

                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">{plan.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{plan.description}</p>

                      <div className="mt-4 mb-6">
                        <span className="text-2xl font-black text-slate-900">
                          ₦{(plan.price).toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">{plan.period}</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl mb-6 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Subscribed Merchants</span>
                        <strong className="text-slate-900 font-bold">{enrolledCount} businesses</strong>
                      </div>

                      <ul className="space-y-2.5 text-xs text-slate-600">
                        {plan.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setTierFilter(plan.id);
                          setActiveTab('merchants');
                        }}
                        className="w-full py-2 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
                      >
                        View {plan.name} Tenants ({enrolledCount})
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Provision Merchant Modal */}
      <ProvisionMerchantModal
        isOpen={isProvisionModalOpen}
        onClose={() => setIsProvisionModalOpen(false)}
        onProvision={handleProvisionTenant}
      />
    </div>
  );
};
