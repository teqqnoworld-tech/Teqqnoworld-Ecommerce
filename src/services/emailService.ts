export interface OrderEmailItem {
  name: string;
  color?: string;
  size?: string;
  sizeDistribution?: Record<string, number>;
  printMethod?: string;
  printPlacement?: string;
  frontPlacement?: string;
  backPlacement?: string;
  designPositionSummary?: string;
  logoUrl?: string;
  backLogoUrl?: string;
  mockupFrontUrl?: string;
  mockupBackUrl?: string;
  extraArtworkUrls?: string[];
  customNotes?: string;
  voiceNoteUrl?: string;
  quantity: number;
  price: number;
  totalPrice?: number;
}

export interface OrderConfirmationEmailPayload {
  orderId: string;
  orderNumber?: string;
  customerName: string;
  customerEmail: string;
  company?: string;
  phone?: string;
  gstin?: string;
  paymentMode?: string;
  amountPaid?: number;
  balanceDue?: number;
  razorpayPaymentId?: string;
  orderVoiceNoteUrl?: string;
  orderNotes?: string;
  items: OrderEmailItem[];
  subtotal: number;
  gstAmount: number;
  shippingFee: number;
  total: number;
  estimatedDispatch?: string;
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  adminMessageId?: string;
  customerSent?: boolean;
  adminSent?: boolean;
  message: string;
  simulated?: boolean;
  backendUnavailable?: boolean;
  recipient?: string;
  adminRecipients?: string[];
}

export interface SmtpStatusResponse {
  configured: boolean;
  backendReachable: boolean;
  host: string;
  port: number;
  secure: boolean;
  senderEmail: string;
  adminEmail: string;
}

async function safeParseJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Dispatches automated order confirmation (to customer) and new order alert (to admin)
 * via the Hostinger SMTP backend endpoint (/api/send-order-email).
 */
export async function sendOrderConfirmationEmail(
  payload: OrderConfirmationEmailPayload
): Promise<EmailResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const response = await fetch('/api/send-order-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await safeParseJson<EmailResponse>(response);
    if (!data) {
      return {
        success: false,
        backendUnavailable: true,
        message: `Email backend API (/api/send-order-email) is unavailable (HTTP ${response.status}). Make sure the Node.js server (server.ts) is running instead of static-only hosting.`,
      };
    }

    if (!response.ok) {
      console.warn('[Hostinger SMTP Service] Backend returned status:', response.status, data);
      return data;
    }

    console.log('[Hostinger SMTP Service] Email response:', data);
    return data;
  } catch (error: any) {
    console.error('[Hostinger SMTP Service] Network/Fetch error:', error);
    return {
      success: false,
      backendUnavailable: true,
      message: error?.name === 'AbortError'
        ? 'Email server timed out while connecting to SMTP.'
        : (error?.message || 'Network error connecting to email service.'),
    };
  }
}

/**
 * Sends a test email via Hostinger SMTP to verify both admin and customer delivery.
 */
export async function sendTestEmail(toEmail?: string): Promise<EmailResponse> {
  try {
    const response = await fetch('/api/test-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toEmail }),
    });

    const data = await safeParseJson<EmailResponse>(response);
    if (!data) {
      return {
        success: false,
        backendUnavailable: true,
        message: `Backend API (/api/test-email) returned HTTP ${response.status} without JSON. Ensure Node.js server (server.ts) is running.`,
      };
    }
    return data;
  } catch (error: any) {
    return {
      success: false,
      backendUnavailable: true,
      message: error?.message || 'Network error calling /api/test-email.',
    };
  }
}

export interface RegistrationEmailPayload {
  userId?: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  email: string;
  phone: string;
  company?: string;
  accountType?: 'individual' | 'business';
  registeredAt?: string;
}

/**
 * Dispatches welcome confirmation email to newly registered customer
 * and full registration details alert to Admin via Hostinger SMTP.
 */
export async function sendRegistrationEmails(
  payload: RegistrationEmailPayload
): Promise<EmailResponse> {
  try {
    const originUrl = typeof window !== 'undefined' ? window.location.origin : undefined;
    const response = await fetch('/api/send-registration-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      keepalive: true,
      body: JSON.stringify({ ...payload, originUrl }),
    });

    const data = await safeParseJson<EmailResponse>(response);
    if (!data) {
      return {
        success: false,
        backendUnavailable: true,
        message: `Registration email API returned HTTP ${response.status}.`,
      };
    }
    return data;
  } catch (error: any) {
    console.warn('[Hostinger SMTP Service] Registration email error:', error);
    return {
      success: false,
      backendUnavailable: true,
      message: error?.message || 'Network error calling /api/send-registration-email.',
    };
  }
}

/**
 * Checks the status and configuration of Hostinger SMTP on the backend.
 */
export async function getSmtpStatus(): Promise<SmtpStatusResponse> {
  try {
    const response = await fetch('/api/smtp-status');
    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }
    const data = await safeParseJson<Omit<SmtpStatusResponse, 'backendReachable'>>(response);
    if (!data) {
      throw new Error('Non-JSON response');
    }
    return {
      ...data,
      backendReachable: true,
    };
  } catch {
    return {
      configured: false,
      backendReachable: false,
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true,
      senderEmail: '(backend unreachable)',
      adminEmail: 'teqqnoworld@gmail.com',
    };
  }
}
