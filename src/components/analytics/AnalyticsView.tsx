import React, { useState, useEffect } from 'react';
import { DashboardMetrics, Product, Order, Lead } from '../../types';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  Clock,
  Sparkles,
  ArrowUpRight,
  ChevronDown,
  RefreshCw,
  PieChart,
  BarChart2,
  AlertCircle,
} from 'lucide-react';

interface AnalyticsViewProps {
  metrics: DashboardMetrics;
  products: Product[];
  orders: Order[];
  leads: Lead[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  metrics,
  products,
  orders,
  leads,
}) => {
  const [aiInsights, setAiInsights] = useState<string[]>([
    'Your biggest drop-off is between "Interested" and "Awaiting Payment" (38 inquiries stalled).',
    'Black Satin Slip Midi Dress is currently your highest-converting product with 14 units sold.',
    'Over 62% of completed sales originate from repeat customers in Lekki and Victoria Island.',
    '₦1,240,000 in recoverable revenue is pending across 12 high-intent follow-ups.',
  ]);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const fetchAiInsights = async () => {
    setIsLoadingAi(true);
    try {
      const response = await fetch('/api/ai/analytics-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics,
          pipelineStats: [
            { stage: 'New Leads', count: 87 },
            { stage: 'Interested', count: 52 },
            { stage: 'Product Selected', count: 36 },
            { stage: 'Awaiting Payment', count: 24 },
            { stage: 'Paid', count: 16 },
          ],
          topProducts: products.slice(0, 5).map((p) => ({ name: p.name, price: p.price })),
        }),
      });
      const data = await response.json();
      if (data.insights && Array.isArray(data.insights)) {
        setAiInsights(data.insights);
      }
    } catch (e) {
      console.error('Error fetching analytics insights', e);
    } finally {
      setIsLoadingAi(false);
    }
  };

  const topProductsList = [
    { name: 'Black Satin Slip Midi Dress', sold: 14, revenue: 1190000, conversion: '32%' },
    { name: 'Cream Linen Two-Piece Set', sold: 9, revenue: 990000, conversion: '27%' },
    { name: 'Emerald Green Evening Wrap Dress', sold: 7, revenue: 875000, conversion: '22%' },
    { name: 'Ankara Fusion Tailored Blazer', sold: 8, revenue: 760000, conversion: '20%' },
    { name: 'Sunset Tiered Organza Midi Dress', sold: 5, revenue: 675000, conversion: '18%' },
  ];

  const locationBreakdown = [
    { location: 'Lekki Phase 1, Lagos', share: '38%', revenue: '₦3,199,600' },
    { location: 'Ikoyi & Banana Island', share: '24%', revenue: '₦2,020,800' },
    { location: 'Victoria Island, Lagos', share: '16%', revenue: '₦1,347,200' },
    { location: 'Abuja (Maitama & Wuse)', share: '14%', revenue: '₦1,178,800' },
    { location: 'Port Harcourt & Others', share: '8%', revenue: '₦673,600' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            WhatsApp Revenue & Conversion Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time performance metrics, sales funnel drop-offs, and strategic AI recommendations.
          </p>
        </div>

        <button
          onClick={fetchAiInsights}
          disabled={isLoadingAi}
          className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-2xs self-start md:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAi ? 'animate-spin' : ''}`} />
          <span>Refresh AI Insights</span>
        </button>
      </div>

      {/* 6 Top KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Revenue Today
          </span>
          <p className="text-lg font-black text-slate-900 mt-1">
            ₦{metrics.revenueToday.toLocaleString()}
          </p>
          <span className="text-[11px] font-semibold text-emerald-600 flex items-center mt-1">
            <ArrowUpRight className="w-3 h-3" /> +14.2% vs avg
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Revenue This Month
          </span>
          <p className="text-lg font-black text-slate-900 mt-1">
            ₦{metrics.revenueThisMonth.toLocaleString()}
          </p>
          <span className="text-[11px] font-semibold text-emerald-600 flex items-center mt-1">
            <ArrowUpRight className="w-3 h-3" /> +28.5% YoY
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Orders
          </span>
          <p className="text-lg font-black text-slate-900 mt-1">{metrics.totalOrders}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Completed dispatches</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Conversion Rate
          </span>
          <p className="text-lg font-black text-slate-900 mt-1">{metrics.conversionRate}%</p>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
            Top tier in fashion
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
            Outstanding ₦
          </span>
          <p className="text-lg font-black text-rose-900 mt-1">
            ₦{metrics.outstandingPayments.toLocaleString()}
          </p>
          <span className="text-[11px] text-rose-700 font-medium mt-1 block">
            Unpaid reservations
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
            Recoverable ₦
          </span>
          <p className="text-lg font-black text-emerald-900 mt-1">
            ₦{metrics.recoverableRevenue.toLocaleString()}
          </p>
          <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
            {metrics.followUpsDue} follow-ups pending
          </span>
        </div>
      </div>

      {/* AI Strategic Insights Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white shadow-md border border-emerald-800/40 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Gemini Strategic Executive Insights</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs sm:text-sm">
          {aiInsights.map((insight, index) => (
            <div
              key={index}
              className="p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10 text-slate-200 leading-relaxed"
            >
              • {insight}
            </div>
          ))}
        </div>
      </div>

      {/* 2-Column Section: Conversion Funnel & Location Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WhatsApp Conversion Funnel */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              WhatsApp Sales Pipeline Funnel
            </h3>
            <span className="text-xs text-slate-400">Past 30 Days</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>1. New Inquiries</span>
                <span>87 leads (100%)</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full w-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>2. Highly Interested (Asked Price/Sizing)</span>
                <span>52 leads (59.7%)</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full w-[59.7%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>3. Product & Size Selected</span>
                <span>36 leads (41.3%)</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full w-[41.3%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>4. Awaiting Payment (Invoice / Details Sent)</span>
                <span>24 leads (27.5%)</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full w-[27.5%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>5. Paid & Dispatched</span>
                <span className="font-bold text-emerald-700">16 completed (18.4%)</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full w-[18.4%]" />
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <strong>Key Insight:</strong> 12 leads dropped off between Invoice Sent and Payment. Instant follow-ups recover an average of 42% of stalled payments.
          </p>
        </div>

        {/* Revenue by Location */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Revenue Breakdown by Region
            </h3>
            <span className="text-xs text-slate-400">Delivery Distribution</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {locationBreakdown.map((item, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between">
                <div>
                  <h5 className="font-semibold text-slate-900">{item.location}</h5>
                  <span className="text-[11px] text-slate-500">{item.share} of total orders</span>
                </div>
                <span className="font-bold text-slate-900">{item.revenue}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Selling Products Table */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          Top-Selling Ready-to-Wear Pieces
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] font-bold text-slate-400 uppercase border-b border-slate-100">
              <tr>
                <th className="pb-3">Product Name</th>
                <th className="pb-3">Units Sold</th>
                <th className="pb-3">Revenue Generated (₦)</th>
                <th className="pb-3">Conversion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topProductsList.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-3 font-semibold text-slate-900">{item.name}</td>
                  <td className="py-3 text-slate-600">{item.sold} units</td>
                  <td className="py-3 font-bold text-emerald-700">
                    ₦{item.revenue.toLocaleString()}
                  </td>
                  <td className="py-3 font-semibold text-slate-800">{item.conversion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
