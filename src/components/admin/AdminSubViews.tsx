import React, { useMemo, useState } from 'react';
import {
  ShoppingCart,
  Clock,
  Printer,
  Truck,
  TrendingUp,
  IndianRupee,
  CreditCard,
  BarChart3,
  Package,
  Search,
  CheckCircle2,
  AlertTriangle,
  Send,
  Mail,
  Calendar,
  MapPin,
  Loader2,
  ChevronRight,
  Copy,
  Check,
  Eye,
  Plus,
  Download,
  Building2,
  UserCheck,
  Users,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { CustomOrderRow, OrderStatus, ProductRow } from '../../lib/supabase';
import { PRODUCTS } from '../../data/mockData';
import { WhatsAppIcon } from '../WhatsAppIcon';
import { getDirectClientWhatsAppUrl } from '../../utils/whatsapp';
import {
  SmtpStatusResponse,
} from '../../services/emailService';
import {
  RazorpayStatus,
  DelhiveryStatus,
  DelhiveryTrackResponse,
  DelhiveryPincodeCheckResult,
  getDelhiveryLabelUrl,
} from '../../services/paymentAndLogisticsService';
import {
  AiSensyStatusResponse,
  WhatsAppDispatchLogItem,
  sendCheckoutDropRecoveryWhatsApp,
} from '../../services/aisensyService';
import {
  AdminSection,
  STATUS_META,
  parseOrderNotes,
  getOrderEstimates,
  getOrderThumbnail,
  formatOrderRef,
  buildDailyTrendSeries,
  aggregateCustomersFromOrders,
} from './adminUtils';
import { AdminKpiCard, AnimatedCounter, OrderThumb } from './AdminVisuals';

export interface AnalyticsSummary {
  totalOrdersCount: number;
  totalRevenue: number;
  totalPaidRecorded: number;
  totalBalanceRecorded: number;
  statusCounts: Record<OrderStatus, number>;
  topProducts: Array<{ name: string; orders: number; units: number; revenue: number }>;
  totalAbandonedCount: number;
  unrecoveredCount: number;
  recoveredCount: number;
  abandonedValueAtRisk: number;
  conversionRate: string;
  recoveryRate: string;
  aov: number;
}

// ============================================================================
// 1. EXECUTIVE DASHBOARD OVERVIEW
// ============================================================================
export const DashboardOverviewView: React.FC<{
  orders: CustomOrderRow[];
  abandonedLeads: any[];
  analytics: AnalyticsSummary;
  onNavigateSection: (sec: AdminSection) => void;
  onFilterOrdersStatus: (status: 'all' | OrderStatus) => void;
  onInspectOrder: (order: CustomOrderRow) => void;
  onOpenCreateOrder: () => void;
}> = ({
  orders,
  analytics,
  onNavigateSection,
  onFilterOrdersStatus,
  onInspectOrder,
  onOpenCreateOrder,
}) => {
  const dailySeries = useMemo(() => buildDailyTrendSeries(orders, 7), [orders]);
  const maxDailyCount = Math.max(...dailySeries.map((d) => d.count), 1);
  const recentOrders = orders.slice(0, 5);

  const countSpark = dailySeries.map((d) => d.count);
  const pendingSpark = useMemo(
    () =>
      buildDailyTrendSeries(
        orders.filter((o) => o.status === 'pending'),
        7
      ).map((d) => d.count),
    [orders]
  );
  const prodSpark = useMemo(
    () =>
      buildDailyTrendSeries(
        orders.filter((o) => o.status === 'approved' || o.status === 'in-production'),
        7
      ).map((d) => d.count),
    [orders]
  );
  const shipSpark = useMemo(
    () =>
      buildDailyTrendSeries(
        orders.filter((o) => o.status === 'dispatched' || o.status === 'delivered'),
        7
      ).map((d) => d.count),
    [orders]
  );

  return (
    <div className="space-y-6 animate-admin-fade-up">
      {/* 4 KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <AdminKpiCard
          title="Total Custom Orders"
          value={analytics.totalOrdersCount}
          subtext={
            <span className="text-emerald-600 font-semibold font-mono tabular-nums">
              ₹{analytics.totalRevenue.toLocaleString('en-IN')} est. value
            </span>
          }
          icon={ShoppingCart}
          tone="orange"
          sparklinePoints={countSpark}
          sparkId="dash-total"
          onClick={() => onFilterOrdersStatus('all')}
          delayMs={0}
        />
        <AdminKpiCard
          title="Needs Proof Review"
          value={analytics.statusCounts.pending}
          subtext="Awaiting verification"
          icon={Clock}
          tone="blue"
          sparklinePoints={pendingSpark}
          sparkId="dash-pending"
          onClick={() => onFilterOrdersStatus('pending')}
          delayMs={50}
        />
        <AdminKpiCard
          title="Approved & Printing"
          value={analytics.statusCounts.approved + analytics.statusCounts['in-production']}
          subtext="Active production queue"
          icon={Printer}
          tone="violet"
          sparklinePoints={prodSpark}
          sparkId="dash-prod"
          onClick={() => onFilterOrdersStatus('in-production')}
          delayMs={100}
        />
        <AdminKpiCard
          title="Shipped & Delivered"
          value={analytics.statusCounts.dispatched + analytics.statusCounts.delivered}
          subtext="Delivery AWBs assigned"
          icon={Truck}
          tone="green"
          sparklinePoints={shipSpark}
          sparkId="dash-ship"
          onClick={() => onFilterOrdersStatus('dispatched')}
          delayMs={150}
        />
      </div>

      {/* 7-Day Order Volume Chart + Production Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-[0_2px_12px_-4px_rgba(7,27,53,0.06)] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display font-bold text-base text-[#071B35]">
                7-Day Order Activity
              </h3>
              <p className="text-xs text-slate-500">
                Daily custom orders &amp; revenue recorded across storefront and manual entries
              </p>
            </div>
            <button
              onClick={() => onNavigateSection('analytics')}
              className="text-xs font-semibold text-[#FF7900] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Full Analytics</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 sm:gap-3 items-end h-44 pt-4 border-b border-slate-100 pb-2">
            {dailySeries.map((day) => {
              const heightPct = day.count > 0 ? Math.max(16, Math.round((day.count / maxDailyCount) * 100)) : 6;
              return (
                <div key={day.label} className="flex flex-col items-center justify-end h-full gap-1.5 group">
                  <div className="text-[11px] font-mono font-semibold text-slate-600 tabular-nums opacity-80 group-hover:text-[#FF7900]">
                    {day.count}
                  </div>
                  <div className="w-full max-w-[38px] flex-1 flex items-end justify-center bg-slate-100/70 rounded-xl overflow-hidden p-0.5">
                    <div
                      className={`w-full rounded-lg transition-all duration-500 ${
                        day.count > 0
                          ? 'bg-gradient-to-t from-[#FF7900] to-[#FF9B3D] group-hover:brightness-105'
                          : 'bg-slate-200/70'
                      }`}
                      style={{ height: `${heightPct}%` }}
                      title={`${day.label}: ${day.count} orders (₹${day.revenue.toLocaleString('en-IN')})`}
                    />
                  </div>
                  <div className="text-[10px] font-medium text-slate-500 whitespace-nowrap">
                    {day.label}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs pt-1">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div className="text-[11px] text-slate-500">Avg. Order Value</div>
              <div className="font-mono font-bold text-[#071B35] text-sm mt-0.5 tabular-nums">
                ₹<AnimatedCounter value={analytics.aov} />
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div className="text-[11px] text-slate-500">Paid Online</div>
              <div className="font-mono font-bold text-emerald-600 text-sm mt-0.5 tabular-nums">
                ₹<AnimatedCounter value={analytics.totalPaidRecorded} />
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div className="text-[11px] text-slate-500">50% Balance Due</div>
              <div className="font-mono font-bold text-amber-600 text-sm mt-0.5 tabular-nums">
                ₹<AnimatedCounter value={analytics.totalBalanceRecorded} />
              </div>
            </div>
          </div>
        </div>

        {/* Fulfillment Pipeline Breakdown */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-[0_2px_12px_-4px_rgba(7,27,53,0.06)] flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-display font-bold text-base text-[#071B35]">
                Fulfillment Pipeline
              </h3>
              <p className="text-xs text-slate-500">
                Real-time breakdown across production &amp; Delhivery delivery
              </p>
            </div>

            <div className="space-y-3">
              {(Object.keys(STATUS_META) as OrderStatus[]).map((st) => {
                const count = analytics.statusCounts[st];
                const pct =
                  analytics.totalOrdersCount > 0
                    ? Math.round((count / analytics.totalOrdersCount) * 100)
                    : 0;
                return (
                  <button
                    key={st}
                    onClick={() => onFilterOrdersStatus(st)}
                    className="w-full text-left space-y-1.5 group cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 group-hover:text-[#FF7900] flex items-center gap-2 transition-colors">
                        <span className={`w-2 h-2 rounded-full ${STATUS_META[st].dotClass}`} />
                        <span>{STATUS_META[st].label}</span>
                      </span>
                      <span className="font-mono tabular-nums text-slate-500">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${STATUS_META[st].barClass}`}
                        style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenCreateOrder}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#FF7900] hover:bg-[#e56d00] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Order</span>
            </button>
            <button
              onClick={() => onNavigateSection('dispatch')}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#071B35] hover:bg-[#0d2a52] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Delhivery Hub</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Orders Quick Access */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-[0_2px_12px_-4px_rgba(7,27,53,0.06)] space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold text-base text-[#071B35]">
              Latest Orders Activity
            </h3>
            <p className="text-xs text-slate-500">Click any order to open full artwork &amp; dispatch drawer</p>
          </div>
          <button
            onClick={() => onNavigateSection('orders')}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-[#FF7900] text-xs font-semibold text-[#071B35] hover:text-[#FF7900] transition-colors cursor-pointer"
          >
            View All Orders
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500">
            No orders recorded yet. Storefront orders and manual entries appear here automatically.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentOrders.map((order) => {
              const parsed = parseOrderNotes(order.custom_notes);
              const { product, total } = getOrderEstimates(order);
              const thumb = getOrderThumbnail(order, parsed);
              return (
                <div
                  key={order.id}
                  onClick={() => onInspectOrder(order)}
                  className="py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/80 px-2 -mx-2 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <OrderThumb src={thumb} alt={product?.name || 'Order'} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-[#FF7900]">
                          #{formatOrderRef(order.id)}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="font-semibold text-[#071B35] truncate">
                          {order.customer_name}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {product?.name || order.product_id} ({order.quantity} pcs)
                        {parsed.parsedAddress.city ? ` · ${parsed.parsedAddress.city}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${STATUS_META[order.status].pillClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[order.status].dotClass}`} />
                      {STATUS_META[order.status].shortLabel}
                    </span>
                    <span className="font-mono font-bold text-xs text-[#071B35] tabular-nums">
                      ₹{total.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 2. PRODUCTS CATALOG VIEW (REAL CATALOG)
// ============================================================================
export const ProductsCatalogView: React.FC<{
  dbProducts: ProductRow[];
  onCreateOrderForProduct: (productId: string) => void;
}> = ({ dbProducts, onCreateOrderForProduct }) => {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  const combinedProducts = useMemo(() => {
    return PRODUCTS.map((p) => {
      const dbMatch = dbProducts.find((d) => d.id === p.id);
      return {
        id: p.id,
        name: dbMatch?.name || p.name,
        category: p.category,
        basePrice: dbMatch?.base_price ?? p.basePrice,
        moq: dbMatch?.moq ?? p.moq,
        image: p.colors[0]?.imageFront || dbMatch?.image_url || '',
        colorsCount: p.colors.length,
        printMethods: p.printMethods,
        description: p.description,
      };
    });
  }, [dbProducts]);

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(combinedProducts.map((p) => p.category)))],
    [combinedProducts]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return combinedProducts.filter((p) => {
      const matchCat = catFilter === 'all' || p.category === catFilter;
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [combinedProducts, search, catFilter]);

  return (
    <div className="space-y-5 animate-admin-fade-up">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-[0_2px_12px_-4px_rgba(7,27,53,0.06)] space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products by name, SKU, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#071B35] placeholder:text-slate-400 focus:border-[#FF7900] focus:bg-white outline-none transition-colors"
            />
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums px-2">
            {filtered.length} Active SKUs
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                catFilter === c
                  ? 'bg-[#FF7900] text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:text-[#071B35]'
              }`}
            >
              {c.replace(/-/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-[0_2px_10px_-3px_rgba(7,27,53,0.05)] hover:shadow-[0_10px_24px_-6px_rgba(7,27,53,0.1)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between gap-4"
          >
            <div className="flex items-start gap-3.5">
              <OrderThumb src={item.image} alt={item.name} sizeClass="w-16 h-16" />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-mono text-slate-400 truncate">{item.id}</div>
                <h3 className="font-display font-bold text-sm text-[#071B35] line-clamp-2 mt-0.5">
                  {item.name}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-slate-600">
                  <span className="font-mono font-bold text-[#FF7900]">₹{item.basePrice}/pc</span>
                  <span className="text-slate-300">·</span>
                  <span>MOQ: {item.moq} pcs</span>
                  <span className="text-slate-300">·</span>
                  <span>{item.colorsCount} colors</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500 truncate">
                {item.printMethods.slice(0, 2).join(', ')}
              </span>
              <button
                onClick={() => onCreateOrderForProduct(item.id)}
                className="px-3 py-1.5 rounded-lg bg-[#071B35] hover:bg-[#FF7900] text-white text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Order</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 3. CUSTOMERS DIRECTORY VIEW (REAL AGGREGATED CLIENT DATA)
// ============================================================================
export const CustomersDirectoryView: React.FC<{
  orders: CustomOrderRow[];
  onInspectOrder: (order: CustomOrderRow) => void;
}> = ({ orders, onInspectOrder }) => {
  const [search, setSearch] = useState('');
  const customers = useMemo(() => aggregateCustomersFromOrders(orders), [orders]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return customers.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q))
    );
  }, [customers, search]);

  return (
    <div className="space-y-5 animate-admin-fade-up">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-[0_2px_12px_-4px_rgba(7,27,53,0.06)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customers by name, company, phone, email, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#071B35] placeholder:text-slate-400 focus:border-[#FF7900] focus:bg-white outline-none transition-colors"
          />
        </div>
        <div className="flex items-center gap-3 px-2 text-xs text-slate-600 font-mono tabular-nums">
          <Users className="w-4 h-4 text-[#FF7900]" />
          <span>{filtered.length} Verified Buyers</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl py-16 text-center space-y-2">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <div className="font-semibold text-[#071B35]">No customers found</div>
          <p className="text-xs text-slate-500">
            Verified buyers appear here automatically once orders are placed.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-[0_2px_12px_-4px_rgba(7,27,53,0.06)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
                  <th className="py-3.5 px-4">Customer &amp; Company</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">City / GSTIN</th>
                  <th className="py-3.5 px-4 text-right">Orders &amp; Units</th>
                  <th className="py-3.5 px-4 text-right">Total Value</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.key} className="hover:bg-slate-50/90 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#071B35]">{c.name}</div>
                      {c.company && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{c.company}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-[#071B35] tabular-nums">{c.phone}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[190px]">{c.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-700">{c.city || 'India'}</div>
                      {c.gstin && (
                        <div className="text-[11px] font-mono text-emerald-700 mt-0.5">
                          GST: {c.gstin}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      <div className="font-semibold text-[#071B35]">{c.ordersCount} orders</div>
                      <div className="text-[11px] text-slate-500">{c.totalUnits} units</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[#071B35] tabular-nums">
                      ₹{c.totalSpent.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => onInspectOrder(c.latestOrder)}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-[#FF7900] text-slate-600 hover:text-white transition-colors cursor-pointer"
                          title="Inspect Latest Order"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={getDirectClientWhatsAppUrl({
                            phone: c.phone,
                            name: c.name,
                            type: 'order',
                            orderId: formatOrderRef(c.latestOrder.id),
                            status: c.latestOrder.status,
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-emerald-50 hover:bg-[#1EBE5D] text-emerald-600 hover:text-white transition-colors"
                          title="WhatsApp Customer"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 4. MARKETING & ABANDONED CHECKOUT RECOVERY VIEW
// ============================================================================
export const MarketingRecoveryView: React.FC<{
  abandonedLeads: any[];
  loadingLeads: boolean;
  analytics: AnalyticsSummary;
  onRecoverLead: (leadId: string) => void;
}> = ({ abandonedLeads, loadingLeads, analytics, onRecoverLead }) => {
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [leadFilter, setLeadFilter] = useState<'all' | 'unrecovered' | 'recovered'>('all');

  const filteredLeads = useMemo(() => {
    const q = leadSearchQuery.toLowerCase().trim();
    return abandonedLeads.filter((l) => {
      const matchesSearch =
        !q ||
        l.id?.toLowerCase().includes(q) ||
        l.customer_name?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        l.company?.toLowerCase().includes(q);
      const matchesRecovery =
        leadFilter === 'all' ? true : leadFilter === 'recovered' ? l.recovered : !l.recovered;
      return matchesSearch && matchesRecovery;
    });
  }, [abandonedLeads, leadSearchQuery, leadFilter]);

  return (
    <div className="space-y-5 animate-admin-fade-up">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-[0_2px_12px_-4px_rgba(7,27,53,0.06)] flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-display font-bold text-lg text-[#071B35]">
            Abandoned Checkout Recovery Queue
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl">
            Buyers who started checkout and entered phone or email without completing payment. Follow up quickly via WhatsApp to convert them.
          </p>
        </div>
        <div className="text-left sm:text-right font-mono tabular-nums">
          <div className="text-xs text-slate-500">At-Risk Value</div>
          <div className="text-2xl font-bold text-[#FF7900]">
            ₹<AnimatedCounter value={analytics.abandonedValueAtRisk} />
          </div>
          <div className="text-xs text-slate-500">
            {analytics.unrecoveredCount} pending · {analytics.recoveryRate}% recovered
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search leads by Name, Phone, Email, Company..."
            value={leadSearchQuery}
            onChange={(e) => setLeadSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#071B35] placeholder:text-slate-400 focus:border-[#FF7900] focus:bg-white outline-none transition-colors"
          />
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
          {(
            [
              { id: 'all', label: `All (${abandonedLeads.length})` },
              { id: 'unrecovered', label: `Pending (${analytics.unrecoveredCount})` },
              { id: 'recovered', label: `Recovered (${analytics.recoveredCount})` },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setLeadFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors ${
                leadFilter === f.id
                  ? 'bg-[#FF7900] text-white font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-[#071B35]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loadingLeads ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 space-y-2">
          <UserCheck className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="font-semibold text-[#071B35] text-base">No Abandoned Leads Found</h3>
          <p className="text-xs text-slate-500">
            Incomplete checkout attempts automatically appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLeads.map((lead) => {
            const leadPhone = lead.phone || '';
            const leadName = lead.customer_name || 'Prospective Buyer';
            const cartItems = Array.isArray(lead.cart_items) ? lead.cart_items : [];
            return (
              <div
                key={lead.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs hover:shadow-md transition-shadow"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          lead.recovered
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {lead.recovered ? 'Recovered' : 'Pending Recovery'}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500 font-mono tabular-nums">
                        {lead.updated_at
                          ? new Date(lead.updated_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Recently active'}
                      </span>
                      {lead.company && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-700 font-medium">{lead.company}</span>
                        </>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-[#071B35] pt-0.5">
                      {leadName}{' '}
                      {leadPhone && (
                        <span className="font-mono text-xs text-slate-500 font-normal">
                          · {leadPhone}
                        </span>
                      )}
                      {lead.email && (
                        <span className="text-xs text-slate-500 font-normal ml-2">
                          ({lead.email})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono tabular-nums font-bold text-sm text-[#071B35] mr-2">
                      ₹{Number(lead.cart_total || 0).toLocaleString('en-IN')}
                    </span>
                    {leadPhone && (
                      <a
                        href={getDirectClientWhatsAppUrl({
                          phone: leadPhone,
                          name: leadName,
                          type: 'abandoned',
                          cartTotal: lead.cart_total,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-[#1EBE5D] hover:bg-[#19a851] text-white text-xs font-semibold flex items-center gap-1.5 min-h-[40px] transition-colors"
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5 text-white" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                    {leadPhone && !lead.recovered && (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await sendCheckoutDropRecoveryWhatsApp({
                            checkoutSessionId: `admin_${lead.id}_${Date.now()}`,
                            customerName: leadName,
                            phone: leadPhone,
                            cartTotal: Number(lead.cart_total || 0),
                            couponCode: 'SAVE5NOW',
                            discountPercent: 5,
                            validMinutes: 15,
                            triggerReason: 'admin_followup',
                          });
                          if (typeof window !== 'undefined') {
                            window.dispatchEvent(
                              new CustomEvent('teqqno:admin-toast', {
                                detail: {
                                  type: res.success ? 'success' : 'error',
                                  message: res.message,
                                },
                              })
                            );
                          }
                        }}
                        className="px-3 py-2 rounded-xl bg-[#FF7900]/10 hover:bg-[#FF7900] text-[#FF7900] hover:text-white border border-[#FF7900]/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer min-h-[40px] transition-colors"
                        title="Send Limited-Time 5% OFF Coupon (SAVE5NOW) via AiSensy WhatsApp API"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Send 5% OFF (AiSensy)</span>
                      </button>
                    )}
                    {!lead.recovered && (
                      <button
                        onClick={() => onRecoverLead(lead.id)}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#071B35] text-xs font-medium flex items-center gap-1.5 cursor-pointer min-h-[40px] transition-colors"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Mark Recovered</span>
                      </button>
                    )}
                  </div>
                </div>

                {cartItems.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {cartItems.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                      >
                        <OrderThumb src={item.previewUrl || null} alt={item.productName || 'Item'} sizeClass="w-10 h-10" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-[#071B35] truncate">
                            {item.productName || 'Custom Item'}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                            Qty: {item.quantity} · ₹
                            {Number(item.totalPrice || item.unitPrice * item.quantity || 0).toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 5. REPORTS & ANALYTICS VIEW
// ============================================================================
export const ReportsAnalyticsView: React.FC<{
  orders: CustomOrderRow[];
  analytics: AnalyticsSummary;
  onExportCsv: () => void;
}> = ({ orders, analytics, onExportCsv }) => {
  const dailySeries = useMemo(() => buildDailyTrendSeries(orders, 7), [orders]);
  const maxRevenue = Math.max(...dailySeries.map((d) => d.revenue), 1);

  return (
    <div className="space-y-6 animate-admin-fade-up">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-1.5 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Estimated Gross Value</span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-display font-bold text-2xl sm:text-3xl text-[#071B35] font-mono tabular-nums">
            ₹<AnimatedCounter value={analytics.totalRevenue} />
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums">
            Avg Order: ₹{analytics.aov.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-1.5 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Paid Online (Prepaid/50%)</span>
            <CreditCard className="w-4 h-4 text-[#FF7900]" />
          </div>
          <div className="font-display font-bold text-2xl sm:text-3xl text-emerald-600 font-mono tabular-nums">
            ₹<AnimatedCounter value={analytics.totalPaidRecorded} />
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums">
            Remaining Balance: ₹{analytics.totalBalanceRecorded.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-1.5 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Checkout Conversion</span>
            <TrendingUp className="w-4 h-4 text-sky-600" />
          </div>
          <div className="font-display font-bold text-2xl sm:text-3xl text-[#071B35] font-mono tabular-nums">
            {analytics.conversionRate}%
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums">
            {analytics.totalOrdersCount} placed / {analytics.totalOrdersCount + analytics.totalAbandonedCount} sessions
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-1.5 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Abandoned Value</span>
            <ShoppingCart className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-display font-bold text-2xl sm:text-3xl text-amber-600 font-mono tabular-nums">
            ₹<AnimatedCounter value={analytics.abandonedValueAtRisk} />
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums">
            {analytics.unrecoveredCount} pending · {analytics.recoveryRate}% recovery rate
          </div>
        </div>
      </div>

      {/* 7-Day Revenue Chart */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold text-base text-[#071B35]">
              7-Day Revenue Performance
            </h3>
            <p className="text-xs text-slate-500">Daily custom order value trend in INR</p>
          </div>
          <button
            onClick={onExportCsv}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-[#FF7900] text-xs font-semibold text-[#071B35] flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#FF7900]" />
            <span>Export Orders CSV</span>
          </button>
        </div>

        <div className="grid grid-cols-7 gap-3 items-end h-44 pt-4 border-b border-slate-100 pb-2">
          {dailySeries.map((day) => {
            const pct = day.revenue > 0 ? Math.max(14, Math.round((day.revenue / maxRevenue) * 100)) : 5;
            return (
              <div key={day.label} className="flex flex-col items-center justify-end h-full gap-1.5">
                <div className="text-[10px] font-mono text-slate-500 tabular-nums">
                  {day.revenue > 0 ? `₹${day.revenue.toLocaleString('en-IN')}` : '₹0'}
                </div>
                <div className="w-full max-w-[44px] flex-1 flex items-end bg-slate-100 rounded-xl p-0.5">
                  <div
                    className={`w-full rounded-lg transition-all duration-500 ${
                      day.revenue > 0 ? 'bg-gradient-to-t from-[#071B35] to-[#1E477A]' : 'bg-slate-200/70'
                    }`}
                    style={{ height: `${pct}%` }}
                  />
                </div>
                <div className="text-[10px] font-medium text-slate-500">{day.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pipeline + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
          <div>
            <h3 className="font-display font-bold text-base text-[#071B35]">
              Order Fulfillment Pipeline
            </h3>
            <p className="text-xs text-slate-500">
              Live distribution across production &amp; Delhivery shipping stages
            </p>
          </div>
          <div className="space-y-3">
            {(Object.keys(STATUS_META) as OrderStatus[]).map((st) => {
              const count = analytics.statusCounts[st];
              const pct =
                analytics.totalOrdersCount > 0
                  ? Math.round((count / analytics.totalOrdersCount) * 100)
                  : 0;
              return (
                <div key={st} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#071B35] font-medium">{STATUS_META[st].label}</span>
                    <span className="font-mono tabular-nums text-slate-500">
                      {count} orders ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${STATUS_META[st].barClass}`}
                      style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
          <div>
            <h3 className="font-display font-bold text-base text-[#071B35]">
              Top Custom Products
            </h3>
            <p className="text-xs text-slate-500">Ranked by estimated order volume and revenue</p>
          </div>
          {analytics.topProducts.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              Product rankings will populate once orders are recorded.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {analytics.topProducts.map((p, idx) => (
                <div key={p.name} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono tabular-nums text-slate-400 w-5">0{idx + 1}.</span>
                    <div className="min-w-0">
                      <div className="font-semibold text-[#071B35] truncate">{p.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                        {p.orders} orders · {p.units} units
                      </div>
                    </div>
                  </div>
                  <div className="font-mono tabular-nums font-bold text-emerald-600 shrink-0">
                    ₹{p.revenue.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 6. DELHIVERY DISPATCH & PICKUP CONSOLE
// ============================================================================
export const DispatchCenterView: React.FC<{
  delhiveryStatus: DelhiveryStatus | null;
  readyToShipOrders: CustomOrderRow[];
  activeAwbOrders: CustomOrderRow[];
  diagPickupName: string;
  setDiagPickupName: (v: string) => void;
  pickupDateInput: string;
  setPickupDateInput: (v: string) => void;
  pickupTimeInput: string;
  setPickupTimeInput: (v: string) => void;
  pickupPkgCount: number;
  setPickupPkgCount: (v: number) => void;
  schedulingPickup: boolean;
  pickupResult: { success: boolean; message: string } | null;
  onSchedulePickup: () => void;
  quickTrackAwb: string;
  setQuickTrackAwb: (v: string) => void;
  loadingQuickTrack: boolean;
  quickTrackResult: DelhiveryTrackResponse | null;
  onQuickTrackLookup: (e: React.FormEvent) => void;
  testPinInput: string;
  setTestPinInput: (v: string) => void;
  testingPin: boolean;
  testPinResult: DelhiveryPincodeCheckResult | null;
  onTestDelhiveryPin: () => void;
  onOpenDispatchModal: (o: CustomOrderRow) => void;
  onTrackDelhiveryOrder: (awb: string) => void;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
}> = ({
  delhiveryStatus,
  readyToShipOrders,
  activeAwbOrders,
  diagPickupName,
  setDiagPickupName,
  pickupDateInput,
  setPickupDateInput,
  pickupTimeInput,
  setPickupTimeInput,
  pickupPkgCount,
  setPickupPkgCount,
  schedulingPickup,
  pickupResult,
  onSchedulePickup,
  quickTrackAwb,
  setQuickTrackAwb,
  loadingQuickTrack,
  quickTrackResult,
  onQuickTrackLookup,
  testPinInput,
  setTestPinInput,
  testingPin,
  testPinResult,
  onTestDelhiveryPin,
  onOpenDispatchModal,
  onTrackDelhiveryOrder,
  onStatusChange,
}) => {
  return (
    <div className="space-y-6 animate-admin-fade-up">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display font-bold text-base text-[#071B35]">
                Schedule Delhivery Pickup
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Book pickup rider for your Hyderabad fulfillment facilities
              </p>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border ${
                delhiveryStatus?.configured
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {delhiveryStatus?.configured ? 'API Active' : 'Token Pending'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Warehouse Facility</label>
              <select
                value={diagPickupName}
                onChange={(e) => setDiagPickupName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-[#071B35] outline-none focus:border-[#FF7900]"
              >
                <option value="Teqqnoworld">Teqqnoworld (Hyderabad - 502032)</option>
                <option value="Teqqnoworld 2">Teqqnoworld 2 (Hyderabad - 500090)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Pickup Date</label>
              <input
                type="date"
                value={pickupDateInput}
                onChange={(e) => setPickupDateInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-[#071B35] font-mono outline-none focus:border-[#FF7900]"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Pickup Slot</label>
              <select
                value={pickupTimeInput}
                onChange={(e) => setPickupTimeInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-[#071B35] font-mono outline-none focus:border-[#FF7900]"
              >
                <option value="11:00:00">11:00 AM - 02:00 PM</option>
                <option value="14:00:00">02:00 PM - 05:00 PM</option>
                <option value="17:00:00">05:00 PM - 07:00 PM</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Package Count</label>
              <input
                type="number"
                min={1}
                value={pickupPkgCount}
                onChange={(e) => setPickupPkgCount(Number(e.target.value) || 1)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-[#071B35] font-mono outline-none focus:border-[#FF7900]"
              />
            </div>
          </div>

          {pickupResult && (
            <div
              className={`p-3 rounded-xl border text-xs ${
                pickupResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {pickupResult.message}
            </div>
          )}

          <button
            onClick={onSchedulePickup}
            disabled={schedulingPickup}
            className="w-full py-2.5 px-4 rounded-xl bg-[#FF7900] hover:bg-[#e56d00] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[42px] transition-colors"
          >
            {schedulingPickup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
            <span>{schedulingPickup ? 'Scheduling...' : 'Request Delhivery Pickup'}</span>
          </button>
        </div>

        <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="space-y-3">
            <h2 className="font-display font-bold text-base text-[#071B35]">
              Quick AWB Tracker &amp; Pincode Check
            </h2>
            <form onSubmit={onQuickTrackLookup} className="flex items-center gap-2">
              <input
                type="text"
                value={quickTrackAwb}
                onChange={(e) => setQuickTrackAwb(e.target.value)}
                placeholder="Enter Delhivery Waybill / AWB number..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-mono text-[#071B35] outline-none focus:border-[#FF7900]"
              />
              <button
                type="submit"
                disabled={loadingQuickTrack}
                className="px-4 py-2.5 rounded-xl bg-[#071B35] hover:bg-[#0d2a52] text-white text-xs font-semibold cursor-pointer disabled:opacity-50 whitespace-nowrap transition-colors"
              >
                {loadingQuickTrack ? 'Tracking...' : 'Track AWB'}
              </button>
            </form>
            {quickTrackResult && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Waybill: {quickTrackResult.waybill}</span>
                  <span className="font-semibold text-emerald-700">
                    {quickTrackResult.currentStatus || 'Pending'}
                  </span>
                </div>
                {quickTrackResult.statusLocation && (
                  <div className="text-slate-700">Location: {quickTrackResult.statusLocation}</div>
                )}
                {quickTrackResult.message && !quickTrackResult.success && (
                  <div className="text-amber-700">{quickTrackResult.message}</div>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="text-xs font-semibold text-[#071B35]">
              Verify Customer Delivery Pincode (Prepaid Serviceability)
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                maxLength={6}
                value={testPinInput}
                onChange={(e) => setTestPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="6-digit pincode"
                className="w-40 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-mono text-[#071B35] outline-none focus:border-[#FF7900]"
              />
              <button
                onClick={onTestDelhiveryPin}
                disabled={testingPin}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#071B35] text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors"
              >
                {testingPin ? 'Checking...' : 'Check Pincode'}
              </button>
            </div>
            {testPinResult && (
              <div
                className={`p-3 rounded-xl border text-xs font-mono ${
                  testPinResult.serviceable
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {testPinResult.message}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-base text-[#071B35]">
              Ready to Manifest ({readyToShipOrders.length})
            </h3>
            <span className="text-xs text-slate-500">Awaiting AWB</span>
          </div>
          {readyToShipOrders.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              All active orders have waybills assigned.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {readyToShipOrders.map((o) => {
                const parsed = parseOrderNotes(o.custom_notes);
                const { product } = getOrderEstimates(o);
                return (
                  <div key={o.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-[#FF7900]">
                        #{formatOrderRef(o.id)}
                        <span className="text-[#071B35] font-sans font-semibold ml-2">
                          {o.customer_name}
                        </span>
                      </div>
                      <div className="text-slate-500 truncate mt-0.5">
                        {product?.name || o.product_id} ({o.quantity} pcs)
                        {parsed.parsedAddress.city
                          ? ` · ${parsed.parsedAddress.city} ${parsed.parsedAddress.pincode}`
                          : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => onOpenDispatchModal(o)}
                      className="px-3 py-2 rounded-xl bg-[#FF7900] hover:bg-[#e56d00] text-white text-xs font-semibold shrink-0 cursor-pointer transition-colors"
                    >
                      Book AWB
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-base text-[#071B35]">
              Manifested Shipments ({activeAwbOrders.length})
            </h3>
            <span className="text-xs text-slate-500">Labels &amp; Live Tracking</span>
          </div>
          {activeAwbOrders.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              Shipped orders with Delhivery waybills will appear here.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeAwbOrders.map((o) => (
                <div
                  key={o.id}
                  className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-mono font-bold text-[#071B35]">
                      {o.tracking_number}
                      <span className="text-slate-500 font-sans font-normal ml-2">
                        · {o.customer_name}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      #{formatOrderRef(o.id)} · {o.courier_partner || 'Delhivery'} ·{' '}
                      {STATUS_META[o.status].label}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onTrackDelhiveryOrder(o.tracking_number!)}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-semibold cursor-pointer border border-amber-200"
                    >
                      Track
                    </button>
                    <a
                      href={getDelhiveryLabelUrl(o.tracking_number!)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold inline-flex items-center gap-1 border border-emerald-200"
                    >
                      <Printer className="w-3 h-3" />
                      <span>Label PDF</span>
                    </a>
                    {o.status !== 'delivered' && (
                      <button
                        onClick={() => onStatusChange(o.id, 'delivered')}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-600 text-slate-700 hover:text-white text-[11px] font-semibold cursor-pointer transition-colors"
                      >
                        Mark Delivered
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 7. INTEGRATIONS & SETUP VIEW
// ============================================================================
export const IntegrationsSetupView: React.FC<{
  smtpStatus: SmtpStatusResponse | null;
  razorpayStatus: RazorpayStatus | null;
  delhiveryStatus: DelhiveryStatus | null;
  aisensyStatus: AiSensyStatusResponse | null;
  aisensyLogs: WhatsAppDispatchLogItem[];
  testWaPhone: string;
  setTestWaPhone: (v: string) => void;
  testingAiSensy: boolean;
  aisensyTestResult: { success: boolean; message: string } | null;
  onTestAiSensy: (testType?: 'order_confirmation' | 'checkout_drop_5off') => void;
  onRefreshAiSensyLogs: () => void;
  testEmailInput: string;
  setTestEmailInput: (v: string) => void;
  testingSmtp: boolean;
  smtpTestResult: { success: boolean; message: string } | null;
  onTestSmtpEmail: () => void;
  testingRazorpay: boolean;
  razorpayTestResult: { success: boolean; message: string } | null;
  onVerifyRazorpay: () => void;
  onOpenDispatchTab: () => void;
}> = ({
  smtpStatus,
  razorpayStatus,
  delhiveryStatus,
  aisensyStatus,
  aisensyLogs,
  testWaPhone,
  setTestWaPhone,
  testingAiSensy,
  aisensyTestResult,
  onTestAiSensy,
  onRefreshAiSensyLogs,
  testEmailInput,
  setTestEmailInput,
  testingSmtp,
  smtpTestResult,
  onTestSmtpEmail,
  testingRazorpay,
  razorpayTestResult,
  onVerifyRazorpay,
  onOpenDispatchTab,
}) => {
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const webhookFullUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${aisensyStatus?.webhookPath || '/api/aisensy/webhook'}`
      : 'https://teqqnoworld.com/api/aisensy/webhook';

  return (
    <div className="space-y-6 animate-admin-fade-up">
      {/* AiSensy WhatsApp Business Automation Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-bold text-base text-[#071B35] flex items-center gap-2">
              <WhatsAppIcon className="w-5 h-5 text-[#1EBE5D]" />
              <span>AiSensy WhatsApp API (Order Confirm/Cancel &amp; 5% OFF Checkout Saver)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Auto-sends WhatsApp order confirmations with Confirm/Cancel options AND limited-time 5% OFF coupon (SAVE5NOW) if buyer cancels payment or backs out at checkout.
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border ${
              aisensyStatus?.configured
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {aisensyStatus?.configured ? 'AISENSY LIVE CONNECTED' : 'SIMULATION MODE (ADD AISENSY_API_KEY)'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <div className="text-[11px] text-slate-500">Order Confirmation Campaign</div>
            <div className="font-mono font-semibold text-[#071B35] mt-1 truncate">
              {aisensyStatus?.orderConfirmCampaign || 'order_confirmation_action'}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <div className="text-[11px] text-slate-500">5% OFF Drop Campaign</div>
            <div className="font-mono font-semibold text-[#FF7900] mt-1 truncate">
              {aisensyStatus?.checkoutDropCampaign || 'checkout_drop_5_off'}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <div className="text-[11px] text-slate-500">Incoming Webhook URL (For Quick Replies)</div>
            <div className="flex items-center justify-between gap-2 mt-1">
              <span className="font-mono text-[11px] text-[#071B35] truncate">{webhookFullUrl}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(webhookFullUrl);
                  setCopiedWebhook(true);
                  setTimeout(() => setCopiedWebhook(false), 2500);
                }}
                className="text-[#FF7900] hover:underline font-semibold shrink-0 cursor-pointer"
              >
                {copiedWebhook ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-wrap">
          <input
            type="tel"
            value={testWaPhone}
            onChange={(e) => setTestWaPhone(e.target.value)}
            placeholder="Enter 10-digit WhatsApp number for AiSensy test..."
            className="flex-1 min-w-[200px] bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-mono text-[#071B35] focus:border-[#FF7900] focus:bg-white outline-none"
          />
          <button
            type="button"
            onClick={() => onTestAiSensy('order_confirmation')}
            disabled={testingAiSensy}
            className="bg-[#1EBE5D] hover:bg-[#19a851] text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{testingAiSensy ? 'Sending...' : 'Test Order Confirm'}</span>
          </button>
          <button
            type="button"
            onClick={() => onTestAiSensy('checkout_drop_5off')}
            disabled={testingAiSensy}
            className="bg-[#FF7900] hover:bg-[#e56d00] text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{testingAiSensy ? 'Sending...' : 'Test 5% OFF Drop'}</span>
          </button>
          <button
            type="button"
            onClick={onRefreshAiSensyLogs}
            className="bg-slate-100 hover:bg-slate-200 text-[#071B35] text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer transition-colors"
          >
            Refresh Logs ({aisensyLogs.length})
          </button>
        </div>

        {aisensyTestResult && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
              aisensyTestResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {aisensyTestResult.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{aisensyTestResult.message}</span>
          </div>
        )}

        {aisensyLogs.length > 0 && (
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <div className="text-[11px] font-bold text-[#071B35] uppercase tracking-wider">
              Recent AiSensy WhatsApp Events &amp; Confirm/Cancel Activity
            </div>
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {aisensyLogs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs space-y-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#071B35]">+{log.phone}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                        {log.type}
                      </span>
                      {log.orderNumber && (
                        <span className="text-[10px] font-mono font-bold text-[#FF7900]">
                          #{log.orderNumber}
                        </span>
                      )}
                      {log.couponCode && (
                        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          {log.couponCode}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {log.status.toUpperCase()} · {new Date(log.createdAt).toLocaleTimeString('en-IN')}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 line-clamp-2 whitespace-pre-line">
                    {log.messagePreview}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hostinger SMTP Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-bold text-base text-[#071B35] flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#FF7900]" />
              <span>Order Email Notifications (Hostinger SMTP)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Dispatches confirmation &amp; placed artwork mockups to customer and admin ({smtpStatus?.adminEmail || 'teqqnoworld@gmail.com'}).
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border ${
              smtpStatus?.configured
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {smtpStatus?.configured ? 'LIVE SMTP CONNECTED' : 'CREDENTIALS MISSING'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <div className="text-[11px] text-slate-500">SMTP Host &amp; Port</div>
            <div className="font-mono font-semibold text-[#071B35] mt-1">
              {smtpStatus ? `${smtpStatus.host}:${smtpStatus.port}` : 'smtp.hostinger.com:465'}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <div className="text-[11px] text-slate-500">Sender Email</div>
            <div className="font-mono font-semibold text-[#071B35] mt-1 truncate">
              {smtpStatus?.senderEmail || '(not set)'}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <div className="text-[11px] text-slate-500">Admin Alert Email</div>
            <div className="font-mono font-semibold text-emerald-700 mt-1 truncate">
              {smtpStatus?.adminEmail || 'teqqnoworld@gmail.com'}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="email"
            value={testEmailInput}
            onChange={(e) => setTestEmailInput(e.target.value)}
            placeholder="Enter email for test delivery..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs text-[#071B35] focus:border-[#FF7900] focus:bg-white outline-none"
          />
          <button
            onClick={onTestSmtpEmail}
            disabled={testingSmtp}
            className="bg-[#FF7900] hover:bg-[#e56d00] text-white text-xs font-semibold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{testingSmtp ? 'Testing...' : 'Send Test Email'}</span>
          </button>
        </div>

        {smtpTestResult && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
              smtpTestResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {smtpTestResult.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{smtpTestResult.message}</span>
          </div>
        )}
      </div>

      {/* Razorpay + Delhivery Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display font-bold text-base text-[#071B35] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#FF7900]" />
              <span>Razorpay Payment Gateway</span>
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-mono font-semibold border ${
                razorpayStatus?.configured
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {razorpayStatus?.configured
                ? razorpayStatus.mode === 'test'
                  ? 'TEST MODE CONNECTED'
                  : 'LIVE CONNECTED'
                : 'AWAITING KEYS'}
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Checkout enforces <strong className="text-[#071B35]">100% Full Prepaid</strong> and{' '}
            <strong className="text-[#071B35]">50% Partial Advance</strong> (Zero COD). Keys are loaded securely on the Express server via{' '}
            <code className="text-[#071B35] bg-slate-100 px-1 py-0.5 rounded">RAZORPAY_KEY_ID</code> &amp;{' '}
            <code className="text-[#071B35] bg-slate-100 px-1 py-0.5 rounded">RAZORPAY_KEY_SECRET</code>.
          </p>
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] text-slate-500">Active Key ID</div>
              <div className="font-mono font-semibold text-[#071B35] mt-0.5">
                {razorpayStatus?.keyId || '(not set — sandbox fallback active)'}
              </div>
            </div>
            <button
              onClick={onVerifyRazorpay}
              disabled={testingRazorpay}
              className="px-3.5 py-2 rounded-lg bg-[#071B35] hover:bg-[#FF7900] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {testingRazorpay ? 'Verifying...' : 'Verify Live API'}
            </button>
          </div>
          {razorpayTestResult && (
            <div
              className={`p-3 rounded-xl text-xs font-medium border ${
                razorpayTestResult.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {razorpayTestResult.message}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display font-bold text-base text-[#071B35] flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#FF7900]" />
              <span>Delhivery One Logistics (Prepaid)</span>
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-mono font-semibold border ${
                delhiveryStatus?.configured
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {delhiveryStatus?.configured ? 'LIVE API CONNECTED' : 'TOKEN MISSING'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            {(delhiveryStatus?.pickups || [
              { name: 'Teqqnoworld', city: 'Hyderabad', state: 'Telangana', pin: '502032' },
              { name: 'Teqqnoworld 2', city: 'Hyderabad', state: 'Telangana', pin: '500090' },
            ]).map((wh) => (
              <div key={wh.name} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                <div className="font-semibold text-[#071B35]">{wh.name}</div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {wh.city} · {wh.pin}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={onOpenDispatchTab}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-[#071B35] hover:text-white text-xs font-semibold text-[#071B35] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <span>Open Delhivery Dispatch &amp; Pickup Console</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Supabase PostgreSQL Schema */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-bold text-base text-[#071B35]">
              Supabase PostgreSQL Schema &amp; RLS Setup
            </h3>
            <p className="text-xs text-slate-500">
              Run this SQL script in Supabase SQL Editor to ensure custom_orders, abandoned_checkouts, and courier tracking columns exist.
            </p>
          </div>
          <button
            onClick={() => {
              const sql = `-- 1. CUSTOM ORDERS TABLE WITH COURIER DISPATCH
CREATE TABLE IF NOT EXISTS public.custom_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    company TEXT,
    phone TEXT NOT NULL,
    product_id TEXT,
    quantity INTEGER NOT NULL CHECK (quantity >= 1),
    logo_url TEXT,
    custom_notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in-production', 'dispatched', 'delivered')),
    courier_partner TEXT,
    tracking_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.custom_orders ADD COLUMN IF NOT EXISTS courier_partner TEXT;
ALTER TABLE public.custom_orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;

-- 2. ABANDONED CHECKOUTS RECOVERY TABLE
CREATE TABLE IF NOT EXISTS public.abandoned_checkouts (
    id TEXT PRIMARY KEY,
    customer_name TEXT,
    email TEXT,
    phone TEXT,
    company TEXT,
    cart_items JSONB DEFAULT '[]'::jsonb,
    cart_total NUMERIC(10, 2) DEFAULT 0,
    recovered BOOLEAN DEFAULT FALSE,
    recovered_at TIMESTAMPTZ,
    order_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.custom_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert custom_orders" ON public.custom_orders FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public select custom_orders" ON public.custom_orders FOR SELECT TO public USING (true);
CREATE POLICY "Public update custom_orders" ON public.custom_orders FOR UPDATE TO public USING (true);

ALTER TABLE public.abandoned_checkouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all abandoned_checkouts" ON public.abandoned_checkouts FOR ALL TO public USING (true) WITH CHECK (true);`;
              navigator.clipboard.writeText(sql);
              setCopiedSql(true);
              setTimeout(() => setCopiedSql(false), 3000);
            }}
            className="bg-[#FF7900] hover:bg-[#e56d00] text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
          >
            {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedSql ? 'Copied SQL Script' : 'Copy Supabase SQL'}</span>
          </button>
        </div>

        <pre className="bg-[#071B35] border border-slate-800 rounded-xl p-4 text-[11px] font-mono text-slate-200 overflow-x-auto max-h-72 leading-relaxed">
{`-- 1. CUSTOM ORDERS TABLE WITH COURIER DISPATCH
CREATE TABLE IF NOT EXISTS public.custom_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    company TEXT,
    phone TEXT NOT NULL,
    product_id TEXT,
    quantity INTEGER NOT NULL CHECK (quantity >= 1),
    logo_url TEXT,
    custom_notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in-production', 'dispatched', 'delivered')),
    courier_partner TEXT,
    tracking_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);`}
        </pre>
      </div>
    </div>
  );
};
