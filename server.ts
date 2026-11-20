import express from 'express';
import type { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import os from 'os';
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

// New Customer Registration Welcome (Customer) + Full Details Alert (Admin)
app.post('/api/send-registration-email', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      firstName,
      lastName,
      fullName,
      email,
      phone,
      company,
      accountType,
      registeredAt,
      originUrl,
    } = req.body || {};

    const cleanEmail = String(email || '').trim();
    const cleanName = String(fullName || `${firstName || ''} ${lastName || ''}`.trim() || 'Valued Customer').trim();
    const cleanPhone = String(phone || '').trim();
    const cleanCompany = String(company || '').trim();
    const cleanAccountType = cleanCompany ? 'Business / Corporate' : (accountType === 'business' ? 'Business / Corporate' : 'Individual');
    const cleanUserId = String(userId || `USR-${Date.now().toString().slice(-6)}`).trim();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'A valid customer email address is required.',
      });
    }

    const cfg = getSmtpConfig();
    const transporter = getSmtpTransporter();
    const siteOrigin = (
      cfg.smtpUser && process.env.APP_BASE_URL
        ? process.env.APP_BASE_URL.trim().replace(/\/$/, '')
        : originUrl && (String(originUrl).startsWith('http://') || String(originUrl).startsWith('https://'))
        ? String(originUrl).replace(/\/$/, '')
        : 'https://teqqnoworld.com'
    );

    const formattedTimeIst = new Date(registeredAt || Date.now()).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const waDigits = cleanPhone.replace(/[^0-9]/g, '');
    const waNumber = waDigits.length === 10 ? `91${waDigits}` : waDigits;

    if (!transporter) {
      console.log('[Registration Email - Simulation Mode]', {
        cleanName,
        cleanEmail,
        cleanPhone,
        cleanCompany,
        adminRecipients: cfg.adminEmailList,
      });
      return res.status(200).json({
        success: true,
        simulated: true,
        customerSent: false,
        adminSent: false,
        recipient: cleanEmail,
        adminRecipients: cfg.adminEmailList,
        message: 'Registration emails prepared in Simulation Mode (configure HOSTINGER_SMTP_EMAIL & HOSTINGER_SMTP_PASSWORD in .env for live delivery).',
      });
    }

    const customerHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#0F1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#FFFFFF;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0F1117;padding:28px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#161922;border-radius:16px;overflow:hidden;border:1px solid #262A36;">
          <tr>
            <td style="background:linear-gradient(135deg,#071B35 0%,#0E294D 100%);padding:28px 32px;border-bottom:3px solid #FF7900;">
              <div style="font-size:24px;font-weight:800;letter-spacing:-0.4px;color:#FFFFFF;">
                Teqqno<span style="color:#FF7900;">World</span>
              </div>
              <div style="font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:#94A3B8;margin-top:4px;">
                Custom Corporate Printing &amp; Branded Merchandise
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <div style="display:inline-block;background:#10B9811A;border:1px solid #10B98155;color:#34D399;font-size:11px;font-weight:700;padding:5px 12px;border-radius:999px;margin-bottom:16px;">
                ✓ ACCOUNT SUCCESSFULLY CREATED
              </div>
              <h1 style="margin:0 0 10px 0;font-size:22px;line-height:1.3;color:#FFFFFF;">
                Welcome to TeqqnoWorld, ${escapeHtml(cleanName)}!
              </h1>
              <p style="margin:0 0 22px 0;font-size:14px;line-height:1.65;color:#CBD5E1;">
                Aapka TeqqnoWorld account successfully create ho gaya hai. Ab aap custom corporate polo t-shirts, mugs, visiting cards, standees aur welcome kits par apna logo preview karke seedha order kar sakte hain.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0F131C;border:1px solid #262C3D;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#FF7900;margin-bottom:12px;">
                      Your Account Details
                    </div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:13px;color:#E2E8F0;">
                      <tr>
                        <td style="padding:6px 0;color:#94A3B8;width:38%;">Full Name</td>
                        <td style="padding:6px 0;font-weight:600;color:#FFFFFF;">${escapeHtml(cleanName)}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#94A3B8;">Registered Email</td>
                        <td style="padding:6px 0;font-weight:600;color:#FFFFFF;">${escapeHtml(cleanEmail)}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#94A3B8;">Mobile Number</td>
                        <td style="padding:6px 0;font-weight:600;color:#FFFFFF;">${escapeHtml(cleanPhone || '—')}</td>
                      </tr>
                      ${cleanCompany ? `<tr>
                        <td style="padding:6px 0;color:#94A3B8;">Company</td>
                        <td style="padding:6px 0;font-weight:600;color:#FFFFFF;">${escapeHtml(cleanCompany)}</td>
                      </tr>` : ''}
                      <tr>
                        <td style="padding:6px 0;color:#94A3B8;">Registered On</td>
                        <td style="padding:6px 0;color:#CBD5E1;">${escapeHtml(formattedTimeIst)} IST</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <div style="text-align:center;margin:26px 0 18px;">
                <a href="${escapeHtml(siteOrigin)}/#dashboard" style="display:inline-block;background:#FF7900;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:10px;">
                  Open My TeqqnoWorld Dashboard →
                </a>
              </div>

              <p style="margin:18px 0 0 0;font-size:12px;line-height:1.6;color:#94A3B8;text-align:center;">
                Need help with custom printing, bulk quotes, or samples? Reply to this email or WhatsApp our print team anytime.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#0D1018;padding:18px 32px;border-top:1px solid #232837;text-align:center;font-size:11px;color:#64748B;">
              © ${new Date().getFullYear()} TeqqnoWorld • Printing · Branding · Solutions • Hyderabad, India
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const adminHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background-color:#0F1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#FFFFFF;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0F1117;padding:24px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#161922;border-radius:16px;overflow:hidden;border:1px solid #FF790066;">
          <tr>
            <td style="background:#071B35;padding:22px 28px;border-bottom:3px solid #FF7900;">
              <div style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#FF7900;">
                NEW CUSTOMER REGISTRATION ALERT
              </div>
              <h2 style="margin:6px 0 0 0;font-size:20px;color:#FFFFFF;">
                ${escapeHtml(cleanName)} joined TeqqnoWorld
              </h2>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 28px;">
              <p style="margin:0 0 18px 0;font-size:13px;color:#CBD5E1;line-height:1.6;">
                A new customer has registered an account on the TeqqnoWorld storefront. Complete customer details are below:
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0F131C;border:1px solid #262C3D;border-radius:12px;margin-bottom:20px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:13px;color:#E2E8F0;">
                      <tr>
                        <td style="padding:7px 0;color:#94A3B8;width:36%;">Customer Name</td>
                        <td style="padding:7px 0;font-weight:700;color:#FFFFFF;">${escapeHtml(cleanName)}</td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;color:#94A3B8;">Email Address</td>
                        <td style="padding:7px 0;"><a href="mailto:${escapeHtml(cleanEmail)}" style="color:#60A5FA;text-decoration:none;font-weight:600;">${escapeHtml(cleanEmail)}</a></td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;color:#94A3B8;">Mobile / WhatsApp</td>
                        <td style="padding:7px 0;font-weight:700;color:#34D399;">${escapeHtml(cleanPhone || 'Not provided')}</td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;color:#94A3B8;">Company / Brand</td>
                        <td style="padding:7px 0;font-weight:600;color:#FFFFFF;">${escapeHtml(cleanCompany || 'Individual Customer')}</td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;color:#94A3B8;">Account Type</td>
                        <td style="padding:7px 0;color:#FBBF24;font-weight:600;">${escapeHtml(cleanAccountType)}</td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;color:#94A3B8;">User ID</td>
                        <td style="padding:7px 0;font-family:monospace;font-size:12px;color:#CBD5E1;">${escapeHtml(cleanUserId)}</td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;color:#94A3B8;">Registered At</td>
                        <td style="padding:7px 0;color:#CBD5E1;">${escapeHtml(formattedTimeIst)} IST</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <div style="text-align:center;">
                ${waNumber ? `<a href="https://wa.me/${escapeHtml(waNumber)}" style="display:inline-block;background:#1EBE5D;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;padding:11px 20px;border-radius:10px;margin:4px;">WhatsApp Customer</a>` : ''}
                <a href="mailto:${escapeHtml(cleanEmail)}" style="display:inline-block;background:#FF7900;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;padding:11px 20px;border-radius:10px;margin:4px;">Email Customer</a>
                <a href="${escapeHtml(siteOrigin)}/#admin" style="display:inline-block;background:#1E293B;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;padding:11px 20px;border-radius:10px;margin:4px;border:1px solid #334155;">Open Admin Hub</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const [customerResult, adminResult] = await Promise.allSettled([
      transporter.sendMail({
        from: `"TeqqnoWorld" <${cfg.smtpUser}>`,
        to: cleanEmail,
        replyTo: cfg.primaryAdminEmail,
        subject: `Welcome to TeqqnoWorld, ${cleanName}! Account Created Successfully`,
        html: customerHtml,
      }),
      transporter.sendMail({
        from: `"TeqqnoWorld Registrations" <${cfg.smtpUser}>`,
        to: cfg.adminEmailList.join(', '),
        replyTo: cleanEmail,
        subject: `[New Customer Signup] ${cleanName}${cleanCompany ? ` (${cleanCompany})` : ''} — ${cleanPhone || cleanEmail}`,
        html: adminHtml,
      }),
    ]);

    const customerSent = customerResult.status === 'fulfilled';
    const adminSent = adminResult.status === 'fulfilled';

    if (!customerSent) {
      console.error('[Registration Email - Customer Failed]:', (customerResult as PromiseRejectedResult).reason);
    }
    if (!adminSent) {
      console.error('[Registration Email - Admin Failed]:', (adminResult as PromiseRejectedResult).reason);
    }

    return res.status(customerSent || adminSent ? 200 : 500).json({
      success: customerSent || adminSent,
      customerSent,
      adminSent,
      recipient: cleanEmail,
      adminRecipients: cfg.adminEmailList,
      messageId: customerSent ? customerResult.value.messageId : undefined,
      adminMessageId: adminSent ? adminResult.value.messageId : undefined,
      message: `Registration emails dispatched (Customer: ${customerSent ? 'Sent' : 'Failed'}, Admin: ${adminSent ? 'Sent' : 'Failed'}).`,
    });
  } catch (err: any) {
    console.error('[Registration Email Error]:', err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Failed to send registration emails.',
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
  const mode = rzp.keyId.startsWith('rzp_live_')
    ? 'live'
    : rzp.keyId.startsWith('rzp_test_')
    ? 'test'
    : null;
  res.json({
    configured: Boolean(rzp.keyId && rzp.keySecret),
    keyId: rzp.keyId || null,
    mode,
  });
});

app.get('/api/razorpay/test', async (_req: Request, res: Response) => {
  try {
    const rzp = getRazorpayConfig();
    if (!rzp.keyId || !rzp.keySecret) {
      return res.status(400).json({
        success: false,
        mode: null,
        message: 'RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing in environment variables.',
      });
    }
    const mode = rzp.keyId.startsWith('rzp_live_') ? 'live' : 'test';
    const authHeader = 'Basic ' + Buffer.from(`${rzp.keyId}:${rzp.keySecret}`).toString('base64');
    const rzpResp = await fetch('https://api.razorpay.com/v1/orders?count=1', {
      method: 'GET',
      headers: { Authorization: authHeader },
    });
    const rzpData: any = await rzpResp.json().catch(() => ({}));
    if (!rzpResp.ok) {
      return res.status(rzpResp.status || 401).json({
        success: false,
        mode,
        message: rzpData?.error?.description || 'Razorpay authentication failed. Recheck Key ID and Secret.',
      });
    }
    return res.json({
      success: true,
      mode,
      message: `Razorpay ${mode.toUpperCase()} API authenticated cleanly (${rzp.keyId}).`,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      mode: null,
      message: err?.message || 'Unable to reach Razorpay API.',
    });
  }
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

    const sigBufExpected = Buffer.from(expectedSignature, 'utf8');
    const sigBufReceived = Buffer.from(String(razorpay_signature), 'utf8');
    const isValid =
      sigBufExpected.length === sigBufReceived.length &&
      crypto.timingSafeEqual(sigBufExpected, sigBufReceived);

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

const PIN_REGION_DIRECTORY: Record<string, { city: string; state: string; estimatedDays: string }> = {
  '11': { city: 'New Delhi', state: 'Delhi', estimatedDays: '2–3 business days' },
  '12': { city: 'Gurugram / NCR', state: 'Haryana', estimatedDays: '2–4 business days' },
  '13': { city: 'Karnal / Ambala', state: 'Haryana', estimatedDays: '3–4 business days' },
  '14': { city: 'Ludhiana / Amritsar', state: 'Punjab', estimatedDays: '3–5 business days' },
  '15': { city: 'Bathinda / Firozpur', state: 'Punjab', estimatedDays: '3–5 business days' },
  '16': { city: 'Chandigarh', state: 'Chandigarh / Punjab', estimatedDays: '3–4 business days' },
  '17': { city: 'Shimla / Solan', state: 'Himachal Pradesh', estimatedDays: '4–6 business days' },
  '18': { city: 'Jammu', state: 'Jammu & Kashmir', estimatedDays: '5–7 business days' },
  '19': { city: 'Srinagar', state: 'Jammu & Kashmir', estimatedDays: '5–7 business days' },
  '20': { city: 'Noida / Ghaziabad', state: 'Uttar Pradesh', estimatedDays: '2–4 business days' },
  '21': { city: 'Prayagraj / Kanpur', state: 'Uttar Pradesh', estimatedDays: '3–5 business days' },
  '22': { city: 'Lucknow', state: 'Uttar Pradesh', estimatedDays: '3–4 business days' },
  '23': { city: 'Varanasi', state: 'Uttar Pradesh', estimatedDays: '3–5 business days' },
  '24': { city: 'Bareilly / Dehradun', state: 'UP / Uttarakhand', estimatedDays: '3–5 business days' },
  '25': { city: 'Meerut / Muzaffarnagar', state: 'Uttar Pradesh', estimatedDays: '3–5 business days' },
  '26': { city: 'Nainital / Haldwani', state: 'Uttarakhand', estimatedDays: '4–6 business days' },
  '27': { city: 'Gorakhpur', state: 'Uttar Pradesh', estimatedDays: '3–5 business days' },
  '28': { city: 'Agra / Mathura', state: 'Uttar Pradesh', estimatedDays: '3–5 business days' },
  '30': { city: 'Jaipur', state: 'Rajasthan', estimatedDays: '3–4 business days' },
  '31': { city: 'Udaipur / Kota', state: 'Rajasthan', estimatedDays: '3–5 business days' },
  '32': { city: 'Kota / Bharatpur', state: 'Rajasthan', estimatedDays: '3–5 business days' },
  '33': { city: 'Bikaner / Sikar', state: 'Rajasthan', estimatedDays: '4–5 business days' },
  '34': { city: 'Jodhpur', state: 'Rajasthan', estimatedDays: '4–5 business days' },
  '36': { city: 'Rajkot', state: 'Gujarat', estimatedDays: '3–5 business days' },
  '37': { city: 'Bhuj / Kachchh', state: 'Gujarat', estimatedDays: '4–5 business days' },
  '38': { city: 'Ahmedabad / Gandhinagar', state: 'Gujarat', estimatedDays: '2–4 business days' },
  '39': { city: 'Surat / Vadodara', state: 'Gujarat', estimatedDays: '2–4 business days' },
  '40': { city: 'Mumbai / Thane', state: 'Maharashtra', estimatedDays: '2–3 business days' },
  '41': { city: 'Pune', state: 'Maharashtra', estimatedDays: '2–3 business days' },
  '42': { city: 'Nashik / Jalgaon', state: 'Maharashtra', estimatedDays: '3–4 business days' },
  '43': { city: 'Chhatrapati Sambhajinagar', state: 'Maharashtra', estimatedDays: '2–4 business days' },
  '44': { city: 'Nagpur', state: 'Maharashtra', estimatedDays: '2–3 business days' },
  '45': { city: 'Indore', state: 'Madhya Pradesh', estimatedDays: '3–4 business days' },
  '46': { city: 'Bhopal', state: 'Madhya Pradesh', estimatedDays: '3–4 business days' },
  '47': { city: 'Gwalior / Jabalpur', state: 'Madhya Pradesh', estimatedDays: '3–5 business days' },
  '48': { city: 'Jabalpur / Rewa', state: 'Madhya Pradesh', estimatedDays: '3–5 business days' },
  '49': { city: 'Raipur / Bhilai', state: 'Chhattisgarh', estimatedDays: '2–4 business days' },
  '50': { city: 'Hyderabad', state: 'Telangana', estimatedDays: '1–2 business days' },
  '51': { city: 'Tirupati / Kurnool', state: 'Andhra Pradesh', estimatedDays: '2–3 business days' },
  '52': { city: 'Vijayawada / Guntur', state: 'Andhra Pradesh', estimatedDays: '2–3 business days' },
  '53': { city: 'Visakhapatnam', state: 'Andhra Pradesh', estimatedDays: '2–3 business days' },
  '56': { city: 'Bengaluru', state: 'Karnataka', estimatedDays: '2–3 business days' },
  '57': { city: 'Mysuru / Mangaluru', state: 'Karnataka', estimatedDays: '2–4 business days' },
  '58': { city: 'Hubballi / Belagavi', state: 'Karnataka', estimatedDays: '2–4 business days' },
  '59': { city: 'Belagavi / Kalaburagi', state: 'Karnataka', estimatedDays: '2–4 business days' },
  '60': { city: 'Chennai', state: 'Tamil Nadu', estimatedDays: '2–3 business days' },
  '61': { city: 'Thanjavur / Tiruchirappalli', state: 'Tamil Nadu', estimatedDays: '3–4 business days' },
  '62': { city: 'Madurai / Tirunelveli', state: 'Tamil Nadu', estimatedDays: '3–4 business days' },
  '63': { city: 'Salem / Vellore', state: 'Tamil Nadu', estimatedDays: '2–4 business days' },
  '64': { city: 'Coimbatore', state: 'Tamil Nadu', estimatedDays: '2–4 business days' },
  '67': { city: 'Kozhikode / Kannur', state: 'Kerala', estimatedDays: '3–5 business days' },
  '68': { city: 'Kochi / Ernakulam', state: 'Kerala', estimatedDays: '3–4 business days' },
  '69': { city: 'Thiruvananthapuram', state: 'Kerala', estimatedDays: '3–5 business days' },
  '70': { city: 'Kolkata', state: 'West Bengal', estimatedDays: '2–3 business days' },
  '71': { city: 'Howrah / Durgapur', state: 'West Bengal', estimatedDays: '3–4 business days' },
  '72': { city: 'Kharagpur / Medinipur', state: 'West Bengal', estimatedDays: '3–5 business days' },
  '73': { city: 'Siliguri / Jalpaiguri', state: 'West Bengal / Sikkim', estimatedDays: '4–6 business days' },
  '74': { city: 'North 24 Parganas / Port Blair', state: 'West Bengal / A&N', estimatedDays: '4–6 business days' },
  '75': { city: 'Bhubaneswar / Cuttack', state: 'Odisha', estimatedDays: '2–4 business days' },
  '76': { city: 'Berhampur / Sambalpur', state: 'Odisha', estimatedDays: '3–5 business days' },
  '77': { city: 'Rourkela / Balangir', state: 'Odisha', estimatedDays: '3–5 business days' },
  '78': { city: 'Guwahati', state: 'Assam', estimatedDays: '4–6 business days' },
  '79': { city: 'Shillong / Imphal / Agartala', state: 'North-East India', estimatedDays: '5–7 business days' },
  '80': { city: 'Patna', state: 'Bihar', estimatedDays: '3–5 business days' },
  '81': { city: 'Bhagalpur / Dumka', state: 'Bihar / Jharkhand', estimatedDays: '4–5 business days' },
  '82': { city: 'Dhanbad / Gaya', state: 'Jharkhand / Bihar', estimatedDays: '3–5 business days' },
  '83': { city: 'Ranchi / Jamshedpur', state: 'Jharkhand', estimatedDays: '3–5 business days' },
  '84': { city: 'Muzaffarpur / Darbhanga', state: 'Bihar', estimatedDays: '4–5 business days' },
  '85': { city: 'Purnia / Saharsa', state: 'Bihar', estimatedDays: '4–6 business days' },
};

function estimateEtaByPinAndState(pin: string, stateName?: string): string {
  const prefix2 = pin.slice(0, 2);
  if (prefix2 === '50') return '1–2 business days';
  if (['51', '52', '53', '56', '60', '40', '41', '44', '70', '11'].includes(prefix2)) {
    return '2–3 business days';
  }
  if (['18', '19', '79'].includes(prefix2) || pin.startsWith('744') || pin.startsWith('682')) {
    return '5–7 business days';
  }
  const s = (stateName || '').toLowerCase();
  if (s.includes('telangana')) return '1–2 business days';
  if (s.includes('jammu') || s.includes('ladakh') || s.includes('manipur') || s.includes('mizoram') || s.includes('nagaland') || s.includes('arunachal') || s.includes('andaman') || s.includes('sikkim')) {
    return '5–7 business days';
  }
  return PIN_REGION_DIRECTORY[prefix2]?.estimatedDays || '3–5 business days';
}

app.get('/api/delhivery/pincode', async (req: Request, res: Response) => {
  try {
    const pin = String(req.query.pin || '').replace(/[^0-9]/g, '').slice(0, 6);
    if (pin.length !== 6) {
      return res.status(400).json({ success: false, serviceable: false, pincode: pin, message: 'Enter a valid 6-digit pincode.' });
    }

    // Army Postal Service (9xxxxx) and 0xxxxx are not civilian Delhivery courier pins
    if (pin.startsWith('0') || pin.startsWith('9')) {
      return res.json({
        success: true,
        configured: Boolean(getDelhiveryConfig().token),
        serviceable: false,
        pincode: pin,
        prepaid: false,
        cod: false,
        courier: 'Delhivery Express',
        dispatchHub: 'Hyderabad Facility (502032)',
        message: pin.startsWith('9')
          ? `Army Post Office (APO/FPO) pincode ${pin} is not serviceable via Delhivery courier.`
          : `Pincode ${pin} is not a valid Indian delivery pincode.`,
      });
    }

    const cfg = getDelhiveryConfig();
    if (!cfg.token) {
      // Verify real Indian pincode against India Post directory first (fast 2.5s timeout)
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2500);
        const postalResp = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        clearTimeout(timer);

        if (postalResp.ok) {
          const postalData: any = await postalResp.json();
          const firstEntry = Array.isArray(postalData) ? postalData[0] : null;

          if (firstEntry?.Status === 'Error' || !firstEntry?.PostOffice?.length) {
            return res.json({
              success: true,
              configured: false,
              serviceable: false,
              pincode: pin,
              prepaid: false,
              cod: false,
              courier: 'Delhivery Express',
              dispatchHub: 'Hyderabad Facility (502032)',
              source: 'india_post_verified',
              message: `Pincode ${pin} was not found. Delhivery delivery is not available for this pincode.`,
            });
          }

          const po = firstEntry.PostOffice[0];
          const city = po.District || po.Block || po.Division || '';
          const state = po.State || '';
          const areaName = po.Name || '';
          const eta = estimateEtaByPinAndState(pin, state);

          return res.json({
            success: true,
            configured: false,
            serviceable: true,
            pincode: pin,
            city,
            state,
            areaName,
            prepaid: true,
            cod: false,
            estimatedDays: eta,
            courier: 'Delhivery Express',
            dispatchHub: 'Hyderabad Facility (502032)',
            source: 'india_post_verified',
            message: `Delhivery Express delivers to ${areaName ? `${areaName}, ` : ''}${city}${state ? `, ${state}` : ''} (${pin}).`,
          });
        }
      } catch {
        // External lookup timed out; fall back cleanly to regional PIN prefix directory
      }

      const prefix2 = pin.slice(0, 2);
      const region = PIN_REGION_DIRECTORY[prefix2];
      if (!region) {
        return res.json({
          success: true,
          configured: false,
          serviceable: false,
          pincode: pin,
          prepaid: false,
          cod: false,
          courier: 'Delhivery Express',
          dispatchHub: 'Hyderabad Facility (502032)',
          source: 'pin_directory',
          message: `Pincode ${pin} is not in an active Indian postal zone for Delhivery delivery.`,
        });
      }

      return res.json({
        success: true,
        configured: false,
        serviceable: true,
        pincode: pin,
        city: region.city,
        state: region.state,
        prepaid: true,
        cod: false,
        estimatedDays: region.estimatedDays,
        courier: 'Delhivery Express',
        dispatchHub: 'Hyderabad Facility (502032)',
        source: 'pin_directory',
        message: `Delhivery Prepaid Express serviceable in ${region.city}, ${region.state} (${pin}).`,
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
        courier: 'Delhivery Express',
        dispatchHub: 'Hyderabad Facility (502032)',
        source: 'delhivery_live',
        message: `Pincode ${pin} is currently non-serviceable on Delhivery Express.`,
      });
    }

    const prepaidOk = String(record.pre_paid || '').toUpperCase() === 'Y';
    const isEmbargo = String(record.remarks || '').toLowerCase().includes('embargo');
    const serviceable = prepaidOk && !isEmbargo;
    const city = record.city || record.district || PIN_REGION_DIRECTORY[pin.slice(0, 2)]?.city || '';
    const state = record.state_code || PIN_REGION_DIRECTORY[pin.slice(0, 2)]?.state || '';
    const eta = estimateEtaByPinAndState(pin, state);

    return res.json({
      success: true,
      configured: true,
      serviceable,
      pincode: pin,
      city,
      state,
      prepaid: prepaidOk,
      cod: false, // Store policy: Prepaid & 50% Partial Advance only (no COD)
      estimatedDays: eta,
      courier: 'Delhivery Express',
      dispatchHub: 'Hyderabad Facility (502032)',
      source: 'delhivery_live',
      message: serviceable
        ? `Delhivery Prepaid Express serviceable (${city || pin})`
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
// 3D. AISENSY WHATSAPP BUSINESS API ROUTES (ORDER CONFIRM/CANCEL & 5% DROP RECOVERY)
// ==============================================================================

const AISENSY_API_ENDPOINT = 'https://backend.aisensy.com/campaign/t1/api/v2';
const AISENSY_LEDGER_PATH = path.join(os.tmpdir(), 'teqqno-aisensy-state.json');

interface WhatsAppOrderRecord {
  orderId: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  total: number;
  whatsappActionStatus: 'pending' | 'confirmed' | 'cancelled';
  confirmUrl: string;
  cancelUrl: string;
  createdAt: string;
  updatedAt: string;
  actionSource?: string;
}

interface WhatsAppDispatchLog {
  id: string;
  type: 'order_confirmation' | 'checkout_drop_5off' | 'order_action' | 'test';
  phone: string;
  customerName: string;
  campaignName: string;
  status: 'sent' | 'simulated' | 'failed' | 'action_recorded';
  orderNumber?: string;
  couponCode?: string;
  triggerReason?: string;
  actionResult?: string;
  messagePreview: string;
  createdAt: string;
}

interface AiSensyLedgerState {
  orders: Record<string, WhatsAppOrderRecord>;
  recoverySentSessions: Record<string, { sentAt: number; couponCode: string; expiresAt: number }>;
  logs: WhatsAppDispatchLog[];
}

function loadAiSensyLedger(): AiSensyLedgerState {
  try {
    if (fs.existsSync(AISENSY_LEDGER_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(AISENSY_LEDGER_PATH, 'utf8'));
      return {
        orders: parsed.orders || {},
        recoverySentSessions: parsed.recoverySentSessions || {},
        logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      };
    }
  } catch {
    // ignore corrupt cache
  }
  return { orders: {}, recoverySentSessions: {}, logs: [] };
}

function saveAiSensyLedger(state: AiSensyLedgerState) {
  try {
    state.logs = state.logs.slice(0, 100);
    fs.writeFileSync(AISENSY_LEDGER_PATH, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.warn('[AiSensy Ledger Write Warning]:', err);
  }
}

const getAiSensyConfig = () => ({
  apiKey: (process.env.AISENSY_API_KEY || '').trim(),
  orderConfirmCampaign: (process.env.AISENSY_ORDER_CONFIRM_CAMPAIGN || 'order_confirmation_action').trim(),
  checkoutDropCampaign: (process.env.AISENSY_CHECKOUT_DROP_CAMPAIGN || 'checkout_drop_5_off').trim(),
  webhookSecret: (process.env.AISENSY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || 'teqqno_aisensy_secret_2026').trim(),
  appBaseUrl: (process.env.APP_BASE_URL || '').trim().replace(/\/$/, ''),
});

function normalizeWhatsAppPhone(rawPhone?: string | null): string {
  const digits = String(rawPhone || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `91${digits.slice(1)}`;
  if (digits.startsWith('91') && digits.length === 12) return digits;
  return digits;
}

function createOrderActionToken(orderId: string, action: 'confirm' | 'cancel'): string {
  const secret = getAiSensyConfig().webhookSecret;
  return crypto
    .createHmac('sha256', secret)
    .update(`${orderId}:${action}`)
    .digest('hex')
    .slice(0, 24);
}

function verifyOrderActionToken(orderId: string, action: 'confirm' | 'cancel', token?: string): boolean {
  if (!token) return false;
  const expected = createOrderActionToken(orderId, action);
  const bufA = Buffer.from(expected, 'utf8');
  const bufB = Buffer.from(String(token), 'utf8');
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

function resolveAppOrigin(req: Request, bodyOrigin?: string): string {
  const cfgOrigin = getAiSensyConfig().appBaseUrl;
  if (cfgOrigin) return cfgOrigin;
  if (bodyOrigin && (bodyOrigin.startsWith('http://') || bodyOrigin.startsWith('https://'))) {
    return bodyOrigin.replace(/\/$/, '');
  }
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.get('host') || 'teqqnoworld.com';
  return `${proto}://${host}`;
}

async function dispatchAiSensyCampaign(payload: {
  campaignName: string;
  destination: string;
  userName: string;
  templateParams: string[];
  source: string;
  buttons?: any[];
}): Promise<{ ok: boolean; simulated: boolean; status?: number; raw?: any; errorMessage?: string }> {
  const cfg = getAiSensyConfig();
  if (!cfg.apiKey) {
    return {
      ok: true,
      simulated: true,
      errorMessage: 'AISENSY_API_KEY not configured on server (running in simulation mode).',
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(AISENSY_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        apiKey: cfg.apiKey,
        campaignName: payload.campaignName,
        destination: payload.destination,
        userName: payload.userName || 'Valued Customer',
        templateParams: payload.templateParams,
        source: payload.source,
        ...(payload.buttons && payload.buttons.length > 0 ? { buttons: payload.buttons } : {}),
      }),
    });
    clearTimeout(timer);

    const data: any = await resp.json().catch(() => ({}));
    if (!resp.ok || data?.success === false || data?.status === 'error') {
      return {
        ok: false,
        simulated: false,
        status: resp.status,
        raw: data,
        errorMessage: data?.message || data?.error || `AiSensy API returned status ${resp.status}`,
      };
    }

    return {
      ok: true,
      simulated: false,
      status: resp.status,
      raw: data,
    };
  } catch (err: any) {
    return {
      ok: false,
      simulated: false,
      errorMessage: err?.message || 'Unable to reach AiSensy API endpoint.',
    };
  }
}

app.get('/api/aisensy/status', (_req: Request, res: Response) => {
  const cfg = getAiSensyConfig();
  const ledger = loadAiSensyLedger();
  res.json({
    configured: Boolean(cfg.apiKey),
    endpoint: AISENSY_API_ENDPOINT,
    orderConfirmCampaign: cfg.orderConfirmCampaign,
    checkoutDropCampaign: cfg.checkoutDropCampaign,
    webhookPath: '/api/aisensy/webhook',
    recentLogsCount: ledger.logs.length,
    trackedOrdersCount: Object.keys(ledger.orders).length,
  });
});

app.get('/api/aisensy/logs', (_req: Request, res: Response) => {
  const ledger = loadAiSensyLedger();
  res.json({
    success: true,
    logs: ledger.logs.slice(0, 50),
    orders: Object.values(ledger.orders).slice(0, 50),
  });
});

app.get('/api/aisensy/order-status', (req: Request, res: Response) => {
  const orderId = String(req.query.orderId || '').trim();
  const orderNumber = String(req.query.orderNumber || '').trim();
  const ledger = loadAiSensyLedger();
  const record =
    (orderId && ledger.orders[orderId]) ||
    Object.values(ledger.orders).find((o) => o.orderNumber === orderNumber) ||
    null;

  if (!record) {
    return res.json({
      found: false,
      whatsappActionStatus: 'pending',
    });
  }

  return res.json({
    found: true,
    ...record,
  });
});

app.post('/api/aisensy/send-order-confirmation', async (req: Request, res: Response) => {
  try {
    const {
      orderId,
      orderNumber,
      customerName,
      phone,
      total,
      amountPaid,
      balanceDue,
      paymentMode,
      itemsSummary,
      shippingCity,
      originUrl,
    } = req.body || {};

    const normalizedPhone = normalizeWhatsAppPhone(phone);
    if (!orderId || !normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and valid customer WhatsApp number are required.',
      });
    }

    const cfg = getAiSensyConfig();
    const displayOrderNum = String(orderNumber || orderId);
    const firstName = String(customerName || 'Customer').trim().split(' ')[0] || 'Customer';
    const baseOrigin = resolveAppOrigin(req, originUrl);

    const confirmToken = createOrderActionToken(String(orderId), 'confirm');
    const cancelToken = createOrderActionToken(String(orderId), 'cancel');
    const confirmUrl = `${baseOrigin}/#order-action?action=confirm&orderId=${encodeURIComponent(String(orderId))}&orderNumber=${encodeURIComponent(displayOrderNum)}&token=${confirmToken}`;
    const cancelUrl = `${baseOrigin}/#order-action?action=cancel&orderId=${encodeURIComponent(String(orderId))}&orderNumber=${encodeURIComponent(displayOrderNum)}&token=${cancelToken}`;

    const formattedTotal = `₹${Math.round(Number(total) || 0).toLocaleString('en-IN')}`;
    const formattedPaid = `₹${Math.round(Number(amountPaid) || Number(total) || 0).toLocaleString('en-IN')}`;
    const itemLine = String(itemsSummary || 'Custom Branded Corporate Merchandise').slice(0, 120);

    const previewMessage = [
      `Namaste ${firstName}! 🙏 Aapka TeqqnoWorld Order #${displayOrderNum} place ho gaya hai!`,
      `📦 Items: ${itemLine}`,
      `💰 Order Total: ${formattedTotal} (Paid: ${formattedPaid}${Number(balanceDue) > 0 ? ` · Balance: ₹${Math.round(Number(balanceDue)).toLocaleString('en-IN')}` : ''})`,
      shippingCity ? `📍 Delivery City: ${shippingCity}` : '',
      ``,
      `Kripya apna order status choose karein:`,
      `✅ Confirm Order: ${confirmUrl}`,
      `❌ Cancel Order: ${cancelUrl}`,
    ]
      .filter(Boolean)
      .join('\n');

    const aisensyResp = await dispatchAiSensyCampaign({
      campaignName: cfg.orderConfirmCampaign,
      destination: normalizedPhone,
      userName: String(customerName || firstName),
      templateParams: [
        firstName,
        displayOrderNum,
        itemLine,
        formattedTotal,
        String(paymentMode || 'Prepaid'),
        confirmUrl,
        cancelUrl,
      ],
      source: 'teqqnoworld-order-confirm',
    });

    const nowIso = new Date().toISOString();
    const ledger = loadAiSensyLedger();
    ledger.orders[String(orderId)] = {
      orderId: String(orderId),
      orderNumber: displayOrderNum,
      customerName: String(customerName || 'Customer'),
      phone: normalizedPhone,
      total: Number(total) || 0,
      whatsappActionStatus: 'pending',
      confirmUrl,
      cancelUrl,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    ledger.logs.unshift({
      id: `wa_ord_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'order_confirmation',
      phone: normalizedPhone,
      customerName: String(customerName || firstName),
      campaignName: cfg.orderConfirmCampaign,
      status: aisensyResp.simulated ? 'simulated' : aisensyResp.ok ? 'sent' : 'failed',
      orderNumber: displayOrderNum,
      messagePreview: previewMessage,
      createdAt: nowIso,
    });
    saveAiSensyLedger(ledger);

    return res.json({
      success: aisensyResp.ok || aisensyResp.simulated,
      simulated: aisensyResp.simulated,
      phone: normalizedPhone,
      campaignName: cfg.orderConfirmCampaign,
      confirmUrl,
      cancelUrl,
      previewMessage,
      whatsappActionStatus: 'pending',
      message: aisensyResp.simulated
        ? 'WhatsApp order notification prepared in Simulation Mode (add AISENSY_API_KEY in .env to send live).'
        : aisensyResp.ok
        ? `Order notification with Confirm/Cancel options sent to +${normalizedPhone} via AiSensy.`
        : aisensyResp.errorMessage || 'AiSensy dispatch failed.',
    });
  } catch (err: any) {
    console.error('[AiSensy Order Confirmation Error]:', err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Failed to dispatch AiSensy order notification.',
    });
  }
});

app.post('/api/aisensy/send-checkout-recovery', async (req: Request, res: Response) => {
  try {
    const {
      checkoutSessionId,
      customerName,
      phone,
      cartTotal,
      couponCode = 'SAVE5NOW',
      discountPercent = 5,
      validMinutes = 15,
      triggerReason = 'checkout_drop',
      itemsSummary,
      originUrl,
    } = req.body || {};

    const normalizedPhone = normalizeWhatsAppPhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: 'Valid 10-digit WhatsApp phone number is required.',
      });
    }

    const sessionKey = `${checkoutSessionId || normalizedPhone}_${normalizedPhone}`;
    const ledger = loadAiSensyLedger();
    const existingSent = ledger.recoverySentSessions[sessionKey];
    const nowMs = Date.now();
    if (existingSent && nowMs - existingSent.sentAt < 15 * 60 * 1000) {
      return res.json({
        success: true,
        deduplicated: true,
        simulated: !getAiSensyConfig().apiKey,
        phone: normalizedPhone,
        couponCode: existingSent.couponCode,
        expiresAt: new Date(existingSent.expiresAt).toISOString(),
        message: '5% OFF limited-time WhatsApp offer already sent for this checkout session.',
      });
    }

    const cfg = getAiSensyConfig();
    const firstName = String(customerName || 'Customer').trim().split(' ')[0] || 'Customer';
    const baseOrigin = resolveAppOrigin(req, originUrl);
    const resumeUrl = `${baseOrigin}/#checkout?coupon=${encodeURIComponent(String(couponCode))}&recovery=${encodeURIComponent(String(checkoutSessionId || ''))}`;
    const numericTotal = Math.round(Number(cartTotal) || 0);
    const estSavings = Math.max(1, Math.round(numericTotal * (Number(discountPercent) / 100)));
    const expiresAtMs = nowMs + Number(validMinutes) * 60 * 1000;
    const itemLine = String(itemsSummary || 'Your Custom TeqqnoWorld Merchandise').slice(0, 100);

    const previewMessage = [
      `Hi ${firstName}! 👋 Dekha aap TeqqnoWorld Checkout par order complete karte-karte ruk gaye.`,
      `Koi problem aa rahi hai ya price thoda zyada laga?`,
      `🎁 Special Limited-Time Offer (${validMinutes} Mins Valid): Extra *${discountPercent}% OFF*!`,
      `🏷️ Coupon Code: *${couponCode}* (Extra ₹${estSavings.toLocaleString('en-IN')} bachat on ₹${numericTotal.toLocaleString('en-IN')})`,
      `🛒 Complete Order Now: ${resumeUrl}`,
    ].join('\n');

    const aisensyResp = await dispatchAiSensyCampaign({
      campaignName: cfg.checkoutDropCampaign,
      destination: normalizedPhone,
      userName: String(customerName || firstName),
      templateParams: [
        firstName,
        itemLine,
        `₹${numericTotal.toLocaleString('en-IN')}`,
        `${discountPercent}% OFF`,
        String(couponCode),
        `${validMinutes} mins`,
        resumeUrl,
      ],
      source: `teqqnoworld-${triggerReason}`,
    });

    const nowIso = new Date().toISOString();
    ledger.recoverySentSessions[sessionKey] = {
      sentAt: nowMs,
      couponCode: String(couponCode),
      expiresAt: expiresAtMs,
    };

    ledger.logs.unshift({
      id: `wa_drop_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'checkout_drop_5off',
      phone: normalizedPhone,
      customerName: String(customerName || firstName),
      campaignName: cfg.checkoutDropCampaign,
      status: aisensyResp.simulated ? 'simulated' : aisensyResp.ok ? 'sent' : 'failed',
      couponCode: String(couponCode),
      triggerReason: String(triggerReason),
      messagePreview: previewMessage,
      createdAt: nowIso,
    });
    saveAiSensyLedger(ledger);

    return res.json({
      success: aisensyResp.ok || aisensyResp.simulated,
      simulated: aisensyResp.simulated,
      phone: normalizedPhone,
      campaignName: cfg.checkoutDropCampaign,
      couponCode: String(couponCode),
      discountPercent: Number(discountPercent),
      expiresAt: new Date(expiresAtMs).toISOString(),
      resumeUrl,
      previewMessage,
      message: aisensyResp.simulated
        ? `5% OFF limited-time WhatsApp message (${couponCode}) prepared in Simulation Mode.`
        : aisensyResp.ok
        ? `Limited-time 5% OFF coupon (${couponCode}) sent on WhatsApp (+${normalizedPhone}) via AiSensy!`
        : aisensyResp.errorMessage || 'AiSensy recovery dispatch failed.',
    });
  } catch (err: any) {
    console.error('[AiSensy Checkout Recovery Error]:', err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Failed to send 5% OFF WhatsApp recovery notification.',
    });
  }
});

async function notifyAdminOrderActionEmail(record: WhatsAppOrderRecord, action: 'confirmed' | 'cancelled', source: string) {
  try {
    const cfg = getSmtpConfig();
    const transporter = getSmtpTransporter();
    if (!transporter) return;
    await transporter.sendMail({
      from: `"TeqqnoWorld WhatsApp Alerts" <${cfg.smtpUser}>`,
      to: cfg.adminEmailList.join(', '),
      subject: `[WhatsApp ${action === 'confirmed' ? 'CONFIRMED' : 'CANCELLED'}] Order #${record.orderNumber} - ${record.customerName}`,
      html: `<div style="font-family:sans-serif;padding:20px;background:#16171B;color:#fff;border-radius:12px;border:1px solid ${action === 'confirmed' ? '#1EBE5D' : '#EF4444'};">
        <h2 style="color:${action === 'confirmed' ? '#1EBE5D' : '#EF4444'};margin-top:0;">Customer ${action.toUpperCase()} Order via WhatsApp</h2>
        <p><strong>Order:</strong> #${escapeHtml(record.orderNumber)}<br/>
        <strong>Customer:</strong> ${escapeHtml(record.customerName)} (+${escapeHtml(record.phone)})<br/>
        <strong>Order Value:</strong> ₹${Number(record.total || 0).toLocaleString('en-IN')}<br/>
        <strong>Source:</strong> ${escapeHtml(source)}</p>
      </div>`,
    });
  } catch (err) {
    console.warn('[WhatsApp Order Action Admin Email Warning]:', err);
  }
}

app.post('/api/aisensy/order-action', async (req: Request, res: Response) => {
  try {
    const { orderId, orderNumber, action, token, source = 'whatsapp_link' } = req.body || {};
    const cleanAction = action === 'cancel' || action === 'cancelled' ? 'cancel' : action === 'confirm' || action === 'confirmed' ? 'confirm' : null;
    if (!cleanAction || (!orderId && !orderNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Valid action (confirm/cancel) and orderId or orderNumber are required.',
      });
    }

    const ledger = loadAiSensyLedger();
    let record =
      (orderId && ledger.orders[String(orderId)]) ||
      Object.values(ledger.orders).find((o) => o.orderNumber === String(orderNumber)) ||
      null;

    // Validate token when token is supplied for an existing orderId
    if (token && record && !verifyOrderActionToken(record.orderId, cleanAction, String(token))) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired WhatsApp order action token.',
      });
    }

    const targetStatus: 'confirmed' | 'cancelled' = cleanAction === 'confirm' ? 'confirmed' : 'cancelled';
    const nowIso = new Date().toISOString();

    if (!record) {
      const resolvedId = String(orderId || orderNumber);
      record = {
        orderId: resolvedId,
        orderNumber: String(orderNumber || resolvedId),
        customerName: 'Customer',
        phone: '',
        total: 0,
        whatsappActionStatus: targetStatus,
        confirmUrl: '',
        cancelUrl: '',
        createdAt: nowIso,
        updatedAt: nowIso,
        actionSource: String(source),
      };
      ledger.orders[resolvedId] = record;
    } else {
      record.whatsappActionStatus = targetStatus;
      record.updatedAt = nowIso;
      record.actionSource = String(source);
    }

    ledger.logs.unshift({
      id: `wa_act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'order_action',
      phone: record.phone || 'Storefront',
      customerName: record.customerName,
      campaignName: 'whatsapp_order_response',
      status: 'action_recorded',
      orderNumber: record.orderNumber,
      actionResult: targetStatus.toUpperCase(),
      messagePreview: `Customer ${targetStatus === 'confirmed' ? 'CONFIRMED ✅' : 'CANCELLED ❌'} Order #${record.orderNumber} via ${source}.`,
      createdAt: nowIso,
    });
    saveAiSensyLedger(ledger);

    void notifyAdminOrderActionEmail(record, targetStatus, String(source));

    return res.json({
      success: true,
      orderId: record.orderId,
      orderNumber: record.orderNumber,
      whatsappActionStatus: targetStatus,
      updatedAt: nowIso,
      message:
        targetStatus === 'confirmed'
          ? `Order #${record.orderNumber} confirmed! Production & proof verification queued.`
          : `Order #${record.orderNumber} has been marked cancelled per your WhatsApp request.`,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err?.message || 'Unable to process WhatsApp order action.',
    });
  }
});

// AiSensy Incoming Webhook for Quick Reply Buttons ("Confirm Order" / "Cancel Order")
app.post('/api/aisensy/webhook', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const rawSender =
      body.phone_number ||
      body.destination ||
      body.sender ||
      body.from ||
      body?.data?.customer?.phone_number ||
      body?.contact?.phone_number ||
      '';
    const normalizedPhone = normalizeWhatsAppPhone(rawSender);

    const buttonPayload = String(
      body.payload ||
        body.button_payload ||
        body?.button?.payload ||
        body?.data?.message?.button_reply?.id ||
        body?.message?.button?.payload ||
        ''
    ).trim();

    const textMessage = String(
      body.message_content ||
        body.text ||
        body.button_text ||
        body?.button?.text ||
        body?.data?.message?.text?.body ||
        body?.data?.message?.button_reply?.title ||
        ''
    )
      .trim()
      .toLowerCase();

    let detectedAction: 'confirmed' | 'cancelled' | null = null;
    let payloadOrderId = '';

    if (buttonPayload.toUpperCase().startsWith('CONFIRM_ORDER:')) {
      detectedAction = 'confirmed';
      payloadOrderId = buttonPayload.split(':')[1] || '';
    } else if (buttonPayload.toUpperCase().startsWith('CANCEL_ORDER:')) {
      detectedAction = 'cancelled';
      payloadOrderId = buttonPayload.split(':')[1] || '';
    } else if (
      textMessage.includes('confirm') ||
      textMessage === 'yes' ||
      textMessage === '1' ||
      textMessage.includes('ha')
    ) {
      detectedAction = 'confirmed';
    } else if (
      textMessage.includes('cancel') ||
      textMessage === 'no' ||
      textMessage === '2' ||
      textMessage.includes('nahi')
    ) {
      detectedAction = 'cancelled';
    }

    if (!detectedAction) {
      return res.json({
        success: true,
        ignored: true,
        message: 'Webhook received (no confirm/cancel order intent matched).',
      });
    }

    const ledger = loadAiSensyLedger();
    let matchedOrder: WhatsAppOrderRecord | undefined =
      (payloadOrderId && ledger.orders[payloadOrderId]) || undefined;

    if (!matchedOrder && normalizedPhone) {
      const candidates = Object.values(ledger.orders)
        .filter((o) => o.phone === normalizedPhone)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      matchedOrder = candidates[0];
    }

    const nowIso = new Date().toISOString();
    if (matchedOrder) {
      matchedOrder.whatsappActionStatus = detectedAction;
      matchedOrder.updatedAt = nowIso;
      matchedOrder.actionSource = 'aisensy_webhook';
      ledger.logs.unshift({
        id: `wa_wh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'order_action',
        phone: matchedOrder.phone || normalizedPhone,
        customerName: matchedOrder.customerName,
        campaignName: 'aisensy_webhook',
        status: 'action_recorded',
        orderNumber: matchedOrder.orderNumber,
        actionResult: detectedAction.toUpperCase(),
        messagePreview: `AiSensy Webhook: Customer replied "${textMessage || buttonPayload}" -> Order #${matchedOrder.orderNumber} ${detectedAction.toUpperCase()}.`,
        createdAt: nowIso,
      });
      saveAiSensyLedger(ledger);
      void notifyAdminOrderActionEmail(matchedOrder, detectedAction, 'aisensy_webhook');
    }

    return res.json({
      success: true,
      matchedOrderId: matchedOrder?.orderId || null,
      orderNumber: matchedOrder?.orderNumber || null,
      whatsappActionStatus: detectedAction,
    });
  } catch (err: any) {
    console.error('[AiSensy Webhook Error]:', err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Webhook processing error.',
    });
  }
});

app.post('/api/aisensy/test', async (req: Request, res: Response) => {
  try {
    const cfg = getAiSensyConfig();
    const cleanPhone = normalizeWhatsAppPhone(req.body?.phone);
    if (!cleanPhone) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid 10-digit WhatsApp number to send a test message.',
      });
    }

    const testType = req.body?.testType === 'checkout_drop_5off' ? 'checkout_drop_5off' : 'order_confirmation';
    const campaignName = String(
      req.body?.campaignName ||
        (testType === 'checkout_drop_5off' ? cfg.checkoutDropCampaign : cfg.orderConfirmCampaign)
    );
    const baseOrigin = resolveAppOrigin(req, req.body?.originUrl);

    const isDropTest = testType === 'checkout_drop_5off';
    const previewMessage = isDropTest
      ? `TeqqnoWorld 5% OFF Test: Hi Test Customer! Special 5% OFF (Code: SAVE5NOW, 15 mins valid) -> ${baseOrigin}/#checkout?coupon=SAVE5NOW`
      : `TeqqnoWorld AiSensy Test: Order #TQ-TEST99 confirmed! Confirm: ${baseOrigin}/#order-action?action=confirm&orderId=TQ-TEST99 | Cancel: ${baseOrigin}/#order-action?action=cancel&orderId=TQ-TEST99`;

    const templateParams = isDropTest
      ? [
          'Test Customer',
          '230 GSM Custom Corporate Polo (10 pcs)',
          '₹5,400',
          '5% OFF',
          'SAVE5NOW',
          '15 mins',
          `${baseOrigin}/#checkout?coupon=SAVE5NOW`,
        ]
      : [
          'Test Customer',
          'TQ-TEST99',
          '230 GSM Custom Corporate Polo (10 pcs)',
          '₹5,400',
          'Full Prepaid',
          `${baseOrigin}/#order-action?action=confirm&orderId=TQ-TEST99`,
          `${baseOrigin}/#order-action?action=cancel&orderId=TQ-TEST99`,
        ];

    const resp = await dispatchAiSensyCampaign({
      campaignName,
      destination: cleanPhone,
      userName: 'TeqqnoWorld Test',
      templateParams,
      source: isDropTest ? 'teqqnoworld-admin-drop-test' : 'teqqnoworld-admin-test',
    });

    const ledger = loadAiSensyLedger();
    ledger.logs.unshift({
      id: `wa_test_${Date.now()}`,
      type: isDropTest ? 'checkout_drop_5off' : 'test',
      phone: cleanPhone,
      customerName: 'Admin Test',
      campaignName,
      couponCode: isDropTest ? 'SAVE5NOW' : undefined,
      status: resp.simulated ? 'simulated' : resp.ok ? 'sent' : 'failed',
      messagePreview: previewMessage,
      createdAt: new Date().toISOString(),
    });
    saveAiSensyLedger(ledger);

    return res.json({
      success: resp.ok || resp.simulated,
      simulated: resp.simulated,
      phone: cleanPhone,
      message: resp.simulated
        ? `Simulation Ready for +${cleanPhone} (Campaign: ${campaignName}). Set AISENSY_API_KEY in .env to fire live WhatsApp messages.`
        : resp.ok
        ? `Live AiSensy WhatsApp test dispatched to +${cleanPhone} (Campaign: ${campaignName})!`
        : resp.errorMessage || 'AiSensy test call failed.',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err?.message || 'AiSensy test request failed.',
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
    // Initialize Vite dev middleware without blocking port 3000 from binding immediately on cold boot
    let viteMiddlewarePromise: Promise<any> | null = null;
    const getViteMiddleware = () => {
      if (!viteMiddlewarePromise) {
        viteMiddlewarePromise = import('vite').then(async ({ createServer: createViteServer }) => {
          const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
          });
          console.log('[TeqqnoWorld] Vite dev middleware ready');
          return vite.middlewares;
        });
      }
      return viteMiddlewarePromise;
    };

    void getViteMiddleware().catch((err) => {
      console.error('[TeqqnoWorld] Vite dev middleware initialization error:', err);
    });

    app.use(async (req, res, next) => {
      try {
        const middlewares = await getViteMiddleware();
        return middlewares(req, res, next);
      } catch (err) {
        return next(err);
      }
    });
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
