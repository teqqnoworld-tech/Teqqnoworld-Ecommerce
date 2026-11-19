import { DelhiveryPincodeCheckResult } from './paymentAndLogisticsService';

const STORAGE_KEY = 'teqqno_delhivery_pincode_check_v1';
const UPDATE_EVENT = 'teqqno:delhivery-check-updated';

export function getSavedDelhiveryCheck(): DelhiveryPincodeCheckResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.pincode === 'string' && parsed.pincode.length === 6) {
      return parsed as DelhiveryPincodeCheckResult;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export function saveDelhiveryCheck(result: DelhiveryPincodeCheckResult | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (result) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: result }));
  } catch {
    // ignore storage errors
  }
}

export function subscribeDelhiveryCheck(
  callback: (result: DelhiveryPincodeCheckResult | null) => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<DelhiveryPincodeCheckResult | null>;
    callback(customEvent.detail ?? getSavedDelhiveryCheck());
  };
  window.addEventListener(UPDATE_EVENT, handler);
  return () => window.removeEventListener(UPDATE_EVENT, handler);
}
