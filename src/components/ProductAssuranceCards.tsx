import React from 'react';
import { ShieldCheck, Clock, Sparkles, LucideIcon } from 'lucide-react';
import { Product } from '../types';

export interface AssuranceCardItem {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  iconContainerClass: string;
  iconClass: string;
}

export interface ProductAssuranceCardsProps {
  product?: Product;
  dispatchTime?: string;
  customSubtitle?: {
    qc?: string;
    dispatch?: string;
    pantone?: string;
  };
  className?: string;
  compact?: boolean;
}

/**
 * Reusable Product Assurance / Trust Badge Cards for TeqqnoWorld.
 * Solves compression, awkward word breaks, and tiny icons across all device viewports.
 *
 * Responsive Architecture:
 * - Mobile (<440px): Clean vertical stack of full-width horizontal cards. Icons are 20px in 40px containers.
 * - Tablet & Mid-viewports (440px-1023px): 2-column grid with 3rd card spanning full width in a balanced position.
 * - Desktop (>=1024px): 3 balanced columns with vertically centered icon, bold heading, and clear description.
 */
export const ProductAssuranceCards: React.FC<ProductAssuranceCardsProps> = ({
  product,
  dispatchTime,
  customSubtitle,
  className = '',
  compact = false,
}) => {
  const resolvedDispatch = dispatchTime || product?.dispatchTime || '24–48 hrs';
  
  // Context-aware subtitle for QC card
  const getQcSubtitle = () => {
    if (customSubtitle?.qc) return customSubtitle.qc;
    if (!product) return 'Zero stitch fault guarantee';
    
    const pType = product.productType?.toLowerCase() || '';
    const pName = product.name?.toLowerCase() || '';
    
    if (pType.includes('mug') || pName.includes('mug')) {
      return 'Breakage-safe thermo packing';
    }
    if (pType.includes('visiting') || pName.includes('visiting card')) {
      return '300 DPI prepress calibration';
    }
    if (pType.includes('standee') || pName.includes('standee')) {
      return '100% defect-free metal stand';
    }
    if (pType.includes('canopy') || pName.includes('canopy')) {
      return 'Heavy-duty frame & seam check';
    }
    if (pType.includes('umbrella') || pName.includes('umbrella')) {
      return 'Wind & weather-proof verified';
    }
    if (pType.includes('table') || pName.includes('promo table')) {
      return 'Rigid structure load tested';
    }
    if (pType.includes('cap') || pName.includes('cap')) {
      return 'Laser embroidery & crown check';
    }
    return 'Zero stitch fault guarantee';
  };

  const cards: AssuranceCardItem[] = [
    {
      icon: ShieldCheck,
      title: 'QC Inspected',
      subtitle: getQcSubtitle(),
      iconContainerClass: 'bg-[#FFF4EC] border border-[#FFE0CC] text-[#FF7A00]',
      iconClass: 'w-5 h-5 text-[#FF7A00]',
    },
    {
      icon: Clock,
      title: resolvedDispatch,
      subtitle: customSubtitle?.dispatch || 'Fast corporate dispatch',
      iconContainerClass: 'bg-zinc-100 border border-zinc-200/90 text-[#0B0B0D]',
      iconClass: 'w-5 h-5 text-[#FF7A00]',
    },
    {
      icon: Sparkles,
      title: 'Pantone Match',
      subtitle: customSubtitle?.pantone || 'Exact corporate shade',
      iconContainerClass: 'bg-emerald-50 border border-emerald-200 text-emerald-700',
      iconClass: 'w-5 h-5 text-emerald-600',
    },
  ];

  if (compact) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 ${className}`}>
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-xl p-3 border border-[#E5E5EA] shadow-2xs hover:border-[#FF7A00]/40 transition-all flex items-center gap-3 text-left"
            >
              <div
                className={`w-9 h-9 rounded-lg ${card.iconContainerClass} flex items-center justify-center shrink-0 shadow-2xs`}
              >
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display font-bold text-xs text-[#0B0B0D] tracking-tight leading-snug">
                  {card.title}
                </div>
                <div className="text-[10px] sm:text-[11px] text-zinc-500 mt-0.5 leading-tight truncate">
                  {card.subtitle}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      aria-label="Product Quality & Dispatch Assurance"
      className={`grid grid-cols-1 min-[440px]:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 pt-2 ${className}`}
    >
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const isThirdCardInTwoCol = idx === 2;

        return (
          <div
            key={idx}
            className={`group bg-white rounded-2xl p-3 sm:p-3.5 lg:p-4 border border-[#E5E5EA] shadow-2xs hover:border-[#FF7A00]/40 hover:shadow-xs transition-all duration-200 flex ${
              isThirdCardInTwoCol
                ? 'min-[440px]:col-span-2 min-[440px]:flex-row min-[440px]:justify-center lg:col-span-1 lg:flex-col lg:justify-between'
                : 'flex-row lg:flex-col lg:justify-between'
            } items-center text-left lg:text-center gap-3 lg:gap-2.5 min-h-[68px] sm:min-h-[76px] lg:min-h-[105px]`}
          >
            {/* Prominent, Clearly Visible Icon Container */}
            <div
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${card.iconContainerClass} flex items-center justify-center shrink-0 shadow-2xs transition-transform duration-300 group-hover:scale-108`}
            >
              <Icon className={card.iconClass} />
            </div>

            {/* Typography Section */}
            <div
              className={`min-w-0 flex-1 ${
                isThirdCardInTwoCol ? 'min-[440px]:flex-initial min-[440px]:text-left lg:text-center' : ''
              } lg:flex-initial lg:w-full`}
            >
              <div className="font-display font-bold text-xs sm:text-sm text-[#0B0B0D] tracking-tight leading-snug whitespace-normal">
                {card.title}
              </div>
              <div className="text-[11px] sm:text-xs text-zinc-500 mt-0.5 sm:mt-1 leading-snug">
                {card.subtitle}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
