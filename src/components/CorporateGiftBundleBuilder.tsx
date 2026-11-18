import React, { useState, useMemo } from 'react';
import { 
  Gift, 
  Package, 
  Check, 
  Plus, 
  Trash2, 
  Sparkles, 
  ShieldCheck, 
  ShoppingCart, 
  Upload, 
  FileText,
  X,
  Layers,
  ChevronRight
} from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import { PRODUCTS } from '../data/mockData';
import { Product, CartItem, ProductColor } from '../types';
import { formatWhatsAppQuoteUrl } from '../utils/whatsapp';
import { compressImageFile } from '../utils/imageCompressor';

interface GiftBoxOption {
  id: string;
  name: string;
  price: number;
  description: string;
  badge: string;
  color: string;
}

const BOX_OPTIONS: GiftBoxOption[] = [
  {
    id: 'box-matte-black',
    name: 'Executive Matte Black Rigid Box',
    price: 180,
    description: 'Stiff 1200 GSM hardboard with soft-touch matte lamination, magnetic flip lid, and custom die-cut EVA foam inlay.',
    badge: 'Most Popular',
    color: '#1A1A1E',
  },
  {
    id: 'box-eco-kraft',
    name: 'Eco-Friendly Kraft Natural Box',
    price: 120,
    description: '100% recycled biodegradable kraft board with full-color printed brand belly band / sleeve.',
    badge: 'Eco Choice',
    color: '#C4A482',
  },
  {
    id: 'box-luxury-gold',
    name: 'Luxury Velvet Rigid Box with Gold Foil',
    price: 250,
    description: 'Premium textured book-style box with gold foil logo stamping and satin ribbon pull tab.',
    badge: 'VIP Suite',
    color: '#2A1B3D',
  },
];

interface BundleItemSelection {
  product: Product;
  color: ProductColor;
  size?: string;
}

interface CorporateGiftBundleBuilderProps {
  onAddToCart?: (item: CartItem) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const CorporateGiftBundleBuilder: React.FC<CorporateGiftBundleBuilderProps> = ({
  onAddToCart,
  onClose,
  isModal = false,
}) => {
  // Step 1: Selected Box
  const [selectedBoxId, setSelectedBoxId] = useState<string>(BOX_OPTIONS[0].id);
  const selectedBox = BOX_OPTIONS.find(b => b.id === selectedBoxId) || BOX_OPTIONS[0];

  // Available candidate items for the kit
  const availableItems = useMemo(() => {
    return [
      PRODUCTS[0], // Cotton Polo
      PRODUCTS[2], // Mars Coolmax Polo
      PRODUCTS[5], // Promotional Ceramic Mug
      PRODUCTS[6], // Cotton Flexi Cap
      PRODUCTS[4], // 300 GSM Visiting Cards
    ];
  }, []);

  // Step 2: Selected items inside the kit (default: Polo + Mug + Cap)
  const [selectedItems, setSelectedItems] = useState<BundleItemSelection[]>([
    { product: availableItems[0], color: availableItems[0].colors[0], size: 'L' },
    { product: availableItems[2], color: availableItems[2].colors[0] }, // Ceramic Mug
    { product: availableItems[3], color: availableItems[3].colors[0] }, // Cotton Cap
  ]);

  // Step 3: Bundle Kit Quantity
  const [kitQuantity, setKitQuantity] = useState<number>(50);

  // Logo upload preview
  const [logoPreview, setLogoPreview] = useState<string>('/assets/aistudio/Glossy_TeqqnoWorld_Branding_Badge-photoaidcom-cropped_1055f8dc.png');
  const [companyName, setCompanyName] = useState<string>('Acme Global Inc');

  const [addedToast, setAddedToast] = useState(false);
  const [bundleNotice, setBundleNotice] = useState<string | null>(null);

  // Toggle item in bundle
  const toggleItem = (prod: Product) => {
    const exists = selectedItems.find(i => i.product.id === prod.id);
    if (exists) {
      if (selectedItems.length <= 2) {
        setBundleNotice('A corporate gift bundle must contain at least 2 merchandise items.');
        setTimeout(() => setBundleNotice(null), 3200);
        return;
      }
      setBundleNotice(null);
      setSelectedItems(selectedItems.filter(i => i.product.id !== prod.id));
    } else {
      if (selectedItems.length >= 4) {
        setBundleNotice('Maximum 4 merchandise items can fit inside one luxury gift box.');
        setTimeout(() => setBundleNotice(null), 3200);
        return;
      }
      setBundleNotice(null);
      setSelectedItems([
        ...selectedItems,
        {
          product: prod,
          color: prod.colors[0],
          size: prod.sizes ? prod.sizes[0] : undefined,
        },
      ]);
    }
  };

  // Financial calculations
  const bundleCalculation = useMemo(() => {
    // Individual sum of items at this volume
    const itemsSum = selectedItems.reduce((sum, item) => {
      // Find approximate tier price for this quantity
      const tier = item.product.tieredPricing.slice().reverse().find(t => kitQuantity >= t.minQty) 
        || item.product.tieredPricing[0];
      const rate = tier ? tier.price : item.product.basePrice;
      return sum + rate;
    }, 0);

    const individualItemsTotal = itemsSum + selectedBox.price;
    // 10% Bundle discount on entire kit
    const bundleDiscountPercent = 10;
    const discountedKitPrice = Math.round(individualItemsTotal * (1 - bundleDiscountPercent / 100));
    const subtotal = discountedKitPrice * kitQuantity;
    const gstRate = 0.18;
    const gstAmount = Math.round(subtotal * gstRate);
    const total = subtotal + gstAmount;

    return {
      individualItemsTotal,
      discountedKitPrice,
      savingsPerKit: individualItemsTotal - discountedKitPrice,
      subtotal,
      gstAmount,
      total,
    };
  }, [selectedItems, selectedBox, kitQuantity]);

  // Add to cart handler
  const handleAddBundleToCart = () => {
    if (!onAddToCart) return;

    // Create a composite kit item
    const kitProduct: Product = {
      id: `bundle-kit-${Date.now()}`,
      slug: 'corporate-gift-bundle-kit',
      name: `Custom Corporate Gift Kit (${selectedItems.length} Items + ${selectedBox.name})`,
      category: 'corporate-gifting',
      basePrice: bundleCalculation.discountedKitPrice,
      mrp: bundleCalculation.individualItemsTotal,
      tieredPricing: [
        { minQty: 25, price: bundleCalculation.discountedKitPrice },
      ],
      rating: 5.0,
      reviewCount: 48,
      moq: 25,
      dispatchTime: '4–6 Days',
      badge: 'Corporate Bundle',
      description: `Customized Executive Gift Set featuring: ${selectedItems.map(i => i.product.name).join(' + ')} packaged in ${selectedBox.name} with custom foam inlay and logo branding.`,
      shortDesc: `Curated ${selectedItems.length}-item executive gift set.`,
      printMethods: ['Precision Embroidery', 'Laser Engraving', 'High-Precision UV'],
      colors: [{ name: 'Custom Corporate Kit', hex: '#1A1A1E', garmentHex: '#1A1A1E' }],
      features: [
        `${selectedBox.name} with custom EVA foam insert`,
        ...selectedItems.map(i => `${i.product.name} with corporate logo`),
        '100% Pre-Press Proof Verification',
        'Bulk Courier Dispatched with Insurance'
      ],
      specs: {
        'Box Specification': selectedBox.name,
        'Items Count': `${selectedItems.length} Curated Items`,
        'Packaging Type': 'Individual Gift Box Packing',
        'Branding': 'Full Custom Artwork Placement',
      },
      productType: 'kit',
    };

    const cartItem: CartItem = {
      id: `cart-bundle-${Date.now()}`,
      product: kitProduct,
      color: kitProduct.colors[0],
      quantity: kitQuantity,
      unitPrice: bundleCalculation.discountedKitPrice,
      totalPrice: bundleCalculation.subtotal,
      printMethod: 'High-Precision UV',
      printPlacement: 'Center Chest / Laser Custom Inlay',
      customNotes: `Corporate Kit for ${companyName}: ${selectedItems.map(i => `${i.product.name} (${i.color.name}${i.size ? ', Size ' + i.size : ''})`).join(', ')}. Box: ${selectedBox.name}.`,
    };

    onAddToCart(cartItem);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 3000);
  };

  // WhatsApp Quote
  const whatsAppUrl = useMemo(() => {
    return formatWhatsAppQuoteUrl({
      productName: `Custom Corporate Gift Bundle (${selectedItems.length} Items + ${selectedBox.name})`,
      quantity: kitQuantity,
      unitPrice: bundleCalculation.discountedKitPrice,
      totalPrice: bundleCalculation.total,
      companyName,
      notes: `Includes: ${selectedItems.map(i => i.product.name).join(' + ')}. Box: ${selectedBox.name}. 10% Bundle Discount Applied.`,
    });
  }, [selectedItems, selectedBox, kitQuantity, bundleCalculation, companyName]);

  return (
    <div className={`bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-[0_28px_70px_-15px_rgba(7,27,53,0.38)] overflow-hidden w-full animate-admin-scale-in ${isModal ? 'max-w-5xl mx-auto my-auto max-h-[92vh] sm:max-h-[88vh] flex flex-col' : 'max-w-7xl mx-auto my-4 sm:my-8'}`}>
      
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#071B35] via-[#0C264A] to-[#071B35] text-white p-5 sm:p-6 lg:p-7 shrink-0 border-b border-white/10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-14 w-80 h-80 rounded-full opacity-35 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(255,121,0,0.55) 0%, transparent 70%)',
          }}
        />
        {isModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Gift Bundle Builder"
            className="relative z-20 float-right text-slate-300 hover:text-white p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all cursor-pointer group"
            title="Close"
          >
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
          </button>
        )}

        <div className="relative z-10 flex flex-wrap items-center gap-2 mb-2.5 pr-10 sm:pr-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF7900]/15 border border-[#FF7900]/45 text-[#FF9E44] text-[11px] font-mono font-bold tracking-wider uppercase">
            <Gift className="w-3.5 h-3.5 text-[#FF7900]" />
            <span>Interactive Corporate Kit Studio</span>
          </span>
          <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-400/25">
            ★ Extra 10% Bundle Discount
          </span>
        </div>

        <h2 className="relative z-10 font-display text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white">
          Corporate Gift Bundle &amp; Welcome Kit Builder
        </h2>
        <p className="relative z-10 text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
          Curate custom employee onboarding kits, client appreciation gifts, and conference swag boxes. Packaged in custom-molded luxury rigid boxes.
        </p>

        {bundleNotice && (
          <div className="relative z-10 mt-3 px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs font-medium">
            {bundleNotice}
          </div>
        )}
      </div>

      {/* Main Builder Grid */}
      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8 p-4 sm:p-6 lg:p-8 ${isModal ? 'overflow-y-auto flex-1 overscroll-contain' : ''}`}>
        
        {/* Left 7 Columns: Selection Controls */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* STEP 1: Choose Packaging Box */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0B0B0D] text-white flex items-center justify-center text-[10px] font-bold">1</span>
                <span>Select Luxury Gift Box Packaging</span>
              </label>
              <span className="text-xs text-zinc-500">Includes Custom Die-Cut Foam</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {BOX_OPTIONS.map((box) => {
                const isSelected = box.id === selectedBoxId;
                return (
                  <button
                    key={box.id}
                    onClick={() => setSelectedBoxId(box.id)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#FF7A00] bg-orange-50/40 ring-2 ring-[#FF7A00]/20'
                        : 'border-zinc-200 hover:border-zinc-300 bg-white'
                    }`}
                  >
                    <div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full inline-block mb-2 ${
                        isSelected ? 'bg-[#FF7A00] text-white' : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {box.badge}
                      </span>
                      <h4 className="font-bold text-xs text-zinc-900">{box.name}</h4>
                      <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">{box.description}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-zinc-200/60 font-mono font-bold text-xs text-[#FF7A00]">
                      +₹{box.price}/kit
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: Choose 2-4 Merchandise Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0B0B0D] text-white flex items-center justify-center text-[10px] font-bold">2</span>
                <span>Select Merchandise Items (Choose 2 to 4)</span>
              </label>
              <span className="text-xs font-mono font-bold text-[#FF7A00]">
                {selectedItems.length}/4 Selected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableItems.map((prod) => {
                const isIncluded = selectedItems.some(i => i.product.id === prod.id);
                return (
                  <div
                    key={prod.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isIncluded 
                        ? 'border-[#FF7A00] bg-orange-50/20 shadow-2xs' 
                        : 'border-zinc-200 bg-white hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center font-bold text-zinc-700 text-xs shrink-0">
                        {prod.productType.slice(0, 3).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-zinc-900 truncate">{prod.name}</div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          From ₹{prod.tieredPricing[prod.tieredPricing.length - 1]?.price || prod.basePrice}/pc
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleItem(prod)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                        isIncluded
                          ? 'bg-[#0B0B0D] text-white hover:bg-zinc-800'
                          : 'bg-zinc-100 text-zinc-700 hover:bg-[#FF7A00] hover:text-white'
                      }`}
                    >
                      {isIncluded ? 'Remove' : '+ Add to Kit'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 3: Company & Branding Info */}
          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/90 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#0B0B0D] text-white flex items-center justify-center text-[10px] font-bold">3</span>
              <span>Branding Details (Applied to All Kit Items)</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Company / Client Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="p-2.5 text-xs border border-zinc-300 rounded-xl bg-white outline-none focus:border-[#FF7A00]"
              />
              <div className="flex items-center gap-2 bg-white p-1.5 border border-zinc-300 rounded-xl text-xs">
                <img
                  src={logoPreview}
                  alt="Logo"
                  width={32}
                  height={32}
                  loading="lazy"
                  decoding="async"
                  className="w-8 h-8 rounded-lg object-cover border border-zinc-200"
                />
                <span className="text-[11px] text-zinc-600 truncate flex-1">Vector Logo Ready</span>
                <label className="cursor-pointer text-xs font-semibold text-[#FF7A00] hover:underline px-2">
                  <span>Replace</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const { dataUrl } = await compressImageFile(file, {
                            maxWidth: 1200,
                            maxHeight: 1200,
                            quality: 0.8,
                            format: 'image/webp',
                          });
                          setLogoPreview(dataUrl);
                        } catch {
                          const reader = new FileReader();
                          reader.onload = () => setLogoPreview(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* STEP 4: Kit Quantity */}
          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0B0B0D] text-white flex items-center justify-center text-[10px] font-bold">4</span>
                <span>Kit Quantity: <strong className="font-mono text-zinc-900">{kitQuantity} Kits</strong></span>
              </label>
              <span className="text-[11px] font-mono text-emerald-700 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full">
                10% Bundle Discount Active
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {[25, 50, 100, 250, 500].map((qty) => (
                <button
                  key={qty}
                  onClick={() => setKitQuantity(qty)}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    kitQuantity === qty
                      ? 'bg-[#FF7A00] text-white shadow-xs'
                      : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  {qty} Kits
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right 5 Columns: Visual Box Mockup & Financials */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Kit Live Preview Box */}
          <div className="bg-gradient-to-b from-[#F8FAFC] to-white rounded-2xl border border-slate-200/90 p-6 space-y-5 shadow-md">
            
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">Kit Architecture</span>
                <h3 className="font-display font-bold text-base text-[#071B35]">
                  Curated Executive Set
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Turnaround: 4–6 Days
              </span>
            </div>

            {/* Box Schematic Representation */}
            <div className="p-4 rounded-2xl border-2 border-dashed border-zinc-300 bg-white flex flex-col items-center justify-center text-center space-y-3">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-md relative"
                style={{ backgroundColor: selectedBox.color }}
              >
                <Package className="w-8 h-8" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#FF7A00] text-white text-[10px] font-bold flex items-center justify-center">
                  {selectedItems.length}
                </div>
              </div>

              <div>
                <div className="font-bold text-xs text-zinc-900">{selectedBox.name}</div>
                <div className="text-[11px] text-zinc-500">Branded with {companyName}</div>
              </div>

              {/* Items Inside Box */}
              <div className="w-full space-y-1.5 pt-2 border-t border-zinc-100 text-left">
                {selectedItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-zinc-50">
                    <span className="text-zinc-800 font-medium truncate">• {item.product.name}</span>
                    <span className="text-[10px] font-mono text-zinc-500">{item.color.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Calculations */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Standard Individual Value:</span>
                <span className="font-mono line-through text-zinc-400">
                  ₹{bundleCalculation.individualItemsTotal.toLocaleString('en-IN')} / kit
                </span>
              </div>

              <div className="flex justify-between text-zinc-900 font-bold">
                <span>Bundle Discounted Rate (10% Off):</span>
                <span className="font-mono text-[#FF7A00]">
                  ₹{bundleCalculation.discountedKitPrice.toLocaleString('en-IN')} / kit
                </span>
              </div>

              <div className="flex justify-between text-zinc-600">
                <span>Taxable Value ({kitQuantity} kits):</span>
                <span className="font-mono text-zinc-900">
                  ₹{bundleCalculation.subtotal.toLocaleString('en-IN')}.00
                </span>
              </div>

              <div className="flex justify-between text-zinc-600 text-[11px]">
                <span>GST (18% ITC Deductible):</span>
                <span className="font-mono">
                  ₹{bundleCalculation.gstAmount.toLocaleString('en-IN')}.00
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-800 text-[11px] font-semibold">
                <span>Total Corporate Savings:</span>
                <span className="font-mono font-bold">
                  Save ₹{(bundleCalculation.savingsPerKit * kitQuantity).toLocaleString('en-IN')}!
                </span>
              </div>

              <div className="pt-3 border-t-2 border-zinc-200 flex justify-between items-baseline">
                <div>
                  <div className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Grand Total (Incl. GST)</div>
                  <div className="text-[10px] text-zinc-400">Complete Ready-to-Gift Packaging</div>
                </div>
                <div className="text-right">
                  <span className="font-display text-2xl font-bold font-mono text-[#0B0B0D]">
                    ₹{bundleCalculation.total.toLocaleString('en-IN')}.00
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              {onAddToCart && (
                <button
                  onClick={handleAddBundleToCart}
                  className="w-full bg-[#FF7A00] hover:bg-[#ff881a] text-white text-xs font-semibold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{addedToast ? 'Corporate Kit Added to Cart!' : `Add ${kitQuantity} Custom Kits to Cart`}</span>
                </button>
              )}

              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#1EBE5D] hover:bg-[#19a851] text-white text-xs font-semibold py-3 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <WhatsAppIcon className="w-4 h-4 text-white" />
                <span>Request Custom Swatch Kit on WhatsApp</span>
              </a>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
