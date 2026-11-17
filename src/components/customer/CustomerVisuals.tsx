import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, FileText, Image as ImageIcon, ChevronDown, X } from 'lucide-react';
import { CustomerOrderAnalyticsPoint, CustomerStatusSegment } from './customerUtils';

/**
 * Smooth animated integer counter honoring prefers-reduced-motion.
 */
export const PortalCounter: React.FC<{
  value: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
}> = ({ value, prefix = '', suffix = '', durationMs = 420 }) => {
  const [display, setDisplay] = useState<number>(value);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setDisplay(value);
      return;
    }
    const reduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || durationMs <= 0) {
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
      setDisplay(Math.round(startVal + (value - startVal) * eased));
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

/**
 * Miniature SVG Sparkline for KPI Cards.
 */
export const PortalSparkline: React.FC<{
  points: number[];
  strokeColor: string;
  id: string;
}> = ({ points, strokeColor, id }) => {
  const safePoints =
    points.length >= 2 && points.some((p) => p > 0)
      ? points
      : [1, 1.4, 1.2, 1.8, 1.6, 2.2, 2.0];

  const width = 94;
  const height = 34;
  const max = Math.max(...safePoints, 1);
  const min = Math.min(...safePoints, 0);
  const span = Math.max(max - min, 1);

  const coords = safePoints.map((val, idx) => {
    const x = (idx / (safePoints.length - 1)) * (width - 8) + 4;
    const y = height - 5 - ((val - min) / span) * (height - 12);
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });

  let pathD = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const cx = Number(((prev.x + curr.x) / 2).toFixed(1));
    const cy = Number(((prev.y + curr.y) / 2).toFixed(1));
    pathD += ` Q ${prev.x} ${prev.y}, ${cx} ${cy}`;
    if (i === coords.length - 1) {
      pathD += ` T ${curr.x} ${curr.y}`;
    }
  }

  const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;

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
        <linearGradient id={`cust-spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.24" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#cust-spark-${id})`} />
      <path
        d={pathD}
        stroke={strokeColor}
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-admin-sparkline"
      />
    </svg>
  );
};

export type KpiTheme = 'orange' | 'blue' | 'green' | 'violet';

const KPI_THEMES: Record<
  KpiTheme,
  {
    cardBg: string;
    iconBg: string;
    iconText: string;
    stroke: string;
  }
> = {
  orange: {
    cardBg: 'bg-gradient-to-br from-[#FFF9F3] via-white to-[#FFF3E6] border-orange-200/80',
    iconBg: 'bg-[#FF7900]/12 border-orange-200/80',
    iconText: 'text-[#FF7900]',
    stroke: '#FF7900',
  },
  blue: {
    cardBg: 'bg-gradient-to-br from-[#F4F8FF] via-white to-[#EDF4FF] border-blue-200/80',
    iconBg: 'bg-blue-500/12 border-blue-200/80',
    iconText: 'text-blue-600',
    stroke: '#2563EB',
  },
  green: {
    cardBg: 'bg-gradient-to-br from-[#F3FBF7] via-white to-[#EAF9F0] border-emerald-200/80',
    iconBg: 'bg-emerald-500/12 border-emerald-200/80',
    iconText: 'text-emerald-600',
    stroke: '#10B981',
  },
  violet: {
    cardBg: 'bg-gradient-to-br from-[#F9F5FF] via-white to-[#F2EBFF] border-violet-200/80',
    iconBg: 'bg-violet-500/12 border-violet-200/80',
    iconText: 'text-violet-600',
    stroke: '#8B5CF6',
  },
};

export const CustomerKpiCard: React.FC<{
  id: string;
  title: string;
  value: number;
  subtitle: string;
  badgeText?: string;
  theme: KpiTheme;
  icon: React.ReactNode;
  sparkPoints: number[];
  onClick?: () => void;
}> = ({ id, title, value, subtitle, badgeText, theme, icon, sparkPoints, onClick }) => {
  const palette = KPI_THEMES[theme];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-2xl border p-4 sm:p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#FF7900]/10 hover:border-[#FF7900]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7900] cursor-pointer group ${palette.cardBg}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${palette.iconBg} ${palette.iconText}`}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-600 truncate">{title}</div>
            <div className="text-2xl sm:text-[28px] font-bold text-[#0B1530] leading-tight mt-0.5 font-display">
              <PortalCounter value={value} />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          {badgeText && (
            <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-md mr-1.5">
              {badgeText}
            </span>
          )}
          <span className="text-[11px] text-slate-500 font-medium leading-tight block truncate mt-0.5">
            {subtitle}
          </span>
        </div>
        <PortalSparkline id={id} points={sparkPoints} strokeColor={palette.stroke} />
      </div>
    </button>
  );
};

/**
 * Interactive SVG Area Chart for Orders Overview (7d / 30d / 90d).
 */
export const OrdersAreaChart: React.FC<{
  series: CustomerOrderAnalyticsPoint[];
  days: 7 | 30 | 90;
  onChangeDays: (days: 7 | 30 | 90) => void;
}> = ({ series, days, onChangeDays }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const totalRevenue = useMemo(
    () => series.reduce((sum, pt) => sum + pt.revenue, 0),
    [series]
  );
  const totalOrders = useMemo(
    () => series.reduce((sum, pt) => sum + pt.ordersCount, 0),
    [series]
  );

  // Compare second half vs first half of period for authentic growth indicator
  const growthLabel = useMemo(() => {
    if (series.length < 2) return null;
    const mid = Math.floor(series.length / 2);
    const firstHalf = series.slice(0, mid).reduce((s, p) => s + p.revenue, 0);
    const secondHalf = series.slice(mid).reduce((s, p) => s + p.revenue, 0);
    if (firstHalf === 0 && secondHalf === 0) return null;
    if (firstHalf === 0) return '+100%';
    const pct = Math.round(((secondHalf - firstHalf) / firstHalf) * 100);
    return `${pct >= 0 ? '+' : ''}${pct}%`;
  }, [series]);

  const width = 580;
  const height = 164;
  const padX = 18;
  const padTop = 26;
  const padBottom = 18;

  const coords = useMemo(() => {
    const safeSeries = series.length > 0 ? series : [{ dateKey: 'now', label: 'Today', ordersCount: 0, revenue: 0 }];
    const maxVal = Math.max(...safeSeries.map((s) => s.revenue), 1000);
    return safeSeries.map((pt, idx) => {
      const x =
        safeSeries.length === 1
          ? width / 2
          : padX + (idx / (safeSeries.length - 1)) * (width - padX * 2);
      const ratio = pt.revenue / maxVal;
      const y = height - padBottom - ratio * (height - padTop - padBottom);
      return {
        ...pt,
        x: Number(x.toFixed(1)),
        y: Number(y.toFixed(1)),
      };
    });
  }, [series]);

  const { linePath, areaPath } = useMemo(() => {
    if (coords.length === 0) return { linePath: '', areaPath: '' };
    if (coords.length === 1) {
      const p = coords[0];
      return {
        linePath: `M ${padX} ${p.y} L ${width - padX} ${p.y}`,
        areaPath: `M ${padX} ${p.y} L ${width - padX} ${p.y} L ${width - padX} ${height - padBottom} L ${padX} ${height - padBottom} Z`,
      };
    }

    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const midX = Number(((curr.x + next.x) / 2).toFixed(1));
      d += ` C ${midX} ${curr.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
    }

    const last = coords[coords.length - 1];
    const first = coords[0];
    const area = `${d} L ${last.x} ${height - padBottom} L ${first.x} ${height - padBottom} Z`;
    return { linePath: d, areaPath: area };
  }, [coords]);

  // Default highlight is the point with max revenue (or latest point) when not hovered
  const defaultFocusIdx = useMemo(() => {
    if (coords.length === 0) return 0;
    let bestIdx = coords.length - 1;
    let bestVal = -1;
    coords.forEach((pt, idx) => {
      if (pt.revenue >= bestVal && pt.revenue > 0) {
        bestVal = pt.revenue;
        bestIdx = idx;
      }
    });
    return bestIdx;
  }, [coords]);

  const activeIdx = hoverIdx !== null ? hoverIdx : defaultFocusIdx;
  const activePoint = coords[activeIdx];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 flex flex-col justify-between h-full">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200/70 text-[#FF7900] flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0B1530] font-display leading-tight">
              Orders Overview
            </h3>
            <p className="text-xs text-slate-500 font-medium">Last {days} Days Performance</p>
          </div>
        </div>

        <div className="relative">
          <select
            aria-label="Orders chart timeframe"
            value={days}
            onChange={(e) => onChangeDays(Number(e.target.value) as 7 | 30 | 90)}
            className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 pl-3 pr-8 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-2.5">
        <span className="text-2xl sm:text-[26px] font-bold text-[#0B1530] font-display tabular-nums">
          ₹<PortalCounter value={totalRevenue} />
        </span>
        {growthLabel && (
          <span
            className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md ${
              growthLabel.startsWith('-')
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {growthLabel}
          </span>
        )}
        <span className="text-xs text-slate-400 font-medium tabular-nums">
          ({totalOrders} {totalOrders === 1 ? 'order' : 'orders'} in period)
        </span>
      </div>

      <div className="relative mt-2 w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-36 sm:h-40 overflow-visible select-none"
          role="img"
          aria-label={`Orders performance curve over last ${days} days`}
        >
          <defs>
            <linearGradient id="orders-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF7900" stopOpacity="0.32" />
              <stop offset="85%" stopColor="#FF7900" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#FF7900" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Subtle horizontal guide lines */}
          {[0.25, 0.55, 0.85].map((r) => (
            <line
              key={r}
              x1={padX}
              x2={width - padX}
              y1={padTop + (height - padTop - padBottom) * r}
              y2={padTop + (height - padTop - padBottom) * r}
              stroke="#E2E8F0"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
          ))}

          {/* Area Fill */}
          <path d={areaPath} fill="url(#orders-area-grad)" />

          {/* Active vertical dashed guide */}
          {activePoint && (
            <line
              x1={activePoint.x}
              x2={activePoint.x}
              y1={activePoint.y}
              y2={height - padBottom}
              stroke="#0B1530"
              strokeOpacity="0.25"
              strokeDasharray="3 3"
              strokeWidth="1.2"
            />
          )}

          {/* Curve Line */}
          <path
            key={`line-${days}-${totalRevenue}`}
            d={linePath}
            fill="none"
            stroke="#FF7900"
            strokeWidth="3"
            strokeLinecap="round"
            className="animate-portal-area"
          />

          {/* Interactive Points */}
          {coords.map((pt, idx) => {
            const isActive = idx === activeIdx;
            return (
              <g
                key={pt.dateKey + idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoverIdx(idx)}
                onMouseLeave={() => setHoverIdx(null)}
                onClick={() => setHoverIdx(idx)}
              >
                <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isActive ? 5.5 : 3.2}
                  fill={isActive ? '#FF7900' : '#FFFFFF'}
                  stroke="#FF7900"
                  strokeWidth={isActive ? 3 : 2}
                  className="transition-all duration-150"
                />
              </g>
            );
          })}
        </svg>

        {/* Dark Navy Hover Tooltip */}
        {activePoint && (
          <div
            className="pointer-events-none absolute -top-1 -translate-x-1/2 bg-[#0B1530] text-white rounded-xl px-3 py-1.5 shadow-lg border border-white/10 text-center transition-all duration-150 z-10"
            style={{
              left: `${Math.min(86, Math.max(14, (activePoint.x / width) * 100))}%`,
            }}
          >
            <div className="text-[11px] font-bold leading-tight tabular-nums whitespace-nowrap">
              {activePoint.ordersCount} {activePoint.ordersCount === 1 ? 'Order' : 'Orders'} • {activePoint.label}
            </div>
            <div className="text-[11px] font-semibold text-[#FF7900] tabular-nums">
              ₹{activePoint.revenue.toLocaleString('en-IN')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Progressive Multi-Segment SVG Donut Chart for Order Status breakdown.
 */
export const OrderStatusDonut: React.FC<{
  total: number;
  segments: CustomerStatusSegment[];
  onSelectStatus?: (key: CustomerStatusSegment['key']) => void;
}> = ({ total, segments, onSelectStatus }) => {
  const size = 148;
  const strokeWidth = 17;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Build cumulative stroke offsets
  let cumulative = 0;
  const arcs = segments
    .filter((s) => s.count > 0)
    .map((seg) => {
      const length = total > 0 ? (seg.count / total) * circumference : 0;
      const offset = circumference - cumulative;
      cumulative += length;
      return {
        ...seg,
        dashArray: `${Math.max(0, length)} ${circumference}`,
        dashOffset: offset,
      };
    });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200/70 text-[#FF7900] flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
              <path d="M22 12A10 10 0 0 0 12 2v10z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-[#0B1530] font-display">Order Status</h3>
        </div>
        <span className="text-[11px] font-semibold text-slate-400">Live Breakdown</span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-5 my-auto">
        <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="-rotate-90"
            role="img"
            aria-label="Order status donut chart"
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#EEF2F6"
              strokeWidth={strokeWidth}
            />
            {arcs.map((arc) => (
              <circle
                key={arc.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth={strokeWidth}
                strokeLinecap={arcs.length === 1 ? 'butt' : 'round'}
                strokeDasharray={arc.dashArray}
                strokeDashoffset={arc.dashOffset}
                className="animate-portal-donut transition-all duration-300"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-2xl font-bold text-[#0B1530] font-display tabular-nums leading-none">
              <PortalCounter value={total} />
            </span>
            <span className="text-[11px] font-medium text-slate-500 mt-1">Total Orders</span>
          </div>
        </div>

        <div className="w-full space-y-2">
          {segments.map((seg) => (
            <button
              key={seg.key}
              type="button"
              onClick={() => onSelectStatus?.(seg.key)}
              className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${seg.dotClass}`} />
                <span className="text-xs font-medium text-slate-700 truncate">{seg.label}</span>
              </div>
              <span className="text-xs font-bold text-[#0B1530] tabular-nums shrink-0">
                {seg.count}{' '}
                <span className="font-medium text-slate-400">({seg.percent}%)</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Safe thumbnail renderer with graceful fallback and no broken image icons.
 */
export const AssetPreviewThumb: React.FC<{
  src?: string | null;
  alt: string;
  isPdf?: boolean;
  className?: string;
}> = ({ src, alt, isPdf = false, className = 'w-12 h-12 rounded-xl' }) => {
  const [failed, setFailed] = useState(false);

  if (isPdf || (src && src.toLowerCase().includes('.pdf'))) {
    return (
      <div
        className={`${className} bg-red-50 border border-red-200/70 text-red-600 flex flex-col items-center justify-center shrink-0`}
      >
        <FileText className="w-5 h-5" />
        <span className="text-[9px] font-bold uppercase mt-0.5">PDF</span>
      </div>
    );
  }

  if (!src || failed) {
    return (
      <div
        className={`${className} bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center shrink-0`}
      >
        <ImageIcon className="w-5 h-5" />
      </div>
    );
  }

  return (
    <div
      className={`${className} bg-slate-50 border border-slate-200/80 overflow-hidden flex items-center justify-center shrink-0`}
    >
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-full h-full object-contain p-1"
      />
    </div>
  );
};

export interface PortalToast {
  id: string;
  message: string;
  variant: 'success' | 'error' | 'info';
}

export const PortalToastList: React.FC<{
  toasts: PortalToast[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[70] space-y-2 max-w-sm w-[calc(100vw-2.5rem)] pointer-events-none">
      {toasts.map((t) => {
        const style =
          t.variant === 'error'
            ? 'bg-red-950 text-red-50 border-red-500/40'
            : t.variant === 'success'
              ? 'bg-[#0B1530] text-white border-emerald-500/50'
              : 'bg-[#0B1530] text-white border-[#FF7900]/50';
        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-xl animate-admin-fade-up ${style}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {t.variant === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span className="text-xs font-medium leading-snug">{t.message}</span>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss notification"
              className="text-white/60 hover:text-white p-1 rounded-lg cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
