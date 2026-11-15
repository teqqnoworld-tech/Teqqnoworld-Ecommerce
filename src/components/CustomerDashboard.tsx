import React, { useState } from 'react';
import { 
  User, 
  Package, 
  Truck, 
  Palette, 
  MapPin, 
  FileText, 
  Receipt, 
  Heart, 
  Layers, 
  Bell, 
  Settings, 
  HelpCircle, 
  LogOut, 
  ShieldCheck, 
  Building2, 
  CheckCircle2, 
  Clock, 
  Search, 
  Plus, 
  ExternalLink, 
  Download, 
  RotateCcw, 
  Trash2, 
  ChevronRight, 
  Printer, 
  Upload, 
  Sparkles, 
  AlertCircle,
  Phone,
  Mail,
  Copy,
  Check
} from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import { 
  UserProfile, 
  Order, 
  SavedAddress, 
  CustomerArtwork, 
  TaxInvoice, 
  BulkEnquirySubmission, 
  NotificationItem,
  Product,
  CartItem
} from '../types';
import { 
  MOCK_ARTWORKS, 
  MOCK_INVOICES, 
  MOCK_BULK_QUOTES, 
  MOCK_NOTIFICATIONS, 
  PRODUCTS 
} from '../data/mockData';
import { BUSINESS_CONFIG, getWhatsAppLink } from '../config/business';
import { generateOrderTaxInvoicePdf, generateTaxInvoicePdf } from '../utils/pdfGenerator';

export type DashboardTab = 
  | 'overview' 
  | 'orders' 
  | 'track' 
  | 'artworks' 
  | 'addresses' 
  | 'gst' 
  | 'invoices' 
  | 'wishlist' 
  | 'quotes' 
  | 'notifications' 
  | 'settings' 
  | 'support';

interface CustomerDashboardProps {
  user: UserProfile;
  orders: Order[];
  onUpdateUser: (updatedUser: UserProfile) => void;
  onLogout: () => void;
  onNavigateTab: (tab: string) => void;
  onCustomizeProduct: (productId: string) => void;
  onReorder: (order: Order) => void;
  onSelectOrderProof: (order: Order) => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  user,
  orders,
  onUpdateUser,
  onLogout,
  onNavigateTab,
  onCustomizeProduct,
  onReorder,
  onSelectOrderProof,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // Local state for dashboard sub-features
  const [addresses, setAddresses] = useState<SavedAddress[]>(user.savedAddresses || []);
  const [artworks, setArtworks] = useState<CustomerArtwork[]>(MOCK_ARTWORKS);
  const [invoices, setInvoices] = useState<TaxInvoice[]>(MOCK_INVOICES);
  const [bulkQuotes, setBulkQuotes] = useState<BulkEnquirySubmission[]>(MOCK_BULK_QUOTES);
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const [wishlist, setWishlist] = useState<Product[]>([PRODUCTS[0], PRODUCTS[2]]);

  // Order filters
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'All' | 'Confirmed' | 'Artwork Verification' | 'Dispatched' | 'Delivered'>('All');

  // Selected order for live tracking view
  const [selectedTrackOrder, setSelectedTrackOrder] = useState<Order>(orders[0] || null);

  // Invoice preview modal
  const [activeInvoicePreview, setActiveInvoicePreview] = useState<TaxInvoice | null>(null);

  // Address modal
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [addressFormData, setAddressFormData] = useState({
    title: 'New Branch Office',
    fullName: user.name,
    companyName: user.companyName || '',
    phone: user.mobile,
    street: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    isDefault: false,
    type: 'shipping' as 'shipping' | 'billing' | 'both',
  });

  // Artwork upload state
  const [newArtworkTitle, setNewArtworkTitle] = useState('');
  const [isUploadingArtwork, setIsUploadingArtwork] = useState(false);
  const [artworkUploadSuccess, setArtworkUploadSuccess] = useState(false);

  // Settings profile form state
  const [profileName, setProfileName] = useState(user.name);
  const [profileEmail, setProfileEmail] = useState(user.email);
  const [profileCompany, setProfileCompany] = useState(user.companyName || '');
  const [profileDesignation, setProfileDesignation] = useState(user.designation || '');
  const [profileGstin, setProfileGstin] = useState(user.gstin || '');
  const [profileSavedToast, setProfileSavedToast] = useState(false);

  // Copy helper
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch = 
      o.orderNumber.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.items.some(i => i.product.name.toLowerCase().includes(orderSearchQuery.toLowerCase()));
    const matchesFilter = orderStatusFilter === 'All' || o.orderStatus === orderStatusFilter;
    return matchesSearch && matchesFilter;
  });

  // Handle Save Address
  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressFormData.street || !addressFormData.pincode) return;

    if (editingAddress) {
      const updated = addresses.map(a => a.id === editingAddress.id ? { ...a, ...addressFormData } : a);
      setAddresses(updated);
      onUpdateUser({ ...user, savedAddresses: updated });
    } else {
      const newAddr: SavedAddress = {
        id: `addr-${Date.now()}`,
        ...addressFormData,
      };
      const updated = addressFormData.isDefault 
        ? [newAddr, ...addresses.map(a => ({ ...a, isDefault: false }))]
        : [newAddr, ...addresses];
      setAddresses(updated);
      onUpdateUser({ ...user, savedAddresses: updated });
    }
    setIsAddressModalOpen(false);
    setEditingAddress(null);
  };

  const handleDeleteAddress = (id: string) => {
    const updated = addresses.filter(a => a.id !== id);
    setAddresses(updated);
    onUpdateUser({ ...user, savedAddresses: updated });
  };

  // Handle Upload Artwork Mock
  const handleUploadArtwork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArtworkTitle.trim()) return;
    setIsUploadingArtwork(true);

    setTimeout(() => {
      const newArt: CustomerArtwork = {
        id: `art-${Date.now()}`,
        title: newArtworkTitle.trim(),
        fileType: 'vector',
        fileName: `${newArtworkTitle.toLowerCase().replace(/\s+/g, '_')}_vector.ai`,
        fileSize: '4.8 MB',
        resolution: '300 DPI Vector PDF/AI',
        uploadedAt: new Date().toISOString().split('T')[0],
        status: 'Approved for Production',
        previewUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
        associatedOrdersCount: 0,
      };
      setArtworks([newArt, ...artworks]);
      setIsUploadingArtwork(false);
      setNewArtworkTitle('');
      setArtworkUploadSuccess(true);
      setTimeout(() => setArtworkUploadSuccess(false), 3000);
    }, 700);
  };

  // Handle Save Profile Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...user,
      name: profileName,
      email: profileEmail,
      companyName: profileCompany,
      designation: profileDesignation,
      gstin: profileGstin,
    };
    onUpdateUser(updated);
    setProfileSavedToast(true);
    setTimeout(() => setProfileSavedToast(false), 3000);
  };

  // Nav menu items
  const navItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: Layers },
    { id: 'orders', label: 'My Orders & Proofs', icon: Package, badge: orders.length },
    { id: 'track', label: 'Track Consignment', icon: Truck },
    { id: 'artworks', label: 'My Artwork & Logos', icon: Palette, badge: artworks.length },
    { id: 'addresses', label: 'Saved Addresses', icon: MapPin },
    { id: 'gst', label: 'GST & Corporate Tax', icon: Building2 },
    { id: 'invoices', label: 'Tax Invoices (SAC 9989)', icon: Receipt },
    { id: 'wishlist', label: 'Saved Wishlist', icon: Heart, badge: wishlist.length },
    { id: 'quotes', label: 'Bulk RFQ Enquiries', icon: FileText, badge: bulkQuotes.length },
    { id: 'notifications', label: 'Alerts & Proof Updates', icon: Bell, badge: notifications.filter(n => !n.read).length },
    { id: 'settings', label: 'Account & Preferences', icon: Settings },
    { id: 'support', label: 'Help & WhatsApp Support', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-[#F4F2FA] text-[#0B0B0D] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 1. Header Profile Strip */}
        <div className="bg-[#0B0B0D] text-white rounded-3xl p-6 sm:p-8 border border-zinc-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#FF7A00] to-amber-500 flex items-center justify-center text-white font-display font-bold text-2xl shadow-lg shadow-[#FF7A00]/25">
              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold font-display text-white tracking-tight">
                  Welcome back, {user.name}!
                </h1>
                <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified B2B Account</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-1">
                <span>📱 +91 {user.mobile}</span>
                <span>•</span>
                <span>🏢 {user.companyName || 'Corporate Client'}</span>
                {user.gstin && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-zinc-300">GSTIN: {user.gstin}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateTab('catalog')}
              className="bg-[#FF7A00] hover:bg-[#ff881a] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 group cursor-pointer"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 group-hover:scale-125 transition-transform duration-300" />
              <span>New Custom Order</span>
            </button>
            <button
              onClick={onLogout}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 group cursor-pointer"
            >
              <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* 2. Main Dashboard Container: Sidebar + Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Mobile & Tablet Horizontal Tab Navigation Bar (Sticky & Scrollable) */}
          <div className="lg:hidden w-full bg-white rounded-2xl border border-zinc-200/90 shadow-xs p-2 sticky top-18 z-30">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as DashboardTab)}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs whitespace-nowrap transition-all shrink-0 min-h-[44px] cursor-pointer ${
                      isActive 
                        ? 'bg-[#0B0B0D] text-white font-bold shadow-xs' 
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#FF7A00]' : 'text-zinc-500'}`} />
                    <span>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-[#FF7A00] text-white' : 'bg-white text-zinc-700'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop Left Sidebar Navigation */}
          <div className="hidden lg:block lg:col-span-1 bg-white rounded-3xl border border-zinc-200/90 shadow-sm p-3 space-y-1">
            <div className="px-3 py-2 text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              Corporate Account Portal
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as DashboardTab)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                      isActive 
                        ? 'bg-[#0B0B0D] text-white font-semibold shadow-xs' 
                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-[#0B0B0D]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 transition-transform duration-300 group-hover:scale-120 ${isActive ? 'text-[#FF7A00]' : 'text-zinc-400 group-hover:text-[#FF7A00]'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-[#FF7A00] text-white' : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-zinc-100 px-3 pb-2 text-[11px] text-zinc-500 space-y-2">
              <div className="flex items-center gap-1.5 text-zinc-700 font-semibold group cursor-default">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 animate-icon-pulse-glow" />
                <span>GST Verified Partner</span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Direct printing manufacturer with 100% in-house DTF, Embroidery, and Laser Engraving labs.
              </p>
            </div>
          </div>

          {/* Right Main Content Area */}
          <div className="lg:col-span-3 space-y-6">

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                
                {/* 4 KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-zinc-200/90 shadow-2xs">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#FF7A00] flex items-center justify-center mb-3">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold font-display text-[#0B0B0D]">{orders.length}</div>
                    <div className="text-xs text-zinc-500 font-medium">Total Orders Placed</div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-zinc-200/90 shadow-2xs">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold font-display text-[#0B0B0D]">
                      {orders.filter(o => o.orderStatus !== 'Delivered').length}
                    </div>
                    <div className="text-xs text-zinc-500 font-medium">Active In Production</div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-zinc-200/90 shadow-2xs">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold font-display text-[#0B0B0D]">{invoices.length}</div>
                    <div className="text-xs text-zinc-500 font-medium">ITC Tax Invoices</div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-zinc-200/90 shadow-2xs">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                      <Palette className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold font-display text-[#0B0B0D]">{artworks.length}</div>
                    <div className="text-xs text-zinc-500 font-medium">Vector Brand Assets</div>
                  </div>
                </div>

                {/* Quick Actions Strip */}
                <div className="bg-white p-5 rounded-2xl border border-zinc-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-[#0B0B0D]">
                    Quick Corporate Actions:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onNavigateTab('quote-calculator')}
                      className="bg-[#0B0B0D] hover:bg-zinc-800 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#FF7A00]" />
                      <span>B2B Quote Calculator</span>
                    </button>
                    <button
                      onClick={() => onNavigateTab('bundle-builder')}
                      className="bg-orange-50 hover:bg-orange-100 text-[#FF7A00] border border-orange-200 text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Gift Bundle Builder</span>
                    </button>
                    <button
                      onClick={() => onCustomizeProduct('prod-polo-01')}
                      className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Customizer Studio</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('track')}
                      className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Track BlueDart Air</span>
                    </button>
                  </div>
                </div>

                {/* Recent Orders Overview */}
                <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-bold text-base text-[#0B0B0D]">Recent Orders</h3>
                      <p className="text-xs text-zinc-500">Live manufacturing status and digital proof reviews</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className="text-xs text-[#FF7A00] font-semibold hover:underline flex items-center gap-1"
                    >
                      <span>View All ({orders.length})</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {orders.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500 text-xs">
                      No orders yet. Start with our Customizer Studio!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.slice(0, 3).map((order) => (
                        <div
                          key={order.id}
                          className="p-4 rounded-xl border border-zinc-200 hover:border-[#FF7A00]/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-[#0B0B0D]">{order.orderNumber}</span>
                              <span className="text-[11px] text-zinc-400">
                                {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                order.orderStatus === 'Delivered' 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {order.orderStatus}
                              </span>
                            </div>

                            <div className="text-xs text-zinc-600">
                              {order.items.map(i => `${i.quantity}x ${i.product.name}`).join(', ')}
                            </div>
                            <div className="text-xs font-mono font-semibold text-zinc-900">
                              Total: ₹{order.total.toLocaleString('en-IN')} (incl. 18% GST)
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => {
                                onSelectOrderProof(order);
                                onNavigateTab('orders');
                              }}
                              className="bg-[#0B0B0D] hover:bg-zinc-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <span>Proof Studio</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTrackOrder(order);
                                setActiveTab('track');
                              }}
                              className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <Truck className="w-3 h-3" />
                              <span>Track</span>
                            </button>
                            <button
                              onClick={() => onReorder(order)}
                              className="bg-orange-50 hover:bg-orange-100 text-[#FF7A00] text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reorder</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Active Artwork Snapshot */}
                <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-bold text-base text-[#0B0B0D]">Master Brand Assets</h3>
                      <p className="text-xs text-zinc-500">Vector logos approved for machine calibration & embroidery</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('artworks')}
                      className="text-xs text-[#FF7A00] font-semibold hover:underline flex items-center gap-1"
                    >
                      <span>Manage Artworks</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {artworks.slice(0, 2).map((art) => (
                      <div key={art.id} className="p-3 rounded-xl border border-zinc-200 flex items-center gap-3">
                        <img 
                          src={art.previewUrl} 
                          alt={art.title} 
                          width={48}
                          height={48}
                          loading="lazy"
                          decoding="async"
                          className="w-12 h-12 object-cover rounded-lg border border-zinc-200 shrink-0" 
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-xs text-[#0B0B0D] truncate">{art.title}</div>
                          <div className="text-[11px] font-mono text-zinc-400">{art.fileName} • {art.fileSize}</div>
                          <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            {art.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: MY ORDERS */}
            {activeTab === 'orders' && (
              <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-6 space-y-6">
                <div>
                  <h3 className="font-display font-bold text-lg text-[#0B0B0D]">My Orders & Digital Proofs</h3>
                  <p className="text-xs text-zinc-500">
                    Track factory progress, inspect Pantone proofs, reorder batches, and retrieve GST invoices.
                  </p>
                </div>

                {/* Search & Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search Order ID or product..."
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-xl outline-none focus:border-[#FF7A00]"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                    {(['All', 'Confirmed', 'Artwork Verification', 'Dispatched', 'Delivered'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => setOrderStatusFilter(status)}
                        className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                          orderStatusFilter === status
                            ? 'bg-[#0B0B0D] text-white font-semibold'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Orders List */}
                {filteredOrders.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <Package className="w-12 h-12 text-zinc-300 mx-auto" />
                    <h4 className="font-semibold text-zinc-800 text-sm">No orders found</h4>
                    <p className="text-xs text-zinc-500">Try adjusting your search query or filter</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredOrders.map((order) => (
                      <div 
                        key={order.id} 
                        className="p-5 rounded-2xl border border-zinc-200 hover:border-zinc-300 transition-all space-y-4 bg-zinc-50/50"
                      >
                        {/* Order Header */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-200">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-[#0B0B0D]">{order.orderNumber}</span>
                              <span className="text-xs text-zinc-500 font-medium">
                                Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-500 mt-0.5">
                              Shipping to: {order.shippingAddress.fullName} · {order.shippingAddress.city}, {order.shippingAddress.state}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-full ${
                              order.proofStatus === 'Approved by Client'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              Proof: {order.proofStatus}
                            </span>
                            <span className="text-xs font-mono font-bold bg-zinc-900 text-white px-2.5 py-1 rounded-full">
                              {order.orderStatus}
                            </span>
                          </div>
                        </div>

                        {/* Order Line Items */}
                        <div className="space-y-3">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-zinc-200 flex items-center justify-center font-bold text-zinc-600 text-[10px]">
                                  {item.product.productType.slice(0, 3).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-zinc-900">{item.product.name}</div>
                                  <div className="text-[11px] text-zinc-500">
                                    Color: {item.color.name} {item.size ? `· Size: ${item.size}` : ''} · Print: {item.printMethod} ({item.printPlacement})
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-mono font-bold text-zinc-900">
                                  {item.quantity} units @ ₹{item.unitPrice}
                                </div>
                                <div className="text-[11px] font-mono text-zinc-500">
                                  ₹{item.totalPrice.toLocaleString('en-IN')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Pricing & Footer Actions */}
                        <div className="pt-3 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div>
                            <span className="text-zinc-500">Grand Total: </span>
                            <span className="font-mono font-bold text-sm text-[#0B0B0D]">
                              ₹{order.total.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[11px] text-zinc-400 font-mono ml-1.5">
                              (incl. ₹{order.gstAmount.toLocaleString('en-IN')} GST)
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => {
                                onSelectOrderProof(order);
                                onNavigateTab('orders');
                              }}
                              className="bg-[#0B0B0D] hover:bg-zinc-800 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                            >
                              <span>3D Digital Proof & Approval</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                setSelectedTrackOrder(order);
                                setActiveTab('track');
                              }}
                              className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Track BlueDart</span>
                            </button>

                            <button
                              onClick={() => {
                                generateOrderTaxInvoicePdf(order);
                              }}
                              className="bg-zinc-100 hover:bg-[#FF7A00] hover:text-white text-zinc-800 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                              title="Download official B2B Tax Invoice (PDF)"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download Invoice</span>
                            </button>

                            <button
                              onClick={() => onReorder(order)}
                              className="bg-orange-50 hover:bg-orange-100 text-[#FF7A00] text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>1-Click Reorder</span>
                            </button>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: TRACK ORDER & CONSIGNMENT */}
            {activeTab === 'track' && (
              <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-6 space-y-6">
                <div>
                  <h3 className="font-display font-bold text-lg text-[#0B0B0D]">Live Consignment Milestone Tracker</h3>
                  <p className="text-xs text-zinc-500">
                    Integrated with BlueDart Apex Express & Delhivery Surface for time-sensitive corporate shipments.
                  </p>
                </div>

                {/* Order Selector */}
                <div className="flex flex-wrap items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs">
                  <span className="font-semibold text-zinc-700">Select Order to Track:</span>
                  <select
                    value={selectedTrackOrder?.id}
                    onChange={(e) => {
                      const found = orders.find(o => o.id === e.target.value);
                      if (found) setSelectedTrackOrder(found);
                    }}
                    className="bg-white border border-zinc-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-medium outline-none focus:border-[#FF7A00]"
                  >
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.orderNumber} ({o.items.length} items - ₹{o.total.toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTrackOrder && (
                  <div className="space-y-6">
                    {/* Airway Bill Badge Card */}
                    <div className="p-4 rounded-xl bg-[#0B0B0D] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-[11px] font-mono text-[#FF7A00] uppercase tracking-wider font-semibold">
                          COURIER PARTNER: {selectedTrackOrder.courierPartner || 'BlueDart Apex Express'}
                        </div>
                        <div className="text-base font-mono font-bold flex items-center gap-2">
                          <span>AWB: {selectedTrackOrder.trackingNumber || 'BD-AIR-8920194812'}</span>
                          <button
                            onClick={() => handleCopy(selectedTrackOrder.trackingNumber || 'BD-AIR-8920194812')}
                            className="p-1 hover:text-[#FF7A00] text-zinc-400"
                            title="Copy AWB"
                          >
                            {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <div className="text-xs text-zinc-400">
                          Destination: {selectedTrackOrder.shippingAddress.city}, {selectedTrackOrder.shippingAddress.state} ({selectedTrackOrder.shippingAddress.pincode})
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <div className="text-[11px] text-zinc-400">Estimated Delivery:</div>
                        <div className="text-sm font-bold text-white">
                          {selectedTrackOrder.estimatedDispatch} (Air Express)
                        </div>
                        <span className="inline-block mt-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          On Schedule
                        </span>
                      </div>
                    </div>

                    {/* 6-Stage Milestone Progress Bar */}
                    <div className="space-y-4 pt-2">
                      <div className="text-xs font-semibold text-zinc-800">Manufacturing & Transit Timeline:</div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                        {[
                          { title: '1. Order Received', desc: 'Specs recorded', done: true, time: 'Day 0' },
                          { title: '2. Proof Signed', desc: 'Vector approved', done: true, time: 'Day 0 (+2h)' },
                          { title: '3. Machine Run', desc: 'DTF / Embroidery', done: true, time: 'Day 1' },
                          { title: '4. QC & Ironing', desc: 'Passed 10-pt check', done: true, time: 'Day 1' },
                          { title: '5. Dispatched', desc: 'Handed to BlueDart', done: false, time: 'Day 2' },
                          { title: '6. Delivered', desc: 'Signed at dock', done: false, time: 'Day 3' },
                        ].map((stage, idx) => (
                          <div 
                            key={idx} 
                            className={`p-3 rounded-xl border text-xs space-y-1 ${
                              stage.done 
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
                                : 'bg-zinc-50 border-zinc-200 text-zinc-500'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-bold">
                              {stage.done ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
                              )}
                              <span className="text-[11px] truncate">{stage.title}</span>
                            </div>
                            <div className="text-[10px] opacity-80">{stage.desc}</div>
                            <div className="text-[9px] font-mono font-semibold text-zinc-500">{stage.time}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Checkpoints Log */}
                    <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200 space-y-3 text-xs">
                      <div className="font-semibold text-zinc-800">Scanned Hub Events:</div>
                      <div className="space-y-2 font-mono text-[11px]">
                        <div className="flex items-start gap-2 text-zinc-800">
                          <span className="text-emerald-600 font-bold">• 10:45 AM</span>
                          <span>Factory Finished Goods Bay: Quality Inspector cleared 50 units. Polybag sealed.</span>
                        </div>
                        <div className="flex items-start gap-2 text-zinc-800">
                          <span className="text-emerald-600 font-bold">• 08:30 AM</span>
                          <span>Embroidery Lab #3: High-speed Tajima heads completed left-chest crest.</span>
                        </div>
                        <div className="flex items-start gap-2 text-zinc-600">
                          <span className="text-zinc-400 font-bold">• Yesterday</span>
                          <span>Pre-press Studio: Color separation & underbase white density approved.</span>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* TAB 4: MY ARTWORK & LOGOS */}
            {activeTab === 'artworks' && (
              <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display font-bold text-lg text-[#0B0B0D]">My Brand Artworks & Vector Assets</h3>
                    <p className="text-xs text-zinc-500">
                      Store master vector logos (.AI, .EPS, .SVG, .PDF, high-res PNG) for instant 1-click product application.
                    </p>
                  </div>
                </div>

                {/* Upload New Artwork Box */}
                <form onSubmit={handleUploadArtwork} className="p-4 rounded-xl border border-dashed border-[#FF7A00] bg-orange-50/30 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-900">
                    <Upload className="w-4 h-4 text-[#FF7A00]" />
                    <span>Upload New High-Resolution Brand Artwork</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Artwork Title (e.g. Acme Primary Horizontal CMYK Logo)"
                      value={newArtworkTitle}
                      onChange={(e) => setNewArtworkTitle(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs border border-zinc-300 rounded-lg outline-none bg-white focus:border-[#FF7A00]"
                    />
                    <button
                      type="submit"
                      disabled={isUploadingArtwork || !newArtworkTitle.trim()}
                      className="bg-[#0B0B0D] hover:bg-zinc-800 disabled:bg-zinc-400 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      {isUploadingArtwork ? <span>Uploading & Validating...</span> : <span>Upload Asset</span>}
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Supports .AI, .EPS, .PDF, .SVG, .CDR, and transparent PNGs up to 50MB. Pre-press validated for 300 DPI.
                  </p>
                  {artworkUploadSuccess && (
                    <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Artwork uploaded and pre-press verified successfully!</span>
                    </div>
                  )}
                </form>

                {/* Artworks Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {artworks.map((art) => (
                    <div 
                      key={art.id} 
                      className="p-4 rounded-xl border border-zinc-200 hover:border-[#FF7A00]/50 transition-all space-y-3 bg-white"
                    >
                      <div className="flex items-start gap-3">
                        <img 
                          src={art.previewUrl} 
                          alt={art.title} 
                          width={64}
                          height={64}
                          loading="lazy"
                          decoding="async"
                          className="w-16 h-16 object-cover rounded-xl border border-zinc-200 shrink-0" 
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <h4 className="font-semibold text-xs text-[#0B0B0D] truncate">{art.title}</h4>
                          <div className="text-[11px] font-mono text-zinc-400">{art.fileName}</div>
                          <div className="text-[10px] text-zinc-500">{art.resolution}</div>
                          <span className="inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            {art.status}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-zinc-400 font-mono">
                          Used in {art.associatedOrdersCount} order(s)
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onCustomizeProduct('prod-polo-01')}
                            className="bg-[#FF7A00] hover:bg-[#ff881a] text-white text-xs font-semibold px-3 py-1 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Apply to Product</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: SAVED ADDRESSES */}
            {activeTab === 'addresses' && (
              <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display font-bold text-lg text-[#0B0B0D]">Saved Delivery & Billing Addresses</h3>
                    <p className="text-xs text-zinc-500">
                      Manage warehouse docks, headquarters, and regional dispatch locations for streamlined checkouts.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setEditingAddress(null);
                      setAddressFormData({
                        title: 'Regional Office',
                        fullName: user.name,
                        companyName: user.companyName || '',
                        phone: user.mobile,
                        street: '',
                        city: 'Bengaluru',
                        state: 'Karnataka',
                        pincode: '560001',
                        isDefault: false,
                        type: 'shipping',
                      });
                      setIsAddressModalOpen(true);
                    }}
                    className="bg-[#0B0B0D] hover:bg-zinc-800 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 self-start"
                  >
                    <Plus className="w-4 h-4 text-[#FF7A00]" />
                    <span>Add New Address</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div 
                      key={addr.id} 
                      className={`p-4 rounded-xl border transition-all space-y-3 ${
                        addr.isDefault ? 'border-[#FF7A00] bg-orange-50/20' : 'border-zinc-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#0B0B0D]">{addr.title}</span>
                          {addr.isDefault && (
                            <span className="text-[10px] bg-[#FF7A00] text-white px-2 py-0.2 rounded-full font-semibold">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
                          {addr.type}
                        </span>
                      </div>

                      <div className="text-xs text-zinc-700 space-y-0.5">
                        <div className="font-semibold text-zinc-900">{addr.fullName}</div>
                        {addr.companyName && <div className="text-zinc-600">{addr.companyName}</div>}
                        <div className="text-zinc-600">{addr.street}</div>
                        <div className="text-zinc-600">{addr.city}, {addr.state} - {addr.pincode}</div>
                        <div className="text-zinc-500 font-mono mt-1">Contact: {addr.phone}</div>
                      </div>

                      <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                        {!addr.isDefault && (
                          <button
                            onClick={() => {
                              const updated = addresses.map(a => ({ ...a, isDefault: a.id === addr.id }));
                              setAddresses(updated);
                              onUpdateUser({ ...user, savedAddresses: updated });
                            }}
                            className="text-[#FF7A00] hover:underline font-semibold"
                          >
                            Set as Default
                          </button>
                        )}
                        <div className="flex items-center gap-2 ml-auto">
                          <button
                            onClick={() => {
                              setEditingAddress(addr);
                              setAddressFormData({ 
                                ...addr, 
                                companyName: addr.companyName || '' 
                              });
                              setIsAddressModalOpen(true);
                            }}
                            className="text-zinc-600 hover:text-zinc-900 font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Delete Address"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add / Edit Address Modal */}
                {isAddressModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-zinc-200">
                      <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                        <h4 className="font-display font-bold text-base text-[#0B0B0D]">
                          {editingAddress ? 'Edit Address' : 'Add New Address'}
                        </h4>
                        <button onClick={() => setIsAddressModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                          ✕
                        </button>
                      </div>

                      <form onSubmit={handleSaveAddress} className="space-y-3 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block font-semibold text-zinc-700 mb-1">Label / Title</label>
                            <input
                              type="text"
                              value={addressFormData.title}
                              onChange={(e) => setAddressFormData({ ...addressFormData, title: e.target.value })}
                              placeholder="e.g. Bengaluru HQ"
                              required
                              className="w-full px-3 py-2 border border-zinc-300 rounded-lg outline-none focus:border-[#FF7A00]"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-zinc-700 mb-1">Contact Name</label>
                            <input
                              type="text"
                              value={addressFormData.fullName}
                              onChange={(e) => setAddressFormData({ ...addressFormData, fullName: e.target.value })}
                              required
                              className="w-full px-3 py-2 border border-zinc-300 rounded-lg outline-none focus:border-[#FF7A00]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block font-semibold text-zinc-700 mb-1">Company (Optional)</label>
                            <input
                              type="text"
                              value={addressFormData.companyName}
                              onChange={(e) => setAddressFormData({ ...addressFormData, companyName: e.target.value })}
                              className="w-full px-3 py-2 border border-zinc-300 rounded-lg outline-none focus:border-[#FF7A00]"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-zinc-700 mb-1">Phone Number</label>
                            <input
                              type="text"
                              value={addressFormData.phone}
                              onChange={(e) => setAddressFormData({ ...addressFormData, phone: e.target.value })}
                              required
                              className="w-full px-3 py-2 border border-zinc-300 rounded-lg outline-none focus:border-[#FF7A00]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block font-semibold text-zinc-700 mb-1">Street Address</label>
                          <textarea
                            rows={2}
                            value={addressFormData.street}
                            onChange={(e) => setAddressFormData({ ...addressFormData, street: e.target.value })}
                            placeholder="Building, street, landmark, floor..."
                            required
                            className="w-full px-3 py-2 border border-zinc-300 rounded-lg outline-none focus:border-[#FF7A00]"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block font-semibold text-zinc-700 mb-1">City</label>
                            <input
                              type="text"
                              value={addressFormData.city}
                              onChange={(e) => setAddressFormData({ ...addressFormData, city: e.target.value })}
                              required
                              className="w-full px-3 py-2 border border-zinc-300 rounded-lg outline-none focus:border-[#FF7A00]"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-zinc-700 mb-1">State</label>
                            <input
                              type="text"
                              value={addressFormData.state}
                              onChange={(e) => setAddressFormData({ ...addressFormData, state: e.target.value })}
                              required
                              className="w-full px-3 py-2 border border-zinc-300 rounded-lg outline-none focus:border-[#FF7A00]"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-zinc-700 mb-1">Pincode</label>
                            <input
                              type="text"
                              value={addressFormData.pincode}
                              onChange={(e) => setAddressFormData({ ...addressFormData, pincode: e.target.value })}
                              required
                              className="w-full px-3 py-2 border border-zinc-300 rounded-lg outline-none focus:border-[#FF7A00]"
                            />
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={addressFormData.isDefault}
                              onChange={(e) => setAddressFormData({ ...addressFormData, isDefault: e.target.checked })}
                              className="rounded text-[#FF7A00] focus:ring-[#FF7A00]"
                            />
                            <span className="text-zinc-700 font-medium">Set as primary default address</span>
                          </label>

                          <button
                            type="submit"
                            className="bg-[#0B0B0D] hover:bg-zinc-800 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                          >
                            Save Address
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: GST & CORPORATE TAX */}
            {activeTab === 'gst' && (
              <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-6 space-y-6">
                <div>
                  <h3 className="font-display font-bold text-lg text-[#0B0B0D]">GST & Input Tax Credit (ITC) Portal</h3>
                  <p className="text-xs text-zinc-500">
                    SAC Code 9989 (Custom Printing Services) ensures 100% 18% Input Tax Credit claim in monthly GSTR-2B.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[#0B0B0D] text-white space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <span className="font-bold text-sm">Verified Corporate GSTIN Profile</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      ITC ELIGIBLE
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-zinc-800 text-xs">
                    <div>
                      <div className="text-zinc-400 text-[11px]">Registered Entity</div>
                      <div className="font-semibold text-white mt-0.5">{user.companyName || 'FinPulse Technologies Pvt Ltd'}</div>
                    </div>
                    <div>
                      <div className="text-zinc-400 text-[11px]">15-Digit GSTIN</div>
                      <div className="font-mono font-bold text-[#FF7A00] mt-0.5">{user.gstin || '29AAACN1234F1Z8'}</div>
                    </div>
                    <div>
                      <div className="text-zinc-400 text-[11px]">State of Supply</div>
                      <div className="font-medium text-white mt-0.5">Karnataka (State Code 29)</div>
                    </div>
                  </div>
                </div>

                {/* Tax Benefits Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 space-y-1 text-xs">
                    <div className="font-bold text-zinc-900">SAC Code 9989</div>
                    <p className="text-zinc-500 text-[11px]">
                      Recognized under HSN/SAC chapter 99 for commercial offset, digital printing, and branding services.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 space-y-1 text-xs">
                    <div className="font-bold text-zinc-900">18% ITC Reversal Protection</div>
                    <p className="text-zinc-500 text-[11px]">
                      Invoices automatically upload to the GST Portal for seamless auto-population into your CA's GSTR-2B.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 space-y-1 text-xs">
                    <div className="font-bold text-zinc-900">Annual Expense Reconciliation</div>
                    <p className="text-zinc-500 text-[11px]">
                      Download 1-click consolidated Excel & PDF expense statements for your financial year audits.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Need to update your corporate tax credentials?</span>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className="text-xs text-[#FF7A00] font-semibold hover:underline"
                  >
                    Edit GSTIN in Account Settings →
                  </button>
                </div>
              </div>
            )}

            {/* TAB 7: TAX INVOICES */}
            {activeTab === 'invoices' && (
              <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-6 space-y-6">
                <div>
                  <h3 className="font-display font-bold text-lg text-[#0B0B0D]">Official B2B Tax Invoices</h3>
                  <p className="text-xs text-zinc-500">
                    Compliant with Rule 46 of the CGST Rules, 2017. Download or print authorized tax documents.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 text-zinc-500 font-mono text-[11px]">
                        <th className="pb-3 font-semibold">INVOICE #</th>
                        <th className="pb-3 font-semibold">DATE</th>
                        <th className="pb-3 font-semibold">ORDER REF</th>
                        <th className="pb-3 font-semibold">TAXABLE</th>
                        <th className="pb-3 font-semibold">18% GST</th>
                        <th className="pb-3 font-semibold">TOTAL (INR)</th>
                        <th className="pb-3 font-semibold text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-zinc-50/80 transition-colors">
                          <td className="py-3 font-mono font-bold text-zinc-900">{inv.invoiceNumber}</td>
                          <td className="py-3 text-zinc-600 font-mono">{inv.date}</td>
                          <td className="py-3 font-mono text-[#FF7A00]">{inv.orderNumber}</td>
                          <td className="py-3 font-mono text-zinc-700">₹{inv.taxableValue.toLocaleString('en-IN')}</td>
                          <td className="py-3 font-mono text-zinc-700">
                            ₹{(inv.cgst + inv.sgst + inv.igst).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 font-mono font-bold text-zinc-900">
                            ₹{inv.totalAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => generateTaxInvoicePdf(inv, user)}
                                className="bg-[#FF7A00] hover:bg-[#ff881a] text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all inline-flex items-center gap-1 cursor-pointer shadow-xs"
                                title="Download PDF Tax Invoice"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>PDF</span>
                              </button>
                              <button
                                onClick={() => setActiveInvoicePreview(inv)}
                                className="bg-zinc-100 hover:bg-[#0B0B0D] hover:text-white text-zinc-800 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>View</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 8: WISHLIST */}
            {activeTab === 'wishlist' && (
              <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-6 space-y-6">
                <div>
                  <h3 className="font-display font-bold text-lg text-[#0B0B0D]">Saved Merchandise Wishlist</h3>
                  <p className="text-xs text-zinc-500">Shortlisted corporate gifts and custom team apparel</p>
                </div>

                {wishlist.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 text-xs">
                    Your wishlist is empty. Explore our catalog!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {wishlist.map((prod) => (
                      <div key={prod.id} className="p-4 rounded-xl border border-zinc-200 flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-xs text-zinc-900">{prod.name}</div>
                          <div className="text-[11px] text-zinc-500">{prod.shortDesc}</div>
                          <div className="text-xs font-mono font-bold text-[#FF7A00] mt-1">
                            Starts ₹{prod.basePrice} / unit (MOQ: {prod.moq})
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            onClick={() => onCustomizeProduct(prod.id)}
                            className="bg-[#0B0B0D] text-white hover:bg-zinc-800 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3 text-[#FF7A00]" />
                            <span>Customize</span>
                          </button>
                          <button
                            onClick={() => setWishlist(wishlist.filter(p => p.id !== prod.id))}
                            className="text-zinc-400 hover:text-red-500 text-[10px] text-center"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 9: BULK RFQ QUOTES */}
            {activeTab === 'quotes' && (
              <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display font-bold text-lg text-[#0B0B0D]">Corporate Bulk RFQ Enquiries</h3>
                    <p className="text-xs text-zinc-500">Volume orders (50 to 10,000+ units) with dedicated account manager pricing</p>
                  </div>
                  <button
                    onClick={() => onNavigateTab('bulk')}
                    className="bg-[#FF7A00] hover:bg-[#ff881a] text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 self-start"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Bulk Request</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {bulkQuotes.map((rfq) => (
                    <div key={rfq.id} className="p-4 rounded-xl border border-zinc-200 space-y-3 bg-zinc-50/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-zinc-900">{rfq.id.toUpperCase()}</span>
                          <span className="text-xs text-zinc-500 font-medium">· {rfq.productCategory}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {rfq.status}
                        </span>
                      </div>

                      <div className="text-xs text-zinc-700">
                        <p className="font-medium text-zinc-800">{rfq.customizationDetails}</p>
                        <div className="flex items-center gap-4 text-zinc-500 text-[11px] mt-1">
                          <span>Volume: <strong>{rfq.estimatedQty} units</strong></span>
                          <span>Target: <strong>{rfq.targetDeliveryDate}</strong></span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-zinc-200 flex items-center justify-between">
                        <a
                          href={getWhatsAppLink(`Hello TeqqnoWorld, following up on RFQ ${rfq.id} for ${rfq.estimatedQty} units`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#1EBE5D] font-semibold hover:underline flex items-center gap-1.5"
                        >
                          <WhatsAppIcon variant="badge" className="w-4 h-4" />
                          <span>Chat with Corporate KAM on WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 10: NOTIFICATIONS & ALERTS */}
            {activeTab === 'notifications' && (
              <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-bold text-lg text-[#0B0B0D]">Notifications & Production Alerts</h3>
                    <p className="text-xs text-zinc-500">Live order status, digital proof notices, and corporate offers</p>
                  </div>
                  <button
                    onClick={() => setNotifications(notifications.map(n => ({ ...n, read: true })))}
                    className="text-xs text-zinc-500 hover:text-zinc-900"
                  >
                    Mark all as read
                  </button>
                </div>

                <div className="space-y-3">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`p-4 rounded-xl border transition-all text-xs space-y-1 ${
                        notif.read ? 'border-zinc-200 bg-white' : 'border-[#FF7A00]/50 bg-orange-50/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-zinc-900 flex items-center gap-2">
                          {!notif.read && <span className="w-2 h-2 rounded-full bg-[#FF7A00]" />}
                          <span>{notif.title}</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono">{notif.timestamp}</span>
                      </div>
                      <p className="text-zinc-600">{notif.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 11: SETTINGS & PREFERENCES */}
            {activeTab === 'settings' && (
              <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-6 space-y-6">
                <div>
                  <h3 className="font-display font-bold text-lg text-[#0B0B0D]">Account Settings & Preferences</h3>
                  <p className="text-xs text-zinc-500">Update corporate profile and invoice communication details</p>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-zinc-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg outline-none focus:border-[#FF7A00]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-zinc-700 mb-1">Work Email</label>
                      <input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg outline-none focus:border-[#FF7A00]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-zinc-700 mb-1">Company / Organization</label>
                      <input
                        type="text"
                        value={profileCompany}
                        onChange={(e) => setProfileCompany(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg outline-none focus:border-[#FF7A00]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-zinc-700 mb-1">Company Role / Designation</label>
                      <input
                        type="text"
                        value={profileDesignation}
                        onChange={(e) => setProfileDesignation(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg outline-none focus:border-[#FF7A00]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">15-Digit GSTIN Number</label>
                    <input
                      type="text"
                      value={profileGstin}
                      onChange={(e) => setProfileGstin(e.target.value.toUpperCase())}
                      placeholder="e.g. 29AAACN1234F1Z8"
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg outline-none font-mono focus:border-[#FF7A00]"
                    />
                    <p className="text-[11px] text-zinc-400 mt-1">Used on all B2B Tax Invoices for ITC input claim.</p>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="submit"
                      className="bg-[#0B0B0D] hover:bg-zinc-800 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
                    >
                      Save Profile Changes
                    </button>

                    {profileSavedToast && (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Profile updated successfully!</span>
                      </span>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* TAB 12: HELP & SUPPORT */}
            {activeTab === 'support' && (
              <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-6 space-y-6">
                <div>
                  <h3 className="font-display font-bold text-lg text-[#0B0B0D]">Customer & Corporate Support Hub</h3>
                  <p className="text-xs text-zinc-500">Reach our dedicated print consultants and key account managers</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <a
                    href={getWhatsAppLink('Hello TeqqnoWorld, I need help with my corporate account')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 transition-colors flex items-start gap-4 text-xs"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#1EBE5D] text-white flex items-center justify-center shrink-0">
                      <WhatsAppIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-emerald-950 text-sm">Direct WhatsApp Desk</div>
                      <div className="text-emerald-800 mt-0.5">{BUSINESS_CONFIG.contact.whatsapp}</div>
                      <p className="text-[11px] text-emerald-700 mt-1">Instant assistance for mockups, pantone colors & urgent dispatches.</p>
                    </div>
                  </a>

                  <a
                    href={BUSINESS_CONFIG.contact.mailtoLink}
                    className="p-5 rounded-2xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 transition-colors flex items-start gap-4 text-xs"
                  >
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-zinc-900 text-sm">Enterprise Procurement Email</div>
                      <div className="text-zinc-700 mt-0.5">{BUSINESS_CONFIG.contact.email}</div>
                      <p className="text-[11px] text-zinc-500 mt-1">Send purchase orders, vendor onboarding forms & NDA requests.</p>
                    </div>
                  </a>
                </div>

                <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200 text-xs text-zinc-600 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-zinc-900">Official Business Address</div>
                    <a
                      href={BUSINESS_CONFIG.maps.directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#FF7A00] hover:underline font-semibold flex items-center gap-1 text-[11px]"
                    >
                      <span>Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-[11px] text-zinc-700 leading-relaxed">
                    {BUSINESS_CONFIG.address.full}
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* 3. Authentic Printable GST Tax Invoice Modal */}
      {activeInvoicePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div id="printable-dashboard-invoice" className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-zinc-300 max-h-[92vh] overflow-y-auto">
            {/* Action Bar */}
            <div className="no-print flex items-center justify-between pb-4 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#FF7A00]" />
                <span className="font-bold text-sm text-[#0B0B0D]">Tax Invoice: {activeInvoicePreview.invoiceNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => generateTaxInvoicePdf(activeInvoicePreview, user)}
                  className="bg-[#FF7A00] hover:bg-[#ff881a] text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-[#0B0B0D] hover:bg-zinc-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => setActiveInvoicePreview(null)}
                  className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Official GST Invoice Paper Layout */}
            <div className="border border-zinc-200 rounded-xl p-5 space-y-4 text-xs text-zinc-800 bg-[#FFF]">
              {/* Header */}
              <div className="flex justify-between items-start pb-4 border-b border-zinc-200">
                <div>
                  <div className="font-display font-bold text-lg text-[#0B0B0D]">
                    Teqqno<span className="text-[#FF7A00]">World</span> Private Limited
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    {BUSINESS_CONFIG.address.line1}<br />
                    {BUSINESS_CONFIG.address.line2}<br />
                    GSTIN: 36AAACT9810P1Z2 | PAN: AAACT9810P<br />
                    SAC Code: 9989 (Custom Printing & Branding Services)
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold font-mono text-zinc-900">ORIGINAL FOR RECIPIENT</div>
                  <div className="text-[11px] font-mono text-zinc-600 mt-1">Invoice: {activeInvoicePreview.invoiceNumber}</div>
                  <div className="text-[11px] font-mono text-zinc-600">Date: {activeInvoicePreview.date}</div>
                </div>
              </div>

              {/* Bill To */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-zinc-200 text-[11px]">
                <div>
                  <div className="font-bold text-zinc-900">BILLED TO (BUYER):</div>
                  <div>{user.companyName || 'Corporate Buyer'}</div>
                  <div>Attn: {user.name}</div>
                  <div className="font-mono font-bold text-zinc-900 mt-1">
                    GSTIN: {user.gstin || '29AAACN1234F1Z8'}
                  </div>
                </div>
                <div>
                  <div className="font-bold text-zinc-900">ORDER & SHIPMENT:</div>
                  <div>Order Ref: {activeInvoicePreview.orderNumber}</div>
                  <div>Place of Supply: Karnataka (29)</div>
                  <div>Payment Mode: B2B Verified Gateway</div>
                </div>
              </div>

              {/* Itemized Table */}
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-zinc-300 font-bold">
                    <th className="pb-1">DESCRIPTION</th>
                    <th className="pb-1">SAC</th>
                    <th className="pb-1 text-center">QTY</th>
                    <th className="pb-1 text-right">TAXABLE (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  <tr>
                    <td className="py-2">
                      Custom Corporate Apparel & Merchandise<br />
                      <span className="text-[10px] text-zinc-500">Order {activeInvoicePreview.orderNumber}</span>
                    </td>
                    <td className="py-2 font-mono">9989</td>
                    <td className="py-2 text-center font-mono">{activeInvoicePreview.itemsCount}</td>
                    <td className="py-2 text-right font-mono">₹{activeInvoicePreview.taxableValue.toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>

              {/* Total Calculation */}
              <div className="border-t border-zinc-200 pt-3 space-y-1 text-right font-mono text-[11px]">
                <div>Taxable Value: ₹{activeInvoicePreview.taxableValue.toLocaleString('en-IN')}</div>
                <div>CGST (9%): ₹{activeInvoicePreview.cgst.toLocaleString('en-IN')}</div>
                <div>SGST (9%): ₹{activeInvoicePreview.sgst.toLocaleString('en-IN')}</div>
                <div className="text-sm font-bold text-[#0B0B0D] pt-1 border-t border-zinc-200">
                  Total Invoice Amount: ₹{activeInvoicePreview.totalAmount.toLocaleString('en-IN')}
                </div>
              </div>

              {/* Authorized Signatory Stamp */}
              <div className="pt-4 flex justify-between items-end border-t border-zinc-200 text-[10px] text-zinc-500">
                <div>
                  Certified that the particulars given above are true and correct.<br />
                  Input Tax Credit (ITC) is applicable under Section 16 of the CGST Act.
                </div>
                <div className="text-center">
                  <div className="w-24 h-10 border border-dashed border-zinc-300 rounded flex items-center justify-center font-mono text-[9px] text-zinc-400">
                    [E-SIGN SEAL]
                  </div>
                  <div className="font-semibold text-zinc-800 mt-1">For TeqqnoWorld Pvt Ltd</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
