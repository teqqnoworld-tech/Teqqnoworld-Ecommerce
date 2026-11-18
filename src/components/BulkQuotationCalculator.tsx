import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Download, 
  ShoppingCart, 
  CheckCircle2, 
  Building2, 
  FileText, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  Printer,
  X,
  Layers,
  HelpCircle
} from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import { PRODUCTS } from '../data/mockData';
import { calculateProductPrice } from '../data/pricingRules';
import { Product, CartItem, PrintMethod } from '../types';
import { formatWhatsAppQuoteUrl } from '../utils/whatsapp';
import { BUSINESS_DETAILS } from '../data/legalData';
import { VoiceInstructionsCard } from './VoiceInstructionsCard';

interface BulkQuotationCalculatorProps {
  onAddToCart?: (item: CartItem) => void;
  onCloseModal?: () => void;
  isModal?: boolean;
}

export const BulkQuotationCalculator: React.FC<BulkQuotationCalculatorProps> = ({
  onAddToCart,
  onCloseModal,
  isModal = false,
}) => {
  // Selected product
  const [selectedProductId, setSelectedProductId] = useState<string>('prod-polo-01');
  const selectedProduct = useMemo(() => {
    return PRODUCTS.find(p => p.id === selectedProductId) || PRODUCTS[0];
  }, [selectedProductId]);

  // Quantity selection
  const [quantity, setQuantity] = useState<number>(50);

  // Selected options
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0);
  const selectedColor = selectedProduct.colors[selectedColorIndex] || selectedProduct.colors[0];
  
  const [selectedSize, setSelectedSize] = useState<string>(
    selectedProduct.sizes ? selectedProduct.sizes[1] || selectedProduct.sizes[0] : 'Standard'
  );

  const [selectedPrintMethod, setSelectedPrintMethod] = useState<PrintMethod>(
    selectedProduct.printMethods[0] || 'Precision Embroidery'
  );
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(null);
  const [voiceNotes, setVoiceNotes] = useState<string>('');

  // B2B Add-on options
  const [includePolybag, setIncludePolybag] = useState<boolean>(true);
  const [includeExpressDispatch, setIncludeExpressDispatch] = useState<boolean>(false);
  const [includeCustomNeckLabel, setIncludeCustomNeckLabel] = useState<boolean>(false);

  // Client Details Form
  const [companyName, setCompanyName] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [gstin, setGstin] = useState<string>('');
  const [stateCode, setStateCode] = useState<string>('29'); // Karnataka default

  // Printable quotation preview modal
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [quotationNumber] = useState<string>(() => `TQ-QTN-${Math.floor(100000 + Math.random() * 900000)}`);
  const [addedToCartToast, setAddedToCartToast] = useState<boolean>(false);

  // Calculate pricing using exact pricingRules.ts
  const pricing = useMemo(() => {
    // For canopy or umbrella, pass size/dimension if available
    const dim = selectedProduct.productType === 'canopy' ? '4 × 4 ft' : undefined;
    const baseCalc = calculateProductPrice(selectedProduct.id, quantity, dim);
    
    // Add-ons cost calculation per unit
    let addonPerUnit = 0;
    if (includePolybag) addonPerUnit += 8; // ₹8 per piece individual polybag with barcode
    if (includeCustomNeckLabel && selectedProduct.category === 'apparel') addonPerUnit += 15; // ₹15 woven label
    if (includeExpressDispatch) addonPerUnit += 20; // ₹20 express production queue

    const unitPrice = baseCalc.unitPrice + addonPerUnit;
    const subtotal = unitPrice * quantity;
    const isInterState = stateCode !== '29';
    const gstRate = 0.18;
    const gstAmount = Math.round(subtotal * gstRate);
    const shipping = subtotal >= 1999 ? 0 : 149;
    const grandTotal = subtotal + gstAmount + shipping;

    return {
      baseUnitPrice: baseCalc.unitPrice,
      addonPerUnit,
      unitPrice,
      subtotal,
      gstAmount,
      cgst: isInterState ? 0 : Math.round(gstAmount / 2),
      sgst: isInterState ? 0 : Math.round(gstAmount / 2),
      igst: isInterState ? gstAmount : 0,
      shipping,
      grandTotal,
      savingsPerUnit: Math.max(0, selectedProduct.basePrice - baseCalc.unitPrice),
      totalSavings: Math.max(0, (selectedProduct.basePrice - baseCalc.unitPrice) * quantity),
    };
  }, [selectedProduct, quantity, includePolybag, includeCustomNeckLabel, includeExpressDispatch, stateCode]);

  // Handle Add to Cart
  const handleAddToCart = () => {
    if (!onAddToCart) return;

    const cartItem: CartItem = {
      id: `quote-${Date.now()}`,
      product: selectedProduct,
      color: selectedColor,
      size: selectedProduct.sizes ? selectedSize : undefined,
      quantity,
      unitPrice: pricing.unitPrice,
      totalPrice: pricing.subtotal,
      printMethod: selectedPrintMethod,
      printPlacement: 'Center Chest / Standard B2B Placement',
      customNotes: `B2B Bulk Quote: ${includePolybag ? 'Individual Polybag. ' : ''}${includeCustomNeckLabel ? 'Custom Neck Label. ' : ''}${includeExpressDispatch ? 'Express 48h Dispatch. ' : ''}Ref: ${quotationNumber}${voiceNotes.trim() ? ` | Notes: ${voiceNotes.trim()}` : ''}`,
      voiceNoteUrl: voiceNoteUrl || undefined,
    };

    onAddToCart(cartItem);
    setAddedToCartToast(true);
    setTimeout(() => setAddedToCartToast(false), 3000);
  };

  // WhatsApp Quote URL
  const whatsAppUrl = useMemo(() => {
    return formatWhatsAppQuoteUrl({
      productName: selectedProduct.name,
      quantity,
      unitPrice: pricing.unitPrice,
      totalPrice: pricing.grandTotal,
      printMethod: selectedPrintMethod,
      colorName: selectedColor.name,
      size: selectedProduct.sizes ? selectedSize : undefined,
      companyName,
      clientName: contactPerson,
      gstin,
      notes: `Ref: ${quotationNumber}. ${includePolybag ? 'Polybag packing included. ' : ''}${includeExpressDispatch ? 'Express production. ' : ''}`,
    });
  }, [selectedProduct, quantity, pricing, selectedPrintMethod, selectedColor, selectedSize, companyName, contactPerson, gstin, quotationNumber, includePolybag, includeExpressDispatch]);

  return (
    <div className={`bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-[0_28px_70px_-15px_rgba(7,27,53,0.38)] overflow-hidden w-full animate-admin-scale-in ${isModal ? 'max-w-5xl mx-auto my-auto max-h-[92vh] sm:max-h-[88vh] flex flex-col' : 'max-w-7xl mx-auto my-4 sm:my-8'}`}>
      
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#071B35] via-[#0C264A] to-[#071B35] text-white p-5 sm:p-6 lg:p-7 shrink-0 border-b border-white/10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-14 w-80 h-80 rounded-full opacity-35 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(255,121,0,0.55) 0%, transparent 70%)',
          }}
        />
        {isModal && onCloseModal && (
          <button
            type="button"
            onClick={onCloseModal}
            aria-label="Close Quotation Calculator"
            className="relative z-20 float-right text-slate-300 hover:text-white p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all cursor-pointer group"
            title="Close"
          >
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
          </button>
        )}

        <div className="relative z-10 flex flex-wrap items-center gap-2 mb-2.5 pr-10 sm:pr-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF7900]/15 border border-[#FF7900]/45 text-[#FF9E44] text-[11px] font-mono font-bold tracking-wider uppercase">
            <Calculator className="w-3.5 h-3.5 text-[#FF7900]" />
            <span>Direct Factory B2B Quotation Engine</span>
          </span>
          <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-400/25 px-2.5 py-0.5 rounded-full">
            SAC 9989 · 100% ITC Eligible
          </span>
        </div>

        <h2 className="relative z-10 font-display text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white">
          Instant Bulk Order Quotation &amp; Estimator
        </h2>
        <p className="relative z-10 text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
          Live tiered manufacturing prices directly calibrated from our factory floor. Download official PDF proposals or submit for immediate pre-press proofing.
        </p>
      </div>

      {/* Main Grid: Form Controls (Left) + Financial Summary (Right) */}
      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8 p-4 sm:p-6 lg:p-8 ${isModal ? 'overflow-y-auto flex-1 overscroll-contain' : ''}`}>
        
        {/* Left Column: Product & Quantity Selection (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1. Product Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-2">
              1. Select Merchandise Product
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {PRODUCTS.map((prod) => {
                const isSelected = prod.id === selectedProductId;
                return (
                  <button
                    key={prod.id}
                    onClick={() => {
                      setSelectedProductId(prod.id);
                      setSelectedColorIndex(0);
                      if (prod.sizes) setSelectedSize(prod.sizes[0]);
                      if (prod.printMethods) setSelectedPrintMethod(prod.printMethods[0]);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#FF7A00] bg-orange-50/40 ring-2 ring-[#FF7A00]/20'
                        : 'border-zinc-200 hover:border-zinc-300 bg-white'
                    }`}
                  >
                    <div className="text-[11px] font-bold text-zinc-900 line-clamp-1">{prod.name}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">MOQ: {prod.moq} pcs</div>
                    <div className="text-xs font-mono font-bold text-[#FF7A00] mt-1">
                      From ₹{prod.tieredPricing[prod.tieredPricing.length - 1]?.price || prod.basePrice}/pc
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Quantity Slider & Quick Slabs */}
          <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-200/90 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                  2. Order Quantity: <span className="font-mono text-base text-[#0B0B0D] font-bold">{quantity} units</span>
                </label>
                <p className="text-[11px] text-zinc-500">Tier price updates in real-time according to volume brackets</p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-bold border border-emerald-200">
                  Rate: ₹{pricing.baseUnitPrice}/pc
                </span>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min={selectedProduct.moq || 2}
              max={500}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#FF7A00]"
            />

            {/* Quick Slabs Selector */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[2, 5, 10, 25, 50, 100, 200, 500].map((qtyOption) => (
                <button
                  key={qtyOption}
                  onClick={() => setQuantity(qtyOption)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    quantity === qtyOption
                      ? 'bg-[#FF7A00] text-white shadow-xs'
                      : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  {qtyOption} pcs
                </button>
              ))}
            </div>
          </div>

          {/* 3. Color & Sizing / Customization Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Color picker */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-2">
                Garment / Base Color: <span className="text-zinc-900 font-semibold">{selectedColor.name}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedProduct.colors.map((c, idx) => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedColorIndex(idx)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer ${
                      selectedColorIndex === idx ? 'border-[#FF7A00] scale-110 shadow-sm' : 'border-zinc-300'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Print Method picker */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-2">
                Imprint Technique
              </label>
              <select
                value={selectedPrintMethod}
                onChange={(e) => setSelectedPrintMethod(e.target.value as PrintMethod)}
                className="w-full p-2.5 text-xs font-medium border border-zinc-300 rounded-xl bg-white outline-none focus:border-[#FF7A00]"
              >
                {selectedProduct.printMethods.map((pm) => (
                  <option key={pm} value={pm}>{pm}</option>
                ))}
              </select>
            </div>

            {/* Sizing if applicable */}
            {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-2">
                  Sample Size Bracket
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {selectedProduct.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                        selectedSize === s
                          ? 'border-[#FF7A00] bg-[#FF7A00] text-white shadow-xs'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. Enterprise Add-ons */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">
              Enterprise Packaging & Turnaround Add-ons
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              
              <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer text-xs transition-colors ${includePolybag ? 'border-orange-300 bg-orange-50/50' : 'border-zinc-200 bg-white'}`}>
                <input
                  type="checkbox"
                  checked={includePolybag}
                  onChange={(e) => setIncludePolybag(e.target.checked)}
                  className="mt-0.5 rounded text-[#FF7A00] focus:ring-[#FF7A00]"
                />
                <div>
                  <div className="font-semibold text-zinc-900">Individual Polybag (+₹8/pc)</div>
                  <div className="text-[10px] text-zinc-500">Sealed with size & SKU barcode</div>
                </div>
              </label>

              {selectedProduct.category === 'apparel' && (
                <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer text-xs transition-colors ${includeCustomNeckLabel ? 'border-orange-300 bg-orange-50/50' : 'border-zinc-200 bg-white'}`}>
                  <input
                    type="checkbox"
                    checked={includeCustomNeckLabel}
                    onChange={(e) => setIncludeCustomNeckLabel(e.target.checked)}
                    className="mt-0.5 rounded text-[#FF7A00] focus:ring-[#FF7A00]"
                  />
                  <div>
                    <div className="font-semibold text-zinc-900">Custom Neck Label (+₹15/pc)</div>
                    <div className="text-[10px] text-zinc-500">Woven damask private label</div>
                  </div>
                </label>
              )}

              <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer text-xs transition-colors ${includeExpressDispatch ? 'border-orange-300 bg-orange-50/50' : 'border-zinc-200 bg-white'}`}>
                <input
                  type="checkbox"
                  checked={includeExpressDispatch}
                  onChange={(e) => setIncludeExpressDispatch(e.target.checked)}
                  className="mt-0.5 rounded text-[#FF7A00] focus:ring-[#FF7A00]"
                />
                <div>
                  <div className="font-semibold text-zinc-900">Express 48h Dispatch (+₹20/pc)</div>
                  <div className="text-[10px] text-zinc-500">Priority factory line slot</div>
                </div>
              </label>

            </div>
          </div>

          {/* 5. Client & Corporate Info Form */}
          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/90 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#FF7A00]" />
              <span>Client & Company Details (For Official Quotation Document)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Company / Organization Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="p-2 text-xs border border-zinc-300 rounded-lg outline-none focus:border-[#FF7A00] bg-white"
              />
              <input
                type="text"
                placeholder="Contact Person Full Name"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="p-2 text-xs border border-zinc-300 rounded-lg outline-none focus:border-[#FF7A00] bg-white"
              />
              <input
                type="email"
                placeholder="Corporate Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="p-2 text-xs border border-zinc-300 rounded-lg outline-none focus:border-[#FF7A00] bg-white"
              />
              <input
                type="tel"
                placeholder="Phone / WhatsApp Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="p-2 text-xs border border-zinc-300 rounded-lg outline-none focus:border-[#FF7A00] bg-white"
              />
              <input
                type="text"
                placeholder="GSTIN (e.g. 29AABCN8291P1ZX)"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                className="p-2 text-xs border border-zinc-300 rounded-lg outline-none focus:border-[#FF7A00] bg-white font-mono"
              />
              <select
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                className="p-2 text-xs border border-zinc-300 rounded-lg outline-none focus:border-[#FF7A00] bg-white"
              >
                <option value="29">Karnataka (Intrastate CGST+SGST 18%)</option>
                <option value="27">Maharashtra (Interstate IGST 18%)</option>
                <option value="07">Delhi (Interstate IGST 18%)</option>
                <option value="06">Haryana (Interstate IGST 18%)</option>
                <option value="33">Tamil Nadu (Interstate IGST 18%)</option>
                <option value="36">Telangana (Interstate IGST 18%)</option>
                <option value="19">West Bengal (Interstate IGST 18%)</option>
                <option value="99">Other States (Interstate IGST 18%)</option>
              </select>
            </div>
          </div>

        </div>

        {/* Right Column: Live Quotation Summary Card (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-gradient-to-b from-[#F8FAFC] to-white rounded-2xl border border-slate-200/90 p-6 space-y-6 shadow-md">
            
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
                  REF #{quotationNumber}
                </span>
                <h3 className="font-display font-bold text-lg text-[#071B35]">
                  Estimated Price Summary
                </h3>
              </div>
              <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                15-Day Price Lock
              </span>
            </div>

            {/* Selected Product Snapshot */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-zinc-200">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-2xs"
                style={{ backgroundColor: selectedColor.hex }}
              >
                {selectedProduct.productType.slice(0, 3).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-xs text-[#0B0B0D] truncate">{selectedProduct.name}</div>
                <div className="text-[11px] text-zinc-500">
                  {selectedColor.name} · {selectedProduct.sizes ? `Size ${selectedSize} · ` : ''}{selectedPrintMethod}
                </div>
              </div>
            </div>

            {/* Financial Calculations Table */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Base Unit Rate ({quantity} pcs slab):</span>
                <span className="font-mono font-medium text-zinc-900">₹{pricing.baseUnitPrice.toLocaleString('en-IN')}.00</span>
              </div>

              {pricing.addonPerUnit > 0 && (
                <div className="flex justify-between text-zinc-600">
                  <span>Packaging & Add-ons per unit:</span>
                  <span className="font-mono font-medium text-zinc-900">+₹{pricing.addonPerUnit.toLocaleString('en-IN')}.00</span>
                </div>
              )}

              <div className="flex justify-between text-zinc-900 font-semibold pt-1 border-t border-zinc-200">
                <span>Effective Unit Price:</span>
                <span className="font-mono font-bold text-[#FF7A00]">₹{pricing.unitPrice.toLocaleString('en-IN')}.00 / pc</span>
              </div>

              <div className="flex justify-between text-zinc-600">
                <span>Net Taxable Subtotal:</span>
                <span className="font-mono font-medium text-zinc-900">₹{pricing.subtotal.toLocaleString('en-IN')}.00</span>
              </div>

              {stateCode === '29' ? (
                <>
                  <div className="flex justify-between text-zinc-500 text-[11px]">
                    <span>CGST (9%):</span>
                    <span className="font-mono">₹{pricing.cgst.toLocaleString('en-IN')}.00</span>
                  </div>
                  <div className="flex justify-between text-zinc-500 text-[11px]">
                    <span>SGST (9%):</span>
                    <span className="font-mono">₹{pricing.sgst.toLocaleString('en-IN')}.00</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-zinc-500 text-[11px]">
                  <span>IGST (18% Interstate):</span>
                  <span className="font-mono">₹{pricing.igst.toLocaleString('en-IN')}.00</span>
                </div>
              )}

              <div className="flex justify-between text-zinc-600">
                <span>Express Cargo Shipping:</span>
                <span className="font-mono font-medium text-emerald-700">
                  {pricing.shipping === 0 ? 'FREE (Orders > ₹1,999)' : `₹${pricing.shipping}.00`}
                </span>
              </div>

              {pricing.totalSavings > 0 && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-800 text-[11px] font-semibold">
                  <span>Volume Slab Savings:</span>
                  <span className="font-mono font-bold">Save ₹{pricing.totalSavings.toLocaleString('en-IN')}!</span>
                </div>
              )}

              {/* Grand Total */}
              <div className="pt-3 border-t-2 border-zinc-200 flex justify-between items-baseline">
                <div>
                  <div className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Grand Total (Incl. 18% GST)</div>
                  <div className="text-[10px] text-zinc-400">100% Tax Deductible with GSTIN</div>
                </div>
                <div className="text-right">
                  <span className="font-display text-2xl font-bold font-mono text-[#0B0B0D]">
                    ₹{pricing.grandTotal.toLocaleString('en-IN')}.00
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              
              {/* Button A: Download PDF Quotation */}
              <button
                onClick={() => setShowPrintModal(true)}
                className="w-full bg-[#0B0B0D] hover:bg-zinc-800 text-white text-xs font-semibold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#FF7A00]" />
                <span>Download Official PDF Quotation</span>
              </button>

              {/* Button B: WhatsApp Instant Quote */}
              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#1EBE5D] hover:bg-[#19a851] text-white text-xs font-semibold py-3 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <WhatsAppIcon className="w-4 h-4 text-white" />
                <span>Send Quote Spec to WhatsApp</span>
              </a>

              {/* Button C: Add to Cart */}
              {onAddToCart && (
                <button
                  onClick={handleAddToCart}
                  className="w-full bg-[#FF7A00] hover:bg-[#ff881a] text-white text-xs font-semibold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{addedToCartToast ? 'Added to Cart Successfully!' : 'Add This Batch to Cart'}</span>
                </button>
              )}

              {/* Voice Instructions */}
              <VoiceInstructionsCard
                voiceNoteUrl={voiceNoteUrl}
                onVoiceNoteChange={setVoiceNoteUrl}
                textNotes={voiceNotes}
                onTextNotesChange={setVoiceNotes}
                title="Add Bulk Order Voice Note"
                subtitle="Record special packaging, sizing or dispatch timing instructions"
                compact
              />

            </div>

            {/* Trust Badges */}
            <div className="pt-2 border-t border-zinc-200/80 flex items-center justify-around text-[10px] text-zinc-500 font-medium">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                GST Tax Invoice
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Digital Proof Included
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Factory Direct
              </span>
            </div>

          </div>
        </div>

      </div>

      {/* PRINT-READY OFFICIAL PDF QUOTATION MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl p-6 sm:p-8 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 border-b border-zinc-200">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold bg-[#FF7A00]/10 text-[#FF7A00] px-2.5 py-1 rounded">
                  Official B2B Proforma Quotation
                </span>
                <span className="text-xs text-zinc-400 font-mono">Ref: {quotationNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-[#0B0B0D] hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="text-zinc-400 hover:text-zinc-800 p-2 rounded-xl hover:bg-zinc-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Sheet */}
            <div id="printable-quotation" className="p-6 sm:p-8 border border-zinc-200 rounded-2xl bg-white space-y-6 font-sans text-zinc-800">
              
              {/* Header Letterhead */}
              <div className="flex items-start justify-between border-b pb-6 border-zinc-200">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#FF7A00] text-white flex items-center justify-center font-bold text-lg">
                      T
                    </div>
                    <span className="font-display font-bold text-2xl text-[#0B0B0D]">
                      Teqqno<span className="text-[#FF7A00]">World</span>
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-2 space-y-0.5">
                    <div>{BUSINESS_DETAILS.facilityAddress}</div>
                    <div>Email: {BUSINESS_DETAILS.supportEmail} · Phone: {BUSINESS_DETAILS.phoneHelp}</div>
                    <div className="font-mono text-zinc-600">GSTIN: {BUSINESS_DETAILS.gstinPlaceholder} · SAC: 9989</div>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="text-xs font-mono font-bold text-[#FF7A00]">PROFORMA QUOTATION</div>
                  <div className="text-sm font-mono font-bold text-[#0B0B0D]">{quotationNumber}</div>
                  <div className="text-[11px] text-zinc-500">
                    Date: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-semibold">
                    Valid for: 15 Calendar Days
                  </div>
                </div>
              </div>

              {/* Client & Billing Details */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                <div>
                  <div className="font-bold text-zinc-500 uppercase text-[10px] tracking-wider">Quotation Prepared For:</div>
                  <div className="font-bold text-zinc-900 mt-1">{companyName || 'Corporate Client'}</div>
                  <div className="text-zinc-600">{contactPerson || 'Procurement Officer'}</div>
                  <div className="text-zinc-600">{email || 'Not Provided'} · {phone || 'Not Provided'}</div>
                  {gstin && <div className="font-mono font-semibold text-zinc-800 mt-0.5">GSTIN: {gstin}</div>}
                </div>
                <div>
                  <div className="font-bold text-zinc-500 uppercase text-[10px] tracking-wider">Fulfillment & Supply Terms:</div>
                  <div className="text-zinc-700 mt-1">Dispatch Hub: Bachupally Facility, Hyderabad</div>
                  <div className="text-zinc-700">Production SLA: {includeExpressDispatch ? '48 Hours Express' : '3–5 Working Days'}</div>
                  <div className="text-zinc-700">Digital Proof: Required before manufacturing sign-off</div>
                </div>
              </div>

              {/* Itemized Table */}
              <div>
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-100 border-b border-zinc-300 text-zinc-700 font-semibold">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3">Specs & Imprint</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Rate (₹)</th>
                      <th className="py-2.5 px-3 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    <tr>
                      <td className="py-3 px-3 font-mono">1</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-zinc-900">{selectedProduct.name}</div>
                        <div className="text-[11px] text-zinc-500">Color: {selectedColor.name} {selectedProduct.sizes ? `· Size: ${selectedSize}` : ''}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-zinc-800">{selectedPrintMethod}</div>
                        <div className="text-[10px] text-zinc-400">Tolerance ±1.5mm · High Precision</div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">{quantity}</td>
                      <td className="py-3 px-3 text-right font-mono">₹{pricing.unitPrice.toLocaleString('en-IN')}.00</td>
                      <td className="py-3 px-3 text-right font-mono font-bold">₹{pricing.subtotal.toLocaleString('en-IN')}.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals Breakdown */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-zinc-600">
                    <span>Taxable Value:</span>
                    <span className="font-mono">₹{pricing.subtotal.toLocaleString('en-IN')}.00</span>
                  </div>
                  {stateCode === '29' ? (
                    <>
                      <div className="flex justify-between text-zinc-600 text-[11px]">
                        <span>CGST (9%):</span>
                        <span className="font-mono">₹{pricing.cgst.toLocaleString('en-IN')}.00</span>
                      </div>
                      <div className="flex justify-between text-zinc-600 text-[11px]">
                        <span>SGST (9%):</span>
                        <span className="font-mono">₹{pricing.sgst.toLocaleString('en-IN')}.00</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-zinc-600 text-[11px]">
                      <span>IGST (18%):</span>
                      <span className="font-mono">₹{pricing.igst.toLocaleString('en-IN')}.00</span>
                    </div>
                  )}
                  <div className="flex justify-between text-zinc-600">
                    <span>Shipping Charges:</span>
                    <span className="font-mono text-emerald-700">{pricing.shipping === 0 ? 'FREE' : `₹${pricing.shipping}.00`}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-zinc-900 border-t pt-2 border-zinc-300">
                    <span>Grand Total:</span>
                    <span className="font-mono text-[#FF7A00]">₹{pricing.grandTotal.toLocaleString('en-IN')}.00</span>
                  </div>
                </div>
              </div>

              {/* Terms and Bank Coordinates */}
              <div className="border-t pt-4 border-zinc-200 text-[10px] text-zinc-500 space-y-1">
                <div className="font-bold text-zinc-700">Bank Transfer / NEFT / RTGS Coordinates:</div>
                <div>Account Name: TeqqnoWorld Solutions Pvt Ltd · Bank: HDFC Bank, Outer Ring Road Branch</div>
                <div>Account Number: 50200084920192 · IFSC: HDFC0001824 · UPI: teqqnoworld@hdfcbank</div>
                <div className="text-zinc-400 pt-1">
                  * Note: Production commences only after digital proof sign-off. Prices are valid for 15 days from quote issuance.
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
