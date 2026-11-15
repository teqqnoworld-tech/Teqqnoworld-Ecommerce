import { useState, useEffect, useCallback } from 'react';
import { 
  fetchProductsFromSupabase, 
  submitCustomOrderQuote, 
  QuoteRequestInput, 
  QuoteSubmissionResult, 
  fetchCustomOrdersFromSupabase 
} from '../services/supabaseService';
import { ProductRow, CustomOrderRow, isSupabaseConfigured, getSupabaseConfig } from '../lib/supabase';

/**
 * Hook 1: useProducts
 * Fetches all products from Supabase database to display on the landing page catalog grid.
 */
export function useProducts() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState<boolean>(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchProductsFromSupabase();
      setProducts(result.data);
      setIsFallback(result.isFallback);
      if (result.error) {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return {
    products,
    loading,
    error,
    isFallback,
    refetch: loadProducts,
  };
}

/**
 * Hook 2: useRequestQuote
 * Handles the complete "Request a Quote" / custom order form workflow:
 * 1. Uploads brand logo to Supabase Storage bucket `brand-logos`
 * 2. Obtains public URL
 * 3. Inserts order record into `custom_orders` table
 * 4. Manages loading state, error reporting, and success confirmation
 */
export function useRequestQuote() {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuoteSubmissionResult | null>(null);

  const submitQuote = useCallback(async (payload: QuoteRequestInput): Promise<QuoteSubmissionResult> => {
    setIsSubmitting(true);
    setError(null);
    setIsSuccess(false);

    try {
      // Validate core required fields
      if (!payload.customerName.trim()) {
        throw new Error('Please enter your full name');
      }
      if (!payload.customerEmail.trim() || !payload.customerEmail.includes('@')) {
        throw new Error('Please provide a valid business email address');
      }
      if (!payload.phone.trim()) {
        throw new Error('Please provide a contact phone number');
      }
      if (!payload.productId) {
        throw new Error('Please select a product');
      }
      if (!payload.quantity || payload.quantity < 1) {
        throw new Error('Quantity must be at least 1 unit');
      }

      const submissionResult = await submitCustomOrderQuote(payload);

      if (!submissionResult.success) {
        throw new Error(submissionResult.message || 'Submission failed');
      }

      setResult(submissionResult);
      setIsSuccess(true);
      return submissionResult;
    } catch (err: any) {
      const msg = err?.message || 'Failed to submit quote request';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsSubmitting(false);
    setIsSuccess(false);
    setError(null);
    setResult(null);
  }, []);

  return {
    submitQuote,
    isSubmitting,
    isSuccess,
    error,
    result,
    reset,
  };
}

/**
 * Hook 3: useSupabaseQuotes
 * Fetches recent quotes for order tracking or admin review
 */
export function useSupabaseQuotes() {
  const [quotes, setQuotes] = useState<CustomOrderRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCustomOrdersFromSupabase();
      setQuotes(res.data);
      if (res.error) setError(res.error);
    } catch (err: any) {
      setError(err?.message || 'Error loading quotes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  return { quotes, loading, error, refetch: loadQuotes };
}

/**
 * Hook 4: useSupabaseStatus
 * Reports environment variable presence and backend readiness
 */
export function useSupabaseStatus() {
  const config = getSupabaseConfig();
  return {
    isConfigured: config.configured,
    url: config.url,
    hasKey: config.hasKey,
    storageBucket: config.storageBucket,
  };
}
