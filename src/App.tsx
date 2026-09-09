/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from './services/storage';
import { AuthService } from './services/authService';
import { handleAuthStateChange, handleMerchantLogin } from './services/appAuthFlow';
import {
  Customer,
  Product,
  LeadStage,
  PaymentStatus,
  OrderStatus,
  Order,
  FollowUp,
  Business,
  KnowledgeBase,
  WhatsAppIntegrationConfig,
} from './types';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Toast, ToastMessage } from './components/common/Toast';
import { DashboardView } from './components/dashboard/DashboardView';
import { InboxView } from './components/inbox/InboxView';
import { PipelineView } from './components/pipeline/PipelineView';
import { FollowUpView } from './components/followup/FollowUpView';
import { OrdersView } from './components/orders/OrdersView';
import { ProductsView } from './components/products/ProductsView';
import { CustomersView } from './components/customers/CustomersView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { AICopilotView } from './components/ai/AICopilotView';
import { SettingsView } from './components/settings/SettingsView';
import { SuperAdminView } from './components/admin/SuperAdminView';
import { AuthPortal } from './components/auth/AuthPortal';
import { AdminService } from './services/adminService';
import { db } from './services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  LayoutDashboard,
  MessageSquare,
  GitPullRequest,
  ShoppingBag,
  Menu,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
} from 'lucide-react';

export default function App() {
  const [data, setData] = useState(() => StorageService.getData());
  const [portalMode, setPortalMode] = useState<'merchant' | 'superadmin' | 'superadmin_impersonating' | 'auth'>('merchant');
  const [activeView, setActiveView] = useState('dashboard');
  const [activeConversationId, setActiveConversationId] = useState<string>(
    data.conversations[0]?.id || ''
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [isSettingUp, setIsSettingUp] = useState(false);
  const setupCancelledRef = useRef(false);

  // Subscribe to reactive updates from storage service and Firebase Auth
  useEffect(() => {
    const unsubscribeStorage = StorageService.subscribe((updatedData) => {
      setData(updatedData);
    });

    const unsubscribeAuth = AuthService.onAuthChange(async (firebaseUser) => {
      console.log('(1) [onAuthChange] firebaseUser received:', firebaseUser ? {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        isAnonymous: firebaseUser.isAnonymous,
        emailVerified: firebaseUser.emailVerified,
      } : null);

      await handleAuthStateChange(firebaseUser, {
        onRestored: () => {
          setPortalMode('merchant');
        },
      });
    });

    return () => {
      unsubscribeStorage();
      unsubscribeAuth();
    };
  }, []);

  const addToast = (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string
  ) => {
    const newToast: ToastMessage = {
      id: `toast_${Date.now()}_${Math.random()}`,
      type,
      title,
      message,
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Demo Simulation Actions
  const handleSimulateIncomingMessage = async () => {
    const { customer, message } = await StorageService.simulateIncomingMessage();
    addToast(
      'info',
      `💬 New WhatsApp: ${customer.name}`,
      `"${message.content.slice(0, 65)}..."`
    );
  };

  const handleSimulatePayment = () => {
    const { order, customer } = StorageService.simulatePayment();
    addToast(
      'success',
      `₦ Payment Received!`,
      `₦${order.total.toLocaleString()} confirmed from ${customer.name} via Zenith Bank transfer.`
    );
  };

  const handleSimulateLeadAdvance = () => {
    const { lead, previousStage, newStage } = StorageService.simulateLeadAdvance();
    addToast(
      'info',
      `Pipeline Advanced`,
      `${lead.customerName} moved from ${previousStage} to ${newStage}`
    );
  };

  // Navigation and cross-view jumps
  const handleOpenChat = (customerId: string, draftMessage?: string) => {
    const conv = data.conversations.find((c) => c.customerId === customerId);
    if (conv) {
      setActiveConversationId(conv.id);
    }
    setActiveView('inbox');
    if (draftMessage) {
      setTimeout(() => {
        const input = document.getElementById('chat-message-input') as HTMLInputElement;
        if (input) {
          input.value = draftMessage;
          input.focus();
        }
      }, 150);
    }
  };

  const handleSendMessage = (conversationId: string, content: string) => {
    StorageService.addMessage(conversationId, content, 'business');
    addToast('success', 'Message Sent', 'WhatsApp message dispatched to buyer.');
  };

  const handleUpdateLeadStage = (customerId: string, stage: LeadStage) => {
    StorageService.updateCustomerLeadStage(customerId, stage);
    addToast('info', 'Stage Updated', `Buyer moved to ${stage.replace('_', ' ')}.`);
  };

  const handleAddOrder = (
    orderData: Omit<Order, 'id' | 'orderNumber' | 'businessId' | 'createdDate'>
  ) => {
    const created = StorageService.createOrder(orderData);
    addToast('success', 'Order Created', `Order #${created.orderNumber} successfully generated.`);
  };

  const handleUpdateOrderStatus = (
    orderId: string,
    paymentStatus?: PaymentStatus,
    orderStatus?: OrderStatus
  ) => {
    StorageService.updateOrderStatus(orderId, paymentStatus, orderStatus);
    if (paymentStatus === 'paid') {
      addToast('success', 'Payment Verified', 'Order marked as paid in Zenith Bank account.');
    } else {
      addToast('info', 'Status Updated', 'Order delivery status refreshed.');
    }
  };

  const handleAddProduct = (prod: Omit<Product, 'id' | 'businessId'>) => {
    StorageService.addProduct(prod);
    addToast('success', 'Product Added', `${prod.name} added to catalog.`);
  };

  const handleDeleteProduct = (id: string) => {
    StorageService.deleteProduct(id);
    addToast('info', 'Product Removed', 'Catalog updated.');
  };

  const handleAddCustomer = (c: Omit<Customer, 'id' | 'businessId'>) => {
    StorageService.addCustomer(c);
    addToast('success', 'Customer Added', `${c.name} registered.`);
  };

  const handleAddFollowUp = (f: Omit<FollowUp, 'id' | 'businessId'>) => {
    StorageService.addFollowUp(f);
    addToast('success', 'Follow-up Scheduled', `Reminder set for ${f.customerName}.`);
  };

  const handleUpdateFollowUpStatus = (id: string, status: FollowUp['status']) => {
    StorageService.updateFollowUpStatus(id, status);
    addToast('info', 'Follow-up Updated', `Status set to ${status}.`);
  };

  const handleUpdateBusiness = (updated: Partial<Business>) => {
    StorageService.updateBusiness(updated);
    addToast('success', 'Business Updated', `${updated.name || data.business.name || 'Business'} workspace saved.`);
  };

  const handleUpdateKnowledgeBase = (updated: Partial<KnowledgeBase>) => {
    StorageService.updateKnowledgeBase(updated);
    addToast('success', 'Knowledge Base Updated', 'AI operating rules refreshed.');
  };

  const handleUpdateWhatsAppConfig = (updated: Partial<WhatsAppIntegrationConfig>) => {
    StorageService.updateWhatsAppConfig(updated);
    addToast('success', 'WhatsApp Integration Updated', 'WhatsApp Business configuration refreshed.');
  };

  const handleResetData = () => {
    StorageService.resetToSeed();
    addToast('info', 'Data Reset', 'Restored initial workspace data.');
  };

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Find active customer and messages for the selected conversation
  const activeConversation =
    data.conversations.find((c) => c.id === activeConversationId) || data.conversations[0];
  const activeCustomer = activeConversation
    ? data.customers.find((c) => c.id === activeConversation.customerId)
    : undefined;
  const activeMessages = activeConversation
    ? data.messages.filter((m) => m.conversationId === activeConversation.id)
    : [];

  // ==========================================
  // LOADING / WORKSPACE SETUP STATE
  // ==========================================
  if (isSettingUp) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center p-4 text-white">
        <div className="flex flex-col items-center gap-4 text-center max-w-md bg-slate-900/60 p-8 rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <h2 className="text-xl font-bold tracking-tight text-slate-100">Preparing Your Store Workspace</h2>
          <p className="text-sm text-slate-400">Configuring WhatsApp automation, inventory records, and AI knowledge base...</p>
          <div className="pt-2">
            <button
              onClick={() => {
                setupCancelledRef.current = true;
                setIsSettingUp(false);
                addToast('info', 'Setup Cancelled', 'Returned to sign-in portal.');
              }}
              className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-4 transition-colors"
            >
              Taking longer than expected? Return to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 1. SEPARATE AUTHENTICATION & ONBOARDING PORTAL
  // ==========================================
  if (portalMode === 'auth') {
    return (
      <div className="min-h-screen bg-[#0B0F19]">
        <AuthPortal
          onLoginAsMerchant={async (merchantId, email, displayName, businessName) => {
            setupCancelledRef.current = false;
            setIsSettingUp(true);
            try {
              const result = await handleMerchantLogin(
                {
                  merchantId,
                  email,
                  displayName,
                  businessName,
                  category: data.business.category,
                  phone: data.business.phone,
                  location: data.business.location,
                },
                {
                  onUpdateBusiness: (biz) => handleUpdateBusiness(biz),
                  isCancelled: () => setupCancelledRef.current,
                  timeoutMs: 15000,
                }
              );

              if (result.cancelled || setupCancelledRef.current) {
                return;
              }

              if (result.success) {
                setPortalMode('merchant');
                setActiveView('dashboard');
                addToast('success', 'Signed In', `Welcome to ${result.business.name}, ${result.business.ownerName}!`);
              }
            } catch (err: any) {
              console.error('Error setting up business context:', err);
              addToast('error', 'Setup Error', err?.message || 'Could not initialize store workspace.');
            } finally {
              setIsSettingUp(false);
            }
          }}
          onLoginAsSuperAdmin={() => {
            setPortalMode('superadmin');
            addToast('info', 'Super-Admin Console Active', 'FlowOS SaaS Platform HQ loaded.');
          }}
          onRegisterMerchant={(onboardingData) => {
            const planFee =
              onboardingData.tier === 'growth'
                ? 35000
                : onboardingData.tier === 'scale'
                ? 75000
                : 15000;

            AdminService.addTenant({
              name: onboardingData.businessName,
              ownerName: onboardingData.ownerName,
              ownerEmail: onboardingData.email,
              ownerPhone: onboardingData.phone,
              whatsappNumber: onboardingData.phone,
              category: onboardingData.category,
              tier: onboardingData.tier,
              monthlyFee: planFee,
              billingCycle: 'monthly',
              status: 'trial',
              location: onboardingData.location,
            });

            handleUpdateBusiness({
              name: onboardingData.businessName,
              category: onboardingData.category,
              phone: onboardingData.phone,
              ownerName: onboardingData.ownerName,
              location: onboardingData.location,
            });

            const newBizId = `biz_${Date.now().toString(36)}`;
            const currentUserId = AuthService.getCurrentUser()?.uid || `user_${Date.now().toString(36)}`;
            StorageService.setBusinessContext(
              newBizId,
              currentUserId,
              {
                name: onboardingData.businessName,
                ownerName: onboardingData.ownerName,
                category: onboardingData.category,
                phone: onboardingData.phone,
                location: onboardingData.location,
              },
              false // Real merchant onboarding starts with an empty business
            );

            if (onboardingData.initialProduct) {
              StorageService.addProduct({
                name: onboardingData.initialProduct.name,
                sku: `SKU-${Date.now().toString().slice(-4)}`,
                category: onboardingData.category,
                price: onboardingData.initialProduct.price,
                stock: onboardingData.initialProduct.stock,
                sizes: ['Standard'],
                colours: ['Default'],
                description: `Flagship product for ${onboardingData.businessName}`,
                image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80',
                isActive: true,
              });
            }

            setPortalMode('merchant');
            setActiveView('dashboard');
            addToast(
              'success',
              'Workspace Provisioned!',
              `Welcome ${onboardingData.businessName}! 14-day free trial activated with Meta WhatsApp API.`
            );
          }}
        />

        {/* Toast Notifications */}
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
          ))}
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. DEDICATED SUPER-ADMIN PLATFORM CONSOLE
  // (Completely separate from the merchant view)
  // ==========================================
  if (portalMode === 'superadmin') {
    return (
      <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#F8FAFC]">
        <SuperAdminView
          onSwitchToMerchant={(tenant) => {
            handleUpdateBusiness({
              name: tenant.name,
              category: tenant.category,
              phone: tenant.whatsappNumber,
              ownerName: tenant.ownerName,
              location: tenant.location,
            });
            setPortalMode('superadmin_impersonating');
            setActiveView('dashboard');
            addToast(
              'info',
              'Impersonating Merchant',
              `Now inspecting ${tenant.name} merchant workspace.`
            );
          }}
          onLogout={() => {
            setPortalMode('auth');
            addToast('info', 'Logged Out', 'Signed out of FlowOS Super-Admin HQ.');
          }}
        />

        {/* Toast Notifications */}
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
          ))}
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. MERCHANT STORE WORKSPACE
  // (Merchants only see their own store. No Super-Admin controls.)
  // ==========================================
  const isDemoStore =
    data.business.id === 'biz_luma_main' ||
    data.business.id === 'biz_luma_01' ||
    StorageService.isDemoStore();

  return (
    <div className="flex h-screen bg-[#F9FAFB] text-[#111827] overflow-hidden font-sans flex-col">
      {/* Super-Admin Impersonation Banner (ONLY shown when platform owner is inspecting a tenant) */}
      {portalMode === 'superadmin_impersonating' && (
        <div className="bg-amber-500 text-slate-950 px-4 sm:px-8 py-2 text-xs font-semibold flex items-center justify-between z-40 shadow-sm shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="w-4 h-4 shrink-0 text-slate-950" />
            <span className="truncate">
              Platform Admin Mode: Inspecting <strong>{data.business.name}</strong> ({data.business.phone})
            </span>
          </div>
          <button
            onClick={() => setPortalMode('superadmin')}
            className="px-3 py-1 rounded-md bg-slate-950 hover:bg-black text-white text-xs font-bold transition-colors shrink-0"
          >
            Exit Impersonation & Return to Admin Console
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar
          activeView={activeView}
          onNavigate={setActiveView}
          unreadConversationsCount={data.metrics.unreadMessages}
          followUpsDueCount={data.metrics.followUpsDue}
          awaitingPaymentsCount={data.leads.filter((l) => l.stage === 'AWAITING_PAYMENT').length}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
          business={data.business}
          user={data.user}
          onLogout={async () => {
            try {
              await AuthService.signOut();
            } catch (err) {
              console.error('Sign out error:', err);
            }
            setPortalMode('auth');
            addToast('info', 'Logged Out', 'Returned to FlowOS Sign In Portal.');
          }}
        />

        {/* Main App Canvas */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Header with Simulation Controls */}
          <Header
            business={data.business}
            whatsAppConfig={data.whatsAppConfig}
            activeView={activeView}
            onNavigate={setActiveView}
            onOpenMobileMenu={() => setIsMobileOpen(true)}
            onSimulateIncomingMessage={handleSimulateIncomingMessage}
            onSimulatePayment={handleSimulatePayment}
            onSimulateLeadAdvance={handleSimulateLeadAdvance}
            onOpenSettings={() => setActiveView('settings')}
          />

          {/* View Router */}
          <main
            className={`flex-1 ${
              activeView === 'inbox'
                ? 'overflow-hidden flex flex-col'
                : 'overflow-y-auto'
            } bg-[#F9FAFB]`}
          >
            {activeView === 'dashboard' && (
              <DashboardView
                metrics={data.metrics}
                leads={data.leads}
                followUps={data.followUps}
                recentOrders={data.orders.slice(0, 5)}
                conversations={data.conversations}
                business={data.business}
                userDisplayName={data.business?.ownerName || data.user?.displayName}
                onNavigate={setActiveView}
                onOpenChat={handleOpenChat}
                onUpdateLeadStage={handleUpdateLeadStage}
              />
            )}

          {activeView === 'inbox' && (
            <InboxView
              conversations={data.conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={(id) => {
                setActiveConversationId(id);
                StorageService.markConversationAsRead(id);
              }}
              messages={activeMessages}
              customer={activeCustomer}
              products={data.products}
              knowledgeBase={data.knowledgeBase}
              whatsAppConfig={data.whatsAppConfig}
              business={data.business}
              onSendMessage={handleSendMessage}
              onUpdateLeadStage={handleUpdateLeadStage}
              onCreateOrderForCustomer={(cust) => {
                setActiveView('orders');
              }}
              onNavigateToSettings={() => setActiveView('settings')}
              onSimulateIncomingMessage={handleSimulateIncomingMessage}
              onNavigate={setActiveView}
              onOpenMobileMenu={() => setIsMobileOpen(true)}
            />
          )}

          {activeView === 'pipeline' && (
            <PipelineView
              leads={data.leads}
              customers={data.customers}
              onUpdateStage={(leadId, stage) => {
                const lead = data.leads.find((l) => l.id === leadId);
                if (lead) {
                  handleUpdateLeadStage(lead.customerId, stage);
                }
              }}
              onOpenChat={handleOpenChat}
            />
          )}

          {activeView === 'followups' && (
            <FollowUpView
              followUps={data.followUps}
              onUpdateStatus={handleUpdateFollowUpStatus}
              onOpenChatWithDraft={handleOpenChat}
              onAddFollowUp={handleAddFollowUp}
            />
          )}

          {activeView === 'orders' && (
            <OrdersView
              orders={data.orders}
              products={data.products}
              customers={data.customers}
              business={data.business}
              knowledgeBase={data.knowledgeBase}
              onAddOrder={handleAddOrder}
              onUpdateStatus={handleUpdateOrderStatus}
              onOpenChat={handleOpenChat}
            />
          )}

          {activeView === 'products' && (
            <ProductsView
              products={data.products}
              onAddProduct={handleAddProduct}
              onDeleteProduct={handleDeleteProduct}
            />
          )}

          {activeView === 'customers' && (
            <CustomersView
              customers={data.customers}
              onOpenChat={handleOpenChat}
              onAddCustomer={handleAddCustomer}
            />
          )}

          {activeView === 'analytics' && (
            <AnalyticsView
              metrics={data.metrics}
              products={data.products}
              orders={data.orders}
              leads={data.leads}
              business={data.business}
            />
          )}

          {activeView === 'ai_copilot' && (
            <AICopilotView
              business={data.business}
              metrics={data.metrics}
              products={data.products}
              orders={data.orders}
              leads={data.leads}
              followUps={data.followUps}
              knowledgeBase={data.knowledgeBase}
            />
          )}

          {activeView === 'settings' && (
            <SettingsView
              business={data.business}
              knowledgeBase={data.knowledgeBase}
              whatsAppConfig={data.whatsAppConfig}
              onUpdateBusiness={handleUpdateBusiness}
              onUpdateKnowledgeBase={handleUpdateKnowledgeBase}
              onUpdateWhatsAppConfig={handleUpdateWhatsAppConfig}
              onResetData={handleResetData}
              onSimulateIncomingMessage={handleSimulateIncomingMessage}
              onSimulatePayment={handleSimulatePayment}
            />
          )}
        </main>

        {/* Mobile Bottom Navigation Bar (Visible on mobile & tablet < lg) */}
        <nav
          id="mobile-bottom-navigation"
          aria-label="Mobile Navigation"
          className="lg:hidden bg-white border-t border-[#E5E7EB] flex items-center justify-around px-2 py-1.5 shrink-0 z-30 shadow-md"
        >
          <button
            type="button"
            id="mobile-nav-dashboard"
            onClick={() => setActiveView('dashboard')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[11px] font-semibold transition-colors ${
              activeView === 'dashboard'
                ? 'text-[#2563EB]'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            id="mobile-nav-inbox"
            onClick={() => setActiveView('inbox')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[11px] font-semibold relative transition-colors ${
              activeView === 'inbox'
                ? 'text-[#2563EB]'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5 mb-0.5" />
              {data.metrics.unreadMessages > 0 && (
                <span className="absolute -top-1 -right-2 bg-emerald-600 text-white text-[9px] font-bold px-1 rounded-full min-w-3.5 h-3.5 flex items-center justify-center">
                  {data.metrics.unreadMessages}
                </span>
              )}
            </div>
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            id="mobile-nav-pipeline"
            onClick={() => setActiveView('pipeline')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[11px] font-semibold transition-colors ${
              activeView === 'pipeline'
                ? 'text-[#2563EB]'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <GitPullRequest className="w-5 h-5 mb-0.5" />
            <span>Pipeline</span>
          </button>

          <button
            type="button"
            id="mobile-nav-orders"
            onClick={() => setActiveView('orders')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[11px] font-semibold transition-colors ${
              activeView === 'orders'
                ? 'text-[#2563EB]'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <ShoppingBag className="w-5 h-5 mb-0.5" />
            <span>Orders</span>
          </button>

          <button
            type="button"
            id="mobile-nav-more"
            onClick={() => setIsMobileOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[11px] font-semibold text-[#6B7280] hover:text-[#111827] transition-colors"
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span>More</span>
          </button>
        </nav>

        {/* Bottom Bar / Quick Actions (Clean Minimalism Theme) */}
        <div className="h-10 bg-[#1F2937] text-white flex items-center justify-between px-4 sm:px-8 text-xs font-medium shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            {isDemoStore ? (
              <>
                <span className="text-[#9CA3AF] text-[11px] tracking-wider uppercase">
                  DEMO MODE ACTIVE
                </span>
                <div className="w-[1px] h-3.5 bg-[#4B5563]"></div>
                <span className="flex items-center gap-1.5 text-slate-200 text-[11px]">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  ₦8.4M Monthly Revenue Tracked
                </span>
              </>
            ) : (
              <>
                <span className="text-emerald-400 text-[11px] tracking-wider uppercase font-semibold">
                  LIVE WORKSPACE
                </span>
                <div className="w-[1px] h-3.5 bg-[#4B5563]"></div>
                <span className="flex items-center gap-1.5 text-slate-200 text-[11px]">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                  {data.business.currency || '₦'}{data.metrics.revenueThisMonth.toLocaleString()} Revenue Tracked
                </span>
              </>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-6 text-[11px] text-slate-300">
            <span
              onClick={() => setActiveView('analytics')}
              className="cursor-pointer hover:text-blue-400 transition-colors"
            >
              System Status: Optimal
            </span>
            <span
              onClick={() => setActiveView('settings')}
              className="cursor-pointer hover:text-blue-400 transition-colors"
            >
              Knowledge Base Active
            </span>
            <span
              onClick={() => setActiveView('ai_copilot')}
              className="cursor-pointer hover:text-blue-400 uppercase tracking-widest font-semibold text-[#93C5FD]"
            >
              AI Reply Assistant On
            </span>
          </div>
        </div>
      </div>
    </div>

      {/* Real-Time Event Toasts */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} onClose={() => removeToast(toast.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}

