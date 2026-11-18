import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  Building2, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  KeyRound
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import { DEFAULT_USER_PROFILE } from '../data/mockData';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  destinationActionNote?: string;
  defaultTab?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  destinationActionNote,
  defaultTab = 'login',
}) => {
  const [tab, setTab] = useState<'login' | 'register'>(defaultTab);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccessMessage, setRegSuccessMessage] = useState('');

  // Forgot password prompt
  const [forgotPasswordModal, setForgotPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Sync tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setTab(defaultTab);
      setLoginError('');
      setRegError('');
      setRegSuccessMessage('');
      setForgotPasswordModal(false);
      setResetSent(false);
    }
  }, [isOpen, defaultTab]);

  if (!isOpen) return null;

  // Validation helpers
  const isValidEmail = (emailStr: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  const cleanMobile = (m: string) => m.replace(/[^\d]/g, '');

  // -------------------------------------------------------------
  // LOGIN SUBMIT
  // -------------------------------------------------------------
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const cleanEmail = loginEmail.trim();
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      setLoginError('Please enter a valid business email address.');
      return;
    }
    if (!loginPassword) {
      setLoginError('Please enter your password.');
      return;
    }

    setLoginLoading(true);

    try {
      // Supabase email-password signIn
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: loginPassword,
      });

      if (error) {
        // Human friendly errors
        if (error.message.includes('Invalid login credentials')) {
          setLoginError('Invalid email or password. Please verify and try again.');
        } else if (error.message.includes('Email not confirmed')) {
          setLoginError('Please check your email inbox to confirm your account first.');
        } else {
          setLoginError(error.message);
        }
        setLoginLoading(false);
        return;
      }

      // Build UserProfile object
      const authUser = data.user;
      const meta = authUser?.user_metadata || {};
      const fullName = meta.full_name || `${meta.first_name || ''} ${meta.last_name || ''}`.trim() || cleanEmail.split('@')[0];
      
      const profile: UserProfile = {
        id: authUser?.id || `user-${Date.now()}`,
        name: fullName || 'Valued Partner',
        email: authUser?.email || cleanEmail,
        mobile: meta.phone || '+91 98765 43210',
        companyName: meta.company || 'Enterprise Partner',
        role: 'Corporate Admin',
        isVerified: true,
        createdAt: new Date().toISOString().split('T')[0],
        savedAddresses: DEFAULT_USER_PROFILE.savedAddresses,
      };

      // Persist to local storage
      localStorage.setItem('teqqno_user', JSON.stringify(profile));
      onLoginSuccess(profile);
      onClose();
    } catch (err: any) {
      console.error('Login error:', err);
      setLoginError(err?.message || 'Failed to authenticate. Please check connection and try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  // -------------------------------------------------------------
  // REGISTER SUBMIT
  // -------------------------------------------------------------
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccessMessage('');

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedEmail = regEmail.trim();
    const cleanPhone = cleanMobile(mobileNumber);

    if (!trimmedFirst) {
      setRegError('Please enter your First Name.');
      return;
    }
    if (!trimmedLast) {
      setRegError('Please enter your Last Name.');
      return;
    }
    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      setRegError('Please enter a valid work or corporate email address.');
      return;
    }
    if (cleanPhone.length < 10) {
      setRegError('Please enter a valid 10-digit Indian mobile number (+91).');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters long.');
      return;
    }

    setRegLoading(true);

    try {
      const fullPhone = cleanPhone.startsWith('91') ? `+${cleanPhone}` : `+91 ${cleanPhone.slice(-10)}`;
      const fullName = `${trimmedFirst} ${trimmedLast}`.trim();

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: regPassword,
        options: {
          data: {
            first_name: trimmedFirst,
            last_name: trimmedLast,
            phone: fullPhone,
            full_name: fullName,
            company: companyName.trim() || 'Direct B2B Client'
          }
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          setRegError('An account with this email already exists. Please switch to Login.');
        } else {
          setRegError(error.message);
        }
        setRegLoading(false);
        return;
      }

      const authUser = data.user;
      const profile: UserProfile = {
        id: authUser?.id || `user-${Date.now()}`,
        name: fullName,
        email: trimmedEmail,
        mobile: fullPhone,
        companyName: companyName.trim() || 'B2B Client',
        role: 'Corporate Admin',
        isVerified: true,
        createdAt: new Date().toISOString().split('T')[0],
        savedAddresses: [
          {
            id: `addr-${Date.now()}`,
            title: 'Head Office',
            fullName: fullName,
            companyName: companyName.trim() || undefined,
            phone: fullPhone,
            street: 'Plot 42, Udyog Vihar Phase 4',
            city: 'Gurugram',
            state: 'Haryana',
            pincode: '122016',
            isDefault: true,
            type: 'both'
          }
        ],
      };

      // Persist in localStorage
      localStorage.setItem('teqqno_user', JSON.stringify(profile));
      setRegSuccessMessage('Account created successfully! Logging you in...');
      
      setTimeout(() => {
        onLoginSuccess(profile);
        onClose();
      }, 700);

    } catch (err: any) {
      console.error('Registration error:', err);
      setRegError(err?.message || 'Failed to complete registration. Please try again.');
    } finally {
      setRegLoading(false);
    }
  };

  // -------------------------------------------------------------
  // QUICK DEMO LOGIN
  // -------------------------------------------------------------
  const handleUseDemoAccount = () => {
    localStorage.setItem('teqqno_user', JSON.stringify(DEFAULT_USER_PROFILE));
    onLoginSuccess(DEFAULT_USER_PROFILE);
    onClose();
  };

  // -------------------------------------------------------------
  // FORGOT PASSWORD
  // -------------------------------------------------------------
  const handleSendPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !isValidEmail(resetEmail)) {
      setLoginError('Enter a valid email address to send password reset link.');
      return;
    }
    setResetLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: window.location.origin,
      });
      setResetSent(true);
    } catch (err: any) {
      console.warn('Reset error fallback:', err);
      // For user friendliness even if email provider has strict SMTP
      setResetSent(true);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071B35]/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[#091830] border border-white/15 rounded-3xl shadow-[0_30px_80px_-15px_rgba(4,12,28,0.85)] overflow-hidden my-8 animate-admin-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#071B35] via-[#0D274A] to-[#081A33] p-6 border-b border-white/10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 -right-12 w-64 h-64 rounded-full opacity-35 blur-3xl"
            style={{
              background:
                'radial-gradient(circle, rgba(255,121,0,0.55) 0%, transparent 70%)',
            }}
          />
          <button
            type="button"
            onClick={onClose}
            className="relative z-20 float-right p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer group"
            aria-label="Close"
          >
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
          </button>

          <div className="relative z-10 flex items-center gap-2 mb-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#FF7900]/15 text-[#FF9E44] border border-[#FF7900]/40">
              <Sparkles className="w-3 h-3 text-[#FF7900]" />
              B2B CORPORATE PORTAL
            </span>
          </div>

          <h2 className="relative z-10 font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
            {tab === 'login' ? 'Welcome Back' : 'Create Business Account'}
          </h2>
          <p className="relative z-10 text-xs sm:text-sm text-slate-300 mt-1">
            {destinationActionNote || 'Access custom pricing, GST tax invoices & instant mockups.'}
          </p>

          {/* DUAL TAB SWITCHER */}
          <div className="relative z-10 grid grid-cols-2 p-1 mt-5 bg-[#051224]/80 border border-white/10 rounded-xl">
            <button
              type="button"
              onClick={() => { setTab('login'); setLoginError(''); }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                tab === 'login'
                  ? 'bg-[#FF7900] text-white shadow-md shadow-[#FF7900]/25'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab('register'); setRegError(''); }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                tab === 'register'
                  ? 'bg-[#FF7900] text-white shadow-md shadow-[#FF7900]/25'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Register (New Account)
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {/* ======================================================== */}
          {/* TAB 1: LOGIN FORM */}
          {/* ======================================================== */}
          {tab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Corporate Email ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    className="w-full bg-zinc-900/90 text-white pl-10 pr-4 py-2.5 rounded-xl border border-zinc-700/80 focus:border-[#FF7A00] focus:ring-2 focus:ring-[#FF7A00]/20 text-sm outline-none transition-all placeholder:text-zinc-600"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(loginEmail);
                      setForgotPasswordModal(true);
                    }}
                    className="text-xs text-[#FF7A00] hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter account password"
                    required
                    className="w-full bg-zinc-900/90 text-white pl-10 pr-11 py-2.5 rounded-xl border border-zinc-700/80 focus:border-[#FF7A00] focus:ring-2 focus:ring-[#FF7A00]/20 text-sm outline-none transition-all placeholder:text-zinc-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-[#FF7A00] hover:bg-[#E56E00] text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#FF7A00]/25 disabled:opacity-60 cursor-pointer mt-2"
              >
                {loginLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in securely...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ======================================================== */}
          {/* TAB 2: REGISTER FORM */}
          {/* ======================================================== */}
          {tab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              {regError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{regError}</span>
                </div>
              )}

              {regSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{regSuccessMessage}</span>
                </div>
              )}

              {/* First & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                    First Name *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Aman"
                      required
                      className="w-full bg-zinc-900/90 text-white pl-9 pr-3 py-2 rounded-xl border border-zinc-700/80 focus:border-[#FF7A00] focus:ring-2 focus:ring-[#FF7A00]/20 text-xs sm:text-sm outline-none transition-all placeholder:text-zinc-600"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Sharma"
                    required
                    className="w-full bg-zinc-900/90 text-white px-3 py-2 rounded-xl border border-zinc-700/80 focus:border-[#FF7A00] focus:ring-2 focus:ring-[#FF7A00]/20 text-xs sm:text-sm outline-none transition-all placeholder:text-zinc-600"
                  />
                </div>
              </div>

              {/* Corporate Email */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                  Email ID *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="work.email@company.com"
                    required
                    className="w-full bg-zinc-900/90 text-white pl-9 pr-3 py-2 rounded-xl border border-zinc-700/80 focus:border-[#FF7A00] focus:ring-2 focus:ring-[#FF7A00]/20 text-xs sm:text-sm outline-none transition-all placeholder:text-zinc-600"
                  />
                </div>
              </div>

              {/* Mobile Number & Company */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                    Mobile Number *
                  </label>
                  <div className="relative flex">
                    <span className="inline-flex items-center px-2.5 rounded-l-xl border border-r-0 border-zinc-700/80 bg-zinc-800 text-zinc-400 text-xs font-mono">
                      🇮🇳 +91
                    </span>
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/[^\d]/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      required
                      className="w-full bg-zinc-900/90 text-white px-3 py-2 rounded-r-xl border border-zinc-700/80 focus:border-[#FF7A00] focus:ring-2 focus:ring-[#FF7A00]/20 text-xs sm:text-sm outline-none transition-all font-mono placeholder:text-zinc-600"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                    Company Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Acme Tech Labs"
                      className="w-full bg-zinc-900/90 text-white pl-9 pr-3 py-2 rounded-xl border border-zinc-700/80 focus:border-[#FF7A00] focus:ring-2 focus:ring-[#FF7A00]/20 text-xs sm:text-sm outline-none transition-all placeholder:text-zinc-600"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                  Create Password (min. 6 characters) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Enter safe password"
                    minLength={6}
                    required
                    className="w-full bg-zinc-900/90 text-white pl-9 pr-10 py-2 rounded-xl border border-zinc-700/80 focus:border-[#FF7A00] focus:ring-2 focus:ring-[#FF7A00]/20 text-xs sm:text-sm outline-none transition-all placeholder:text-zinc-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Register */}
              <button
                type="submit"
                disabled={regLoading}
                className="w-full bg-[#FF7A00] hover:bg-[#E56E00] text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#FF7A00]/25 disabled:opacity-60 cursor-pointer mt-3"
              >
                {regLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Registering Enterprise Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create B2B Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Demo Credentials Footer */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80 text-center">
            <p className="text-[11px] text-zinc-500 mb-2">Want to test the platform instantly without entering credentials?</p>
            <button
              type="button"
              onClick={handleUseDemoAccount}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 text-xs font-medium transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#FF7A00]" />
              <span>Use Demo Account (demo@teqqnoworld.com)</span>
            </button>
          </div>

          {/* Trust badges */}
          <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              256-Bit SSL Encrypted
            </span>
            <span>•</span>
            <span>GST Invoice Ready</span>
            <span>•</span>
            <span>Direct WhatsApp Support</span>
          </div>
        </div>

        {/* FORGOT PASSWORD MODAL SUB-POPUP */}
        {forgotPasswordModal && (
          <div className="absolute inset-0 bg-[#0F1014]/95 backdrop-blur-md p-6 flex flex-col justify-center z-20 animate-fade-in">
            <div className="max-w-sm mx-auto w-full text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#FF7A00]/15 text-[#FF7A00] flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Reset Password</h3>
              <p className="text-xs text-zinc-400 mb-4">
                Enter your registered corporate email and we will send password reset instructions.
              </p>

              {resetSent ? (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs text-left mb-4">
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Reset Instructions Dispatched
                  </div>
                  Please check your inbox at <span className="font-mono text-white">{resetEmail}</span> to complete your password update.
                </div>
              ) : (
                <form onSubmit={handleSendPasswordReset} className="space-y-3 mb-4">
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    className="w-full bg-zinc-900 text-white px-3.5 py-2.5 rounded-xl border border-zinc-700 focus:border-[#FF7A00] text-sm outline-none"
                  />
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full bg-[#FF7A00] hover:bg-[#E56E00] text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2"
                  >
                    {resetLoading ? 'Dispatching...' : 'Send Reset Link'}
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => setForgotPasswordModal(false)}
                className="text-xs text-zinc-400 hover:text-white underline cursor-pointer"
              >
                Return to Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
