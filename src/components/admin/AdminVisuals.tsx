import React, { useEffect, useState } from 'react';

export const AnimatedCounter: React.FC<{
  value: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
}> = ({ value, prefix = '', suffix = '', durationMs = 450 }) => {
  const [display, setDisplay] = useState<number>(value);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setDisplay(value);
      return;
    }
    const prefersReduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || durationMs <= 0) {
      setDisplay(value);
      return;
    }

    let rafId = 0;
    const startVal = 0;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (value - startVal) * eased);
      setDisplay(current);
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value, durationMs]);

  return (
    <span className="tabular-nums">
      {prefix}
      {display.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
};

export const MiniSparkline: React.FC<{
  points: number[];
  strokeColor: string;
  id: string;
}> = ({ points, strokeColor, id }) => {
  const safePoints =
    points.length >= 2 && points.some((p) => p > 0)
      ? points
      : [2, 3, 2.5, 4, 3.2, 5, 4.5];

  const width = 92;
  const height = 34;
  const max = Math.max(...safePoints, 1);
  const min = Math.min(...safePoints, 0);
  const span = Math.max(max - min, 1);

  const coords = safePoints.map((val, idx) => {
    const x = (idx / (safePoints.length - 1)) * (width - 8) + 4;
    const y = height - 5 - ((val - min) / span) * (height - 12);
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });

  // Smooth quadratic curve path
  let pathD = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const cx = Number(((prev.x + curr.x) / 2).toFixed(1));
    pathD += ` Q ${prev.x} ${prev.y}, ${cx} ${Number(((prev.y + curr.y) / 2).toFixed(1))}`;
    if (i === coords.length - 1) {
      pathD += ` T ${curr.x} ${curr.y}`;
    }
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
      className="shrink-0 overflow-visible"
    >
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.22" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${pathD} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`}
        fill={`url(#spark-${id})`}
      />
      <path
        d={pathD}
        stroke={strokeColor}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-admin-sparkline"
      />
    </svg>
  );
};

export interface AdminKpiCardProps {
  title: string;
  value: number;
  subtext: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'orange' | 'blue' | 'violet' | 'green';
  sparklinePoints: number[];
  sparkId: string;
  onClick?: () => void;
  delayMs?: number;
}

const KPI_TONE_STYLES: Record<
  AdminKpiCardProps['tone'],
  {
    wrapper: string;
    iconBox: string;
    stroke: string;
  }
> = {
  orange: {
    wrapper: 'bg-gradient-to-br from-[#FFF7EF] via-white to-white border-[#FFE2C7]',
    iconBox: 'bg-[#FF7900]/12 text-[#FF7900] border-[#FF7900]/20',
    stroke: '#FF7900',
  },
  blue: {
    wrapper: 'bg-gradient-to-br from-[#F2F7FF] via-white to-white border-[#DBE9FF]',
    iconBox: 'bg-blue-600/10 text-blue-600 border-blue-200',
    stroke: '#3B82F6',
  },
  violet: {
    wrapper: 'bg-gradient-to-br from-[#F7F3FF] via-white to-white border-[#E8DCFF]',
    iconBox: 'bg-violet-600/10 text-violet-600 border-violet-200',
    stroke: '#8B5CF6',
  },
  green: {
    wrapper: 'bg-gradient-to-br from-[#F0FDF6] via-white to-white border-[#CCF2DD]',
    iconBox: 'bg-emerald-600/10 text-emerald-600 border-emerald-200',
    stroke: '#10B981',
  },
};

export const AdminKpiCard: React.FC<AdminKpiCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  tone,
  sparklinePoints,
  sparkId,
  onClick,
  delayMs = 0,
}) => {
  const styles = KPI_TONE_STYLES[tone];
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      {...(onClick ? { onClick, type: 'button' as const } : {})}
      style={{ animationDelay: `${delayMs}ms` }}
      className={`animate-admin-fade-up w-full text-left rounded-2xl border p-4 sm:p-5 shadow-[0_2px_10px_-3px_rgba(7,27,53,0.06)] hover:shadow-[0_10px_24px_-6px_rgba(7,27,53,0.1)] hover:-translate-y-0.5 transition-all duration-200 ${styles.wrapper} ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${styles.iconBox}`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-600 truncate">{title}</div>
            <div className="text-2xl sm:text-[28px] leading-tight font-bold text-[#071B35] font-mono tabular-nums mt-0.5">
              <AnimatedCounter value={value} />
            </div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">{subtext}</div>
          </div>
        </div>
        <div className="hidden sm:flex items-end self-end pb-0.5">
          <MiniSparkline points={sparklinePoints} strokeColor={styles.stroke} id={sparkId} />
        </div>
      </div>
    </Tag>
  );
};

export const OrderThumb: React.FC<{
  src: string | null;
  alt: string;
  onClick?: () => void;
  sizeClass?: string;
}> = ({ src, alt, onClick, sizeClass = 'w-11 h-11' }) => {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div
        className={`${sizeClass} rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-[10px] font-medium text-slate-400 shrink-0`}
      >
        Item
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${sizeClass} rounded-xl border border-slate-200 bg-white p-1 overflow-hidden shrink-0 shadow-2xs hover:border-[#FF7900] transition-colors ${
        onClick ? 'cursor-zoom-in' : 'cursor-default'
      }`}
      title={onClick ? 'Click to preview high-res image' : alt}
    >
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setErrored(true)}
        className="w-full h-full object-contain rounded-lg"
      />
    </button>
  );
};
