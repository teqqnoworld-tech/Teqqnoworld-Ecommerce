import { 
  supabase, 
  isSupabaseConfigured, 
  ProductRow, 
  CustomOrderRow, 
  OrderStatus 
} from '../lib/supabase';
import { PRODUCTS } from '../data/mockData';
import { compressImageFile, compressDataUrl } from '../utils/imageCompressor';

// Storage bucket name constant
export const STORAGE_BUCKET_NAME = 'brand-logos';

export interface QuoteRequestInput {
  customerName: string;
  customerEmail: string;
  company?: string;
  phone: string;
  productId: string;
  quantity: number;
  customNotes?: string;
  logoFile?: File | null;
  existingLogoUrl?: string | null;
}

export interface QuoteSubmissionResult {
  success: boolean;
  orderId?: string;
  logoUrl?: string | null;
  data?: CustomOrderRow;
  message?: string;
  isMockFallback?: boolean;
}

/**
 * 1. Fetch all products from Supabase `products` table.
 * Falls back gracefully to curated local mock catalog if Supabase is unconfigured or empty.
 */
export async function fetchProductsFromSupabase(): Promise<{
  data: ProductRow[];
  isFallback: boolean;
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    // Return formatted mock data mapped to ProductRow
    const mapped: ProductRow[] = PRODUCTS.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      base_price: p.basePrice,
      moq: p.moq,
      image_url: p.colors[0]?.imageFront || '/assets/products/prod_tipping_polo.webp',
      available_colors: p.colors.map((c) => ({ name: c.name, hex: c.hex, garmentHex: c.garmentHex })),
      available_sizes: p.sizes || ['S', 'M', 'L', 'XL', '2XL'],
      description: p.description,
      created_at: new Date().toISOString(),
    }));
    return { data: mapped, isFallback: true };
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] Error fetching products:', error.message);
      return {
        data: PRODUCTS.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          base_price: p.basePrice,
          moq: p.moq,
          image_url: p.colors[0]?.imageFront || '/assets/products/prod_tipping_polo.webp',
          available_colors: p.colors.map((c) => ({ name: c.name, hex: c.hex })),
          available_sizes: p.sizes || ['S', 'M', 'L', 'XL'],
          description: p.description,
          created_at: new Date().toISOString(),
        })),
        isFallback: true,
        error: error.message,
      };
    }

    if (!data || data.length === 0) {
      // Products table is created but currently empty -> Return fallbacks
      return {
        data: PRODUCTS.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          base_price: p.basePrice,
          moq: p.moq,
          image_url: p.colors[0]?.imageFront || '/assets/products/prod_tipping_polo.webp',
          available_colors: p.colors.map((c) => ({ name: c.name, hex: c.hex })),
          available_sizes: p.sizes || ['S', 'M', 'L', 'XL'],
          description: p.description,
          created_at: new Date().toISOString(),
        })),
        isFallback: true,
      };
    }

    return { data, isFallback: false };
  } catch (err: any) {
    console.error('[Supabase] Unexpected error in fetchProductsFromSupabase:', err);
    return {
      data: [],
      isFallback: true,
      error: err?.message || 'Failed to fetch products',
    };
  }
}

/**
 * 2. Upload brand logo file to Supabase Storage bucket `brand-logos`
 * Returns the public URL of the uploaded asset.
 */
export async function uploadBrandLogoToStorage(
  file: File | Blob,
  fileName?: string
): Promise<{ publicUrl: string; filePath: string }> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local');
  }

  // Client-Side Canvas Compression: Max 1200px width/height, 80% WebP quality
  let processedFile: File | Blob = file;
  let targetContentType = (file instanceof File && file.type) ? file.type : 'image/webp';
  let cleanName = (fileName || (file instanceof File ? file.name : 'logo.webp')).replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();

  try {
    const isSvg = (file.type && file.type.includes('svg')) || cleanName.endsWith('.svg');
    const isPdf = (file.type && file.type.includes('pdf')) || cleanName.endsWith('.pdf');
    if (isPdf) {
      targetContentType = 'application/pdf';
    } else if (isSvg) {
      targetContentType = 'image/svg+xml';
    } else {
      const compressionResult = await compressImageFile(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.8,
        format: 'image/webp',
      });
      processedFile = compressionResult.file;
      targetContentType = 'image/webp';
      if (!cleanName.endsWith('.webp')) {
        cleanName = `${cleanName.replace(/\.[^/.]+$/, '')}.webp`;
      }
      console.log(`[Image Compression] Compressed from ${(file.size / 1024).toFixed(1)} KB to ${(compressionResult.compressedSize / 1024).toFixed(1)} KB`);
    }
  } catch (compErr) {
    console.warn('[Image Compression] Canvas compression fallback to original:', compErr);
  }

  // Sanitize filename and create unique timestamped path
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 7);
  const filePath = `uploads/${timestamp}-${randomStr}-${cleanName}`;

  // Upload to Supabase Storage with 1 year cacheControl
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET_NAME)
    .upload(filePath, processedFile, {
      cacheControl: '31536000',
      upsert: false,
      contentType: targetContentType,
    });

  if (error) {
    console.error('[Supabase Storage] Upload error:', error);
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET_NAME)
    .getPublicUrl(data.path);

  return {
    publicUrl: urlData.publicUrl,
    filePath: data.path,
  };
}

/**
 * Uploads a base64 Data URL to Supabase Storage bucket `brand-logos`.
 * If already an HTTP(S) URL or local path, returns it as-is.
 * Compresses raster images on client canvas (max 1200px, 80% WebP) before upload.
 */
export async function uploadDataUrlToStorage(
  dataUrl?: string | null,
  fallbackName?: string
): Promise<string | null> {
  if (!dataUrl) return null;

  // Already a remote URL
  if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
    return dataUrl;
  }

  // Not a base64 data URL (e.g. local /assets/... path)
  if (!dataUrl.startsWith('data:')) {
    return dataUrl;
  }

  try {
    // Compress dataUrl using canvas prior to storage upload
    const optimizedDataUrl = await compressDataUrl(dataUrl, {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.8,
      format: 'image/webp',
    });

    const match = optimizedDataUrl.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
    if (!match) {
      return null;
    }

    const mimeType = match[1];
    const base64Content = match[2];
    const byteCharacters = atob(base64Content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    const ext = mimeType.split('/')[1]?.replace('svg+xml', 'svg') || 'webp';
    const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, '');
    const filename = fallbackName 
      ? `${fallbackName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.${cleanExt}` 
      : `logo_${Date.now()}.${cleanExt}`;

    const { publicUrl } = await uploadBrandLogoToStorage(blob, filename);
    return publicUrl;
  } catch (err) {
    console.warn('[Supabase Storage] Failed to upload dataURL to brand-logos:', err);
    return null;
  }
}


/**
 * 3. Handle Complete "Request a Quote" / Custom Order Flow:
 *  a) Uploads the user's logo file to Supabase Storage bucket `brand-logos`.
 *  b) Obtains the public URL.
 *  c) Inserts customer info + order details + logo URL into `custom_orders` table.
 */
export async function submitCustomOrderQuote(
  payload: QuoteRequestInput
): Promise<QuoteSubmissionResult> {
  // If Supabase is unconfigured, provide a smooth local fallback experience
  if (!isSupabaseConfigured()) {
    console.info('[Supabase] Running in local demo mode. Saving quote to local mock session.');
    
    // Simulate network latency (400ms)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Convert local File to data URL for preview if present
    let mockLogoUrl: string | null = payload.existingLogoUrl || null;
    if (payload.logoFile && !mockLogoUrl) {
      mockLogoUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string || null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(payload.logoFile as File);
      });
    }

    const mockId = `quote_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const mockOrder: CustomOrderRow = {
      id: mockId,
      customer_name: payload.customerName,
      customer_email: payload.customerEmail,
      company: payload.company || 'Corporate Client',
      phone: payload.phone,
      product_id: payload.productId,
      quantity: payload.quantity,
      logo_url: mockLogoUrl,
      custom_notes: payload.customNotes || '',
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    // Save to localStorage for demo persistence
    try {
      const existing = JSON.parse(localStorage.getItem('teqqno_supabase_quotes') || '[]');
      existing.unshift(mockOrder);
      localStorage.setItem('teqqno_supabase_quotes', JSON.stringify(existing));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }

    return {
      success: true,
      orderId: mockId,
      logoUrl: mockLogoUrl,
      data: mockOrder,
      message: 'Quote request recorded successfully (Demo Mode - connect Supabase in .env.local to persist in PostgreSQL).',
      isMockFallback: true,
    };
  }

  try {
    let finalLogoUrl: string | null = payload.existingLogoUrl || null;

    // a) Upload file to Supabase Storage if a File object was provided
    if (payload.logoFile) {
      const { publicUrl } = await uploadBrandLogoToStorage(payload.logoFile);
      finalLogoUrl = publicUrl;
    }

    // b) Insert record into `custom_orders` table
    const { data, error } = await (supabase.from('custom_orders') as any)
      .insert({
        customer_name: payload.customerName,
        customer_email: payload.customerEmail,
        company: payload.company || null,
        phone: payload.phone,
        product_id: payload.productId || null,
        quantity: payload.quantity,
        logo_url: finalLogoUrl,
        custom_notes: payload.customNotes || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('[Supabase DB] Error inserting quote into custom_orders:', error);
      throw new Error(`Failed to submit quote: ${error.message}`);
    }

    const insertedRow = data as CustomOrderRow;

    return {
      success: true,
      orderId: insertedRow?.id || 'SUBMITTED',
      logoUrl: finalLogoUrl,
      data: insertedRow,
      message: 'Your quote request and brand logo have been successfully registered with our corporate production team.',
      isMockFallback: false,
    };

  } catch (error: any) {
    console.error('[Supabase] Quote submission failed:', error);
    return {
      success: false,
      message: error?.message || 'An error occurred while submitting your quote request.',
    };
  }
}

/**
 * 4. Fetch quotes (for administrative review / order tracking)
 */
export async function fetchCustomOrdersFromSupabase(): Promise<{
  data: CustomOrderRow[];
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    try {
      const local = JSON.parse(localStorage.getItem('teqqno_supabase_quotes') || '[]');
      return { data: local };
    } catch {
      return { data: [] };
    }
  }

  try {
    const { data, error } = await supabase
      .from('custom_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [] };
  } catch (err: any) {
    return { data: [], error: err?.message };
  }
}

/**
 * 5. Utility: One-click Seed function to populate Supabase `products` table
 */
export async function seedProductsToSupabase(): Promise<{ count: number; error?: string }> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Add credentials in .env.local first.');
  }

  const rowsToInsert = PRODUCTS.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    base_price: p.basePrice,
    moq: p.moq,
    image_url: p.colors[0]?.imageFront || '/assets/products/prod_tipping_polo.webp',
    available_colors: p.colors.map((c) => ({ name: c.name, hex: c.hex, garmentHex: c.garmentHex })),
    available_sizes: p.sizes || ['S', 'M', 'L', 'XL', '2XL'],
    description: p.description,
  }));

  const { data, error } = await (supabase.from('products') as any)
    .upsert(rowsToInsert, { onConflict: 'id' })
    .select();

  if (error) {
    console.error('[Supabase Seed] Upsert failed:', error);
    throw error;
  }

  return { count: (data as any[])?.length || 0 };
}

/**
 * 6. Update Custom Order Status & Courier Dispatch Details
 * Executes: supabase.from('custom_orders').update({ status, courier_partner, tracking_number }).eq('id', orderId)
 * Provides robust fallback to custom_notes if courier columns are not yet provisioned in Supabase.
 */
export async function updateCustomOrderStatus(
  orderId: string,
  status: OrderStatus,
  courierPartner?: string | null,
  trackingNumber?: string | null
): Promise<{ success: boolean; data?: any; error?: string }> {
  console.log(`[Supabase Admin] Updating order ${orderId} -> status: ${status}, courier: ${courierPartner}, awb: ${trackingNumber}`);

  // 1. Synchronize in LocalStorage (for instant offline & local fallback reflection)
  try {
    const localQuotes: CustomOrderRow[] = JSON.parse(localStorage.getItem('teqqno_supabase_quotes') || '[]');
    const qIdx = localQuotes.findIndex(q => q.id === orderId);
    if (qIdx !== -1) {
      localQuotes[qIdx].status = status;
      if (courierPartner) localQuotes[qIdx].courier_partner = courierPartner;
      if (trackingNumber) localQuotes[qIdx].tracking_number = trackingNumber;
      localStorage.setItem('teqqno_supabase_quotes', JSON.stringify(localQuotes));
    }

    // Also update in customer orders list if matching
    const localOrders = JSON.parse(localStorage.getItem('teqqno_orders') || '[]');
    const oIdx = localOrders.findIndex((o: any) => o.id === orderId || o.orderNumber === orderId);
    if (oIdx !== -1) {
      localOrders[oIdx].orderStatus = status === 'pending' ? 'Artwork Verification' :
        status === 'approved' ? 'Artwork Verification' :
        status === 'in-production' ? 'Manufacturing' :
        status === 'dispatched' ? 'Dispatched' : 'Delivered';
      if (courierPartner) localOrders[oIdx].courierPartner = courierPartner;
      if (trackingNumber) localOrders[oIdx].trackingNumber = trackingNumber;
      localStorage.setItem('teqqno_orders', JSON.stringify(localOrders));
    }
  } catch (storageErr) {
    console.warn('LocalStorage sync warning:', storageErr);
  }

  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    // 2. Attempt direct column update
    const updatePayload: any = { status };
    if (courierPartner !== undefined) updatePayload.courier_partner = courierPartner;
    if (trackingNumber !== undefined) updatePayload.tracking_number = trackingNumber;

    let { data, error } = await (supabase.from('custom_orders') as any)
      .update(updatePayload)
      .eq('id', orderId)
      .select();

    if (error) {
      console.warn('[Supabase Update Warning] Retrying without custom courier columns:', error.message);
      // Fallback: If courier_partner/tracking_number columns don't exist in Supabase schema, update status only
      const fallbackResult = await (supabase.from('custom_orders') as any)
        .update({ status })
        .eq('id', orderId)
        .select();

      if (fallbackResult.error) {
        throw fallbackResult.error;
      }
      data = fallbackResult.data;
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('[Supabase Update Error]:', err);
    return { success: false, error: err?.message || 'Failed to update order status' };
  }
}

/**
 * 7. Abandoned Cart Recovery - Autosave partial lead data
 * Debounced capture in CheckoutView when user enters contact info
 */
export async function saveAbandonedCheckout(lead: {
  id: string;
  customerName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  cartItems: any[];
  cartTotal: number;
}): Promise<{ success: boolean; error?: string }> {
  const row = {
    id: lead.id,
    customer_name: lead.customerName || null,
    email: lead.email || null,
    phone: lead.phone || null,
    company: lead.company || null,
    cart_items: lead.cartItems || [],
    cart_total: lead.cartTotal || 0,
    recovered: false,
    updated_at: new Date().toISOString(),
  };

  // 1. Save to LocalStorage cache
  try {
    const existing = JSON.parse(localStorage.getItem('teqqno_abandoned_checkouts') || '[]');
    const idx = existing.findIndex((e: any) => e.id === lead.id);
    if (idx !== -1) {
      existing[idx] = { ...existing[idx], ...row };
    } else {
      existing.unshift({ ...row, created_at: new Date().toISOString() });
    }
    localStorage.setItem('teqqno_abandoned_checkouts', JSON.stringify(existing));
  } catch (err) {
    console.warn('[Abandoned Cart LocalStorage Error]:', err);
  }

  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    const { error } = await (supabase.from('abandoned_checkouts') as any)
      .upsert(row, { onConflict: 'id' });

    if (error) {
      // If table doesn't exist yet, silence error so customer checkout is never blocked
      console.warn('[Supabase Abandoned Checkouts Upsert]:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * 8. Mark Abandoned Checkout as Recovered when order completes
 */
export async function markCheckoutRecovered(
  sessionId: string,
  orderId: string
): Promise<{ success: boolean }> {
  const updateData = {
    recovered: true,
    order_id: orderId,
    recovered_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Update in LocalStorage
  try {
    const existing = JSON.parse(localStorage.getItem('teqqno_abandoned_checkouts') || '[]');
    const idx = existing.findIndex((e: any) => e.id === sessionId);
    if (idx !== -1) {
      existing[idx] = { ...existing[idx], ...updateData };
      localStorage.setItem('teqqno_abandoned_checkouts', JSON.stringify(existing));
    }
  } catch (err) {
    console.warn('[Abandoned Cart Recovery LocalStorage Error]:', err);
  }

  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    await (supabase.from('abandoned_checkouts') as any)
      .update(updateData)
      .eq('id', sessionId);
    return { success: true };
  } catch (err) {
    return { success: false };
  }
}

/**
 * 9. Fetch all Abandoned Leads for Admin Hub
 */
export async function fetchAbandonedCheckoutsFromSupabase(): Promise<{
  data: any[];
  error?: string;
}> {
  // Always get local leads first as base
  let localLeads: any[] = [];
  try {
    localLeads = JSON.parse(localStorage.getItem('teqqno_abandoned_checkouts') || '[]');
  } catch {
    localLeads = [];
  }

  if (!isSupabaseConfigured()) {
    return { data: localLeads };
  }

  try {
    const { data, error } = await (supabase.from('abandoned_checkouts') as any)
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('[Supabase Fetch Abandoned Checkouts Error]:', error.message);
      return { data: localLeads, error: error.message };
    }

    // Merge remote and local leads without duplicates
    const mergedMap = new Map<string, any>();
    (data || []).forEach((row: any) => mergedMap.set(row.id, row));
    localLeads.forEach((row: any) => {
      if (!mergedMap.has(row.id)) mergedMap.set(row.id, row);
    });

    return { data: Array.from(mergedMap.values()) };
  } catch (err: any) {
    return { data: localLeads, error: err?.message };
  }
}

/**
 * 10. Fetch Single Custom Order by ID or Phone (for Customer Real-Time Tracking)
 */
export async function fetchCustomOrderById(searchQuery: string): Promise<CustomOrderRow | null> {
  const clean = searchQuery.trim();
  if (!clean) return null;

  if (isSupabaseConfigured()) {
    try {
      // Try ID match
      const { data: byId } = await supabase
        .from('custom_orders')
        .select('*')
        .eq('id', clean)
        .maybeSingle();

      if (byId) return byId as CustomOrderRow;

      // Try phone match
      const { data: byPhone } = await supabase
        .from('custom_orders')
        .select('*')
        .ilike('phone', `%${clean.replace(/[^0-9]/g, '')}%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (byPhone && byPhone.length > 0) return byPhone[0] as CustomOrderRow;
    } catch (err) {
      console.warn('[Supabase Fetch Order By ID]:', err);
    }
  }

  // Fallback to local storage
  try {
    const localQuotes: CustomOrderRow[] = JSON.parse(localStorage.getItem('teqqno_supabase_quotes') || '[]');
    const found = localQuotes.find(q => 
      q.id.toLowerCase() === clean.toLowerCase() || 
      (q.tracking_number && q.tracking_number.toLowerCase() === clean.toLowerCase()) ||
      q.phone.includes(clean)
    );
    if (found) return found;
  } catch {
    // ignore
  }

  return null;
}

/**
 * 11. Fetch Customer Custom Orders filtered by customer email or phone
 * Used by CustomerDashboard so orders placed on the storefront or updated by Admin sync live.
 */
export async function fetchCustomerCustomOrders(
  email?: string | null,
  phone?: string | null
): Promise<{ data: CustomOrderRow[]; error?: string }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanDigits = (phone || '').replace(/[^0-9]/g, '').slice(-10);

  if (!cleanEmail && cleanDigits.length < 10) {
    return { data: [] };
  }

  if (!isSupabaseConfigured()) {
    try {
      const local: CustomOrderRow[] = JSON.parse(localStorage.getItem('teqqno_supabase_quotes') || '[]');
      const filtered = local.filter((row) => {
        const matchEmail = cleanEmail && (row.customer_email || '').trim().toLowerCase() === cleanEmail;
        const rowDigits = (row.phone || '').replace(/[^0-9]/g, '').slice(-10);
        const matchPhone = cleanDigits.length >= 10 && rowDigits === cleanDigits;
        return Boolean(matchEmail || matchPhone);
      });
      return { data: filtered };
    } catch {
      return { data: [] };
    }
  }

  try {
    const orFilters: string[] = [];
    if (cleanEmail) orFilters.push(`customer_email.ilike.${cleanEmail}`);
    if (cleanDigits.length >= 10) orFilters.push(`phone.ilike.%${cleanDigits}%`);

    const { data, error } = await supabase
      .from('custom_orders')
      .select('*')
      .or(orFilters.join(','))
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.warn('[Supabase] fetchCustomerCustomOrders error:', error.message);
      return { data: [], error: error.message };
    }

    return { data: (data as CustomOrderRow[]) || [] };
  } catch (err: any) {
    return { data: [], error: err?.message || 'Unable to sync customer orders' };
  }
}


