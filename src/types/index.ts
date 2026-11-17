export type ProductCategory = 
  | 'all' 
  | 'apparel' 
  | 'drinkware' 
  | 'kits' 
  | 'tech' 
  | 'bags' 
  | 'stationery'
  | 'signage'
  | 'caps'
  | 'corporate-gifting'
  | 'promotional-items'
  | 'custom-tshirt-printing'
  | 'printing-items'
  | 'custom-caps';

export type PrintMethod = 
  | 'DTF Printing' 
  | 'Laser Engraving' 
  | 'High-Precision UV' 
  | 'Precision Embroidery' 
  | 'Screen Printing';

export interface TieredPrice {
  minQty: number;
  price: number; // in INR (₹)
  savingsPercent?: number;
}

export interface ProductColor {
  name: string;
  hex: string;
  garmentHex: string; // Used for canvas rendering
  tippingHex?: string; // Optional contrast tipping stripe color
  imageFront?: string; // Real photograph front view
  imageBack?: string; // Real photograph back view
  imageSide?: string; // Real photograph side view
  imageDimensions?: string; // Infographic / dimensions view
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  basePrice: number; // 1 unit price in INR
  mrp: number; // Strikethrough price
  tieredPricing: TieredPrice[];
  rating: number;
  reviewCount: number;
  moq: number; // Minimum order quantity
  dispatchTime: string; // e.g. "24–48 hrs"
  badge?: string; // "Bestseller", "Top Corporate Pick", "New"
  description: string;
  shortDesc: string;
  printMethods: PrintMethod[];
  colors: ProductColor[];
  sizes?: string[]; // e.g. ['S', 'M', 'L', 'XL', '2XL', '3XL']
  features: string[];
  specs: Record<string, string>;
  productType: 'tshirt' | 'polo' | 'hoodie' | 'bottle' | 'mug' | 'notebook' | 'badge' | 'backpack' | 'tote' | 'cap' | 'kit' | 'display' | 'table' | 'umbrella' | 'canopy' | 'standee' | 'visiting-card';
}
export type StudioShapeType = 'rect' | 'pill' | 'circle' | 'ring' | 'triangle' | 'line';

export interface StudioLayer {
  id: string;
  kind: 'logo' | 'image' | 'text' | 'curved-text' | 'shape';
  // Coordinates in 500x500 SVG mockup space
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // degrees
  opacity: number; // 0 to 1
  visible?: boolean;
  // Image / Logo fields
  dataUrl?: string;
  isMainLogo?: boolean;
  flipX?: boolean;
  // Text / Curved-text fields
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: 'normal' | 'italic';
  textTransform?: 'none' | 'uppercase';
  textColor?: string;
  letterSpacing?: number;
  curve?: number; // -100 to 100 for curved text
  // Shape fields
  shapeType?: StudioShapeType;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  borderRadius?: number;
}

export interface CustomArtwork {
  type: 'image' | 'text' | 'preset';
  dataUrl?: string; // Uploaded / processed image data
  rawDataUrl?: string; // Original un-processed uploaded image data
  text?: string;
  fontFamily?: string;
  textColor?: string;
  presetId?: string;
  x: number; // -50 to 50 relative center percentage
  y: number; // -50 to 50 relative center percentage
  scale: number; // 0.5 to 2.0
  rotation: number; // -180 to 180 degrees
  studioLayers?: StudioLayer[];
}

export interface CustomizationConfig {
  productId: string;
  selectedColor: ProductColor;
  selectedSize?: string;
  quantity: number;
  printMethod: PrintMethod;
  printPlacement: 'Center Chest' | 'Left Chest' | 'Right Chest' | 'Upper Back Center' | 'Full Back Center' | 'Large Back' | 'Front Center' | 'Wrap Around' | 'Diagonal Laser';
  artwork: CustomArtwork;
  frontArtwork?: CustomArtwork | null;
  backArtwork?: CustomArtwork | null;
  frontPlacement?: string;
  backPlacement?: string;
  customNotes?: string;
}

export interface VisitingCardDesignState {
  frontDataUrl?: string;
  backDataUrl?: string;
  frontSettings: { x: number; y: number; scale: number; rotation: number };
  backSettings: { x: number; y: number; scale: number; rotation: number };
  paperGsm: 300;
  widthMm: 92;
  heightMm: 52;
  withBleed: boolean;
  frontFileName?: string;
  backFileName?: string;
  frontLowRes?: boolean;
  backLowRes?: boolean;
}

export interface CartItem {
  id: string; // unique item id
  product: Product;
  color: ProductColor;
  size?: string;
  sizeDistribution?: Record<string, number>;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  printMethod: PrintMethod;
  printPlacement: string;
  artwork?: CustomArtwork;
  frontArtwork?: CustomArtwork | null;
  backArtwork?: CustomArtwork | null;
  frontPlacement?: string;
  backPlacement?: string;
  previewUrl?: string;
  backPreviewUrl?: string;
  customNotes?: string;
  voiceNoteUrl?: string;
  artworkStatus?: 'no_artwork' | 'uploading' | 'uploaded' | 'awaiting_review' | 'approved' | 'revision_required';
  visitingCardDesign?: VisitingCardDesignState;
}

export interface ShippingAddress {
  fullName: string;
  companyName?: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  gstin?: string;
  isB2BInvoice: boolean;
}

export interface BulkEnquirySubmission {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  productCategory: string;
  estimatedQty: number;
  targetDeliveryDate: string;
  customizationDetails: string;
  hasGst: boolean;
  gstin?: string;
  createdAt: string;
  status: 'Received' | 'Reviewing Spec' | 'Proof Generating' | 'Quote Sent';
}

export interface SavedAddress {
  id: string;
  title: string; // e.g. "Headquarters", "Warehouse", "Branch Office"
  fullName: string;
  companyName?: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  type: 'shipping' | 'billing' | 'both';
}

export interface CustomerArtwork {
  id: string;
  title: string;
  fileType: 'vector' | 'svg' | 'png' | 'pdf';
  fileName: string;
  fileSize: string;
  resolution: string;
  uploadedAt: string;
  status: 'Approved for Production' | 'Proof Ready' | 'Under Review' | 'Revision Required';
  previewUrl: string;
  associatedOrdersCount: number;
}

export interface WishlistItem {
  id: string;
  product: Product;
  addedAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'order' | 'proof' | 'quote' | 'promo';
}

export interface TaxInvoice {
  id: string;
  invoiceNumber: string;
  orderNumber: string;
  date: string;
  itemsCount: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  status: 'Paid' | 'Processing';
  pdfFileName: string;
}

export interface UserProfile {
  id: string;
  name: string;
  mobile: string;
  email: string;
  companyName?: string;
  designation?: string;
  alternatePhone?: string;
  gstin?: string;
  role: 'Corporate Admin' | 'Procurement Lead' | 'Individual Shopper';
  isVerified: boolean;
  createdAt: string;
  savedAddresses: SavedAddress[];
  gstStateCode?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  items: CartItem[];
  subtotal: number;
  gstRate: number; // 0.18 for 18%
  gstAmount: number;
  shippingFee: number;
  total: number;
  shippingAddress: ShippingAddress;
  proofStatus: 'Proof Generating' | 'Proof Ready - Needs Approval' | 'Approved by Client' | 'In Production';
  orderStatus: 'Confirmed' | 'Artwork Verification' | 'Manufacturing' | 'Quality Check' | 'Dispatched' | 'Delivered';
  estimatedDispatch: string;
  trackingNumber?: string;
  courierPartner?: string;
  paymentMode:
    | 'Full Prepaid (100% Online)'
    | 'Partial Payment (50% Advance)'
    | 'Test Gateway (Pre-Integration)'
    | 'Pay on Approval'
    | 'Corporate PO 30-Day';
  paymentStatus:
    | 'Paid in Full (Razorpay)'
    | '50% Advance Paid (Razorpay)'
    | 'Test Authenticated (Sandbox)'
    | 'Pending Verification';
  amountPaid?: number;
  balanceDue?: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  emailNotification?: {
    status: 'sent' | 'simulated' | 'failed';
    message?: string;
    customerSent?: boolean;
    adminSent?: boolean;
  };
}

