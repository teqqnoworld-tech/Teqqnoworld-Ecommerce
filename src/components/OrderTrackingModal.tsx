import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Search, 
  CheckCircle2, 
  Clock, 
  Package, 
  MapPin, 
  ExternalLink, 
  Copy, 
  Check, 
  X, 
  AlertCircle,
  ShieldCheck,
  Download,
  PhoneCall,
  RefreshCw
} from 'lucide-react';
import { Order } from '../types';
import { fetchCustomOrderById } from '../services/supabaseService';
import { CustomOrderRow } from '../lib/supabase';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  initialOrderNumber?: string;
  onSelectProof?: (order: Order) => void;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  orders,
  initialOrderNumber = '',
  onSelectProof,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialOrderNumber);
  const [copiedAwb, setCopiedAwb] = useState(false);
  const [liveSupabaseOrder, setLiveSupabaseOrder] = useState<CustomOrderRow | null>(null);
  const [isSearchingLive, setIsSearchingLive] = useState(false);

  // Sync initial search query when modal opens
  useEffect(() => {
    if (isOpen && initialOrderNumber) {
      setSearchQuery(initialOrderNumber);
    }
  }, [isOpen, initialOrderNumber]);

  // Live Supabase lookup for real-time status and courier updates
  useEffect(() => {
    if (!isOpen) return;
    const query = searchQuery.trim();
    if (!query) {
      setLiveSupabaseOrder(null);
      return;
    }

    let isMounted = true;
    setIsSearchingLive(true);
    fetchCustomOrderById(query)
      .then((res) => {
        if (isMounted) {
          setLiveSupabaseOrder(res);
          setIsSearchingLive(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsSearchingLive(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, searchQuery]);

  if (!isOpen) return null;

  // Find order in local state first
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const localMatch = trimmedQuery
    ? orders.find(
        o => o.orderNumber.toLowerCase() === trimmedQuery ||
             o.id.toLowerCase() === trimmedQuery ||
             (o.trackingNumber && o.trackingNumber.toLowerCase() === trimmedQuery)
      )
    : orders[0];

  // Derive consolidated active order (incorporating live Supabase courier & status if found)
  const activeOrder: Order | null = localMatch ? {
    ...localMatch,
    courierPartner: liveSupabaseOrder?.courier_partner || localMatch.courierPartner,
    trackingNumber: liveSupabaseOrder?.tracking_number || localMatch.trackingNumber,
    orderStatus: liveSupabaseOrder?.status === 'dispatched' ? 'Dispatched' :
      liveSupabaseOrder?.status === 'delivered' ? 'Delivered' :
      liveSupabaseOrder?.status === 'in-production' ? 'Manufacturing' :
      localMatch.orderStatus,
    proofStatus: liveSupabaseOrder?.status === 'approved' || liveSupabaseOrder?.status === 'in-production' || liveSupabaseOrder?.status === 'dispatched' || liveSupabaseOrder?.status === 'delivered'
      ? 'Approved by Client'
      : localMatch.proofStatus,
  } : liveSupabaseOrder ? {
    id: liveSupabaseOrder.id,
    orderNumber: liveSupabaseOrder.id.startsWith('TQ-') ? liveSupabaseOrder.id : `TQ-${liveSupabaseOrder.id.slice(0, 8).toUpperCase()}`,
    createdAt: liveSupabaseOrder.created_at,
    items: [],
    subtotal: 998,
    gstRate: 0.18,
    gstAmount: 180,
    shippingFee: 0,
    total: 1178,
    shippingAddress: {
      fullName: liveSupabaseOrder.customer_name,
      companyName: liveSupabaseOrder.company || undefined,
      email: liveSupabaseOrder.customer_email,
      phone: liveSupabaseOrder.phone,
      street: 'Corporate Hub Delivery',
      city: 'Metro Hub',
      state: 'India',
      pincode: '560001',
      isB2BInvoice: true,
    },
    proofStatus: liveSupabaseOrder.status === 'approved' || liveSupabaseOrder.status === 'in-production' || liveSupabaseOrder.status === 'dispatched' || liveSupabaseOrder.status === 'delivered'
      ? 'Approved by Client'
      : 'Proof Ready - Needs Approval',
    orderStatus: liveSupabaseOrder.status === 'dispatched' ? 'Dispatched' :
      liveSupabaseOrder.status === 'delivered' ? 'Delivered' :
      liveSupabaseOrder.status === 'in-production' ? 'Manufacturing' :
      'Artwork Verification',
    estimatedDispatch: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0],
    trackingNumber: liveSupabaseOrder.tracking_number || undefined,
    courierPartner: liveSupabaseOrder.courier_partner || 'Delhivery Express',
    paymentMode: 'Full Prepaid (100% Online)',
    paymentStatus: 'Paid in Full (Razorpay)',
  } : null;

  const handleCopyAwb = (awb: string) => {
    navigator.clipboard.writeText(awb);
    setCopiedAwb(true);
    setTimeout(() => setCopiedAwb(false), 2000);
  };

  // 6-Stage Timeline Configuration
  const stages = [
    {
      id: 1,
      title: 'Order Confirmed',
      desc: 'Payment mode verified via B2B gateway',
      timestamp: activeOrder ? new Date(activeOrder.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Logged',
      isCompleted: true,
      isCurrent: false,
    },
    {
      id: 2,
      title: 'Pre-Press Artwork & Pantone Proof',
      desc: activeOrder?.proofStatus === 'Approved by Client' ? 'Approved & signed-off by client' : 'Digital proof awaiting client approval',
      timestamp: activeOrder?.proofStatus === 'Approved by Client' ? 'Signed Off' : 'Active Checkpoint',
      isCompleted: activeOrder?.proofStatus === 'Approved by Client',
      isCurrent: activeOrder?.proofStatus !== 'Approved by Client',
    },
    {
      id: 3,
      title: 'Factory Direct Production',
      desc: 'DTF transfer printing & 12-needle Tajima embroidery line',
      timestamp: activeOrder?.orderStatus === 'Manufacturing' || activeOrder?.orderStatus === 'Dispatched' || activeOrder?.orderStatus === 'Delivered' ? 'In Progress' : 'Queued',
      isCompleted: activeOrder?.orderStatus === 'Dispatched' || activeOrder?.orderStatus === 'Delivered',
      isCurrent: activeOrder?.orderStatus === 'Manufacturing',
    },
    {
      id: 4,
      title: 'Quality Check & Packaging',
      desc: 'GSM tolerance audit, double-stitch test, individual polybag seal',
      timestamp: activeOrder?.orderStatus === 'Dispatched' || activeOrder?.orderStatus === 'Delivered' ? 'Passed QA' : 'Pending',
      isCompleted: activeOrder?.orderStatus === 'Dispatched' || activeOrder?.orderStatus === 'Delivered',
      isCurrent: activeOrder?.orderStatus === 'Quality Check',
    },
    {
      id: 5,
      title: `Dispatched via ${activeOrder?.courierPartner || 'Delhivery Express'}`,
      desc: `Waybill AWB: ${activeOrder?.trackingNumber || 'Awaiting Manifest'}`,
      timestamp: activeOrder?.orderStatus === 'Dispatched' || activeOrder?.orderStatus === 'Delivered' ? 'In Transit' : `Est. ${activeOrder?.estimatedDispatch}`,
      isCompleted: activeOrder?.orderStatus === 'Delivered',
      isCurrent: activeOrder?.orderStatus === 'Dispatched',
    },
    {
      id: 6,
      title: 'Out for Delivery & Delivered',
      desc: `Destination: ${activeOrder?.shippingAddress.city}, ${activeOrder?.shippingAddress.state}`,
      timestamp: activeOrder?.orderStatus === 'Delivered' ? 'Delivered' : 'Awaiting Hub Arrival',
      isCompleted: activeOrder?.orderStatus === 'Delivered',
      isCurrent: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl p-6 sm:p-8 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#FF7A00] bg-[#FF7A00]/10 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" />
                <span>Live Factory Production Tracker</span>
              </span>
              <span className="text-xs text-zinc-400 font-mono">Real-Time Sync</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-[#0B0B0D] mt-1">
              Consignment & Proof Production Status
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-800 p-2 rounded-xl hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar for Order ID */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Order ID (e.g. TQ-89201) or Delhivery AWB Number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs border border-zinc-300 rounded-xl outline-none focus:border-[#FF7A00]"
            />
          </div>
          {orders.length > 1 && (
            <select
              value={activeOrder?.orderNumber || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="p-2.5 text-xs border border-zinc-300 rounded-xl bg-zinc-50 outline-none"
            >
              {orders.map(o => (
                <option key={o.id} value={o.orderNumber}>{o.orderNumber}</option>
              ))}
            </select>
          )}
        </div>

        {activeOrder ? (
          <div className="space-y-6">
            
            {/* Order Overview Summary Banner */}
            <div className="p-5 rounded-2xl bg-[#0B0B0D] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-base text-[#FF7A00]">{activeOrder.orderNumber}</span>
                  <span className="text-xs text-zinc-400">·</span>
                  <span className="text-xs text-zinc-300">
                    {activeOrder.items.reduce((sum, i) => sum + i.quantity, 0)} Total Units
                  </span>
                </div>
                <div className="text-xs text-zinc-400">
                  Deliver to: <strong className="text-white">{activeOrder.shippingAddress.fullName}</strong> ({activeOrder.shippingAddress.city}, {activeOrder.shippingAddress.pincode})
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-1">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                  Logistics Partner
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-white bg-zinc-800 px-2.5 py-1 rounded-lg">
                    {activeOrder.courierPartner || 'Delhivery Express'}
                  </span>
                  {activeOrder.trackingNumber && (
                    <button
                      onClick={() => handleCopyAwb(activeOrder.trackingNumber!)}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                      title="Copy AWB Tracking Number"
                    >
                      {copiedAwb ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 6-Stage Timeline Display */}
            <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-200/90 space-y-6">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center justify-between">
                <span>Production & Logistics Milestones</span>
                <span className="text-[11px] font-mono text-[#FF7A00]">Stage {stages.findIndex(s => s.isCurrent || (!s.isCompleted && !s.isCurrent)) + 1} of 6</span>
              </div>

              <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200">
                {stages.map((st) => (
                  <div key={st.id} className="relative flex items-start gap-4">
                    
                    {/* Step Icon Node */}
                    <div className={`absolute -left-6 sm:-left-8 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      st.isCompleted 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : st.isCurrent
                        ? 'bg-[#FF7A00] text-white ring-4 ring-[#FF7A00]/20 animate-pulse'
                        : 'bg-white border-2 border-zinc-300 text-zinc-400'
                    }`}>
                      {st.isCompleted ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : st.id}
                    </div>

                    {/* Step Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h4 className={`text-xs sm:text-sm font-bold ${
                          st.isCompleted || st.isCurrent ? 'text-zinc-900' : 'text-zinc-400'
                        }`}>
                          {st.title}
                        </h4>
                        <span className="text-[11px] font-mono text-zinc-500">{st.timestamp}</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">{st.desc}</p>

                      {/* If Proofing stage is pending, provide quick proof approval button */}
                      {st.id === 2 && activeOrder.proofStatus === 'Proof Ready - Needs Approval' && onSelectProof && (
                        <div className="mt-2.5 p-3 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-between gap-3">
                          <div className="text-xs text-orange-900 font-medium">
                            Digital proof ready for sign-off. Production on hold until verified.
                          </div>
                          <button
                            onClick={() => {
                              onSelectProof(activeOrder);
                              onClose();
                            }}
                            className="bg-[#0B0B0D] hover:bg-zinc-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap cursor-pointer"
                          >
                            Review & Approve Proof
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            </div>

            {/* Consignment Items Breakdown */}
            <div className="p-4 rounded-2xl border border-zinc-200 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Package Contents ({activeOrder.items.length} Lines)
              </div>
              <div className="divide-y divide-zinc-100">
                {activeOrder.items.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-zinc-900">{item.product.name}</div>
                      <div className="text-[11px] text-zinc-500">
                        {item.color.name} {item.size ? `· Size ${item.size}` : ''} · Print: {item.printMethod}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-zinc-900">
                      {item.quantity} units
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div className="py-12 text-center text-zinc-500 text-xs">
            No order found matching your inquiry. Please verify the order number.
          </div>
        )}

      </div>
    </div>
  );
};
