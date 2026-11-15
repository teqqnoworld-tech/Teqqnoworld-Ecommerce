import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Check,
  Pencil,
  Shirt,
  Type,
  Upload,
  ChevronDown,
  ChevronRight,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  SquareDashedBottom,
  RotateCw,
  Trash2,
  Copy,
  Layers,
  Sparkles,
  Eraser,
  Paintbrush,
  MousePointerClick,
  ArrowUp,
  ArrowDown,
  FlipHorizontal2,
  AlignCenter,
  X,
  ImagePlus,
  RefreshCw,
} from 'lucide-react';
import { Product, ProductColor, PrintMethod, CustomArtwork, StudioLayer, StudioShapeType } from '../types';
import { getTippingPoloImages } from '../data/tippingPoloImages';
import { getPlainPoloImages } from '../data/plainPoloImages';
import { getJoabCoolmaxImages } from '../data/joabCoolmaxImages';
import { getMattyPoloImages } from '../data/mattyPoloImages';
import { getCapImages } from '../data/capImages';
import { formatCurrencyINR } from '../data/pricingRules';
import { compressImageFile } from '../utils/imageCompressor';
import {
  DEFAULT_LOGO_CLEANUP,
  EraserAction,
  LogoCleanupOptions,
  LogoLayoutMode,
  LogoPartItem,
  PrintColorMode,
  processLogoPipeline,
  rasterizePresetToDataUrl,
} from '../utils/logoProcessor';

const GLOBAL_CLEANUP_STORAGE_KEY = 'teqqno_global_logo_cleanup_v1';

interface ProductDesignStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  selectedColor: ProductColor;
  onSelectColor: (color: ProductColor) => void;
  quantity: number;
  onQuantityChange: (qty: number) => void;
  unitPrice: number;
  totalPrice: number;
  moq: number;
  frontArtwork: CustomArtwork | null;
  backArtwork: CustomArtwork | null;
  frontPlacement: string;
  backPlacement: string;
  selectedPrintMethod: PrintMethod;
  onSelectPrintMethod: (pm: PrintMethod) => void;
  uploadedFrontLogoName: string;
  uploadedBackLogoName: string;
  initialActiveSide?: 'front' | 'back';
  selectedVariantLabel?: string;
  onCommitStudioChanges: (payload: {
    frontArtwork: CustomArtwork | null;
    backArtwork: CustomArtwork | null;
    frontPlacement: string;
    backPlacement: string;
    uploadedFrontLogoName: string;
    uploadedBackLogoName: string;
  }) => void;
}

interface ZoneSpec {
  cx: number;
  cy: number;
  boxSize: number;
  maxW: number;
  maxH: number;
}

interface PlacementOptionItem {
  id: string;
  label: string;
}

function getSurfaceHex(
  productType: Product['productType'],
  baseHex: string,
  placement: string
): string {
  if (
    productType === 'mug' ||
    productType === 'display' ||
    productType === 'table' ||
    productType === 'visiting-card'
  ) {
    return '#FFFFFF';
  }
  if (productType === 'standee') return '#111215';
  if (productType === 'canopy') return '#162B4D';
  if (productType === 'umbrella') {
    const pLower = (placement || '').toLowerCase();
    if (pLower.includes('left') || pLower.includes('right') || pLower.includes('valance')) {
      return baseHex;
    }
    return '#FFFFFF';
  }
  return baseHex;
}

function isSurfaceLight(hex: string): boolean {
  const clean = (hex || '').replace('#', '').trim();
  if (clean.length < 6) return false;
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}

function getProductStudioConfig(
  productType: Product['productType'],
  selectedVariantLabel?: string
): {
  hasBackSide: boolean;
  singleSideBadge: string;
  colorLabel: string;
  quickFrontPositions: PlacementOptionItem[];
  barFrontPositions: PlacementOptionItem[];
  backPositions: PlacementOptionItem[];
  backQuickBigId: string;
  defaultFrontPlacement: string;
  defaultBackPlacement: string;
  placementHint: string;
} {
  switch (productType) {
    case 'cap':
      return {
        hasBackSide: true,
        singleSideBadge: 'Front Crown',
        colorLabel: 'Cap colour',
        quickFrontPositions: [
          { id: 'Front Crown', label: 'Front crown' },
          { id: 'Left Crown', label: 'Left crown' },
          { id: 'Right Crown', label: 'Right crown' },
        ],
        barFrontPositions: [
          { id: 'Front Crown', label: 'Front crown' },
          { id: 'Left Crown', label: 'Left crown' },
          { id: 'Right Crown', label: 'Right crown' },
        ],
        backPositions: [{ id: 'Back Arch', label: 'Back arch' }],
        backQuickBigId: 'Back Arch',
        defaultFrontPlacement: 'Front Crown',
        defaultBackPlacement: 'Back Arch',
        placementHint: 'Select Front Crown or Left / Right Side panels. Switch to Back for Rear Arch text above the strap.',
      };
    case 'mug':
      return {
        hasBackSide: true,
        singleSideBadge: 'Front Ceramic',
        colorLabel: 'Mug colour',
        quickFrontPositions: [
          { id: 'Front Center', label: 'Front center' },
          { id: 'Left of Handle', label: 'Left of handle' },
          { id: 'Full Wrap Band', label: 'Full wrap' },
        ],
        barFrontPositions: [
          { id: 'Front Center', label: 'Front center' },
          { id: 'Left of Handle', label: 'Left of handle' },
          { id: 'Full Wrap Band', label: 'Full wrap' },
        ],
        backPositions: [
          { id: 'Back Center', label: 'Back center' },
          { id: 'Small logo', label: 'Small logo' },
        ],
        backQuickBigId: 'Back Center',
        defaultFrontPlacement: 'Front Center',
        defaultBackPlacement: 'Back Center',
        placementHint: '8.5" × 3" ceramic wrap zone. Use Front & Back tabs above to brand both sides of the mug.',
      };
    case 'umbrella':
      return {
        hasBackSide: true,
        singleSideBadge: 'Front Canopy',
        colorLabel: 'Canopy colour',
        quickFrontPositions: [
          { id: 'Center Panel', label: 'Center panel' },
          { id: 'Left Panel', label: 'Left panel' },
          { id: 'Right Panel', label: 'Right panel' },
        ],
        barFrontPositions: [
          { id: 'Center Panel', label: 'Center panel' },
          { id: 'Left Panel', label: 'Left panel' },
          { id: 'Right Panel', label: 'Right panel' },
          { id: 'Lower Valance', label: 'Lower valance' },
        ],
        backPositions: [
          { id: 'Back Center Panel', label: 'Back panel' },
          { id: 'Back Valance', label: 'Back valance' },
        ],
        backQuickBigId: 'Back Center Panel',
        defaultFrontPlacement: 'Center Panel',
        defaultBackPlacement: 'Back Center Panel',
        placementHint: 'Alternate white & colour panels plus the drop valance can all be branded cleanly.',
      };
    case 'canopy':
      return {
        hasBackSide: false,
        singleSideBadge: `Front Kiosk (${selectedVariantLabel || '4 × 4 ft'})`,
        colorLabel: 'Canopy finish',
        quickFrontPositions: [
          { id: 'Top Valance Header', label: 'Top valance' },
          { id: 'Lower Front Wall', label: 'Front wall' },
          { id: 'Full Kiosk Branding', label: 'Full kiosk' },
        ],
        barFrontPositions: [
          { id: 'Top Valance Header', label: 'Top valance' },
          { id: 'Lower Front Wall', label: 'Front wall' },
          { id: 'Full Kiosk Branding', label: 'Full kiosk' },
        ],
        backPositions: [],
        backQuickBigId: 'Top Valance Header',
        defaultFrontPlacement: 'Top Valance Header',
        defaultBackPlacement: 'Top Valance Header',
        placementHint: 'Place high-visibility branding on the top valance header or the lower counter skirt wall.',
      };
    case 'standee':
      return {
        hasBackSide: false,
        singleSideBadge: 'Front Banner (3 × 6 ft)',
        colorLabel: 'Frame colour',
        quickFrontPositions: [
          { id: 'Top Header', label: 'Top header' },
          { id: 'Center Main', label: 'Center main' },
          { id: 'Lower Strip', label: 'Lower strip' },
        ],
        barFrontPositions: [
          { id: 'Top Header', label: 'Top header' },
          { id: 'Center Main', label: 'Center main' },
          { id: 'Lower Strip', label: 'Lower strip' },
        ],
        backPositions: [],
        backQuickBigId: 'Top Header',
        defaultFrontPlacement: 'Top Header',
        defaultBackPlacement: 'Top Header',
        placementHint: 'Vertical 3 × 6 ft retractable banner stage. Drag layers anywhere from header to base.',
      };
    case 'display':
    case 'table':
      return {
        hasBackSide: false,
        singleSideBadge: 'Front Counter + Header',
        colorLabel: 'Counter colour',
        quickFrontPositions: [
          { id: 'Top Header', label: 'Top header' },
          { id: 'Front Counter', label: 'Front counter' },
          { id: 'Full Display', label: 'Full display' },
        ],
        barFrontPositions: [
          { id: 'Top Header', label: 'Top header' },
          { id: 'Front Counter', label: 'Front counter' },
          { id: 'Full Display', label: 'Full display' },
        ],
        backPositions: [],
        backQuickBigId: 'Top Header',
        defaultFrontPlacement: 'Top Header',
        defaultBackPlacement: 'Top Header',
        placementHint: 'Brand the 31"×10.3" overhead header board or the 31.6"×30.3" molded counter body.',
      };
    default:
      return {
        hasBackSide: true,
        singleSideBadge: 'Front',
        colorLabel: productType === 'polo' || productType === 'tshirt' ? 'T-shirt colour' : 'Product colour',
        quickFrontPositions: [
          { id: 'Left Chest', label: 'Left chest' },
          { id: 'Right Chest', label: 'Right chest' },
          { id: 'Center Chest', label: 'Centre chest' },
        ],
        barFrontPositions: [
          { id: 'Left Chest', label: 'Left chest' },
          { id: 'Right Chest', label: 'Right chest' },
          { id: 'Center Chest', label: 'Centre chest' },
          { id: 'Full Front', label: 'Full front' },
        ],
        backPositions: [
          { id: 'Upper Back Center', label: 'Upper back' },
          { id: 'Full Back Center', label: 'Full back' },
        ],
        backQuickBigId: 'Upper Back Center',
        defaultFrontPlacement: 'Left Chest',
        defaultBackPlacement: 'Upper Back Center',
        placementHint: "Left / Right = the wearer's left / right chest. Each side gets its own tab above the product to edit.",
      };
  }
}

function getZoneCoordinates(productType: Product['productType'], side: 'front' | 'back', placement: string, poloYCalib: number): ZoneSpec {
  if (side === 'back') {
    if (productType === 'polo' || productType === 'tshirt') {
      if (placement === 'Full Back Center' || placement === 'Full back') {
        return { cx: 250, cy: 205 + poloYCalib, boxSize: 120, maxW: 155, maxH: 185 };
      }
      if (placement === 'Small logo') {
        return { cx: 250, cy: 154 + poloYCalib, boxSize: 64, maxW: 90, maxH: 70 };
      }
      return { cx: 250, cy: 164 + poloYCalib, boxSize: 98, maxW: 140, maxH: 110 };
    }
    if (productType === 'cap') {
      return { cx: 250, cy: 188, boxSize: 48, maxW: 88, maxH: 42 };
    }
    if (productType === 'mug') {
      if (placement.includes('Small')) {
        return { cx: 211, cy: 236, boxSize: 68, maxW: 110, maxH: 110 };
      }
      return { cx: 211, cy: 240, boxSize: 105, maxW: 170, maxH: 168 };
    }
    if (productType === 'umbrella') {
      if (placement.toLowerCase().includes('valance')) {
        return { cx: 250, cy: 219, boxSize: 38, maxW: 132, maxH: 34 };
      }
      return { cx: 250, cy: 154, boxSize: 68, maxW: 115, maxH: 74 };
    }
    return { cx: 250, cy: 210, boxSize: 105, maxW: 145, maxH: 145 };
  }

  // Front side
  if (productType === 'polo' || productType === 'tshirt') {
    if (placement === 'Right Chest' || placement === 'Right chest') {
      return { cx: 203, cy: 168 + poloYCalib, boxSize: 40, maxW: 54, maxH: 54 };
    }
    if (placement === 'Center Chest' || placement === 'Centre chest') {
      return { cx: 250, cy: 208 + poloYCalib, boxSize: 82, maxW: 118, maxH: 96 };
    }
    if (placement === 'Full Front' || placement === 'Full front') {
      return { cx: 250, cy: 268 + poloYCalib, boxSize: 118, maxW: 132, maxH: 160 };
    }
    // Left chest (wearer's left = viewer's right)
    return { cx: 297, cy: 168 + poloYCalib, boxSize: 40, maxW: 54, maxH: 54 };
  }
  if (productType === 'cap') {
    if (placement.includes('Left')) return { cx: 208, cy: 218, boxSize: 52, maxW: 82, maxH: 62 };
    if (placement.includes('Right')) return { cx: 292, cy: 218, boxSize: 52, maxW: 82, maxH: 62 };
    return { cx: 250, cy: 216, boxSize: 64, maxW: 130, maxH: 76 };
  }
  if (productType === 'mug') {
    if (placement.includes('Left')) return { cx: 225, cy: 240, boxSize: 84, maxW: 120, maxH: 155 };
    if (placement.includes('Wrap')) return { cx: 275, cy: 240, boxSize: 118, maxW: 205, maxH: 170 };
    return { cx: 289, cy: 240, boxSize: 105, maxW: 170, maxH: 168 };
  }
  if (productType === 'umbrella') {
    if (placement.toLowerCase().includes('left')) return { cx: 148, cy: 162, boxSize: 48, maxW: 72, maxH: 56 };
    if (placement.toLowerCase().includes('right')) return { cx: 352, cy: 162, boxSize: 48, maxW: 72, maxH: 56 };
    if (placement.toLowerCase().includes('valance')) return { cx: 250, cy: 219, boxSize: 38, maxW: 132, maxH: 34 };
    return { cx: 250, cy: 154, boxSize: 68, maxW: 115, maxH: 74 };
  }
  if (productType === 'canopy') {
    if (placement.toLowerCase().includes('valance') || placement.toLowerCase().includes('header')) {
      return { cx: 250, cy: 131, boxSize: 40, maxW: 228, maxH: 38 };
    }
    if (placement.toLowerCase().includes('full')) {
      return { cx: 250, cy: 328, boxSize: 112, maxW: 230, maxH: 124 };
    }
    return { cx: 250, cy: 334, boxSize: 96, maxW: 216, maxH: 114 };
  }
  if (productType === 'standee') {
    if (placement.toLowerCase().includes('top') || placement.toLowerCase().includes('header')) {
      return { cx: 250, cy: 118, boxSize: 84, maxW: 170, maxH: 92 };
    }
    if (placement.toLowerCase().includes('lower') || placement.toLowerCase().includes('strip')) {
      return { cx: 250, cy: 352, boxSize: 84, maxW: 170, maxH: 86 };
    }
    return { cx: 250, cy: 228, boxSize: 115, maxW: 174, maxH: 160 };
  }
  if (productType === 'display' || productType === 'table') {
    if (placement.toLowerCase().includes('counter')) {
      return { cx: 250, cy: 335, boxSize: 126, maxW: 224, maxH: 176 };
    }
    if (placement.toLowerCase().includes('full')) {
      return { cx: 250, cy: 335, boxSize: 148, maxW: 236, maxH: 186 };
    }
    return { cx: 250, cy: 90, boxSize: 58, maxW: 224, maxH: 62 };
  }
  return { cx: 250, cy: 240, boxSize: 90, maxW: 140, maxH: 140 };
}

function createUid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getRawLogoFromArtwork(art: CustomArtwork | null): { rawUrl: string; label: string } | null {
  if (!art) return null;
  if (art.rawDataUrl) return { rawUrl: art.rawDataUrl, label: art.text || 'Uploaded Logo' };
  if (art.type === 'image' && art.dataUrl) return { rawUrl: art.dataUrl, label: art.text || 'Uploaded Logo' };
  if (art.type === 'preset') {
    const pid = art.presetId || 'your-logo';
    return { rawUrl: rasterizePresetToDataUrl(pid, art.text), label: pid.toUpperCase() };
  }
  return null;
}

function buildInitialLayers(
  art: CustomArtwork | null,
  productType: Product['productType'],
  side: 'front' | 'back',
  placement: string,
  poloYCalib: number,
  surfaceHex: string
): StudioLayer[] {
  const zone = getZoneCoordinates(productType, side, placement, poloYCalib);
  if (!art) {
    if (side !== 'front') return [];
    const starterUrl = rasterizePresetToDataUrl('your-logo');
    return [
      {
        id: createUid('logo'),
        kind: 'logo',
        x: zone.cx,
        y: zone.cy,
        width: zone.boxSize,
        height: zone.boxSize,
        rotation: 0,
        opacity: 1,
        visible: true,
        dataUrl: starterUrl,
        isMainLogo: true,
        flipX: false,
      },
    ];
  }
  if (art.studioLayers && art.studioLayers.length > 0) {
    return art.studioLayers.map((l) => ({ ...l }));
  }
  const scale = Math.max(0.4, Math.min(2.2, art.scale || 1));
  const cx = zone.cx + ((art.x || 0) * zone.maxW) / 100;
  const cy = zone.cy + ((art.y || 0) * zone.maxH) / 100;

  if (art.type === 'text' && art.text) {
    const size = Math.round(zone.boxSize * 1.3 * scale);
    return [
      {
        id: createUid('txt'),
        kind: 'text',
        x: cx,
        y: cy,
        width: Math.max(60, size),
        height: 28,
        rotation: art.rotation || 0,
        opacity: 1,
        visible: true,
        text: art.text,
        fontSize: Math.max(10, Math.round(14 * scale)),
        fontFamily: art.fontFamily || 'Space Grotesk',
        fontWeight: '700',
        fontStyle: 'normal',
        textTransform: 'none',
        textColor: art.textColor || (isSurfaceLight(surfaceHex) ? '#111215' : '#FFFFFF'),
        letterSpacing: 0.5,
      },
    ];
  }

  const rawInfo = getRawLogoFromArtwork(art);
  if (!rawInfo) return [];
  const box = zone.boxSize * scale;
  return [
    {
      id: createUid('logo'),
      kind: 'logo',
      x: cx,
      y: cy,
      width: box,
      height: box,
      rotation: art.rotation || 0,
      opacity: 1,
      visible: true,
      dataUrl: art.dataUrl || rawInfo.rawUrl,
      isMainLogo: true,
      flipX: false,
    },
  ];
}

interface HistorySnapshot {
  frontLayers: StudioLayer[];
  backLayers: StudioLayer[];
  frontPlacement: string;
  backPlacement: string;
}

export const ProductDesignStudioModal: React.FC<ProductDesignStudioModalProps> = ({
  isOpen,
  onClose,
  product,
  selectedColor,
  onSelectColor,
  quantity,
  onQuantityChange,
  unitPrice,
  totalPrice,
  moq,
  frontArtwork,
  backArtwork,
  frontPlacement: initialFrontPlacement,
  backPlacement: initialBackPlacement,
  selectedPrintMethod,
  onSelectPrintMethod,
  uploadedFrontLogoName: initialFrontName,
  uploadedBackLogoName: initialBackName,
  initialActiveSide = 'front',
  selectedVariantLabel,
  onCommitStudioChanges,
}) => {
  const isPoloOrTshirt = product.productType === 'polo' || product.productType === 'tshirt';
  const isCap = product.productType === 'cap';
  const baseHex = selectedColor.garmentHex || selectedColor.hex || '#1A1A1E';
  const studioConfig = getProductStudioConfig(product.productType, selectedVariantLabel);

  const isTallerCropPolo =
    isPoloOrTshirt &&
    (selectedColor.name.toLowerCase().includes('navy') ||
      selectedColor.name.toLowerCase().includes('maroon') ||
      selectedColor.name.toLowerCase().includes('burgundy') ||
      selectedColor.name.toLowerCase().includes('royal') ||
      selectedColor.name.toLowerCase().includes('apple') ||
      selectedColor.name.toLowerCase().includes('lime') ||
      selectedColor.name.toLowerCase().includes('turquoise'));
  const poloYCalib = isTallerCropPolo ? 3 : 0;

  // Navigation & UI state
  const [leftTab, setLeftTab] = useState<'product' | 'text'>('product');
  const [mobileTab, setMobileTab] = useState<'canvas' | 'product' | 'text' | 'layers'>('canvas');
  const [activeSide, setActiveSide] = useState<'front' | 'back'>(
    studioConfig.hasBackSide ? initialActiveSide : 'front'
  );
  const [zoom, setZoom] = useState<number>(100);
  const [showPrintArea, setShowPrintArea] = useState<boolean>(true);
  const [cleanPreviewMode, setCleanPreviewMode] = useState<boolean>(false);
  const [isQtyPopoverOpen, setIsQtyPopoverOpen] = useState<boolean>(false);
  const [globalAppliedToast, setGlobalAppliedToast] = useState<string | null>(null);

  // Responsive ResizeObserver for exact square canvas sizing on mobile, tablet, laptop & desktop
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const [stageSquarePx, setStageSquarePx] = useState<number>(420);

  useEffect(() => {
    if (!isOpen) return;
    const el = stageContainerRef.current;
    if (!el) return;

    const updateSize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) {
        const available = Math.min(w - 12, h - 12, 540);
        setStageSquarePx(Math.max(168, Math.floor(available)));
      }
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    window.addEventListener('resize', updateSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [isOpen, mobileTab, activeSide]);

  // Accordions
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    quickDesign: true,
    logoBg: false,
    logoParts: false,
    trimEdges: false,
    magicEraser: false,
    allProducts: false,
  });
  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // Placement & Back print mode
  const [frontPlacement, setFrontPlacement] = useState<string>(
    initialFrontPlacement || studioConfig.defaultFrontPlacement
  );
  const [backPlacement, setBackPlacement] = useState<string>(
    initialBackPlacement || studioConfig.defaultBackPlacement
  );
  const [backPrintMode, setBackPrintMode] = useState<'big' | 'small' | 'none'>(
    !studioConfig.hasBackSide || !backArtwork
      ? 'none'
      : initialBackPlacement?.includes('Small')
      ? 'small'
      : 'big'
  );
  const frontSurfaceHex = getSurfaceHex(product.productType, baseHex, frontPlacement);
  const backSurfaceHex = getSurfaceHex(product.productType, baseHex, backPlacement);
  const activeSurfaceHex = activeSide === 'front' ? frontSurfaceHex : backSurfaceHex;

  // Raw uploaded / active logos per side
  const [frontRawLogo, setFrontRawLogo] = useState<string>(() => {
    const info = getRawLogoFromArtwork(frontArtwork);
    return info?.rawUrl || rasterizePresetToDataUrl('your-logo');
  });
  const [backRawLogo, setBackRawLogo] = useState<string>(() => {
    const info = getRawLogoFromArtwork(backArtwork || frontArtwork);
    return info?.rawUrl || rasterizePresetToDataUrl('your-logo');
  });
  const [frontFileName, setFrontFileName] = useState<string>(initialFrontName || 'Your_Logo_Here.png');
  const [backFileName, setBackFileName] = useState<string>(initialBackName || initialFrontName || 'Your_Logo_Here.png');
  const [backUsesSameLogoAsFront, setBackUsesSameLogoAsFront] = useState<boolean>(() => {
    if (!frontArtwork || !backArtwork) return true;
    const fInfo = getRawLogoFromArtwork(frontArtwork);
    const bInfo = getRawLogoFromArtwork(backArtwork);
    return fInfo?.rawUrl === bInfo?.rawUrl;
  });

  // Cleanup options per side
  const loadSavedGlobalCleanup = (): LogoCleanupOptions => {
    try {
      const saved = localStorage.getItem(GLOBAL_CLEANUP_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_LOGO_CLEANUP, ...parsed, hiddenPartIndices: [], eraserActions: [] };
      }
    } catch {
      // ignore storage errors
    }
    return { ...DEFAULT_LOGO_CLEANUP };
  };

  const [frontCleanup, setFrontCleanup] = useState<LogoCleanupOptions>(loadSavedGlobalCleanup);
  const [backCleanup, setBackCleanup] = useState<LogoCleanupOptions>(loadSavedGlobalCleanup);

  const activeCleanup = activeSide === 'front' ? frontCleanup : backCleanup;
  const updateActiveCleanup = (patch: Partial<LogoCleanupOptions>) => {
    if (activeSide === 'front') {
      setFrontCleanup((prev) => ({ ...prev, ...patch }));
      if (backUsesSameLogoAsFront) {
        setBackCleanup((prev) => ({ ...prev, ...patch }));
      }
    } else {
      setBackCleanup((prev) => ({ ...prev, ...patch }));
    }
  };

  // Logo Parts & Eraser base per side
  const [frontParts, setFrontParts] = useState<LogoPartItem[]>([]);
  const [backParts, setBackParts] = useState<LogoPartItem[]>([]);
  const [frontEraserBaseUrl, setFrontEraserBaseUrl] = useState<string>(frontRawLogo);
  const [backEraserBaseUrl, setBackEraserBaseUrl] = useState<string>(backRawLogo);

  const activeParts = activeSide === 'front' ? frontParts : backParts;

  // Layers per side
  const [frontLayers, setFrontLayers] = useState<StudioLayer[]>(() =>
    buildInitialLayers(
      frontArtwork,
      product.productType,
      'front',
      initialFrontPlacement || studioConfig.defaultFrontPlacement,
      poloYCalib,
      frontSurfaceHex
    )
  );
  const [backLayers, setBackLayers] = useState<StudioLayer[]>(() =>
    studioConfig.hasBackSide
      ? buildInitialLayers(
          backArtwork,
          product.productType,
          'back',
          initialBackPlacement || studioConfig.defaultBackPlacement,
          poloYCalib,
          backSurfaceHex
        )
      : []
  );
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [inlineEditingLayerId, setInlineEditingLayerId] = useState<string | null>(null);

  // Company name below logo state
  const [companyNameText, setCompanyNameText] = useState<string>('YOUR COMPANY');

  // History stack for Undo / Redo
  const [historyPast, setHistoryPast] = useState<HistorySnapshot[]>([]);
  const [historyFuture, setHistoryFuture] = useState<HistorySnapshot[]>([]);

  const pushHistory = useCallback(() => {
    setHistoryPast((prev) => [
      ...prev.slice(-24),
      {
        frontLayers: frontLayers.map((l) => ({ ...l })),
        backLayers: backLayers.map((l) => ({ ...l })),
        frontPlacement,
        backPlacement,
      },
    ]);
    setHistoryFuture([]);
  }, [frontLayers, backLayers, frontPlacement, backPlacement]);

  const handleUndo = useCallback(() => {
    if (historyPast.length === 0) return;
    const prev = historyPast[historyPast.length - 1];
    setHistoryFuture((f) => [
      {
        frontLayers: frontLayers.map((l) => ({ ...l })),
        backLayers: backLayers.map((l) => ({ ...l })),
        frontPlacement,
        backPlacement,
      },
      ...f.slice(0, 24),
    ]);
    setFrontLayers(prev.frontLayers);
    setBackLayers(prev.backLayers);
    setFrontPlacement(prev.frontPlacement);
    setBackPlacement(prev.backPlacement);
    setHistoryPast((p) => p.slice(0, -1));
    setSelectedLayerId(null);
  }, [historyPast, frontLayers, backLayers, frontPlacement, backPlacement]);

  const handleRedo = useCallback(() => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryPast((p) => [
      ...p,
      {
        frontLayers: frontLayers.map((l) => ({ ...l })),
        backLayers: backLayers.map((l) => ({ ...l })),
        frontPlacement,
        backPlacement,
      },
    ]);
    setFrontLayers(next.frontLayers);
    setBackLayers(next.backLayers);
    setFrontPlacement(next.frontPlacement);
    setBackPlacement(next.backPlacement);
    setHistoryFuture((f) => f.slice(1));
    setSelectedLayerId(null);
  }, [historyFuture, frontLayers, backLayers, frontPlacement, backPlacement]);

  // Keyboard shortcuts (Undo / Redo / Delete)
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (isTyping) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedLayerId) {
        e.preventDefault();
        pushHistory();
        if (activeSide === 'front') {
          setFrontLayers((prev) => prev.filter((l) => l.id !== selectedLayerId));
        } else {
          setBackLayers((prev) => prev.filter((l) => l.id !== selectedLayerId));
        }
        setSelectedLayerId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleUndo, handleRedo, selectedLayerId, activeSide, pushHistory]);

  // Run logo processing pipeline whenever frontRawLogo / frontCleanup / surface contrast changes
  useEffect(() => {
    let cancelled = false;
    if (!frontRawLogo) return;
    processLogoPipeline(frontRawLogo, frontCleanup, frontSurfaceHex)
      .then((res) => {
        if (cancelled) return;
        setFrontParts(res.parts);
        setFrontEraserBaseUrl(res.eraserBaseDataUrl);
        setFrontLayers((prev) => {
          const aspect = res.height > 0 ? res.width / res.height : 1;
          return prev.map((l) => {
            if (!l.isMainLogo) return l;
            const maxSide = Math.max(l.width, l.height);
            const newW = aspect >= 1 ? maxSide : maxSide * aspect;
            const newH = aspect >= 1 ? maxSide / aspect : maxSide;
            return { ...l, dataUrl: res.processedDataUrl, width: newW, height: newH };
          });
        });
      })
      .catch((err) => console.warn('Front logo pipeline error:', err));
    return () => {
      cancelled = true;
    };
  }, [frontRawLogo, frontCleanup, frontSurfaceHex]);

  useEffect(() => {
    let cancelled = false;
    if (!backRawLogo || !studioConfig.hasBackSide) return;
    processLogoPipeline(backRawLogo, backCleanup, backSurfaceHex)
      .then((res) => {
        if (cancelled) return;
        setBackParts(res.parts);
        setBackEraserBaseUrl(res.eraserBaseDataUrl);
        setBackLayers((prev) => {
          const aspect = res.height > 0 ? res.width / res.height : 1;
          return prev.map((l) => {
            if (!l.isMainLogo) return l;
            const maxSide = Math.max(l.width, l.height);
            const newW = aspect >= 1 ? maxSide : maxSide * aspect;
            const newH = aspect >= 1 ? maxSide / aspect : maxSide;
            return { ...l, dataUrl: res.processedDataUrl, width: newW, height: newH };
          });
        });
      })
      .catch((err) => console.warn('Back logo pipeline error:', err));
    return () => {
      cancelled = true;
    };
  }, [backRawLogo, backCleanup, backSurfaceHex, studioConfig.hasBackSide]);

  const activeLayers = activeSide === 'front' ? frontLayers : backLayers;
  const setActiveLayers = activeSide === 'front' ? setFrontLayers : setBackLayers;
  const activePlacement = activeSide === 'front' ? frontPlacement : backPlacement;
  const selectedLayer = activeLayers.find((l) => l.id === selectedLayerId) || null;
  const mainLogoLayer = activeLayers.find((l) => l.isMainLogo) || null;

  const activeZone = getZoneCoordinates(product.productType, activeSide, activePlacement, poloYCalib);
  const logoSizePercent = mainLogoLayer
    ? Math.round((Math.max(mainLogoLayer.width, mainLogoLayer.height) / activeZone.boxSize) * 100)
    : 100;

  const hasCompanyNameLayer = activeLayers.some((l) => l.id.startsWith(`compname-${activeSide}`));

  // Update a single layer property
  const updateLayer = (layerId: string, patch: Partial<StudioLayer>) => {
    setActiveLayers((prev) => prev.map((l) => (l.id === layerId ? { ...l, ...patch } : l)));
  };

  // Logo size slider handler
  const handleLogoSizeSlider = (pct: number) => {
    const clamped = Math.max(30, Math.min(200, pct));
    if (!mainLogoLayer) return;
    const ratio = mainLogoLayer.height > 0 ? mainLogoLayer.width / mainLogoLayer.height : 1;
    const targetMax = activeZone.boxSize * (clamped / 100);
    const newW = ratio >= 1 ? targetMax : targetMax * ratio;
    const newH = ratio >= 1 ? targetMax / ratio : targetMax;
    updateLayer(mainLogoLayer.id, { width: newW, height: newH });
  };

  // Placement change handler (repositions main logo layer cleanly to new calibrated zone)
  const handlePlacementSelect = (side: 'front' | 'back', newPlacement: string) => {
    pushHistory();
    const newZone = getZoneCoordinates(product.productType, side, newPlacement, poloYCalib);
    if (side === 'front') {
      setFrontPlacement(newPlacement);
      setFrontLayers((prev) => {
        const hasMain = prev.some((l) => l.isMainLogo);
        if (!hasMain) return prev;
        return prev.map((l) => {
          if (!l.isMainLogo) return l;
          const aspect = l.height > 0 ? l.width / l.height : 1;
          const nw = aspect >= 1 ? newZone.boxSize : newZone.boxSize * aspect;
          const nh = aspect >= 1 ? newZone.boxSize / aspect : newZone.boxSize;
          return { ...l, x: newZone.cx, y: newZone.cy, width: nw, height: nh };
        });
      });
    } else {
      setBackPlacement(newPlacement);
      if (newPlacement === 'Small logo') setBackPrintMode('small');
      else setBackPrintMode('big');

      setBackLayers((prev) => {
        const hasMain = prev.some((l) => l.isMainLogo);
        if (!hasMain) {
          // Restore back main logo if user previously selected No back print
          const newId = createUid('logo');
          return [
            ...prev,
            {
              id: newId,
              kind: 'logo',
              x: newZone.cx,
              y: newZone.cy,
              width: newZone.boxSize,
              height: newZone.boxSize,
              rotation: 0,
              opacity: 1,
              visible: true,
              dataUrl: backEraserBaseUrl || backRawLogo,
              isMainLogo: true,
            },
          ];
        }
        return prev.map((l) => {
          if (!l.isMainLogo) return l;
          const aspect = l.height > 0 ? l.width / l.height : 1;
          const nw = aspect >= 1 ? newZone.boxSize : newZone.boxSize * aspect;
          const nh = aspect >= 1 ? newZone.boxSize / aspect : newZone.boxSize;
          return { ...l, x: newZone.cx, y: newZone.cy, width: nw, height: nh };
        });
      });
    }
  };

  // Back Print Quick Design Handler
  const handleBackPrintQuick = (mode: 'big' | 'small' | 'none') => {
    setBackPrintMode(mode);
    if (mode === 'none') {
      pushHistory();
      setBackLayers((prev) => prev.filter((l) => !l.isMainLogo));
      return;
    }
    const placementTarget = mode === 'small' ? 'Small logo' : studioConfig.backQuickBigId;
    handlePlacementSelect('back', placementTarget);
  };

  // Toggle company name below logo
  const handleToggleCompanyName = () => {
    pushHistory();
    const targetId = `compname-${activeSide}`;
    if (hasCompanyNameLayer) {
      setActiveLayers((prev) => prev.filter((l) => l.id !== targetId));
      if (selectedLayerId === targetId) setSelectedLayerId(null);
    } else {
      const anchorX = mainLogoLayer ? mainLogoLayer.x : activeZone.cx;
      const anchorY = mainLogoLayer ? mainLogoLayer.y + mainLogoLayer.height / 2 + 12 : activeZone.cy + 26;
      const fontSize = Math.max(9, Math.min(18, Math.round(activeZone.boxSize * 0.22)));
      const newLayer: StudioLayer = {
        id: targetId,
        kind: 'text',
        x: anchorX,
        y: anchorY,
        width: Math.max(70, companyNameText.length * fontSize * 0.62),
        height: fontSize * 1.4,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: companyNameText,
        fontSize,
        fontFamily: 'Space Grotesk',
        fontWeight: '700',
        fontStyle: 'normal',
        textTransform: 'uppercase',
        textColor: isSurfaceLight(activeSurfaceHex) ? '#111215' : '#FFFFFF',
        letterSpacing: 1,
      };
      setActiveLayers((prev) => [...prev, newLayer]);
      setSelectedLayerId(targetId);
    }
  };

  // File upload inputs
  const logoReplaceInputRef = useRef<HTMLInputElement>(null);
  const extraImageInputRef = useRef<HTMLInputElement>(null);

  const handleUploadLogoFile = async (e: React.ChangeEvent<HTMLInputElement>, targetSide: 'front' | 'back') => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { dataUrl, file: compressed } = await compressImageFile(file, {
        maxWidth: 1000,
        maxHeight: 1000,
        quality: 0.9,
        format: 'image/png',
      });
      const name = compressed.name || file.name;
      pushHistory();
      if (targetSide === 'front') {
        setFrontRawLogo(dataUrl);
        setFrontFileName(name);
        setFrontCleanup((prev) => ({ ...prev, hiddenPartIndices: [], eraserActions: [] }));
        setFrontLayers((prev) => {
          if (prev.some((l) => l.isMainLogo)) return prev;
          const z = getZoneCoordinates(product.productType, 'front', frontPlacement, poloYCalib);
          return [
            ...prev,
            {
              id: createUid('logo'),
              kind: 'logo',
              x: z.cx,
              y: z.cy,
              width: z.boxSize,
              height: z.boxSize,
              rotation: 0,
              opacity: 1,
              visible: true,
              dataUrl,
              isMainLogo: true,
            },
          ];
        });
        if (backUsesSameLogoAsFront) {
          setBackRawLogo(dataUrl);
          setBackFileName(name);
          setBackCleanup((prev) => ({ ...prev, hiddenPartIndices: [], eraserActions: [] }));
        }
      } else {
        setBackUsesSameLogoAsFront(false);
        setBackRawLogo(dataUrl);
        setBackFileName(name);
        setBackCleanup((prev) => ({ ...prev, hiddenPartIndices: [], eraserActions: [] }));
        setBackPrintMode((m) => (m === 'none' ? 'big' : m));
        setBackLayers((prev) => {
          if (prev.some((l) => l.isMainLogo)) return prev;
          const z = getZoneCoordinates(product.productType, 'back', backPlacement, poloYCalib);
          return [
            ...prev,
            {
              id: createUid('logo'),
              kind: 'logo',
              x: z.cx,
              y: z.cy,
              width: z.boxSize,
              height: z.boxSize,
              rotation: 0,
              opacity: 1,
              visible: true,
              dataUrl,
              isMainLogo: true,
            },
          ];
        });
      }
    } catch (err) {
      console.warn('Logo upload error:', err);
    }
  };

  const handleUploadExtraImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { dataUrl } = await compressImageFile(file, {
        maxWidth: 1000,
        maxHeight: 1000,
        quality: 0.88,
        format: 'image/png',
      });
      pushHistory();
      const id = createUid('img');
      const size = Math.max(48, Math.min(90, activeZone.boxSize * 1.1));
      setActiveLayers((prev) => [
        ...prev,
        {
          id,
          kind: 'image',
          x: activeZone.cx,
          y: activeZone.cy,
          width: size,
          height: size,
          rotation: 0,
          opacity: 1,
          visible: true,
          dataUrl,
          isMainLogo: false,
          flipX: false,
        },
      ]);
      setSelectedLayerId(id);
    } catch (err) {
      console.warn('Extra image upload failed:', err);
    }
  };

  // Add Text / Curved Text / Shape helpers
  const addTextLayer = (preset: {
    text: string;
    fontSize: number;
    fontWeight: string;
    letterSpacing?: number;
    curved?: boolean;
  }) => {
    pushHistory();
    const id = createUid(preset.curved ? 'curve' : 'txt');
    const isLightSurface = isSurfaceLight(activeSurfaceHex);
    const offset = (activeLayers.length % 4) * 10 - 12;
    const newLayer: StudioLayer = {
      id,
      kind: preset.curved ? 'curved-text' : 'text',
      x: activeZone.cx,
      y: activeZone.cy + offset,
      width: Math.max(85, preset.text.length * preset.fontSize * 0.62),
      height: preset.curved ? 44 : Math.max(20, preset.fontSize * 1.4),
      rotation: 0,
      opacity: 1,
      visible: true,
      text: preset.text,
      fontSize: preset.fontSize,
      fontFamily: 'Space Grotesk',
      fontWeight: preset.fontWeight,
      fontStyle: 'normal',
      textTransform: 'none',
      textColor: isLightSurface ? '#111215' : '#FFFFFF',
      letterSpacing: preset.letterSpacing ?? 0.5,
      curve: preset.curved ? 45 : 0,
    };
    setActiveLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(id);
  };

  const addShapeLayer = (shapeType: StudioShapeType) => {
    pushHistory();
    const id = createUid('shape');
    const isLightSurface = isSurfaceLight(activeSurfaceHex);
    const defaultFill = isLightSurface ? '#18181B' : '#FF7A00';
    const w = shapeType === 'line' ? 96 : shapeType === 'pill' ? 84 : 52;
    const h = shapeType === 'line' ? 10 : shapeType === 'pill' ? 32 : 52;
    const newLayer: StudioLayer = {
      id,
      kind: 'shape',
      x: activeZone.cx,
      y: activeZone.cy,
      width: w,
      height: h,
      rotation: 0,
      opacity: 1,
      visible: true,
      shapeType,
      fillColor: shapeType === 'ring' ? 'transparent' : defaultFill,
      strokeColor: shapeType === 'ring' ? defaultFill : '#FFFFFF',
      strokeWidth: shapeType === 'ring' ? 5 : 0,
      borderRadius: shapeType === 'rect' ? 6 : 24,
    };
    setActiveLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(id);
  };

  // Interactive Canvas Drag / Resize / Rotate
  const svgRef = useRef<SVGSVGElement>(null);
  const dragStateRef = useRef<{
    mode: 'move' | 'resize' | 'rotate';
    layerId: string;
    startSvgX: number;
    startSvgY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    origFontSize: number;
    corner?: 'nw' | 'ne' | 'se' | 'sw';
    hasRecordedHistory: boolean;
  } | null>(null);

  const clientToSvgCoords = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 250, y: 250 };
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 500;
    const y = ((clientY - rect.top) / rect.height) * 500;
    return { x, y };
  };

  const startLayerDrag = (
    e: React.PointerEvent,
    layer: StudioLayer,
    mode: 'move' | 'resize' | 'rotate',
    corner?: 'nw' | 'ne' | 'se' | 'sw'
  ) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setSelectedLayerId(layer.id);
    const pt = clientToSvgCoords(e.clientX, e.clientY);
    dragStateRef.current = {
      mode,
      layerId: layer.id,
      startSvgX: pt.x,
      startSvgY: pt.y,
      origX: layer.x,
      origY: layer.y,
      origW: layer.width,
      origH: layer.height,
      origFontSize: layer.fontSize || 14,
      corner,
      hasRecordedHistory: false,
    };
  };

  const handleSvgPointerMove = (e: React.PointerEvent) => {
    const ds = dragStateRef.current;
    if (!ds) return;
    const pt = clientToSvgCoords(e.clientX, e.clientY);
    const dx = pt.x - ds.startSvgX;
    const dy = pt.y - ds.startSvgY;

    if (!ds.hasRecordedHistory && (Math.abs(dx) > 1.2 || Math.abs(dy) > 1.2)) {
      pushHistory();
      ds.hasRecordedHistory = true;
    }

    if (ds.mode === 'move') {
      updateLayer(ds.layerId, {
        x: Math.max(70, Math.min(430, ds.origX + dx)),
        y: Math.max(60, Math.min(440, ds.origY + dy)),
      });
    } else if (ds.mode === 'rotate') {
      const angRad = Math.atan2(pt.y - ds.origY, pt.x - ds.origX);
      const deg = Math.round((angRad * 180) / Math.PI + 90);
      updateLayer(ds.layerId, { rotation: ((deg + 180) % 360 + 360) % 360 - 180 });
    } else if (ds.mode === 'resize') {
      const signX = ds.corner === 'nw' || ds.corner === 'sw' ? -1 : 1;
      const signY = ds.corner === 'nw' || ds.corner === 'ne' ? -1 : 1;
      const deltaW = dx * signX * 2;
      const deltaH = dy * signY * 2;
      const targetLayer = activeLayers.find((l) => l.id === ds.layerId);
      if (!targetLayer) return;

      if (targetLayer.kind === 'shape') {
        updateLayer(ds.layerId, {
          width: Math.max(16, Math.min(280, ds.origW + deltaW)),
          height: Math.max(6, Math.min(280, ds.origH + deltaH)),
        });
      } else {
        // Aspect-ratio locked resize for logos, images, and text
        const scaleFactor = Math.max(
          0.3,
          Math.min(3.5, 1 + Math.max(deltaW / Math.max(20, ds.origW), deltaH / Math.max(20, ds.origH)) * 0.7)
        );
        updateLayer(ds.layerId, {
          width: Math.max(16, ds.origW * scaleFactor),
          height: Math.max(14, ds.origH * scaleFactor),
          ...(targetLayer.kind === 'text' || targetLayer.kind === 'curved-text'
            ? { fontSize: Math.max(7, Math.min(48, Math.round(ds.origFontSize * scaleFactor))) }
            : {}),
        });
      }
    }
  };

  const handleSvgPointerUp = () => {
    dragStateRef.current = null;
  };

  // Magic Eraser Modal state
  const [isMagicEraserOpen, setIsMagicEraserOpen] = useState(false);
  const [eraserTool, setEraserTool] = useState<'brush' | 'flood'>('brush');
  const [eraserBrushSize, setEraserBrushSize] = useState<number>(18);
  const [eraserTolerance, setEraserTolerance] = useState<number>(42);
  const [draftEraserActions, setDraftEraserActions] = useState<EraserAction[]>([]);
  const eraserCanvasRef = useRef<HTMLCanvasElement>(null);
  const eraserDrawingRef = useRef<{ active: boolean; points: Array<{ x: number; y: number }> }>({
    active: false,
    points: [],
  });

  const openMagicEraser = () => {
    setDraftEraserActions([...activeCleanup.eraserActions]);
    setIsMagicEraserOpen(true);
  };

  // Render preview inside Magic Eraser canvas
  useEffect(() => {
    if (!isMagicEraserOpen) return;
    const canvas = eraserCanvasRef.current;
    if (!canvas) return;
    const baseSrc = activeSide === 'front' ? frontEraserBaseUrl : backEraserBaseUrl;
    if (!baseSrc) return;

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      const w = 420;
      const aspect = img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 1;
      const h = Math.max(160, Math.round(aspect >= 1 ? w / aspect : w));
      canvas.width = w;
      canvas.height = aspect < 1 ? Math.round(h / aspect) : h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Replay draft actions
      for (const act of draftEraserActions) {
        if (act.type === 'brush' && act.points.length > 0) {
          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = 'rgba(0,0,0,1)';
          ctx.fillStyle = 'rgba(0,0,0,1)';
          const rPx = Math.max(2, act.radius * Math.max(canvas.width, canvas.height));
          ctx.lineWidth = rPx * 2;
          if (act.points.length === 1) {
            ctx.beginPath();
            ctx.arc(act.points[0].x * canvas.width, act.points[0].y * canvas.height, rPx, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.moveTo(act.points[0].x * canvas.width, act.points[0].y * canvas.height);
            for (let i = 1; i < act.points.length; i++) {
              ctx.lineTo(act.points[i].x * canvas.width, act.points[i].y * canvas.height);
            }
            ctx.stroke();
          }
          ctx.restore();
        } else if (act.type === 'flood') {
          const sx = Math.max(0, Math.min(canvas.width - 1, Math.round(act.x * canvas.width)));
          const sy = Math.max(0, Math.min(canvas.height - 1, Math.round(act.y * canvas.height)));
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          const startIdx = (sy * canvas.width + sx) * 4;
          if (data[startIdx + 3] < 10) continue;
          const sr = data[startIdx];
          const sg = data[startIdx + 1];
          const sb = data[startIdx + 2];
          const tol = act.tolerance || 42;
          const visited = new Uint8Array(canvas.width * canvas.height);
          const queue = new Int32Array(canvas.width * canvas.height);
          let head = 0;
          let tail = 0;
          const startPos = sy * canvas.width + sx;
          queue[tail++] = startPos;
          visited[startPos] = 1;
          while (head < tail) {
            const pos = queue[head++];
            data[pos * 4 + 3] = 0;
            const px = pos % canvas.width;
            const py = (pos - px) / canvas.width;
            const nbs = [
              px > 0 ? pos - 1 : -1,
              px < canvas.width - 1 ? pos + 1 : -1,
              py > 0 ? pos - canvas.width : -1,
              py < canvas.height - 1 ? pos + canvas.width : -1,
            ];
            for (let k = 0; k < 4; k++) {
              const np = nbs[k];
              if (np < 0 || visited[np]) continue;
              const ni = np * 4;
              if (data[ni + 3] < 10) continue;
              if (Math.hypot(data[ni] - sr, data[ni + 1] - sg, data[ni + 2] - sb) <= tol) {
                visited[np] = 1;
                queue[tail++] = np;
              }
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }
      }
    };
    img.src = baseSrc;
    return () => {
      cancelled = true;
    };
  }, [isMagicEraserOpen, activeSide, frontEraserBaseUrl, backEraserBaseUrl, draftEraserActions]);

  const getNormCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = eraserCanvasRef.current!;
    const rect = c.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  };

  const handleEraserPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getNormCanvasPoint(e);
    if (eraserTool === 'flood') {
      setDraftEraserActions((prev) => [...prev, { type: 'flood', x: pt.x, y: pt.y, tolerance: eraserTolerance }]);
      return;
    }
    eraserDrawingRef.current = { active: true, points: [pt] };
    // Draw live visual preview directly on canvas while dragging
    const c = eraserCanvasRef.current;
    const ctx = c?.getContext('2d');
    if (c && ctx) {
      const rNorm = eraserBrushSize / 420;
      const rPx = Math.max(2, rNorm * Math.max(c.width, c.height));
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(pt.x * c.width, pt.y * c.height, rPx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  const handleEraserPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!eraserDrawingRef.current.active || eraserTool !== 'brush') return;
    const pt = getNormCanvasPoint(e);
    const pts = eraserDrawingRef.current.points;
    const prevPt = pts[pts.length - 1];
    pts.push(pt);
    const c = eraserCanvasRef.current;
    const ctx = c?.getContext('2d');
    if (c && ctx && prevPt) {
      const rNorm = eraserBrushSize / 420;
      const rPx = Math.max(2, rNorm * Math.max(c.width, c.height));
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = rPx * 2;
      ctx.beginPath();
      ctx.moveTo(prevPt.x * c.width, prevPt.y * c.height);
      ctx.lineTo(pt.x * c.width, pt.y * c.height);
      ctx.stroke();
      ctx.restore();
    }
  };

  const handleEraserPointerUp = () => {
    if (!eraserDrawingRef.current.active) return;
    const pts = [...eraserDrawingRef.current.points];
    eraserDrawingRef.current = { active: false, points: [] };
    if (pts.length > 0) {
      setDraftEraserActions((prev) => [
        ...prev,
        { type: 'brush', points: pts, radius: eraserBrushSize / 420 },
      ]);
    }
  };

  // Garment photographic asset resolution (matches ProductMockupCanvas)
  const isPlainVariant = !selectedColor.tippingHex;
  const poloImages = isPoloOrTshirt
    ? isPlainVariant
      ? getPlainPoloImages(selectedColor.name, selectedColor.hex || selectedColor.garmentHex)
      : getTippingPoloImages(selectedColor.name, selectedColor.hex || selectedColor.garmentHex)
    : null;
  const poloPhotoUrl = isPoloOrTshirt
    ? activeSide === 'back'
      ? selectedColor.imageBack || poloImages?.back
      : selectedColor.imageFront || poloImages?.front
    : undefined;
  const capImages = isCap ? getCapImages(selectedColor.name, selectedColor.hex || selectedColor.garmentHex) : null;
  const capPhotoUrl = isCap ? selectedColor.imageFront || capImages?.front : undefined;

  // Build final CustomArtwork objects & commit back to ProductDetailView
  const commitAndClose = () => {
    const toArtwork = (
      layers: StudioLayer[],
      rawLogoUrl: string,
      side: 'front' | 'back',
      placement: string,
      prevArt: CustomArtwork | null
    ): CustomArtwork | null => {
      const visibleLayers = layers.filter((l) => l.visible !== false);
      if (visibleLayers.length === 0) return null;

      const main = visibleLayers.find((l) => l.isMainLogo);
      const z = getZoneCoordinates(product.productType, side, placement, poloYCalib);
      const relX = main ? Math.max(-35, Math.min(35, ((main.x - z.cx) / z.maxW) * 100)) : 0;
      const relY = main ? Math.max(-35, Math.min(35, ((main.y - z.cy) / z.maxH) * 100)) : 0;
      const relScale = main ? Math.max(0.4, Math.min(2.2, Math.max(main.width, main.height) / z.boxSize)) : 1;

      return {
        type: main ? 'image' : prevArt?.type || 'text',
        dataUrl: main?.dataUrl || prevArt?.dataUrl,
        rawDataUrl: rawLogoUrl,
        text: prevArt?.text,
        fontFamily: prevArt?.fontFamily,
        textColor: prevArt?.textColor,
        presetId: prevArt?.presetId,
        x: relX,
        y: relY,
        scale: relScale,
        rotation: main?.rotation || 0,
        studioLayers: visibleLayers,
      };
    };

    onCommitStudioChanges({
      frontArtwork: toArtwork(frontLayers, frontRawLogo, 'front', frontPlacement, frontArtwork),
      backArtwork: studioConfig.hasBackSide
        ? toArtwork(backLayers, backRawLogo, 'back', backPlacement, backArtwork)
        : null,
      frontPlacement,
      backPlacement,
      uploadedFrontLogoName: frontFileName,
      uploadedBackLogoName: backFileName,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 h-[100dvh] bg-[#F4F6F9] flex flex-col overflow-hidden select-none">
      {/* Hidden File Inputs */}
      <input
        ref={logoReplaceInputRef}
        type="file"
        accept="image/*,.svg"
        className="hidden"
        onChange={(e) => handleUploadLogoFile(e, activeSide)}
      />
      <input
        ref={extraImageInputRef}
        type="file"
        accept="image/*,.svg"
        className="hidden"
        onChange={handleUploadExtraImage}
      />

      {/* =================================================================== */}
      {/* TOP BAR                                                             */}
      {/* =================================================================== */}
      <header className="min-h-[52px] sm:h-16 bg-white border-b border-zinc-200 px-2 sm:px-5 py-1.5 sm:py-0 flex items-center justify-between gap-1.5 sm:gap-3 shrink-0 shadow-2xs">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={commitAndClose}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-800 transition-colors cursor-pointer shrink-0 shadow-2xs"
            title="Back to product"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to product</span>
            <span className="hidden xs:inline sm:hidden">Back</span>
          </button>

          <div className="min-w-0 leading-tight flex-1">
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#FF7A00]">CUSTOMIZE</div>
            <div className="text-xs sm:text-sm font-bold text-zinc-900 truncate">{product.name}</div>
            <div className="hidden sm:block text-[11px] text-zinc-500 truncate">
              {activeSide === 'front' ? frontFileName : backFileName}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 relative">
          {/* Pricing + Edit Quantity Pill */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 bg-white border border-orange-300 rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 shadow-2xs">
            <div className="text-right leading-tight hidden md:block">
              <div className="text-[11px] text-zinc-600 font-medium tabular-nums">
                {quantity} pcs · {formatCurrencyINR(unitPrice)} each
              </div>
              <div className="text-sm font-extrabold text-zinc-900 font-mono tabular-nums">
                {formatCurrencyINR(totalPrice)}
              </div>
            </div>
            <div className="md:hidden text-[11px] sm:text-xs font-extrabold text-zinc-900 font-mono tabular-nums whitespace-nowrap">
              <span className="hidden sm:inline">{quantity}× · </span>
              {formatCurrencyINR(totalPrice)}
            </div>
            <button
              type="button"
              onClick={() => setIsQtyPopoverOpen((o) => !o)}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#FF7A00] hover:bg-[#e56d00] text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Edit quantity & print method"
            >
              <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>

          {isQtyPopoverOpen && (
            <div className="absolute right-0 sm:right-20 top-11 sm:top-14 w-[min(272px,calc(100vw-20px))] bg-white rounded-xl shadow-xl border border-zinc-200 p-4 z-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900">Quick Order Settings</span>
                <button
                  type="button"
                  onClick={() => setIsQtyPopoverOpen(false)}
                  className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-600 block mb-1">
                  Quantity (Min {moq} pcs)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onQuantityChange(Math.max(moq, quantity - 1))}
                    className="w-8 h-8 rounded-lg border border-zinc-200 font-bold hover:bg-zinc-50 cursor-pointer"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={moq}
                    value={quantity}
                    onChange={(e) => onQuantityChange(Math.max(moq, Number(e.target.value) || moq))}
                    className="flex-1 text-center border border-zinc-200 rounded-lg py-1 text-xs font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => onQuantityChange(quantity + 1)}
                    className="w-8 h-8 rounded-lg border border-zinc-200 font-bold hover:bg-zinc-50 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-600 block mb-1">Print Method</label>
                <div className="grid grid-cols-1 gap-1">
                  {product.printMethods.map((pm) => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => onSelectPrintMethod(pm)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-left border cursor-pointer ${
                        selectedPrintMethod === pm
                          ? 'bg-orange-50 border-[#FF7A00] text-[#FF7A00]'
                          : 'bg-white border-zinc-200 text-zinc-700'
                      }`}
                    >
                      {pm}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Done Button */}
          <button
            type="button"
            onClick={commitAndClose}
            className="bg-[#FF7A00] hover:bg-[#e56d00] text-white font-bold text-xs sm:text-sm px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl shadow-sm flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Done</span>
          </button>
        </div>
      </header>

      {/* Global confirmation toast */}
      {globalAppliedToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 max-w-[90vw] text-center">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{globalAppliedToast}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* MAIN STUDIO WORKSPACE (RESPONSIVE 4-PANE / MOBILE DRAWER LAYOUT)    */}
      {/* =================================================================== */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* 1. FAR-LEFT ICON RAIL (Desktop & Laptop lg+) */}
        <nav className="hidden lg:flex lg:w-14 xl:w-16 bg-white border-r border-zinc-200 flex-col items-center justify-start py-3 px-1.5 xl:px-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setLeftTab('product')}
            className={`w-11 xl:w-12 py-2 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-all cursor-pointer border ${
              leftTab === 'product'
                ? 'bg-orange-50 border-[#FF7A00]/60 text-[#FF7A00] shadow-2xs'
                : 'bg-white border-transparent text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800'
            }`}
          >
            <Shirt className="w-4 h-4" />
            <span>Product</span>
          </button>

          <button
            type="button"
            onClick={() => setLeftTab('text')}
            className={`w-11 xl:w-12 py-2 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-bold leading-tight text-center transition-all cursor-pointer border ${
              leftTab === 'text'
                ? 'bg-orange-50 border-[#FF7A00]/60 text-[#FF7A00] shadow-2xs'
                : 'bg-white border-transparent text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>Text & add</span>
          </button>
        </nav>

        {/* 2. LEFT SIDEBAR CONTROLS (Desktop sidebar + Mobile/Tablet bottom sheet) */}
        <aside
          className={`${
            mobileTab === 'product' || mobileTab === 'text' ? 'block' : 'hidden'
          } lg:block order-2 lg:order-none w-full lg:w-[236px] xl:w-[276px] bg-white border-t lg:border-t-0 lg:border-r border-zinc-200 overflow-y-auto shrink-0 max-h-[40dvh] sm:max-h-[44dvh] lg:max-h-none shadow-[0_-6px_20px_rgba(15,23,42,0.08)] lg:shadow-none`}
        >
          {/* Mobile Drawer Sticky Header */}
          <div className="lg:hidden sticky top-0 z-10 bg-white/95 backdrop-blur-xs border-b border-zinc-100 px-3.5 py-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-700">
              {leftTab === 'product' ? 'Product & Logo Controls' : 'Text, Shapes & Graphics'}
            </span>
            <button
              type="button"
              onClick={() => setMobileTab('canvas')}
              className="text-[11px] font-bold text-[#FF7A00] bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg cursor-pointer"
            >
              View Canvas
            </button>
          </div>
          {leftTab === 'product' ? (
            <div className="p-2.5 sm:p-3 space-y-2.5 sm:space-y-3">
              <div className="hidden lg:block text-[10px] font-bold uppercase tracking-wider text-zinc-400">PRODUCT</div>

              {/* Side Logo Info Card */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-2.5 space-y-1.5">
                {activeSide === 'front' ? (
                  <>
                    <div className="text-xs font-bold text-zinc-900">Logo on the front side</div>
                    <p className="text-[10.5px] text-zinc-500 leading-snug">
                      {studioConfig.hasBackSide
                        ? 'Want a different logo on the back? Tap Back above and upload it there.'
                        : 'Upload your print-ready vector or PNG logo and drag it into position.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => logoReplaceInputRef.current?.click()}
                      className="w-full py-2 px-3 rounded-lg bg-white border border-zinc-300 hover:border-[#FF7A00] text-xs font-bold text-zinc-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#FF7A00]" />
                      <span>Upload / Replace Front Logo</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-xs font-bold text-zinc-900">Logo on the back side</div>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      {backUsesSameLogoAsFront
                        ? 'Same logo as the front. Need a different logo here? Upload it — only this side changes.'
                        : 'Custom back-side logo active. Front side stays unchanged.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => logoReplaceInputRef.current?.click()}
                      className="w-full py-2 px-3 rounded-lg bg-[#FF7A00] hover:bg-[#e56d00] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload a different logo</span>
                    </button>
                    {!backUsesSameLogoAsFront && (
                      <button
                        type="button"
                        onClick={() => {
                          setBackUsesSameLogoAsFront(true);
                          setBackRawLogo(frontRawLogo);
                          setBackFileName(frontFileName);
                          setBackCleanup({ ...frontCleanup });
                        }}
                        className="w-full text-[11px] font-semibold text-[#FF7A00] hover:underline flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Reset to match front logo</span>
                      </button>
                    )}
                  </>
                )}

                {/* Quick Sample Preset Logos */}
                <div className="pt-1 border-t border-zinc-200/80">
                  <div className="text-[10px] font-semibold text-zinc-500 mb-1">Sample Corporate Logos:</div>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { id: 'your-logo', label: 'Your Logo' },
                      { id: 'hyperscale', label: 'Hyperscale' },
                      { id: 'zepto', label: 'Zepto' },
                      { id: 'finedge', label: 'Finedge' },
                      { id: 'acme', label: 'Acme' },
                    ].map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          const png = rasterizePresetToDataUrl(preset.id);
                          pushHistory();
                          if (activeSide === 'front') {
                            setFrontRawLogo(png);
                            setFrontFileName(`${preset.id}_logo.png`);
                            setFrontCleanup((p) => ({ ...p, hiddenPartIndices: [], eraserActions: [] }));
                            if (backUsesSameLogoAsFront) {
                              setBackRawLogo(png);
                              setBackFileName(`${preset.id}_logo.png`);
                              setBackCleanup((p) => ({ ...p, hiddenPartIndices: [], eraserActions: [] }));
                            }
                          } else {
                            setBackUsesSameLogoAsFront(false);
                            setBackRawLogo(png);
                            setBackFileName(`${preset.id}_logo.png`);
                            setBackCleanup((p) => ({ ...p, hiddenPartIndices: [], eraserActions: [] }));
                          }
                        }}
                        className="px-2 py-0.5 rounded border border-zinc-200 bg-white hover:border-[#FF7A00] text-[10px] font-bold text-zinc-700 cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Garment Color Swatches */}
              {product.colors.length > 0 && (
                <div className="space-y-1.5 pb-2.5 border-b border-zinc-200">
                  <div className="text-xs font-bold text-zinc-900">
                    {studioConfig.colorLabel}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {product.colors.map((c) => {
                      const isSel = c.name === selectedColor.name;
                      return (
                        <button
                          key={c.name}
                          type="button"
                          title={c.name}
                          onClick={() => onSelectColor(c)}
                          className={`w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full border transition-transform cursor-pointer ${
                            isSel
                              ? 'ring-2 ring-[#FF7A00] ring-offset-1 border-zinc-900 scale-110'
                              : 'border-zinc-300 hover:scale-110'
                          }`}
                          style={{ backgroundColor: c.hex || c.garmentHex }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ACCORDION 1: Quick design */}
              <div className="border-b border-zinc-200 pb-2.5">
                <button
                  type="button"
                  onClick={() => toggleSection('quickDesign')}
                  className="w-full flex items-center justify-between text-xs font-bold text-zinc-900 py-1 cursor-pointer"
                >
                  <span>Quick design</span>
                  {openSections.quickDesign ? (
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  )}
                </button>

                {openSections.quickDesign && (
                  <div className="mt-2 space-y-2.5">
                    {/* Front position */}
                    <div>
                      <div className="text-[11px] font-semibold text-zinc-600 mb-1.5">Front position</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {studioConfig.quickFrontPositions.map((pos) => (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() => {
                              setActiveSide('front');
                              handlePlacementSelect('front', pos.id);
                            }}
                            className={`py-1.5 px-1.5 rounded-lg border text-[11px] font-semibold leading-tight text-center transition-all cursor-pointer ${
                              frontPlacement === pos.id
                                ? 'border-[#FF7A00] bg-orange-50 text-[#FF7A00]'
                                : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                            }`}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Back print (only on dual-sided products) */}
                    {studioConfig.hasBackSide && (
                      <div>
                        <div className="text-[11px] font-semibold text-zinc-600 mb-1.5">Back print</div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: 'big' as const, label: 'Big logo' },
                            { id: 'small' as const, label: 'Small logo' },
                            { id: 'none' as const, label: 'No back print' },
                          ].map((bp) => (
                            <button
                              key={bp.id}
                              type="button"
                              onClick={() => {
                                setActiveSide('back');
                                handleBackPrintQuick(bp.id);
                              }}
                              className={`py-1.5 px-1.5 rounded-lg border text-[11px] font-semibold leading-tight text-center transition-all cursor-pointer ${
                                backPrintMode === bp.id
                                  ? 'border-[#FF7A00] bg-orange-50 text-[#FF7A00]'
                                  : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                              }`}
                            >
                              {bp.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Print colour */}
                    <div>
                      <div className="text-[11px] font-semibold text-zinc-600 mb-1.5">Print colour</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(
                          [
                            { id: 'full', label: 'Full Colour' },
                            { id: 'white', label: 'White' },
                            { id: 'black', label: 'Black' },
                            { id: 'auto', label: 'Auto' },
                          ] as Array<{ id: PrintColorMode; label: string }>
                        ).map((cm) => (
                          <button
                            key={cm.id}
                            type="button"
                            onClick={() => updateActiveCleanup({ printColorMode: cm.id })}
                            className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold text-center transition-all cursor-pointer ${
                              activeCleanup.printColorMode === cm.id
                                ? 'border-[#FF7A00] bg-orange-50 text-[#FF7A00]'
                                : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                            }`}
                          >
                            {cm.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      {studioConfig.placementHint}
                    </p>

                    {/* Add company name below logo Toggle */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <button
                          type="button"
                          onClick={handleToggleCompanyName}
                          className={`w-9 h-5 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                            hasCompanyNameLayer ? 'bg-[#FF7A00]' : 'bg-zinc-300'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                              hasCompanyNameLayer ? 'left-4.5' : 'left-0.5'
                            }`}
                          />
                        </button>
                        <span className="text-[11px] font-bold text-zinc-800 leading-tight">
                          Add company name below logo
                        </span>
                      </label>
                      {hasCompanyNameLayer && (
                        <input
                          type="text"
                          value={
                            activeLayers.find((l) => l.id === `compname-${activeSide}`)?.text ||
                            companyNameText
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            setCompanyNameText(val);
                            updateLayer(`compname-${activeSide}`, { text: val });
                          }}
                          placeholder="Company Name"
                          className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-hidden focus:border-[#FF7A00]"
                        />
                      )}
                    </div>

                    {/* Logo Size Slider */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-zinc-700">Logo size</span>
                        <div className="flex items-center border border-zinc-200 rounded-md px-1.5 py-0.5 bg-zinc-50">
                          <input
                            type="number"
                            min={30}
                            max={200}
                            value={logoSizePercent}
                            onChange={(e) => handleLogoSizeSlider(Number(e.target.value) || 100)}
                            className="w-10 text-right text-[11px] font-bold text-zinc-800 bg-transparent focus:outline-hidden"
                          />
                          <span className="text-[10px] text-zinc-500 ml-0.5">%</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={30}
                        max={200}
                        value={logoSizePercent}
                        onChange={(e) => handleLogoSizeSlider(Number(e.target.value))}
                        className="w-full accent-[#FF7A00] cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ACCORDION 2: Logo background */}
              <div className="border-b border-zinc-200 pb-3">
                <button
                  type="button"
                  onClick={() => toggleSection('logoBg')}
                  className="w-full flex items-center justify-between text-xs font-bold text-zinc-900 py-1 cursor-pointer"
                >
                  <span>Logo background</span>
                  {openSections.logoBg ? (
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  )}
                </button>

                {openSections.logoBg && (
                  <div className="mt-2.5 space-y-3">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <button
                        type="button"
                        onClick={() => updateActiveCleanup({ removeBg: !activeCleanup.removeBg })}
                        className={`w-9 h-5 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                          activeCleanup.removeBg ? 'bg-[#FF7A00]' : 'bg-zinc-300'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                            activeCleanup.removeBg ? 'left-4.5' : 'left-0.5'
                          }`}
                        />
                      </button>
                      <span className="text-[11px] font-bold text-zinc-800 leading-tight">
                        Remove logo background
                      </span>
                    </label>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-zinc-600 leading-tight">
                          Background removal strength
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={activeCleanup.bgStrength}
                          onChange={(e) =>
                            updateActiveCleanup({
                              bgStrength: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                            })
                          }
                          className="w-12 text-center text-[11px] font-bold border border-zinc-200 rounded-md py-0.5"
                        />
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        disabled={!activeCleanup.removeBg}
                        value={activeCleanup.bgStrength}
                        onChange={(e) => updateActiveCleanup({ bgStrength: Number(e.target.value) })}
                        className="w-full accent-[#FF7A00] cursor-pointer disabled:opacity-40"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ACCORDION 3: Logo parts */}
              <div className="border-b border-zinc-200 pb-3">
                <button
                  type="button"
                  onClick={() => toggleSection('logoParts')}
                  className="w-full flex items-center justify-between text-xs font-bold text-zinc-900 py-1 cursor-pointer"
                >
                  <span>Logo parts</span>
                  {openSections.logoParts ? (
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  )}
                </button>

                {openSections.logoParts && (
                  <div className="mt-2.5 space-y-3">
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      The logo is split into its parts. Tap a part to remove it from the design (e.g. a tagline the customer does not want).
                    </p>

                    {/* Split Part Cards with Checkerboard */}
                    {activeParts.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {activeParts.map((part) => {
                          const isHidden = activeCleanup.hiddenPartIndices.includes(part.index);
                          return (
                            <button
                              key={part.index}
                              type="button"
                              onClick={() => {
                                const nextHidden = isHidden
                                  ? activeCleanup.hiddenPartIndices.filter((i) => i !== part.index)
                                  : [...activeCleanup.hiddenPartIndices, part.index];
                                updateActiveCleanup({ hiddenPartIndices: nextHidden });
                              }}
                              className={`rounded-xl border p-2 flex flex-col items-center justify-between gap-1.5 transition-all cursor-pointer ${
                                isHidden
                                  ? 'border-zinc-200 bg-zinc-100 opacity-55'
                                  : 'border-zinc-200 bg-white hover:border-[#FF7A00]'
                              }`}
                            >
                              <div
                                className="w-full h-14 rounded-lg flex items-center justify-center p-1 overflow-hidden"
                                style={{
                                  backgroundImage:
                                    'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)',
                                  backgroundSize: '10px 10px',
                                  backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0',
                                }}
                              >
                                <img
                                  src={part.dataUrl}
                                  alt={`Logo part ${part.index + 1}`}
                                  className="max-w-full max-h-full object-contain"
                                />
                              </div>
                              <span className="text-[10px] font-bold text-zinc-700">
                                {isHidden ? 'Tap to show' : 'Tap to hide'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-[11px] text-zinc-400 italic py-2">
                        Upload or select a logo to inspect individual parts.
                      </div>
                    )}

                    {/* Layout 2x2 Options */}
                    <div>
                      <div className="text-[11px] font-semibold text-zinc-600 mb-1.5">Layout</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(
                          [
                            { id: 'as-uploaded', label: 'As uploaded' },
                            { id: 'top-to-bottom', label: 'Top to bottom' },
                            { id: 'icon-left', label: 'Icon left' },
                            { id: 'icon-right', label: 'Icon right' },
                          ] as Array<{ id: LogoLayoutMode; label: string }>
                        ).map((lm) => (
                          <button
                            key={lm.id}
                            type="button"
                            onClick={() => updateActiveCleanup({ layoutMode: lm.id })}
                            className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold leading-tight text-center transition-all cursor-pointer ${
                              activeCleanup.layoutMode === lm.id
                                ? 'border-[#FF7A00] bg-orange-50 text-[#FF7A00]'
                                : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                            }`}
                          >
                            {lm.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Space between parts slider */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <div className="text-[11px] font-semibold text-zinc-700">Space between parts</div>
                          <div className="text-[10px] text-[#FF7A00] font-semibold">
                            {activeCleanup.partSpacing < 75
                              ? 'Tight'
                              : activeCleanup.partSpacing > 130
                              ? 'Wide'
                              : 'Normal'}
                          </div>
                        </div>
                        <input
                          type="number"
                          min={0}
                          max={200}
                          value={activeCleanup.partSpacing}
                          onChange={(e) =>
                            updateActiveCleanup({
                              partSpacing: Math.max(0, Math.min(200, Number(e.target.value) || 100)),
                            })
                          }
                          className="w-12 text-center text-[11px] font-bold border border-zinc-200 rounded-md py-0.5"
                        />
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={200}
                        value={activeCleanup.partSpacing}
                        onChange={(e) => updateActiveCleanup({ partSpacing: Number(e.target.value) })}
                        className="w-full accent-[#FF7A00] cursor-pointer"
                      />
                    </div>

                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      Rearrange the logo: put the icon above the text, or the text lines next to the icon. Works with hidden parts too.
                    </p>
                  </div>
                )}
              </div>

              {/* ACCORDION 4: Trim edges */}
              <div className="border-b border-zinc-200 pb-3">
                <button
                  type="button"
                  onClick={() => toggleSection('trimEdges')}
                  className="w-full flex items-center justify-between text-xs font-bold text-zinc-900 py-1 cursor-pointer"
                >
                  <span>Trim edges</span>
                  {openSections.trimEdges ? (
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  )}
                </button>

                {openSections.trimEdges && (
                  <div className="mt-2.5 space-y-2.5">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <button
                        type="button"
                        onClick={() => updateActiveCleanup({ trimEdges: !activeCleanup.trimEdges })}
                        className={`w-9 h-5 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                          activeCleanup.trimEdges ? 'bg-[#FF7A00]' : 'bg-zinc-300'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                            activeCleanup.trimEdges ? 'left-4.5' : 'left-0.5'
                          }`}
                        />
                      </button>
                      <span className="text-[11px] font-bold text-zinc-800">Auto-trim empty margins</span>
                    </label>
                    <div>
                      <div className="flex justify-between text-[11px] text-zinc-600 mb-1">
                        <span>Edge padding</span>
                        <span className="font-bold">{activeCleanup.trimPadding}px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={28}
                        disabled={!activeCleanup.trimEdges}
                        value={activeCleanup.trimPadding}
                        onChange={(e) => updateActiveCleanup({ trimPadding: Number(e.target.value) })}
                        className="w-full accent-[#FF7A00] cursor-pointer disabled:opacity-40"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ACCORDION 5: Magic eraser */}
              <div className="border-b border-zinc-200 pb-3">
                <button
                  type="button"
                  onClick={() => toggleSection('magicEraser')}
                  className="w-full flex items-center justify-between text-xs font-bold text-zinc-900 py-1 cursor-pointer"
                >
                  <span>Magic eraser</span>
                  {openSections.magicEraser ? (
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  )}
                </button>

                {openSections.magicEraser && (
                  <div className="mt-2 space-y-2.5">
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      Remove anything from the logo — a website, a line, a small icon. <strong>Brush:</strong> paint over it. <strong>Tap a piece:</strong> tap one part to delete only that colour area.
                    </p>
                    <button
                      type="button"
                      onClick={openMagicEraser}
                      className="w-full py-2 px-3 rounded-xl border border-orange-300 bg-orange-50/70 hover:bg-orange-100 text-[#FF7A00] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      <span>Start magic eraser</span>
                    </button>
                    {activeCleanup.eraserActions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => updateActiveCleanup({ eraserActions: [] })}
                        className="w-full text-[11px] text-zinc-500 hover:text-red-600 font-semibold cursor-pointer"
                      >
                        Reset {activeCleanup.eraserActions.length} eraser edit(s)
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ACCORDION 6: All products */}
              <div className="pb-2">
                <button
                  type="button"
                  onClick={() => toggleSection('allProducts')}
                  className="w-full flex items-center justify-between text-xs font-bold text-zinc-900 py-1 cursor-pointer"
                >
                  <span>All products</span>
                  {openSections.allProducts ? (
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  )}
                </button>

                {openSections.allProducts && (
                  <div className="mt-2 space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          localStorage.setItem(GLOBAL_CLEANUP_STORAGE_KEY, JSON.stringify(activeCleanup));
                          setGlobalAppliedToast('Logo clean-up preset saved for all products!');
                          setTimeout(() => setGlobalAppliedToast(null), 2600);
                        } catch {
                          setGlobalAppliedToast('Saved clean-up settings!');
                          setTimeout(() => setGlobalAppliedToast(null), 2600);
                        }
                      }}
                      className="w-full py-2 px-3 rounded-xl border border-orange-300 bg-orange-50/70 hover:bg-orange-100 text-[#FF7A00] text-[11px] font-bold text-center transition-colors cursor-pointer"
                    >
                      Use this logo clean-up on all products
                    </button>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      Copies hidden parts, background removal, trim, layout and eraser to every product. Colours and sizing stay per product.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* TAB 2: TEXT & ADD */
            <div className="p-3.5 space-y-5">
              {/* TEXT PRESETS */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">TEXT</div>
                <button
                  type="button"
                  onClick={() =>
                    addTextLayer({ text: 'YOUR HEADING', fontSize: 18, fontWeight: '800', letterSpacing: 1 })
                  }
                  className="w-full text-left px-3 py-2.5 rounded-xl border border-zinc-200 bg-white hover:border-[#FF7A00] transition-colors cursor-pointer"
                >
                  <div className="text-sm font-extrabold text-zinc-900">Add a heading</div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addTextLayer({ text: 'Your text here', fontSize: 13, fontWeight: '600', letterSpacing: 0.4 })
                  }
                  className="w-full text-left px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:border-[#FF7A00] transition-colors cursor-pointer"
                >
                  <div className="text-xs font-bold text-zinc-800">Add text</div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addTextLayer({ text: 'Small caption text', fontSize: 10, fontWeight: '500', letterSpacing: 0.2 })
                  }
                  className="w-full text-left px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:border-[#FF7A00] transition-colors cursor-pointer"
                >
                  <div className="text-[11px] font-medium text-zinc-700">Add small text</div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addTextLayer({
                      text: 'TMT • CEMENT • MATERIAL',
                      fontSize: 10,
                      fontWeight: '800',
                      letterSpacing: 0.8,
                    })
                  }
                  className="w-full text-left px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:border-[#FF7A00] transition-colors cursor-pointer"
                >
                  <div className="text-[11px] font-extrabold text-zinc-900">TMT • CEMENT • MATERIAL</div>
                  <div className="text-[10px] text-zinc-400">Words with dots</div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addTextLayer({ text: '+91 98765 43210', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 })
                  }
                  className="w-full text-left px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:border-[#FF7A00] transition-colors cursor-pointer"
                >
                  <div className="text-xs font-bold text-zinc-900">+91 98765 43210</div>
                  <div className="text-[10px] text-zinc-400">Phone number</div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addTextLayer({ text: 'www.yourbrand.com', fontSize: 11, fontWeight: '700', letterSpacing: 0.4 })
                  }
                  className="w-full text-left px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:border-[#FF7A00] transition-colors cursor-pointer"
                >
                  <div className="text-xs font-bold text-zinc-900">www.yourbrand.com</div>
                  <div className="text-[10px] text-zinc-400">Website</div>
                </button>
              </div>

              {/* ADD ELEMENTS */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">ADD</div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (mainLogoLayer) {
                        setSelectedLayerId(mainLogoLayer.id);
                      } else {
                        pushHistory();
                        const id = createUid('logo');
                        setActiveLayers((prev) => [
                          ...prev,
                          {
                            id,
                            kind: 'logo',
                            x: activeZone.cx,
                            y: activeZone.cy,
                            width: activeZone.boxSize,
                            height: activeZone.boxSize,
                            rotation: 0,
                            opacity: 1,
                            visible: true,
                            dataUrl: activeSide === 'front' ? frontEraserBaseUrl : backEraserBaseUrl,
                            isMainLogo: true,
                          },
                        ]);
                        setSelectedLayerId(id);
                      }
                    }}
                    className="p-2 rounded-xl border border-zinc-200 bg-white hover:border-[#FF7A00] flex flex-col items-center justify-center gap-1 text-center cursor-pointer"
                  >
                    <ImagePlus className="w-4 h-4 text-zinc-700" />
                    <span className="text-[10px] font-semibold text-zinc-700">Logo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      addTextLayer({ text: 'COMPANY NAME', fontSize: 12, fontWeight: '800', letterSpacing: 1 })
                    }
                    className="p-2 rounded-xl border border-zinc-200 bg-white hover:border-[#FF7A00] flex flex-col items-center justify-center gap-1 text-center cursor-pointer"
                  >
                    <Type className="w-4 h-4 text-zinc-700" />
                    <span className="text-[10px] font-semibold text-zinc-700 leading-tight">Company name</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      addTextLayer({
                        text: 'YOUR BRAND ARCH',
                        fontSize: 12,
                        fontWeight: '800',
                        letterSpacing: 1.5,
                        curved: true,
                      })
                    }
                    className="p-2 rounded-xl border border-zinc-200 bg-white hover:border-[#FF7A00] flex flex-col items-center justify-center gap-1 text-center cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-zinc-700" />
                    <span className="text-[10px] font-semibold text-zinc-700 leading-tight">Curved text</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => extraImageInputRef.current?.click()}
                    className="p-2 rounded-xl border border-zinc-200 bg-white hover:border-[#FF7A00] flex flex-col items-center justify-center gap-1 text-center cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-zinc-700" />
                    <span className="text-[10px] font-semibold text-zinc-700 leading-tight">Upload image</span>
                  </button>
                </div>
              </div>

              {/* SHAPES */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Shapes</div>
                <div className="grid grid-cols-6 gap-1">
                  <button
                    type="button"
                    title="Rectangle"
                    onClick={() => addShapeLayer('rect')}
                    className="aspect-square rounded-lg border border-zinc-200 bg-white hover:border-[#FF7A00] flex items-center justify-center cursor-pointer"
                  >
                    <div className="w-4 h-3 bg-slate-800 rounded-[2px]" />
                  </button>
                  <button
                    type="button"
                    title="Pill"
                    onClick={() => addShapeLayer('pill')}
                    className="aspect-square rounded-lg border border-zinc-200 bg-white hover:border-[#FF7A00] flex items-center justify-center cursor-pointer"
                  >
                    <div className="w-4 h-2.5 bg-slate-800 rounded-full" />
                  </button>
                  <button
                    type="button"
                    title="Circle"
                    onClick={() => addShapeLayer('circle')}
                    className="aspect-square rounded-lg border border-zinc-200 bg-white hover:border-[#FF7A00] flex items-center justify-center cursor-pointer"
                  >
                    <div className="w-3.5 h-3.5 bg-slate-800 rounded-full" />
                  </button>
                  <button
                    type="button"
                    title="Ring"
                    onClick={() => addShapeLayer('ring')}
                    className="aspect-square rounded-lg border border-zinc-200 bg-white hover:border-[#FF7A00] flex items-center justify-center cursor-pointer"
                  >
                    <div className="w-3.5 h-3.5 border-2 border-slate-800 rounded-full" />
                  </button>
                  <button
                    type="button"
                    title="Triangle"
                    onClick={() => addShapeLayer('triangle')}
                    className="aspect-square rounded-lg border border-zinc-200 bg-white hover:border-[#FF7A00] flex items-center justify-center cursor-pointer"
                  >
                    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-slate-800">
                      <polygon points="8,2 15,14 1,14" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    title="Line"
                    onClick={() => addShapeLayer('line')}
                    className="aspect-square rounded-lg border border-zinc-200 bg-white hover:border-[#FF7A00] flex items-center justify-center cursor-pointer"
                  >
                    <div className="w-4 h-0.5 bg-slate-800" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* 3. CENTER GARMENT STAGE */}
        <section
          className="order-1 lg:order-none flex-1 min-w-0 min-h-0 bg-[#EFF2F6] relative flex flex-col justify-between p-2 sm:p-3 lg:p-4 overflow-hidden"
          onClick={() => {
            setSelectedLayerId(null);
            setInlineEditingLayerId(null);
          }}
        >
          {/* Floating Top Controls */}
          <div
            className="flex items-center justify-between gap-1 sm:gap-2 z-20 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Undo / Redo */}
            <div className="flex items-center gap-0.5 bg-white border border-zinc-200 rounded-xl p-0.5 sm:p-1 shadow-2xs shrink-0">
              <button
                type="button"
                disabled={historyPast.length === 0}
                onClick={handleUndo}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-zinc-700 hover:bg-zinc-100 disabled:opacity-35 cursor-pointer"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={historyFuture.length === 0}
                onClick={handleRedo}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-zinc-700 hover:bg-zinc-100 disabled:opacity-35 cursor-pointer"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Front / Back Switcher (or Single-Side Active Badge) */}
            {studioConfig.hasBackSide ? (
              <div className="flex items-center gap-0.5 sm:gap-1 bg-white border border-zinc-200 rounded-xl p-0.5 sm:p-1 shadow-2xs shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSide('front');
                    setSelectedLayerId(null);
                  }}
                  className={`px-2 sm:px-3.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    activeSide === 'front' ? 'bg-[#0F172A] text-white shadow-2xs' : 'text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <span>Front</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      frontLayers.some((l) => l.visible !== false) ? 'bg-[#FF7A00]' : 'bg-zinc-300'
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSide('back');
                    setSelectedLayerId(null);
                  }}
                  className={`px-2 sm:px-3.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    activeSide === 'back' ? 'bg-[#0F172A] text-white shadow-2xs' : 'text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <span>Back</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      backLayers.some((l) => l.visible !== false) ? 'bg-[#FF7A00]' : 'bg-zinc-300'
                    }`}
                  />
                </button>
              </div>
            ) : (
              <div className="bg-white border border-zinc-200 rounded-xl px-2.5 sm:px-3.5 py-1 shadow-2xs shrink-0 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF7A00]" />
                <span className="text-[11px] sm:text-xs font-bold text-[#0F172A] whitespace-nowrap">
                  {studioConfig.singleSideBadge}
                </span>
              </div>
            )}

            {/* Zoom & Print Area / Clean Preview */}
            <div className="flex items-center gap-0.5 bg-white border border-zinc-200 rounded-xl p-0.5 sm:p-1 shadow-2xs shrink-0">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(60, z - 15))}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="hidden sm:inline-block text-[11px] font-bold text-zinc-800 w-10 text-center tabular-nums">
                {zoom}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(175, z + 15))}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-zinc-200 mx-0.5" />
              <button
                type="button"
                onClick={() => setShowPrintArea((v) => !v)}
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  showPrintArea && !cleanPreviewMode
                    ? 'bg-orange-50 text-[#FF7A00]'
                    : 'text-zinc-500 hover:bg-zinc-100'
                }`}
                title="Toggle Print Area Guide"
              >
                <SquareDashedBottom className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setCleanPreviewMode((v) => !v);
                  setSelectedLayerId(null);
                }}
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  cleanPreviewMode ? 'bg-[#0F172A] text-white' : 'text-zinc-600 hover:bg-zinc-100'
                }`}
                title="Clean Preview (hide guides & handles)"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive SVG Garment Canvas (ResizeObserver Exact Pixel Square Sizing) */}
          <div
            ref={stageContainerRef}
            className="flex-1 min-h-0 w-full flex overflow-auto py-1 sm:py-2"
          >
            <div
              className="m-auto shrink-0 bg-white rounded-2xl shadow-lg border border-zinc-200/80 aspect-square flex items-center justify-center overflow-hidden transition-[width,height] duration-150"
              style={{
                width: `${Math.round(stageSquarePx * (zoom / 100))}px`,
                height: `${Math.round(stageSquarePx * (zoom / 100))}px`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedLayerId(null);
                setInlineEditingLayerId(null);
              }}
            >
              <svg
                ref={svgRef}
                viewBox="0 0 500 500"
                className="w-full h-full touch-none"
                onPointerMove={handleSvgPointerMove}
                onPointerUp={handleSvgPointerUp}
                onPointerLeave={handleSvgPointerUp}
              >
                {/* Studio Radial Background & Shared Gradients */}
                <defs>
                  <radialGradient id="studioStageBg" cx="50%" cy="45%" r="65%">
                    <stop offset="0%" stopColor="#F8FAFC" />
                    <stop offset="100%" stopColor="#E5E9F0" />
                  </radialGradient>
                  <linearGradient id="studioBodyShade" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.16" />
                    <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.0" />
                    <stop offset="100%" stopColor="#000000" stopOpacity="0.25" />
                  </linearGradient>
                  <linearGradient id="studioCylinderGleam" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#000000" stopOpacity="0.4" />
                    <stop offset="25%" stopColor="#FFFFFF" stopOpacity="0.18" />
                    <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.0" />
                    <stop offset="85%" stopColor="#000000" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
                  </linearGradient>
                  <filter id="studioSoftShadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#000000" floodOpacity="0.16" />
                  </filter>
                </defs>
                <rect x="0" y="0" width="500" height="500" fill="url(#studioStageBg)" />

                {/* Garment / Product Visual Stage (Matched 1:1 with ProductMockupCanvas) */}
                {isPoloOrTshirt && poloPhotoUrl ? (
                  <image
                    href={poloPhotoUrl}
                    x="50"
                    y="15"
                    width="400"
                    height="470"
                    preserveAspectRatio="xMidYMid meet"
                  />
                ) : isCap && capPhotoUrl && activeSide === 'front' ? (
                  <image
                    href={capPhotoUrl}
                    x="60"
                    y="65"
                    width="380"
                    height="350"
                    preserveAspectRatio="xMidYMid meet"
                  />
                ) : isCap && activeSide === 'back' ? (
                  <g filter="url(#studioSoftShadow)">
                    <path
                      d="M170 260 Q175 140 250 140 Q325 140 330 260 Z"
                      fill={baseHex}
                      stroke="#000000"
                      strokeOpacity="0.25"
                      strokeWidth="2"
                    />
                    <path
                      d="M170 260 Q175 140 250 140 Q325 140 330 260 Z"
                      fill="url(#studioBodyShade)"
                    />
                    <path
                      d="M160 260 Q250 248 340 260 Q325 276 250 282 Q175 276 160 260 Z"
                      fill={baseHex}
                      stroke="#000000"
                      strokeOpacity="0.3"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M205 258 Q250 210 295 258 Z"
                      fill="#EFF2F6"
                      stroke="#000000"
                      strokeOpacity="0.25"
                      strokeWidth="1.5"
                    />
                    <rect x="200" y="248" width="100" height="13" rx="3" fill="#18181B" stroke="#3F3F46" strokeWidth="1" />
                    {[208, 218, 228, 238, 248, 258, 268, 278, 288].map((cx) => (
                      <circle key={cx} cx={cx} cy="254" r="1.8" fill="#71717A" />
                    ))}
                    <circle cx="250" cy="140" r="5" fill="#27272A" />
                    <line x1="250" y1="140" x2="250" y2="210" stroke="#000000" strokeOpacity="0.25" strokeWidth="1.5" />
                  </g>
                ) : product.productType === 'mug' ? (
                  <image
                    href={
                      activeSide === 'back'
                        ? '/assets/mug/mug_back_blank.webp'
                        : '/assets/aistudio/Blank_White_Ceramic_Mug_b82bfadb.webp'
                    }
                    x="10"
                    y="70"
                    width="480"
                    height="340"
                    preserveAspectRatio="xMidYMid meet"
                  />
                ) : product.productType === 'umbrella' ? (
                  <g filter="url(#studioSoftShadow)">
                    <rect x="244" y="210" width="12" height="196" rx="3" fill="#CBD5E1" stroke="#64748B" strokeWidth="1" />
                    <rect x="246" y="210" width="4" height="196" fill="#F8FAFC" fillOpacity="0.7" />
                    <rect x="240" y="294" width="20" height="14" rx="3" fill="#94A3B8" stroke="#475569" strokeWidth="1" />
                    <circle cx="256" cy="301" r="2.2" fill="#1E293B" />
                    <path d="M244 388 L194 448 L203 451 L248 400 Z" fill="#CBD5E1" stroke="#64748B" strokeWidth="1" />
                    <path d="M256 388 L306 448 L297 451 L252 400 Z" fill="#CBD5E1" stroke="#64748B" strokeWidth="1" />
                    <rect x="246" y="395" width="8" height="44" rx="2" fill="#94A3B8" stroke="#475569" strokeWidth="1" />
                    <circle cx="198" cy="449" r="4" fill="#18181B" />
                    <circle cx="302" cy="449" r="4" fill="#18181B" />
                    <circle cx="250" cy="439" r="4" fill="#18181B" />
                    <line x1="215" y1="424" x2="285" y2="424" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
                    <rect x="239" y="382" width="22" height="14" rx="3" fill="#94A3B8" stroke="#475569" strokeWidth="1" />
                    <path d="M74 202 Q250 182 426 202 L420 218 Q250 202 80 218 Z" fill="#0F172A" fillOpacity="0.22" />
                    <path d="M250 82 Q145 104 75 196 L168 196 Q204 128 250 82 Z" fill={baseHex} stroke="#000000" strokeOpacity="0.14" strokeWidth="1.2" />
                    <path d="M250 82 Q355 104 425 196 L332 196 Q296 128 250 82 Z" fill={baseHex} stroke="#000000" strokeOpacity="0.14" strokeWidth="1.2" />
                    <path d="M250 82 Q204 128 168 196 L332 196 Q296 128 250 82 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.2" />
                    <path d="M75 196 Q145 104 250 82 Q355 104 425 196 Z" fill="url(#studioBodyShade)" fillOpacity="0.35" />
                    <path d="M75 196 L168 196 L168 238 Q122 243 75 236 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.2" />
                    <path d="M168 196 L332 196 L332 242 Q250 247 168 242 Z" fill={baseHex} stroke="#000000" strokeOpacity="0.18" strokeWidth="1.2" />
                    <path d="M332 196 L425 196 L425 236 Q378 243 332 238 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.2" />
                    <circle cx="75" cy="197" r="3" fill="#CBD5E1" />
                    <circle cx="168" cy="197" r="2.5" fill="#CBD5E1" />
                    <circle cx="332" cy="197" r="2.5" fill="#CBD5E1" />
                    <circle cx="425" cy="197" r="3" fill="#CBD5E1" />
                    <circle cx="250" cy="76" r="7.5" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.2" />
                    <circle cx="248" cy="74" r="2.5" fill="#FFFFFF" />
                  </g>
                ) : product.productType === 'canopy' ? (
                  <g filter="url(#studioSoftShadow)">
                    <rect x="132" y="152" width="236" height="236" fill="#0B162C" fillOpacity="0.88" />
                    <rect x="150" y="152" width="8" height="235" fill="#1E293B" />
                    <rect x="342" y="152" width="8" height="235" fill="#1E293B" />
                    <line x1="150" y1="272" x2="350" y2="272" stroke="#334155" strokeWidth="4" />
                    <polygon points="250,48 112,108 388,108" fill="#1E3A68" stroke="#0F1F3D" strokeWidth="1.5" />
                    <polygon points="250,48 250,108 388,108" fill="#132645" fillOpacity="0.45" />
                    <rect x="116" y="108" width="268" height="46" rx="2" fill="#162B4D" stroke="#0F1F3D" strokeWidth="1.5" />
                    <line x1="118" y1="114" x2="382" y2="114" stroke="#FFFFFF" strokeOpacity="0.18" strokeDasharray="3 3" strokeWidth="1" />
                    <line x1="118" y1="148" x2="382" y2="148" stroke="#FFFFFF" strokeOpacity="0.18" strokeDasharray="3 3" strokeWidth="1" />
                    <rect x="116" y="154" width="12" height="270" rx="2" fill="#18181B" stroke="#3F3F46" strokeWidth="1" />
                    <rect x="372" y="154" width="12" height="270" rx="2" fill="#18181B" stroke="#3F3F46" strokeWidth="1" />
                    <rect x="114" y="208" width="16" height="10" rx="2" fill="#27272A" />
                    <rect x="370" y="208" width="16" height="10" rx="2" fill="#27272A" />
                    <ellipse cx="122" cy="426" rx="14" ry="5" fill="#18181B" stroke="#52525B" strokeWidth="1" />
                    <ellipse cx="378" cy="426" rx="14" ry="5" fill="#18181B" stroke="#52525B" strokeWidth="1" />
                    <rect x="128" y="266" width="244" height="138" rx="2" fill="#162B4D" stroke="#0F1F3D" strokeWidth="1.5" />
                    <rect x="128" y="266" width="244" height="138" rx="2" fill="url(#studioBodyShade)" fillOpacity="0.4" />
                    <line x1="130" y1="273" x2="370" y2="273" stroke="#FFFFFF" strokeOpacity="0.22" strokeDasharray="3 3" strokeWidth="1" />
                    <line x1="130" y1="397" x2="370" y2="397" stroke="#FFFFFF" strokeOpacity="0.18" strokeDasharray="3 3" strokeWidth="1" />
                    {selectedVariantLabel && (
                      <g>
                        <rect x="206" y="434" width="88" height="20" rx="10" fill="#0F172A" />
                        <text x="250" y="447" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="700" fontFamily="monospace">
                          {selectedVariantLabel} · 7 ft H
                        </text>
                      </g>
                    )}
                  </g>
                ) : product.productType === 'standee' ? (
                  <g filter="url(#studioSoftShadow)">
                    <rect x="247" y="42" width="6" height="20" rx="2" fill="#27272A" />
                    <rect x="172" y="438" width="24" height="16" rx="4" fill="#18181B" stroke="#3F3F46" strokeWidth="1" />
                    <rect x="304" y="438" width="24" height="16" rx="4" fill="#18181B" stroke="#3F3F46" strokeWidth="1" />
                    <rect x="136" y="410" width="228" height="32" rx="12" fill="#18181B" stroke="#3F3F46" strokeWidth="1.5" />
                    <rect x="136" y="410" width="228" height="11" rx="6" fill="#FFFFFF" fillOpacity="0.08" />
                    <circle cx="144" cy="426" r="10" fill="#27272A" stroke="#52525B" strokeWidth="1" />
                    <circle cx="356" cy="426" r="10" fill="#27272A" stroke="#52525B" strokeWidth="1" />
                    <rect x="150" y="56" width="200" height="356" fill="#121318" stroke="#27272A" strokeWidth="1.5" />
                    <rect x="150" y="56" width="200" height="356" fill="url(#studioBodyShade)" fillOpacity="0.28" />
                    <rect x="142" y="46" width="216" height="14" rx="6" fill="#18181B" stroke="#3F3F46" strokeWidth="1.2" />
                    <rect x="240" y="45" width="20" height="16" rx="3" fill="#27272A" />
                  </g>
                ) : product.productType === 'display' || product.productType === 'table' ? (
                  <g filter="url(#studioSoftShadow)">
                    <rect x="154" y="126" width="12" height="94" fill="#CBD5E1" stroke="#64748B" strokeWidth="1" />
                    <rect x="157" y="126" width="4" height="94" fill="#F8FAFC" />
                    <rect x="334" y="126" width="12" height="94" fill="#CBD5E1" stroke="#64748B" strokeWidth="1" />
                    <rect x="337" y="126" width="4" height="94" fill="#F8FAFC" />
                    <rect x="124" y="52" width="252" height="76" rx="8" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.8" />
                    <rect x="124" y="52" width="252" height="76" rx="8" fill="url(#studioBodyShade)" fillOpacity="0.14" />
                    <rect x="112" y="218" width="276" height="16" rx="7" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5" />
                    <rect x="120" y="234" width="260" height="206" rx="6" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
                    <rect x="120" y="234" width="260" height="206" rx="6" fill="url(#studioCylinderGleam)" fillOpacity="0.2" />
                    <rect x="114" y="434" width="272" height="14" rx="6" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1.5" />
                  </g>
                ) : (
                  <g>
                    <rect
                      x="145"
                      y="90"
                      width="210"
                      height="320"
                      rx="28"
                      fill={baseHex}
                      stroke="#000000"
                      strokeOpacity="0.2"
                      strokeWidth="2"
                    />
                  </g>
                )}

                {/* Dashed Print Area Guide */}
                {showPrintArea && !cleanPreviewMode && (
                  <g className="pointer-events-none">
                    {isPoloOrTshirt && activeSide === 'front' ? (
                      <>
                        {/* U-shaped Polo Front Print Area avoiding button placket */}
                        <path
                          d="M 184 148 L 236 148 L 236 226 L 264 226 L 264 148 L 316 148 L 316 408 L 184 408 Z"
                          fill="none"
                          stroke="#CBD5E1"
                          strokeOpacity="0.7"
                          strokeWidth="1.2"
                          strokeDasharray="4 4"
                        />
                        <text
                          x="184"
                          y="142"
                          fill="#FFFFFF"
                          stroke="#0F172A"
                          strokeWidth="0.4"
                          fontSize="9"
                          fontWeight="700"
                        >
                          Print area
                        </text>
                      </>
                    ) : isPoloOrTshirt && activeSide === 'back' ? (
                      <>
                        <rect
                          x="180"
                          y="108"
                          width="140"
                          height="300"
                          fill="none"
                          stroke="#CBD5E1"
                          strokeOpacity="0.7"
                          strokeWidth="1.2"
                          strokeDasharray="4 4"
                        />
                        <text
                          x="180"
                          y="102"
                          fill="#FFFFFF"
                          stroke="#0F172A"
                          strokeWidth="0.4"
                          fontSize="9"
                          fontWeight="700"
                        >
                          Print area
                        </text>
                      </>
                    ) : (
                      <>
                        <rect
                          x={activeZone.cx - activeZone.maxW / 2}
                          y={activeZone.cy - activeZone.maxH / 2}
                          width={activeZone.maxW}
                          height={activeZone.maxH}
                          fill="none"
                          stroke="#CBD5E1"
                          strokeOpacity="0.7"
                          strokeWidth="1.2"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={activeZone.cx - activeZone.maxW / 2}
                          y={activeZone.cy - activeZone.maxH / 2 - 5}
                          fill="#FF7A00"
                          fontSize="8.5"
                          fontWeight="700"
                        >
                          Print area
                        </text>
                      </>
                    )}
                  </g>
                )}

                {/* Render All Studio Layers */}
                {activeLayers
                  .filter((l) => l.visible !== false)
                  .map((layer) => {
                    const isSelected = !cleanPreviewMode && selectedLayerId === layer.id;
                    const halfW = layer.width / 2;
                    const halfH = layer.height / 2;
                    const curveVal = layer.curve || 0;
                    const pathId = `curve-${layer.id}`;
                    const displayText =
                      layer.textTransform === 'uppercase'
                        ? (layer.text || '').toUpperCase()
                        : layer.text || '';

                    return (
                      <g
                        key={layer.id}
                        transform={`translate(${layer.x}, ${layer.y}) rotate(${layer.rotation})`}
                        opacity={layer.opacity ?? 1}
                        className="cursor-move"
                        onPointerDown={(e) => startLayerDrag(e, layer, 'move')}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLayerId(layer.id);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (layer.kind === 'text' || layer.kind === 'curved-text') {
                            setSelectedLayerId(layer.id);
                            setInlineEditingLayerId(layer.id);
                          }
                        }}
                      >
                        {/* 1. Logo / Image */}
                        {(layer.kind === 'logo' || layer.kind === 'image') && layer.dataUrl && (
                          <g transform={layer.flipX ? 'scale(-1, 1)' : undefined}>
                            <image
                              href={layer.dataUrl}
                              x={-halfW}
                              y={-halfH}
                              width={layer.width}
                              height={layer.height}
                              preserveAspectRatio="xMidYMid meet"
                            />
                          </g>
                        )}

                        {/* 2. Plain Text */}
                        {layer.kind === 'text' && (
                          <text
                            x={0}
                            y={(layer.fontSize || 14) * 0.34}
                            textAnchor="middle"
                            fill={layer.textColor || '#FFFFFF'}
                            fontSize={layer.fontSize || 14}
                            fontFamily={layer.fontFamily || 'Space Grotesk'}
                            fontWeight={layer.fontWeight || '700'}
                            fontStyle={layer.fontStyle || 'normal'}
                            letterSpacing={layer.letterSpacing ?? 0.5}
                          >
                            {displayText}
                          </text>
                        )}

                        {/* 3. Curved Text */}
                        {layer.kind === 'curved-text' && (
                          <g>
                            <defs>
                              <path
                                id={pathId}
                                d={`M ${-halfW} ${curveVal > 0 ? 10 : -10} Q 0 ${-curveVal * 0.75} ${halfW} ${
                                  curveVal > 0 ? 10 : -10
                                }`}
                              />
                            </defs>
                            <text
                              fill={layer.textColor || '#FFFFFF'}
                              fontSize={layer.fontSize || 13}
                              fontFamily={layer.fontFamily || 'Space Grotesk'}
                              fontWeight={layer.fontWeight || '700'}
                              fontStyle={layer.fontStyle || 'normal'}
                              letterSpacing={layer.letterSpacing ?? 1}
                              textAnchor="middle"
                            >
                              <textPath href={`#${pathId}`} startOffset="50%">
                                {displayText}
                              </textPath>
                            </text>
                          </g>
                        )}

                        {/* 4. Shapes */}
                        {layer.kind === 'shape' && (
                          <>
                            {layer.shapeType === 'rect' && (
                              <rect
                                x={-halfW}
                                y={-halfH}
                                width={layer.width}
                                height={layer.height}
                                rx={layer.borderRadius ?? 6}
                                fill={layer.fillColor || '#FF7A00'}
                                stroke={layer.strokeColor || 'none'}
                                strokeWidth={layer.strokeWidth || 0}
                              />
                            )}
                            {layer.shapeType === 'pill' && (
                              <rect
                                x={-halfW}
                                y={-halfH}
                                width={layer.width}
                                height={layer.height}
                                rx={Math.min(halfW, halfH)}
                                fill={layer.fillColor || '#FF7A00'}
                                stroke={layer.strokeColor || 'none'}
                                strokeWidth={layer.strokeWidth || 0}
                              />
                            )}
                            {layer.shapeType === 'circle' && (
                              <ellipse
                                cx={0}
                                cy={0}
                                rx={halfW}
                                ry={halfH}
                                fill={layer.fillColor || '#FF7A00'}
                                stroke={layer.strokeColor || 'none'}
                                strokeWidth={layer.strokeWidth || 0}
                              />
                            )}
                            {layer.shapeType === 'ring' && (
                              <ellipse
                                cx={0}
                                cy={0}
                                rx={Math.max(4, halfW - (layer.strokeWidth || 4) / 2)}
                                ry={Math.max(4, halfH - (layer.strokeWidth || 4) / 2)}
                                fill="none"
                                stroke={layer.strokeColor || layer.fillColor || '#FF7A00'}
                                strokeWidth={layer.strokeWidth || 5}
                              />
                            )}
                            {layer.shapeType === 'triangle' && (
                              <polygon
                                points={`0,${-halfH} ${halfW},${halfH} ${-halfW},${halfH}`}
                                fill={layer.fillColor || '#FF7A00'}
                                stroke={layer.strokeColor || 'none'}
                                strokeWidth={layer.strokeWidth || 0}
                              />
                            )}
                            {layer.shapeType === 'line' && (
                              <rect
                                x={-halfW}
                                y={-Math.max(1.5, halfH / 2)}
                                width={layer.width}
                                height={Math.max(3, layer.height)}
                                rx={2}
                                fill={layer.fillColor || '#FF7A00'}
                              />
                            )}
                          </>
                        )}

                        {/* Selection Box, 4 Resize Corners, Top Rotation Handle */}
                        {isSelected && (
                          <g>
                            <rect
                              x={-halfW - 3}
                              y={-halfH - 3}
                              width={layer.width + 6}
                              height={layer.height + 6}
                              fill="none"
                              stroke="#FF7A00"
                              strokeWidth="1.2"
                              strokeDasharray="3 2"
                            />
                            {/* Rotation stem & handle */}
                            <line
                              x1={0}
                              y1={-halfH - 3}
                              x2={0}
                              y2={-halfH - 18}
                              stroke="#FF7A00"
                              strokeWidth="1.2"
                            />
                            <circle
                              cx={0}
                              cy={-halfH - 20}
                              r={12}
                              fill="transparent"
                              className="cursor-grab"
                              onPointerDown={(e) => startLayerDrag(e, layer, 'rotate')}
                            />
                            <circle
                              cx={0}
                              cy={-halfH - 20}
                              r={5}
                              fill="#FFFFFF"
                              stroke="#FF7A00"
                              strokeWidth="1.6"
                              className="cursor-grab pointer-events-none"
                            />

                            {/* 4 Corner Handles with enlarged touch hit-targets */}
                            {(
                              [
                                { k: 'nw' as const, cx: -halfW - 3, cy: -halfH - 3, cur: 'cursor-nwse-resize' },
                                { k: 'ne' as const, cx: halfW + 3, cy: -halfH - 3, cur: 'cursor-nesw-resize' },
                                { k: 'se' as const, cx: halfW + 3, cy: halfH + 3, cur: 'cursor-nwse-resize' },
                                { k: 'sw' as const, cx: -halfW - 3, cy: halfH + 3, cur: 'cursor-nesw-resize' },
                              ]
                            ).map((c) => (
                              <g key={c.k}>
                                <rect
                                  x={c.cx - 10}
                                  y={c.cy - 10}
                                  width={20}
                                  height={20}
                                  fill="transparent"
                                  className={c.cur}
                                  onPointerDown={(e) => startLayerDrag(e, layer, 'resize', c.k)}
                                />
                                <rect
                                  x={c.cx - 4}
                                  y={c.cy - 4}
                                  width={8}
                                  height={8}
                                  rx={1.5}
                                  fill="#FFFFFF"
                                  stroke="#FF7A00"
                                  strokeWidth="1.5"
                                  className={`${c.cur} pointer-events-none`}
                                />
                              </g>
                            ))}
                          </g>
                        )}
                      </g>
                    );
                  })}
              </svg>
            </div>
          </div>

          {/* Inline Text Edit Bar on Double Click */}
          {inlineEditingLayerId && selectedLayer && (selectedLayer.kind === 'text' || selectedLayer.kind === 'curved-text') && (
            <div
              className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-white border-2 border-[#FF7A00] rounded-xl shadow-xl px-3 py-2 flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                autoFocus
                type="text"
                value={selectedLayer.text || ''}
                onChange={(e) => updateLayer(selectedLayer.id, { text: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') setInlineEditingLayerId(null);
                }}
                className="text-xs font-bold text-zinc-900 border border-zinc-200 rounded-lg px-2.5 py-1 w-52 focus:outline-hidden focus:border-[#FF7A00]"
              />
              <button
                type="button"
                onClick={() => setInlineEditingLayerId(null)}
                className="px-2.5 py-1 rounded-lg bg-[#FF7A00] text-white text-xs font-bold cursor-pointer"
              >
                OK
              </button>
            </div>
          )}

          {/* Bottom Logo Position Bar */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 z-20 shrink-0 pt-1"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[10px] sm:text-[11px] font-semibold text-zinc-500 whitespace-nowrap">
              Logo position
            </span>
            <div className="flex items-center sm:flex-wrap sm:justify-center gap-1.5 overflow-x-auto max-w-full no-scrollbar px-1 py-0.5">
              {activeSide === 'front'
                ? studioConfig.barFrontPositions.map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => handlePlacementSelect('front', pos.id)}
                      className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        frontPlacement === pos.id
                          ? 'border-[#FF7A00] bg-orange-50 text-zinc-900 shadow-2xs'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                      }`}
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-[3px] border ${
                          frontPlacement === pos.id
                            ? 'border-[#FF7A00] bg-[#FF7A00]/20'
                            : 'border-zinc-400'
                        }`}
                      />
                      <span>{pos.label}</span>
                    </button>
                  ))
                : studioConfig.backPositions.map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => handlePlacementSelect('back', pos.id)}
                      className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        backPlacement === pos.id
                          ? 'border-[#FF7A00] bg-orange-50 text-zinc-900 shadow-2xs'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                      }`}
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-[3px] border ${
                          backPlacement === pos.id
                            ? 'border-[#FF7A00] bg-[#FF7A00]/20'
                            : 'border-zinc-400'
                        }`}
                      />
                      <span>{pos.label}</span>
                    </button>
                  ))}
            </div>
          </div>

          {/* Mobile Quick Selected-Layer Action Pill (when canvas is full view and layer selected) */}
          {mobileTab === 'canvas' && selectedLayer && !cleanPreviewMode && (
            <div
              className="lg:hidden mt-1.5 mx-auto w-full max-w-md bg-white border border-orange-300 rounded-xl px-2.5 py-1.5 shadow-md flex items-center justify-between gap-2 z-20 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-[11px] font-bold text-zinc-800 truncate">
                {selectedLayer.isMainLogo
                  ? 'Brand Logo'
                  : selectedLayer.text || (selectedLayer.shapeType ? `Shape (${selectedLayer.shapeType})` : 'Layer')}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    pushHistory();
                    updateLayer(selectedLayer.id, { x: activeZone.cx, y: activeZone.cy });
                  }}
                  className="px-2 py-1 rounded-lg border border-zinc-200 text-[11px] font-semibold text-zinc-700 cursor-pointer"
                >
                  Center
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('layers')}
                  className="px-2.5 py-1 rounded-lg bg-[#FF7A00] text-white text-[11px] font-bold cursor-pointer"
                >
                  Edit
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 4. RIGHT LAYER INSPECTOR PANEL (Desktop sidebar + Mobile/Tablet bottom sheet) */}
        <aside
          className={`${
            mobileTab === 'layers' ? 'block' : 'hidden'
          } lg:block order-2 lg:order-none w-full lg:w-[224px] xl:w-[268px] bg-white border-t lg:border-t-0 lg:border-l border-zinc-200 p-3 sm:p-3.5 overflow-y-auto shrink-0 max-h-[40dvh] sm:max-h-[44dvh] lg:max-h-none space-y-3.5 shadow-[0_-6px_20px_rgba(15,23,42,0.08)] lg:shadow-none`}
        >
          {/* Mobile Drawer Sticky Header */}
          <div className="lg:hidden flex items-center justify-between pb-2 border-b border-zinc-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-700">
              Layers & Properties
            </span>
            <button
              type="button"
              onClick={() => setMobileTab('canvas')}
              className="text-[11px] font-bold text-[#FF7A00] bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg cursor-pointer"
            >
              View Canvas
            </button>
          </div>
          {!selectedLayer ? (
            <>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 space-y-1.5">
                <div className="text-xs font-bold text-zinc-900">
                  Click any layer on the product to edit it.
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Drag to move · corners to resize · top handle to rotate. Double-click text to type.
                </p>
              </div>

              {/* Quick Clickable Layers Stack */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    <span>{activeSide === 'front' ? 'Front' : 'Back'} Layers ({activeLayers.length})</span>
                  </span>
                </div>
                {activeLayers.length === 0 ? (
                  <div className="text-[11px] text-zinc-400 italic py-2">
                    No layers on this side. Use Text & add or upload a logo.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {activeLayers.map((l) => (
                      <div
                        key={l.id}
                        onClick={() => setSelectedLayerId(l.id)}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl border border-zinc-200 hover:border-[#FF7A00] bg-white cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-700 shrink-0 uppercase">
                            {l.kind === 'logo' ? 'LG' : l.kind === 'image' ? 'IM' : l.kind === 'shape' ? 'SH' : 'TX'}
                          </span>
                          <span className="text-xs font-semibold text-zinc-800 truncate">
                            {l.isMainLogo
                              ? 'Brand Logo'
                              : l.text || (l.shapeType ? `Shape (${l.shapeType})` : 'Custom Image')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => updateLayer(l.id, { visible: l.visible === false })}
                            className="p-1 rounded text-zinc-400 hover:text-zinc-800 cursor-pointer"
                            title={l.visible === false ? 'Show layer' : 'Hide layer'}
                          >
                            {l.visible === false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              pushHistory();
                              setActiveLayers((prev) => prev.filter((item) => item.id !== l.id));
                            }}
                            className="p-1 rounded text-zinc-400 hover:text-red-600 cursor-pointer"
                            title="Delete layer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* SELECTED LAYER PROPERTIES */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                <span className="text-xs font-bold text-zinc-900 uppercase tracking-wide">
                  {selectedLayer.isMainLogo
                    ? 'Edit Logo'
                    : selectedLayer.kind === 'curved-text'
                    ? 'Edit Curved Text'
                    : selectedLayer.kind === 'text'
                    ? 'Edit Text'
                    : selectedLayer.kind === 'shape'
                    ? 'Edit Shape'
                    : 'Edit Image'}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedLayerId(null)}
                  className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 cursor-pointer"
                >
                  Done editing
                </button>
              </div>

              {/* Layer Order & Utility Actions */}
              <div className="grid grid-cols-5 gap-1">
                <button
                  type="button"
                  title="Center in zone"
                  onClick={() => {
                    pushHistory();
                    updateLayer(selectedLayer.id, { x: activeZone.cx, y: activeZone.cy });
                  }}
                  className="p-1.5 rounded-lg border border-zinc-200 hover:border-[#FF7A00] flex items-center justify-center cursor-pointer"
                >
                  <AlignCenter className="w-3.5 h-3.5 text-zinc-700" />
                </button>
                <button
                  type="button"
                  title="Duplicate layer"
                  onClick={() => {
                    pushHistory();
                    const clone: StudioLayer = {
                      ...selectedLayer,
                      id: createUid('dup'),
                      isMainLogo: false,
                      x: selectedLayer.x + 12,
                      y: selectedLayer.y + 12,
                    };
                    setActiveLayers((prev) => [...prev, clone]);
                    setSelectedLayerId(clone.id);
                  }}
                  className="p-1.5 rounded-lg border border-zinc-200 hover:border-[#FF7A00] flex items-center justify-center cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-zinc-700" />
                </button>
                <button
                  type="button"
                  title="Bring forward"
                  onClick={() => {
                    const idx = activeLayers.findIndex((l) => l.id === selectedLayer.id);
                    if (idx < 0 || idx === activeLayers.length - 1) return;
                    pushHistory();
                    const copy = [...activeLayers];
                    const [item] = copy.splice(idx, 1);
                    copy.splice(idx + 1, 0, item);
                    setActiveLayers(copy);
                  }}
                  className="p-1.5 rounded-lg border border-zinc-200 hover:border-[#FF7A00] flex items-center justify-center cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-zinc-700" />
                </button>
                <button
                  type="button"
                  title="Send backward"
                  onClick={() => {
                    const idx = activeLayers.findIndex((l) => l.id === selectedLayer.id);
                    if (idx <= 0) return;
                    pushHistory();
                    const copy = [...activeLayers];
                    const [item] = copy.splice(idx, 1);
                    copy.splice(idx - 1, 0, item);
                    setActiveLayers(copy);
                  }}
                  className="p-1.5 rounded-lg border border-zinc-200 hover:border-[#FF7A00] flex items-center justify-center cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5 text-zinc-700" />
                </button>
                <button
                  type="button"
                  title="Delete layer"
                  onClick={() => {
                    pushHistory();
                    setActiveLayers((prev) => prev.filter((l) => l.id !== selectedLayer.id));
                    setSelectedLayerId(null);
                  }}
                  className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 flex items-center justify-center cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                </button>
              </div>

              {/* TEXT / CURVED TEXT CONTROLS */}
              {(selectedLayer.kind === 'text' || selectedLayer.kind === 'curved-text') && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 block mb-1">Text content</label>
                    <textarea
                      rows={2}
                      value={selectedLayer.text || ''}
                      onChange={(e) => updateLayer(selectedLayer.id, { text: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs font-semibold border border-zinc-200 rounded-lg focus:outline-hidden focus:border-[#FF7A00]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 block mb-1">Font family</label>
                    <select
                      value={selectedLayer.fontFamily || 'Space Grotesk'}
                      onChange={(e) => updateLayer(selectedLayer.id, { fontFamily: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white"
                    >
                      <option value="Space Grotesk">Space Grotesk</option>
                      <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                      <option value="Inter">Inter Sans</option>
                      <option value="Georgia">Georgia Serif</option>
                      <option value="Courier New">Courier Mono</option>
                      <option value="Impact">Impact Bold</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        updateLayer(selectedLayer.id, {
                          fontWeight: selectedLayer.fontWeight === '800' ? '500' : '800',
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer ${
                        selectedLayer.fontWeight === '800' || selectedLayer.fontWeight === '700'
                          ? 'border-[#FF7A00] bg-orange-50 text-[#FF7A00]'
                          : 'border-zinc-200 text-zinc-700'
                      }`}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateLayer(selectedLayer.id, {
                          fontStyle: selectedLayer.fontStyle === 'italic' ? 'normal' : 'italic',
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg border text-xs italic font-bold cursor-pointer ${
                        selectedLayer.fontStyle === 'italic'
                          ? 'border-[#FF7A00] bg-orange-50 text-[#FF7A00]'
                          : 'border-zinc-200 text-zinc-700'
                      }`}
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateLayer(selectedLayer.id, {
                          textTransform: selectedLayer.textTransform === 'uppercase' ? 'none' : 'uppercase',
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer ${
                        selectedLayer.textTransform === 'uppercase'
                          ? 'border-[#FF7A00] bg-orange-50 text-[#FF7A00]'
                          : 'border-zinc-200 text-zinc-700'
                      }`}
                    >
                      AA
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 block mb-1">Text colour</label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {['#FFFFFF', '#111215', '#FF7A00', '#2563EB', '#EF4444', '#10B981', '#FACC15'].map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => updateLayer(selectedLayer.id, { textColor: hex })}
                          className={`w-5 h-5 rounded-full border cursor-pointer ${
                            selectedLayer.textColor === hex ? 'ring-2 ring-[#FF7A00] ring-offset-1' : 'border-zinc-300'
                          }`}
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                      <input
                        type="color"
                        value={selectedLayer.textColor || '#FFFFFF'}
                        onChange={(e) => updateLayer(selectedLayer.id, { textColor: e.target.value })}
                        className="w-6 h-6 rounded border border-zinc-200 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-zinc-600 mb-0.5">
                      <span>Font size</span>
                      <span className="font-bold">{selectedLayer.fontSize || 14}px</span>
                    </div>
                    <input
                      type="range"
                      min={7}
                      max={44}
                      value={selectedLayer.fontSize || 14}
                      onChange={(e) => updateLayer(selectedLayer.id, { fontSize: Number(e.target.value) })}
                      className="w-full accent-[#FF7A00] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-zinc-600 mb-0.5">
                      <span>Letter spacing</span>
                      <span className="font-bold">{selectedLayer.letterSpacing ?? 0.5}px</span>
                    </div>
                    <input
                      type="range"
                      min={-1}
                      max={8}
                      step={0.5}
                      value={selectedLayer.letterSpacing ?? 0.5}
                      onChange={(e) => updateLayer(selectedLayer.id, { letterSpacing: Number(e.target.value) })}
                      className="w-full accent-[#FF7A00] cursor-pointer"
                    />
                  </div>

                  {selectedLayer.kind === 'curved-text' && (
                    <div>
                      <div className="flex justify-between text-[11px] text-zinc-600 mb-0.5">
                        <span>Text curve arc</span>
                        <span className="font-bold">{selectedLayer.curve ?? 45}°</span>
                      </div>
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        value={selectedLayer.curve ?? 45}
                        onChange={(e) => updateLayer(selectedLayer.id, { curve: Number(e.target.value) })}
                        className="w-full accent-[#FF7A00] cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* SHAPE CONTROLS */}
              {selectedLayer.kind === 'shape' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 block mb-1">Fill colour</label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {['#FF7A00', '#FFFFFF', '#111215', '#2563EB', '#EF4444', '#10B981', 'transparent'].map(
                        (hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => updateLayer(selectedLayer.id, { fillColor: hex })}
                            className={`w-5 h-5 rounded-full border cursor-pointer ${
                              selectedLayer.fillColor === hex
                                ? 'ring-2 ring-[#FF7A00] ring-offset-1'
                                : 'border-zinc-300'
                            }`}
                            style={{
                              backgroundColor: hex === 'transparent' ? '#ffffff' : hex,
                            }}
                          />
                        )
                      )}
                      <input
                        type="color"
                        value={
                          selectedLayer.fillColor === 'transparent'
                            ? '#FF7A00'
                            : selectedLayer.fillColor || '#FF7A00'
                        }
                        onChange={(e) => updateLayer(selectedLayer.id, { fillColor: e.target.value })}
                        className="w-6 h-6 rounded border border-zinc-200 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-zinc-600 mb-0.5">
                      <span>Stroke width</span>
                      <span className="font-bold">{selectedLayer.strokeWidth || 0}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={14}
                      value={selectedLayer.strokeWidth || 0}
                      onChange={(e) => updateLayer(selectedLayer.id, { strokeWidth: Number(e.target.value) })}
                      className="w-full accent-[#FF7A00] cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* IMAGE / LOGO CONTROLS */}
              {(selectedLayer.kind === 'logo' || selectedLayer.kind === 'image') && (
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => updateLayer(selectedLayer.id, { flipX: !selectedLayer.flipX })}
                    className={`w-full py-1.5 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      selectedLayer.flipX
                        ? 'border-[#FF7A00] bg-orange-50 text-[#FF7A00]'
                        : 'border-zinc-200 text-zinc-700'
                    }`}
                  >
                    <FlipHorizontal2 className="w-3.5 h-3.5" />
                    <span>Flip Horizontal</span>
                  </button>
                </div>
              )}

              {/* COMMON TRANSFORM CONTROLS: Rotation & Opacity */}
              <div className="space-y-3 pt-2 border-t border-zinc-200">
                <div>
                  <div className="flex justify-between text-[11px] text-zinc-600 mb-0.5">
                    <span className="flex items-center gap-1">
                      <RotateCw className="w-3 h-3" />
                      <span>Rotation</span>
                    </span>
                    <span className="font-bold">{selectedLayer.rotation}°</span>
                  </div>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    value={selectedLayer.rotation}
                    onChange={(e) => updateLayer(selectedLayer.id, { rotation: Number(e.target.value) })}
                    className="w-full accent-[#FF7A00] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-zinc-600 mb-0.5">
                    <span>Opacity</span>
                    <span className="font-bold">{Math.round((selectedLayer.opacity ?? 1) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={Math.round((selectedLayer.opacity ?? 1) * 100)}
                    onChange={(e) => updateLayer(selectedLayer.id, { opacity: Number(e.target.value) / 100 })}
                    className="w-full accent-[#FF7A00] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* =================================================================== */}
      {/* MOBILE & TABLET BOTTOM STUDIO BAR (< lg)                            */}
      {/* =================================================================== */}
      <nav className="lg:hidden bg-white border-t border-zinc-200 px-2 pt-1.5 pb-[max(0.45rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around gap-1 shrink-0 z-30">
        <button
          type="button"
          onClick={() => setMobileTab('canvas')}
          className={`flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
            mobileTab === 'canvas' ? 'bg-orange-50 text-[#FF7A00]' : 'text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Canvas</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setLeftTab('product');
            setMobileTab((prev) => (prev === 'product' ? 'canvas' : 'product'));
          }}
          className={`flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
            mobileTab === 'product' ? 'bg-orange-50 text-[#FF7A00]' : 'text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          <Shirt className="w-4 h-4" />
          <span>Product</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setLeftTab('text');
            setMobileTab((prev) => (prev === 'text' ? 'canvas' : 'text'));
          }}
          className={`flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
            mobileTab === 'text' ? 'bg-orange-50 text-[#FF7A00]' : 'text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          <Type className="w-4 h-4" />
          <span>Text & add</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab((prev) => (prev === 'layers' ? 'canvas' : 'layers'))}
          className={`flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
            mobileTab === 'layers' ? 'bg-orange-50 text-[#FF7A00]' : 'text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Layers ({activeLayers.length})</span>
        </button>
      </nav>

      {/* =================================================================== */}
      {/* MAGIC ERASER INTERACTIVE MODAL                                      */}
      {/* =================================================================== */}
      {isMagicEraserOpen && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92dvh] overflow-y-auto p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 shadow-2xl border border-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div>
                <h4 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <Eraser className="w-4 h-4 text-[#FF7A00]" />
                  <span>Magic Eraser</span>
                </h4>
                <p className="text-xs text-zinc-500">
                  Use Brush to paint away unwanted marks, or Tap a piece to delete an entire colour area.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMagicEraserOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tool controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEraserTool('brush')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer border ${
                    eraserTool === 'brush'
                      ? 'bg-[#FF7A00] text-white border-[#FF7A00]'
                      : 'bg-white text-zinc-700 border-zinc-200'
                  }`}
                >
                  <Paintbrush className="w-3.5 h-3.5" />
                  <span>Brush</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEraserTool('flood')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer border ${
                    eraserTool === 'flood'
                      ? 'bg-[#FF7A00] text-white border-[#FF7A00]'
                      : 'bg-white text-zinc-700 border-zinc-200'
                  }`}
                >
                  <MousePointerClick className="w-3.5 h-3.5" />
                  <span>Tap a piece</span>
                </button>
              </div>

              {eraserTool === 'brush' ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-600">Brush size:</span>
                  <input
                    type="range"
                    min={4}
                    max={48}
                    value={eraserBrushSize}
                    onChange={(e) => setEraserBrushSize(Number(e.target.value))}
                    className="w-28 accent-[#FF7A00] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-zinc-800 w-8">{eraserBrushSize}px</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-600">Colour tolerance:</span>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={eraserTolerance}
                    onChange={(e) => setEraserTolerance(Number(e.target.value))}
                    className="w-28 accent-[#FF7A00] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-zinc-800 w-8">{eraserTolerance}</span>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={draftEraserActions.length === 0}
                  onClick={() => setDraftEraserActions((prev) => prev.slice(0, -1))}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 disabled:opacity-40 cursor-pointer"
                >
                  Undo
                </button>
                <button
                  type="button"
                  disabled={draftEraserActions.length === 0}
                  onClick={() => setDraftEraserActions([])}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-red-600 disabled:opacity-40 cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Checkerboard Canvas Stage */}
            <div
              className="w-full min-h-[260px] max-h-[360px] rounded-xl border border-zinc-300 flex items-center justify-center p-4 overflow-hidden"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
              }}
            >
              <canvas
                ref={eraserCanvasRef}
                onPointerDown={handleEraserPointerDown}
                onPointerMove={handleEraserPointerMove}
                onPointerUp={handleEraserPointerUp}
                onPointerLeave={handleEraserPointerUp}
                className="max-w-full max-h-[310px] touch-none cursor-crosshair shadow-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setIsMagicEraserOpen(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  updateActiveCleanup({ eraserActions: draftEraserActions });
                  setIsMagicEraserOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-[#FF7A00] hover:bg-[#e56d00] text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                Apply Eraser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
