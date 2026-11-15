import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  Building, 
  Video, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  Database, 
  Copy, 
  Check, 
  ExternalLink,
  Sparkles,
  ShieldCheck,
  CalendarCheck2
} from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import { 
  saveAppointmentToSupabase, 
  AppointmentBookingData, 
  RECOMMENDED_SUPABASE_SQL, 
  SUPABASE_PROJECT_ID 
} from '../lib/supabase';
import { BUSINESS_CONFIG } from '../config/business';

export const AppointmentSection: React.FC = () => {
  const getTomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(getTomorrowDate());
  const [appointmentTime, setAppointmentTime] = useState('11:00 AM');
  const [serviceType, setServiceType] = useState('Corporate Apparel Consultation (Polo / Hoodies)');
  const [meetingMode, setMeetingMode] = useState('Google Meet Video Call');
  const [estimatedQuantity, setEstimatedQuantity] = useState<number | ''>(100);
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedTable, setSavedTable] = useState<string | null>(null);
  const [needsSqlSetup, setNeedsSqlSetup] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [bookingRef, setBookingRef] = useState('');

  const handleCopySql = () => {
    navigator.clipboard.writeText(RECOMMENDED_SUPABASE_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setNeedsSqlSetup(false);

    if (!name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid work or personal email address.');
      return;
    }
    if (!phone.trim() || phone.replace(/[^0-9]/g, '').length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsSubmitting(true);
    const ref = `APT-${Math.floor(100000 + Math.random() * 900000)}`;
    setBookingRef(ref);

    const bookingData: AppointmentBookingData = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      company: company.trim() || undefined,
      appointmentDate,
      appointmentTime,
      serviceType,
      meetingMode,
      estimatedQuantity: estimatedQuantity ? Number(estimatedQuantity) : undefined,
      notes: notes.trim() || undefined,
    };

    try {
      const stored = JSON.parse(localStorage.getItem('teqqno_appointments') || '[]');
      stored.unshift({ ...bookingData, refCode: ref, createdAt: new Date().toISOString() });
      localStorage.setItem('teqqno_appointments', JSON.stringify(stored));
    } catch (e) {
      console.warn(e);
    }

    try {
      const result = await saveAppointmentToSupabase(bookingData);
      if (result.success) {
        setSavedTable(result.tableUsed || 'appointments');
        setIsSuccess(true);
      } else {
        if (result.needsTableCreation) {
          setNeedsSqlSetup(true);
          setIsSuccess(true);
        } else {
          setErrorMsg(result.error || 'Failed to save to Supabase backend.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error connecting to Supabase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setName('');
    setEmail('');
    setPhone('');
    setCompany('');
    setNotes('');
    setIsSuccess(false);
    setNeedsSqlSetup(false);
    setErrorMsg('');
  };

  return (
    <section id="book-appointment" className="py-20 bg-[#0F1015] text-white border-b border-[#25262F] relative overflow-hidden">
      {/* Ambient background light */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[650px] h-[400px] bg-[#FF7A00]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1A1B23] border border-[#2B2D38] text-[11px] font-mono font-semibold uppercase tracking-wider text-[#FF7A00]">
            <CalendarCheck2 className="w-3.5 h-3.5 text-[#FF7A00]" />
            <span>Dedicated Consultation & Sample Review</span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
            Book an Appointment with Our Merchandising Specialists
          </h2>

          <p className="text-zinc-300 text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed">
            Discuss fabric quality, Pantones, custom packaging, and bulk wholesale volume pricing. Direct slot confirmation synced to Supabase database.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Value Proposition & Supabase Status Badge */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#171821] border border-[#272936] rounded-2xl p-6 space-y-5">
              <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#FF7A00]" />
                <span>What Happens During Your Appointment?</span>
              </h3>

              <div className="space-y-4 text-xs sm:text-sm text-zinc-300">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FF7A00]/20 text-[#FF7A00] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <strong className="text-white block">Pre-Press Proof Review</strong>
                    Free digital 3D mockup evaluation of your vector logos, embroidery punch files, and print placement.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FF7A00]/20 text-[#FF7A00] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <strong className="text-white block">Physical Fabric Swatches</strong>
                    Select exact GSM (200, 240, 260 GSM pique, Coolmax dry-fit, or 320 GSM fleece) with courier swatch kits.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FF7A00]/20 text-[#FF7A00] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <strong className="text-white block">Volume Pricing & GST Rebate</strong>
                    Instant factory quotation with GST ITC tax invoices and multi-branch delivery scheduling.
                  </div>
                </div>
              </div>

              {/* Supabase Connected Badge */}
              <div className="pt-4 border-t border-[#272936] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-zinc-300 font-medium">Supabase Backend:</span>
                </div>
                <span className="font-mono text-emerald-400 font-semibold text-[11px] bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                  {SUPABASE_PROJECT_ID}
                </span>
              </div>
            </div>

            {/* Quick Contact Card */}
            <div className="bg-[#171821]/60 border border-[#272936] rounded-2xl p-5 text-xs text-zinc-400 space-y-2">
              <div className="text-white font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#FF7A00]" />
                <span>Zero Commitment Guarantee</span>
              </div>
              <p>
                All design consultations and digital mockup proofs are 100% complimentary. No payment required to book an appointment.
              </p>
            </div>
          </div>

          {/* Right Column: Appointment Booking Form Card */}
          <div className="lg:col-span-7">
            <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/20">
              
              <div className="border-b border-zinc-100 pb-4 mb-6">
                <h3 className="font-display font-bold text-xl text-slate-900">
                  Book Your Appointment Slot
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Submissions are stored directly in your Supabase backend database table.
                </p>
              </div>

              {isSuccess ? (
                <div className="py-6 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                      Reference ID
                    </span>
                    <div className="text-2xl font-black text-slate-900 font-mono">
                      {bookingRef}
                    </div>
                    <h4 className="font-display font-bold text-lg text-slate-900 mt-1">
                      Appointment Successfully Booked!
                    </h4>
                    <p className="text-xs text-zinc-600 max-w-md mx-auto mt-1">
                      Thank you, <strong>{name}</strong>! Your consultation is scheduled for <strong>{appointmentDate}</strong> at <strong>{appointmentTime}</strong> via <strong>{meetingMode}</strong>.
                    </p>
                  </div>

                  {savedTable && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-left max-w-md mx-auto flex items-center gap-2.5">
                      <Database className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-emerald-900">
                        Record saved to Supabase table <strong>public.{savedTable}</strong> ({SUPABASE_PROJECT_ID}).
                      </span>
                    </div>
                  )}

                  {needsSqlSetup && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left max-w-md mx-auto space-y-2.5 text-xs">
                      <div className="font-bold text-amber-900 flex items-center gap-2">
                        <Database className="w-4 h-4 text-amber-600" />
                        <span>Supabase Table Setup</span>
                      </div>
                      <p className="text-amber-800">
                        The appointment was captured! Run this SQL in your Supabase SQL Editor to initialize the <code>appointments</code> table:
                      </p>
                      <div className="bg-slate-900 text-zinc-200 p-2.5 rounded-lg text-[10px] font-mono overflow-x-auto max-h-28">
                        <pre>{RECOMMENDED_SUPABASE_SQL}</pre>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopySql}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSql ? 'Copied!' : 'Copy SQL'}</span>
                      </button>
                    </div>
                  )}

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a
                      href={`https://wa.me/${BUSINESS_CONFIG.contact.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `Hi TeqqnoWorld, I scheduled an appointment [${bookingRef}] for ${appointmentDate} at ${appointmentTime} (${meetingMode}). Name: ${name}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 rounded-xl bg-[#25D366] text-white font-semibold text-xs flex items-center gap-2"
                    >
                      <WhatsAppIcon className="w-4 h-4 text-white" />
                      <span>Ping on WhatsApp</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-4 py-2.5 rounded-xl border border-zinc-300 text-zinc-700 font-medium text-xs hover:bg-zinc-50 cursor-pointer"
                    >
                      Book Another
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 focus:outline-hidden focus:border-[#FF7A00] focus:bg-white min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Work / Personal Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="rahul@company.in"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 focus:outline-hidden focus:border-[#FF7A00] focus:bg-white min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Phone / WhatsApp <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 focus:outline-hidden focus:border-[#FF7A00] focus:bg-white min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Company Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="e.g. Tata Consultancy Services"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 focus:outline-hidden focus:border-[#FF7A00] focus:bg-white min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#FF7A00]" />
                        <span>Date</span> <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        min={new Date().toISOString().split('T')[0]}
                        value={appointmentDate}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 focus:outline-hidden focus:border-[#FF7A00] focus:bg-white min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#FF7A00]" />
                        <span>Time Slot</span> <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={appointmentTime}
                        onChange={(e) => setAppointmentTime(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 focus:outline-hidden focus:border-[#FF7A00] focus:bg-white min-h-[44px]"
                      >
                        <option value="10:00 AM">10:00 AM (IST)</option>
                        <option value="11:30 AM">11:30 AM (IST)</option>
                        <option value="02:00 PM">02:00 PM (IST)</option>
                        <option value="03:30 PM">03:30 PM (IST)</option>
                        <option value="05:00 PM">05:00 PM (IST)</option>
                        <option value="06:30 PM">06:30 PM (IST)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Meeting Mode
                      </label>
                      <select
                        value={meetingMode}
                        onChange={(e) => setMeetingMode(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 focus:outline-hidden focus:border-[#FF7A00] focus:bg-white min-h-[44px]"
                      >
                        <option value="Google Meet Video Call">Google Meet Video Call</option>
                        <option value="Direct Phone Call">Direct Phone Call</option>
                        <option value="WhatsApp Video">WhatsApp Video</option>
                        <option value="Studio / Factory Visit">Factory / Prepress Visit (Hyderabad)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Consultation Subject
                      </label>
                      <select
                        value={serviceType}
                        onChange={(e) => setServiceType(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 focus:outline-hidden focus:border-[#FF7A00] focus:bg-white min-h-[44px]"
                      >
                        <option value="Corporate Apparel Consultation (Polo / Hoodies)">Corporate Apparel (Polo / Hoodies)</option>
                        <option value="Bulk Merchandise & Physical Swatch Review">Bulk Merchandise & Swatches</option>
                        <option value="Pre-Press Logo Proofing & Color Matching">Pre-Press Logo Proofing</option>
                        <option value="Corporate Welcome Hampers & Gift Sets">Corporate Gift Hampers</option>
                        <option value="Event Displays (Canopy, Promo Tables & Standees)">Event Displays & Signage</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Additional Notes or Project Questions (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Quantity estimate is 200 polos for annual retreat. Need white collar tipping."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 focus:outline-hidden focus:border-[#FF7A00] focus:bg-white"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-[#FF7A00] hover:bg-[#e06c00] active:scale-98 text-white font-display font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-[#FF7A00]/25 transition-all text-xs sm:text-sm flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-75 min-h-[48px]"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Saving to Supabase Database...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          <span>Confirm & Book Appointment</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
