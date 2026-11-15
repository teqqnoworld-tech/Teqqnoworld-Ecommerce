export interface OrderEmailItem {
  name: string;
  color?: string;
  size?: string;
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
  message: string;
  simulated?: boolean;
  recipient?: string;
}

/**
 * Dispatches an automated order confirmation email via the Hostinger SMTP backend endpoint.
 * This runs asynchronously so the checkout UI speed is not blocked or delayed.
 */
export async function sendOrderConfirmationEmail(
  payload: OrderConfirmationEmailPayload
): Promise<EmailResponse> {
  try {
    const response = await fetch('/api/send-order-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data: EmailResponse = await response.json();
    if (!response.ok) {
      console.warn('[Hostinger SMTP Service] Backend returned status:', response.status, data);
      return data;
    }

    console.log('[Hostinger SMTP Service] Email sent/queued successfully:', data);
    return data;
  } catch (error: any) {
    console.error('[Hostinger SMTP Service] Network/Fetch error:', error);
    return {
      success: false,
      message: error?.message || 'Network error connecting to email service.',
    };
  }
}

/**
 * Checks the status and configuration of Hostinger SMTP on the backend.
 */
export async function getSmtpStatus(): Promise<{
  configured: boolean;
  host: string;
  port: number;
  secure: boolean;
  senderEmail: string;
}> {
  try {
    const response = await fetch('/api/smtp-status');
    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    return {
      configured: false,
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true,
      senderEmail: '(error fetching)',
    };
  }
}
