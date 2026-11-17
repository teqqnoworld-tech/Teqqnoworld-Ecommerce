import express from 'express';
import type { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
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

const getSmtpConfig = () => {
  const smtpUser = (process.env.HOSTINGER_SMTP_EMAIL || process.env.SMTP_USER || '').trim();
  const smtpPass = (process.env.HOSTINGER_SMTP_PASSWORD || process.env.SMTP_PASS || '').trim();
  const smtpHost = (process.env.SMTP_HOST || 'smtp.hostinger.com').trim();
  const smtpPort = Number(process.env.SMTP_PORT) || 465;
  const smtpSecure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === 'true'
    : smtpPort === 465;

  const rawAdminEmails = (process.env.ADMIN_NOTIFICATION_EMAIL || 'teqqnoworld@gmail.com').trim();
  const adminEmailList = rawAdminEmails
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  if (smtpUser && !adminEmailList.some((e) => e.toLowerCase() === smtpUser.toLowerCase())) {
    adminEmailList.push(smtpUser);
  }

  return {
    smtpUser,
    smtpPass,
    smtpHost,
    smtpPort,
    smtpSecure,
    adminEmailList,
    primaryAdminEmail: adminEmailList[0] || 'teqqnoworld@gmail.com',
  };
};

const getSmtpTransporter = () => {
  const cfg = getSmtpConfig();

  if (!cfg.smtpUser || !cfg.smtpPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: cfg.smtpHost,
    port: cfg.smtpPort,
    secure: cfg.smtpSecure,
    auth: {
      user: cfg.smtpUser,
      pass: cfg.smtpPass,
    },
    tls: {
      rejectUnauthorized: true,
    },
  });
};

function escapeHtml(value: string | undefined | null): string {
  if (!value) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ==============================================================================
// 2. LUXURY DARK/ORANGE B2B HTML EMAIL TEMPLATES (CUSTOMER + ADMIN ALERT)
// ==============================================================================

interface OrderItemPayload {
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
  gstin?: string;
  paymentMode?: string;
  amountPaid?: number;
  balanceDue?: number;
  razorpayPaymentId?: string;
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

interface EmailAttachmentItem {
  filename: string;
  content: Buffer;
  contentType?: string;
  cid?: string;
  contentDisposition?: 'inline' | 'attachment';
}

interface PreparedOrderMedia {
  imgSrcBySource: Map<string, string>;
  adminAttachments: EmailAttachmentItem[];
  customerInlineAttachments: EmailAttachmentItem[];
}

function parseDataUrl(src: string): { buffer: Buffer; mime: string; ext: string } | null {
  const match = src.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1];
  const ext = (mime.split('/')[1] || 'png').replace('svg+xml', 'svg').replace(/[^a-zA-Z0-9]/g, '');
  return {
    buffer: Buffer.from(match[2], 'base64'),
    mime,
    ext: ext || 'png',
  };
}

async function fetchUrlBuffer(url: string): Promise<{ buffer: Buffer; mime: string; ext: string } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const contentType = (resp.headers.get('content-type') || 'image/webp').split(';')[0].trim();
    const arr = await resp.arrayBuffer();
    const extFromUrl = url.split('?')[0].split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '');
    const ext = extFromUrl || contentType.split('/')[1]?.replace(/[^a-zA-Z0-9]/g, '') || 'webp';
    return {
      buffer: Buffer.from(arr),
      mime: contentType,
      ext,
    };
  } catch {
    return null;
  }
}

async function prepareOrderMedia(payload: OrderConfirmationPayload): Promise<PreparedOrderMedia> {
  const imgSrcBySource = new Map<string, string>();
  const adminAttachments: EmailAttachmentItem[] = [];
  const customerInlineAttachments: EmailAttachmentItem[] = [];
  const orderTag = (payload.orderNumber || payload.orderId || 'ORDER').replace(/[^a-zA-Z0-9_-]/g, '');
  let cidCounter = 1;

  const processAsset = async (
    src: string | undefined,
    fileBase: string,
    includeForCustomerInline = false
  ) => {
    if (!src) return;
    if (imgSrcBySource.has(src)) return;

    const cleanFileBase = fileBase.replace(/[^a-zA-Z0-9_-]/g, '_');

    if (src.startsWith('data:')) {
      const parsed = parseDataUrl(src);
      if (!parsed) return;
      const cid = `tq_${orderTag}_${cidCounter++}@teqqnoworld.com`;
      imgSrcBySource.set(src, `cid:${cid}`);

      // Inline CID copy so Gmail displays it inside the email card
      adminAttachments.push({
        filename: `${orderTag}_${cleanFileBase}.${parsed.ext}`,
        content: parsed.buffer,
        contentType: parsed.mime,
        cid,
        contentDisposition: 'inline',
      });
      // Explicit downloadable attachment copy for Admin
      adminAttachments.push({
        filename: `${orderTag}_${cleanFileBase}_download.${parsed.ext}`,
        content: parsed.buffer,
        contentType: parsed.mime,
        contentDisposition: 'attachment',
      });
      if (includeForCustomerInline) {
        customerInlineAttachments.push({
          filename: `${orderTag}_${cleanFileBase}.${parsed.ext}`,
          content: parsed.buffer,
          contentType: parsed.mime,
          cid,
          contentDisposition: 'inline',
        });
      }
      return;
    }

    if (src.startsWith('http://') || src.startsWith('https://')) {
      imgSrcBySource.set(src, src);
      const fetched = await fetchUrlBuffer(src);
      if (fetched) {
        adminAttachments.push({
          filename: `${orderTag}_${cleanFileBase}.${fetched.ext}`,
          content: fetched.buffer,
          contentType: fetched.mime,
          contentDisposition: 'attachment',
        });
      }
    }
  };

  for (let idx = 0; idx < payload.items.length; idx++) {
    const item = payload.items[idx];
    const itemNum = idx + 1;
    await Promise.all([
      processAsset(item.mockupFrontUrl, `Item${itemNum}_Product_Mockup_Front`, true),
      processAsset(item.mockupBackUrl, `Item${itemNum}_Product_Mockup_Back`, true),
      processAsset(item.logoUrl, `Item${itemNum}_Customer_Logo_Front`, false),
      processAsset(item.backLogoUrl, `Item${itemNum}_Customer_Logo_Back`, false),
      ...(item.extraArtworkUrls || []).map((extraUrl, eIdx) =>
        processAsset(extraUrl, `Item${itemNum}_Extra_Artwork_${eIdx + 1}`, false)
      ),
    ]);
  }

  return { imgSrcBySource, adminAttachments, customerInlineAttachments };
}

function renderMediaCardHtml(title: string, src: string | undefined, media: PreparedOrderMedia, accentColor = '#FF7A00'): string {
  if (!src) return '';
  const imgSrc = media.imgSrcBySource.get(src) || src;
  const isHttp = src.startsWith('http://') || src.startsWith('https://');
  return `
    <td width="50%" valign="top" style="padding: 6px;">
      <div style="background: #111216; border: 1px solid #2C2E38; border-radius: 10px; padding: 10px; text-align: center;">
        <div style="font-size: 10px; font-weight: 800; color: ${accentColor}; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px;">${escapeHtml(title)}</div>
        <div style="background: #F8FAFC; border-radius: 8px; padding: 6px; margin-bottom: 8px;">
          <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(title)}" style="max-width: 100%; max-height: 180px; width: auto; height: auto; display: block; margin: 0 auto; border-radius: 6px;" />
        </div>
        ${isHttp ? `<a href="${escapeHtml(src)}" target="_blank" style="display: inline-block; font-size: 11px; font-weight: 700; color: #FFFFFF; background: ${accentColor}; text-decoration: none; padding: 5px 10px; border-radius: 6px;">Open / Download Full-Res</a>` : `<span style="font-size: 10px; color: #9CA3AF;">Attached at bottom of email</span>`}
      </div>
    </td>
  `;
}

function generateAdminOrderAlertHtml(data: OrderConfirmationPayload, media: PreparedOrderMedia): string {
  const displayOrderNum = escapeHtml(data.orderNumber || data.orderId);
  const cleanPhoneDigits = (data.phone || '').replace(/[^0-9]/g, '');
  const waDigits = cleanPhoneDigits.length === 10 ? `91${cleanPhoneDigits}` : cleanPhoneDigits;

  const itemsHtml = data.items
    .map((item, idx) => {
      const lineTotal = item.totalPrice || item.price * item.quantity;
      const specs = [
        item.color ? `Color: ${escapeHtml(item.color)}` : null,
        item.size ? `Size: ${escapeHtml(item.size)}` : null,
        item.printMethod ? `Method: ${escapeHtml(item.printMethod)}` : null,
        item.printPlacement ? `Placement: ${escapeHtml(item.printPlacement)}` : null,
      ]
        .filter(Boolean)
        .join(' • ');

      const cards: string[] = [];
      if (item.mockupFrontUrl) cards.push(renderMediaCardHtml('Product Design (Front View)', item.mockupFrontUrl, media, '#FF7A00'));
      if (item.mockupBackUrl) cards.push(renderMediaCardHtml('Product Design (Back View)', item.mockupBackUrl, media, '#FF7A00'));
      if (item.logoUrl) cards.push(renderMediaCardHtml('Customer Raw Logo / Poster (Front)', item.logoUrl, media, '#1EBE5D'));
      if (item.backLogoUrl) cards.push(renderMediaCardHtml('Customer Raw Logo / Poster (Back)', item.backLogoUrl, media, '#1EBE5D'));
      (item.extraArtworkUrls || []).forEach((u, eIdx) => {
        cards.push(renderMediaCardHtml(`Extra Studio Artwork #${eIdx + 1}`, u, media, '#3B82F6'));
      });

      const rowsHtml: string[] = [];
      for (let c = 0; c < cards.length; c += 2) {
        rowsHtml.push(`<tr>${cards[c]}${cards[c + 1] || '<td width="50%"></td>'}</tr>`);
      }

      return `
        <tr>
          <td colspan="3" style="padding: 14px 12px; border-bottom: 1px solid #282A33;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td>
                  <div style="font-size: 14px; font-weight: 800; color: #FFFFFF;">${idx + 1}. ${escapeHtml(item.name)}</div>
                  ${specs ? `<div style="font-size: 11px; color: #9CA3AF; margin-top: 3px;">${specs}</div>` : ''}
                </td>
                <td style="text-align: center; font-size: 13px; font-weight: 700; color: #E5E7EB; font-family: monospace; width: 60px;">
                  × ${item.quantity}
                </td>
                <td style="text-align: right; font-size: 14px; font-weight: 800; color: #FF7A00; font-family: monospace; width: 110px;">
                  ₹${lineTotal.toLocaleString('en-IN')}.00
                </td>
              </tr>
            </table>

            ${
              item.designPositionSummary || item.customNotes
                ? `<div style="margin-top: 10px; background: #1B1D24; border-left: 3px solid #FF7A00; border-radius: 6px; padding: 10px 12px; font-size: 11px; color: #E5E7EB; line-height: 1.55;">
                    <div style="font-size: 10px; font-weight: 800; color: #FF7A00; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">📐 Logo & Design Position Specifications</div>
                    ${item.designPositionSummary ? `<div>${escapeHtml(item.designPositionSummary)}</div>` : ''}
                    ${item.customNotes ? `<div style="margin-top: 4px; color: #FCD34D;"><strong>Customer Note:</strong> ${escapeHtml(item.customNotes)}</div>` : ''}
                  </div>`
                : ''
            }

            ${
              rowsHtml.length > 0
                ? `<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 10px;">${rowsHtml.join('')}</table>`
                : ''
            }
          </td>
        </tr>
      `;
    })
    .join('');

  const formattedAddress = data.shippingAddress
    ? `${escapeHtml(data.shippingAddress.street || '')}, ${escapeHtml(data.shippingAddress.city || '')}, ${escapeHtml(data.shippingAddress.state || '')} - ${escapeHtml(data.shippingAddress.pincode || '')}`
    : 'Not provided';

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>New Order Alert #${displayOrderNum}</title></head>
<body style="margin:0; padding:0; background-color:#0B0B0D; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif; color:#FFFFFF;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0B0B0D; padding:24px 12px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:660px; background-color:#16171B; border:1px solid #FF7A00; border-radius:16px; overflow:hidden;">
          <tr>
            <td style="background:#1F2026; padding:22px 24px; border-bottom:2px solid #FF7A00;">
              <div style="font-size:11px; font-weight:800; letter-spacing:2px; color:#FF7A00; text-transform:uppercase;">TEQQNOWORLD ADMIN ALERT</div>
              <div style="font-size:22px; font-weight:800; color:#FFFFFF; margin-top:6px;">New Website Order Received: #${displayOrderNum}</div>
              <div style="font-size:13px; color:#D1D5DB; margin-top:4px;">Grand Total: <strong style="color:#1EBE5D;">₹${data.total.toLocaleString('en-IN')}.00</strong> • Payment: ${escapeHtml(data.paymentMode || 'Standard Checkout')}</div>
              ${
                typeof data.amountPaid === 'number'
                  ? `<div style="font-size:12px; color:#E5E7EB; margin-top:6px;">Paid Online: <strong style="color:#1EBE5D;">₹${data.amountPaid.toLocaleString('en-IN')}.00</strong> • Balance Before Dispatch: <strong style="color:${(data.balanceDue || 0) > 0 ? '#FBBF24' : '#1EBE5D'};">₹${(data.balanceDue || 0).toLocaleString('en-IN')}.00</strong>${data.razorpayPaymentId ? ` • Razorpay ID: <span style="font-family:monospace;color:#FF7A00;">${escapeHtml(data.razorpayPaymentId)}</span>` : ''}</div>`
                  : ''
              }
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#111216; border:1px solid #282A33; border-radius:12px; padding:14px;">
                <tr>
                  <td style="font-size:12px; color:#9CA3AF; line-height:1.7;">
                    <strong style="color:#FFFFFF;">Customer:</strong> ${escapeHtml(data.customerName)}${data.company ? ` (${escapeHtml(data.company)})` : ''}<br/>
                    <strong style="color:#FFFFFF;">Email:</strong> <a href="mailto:${escapeHtml(data.customerEmail)}" style="color:#FF7A00;">${escapeHtml(data.customerEmail)}</a><br/>
                    <strong style="color:#FFFFFF;">Phone:</strong> <a href="tel:${escapeHtml(data.phone || '')}" style="color:#FF7A00;">${escapeHtml(data.phone || 'Not provided')}</a><br/>
                    ${data.gstin ? `<strong style="color:#FFFFFF;">GSTIN:</strong> ${escapeHtml(data.gstin)}<br/>` : ''}
                    <strong style="color:#FFFFFF;">Delivery Address:</strong> ${formattedAddress}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px 16px 16px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <thead>
                  <tr style="border-bottom:1px solid #2F313B;">
                    <th style="padding:8px 12px; text-align:left; font-size:11px; color:#9CA3AF; text-transform:uppercase;">Ordered Product & Artwork Proof</th>
                    <th style="padding:8px 12px; text-align:center; font-size:11px; color:#9CA3AF; text-transform:uppercase; width:60px;">Qty</th>
                    <th style="padding:8px 12px; text-align:right; font-size:11px; color:#9CA3AF; text-transform:uppercase; width:110px;">Total</th>
                  </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 24px 24px; text-align:center;">
              ${waDigits ? `<a href="https://wa.me/${waDigits}?text=${encodeURIComponent(`Hi ${data.customerName}, we received your TeqqnoWorld order #${data.orderNumber || data.orderId}!`)}" style="display:inline-block; background:#1EBE5D; color:#FFFFFF; font-size:13px; font-weight:700; text-decoration:none; padding:10px 20px; border-radius:10px; margin-right:8px;">WhatsApp Customer</a>` : ''}
              <a href="https://teqqnoworld.com/#admin" style="display:inline-block; background:#FF7A00; color:#FFFFFF; font-size:13px; font-weight:700; text-decoration:none; padding:10px 20px; border-radius:10px;">Open Admin Hub</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateOrderEmailHtml(data: OrderConfirmationPayload, media: PreparedOrderMedia): string {
  const displayOrderNum = data.orderNumber || data.orderId;
  const dispatchTimeline = data.estimatedDispatch || '24-48h Fast Dispatch';

  const itemsHtml = data.items
    .map((item) => {
      const lineTotal = item.totalPrice || item.price * item.quantity;
      const details = [
        item.color ? `Color: ${escapeHtml(item.color)}` : null,
        item.size ? `Size: ${escapeHtml(item.size)}` : null,
        item.printMethod ? `Print: ${escapeHtml(item.printMethod)}` : null,
        item.printPlacement ? `Placement: ${escapeHtml(item.printPlacement)}` : null,
      ]
        .filter(Boolean)
        .join(' • ');

      const frontMockSrc = item.mockupFrontUrl ? (media.imgSrcBySource.get(item.mockupFrontUrl) || item.mockupFrontUrl) : '';
      const backMockSrc = item.mockupBackUrl ? (media.imgSrcBySource.get(item.mockupBackUrl) || item.mockupBackUrl) : '';

      return `
        <tr>
          <td style="padding: 16px 12px; border-bottom: 1px solid #282A33;">
            <div style="font-size: 14px; font-weight: 700; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              ${escapeHtml(item.name)}
            </div>
            ${
              details
                ? `<div style="font-size: 12px; color: #9CA3AF; margin-top: 4px; font-family: -apple-system, sans-serif;">${details}</div>`
                : ''
            }
            ${
              item.designPositionSummary
                ? `<div style="font-size: 11px; color: #D1D5DB; margin-top: 4px; background: #1B1D24; padding: 6px 8px; border-radius: 6px; border-left: 2px solid #FF7A00;">${escapeHtml(item.designPositionSummary)}</div>`
                : ''
            }
            ${
              frontMockSrc || backMockSrc
                ? `<div style="margin-top: 8px; display: flex; gap: 8px;">
                    ${frontMockSrc ? `<img src="${escapeHtml(frontMockSrc)}" alt="Front Mockup" style="height: 84px; width: auto; background: #F8FAFC; padding: 4px; border-radius: 8px; border: 1px solid #2F313B; margin-right: 8px;" />` : ''}
                    ${backMockSrc ? `<img src="${escapeHtml(backMockSrc)}" alt="Back Mockup" style="height: 84px; width: auto; background: #F8FAFC; padding: 4px; border-radius: 8px; border: 1px solid #2F313B;" />` : ''}
                  </div>`
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
                    Order Total:
                  </td>
                  <td style="padding: 14px 12px 6px 12px; text-align: right; font-size: 18px; font-weight: 900; color: #FF7A00; font-family: monospace; border-top: 1px solid #2F313B;">
                    ₹${data.total.toLocaleString('en-IN')}.00
                  </td>
                </tr>
                ${
                  typeof data.amountPaid === 'number'
                    ? `<tr>
                        <td style="padding: 4px 12px; font-size: 13px; color: #1EBE5D; font-weight: 700;">Paid Online (${escapeHtml(data.paymentMode || 'Prepaid')}):</td>
                        <td style="padding: 4px 12px; text-align: right; font-size: 13px; color: #1EBE5D; font-family: monospace; font-weight: 700;">₹${data.amountPaid.toLocaleString('en-IN')}.00</td>
                      </tr>
                      ${
                        (data.balanceDue || 0) > 0
                          ? `<tr>
                              <td style="padding: 4px 12px; font-size: 13px; color: #FBBF24; font-weight: 700;">Balance Payable Before Dispatch:</td>
                              <td style="padding: 4px 12px; text-align: right; font-size: 13px; color: #FBBF24; font-family: monospace; font-weight: 700;">₹${(data.balanceDue || 0).toLocaleString('en-IN')}.00</td>
                            </tr>`
                          : ''
                      }
                      ${
                        data.razorpayPaymentId
                          ? `<tr>
                              <td style="padding: 4px 12px; font-size: 11px; color: #9CA3AF;">Razorpay Transaction ID:</td>
                              <td style="padding: 4px 12px; text-align: right; font-size: 11px; color: #E5E7EB; font-family: monospace;">${escapeHtml(data.razorpayPaymentId)}</td>
                            </tr>`
                          : ''
                      }`
                    : ''
                }
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
// 3. API ROUTES: /api/send-order-email, /api/test-email, /api/smtp-status
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

    const cfg = getSmtpConfig();
    const transporter = getSmtpTransporter();
    const senderEmail = cfg.smtpUser || 'orders@teqqnoworld.com';
    const recipientEmail = payload.customerEmail.trim();
    const displayOrderNum = payload.orderNumber || payload.orderId;

    const media = await prepareOrderMedia(payload);

    const customerHtml = generateOrderEmailHtml(payload, media);
    const customerSubject = `Order Confirmed: #${displayOrderNum} - TeqqnoWorld`;

    const adminHtml = generateAdminOrderAlertHtml(payload, media);
    const adminSubject = `New Order #${displayOrderNum} (₹${Number(payload.total || 0).toLocaleString('en-IN')}) - ${payload.customerName}`;

    // If Hostinger credentials are not yet set in environment, return simulated status clearly
    if (!transporter) {
      console.log(`[Hostinger SMTP Simulation] Transporter not configured in environment.`);
      console.log(`[Hostinger SMTP Simulation] Customer recipient: ${recipientEmail}`);
      console.log(`[Hostinger SMTP Simulation] Admin recipients: ${cfg.adminEmailList.join(', ')}`);

      return res.status(200).json({
        success: true,
        simulated: true,
        customerSent: false,
        adminSent: false,
        message: 'Order confirmation email is in simulation mode (set HOSTINGER_SMTP_EMAIL, HOSTINGER_SMTP_PASSWORD, and ADMIN_NOTIFICATION_EMAIL in environment variables to send real emails).',
        recipient: recipientEmail,
        adminRecipients: cfg.adminEmailList,
      });
    }

    // Send Customer Confirmation & Admin New Order Alert independently
    const [customerResult, adminResult] = await Promise.allSettled([
      transporter.sendMail({
        from: `"TeqqnoWorld Orders" <${senderEmail}>`,
        to: recipientEmail,
        replyTo: cfg.primaryAdminEmail,
        subject: customerSubject,
        html: customerHtml,
        attachments: media.customerInlineAttachments,
      }),
      transporter.sendMail({
        from: `"TeqqnoWorld Store Alerts" <${senderEmail}>`,
        to: cfg.adminEmailList.join(', '),
        replyTo: recipientEmail,
        subject: adminSubject,
        html: adminHtml,
        attachments: media.adminAttachments,
      }),
    ]);

    const customerSent = customerResult.status === 'fulfilled';
    const adminSent = adminResult.status === 'fulfilled';

    if (!customerSent) {
      console.error('[Hostinger SMTP Customer Email Error]:', customerResult.reason);
    }
    if (!adminSent) {
      console.error('[Hostinger SMTP Admin Alert Error]:', adminResult.reason);
    }

    if (!customerSent && !adminSent) {
      const errReason: any = customerResult.status === 'rejected' ? customerResult.reason : (adminResult as PromiseRejectedResult).reason;
      return res.status(500).json({
        success: false,
        customerSent: false,
        adminSent: false,
        message: errReason?.message || 'Failed to send both customer and admin emails via Hostinger SMTP.',
      });
    }

    const customerMsgId = customerSent ? customerResult.value.messageId : undefined;
    const adminMsgId = adminSent ? adminResult.value.messageId : undefined;

    console.log('[Hostinger SMTP Success]', { customerSent, adminSent, customerMsgId, adminMsgId });

    return res.status(200).json({
      success: true,
      customerSent,
      adminSent,
      messageId: customerMsgId,
      adminMessageId: adminMsgId,
      recipient: recipientEmail,
      adminRecipients: cfg.adminEmailList,
      message: `Dispatched via Hostinger SMTP (Customer: ${customerSent ? 'Sent' : 'Failed'}, Admin Alert: ${adminSent ? 'Sent' : 'Failed'}).`,
    });
  } catch (err: any) {
    console.error('[Hostinger SMTP Error]:', err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Failed to dispatch email via Hostinger SMTP.',
    });
  }
});

// Test SMTP endpoint for Admin Hub diagnostics
app.post('/api/test-email', async (req: Request, res: Response) => {
  try {
    const cfg = getSmtpConfig();
    const transporter = getSmtpTransporter();

    if (!transporter) {
      return res.status(400).json({
        success: false,
        simulated: true,
        message: 'HOSTINGER_SMTP_EMAIL or HOSTINGER_SMTP_PASSWORD is not configured in server environment variables.',
      });
    }

    await transporter.verify();

    const targetEmail = (req.body?.toEmail || cfg.primaryAdminEmail).trim();
    const info = await transporter.sendMail({
      from: `"TeqqnoWorld Orders" <${cfg.smtpUser}>`,
      to: Array.from(new Set([targetEmail, ...cfg.adminEmailList])).join(', '),
      subject: `TeqqnoWorld SMTP Test Successful (${new Date().toLocaleString('en-IN')})`,
      html: `<div style="font-family:sans-serif;padding:20px;background:#16171B;color:#fff;border-radius:12px;border:1px solid #FF7A00;">
        <h2 style="color:#FF7A00;margin-top:0;">TeqqnoWorld Email Notifications Working!</h2>
        <p>Your Hostinger SMTP configuration (<strong>${escapeHtml(cfg.smtpHost)}:${cfg.smtpPort}</strong>) verified and delivered this test email.</p>
        <p style="font-size:12px;color:#9CA3AF;">Sender: ${escapeHtml(cfg.smtpUser)}<br/>Admin Alert Recipients: ${escapeHtml(cfg.adminEmailList.join(', '))}</p>
      </div>`,
    });

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      adminRecipients: cfg.adminEmailList,
      message: `Test email delivered successfully to ${targetEmail}!`,
    });
  } catch (err: any) {
    console.error('[Hostinger SMTP Test Error]:', err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'SMTP verification/send failed. Check email, password, host, and port.',
    });
  }
});

// Health check / SMTP status endpoint
app.get('/api/smtp-status', (_req: Request, res: Response) => {
  const cfg = getSmtpConfig();

  res.json({
    configured: Boolean(cfg.smtpUser && cfg.smtpPass),
    host: cfg.smtpHost,
    port: cfg.smtpPort,
    secure: cfg.smtpSecure,
    senderEmail: cfg.smtpUser || '(not set)',
    adminEmail: cfg.adminEmailList.join(', '),
  });
});

// ==============================================================================
// 3B. RAZORPAY PAYMENT GATEWAY ROUTES (100% PREPAID + 50% PARTIAL ADVANCE, NO COD)
// ==============================================================================

const getRazorpayConfig = () => ({
  keyId: (process.env.RAZORPAY_KEY_ID || '').trim(),
  keySecret: (process.env.RAZORPAY_KEY_SECRET || '').trim(),
});

app.get('/api/razorpay/status', (_req: Request, res: Response) => {
  const rzp = getRazorpayConfig();
  res.json({
    configured: Boolean(rzp.keyId && rzp.keySecret),
    keyId: rzp.keyId || null,
  });
});

app.post('/api/razorpay/create-order', async (req: Request, res: Response) => {
  try {
    const rzp = getRazorpayConfig();
    if (!rzp.keyId || !rzp.keySecret) {
      return res.status(400).json({
        success: false,
        message: 'Razorpay credentials (RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET) are not configured on the server.',
      });
    }

    const { amountInr, totalOrderValue, balanceDue, paymentPlan, receipt, customerName, customerEmail, customerPhone } = req.body || {};
    const numericAmount = Number(amountInr);
    if (!Number.isFinite(numericAmount) || numericAmount < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payable amount for Razorpay order.',
      });
    }

    const amountPaise = Math.round(numericAmount * 100);
    const authHeader = 'Basic ' + Buffer.from(`${rzp.keyId}:${rzp.keySecret}`).toString('base64');

    const rzpResp = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt: String(receipt || `tq_${Date.now()}`).slice(0, 40),
        notes: {
          payment_plan: paymentPlan || 'prepaid_100',
          total_order_value_inr: String(totalOrderValue || numericAmount),
          advance_paid_inr: String(numericAmount),
          balance_due_inr: String(balanceDue || 0),
          customer_name: String(customerName || ''),
          customer_email: String(customerEmail || ''),
          customer_phone: String(customerPhone || ''),
        },
      }),
    });

    const rzpData: any = await rzpResp.json();
    if (!rzpResp.ok || !rzpData?.id) {
      return res.status(rzpResp.status || 500).json({
        success: false,
        message: rzpData?.error?.description || 'Failed to create Razorpay order.',
      });
    }

    return res.json({
      success: true,
      orderId: rzpData.id,
      amount: rzpData.amount,
      currency: rzpData.currency,
      keyId: rzp.keyId,
    });
  } catch (err: any) {
    console.error('[Razorpay Create Order Error]:', err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Error creating Razorpay order.',
    });
  }
});

app.post('/api/razorpay/verify-payment', (req: Request, res: Response) => {
  try {
    const rzp = getRazorpayConfig();
    if (!rzp.keySecret) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: 'RAZORPAY_KEY_SECRET not configured on server.',
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: 'Missing Razorpay verification signature fields.',
      });
    }

    const expectedSignature = crypto
      .createHmac('sha256', rzp.keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(String(razorpay_signature), 'utf8')
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: 'Payment signature mismatch. Possible tampering detected.',
      });
    }

    return res.json({
      success: true,
      verified: true,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });
  } catch (err: any) {
    console.error('[Razorpay Verify Error]:', err);
    return res.status(500).json({
      success: false,
      verified: false,
      message: err?.message || 'Payment verification failed.',
    });
  }
});

// ==============================================================================
// 3C. DELHIVERY ONE LOGISTICS API ROUTES (PREPAID ONLY - NO COD)
// ==============================================================================

const DELHIVERY_PICKUPS = [
  { name: 'Teqqnoworld', city: 'Hyderabad', state: 'Telangana', pin: '502032' },
  { name: 'Teqqnoworld 2', city: 'Hyderabad', state: 'Telangana', pin: '500090' },
];

const getDelhiveryConfig = () => ({
  token: (process.env.DELHIVERY_API_TOKEN || '').trim(),
  defaultPickup: (process.env.DELHIVERY_PICKUP_LOCATION || 'Teqqnoworld').trim(),
  defaultOriginPin: (process.env.DELHIVERY_PICKUP_PINCODE || '502032').trim(),
});

app.get('/api/delhivery/status', (_req: Request, res: Response) => {
  const cfg = getDelhiveryConfig();
  res.json({
    configured: Boolean(cfg.token),
    defaultPickup: cfg.defaultPickup,
    defaultOriginPin: cfg.defaultOriginPin,
    pickups: DELHIVERY_PICKUPS,
  });
});

app.get('/api/delhivery/pincode', async (req: Request, res: Response) => {
  try {
    const pin = String(req.query.pin || '').replace(/[^0-9]/g, '').slice(0, 6);
    if (pin.length !== 6) {
      return res.status(400).json({ success: false, serviceable: false, pincode: pin, message: 'Enter a valid 6-digit pincode.' });
    }

    const cfg = getDelhiveryConfig();
    if (!cfg.token) {
      return res.json({
        success: false,
        configured: false,
        serviceable: true,
        pincode: pin,
        prepaid: true,
        cod: false,
        message: 'DELHIVERY_API_TOKEN not set yet — standard Delhivery Prepaid coverage assumed.',
      });
    }

    const resp = await fetch(`https://track.delhivery.com/c/api/pin-codes/json/?filter_codes=${pin}`, {
      headers: {
        Authorization: `Token ${cfg.token}`,
        Accept: 'application/json',
      },
    });
    const data: any = await resp.json();
    const record = data?.delivery_codes?.[0]?.postal_code;

    if (!record) {
      return res.json({
        success: true,
        configured: true,
        serviceable: false,
        pincode: pin,
        prepaid: false,
        cod: false,
        message: `Pincode ${pin} is currently non-serviceable on Delhivery Express.`,
      });
    }

    const prepaidOk = String(record.pre_paid || '').toUpperCase() === 'Y';
    const isEmbargo = String(record.remarks || '').toLowerCase().includes('embargo');
    const serviceable = prepaidOk && !isEmbargo;

    return res.json({
      success: true,
      configured: true,
      serviceable,
      pincode: pin,
      city: record.city || record.district || '',
      state: record.state_code || '',
      prepaid: prepaidOk,
      cod: false, // Store policy: Prepaid & 50% Partial Advance only (no COD)
      estimatedDays: '2–4 business days',
      message: serviceable
        ? `Delhivery Prepaid Express serviceable (${record.city || pin})`
        : `Pincode ${pin} has delivery restrictions (${record.remarks || 'Not serviceable'}).`,
    });
  } catch (err: any) {
    console.error('[Delhivery Pincode Error]:', err);
    return res.status(500).json({
      success: false,
      serviceable: false,
      pincode: String(req.query.pin || ''),
      message: err?.message || 'Delhivery pincode lookup failed.',
    });
  }
});

app.post('/api/delhivery/create-shipment', async (req: Request, res: Response) => {
  try {
    const cfg = getDelhiveryConfig();
    if (!cfg.token) {
      return res.status(400).json({
        success: false,
        message: 'DELHIVERY_API_TOKEN is not configured in server environment variables.',
      });
    }

    const {
      orderId,
      orderNumber,
      pickupLocation,
      customerName,
      phone,
      address,
      city,
      state,
      pincode,
      productDesc,
      quantity,
      totalAmount,
      weightGrams,
      lengthCm,
      breadthCm,
      heightCm,
    } = req.body || {};

    const cleanPin = String(pincode || '').replace(/[^0-9]/g, '').slice(0, 6);
    const cleanPhone = String(phone || '').replace(/[^0-9]/g, '').slice(-10);

    if (!customerName || cleanPin.length !== 6 || !cleanPhone) {
      return res.status(400).json({
        success: false,
        message: 'Customer name, 10-digit phone, and valid 6-digit delivery pincode are required for Delhivery manifest.',
      });
    }

    const selectedPickup = (pickupLocation || cfg.defaultPickup || 'Teqqnoworld').trim();
    const cmuPayload = {
      shipments: [
        {
          name: String(customerName).slice(0, 100),
          add: String(address || `${city}, ${state}`).slice(0, 250),
          pin: cleanPin,
          city: String(city || ''),
          state: String(state || ''),
          country: 'India',
          phone: cleanPhone,
          order: String(orderNumber || orderId || `TQ-${Date.now()}`),
          payment_mode: 'Prepaid',
          return_pin: '',
          return_city: '',
          return_phone: '',
          return_add: '',
          return_state: '',
          return_country: '',
          products_desc: String(productDesc || 'Custom Printed Corporate Merchandise').slice(0, 200),
          hsn_code: '9989',
          cod_amount: '0',
          order_date: new Date().toISOString().split('T')[0],
          total_amount: String(Math.round(Number(totalAmount) || 0)),
          seller_add: '',
          seller_name: 'TeqqnoWorld',
          seller_inv: String(orderNumber || orderId || ''),
          quantity: String(Number(quantity) || 1),
          waybill: '',
          shipment_width: String(Number(breadthCm) || 25),
          shipment_height: String(Number(heightCm) || 12),
          shipment_length: String(Number(lengthCm) || 30),
          weight: String(Number(weightGrams) || 500),
          seller_gst_tin: '',
          shipping_mode: 'Surface',
          address_type: 'home',
        },
      ],
      pickup_location: {
        name: selectedPickup,
      },
    };

    const formBody = new URLSearchParams();
    formBody.set('format', 'json');
    formBody.set('data', JSON.stringify(cmuPayload));

    const resp = await fetch('https://track.delhivery.com/api/cmu/create.json', {
      method: 'POST',
      headers: {
        Authorization: `Token ${cfg.token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: formBody.toString(),
    });

    const data: any = await resp.json();
    const pkg = data?.packages?.[0];
    const waybill = pkg?.waybill;

    if (!data?.success || !waybill) {
      const errMsg = pkg?.remarks?.join(', ') || data?.rmk || data?.error || 'Delhivery rejected shipment creation.';
      return res.status(400).json({
        success: false,
        message: errMsg,
        raw: data,
      });
    }

    return res.json({
      success: true,
      waybill,
      uploadWbn: data?.upload_wbn,
      courierPartner: `Delhivery (${selectedPickup})`,
      pickupLocation: selectedPickup,
      message: `Delhivery Shipment Created! Waybill: ${waybill}`,
      raw: data,
    });
  } catch (err: any) {
    console.error('[Delhivery Create Shipment Error]:', err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Delhivery shipment creation failed.',
    });
  }
});

app.get('/api/delhivery/label', async (req: Request, res: Response) => {
  try {
    const cfg = getDelhiveryConfig();
    const wbns = String(req.query.wbns || '').trim();
    if (!cfg.token || !wbns) {
      return res.status(400).send('Missing DELHIVERY_API_TOKEN or waybill (wbns).');
    }

    const resp = await fetch(`https://track.delhivery.com/api/p/packing_slip?wbns=${encodeURIComponent(wbns)}&pdf=true`, {
      headers: {
        Authorization: `Token ${cfg.token}`,
      },
    });

    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('application/pdf')) {
      const pdfBuf = Buffer.from(await resp.arrayBuffer());
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Delhivery_Label_${wbns}.pdf"`);
      return res.send(pdfBuf);
    }

    const jsonData: any = await resp.json();
    if (jsonData?.packages?.[0]?.pdf_download_link) {
      return res.redirect(jsonData.packages[0].pdf_download_link);
    }
    return res.json(jsonData);
  } catch (err: any) {
    return res.status(500).send(err?.message || 'Failed to fetch Delhivery shipping label.');
  }
});

app.post('/api/delhivery/pickup', async (req: Request, res: Response) => {
  try {
    const cfg = getDelhiveryConfig();
    if (!cfg.token) {
      return res.status(400).json({ success: false, message: 'DELHIVERY_API_TOKEN not configured.' });
    }

    const { pickupLocation, pickupDate, pickupTime, expectedPackageCount } = req.body || {};
    const resp = await fetch('https://track.delhivery.com/fm/request/new/', {
      method: 'POST',
      headers: {
        Authorization: `Token ${cfg.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        pickup_location: pickupLocation || cfg.defaultPickup,
        pickup_date: pickupDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        pickup_time: pickupTime || '14:00:00',
        expected_package_count: Number(expectedPackageCount) || 1,
      }),
    });

    const data: any = await resp.json();
    if (!resp.ok || data?.pr_exist === false && !data?.pickup_id) {
      return res.status(400).json({
        success: false,
        message: data?.error?.message || data?.message || 'Delhivery pickup request failed.',
      });
    }

    return res.json({
      success: true,
      pickupId: String(data?.pickup_id || ''),
      message: `Delhivery Pickup scheduled (${pickupLocation || cfg.defaultPickup})! ID: ${data?.pickup_id || 'Confirmed'}`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Pickup request failed.' });
  }
});

app.get('/api/delhivery/track', async (req: Request, res: Response) => {
  try {
    const cfg = getDelhiveryConfig();
    const waybill = String(req.query.waybill || '').trim();
    if (!cfg.token || !waybill) {
      return res.status(400).json({
        success: false,
        waybill,
        scans: [],
        message: !cfg.token ? 'DELHIVERY_API_TOKEN not configured.' : 'Waybill number required.',
      });
    }

    const resp = await fetch(`https://track.delhivery.com/api/v1/packages/json/?waybill=${encodeURIComponent(waybill)}`, {
      headers: {
        Authorization: `Token ${cfg.token}`,
        Accept: 'application/json',
      },
    });
    const data: any = await resp.json();
    const shipment = data?.ShipmentData?.[0]?.Shipment;

    if (!shipment) {
      return res.json({
        success: false,
        waybill,
        scans: [],
        message: `No tracking data found yet for Waybill ${waybill}.`,
      });
    }

    const scans = (shipment.Scans || []).map((s: any) => ({
      status: s?.ScanDetail?.Scan || '',
      location: s?.ScanDetail?.ScannedLocation || '',
      time: s?.ScanDetail?.ScanDateTime || '',
      instructions: s?.ScanDetail?.Instructions || '',
    }));

    return res.json({
      success: true,
      waybill,
      currentStatus: shipment?.Status?.Status || 'In Progress',
      statusLocation: shipment?.Status?.StatusLocation || '',
      expectedDelivery: shipment?.ExpectedDeliveryDate || '',
      origin: shipment?.Origin || '',
      destination: shipment?.Destination || '',
      scans,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      waybill: String(req.query.waybill || ''),
      scans: [],
      message: err?.message || 'Delhivery tracking lookup failed.',
    });
  }
});

// ==============================================================================
// 4. DEV SERVER & STATIC FILE SERVING
// ==============================================================================

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

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
    const distDir = path.join(__dirname, 'dist');
    const clientBuildDir = path.join(__dirname, 'client-build');
    const publicDir = path.join(__dirname, 'public');

    const activeBuildDir = fs.existsSync(path.join(distDir, 'index.html'))
      ? distDir
      : clientBuildDir;
    const activeIndex = path.join(activeBuildDir, 'index.html');

    if (!fs.existsSync(activeIndex)) {
      console.error('[TeqqnoWorld] ERROR: No production build found in dist/ or client-build/. Run `npm run build` before deploying.');
    } else {
      console.log(`[TeqqnoWorld] Serving frontend from: ${path.basename(activeBuildDir)}/`);
    }

    // Serve pre-built Vite bundle + static public assets (copyPublicDir: false avoids duplicating 48MB of images)
    app.use(express.static(activeBuildDir, { maxAge: '1d' }));
    app.use(express.static(publicDir, { maxAge: '7d' }));

    app.get('*', (_req: Request, res: Response) => {
      if (!fs.existsSync(activeIndex)) {
        return res.status(503).send('Production build missing. Please run npm run build and redeploy.');
      }
      return res.sendFile(activeIndex);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TeqqnoWorld] Server running on port ${PORT}`);
    console.log(`[TeqqnoWorld] Hostinger SMTP configured: ${Boolean(process.env.HOSTINGER_SMTP_EMAIL)}`);
  });
}

startServer();
