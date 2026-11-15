import React, { useState } from 'react';
import { X, User, Building, FileText, CheckCircle2, Search, ArrowRight, Shield } from 'lucide-react';
import { Order } from '../types';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onSelectOrder: (order: Order) => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  orders,
  onSelectOrder,
}) => {
  const [lookupOrderNumber, setLookupOrderNumber] = useState('');
  const [lookupResult, setLookupResult] = useState<Order | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const found = orders.find(
      (o) => o.orderNumber.toLowerCase() === lookupOrderNumber.trim().toLowerCase()
    );
    if (found) {
      setLookupResult(found);
    } else {
      setErrorMsg(`No active order found matching "${lookupOrderNumber}". Check your confirmation email.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-2xl max-w-lg w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FF7A00]/10 text-[#FF7A00] flex items-center justify-center font-bold">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-[#0B0B0D]">Corporate Account & Orders</h3>
              <p className="text-[11px] text-zinc-500">Track proof approvals and GST invoices</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Lookup Box */}
        <form onSubmit={handleLookup} className="space-y-2">
          <label className="block text-xs font-semibold text-zinc-700">Quick Order Tracking Lookup</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter Order ID (e.g. TQ-98104)"
              value={lookupOrderNumber}
              onChange={(e) => setLookupOrderNumber(e.target.value)}
              className="flex-1 px-3 py-2 text-xs border border-zinc-300 rounded-lg outline-none font-mono focus:border-[#FF7A00]"
            />
            <button
              type="submit"
              className="bg-[#0B0B0D] hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Search
            </button>
          </div>
          {errorMsg && <p className="text-[11px] text-red-600 font-medium">{errorMsg}</p>}
        </form>

        {lookupResult && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between items-center font-semibold text-emerald-900">
              <span>Order {lookupResult.orderNumber} Found!</span>
              <span className="text-[11px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-mono">
                {lookupResult.orderStatus}
              </span>
            </div>
            <p className="text-[11px] text-emerald-800">
              Proof Status: <strong>{lookupResult.proofStatus}</strong> · Items: {lookupResult.items.length} SKUs
            </p>
            <button
              onClick={() => {
                onSelectOrder(lookupResult);
                onClose();
              }}
              className="w-full bg-[#0B0B0D] text-white py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <span>View Proof Studio & Invoice</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Recent Orders List */}
        <div className="space-y-2 pt-2 border-t border-zinc-100">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500">
            Recent Orders in Session ({orders.length})
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {orders.map((o) => (
              <div
                key={o.id}
                onClick={() => {
                  onSelectOrder(o);
                  onClose();
                }}
                className="p-3 rounded-xl border border-zinc-200 hover:border-[#FF7A00] transition-colors cursor-pointer flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-mono font-bold text-[#0B0B0D] flex items-center gap-2">
                    <span>{o.orderNumber}</span>
                    <span className="text-[10px] font-normal text-zinc-400">
                      {new Date(o.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    {o.items.length} SKU(s) · ₹{o.total.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    o.proofStatus === 'Approved by Client'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {o.proofStatus}
                  </span>
                  <div className="text-[10px] text-[#FF7A00] font-semibold mt-1">Open Proof →</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GST Profile Details */}
        <div className="bg-[#FAF9FD] rounded-xl p-3.5 border border-[#ECEAF3] text-xs text-zinc-600 space-y-1">
          <div className="font-bold text-[#0B0B0D] flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#FF7A00]" />
            <span>Corporate Account Status</span>
          </div>
          <p className="text-[11px]">
            Input Tax Credit invoices are automatically archived and issued with SAC 9989 compliant GSTIN for corporate books.
          </p>
        </div>

      </div>
    </div>
  );
};
