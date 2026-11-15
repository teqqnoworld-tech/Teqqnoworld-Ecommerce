import { BUSINESS_DETAILS } from '../data/legalData';

export interface WhatsAppQuoteParams {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  printMethod?: string;
  colorName?: string;
  size?: string;
  companyName?: string;
  clientName?: string;
  gstin?: string;
  notes?: string;
}

export function formatWhatsAppQuoteUrl(params: WhatsAppQuoteParams): string {
  const phone = BUSINESS_DETAILS.whatsappHelp.replace(/[^0-9]/g, '');
  
  const lines: string[] = [
    `*TEQQNOWORLD B2B FACTORY QUOTATION REQUEST*`,
    `----------------------------------------`,
    `📦 *Product:* ${params.productName}`,
    `🔢 *Quantity:* ${params.quantity.toLocaleString('en-IN')} units`,
    `💰 *Rate per unit:* ₹${params.unitPrice.toLocaleString('en-IN')} (Volume Slab)`,
    `💵 *Estimated Total:* ₹${params.totalPrice.toLocaleString('en-IN')} + 18% GST`,
  ];

  if (params.printMethod) lines.push(`🖨️ *Print Method:* ${params.printMethod}`);
  if (params.colorName) lines.push(`🎨 *Color:* ${params.colorName}`);
  if (params.size) lines.push(`📏 *Size / Dimensions:* ${params.size}`);
  
  lines.push(`----------------------------------------`);
  if (params.companyName) lines.push(`🏢 *Company:* ${params.companyName}`);
  if (params.clientName) lines.push(`👤 *Contact Person:* ${params.clientName}`);
  if (params.gstin) lines.push(`📋 *GSTIN:* ${params.gstin}`);
  if (params.notes) lines.push(`📝 *Requirements:* ${params.notes}`);

  lines.push(``);
  lines.push(`Please share digital proof options and final dispatch timeline.`);

  const message = lines.join('\n');
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function formatWhatsAppProofUrl(orderNumber: string, status: string, feedback?: string): string {
  const phone = BUSINESS_DETAILS.whatsappHelp.replace(/[^0-9]/g, '');
  const lines = [
    `*TEQQNOWORLD PROOF UPDATE - ORDER #${orderNumber}*`,
    `Status: ${status}`,
    feedback ? `Feedback / Changes: ${feedback}` : 'Requesting immediate verification.',
  ];
  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`;
}

export interface DirectClientWhatsAppParams {
  phone: string;
  name?: string | null;
  type: 'abandoned' | 'order';
  orderId?: string;
  status?: string;
  courier?: string | null;
  trackingNumber?: string | null;
  cartTotal?: number;
  productName?: string;
}

export function getDirectClientWhatsAppUrl(params: DirectClientWhatsAppParams): string {
  // Clean phone number: remove non-digits
  let cleanPhone = (params.phone || '').replace(/[^0-9]/g, '');
  
  // Normalize Indian mobile numbers to start with 91
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`;
  } else if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
    cleanPhone = `91${cleanPhone.slice(1)}`;
  } else if (cleanPhone.startsWith('+91')) {
    cleanPhone = cleanPhone.slice(1);
  }

  const rawName = params.name ? params.name.trim() : '';
  const clientName = rawName ? rawName.split(' ')[0] : 'there';
  let message = '';

  if (params.type === 'abandoned') {
    message = `Hi ${clientName}, saw you were designing custom products on TeqqnoWorld. Need any help with your quote or mockup?`;
  } else if (params.status === 'dispatched' || params.trackingNumber) {
    const courier = params.courier || 'Blue Dart Apex Air';
    const awb = params.trackingNumber || 'Tracking ID Assigned';
    message = `Hi ${clientName}, your order #${params.orderId || ''} has been dispatched via ${courier}! Tracking: ${awb}`;
  } else if (params.status === 'in-production') {
    message = `Hi ${clientName}, your order #${params.orderId || ''} is currently on our factory floor under active production. We'll send dispatch tracking as soon as quality check completes!`;
  } else if (params.status === 'approved') {
    message = `Hi ${clientName}, your digital artwork proof for order #${params.orderId || ''} has been approved and moved to manufacturing queue!`;
  } else if (params.status === 'delivered') {
    message = `Hi ${clientName}, your merchandise consignment for order #${params.orderId || ''} has been marked delivered. Thank you for partnering with TeqqnoWorld!`;
  } else {
    message = `Hi ${clientName}, thank you for placing order #${params.orderId || ''} on TeqqnoWorld. Our production desk is reviewing your requirements. Need any assistance?`;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
