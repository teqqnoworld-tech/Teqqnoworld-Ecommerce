import React, { useState } from 'react';
import { Search, X, ArrowRight, Sparkles } from 'lucide-react';
import { PRODUCTS } from '../data/mockData';
import { Product } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  onCustomizeProduct: (productId: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  onCustomizeProduct,
}) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const results = query.trim()
    ? PRODUCTS.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.category.toLowerCase().includes(query.toLowerCase()) ||
          p.description.toLowerCase().includes(query.toLowerCase()) ||
          p.printMethods.some((pm) => pm.toLowerCase().includes(query.toLowerCase()))
      )
    : PRODUCTS.slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-2xl max-w-xl w-full overflow-hidden animate-fade-in">
        
        {/* Search Input Bar */}
        <div className="p-4 border-b border-zinc-200 flex items-center gap-3 group">
          <Search className="w-5 h-5 text-zinc-400 group-hover:text-[#FF7A00] group-hover:rotate-12 transition-all duration-300 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search custom polos, hoodies, mugs, laser engraving, MOQ..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-sm outline-none text-[#0B0B0D] placeholder-zinc-400"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 group/close cursor-pointer"
          >
            <X className="w-5 h-5 group-hover/close:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Results List */}
        <div className="p-4 max-h-96 overflow-y-auto space-y-2">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2">
            {query.trim() ? `Search Results (${results.length})` : 'Popular Recommendations'}
          </div>

          {results.length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-500">
              No matching merchandise found for "{query}".
            </div>
          ) : (
            results.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-200 group"
              >
                <div 
                  onClick={() => {
                    onSelectProduct(p);
                    onClose();
                  }}
                  className="cursor-pointer flex-1"
                >
                  <div className="text-[10px] font-mono text-zinc-400 uppercase">
                    {p.category} · MOQ: {p.moq} pcs
                  </div>
                  <h4 className="font-display font-semibold text-xs sm:text-sm text-[#0B0B0D] group-hover:text-[#FF7A00] transition-colors">
                    {p.name}
                  </h4>
                  <div className="text-xs font-mono font-bold text-zinc-800 mt-0.5">
                    From ₹{p.tieredPricing[p.tieredPricing.length - 1]?.price || p.basePrice} / pc
                  </div>
                </div>

                <button
                  onClick={() => {
                    onCustomizeProduct(p.id);
                    onClose();
                  }}
                  className="bg-[#FF7A00]/10 hover:bg-[#FF7A00] text-[#FF7A00] hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 shrink-0 ml-2 group/btn cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 group-hover/btn:rotate-45 group-hover/btn:scale-125 transition-all duration-300" />
                  <span>Customize</span>
                </button>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
