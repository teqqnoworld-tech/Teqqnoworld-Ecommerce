import React, { useState } from 'react';
import {
  Bookmark,
  Check,
  Clock,
  Copy,
  Edit2,
  FolderOpen,
  GitCompare,
  Layers,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { PrintMethod, ProductColor, StudioLayer } from '../../types';
import { calculateProductPrice, formatCurrencyINR } from '../../data/pricingRules';
import { ProductMockupCanvas } from '../ProductMockupCanvas';
import {
  convertLayersToCustomArtwork,
  PlainPoloHistoryVersion,
  SavedPlainPoloDesign,
} from './plainPoloStudioTypes';

interface SaveDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultName: string;
  colorName: string;
  quantity: number;
  printMethod: PrintMethod;
  onSave: (name: string) => void;
}

export const SaveDesignModal: React.FC<SaveDesignModalProps> = ({
  isOpen,
  onClose,
  defaultName,
  colorName,
  quantity,
  printMethod,
  onSave,
}) => {
  const [name, setName] = useState(defaultName);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[95] bg-[#071B35]/75 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-[#071B35] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Bookmark className="w-4 h-4 text-[#FF7900]" />
            <h3 className="text-sm font-bold">Save Plain Polo Design</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = name.trim() || defaultName;
            onSave(trimmed);
            onClose();
          }}
          className="p-5 space-y-4"
        >
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Design Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sales Team Uniform — Navy"
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:border-[#FF7900] focus:ring-2 focus:ring-[#FF7900]/15"
            />
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span>{colorName} · {printMethod}</span>
            <span className="font-mono font-semibold text-slate-900 tabular-nums">{quantity} pcs</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#FF7900] hover:bg-[#e56d00] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save to Workspace</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface SavedDesignsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  designs: SavedPlainPoloDesign[];
  onLoadDesign: (design: SavedPlainPoloDesign) => void;
  onDuplicateDesign: (design: SavedPlainPoloDesign) => void;
  onRenameDesign: (id: string, nextName: string) => void;
  onDeleteDesign: (id: string) => void;
}

export const SavedDesignsDrawer: React.FC<SavedDesignsDrawerProps> = ({
  isOpen,
  onClose,
  designs,
  onLoadDesign,
  onDuplicateDesign,
  onRenameDesign,
  onDeleteDesign,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[95] bg-[#071B35]/70 backdrop-blur-xs flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-[#071B35] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <FolderOpen className="w-4 h-4 text-[#FF7900]" />
            <div>
              <h3 className="text-sm font-bold leading-tight">My Saved Designs</h3>
              <p className="text-[11px] text-slate-300">Saved locally on this browser ({designs.length})</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {designs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-2">
              <Bookmark className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">No saved polo designs yet</p>
              <p className="text-xs text-slate-500">
                Click <strong>Save Design</strong> in the studio header to store colourways, logos, and placements for instant recall.
              </p>
            </div>
          ) : (
            designs.map((d) => (
              <div
                key={d.id}
                className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                    {d.thumbnailDataUrl ? (
                      <img src={d.thumbnailDataUrl} alt={d.name} className="w-full h-full object-contain" />
                    ) : (
                      <span
                        className="w-8 h-8 rounded-full border border-black/15"
                        style={{ backgroundColor: d.colorHex }}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {editingId === d.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              onRenameDesign(d.id, draftName.trim() || d.name);
                              setEditingId(null);
                            }
                          }}
                          className="flex-1 px-2 py-1 text-xs border border-[#FF7900] rounded-md focus:outline-hidden"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            onRenameDesign(d.id, draftName.trim() || d.name);
                            setEditingId(null);
                          }}
                          className="p-1 rounded bg-[#FF7900] text-white cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{d.name}</h4>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(d.id);
                            setDraftName(d.name);
                          }}
                          className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                          title="Rename"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {d.colorName} · {d.printMethod} · {d.quantity} pcs
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {new Date(d.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onDuplicateDesign(d)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Duplicate</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteDesign(d.id)}
                      className="p-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Delete saved design"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onLoadDesign(d);
                      onClose();
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[#071B35] hover:bg-[#0B264A] text-white text-[11px] font-bold cursor-pointer"
                  >
                    Load in Studio
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

interface CompareDesignsModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableColors: ProductColor[];
  currentColor: ProductColor;
  currentQuantity: number;
  currentPrintMethod: PrintMethod;
  currentFrontPlacement: string;
  currentBackPlacement: string;
  currentNoBackPrint: boolean;
  currentFrontLayers: StudioLayer[];
  currentBackLayers: StudioLayer[];
  savedDesigns: SavedPlainPoloDesign[];
  onLoadSavedDesign: (design: SavedPlainPoloDesign) => void;
  onSwitchColor: (color: ProductColor) => void;
}

export const CompareDesignsModal: React.FC<CompareDesignsModalProps> = ({
  isOpen,
  onClose,
  availableColors,
  currentColor,
  currentQuantity,
  currentPrintMethod,
  currentFrontPlacement,
  currentBackPlacement,
  currentNoBackPrint,
  currentFrontLayers,
  currentBackLayers,
  savedDesigns,
  onLoadSavedDesign,
  onSwitchColor,
}) => {
  const [compareView, setCompareView] = useState<'front' | 'back'>('front');
  const [selectedCompareId, setSelectedCompareId] = useState<string>(
    savedDesigns[0]?.id ? `saved:${savedDesigns[0].id}` : `color:${availableColors[1]?.name || currentColor.name}`
  );

  if (!isOpen) return null;

  const isSavedTarget = selectedCompareId.startsWith('saved:');
  const matchedSaved = isSavedTarget
    ? savedDesigns.find((d) => `saved:${d.id}` === selectedCompareId)
    : undefined;
  const matchedColor = matchedSaved
    ? availableColors.find((c) => c.name === matchedSaved.colorName) || currentColor
    : availableColors.find((c) => `color:${c.name}` === selectedCompareId) ||
      availableColors.find((c) => c.name !== currentColor.name) ||
      currentColor;

  const leftFrontArt = convertLayersToCustomArtwork(
    currentFrontLayers,
    null,
    null,
    'front',
    currentFrontPlacement,
    currentColor.name
  );
  const leftBackArt = currentNoBackPrint
    ? null
    : convertLayersToCustomArtwork(
        currentBackLayers,
        null,
        null,
        'back',
        currentBackPlacement,
        currentColor.name
      );

  const rightFrontArt = matchedSaved
    ? convertLayersToCustomArtwork(
        matchedSaved.frontLayers,
        null,
        null,
        'front',
        matchedSaved.frontPlacement,
        matchedColor.name
      )
    : convertLayersToCustomArtwork(
        currentFrontLayers,
        null,
        null,
        'front',
        currentFrontPlacement,
        matchedColor.name
      );

  const rightBackArt = matchedSaved
    ? matchedSaved.noBackPrint
      ? null
      : convertLayersToCustomArtwork(
          matchedSaved.backLayers,
          null,
          null,
          'back',
          matchedSaved.backPlacement,
          matchedColor.name
        )
    : leftBackArt;

  const leftPrice = calculateProductPrice('prod-plain-polo', currentQuantity);
  const rightQty = matchedSaved ? matchedSaved.quantity : currentQuantity;
  const rightPrice = calculateProductPrice('prod-plain-polo', rightQty);

  return (
    <div
      className="fixed inset-0 z-[95] bg-[#071B35]/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 bg-[#071B35] text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <GitCompare className="w-4 h-4 text-[#FF7900]" />
            <div>
              <h3 className="text-sm font-bold">Compare Polo Designs Side-by-Side</h3>
              <p className="text-[11px] text-slate-300">Evaluate colourway contrast, logo clarity, and unit cost</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex bg-white/10 p-0.5 rounded-lg">
              {(['front', 'back'] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => setCompareView(side)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold capitalize cursor-pointer ${
                    compareView === side ? 'bg-[#FF7900] text-white' : 'text-slate-200 hover:text-white'
                  }`}
                >
                  {side} View
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 bg-slate-50">
          {/* Left: Current Working Design */}
          <div className="bg-white rounded-2xl border-2 border-[#071B35] p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#071B35] uppercase tracking-wide">
                Active Studio Design
              </span>
              <span className="text-xs font-mono font-semibold text-slate-700 tabular-nums">
                {formatCurrencyINR(leftPrice.unitPrice)}/pc · {currentQuantity} pcs
              </span>
            </div>

            <div className="bg-[#F4F6F9] rounded-xl p-3 flex items-center justify-center min-h-[260px]">
              <ProductMockupCanvas
                productType="polo"
                color={currentColor}
                artwork={compareView === 'front' ? leftFrontArt : leftBackArt}
                printMethod={currentPrintMethod}
                printPlacement={compareView === 'front' ? currentFrontPlacement : currentBackPlacement}
                view={compareView}
                className="w-full h-64"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-500">Colour</div>
                <div className="font-semibold text-slate-900">{currentColor.name}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-500">Method</div>
                <div className="font-semibold text-slate-900">{currentPrintMethod}</div>
              </div>
            </div>
          </div>

          {/* Right: Saved Design or Alternate Colourway */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <select
                value={selectedCompareId}
                onChange={(e) => setSelectedCompareId(e.target.value)}
                className="text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-[#FF7900] max-w-full sm:max-w-[230px] flex-1 min-w-[160px]"
              >
                {savedDesigns.length > 0 && (
                  <optgroup label="Saved Designs">
                    {savedDesigns.map((d) => (
                      <option key={d.id} value={`saved:${d.id}`}>
                        Saved: {d.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Compare Colourway">
                  {availableColors.map((c) => (
                    <option key={c.name} value={`color:${c.name}`}>
                      Colour: {c.name}
                    </option>
                  ))}
                </optgroup>
              </select>
              <span className="text-xs font-mono font-semibold text-slate-700 tabular-nums shrink-0">
                {formatCurrencyINR(rightPrice.unitPrice)}/pc · {rightQty} pcs
              </span>
            </div>

            <div className="bg-[#F4F6F9] rounded-xl p-3 flex items-center justify-center min-h-[260px]">
              <ProductMockupCanvas
                productType="polo"
                color={matchedColor}
                artwork={compareView === 'front' ? rightFrontArt : rightBackArt}
                printMethod={matchedSaved?.printMethod || currentPrintMethod}
                printPlacement={
                  compareView === 'front'
                    ? matchedSaved?.frontPlacement || currentFrontPlacement
                    : matchedSaved?.backPlacement || currentBackPlacement
                }
                view={compareView}
                className="w-full h-64"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="text-xs text-slate-600">
                <strong>{matchedColor.name}</strong> · {matchedSaved?.printMethod || currentPrintMethod}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (matchedSaved) {
                    onLoadSavedDesign(matchedSaved);
                  } else {
                    onSwitchColor(matchedColor);
                  }
                  onClose();
                }}
                className="px-3.5 py-2 rounded-lg bg-[#FF7900] hover:bg-[#e86e00] text-white text-xs font-bold cursor-pointer min-h-[38px]"
              >
                {matchedSaved ? 'Switch to Saved Design' : `Apply ${matchedColor.name}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface DesignHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  versions: PlainPoloHistoryVersion[];
  onRestoreVersion: (version: PlainPoloHistoryVersion) => void;
  onCreateCheckpoint: () => void;
}

export const DesignHistoryDrawer: React.FC<DesignHistoryDrawerProps> = ({
  isOpen,
  onClose,
  versions,
  onRestoreVersion,
  onCreateCheckpoint,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[95] bg-[#071B35]/70 backdrop-blur-xs flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-[#071B35] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-[#FF7900]" />
            <div>
              <h3 className="text-sm font-bold leading-tight">Design Version History</h3>
              <p className="text-[11px] text-slate-300">Instant checkpoint restore ({versions.length})</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-600">Snapshots auto-record on major edits</span>
          <button
            type="button"
            onClick={onCreateCheckpoint}
            className="px-3 py-1.5 rounded-lg bg-[#FF7900] hover:bg-[#e56d00] text-white text-xs font-bold cursor-pointer"
          >
            + Save Checkpoint
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {versions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-300 rounded-xl">
              Edit layers, upload logos, or switch positions to build version snapshots automatically.
            </div>
          ) : (
            versions.map((v, idx) => (
              <div
                key={v.id}
                className="rounded-xl border border-slate-200 p-3 bg-white hover:border-slate-300 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-[#FF7900] shrink-0" />
                    <span className="text-xs font-bold text-slate-900 truncate">{v.label}</span>
                    {idx === 0 && (
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Latest
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {v.snapshot.selectedColorName} · {v.snapshot.frontLayers.length}F / {v.snapshot.noBackPrint ? '0B (Off)' : `${v.snapshot.backLayers.length}B`} · {v.timestamp}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onRestoreVersion(v);
                    onClose();
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-[#071B35] text-xs font-semibold text-[#071B35] flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restore</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
