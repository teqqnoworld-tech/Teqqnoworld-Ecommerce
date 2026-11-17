import React, { useState, useEffect, useMemo } from 'react';
import {
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
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Eye,
  Phone,
  Mail,
  Building2,
  BarChart3,
  Layers,
  Download,
  LogOut,
  ArrowLeft,
  X,
  FileText,
  UserCheck,
  Send,
  CreditCard,
  MapPin,
  Printer,
  Loader2,
  LayoutGrid,
  List,
  ChevronRight,
  Calendar,
  Receipt,
  ArrowUpRight,
  Menu,
} from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import {
  CustomOrderRow,
  OrderStatus,
  isSupabaseConfigured,
} from '../lib/supabase';
import {
  fetchCustomOrdersFromSupabase,
  updateCustomOrderStatus,
  fetchAbandonedCheckoutsFromSupabase,
  markCheckoutRecovered,
} from '../services/supabaseService';
import {
  sendOrderConfirmationEmail,
  getSmtpStatus,
  sendTestEmail,
  SmtpStatusResponse,
} from '../services/emailService';
import {
  getRazorpayStatus,
  getDelhiveryStatus,
  checkDelhiveryPincode,
  createDelhiveryShipment,
  trackDelhiveryWaybill,
  requestDelhiveryPickup,
  getDelhiveryLabelUrl,
  RazorpayStatus,
  DelhiveryStatus,
  DelhiveryTrackResponse,
  DelhiveryPincodeCheckResult,
} from '../services/paymentAndLogisticsService';
import { generateAdminOrderInvoicePdf } from '../utils/pdfGenerator';
import { getDirectClientWhatsAppUrl } from '../utils/whatsapp';
import { PRODUCTS } from '../data/mockData';

interface AdminHubViewProps {
  onBackToStore: () => void;
  onNavigateToOrderTracking?: (orderNumber: string) => void;
}

type AdminTab = 'orders' | 'dispatch' | 'abandoned' | 'analytics' | 'schema';

const DEFAULT_PIN = '9949';

const STATUS_META: Record<
  OrderStatus,
  { label: string; colorClass: string; barClass: string }
> = {
  pending: {
    label: 'Pending Review',
    colorClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    barClass: 'bg-amber-400',
  },
  approved: {
    label: 'Proof Approved',
    colorClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    barClass: 'bg-sky-400',
  },
  'in-production': {
    label: 'In Production',
    colorClass: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    barClass: 'bg-violet-400',
  },
  dispatched: {
    label: 'Dispatched',
    colorClass: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    barClass: 'bg-teal-400',
  },
  delivered: {
    label: 'Delivered',
    colorClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    barClass: 'bg-emerald-400',
  },
};

interface ParsedOrderNotes {
  frontMockupUrl: string | null;
  backMockupUrl: string | null;
  backLogoUrl: string | null;
  color: string | null;
  size: string | null;
  method: string | null;
  placementSummary: string | null;
  gstin: string | null;
  poNumber: string | null;
  paymentPlan: string | null;
  paidAmount: string | null;
  paidNumber: number | null;
  balanceDue: string | null;
  balanceNumber: number | null;
  razorpayId: string | null;
  customNotesText: string | null;
  parsedAddress: {
    full: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  cleanNotes: string;
}

function parseOrderNotes(notes?: string | null): ParsedOrderNotes {
  const raw = notes || '';
  const frontMockupMatch = raw.match(/\[FrontMockup:\s*(https?:\/\/[^\s\]]+)\]/i);
  const backMockupMatch = raw.match(/\[BackMockup:\s*(https?:\/\/[^\s\]]+)\]/i);
  const backLogoMatch = raw.match(/\[BackLogo:\s*(https?:\/\/[^\s\]]+)\]/i);

  const cleanNotes = raw
    .replace(/\|\s*\[(FrontMockup|BackMockup|BackLogo):[^\]]+\]/gi, '')
    .replace(/\[(FrontMockup|BackMockup|BackLogo):[^\]]+\]/gi, '')
    .trim();

  const extractField = (prefixRegex: RegExp): string | null => {
    const match = cleanNotes.match(prefixRegex);
    return match?.[1]?.trim() || null;
  };

  const color = extractField(/(?:^|\|)\s*Color:\s*([^|]+)/i);
  const size = extractField(/(?:^|\|)\s*Size:\s*([^|]+)/i);
  const method = extractField(/(?:^|\|)\s*Method:\s*([^|]+)/i);
  const placementSummary = extractField(/(?:^|\|)\s*Position & Layout:\s*([^|]+)/i);
  const customNotesText = extractField(/(?:^|\|)\s*Notes:\s*([^|]+)/i);
  const gstin = extractField(/(?:^|\|)\s*GSTIN:\s*([^|]+)/i);
  const poNumber = extractField(/(?:^|\|)\s*PO#:\s*([^|]+)/i);
  const paymentPlan = extractField(/(?:^|\|)\s*Payment Plan:\s*([^|]+)/i);
  const rzpMatch = cleanNotes.match(/Razorpay ID:\s*([^|\s]+)/i);
  const paidMatch = cleanNotes.match(/Paid:\s*₹([0-9,]+)\s*\|\s*Balance Due:\s*₹([0-9,]+)/i);
  const addrMatch = cleanNotes.match(/Address:\s*([^|]+)/i);

  let street = '';
  let city = '';
  let state = '';
  let pincode = '';
  const fullAddr = addrMatch?.[1]?.trim() || '';
  if (fullAddr) {
    const pinSplit = fullAddr.match(/-\s*(\d{6})\s*$/);
    if (pinSplit) pincode = pinSplit[1];
    const withoutPin = fullAddr.replace(/-\s*\d{6}\s*$/, '').trim();
    const parts = withoutPin
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length >= 3) {
      state = parts[parts.length - 1];
      city = parts[parts.length - 2];
      street = parts.slice(0, parts.length - 2).join(', ');
    } else {
      street = withoutPin;
    }
  }

  const paidStr = paidMatch?.[1] || null;
  const dueStr = paidMatch?.[2] || null;
  const paidNum = paidStr ? Number(paidStr.replace(/,/g, '')) : null;
  const dueNum = dueStr ? Number(dueStr.replace(/,/g, '')) : null;

  return {
    frontMockupUrl: frontMockupMatch?.[1] || null,
    backMockupUrl: backMockupMatch?.[1] || null,
    backLogoUrl: backLogoMatch?.[1] || null,
    color,
    size,
    method,
    placementSummary,
    gstin,
    poNumber,
    paymentPlan,
    paidAmount: paidStr,
    paidNumber: Number.isFinite(paidNum) ? paidNum : null,
    balanceDue: dueStr,
    balanceNumber: Number.isFinite(dueNum) ? dueNum : null,
    razorpayId: rzpMatch?.[1] || null,
    customNotesText,
    parsedAddress: { full: fullAddr, street, city, state, pincode },
    cleanNotes,
  };
}

function getOrderEstimates(order: CustomOrderRow) {
  const product = PRODUCTS.find((p) => p.id === order.product_id);
  const unitPrice = product?.basePrice || 499;
  const subtotal = unitPrice * (order.quantity || 1);
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;
  return { product, unitPrice, subtotal, gst, total };
}

function formatOrderRef(id: string) {
  return id.startsWith('TQ-') ? id : `TQ-${id.slice(0, 8).toUpperCase()}`;
}

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

  // Navigation & Responsive UI State
  const [activeTab, setActiveTab] = useState<AdminTab>('orders');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [ordersViewMode, setOrdersViewMode] = useState<'table' | 'cards'>('table');

  // Data State
  const [orders, setOrders] = useState<CustomOrderRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Toast Notifications (non-blocking, zero window.alert)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Abandoned Leads State
  const [abandonedLeads, setAbandonedLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState<boolean>(false);
  const [leadSearchQuery, setLeadSearchQuery] = useState<string>('');
  const [leadFilter, setLeadFilter] = useState<'all' | 'unrecovered' | 'recovered'>('all');

  // Order Inspector Drawer & Modals
  const [inspectingOrder, setInspectingOrder] = useState<CustomOrderRow | null>(null);
  const [previewLogoUrl, setPreviewLogoUrl] = useState<string | null>(null);
  const [editingDispatchOrder, setEditingDispatchOrder] = useState<CustomOrderRow | null>(null);
  const [courierInput, setCourierInput] = useState<string>('Delhivery (Teqqnoworld)');
  const [awbInput, setAwbInput] = useState<string>('');
  const [delhiveryPickup, setDelhiveryPickup] = useState<string>('Teqqnoworld');
  const [shipAddress, setShipAddress] = useState<string>('');
  const [shipCity, setShipCity] = useState<string>('');
  const [shipState, setShipState] = useState<string>('');
  const [shipPincode, setShipPincode] = useState<string>('');
  const [shipWeight, setShipWeight] = useState<string>('500');
  const [creatingShipment, setCreatingShipment] = useState<boolean>(false);
  const [shipmentError, setShipmentError] = useState<string | null>(null);

  // Tracking State
  const [trackingModalData, setTrackingModalData] = useState<DelhiveryTrackResponse | null>(null);
  const [trackingOrderAwb, setTrackingOrderAwb] = useState<string | null>(null);
  const [loadingTrack, setLoadingTrack] = useState<boolean>(false);
  const [quickTrackAwb, setQuickTrackAwb] = useState<string>('');
  const [quickTrackResult, setQuickTrackResult] = useState<DelhiveryTrackResponse | null>(null);
  const [loadingQuickTrack, setLoadingQuickTrack] = useState<boolean>(false);

  // Diagnostics & Tools State
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [sendingEmailOrderId, setSendingEmailOrderId] = useState<string | null>(null);
  const [smtpStatus, setSmtpStatus] = useState<SmtpStatusResponse | null>(null);
  const [razorpayStatus, setRazorpayStatus] = useState<RazorpayStatus | null>(null);
  const [delhiveryStatus, setDelhiveryStatus] = useState<DelhiveryStatus | null>(null);
  const [testEmailInput, setTestEmailInput] = useState<string>('teqqnoworld@gmail.com');
  const [testingSmtp, setTestingSmtp] = useState<boolean>(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Delhivery Dispatch Hub Pickup & Pincode Tools
  const [testPinInput, setTestPinInput] = useState<string>('502032');
  const [testingPin, setTestingPin] = useState<boolean>(false);
  const [testPinResult, setTestPinResult] = useState<DelhiveryPincodeCheckResult | null>(null);
  const [diagPickupName, setDiagPickupName] = useState<string>('Teqqnoworld');
  const [pickupDateInput, setPickupDateInput] = useState<string>(
    () => new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [pickupTimeInput, setPickupTimeInput] = useState<string>('14:00:00');
  const [pickupPkgCount, setPickupPkgCount] = useState<number>(1);
  const [schedulingPickup, setSchedulingPickup] = useState<boolean>(false);
  const [pickupResult, setPickupResult] = useState<{ success: boolean; message: string } | null>(null);

  const loadData = async () => {
    setLoadingOrders(true);
    setLoadingLeads(true);
    try {
      const [ordersRes, leadsRes, smtpRes, rzpRes, dlvRes] = await Promise.all([
        fetchCustomOrdersFromSupabase(),
        fetchAbandonedCheckoutsFromSupabase(),
        getSmtpStatus(),
        getRazorpayStatus(),
        getDelhiveryStatus(),
      ]);
      const loadedOrders = ordersRes.data || [];
      setOrders(loadedOrders);
      setAbandonedLeads(leadsRes.data || []);
      setSmtpStatus(smtpRes);
      setRazorpayStatus(rzpRes);
      setDelhiveryStatus(dlvRes);
      setPickupPkgCount(Math.max(1, loadedOrders.filter((o) => o.status === 'dispatched').length || 1));
    } catch (err) {
      console.error('[AdminHub Load Error]:', err);
      showToast('error', 'Failed to refresh records from server.');
    } finally {
      setLoadingOrders(false);
      setLoadingLeads(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

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

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const order = orders.find((o) => o.id === orderId);
      const res = await updateCustomOrderStatus(
        orderId,
        newStatus,
        order?.courier_partner || null,
        order?.tracking_number || null
      );

      if (res.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
        if (inspectingOrder?.id === orderId) {
          setInspectingOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
        showToast('success', `${formatOrderRef(orderId)} updated to ${STATUS_META[newStatus].label}`);
      } else {
        showToast('error', res.error || 'Could not update order status.');
      }
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const openDispatchModalForOrder = (order: CustomOrderRow) => {
    const parsed = parseOrderNotes(order.custom_notes);
    setEditingDispatchOrder(order);
    setCourierInput(order.courier_partner || `Delhivery (${delhiveryPickup})`);
    setAwbInput(order.tracking_number || '');
    setShipAddress(parsed.parsedAddress.street || '');
    setShipCity(parsed.parsedAddress.city || '');
    setShipState(parsed.parsedAddress.state || '');
    setShipPincode(parsed.parsedAddress.pincode || '');
    setShipmentError(null);
  };

  const handleBookDelhiveryShipment = async () => {
    if (!editingDispatchOrder) return;
    setCreatingShipment(true);
    setShipmentError(null);
    try {
      const { product, total } = getOrderEstimates(editingDispatchOrder);
      const orderNum = formatOrderRef(editingDispatchOrder.id);

      const res = await createDelhiveryShipment({
        orderId: editingDispatchOrder.id,
        orderNumber: orderNum,
        pickupLocation: delhiveryPickup,
        customerName: editingDispatchOrder.customer_name,
        phone: editingDispatchOrder.phone,
        address: shipAddress || `${shipCity}, ${shipState}`,
        city: shipCity,
        state: shipState,
        pincode: shipPincode,
        productDesc: product?.name || 'Custom Printed Corporate Merchandise',
        quantity: editingDispatchOrder.quantity || 1,
        totalAmount: total,
        weightGrams: Number(shipWeight) || 500,
      });

      if (!res.success || !res.waybill) {
        setShipmentError(res.message || 'Delhivery API could not manifest shipment.');
        return;
      }

      const partnerName = res.courierPartner || `Delhivery (${delhiveryPickup})`;
      const waybill = res.waybill;
      await updateCustomOrderStatus(editingDispatchOrder.id, 'dispatched', partnerName, waybill);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === editingDispatchOrder.id
            ? { ...o, status: 'dispatched', courier_partner: partnerName, tracking_number: waybill }
            : o
        )
      );
      if (inspectingOrder?.id === editingDispatchOrder.id) {
        setInspectingOrder((prev) =>
          prev
            ? { ...prev, status: 'dispatched', courier_partner: partnerName, tracking_number: waybill }
            : null
        );
      }
      setCourierInput(partnerName);
      setAwbInput(waybill);
      showToast('success', `Delhivery AWB ${waybill} generated from ${delhiveryPickup}!`);
      setEditingDispatchOrder(null);
    } finally {
      setCreatingShipment(false);
    }
  };

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
        setOrders((prev) =>
          prev.map((o) =>
            o.id === editingDispatchOrder.id
              ? { ...o, status: newStatus, courier_partner: courierInput, tracking_number: awbInput }
              : o
          )
        );
        if (inspectingOrder?.id === editingDispatchOrder.id) {
          setInspectingOrder((prev) =>
            prev
              ? { ...prev, status: newStatus, courier_partner: courierInput, tracking_number: awbInput }
              : null
          );
        }
        showToast('success', `${formatOrderRef(editingDispatchOrder.id)} saved as Dispatched!`);
        setEditingDispatchOrder(null);
      } else {
        showToast('error', res.error || 'Failed to save dispatch details.');
      }
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleTrackDelhiveryOrder = async (waybill: string) => {
    setTrackingOrderAwb(waybill);
    setLoadingTrack(true);
    setTrackingModalData(null);
    try {
      const res = await trackDelhiveryWaybill(waybill);
      setTrackingModalData(res);
    } finally {
      setLoadingTrack(false);
    }
  };

  const handleQuickTrackLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTrackAwb.trim()) return;
    setLoadingQuickTrack(true);
    setQuickTrackResult(null);
    try {
      const res = await trackDelhiveryWaybill(quickTrackAwb.trim());
      setQuickTrackResult(res);
    } finally {
      setLoadingQuickTrack(false);
    }
  };

  const handleSendOrderConfirmationEmail = async (order: CustomOrderRow) => {
    if (!order.customer_email) {
      showToast('error', 'Order does not have a customer email address.');
      return;
    }
    setSendingEmailOrderId(order.id);
    try {
      const { product, unitPrice, subtotal, gst, total } = getOrderEstimates(order);
      const parsedArt = parseOrderNotes(order.custom_notes);

      const res = await sendOrderConfirmationEmail({
        orderId: order.id,
        orderNumber: formatOrderRef(order.id),
        customerName: order.customer_name || 'Customer',
        customerEmail: order.customer_email,
        company: order.company || undefined,
        phone: order.phone,
        gstin: parsedArt.gstin || undefined,
        paymentMode: parsedArt.paymentPlan || undefined,
        amountPaid: parsedArt.paidNumber ?? undefined,
        balanceDue: parsedArt.balanceNumber ?? undefined,
        razorpayPaymentId: parsedArt.razorpayId || undefined,
        items: [
          {
            name: product?.name || `Custom Product (${order.product_id})`,
            color: parsedArt.color || undefined,
            size: parsedArt.size || undefined,
            printMethod: parsedArt.method || undefined,
            quantity: order.quantity || 1,
            price: unitPrice,
            totalPrice: subtotal,
            logoUrl: order.logo_url || undefined,
            backLogoUrl: parsedArt.backLogoUrl || undefined,
            mockupFrontUrl: parsedArt.frontMockupUrl || undefined,
            mockupBackUrl: parsedArt.backMockupUrl || undefined,
            designPositionSummary: parsedArt.placementSummary || parsedArt.cleanNotes || undefined,
          },
        ],
        subtotal,
        gstAmount: gst,
        shippingFee: 0,
        total,
        estimatedDispatch: '24-48h Fast Dispatch via Delhivery',
      });

      if (res.success) {
        showToast(
          'success',
          res.simulated
            ? `Email simulated for ${order.customer_email}`
            : `Order confirmation & artwork dispatched to ${order.customer_email}`
        );
      } else {
        showToast('error', res.message || 'Email delivery failed.');
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Error sending email.');
    } finally {
      setSendingEmailOrderId(null);
    }
  };

  const handleRecoverLead = async (leadId: string) => {
    await markCheckoutRecovered(leadId, 'MANUAL-RECOVERY');
    setAbandonedLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, recovered: true } : l))
    );
    showToast('success', 'Abandoned lead marked as Recovered.');
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

  const handleTestDelhiveryPin = async () => {
    setTestingPin(true);
    setTestPinResult(null);
    try {
      const res = await checkDelhiveryPincode(testPinInput);
      setTestPinResult(res);
    } finally {
      setTestingPin(false);
    }
  };

  const handleSchedulePickup = async () => {
    setSchedulingPickup(true);
    setPickupResult(null);
    try {
      const res = await requestDelhiveryPickup({
        pickupLocation: diagPickupName,
        pickupDate: pickupDateInput,
        pickupTime: pickupTimeInput,
        expectedPackageCount: Math.max(1, Number(pickupPkgCount) || 1),
      });
      setPickupResult({ success: res.success, message: res.message });
      if (res.success) {
        showToast('success', res.message);
      }
    } finally {
      setSchedulingPickup(false);
    }
  };

  // Analytics & Derived Datasets
  const analytics = useMemo(() => {
    const totalOrdersCount = orders.length;
    let totalRevenue = 0;
    let totalPaidRecorded = 0;
    let totalBalanceRecorded = 0;
    const statusCounts: Record<OrderStatus, number> = {
      pending: 0,
      approved: 0,
      'in-production': 0,
      dispatched: 0,
      delivered: 0,
    };
    const productStats = new Map<
      string,
      { name: string; orders: number; units: number; revenue: number }
    >();

    orders.forEach((o) => {
      const { product, total } = getOrderEstimates(o);
      totalRevenue += total;
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;

      const parsed = parseOrderNotes(o.custom_notes);
      if (parsed.paidNumber !== null) {
        totalPaidRecorded += parsed.paidNumber;
      }
      if (parsed.balanceNumber !== null) {
        totalBalanceRecorded += parsed.balanceNumber;
      }

      const prodKey = product?.id || o.product_id || 'custom';
      const prodName = product?.name || o.product_id || 'Custom Merchandise';
      const existing = productStats.get(prodKey) || {
        name: prodName,
        orders: 0,
        units: 0,
        revenue: 0,
      };
      existing.orders += 1;
      existing.units += o.quantity || 1;
      existing.revenue += total;
      productStats.set(prodKey, existing);
    });

    const topProducts = Array.from(productStats.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const totalAbandonedCount = abandonedLeads.length;
    const unrecoveredLeads = abandonedLeads.filter((l) => !l.recovered);
    const recoveredCount = abandonedLeads.filter((l) => l.recovered).length;
    const abandonedValueAtRisk = unrecoveredLeads.reduce(
      (acc, l) => acc + Number(l.cart_total || 0),
      0
    );

    const totalSessionsWithIntent = totalOrdersCount + totalAbandonedCount;
    const conversionRate =
      totalSessionsWithIntent > 0
        ? ((totalOrdersCount / totalSessionsWithIntent) * 100).toFixed(1)
        : '0.0';
    const recoveryRate =
      totalAbandonedCount > 0
        ? ((recoveredCount / totalAbandonedCount) * 100).toFixed(1)
        : '0.0';
    const aov = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;

    return {
      totalOrdersCount,
      totalRevenue,
      totalPaidRecorded,
      totalBalanceRecorded,
      statusCounts,
      topProducts,
      totalAbandonedCount,
      unrecoveredCount: unrecoveredLeads.length,
      recoveredCount,
      abandonedValueAtRisk,
      conversionRate,
      recoveryRate,
      aov,
    };
  }, [orders, abandonedLeads]);

  const filteredOrders = useMemo(() => {
    const q = orderSearchQuery.toLowerCase().trim();
    return orders.filter((o) => {
      const matchesSearch =
        !q ||
        o.id.toLowerCase().includes(q) ||
        formatOrderRef(o.id).toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_email?.toLowerCase().includes(q) ||
        o.phone?.includes(q) ||
        o.company?.toLowerCase().includes(q) ||
        (o.tracking_number && o.tracking_number.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, orderSearchQuery, statusFilter]);

  const readyToShipOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status !== 'delivered' &&
          (!o.tracking_number || o.tracking_number.toLowerCase().includes('awaiting'))
      ),
    [orders]
  );

  const activeAwbOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          Boolean(o.tracking_number) &&
          !o.tracking_number!.toLowerCase().includes('awaiting')
      ),
    [orders]
  );

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
        leadFilter === 'all'
          ? true
          : leadFilter === 'recovered'
          ? l.recovered
          : !l.recovered;
      return matchesSearch && matchesRecovery;
    });
  }, [abandonedLeads, leadSearchQuery, leadFilter]);

  const handleExportOrdersCsv = () => {
    const headers = [
      'Order Ref',
      'Date',
      'Customer',
      'Company',
      'Phone',
      'Email',
      'Product',
      'Qty',
      'Est Total (INR)',
      'Status',
      'Payment Plan',
      'Paid (INR)',
      'Balance Due (INR)',
      'Courier',
      'AWB',
      'City',
      'Pincode',
    ];
    const escapeCsv = (val: unknown) => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };
    const rows = filteredOrders.map((o) => {
      const { product, total } = getOrderEstimates(o);
      const parsed = parseOrderNotes(o.custom_notes);
      return [
        formatOrderRef(o.id),
        new Date(o.created_at).toLocaleString('en-IN'),
        o.customer_name,
        o.company || '',
        o.phone,
        o.customer_email,
        product?.name || o.product_id || '',
        o.quantity,
        total,
        STATUS_META[o.status].label,
        parsed.paymentPlan || '',
        parsed.paidAmount || '',
        parsed.balanceDue || '',
        o.courier_partner || '',
        o.tracking_number || '',
        parsed.parsedAddress.city,
        parsed.parsedAddress.pincode,
      ]
        .map(escapeCsv)
        .join(',');
    });
    const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TeqqnoWorld_Orders_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('success', `Exported ${filteredOrders.length} orders to CSV.`);
  };

  // =========================================================================
  // PIN GATE SCREEN
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A0B0E] text-zinc-100 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-[#121318] border border-white/[0.08] rounded-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-[#FF7A00]/15 border border-[#FF7A00]/30 text-[#FF7A00] flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <p className="text-xs text-zinc-400">Business Owner Access</p>
            <h1 className="font-display font-bold text-2xl tracking-tight text-white">
              TeqqnoWorld Operations Hub
            </h1>
            <p className="text-xs text-zinc-400">
              Enter your 4-digit security PIN to manage orders, Delhivery shipments, and payments.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 text-center">
                Master Security PIN
              </label>
              <input
                type="password"
                maxLength={8}
                autoFocus
                placeholder="••••"
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value)}
                className="w-full text-center tracking-[0.5em] text-2xl font-mono py-3.5 bg-[#0A0B0E] border border-white/[0.12] rounded-xl text-white focus:border-[#FF7A00] outline-none transition-colors placeholder:text-zinc-600"
              />
            </div>

            {pinError && (
              <div className="text-center text-xs text-red-300 bg-red-500/10 border border-red-500/25 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[#FF7A00] hover:bg-[#e86e00] text-white font-semibold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm min-h-[44px]"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock Operations Hub</span>
            </button>
          </form>

          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono tabular-nums">Default PIN: <strong className="text-zinc-200">9949</strong></span>
            <button
              onClick={onBackToStore}
              className="text-[#FF7A00] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Return to Store</span>
              <ArrowRightIcon />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navItems: Array<{
    id: AdminTab;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'orders', label: 'Orders Queue', shortLabel: 'Orders', icon: Package, badge: orders.length },
    { id: 'dispatch', label: 'Delhivery & Dispatch', shortLabel: 'Delhivery', icon: Truck, badge: readyToShipOrders.length },
    { id: 'abandoned', label: 'Abandoned Leads', shortLabel: 'Leads', icon: ShoppingCart, badge: analytics.unrecoveredCount },
    { id: 'analytics', label: 'Analytics & Revenue', shortLabel: 'Analytics', icon: BarChart3 },
    { id: 'schema', label: 'Integrations & Setup', shortLabel: 'Setup', icon: Layers },
  ];

  const activeNavMeta = navItems.find((n) => n.id === activeTab)!;

  return (
    <div className="min-h-screen bg-[#0A0B0E] text-zinc-100 flex font-sans">
      {/* Non-blocking Status Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[70] text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border ${
            toast.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-200'
              : 'bg-red-950/95 border-red-500/40 text-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DESKTOP FIXED SIDEBAR (lg+) */}
      {/* ===================================================================== */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-[#121318] border-r border-white/[0.08] z-30">
        {/* Sidebar Brand */}
        <div className="px-5 h-16 flex items-center justify-between border-b border-white/[0.08]">
          <button
            onClick={onBackToStore}
            className="text-left group cursor-pointer"
          >
            <div className="font-display font-bold text-base tracking-tight text-white whitespace-nowrap">
              <span className="text-[#FF7A00]">Teqqno</span>World
            </div>
            <div className="text-[11px] text-zinc-400">Operations Hub</div>
          </button>
          <button
            onClick={handleLock}
            className="p-2 rounded-lg text-zinc-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
            title="Lock Admin Hub"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#FF7A00] text-white font-semibold'
                    : 'text-zinc-300 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                  <span className="truncate">{item.label}</span>
                </span>
                {typeof item.badge === 'number' && (
                  <span
                    className={`font-mono tabular-nums text-[11px] ${
                      isActive ? 'text-white/90 font-semibold' : 'text-zinc-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* System Integrations Summary */}
        <div className="p-4 border-t border-white/[0.08] space-y-3 text-xs">
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-zinc-400">
              <span>Database</span>
              <span className={isSupabaseConfigured() ? 'text-emerald-400 font-medium' : 'text-amber-400'}>
                {isSupabaseConfigured() ? 'Connected' : 'Pending'}
              </span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Hostinger SMTP</span>
              <span className={smtpStatus?.configured ? 'text-emerald-400 font-medium' : 'text-amber-400'}>
                {smtpStatus?.configured ? 'Active' : 'Setup'}
              </span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Delhivery One</span>
              <span className={delhiveryStatus?.configured ? 'text-emerald-400 font-medium' : 'text-amber-400'}>
                {delhiveryStatus?.configured ? 'Active' : 'Setup'}
              </span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Razorpay</span>
              <span className={razorpayStatus?.configured ? 'text-emerald-400 font-medium' : 'text-zinc-400'}>
                {razorpayStatus?.configured ? 'Live' : 'Sandbox'}
              </span>
            </div>
          </div>

          <button
            onClick={onBackToStore}
            className="w-full py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-[#FF7A00]" />
            <span>Open Customer Store</span>
          </button>
        </div>
      </aside>

      {/* Mobile Slide-Out Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[82vw] bg-[#121318] border-r border-white/[0.08] flex flex-col h-full z-10">
            <div className="px-4 h-14 flex items-center justify-between border-b border-white/[0.08]">
              <span className="font-display font-bold text-base text-white">
                <span className="text-[#FF7A00]">Teqqno</span>World Admin
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-zinc-400 hover:text-white min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium min-h-[44px] ${
                      isActive ? 'bg-[#FF7A00] text-white font-semibold' : 'text-zinc-300 hover:bg-white/[0.05]'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </span>
                    {typeof item.badge === 'number' && (
                      <span className="font-mono tabular-nums text-xs opacity-90">{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-white/[0.08] space-y-2">
              <button
                onClick={onBackToStore}
                className="w-full py-2.5 px-4 rounded-xl bg-white/[0.06] text-zinc-200 text-xs font-medium flex items-center justify-center gap-2 min-h-[44px]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Customer Store</span>
              </button>
              <button
                onClick={handleLock}
                className="w-full py-2.5 px-4 rounded-xl bg-red-500/10 text-red-300 border border-red-500/20 text-xs font-medium flex items-center justify-center gap-2 min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span>Lock Admin Hub</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MAIN CONTENT SHELL (Responsive Offset for Desktop Sidebar) */}
      {/* ===================================================================== */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Command Header */}
        <header className="sticky top-0 z-20 h-14 sm:h-16 bg-[#0A0B0E]/90 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-[#121318] border border-white/[0.08] text-zinc-300 hover:text-white min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-zinc-500 hidden sm:inline">Operations</span>
              <span className="text-zinc-600 hidden sm:inline">/</span>
              <h1 className="font-display font-semibold text-white truncate">
                {activeNavMeta.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadData}
              disabled={loadingOrders || loadingLeads}
              className="px-3 py-2 rounded-xl bg-[#121318] hover:bg-white/[0.06] border border-white/[0.08] text-xs font-medium text-zinc-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap min-h-[40px]"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loadingOrders || loadingLeads ? 'animate-spin text-[#FF7A00]' : 'text-zinc-400'}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {activeTab === 'orders' && (
              <button
                onClick={handleExportOrdersCsv}
                className="px-3 py-2 rounded-xl bg-[#121318] hover:bg-white/[0.06] border border-white/[0.08] text-xs font-medium text-zinc-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[40px]"
              >
                <Download className="w-3.5 h-3.5 text-[#FF7A00]" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            )}

            <button
              onClick={onBackToStore}
              className="px-3.5 py-2 rounded-xl bg-[#FF7A00] hover:bg-[#e86e00] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[40px]"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Storefront</span>
            </button>
          </div>
        </header>

        {/* Mobile/Tablet Scrollable Tab Strip (below header on < lg) */}
        <div className="lg:hidden border-b border-white/[0.08] bg-[#121318] px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 min-h-[40px] ${
                  isActive ? 'bg-[#FF7A00] text-white font-semibold' : 'text-zinc-300 hover:bg-white/[0.05]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.shortLabel}</span>
                {typeof item.badge === 'number' && (
                  <span className="font-mono tabular-nums text-[10px] opacity-90">({item.badge})</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Workspace Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* ================================================================= */}
          {/* TAB 1: ORDERS QUEUE */}
          {/* ================================================================= */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              {/* 4 Clean Summary Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-[#121318] border border-white/[0.08] rounded-2xl p-4 sm:p-5">
                  <div className="text-xs text-zinc-400">Total Custom Orders</div>
                  <div className="text-2xl sm:text-3xl font-display font-bold text-white font-mono tabular-nums mt-1">
                    {orders.length}
                  </div>
                  <div className="text-xs text-emerald-400 font-mono tabular-nums mt-1">
                    ₹{analytics.totalRevenue.toLocaleString('en-IN')} est. value
                  </div>
                </div>

                <div className="bg-[#121318] border border-white/[0.08] rounded-2xl p-4 sm:p-5">
                  <div className="text-xs text-zinc-400">Needs Proof Review</div>
                  <div className="text-2xl sm:text-3xl font-display font-bold text-amber-400 font-mono tabular-nums mt-1">
                    {analytics.statusCounts.pending}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">Awaiting verification</div>
                </div>

                <div className="bg-[#121318] border border-white/[0.08] rounded-2xl p-4 sm:p-5">
                  <div className="text-xs text-zinc-400">Approved &amp; Printing</div>
                  <div className="text-2xl sm:text-3xl font-display font-bold text-sky-400 font-mono tabular-nums mt-1">
                    {analytics.statusCounts.approved + analytics.statusCounts['in-production']}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">Active production queue</div>
                </div>

                <div className="bg-[#121318] border border-white/[0.08] rounded-2xl p-4 sm:p-5">
                  <div className="text-xs text-zinc-400">Shipped &amp; Delivered</div>
                  <div className="text-2xl sm:text-3xl font-display font-bold text-emerald-400 font-mono tabular-nums mt-1">
                    {analytics.statusCounts.dispatched + analytics.statusCounts.delivered}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">Delhivery AWBs assigned</div>
                </div>
              </div>

              {/* Search, Status Filter Tabs, and View Switcher */}
              <div className="bg-[#121318] border border-white/[0.08] rounded-2xl p-3 sm:p-4 space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by Order Ref, Customer, Phone, Email, Company, or AWB..."
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#0A0B0E] border border-white/[0.1] rounded-xl text-xs text-white placeholder:text-zinc-500 focus:border-[#FF7A00] outline-none min-h-[42px]"
                    />
                  </div>

                  {/* Desktop View Switcher */}
                  <div className="hidden md:flex items-center gap-1 p-1 bg-[#0A0B0E] border border-white/[0.08] rounded-xl shrink-0">
                    <button
                      onClick={() => setOrdersViewMode('table')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                        ordersViewMode === 'table'
                          ? 'bg-white/[0.1] text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Table</span>
                    </button>
                    <button
                      onClick={() => setOrdersViewMode('cards')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                        ordersViewMode === 'cards'
                          ? 'bg-white/[0.1] text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Cards</span>
                    </button>
                  </div>
                </div>

                {/* Clickable Status Filter Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                  {(
                    [
                      { id: 'all', label: 'All Orders', count: orders.length },
                      { id: 'pending', label: 'Pending', count: analytics.statusCounts.pending },
                      { id: 'approved', label: 'Approved', count: analytics.statusCounts.approved },
                      { id: 'in-production', label: 'In Production', count: analytics.statusCounts['in-production'] },
                      { id: 'dispatched', label: 'Dispatched', count: analytics.statusCounts.dispatched },
                      { id: 'delivered', label: 'Delivered', count: analytics.statusCounts.delivered },
                    ] as const
                  ).map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setStatusFilter(st.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors min-h-[36px] ${
                        statusFilter === st.id
                          ? 'bg-[#FF7A00] text-white font-semibold'
                          : 'bg-[#0A0B0E] text-zinc-400 hover:text-white border border-white/[0.06]'
                      }`}
                    >
                      {st.label}{' '}
                      <span className="font-mono tabular-nums opacity-80">({st.count})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Orders Loading / Empty / Data */}
              {loadingOrders ? (
                <div className="bg-[#121318] border border-white/[0.08] rounded-2xl p-6 space-y-3">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="h-14 rounded-xl bg-white/[0.04] animate-pulse" />
                  ))}
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-16 bg-[#121318] rounded-2xl border border-white/[0.08] space-y-3">
                  <Package className="w-10 h-10 text-zinc-600 mx-auto" />
                  <h3 className="font-semibold text-white text-base">No matching orders</h3>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    {orderSearchQuery || statusFilter !== 'all'
                      ? 'Clear your search or status filter to view all orders.'
                      : 'Custom orders placed on your storefront will appear here automatically.'}
                  </p>
                  {(orderSearchQuery || statusFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setOrderSearchQuery('');
                        setStatusFilter('all');
                      }}
                      className="px-4 py-2 rounded-xl bg-[#FF7A00] text-white text-xs font-semibold cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* DESKTOP HIGH-DENSITY SCANNABLE TABLE */}
                  {ordersViewMode === 'table' && (
                    <div className="hidden md:block bg-[#121318] border border-white/[0.08] rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] font-medium text-zinc-400">
                              <th className="py-3.5 px-4">Order &amp; Date</th>
                              <th className="py-3.5 px-4">Customer</th>
                              <th className="py-3.5 px-4">Artwork &amp; Specs</th>
                              <th className="py-3.5 px-4 text-right">Amount &amp; Payment</th>
                              <th className="py-3.5 px-4">Stage</th>
                              <th className="py-3.5 px-4">Delhivery / Courier</th>
                              <th className="py-3.5 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.06]">
                            {filteredOrders.map((order) => {
                              const { product, total } = getOrderEstimates(order);
                              const parsed = parseOrderNotes(order.custom_notes);
                              const hasRealAwb =
                                Boolean(order.tracking_number) &&
                                !order.tracking_number!.toLowerCase().includes('awaiting');

                              return (
                                <tr
                                  key={order.id}
                                  className="hover:bg-white/[0.025] transition-colors group"
                                >
                                  <td className="py-3.5 px-4 align-top whitespace-nowrap">
                                    <button
                                      onClick={() => setInspectingOrder(order)}
                                      className="font-mono font-bold text-[#FF7A00] hover:underline cursor-pointer block"
                                    >
                                      #{formatOrderRef(order.id)}
                                    </button>
                                    <div className="text-[11px] text-zinc-400 font-mono tabular-nums mt-0.5">
                                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </div>
                                  </td>

                                  <td className="py-3.5 px-4 align-top max-w-[200px]">
                                    <div className="font-semibold text-white truncate">
                                      {order.customer_name}
                                    </div>
                                    {order.company && (
                                      <div className="text-[11px] text-zinc-400 truncate">
                                        {order.company}
                                      </div>
                                    )}
                                    <div className="text-[11px] text-zinc-400 font-mono tabular-nums mt-0.5">
                                      {order.phone}
                                    </div>
                                  </td>

                                  <td className="py-3.5 px-4 align-top">
                                    <div className="flex items-start gap-2.5">
                                      <div className="flex items-center gap-1 shrink-0">
                                        {order.logo_url ? (
                                          <button
                                            onClick={() => setPreviewLogoUrl(order.logo_url)}
                                            className="w-10 h-10 rounded-lg border border-white/[0.12] bg-zinc-900 p-0.5 overflow-hidden cursor-zoom-in"
                                            title="Inspect customer logo"
                                          >
                                            <img
                                              src={order.logo_url}
                                              alt="Logo"
                                              className="w-full h-full object-contain"
                                            />
                                          </button>
                                        ) : (
                                          <div className="w-10 h-10 rounded-lg border border-white/[0.08] bg-[#0A0B0E] flex items-center justify-center text-[10px] text-zinc-500">
                                            Logo
                                          </div>
                                        )}
                                        {parsed.frontMockupUrl && (
                                          <button
                                            onClick={() => setPreviewLogoUrl(parsed.frontMockupUrl)}
                                            className="w-10 h-10 rounded-lg border border-[#FF7A00]/40 bg-slate-100 p-0.5 overflow-hidden cursor-zoom-in"
                                            title="Inspect placed mockup"
                                          >
                                            <img
                                              src={parsed.frontMockupUrl}
                                              alt="Mockup"
                                              className="w-full h-full object-contain"
                                            />
                                          </button>
                                        )}
                                      </div>
                                      <div className="min-w-0 max-w-[240px]">
                                        <div className="font-semibold text-zinc-100 truncate">
                                          {product?.name || order.product_id || 'Custom Product'}
                                        </div>
                                        <div className="text-[11px] text-zinc-400 mt-0.5">
                                          <span className="font-mono tabular-nums font-semibold text-zinc-200">
                                            {order.quantity} pcs
                                          </span>
                                          {parsed.color && <span> · {parsed.color}</span>}
                                          {parsed.size && <span> · {parsed.size}</span>}
                                          {parsed.method && <span> · {parsed.method}</span>}
                                        </div>
                                        {parsed.parsedAddress.city && (
                                          <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                                            {parsed.parsedAddress.city}
                                            {parsed.parsedAddress.pincode
                                              ? ` - ${parsed.parsedAddress.pincode}`
                                              : ''}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>

                                  <td className="py-3.5 px-4 align-top text-right whitespace-nowrap font-mono tabular-nums">
                                    <div className="font-bold text-white">
                                      ₹{total.toLocaleString('en-IN')}
                                    </div>
                                    {parsed.paidAmount && (
                                      <div className="text-[11px] text-emerald-400 mt-0.5">
                                        Paid ₹{parsed.paidAmount}
                                      </div>
                                    )}
                                    {parsed.balanceDue && parsed.balanceDue !== '0' && (
                                      <div className="text-[11px] text-amber-400">
                                        Due ₹{parsed.balanceDue}
                                      </div>
                                    )}
                                  </td>

                                  <td className="py-3.5 px-4 align-top whitespace-nowrap">
                                    <select
                                      value={order.status}
                                      disabled={updatingOrderId === order.id}
                                      onChange={(e) =>
                                        handleStatusChange(order.id, e.target.value as OrderStatus)
                                      }
                                      className={`text-xs font-semibold py-1.5 px-2.5 rounded-lg border outline-none cursor-pointer ${STATUS_META[order.status].colorClass}`}
                                    >
                                      <option value="pending">Pending</option>
                                      <option value="approved">Approved</option>
                                      <option value="in-production">In Production</option>
                                      <option value="dispatched">Dispatched</option>
                                      <option value="delivered">Delivered</option>
                                    </select>
                                  </td>

                                  <td className="py-3.5 px-4 align-top whitespace-nowrap">
                                    {hasRealAwb ? (
                                      <div className="space-y-1">
                                        <div className="font-mono text-zinc-200 font-semibold">
                                          {order.tracking_number}
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px]">
                                          <button
                                            onClick={() => handleTrackDelhiveryOrder(order.tracking_number!)}
                                            className="text-amber-400 hover:underline cursor-pointer"
                                          >
                                            Track
                                          </button>
                                          <span className="text-zinc-600">·</span>
                                          <a
                                            href={getDelhiveryLabelUrl(order.tracking_number!)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-emerald-400 hover:underline"
                                          >
                                            Label
                                          </a>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => openDispatchModalForOrder(order)}
                                        className="px-2.5 py-1.5 rounded-lg bg-[#FF7A00]/15 hover:bg-[#FF7A00]/25 text-[#FF7A00] border border-[#FF7A00]/30 text-[11px] font-semibold cursor-pointer"
                                      >
                                        Book Delhivery
                                      </button>
                                    )}
                                  </td>

                                  <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                                    <div className="inline-flex items-center gap-1">
                                      <button
                                        onClick={() => setInspectingOrder(order)}
                                        className="p-2 rounded-lg bg-white/[0.05] hover:bg-[#FF7A00] text-zinc-300 hover:text-white transition-colors cursor-pointer"
                                        title="Open full order inspector"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      <a
                                        href={getDirectClientWhatsAppUrl({
                                          phone: order.phone,
                                          name: order.customer_name,
                                          type: 'order',
                                          orderId: formatOrderRef(order.id),
                                          status: order.status,
                                          courier: order.courier_partner,
                                          trackingNumber: order.tracking_number,
                                        })}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 rounded-lg bg-[#1EBE5D]/15 hover:bg-[#1EBE5D] text-[#1EBE5D] hover:text-white transition-colors"
                                        title="WhatsApp client"
                                      >
                                        <WhatsAppIcon className="w-3.5 h-3.5" />
                                      </a>
                                      <button
                                        onClick={() => generateAdminOrderInvoicePdf(order, PRODUCTS)}
                                        className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] text-zinc-300 hover:text-white transition-colors cursor-pointer"
                                        title="Download Tax Invoice PDF"
                                      >
                                        <Receipt className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* RESPONSIVE CARDS VIEW (Always on Mobile/Tablet, optional on Desktop) */}
                  <div className={`${ordersViewMode === 'table' ? 'md:hidden' : ''} space-y-4`}>
                    {filteredOrders.map((order) => {
                      const { product, unitPrice, total } = getOrderEstimates(order);
                      const parsed = parseOrderNotes(order.custom_notes);
                      const hasRealAwb =
                        Boolean(order.tracking_number) &&
                        !order.tracking_number!.toLowerCase().includes('awaiting');

                      return (
                        <div
                          key={order.id}
                          className="bg-[#121318] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4"
                        >
                          {/* Top Row: Order Ref + Meta + Revenue */}
                          <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-white/[0.07]">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <button
                                  onClick={() => setInspectingOrder(order)}
                                  className="font-mono font-bold text-[#FF7A00] hover:underline cursor-pointer"
                                >
                                  #{formatOrderRef(order.id)}
                                </button>
                                <span className="text-zinc-600">·</span>
                                <span className="text-zinc-400 font-mono tabular-nums">
                                  {new Date(order.created_at).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                {order.company && (
                                  <>
                                    <span className="text-zinc-600">·</span>
                                    <span className="text-zinc-300 font-medium">{order.company}</span>
                                  </>
                                )}
                              </div>
                              <div className="text-sm font-semibold text-white">
                                {order.customer_name}{' '}
                                <span className="text-xs font-mono text-zinc-400 font-normal">
                                  ({order.phone})
                                </span>
                              </div>
                            </div>

                            <div className="text-right font-mono tabular-nums">
                              <div className="text-base font-bold text-white">
                                ₹{total.toLocaleString('en-IN')}
                              </div>
                              {parsed.paidAmount && (
                                <div className="text-[11px] text-emerald-400">
                                  Paid ₹{parsed.paidAmount}
                                  {parsed.balanceDue && parsed.balanceDue !== '0'
                                    ? ` · Due ₹${parsed.balanceDue}`
                                    : ''}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Middle Row: Artwork Previews + Parsed Product Specs */}
                          <div className="flex flex-col sm:flex-row items-start gap-4">
                            <div className="flex items-center gap-2 shrink-0">
                              {order.logo_url ? (
                                <button
                                  onClick={() => setPreviewLogoUrl(order.logo_url)}
                                  className="w-16 h-16 rounded-xl border border-white/[0.12] bg-[#0A0B0E] p-1 relative overflow-hidden cursor-zoom-in"
                                  title="Client Logo"
                                >
                                  <img
                                    src={order.logo_url}
                                    alt="Client Logo"
                                    className="w-full h-full object-contain"
                                  />
                                  <span className="block text-[9px] font-mono text-zinc-400 text-center">
                                    Logo
                                  </span>
                                </button>
                              ) : (
                                <div className="w-16 h-16 rounded-xl border border-white/[0.08] bg-[#0A0B0E] flex items-center justify-center text-[10px] text-zinc-500">
                                  No Logo
                                </div>
                              )}
                              {parsed.frontMockupUrl && (
                                <button
                                  onClick={() => setPreviewLogoUrl(parsed.frontMockupUrl)}
                                  className="w-16 h-16 rounded-xl border border-[#FF7A00]/40 bg-slate-100 p-1 relative overflow-hidden cursor-zoom-in"
                                  title="Placed Front Mockup"
                                >
                                  <img
                                    src={parsed.frontMockupUrl}
                                    alt="Mockup Front"
                                    className="w-full h-full object-contain"
                                  />
                                </button>
                              )}
                              {parsed.backMockupUrl && (
                                <button
                                  onClick={() => setPreviewLogoUrl(parsed.backMockupUrl)}
                                  className="w-16 h-16 rounded-xl border border-sky-500/40 bg-slate-100 p-1 relative overflow-hidden cursor-zoom-in"
                                  title="Placed Back Mockup"
                                >
                                  <img
                                    src={parsed.backMockupUrl}
                                    alt="Mockup Back"
                                    className="w-full h-full object-contain"
                                  />
                                </button>
                              )}
                            </div>

                            <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                              <div className="font-semibold text-white">
                                {product?.name || order.product_id || 'Custom Product'}{' '}
                                <span className="font-mono text-[#FF7A00]">
                                  · {order.quantity} pcs @ ₹{unitPrice}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-zinc-400">
                                {parsed.color && (
                                  <div>
                                    Color: <span className="text-zinc-200">{parsed.color}</span>
                                  </div>
                                )}
                                {parsed.size && (
                                  <div>
                                    Size: <span className="text-zinc-200">{parsed.size}</span>
                                  </div>
                                )}
                                {parsed.method && (
                                  <div>
                                    Method: <span className="text-zinc-200">{parsed.method}</span>
                                  </div>
                                )}
                                {parsed.parsedAddress.city && (
                                  <div>
                                    Destination:{' '}
                                    <span className="text-zinc-200">
                                      {parsed.parsedAddress.city} {parsed.parsedAddress.pincode}
                                    </span>
                                  </div>
                                )}
                              </div>
                              {parsed.placementSummary && (
                                <div className="text-[11px] text-zinc-400 truncate">
                                  Layout: <span className="text-zinc-300">{parsed.placementSummary}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Bottom Row: Controls & Action Bar */}
                          <div className="pt-3 border-t border-white/[0.07] flex flex-wrap items-center justify-between gap-2.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={order.status}
                                disabled={updatingOrderId === order.id}
                                onChange={(e) =>
                                  handleStatusChange(order.id, e.target.value as OrderStatus)
                                }
                                className={`text-xs font-semibold py-2 px-3 rounded-xl border outline-none cursor-pointer min-h-[40px] ${STATUS_META[order.status].colorClass}`}
                              >
                                <option value="pending">Pending Review</option>
                                <option value="approved">Proof Approved</option>
                                <option value="in-production">In Production</option>
                                <option value="dispatched">Dispatched</option>
                                <option value="delivered">Delivered</option>
                              </select>

                              {hasRealAwb ? (
                                <div className="flex items-center gap-2 text-xs font-mono text-zinc-300 bg-[#0A0B0E] border border-white/[0.08] px-3 py-2 rounded-xl">
                                  <span>AWB: {order.tracking_number}</span>
                                  <button
                                    onClick={() => handleTrackDelhiveryOrder(order.tracking_number!)}
                                    className="text-amber-400 hover:underline font-sans cursor-pointer"
                                  >
                                    Track
                                  </button>
                                  <a
                                    href={getDelhiveryLabelUrl(order.tracking_number!)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-400 hover:underline font-sans"
                                  >
                                    Label
                                  </a>
                                </div>
                              ) : (
                                <button
                                  onClick={() => openDispatchModalForOrder(order)}
                                  className="px-3.5 py-2 rounded-xl bg-[#FF7A00] hover:bg-[#e86e00] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                  <span>Book Delhivery</span>
                                </button>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => setInspectingOrder(order)}
                                className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Inspect</span>
                              </button>
                              <button
                                onClick={() => handleSendOrderConfirmationEmail(order)}
                                disabled={sendingEmailOrderId === order.id}
                                className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                              >
                                <Mail className="w-3.5 h-3.5 text-[#FF7A00]" />
                                <span>{sendingEmailOrderId === order.id ? 'Sending...' : 'Email'}</span>
                              </button>
                              <button
                                onClick={() => generateAdminOrderInvoicePdf(order, PRODUCTS)}
                                className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                              >
                                <Download className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Invoice</span>
                              </button>
                              <a
                                href={getDirectClientWhatsAppUrl({
                                  phone: order.phone,
                                  name: order.customer_name,
                                  type: 'order',
                                  orderId: formatOrderRef(order.id),
                                  status: order.status,
                                  courier: order.courier_partner,
                                  trackingNumber: order.tracking_number,
                                })}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 rounded-xl bg-[#1EBE5D] hover:bg-[#19a851] text-white text-xs font-semibold flex items-center gap-1.5 min-h-[40px]"
                              >
                                <WhatsAppIcon className="w-3.5 h-3.5 text-white" />
                                <span>WhatsApp</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: DELHIVERY & DISPATCH CENTER */}
          {/* ================================================================= */}
          {activeTab === 'dispatch' && (
            <div className="space-y-6">
              {/* Top Operational Tools Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Pickup Scheduler (6 cols) */}
                <div className="lg:col-span-6 bg-[#121318] border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="font-display font-semibold text-base text-white">
                        Schedule Delhivery Pickup
                      </h2>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Book pickup rider for your Hyderabad fulfillment facilities
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-mono font-semibold ${
                        delhiveryStatus?.configured ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {delhiveryStatus?.configured ? 'API Active' : 'Token Pending'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-zinc-400 mb-1">Warehouse Facility</label>
                      <select
                        value={diagPickupName}
                        onChange={(e) => setDiagPickupName(e.target.value)}
                        className="w-full bg-[#0A0B0E] border border-white/[0.1] rounded-xl py-2.5 px-3 text-white outline-none focus:border-[#FF7A00]"
                      >
                        <option value="Teqqnoworld">Teqqnoworld (Hyderabad - 502032)</option>
                        <option value="Teqqnoworld 2">Teqqnoworld 2 (Hyderabad - 500090)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-zinc-400 mb-1">Pickup Date</label>
                      <input
                        type="date"
                        value={pickupDateInput}
                        onChange={(e) => setPickupDateInput(e.target.value)}
                        className="w-full bg-[#0A0B0E] border border-white/[0.1] rounded-xl py-2.5 px-3 text-white font-mono outline-none focus:border-[#FF7A00]"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 mb-1">Pickup Slot</label>
                      <select
                        value={pickupTimeInput}
                        onChange={(e) => setPickupTimeInput(e.target.value)}
                        className="w-full bg-[#0A0B0E] border border-white/[0.1] rounded-xl py-2.5 px-3 text-white font-mono outline-none focus:border-[#FF7A00]"
                      >
                        <option value="11:00:00">11:00 AM - 02:00 PM</option>
                        <option value="14:00:00">02:00 PM - 05:00 PM</option>
                        <option value="17:00:00">05:00 PM - 07:00 PM</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-zinc-400 mb-1">Package Count</label>
                      <input
                        type="number"
                        min={1}
                        value={pickupPkgCount}
                        onChange={(e) => setPickupPkgCount(Number(e.target.value) || 1)}
                        className="w-full bg-[#0A0B0E] border border-white/[0.1] rounded-xl py-2.5 px-3 text-white font-mono outline-none focus:border-[#FF7A00]"
                      />
                    </div>
                  </div>

                  {pickupResult && (
                    <div
                      className={`p-3 rounded-xl border text-xs ${
                        pickupResult.success
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-red-500/10 border-red-500/30 text-red-300'
                      }`}
                    >
                      {pickupResult.message}
                    </div>
                  )}

                  <button
                    onClick={handleSchedulePickup}
                    disabled={schedulingPickup}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#FF7A00] hover:bg-[#e86e00] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[42px]"
                  >
                    {schedulingPickup ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Calendar className="w-4 h-4" />
                    )}
                    <span>{schedulingPickup ? 'Scheduling...' : 'Request Delhivery Pickup'}</span>
                  </button>
                </div>

                {/* Live AWB Track + Pincode Checker (6 cols) */}
                <div className="lg:col-span-6 bg-[#121318] border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-5">
                  <div className="space-y-3">
                    <h2 className="font-display font-semibold text-base text-white">
                      Quick AWB Tracker &amp; Pincode Check
                    </h2>
                    <form onSubmit={handleQuickTrackLookup} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={quickTrackAwb}
                        onChange={(e) => setQuickTrackAwb(e.target.value)}
                        placeholder="Enter Delhivery Waybill / AWB number..."
                        className="flex-1 bg-[#0A0B0E] border border-white/[0.1] rounded-xl py-2.5 px-3.5 text-xs font-mono text-white outline-none focus:border-[#FF7A00]"
                      />
                      <button
                        type="submit"
                        disabled={loadingQuickTrack}
                        className="px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-semibold cursor-pointer disabled:opacity-50 whitespace-nowrap"
                      >
                        {loadingQuickTrack ? 'Tracking...' : 'Track AWB'}
                      </button>
                    </form>
                    {quickTrackResult && (
                      <div className="p-3 rounded-xl bg-[#0A0B0E] border border-white/[0.08] text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Waybill: {quickTrackResult.waybill}</span>
                          <span className="font-semibold text-emerald-400">
                            {quickTrackResult.currentStatus || 'Pending'}
                          </span>
                        </div>
                        {quickTrackResult.statusLocation && (
                          <div className="text-zinc-300">Location: {quickTrackResult.statusLocation}</div>
                        )}
                        {quickTrackResult.message && !quickTrackResult.success && (
                          <div className="text-amber-300">{quickTrackResult.message}</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-white/[0.07] space-y-3">
                    <div className="text-xs font-medium text-zinc-300">
                      Verify Customer Delivery Pincode (Prepaid Serviceability)
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={testPinInput}
                        onChange={(e) => setTestPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="6-digit pincode"
                        className="w-40 bg-[#0A0B0E] border border-white/[0.1] rounded-xl py-2.5 px-3.5 text-xs font-mono text-white outline-none focus:border-[#FF7A00]"
                      />
                      <button
                        onClick={handleTestDelhiveryPin}
                        disabled={testingPin}
                        className="px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {testingPin ? 'Checking...' : 'Check Pincode'}
                      </button>
                    </div>
                    {testPinResult && (
                      <div
                        className={`p-3 rounded-xl border text-xs font-mono ${
                          testPinResult.serviceable
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                            : 'bg-red-500/10 border-red-500/25 text-red-300'
                        }`}
                      >
                        {testPinResult.message}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Ready to Ship vs Shipped Queues */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ready to Ship */}
                <div className="bg-[#121318] border border-white/[0.08] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-semibold text-base text-white">
                      Ready to Manifest ({readyToShipOrders.length})
                    </h3>
                    <span className="text-xs text-zinc-400">Awaiting AWB</span>
                  </div>
                  {readyToShipOrders.length === 0 ? (
                    <div className="py-10 text-center text-xs text-zinc-400">
                      All active orders have waybills assigned.
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.07]">
                      {readyToShipOrders.map((o) => {
                        const parsed = parseOrderNotes(o.custom_notes);
                        const { product } = getOrderEstimates(o);
                        return (
                          <div
                            key={o.id}
                            className="py-3 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="font-mono font-bold text-[#FF7A00]">
                                #{formatOrderRef(o.id)}
                                <span className="text-zinc-300 font-sans font-medium ml-2">
                                  {o.customer_name}
                                </span>
                              </div>
                              <div className="text-zinc-400 truncate mt-0.5">
                                {product?.name || o.product_id} ({o.quantity} pcs)
                                {parsed.parsedAddress.city
                                  ? ` · ${parsed.parsedAddress.city} ${parsed.parsedAddress.pincode}`
                                  : ''}
                              </div>
                            </div>
                            <button
                              onClick={() => openDispatchModalForOrder(o)}
                              className="px-3 py-2 rounded-xl bg-[#FF7A00] hover:bg-[#e86e00] text-white text-xs font-semibold shrink-0 cursor-pointer"
                            >
                              Book AWB
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Active Shipped AWBs */}
                <div className="bg-[#121318] border border-white/[0.08] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-semibold text-base text-white">
                      Manifested Shipments ({activeAwbOrders.length})
                    </h3>
                    <span className="text-xs text-zinc-400">Labels &amp; Live Tracking</span>
                  </div>
                  {activeAwbOrders.length === 0 ? (
                    <div className="py-10 text-center text-xs text-zinc-400">
                      Shipped orders with Delhivery waybills will appear here.
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.07]">
                      {activeAwbOrders.map((o) => (
                        <div
                          key={o.id}
                          className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-mono font-bold text-white">
                              {o.tracking_number}
                              <span className="text-zinc-400 font-sans font-normal ml-2">
                                · {o.customer_name}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-0.5">
                              #{formatOrderRef(o.id)} · {o.courier_partner || 'Delhivery'} ·{' '}
                              {STATUS_META[o.status].label}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleTrackDelhiveryOrder(o.tracking_number!)}
                              className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-amber-300 text-[11px] font-semibold cursor-pointer"
                            >
                              Track
                            </button>
                            <a
                              href={getDelhiveryLabelUrl(o.tracking_number!)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[11px] font-semibold inline-flex items-center gap-1"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Label PDF</span>
                            </a>
                            {o.status !== 'delivered' && (
                              <button
                                onClick={() => handleStatusChange(o.id, 'delivered')}
                                className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-emerald-600 text-zinc-200 hover:text-white text-[11px] font-semibold cursor-pointer"
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
          )}

          {/* ================================================================= */}
          {/* TAB 3: ABANDONED LEADS */}
          {/* ================================================================= */}
          {activeTab === 'abandoned' && (
            <div className="space-y-6">
              <div className="bg-[#121318] border border-white/[0.08] rounded-2xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="font-display font-bold text-lg sm:text-xl text-white">
                    Abandoned Checkout Recovery Queue
                  </h2>
                  <p className="text-xs text-zinc-400 max-w-2xl">
                    Buyers who started checkout and entered phone or email without completing payment. Follow up quickly via WhatsApp to convert them.
                  </p>
                </div>
                <div className="text-left sm:text-right font-mono tabular-nums">
                  <div className="text-xs text-zinc-400">At-Risk Value</div>
                  <div className="text-2xl font-bold text-amber-400">
                    ₹{analytics.abandonedValueAtRisk.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-zinc-400">
                    {analytics.unrecoveredCount} pending · {analytics.recoveryRate}% recovered
                  </div>
                </div>
              </div>

              <div className="bg-[#121318] border border-white/[0.08] rounded-2xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search leads by Name, Phone, Email, Company..."
                    value={leadSearchQuery}
                    onChange={(e) => setLeadSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0A0B0E] border border-white/[0.1] rounded-xl text-xs text-white placeholder:text-zinc-500 focus:border-[#FF7A00] outline-none"
                  />
                </div>
                <div className="flex items-center gap-1 bg-[#0A0B0E] p-1 rounded-xl border border-white/[0.08] shrink-0">
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
                          ? 'bg-[#FF7A00] text-white font-semibold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {loadingLeads ? (
                <div className="bg-[#121318] border border-white/[0.08] rounded-2xl p-6 space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-16 rounded-xl bg-white/[0.04] animate-pulse" />
                  ))}
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-16 bg-[#121318] rounded-2xl border border-white/[0.08] space-y-2">
                  <UserCheck className="w-10 h-10 text-emerald-400 mx-auto" />
                  <h3 className="font-semibold text-white text-base">No Abandoned Leads Found</h3>
                  <p className="text-xs text-zinc-400">
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
                        className="bg-[#121318] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.07]">
                          <div className="space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span
                                className={`font-semibold ${
                                  lead.recovered ? 'text-emerald-400' : 'text-amber-400'
                                }`}
                              >
                                {lead.recovered ? 'Recovered' : 'Pending Recovery'}
                              </span>
                              <span className="text-zinc-600">·</span>
                              <span className="text-zinc-400 font-mono tabular-nums">
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
                                  <span className="text-zinc-600">·</span>
                                  <span className="text-zinc-300">{lead.company}</span>
                                </>
                              )}
                            </div>
                            <div className="text-sm font-semibold text-white">
                              {leadName}{' '}
                              {leadPhone && (
                                <span className="font-mono text-xs text-zinc-400 font-normal">
                                  · {leadPhone}
                                </span>
                              )}
                              {lead.email && (
                                <span className="text-xs text-zinc-400 font-normal ml-2">
                                  ({lead.email})
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono tabular-nums font-bold text-sm text-amber-400 mr-2">
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
                                className="px-3.5 py-2 rounded-xl bg-[#1EBE5D] hover:bg-[#19a851] text-white text-xs font-semibold flex items-center gap-1.5 min-h-[40px]"
                              >
                                <WhatsAppIcon className="w-3.5 h-3.5 text-white" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                            {!lead.recovered && (
                              <button
                                onClick={() => handleRecoverLead(lead.id)}
                                className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                              >
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
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
                                className="flex items-center gap-3 p-2.5 rounded-xl bg-[#0A0B0E] border border-white/[0.06] text-xs"
                              >
                                {item.previewUrl ? (
                                  <img
                                    src={item.previewUrl}
                                    alt={item.productName || 'Product'}
                                    className="w-10 h-10 rounded-lg object-contain bg-zinc-900 shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-[10px] text-zinc-500 shrink-0">
                                    Item
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-white truncate">
                                    {item.productName || 'Custom Item'}
                                  </div>
                                  <div className="text-[11px] text-zinc-400 font-mono tabular-nums">
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
          )}

          {/* ================================================================= */}
          {/* TAB 4: ANALYTICS & REVENUE */}
          {/* ================================================================= */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Primary Financial KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#121318] border border-white/[0.08] rounded-2xl p-5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Estimated Gross Value</span>
                    <IndianRupee className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="font-display font-bold text-2xl sm:text-3xl text-white font-mono tabular-nums">
                    ₹{analytics.totalRevenue.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-zinc-400 font-mono tabular-nums">
                    Avg Order: ₹{analytics.aov.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="bg-[#121318] border border-white/[0.08] rounded-2xl p-5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Paid Online (Prepaid/50%)</span>
                    <CreditCard className="w-4 h-4 text-[#FF7A00]" />
                  </div>
                  <div className="font-display font-bold text-2xl sm:text-3xl text-emerald-400 font-mono tabular-nums">
                    ₹{analytics.totalPaidRecorded.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-zinc-400 font-mono tabular-nums">
                    Remaining Balance: ₹{analytics.totalBalanceRecorded.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="bg-[#121318] border border-white/[0.08] rounded-2xl p-5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Checkout Conversion</span>
                    <TrendingUp className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="font-display font-bold text-2xl sm:text-3xl text-white font-mono tabular-nums">
                    {analytics.conversionRate}%
                  </div>
                  <div className="text-xs text-zinc-400 font-mono tabular-nums">
                    {analytics.totalOrdersCount} placed / {analytics.totalOrdersCount + analytics.totalAbandonedCount} sessions
                  </div>
                </div>

                <div className="bg-[#121318] border border-white/[0.08] rounded-2xl p-5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Abandoned Value</span>
                    <ShoppingCart className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="font-display font-bold text-2xl sm:text-3xl text-amber-400 font-mono tabular-nums">
                    ₹{analytics.abandonedValueAtRisk.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-zinc-400 font-mono tabular-nums">
                    {analytics.unrecoveredCount} pending · {analytics.recoveryRate}% recovery rate
                  </div>
                </div>
              </div>

              {/* Pipeline Stage Distribution & Top Products */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6 bg-[#121318] border border-white/[0.08] rounded-2xl p-6 space-y-4">
                  <div>
                    <h3 className="font-display font-semibold text-base text-white">
                      Order Fulfillment Pipeline
                    </h3>
                    <p className="text-xs text-zinc-400">
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
                            <span className="text-zinc-200 font-medium">{STATUS_META[st].label}</span>
                            <span className="font-mono tabular-nums text-zinc-400">
                              {count} orders ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-[#0A0B0E] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${STATUS_META[st].barClass}`}
                              style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-6 bg-[#121318] border border-white/[0.08] rounded-2xl p-6 space-y-4">
                  <div>
                    <h3 className="font-display font-semibold text-base text-white">
                      Top Custom Products
                    </h3>
                    <p className="text-xs text-zinc-400">Ranked by estimated order volume and revenue</p>
                  </div>
                  {analytics.topProducts.length === 0 ? (
                    <div className="py-10 text-center text-xs text-zinc-400">
                      Product rankings will populate once orders are recorded.
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.07]">
                      {analytics.topProducts.map((p, idx) => (
                        <div
                          key={p.name}
                          className="py-3 flex items-center justify-between gap-4 text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono tabular-nums text-zinc-500 w-5">
                              0{idx + 1}.
                            </span>
                            <div className="min-w-0">
                              <div className="font-semibold text-white truncate">{p.name}</div>
                              <div className="text-[11px] text-zinc-400 font-mono tabular-nums">
                                {p.orders} orders · {p.units} units
                              </div>
                            </div>
                          </div>
                          <div className="font-mono tabular-nums font-bold text-emerald-400 shrink-0">
                            ₹{p.revenue.toLocaleString('en-IN')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 5: INTEGRATIONS & SUPABASE SQL */}
          {/* ================================================================= */}
          {activeTab === 'schema' && (
            <div className="space-y-6">
              {/* Hostinger SMTP Card */}
              <div className="bg-[#121318] border border-white/[0.08] rounded-2xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display font-semibold text-base text-white flex items-center gap-2">
                      <Mail className="w-5 h-5 text-[#FF7A00]" />
                      <span>Order Email Notifications (Hostinger SMTP)</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Dispatches confirmation &amp; placed artwork mockups to customer and admin ({smtpStatus?.adminEmail || 'teqqnoworld@gmail.com'}).
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold border ${
                      smtpStatus?.configured
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {smtpStatus?.configured ? 'LIVE SMTP CONNECTED' : 'CREDENTIALS MISSING'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-[#0A0B0E] border border-white/[0.07] rounded-xl p-3.5">
                    <div className="text-[11px] text-zinc-400">SMTP Host &amp; Port</div>
                    <div className="font-mono text-zinc-100 mt-1">
                      {smtpStatus ? `${smtpStatus.host}:${smtpStatus.port}` : 'smtp.hostinger.com:465'}
                    </div>
                  </div>
                  <div className="bg-[#0A0B0E] border border-white/[0.07] rounded-xl p-3.5">
                    <div className="text-[11px] text-zinc-400">Sender Email</div>
                    <div className="font-mono text-zinc-100 mt-1 truncate">
                      {smtpStatus?.senderEmail || '(not set)'}
                    </div>
                  </div>
                  <div className="bg-[#0A0B0E] border border-white/[0.07] rounded-xl p-3.5">
                    <div className="text-[11px] text-zinc-400">Admin Alert Email</div>
                    <div className="font-mono text-emerald-400 mt-1 truncate">
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
                    className="flex-1 bg-[#0A0B0E] border border-white/[0.1] rounded-xl py-2.5 px-3.5 text-xs text-white focus:border-[#FF7A00] outline-none"
                  />
                  <button
                    onClick={handleTestSmtpEmail}
                    disabled={testingSmtp}
                    className="bg-[#FF7A00] hover:bg-[#e86e00] text-white text-xs font-semibold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{testingSmtp ? 'Testing...' : 'Send Test Email'}</span>
                  </button>
                </div>

                {smtpTestResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                      smtpTestResult.success
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
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
                <div className="bg-[#121318] border border-white/[0.08] rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display font-semibold text-base text-white flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-[#FF7A00]" />
                      <span>Razorpay Payment Gateway</span>
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-lg text-[11px] font-mono font-semibold border ${
                        razorpayStatus?.configured
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {razorpayStatus?.configured ? 'LIVE CONNECTED' : 'AWAITING KEYS'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Checkout enforces <strong className="text-white">100% Full Prepaid</strong> and{' '}
                    <strong className="text-white">50% Partial Advance</strong> (No COD). Set{' '}
                    <code className="text-zinc-200">RAZORPAY_KEY_ID</code> and{' '}
                    <code className="text-zinc-200">RAZORPAY_KEY_SECRET</code> in Hostinger Environment Variables once live KYC approves.
                  </p>
                  <div className="bg-[#0A0B0E] border border-white/[0.07] rounded-xl p-3.5 text-xs">
                    <div className="text-[11px] text-zinc-400">Active Key ID</div>
                    <div className="font-mono text-zinc-200 mt-1">
                      {razorpayStatus?.keyId || '(not set — sandbox fallback active)'}
                    </div>
                  </div>
                </div>

                <div className="bg-[#121318] border border-white/[0.08] rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display font-semibold text-base text-white flex items-center gap-2">
                      <Truck className="w-5 h-5 text-[#FF7A00]" />
                      <span>Delhivery One Logistics (Prepaid)</span>
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-lg text-[11px] font-mono font-semibold border ${
                        delhiveryStatus?.configured
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
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
                      <div key={wh.name} className="bg-[#0A0B0E] border border-white/[0.07] rounded-xl p-3">
                        <div className="font-semibold text-white">{wh.name}</div>
                        <div className="text-[11px] text-zinc-400 font-mono">
                          {wh.city} · {wh.pin}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setActiveTab('dispatch')}
                    className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-white flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Open Delhivery Dispatch &amp; Pickup Console</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Supabase PostgreSQL Schema */}
              <div className="bg-[#121318] border border-white/[0.08] rounded-2xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display font-semibold text-base text-white">
                      Supabase PostgreSQL Schema &amp; RLS Setup
                    </h3>
                    <p className="text-xs text-zinc-400">
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
                    className="bg-[#FF7A00] hover:bg-[#e86e00] text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer"
                  >
                    {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedSql ? 'Copied SQL Script' : 'Copy Supabase SQL'}</span>
                  </button>
                </div>

                <pre className="bg-[#0A0B0E] border border-white/[0.08] rounded-xl p-4 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-80 leading-relaxed">
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
          )}
        </main>
      </div>

      {/* ===================================================================== */}
      {/* SLIDE-OVER ORDER INSPECTOR DRAWER */}
      {/* ===================================================================== */}
      {inspectingOrder && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={() => setInspectingOrder(null)}
          />
          <div className="relative w-full max-w-2xl bg-[#121318] border-l border-white/[0.08] h-full overflow-y-auto z-10 flex flex-col">
            {(() => {
              const { product, unitPrice, subtotal, gst, total } = getOrderEstimates(inspectingOrder);
              const parsed = parseOrderNotes(inspectingOrder.custom_notes);
              const hasRealAwb =
                Boolean(inspectingOrder.tracking_number) &&
                !inspectingOrder.tracking_number!.toLowerCase().includes('awaiting');

              return (
                <>
                  {/* Drawer Header */}
                  <div className="sticky top-0 bg-[#121318]/95 backdrop-blur-md border-b border-white/[0.08] px-5 sm:px-6 py-4 flex items-center justify-between gap-3 z-10">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-[#FF7A00] font-bold">
                          #{formatOrderRef(inspectingOrder.id)}
                        </span>
                        <span className="text-zinc-600">·</span>
                        <span className="text-zinc-400">
                          {new Date(inspectingOrder.created_at).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <h2 className="font-display font-bold text-lg text-white mt-0.5">
                        {inspectingOrder.customer_name}
                        {inspectingOrder.company ? ` — ${inspectingOrder.company}` : ''}
                      </h2>
                    </div>
                    <button
                      onClick={() => setInspectingOrder(null)}
                      className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Drawer Body */}
                  <div className="p-5 sm:p-6 space-y-6 text-xs">
                    {/* 1. 5-Stage Pipeline Control */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-medium text-zinc-400">
                        Update Production Stage
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                        {(Object.keys(STATUS_META) as OrderStatus[]).map((st) => (
                          <button
                            key={st}
                            disabled={updatingOrderId === inspectingOrder.id}
                            onClick={() => handleStatusChange(inspectingOrder.id, st)}
                            className={`py-2 px-2.5 rounded-xl border text-[11px] font-semibold cursor-pointer transition-colors ${
                              inspectingOrder.status === st
                                ? 'bg-[#FF7A00] border-[#FF7A00] text-white'
                                : 'bg-[#0A0B0E] border-white/[0.08] text-zinc-400 hover:text-white'
                            }`}
                          >
                            {STATUS_META[st].label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2. Artwork & Placed Product Mockups */}
                    <div className="space-y-3 pt-2 border-t border-white/[0.07]">
                      <div className="text-[11px] font-medium text-zinc-400">
                        Artwork &amp; Product Placement Files
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                          { label: 'Client Raw Logo', url: inspectingOrder.logo_url, bg: 'bg-[#0A0B0E]' },
                          { label: 'Front Placed Mockup', url: parsed.frontMockupUrl, bg: 'bg-slate-100' },
                          { label: 'Back Placed Mockup', url: parsed.backMockupUrl, bg: 'bg-slate-100' },
                          { label: 'Back Raw Logo', url: parsed.backLogoUrl, bg: 'bg-[#0A0B0E]' },
                        ]
                          .filter((asset) => Boolean(asset.url))
                          .map((asset) => (
                            <div
                              key={asset.label}
                              className="bg-[#0A0B0E] border border-white/[0.08] rounded-xl p-2.5 space-y-2"
                            >
                              <button
                                onClick={() => setPreviewLogoUrl(asset.url!)}
                                className={`w-full h-28 rounded-lg ${asset.bg} flex items-center justify-center p-1 overflow-hidden cursor-zoom-in`}
                              >
                                <img
                                  src={asset.url!}
                                  alt={asset.label}
                                  className="max-w-full max-h-full object-contain"
                                />
                              </button>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] text-zinc-300 truncate">
                                  {asset.label}
                                </span>
                                <a
                                  href={asset.url!}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download
                                  className="text-[#FF7A00] hover:underline text-[11px] shrink-0"
                                >
                                  Save
                                </a>
                              </div>
                            </div>
                          ))}
                        {!inspectingOrder.logo_url && !parsed.frontMockupUrl && (
                          <div className="col-span-full py-6 text-center bg-[#0A0B0E] rounded-xl border border-white/[0.06] text-zinc-500">
                            No custom logo or mockup uploaded for this order.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3. Production Specs & Customer Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/[0.07]">
                      <div className="space-y-2">
                        <div className="text-[11px] font-medium text-zinc-400">
                          Product &amp; Print Specifications
                        </div>
                        <div className="bg-[#0A0B0E] border border-white/[0.07] rounded-xl p-3.5 space-y-1.5">
                          <div className="font-semibold text-white text-sm">
                            {product?.name || inspectingOrder.product_id}
                          </div>
                          <div className="text-zinc-300 font-mono tabular-nums">
                            {inspectingOrder.quantity} units × ₹{unitPrice} = ₹
                            {subtotal.toLocaleString('en-IN')}
                          </div>
                          <div className="text-zinc-400">
                            GST (18%): ₹{gst.toLocaleString('en-IN')} · Est. Total:{' '}
                            <strong className="text-white">₹{total.toLocaleString('en-IN')}</strong>
                          </div>
                          {parsed.color && (
                            <div className="text-zinc-400">
                              Color: <span className="text-zinc-200">{parsed.color}</span>
                            </div>
                          )}
                          {parsed.size && (
                            <div className="text-zinc-400">
                              Size: <span className="text-zinc-200">{parsed.size}</span>
                            </div>
                          )}
                          {parsed.method && (
                            <div className="text-zinc-400">
                              Method: <span className="text-zinc-200">{parsed.method}</span>
                            </div>
                          )}
                          {parsed.placementSummary && (
                            <div className="text-zinc-400 leading-relaxed pt-1 border-t border-white/[0.06]">
                              Layout: <span className="text-zinc-200">{parsed.placementSummary}</span>
                            </div>
                          )}
                          {parsed.customNotesText && (
                            <div className="text-zinc-400 leading-relaxed">
                              Client Note: <span className="text-zinc-200">{parsed.customNotesText}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-[11px] font-medium text-zinc-400">
                          Client, Billing &amp; Delivery Address
                        </div>
                        <div className="bg-[#0A0B0E] border border-white/[0.07] rounded-xl p-3.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white">{inspectingOrder.customer_name}</span>
                            <a
                              href={`tel:${inspectingOrder.phone}`}
                              className="font-mono text-[#FF7A00] hover:underline"
                            >
                              {inspectingOrder.phone}
                            </a>
                          </div>
                          <div className="text-zinc-400 truncate">{inspectingOrder.customer_email}</div>
                          {parsed.gstin && (
                            <div className="font-mono text-zinc-300">GSTIN: {parsed.gstin}</div>
                          )}
                          {parsed.parsedAddress.full && (
                            <div className="pt-2 border-t border-white/[0.06] space-y-1">
                              <div className="text-zinc-300 leading-relaxed">
                                {parsed.parsedAddress.full}
                              </div>
                              <button
                                onClick={() =>
                                  handleCopy(parsed.parsedAddress.full, inspectingOrder.id + '-addr')
                                }
                                className="text-[11px] text-[#FF7A00] hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                {copiedId === inspectingOrder.id + '-addr' ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>Copied Address</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy Shipping Address</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                          {(parsed.paymentPlan || parsed.paidAmount) && (
                            <div className="pt-2 border-t border-white/[0.06] space-y-0.5 font-mono">
                              {parsed.paymentPlan && (
                                <div className="text-zinc-300">{parsed.paymentPlan}</div>
                              )}
                              {parsed.paidAmount && (
                                <div className="text-emerald-400">
                                  Paid: ₹{parsed.paidAmount}
                                  {parsed.balanceDue && parsed.balanceDue !== '0'
                                    ? ` · Balance Due: ₹${parsed.balanceDue}`
                                    : ''}
                                </div>
                              )}
                              {parsed.razorpayId && (
                                <div className="text-[11px] text-zinc-400">
                                  Razorpay ID: {parsed.razorpayId}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 4. Action Buttons */}
                    <div className="pt-4 border-t border-white/[0.07] flex flex-wrap items-center gap-2.5">
                      <button
                        onClick={() => openDispatchModalForOrder(inspectingOrder)}
                        className="px-4 py-2.5 rounded-xl bg-[#FF7A00] hover:bg-[#e86e00] text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Truck className="w-4 h-4" />
                        <span>{hasRealAwb ? 'Edit Delhivery / AWB' : 'Book Delhivery AWB'}</span>
                      </button>

                      {hasRealAwb && (
                        <>
                          <button
                            onClick={() => handleTrackDelhiveryOrder(inspectingOrder.tracking_number!)}
                            className="px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-amber-300 font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <MapPin className="w-4 h-4" />
                            <span>Track Live</span>
                          </button>
                          <a
                            href={getDelhiveryLabelUrl(inspectingOrder.tracking_number!)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-semibold flex items-center gap-1.5"
                          >
                            <Printer className="w-4 h-4" />
                            <span>Label PDF</span>
                          </a>
                        </>
                      )}

                      <button
                        onClick={() => handleSendOrderConfirmationEmail(inspectingOrder)}
                        disabled={sendingEmailOrderId === inspectingOrder.id}
                        className="px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        <Mail className="w-4 h-4 text-[#FF7A00]" />
                        <span>{sendingEmailOrderId === inspectingOrder.id ? 'Sending...' : 'Send Email'}</span>
                      </button>

                      <button
                        onClick={() => generateAdminOrderInvoicePdf(inspectingOrder, PRODUCTS)}
                        className="px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-emerald-400" />
                        <span>Invoice PDF</span>
                      </button>

                      <a
                        href={getDirectClientWhatsAppUrl({
                          phone: inspectingOrder.phone,
                          name: inspectingOrder.customer_name,
                          type: 'order',
                          orderId: formatOrderRef(inspectingOrder.id),
                          status: inspectingOrder.status,
                          courier: inspectingOrder.courier_partner,
                          trackingNumber: inspectingOrder.tracking_number,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2.5 rounded-xl bg-[#1EBE5D] hover:bg-[#19a851] text-white font-semibold flex items-center gap-1.5"
                      >
                        <WhatsAppIcon className="w-4 h-4 text-white" />
                        <span>WhatsApp</span>
                      </a>

                      {onNavigateToOrderTracking && (
                        <button
                          onClick={() => onNavigateToOrderTracking(formatOrderRef(inspectingOrder.id))}
                          className="px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 font-medium flex items-center gap-1.5 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Customer View</span>
                        </button>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: DELHIVERY MANIFEST BOOKING & COURIER DISPATCH EDITOR */}
      {/* ===================================================================== */}
      {editingDispatchOrder && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121318] border border-white/[0.12] rounded-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#FF7A00]" />
                <h3 className="font-display font-bold text-white text-base">
                  Book Delhivery Shipment / Edit AWB
                </h3>
              </div>
              <button
                onClick={() => setEditingDispatchOrder(null)}
                className="text-zinc-400 hover:text-white p-1.5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section 1: 1-Click Book Delhivery Shipment (Prepaid) */}
            <div className="bg-[#0A0B0E] border border-[#FF7A00]/30 rounded-2xl p-4 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[#FF7A00]">
                  Delhivery One Live Manifest (Prepaid · No COD)
                </span>
                <span
                  className={`text-[11px] font-mono ${
                    delhiveryStatus?.configured ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {delhiveryStatus?.configured ? 'API Active' : 'Set DELHIVERY_API_TOKEN'}
                </span>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1.5 text-[11px]">
                  Select Pickup Warehouse Facility
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: 'Teqqnoworld', sub: 'Hyderabad · 502032' },
                    { name: 'Teqqnoworld 2', sub: 'Hyderabad · 500090' },
                  ].map((wh) => (
                    <button
                      key={wh.name}
                      type="button"
                      onClick={() => setDelhiveryPickup(wh.name)}
                      className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                        delhiveryPickup === wh.name
                          ? 'border-[#FF7A00] bg-[#FF7A00]/15 text-white'
                          : 'border-white/[0.08] bg-[#121318] text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div className="font-semibold">{wh.name}</div>
                      <div className="text-[11px] font-mono opacity-80">{wh.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 mb-1 text-[11px]">
                    Delivery Street Address
                  </label>
                  <input
                    type="text"
                    value={shipAddress}
                    onChange={(e) => setShipAddress(e.target.value)}
                    placeholder="Plot / Tower / Street..."
                    className="w-full bg-[#121318] border border-white/[0.1] rounded-xl py-2 px-3 text-white outline-none focus:border-[#FF7A00]"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 text-[11px]">City</label>
                  <input
                    type="text"
                    value={shipCity}
                    onChange={(e) => setShipCity(e.target.value)}
                    className="w-full bg-[#121318] border border-white/[0.1] rounded-xl py-2 px-3 text-white outline-none focus:border-[#FF7A00]"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 text-[11px]">State</label>
                  <input
                    type="text"
                    value={shipState}
                    onChange={(e) => setShipState(e.target.value)}
                    className="w-full bg-[#121318] border border-white/[0.1] rounded-xl py-2 px-3 text-white outline-none focus:border-[#FF7A00]"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 text-[11px]">
                    Delivery Pincode (6 digits)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={shipPincode}
                    onChange={(e) => setShipPincode(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full bg-[#121318] border border-white/[0.1] rounded-xl py-2 px-3 text-white font-mono outline-none focus:border-[#FF7A00]"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 text-[11px]">
                    Package Weight (grams)
                  </label>
                  <input
                    type="number"
                    min={100}
                    value={shipWeight}
                    onChange={(e) => setShipWeight(e.target.value)}
                    className="w-full bg-[#121318] border border-white/[0.1] rounded-xl py-2 px-3 text-white font-mono outline-none focus:border-[#FF7A00]"
                  />
                </div>
              </div>

              {shipmentError && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-[11px]">
                  {shipmentError}
                </div>
              )}

              <button
                type="button"
                onClick={handleBookDelhiveryShipment}
                disabled={creatingShipment}
                className="w-full py-2.5 px-4 rounded-xl bg-[#FF7A00] hover:bg-[#e86e00] text-white font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {creatingShipment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Truck className="w-4 h-4" />
                )}
                <span>
                  {creatingShipment
                    ? 'Creating Delhivery Manifest...'
                    : `Generate Live Delhivery AWB (${delhiveryPickup})`}
                </span>
              </button>
            </div>

            {/* Section 2: Manual Waybill Assignment */}
            <form onSubmit={handleSaveDispatch} className="space-y-4 text-xs pt-2 border-t border-white/[0.08]">
              <div className="text-zinc-400 font-medium">Manual Courier &amp; Waybill Assignment</div>
              <div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {[
                    'Delhivery (Teqqnoworld)',
                    'Delhivery (Teqqnoworld 2)',
                    'Blue Dart Apex Express',
                    'DTDC Express Air',
                  ].map((partner) => (
                    <button
                      key={partner}
                      type="button"
                      onClick={() => setCourierInput(partner)}
                      className={`py-2 px-2 rounded-xl border text-center transition-colors cursor-pointer truncate ${
                        courierInput === partner
                          ? 'border-[#FF7A00] bg-[#FF7A00]/15 text-[#FF7A00] font-semibold'
                          : 'border-white/[0.08] bg-[#0A0B0E] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {partner}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  placeholder="Courier name..."
                  value={courierInput}
                  onChange={(e) => setCourierInput(e.target.value)}
                  className="w-full bg-[#0A0B0E] border border-white/[0.1] rounded-xl py-2.5 px-3 text-white focus:border-[#FF7A00] outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1.5 font-medium">
                  Tracking Number / AWB
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1492819201928"
                  value={awbInput}
                  onChange={(e) => setAwbInput(e.target.value)}
                  className="w-full bg-[#0A0B0E] border border-white/[0.1] rounded-xl py-2.5 px-3 text-white font-mono focus:border-[#FF7A00] outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDispatchOrder(null)}
                  className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingOrderId === editingDispatchOrder.id}
                  className="px-5 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Manual AWB</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: LIVE DELHIVERY TRACKING */}
      {/* ===================================================================== */}
      {trackingOrderAwb && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121318] border border-white/[0.12] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#FF7A00]" />
                <h3 className="font-display font-bold text-white text-base">
                  Delhivery Tracking: {trackingOrderAwb}
                </h3>
              </div>
              <button
                onClick={() => setTrackingOrderAwb(null)}
                className="text-zinc-400 hover:text-white p-1.5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingTrack ? (
              <div className="py-10 text-center text-xs text-zinc-400 flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#FF7A00]" />
                <span>Fetching live scans from Delhivery...</span>
              </div>
            ) : trackingModalData ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-[#0A0B0E] border border-white/[0.08] flex items-center justify-between">
                  <span className="text-zinc-400">Current Status:</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {trackingModalData.currentStatus ||
                      (trackingModalData.success ? 'Manifested' : 'Pending')}
                  </span>
                </div>
                {trackingModalData.statusLocation && (
                  <div className="text-zinc-300 font-mono text-[11px]">
                    Hub Location: {trackingModalData.statusLocation}
                  </div>
                )}
                {trackingModalData.message && !trackingModalData.success && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                    {trackingModalData.message}
                  </div>
                )}
                {trackingModalData.scans?.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {trackingModalData.scans.map((scan, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-[#0A0B0E] border border-white/[0.06] space-y-0.5"
                      >
                        <div className="font-semibold text-white">{scan.status}</div>
                        <div className="text-[11px] text-zinc-400">{scan.location}</div>
                        <div className="text-[10px] font-mono text-zinc-500">{scan.time}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: FULL RESOLUTION LOGO & MOCKUP PREVIEW */}
      {/* ===================================================================== */}
      {previewLogoUrl && (
        <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121318] border border-white/[0.12] rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="font-display font-bold text-white text-base">
                Artwork &amp; Product Placement Preview
              </h3>
              <button
                onClick={() => setPreviewLogoUrl(null)}
                className="text-zinc-400 hover:text-white p-1.5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 bg-[#0A0B0E] rounded-xl border border-white/[0.08] flex items-center justify-center max-h-[60vh] overflow-hidden">
              <img
                src={previewLogoUrl}
                alt="High-resolution client artwork"
                className="max-w-full max-h-[50vh] object-contain"
              />
            </div>

            <div className="flex items-center justify-between pt-2 gap-3">
              <span className="text-xs font-mono text-zinc-400 truncate max-w-sm">
                {previewLogoUrl}
              </span>
              <a
                href={previewLogoUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="px-4 py-2 rounded-xl bg-[#FF7A00] hover:bg-[#e86e00] text-white text-xs font-semibold flex items-center gap-2 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Asset</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function ArrowRightIcon() {
  return <ChevronRight className="w-3.5 h-3.5" />;
}
