import { supabase } from '../lib/supabase';

export interface CustomerTwoStepStatusResponse {
  success: boolean;
  unauthorized?: boolean;
  enabled?: boolean;
  twoStepEmail?: string;
  maskedEmail?: string;
  totpEnabled?: boolean;
  totpUpdatedAt?: string | null;
  anyTwoStepEnabled?: boolean;
  accountEmail?: string;
  updatedAt?: string | null;
  smtpConfigured?: boolean;
  message?: string;
}

export interface CustomerTwoStepOtpResponse {
  success: boolean;
  unauthorized?: boolean;
  method?: 'totp' | 'email';
  targetEmail?: string;
  maskedEmail?: string;
  retryAfterSec?: number;
  simulated?: boolean;
  devOtp?: string;
  message?: string;
}

export interface CustomerTwoStepToggleResponse {
  success: boolean;
  unauthorized?: boolean;
  enabled?: boolean;
  twoStepEmail?: string;
  maskedEmail?: string;
  updatedAt?: string | null;
  message?: string;
}

export interface CustomerTotpSetupResponse {
  success: boolean;
  unauthorized?: boolean;
  qrDataUrl?: string;
  manualKey?: string;
  accountEmail?: string;
  issuer?: string;
  message?: string;
}

export interface CustomerTotpActionResponse {
  success: boolean;
  unauthorized?: boolean;
  totpEnabled?: boolean;
  totpUpdatedAt?: string | null;
  message?: string;
}

export interface CustomerLoginStep1Response {
  success: boolean;
  requiresTwoStep?: boolean;
  method?: 'totp' | 'email';
  canSwitchToEmail?: boolean;
  challengeToken?: string;
  maskedEmail?: string;
  simulated?: boolean;
  devOtp?: string;
  session?: {
    access_token: string;
    refresh_token: string;
  };
  user?: any;
  message?: string;
}

export interface CustomerLoginVerifyOtpResponse {
  success: boolean;
  expired?: boolean;
  session?: {
    access_token: string;
    refresh_token: string;
  };
  user?: any;
  message?: string;
}

async function getSupabaseAccessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch {
    return null;
  }
}

export async function getCustomerTwoStepStatus(): Promise<CustomerTwoStepStatusResponse> {
  try {
    const token = await getSupabaseAccessToken();
    if (!token) {
      return {
        success: false,
        unauthorized: true,
        message: 'Sign in with your account to manage Two-Step Verification.',
      };
    }

    const res = await fetch('/api/customer/2fa/status', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return (await res.json()) as CustomerTwoStepStatusResponse;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to load Two-Step Verification status.',
    };
  }
}

export async function sendCustomerTwoStepSetupOtp(params: {
  email: string;
  action: 'enable' | 'disable' | 'change_email';
}): Promise<CustomerTwoStepOtpResponse> {
  try {
    const token = await getSupabaseAccessToken();
    if (!token) {
      return {
        success: false,
        unauthorized: true,
        message: 'Please sign in again to continue.',
      };
    }

    const res = await fetch('/api/customer/2fa/send-setup-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
    return (await res.json()) as CustomerTwoStepOtpResponse;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Could not send verification code.',
    };
  }
}

export async function toggleCustomerTwoStep(params: {
  enabled: boolean;
  action: 'enable' | 'disable' | 'change_email';
  otp: string;
}): Promise<CustomerTwoStepToggleResponse> {
  try {
    const token = await getSupabaseAccessToken();
    if (!token) {
      return {
        success: false,
        unauthorized: true,
        message: 'Please sign in again to continue.',
      };
    }

    const res = await fetch('/api/customer/2fa/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
    return (await res.json()) as CustomerTwoStepToggleResponse;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Could not update Two-Step Verification.',
    };
  }
}

export async function startCustomerTotpSetup(): Promise<CustomerTotpSetupResponse> {
  try {
    const token = await getSupabaseAccessToken();
    if (!token) {
      return {
        success: false,
        unauthorized: true,
        message: 'Please sign in again to set up Google Authenticator.',
      };
    }

    const res = await fetch('/api/customer/2fa/totp/setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return (await res.json()) as CustomerTotpSetupResponse;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to generate Google Authenticator QR code.',
    };
  }
}

export async function confirmCustomerTotpSetup(
  code: string
): Promise<CustomerTotpActionResponse> {
  try {
    const token = await getSupabaseAccessToken();
    if (!token) {
      return {
        success: false,
        unauthorized: true,
        message: 'Please sign in again to activate Google Authenticator.',
      };
    }

    const res = await fetch('/api/customer/2fa/totp/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code }),
    });
    return (await res.json()) as CustomerTotpActionResponse;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to verify Authenticator code.',
    };
  }
}

export async function disableCustomerTotp(
  code: string
): Promise<CustomerTotpActionResponse> {
  try {
    const token = await getSupabaseAccessToken();
    if (!token) {
      return {
        success: false,
        unauthorized: true,
        message: 'Please sign in again to update Authenticator settings.',
      };
    }

    const res = await fetch('/api/customer/2fa/totp/disable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code }),
    });
    return (await res.json()) as CustomerTotpActionResponse;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to turn OFF Google Authenticator.',
    };
  }
}

export async function customerLoginStep1(params: {
  email: string;
  password: string;
}): Promise<CustomerLoginStep1Response> {
  try {
    const res = await fetch('/api/customer/2fa/login-step1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return (await res.json()) as CustomerLoginStep1Response;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Network error while signing in. Please try again.',
    };
  }
}

export async function customerLoginVerifyOtp(params: {
  challengeToken: string;
  otp: string;
}): Promise<CustomerLoginVerifyOtpResponse> {
  try {
    const res = await fetch('/api/customer/2fa/login-verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return (await res.json()) as CustomerLoginVerifyOtpResponse;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to verify login code.',
    };
  }
}

export async function customerLoginResendOtp(
  challengeToken: string
): Promise<CustomerTwoStepOtpResponse & { expired?: boolean }> {
  try {
    const res = await fetch('/api/customer/2fa/login-resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeToken }),
    });
    return (await res.json()) as CustomerTwoStepOtpResponse & { expired?: boolean };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to resend login verification code.',
    };
  }
}
