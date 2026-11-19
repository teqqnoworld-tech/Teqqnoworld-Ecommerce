import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Pencil,
  ShoppingCart,
  Trash2,
  Truck,
  Unlock,
} from 'lucide-react';
import { Product, StudioLayer } from '../../types';
import { formatCurrencyINR } from '../../data/pricingRules';
import { CANOPY_VARIANT_OPTIONS, ProductStudioMeta } from '../productStudioConfigs';

interface ProductRightOrderPanelProps {
  product: Product;
  meta: ProductStudioMeta;
  activeSide: 'front' | 'back';
  onChangeActiveSide: (side: 'front' | 'back') => void;
  frontLayers: StudioLayer[];
  backLayers: StudioLayer[];
  noBackPrint: boolean;
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onRenameLayer: (id: string, name: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onMoveLayerOrder: (id: string, dir: 'up' | 'down') => void;
  onDeleteLayer: (id: string) => void;

  // Quantity & Pricing
  quantity: number;
  onChangeQuantity: (qty: number) => void;
  unitPrice: number;
  totalPrice: number;
  nextTierUpsell: {
    minQty: number;
    price: number;
    diff: number;
    savingsPerPiece: number;
  } | null;

  // Optional Sizes (Apparel Polos)
  sizeDistribution: Record<string, number>;
  onChangeSizeDistribution: (next: Record<string, number>) => void;
  onAutoFillSizes: () => void;

  // Optional Canopy Variants
  selectedVariantLabel?: string;
  onSelectVariantLabel?: (label: string) => void;

  // Approval & Actions
  artworkApproved: boolean;
  onToggleArtworkApproved: (checked: boolean) => void;
  onDirectAddToCart: () => void;
  onApplyAndReturn: () => void;
  isAddingToCart: boolean;
}

export const ProductRightOrderPanel: React.FC<ProductRightOrderPanelProps> = ({
  product,
  meta,
  activeSide,
  onChangeActiveSide,
  frontLayers,
  backLayers,
  noBackPrint,
  selectedLayerId,
  onSelectLayer,
  onRenameLayer,
  onToggleVisibility,
  onToggleLock,
  onDuplicateLayer,
  onMoveLayerOrder,
  onDeleteLayer,
  quantity,
  onChangeQuantity,
  unitPrice,
  totalPrice,
  nextTierUpsell,
  sizeDistribution,
  onChangeSizeDistribution,
  onAutoFillSizes,
  selectedVariantLabel,
  onSelectVariantLabel,
  artworkApproved,
  onToggleArtworkApproved,
  onDirectAddToCart,
  onApplyAndReturn,
  isAddingToCart,
}) => {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [showSizesPanel, setShowSizesPanel] = useState(false);

  const visibleStackLayers = activeSide === 'front' ? frontLayers : backLayers;
  const currentAssignedTotal = Object.values(sizeDistribution).reduce((s, n) => s + (n || 0), 0);

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* LAYERS STACK */}
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#071B35] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-[#FF7900]" />
              Layers Stack
            </span>
            {meta.hasBackSide ? (
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => onChangeActiveSide('front')}
                  className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                    activeSide === 'front' ? 'bg-white text-[#071B35] shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Front ({frontLayers.length})
                </button>
                <button
                  type="button"
                  onClick={() => onChangeActiveSide('back')}
                  className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                    activeSide === 'back' ? 'bg-white text-[#071B35] shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Back ({noBackPrint ? 0 : backLayers.length})
                </button>
              </div>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                Front ({frontLayers.length})
              </span>
            )}
          </div>

          {visibleStackLayers.length === 0 ? (
            <div className="p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-[11px] text-slate-500 text-center">
              {activeSide === 'back' && noBackPrint
                ? 'Back print disabled (Front Only mode).'
                : `No layers on ${activeSide}. Upload a logo or add text from the toolkit.`}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
              {[...visibleStackLayers].reverse().map((layer, revIdx) => {
                const isSelected = selectedLayerId === layer.id;
                const displayName =
                  layer.name ||
                  (layer.isMainLogo
                    ? 'Primary Logo'
                    : layer.kind === 'text' || layer.kind === 'curved-text'
                    ? layer.text || 'Text Layer'
                    : layer.kind === 'shape'
                    ? `Shape (${layer.shapeType || 'badge'})`
                    : 'Graphic Layer');
                return (
                  <div
                    key={layer.id}
                    onClick={() => onSelectLayer(layer.id)}
                    className={`p-2 rounded-xl border text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#FF7900] bg-orange-50/60'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="min-w-0 flex-1 flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-400">
                          #{visibleStackLayers.length - revIdx}
                        </span>
                        {renamingId === layer.id ? (
                          <input
                            autoFocus
                            type="text"
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onBlur={() => {
                              if (renameDraft.trim()) onRenameLayer(layer.id, renameDraft.trim());
                              setRenamingId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (renameDraft.trim()) onRenameLayer(layer.id, renameDraft.trim());
                                setRenamingId(null);
                              }
                            }}
                            className="w-full px-1.5 py-0.5 rounded border border-orange-300 text-xs font-bold bg-white"
                          />
                        ) : (
                          <span className="font-bold text-[#071B35] truncate">{displayName}</span>
                        )}
                      </div>
                      <div
                        className="flex items-center gap-0.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          title="Rename"
                          onClick={() => {
                            setRenamingId(layer.id);
                            setRenameDraft(displayName);
                          }}
                          className="p-1 text-slate-400 hover:text-[#071B35] cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          title={layer.visible === false ? 'Show' : 'Hide'}
                          onClick={() => onToggleVisibility(layer.id)}
                          className="p-1 text-slate-400 hover:text-[#071B35] cursor-pointer"
                        >
                          {layer.visible === false ? (
                            <EyeOff className="w-3 h-3" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          type="button"
                          title={layer.locked ? 'Unlock' : 'Lock'}
                          onClick={() => onToggleLock(layer.id)}
                          className="p-1 text-slate-400 hover:text-[#071B35] cursor-pointer"
                        >
                          {layer.locked ? (
                            <Lock className="w-3 h-3 text-[#FF7900]" />
                          ) : (
                            <Unlock className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          type="button"
                          title="Move Up"
                          onClick={() => onMoveLayerOrder(layer.id, 'up')}
                          className="p-1 text-slate-400 hover:text-[#071B35] cursor-pointer"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          title="Move Down"
                          onClick={() => onMoveLayerOrder(layer.id, 'down')}
                          className="p-1 text-slate-400 hover:text-[#071B35] cursor-pointer"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          title="Duplicate"
                          onClick={() => onDuplicateLayer(layer.id)}
                          className="p-1 text-slate-400 hover:text-[#071B35] cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => onDeleteLayer(layer.id)}
                          className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* CANOPY SIZE VARIANT QUICK SWITCHER */}
        {meta.hasCanopyVariants && onSelectVariantLabel && (
          <section className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#071B35]">
              Canopy Size Variant
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {CANOPY_VARIANT_OPTIONS.map((vp) => {
                const active = (selectedVariantLabel || '4 × 4 ft') === vp.label;
                return (
                  <button
                    key={vp.label}
                    type="button"
                    onClick={() => onSelectVariantLabel(vp.label)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-extrabold cursor-pointer transition-all ${
                      active
                        ? 'bg-[#071B35] text-white border-[#071B35]'
                        : 'bg-white text-[#071B35] border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {vp.label}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* SMART QUANTITY & PRICING */}
        <section className="space-y-2.5 pt-2 border-t border-slate-100">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#071B35]">
            Smart Quantity & Pricing
          </div>

          <div className="grid grid-cols-6 gap-1">
            {meta.quickQuantities.map((q) => {
              const active = quantity === q;
              return (
                <button
                  key={q}
                  type="button"
                  onClick={() => onChangeQuantity(q)}
                  className={`py-1.5 rounded-lg text-[11px] font-extrabold border transition-all cursor-pointer ${
                    active
                      ? 'bg-[#071B35] text-white border-[#071B35] shadow-xs'
                      : 'bg-white text-[#071B35] border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {q}
                </button>
              );
            })}
          </div>

          <div className="p-3 rounded-2xl border border-slate-200 bg-white space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => onChangeQuantity(Math.max(meta.moq, quantity - 1))}
                  className="w-8 h-8 flex items-center justify-center font-bold text-[#071B35] hover:bg-slate-100 cursor-pointer"
                >
                  −
                </button>
                <input
                  type="number"
                  min={meta.moq}
                  value={quantity}
                  onChange={(e) => onChangeQuantity(Math.max(meta.moq, Number(e.target.value) || meta.moq))}
                  className="w-12 text-center text-xs font-extrabold text-[#071B35] bg-transparent outline-none"
                />
                <button
                  type="button"
                  onClick={() => onChangeQuantity(quantity + 1)}
                  className="w-8 h-8 flex items-center justify-center font-bold text-[#071B35] hover:bg-slate-100 cursor-pointer"
                >
                  +
                </button>
              </div>

              <div className="text-right">
                <div className="text-lg font-extrabold text-[#071B35] font-mono tabular-nums leading-tight">
                  {formatCurrencyINR(totalPrice)}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {formatCurrencyINR(unitPrice)} / {meta.unitLabel} · Incl. 18% GST
                </div>
              </div>
            </div>

            {nextTierUpsell && (
              <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[11px] font-bold text-emerald-900">
                  Add {nextTierUpsell.diff} more → ₹{nextTierUpsell.price}/{meta.unitLabel}
                </span>
                <button
                  type="button"
                  onClick={() => onChangeQuantity(nextTierUpsell.minQty)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold cursor-pointer shrink-0"
                >
                  Make {nextTierUpsell.minQty}
                </button>
              </div>
            )}

            {/* Size Mix Breakdown for Apparel Polos */}
            {meta.showSizes && product.sizes && (
              <div className="pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[#071B35]">{meta.sizeLabel}</span>
                  <button
                    type="button"
                    onClick={() => setShowSizesPanel((s) => !s)}
                    className="text-[#FF7900] font-bold hover:underline cursor-pointer"
                  >
                    {showSizesPanel ? 'Hide Sizes' : 'Customize Sizes'}
                  </button>
                </div>

                {showSizesPanel && (
                  <div className="mt-2 space-y-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between text-[10px] text-slate-600">
                      <span>Assigned: {currentAssignedTotal} / {quantity} pcs</span>
                      <button
                        type="button"
                        onClick={onAutoFillSizes}
                        className="text-[#FF7900] font-bold hover:underline cursor-pointer"
                      >
                        Auto-fill
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {product.sizes.map((sz) => {
                        const shortSz = sz.split(' ')[0];
                        return (
                          <div key={sz} className="bg-white border border-slate-200 rounded-lg p-1 text-center">
                            <div className="text-[10px] font-bold text-slate-700">{shortSz}</div>
                            <input
                              type="number"
                              min={0}
                              value={sizeDistribution[sz] || 0}
                              onChange={(e) =>
                                onChangeSizeDistribution({
                                  ...sizeDistribution,
                                  [sz]: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                              className="w-full text-center text-xs font-extrabold text-[#071B35] outline-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-600 px-0.5">
            <span className="flex items-center gap-1.5 font-semibold">
              <Truck className="w-3.5 h-3.5 text-[#FF7900]" />
              Dispatch: 24–48 hrs
            </span>
            <span className="font-bold text-[#071B35]">Delhivery Express</span>
          </div>
        </section>

        {/* ARTWORK APPROVAL */}
        <label className="flex items-start gap-2.5 p-3 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 cursor-pointer transition-colors">
          <input
            type="checkbox"
            checked={artworkApproved}
            onChange={(e) => onToggleArtworkApproved(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#FF7900] rounded cursor-pointer shrink-0"
          />
          <div className="space-y-0.5">
            <div className="text-xs font-extrabold text-[#071B35] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Approve Artwork Preview</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              I verify logo placement, colour, and spelling are final for print/embroidery production.
            </p>
          </div>
        </label>
      </div>

      {/* Bottom Sticky Order CTA */}
      <div className="p-3.5 border-t border-slate-200 bg-white space-y-2 shrink-0">
        <button
          type="button"
          onClick={onDirectAddToCart}
          disabled={isAddingToCart}
          className="w-full py-3 px-4 rounded-xl bg-[#FF7900] hover:bg-[#e56d00] disabled:opacity-70 text-white text-xs font-extrabold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
        >
          {isAddingToCart ? (
            <>
              <Check className="w-4 h-4" />
              <span>Added to Cart!</span>
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4" />
              <span>Add to Cart · {formatCurrencyINR(totalPrice)}</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onApplyAndReturn}
          className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-[#071B35] text-xs font-bold cursor-pointer transition-colors"
        >
          Apply Design & Return to Product Page
        </button>
      </div>
    </div>
  );
};
