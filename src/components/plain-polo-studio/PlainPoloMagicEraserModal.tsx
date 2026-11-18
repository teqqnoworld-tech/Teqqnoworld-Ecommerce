import React, { useEffect, useRef, useState } from 'react';
import { Eraser, MousePointerClick, RotateCcw, Check, X, Sparkles } from 'lucide-react';
import { EraserAction } from '../../utils/logoProcessor';

interface PlainPoloMagicEraserModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceDataUrl: string;
  initialActions: EraserAction[];
  onApplyActions: (actions: EraserAction[]) => void;
}

export const PlainPoloMagicEraserModal: React.FC<PlainPoloMagicEraserModalProps> = ({
  isOpen,
  onClose,
  sourceDataUrl,
  initialActions,
  onApplyActions,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);

  const [tool, setTool] = useState<'brush' | 'flood'>('flood');
  const [brushSize, setBrushSize] = useState<number>(22);
  const [floodTolerance, setFloodTolerance] = useState<number>(36);
  const [actions, setActions] = useState<EraserAction[]>(initialActions);
  const [isDrawing, setIsDrawing] = useState(false);

  const activeBrushStrokeRef = useRef<{ x: number; y: number }[]>([]);

  useEffect(() => {
    setActions(initialActions);
  }, [initialActions, isOpen]);

  const redrawCanvas = (img: HTMLImageElement, nextActions: EraserAction[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const aspect = img.width / Math.max(1, img.height);
    let drawW = w * 0.86;
    let drawH = drawW / aspect;
    if (drawH > h * 0.86) {
      drawH = h * 0.86;
      drawW = drawH * aspect;
    }
    const dx = (w - drawW) / 2;
    const dy = (h - drawH) / 2;
    ctx.drawImage(img, dx, dy, drawW, drawH);

    // Apply existing actions in sequence
    for (const act of nextActions) {
      if (act.type === 'brush' && act.points.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = act.radius * 2 * Math.max(w, h);
        ctx.beginPath();
        ctx.moveTo(act.points[0].x * w, act.points[0].y * h);
        for (let i = 1; i < act.points.length; i++) {
          ctx.lineTo(act.points[i].x * w, act.points[i].y * h);
        }
        ctx.stroke();
        ctx.restore();
      } else if (act.type === 'flood') {
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const startX = Math.max(0, Math.min(w - 1, Math.floor(act.x * w)));
        const startY = Math.max(0, Math.min(h - 1, Math.floor(act.y * h)));
        const startIdx = (startY * w + startX) * 4;
        if (data[startIdx + 3] === 0) continue;

        const sr = data[startIdx];
        const sg = data[startIdx + 1];
        const sb = data[startIdx + 2];
        const tolSq = act.tolerance * act.tolerance * 3;
        const visited = new Uint8Array(w * h);
        const queue = [startY * w + startX];
        visited[startY * w + startX] = 1;

        while (queue.length > 0) {
          const p = queue.pop()!;
          const idx = p * 4;
          const dr = data[idx] - sr;
          const dg = data[idx + 1] - sg;
          const db = data[idx + 2] - sb;
          if (data[idx + 3] > 0 && dr * dr + dg * dg + db * db <= tolSq) {
            data[idx + 3] = 0;
            const px = p % w;
            const py = (p - px) / w;
            if (px > 0 && !visited[p - 1]) {
              visited[p - 1] = 1;
              queue.push(p - 1);
            }
            if (px < w - 1 && !visited[p + 1]) {
              visited[p + 1] = 1;
              queue.push(p + 1);
            }
            if (py > 0 && !visited[p - w]) {
              visited[p - w] = 1;
              queue.push(p - w);
            }
            if (py < h - 1 && !visited[p + w]) {
              visited[p + w] = 1;
              queue.push(p + w);
            }
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }
    }
  };

  useEffect(() => {
    if (!isOpen || !sourceDataUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      baseImageRef.current = img;
      redrawCanvas(img, actions);
    };
    img.src = sourceDataUrl;
  }, [isOpen, sourceDataUrl]);

  useEffect(() => {
    if (baseImageRef.current && isOpen) {
      redrawCanvas(baseImageRef.current, actions);
    }
  }, [actions, isOpen]);

  if (!isOpen) return null;

  const getRelativePoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0.5, y: 0.5 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width))),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / Math.max(1, rect.height))),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getRelativePoint(e);
    if (tool === 'flood') {
      const next: EraserAction[] = [...actions, { type: 'flood', x: pt.x, y: pt.y, tolerance: floodTolerance }];
      setActions(next);
      return;
    }
    setIsDrawing(true);
    activeBrushStrokeRef.current = [pt];
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || tool !== 'brush') return;
    const pt = getRelativePoint(e);
    activeBrushStrokeRef.current.push(pt);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pts = activeBrushStrokeRef.current;
    const n = pts.length;
    if (n >= 2) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushSize;
      ctx.beginPath();
      ctx.moveTo(pts[n - 2].x * canvas.width, pts[n - 2].y * canvas.height);
      ctx.lineTo(pts[n - 1].x * canvas.width, pts[n - 1].y * canvas.height);
      ctx.stroke();
      ctx.restore();
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing || tool !== 'brush') return;
    setIsDrawing(false);
    if (activeBrushStrokeRef.current.length > 0) {
      const canvas = canvasRef.current;
      const radiusRatio = canvas ? brushSize / (2 * Math.max(canvas.width, canvas.height)) : 0.03;
      const next: EraserAction[] = [
        ...actions,
        { type: 'brush', points: [...activeBrushStrokeRef.current], radius: radiusRatio },
      ];
      setActions(next);
    }
    activeBrushStrokeRef.current = [];
  };

  return (
    <div
      className="fixed inset-0 z-[90] bg-[#071B35]/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-5 py-3.5 bg-[#071B35] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FF7900]/20 border border-[#FF7900]/40 flex items-center justify-center text-[#FF7900]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Precision Magic Eraser</h3>
              <p className="text-[11px] text-slate-300">Tap matching areas to punch out backgrounds, or brush manually</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            aria-label="Close Magic Eraser"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setTool('flood')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                tool === 'flood' ? 'bg-[#071B35] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <MousePointerClick className="w-3.5 h-3.5" />
              <span>Tap Flood Erase</span>
            </button>
            <button
              type="button"
              onClick={() => setTool('brush')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                tool === 'brush' ? 'bg-[#FF7900] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Brush Erase</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {tool === 'flood' ? (
              <label className="flex items-center gap-2 text-slate-700 font-medium">
                <span>Tolerance</span>
                <input
                  type="range"
                  min={10}
                  max={85}
                  value={floodTolerance}
                  onChange={(e) => setFloodTolerance(Number(e.target.value))}
                  className="w-24 accent-[#071B35]"
                />
                <span className="font-mono text-[11px] tabular-nums w-7">{floodTolerance}</span>
              </label>
            ) : (
              <label className="flex items-center gap-2 text-slate-700 font-medium">
                <span>Brush</span>
                <input
                  type="range"
                  min={6}
                  max={56}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-24 accent-[#FF7900]"
                />
                <span className="font-mono text-[11px] tabular-nums w-8">{brushSize}px</span>
              </label>
            )}
          </div>
        </div>

        <div className="p-4 flex-1 flex items-center justify-center bg-[repeating-conic-gradient(#e2e8f0_0%_25%,#ffffff_0%_50%)] bg-[length:20px_20px] overflow-auto">
          <canvas
            ref={canvasRef}
            width={440}
            height={440}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="max-w-full max-h-[380px] aspect-square rounded-xl border border-slate-300 shadow-inner touch-none cursor-crosshair bg-transparent"
          />
        </div>

        <div className="px-3 sm:px-5 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              disabled={actions.length === 0}
              onClick={() => setActions((prev) => prev.slice(0, -1))}
              className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer min-h-[40px]"
            >
              Undo Step
            </button>
            <button
              type="button"
              disabled={actions.length === 0}
              onClick={() => setActions([])}
              className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer min-h-[40px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer min-h-[40px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onApplyActions(actions);
                onClose();
              }}
              className="px-3.5 sm:px-4 py-2 rounded-lg bg-[#FF7900] hover:bg-[#e86e00] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer min-h-[40px]"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Logo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
