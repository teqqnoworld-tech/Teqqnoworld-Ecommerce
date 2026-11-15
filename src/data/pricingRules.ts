/**
 * Centralized Product Pricing Architecture for TeqqnoWorld
 * Source of Truth: Master Product Pricing Sheet (All in INR ₹)
 * Formula: Total Price = Selected Quantity × Applicable Per-Piece Price
 */

export interface PricingSlab {
  minQty: number;
  maxQty: number;
  pricePerUnit: number; // In ₹ (INR). May be decimal for cards, e.g. 1.50
  label: string;
}

export interface ProductPricingRule {
  key: string;
  name: string;
  moq: number;
  maxQty: number;
  unitLabel: string; // e.g. 'pc', 'card', 'unit'
  slabs: PricingSlab[];
}

export const PRODUCT_PRICING_RULES: Record<string, ProductPricingRule> = {
  // 1. COTTON 230 GSM POLO T-SHIRT (prod-plain-polo / prod-polo-01)
  'cotton-230-polo': {
    key: 'cotton-230-polo',
    name: 'Cotton 230 GSM Polo T-Shirt',
    moq: 2,
    maxQty: 100,
    unitLabel: 'pc',
    slabs: [
      { minQty: 2, maxQty: 2, pricePerUnit: 700, label: '2 pcs' },
      { minQty: 3, maxQty: 5, pricePerUnit: 670, label: '3–5 pcs' },
      { minQty: 6, maxQty: 10, pricePerUnit: 650, label: '6–10 pcs' },
      { minQty: 11, maxQty: 20, pricePerUnit: 600, label: '11–20 pcs' },
      { minQty: 21, maxQty: 50, pricePerUnit: 550, label: '21–50 pcs' },
      { minQty: 51, maxQty: 75, pricePerUnit: 500, label: '51–75 pcs' },
      { minQty: 76, maxQty: 100, pricePerUnit: 450, label: '76–100 pcs' },
    ],
  },

  // 2. MATTY POLO T-SHIRT (prod-matty-polo)
  'matty-polo': {
    key: 'matty-polo',
    name: 'Matty Polo T-Shirt',
    moq: 2,
    maxQty: 100,
    unitLabel: 'pc',
    slabs: [
      { minQty: 2, maxQty: 2, pricePerUnit: 650, label: '2 pcs' },
      { minQty: 3, maxQty: 5, pricePerUnit: 600, label: '3–5 pcs' },
      { minQty: 6, maxQty: 10, pricePerUnit: 530, label: '6–10 pcs' },
      { minQty: 11, maxQty: 20, pricePerUnit: 500, label: '11–20 pcs' },
      { minQty: 21, maxQty: 50, pricePerUnit: 450, label: '21–50 pcs' },
      { minQty: 51, maxQty: 75, pricePerUnit: 400, label: '51–75 pcs' },
      { minQty: 76, maxQty: 100, pricePerUnit: 350, label: '76–100 pcs' },
    ],
  },

  // 3. MARS POLO T-SHIRT (prod-joab-coolmax)
  'mars-polo': {
    key: 'mars-polo',
    name: 'Mars Polo T-Shirt',
    moq: 2,
    maxQty: 100,
    unitLabel: 'pc',
    slabs: [
      { minQty: 2, maxQty: 2, pricePerUnit: 650, label: '2 pcs' },
      { minQty: 3, maxQty: 5, pricePerUnit: 600, label: '3–5 pcs' },
      { minQty: 6, maxQty: 10, pricePerUnit: 530, label: '6–10 pcs' },
      { minQty: 11, maxQty: 20, pricePerUnit: 500, label: '11–20 pcs' },
      { minQty: 21, maxQty: 50, pricePerUnit: 450, label: '21–50 pcs' },
      { minQty: 51, maxQty: 75, pricePerUnit: 430, label: '51–75 pcs' },
      { minQty: 76, maxQty: 100, pricePerUnit: 399, label: '76–100 pcs' },
    ],
  },

  // 4. COTTON CAPS (prod-cotton-flexi-caps)
  'cotton-caps': {
    key: 'cotton-caps',
    name: 'Cotton Caps',
    moq: 1,
    maxQty: 200,
    unitLabel: 'pc',
    slabs: [
      { minQty: 1, maxQty: 9, pricePerUnit: 250, label: '1–9 pcs' },
      { minQty: 10, maxQty: 25, pricePerUnit: 199, label: '10–25 pcs' },
      { minQty: 26, maxQty: 50, pricePerUnit: 175, label: '26–50 pcs' },
      { minQty: 51, maxQty: 100, pricePerUnit: 155, label: '51–100 pcs' },
      { minQty: 101, maxQty: 150, pricePerUnit: 145, label: '101–150 pcs' },
      { minQty: 151, maxQty: 200, pricePerUnit: 135, label: '151–200 pcs' },
    ],
  },

  // 5. ROLL-UP STANDEE (prod-rollup-standee)
  'rollup-standee': {
    key: 'rollup-standee',
    name: 'Roll-Up Standee',
    moq: 1,
    maxQty: 20,
    unitLabel: 'pc',
    slabs: [
      { minQty: 1, maxQty: 2, pricePerUnit: 1799, label: '1–2 pcs' },
      { minQty: 3, maxQty: 5, pricePerUnit: 1599, label: '3–5 pcs' },
      { minQty: 6, maxQty: 10, pricePerUnit: 1499, label: '6–10 pcs' },
      { minQty: 11, maxQty: 20, pricePerUnit: 1399, label: '11–20 pcs' },
    ],
  },

  // 6. PROMOTIONAL TABLE (prod-promo-table)
  'promo-table': {
    key: 'promo-table',
    name: 'Promotional Table',
    moq: 1,
    maxQty: 10,
    unitLabel: 'unit',
    slabs: [
      { minQty: 1, maxQty: 2, pricePerUnit: 3500, label: '1–2 pcs' },
      { minQty: 3, maxQty: 5, pricePerUnit: 3300, label: '3–5 pcs' },
      { minQty: 6, maxQty: 10, pricePerUnit: 3100, label: '6–10 pcs' },
    ],
  },

  // 7. 300 GSM VISITING CARD (prod-visiting-card-300gsm)
  'visiting-card-300gsm': {
    key: 'visiting-card-300gsm',
    name: '300 GSM Visiting Card',
    moq: 100, // typically ordered in packs of 100
    maxQty: 2000,
    unitLabel: 'card',
    slabs: [
      { minQty: 1, maxQty: 200, pricePerUnit: 3.0, label: '1–200 pcs' },
      { minQty: 201, maxQty: 499, pricePerUnit: 2.0, label: '201–499 pcs' },
      { minQty: 500, maxQty: 1000, pricePerUnit: 1.5, label: '500–1,000 pcs' },
      { minQty: 1001, maxQty: 2000, pricePerUnit: 1.0, label: '1,001–2,000 pcs' },
    ],
  },

  // 8. 5 FEET PROMOTIONAL UMBRELLA (prod-branding-umbrella)
  'promotional-umbrella': {
    key: 'promotional-umbrella',
    name: '5 Feet Promotional Umbrella',
    moq: 1,
    maxQty: 20,
    unitLabel: 'unit',
    slabs: [
      { minQty: 1, maxQty: 2, pricePerUnit: 1499, label: '1–2 pcs' },
      { minQty: 3, maxQty: 5, pricePerUnit: 1399, label: '3–5 pcs' },
      { minQty: 6, maxQty: 10, pricePerUnit: 1350, label: '6–10 pcs' },
      { minQty: 11, maxQty: 20, pricePerUnit: 1199, label: '11–20 pcs' },
    ],
  },

  // 9. 4×4 PROMOTIONAL CANOPY (prod-canopy-kiosk, size: '4 × 4 ft')
  'canopy-4x4': {
    key: 'canopy-4x4',
    name: '4×4 Promotional Canopy',
    moq: 1,
    maxQty: 10,
    unitLabel: 'unit',
    slabs: [
      { minQty: 1, maxQty: 2, pricePerUnit: 5100, label: '1–2 pcs' },
      { minQty: 3, maxQty: 5, pricePerUnit: 4500, label: '3–5 pcs' },
      { minQty: 6, maxQty: 10, pricePerUnit: 4200, label: '6–10 pcs' },
    ],
  },

  // 10. 8×8 PROMOTIONAL CANOPY (prod-canopy-kiosk, size: '8 × 8 ft')
  'canopy-8x8': {
    key: 'canopy-8x8',
    name: '8×8 Promotional Canopy',
    moq: 1,
    maxQty: 10,
    unitLabel: 'unit',
    slabs: [
      { minQty: 1, maxQty: 2, pricePerUnit: 6100, label: '1–2 pcs' },
      { minQty: 3, maxQty: 5, pricePerUnit: 5500, label: '3–5 pcs' },
      { minQty: 6, maxQty: 10, pricePerUnit: 5200, label: '6–10 pcs' },
    ],
  },

  // 11. PROMOTIONAL CERAMIC COFFEE MUG (prod-ceramic-mug)
  'ceramic-mug': {
    key: 'ceramic-mug',
    name: 'Promotional Ceramic Coffee Mug',
    moq: 5,
    maxQty: 100,
    unitLabel: 'pc',
    slabs: [
      { minQty: 5, maxQty: 5, pricePerUnit: 249, label: '5 pcs' },
      { minQty: 6, maxQty: 10, pricePerUnit: 230, label: '6–10 pcs' },
      { minQty: 11, maxQty: 25, pricePerUnit: 199, label: '11–25 pcs' },
      { minQty: 26, maxQty: 50, pricePerUnit: 175, label: '26–50 pcs' },
      { minQty: 51, maxQty: 100, pricePerUnit: 149, label: '51–100 pcs' },
    ],
  },
};

/**
 * Resolves a product identifier and optional variant options (like canopy size)
 * to its canonical pricing rule key.
 */
export function resolvePricingRuleKey(
  productIdOrSlug: string,
  variantSize?: string
): string {
  const s = (productIdOrSlug || '').toLowerCase();
  const v = (variantSize || '').toLowerCase();

  // Canopy
  if (s.includes('canopy')) {
    if (v.includes('8') || s.includes('8x8') || s.includes('8 × 8')) {
      return 'canopy-8x8';
    }
    return 'canopy-4x4';
  }

  // Visiting Card
  if (s.includes('visiting-card') || s.includes('visiting card') || s.includes('business-card')) {
    return 'visiting-card-300gsm';
  }

  // Coffee Mug
  if (s.includes('ceramic-mug') || s.includes('mug') || s.includes('coffee')) {
    return 'ceramic-mug';
  }

  // Promo Table
  if (s.includes('promo-table') || s.includes('table')) {
    return 'promo-table';
  }

  // Roll-up Standee
  if (s.includes('rollup') || s.includes('standee')) {
    return 'rollup-standee';
  }

  // Umbrella
  if (s.includes('umbrella')) {
    return 'promotional-umbrella';
  }

  // Caps
  if (s.includes('cap')) {
    return 'cotton-caps';
  }

  // Mars / Joab Coolmax Polo
  if (s.includes('mars') || s.includes('joab') || s.includes('coolmax')) {
    return 'mars-polo';
  }

  // Matty Polo
  if (s.includes('matty')) {
    return 'matty-polo';
  }

  // Cotton 230 GSM Polo (default for plain polo and tipping polo)
  return 'cotton-230-polo';
}

export interface ProductPricingResult {
  ruleKey: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isQuoteRequired: boolean;
  activeSlab: PricingSlab | null;
  nextTierUpsell: {
    minQty: number;
    price: number;
    diff: number;
    savingsPerPiece: number;
  } | null;
  moq: number;
  maxQty: number;
  slabs: PricingSlab[];
  unitLabel: string;
}

/**
 * Calculates accurate pricing strictly following:
 * Total Price = Selected Quantity × Applicable Per-Piece Price
 *
 * If quantity > maxQty, flags isQuoteRequired = true.
 */
export function calculateProductPrice(
  productIdOrSlug: string,
  quantity: number,
  variantSize?: string
): ProductPricingResult {
  const ruleKey = resolvePricingRuleKey(productIdOrSlug, variantSize);
  const rule = PRODUCT_PRICING_RULES[ruleKey] || PRODUCT_PRICING_RULES['cotton-230-polo'];

  const moq = rule.moq;
  const maxQty = rule.maxQty;
  const effectiveQty = Math.max(moq, quantity);

  // If quantity exceeds maximum slab, quote is required
  const isQuoteRequired = quantity > maxQty;

  // Find active slab matching quantity
  let activeSlab: PricingSlab | null = null;

  if (quantity < moq) {
    // If under MOQ, use first slab's per-piece price
    activeSlab = rule.slabs[0];
  } else if (quantity > maxQty) {
    // If over maxQty, active rate is the highest volume slab
    activeSlab = rule.slabs[rule.slabs.length - 1];
  } else {
    for (const slab of rule.slabs) {
      if (quantity >= slab.minQty && quantity <= slab.maxQty) {
        activeSlab = slab;
        break;
      }
    }
    // Fallback if not strictly caught (e.g. gaps, pick nearest)
    if (!activeSlab) {
      for (let i = rule.slabs.length - 1; i >= 0; i--) {
        if (quantity >= rule.slabs[i].minQty) {
          activeSlab = rule.slabs[i];
          break;
        }
      }
    }
  }

  if (!activeSlab) {
    activeSlab = rule.slabs[0];
  }

  const unitPrice = activeSlab.pricePerUnit;
  // Strict formula: Total Price = Selected Quantity × Applicable Per-Piece Price
  // Round to 2 decimals for visiting card or whole integer for others
  const rawTotal = effectiveQty * unitPrice;
  const totalPrice = Number.isInteger(rawTotal) ? rawTotal : Math.round(rawTotal * 100) / 100;

  // Calculate next tier upsell if applicable
  let nextTierUpsell: ProductPricingResult['nextTierUpsell'] = null;
  if (!isQuoteRequired) {
    const nextSlab = rule.slabs.find(s => s.minQty > effectiveQty);
    if (nextSlab) {
      const diff = nextSlab.minQty - effectiveQty;
      const savingsPerPiece = Math.max(0, unitPrice - nextSlab.pricePerUnit);
      nextTierUpsell = {
        minQty: nextSlab.minQty,
        price: nextSlab.pricePerUnit,
        diff,
        savingsPerPiece,
      };
    }
  }

  return {
    ruleKey,
    productName: rule.name,
    quantity: effectiveQty,
    unitPrice,
    totalPrice,
    isQuoteRequired,
    activeSlab,
    nextTierUpsell,
    moq,
    maxQty,
    slabs: rule.slabs,
    unitLabel: rule.unitLabel,
  };
}

/**
 * Format currency with Indian Rupee symbol: ₹
 * Formats decimals (e.g. ₹1.50) or whole numbers (e.g. ₹6,500)
 */
export function formatCurrencyINR(amount: number): string {
  if (Number.isInteger(amount)) {
    return `₹${amount.toLocaleString('en-IN')}`;
  }
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
