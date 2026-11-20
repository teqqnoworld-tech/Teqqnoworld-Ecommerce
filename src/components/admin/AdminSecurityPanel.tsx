import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Mail,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Clock,
} from 'lucide-react';
import {
  AdminSecuritySummaryResponse,
  changeAdminPinFromDashboard,
  getAdminSecuritySummary,
  sendAdminPinResetOtp,
  toggleAdminTwoStepVerification,
} from '../../services/adminSecurityService';

interface AdminSecurityPanelProps {
  onToast: (type: 'success' | 'error', message: string) => void;
  onSessionExpired?: () => void;
}

export const AdminSecurityPanel: React.FC<AdminSecurityPanelProps> = ({
  onToast,
  onSessionExpired,
}) => {
  const [summary, setSummary] = useState<AdminSecuritySummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Change PIN form state
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [changePinOtp, setChangePinOtp] = useState('');
  const [showPins, setShowPins] = useState(false);
  const [pinOtpSent, setPinOtpSent] = useState(false);
  const [pinOtpInfo, setPinOtpInfo] = useState('');
  const [pinOtpCooldown, setPinOtpCooldown] = useState(0);
  const [sendingPinOtp, setSendingPinOtp] = useState(false);
  const [savingNewPin, setSavingNewPin] = useState(false);

  // 2-Step Verification disable OTP prompt state
  const [toggling2FA, setToggling2FA] = useState(false);
  const [disable2FAMode, setDisable2FAMode] = useState(false);
  const [disable2FAOtp, setDisable2FAOtp] = useState('');
  const [disable2FAInfo, setDisable2FAInfo] = useState('');
  const [disable2FACooldown, setDisable2FACooldown] = useState(0);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const data = await getAdminSecuritySummary();
      if (data.unauthorized && onSessionExpired) {
        onSessionExpired();
        return;
      }
      setSummary(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary();
  }, []);

  useEffect(() => {
    if (pinOtpCooldown <= 0) return;
    const t = setTimeout(() => setPinOtpCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [pinOtpCooldown]);

  useEffect(() => {
    if (disable2FACooldown <= 0) return;
    const t = setTimeout(() => setDisable2FACooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [disable2FACooldown]);

  const handleSendChangePinOtp = async () => {
    if (pinOtpCooldown > 0 || sendingPinOtp) return;
    setSendingPinOtp(true);
    try {
      const res = await sendAdminPinResetOtp('change_pin');
      if (!res.success) {
        if (res.retryAfterSec) setPinOtpCooldown(res.retryAfterSec);
        onToast('error', res.message);
        return;
      }
      setPinOtpSent(true);
      setPinOtpCooldown(30);
      const infoText =
        res.simulated && res.devOtp
          ? `Simulation Mode: Verification code is ${res.devOtp}`
          : `6-digit verification code sent to Owner Email (${res.maskedOwnerEmail || summary?.maskedOwnerEmail}).`;
      setPinOtpInfo(infoText);
      onToast('success', '6-digit verification code sent to Owner Email!');
    } finally {
      setSendingPinOtp(false);
    }
  };

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCurr = currentPin.trim();
    const cleanNew = newPin.replace(/[^0-9]/g, '').trim();
    const cleanConfirm = confirmNewPin.replace(/[^0-9]/g, '').trim();
    const cleanOtp = changePinOtp.replace(/[^0-9]/g, '').trim();

    if (!cleanCurr) {
      onToast('error', 'Please enter your current Admin PIN.');
      return;
    }
    if (cleanOtp.length !== 6) {
      onToast('error', 'Please enter the 6-digit verification code sent to Owner Email.');
      return;
    }
    if (cleanNew.length < 4 || cleanNew.length > 8) {
      onToast('error', 'New Admin PIN must be 4 to 8 digits.');
      return;
    }
    if (cleanNew !== cleanConfirm) {
      onToast('error', 'New PIN and Confirm New PIN do not match.');
      return;
    }

    setSavingNewPin(true);
    try {
      const res = await changeAdminPinFromDashboard({
        currentPin: cleanCurr,
        otp: cleanOtp,
        newPin: cleanNew,
      });
      if (!res.success || !res.pinUpdated) {
        onToast('error', res.message || 'Could not update Admin PIN.');
        return;
      }
      setCurrentPin('');
      setNewPin('');
      setConfirmNewPin('');
      setChangePinOtp('');
      setPinOtpSent(false);
      setPinOtpInfo('');
      onToast('success', res.message);
      await loadSummary();
    } finally {
      setSavingNewPin(false);
    }
  };

  const handleToggle2FAClick = async () => {
    if (!summary || toggling2FA) return;
    if (!summary.twoStepEnabled) {
      // Enabling 2FA can happen immediately without friction
      setToggling2FA(true);
      try {
        const res = await toggleAdminTwoStepVerification({ enabled: true });
        if (!res.success) {
          onToast('error', res.message);
          return;
        }
        setDisable2FAMode(false);
        setDisable2FAOtp('');
        onToast('success', '2-Step Email OTP Verification enabled for Admin Panel!');
        await loadSummary();
      } finally {
        setToggling2FA(false);
      }
    } else {
      // Disabling 2FA requires Owner Email OTP verification first
      setToggling2FA(true);
      try {
        const otpRes = await sendAdminPinResetOtp('toggle_2fa');
        if (!otpRes.success) {
          if (otpRes.retryAfterSec) setDisable2FACooldown(otpRes.retryAfterSec);
          onToast('error', otpRes.message);
          return;
        }
        setDisable2FAMode(true);
        setDisable2FAOtp('');
        setDisable2FACooldown(30);
        setDisable2FAInfo(
          otpRes.simulated && otpRes.devOtp
            ? `Simulation Mode: Code is ${otpRes.devOtp}`
            : `Enter the 6-digit code sent to Owner Email (${otpRes.maskedOwnerEmail || summary.maskedOwnerEmail}) to turn OFF 2-Step Verification.`
        );
        onToast('success', 'Verification code sent to Owner Email.');
      } finally {
        setToggling2FA(false);
      }
    }
  };

  const handleConfirmDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = disable2FAOtp.replace(/[^0-9]/g, '').trim();
    if (cleanOtp.length !== 6) {
      onToast('error', 'Enter the exact 6-digit verification code from Owner Email.');
      return;
    }
    setToggling2FA(true);
    try {
      const res = await toggleAdminTwoStepVerification({ enabled: false, otp: cleanOtp });
      if (!res.success) {
        onToast('error', res.message);
        return;
      }
      setDisable2FAMode(false);
      setDisable2FAOtp('');
      setDisable2FAInfo('');
      onToast('success', res.message);
      await loadSummary();
    } finally {
      setToggling2FA(false);
    }
  };

  const formatIst = (iso: string | null) => {
    if (!iso) return 'Not recorded yet';
    try {
      return new Date(iso).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      {/* TOP SECURITY OVERVIEW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              2-Step Verification
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                summary?.twoStepEnabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {summary?.twoStepEnabled ? 'ACTIVE (PROTECTED)' : 'PIN ONLY'}
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {summary?.twoStepEnabled
              ? 'Every Admin login requires Master PIN + 6-digit Owner Email code.'
              : 'Enable 2-Step Verification so even if someone learns your PIN, they cannot enter without your Gmail code.'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              3-Strike Auto Lockout
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF4EB] text-[#FF7900] border border-[#FFD8B8]">
              ALWAYS ON
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            After <strong>3 wrong PIN attempts</strong>, Admin Hub locks automatically and requires Owner Email 6-digit verification to create a new PIN.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Owner Recovery Email
            </span>
            <Mail className="w-4 h-4 text-[#FF7900]" />
          </div>
          <p className="font-mono text-sm font-bold text-[#071B35]">
            {loading ? 'Loading...' : summary?.maskedOwnerEmail || 'Configured via Hostinger SMTP'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Last PIN update: {formatIst(summary?.pinUpdatedAt || null)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 1: CHANGE ADMIN PIN FROM DASHBOARD (REQUIRES OWNER EMAIL OTP) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#071B35] text-[#FF7900] flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#071B35]">Change Admin Master PIN</h2>
                <p className="text-xs text-slate-500">
                  Update your Admin PIN securely using a 6-digit verification code sent to Owner Email.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPins((v) => !v)}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              title={showPins ? 'Hide PINs' : 'Show PINs'}
            >
              {showPins ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FFF8F1] border border-[#FFD8B8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-[#071B35]">
              <div className="font-bold">Step 1: Verify Owner Email</div>
              <div className="text-slate-600 mt-0.5">
                {pinOtpInfo || 'Request a 6-digit code to your Owner Email before changing PIN.'}
              </div>
            </div>
            <button
              type="button"
              onClick={handleSendChangePinOtp}
              disabled={sendingPinOtp || pinOtpCooldown > 0}
              className="px-4 py-2 rounded-xl bg-[#071B35] hover:bg-[#0D274A] disabled:opacity-50 text-white text-xs font-bold whitespace-nowrap cursor-pointer shrink-0"
            >
              {sendingPinOtp
                ? 'Sending...'
                : pinOtpCooldown > 0
                ? `Resend in ${pinOtpCooldown}s`
                : pinOtpSent
                ? 'Resend 6-Digit Code'
                : 'Send Email Code'}
            </button>
          </div>

          <form onSubmit={handleChangePinSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Current Admin PIN *
                </label>
                <input
                  type={showPins ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={8}
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                  placeholder="Enter current PIN"
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#FF7900] focus:bg-white rounded-xl px-3.5 py-2.5 text-sm font-mono text-[#071B35] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  6-Digit Owner Email Code *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={changePinOtp}
                  onChange={(e) => setChangePinOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="• • • • • •"
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#FF7900] focus:bg-white rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold tracking-[0.25em] text-[#071B35] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  New PIN (4–8 Digits) *
                </label>
                <input
                  type={showPins ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={8}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                  placeholder="e.g. 682491"
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#FF7900] focus:bg-white rounded-xl px-3.5 py-2.5 text-sm font-mono text-[#071B35] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Confirm New PIN *
                </label>
                <input
                  type={showPins ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={8}
                  value={confirmNewPin}
                  onChange={(e) => setConfirmNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                  placeholder="Re-enter new PIN"
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#FF7900] focus:bg-white rounded-xl px-3.5 py-2.5 text-sm font-mono text-[#071B35] outline-none"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Avoid simple PINs like 1234, 0000, 1111, or 9999. Use a unique 4–8 digit PIN known only to the owner.
            </p>

            <button
              type="submit"
              disabled={savingNewPin || changePinOtp.length !== 6 || newPin.length < 4}
              className="w-full bg-[#FF7900] hover:bg-[#e56d00] disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>{savingNewPin ? 'Updating Admin PIN...' : 'Verify Code & Update Admin PIN'}</span>
            </button>
          </form>
        </div>

        {/* CARD 2: TWO-STEP VERIFICATION CONTROL + SECURITY AUDIT LOG */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    summary?.twoStepEnabled
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-amber-50 text-amber-600 border border-amber-200'
                  }`}
                >
                  {summary?.twoStepEnabled ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#071B35]">
                    Two-Step Verification (Email OTP)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Require a fresh 6-digit code sent to Owner Email every time someone logs into Admin Hub.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-[#071B35]">
                  {summary?.twoStepEnabled
                    ? '2-Step Verification is ON (Recommended)'
                    : '2-Step Verification is OFF'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {summary?.twoStepEnabled
                    ? 'PIN + Owner Email 6-digit code required on every login.'
                    : 'Only Master PIN is required (3-wrong-PIN lockout still active).'}
                </div>
              </div>
              <button
                type="button"
                disabled={toggling2FA || loading}
                onClick={handleToggle2FAClick}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-colors disabled:opacity-50 ${
                  summary?.twoStepEnabled
                    ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {toggling2FA
                  ? 'Please wait...'
                  : summary?.twoStepEnabled
                  ? 'Turn OFF'
                  : 'Enable 2-Step'}
              </button>
            </div>

            {disable2FAMode && summary?.twoStepEnabled && (
              <form
                onSubmit={handleConfirmDisable2FA}
                className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3"
              >
                <div className="flex items-start gap-2 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{disable2FAInfo}</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={disable2FAOtp}
                    onChange={(e) => setDisable2FAOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    required
                    className="flex-1 bg-white border border-amber-300 rounded-xl px-3 py-2 text-sm font-mono font-bold tracking-[0.25em] text-[#071B35] outline-none"
                  />
                  <button
                    type="submit"
                    disabled={toggling2FA || disable2FAOtp.length !== 6}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                  >
                    Confirm Turn OFF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDisable2FAMode(false);
                      setDisable2FAOtp('');
                    }}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* RECENT SECURITY AUDIT LOG */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#FF7900]" />
                <h3 className="text-sm font-bold text-[#071B35]">Recent Admin Security Activity</h3>
              </div>
              <button
                type="button"
                onClick={() => void loadSummary()}
                className="text-xs font-semibold text-slate-500 hover:text-[#071B35] inline-flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {summary?.recentEvents && summary.recentEvents.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {summary.recentEvents.map((ev, idx) => (
                  <div
                    key={`${ev.at}-${idx}`}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-2 text-xs"
                  >
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#FF7900] shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-[#071B35]">{ev.event}</div>
                        <div className="text-[11px] text-slate-500">{ev.detail}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap shrink-0">
                      {formatIst(ev.at)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-3">
                Security events (logins, wrong PIN alerts, PIN updates, and 2FA changes) will appear here.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
