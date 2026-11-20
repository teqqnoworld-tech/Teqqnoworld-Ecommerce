export interface AdminAuthStatusResponse {
  pinLocked: boolean;
  failedAttempts: number;
  maxAttempts: number;
  twoStepEnabled: boolean;
  maskedOwnerEmail: string;
  smtpConfigured: boolean;
}

export interface AdminVerifyPinResponse {
  success: boolean;
  requiresTwoStep?: boolean;
  challengeToken?: string;
  sessionToken?: string;
  pinLocked?: boolean;
  failedAttempts?: number;
  attemptsRemaining?: number;
  maskedOwnerEmail?: string;
  simulated?: boolean;
  devOtp?: string;
  message: string;
}

export interface AdminVerifyLoginOtpResponse {
  success: boolean;
  sessionToken?: string;
  message: string;
}

export interface AdminSendOtpResponse {
  success: boolean;
  maskedOwnerEmail?: string;
  retryAfterSec?: number;
  expiresInMinutes?: number;
  simulated?: boolean;
  devOtp?: string;
  message: string;
}

export interface AdminResetPinResponse {
  success: boolean;
  pinUpdated: boolean;
  message: string;
}

export interface AdminSecurityEvent {
  at: string;
  event: string;
  detail: string;
}

export interface AdminSecuritySummaryResponse {
  success: boolean;
  unauthorized?: boolean;
  twoStepEnabled: boolean;
  pinLocked: boolean;
  failedAttempts: number;
  maxAttempts: number;
  maskedOwnerEmail: string;
  ownerEmailsCount: number;
  pinUpdatedAt: string | null;
  lastLoginAt: string | null;
  recentEvents: AdminSecurityEvent[];
  message?: string;
}

const ADMIN_TOKEN_STORAGE_KEY = 'teqqno_admin_session_token';

export function getStoredAdminToken(): string {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredAdminToken(token: string) {
  try {
    sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
    // Clean up legacy insecure localStorage boolean flag if present
    localStorage.removeItem('teqqno_admin_auth');
  } catch {
    // ignore storage errors
  }
}

export function clearStoredAdminToken() {
  try {
    sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    localStorage.removeItem('teqqno_admin_auth');
  } catch {
    // ignore storage errors
  }
}

async function parseJsonSafe<T>(res: Response): Promise<T | null> {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getAdminAuthStatus(): Promise<AdminAuthStatusResponse> {
  try {
    const res = await fetch('/api/admin/auth/status');
    const data = await parseJsonSafe<AdminAuthStatusResponse>(res);
    if (data) return data;
  } catch {
    // fallback below
  }
  return {
    pinLocked: false,
    failedAttempts: 0,
    maxAttempts: 3,
    twoStepEnabled: true,
    maskedOwnerEmail: 'owner email',
    smtpConfigured: true,
  };
}

export async function verifyAdminSession(): Promise<boolean> {
  const token = getStoredAdminToken();
  if (!token) return false;
  try {
    const res = await fetch('/api/admin/security/summary', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const data = await parseJsonSafe<AdminSecuritySummaryResponse>(res);
    return Boolean(data?.success);
  } catch {
    return false;
  }
}

export async function verifyAdminPin(pin: string): Promise<AdminVerifyPinResponse> {
  try {
    const res = await fetch('/api/admin/auth/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    const data = await parseJsonSafe<AdminVerifyPinResponse>(res);
    if (!data) {
      return { success: false, message: `Admin auth service unavailable (HTTP ${res.status}).` };
    }
    return data;
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error verifying Admin PIN.' };
  }
}

export async function verifyAdminLoginOtp(
  challengeToken: string,
  otp: string
): Promise<AdminVerifyLoginOtpResponse> {
  try {
    const res = await fetch('/api/admin/auth/verify-login-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeToken, otp }),
    });
    const data = await parseJsonSafe<AdminVerifyLoginOtpResponse>(res);
    if (!data) {
      return { success: false, message: `2-Step verification API unavailable (HTTP ${res.status}).` };
    }
    return data;
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error verifying 6-digit code.' };
  }
}

export async function resendAdminLoginOtp(challengeToken: string): Promise<AdminSendOtpResponse> {
  try {
    const res = await fetch('/api/admin/auth/resend-login-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeToken }),
    });
    const data = await parseJsonSafe<AdminSendOtpResponse>(res);
    if (!data) {
      return { success: false, message: `Could not resend code (HTTP ${res.status}).` };
    }
    return data;
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error resending code.' };
  }
}

export async function sendAdminPinResetOtp(
  purpose: 'reset_pin' | 'change_pin' | 'toggle_2fa' = 'reset_pin'
): Promise<AdminSendOtpResponse> {
  try {
    const token = getStoredAdminToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch('/api/admin/auth/send-pin-reset-otp', {
      method: 'POST',
      headers,
      body: JSON.stringify({ purpose }),
    });
    const data = await parseJsonSafe<AdminSendOtpResponse>(res);
    if (!data) {
      return { success: false, message: `Admin OTP API unavailable (HTTP ${res.status}).` };
    }
    return data;
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error sending Owner email code.' };
  }
}

export async function resetAdminPinWithOtp(params: {
  otp: string;
  newPin: string;
}): Promise<AdminResetPinResponse> {
  try {
    const res = await fetch('/api/admin/auth/reset-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await parseJsonSafe<AdminResetPinResponse>(res);
    if (!data) {
      return { success: false, pinUpdated: false, message: `Reset PIN API unavailable (HTTP ${res.status}).` };
    }
    return data;
  } catch (err: any) {
    return { success: false, pinUpdated: false, message: err?.message || 'Network error resetting Admin PIN.' };
  }
}

export async function getAdminSecuritySummary(): Promise<AdminSecuritySummaryResponse> {
  const token = getStoredAdminToken();
  try {
    const res = await fetch('/api/admin/security/summary', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await parseJsonSafe<AdminSecuritySummaryResponse>(res);
    if (data) return data;
    return {
      success: false,
      unauthorized: res.status === 401,
      twoStepEnabled: true,
      pinLocked: false,
      failedAttempts: 0,
      maxAttempts: 3,
      maskedOwnerEmail: 'owner email',
      ownerEmailsCount: 1,
      pinUpdatedAt: null,
      lastLoginAt: null,
      recentEvents: [],
      message: `Security summary unavailable (HTTP ${res.status}).`,
    };
  } catch (err: any) {
    return {
      success: false,
      twoStepEnabled: true,
      pinLocked: false,
      failedAttempts: 0,
      maxAttempts: 3,
      maskedOwnerEmail: 'owner email',
      ownerEmailsCount: 1,
      pinUpdatedAt: null,
      lastLoginAt: null,
      recentEvents: [],
      message: err?.message || 'Network error loading security settings.',
    };
  }
}

export async function changeAdminPinFromDashboard(params: {
  currentPin: string;
  otp: string;
  newPin: string;
}): Promise<AdminResetPinResponse> {
  const token = getStoredAdminToken();
  try {
    const res = await fetch('/api/admin/security/change-pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
    const data = await parseJsonSafe<AdminResetPinResponse>(res);
    if (!data) {
      return { success: false, pinUpdated: false, message: `Change PIN API unavailable (HTTP ${res.status}).` };
    }
    return data;
  } catch (err: any) {
    return { success: false, pinUpdated: false, message: err?.message || 'Network error changing Admin PIN.' };
  }
}

export async function toggleAdminTwoStepVerification(params: {
  enabled: boolean;
  otp?: string;
}): Promise<{ success: boolean; twoStepEnabled?: boolean; requiresOtp?: boolean; message: string }> {
  const token = getStoredAdminToken();
  try {
    const res = await fetch('/api/admin/security/toggle-2fa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
    const data = await parseJsonSafe<{
      success: boolean;
      twoStepEnabled?: boolean;
      requiresOtp?: boolean;
      message: string;
    }>(res);
    if (!data) {
      return { success: false, message: `2-Step toggle API unavailable (HTTP ${res.status}).` };
    }
    return data;
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error updating 2-Step Verification.' };
  }
}
