import React from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  GitPullRequest,
  Clock,
  ShoppingBag,
  Package,
  Users,
  BarChart3,
  Bot,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { Business, User } from '../../types';

interface SidebarProps {
  activeView?: string;
  activeTab?: string;
  onNavigate?: (view: string) => void;
  setActiveTab?: (tab: string) => void;
  business?: Business;
  user?: User;
  unreadConversationsCount?: number;
  unreadCount?: number;
  followUpsDueCount?: number;
  followUpsCount?: number;
  awaitingPaymentsCount?: number;
  ordersCount?: number;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  activeTab,
  onNavigate,
  setActiveTab,
  business,
  user,
  unreadConversationsCount,
  unreadCount,
  followUpsDueCount,
  followUpsCount,
  awaitingPaymentsCount,
  isMobileOpen = false,
  setIsMobileOpen,
  onLogout,
}) => {
  const currentView = activeView || activeTab || 'dashboard';

  const handleNavigate = (view: string) => {
    if (onNavigate) onNavigate(view);
    if (setActiveTab) setActiveTab(view);
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  const actualUnread = unreadConversationsCount ?? unreadCount ?? 4;
  const actualFollowUps = followUpsDueCount ?? followUpsCount ?? 23;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'inbox',
      label: 'WhatsApp Inbox',
      icon: MessageSquare,
      badge: actualUnread > 0 ? actualUnread : null,
      badgeColor: 'bg-red-500 text-white',
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: Users,
      badge: null,
    },
    {
      id: 'pipeline',
      label: 'Sales Pipeline',
      icon: GitPullRequest,
      badge: awaitingPaymentsCount && awaitingPaymentsCount > 0 ? awaitingPaymentsCount : null,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: ShoppingBag,
      badge: null,
    },
    {
      id: 'followups',
      label: 'Follow-ups',
      icon: Clock,
      badge: actualFollowUps > 0 ? actualFollowUps : null,
      badgeColor: 'bg-[#2563EB] text-white',
    },
    {
      id: 'products',
      label: 'Products',
      icon: Package,
      badge: null,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'ai_copilot',
      label: 'AI Copilot',
      icon: Bot,
      badge: 'AI',
      badgeColor: 'bg-[#2563EB] text-white',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
        />
      )}

      <aside
        id="app-sidebar"
        className={`w-64 bg-white border-r border-[#E5E7EB] flex flex-col fixed lg:static top-0 bottom-0 left-0 z-50 transition-transform duration-200 ease-in-out shrink-0 ${
          isMobileOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center shadow-xs">
                <div className="w-4 h-4 bg-white rounded-xs rotate-45"></div>
              </div>
              <span className="text-xl font-bold tracking-tight text-[#111827]">FlowOS</span>
            </div>
            {isMobileOpen && (
              <button
                onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
                className="lg:hidden p-1.5 text-[#9CA3AF] hover:text-[#111827] rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-link-${item.id}`}
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left ${
                    isActive
                      ? 'bg-[#F3F4F6] text-[#2563EB] font-semibold'
                      : 'text-[#4B5563] hover:bg-[#F9FAFB] hover:text-[#111827]'
                  }`}
                >
                  {isActive && (
                    <span className="w-1 h-4 bg-[#2563EB] rounded-full shrink-0 -ml-1 mr-0.5" />
                  )}
                  <item.icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-[#2563EB]' : 'text-[#6B7280]'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                  {item.badge != null && (
                    <span
                      className={`ml-auto text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        item.badgeColor || 'bg-red-500 text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Workspace Quick Status */}
        <div className="px-6 py-2">
          <div className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#111827] truncate">
                {business?.name || 'Luma Fashion'}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                WA Connected
              </span>
            </div>
            <p className="text-[11px] text-[#9CA3AF] mt-1 font-mono">
              {business?.phone || '+234 814 555 0192'}
            </p>
          </div>
        </div>

        {/* User Account / Profile Footer */}
        <div className="mt-auto p-6 border-t border-[#E5E7EB]">
          {(() => {
            const ownerDisplayName = business?.ownerName || user?.displayName || 'Amaka M.';
            const initials = ownerDisplayName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase() || 'AM';

            return (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#E5E7EB] border border-[#D1D5DB] flex items-center justify-center font-bold text-[#4B5563] text-sm shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 overflow-hidden">
                    <p className="text-sm font-semibold text-[#111827] truncate">
                      {ownerDisplayName}
                    </p>
                    <p className="text-xs text-[#9CA3AF] truncate">
                      {business?.name || 'Luma Fashion'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    id="sidebar-settings-shortcut"
                    onClick={() => handleNavigate('settings')}
                    className="p-1.5 rounded-md text-[#9CA3AF] hover:text-[#4B5563] hover:bg-[#F3F4F6] transition-colors"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  {onLogout && (
                    <button
                      id="sidebar-logout-button"
                      onClick={onLogout}
                      className="p-1.5 rounded-md text-[#9CA3AF] hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Sign Out / Switch Portal"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </aside>
    </>
  );
};
