import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  Layers,
  Maximize2,
  RefreshCw,
  RotateCw,
  ShoppingCart,
  Sliders,
  Sparkles,
  Trash2,
  Truck,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { VisitingCardDesignState } from '../types';
import { VisitingCard3DCanvas } from './VisitingCard3DCanvas';
import { compressImageFile } from '../utils/imageCompressor';
import { calculateProductPrice, formatCurrencyINR } from '../data/pricingRules';

interface VisitingCardDesignEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (design: VisitingCardDesignState, artworkApproved?: boolean) => void;
  initialDesign?: VisitingCardDesignState;
  quantity?: number;
  onQuantityChange?: (qty: number) => void;
  initialApproved?: boolean;
  onDirectAddToCart?: (payload: {
    design: VisitingCardDesignState;
    quantity: number;
    artworkApproved: boolean;
  }) => Promise<void> | void;
}

const DEFAULT_SETTINGS = { x: 0, y: 0, scale: 1, rotation: 0 };
const QUICK_QUANTITIES = [100, 200, 500, 1000, 2000];

export const VisitingCardDesignEditor: React.FC<VisitingCardDesignEditorProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialDesign,
  quantity: propQuantity = 100,
  onQuantityChange,
  initialApproved = false,
  onDirectAddToCart,
}) => {
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [previewMode, setPreviewMode] = useState<'editor' | 'mockup' | '3d'>('editor');
  const [showBleed, setShowBleed] = useState<boolean>(true);
  const [showSafeZone, setShowSafeZone] = useState<boolean>(true);

  const [localQty, setLocalQty] = useState<number>(propQuantity);
  useEffect(() => {
    setLocalQty(propQuantity);
  }, [propQuantity]);

  const activeQty = onQuantityChange ? propQuantity : localQty;
  const setQty = (next: number) => {
    const safe = Math.max(100, next);
    setLocalQty(safe);
    onQuantityChange?.(safe);
  };

  // Design state
  const [frontDataUrl, setFrontDataUrl] = useState<string | undefined>(initialDesign?.frontDataUrl);
  const [backDataUrl, setBackDataUrl] = useState<string | undefined>(initialDesign?.backDataUrl);
  const [frontFileName, setFrontFileName] = useState<string | undefined>(initialDesign?.frontFileName);
  const [backFileName, setBackFileName] = useState<string | undefined>(initialDesign?.backFileName);
  const [frontSettings, setFrontSettings] = useState(
    initialDesign?.frontSettings || { ...DEFAULT_SETTINGS }
  );
  const [backSettings, setBackSettings] = useState(
    initialDesign?.backSettings || { ...DEFAULT_SETTINGS }
  );
  const [frontLowRes, setFrontLowRes] = useState<boolean>(false);
  const [backLowRes, setBackLowRes] = useState<boolean>(false);
  const [frontDimensions, setFrontDimensions] = useState<{ width: number; height: number } | null>(
    null
  );
  const [backDimensions, setBackDimensions] = useState<{ width: number; height: number } | null>(
    null
  );
  const [editorError, setEditorError] = useState<string | null>(null);
  const [artworkApproved, setArtworkApproved] = useState<boolean>(initialApproved);
  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const cardCanvasRef = useRef<HTMLDivElement>(null);
  const frontFileInputRef = useRef<HTMLInputElement>(null);
  const backFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialDesign) {
      setFrontDataUrl(initialDesign.frontDataUrl);
      setBackDataUrl(initialDesign.backDataUrl);
      setFrontFileName(initialDesign.frontFileName);
      setBackFileName(initialDesign.backFileName);
      setFrontSettings(initialDesign.frontSettings || { ...DEFAULT_SETTINGS });
      setBackSettings(initialDesign.backSettings || { ...DEFAULT_SETTINGS });
    }
  }, [initialDesign]);

  const pricing = useMemo(
    () => calculateProductPrice('prod-visiting-card-300gsm', activeQty),
    [activeQty]
  );

  if (!isOpen) return null;

  const currentDataUrl = activeSide === 'front' ? frontDataUrl : backDataUrl;
  const currentSettings = activeSide === 'front' ? frontSettings : backSettings;
  const currentFileName = activeSide === 'front' ? frontFileName : backFileName;
  const currentLowRes = activeSide === 'front' ? frontLowRes : backLowRes;
  const currentDim = activeSide === 'front' ? frontDimensions : backDimensions;

  const updateCurrentSettings = (
    updater: (prev: typeof DEFAULT_SETTINGS) => typeof DEFAULT_SETTINGS
  ) => {
    if (activeSide === 'front') setFrontSettings(updater);
    else setBackSettings(updater);
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    side: 'front' | 'back'
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const fileName = file.name;
    const isPdf = file.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (side === 'front') {
          setFrontDataUrl(result);
          setFrontFileName(fileName);
          setFrontLowRes(false);
          setFrontDimensions({ width: 1087, height: 614 });
        } else {
          setBackDataUrl(result);
          setBackFileName(fileName);
          setBackLowRes(false);
          setBackDimensions({ width: 1087, height: 614 });
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    try {
      const { dataUrl, width, height, file: compressedFile } = await compressImageFile(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.85,
        format: 'image/webp',
      });

      const isLow = width < 800 || height < 450;
      if (side === 'front') {
        setFrontDataUrl(dataUrl);
        setFrontFileName(compressedFile.name || fileName);
        setFrontLowRes(isLow);
        setFrontDimensions({ width, height });
        setFrontSettings({ ...DEFAULT_SETTINGS });
      } else {
        setBackDataUrl(dataUrl);
        setBackFileName(compressedFile.name || fileName);
        setBackLowRes(isLow);
        setBackDimensions({ width, height });
        setBackSettings({ ...DEFAULT_SETTINGS });
      }
    } catch (err) {
      console.warn('[VisitingCardDesignEditor] Compression fallback:', err);
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const isLow = img.width < 800 || img.height < 450;
          if (side === 'front') {
            setFrontDataUrl(dataUrl);
            setFrontFileName(fileName);
            setFrontLowRes(isLow);
            setFrontDimensions({ width: img.width, height: img.height });
            setFrontSettings({ ...DEFAULT_SETTINGS });
          } else {
            setBackDataUrl(dataUrl);
            setBackFileName(fileName);
            setBackLowRes(isLow);
            setBackDimensions({ width: img.width, height: img.height });
            setBackSettings({ ...DEFAULT_SETTINGS });
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!currentDataUrl) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !currentDataUrl) return;
    const dx = (e.clientX - dragStartRef.current.x) * 0.25;
    const dy = (e.clientY - dragStartRef.current.y) * 0.25;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    updateCurrentSettings((prev) => ({
      ...prev,
      x: Math.max(-60, Math.min(60, prev.x + dx)),
      y: Math.max(-60, Math.min(60, prev.y + dy)),
    }));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!currentDataUrl || e.touches.length !== 1) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || !currentDataUrl || e.touches.length !== 1) return;
    const dx = (e.touches[0].clientX - dragStartRef.current.x) * 0.25;
    const dy = (e.touches[0].clientY - dragStartRef.current.y) * 0.25;
    dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    updateCurrentSettings((prev) => ({
      ...prev,
      x: Math.max(-60, Math.min(60, prev.x + dx)),
      y: Math.max(-60, Math.min(60, prev.y + dy)),
    }));
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  const handleFitToCanvas = () => updateCurrentSettings(() => ({ x: 0, y: 0, scale: 1, rotation: 0 }));
  const handleResetSettings = () => updateCurrentSettings(() => ({ ...DEFAULT_SETTINGS }));
  const handleRotate90 = () =>
    updateCurrentSettings((prev) => ({ ...prev, rotation: (prev.rotation + 90) % 360 }));

  const handleClearCurrent = () => {
    if (activeSide === 'front') {
      setFrontDataUrl(undefined);
      setFrontFileName(undefined);
      setFrontDimensions(null);
      setFrontSettings({ ...DEFAULT_SETTINGS });
    } else {
      setBackDataUrl(undefined);
      setBackFileName(undefined);
      setBackDimensions(null);
      setBackSettings({ ...DEFAULT_SETTINGS });
    }
  };

  const handleCopyFrontToBack = () => {
    if (!frontDataUrl) return;
    setBackDataUrl(frontDataUrl);
    setBackFileName(frontFileName ? `${frontFileName} (Copy)` : 'Front Artwork Copy');
    setBackSettings({ ...frontSettings });
    setBackLowRes(frontLowRes);
    setBackDimensions(frontDimensions);
    setActiveSide('back');
  };

  const handleExportPrintReady = (side: 'front' | 'back') => {
    const dataUrl = side === 'front' ? frontDataUrl : backDataUrl;
    const settings = side === 'front' ? frontSettings : backSettings;
    if (!dataUrl) {
      setEditorError(`Please upload artwork for the ${side} side before exporting.`);
      return;
    }
    setEditorError(null);

    const canvas = document.createElement('canvas');
    canvas.width = showBleed ? 1157 : 1087;
    canvas.height = showBleed ? 685 : 614;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.translate((settings.x / 100) * canvas.width, (settings.y / 100) * canvas.height);
      ctx.rotate((settings.rotation * Math.PI) / 180);

      const imgAspect = img.width / img.height;
      const canvasAspect = canvas.width / canvas.height;
      const drawW =
        imgAspect > canvasAspect
          ? canvas.width * settings.scale
          : canvas.height * imgAspect * settings.scale;
      const drawH =
        imgAspect > canvasAspect
          ? (canvas.width / imgAspect) * settings.scale
          : canvas.height * settings.scale;

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      const printUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.href = printUrl;
      link.download = `Teqqno_VisitingCard_${side.toUpperCase()}_300DPI_${showBleed ? '98x58mm_Bleed' : '92x52mm'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    img.src = dataUrl;
  };

  const buildDesignState = (): VisitingCardDesignState => ({
    frontDataUrl,
    backDataUrl,
    frontSettings,
    backSettings,
    paperGsm: 300,
    widthMm: 92,
    heightMm: 52,
    withBleed: showBleed,
    frontFileName,
    backFileName,
    frontLowRes,
    backLowRes,
  });

  const handleConfirmDone = () => {
    onConfirm(buildDesignState(), artworkApproved);
    onClose();
  };

  const handleDirectCartClick = async () => {
    const design = buildDesignState();
    if (onDirectAddToCart) {
      setIsAddingToCart(true);
      try {
        await onDirectAddToCart({ design, quantity: activeQty, artworkApproved });
      } finally {
        setTimeout(() => setIsAddingToCart(false), 1400);
      }
    } else {
      handleConfirmDone();
    }
  };

  return (
    <div className="fixed inset-0 z-50 h-[100dvh] w-screen bg-[#F4F6FB] flex flex-col overflow-hidden select-none">
      <input
        type="file"
        ref={activeSide === 'front' ? frontFileInputRef : backFileInputRef}
        onChange={(e) => handleFileUpload(e, activeSide)}
        accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
        className="hidden"
      />

      {/* TOP NAVY BAR */}
      <header className="h-14 bg-[#071B35] text-white px-2.5 sm:px-4 flex items-center justify-between gap-2 shrink-0 border-b border-white/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#FF7900] text-white font-extrabold text-xs flex items-center justify-center shrink-0">
            TW
          </div>
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold text-white truncate">
                Visiting Card Studio
              </span>
              <span className="hidden md:inline-flex px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-orange-300 border border-white/10">
                300 GSM Matte · White Base
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-300 truncate">
              92 × 52 MM Trim · 98 × 58 MM Bleed · {activeQty} pcs
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => handleExportPrintReady(activeSide)}
            disabled={!currentDataUrl}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-40 text-xs font-bold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#FF7900]" />
            <span>Export 300 DPI</span>
          </button>

          <button
            type="button"
            onClick={handleConfirmDone}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF7900] hover:bg-[#e56d00] text-white text-xs font-extrabold cursor-pointer shadow-xs"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.8]" />
            <span className="hidden xs:inline">Save & Apply</span>
            <span className="xs:hidden">Apply</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
            title="Close Studio"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {editorError && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 flex items-center justify-between gap-2 text-xs text-rose-800 shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{editorError}</span>
          </div>
          <button
            type="button"
            onClick={() => setEditorError(null)}
            className="text-rose-500 hover:text-rose-700 font-bold p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* MAIN STUDIO WORKSPACE */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto lg:overflow-hidden min-h-0">
        {/* LEFT + CENTER CANVAS WORKSPACE (7 cols on lg+) */}
        <div className="lg:col-span-7 xl:col-span-8 bg-[#F4F6FB] flex flex-col min-h-0 lg:overflow-hidden">
          {/* Sub-Toolbar: Sides, 2D / Mockup / 3D, Safe/Bleed Guides */}
          <div className="px-3 sm:px-5 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              {(['front', 'back'] as const).map((side) => {
                const hasArt = side === 'front' ? Boolean(frontDataUrl) : Boolean(backDataUrl);
                return (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setActiveSide(side)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold capitalize flex items-center gap-1.5 cursor-pointer transition-all ${
                      activeSide === side
                        ? 'bg-[#071B35] text-white shadow-xs'
                        : 'text-slate-600 hover:text-[#071B35]'
                    }`}
                  >
                    <span>{side} Side</span>
                    {hasArt && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setPreviewMode('editor')}
                className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer ${
                  previewMode === 'editor'
                    ? 'bg-[#FF7900] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#071B35]'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>2D Studio</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('mockup')}
                className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer ${
                  previewMode === 'mockup'
                    ? 'bg-[#FF7900] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#071B35]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>2D Mockup</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('3d')}
                className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer ${
                  previewMode === '3d'
                    ? 'bg-[#FF7900] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#071B35]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>3D Card</span>
              </button>
            </div>
          </div>

          {/* Canvas Display */}
          <div className="flex-1 flex flex-col items-center justify-center p-3.5 sm:p-6 lg:overflow-y-auto">
            <div className="w-full max-w-xl flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 mb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono font-extrabold text-[#071B35] uppercase">
                  {activeSide} · 92 × 52 MM
                </span>
              </div>

              {previewMode === 'editor' && (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-[#071B35]">
                    <input
                      type="checkbox"
                      checked={showSafeZone}
                      onChange={(e) => setShowSafeZone(e.target.checked)}
                      className="accent-[#FF7900]"
                    />
                    <span>Safe Zone (3mm)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-[#071B35]">
                    <input
                      type="checkbox"
                      checked={showBleed}
                      onChange={(e) => setShowBleed(e.target.checked)}
                      className="accent-[#FF7900]"
                    />
                    <span>Bleed Guide (3mm)</span>
                  </label>
                </div>
              )}
            </div>

            {previewMode === 'editor' && (
              <div className="w-full max-w-xl flex flex-col items-center">
                <div
                  className={`relative w-full aspect-[92/52] max-w-[540px] rounded-xl transition-all shadow-xl bg-white flex items-center justify-center ${
                    showBleed
                      ? 'p-3 border-2 border-dashed border-amber-400 bg-amber-50/20'
                      : 'border border-slate-300'
                  }`}
                >
                  <div
                    ref={cardCanvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className="relative w-full h-full bg-white rounded-md border-2 border-[#071B35] overflow-hidden shadow-xs cursor-grab active:cursor-grabbing flex items-center justify-center touch-none"
                  >
                    {showSafeZone && (
                      <div className="absolute inset-3 border border-dashed border-emerald-500/80 rounded-xs pointer-events-none z-20 flex flex-col justify-between p-1">
                        <span className="text-[9px] font-mono text-emerald-700 font-bold bg-white/85 px-1 rounded self-start">
                          Safe Zone (Keep text inside)
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 self-end">
                          Trim: 92×52mm
                        </span>
                      </div>
                    )}

                    {currentDataUrl ? (
                      <div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        style={{
                          transform: `translate(${currentSettings.x}%, ${currentSettings.y}%) rotate(${currentSettings.rotation}deg) scale(${currentSettings.scale})`,
                          transition: isDraggingRef.current ? 'none' : 'transform 0.15s ease-out',
                        }}
                      >
                        <img
                          src={currentDataUrl}
                          alt="Visiting Card Artwork"
                          className="max-w-full max-h-full object-contain pointer-events-none"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-6 space-y-2 pointer-events-none">
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-[#FF7900]">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div className="font-bold text-sm text-[#071B35]">
                          No {activeSide === 'front' ? 'Front' : 'Back'} Artwork Uploaded
                        </div>
                        <p className="text-[11px] text-slate-500 max-w-xs">
                          Upload PNG, JPG or PDF to preview your card on 300 GSM white art stock.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 w-full max-w-[540px] text-[11px] text-slate-500 mt-3 font-mono">
                  <span>Drag artwork to reposition</span>
                  <span>Scale: {Math.round(currentSettings.scale * 100)}%</span>
                  <span>Rotation: {currentSettings.rotation}°</span>
                </div>
              </div>
            )}

            {previewMode === 'mockup' && (
              <div className="w-full max-w-xl flex flex-col items-center justify-center py-6">
                <div className="relative w-full max-w-[460px] flex items-center justify-center">
                  <div className="w-full aspect-[92/52] bg-white rounded-lg border border-slate-200 shadow-2xl relative overflow-hidden flex items-center justify-center">
                    {currentDataUrl ? (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{
                          transform: `translate(${currentSettings.x}%, ${currentSettings.y}%) rotate(${currentSettings.rotation}deg) scale(${currentSettings.scale})`,
                        }}
                      >
                        <img
                          src={currentDataUrl}
                          alt="Visiting Card Mockup"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="text-center text-slate-400 text-xs font-mono">
                        Blank 300 GSM White Art Paper ({activeSide.toUpperCase()})
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/3 via-transparent to-white/15 pointer-events-none" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSide((prev) => (prev === 'front' ? 'back' : 'front'))}
                  className="mt-5 bg-[#071B35] hover:bg-[#0e2d54] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <RotateCw className="w-4 h-4 text-[#FF7900]" />
                  <span>Flip to {activeSide === 'front' ? 'Back View' : 'Front View'}</span>
                </button>
              </div>
            )}

            {previewMode === '3d' && (
              <div className="w-full max-w-xl flex flex-col items-center">
                <VisitingCard3DCanvas
                  frontDataUrl={frontDataUrl}
                  backDataUrl={backDataUrl}
                  frontSettings={frontSettings}
                  backSettings={backSettings}
                  initialView={activeSide}
                  className="w-full h-[250px] sm:h-[340px] lg:h-[380px]"
                />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT CONTROLS & ORDER PANEL (5 cols on lg+) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Quick Upload Card */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF7900]">
                  300 GSM Matte Art Paper
                </div>
                <h3 className="font-bold text-sm text-[#071B35]">
                  {activeSide === 'front' ? 'Front Side Artwork' : 'Back Side Artwork'}
                </h3>
              </div>
              {currentDataUrl && (
                <button
                  type="button"
                  onClick={handleClearCurrent}
                  className="text-rose-600 hover:text-rose-700 text-xs flex items-center gap-1 font-bold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>

            <div
              onClick={() =>
                activeSide === 'front'
                  ? frontFileInputRef.current?.click()
                  : backFileInputRef.current?.click()
              }
              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                currentDataUrl
                  ? 'border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50/60'
                  : 'border-slate-300 bg-slate-50 hover:border-[#FF7900] hover:bg-orange-50/30'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-[#071B35] text-white mx-auto flex items-center justify-center mb-2 shadow-xs">
                <Upload className="w-4 h-4 text-[#FF7900]" />
              </div>
              <div className="text-xs font-extrabold text-[#071B35]">
                {currentDataUrl
                  ? `Replace ${activeSide === 'front' ? 'Front' : 'Back'} Artwork`
                  : `Upload ${activeSide === 'front' ? 'Front' : 'Back'} Artwork`}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                PNG, JPG, JPEG & PDF · 300 DPI Recommended
              </div>
              {currentFileName && (
                <div className="mt-2 text-[11px] font-mono text-emerald-700 font-bold truncate bg-white px-2.5 py-1 rounded-lg border border-emerald-200 inline-block max-w-full">
                  {currentFileName}
                </div>
              )}
            </div>

            {currentDataUrl && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  currentLowRes
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                {currentLowRes ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div className="text-[11px]">
                  <div className="font-bold">
                    {currentLowRes ? 'Resolution Under 300 DPI' : '300 DPI Press Quality Verified'}
                  </div>
                  {currentDim && (
                    <div className="opacity-80">
                      {currentDim.width} × {currentDim.height} px (Recommended: 1087 × 614 px)
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Up-Top Transform Controls */}
            {currentDataUrl && (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#071B35]">
                  Position, Zoom & Rotation
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateCurrentSettings((prev) => ({
                        ...prev,
                        scale: Math.max(0.4, Number((prev.scale - 0.05).toFixed(2))),
                      }))
                    }
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-[#071B35] cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="range"
                    min="0.4"
                    max="2.5"
                    step="0.05"
                    value={currentSettings.scale}
                    onChange={(e) =>
                      updateCurrentSettings((prev) => ({
                        ...prev,
                        scale: parseFloat(e.target.value),
                      }))
                    }
                    className="flex-1 accent-[#FF7900]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateCurrentSettings((prev) => ({
                        ...prev,
                        scale: Math.min(2.5, Number((prev.scale + 0.05).toFixed(2))),
                      }))
                    }
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-[#071B35] cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono font-bold text-[#FF7900] w-10 text-right">
                    {Math.round(currentSettings.scale * 100)}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={handleRotate90}
                    className="py-1.5 px-2 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-[#071B35] flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RotateCw className="w-3 h-3 text-[#FF7900]" />
                    <span>+90°</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleFitToCanvas}
                    className="py-1.5 px-2 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-[#071B35] flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Maximize2 className="w-3 h-3 text-[#FF7900]" />
                    <span>Fit Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetSettings}
                    className="py-1.5 px-2 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-[#071B35] flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3 text-slate-500" />
                    <span>Center</span>
                  </button>
                </div>
              </div>
            )}

            {activeSide === 'back' && frontDataUrl && !backDataUrl && (
              <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-3 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-[#071B35]">Copy Front Design to Back?</span>
                <button
                  type="button"
                  onClick={handleCopyFrontToBack}
                  className="px-2.5 py-1.5 rounded-lg bg-[#071B35] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Copy className="w-3 h-3 text-[#FF7900]" />
                  <span>Copy</span>
                </button>
              </div>
            )}

            {/* SLAB PRICING (100 / 200 / 500 / 1000 / 2000 pcs) */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#071B35]">
                Pack Quantity & Bulk Pricing
              </div>

              <div className="grid grid-cols-5 gap-1">
                {QUICK_QUANTITIES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQty(q)}
                    className={`py-1.5 rounded-lg border text-[11px] font-extrabold cursor-pointer transition-all ${
                      activeQty === q
                        ? 'bg-[#071B35] text-white border-[#071B35]'
                        : 'bg-white text-[#071B35] border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>

              <div className="p-3 rounded-2xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setQty(Math.max(100, activeQty - 100))}
                      className="w-8 h-8 font-bold text-[#071B35] hover:bg-slate-100 cursor-pointer"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={100}
                      step={100}
                      value={activeQty}
                      onChange={(e) => setQty(Math.max(100, Number(e.target.value) || 100))}
                      className="w-14 text-center text-xs font-extrabold text-[#071B35] bg-transparent outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQty(activeQty + 100)}
                      className="w-8 h-8 font-bold text-[#071B35] hover:bg-slate-100 cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-extrabold text-[#071B35] font-mono leading-tight">
                      {formatCurrencyINR(pricing.totalPrice)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      ₹{pricing.unitPrice}/card · Incl. 18% GST
                    </div>
                  </div>
                </div>

                {pricing.nextTierUpsell && (
                  <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[11px] font-bold text-emerald-900">
                      Make {pricing.nextTierUpsell.minQty} → ₹{pricing.nextTierUpsell.price}/card
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty(pricing.nextTierUpsell!.minQty)}
                      className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-extrabold cursor-pointer"
                    >
                      Upgrade
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Truck className="w-3.5 h-3.5 text-[#FF7900]" />
                  Dispatch: 24–48 hrs
                </span>
                <span className="font-bold text-[#071B35]">Delhivery Express</span>
              </div>
            </div>

            {/* Print Export & Artwork Approval */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleExportPrintReady('front')}
                disabled={!frontDataUrl}
                className="py-2 px-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-[#071B35] text-[11px] font-bold flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#FF7900]" />
                <span>Front 300 DPI</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportPrintReady('back')}
                disabled={!backDataUrl}
                className="py-2 px-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-[#071B35] text-[11px] font-bold flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#FF7900]" />
                <span>Back 300 DPI</span>
              </button>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={artworkApproved}
                onChange={(e) => setArtworkApproved(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#FF7900] cursor-pointer"
              />
              <div className="space-y-0.5">
                <div className="text-xs font-extrabold text-[#071B35] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Approve Artwork Preview</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  I verify safe zone margins, bleed & card details are ready for press printing.
                </p>
              </div>
            </label>
          </div>

          {/* Bottom Checkout Bar */}
          <div className="p-3.5 border-t border-slate-200 bg-white space-y-2 shrink-0">
            <button
              type="button"
              onClick={handleDirectCartClick}
              disabled={isAddingToCart}
              className="w-full py-3 px-4 rounded-xl bg-[#FF7900] hover:bg-[#e56d00] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              {isAddingToCart ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Added to Cart!</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  <span>Add to Cart · {formatCurrencyINR(pricing.totalPrice)}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleConfirmDone}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-[#071B35] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Apply Design & Return to Product Page</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
