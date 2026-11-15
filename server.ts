import express from 'express';
import type { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// ==============================================================================
// 1. HOSTINGER SMTP TRANSPORTER CONFIGURATION
// ==============================================================================

const getSmtpTransporter = () => {
  const smtpUser = process.env.HOSTINGER_SMTP_EMAIL || process.env.SMTP_USER || '';
  const smtpPass = process.env.HOSTINGER_SMTP_PASSWORD || process.env.SMTP_PASS || '';

  if (!smtpUser || !smtpPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true, // SSL/TLS on port 465
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      // Reject unauthorized in production, allow connection
      rejectUnauthorized: true,
    },
  });
};

// ==============================================================================
// 2. LUXURY DARK/ORANGE B2B HTML EMAIL TEMPLATE
// ==============================================================================

interface OrderItemPayload {
  name: string;
  color?: string;
  size?: string;
  quantity: number;
  price: number;
  totalPrice?: number;
}

interface OrderConfirmationPayload {
  orderId: string;
  orderNumber?: string;
  customerName: string;
  customerEmail: string;
  company?: string;
  phone?: string;
  items: OrderItemPayload[];
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

function generateOrderEmailHtml(data: OrderConfirmationPayload): string {
  const displayOrderNum = data.orderNumber || data.orderId;
  const dispatchTimeline = data.estimatedDispatch || '24-48h Fast Dispatch';

  const itemsHtml = data.items
    .map((item) => {
      const lineTotal = item.totalPrice || item.price * item.quantity;
      const details = [
        item.color ? `Color: ${item.color}` : null,
        item.size ? `Size: ${item.size}` : null,
      ]
        .filter(Boolean)
        .join(' • ');

      return `
        <tr>
          <td style="padding: 16px 12px; border-bottom: 1px solid #282A33;">
            <div style="font-size: 14px; font-weight: 700; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              ${item.name}
            </div>
            ${
              details
                ? `<div style="font-size: 12px; color: #9CA3AF; margin-top: 4px; font-family: -apple-system, sans-serif;">${details}</div>`
                : ''
            }
          </td>
          <td style="padding: 16px 12px; border-bottom: 1px solid #282A33; text-align: center; font-size: 13px; font-weight: 600; color: #E5E7EB; font-family: monospace;">
            ${item.quantity}
          </td>
          <td style="padding: 16px 12px; border-bottom: 1px solid #282A33; text-align: right; font-size: 14px; font-weight: 700; color: #FF7A00; font-family: monospace;">
            ₹${lineTotal.toLocaleString('en-IN')}.00
          </td>
        </tr>
      `;
    })
    .join('');

  const formattedAddress = data.shippingAddress
    ? `${data.shippingAddress.street || ''}, ${data.shippingAddress.city || ''}, ${data.shippingAddress.state || ''} - ${data.shippingAddress.pincode || ''}`
    : 'Registered Corporate Delivery Address';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - TeqqnoWorld</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0B0D; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FFFFFF; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0B0D; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Wrapper -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 620px; background-color: #16171B; border: 1px solid #282A33; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.8);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1C1E26 0%, #121319 100%); padding: 32px 32px 24px 32px; border-bottom: 2px solid #FF7A00; text-align: left;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 800; letter-spacing: 2.5px; color: #FF7A00; text-transform: uppercase; font-family: monospace;">
                      TEQQNOWORLD
                    </div>
                    <div style="font-size: 8px; letter-spacing: 1.5px; color: #9CA3AF; text-transform: uppercase; margin-top: 2px;">
                      CUSTOM MERCHANDISE & PRINTING FACTORY
                    </div>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 10px; background-color: rgba(30, 190, 93, 0.15); border: 1px solid rgba(30, 190, 93, 0.4); border-radius: 999px; font-size: 11px; font-weight: 700; color: #1EBE5D; font-family: monospace;">
                      ● CONFIRMED
                    </span>
                  </td>
                </tr>
              </table>

              <div style="font-size: 24px; font-weight: 800; color: #FFFFFF; margin-top: 20px; letter-spacing: -0.5px;">
                Order Confirmation
              </div>
              <div style="font-size: 14px; color: #D1D5DB; margin-top: 6px; line-height: 1.5;">
                Hi <strong style="color: #FFFFFF;">${data.customerName}</strong>${data.company ? ` (${data.company})` : ''}, we have received your custom order and queued it for artwork verification.
              </div>
            </td>
          </tr>

          <!-- Order Summary Meta Box -->
          <tr>
            <td style="padding: 24px 32px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #1F2026; border: 1px solid #2F313B; border-radius: 14px; padding: 16px;">
                <tr>
                  <td style="padding: 6px 12px;">
                    <div style="font-size: 11px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px;">Order Number</div>
                    <div style="font-size: 15px; font-weight: 800; color: #FF7A00; font-family: monospace; margin-top: 3px;">
                      #${displayOrderNum}
                    </div>
                  </td>
                  <td style="padding: 6px 12px; border-left: 1px solid #2F313B;">
                    <div style="font-size: 11px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px;">Dispatch Timeline</div>
                    <div style="font-size: 14px; font-weight: 700; color: #FFFFFF; margin-top: 3px;">
                      ⚡ ${dispatchTimeline}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding: 0 32px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <thead>
                  <tr style="border-bottom: 2px solid #2F313B;">
                    <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px;">
                      Product
                    </th>
                    <th style="padding: 10px 12px; text-align: center; font-size: 11px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px;">
                      Qty
                    </th>
                    <th style="padding: 10px 12px; text-align: right; font-size: 11px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px;">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Price Calculations Box -->
          <tr>
            <td style="padding: 20px 32px 28px 32px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 10px;">
                <tr>
                  <td style="padding: 4px 12px; font-size: 13px; color: #9CA3AF;">Subtotal:</td>
                  <td style="padding: 4px 12px; text-align: right; font-size: 13px; color: #E5E7EB; font-family: monospace;">₹${data.subtotal.toLocaleString('en-IN')}.00</td>
                </tr>
                <tr>
                  <td style="padding: 4px 12px; font-size: 13px; color: #9CA3AF;">GST (18% ITC Eligible):</td>
                  <td style="padding: 4px 12px; text-align: right; font-size: 13px; color: #E5E7EB; font-family: monospace;">₹${data.gstAmount.toLocaleString('en-IN')}.00</td>
                </tr>
                <tr>
                  <td style="padding: 4px 12px; font-size: 13px; color: #9CA3AF;">Pan-India Express Shipping:</td>
                  <td style="padding: 4px 12px; text-align: right; font-size: 13px; color: #1EBE5D; font-weight: 600;">FREE (Promo)</td>
                </tr>
                <tr>
                  <td style="padding: 14px 12px 6px 12px; font-size: 16px; font-weight: 800; color: #FFFFFF; border-top: 1px solid #2F313B;">
                    Grand Total Paid:
                  </td>
                  <td style="padding: 14px 12px 6px 12px; text-align: right; font-size: 18px; font-weight: 900; color: #FF7A00; font-family: monospace; border-top: 1px solid #2F313B;">
                    ₹${data.total.toLocaleString('en-IN')}.00
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Shipping Destination -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <div style="background-color: #121317; border: 1px solid #24252D; border-radius: 12px; padding: 14px 18px;">
                <div style="font-size: 11px; font-weight: 700; color: #9CA3AF; text-transform: uppercase;">
                  📍 Delivery Destination
                </div>
                <div style="font-size: 13px; color: #E5E7EB; margin-top: 4px; line-height: 1.4;">
                  ${formattedAddress}
                </div>
              </div>
            </td>
          </tr>

          <!-- Next Steps & Direct WhatsApp CTA -->
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <div style="background-color: #1C1E26; border: 1px solid #FF7A00; border-radius: 14px; padding: 18px; text-align: center;">
                <div style="font-size: 14px; font-weight: 700; color: #FFFFFF;">
                  Need immediate design approval or corporate PO assistance?
                </div>
                <div style="font-size: 12px; color: #9CA3AF; margin-top: 4px; margin-bottom: 14px;">
                  Our production leads are ready to share your high-res mockup on WhatsApp.
                </div>
                <a href="https://wa.me/918309394934?text=Hi%20TeqqnoWorld,%20checking%20status%20for%20Order%20%23${displayOrderNum}" style="display: inline-block; background-color: #1EBE5D; color: #FFFFFF; font-size: 13px; font-weight: 700; text-decoration: none; padding: 10px 22px; border-radius: 10px; box-shadow: 0 4px 15px rgba(30, 190, 93, 0.3);">
                  Chat with Production Team on WhatsApp
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer Legal -->
          <tr>
            <td style="background-color: #0E0F12; padding: 20px 32px; text-align: center; border-top: 1px solid #24252D;">
              <div style="font-size: 11px; color: #6B7280; line-height: 1.5;">
                TeqqnoWorld Factory • Udyog Vihar Phase 4, Gurugram, HR 122016<br />
                All orders backed by 100% Quality Print Guarantee & Digital Pre-Production Proof Sign-Off.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// ==============================================================================
// 3. API ROUTE: /api/send-order-email
// ==============================================================================

app.post('/api/send-order-email', async (req: Request, res: Response) => {
  try {
    const payload: OrderConfirmationPayload = req.body;

    if (!payload || !payload.orderId || !payload.customerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required order details: orderId and customerEmail are required.',
      });
    }

    const transporter = getSmtpTransporter();
    const senderEmail = process.env.HOSTINGER_SMTP_EMAIL || 'orders@teqqnoworld.com';
    const recipientEmail = payload.customerEmail.trim();

    const htmlContent = generateOrderEmailHtml(payload);
    const subject = `Order Confirmed: #${payload.orderNumber || payload.orderId} - TeqqnoWorld`;

    // If Hostinger credentials are not yet set in environment, simulate delivery smoothly
    if (!transporter) {
      console.log(`[Hostinger SMTP Simulation] Transporter not configured in environment.`);
      console.log(`[Hostinger SMTP Simulation] Would dispatch email to: ${recipientEmail}`);
      console.log(`[Hostinger SMTP Simulation] Subject: ${subject}`);
      
      return res.status(200).json({
        success: true,
        simulated: true,
        message: 'Order confirmation email queued successfully (Hostinger SMTP simulation mode - add HOSTINGER_SMTP_EMAIL and HOSTINGER_SMTP_PASSWORD to .env to send real emails).',
        recipient: recipientEmail,
      });
    }

    // Send real email via Hostinger SMTP
    const mailOptions = {
      from: `"TeqqnoWorld Orders" <${senderEmail}>`,
      to: recipientEmail,
      subject,
      html: htmlContent,
      // BCC to factory team for instant production notification
      bcc: senderEmail,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[Hostinger SMTP Success] Message sent:', info.messageId);

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      message: `Order confirmation email dispatched to ${recipientEmail} via Hostinger SMTP.`,
    });
  } catch (err: any) {
    console.error('[Hostinger SMTP Error]:', err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Failed to dispatch email via Hostinger SMTP.',
    });
  }
});

// Health check / SMTP status endpoint
app.get('/api/smtp-status', (_req: Request, res: Response) => {
  const hasUser = Boolean(process.env.HOSTINGER_SMTP_EMAIL || process.env.SMTP_USER);
  const hasPass = Boolean(process.env.HOSTINGER_SMTP_PASSWORD || process.env.SMTP_PASS);

  res.json({
    configured: hasUser && hasPass,
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    senderEmail: process.env.HOSTINGER_SMTP_EMAIL || '(not set)',
  });
});

// ==============================================================================
// 4. DEV SERVER & STATIC FILE SERVING
// ==============================================================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Mount Vite middlewares in development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production built assets
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TeqqnoWorld] Server running on port ${PORT}`);
    console.log(`[TeqqnoWorld] Hostinger SMTP configured: ${Boolean(process.env.HOSTINGER_SMTP_EMAIL)}`);
  });
}

startServer();
