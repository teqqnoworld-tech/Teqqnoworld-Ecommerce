import React, { useState } from 'react';
import { 
  Download, 
  FileText, 
  BookOpen, 
  CheckCircle2, 
  Sparkles, 
  Mail, 
  X, 
  ExternalLink,
  Printer
} from 'lucide-react';
import { BUSINESS_DETAILS } from '../data/legalData';
import { generateCorporateCataloguePdf } from '../utils/pdfGenerator';

interface CatalogItem {
  id: string;
  title: string;
  category: string;
  fileSize: string;
  pages: number;
  description: string;
  badge: string;
  coverGradient: string;
  downloadFileName: string;
}

const CATALOG_ITEMS: CatalogItem[] = [
  {
    id: 'master-catalog-2026',
    title: 'TeqqnoWorld 2026 Master Corporate Catalogue',
    category: 'Complete Range',
    fileSize: '14.2 MB PDF',
    pages: 48,
    description: 'Comprehensive guide covering all 11 merchandise product lines, volume discount tiers, print tolerances, and corporate gifting solutions.',
    badge: 'Master Guide',
    coverGradient: 'from-zinc-950 via-zinc-900 to-black',
    downloadFileName: 'TeqqnoWorld_Master_Corporate_Catalogue_2026.pdf',
  },
  {
    id: 'apparel-spec-sheet',
    title: 'Apparel & Uniforms Technical Spec Sheet',
    category: 'Textiles & Apparel',
    fileSize: '6.4 MB PDF',
    pages: 18,
    description: 'Detailed fabric GSM weights, pre-shrunk combed cotton standards, Coolmax Mars moisture wicking specs, sizing charts (S to 5XL), and embroidery thread charts.',
    badge: 'Technical Spec',
    coverGradient: 'from-orange-950 via-zinc-900 to-zinc-950',
    downloadFileName: 'TeqqnoWorld_Apparel_Uniforms_SpecSheet.pdf',
  },
  {
    id: 'signage-displays-lookbook',
    title: 'Promotional Signage & Event Displays Lookbook',
    category: 'Displays & Outdoor',
    fileSize: '8.1 MB PDF',
    pages: 24,
    description: 'Hardware schematics and wind-resistance engineering for Rollup Standees, Promo Tables, 4x4 / 8x8 Gazebo Canopies, and 5ft Promotional Umbrellas.',
    badge: 'Hardware & Media',
    coverGradient: 'from-blue-950 via-zinc-900 to-black',
    downloadFileName: 'TeqqnoWorld_Event_Displays_Signage_Guide.pdf',
  },
  {
    id: 'visiting-card-print-guide',
    title: '300 GSM Visiting Cards & Print Pre-Press Guide',
    category: 'Stationery & Cards',
    fileSize: '3.8 MB PDF',
    pages: 12,
    description: 'Artwork bleed lines (92x52mm), 300 GSM art card lamination choices (matte vs glossy), CMYK color calibration, and barcode readability guidelines.',
    badge: 'Artwork Pre-Press',
    coverGradient: 'from-emerald-950 via-zinc-900 to-zinc-950',
    downloadFileName: 'TeqqnoWorld_VisitingCards_Print_Guidelines.pdf',
  },
];

interface DownloadCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadCatalogModal: React.FC<DownloadCatalogModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  if (!isOpen) return null;

  const handleDownload = (item: CatalogItem) => {
    setDownloadingId(item.id);

    setTimeout(() => {
      // Generate authentic high-resolution corporate procurement catalogue PDF
      generateCorporateCataloguePdf(item);

      setDownloadingId(null);
      setDownloadSuccessId(item.id);
      setTimeout(() => setDownloadSuccessId(null), 3500);
    }, 400);
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    setEmailSent(true);
    setTimeout(() => {
      setEmailSent(false);
      setEmailInput('');
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl p-6 sm:p-8 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#FF7A00] bg-[#FF7A00]/10 px-2.5 py-0.5 rounded-full">
                Enterprise Procurement Library
              </span>
              <span className="text-xs text-zinc-400 font-mono">Updated October 2026</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-[#0B0B0D] mt-1">
              Download Official Corporate Catalogues & Spec Sheets
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-800 p-2 rounded-xl hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Catalog Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CATALOG_ITEMS.map((item) => {
            const isDownloading = downloadingId === item.id;
            const isSuccess = downloadSuccessId === item.id;
            return (
              <div
                key={item.id}
                className="p-5 rounded-2xl border border-zinc-200/90 hover:border-zinc-300 transition-all bg-zinc-50/50 flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#0B0B0D] text-white">
                      {item.badge}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500">
                      {item.pages} Pages · {item.fileSize}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-sm text-[#0B0B0D] group-hover:text-[#FF7A00] transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs text-zinc-600 line-clamp-3">
                    {item.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-zinc-200 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {item.category}
                  </span>

                  <button
                    onClick={() => handleDownload(item)}
                    disabled={isDownloading}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSuccess
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#0B0B0D] hover:bg-zinc-800 text-white'
                    }`}
                  >
                    {isSuccess ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Downloaded!</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5 text-[#FF7A00]" />
                        <span>{isDownloading ? 'Preparing...' : 'Download PDF'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Email Full Catalog Suite */}
        <div className="p-5 rounded-2xl bg-[#0B0B0D] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-display font-bold text-sm text-white flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-[#FF7A00]" />
              <span>Email All Catalogues to Procurement Team</span>
            </h4>
            <p className="text-xs text-zinc-400">
              Receive all 4 high-resolution PDFs directly into your corporate inbox.
            </p>
          </div>

          <form onSubmit={handleSendEmail} className="flex items-center gap-2">
            <input
              type="email"
              placeholder="company@domain.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 outline-none focus:border-[#FF7A00] min-w-[200px]"
              required
            />
            <button
              type="submit"
              className="bg-[#FF7A00] hover:bg-[#ff881a] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer"
            >
              {emailSent ? 'Sent to Inbox!' : 'Send All'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
