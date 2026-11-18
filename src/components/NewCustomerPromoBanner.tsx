import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Sparkles, Tag } from 'lucide-react';

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  decay: number;
  size: number;
  color: string;
  history: { x: number; y: number }[];
}

interface NewCustomerPromoBannerProps {
  appliedCode?: string | null;
  discountAmount?: number;
  onApplyPromo?: (code: string) => void;
  onRemovePromo?: () => void;
}

export const NewCustomerPromoBanner: React.FC<NewCustomerPromoBannerProps> = ({
  appliedCode,
  discountAmount = 0,
  onApplyPromo,
  onRemovePromo,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);

  const isWelcomeApplied =
    appliedCode === 'WELCOME10' || appliedCode === 'TEQQNO10';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText('WELCOME10');
    } catch {
      // ignore clipboard errors in restricted iframes
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  // Old Premium Diwali Fuljhari Sparkler Canvas Simulation (matching AnnouncementBar)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    let animationFrameId = 0;
    const particles: SparkParticle[] = [];
    let width = (canvas.width = canvas.parentElement?.offsetWidth || 640);
    let height = (canvas.height = canvas.parentElement?.offsetHeight || 74);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.offsetWidth;
      height = canvas.height = canvas.parentElement.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    const sparkColors = [
      '#FFF4CC',
      '#FFD700',
      '#FFA500',
      '#FF7A00',
      '#FFE880',
      '#FFFFFF',
    ];

    let emitterPhase = 0;
    let frameCount = 0;

    const createSpark = (
      originX: number,
      originY: number,
      burst = false
    ): SparkParticle => {
      const angle = Math.random() * Math.PI * 2;
      const speed = burst ? Math.random() * 2.6 + 0.8 : Math.random() * 1.6 + 0.4;
      const maxLife = Math.random() * 26 + 14;
      return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.7 - 0.18,
        alpha: 1,
        decay: 1 / maxLife,
        size: Math.random() * 1.8 + 0.8,
        color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
        history: [{ x: originX, y: originY }],
      };
    };

    const render = () => {
      frameCount++;
      ctx.clearRect(0, 0, width, height);

      if (document.hidden) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      emitterPhase += 0.015;

      if (frameCount % 4 === 0 && particles.length < 48) {
        const e1X = ((Math.sin(emitterPhase) * 0.42 + 0.5) * width) % width;
        const e1Y = height * 0.45 + Math.cos(emitterPhase * 1.8) * (height * 0.25);
        particles.push(createSpark(e1X, e1Y));

        if (Math.random() > 0.45) {
          const edgeX = Math.random() * width;
          const edgeY = Math.random() > 0.5 ? 4 : height - 4;
          particles.push(createSpark(edgeX, edgeY, false));
        }

        if (frameCount % 42 === 0) {
          const clusterX = Math.random() * width;
          const clusterY = height * 0.5;
          for (let i = 0; i < 4; i++) {
            particles.push(createSpark(clusterX, clusterY, true));
          }
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.history.push({ x: p.x, y: p.y });
        if (p.history.length > 3) p.history.shift();

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.035;
        p.vx *= 0.98;
        p.alpha -= p.decay;

        if (p.alpha <= 0 || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.lineCap = 'round';
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 5;

        ctx.beginPath();
        if (p.history.length > 1) {
          ctx.moveTo(p.history[0].x, p.history[0].y);
          ctx.lineTo(p.x, p.y);
        } else {
          ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2);
        }
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.size * 0.4), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div
      role="region"
      aria-label="New Customer 10% Off Offer"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#111215] via-[#17171C] to-[#111215] border border-[#FF7A00]/45 p-4 sm:px-6 sm:py-4 text-white shadow-xl shadow-[#FF7A00]/10"
    >
      {/* Warm Festive Glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#FF7A00]/40 via-transparent to-transparent"
      />

      {/* Fuljhari Sparkler Canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* Twinkle Stars */}
      <span
        aria-hidden="true"
        className="absolute top-1.5 left-[8%] text-[#FFD700] pointer-events-none z-10 animate-sparkler-twinkle opacity-75 text-[11px]"
      >
        ✦
      </span>
      <span
        aria-hidden="true"
        className="absolute bottom-1.5 left-[34%] text-[#FFA500] pointer-events-none z-10 animate-sparkler-twinkle opacity-75 text-[10px] [animation-delay:1.1s]"
      >
        ✦
      </span>
      <span
        aria-hidden="true"
        className="absolute top-2 right-[26%] text-[#FFF4CC] pointer-events-none z-10 animate-sparkler-twinkle opacity-75 text-[11px] [animation-delay:0.6s]"
      >
        ✦
      </span>
      <span
        aria-hidden="true"
        className="absolute bottom-1.5 right-[9%] text-[#FF7A00] pointer-events-none z-10 animate-sparkler-twinkle opacity-80 text-[10px] [animation-delay:1.7s]"
      >
        ✦
      </span>

      {/* Content */}
      <div className="relative z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#FF7A00]/20 border border-[#FF7A00]/50 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(255,122,0,0.35)]">
            <Sparkles className="w-5 h-5 text-[#FFD700] animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-bold tracking-wide uppercase">
              <span role="img" aria-label="Party popper">
                🎉
              </span>
              <span className="text-zinc-100">NEW CUSTOMER SPECIAL:</span>
              <span className="text-[#FF7A00] font-black drop-shadow-[0_0_10px_rgba(255,122,0,0.65)]">
                10% OFF ON FIRST ORDER
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-300 mt-0.5">
              Apply code{' '}
              <span className="font-mono font-bold text-[#FFD700]">WELCOME10</span> at checkout to unlock instant 10% savings + Free Express Shipping above ₹1,999.
            </p>
          </div>
        </div>

        {/* Code Pill + 1-Click Apply / Applied Badge */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            title="Copy promo code WELCOME10"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#FF7A00]/60 bg-[#FF7A00]/15 hover:bg-[#FF7A00]/30 text-white text-xs font-mono font-bold tracking-wider transition-all shadow-[0_0_14px_rgba(255,122,0,0.3)] cursor-pointer min-h-[40px]"
          >
            <Tag className="w-3.5 h-3.5 text-[#FFD700]" />
            <span>WELCOME10</span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3 text-[#FFA959]" />
            )}
          </button>

          {onApplyPromo && (
            isWelcomeApplied ? (
              <button
                type="button"
                onClick={onRemovePromo}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-300 text-xs font-bold transition-all cursor-pointer min-h-[40px]"
                title="Click to remove promo code"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  Applied (-₹{Math.round(discountAmount).toLocaleString('en-IN')})
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onApplyPromo('WELCOME10')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF7A00] hover:bg-[#ff8a20] text-white text-xs font-bold shadow-lg shadow-[#FF7A00]/35 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer min-h-[40px]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Apply 10% OFF</span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
