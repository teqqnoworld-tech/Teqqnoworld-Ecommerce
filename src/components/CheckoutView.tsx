import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, 
  ArrowLeft, 
  Check, 
  CreditCard, 
  Building2, 
  FileCheck, 
  AlertTriangle,
  AlertCircle,
  Lock,
  Truck,
  Sparkles,
  Loader2
} from 'lucide-react';
import { CartItem, ShippingAddress, Order, UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { 
  uploadDataUrlToStorage, 
  saveAbandonedCheckout, 
  markCheckoutRecovered 
} from '../services/supabaseService';
import { sendOrderConfirmationEmail, OrderEmailItem } from '../services/emailService';
import {
  describeArtworkPlacement,
  extractArtworkAssetsFromItem,
  generateItemMockupSnapshots,
} from '../utils/mockupSnapshot';

interface CheckoutViewProps {
  items: CartItem[];
  onBackToCart: () => void;
  onOrderPlaced: (order: Order) => void;
  user?: UserProfile | null;
  onRequestLogin?: () => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  items,
  onBackToCart,
  onOrderPlaced,
  user,
  onRequestLogin,
}) => {
  // Unique session ID for tracking this checkout attempt
  const [checkoutSessionId] = useState<string>(() => {
    try {
      const existing = sessionStorage.getItem('teqqno_checkout_session_id');
      if (existing) return existing;
      const generated = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      sessionStorage.setItem('teqqno_checkout_session_id', generated);
      return generated;
    } catch {
      return `lead_${Date.now()}`;
    }
  });

  // Form State initialized from user if available
  const defaultAddress = user?.savedAddresses?.find(a => a.isDefault) || user?.savedAddresses?.[0];

  const [fullName, setFullName] = useState(user?.name || 'Arjun Mehta');
  const [companyName, setCompanyName] = useState(user?.companyName || 'Nexus Dynamics India Pvt Ltd');
  const [email, setEmail] = useState(user?.email || 'arjun.mehta@nexusdynamics.in');
  const [phone, setPhone] = useState(user?.mobile ? `+91 ${user.mobile}` : '+91 98450 12345');
  const [street, setStreet] = useState(defaultAddress?.street || 'Level 4, Prestige Tech Cloud, Doddajala');
  const [city, setCity] = useState(defaultAddress?.city || 'Bengaluru');
  const [state, setState] = useState(defaultAddress?.state || 'Karnataka');
  const [pincode, setPincode] = useState(defaultAddress?.pincode || '562157');
  const [isB2BInvoice, setIsB2BInvoice] = useState(true);
  const [gstin, setGstin] = useState(user?.gstin || '29AABCN8291P1ZX');
  const [poNumber, setPoNumber] = useState('');
  
  // Separate billing address
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingStreet, setBillingStreet] = useState('Unit 12, Corporate Tower, MG Road');
  const [billingCity, setBillingCity] = useState('Bengaluru');
  const [billingState, setBillingState] = useState('Karnataka');
  const [billingPincode, setBillingPincode] = useState('560001');

  // Payment Mode
  const [paymentMode, setPaymentMode] = useState<
    'Test Gateway (Pre-Integration)' | 'Pay on Approval' | 'Corporate PO 30-Day'
  >('Test Gateway (Pre-Integration)');

  const [isProcessing, setIsProcessing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [uploadStepStatus, setUploadStepStatus] = useState<string>('');

  // Financial calculations
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const shippingFee = subtotal >= 1999 || subtotal === 0 ? 0 : 149;
  const gstRate = 0.18;
  const gstAmount = Math.round(subtotal * gstRate);
  const total = subtotal + shippingFee + gstAmount;

  // GSTIN State Detection
  const stateCodeMap: Record<string, string> = {
    '29': 'Karnataka (Intrastate CGST+SGST)',
    '27': 'Maharashtra (Interstate IGST)',
    '07': 'Delhi (Interstate IGST)',
    '06': 'Haryana (Interstate IGST)',
    '33': 'Tamil Nadu (Interstate IGST)',
    '36': 'Telangana (Interstate IGST)',
    '19': 'West Bengal (Interstate IGST)',
    '24': 'Gujarat (Interstate IGST)',
    '09': 'Uttar Pradesh (Interstate IGST)',
    '08': 'Rajasthan (Interstate IGST)',
    '32': 'Kerala (Interstate IGST)',
    '23': 'Madhya Pradesh (Interstate IGST)',
    '03': 'Punjab (Interstate IGST)',
    '30': 'Goa (Interstate IGST)',
    '37': 'Andhra Pradesh (Interstate IGST)',
  };

  const detectedGstinState = useMemo(() => {
    if (!gstin || gstin.length < 2) return null;
    const code = gstin.slice(0, 2);
    return stateCodeMap[code] || 'Verified Registered State';
  }, [gstin]);

  const isGstinValid = useMemo(() => {
    if (!gstin) return false;
    const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return regex.test(gstin.trim());
  }, [gstin]);

  // CRO: Automatically debounce & autosave partial lead data into abandoned_checkouts
  useEffect(() => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const hasPhone = cleanPhone.length >= 8;
    const hasEmail = email.includes('@') && email.includes('.');

    // Only record once customer has engaged with phone or email
    if (!hasPhone && !hasEmail) return;

    const timer = setTimeout(() => {
      saveAbandonedCheckout({
        id: checkoutSessionId,
        customerName: fullName?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        company: companyName?.trim() || null,
        cartItems: items.map(item => ({
          id: item.id,
          productId: item.product.id,
          productName: item.product.name,
          color: item.color?.name,
          size: item.size,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          printMethod: item.printMethod,
          printPlacement: item.printPlacement,
          previewUrl: item.previewUrl || item.product.colors[0]?.imageFront,
        })),
        cartTotal: total,
      }).catch(err => {
        console.warn('[Abandoned Checkout Capture]:', err);
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [checkoutSessionId, fullName, email, phone, companyName, items, total]);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setOrderError(null);
    setUploadStepStatus('Initiating order processing...');

    try {
      const insertedOrderIds: string[] = [];
      const emailItems: OrderEmailItem[] = [];

      const safeUploadToSupabase = async (
        source: string | null | undefined,
        label: string
      ): Promise<{ publicUrl: string | null; emailSource: string | undefined }> => {
        if (!source) return { publicUrl: null, emailSource: undefined };
        if (source.startsWith('http://') || source.startsWith('https://')) {
          return { publicUrl: source, emailSource: source };
        }
        try {
          const uploaded = await uploadDataUrlToStorage(source, label);
          if (uploaded && (uploaded.startsWith('http://') || uploaded.startsWith('https://'))) {
            return { publicUrl: uploaded, emailSource: uploaded };
          }
        } catch (storageError) {
          console.warn(`[Supabase Storage Warning] Upload failed for ${label}:`, storageError);
        }
        // Fallback: pass base64 dataUrl directly to email backend so Admin still receives the image!
        return {
          publicUrl: null,
          emailSource: source.startsWith('data:') ? source : undefined,
        };
      };

      // 1. Process and insert each cart item into Supabase custom_orders
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setUploadStepStatus(`Preparing artwork & mockup design for ${item.product.name} (${i + 1}/${items.length})...`);

        const { frontRawLogo, backRawLogo, extraRawLogos } = extractArtworkAssetsFromItem(item);
        const { frontMockupDataUrl, backMockupDataUrl } = await generateItemMockupSnapshots(item);
        const designPositionSummary = describeArtworkPlacement(item);

        setUploadStepStatus(`Uploading logo & placement mockup for ${item.product.name} to cloud storage...`);

        const slugBase = `${item.product.id}_${item.color?.name || 'custom'}`.replace(/[^a-zA-Z0-9_-]/g, '_');

        const [frontLogoRes, backLogoRes, frontMockupRes, backMockupRes, ...extraLogoResList] = await Promise.all([
          safeUploadToSupabase(frontRawLogo, `${slugBase}_logo_front`),
          safeUploadToSupabase(backRawLogo, `${slugBase}_logo_back`),
          safeUploadToSupabase(frontMockupDataUrl, `${slugBase}_mockup_front`),
          safeUploadToSupabase(backMockupDataUrl, `${slugBase}_mockup_back`),
          ...extraRawLogos.slice(0, 4).map((extraSrc, idx) =>
            safeUploadToSupabase(extraSrc, `${slugBase}_extra_${idx + 1}`)
          ),
        ]);

        const primaryLogoDbUrl = frontLogoRes.publicUrl || backLogoRes.publicUrl || frontMockupRes.publicUrl || null;

        // Map form fields to exact Supabase custom_orders columns
        const notesParts: string[] = [];
        if (item.color?.name) notesParts.push(`Color: ${item.color.name}`);
        if (item.size) notesParts.push(`Size: ${item.size}`);
        if (item.printMethod) notesParts.push(`Method: ${item.printMethod}`);
        if (designPositionSummary) notesParts.push(`Position & Layout: ${designPositionSummary}`);
        if (item.customNotes) notesParts.push(`Notes: ${item.customNotes}`);
        if (poNumber) notesParts.push(`PO#: ${poNumber}`);
        if (isB2BInvoice && gstin) notesParts.push(`GSTIN: ${gstin}`);
        notesParts.push(`Address: ${street}, ${city}, ${state} - ${pincode}`);
        notesParts.push(`Payment: ${paymentMode}`);

        // Attach structured URLs at end of custom_notes for Admin Hub multi-preview gallery
        if (frontMockupRes.publicUrl) notesParts.push(`[FrontMockup: ${frontMockupRes.publicUrl}]`);
        if (backMockupRes.publicUrl) notesParts.push(`[BackMockup: ${backMockupRes.publicUrl}]`);
        if (backLogoRes.publicUrl) notesParts.push(`[BackLogo: ${backLogoRes.publicUrl}]`);

        const orderRow = {
          customer_name: fullName.trim(),
          customer_email: email.trim(),
          company: companyName?.trim() || null,
          phone: phone.trim(),
          product_id: item.product.id,
          quantity: item.quantity,
          logo_url: primaryLogoDbUrl,
          custom_notes: notesParts.join(' | ') || 'Order placed via checkout',
          status: 'pending' as const,
        };

        console.log('[Supabase Order] Inserting into custom_orders:', orderRow);
        setUploadStepStatus(`Saving order for ${item.product.name} to Supabase database...`);

        // Real Supabase insert call:
        const { data, error } = await (supabase.from('custom_orders') as any)
          .insert([orderRow])
          .select();

        if (error) {
          console.error('[Supabase Insert Error in custom_orders]:', error);
          throw new Error(error.message || 'Failed to insert custom order into Supabase.');
        }

        console.log('[Supabase Insert Success]:', data);
        if (data && data[0]?.id) {
          insertedOrderIds.push(data[0].id);
        }

        emailItems.push({
          name: item.product.name,
          color: item.color?.name,
          size: item.size,
          sizeDistribution: item.sizeDistribution,
          printMethod: item.printMethod,
          printPlacement: item.printPlacement,
          frontPlacement: item.frontPlacement,
          backPlacement: item.backPlacement,
          designPositionSummary,
          logoUrl: frontLogoRes.emailSource,
          backLogoUrl: backLogoRes.emailSource,
          mockupFrontUrl: frontMockupRes.emailSource,
          mockupBackUrl: backMockupRes.emailSource,
          extraArtworkUrls: extraLogoResList.map((r) => r.emailSource).filter((u): u is string => Boolean(u)),
          customNotes: item.customNotes,
          quantity: item.quantity,
          price: item.unitPrice,
          totalPrice: item.totalPrice,
        });
      }

      // 2. Prepare confirmation order object
      const primaryId = insertedOrderIds[0] || `TQ-${Math.floor(100000 + Math.random() * 900000)}`;
      const orderNumber = primaryId.startsWith('TQ-') 
        ? primaryId 
        : `TQ-${primaryId.slice(0, 8).toUpperCase()}`;

      const shippingAddress: ShippingAddress = {
        fullName,
        companyName: companyName || undefined,
        email,
        phone,
        street,
        city,
        state,
        pincode,
        gstin: isB2BInvoice ? gstin : undefined,
        isB2BInvoice,
      };

      const newOrder: Order = {
        id: primaryId,
        orderNumber,
        createdAt: new Date().toISOString(),
        items: [...items],
        subtotal,
        gstRate,
        gstAmount,
        shippingFee,
        total,
        shippingAddress,
        proofStatus: 'Proof Ready - Needs Approval',
        orderStatus: 'Artwork Verification',
        estimatedDispatch: new Date(Date.now() + 48 * 3600 * 1000).toISOString().split('T')[0],
        trackingNumber: `BD-AIR-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        courierPartner: 'BlueDart Apex Express',
        paymentMode,
        paymentStatus: paymentMode === 'Test Gateway (Pre-Integration)' ? 'Test Authenticated (Sandbox)' : 'Pending Verification',
      };

      // CRO: Mark abandoned lead as recovered upon successful placement
      markCheckoutRecovered(checkoutSessionId, primaryId).catch(err => {
        console.warn('[Mark Checkout Recovered Warning]:', err);
      });
      try {
        sessionStorage.removeItem('teqqno_checkout_session_id');
      } catch {}

      // Trigger automated Hostinger SMTP order confirmation (Customer) & New Order Alert (Admin)
      setUploadStepStatus('Sending order confirmation & admin artwork emails...');
      const emailResult = await sendOrderConfirmationEmail({
        orderId: primaryId,
        orderNumber,
        customerName: fullName.trim(),
        customerEmail: email.trim(),
        company: companyName?.trim() || undefined,
        phone: phone.trim(),
        gstin: isB2BInvoice && gstin ? gstin.trim() : undefined,
        paymentMode,
        items: emailItems,
        subtotal,
        gstAmount,
        shippingFee,
        total,
        estimatedDispatch: '24-48h Fast Dispatch',
        shippingAddress: {
          street,
          city,
          state,
          pincode,
        },
      });

      newOrder.emailNotification = {
        status: emailResult.simulated
          ? 'simulated'
          : emailResult.success
            ? 'sent'
            : 'failed',
        message: emailResult.message,
        customerSent: emailResult.customerSent,
        adminSent: emailResult.adminSent,
      };

      setIsProcessing(false);
      onOrderPlaced(newOrder);

    } catch (err: any) {
      console.error('[Order Placement Error]:', err);
      setOrderError(err?.message || 'Failed to place order in Supabase. Please verify your connection or RLS policy.');
      setIsProcessing(false);
    }
  };


  const indianStates = [
    'Karnataka', 'Maharashtra', 'Delhi-NCR', 'Tamil Nadu', 'Telangana',
    'Gujarat', 'Uttar Pradesh', 'West Bengal', 'Haryana', 'Rajasthan',
    'Kerala', 'Madhya Pradesh', 'Punjab', 'Goa', 'Andhra Pradesh'
  ];

  return (
    <div className="bg-[#F5F5F7] min-h-screen py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Top Back & Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToCart}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-[#0B0B0D] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Shopping Bag</span>
          </button>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>256-Bit SSL Encrypted Procurement Checkout</span>
          </div>
        </div>

        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Order Error Alert Banner */}
          {orderError && (
            <div className="lg:col-span-12 p-4 rounded-2xl bg-red-50 border-2 border-red-300 text-red-800 text-xs sm:text-sm flex items-start gap-3 shadow-md animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-red-900">Supabase Order Insertion Failed</div>
                <p className="mt-0.5 text-red-700 leading-relaxed">{orderError}</p>
                <div className="mt-2 text-[11px] text-red-600 font-mono">
                  Make sure Supabase RLS Policy on table <code>custom_orders</code> allows <code>INSERT</code> for public/anon.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOrderError(null)}
                className="text-red-500 hover:text-red-800 text-xs font-bold px-2 py-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Left Column (7 cols): Address, GSTIN & Payment Selection */}
          <div className="lg:col-span-7 space-y-6">

            
            {/* Quick Login Prompt for Guests */}
            {!user && onRequestLogin && (
              <div className="bg-orange-50/70 border border-[#FF7A00]/30 rounded-2xl p-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#FF7A00] shrink-0" />
                  <div>
                    <span className="font-bold text-[#0B0B0D]">Already have a corporate account?</span>
                    <p className="text-zinc-600 text-[11px]">Log in with Mobile OTP to auto-fill GSTIN & verified company addresses.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onRequestLogin}
                  className="bg-[#FF7A00] hover:bg-[#ff881a] text-white font-semibold px-3.5 py-1.5 rounded-xl shrink-0 transition-colors shadow-xs"
                >
                  Login with OTP
                </button>
              </div>
            )}

            {/* Step 1: Contact & Company Profile */}
            <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 shadow-xs space-y-4">
              <h3 className="font-display font-bold text-base text-[#0B0B0D] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#FF7A00] text-white flex items-center justify-center text-xs">1</span>
                <span>Contact & GST Invoicing Details</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm sm:text-sm border border-zinc-300 rounded-xl focus:border-[#FF7A00] outline-none min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Company / Organization Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm sm:text-sm border border-zinc-300 rounded-xl focus:border-[#FF7A00] outline-none min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Email (For Digital Proof & Invoice) *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm sm:text-sm border border-zinc-300 rounded-xl focus:border-[#FF7A00] outline-none min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Mobile / WhatsApp (Dispatch Alerts) *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm sm:text-sm border border-zinc-300 rounded-xl focus:border-[#FF7A00] outline-none min-h-[44px]"
                  />
                </div>
              </div>

              {/* Purchase Order (PO) Number for Corporate Reconciliation */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Corporate Purchase Order (PO) Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. PO/2026/NX-9824"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-mono border border-zinc-300 rounded-xl focus:border-[#FF7A00] outline-none bg-white min-h-[44px]"
                />
              </div>

              {/* GSTIN Toggle & Live Verification Box */}
              <div className="bg-[#FAF9FD] p-4 rounded-xl border border-[#ECEAF3] space-y-3">
                <label className="flex items-center gap-2 text-xs text-zinc-800 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={isB2BInvoice}
                    onChange={(e) => setIsB2BInvoice(e.target.checked)}
                    className="rounded border-zinc-300 text-[#FF7A00] focus:ring-[#FF7A00]"
                  />
                  <span className="font-bold text-zinc-900">Generate official 18% GST Input Tax Credit (ITC) Tax Invoice</span>
                </label>

                {isB2BInvoice && (
                  <div className="space-y-2 pt-1">
                    <div className="relative">
                      <input
                        type="text"
                        required={isB2BInvoice}
                        maxLength={15}
                        placeholder="15-Digit GSTIN (e.g. 29AABCN8291P1ZX)"
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                        className="w-full px-3.5 py-2.5 text-xs uppercase font-mono border border-zinc-300 rounded-xl focus:border-[#FF7A00] outline-none bg-white font-bold tracking-wider"
                      />
                      {gstin && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {isGstinValid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3 text-emerald-700" />
                              Valid GSTIN
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-mono">
                              {gstin.length}/15 digits
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {detectedGstinState && (
                      <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-600 bg-white p-2.5 rounded-lg border border-zinc-200">
                        <span className="font-semibold text-zinc-800">State Jurisdiction: {detectedGstinState}</span>
                        <span className="text-emerald-700 font-bold">SAC 9989 · Claim ₹{gstAmount.toLocaleString('en-IN')} ITC</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Shipping & Corporate Billing Addresses */}
            <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 shadow-xs space-y-4">
              <h3 className="font-display font-bold text-base text-[#0B0B0D] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#FF7A00] text-white flex items-center justify-center text-xs">2</span>
                <span>Delivery & Corporate Billing Address</span>
              </h3>

              <div className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Physical Delivery Address (Shipping) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Tower B, Tech Park, Outer Ring Road..."
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm sm:text-sm border border-zinc-300 rounded-xl focus:border-[#FF7A00] outline-none min-h-[44px]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">City *</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm sm:text-sm border border-zinc-300 rounded-xl focus:border-[#FF7A00] outline-none min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">State *</label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm sm:text-sm border border-zinc-300 rounded-xl focus:border-[#FF7A00] outline-none bg-white min-h-[44px]"
                    >
                      {indianStates.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">Pincode *</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm sm:text-sm font-mono border border-zinc-300 rounded-xl focus:border-[#FF7A00] outline-none min-h-[44px]"
                    />
                  </div>
                </div>

                {/* Separate Billing Address Toggle */}
                <div className="pt-2 border-t border-zinc-100">
                  <label className="flex items-center gap-2 text-xs text-zinc-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={billingSameAsShipping}
                      onChange={(e) => setBillingSameAsShipping(e.target.checked)}
                      className="rounded border-zinc-300 text-[#FF7A00] focus:ring-[#FF7A00]"
                    />
                    <span>Company Billing address is identical to shipping delivery address</span>
                  </label>

                  {!billingSameAsShipping && (
                    <div className="mt-3 p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-3">
                      <div className="text-xs font-bold text-zinc-800">Corporate Registered Billing Address (For Tax Invoice)</div>
                      <input
                        type="text"
                        placeholder="Registered Corporate HQ Street Address"
                        value={billingStreet}
                        onChange={(e) => setBillingStreet(e.target.value)}
                        className="w-full p-2.5 text-xs border border-zinc-300 rounded-lg bg-white outline-none focus:border-[#FF7A00]"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="City"
                          value={billingCity}
                          onChange={(e) => setBillingCity(e.target.value)}
                          className="p-2 text-xs border border-zinc-300 rounded-lg bg-white outline-none"
                        />
                        <input
                          type="text"
                          placeholder="State"
                          value={billingState}
                          onChange={(e) => setBillingState(e.target.value)}
                          className="p-2 text-xs border border-zinc-300 rounded-lg bg-white outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Pincode"
                          maxLength={6}
                          value={billingPincode}
                          onChange={(e) => setBillingPincode(e.target.value)}
                          className="p-2 text-xs border border-zinc-300 rounded-lg bg-white outline-none font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 pt-1">
                  <Truck className="w-3.5 h-3.5 text-[#FF7A00]" />
                  <span>Estimated Courier Transit to {city}, {state}: 24–48 hours via BlueDart Air Express</span>
                </div>
              </div>
            </div>

            {/* Step 3: Payment & Gateway Integration Transparent Notice */}
            <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 shadow-xs space-y-4">
              <h3 className="font-display font-bold text-base text-[#0B0B0D] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#FF7A00] text-white flex items-center justify-center text-xs">3</span>
                <span>Payment Mode & Integration Status</span>
              </h3>

              {/* Explicit Integration Status Box per system instructions */}
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 text-xs text-amber-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Payment Gateway Integration Architecture Notice</span>
                </div>
                <p className="leading-relaxed text-[11px] text-amber-800">
                  In production, live Indian online payments are processed through <strong>Razorpay / Cashfree / Stripe India</strong> webhooks using environment API keys. 
                  This demonstration sandbox validates your custom artwork proofing workflow, records your order specifications, and dispatches it directly to the proof tracking pipeline without making real bank deductions.
                </p>
              </div>

              {/* Payment Methods */}
              <div className="space-y-3 pt-2">
                {[
                  {
                    id: 'Test Gateway (Pre-Integration)',
                    title: 'Test Payment Gateway (Sandbox Simulation)',
                    desc: 'Simulate instant UPI / Corporate NetBanking authentication. Safe demonstration.',
                    icon: CreditCard,
                  },
                  {
                    id: 'Pay on Approval',
                    title: 'Pay After Digital Proof Approval',
                    desc: 'Zero advance required today. Inspect your 1:1 scale visual proof before clearing payment.',
                    icon: ShieldCheck,
                  },
                  {
                    id: 'Corporate PO 30-Day',
                    title: 'Corporate Purchase Order (30-Day Net Credit)',
                    desc: 'Eligible for verified registered companies with valid GSTIN.',
                    icon: Building2,
                  },
                ].map((mode) => (
                  <label
                    key={mode.id}
                    className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                      paymentMode === mode.id
                        ? 'border-[#FF7A00] bg-[#FF7A00]/5 ring-1 ring-[#FF7A00]'
                        : 'border-zinc-200 hover:border-zinc-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="paymentMode"
                        checked={paymentMode === mode.id}
                        onChange={() => setPaymentMode(mode.id as any)}
                        className="mt-1 text-[#FF7A00] focus:ring-[#FF7A00]"
                      />
                      <div className="flex-1">
                        <div className="text-xs sm:text-sm font-semibold text-[#0B0B0D] flex items-center gap-2">
                          <mode.icon className="w-4 h-4 text-[#FF7A00]" />
                          <span>{mode.title}</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">{mode.desc}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

            </div>

          </div>

          {/* Right Column (5 cols): Order Summary & Submit Button */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 shadow-xs space-y-5">
              <h3 className="font-display font-bold text-base text-[#0B0B0D] pb-3 border-b border-[#E5E5EA]">
                Order Summary ({items.length} items)
              </h3>

              {/* Items Preview */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.id} className="text-xs flex items-start justify-between gap-3 pb-3 border-b border-zinc-100">
                    <div>
                      <div className="font-semibold text-[#0B0B0D]">{item.product.name}</div>
                      <div className="text-[11px] text-zinc-500">
                        {item.quantity} pcs · {item.color.name} {item.size ? `· ${item.size}` : ''}
                      </div>
                      <div className="text-[10px] text-[#FF7A00] font-mono">
                        {item.printMethod} ({item.printPlacement})
                      </div>
                    </div>
                    <div className="text-right font-mono font-bold text-zinc-800">
                      ₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Cost Breakdown */}
              <div className="space-y-2 text-xs text-zinc-600 pt-2">
                <div className="flex justify-between">
                  <span>Product Subtotal:</span>
                  <span className="font-mono text-zinc-800">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pan-India Air Logistics:</span>
                  <span className="font-mono">
                    {shippingFee === 0 ? <strong className="text-emerald-600 font-semibold">FREE</strong> : `₹${shippingFee}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>GST (18% ITC Credit):</span>
                  <span className="font-mono text-zinc-800">+₹{gstAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="pt-3 border-t border-zinc-200 flex justify-between font-display font-bold text-lg text-[#0B0B0D]">
                  <span>Total Payable:</span>
                  <span className="text-[#FF7A00]">₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-[#FF7A00] hover:bg-[#e06c00] text-white font-display font-semibold py-4 px-4 rounded-xl shadow-lg shadow-[#FF7A00]/25 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 text-sm disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>{uploadStepStatus || 'Saving order to Supabase...'}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Submit Order & Open Proof Studio</span>
                  </>
                )}
              </button>


              <div className="space-y-2 pt-2 text-[11px] text-zinc-500 text-center">
                <p>🔒 100% Satisfaction Guarantee: We do not start factory manufacturing until you inspect and approve your 1:1 digital proof.</p>
              </div>

            </div>

          </div>

        </form>

      </div>
    </div>
  );
};
