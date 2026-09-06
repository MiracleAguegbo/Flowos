import React from 'react';
import { LeadStage, PaymentStatus, OrderStatus } from '../../types';

interface StageBadgeProps {
  stage: LeadStage;
  size?: 'sm' | 'md';
}

export const StageBadge: React.FC<StageBadgeProps> = ({ stage, size = 'md' }) => {
  const configs: Record<LeadStage, { label: string; bg: string; text: string; border: string }> = {
    NEW_LEAD: {
      label: 'NEW LEAD',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-200/60',
    },
    INTERESTED: {
      label: 'INTERESTED',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-200/60',
    },
    PRODUCT_SELECTED: {
      label: 'PRODUCT SELECTED',
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
      border: 'border-indigo-200/60',
    },
    AWAITING_PAYMENT: {
      label: 'PENDING PAYMENT',
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-200/60',
    },
    PAID: {
      label: 'PAID',
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200/60',
    },
    COMPLETED: {
      label: 'COMPLETED',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200/60',
    },
    LOST: {
      label: 'LOST',
      bg: 'bg-[#F3F4F6]',
      text: 'text-[#6B7280]',
      border: 'border-[#E5E7EB]',
    },
  };

  const c = configs[stage] || {
    label: stage,
    bg: 'bg-[#F3F4F6]',
    text: 'text-[#4B5563]',
    border: 'border-[#E5E7EB]',
  };

  return (
    <span
      className={`inline-flex items-center font-bold border rounded ${c.bg} ${c.text} ${c.border} ${
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'
      }`}
    >
      {c.label}
    </span>
  );
};

interface PaymentBadgeProps {
  status: PaymentStatus;
  size?: 'sm' | 'md';
}

export const PaymentBadge: React.FC<PaymentBadgeProps> = ({ status, size = 'md' }) => {
  const configs: Record<PaymentStatus, { label: string; bg: string; text: string; border: string }> = {
    paid: {
      label: 'Paid',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
    },
    awaiting_payment: {
      label: 'Awaiting Payment',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
    },
    pending: {
      label: 'Pending',
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200',
    },
    refunded: {
      label: 'Refunded',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
    },
  };

  const c = configs[status] || configs.pending;

  return (
    <span
      className={`inline-flex items-center font-semibold border rounded-md ${c.bg} ${c.text} ${c.border} ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      {c.label}
    </span>
  );
};

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md';
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status, size = 'md' }) => {
  const configs: Record<OrderStatus, { label: string; bg: string }> = {
    pending: { label: 'Pending', bg: 'bg-slate-100 text-slate-700' },
    awaiting_payment: { label: 'Awaiting ₦', bg: 'bg-amber-100 text-amber-800' },
    paid: { label: 'Paid', bg: 'bg-emerald-100 text-emerald-800' },
    processing: { label: 'Processing', bg: 'bg-blue-100 text-blue-800' },
    ready: { label: 'Ready for Dispatch', bg: 'bg-indigo-100 text-indigo-800' },
    delivered: { label: 'Delivered', bg: 'bg-teal-100 text-teal-800' },
    cancelled: { label: 'Cancelled', bg: 'bg-rose-100 text-rose-800' },
  };

  const c = configs[status] || { label: status, bg: 'bg-slate-100 text-slate-700' };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md ${c.bg} ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      {c.label}
    </span>
  );
};
