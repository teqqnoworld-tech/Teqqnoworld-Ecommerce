import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Truck, 
  FileText, 
  ShieldCheck, 
  Printer, 
  Eye, 
  Download, 
  Share2, 
  Sparkles,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { Order } from '../types';
import { ProductMockupCanvas } from './ProductMockupCanvas';
import { generateOrderTaxInvoicePdf } from '../utils/pdfGenerator';

interface OrderConfirmationViewProps {
  order: Order;
  onUpdateOrder: (updated: Order) => void;
  onBackToHome: () => void;
  onNavigateCatalog: () => void;
}

export const OrderConfirmationView: React.FC<OrderConfirmationViewProps> = ({
  order,
  onUpdateOrder,
  onBackToHome,
  onNavigateCatalog,
}) => {
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [proofNote, setProofNote] = useState('');
  const [revisionRequested, setRevisionRequested] = useState(false);
  const [proofView, setProofView] = useState<'front' | 'back'>('front');

  // Approve digital proof
  const handleApproveProof = () => {
    const updated: Order = {
      ...order,
      proofStatus: 'Approved by Client',
      orderStatus: 'Manufacturing',
    };
    onUpdateOrder(updated);
  };

  // Request proof revision
  const handleRequestRevision = (e: React.FormEvent) => {
    e.preventDefault();
    setRevisionRequested(true);
    const updated: Order = {
      ...order,
      proofStatus: 'Proof Generating',
    };
    onUpdateOrder(updated);
  };

  return (
    <div className="bg-[#F5F5F7] min-h-screen py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Top Order Success Banner */}
        <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#FF7A00] bg-[#FF7A00]/10 px-2 py-0.5 rounded">
                  Order {order.orderNumber}
                </span>
                <span className="text-xs text-zinc-500 font-mono">
                  {new Date(order.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B0B0D] tracking-tight mt-1">
                Order Confirmed & Proof Generated
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 mt-1">
                Receipt and digital proof dispatched to <strong className="text-zinc-900">{order.shippingAddress.email}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => generateOrderTaxInvoicePdf(order)}
              className="bg-[#FF7A00] hover:bg-[#ff881a] text-white text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Download official SAC 9989 B2B Tax Invoice (PDF)"
            >
              <Download className="w-4 h-4" />
              <span>Download Tax Invoice (PDF)</span>
            </button>

            <button
              onClick={() => setShowInvoiceModal(true)}
              className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold py-2.5 px-3.5 rounded-xl flex items-center gap-1.5 transition-colors border border-zinc-200 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-zinc-600" />
              <span>View Invoice</span>
            </button>

            <button
              onClick={onNavigateCatalog}
              className="bg-[#0B0B0D] hover:bg-zinc-800 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
            >
              Back to Catalog
            </button>
          </div>
        </div>

        {/* 1:1 Scale Pre-Press Proof Approval Studio Card */}
        <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5E5EA] gap-2">
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#FF7A00] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Pre-Press Approval Checkpoint</span>
              </div>
              <h2 className="font-display font-bold text-xl text-[#0B0B0D] mt-0.5">
                Digital Production Proof
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full ${
                order.proofStatus === 'Approved by Client'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
              }`}>
                ● {order.proofStatus}
              </span>
            </div>
          </div>

          {/* Proof Preview Canvas Display */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            
            <div className="md:col-span-5 bg-[#FAF9FD] rounded-xl p-4 border border-[#ECEAF3] flex flex-col items-center justify-center">
              {order.items[0] && (
                <div className="w-full flex flex-col items-center">
                  <ProductMockupCanvas
                    productType={order.items[0].product.productType}
                    color={order.items[0].color}
                    artwork={proofView === 'front' ? (order.items[0].frontArtwork || order.items[0].artwork) : (order.items[0].backArtwork || order.items[0].artwork)}
                    printMethod={order.items[0].printMethod}
                    printPlacement={proofView === 'front' ? (order.items[0].frontPlacement || order.items[0].printPlacement) : (order.items[0].backPlacement || order.items[0].printPlacement)}
                    view={proofView}
                    showPrintBoundary={true}
                    className="w-full h-64"
                  />
                  {(order.items[0].frontArtwork || order.items[0].backArtwork) && (
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setProofView('front')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          proofView === 'front' ? 'bg-[#FF7A00] text-white shadow-xs' : 'bg-white border border-zinc-200 text-zinc-700'
                        }`}
                      >
                        Front Proof
                      </button>
                      <button
                        type="button"
                        onClick={() => setProofView('back')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          proofView === 'back' ? 'bg-[#FF7A00] text-white shadow-xs' : 'bg-white border border-zinc-200 text-zinc-700'
                        }`}
                      >
                        Back Proof
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="text-[10px] text-zinc-400 font-mono mt-2 text-center">
                1:1 Calibrated Print Tolerance ±1.5mm · Pantone PMS Coated
              </div>
            </div>

            <div className="md:col-span-7 space-y-4">
              <div className="space-y-2 text-xs">
                <div className="font-semibold text-zinc-800">Pre-Press Verification Specs:</div>
                <div className="grid grid-cols-2 gap-2 text-zinc-600 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                  <div>
                    <span className="text-zinc-400 block text-[10px]">Print Method:</span>
                    <span className="font-medium text-zinc-900">{order.items[0]?.printMethod}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px]">Print Position:</span>
                    <span className="font-medium text-zinc-900">{order.items[0]?.printPlacement}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px]">Resolution Check:</span>
                    <span className="text-emerald-700 font-medium">300 DPI Vector Verified</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px]">Color Matching:</span>
                    <span className="font-medium text-zinc-900">Standard Direct Emulsion</span>
                  </div>
                </div>
              </div>

              {order.proofStatus === 'Proof Ready - Needs Approval' ? (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-zinc-600">
                    Please inspect your digital proof above. Once approved, our automated manufacturing line will queue production and schedule 24–48h express dispatch.
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleApproveProof}
                      className="bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-semibold py-2.5 px-5 rounded-xl shadow-md transition-all flex items-center gap-2 hover:-translate-y-0.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve Digital Proof & Queue Production</span>
                    </button>

                    <button
                      onClick={() => setRevisionRequested(true)}
                      className="text-xs text-zinc-600 hover:text-zinc-900 underline"
                    >
                      Request Adjustment
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                  <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Proof Officially Approved by Client</span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Job order sent to our automated manufacturing floor. Live machine queue active.
                  </p>
                </div>
              )}

              {/* Revision form if requested */}
              {revisionRequested && order.proofStatus !== 'Approved by Client' && (
                <form onSubmit={handleRequestRevision} className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2 text-xs">
                  <div className="font-semibold text-zinc-800">Specify Desired Adjustment:</div>
                  <textarea
                    rows={2}
                    value={proofNote}
                    onChange={(e) => setProofNote(e.target.value)}
                    placeholder="e.g. Move logo 2cm higher or enlarge logo by 15%..."
                    className="w-full p-2 border border-zinc-300 rounded-lg text-xs outline-none focus:border-[#FF7A00]"
                  />
                  <button
                    type="submit"
                    className="bg-[#0B0B0D] text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                  >
                    Submit Revision Request
                  </button>
                </form>
              )}

            </div>

          </div>
        </div>

        {/* 4-Stage Manufacturing & Delivery Pipeline Tracker */}
        <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E5E5EA] gap-2">
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#FF7A00]">
                Live Logistics Tracker
              </div>
              <h3 className="font-display font-bold text-lg text-[#0B0B0D]">
                Manufacturing & Delivery Lifecycle
              </h3>
            </div>

            <div className="text-xs font-mono text-zinc-600">
              Partner: <strong>{order.courierPartner}</strong> · Waybill: <strong>{order.trackingNumber}</strong>
            </div>
          </div>

          {/* 6-Stage Production Timeline */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
            {[
              {
                step: '1',
                title: 'Order Logged',
                desc: order.paymentMode,
                done: true,
              },
              {
                step: '2',
                title: 'Proof Verification',
                desc: order.proofStatus === 'Approved by Client' ? 'Approved & Signed off' : 'Pending Client Review',
                done: order.proofStatus === 'Approved by Client',
              },
              {
                step: '3',
                title: 'Factory Run',
                desc: order.proofStatus === 'Approved by Client' ? 'Active on Machines' : 'Queued post-proof',
                done: order.proofStatus === 'Approved by Client',
              },
              {
                step: '4',
                title: 'Quality Check',
                desc: 'GSM & print tolerance audit',
                done: order.orderStatus === 'Dispatched' || order.orderStatus === 'Delivered',
              },
              {
                step: '5',
                title: 'Air Dispatch',
                desc: `BlueDart: ${order.trackingNumber || 'Pending'}`,
                done: order.orderStatus === 'Dispatched' || order.orderStatus === 'Delivered',
              },
              {
                step: '6',
                title: 'Delivered',
                desc: `ETA: ${order.estimatedDispatch}`,
                done: order.orderStatus === 'Delivered',
              },
            ].map((st) => (
              <div
                key={st.step}
                className={`p-3.5 rounded-xl border transition-colors text-xs ${
                  st.done
                    ? 'border-emerald-300 bg-emerald-50/60 text-emerald-950'
                    : 'border-zinc-200 bg-zinc-50/60 text-zinc-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    st.done ? 'bg-emerald-600 text-white' : 'bg-zinc-200 text-zinc-600'
                  }`}>
                    {st.step}
                  </span>
                  {st.done && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <h4 className="font-display font-bold text-xs text-[#0B0B0D] truncate">{st.title}</h4>
                <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">{st.desc}</p>
              </div>
            ))}
          </div>

          <div className="pt-2 text-xs text-zinc-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-[#FF7A00]" />
              <span>Deliver to: {order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.pincode}</span>
            </span>
            <span className="font-mono text-zinc-700">Contact: {order.shippingAddress.phone}</span>
          </div>
        </div>

        {/* Itemized Order Details Card */}
        <div className="bg-white rounded-2xl border border-[#E5E5EA] p-6 shadow-xs space-y-4">
          <h3 className="font-display font-bold text-base text-[#0B0B0D] pb-3 border-b border-[#E5E5EA]">
            Order Specifications & B2B Financial Summary
          </h3>

          <div className="divide-y divide-zinc-100">
            {order.items.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div>
                  <h4 className="font-semibold text-[#0B0B0D] text-sm">{item.product.name}</h4>
                  <div className="text-zinc-500 text-[11px] mt-0.5">
                    Color: {item.color.name} {item.size ? `· Size: ${item.size}` : ''} · Tech: {item.printMethod} ({item.printPlacement})
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-zinc-500">{item.quantity} units @ ₹{item.unitPrice}</div>
                  <div className="font-mono font-bold text-sm text-[#0B0B0D]">
                    ₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#FAF9FD] rounded-xl p-4 border border-[#ECEAF3] space-y-2 text-xs">
            <div className="flex justify-between text-zinc-600">
              <span>Subtotal:</span>
              <span className="font-mono text-zinc-900">₹{order.subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Pan-India Logistics:</span>
              <span className="font-mono text-emerald-700 font-semibold">
                {order.shippingFee === 0 ? 'FREE' : `₹${order.shippingFee}`}
              </span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>GST (18% ITC Credit):</span>
              <span className="font-mono text-zinc-900">₹{order.gstAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="pt-2 border-t border-zinc-200 flex justify-between font-display font-bold text-base text-[#0B0B0D]">
              <span>Total Amount:</span>
              <span className="text-[#FF7A00]">₹{order.total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Official GST Tax Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div id="printable-tax-invoice" className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            
            {/* Invoice Header */}
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <div className="text-xs font-mono font-bold text-[#FF7A00]">ORIGINAL FOR RECIPIENT</div>
                <h3 className="font-display font-bold text-xl text-[#0B0B0D]">TAX INVOICE</h3>
                <p className="text-[11px] text-zinc-500 font-mono">Invoice #{order.orderNumber}-INV · Date: {new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
              </div>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="no-print text-zinc-400 hover:text-zinc-700 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Company & Client Addresses */}
            <div className="grid grid-cols-2 gap-6 text-xs">
              <div>
                <span className="font-bold text-zinc-400 uppercase text-[10px]">Supplier:</span>
                <div className="font-bold text-[#0B0B0D] mt-1">TeqqnoWorld Custom E-Commerce Pvt Ltd</div>
                <div className="text-zinc-600 mt-0.5">Unit 14, MIDC Industrial Area, Andheri (E), Mumbai 400093</div>
                <div className="font-mono text-[11px] text-zinc-700 mt-1">GSTIN: 27AABCT9841P1ZB (Maharashtra)</div>
                <div className="text-zinc-500 text-[10px]">State Code: 27 (MH)</div>
              </div>

              <div>
                <span className="font-bold text-zinc-400 uppercase text-[10px]">Billed & Shipped To:</span>
                <div className="font-bold text-[#0B0B0D] mt-1">{order.shippingAddress.companyName || order.shippingAddress.fullName}</div>
                <div className="text-zinc-600 mt-0.5">{order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</div>
                <div className="font-mono text-[11px] text-[#FF7A00] font-bold mt-1">
                  GSTIN: {order.shippingAddress.gstin || 'B2C Consumer'}
                </div>
              </div>
            </div>

            {/* Invoice Line Items */}
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b bg-zinc-50 text-[11px] font-mono text-zinc-600">
                  <th className="py-2 px-2">Description</th>
                  <th className="py-2 px-2">SAC/HSN</th>
                  <th className="py-2 px-2 text-right">Qty</th>
                  <th className="py-2 px-2 text-right">Rate</th>
                  <th className="py-2 px-2 text-right">Taxable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {order.items.map((i) => (
                  <tr key={i.id}>
                    <td className="py-2 px-2 font-medium">
                      {i.product.name} ({i.printMethod})
                    </td>
                    <td className="py-2 px-2 font-mono text-zinc-500">9989</td>
                    <td className="py-2 px-2 text-right font-mono">{i.quantity}</td>
                    <td className="py-2 px-2 text-right font-mono">₹{i.unitPrice}</td>
                    <td className="py-2 px-2 text-right font-mono font-bold">
                      ₹{(i.unitPrice * i.quantity).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Tax Computation */}
            <div className="bg-[#FAF9FD] p-4 rounded-xl border border-[#ECEAF3] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span>Total Taxable Amount:</span>
                <span className="font-mono font-bold">₹{order.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Integrated GST (IGST 18%):</span>
                <span className="font-mono">₹{order.gstAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Logistics:</span>
                <span className="font-mono">₹{order.shippingFee}</span>
              </div>
              <div className="pt-2 border-t flex justify-between font-bold text-sm text-[#0B0B0D]">
                <span>Total Invoice Value:</span>
                <span className="text-[#FF7A00]">₹{order.total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="no-print flex flex-wrap justify-end gap-3 pt-2">
              <button
                onClick={() => generateOrderTaxInvoicePdf(order)}
                className="bg-[#FF7A00] hover:bg-[#ff881a] text-white text-xs font-semibold py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Official PDF</span>
              </button>

              <button
                onClick={() => window.print()}
                className="bg-[#0B0B0D] hover:bg-zinc-800 text-white text-xs font-semibold py-2 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>

              <button
                onClick={() => setShowInvoiceModal(false)}
                className="border border-zinc-300 text-zinc-700 text-xs font-semibold py-2 px-4 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
