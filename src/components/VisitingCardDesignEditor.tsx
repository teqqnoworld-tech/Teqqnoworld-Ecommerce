import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  Sliders,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
  Trash2,
  FileText
} from 'lucide-react';
import { VisitingCardDesignState } from '../types';
import { VisitingCard3DCanvas } from './VisitingCard3DCanvas';
import { compressImageFile } from '../utils/imageCompressor';

interface VisitingCardDesignEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (design: VisitingCardDesignState) => void;
  initialDesign?: VisitingCardDesignState;
}

const DEFAULT_SETTINGS = { x: 0, y: 0, scale: 1, rotation: 0 };

export const VisitingCardDesignEditor: React.FC<VisitingCardDesignEditorProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialDesign,
}) => {
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [previewMode, setPreviewMode] = useState<'editor' | 'mockup' | '3d'>('editor');
  const [showBleed, setShowBleed] = useState<boolean>(true);
  const [showSafeZone, setShowSafeZone] = useState<boolean>(true);

  // Design state
  const [frontDataUrl, setFrontDataUrl] = useState<string | undefined>(initialDesign?.frontDataUrl);
  const [backDataUrl, setBackDataUrl] = useState<string | undefined>(initialDesign?.backDataUrl);
  const [frontFileName, setFrontFileName] = useState<string | undefined>(initialDesign?.frontFileName);
  const [backFileName, setBackFileName] = useState<string | undefined>(initialDesign?.backFileName);
  const [frontSettings, setFrontSettings] = useState(initialDesign?.frontSettings || { ...DEFAULT_SETTINGS });
  const [backSettings, setBackSettings] = useState(initialDesign?.backSettings || { ...DEFAULT_SETTINGS });
  const [frontLowRes, setFrontLowRes] = useState<boolean>(false);
  const [backLowRes, setBackLowRes] = useState<boolean>(false);
  const [frontDimensions, setFrontDimensions] = useState<{ width: number; height: number } | null>(null);
  const [backDimensions, setBackDimensions] = useState<{ width: number; height: number } | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);

  // Dragging state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const cardCanvasRef = useRef<HTMLDivElement>(null);

  // File input refs
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

  if (!isOpen) return null;

  const currentDataUrl = activeSide === 'front' ? frontDataUrl : backDataUrl;
  const currentSettings = activeSide === 'front' ? frontSettings : backSettings;
  const currentFileName = activeSide === 'front' ? frontFileName : backFileName;
  const currentLowRes = activeSide === 'front' ? frontLowRes : backLowRes;
  const currentDim = activeSide === 'front' ? frontDimensions : backDimensions;

  const updateCurrentSettings = (updater: (prev: typeof DEFAULT_SETTINGS) => typeof DEFAULT_SETTINGS) => {
    if (activeSide === 'front') {
      setFrontSettings(updater);
    } else {
      setBackSettings(updater);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    const isPdf = file.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      // Create a visual indicator for PDF uploads
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
        quality: 0.8,
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
      console.warn('[VisitingCardDesignEditor] Compression fallback to FileReader:', err);
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

  // Drag interaction
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

  // Touch drag interaction for mobile devices
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

  // Fit to canvas
  const handleFitToCanvas = () => {
    updateCurrentSettings(() => ({
      x: 0,
      y: 0,
      scale: 1.0,
      rotation: 0,
    }));
  };

  // Reset
  const handleResetSettings = () => {
    updateCurrentSettings(() => ({ ...DEFAULT_SETTINGS }));
  };

  // Rotate 90 deg
  const handleRotate90 = () => {
    updateCurrentSettings((prev) => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360,
    }));
  };

  // Clear current artwork
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

  // Copy front to back
  const handleCopyFrontToBack = () => {
    if (!frontDataUrl) return;
    setBackDataUrl(frontDataUrl);
    setBackFileName(frontFileName ? `${frontFileName} (Copy)` : 'Front Artwork Copy');
    setBackSettings({ ...frontSettings });
    setBackLowRes(frontLowRes);
    setBackDimensions(frontDimensions);
    setActiveSide('back');
  };

  // Print-ready high resolution download (300 DPI)
  const handleExportPrintReady = (side: 'front' | 'back') => {
    const dataUrl = side === 'front' ? frontDataUrl : backDataUrl;
    const settings = side === 'front' ? frontSettings : backSettings;
    if (!dataUrl) {
      setEditorError(`Please upload artwork for the ${side} side before exporting.`);
      return;
    }
    setEditorError(null);

    const canvas = document.createElement('canvas');
    // 92mm x 52mm @ 300 DPI = 1087 x 614 px (without bleed)
    // 98mm x 58mm @ 300 DPI = 1157 x 685 px (with 3mm bleed)
    canvas.width = showBleed ? 1157 : 1087;
    canvas.height = showBleed ? 685 : 614;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clean white 300 GSM cardstock base
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);

      const offsetX = (settings.x / 100) * canvas.width;
      const offsetY = (settings.y / 100) * canvas.height;
      ctx.translate(offsetX, offsetY);
      ctx.rotate((settings.rotation * Math.PI) / 180);

      const imgAspect = img.width / img.height;
      const canvasAspect = canvas.width / canvas.height;

      let drawW = canvas.width;
      let drawH = canvas.height;

      if (imgAspect > canvasAspect) {
        drawW = canvas.width * settings.scale;
        drawH = (canvas.width / imgAspect) * settings.scale;
      } else {
        drawH = canvas.height * settings.scale;
        drawW = (canvas.height * imgAspect) * settings.scale;
      }

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      const printUrl = canvas.toDataURL('image/png', 1.0);
      const downloadLink = document.createElement('a');
      downloadLink.href = printUrl;
      downloadLink.download = `Teqqno_VisitingCard_${side.toUpperCase()}_300DPI_${showBleed ? '98x58mm_Bleed' : '92x52mm'}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };
    img.src = dataUrl;
  };

  const handleConfirmDone = () => {
    onConfirm({
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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 md:p-5 overflow-hidden">
      <div className="bg-[#FAF9FD] w-full max-w-6xl h-[100dvh] sm:h-auto sm:max-h-[94dvh] rounded-none sm:rounded-2xl border-0 sm:border border-zinc-200 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-white px-3.5 py-3 sm:px-5 sm:py-4 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FF7A00]/10 border border-[#FF7A00]/25 flex items-center justify-center text-[#FF7A00] font-bold shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="font-display font-bold text-sm sm:text-lg text-zinc-900 leading-tight">
                  Visiting Card Design Editor
                </h2>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                  300 GSM
                </span>
                <span className="hidden xs:inline-block bg-zinc-100 text-zinc-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-zinc-200 shrink-0">
                  White Base ONLY
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-500 truncate sm:whitespace-normal">
                Print Size: <strong>92 × 52 MM</strong> · Optional 3 MM Bleed (98 × 58 MM)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto shrink-0">
            <button
              onClick={handleConfirmDone}
              className="bg-[#FF7A00] hover:bg-[#e06c00] active:scale-98 text-white text-xs font-display font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all flex items-center gap-1.5 sm:gap-2 shadow-xs cursor-pointer"
            >
              <span className="hidden sm:inline">Confirm & Save Design</span>
              <span className="sm:hidden">Save</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-700 p-2 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
              title="Close editor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {editorError && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between gap-2 text-xs text-red-800 shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{editorError}</span>
            </div>
            <button
              type="button"
              onClick={() => setEditorError(null)}
              className="text-red-500 hover:text-red-700 font-bold p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Sub-header navigation: Sides & Modes */}
        <div className="bg-[#F0EFF5] px-3 sm:px-5 py-2.5 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 text-xs">
          {/* Side Selector Tabs */}
          <div className="flex items-center gap-1 sm:gap-1.5 bg-white p-1 rounded-xl border border-zinc-300 shadow-2xs">
            <button
              onClick={() => setActiveSide('front')}
              className={`px-2.5 sm:px-4 py-1.5 rounded-lg font-display font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
                activeSide === 'front'
                  ? 'bg-[#0B0B0D] text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <span>Front <span className="hidden xs:inline">Side </span>Design</span>
              {frontDataUrl && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
            </button>

            <button
              onClick={() => setActiveSide('back')}
              className={`px-2.5 sm:px-4 py-1.5 rounded-lg font-display font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
                activeSide === 'back'
                  ? 'bg-[#0B0B0D] text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <span>Back <span className="hidden xs:inline">Side </span>Design</span>
              {backDataUrl && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
            </button>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 sm:gap-1 bg-white p-1 rounded-xl border border-zinc-300 shadow-2xs">
              <button
                onClick={() => setPreviewMode('editor')}
                className={`px-2 sm:px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer text-[11px] sm:text-xs ${
                  previewMode === 'editor'
                    ? 'bg-[#FF7A00] text-white font-bold shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>2D <span className="hidden xs:inline">Design </span>Canvas</span>
              </button>

              <button
                onClick={() => setPreviewMode('mockup')}
                className={`px-2 sm:px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer text-[11px] sm:text-xs ${
                  previewMode === 'mockup'
                    ? 'bg-[#FF7A00] text-white font-bold shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span><span className="hidden xs:inline">Realistic </span>2D Mockup</span>
              </button>

              <button
                onClick={() => setPreviewMode('3d')}
                className={`px-2 sm:px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer text-[11px] sm:text-xs ${
                  previewMode === '3d'
                    ? 'bg-[#FF7A00] text-white font-bold shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>3D <span className="hidden xs:inline">Preview</span></span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Work Area */}
        <div className="flex-1 overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
          
          {/* Left Canvas Display (7 cols) */}
          <div className="lg:col-span-7 bg-[#EFEFF4] p-3.5 sm:p-5 lg:p-6 flex flex-col items-center justify-center relative overflow-hidden select-none lg:overflow-y-auto">
            
            {/* Guide controls & dimensions header */}
            <div className="w-full max-w-xl flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600 mb-3 px-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-mono font-bold text-zinc-900">
                  {activeSide === 'front' ? 'FRONT SIDE' : 'BACK SIDE'}
                </span>
                <span className="text-zinc-400">·</span>
                <span className="font-mono text-zinc-500">92 × 52 mm</span>
              </div>

              {previewMode === 'editor' && (
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-zinc-700">
                    <input
                      type="checkbox"
                      checked={showSafeZone}
                      onChange={(e) => setShowSafeZone(e.target.checked)}
                      className="rounded text-[#FF7A00] focus:ring-[#FF7A00]"
                    />
                    <span>Safe Zone (3mm)</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-zinc-700">
                    <input
                      type="checkbox"
                      checked={showBleed}
                      onChange={(e) => setShowBleed(e.target.checked)}
                      className="rounded text-[#FF7A00] focus:ring-[#FF7A00]"
                    />
                    <span>Bleed Guide (3mm)</span>
                  </label>
                </div>
              )}
            </div>

            {/* View A: 2D Interactive Canvas Editor */}
            {previewMode === 'editor' && (
              <div className="w-full max-w-xl flex flex-col items-center">
                
                {/* Outer Bleed Container (98 x 58 mm ratio) */}
                <div
                  className={`relative w-full aspect-[92/52] max-w-[520px] rounded-lg transition-all shadow-xl bg-white flex items-center justify-center ${
                    showBleed ? 'p-3 border-2 border-dashed border-amber-400 bg-amber-50/20' : 'border border-zinc-300'
                  }`}
                >
                  {/* Finished Trim Line (92 x 52 mm boundary) */}
                  <div
                    ref={cardCanvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                    className="relative w-full h-full bg-white rounded-md border-2 border-zinc-900 overflow-hidden shadow-sm cursor-grab active:cursor-grabbing flex items-center justify-center touch-none"
                    style={{
                      boxShadow: '0 4px 18px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    {/* Safe Margin Guide (3 mm inside trim line) */}
                    {showSafeZone && (
                      <div className="absolute inset-3 border border-dashed border-emerald-500/80 rounded-xs pointer-events-none z-20 flex flex-col justify-between p-1">
                        <span className="text-[9px] font-mono text-emerald-700 font-bold bg-white/80 px-1 rounded-xs self-start">
                          Safe Zone (Keep text inside)
                        </span>
                        <span className="text-[9px] font-mono text-zinc-400 self-end">
                          Trim Edge: 92×52mm
                        </span>
                      </div>
                    )}

                    {/* Artwork Render */}
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
                      /* Blank card placeholder */
                      <div className="flex flex-col items-center justify-center text-center p-6 space-y-2 pointer-events-none">
                        <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                          <Upload className="w-6 h-6 stroke-[1.5]" />
                        </div>
                        <div className="font-display font-bold text-sm text-zinc-800">
                          No {activeSide === 'front' ? 'Front' : 'Back'} Artwork Uploaded
                        </div>
                        <p className="text-[11px] text-zinc-500 max-w-xs">
                          Click <strong>"Upload {activeSide === 'front' ? 'Front' : 'Back'} Artwork"</strong> on the right to place your design onto the pure white 300 GSM art paper.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Canvas bottom hint */}
                <div className="flex flex-wrap items-center justify-between gap-2 w-full max-w-[520px] text-[10px] sm:text-[11px] text-zinc-500 mt-3 font-mono">
                  <span>Drag design to reposition</span>
                  <span>Zoom: {Math.round(currentSettings.scale * 100)}%</span>
                  <span>Rotation: {currentSettings.rotation}°</span>
                </div>
              </div>
            )}

            {/* View B: Realistic 2D Mockup */}
            {previewMode === 'mockup' && (
              <div className="w-full max-w-xl flex flex-col items-center justify-center py-6 px-2 sm:px-4">
                <div className="relative group perspective-1000 w-full max-w-[460px] flex items-center justify-center">
                  {/* Shadow stack undercard */}
                  <div className="absolute top-2 left-2 w-full aspect-[92/52] bg-zinc-200/90 rounded-md rotate-1 blur-[1px] -z-10 shadow-lg" />
                  <div className="absolute top-1 left-1 w-full aspect-[92/52] bg-zinc-100/90 rounded-md -rotate-1 -z-10 shadow-md" />

                  {/* Main Card */}
                  <div
                    className="w-full aspect-[92/52] bg-white rounded-md border border-zinc-200/90 shadow-2xl relative overflow-hidden flex items-center justify-center"
                    style={{
                      boxShadow: '0 25px 40px -15px rgba(0, 0, 0, 0.18), 0 0 1px rgba(0,0,0,0.2)',
                    }}
                  >
                    {currentDataUrl ? (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{
                          transform: `translate(${currentSettings.x}%, ${currentSettings.y}%) rotate(${currentSettings.rotation}deg) scale(${currentSettings.scale})`,
                        }}
                      >
                        <img
                          src={currentDataUrl}
                          alt="Visiting Card Preview"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="text-center text-zinc-400 text-xs font-mono">
                        Blank 300 GSM White Art Paper ({activeSide.toUpperCase()})
                      </div>
                    )}

                    {/* Paper subtle sheen overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/2 via-transparent to-white/10 pointer-events-none" />
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={() => setActiveSide((prev) => (prev === 'front' ? 'back' : 'front'))}
                    className="bg-white hover:bg-zinc-50 border border-zinc-300 px-4 py-2 rounded-xl text-xs font-bold text-zinc-800 shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCw className="w-4 h-4 text-[#FF7A00]" />
                    <span>Flip to {activeSide === 'front' ? 'Back View' : 'Front View'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* View C: Three.js Interactive 3D Canvas */}
            {previewMode === '3d' && (
              <div className="w-full max-w-xl flex flex-col items-center">
                <VisitingCard3DCanvas
                  frontDataUrl={frontDataUrl}
                  backDataUrl={backDataUrl}
                  frontSettings={frontSettings}
                  backSettings={backSettings}
                  initialView={activeSide}
                  className="w-full h-[240px] sm:h-[320px] lg:h-[360px]"
                />
              </div>
            )}

          </div>

          {/* Right Controls Panel (5 cols) */}
          <div className="lg:col-span-5 bg-white p-4 sm:p-5 lg:p-6 border-t lg:border-t-0 lg:border-l border-zinc-200 lg:overflow-y-auto space-y-5">
            
            {/* Active Side Heading */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#FF7A00] font-bold">
                  Card Face Configuration
                </span>
                <h3 className="font-display font-bold text-base text-zinc-900">
                  {activeSide === 'front' ? 'Front Side Artwork' : 'Back Side Artwork'}
                </h3>
              </div>

              {currentDataUrl && (
                <button
                  onClick={handleClearCurrent}
                  className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  title="Remove this artwork"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>

            {/* Upload Area */}
            <div className="space-y-2">
              <input
                type="file"
                ref={activeSide === 'front' ? frontFileInputRef : backFileInputRef}
                onChange={(e) => handleFileUpload(e, activeSide)}
                accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                className="hidden"
              />

              <div
                onClick={() => {
                  if (activeSide === 'front') {
                    frontFileInputRef.current?.click();
                  } else {
                    backFileInputRef.current?.click();
                  }
                }}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                  currentDataUrl
                    ? 'border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/50'
                    : 'border-zinc-300 bg-zinc-50 hover:bg-zinc-100 hover:border-[#FF7A00]'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-white shadow-2xs mx-auto flex items-center justify-center text-[#FF7A00] mb-2">
                  <Upload className="w-5 h-5 stroke-[2]" />
                </div>

                <div className="text-xs font-bold text-zinc-900">
                  {currentDataUrl
                    ? `Replace ${activeSide === 'front' ? 'Front' : 'Back'} Artwork`
                    : `Upload ${activeSide === 'front' ? 'Front' : 'Back'} Artwork`}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  Supports PNG, JPG, JPEG & PDF (300 DPI Recommended)
                </div>

                {currentFileName && (
                  <div className="mt-2 text-[11px] font-mono text-emerald-700 font-semibold truncate max-w-xs mx-auto bg-white/80 px-2 py-0.5 rounded border border-emerald-200">
                    📎 {currentFileName}
                  </div>
                )}
              </div>
            </div>

            {/* Resolution Warning / Quality Banner */}
            {currentDataUrl && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  currentLowRes
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                {currentLowRes ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="font-bold text-[11px]">Advisory: Resolution Under 300 DPI</div>
                      <p className="text-[10px] text-amber-800 leading-relaxed">
                        Your image resolution ({currentDim?.width} × {currentDim?.height} px) is lower than the recommended 1087 × 614 px. Fine fonts may print slightly soft.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="font-bold text-[11px]">High Print Resolution Verified</div>
                      <p className="text-[10px] text-emerald-800 leading-relaxed">
                        Ready for 300 DPI digital press printing ({currentDim?.width} × {currentDim?.height} px). Text will be razor sharp.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Transform Controls (Zoom, Rotate, Reposition) */}
            {currentDataUrl && (
              <div className="space-y-4 pt-2 border-t border-zinc-100">
                <div className="text-xs font-bold text-zinc-900 font-mono uppercase tracking-wide">
                  Artwork Adjustments
                </div>

                {/* Scale / Zoom Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-zinc-700">
                    <span className="font-medium">Zoom & Scale</span>
                    <span className="font-mono font-bold text-[#FF7A00]">
                      {Math.round(currentSettings.scale * 100)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateCurrentSettings((prev) => ({
                          ...prev,
                          scale: Math.max(0.4, Number((prev.scale - 0.05).toFixed(2))),
                        }))
                      }
                      className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 cursor-pointer"
                      title="Zoom Out"
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
                      className="flex-1 accent-[#FF7A00] cursor-pointer"
                    />

                    <button
                      onClick={() =>
                        updateCurrentSettings((prev) => ({
                          ...prev,
                          scale: Math.min(2.5, Number((prev.scale + 0.05).toFixed(2))),
                        }))
                      }
                      className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Rotation Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-zinc-700">
                    <span className="font-medium">Rotation</span>
                    <span className="font-mono font-bold text-zinc-900">
                      {currentSettings.rotation}°
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="5"
                      value={currentSettings.rotation}
                      onChange={(e) =>
                        updateCurrentSettings((prev) => ({
                          ...prev,
                          rotation: parseInt(e.target.value),
                        }))
                      }
                      className="flex-1 accent-[#FF7A00] cursor-pointer"
                    />

                    <button
                      onClick={handleRotate90}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-700 flex items-center gap-1 cursor-pointer shrink-0"
                      title="Rotate 90 degrees clockwise"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>+90°</span>
                    </button>
                  </div>
                </div>

                {/* Alignment Actions: Fit to Canvas & Reset */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleFitToCanvas}
                    className="w-full py-2 px-3 rounded-lg border border-zinc-300 hover:bg-zinc-50 text-xs font-bold text-zinc-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-[#FF7A00]" />
                    <span>Fit to Canvas</span>
                  </button>

                  <button
                    onClick={handleResetSettings}
                    className="w-full py-2 px-3 rounded-lg border border-zinc-300 hover:bg-zinc-50 text-xs font-bold text-zinc-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Reset Center</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quick Utility: Copy Front Design to Back */}
            {activeSide === 'back' && frontDataUrl && !backDataUrl && (
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 space-y-2">
                <div className="text-xs font-bold text-amber-900">
                  Same Design on Back Side?
                </div>
                <p className="text-[11px] text-amber-800">
                  You can independently upload a different back design, or copy your front design here with 1 click.
                </p>
                <button
                  onClick={handleCopyFrontToBack}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Copy Front Design to Back
                </button>
              </div>
            )}

            {/* Print-Ready Export Section */}
            <div className="pt-3 border-t border-zinc-100 space-y-2">
              <div className="text-xs font-bold text-zinc-900 font-mono uppercase tracking-wide flex items-center justify-between">
                <span>Production Files</span>
                <span className="text-[10px] text-emerald-600 font-semibold">300 DPI Export</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleExportPrintReady('front')}
                  disabled={!frontDataUrl}
                  className="py-2 px-2.5 rounded-lg border border-zinc-300 hover:border-zinc-400 bg-white text-zinc-800 text-[11px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#FF7A00]" />
                  <span>Export Front (300 DPI)</span>
                </button>

                <button
                  onClick={() => handleExportPrintReady('back')}
                  disabled={!backDataUrl}
                  className="py-2 px-2.5 rounded-lg border border-zinc-300 hover:border-zinc-400 bg-white text-zinc-800 text-[11px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#FF7A00]" />
                  <span>Export Back (300 DPI)</span>
                </button>
              </div>
            </div>

            {/* Bottom Finalize Button */}
            <div className="pt-3 border-t border-zinc-200">
              <button
                onClick={handleConfirmDone}
                className="w-full bg-[#FF7A00] hover:bg-[#e06c00] active:scale-98 text-white text-sm font-display font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <span>Save & Confirm Visiting Card</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
