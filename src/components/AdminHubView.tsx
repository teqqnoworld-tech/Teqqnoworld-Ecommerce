import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  IndianRupee, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Search, 
  Filter, 
  RefreshCw, 
  Copy, 
  Check, 
  ExternalLink, 
  Eye, 
  Phone, 
  Mail, 
  Building2, 
  Sparkles, 
  ArrowUpRight, 
  BarChart3, 
  Layers, 
  Download, 
  ChevronDown, 
  LogOut, 
  ArrowLeft,
  X,
  FileText,
  UserCheck,
  Send,
  HelpCircle
} from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import { 
  CustomOrderRow, 
  OrderStatus, 
  isSupabaseConfigured, 
  getSupabaseConfig 
} from '../lib/supabase';
import { 
  fetchCustomOrdersFromSupabase, 
  updateCustomOrderStatus, 
  fetchAbandonedCheckoutsFromSupabase,
  markCheckoutRecovered 
} from '../services/supabaseService';
import { sendOrderConfirmationEmail, getSmtpStatus, sendTestEmail, SmtpStatusResponse } from '../services/emailService';
import { generateAdminOrderInvoicePdf } from '../utils/pdfGenerator';
import { getDirectClientWhatsAppUrl } from '../utils/whatsapp';
import { PRODUCTS } from '../data/mockData';

interface AdminHubViewProps {
  onBackToStore: () => void;
  onNavigateToOrderTracking?: (orderNumber: string) => void;
}

const DEFAULT_PIN = '9949';

export const AdminHubView: React.FC<AdminHubViewProps> = ({
  onBackToStore,
  onNavigateToOrderTracking,
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('teqqno_admin_auth') === 'true';
    } catch {
      return false;
    }
  });
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Dashboard Active Tab
  const [activeTab, setActiveTab] = useState<'orders' | 'abandoned' | 'analytics' | 'schema'>('orders');

  // Live Orders State
  const [orders, setOrders] = useState<CustomOrderRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [updateSuccessToast, setUpdateSuccessToast] = useState<string | null>(null);

  // Abandoned Checkouts State
  const [abandonedLeads, setAbandonedLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState<boolean>(false);
  const [leadSearchQuery, setLeadSearchQuery] = useState<string>('');
  const [leadFilter, setLeadFilter] = useState<'all' | 'unrecovered' | 'recovered'>('all');

  // Modals & Previews
  const [previewLogoUrl, setPreviewLogoUrl] = useState<string | null>(null);
  const [editingDispatchOrder, setEditingDispatchOrder] = useState<CustomOrderRow | null>(null);
  const [courierInput, setCourierInput] = useState<string>('Blue Dart Apex Express');
  const [awbInput, setAwbInput] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [sendingEmailOrderId, setSendingEmailOrderId] = useState<string | null>(null);
  const [smtpStatus, setSmtpStatus] = useState<SmtpStatusResponse | null>(null);
  const [testEmailInput, setTestEmailInput] = useState<string>('teqqnoworld@gmail.com');
  const [testingSmtp, setTestingSmtp] = useState<boolean>(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Data Fetching
  const loadData = async () => {
    setLoadingOrders(true);
    setLoadingLeads(true);

    try {
      const [ordersRes, leadsRes, smtpRes] = await Promise.all([
        fetchCustomOrdersFromSupabase(),
        fetchAbandonedCheckoutsFromSupabase(),
        getSmtpStatus(),
      ]);

      setOrders(ordersRes.data || []);
      setAbandonedLeads(leadsRes.data || []);
      setSmtpStatus(smtpRes);
    } catch (err) {
      console.error('[AdminHub Load Error]:', err);
    } finally {
      setLoadingOrders(false);
      setLoadingLeads(false);
    }
  };

  const handleTestSmtpEmail = async () => {
    setTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await sendTestEmail(testEmailInput.trim() || undefined);
      setSmtpTestResult({ success: res.success, message: res.message });
    } finally {
      setTestingSmtp(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  // Handle PIN Unlock
  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (enteredPin === DEFAULT_PIN) {
      setIsAuthenticated(true);
      setPinError(null);
      try {
        localStorage.setItem('teqqno_admin_auth', 'true');
      } catch {}
    } else {
      setPinError('Incorrect Master PIN. Use 9949 to access.');
    }
  };

  const handleLock = () => {
    setIsAuthenticated(false);
    setEnteredPin('');
    try {
      localStorage.removeItem('teqqno_admin_auth');
    } catch {}
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Status Change Handler
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const order = orders.find(o => o.id === orderId);
      const res = await updateCustomOrderStatus(
        orderId, 
        newStatus, 
        order?.courier_partner || null, 
        order?.tracking_number || null
      );

      if (res.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        setUpdateSuccessToast(`Order #${orderId.slice(0, 8)} status updated to "${newStatus}"!`);
        setTimeout(() => setUpdateSuccessToast(null), 3000);
      } else {
        alert(`Failed to update status: ${res.error}`);
      }
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Dispatch Details Save Handler
  const handleSaveDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDispatchOrder) return;

    setUpdatingOrderId(editingDispatchOrder.id);
    try {
      const newStatus: OrderStatus = 'dispatched';
      const res = await updateCustomOrderStatus(
        editingDispatchOrder.id, 
        newStatus, 
        courierInput, 
        awbInput
      );

      if (res.success) {
        setOrders(prev => prev.map(o => o.id === editingDispatchOrder.id ? {
          ...o,
          status: newStatus,
          courier_partner: courierInput,
          tracking_number: awbInput
        } : o));
        setUpdateSuccessToast(`Order #${editingDispatchOrder.id.slice(0, 8)} marked Dispatched via ${courierInput}!`);
        setTimeout(() => setUpdateSuccessToast(null), 3000);
        setEditingDispatchOrder(null);
      } else {
        alert(`Failed to update courier dispatch: ${res.error}`);
      }
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Mark Abandoned Lead as Recovered
  const handleRecoverLead = async (leadId: string) => {
    await markCheckoutRecovered(leadId, 'MANUAL-RECOVERY');
    setAbandonedLeads(prev => prev.map(l => l.id === leadId ? { ...l, recovered: true } : l));
    setUpdateSuccessToast('Lead marked as Recovered!');
    setTimeout(() => setUpdateSuccessToast(null), 2500);
  };

  // Re-send / Send Order Confirmation Email via Hostinger SMTP
  const handleSendOrderConfirmationEmail = async (order: CustomOrderRow) => {
    if (!order.customer_email) {
      alert('Order does not have a customer email address.');
      return;
    }

    setSendingEmailOrderId(order.id);
    try {
      const prod = PRODUCTS.find(p => p.id === order.product_id);
      const productName = prod?.name || `Custom Product (${order.product_id})`;
      const estimatedPrice = (prod?.basePrice || 250) * (order.quantity || 1);
      const gst = Math.round(estimatedPrice * 0.18);
      const total = estimatedPrice + gst;

      const res = await sendOrderConfirmationEmail({
        orderId: order.id,
        orderNumber: order.id.startsWith('TQ-') ? order.id : `TQ-${order.id.slice(0, 8).toUpperCase()}`,
        customerName: order.customer_name || 'Customer',
        customerEmail: order.customer_email,
        company: order.company || undefined,
        phone: order.phone,
        items: [{
          name: productName,
          quantity: order.quantity || 1,
          price: prod?.basePrice || 250,
          totalPrice: estimatedPrice,
        }],
        subtotal: estimatedPrice,
        gstAmount: gst,
        shippingFee: 0,
        total,
        estimatedDispatch: '24-48h Fast Dispatch',
      });

      if (res.success) {
        setUpdateSuccessToast(
          res.simulated 
            ? `Confirmation email simulated for ${order.customer_email}` 
            : `Email dispatched via Hostinger SMTP to ${order.customer_email}!`
        );
      } else {
        alert(`Failed to send email: ${res.message}`);
      }
    } catch (err: any) {
      alert(`Error sending email: ${err?.message || 'Unknown error'}`);
    } finally {
      setSendingEmailOrderId(null);
      setTimeout(() => setUpdateSuccessToast(null), 3500);
    }
  };

  // Analytics Computation
  const analytics = useMemo(() => {
    // 1. Total Placed Orders
    const totalOrdersCount = orders.length;

    // 2. Total Revenue (Estimating each order based on product base price or quantity)
    let totalRevenue = 0;
    orders.forEach(o => {
      const product = PRODUCTS.find(p => p.id === o.product_id);
      const unitPrice = product?.basePrice || 499;
      const sub = unitPrice * (o.quantity || 1);
      const total = sub + Math.round(sub * 0.18);
      totalRevenue += total;
    });

    // 3. Abandoned Leads
    const totalAbandonedCount = abandonedLeads.length;
    const unrecoveredLeads = abandonedLeads.filter(l => !l.recovered);
    const recoveredCount = abandonedLeads.filter(l => l.recovered).length;

    let abandonedValueAtRisk = 0;
    unrecoveredLeads.forEach(l => {
      abandonedValueAtRisk += Number(l.cart_total || 0);
    });

    // 4. Conversion Rate
    const totalSessionsWithIntent = totalOrdersCount + totalAbandonedCount;
    const conversionRate = totalSessionsWithIntent > 0 
      ? ((totalOrdersCount / totalSessionsWithIntent) * 100).toFixed(1)
      : '0.0';

    const recoveryRate = totalAbandonedCount > 0
      ? ((recoveredCount / totalAbandonedCount) * 100).toFixed(1)
      : '0.0';

    const aov = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;

    return {
      totalOrdersCount,
      totalRevenue,
      totalAbandonedCount,
      unrecoveredCount: unrecoveredLeads.length,
      recoveredCount,
      abandonedValueAtRisk,
      conversionRate,
      recoveryRate,
      aov,
    };
  }, [orders, abandonedLeads]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    const q = orderSearchQuery.toLowerCase().trim();
    return orders.filter(o => {
      const matchesSearch = !q || 
        o.id.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_email?.toLowerCase().includes(q) ||
        o.phone?.includes(q) ||
        o.company?.toLowerCase().includes(q) ||
        (o.tracking_number && o.tracking_number.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, orderSearchQuery, statusFilter]);

  // Filtered Abandoned Leads
  const filteredLeads = useMemo(() => {
    const q = leadSearchQuery.toLowerCase().trim();
    return abandonedLeads.filter(l => {
      const matchesSearch = !q ||
        l.id?.toLowerCase().includes(q) ||
        l.customer_name?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        l.company?.toLowerCase().includes(q);

      const matchesRecovery = 
        leadFilter === 'all' ? true :
        leadFilter === 'recovered' ? l.recovered :
        !l.recovered;

      return matchesSearch && matchesRecovery;
    });
  }, [abandonedLeads, leadSearchQuery, leadFilter]);

  // =========================================================================
  // RENDER: PIN GATE SCREEN (IF NOT AUTHENTICATED)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0B0B0D] text-white flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-[#16171B] border border-zinc-800 rounded-3xl p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
          
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-[#FF7A00]/10 border border-[#FF7A00]/30 text-[#FF7A00] flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#FF7A00] font-bold">
              Business Owner Access
            </span>
            <h1 className="font-display font-black text-2xl tracking-tight text-white">
              TeqqnoWorld Operations Hub
            </h1>
            <p className="text-xs text-zinc-400">
              Enter your master 4-digit PIN to manage live orders, dispatch waybills, and recover abandoned leads.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 text-center">
                Master Security PIN
              </label>
              <input
                type="password"
                maxLength={8}
                autoFocus
                placeholder="••••"
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value)}
                className="w-full text-center tracking-[0.5em] text-2xl font-mono py-3.5 bg-black/60 border border-zinc-700 rounded-2xl text-white focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00] outline-none transition-all placeholder:text-zinc-600"
              />
            </div>

            {pinError && (
              <div className="text-center text-xs text-red-400 bg-red-950/40 border border-red-800/60 py-2 px-3 rounded-xl flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[#FF7A00] hover:bg-[#ff881a] text-white font-bold py-3.5 px-4 rounded-2xl transition-all shadow-lg shadow-[#FF7A00]/20 flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock Admin Hub</span>
            </button>
          </form>

          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span>Default Master PIN: <strong className="text-zinc-300">9949</strong></span>
            <button
              onClick={onBackToStore}
              className="text-[#FF7A00] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Back to Store</span>
              &rarr;
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: FULL ADMIN OPERATIONS HUB
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#0B0B0D] text-zinc-100 flex flex-col font-sans">
      
      {/* Toast Notification */}
      {updateSuccessToast && (
        <div className="fixed top-4 right-4 z-50 bg-[#1EBE5D] text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{updateSuccessToast}</span>
        </div>
      )}

      {/* Top Admin Navigation Header */}
      <header className="border-b border-zinc-800 bg-[#16171B]/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          
          {/* Brand & Hub Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToStore}
              className="p-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Return to Customer Storefront"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-lg sm:text-xl tracking-tight text-white flex items-center gap-2">
                  <span className="text-[#FF7A00]">TEQQNOWORLD</span>
                  <span className="text-zinc-400 font-normal">/</span>
                  <span className="text-zinc-200 text-sm sm:text-base font-bold">OPERATIONS HUB</span>
                </span>
                <span className="text-[10px] font-mono bg-[#FF7A00]/15 text-[#FF7A00] border border-[#FF7A00]/30 px-2 py-0.5 rounded-full font-bold">
                  B2B ADMIN
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Supabase Live Sync ({orders.length} orders · {abandonedLeads.length} leads)</span>
                {smtpStatus && (
                  <button
                    onClick={() => setActiveTab('schema')}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono border cursor-pointer transition-colors ${
                      smtpStatus.configured
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                    }`}
                    title="View Email / SMTP Settings"
                  >
                    {smtpStatus.configured
                      ? 'SMTP: Active'
                      : smtpStatus.backendReachable
                        ? 'SMTP: Simulation (Set .env)'
                        : 'SMTP: Node Server Offline'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Hub Controls */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={loadData}
              disabled={loadingOrders || loadingLeads}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Supabase records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingOrders || loadingLeads ? 'animate-spin text-[#FF7A00]' : ''}`} />
              <span className="hidden sm:inline">Refresh Sync</span>
            </button>

            <button
              onClick={onBackToStore}
              className="px-3.5 py-1.5 rounded-xl bg-[#FF7A00]/15 hover:bg-[#FF7A00]/25 text-[#FF7A00] border border-[#FF7A00]/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Customer Store</span>
            </button>

            <button
              onClick={handleLock}
              className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-800/40 transition-colors cursor-pointer"
              title="Lock Admin Hub"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hub Tabs Strip */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 overflow-x-auto no-scrollbar border-t border-zinc-800/60 pt-1">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'orders'
                ? 'border-[#FF7A00] text-[#FF7A00] bg-zinc-800/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Live Orders</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-300">
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('abandoned')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'abandoned'
                ? 'border-[#FF7A00] text-[#FF7A00] bg-zinc-800/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Abandoned Leads (Drop-offs)</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400">
              {analytics.unrecoveredCount} at risk
            </span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'analytics'
                ? 'border-[#FF7A00] text-[#FF7A00] bg-zinc-800/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Analytics & CRO Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('schema')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'schema'
                ? 'border-[#FF7A00] text-[#FF7A00] bg-zinc-800/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Supabase Schema & SQL</span>
          </button>
        </div>
      </header>

      {/* Main Hub Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* ===================================================================== */}
        {/* TAB 1: LIVE ORDERS */}
        {/* ===================================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            
            {/* Quick KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-[#16171B] border border-zinc-800 rounded-2xl p-4">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Total Custom Orders</span>
                <div className="text-xl sm:text-2xl font-black font-display text-white mt-1">{orders.length}</div>
                <span className="text-[10px] text-emerald-400 font-mono mt-0.5 block">Captured in Supabase</span>
              </div>

              <div className="bg-[#16171B] border border-zinc-800 rounded-2xl p-4">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Awaiting Approval</span>
                <div className="text-xl sm:text-2xl font-black font-display text-amber-400 mt-1">
                  {orders.filter(o => o.status === 'pending').length}
                </div>
                <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">Needs proof review</span>
              </div>

              <div className="bg-[#16171B] border border-zinc-800 rounded-2xl p-4">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">In Factory Production</span>
                <div className="text-xl sm:text-2xl font-black font-display text-purple-400 mt-1">
                  {orders.filter(o => o.status === 'in-production').length}
                </div>
                <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">Printing & Embroidery</span>
              </div>

              <div className="bg-[#16171B] border border-zinc-800 rounded-2xl p-4">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Dispatched / Transit</span>
                <div className="text-xl sm:text-2xl font-black font-display text-blue-400 mt-1">
                  {orders.filter(o => o.status === 'dispatched').length}
                </div>
                <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">Air waybills active</span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#16171B] p-3 rounded-2xl border border-zinc-800">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by Order ID, Client Name, Phone, Email, Company, AWB..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-black/50 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:border-[#FF7A00] outline-none"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0 overflow-x-auto">
                <span className="text-xs text-zinc-400 flex items-center gap-1 font-mono pl-1">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Status:</span>
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-black/60 border border-zinc-800 rounded-xl text-xs text-zinc-200 px-3 py-2 outline-none focus:border-[#FF7A00]"
                >
                  <option value="all">All Statuses ({orders.length})</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="in-production">In-Production</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
            </div>

            {/* Orders Table */}
            {loadingOrders ? (
              <div className="text-center py-16 bg-[#16171B] rounded-3xl border border-zinc-800 space-y-3">
                <RefreshCw className="w-8 h-8 text-[#FF7A00] animate-spin mx-auto" />
                <p className="text-xs text-zinc-400 font-mono">Fetching custom orders from Supabase PostgreSQL...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-16 bg-[#16171B] rounded-3xl border border-zinc-800 space-y-3">
                <Package className="w-10 h-10 text-zinc-600 mx-auto" />
                <h3 className="font-bold text-white text-base">No orders matched criteria</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  {orderSearchQuery ? 'Try adjusting your search terms or status filter.' : 'Custom orders placed by clients will show up here in real-time.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const product = PRODUCTS.find(p => p.id === order.product_id);
                  const unitPrice = product?.basePrice || 499;
                  const estimatedSubtotal = unitPrice * (order.quantity || 1);
                  const estimatedTotal = estimatedSubtotal + Math.round(estimatedSubtotal * 0.18);
                  const hasDispatched = order.status === 'dispatched' || order.status === 'delivered';

                  return (
                    <div
                      key={order.id}
                      className="bg-[#16171B] border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 sm:p-5 transition-all shadow-md space-y-4"
                    >
                      {/* Order Row Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                          <span className="font-mono text-xs font-bold text-[#FF7A00] bg-[#FF7A00]/10 border border-[#FF7A00]/25 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                            <span>#{order.id.startsWith('TQ-') ? order.id : order.id.slice(0, 8).toUpperCase()}</span>
                            <button
                              onClick={() => handleCopy(order.id, order.id)}
                              className="text-zinc-400 hover:text-white transition-colors"
                              title="Copy full UUID"
                            >
                              {copiedId === order.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </span>

                          <span className="text-xs text-zinc-400 font-mono flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-zinc-500" />
                            <span>
                              {new Date(order.created_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </span>

                          {order.company && (
                            <span className="text-xs font-medium bg-zinc-800 text-zinc-300 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-zinc-400" />
                              <span className="truncate max-w-[150px]">{order.company}</span>
                            </span>
                          )}
                        </div>

                        {/* Order Amount & Quick Actions */}
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[10px] text-zinc-500 font-mono block">Order Value (incl. GST)</span>
                            <span className="text-sm font-bold font-mono text-emerald-400">
                              ₹{estimatedTotal.toLocaleString('en-IN')}.00
                            </span>
                          </div>

                          {/* 1-Click WhatsApp Button */}
                          <a
                            href={getDirectClientWhatsAppUrl({
                              phone: order.phone,
                              name: order.customer_name,
                              type: 'order',
                              orderId: order.id.startsWith('TQ-') ? order.id : order.id.slice(0, 8).toUpperCase(),
                              status: order.status,
                              courier: order.courier_partner,
                              trackingNumber: order.tracking_number,
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#1EBE5D] hover:bg-[#19a851] text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                            title="Chat with client on WhatsApp"
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5 text-white" />
                            <span className="hidden sm:inline">WhatsApp Client</span>
                          </a>
                        </div>
                      </div>

                      {/* Main Details Grid: Customer, Product & Logo, Dispatch */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                        
                        {/* Col 1 (4 cols): Customer Profile */}
                        <div className="md:col-span-4 space-y-1.5 bg-black/40 p-3.5 rounded-xl border border-zinc-800/60">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
                            Customer Information
                          </div>
                          <div className="font-bold text-sm text-white">{order.customer_name}</div>
                          <div className="flex items-center gap-2 text-zinc-300 font-mono">
                            <Phone className="w-3 h-3 text-zinc-500" />
                            <a href={`tel:${order.phone}`} className="hover:text-[#FF7A00] transition-colors">
                              {order.phone}
                            </a>
                          </div>
                          <div className="flex items-center gap-2 text-zinc-400 truncate">
                            <Mail className="w-3 h-3 text-zinc-500 shrink-0" />
                            <a href={`mailto:${order.customer_email}`} className="hover:text-[#FF7A00] truncate">
                              {order.customer_email}
                            </a>
                          </div>
                        </div>

                        {/* Col 2 (4 cols): Product Specs & Custom Notes */}
                        <div className="md:col-span-5 space-y-2 bg-black/40 p-3.5 rounded-xl border border-zinc-800/60">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
                            Product & Custom Specifications
                          </div>
                          <div className="flex items-start gap-3">
                            {/* Logo / Thumbnail Preview */}
                            {order.logo_url ? (
                              <button
                                onClick={() => setPreviewLogoUrl(order.logo_url)}
                                className="w-14 h-14 rounded-xl border border-zinc-700 overflow-hidden bg-zinc-900 p-1 shrink-0 relative group cursor-zoom-in"
                                title="Click to view full-resolution uploaded logo"
                              >
                                <img
                                  src={order.logo_url}
                                  alt="Logo"
                                  className="w-full h-full object-contain"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                  <Eye className="w-3.5 h-3.5" />
                                </div>
                              </button>
                            ) : (
                              <div className="w-14 h-14 rounded-xl border border-zinc-800 bg-zinc-900 flex items-center justify-center text-[9px] text-zinc-500 font-mono text-center p-1 shrink-0">
                                No Logo
                              </div>
                            )}

                            <div className="space-y-1 min-w-0">
                              <div className="font-bold text-white truncate">
                                {product?.name || order.product_id || 'Custom Product Specification'}
                              </div>
                              <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-300">
                                <span className="bg-[#FF7A00]/20 text-[#FF7A00] px-1.5 py-0.5 rounded font-bold">
                                  {order.quantity} pcs
                                </span>
                                <span>·</span>
                                <span className="text-zinc-400">₹{unitPrice}/pc</span>
                              </div>
                              {order.custom_notes && (
                                <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed font-mono">
                                  {order.custom_notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Col 3 (3 cols): Lifecycle Status & Courier Dispatch Controls */}
                        <div className="md:col-span-3 space-y-2.5 bg-black/40 p-3.5 rounded-xl border border-zinc-800/60 flex flex-col justify-between">
                          <div>
                            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold mb-1.5">
                              Status & Dispatch
                            </div>
                            
                            {/* Real-time Status Dropdown */}
                            <div className="relative">
                              <select
                                value={order.status}
                                disabled={updatingOrderId === order.id}
                                onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                                className={`w-full text-xs font-bold py-2 px-3 rounded-xl border outline-none cursor-pointer transition-all ${
                                  order.status === 'pending'
                                    ? 'bg-amber-950/60 border-amber-700/60 text-amber-300'
                                    : order.status === 'approved'
                                    ? 'bg-blue-950/60 border-blue-700/60 text-blue-300'
                                    : order.status === 'in-production'
                                    ? 'bg-purple-950/60 border-purple-700/60 text-purple-300'
                                    : order.status === 'dispatched'
                                    ? 'bg-teal-950/60 border-teal-700/60 text-teal-300'
                                    : 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                                }`}
                              >
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="in-production">In-Production</option>
                                <option value="dispatched">Dispatched</option>
                                <option value="delivered">Delivered</option>
                              </select>
                            </div>
                          </div>

                          {/* Courier Partner & Waybill Display / Edit */}
                          <div className="pt-2 border-t border-zinc-800/80">
                            {order.tracking_number ? (
                              <div className="space-y-1">
                                <div className="text-[10px] text-zinc-400 font-mono truncate">
                                  {order.courier_partner || 'Blue Dart Apex'}
                                </div>
                                <div className="flex items-center justify-between text-xs font-mono text-[#FF7A00] font-bold">
                                  <span>{order.tracking_number}</span>
                                  <button
                                    onClick={() => handleCopy(order.tracking_number || '', order.id + '-awb')}
                                    className="text-zinc-400 hover:text-white"
                                    title="Copy AWB"
                                  >
                                    {copiedId === order.id + '-awb' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                                <button
                                  onClick={() => {
                                    setEditingDispatchOrder(order);
                                    setCourierInput(order.courier_partner || 'Blue Dart Apex Express');
                                    setAwbInput(order.tracking_number || '');
                                  }}
                                  className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                                >
                                  Edit Dispatch Details
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingDispatchOrder(order);
                                  setCourierInput('Blue Dart Apex Express');
                                  setAwbInput(`BD-AIR-${Math.floor(1000000000 + Math.random() * 9000000000)}`);
                                }}
                                className="w-full text-center py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Truck className="w-3 h-3 text-[#FF7A00]" />
                                <span>Assign Courier & AWB</span>
                              </button>
                            )}

                            {/* Hostinger SMTP Email Confirmation Action */}
                            <button
                              onClick={() => handleSendOrderConfirmationEmail(order)}
                              disabled={sendingEmailOrderId === order.id}
                              className="w-full text-center py-1.5 px-2 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg text-[10px] font-semibold border border-zinc-800 hover:border-[#FF7A00]/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1.5"
                              title="Send order confirmation via Hostinger SMTP"
                            >
                              <Mail className={`w-3 h-3 text-[#FF7A00] ${sendingEmailOrderId === order.id ? 'animate-bounce' : ''}`} />
                              <span>{sendingEmailOrderId === order.id ? 'Sending Email...' : 'Send Hostinger Email'}</span>
                            </button>

                            {/* B2B Tax Invoice (SAC 9989) PDF Generation */}
                            <button
                              onClick={() => generateAdminOrderInvoicePdf(order, PRODUCTS)}
                              className="w-full text-center py-1.5 px-2 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg text-[10px] font-semibold border border-zinc-800 hover:border-emerald-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                              title="Download official SAC 9989 B2B Tax Invoice (PDF)"
                            >
                              <Download className="w-3 h-3 text-emerald-400" />
                              <span>Download Invoice (PDF)</span>
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 2: ABANDONED LEADS (DROP-OFFS) */}
        {/* ===================================================================== */}
        {activeTab === 'abandoned' && (
          <div className="space-y-6">
            
            {/* Abandoned Header Banner */}
            <div className="bg-gradient-to-r from-amber-950/40 via-[#16171B] to-orange-950/30 border border-amber-800/40 rounded-3xl p-5 sm:p-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Real-Time Abandoned Checkout Recovery Engine</span>
                  </span>
                  <h2 className="font-display font-black text-xl sm:text-2xl text-white">
                    Drop-off Visitor Leads & Recovery Actions
                  </h2>
                  <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                    These potential corporate buyers added custom products to their cart and entered their phone/email, but dropped off before completing checkout. Reach out directly via 1-Click WhatsApp to close the sale.
                  </p>
                </div>

                <div className="bg-black/60 border border-amber-700/40 rounded-2xl p-4 text-right">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">At-Risk Value</span>
                  <div className="text-2xl font-black font-display text-amber-400">
                    ₹{analytics.abandonedValueAtRisk.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {analytics.unrecoveredCount} unrecovered leads
                  </span>
                </div>
              </div>
            </div>

            {/* Search and Recovery Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#16171B] p-3 rounded-2xl border border-zinc-800">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search leads by Visitor Name, Phone, Email, Company..."
                  value={leadSearchQuery}
                  onChange={(e) => setLeadSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-black/50 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:border-[#FF7A00] outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-xl border border-zinc-800 shrink-0">
                <button
                  onClick={() => setLeadFilter('all')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    leadFilter === 'all' ? 'bg-[#FF7A00] text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  All ({abandonedLeads.length})
                </button>
                <button
                  onClick={() => setLeadFilter('unrecovered')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    leadFilter === 'unrecovered' ? 'bg-[#FF7A00] text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Needs Recovery ({analytics.unrecoveredCount})
                </button>
                <button
                  onClick={() => setLeadFilter('recovered')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    leadFilter === 'recovered' ? 'bg-[#FF7A00] text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Recovered ({analytics.recoveredCount})
                </button>
              </div>
            </div>

            {/* Leads List */}
            {loadingLeads ? (
              <div className="text-center py-16 bg-[#16171B] rounded-3xl border border-zinc-800 space-y-3">
                <RefreshCw className="w-8 h-8 text-[#FF7A00] animate-spin mx-auto" />
                <p className="text-xs text-zinc-400 font-mono">Fetching captured checkout leads...</p>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-16 bg-[#16171B] rounded-3xl border border-zinc-800 space-y-3">
                <UserCheck className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="font-bold text-white text-base">Zero Abandoned Leads</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  When a customer enters their contact info in the checkout flow, it is automatically autosaved and recorded here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLeads.map((lead) => {
                  const leadPhone = lead.phone || '';
                  const leadName = lead.customer_name || 'Valued Visitor';
                  const cartItems = Array.isArray(lead.cart_items) ? lead.cart_items : [];

                  return (
                    <div
                      key={lead.id}
                      className={`bg-[#16171B] border rounded-2xl p-4 sm:p-5 transition-all space-y-4 ${
                        lead.recovered 
                          ? 'border-emerald-900/50 opacity-80' 
                          : 'border-zinc-800 hover:border-amber-700/60 shadow-lg'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                          <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-lg ${
                            lead.recovered 
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60' 
                              : 'bg-amber-950/60 text-amber-400 border border-amber-800/60 animate-pulse'
                          }`}>
                            {lead.recovered ? 'Recovered (Order Placed)' : 'Abandoned Lead (Needs Recovery)'}
                          </span>

                          <span className="text-xs text-zinc-400 font-mono">
                            {lead.updated_at ? new Date(lead.updated_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Recently active'}
                          </span>

                          {lead.company && (
                            <span className="text-xs text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-zinc-400" />
                              <span>{lead.company}</span>
                            </span>
                          )}
                        </div>

                        {/* Cart Value & Actions */}
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="text-right">
                            <span className="text-[10px] text-zinc-500 font-mono block">Cart Total Value</span>
                            <span className="text-sm font-bold font-mono text-amber-400">
                              ₹{Number(lead.cart_total || 0).toLocaleString('en-IN')}.00
                            </span>
                          </div>

                          {/* 1-Click WhatsApp Client Action Button */}
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
                              className="bg-[#1EBE5D] hover:bg-[#19a851] text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                              title="Engage via WhatsApp"
                            >
                              <WhatsAppIcon className="w-3.5 h-3.5 text-white" />
                              <span>WhatsApp Client</span>
                            </a>
                          )}

                          {!lead.recovered && (
                            <button
                              onClick={() => handleRecoverLead(lead.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                              title="Mark as recovered if client paid via phone/direct transfer"
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="hidden sm:inline">Mark Recovered</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Lead Details & Designed Products */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                        
                        {/* Contact Card */}
                        <div className="md:col-span-5 bg-black/40 p-3.5 rounded-xl border border-zinc-800/60 space-y-1.5">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
                            Lead Contact
                          </div>
                          <div className="font-bold text-sm text-white">{leadName}</div>
                          {leadPhone ? (
                            <div className="flex items-center gap-2 text-zinc-300 font-mono">
                              <Phone className="w-3 h-3 text-[#1EBE5D]" />
                              <a href={`tel:${leadPhone}`} className="hover:text-[#FF7A00]">
                                {leadPhone}
                              </a>
                            </div>
                          ) : (
                            <span className="text-zinc-500 font-mono text-[11px]">No phone number recorded</span>
                          )}
                          {lead.email && (
                            <div className="flex items-center gap-2 text-zinc-400 truncate">
                              <Mail className="w-3 h-3 text-zinc-500 shrink-0" />
                              <a href={`mailto:${lead.email}`} className="hover:text-[#FF7A00] truncate">
                                {lead.email}
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Designed Cart Items */}
                        <div className="md:col-span-7 bg-black/40 p-3.5 rounded-xl border border-zinc-800/60 space-y-2">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
                            Designed Products in Abandoned Cart ({cartItems.length} items)
                          </div>
                          
                          {cartItems.length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {cartItems.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                                  {item.previewUrl ? (
                                    <img
                                      src={item.previewUrl}
                                      alt={item.productName || 'Product'}
                                      className="w-10 h-10 rounded-md object-contain bg-black/40 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-md bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-500 shrink-0">
                                      Item
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold text-white truncate text-xs">{item.productName || 'Custom Merchandise'}</div>
                                    <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-2">
                                      <span>Qty: {item.quantity}</span>
                                      {item.color && <span>· Color: {item.color}</span>}
                                      {item.printMethod && <span>· {item.printMethod}</span>}
                                    </div>
                                  </div>
                                  <div className="font-mono text-xs font-bold text-zinc-200 shrink-0">
                                    ₹{Number(item.totalPrice || item.unitPrice * item.quantity || 0).toLocaleString('en-IN')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-zinc-500 text-xs italic">
                              Lead opened checkout with cart value ₹{Number(lead.cart_total || 0).toLocaleString('en-IN')}.
                            </p>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 3: ANALYTICS & CRO OVERVIEW */}
        {/* ===================================================================== */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            
            {/* Primary KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Total Revenue */}
              <div className="bg-[#16171B] border border-zinc-800 rounded-3xl p-5 space-y-2 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">Total Revenue</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                </div>
                <div className="font-display font-black text-2xl sm:text-3xl text-white">
                  ₹{analytics.totalRevenue.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                  <span>Based on {analytics.totalOrdersCount} completed orders</span>
                </div>
              </div>

              {/* Card 2: Total Orders Placed */}
              <div className="bg-[#16171B] border border-zinc-800 rounded-3xl p-5 space-y-2 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">Orders Placed</span>
                  <div className="w-8 h-8 rounded-xl bg-[#FF7A00]/10 text-[#FF7A00] flex items-center justify-center">
                    <Package className="w-4 h-4" />
                  </div>
                </div>
                <div className="font-display font-black text-2xl sm:text-3xl text-white">
                  {analytics.totalOrdersCount}
                </div>
                <div className="text-[11px] text-zinc-400 font-mono">
                  Average Order: ₹{analytics.aov.toLocaleString('en-IN')}
                </div>
              </div>

              {/* Card 3: Conversion Rate */}
              <div className="bg-[#16171B] border border-zinc-800 rounded-3xl p-5 space-y-2 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">Checkout Conversion Rate</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="font-display font-black text-2xl sm:text-3xl text-white">
                  {analytics.conversionRate}%
                </div>
                <div className="text-[11px] text-blue-400 font-mono">
                  {analytics.totalOrdersCount} placed / {analytics.totalOrdersCount + analytics.totalAbandonedCount} checkout sessions
                </div>
              </div>

              {/* Card 4: Abandoned Value at Risk */}
              <div className="bg-[#16171B] border border-zinc-800 rounded-3xl p-5 space-y-2 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">Abandoned Value</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                </div>
                <div className="font-display font-black text-2xl sm:text-3xl text-amber-400">
                  ₹{analytics.abandonedValueAtRisk.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-amber-300 font-mono">
                  {analytics.unrecoveredCount} pending recovery opportunities
                </div>
              </div>

            </div>

            {/* CRO Funnel Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              <div className="lg:col-span-8 bg-[#16171B] border border-zinc-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-bold text-base text-white">Conversion & Drop-off Funnel</h3>
                    <p className="text-xs text-zinc-400">Flow from Catalog & Customizer to Confirmed Delivery</p>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-1 rounded-lg">
                    CRO Health: Strong
                  </span>
                </div>

                <div className="space-y-3 pt-2">
                  {/* Step 1 */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-zinc-300 font-medium">1. Catalog & Customizer Visitors with Product Intent</span>
                      <span className="font-mono text-zinc-400">100% (Baseline)</span>
                    </div>
                    <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-zinc-400 rounded-full w-full" />
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-zinc-300 font-medium">2. Checkout Initiated & Contact Info Entered</span>
                      <span className="font-mono text-amber-400">{analytics.totalOrdersCount + analytics.totalAbandonedCount} Sessions</span>
                    </div>
                    <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: '85%' }} />
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-zinc-300 font-medium">3. Order Confirmed & Stored in PostgreSQL</span>
                      <span className="font-mono text-emerald-400">{analytics.totalOrdersCount} Completed ({analytics.conversionRate}%)</span>
                    </div>
                    <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, Math.max(10, Number(analytics.conversionRate)))}%` }} />
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-zinc-300 font-medium">4. Abandoned Leads Recovered via Direct WhatsApp</span>
                      <span className="font-mono text-[#FF7A00]">{analytics.recoveredCount} Recovered ({analytics.recoveryRate}%)</span>
                    </div>
                    <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-[#FF7A00] rounded-full" style={{ width: `${Math.min(100, Math.max(5, Number(analytics.recoveryRate)))}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick CRO Recommendations */}
              <div className="lg:col-span-4 bg-[#16171B] border border-zinc-800 rounded-3xl p-6 space-y-4">
                <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FF7A00]" />
                  <span>CRO Recommendations</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-2xl bg-black/40 border border-zinc-800/80 space-y-1">
                    <div className="font-bold text-amber-400 flex items-center gap-1.5">
                      <span>WhatsApp Recovery Timing</span>
                    </div>
                    <p className="text-zinc-400 leading-relaxed text-[11px]">
                      Message abandoned leads within 15–30 minutes of drop-off. Prompt response increases checkout completion by 42%.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-black/40 border border-zinc-800/80 space-y-1">
                    <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <span>Express Dispatch Reassurance</span>
                    </div>
                    <p className="text-zinc-400 leading-relaxed text-[11px]">
                      Highlighting 48-hour Pan-India BlueDart dispatch with Waybill tracking prevents checkout hesitations for corporate procurement leads.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-black/40 border border-zinc-800/80 space-y-1">
                    <div className="font-bold text-blue-400 flex items-center gap-1.5">
                      <span>GST 18% ITC Invoice</span>
                    </div>
                    <p className="text-zinc-400 leading-relaxed text-[11px]">
                      Over 80% of our orders claim B2B input tax credit. Prominently display verified GST invoices at payment stage.
                    </p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 4: SUPABASE SCHEMA & SQL TOOLS */}
        {/* ===================================================================== */}
        {activeTab === 'schema' && (
          <div className="space-y-6">
            {/* Email & Hostinger SMTP Diagnostics Panel */}
            <div className="bg-[#16171B] border border-zinc-800 rounded-3xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-[#FF7A00]" />
                    <span>Order Email Notifications (Hostinger SMTP)</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Sends automated confirmation to the customer AND instant New Order Alert to admin (<strong className="text-zinc-200">{smtpStatus?.adminEmail || 'teqqnoworld@gmail.com'}</strong>).
                  </p>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                  smtpStatus?.configured
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                }`}>
                  {smtpStatus?.configured
                    ? 'LIVE SMTP CONNECTED'
                    : smtpStatus?.backendReachable
                      ? 'SIMULATION MODE (CREDENTIALS MISSING)'
                      : 'STATIC HOSTING (NODE SERVER NOT RUNNING)'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-black/40 border border-zinc-800 rounded-2xl p-3.5">
                  <div className="text-[10px] font-mono uppercase text-zinc-500">SMTP Host & Port</div>
                  <div className="font-mono text-zinc-200 mt-1">
                    {smtpStatus ? `${smtpStatus.host}:${smtpStatus.port} (${smtpStatus.secure ? 'SSL' : 'TLS'})` : 'smtp.hostinger.com:465'}
                  </div>
                </div>
                <div className="bg-black/40 border border-zinc-800 rounded-2xl p-3.5">
                  <div className="text-[10px] font-mono uppercase text-zinc-500">Sender Email (HOSTINGER_SMTP_EMAIL)</div>
                  <div className="font-mono text-zinc-200 mt-1 truncate">
                    {smtpStatus?.senderEmail || '(not set)'}
                  </div>
                </div>
                <div className="bg-black/40 border border-zinc-800 rounded-2xl p-3.5">
                  <div className="text-[10px] font-mono uppercase text-zinc-500">Admin Alert Email (ADMIN_NOTIFICATION_EMAIL)</div>
                  <div className="font-mono text-emerald-400 mt-1 truncate">
                    {smtpStatus?.adminEmail || 'teqqnoworld@gmail.com'}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <input
                  type="email"
                  value={testEmailInput}
                  onChange={(e) => setTestEmailInput(e.target.value)}
                  placeholder="Enter email for test delivery..."
                  className="flex-1 bg-black/60 border border-zinc-700 rounded-xl py-2.5 px-3.5 text-xs text-white focus:border-[#FF7A00] outline-none"
                />
                <button
                  onClick={handleTestSmtpEmail}
                  disabled={testingSmtp}
                  className="bg-[#FF7A00] hover:bg-[#ff881a] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{testingSmtp ? 'Testing SMTP...' : 'Send Test Email'}</span>
                </button>
              </div>

              {smtpTestResult && (
                <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  smtpTestResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}>
                  {smtpTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span>{smtpTestResult.message}</span>
                </div>
              )}
            </div>

            <div className="bg-[#16171B] border border-zinc-800 rounded-3xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-display font-bold text-lg text-white">
                    Supabase PostgreSQL Schema & RLS Setup
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Run this SQL script in your Supabase SQL Editor to ensure `custom_orders`, `abandoned_checkouts`, and courier columns are ready.
                  </p>
                </div>

                <button
                  onClick={() => {
                    const sql = `-- 1. CUSTOM ORDERS (QUOTES) TABLE WITH COURIER DISPATCH
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

-- Ensure courier columns exist if table was already created
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
CREATE POLICY "Public all abandoned_checkouts" ON public.abandoned_checkouts FOR ALL TO public USING (true) WITH CHECK (true);
`;
                    navigator.clipboard.writeText(sql);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 3000);
                  }}
                  className="bg-[#FF7A00] hover:bg-[#ff881a] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSql ? 'Copied SQL Script!' : 'Copy Supabase SQL'}</span>
                </button>
              </div>

              <pre className="bg-black/60 border border-zinc-800 rounded-2xl p-4 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-96 leading-relaxed">
{`-- 1. CUSTOM ORDERS (QUOTES) TABLE WITH COURIER DISPATCH
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

-- Ensure courier columns exist if table was already created
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
CREATE POLICY "Public all abandoned_checkouts" ON public.abandoned_checkouts FOR ALL TO public USING (true) WITH CHECK (true);`}
              </pre>
            </div>
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODAL: COURIER & AWB DISPATCH EDITOR */}
      {/* ========================================================================= */}
      {editingDispatchOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#16171B] border border-zinc-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#FF7A00]" />
                <h3 className="font-bold text-white text-base">Assign Courier & Waybill</h3>
              </div>
              <button
                onClick={() => setEditingDispatchOrder(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDispatch} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-mono">Order Reference</label>
                <input
                  type="text"
                  disabled
                  value={`#${editingDispatchOrder.id.slice(0, 8).toUpperCase()} · ${editingDispatchOrder.customer_name}`}
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl py-2 px-3 text-zinc-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1.5 font-bold">Courier Logistics Partner</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {['Blue Dart Apex Express', 'Delhivery Surface', 'DTDC Express Air', 'Xpressbees B2B'].map((partner) => (
                    <button
                      key={partner}
                      type="button"
                      onClick={() => setCourierInput(partner)}
                      className={`py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                        courierInput === partner
                          ? 'border-[#FF7A00] bg-[#FF7A00]/15 text-[#FF7A00] font-bold'
                          : 'border-zinc-800 bg-black/40 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {partner.split(' ')[0]}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  placeholder="Courier name..."
                  value={courierInput}
                  onChange={(e) => setCourierInput(e.target.value)}
                  className="w-full bg-black/60 border border-zinc-700 rounded-xl py-2.5 px-3 text-white focus:border-[#FF7A00] outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1.5 font-bold">Tracking Number / AWB</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BD-AIR-892019284"
                  value={awbInput}
                  onChange={(e) => setAwbInput(e.target.value)}
                  className="w-full bg-black/60 border border-zinc-700 rounded-xl py-2.5 px-3 text-white font-mono focus:border-[#FF7A00] outline-none"
                />
                <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                  The client can track their consignment with this AWB instantly in the tracking modal.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDispatchOrder(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingOrderId === editingDispatchOrder.id}
                  className="px-5 py-2 rounded-xl bg-[#FF7A00] hover:bg-[#ff881a] text-white font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Dispatched & Save</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FULL RESOLUTION LOGO PREVIEW */}
      {/* ========================================================================= */}
      {previewLogoUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#16171B] border border-zinc-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-bold text-white text-base">Client Brand Logo / Artwork Preview</h3>
              <button
                onClick={() => setPreviewLogoUrl(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 bg-zinc-950 rounded-2xl border border-zinc-800 flex items-center justify-center max-h-[60vh] overflow-hidden">
              <img
                src={previewLogoUrl}
                alt="High-resolution client logo"
                className="max-w-full max-h-[50vh] object-contain drop-shadow-xl"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-mono text-zinc-400 truncate max-w-sm">
                {previewLogoUrl}
              </span>
              <a
                href={previewLogoUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="px-4 py-2 rounded-xl bg-[#FF7A00] hover:bg-[#ff881a] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Open / Download Asset</span>
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
