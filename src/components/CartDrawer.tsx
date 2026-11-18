import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, ShieldCheck, Tag, Plus, Minus } from 'lucide-react';
import { CartItem } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
}) => {
  const [couponCode, setCouponCode] = useState(() => {
    try {
      return sessionStorage.getItem('teqqno_applied_coupon') || '';
    } catch {
      return '';
    }
  });
  const [appliedCode, setAppliedCode] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('teqqno_applied_coupon') || null;
    } catch {
      return null;
    }
  });
  const [couponMessage, setCouponMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const couponDiscount =
    appliedCode === 'WELCOME10' || appliedCode === 'TEQQNO10'
      ? Math.round(subtotal * 0.1)
      : appliedCode === 'TEQQNOBULK'
        ? Math.min(subtotal, 500)
        : 0;
  const freeShippingThreshold = 1999;
  const shippingFee = subtotal >= freeShippingThreshold || subtotal === 0 ? 0 : 149;
  const gstAmount = Math.round(Math.max(0, subtotal - couponDiscount) * 0.18);
  const total = Math.max(0, subtotal - couponDiscount) + shippingFee + gstAmount;

  const applyCodeValue = (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (code === 'WELCOME10' || code === 'TEQQNO10' || code === 'WELCOME12') {
      const normalized = code === 'WELCOME12' ? 'WELCOME10' : code;
      const discount = Math.round(subtotal * 0.1);
      setAppliedCode(normalized);
      setCouponCode(normalized);
      try {
        sessionStorage.setItem('teqqno_applied_coupon', normalized);
      } catch {}
      setCouponMessage(`🎉 First Order 10% OFF applied! Saved ₹${discount.toLocaleString('en-IN')}`);
    } else if (code === 'TEQQNOBULK') {
      const discount = Math.min(subtotal, 500);
      setAppliedCode('TEQQNOBULK');
      setCouponCode('TEQQNOBULK');
      try {
        sessionStorage.setItem('teqqno_applied_coupon', 'TEQQNOBULK');
      } catch {}
      setCouponMessage(`Bulk voucher applied! Saved ₹${discount.toLocaleString('en-IN')}`);
    } else {
      setCouponMessage('Invalid code. Try "WELCOME10" or "TEQQNO10"');
    }
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    applyCodeValue(couponCode);
  };

  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
          
          {/* Header */}
          <div className="p-5 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FAF9FD]">
            <div className="flex items-center gap-2 group cursor-default">
              <ShoppingBag className="w-5 h-5 text-[#FF7A00] animate-icon-wiggle" />
              <h2 className="font-display font-bold text-lg text-[#0B0B0D]">
                Your Merchandise Cart ({items.length})
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors group cursor-pointer"
            >
              <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>

          {/* Free Shipping Progress Indicator */}
          <div className="bg-zinc-50 px-5 py-3 border-b border-[#E5E5EA] text-xs">
            {subtotal >= freeShippingThreshold ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                🎉 Congratulations! You have unlocked Free Pan-India Express Shipping!
              </span>
            ) : (
              <div>
                <span className="text-zinc-600">
                  Add <strong className="text-[#0B0B0D]">₹{(freeShippingThreshold - subtotal).toLocaleString('en-IN')}</strong> more for Free Shipping
                </span>
                <div className="w-full bg-zinc-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-[#FF7A00] h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div className="font-display font-bold text-base text-[#0B0B0D]">Your cart is empty</div>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                  Select a product or customize apparel in our live studio to place a custom batch order.
                </p>
                <button
                  onClick={onClose}
                  className="bg-[#FF7A00] text-white text-xs font-semibold py-2.5 px-4 rounded-xl"
                >
                  Explore Products
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-[#E5E5EA] p-3.5 space-y-2 relative"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-[10px] font-mono text-zinc-400 uppercase">
                        {item.product.category} · {item.printMethod}
                      </div>
                      <h4 className="font-display font-bold text-xs sm:text-sm text-[#0B0B0D]">
                        {item.product.name}
                      </h4>
                      <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-2">
                        <span>Color: <strong>{item.color.name}</strong></span>
                        {item.size && <span>· Size: <strong>{item.size}</strong></span>}
                      </div>
                      {item.sizeDistribution && Object.keys(item.sizeDistribution).length > 0 && (
                        <div className="text-[11px] text-zinc-600 font-mono mt-1 bg-zinc-50 px-2 py-1 rounded border border-zinc-200/60">
                          <span className="font-semibold text-zinc-700">Sizes: </span>
                          {Object.entries(item.sizeDistribution)
                            .filter(([_, q]) => q > 0)
                            .map(([sz, q]) => `${sz}: ${q}`)
                            .join(', ')}
                        </div>
                      )}
                      {item.voiceNoteUrl && (
                        <div className="mt-2 bg-emerald-50/80 border border-emerald-200 rounded-lg p-2 space-y-1.5">
                          <div className="text-[10px] text-emerald-700 font-mono font-semibold flex items-center gap-1">
                            <span>🎙️ Voice instructions attached</span>
                          </div>
                          <audio controls src={item.voiceNoteUrl} className="w-full h-8 rounded-md" />
                        </div>
                      )}
                      {(item.frontArtwork || item.backArtwork || item.artwork) && (
                        <div className="text-[10px] text-[#FF7A00] bg-[#FF7A00]/10 px-2 py-0.5 rounded-md inline-block mt-1 font-mono font-medium">
                          {item.frontArtwork && item.backArtwork ? (
                            <span>Front: {item.frontPlacement} · Back: {item.backPlacement}</span>
                          ) : item.frontArtwork ? (
                            <span>Front: {item.frontPlacement}</span>
                          ) : item.backArtwork ? (
                            <span>Back: {item.backPlacement}</span>
                          ) : (
                            <span>Custom Artwork: {item.printPlacement}</span>
                          )}
                          <span> ({item.printMethod})</span>
                        </div>
                      )}

                      {/* Visiting card front and back thumbnail badges */}
                      {item.visitingCardDesign && (
                        <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-zinc-100">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-7 rounded border border-zinc-300 bg-white shadow-2xs overflow-hidden flex items-center justify-center p-0.5">
                              {item.visitingCardDesign.frontDataUrl ? (
                                <img
                                  src={item.visitingCardDesign.frontDataUrl}
                                  alt="Front Card"
                                  width={48}
                                  height={28}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <span className="text-[8px] font-mono text-zinc-400">Blank</span>
                              )}
                            </div>
                            <span className="text-[9px] font-mono text-zinc-600 font-bold">Front</span>
                          </div>

                          <span className="text-zinc-300">·</span>

                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-7 rounded border border-zinc-300 bg-white shadow-2xs overflow-hidden flex items-center justify-center p-0.5">
                              {item.visitingCardDesign.backDataUrl ? (
                                <img
                                  src={item.visitingCardDesign.backDataUrl}
                                  alt="Back Card"
                                  width={48}
                                  height={28}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <span className="text-[8px] font-mono text-zinc-400">Blank</span>
                              )}
                            </div>
                            <span className="text-[9px] font-mono text-zinc-600 font-bold">Back</span>
                          </div>

                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono font-medium ml-auto">
                            300 GSM · 92×52mm
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-zinc-400 hover:text-red-600 transition-colors p-1"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quantity and Price */}
                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 border border-zinc-200 rounded-lg p-0.5 bg-zinc-50">
                      <button
                        onClick={() => onUpdateQuantity(item.id, (item.product.productType === 'visiting-card' || item.product.id === 'prod-visiting-card-300gsm') ? -100 : -1)}
                        className="w-6 h-6 flex items-center justify-center hover:bg-zinc-200 rounded text-zinc-700 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-bold px-1.5 text-zinc-900">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, (item.product.productType === 'visiting-card' || item.product.id === 'prod-visiting-card-300gsm') ? 100 : 1)}
                        className="w-6 h-6 flex items-center justify-center hover:bg-zinc-200 rounded text-zinc-700 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-zinc-500 font-mono">
                        ₹{item.unitPrice} / {(item.product.productType === 'visiting-card' || item.product.id === 'prod-visiting-card-300gsm') ? 'card' : 'pc'}
                      </div>
                      <div className="font-display font-bold text-sm text-[#0B0B0D]">
                        ₹{(item.totalPrice !== undefined ? item.totalPrice : item.unitPrice * item.quantity).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout Trigger */}
          {items.length > 0 && (
            <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] border-t border-[#E5E5EA] bg-[#FAF9FD] space-y-4">
              
              {/* Promo code input + New Customer WELCOME10 1-click pill */}
              <div className="space-y-2">
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Voucher (e.g. WELCOME10)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 border border-zinc-300 rounded-lg px-3 py-1.5 text-xs uppercase font-mono outline-none focus:border-[#FF7A00] bg-white"
                  />
                  <button
                    type="submit"
                    className="bg-[#0B0B0D] hover:bg-zinc-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </form>

                {!appliedCode && (
                  <button
                    type="button"
                    onClick={() => applyCodeValue('WELCOME10')}
                    className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[#17171C] text-white border border-[#FF7A00]/45 text-[11px] hover:border-[#FF7A00] transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      <Tag className="w-3 h-3 text-[#FF7A00]" />
                      <span>New Customer? Tap for <strong>10% OFF</strong></span>
                    </span>
                    <span className="font-mono font-bold text-[#FFD700]">WELCOME10 →</span>
                  </button>
                )}

                {couponMessage && (
                  <div className="text-[11px] text-emerald-700 font-medium">
                    {couponMessage}
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs text-zinc-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono text-zinc-800">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount:</span>
                    <span className="font-mono">-₹{couponDiscount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping (Express Air):</span>
                  <span className="font-mono text-zinc-800">
                    {shippingFee === 0 ? <strong className="text-emerald-600 font-semibold">FREE</strong> : `₹${shippingFee}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>GST (18% ITC Input Credit):</span>
                  <span className="font-mono text-zinc-800">+₹{gstAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="pt-2 border-t border-zinc-200 flex justify-between font-display font-bold text-base text-[#0B0B0D]">
                  <span>Total Amount:</span>
                  <span className="text-[#FF7A00]">₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Checkout Action */}
              <button
                onClick={onProceedToCheckout}
                className="w-full bg-[#FF7A00] hover:bg-[#e06c00] text-white font-display font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-[#FF7A00]/25 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 text-sm group cursor-pointer"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500 group cursor-default">
                <ShieldCheck className="w-3.5 h-3.5 text-[#FF7A00] animate-icon-pulse-glow" />
                <span>Includes free 1:1 digital proof approval before print</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
