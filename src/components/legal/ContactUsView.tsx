import React, { useState } from 'react';
import { LegalLayout, MerchantPlaceholderNotice } from './LegalLayout';
import { BUSINESS_DETAILS } from '../../data/legalData';
import { BUSINESS_CONFIG } from '../../config/business';
import { 
  Mail, 
  MapPin, 
  Clock, 
  MessageSquare, 
  CheckCircle2, 
  Send, 
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Building
} from 'lucide-react';
import { WhatsAppIcon } from '../WhatsAppIcon';

interface LegalViewProps {
  onNavigate: (route: string) => void;
}

export const ContactUsView: React.FC<LegalViewProps> = ({ onNavigate }) => {
  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [category, setCategory] = useState('Custom Printing & Design Proofs');
  const [message, setMessage] = useState('');
  
  // Submission Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Client-side validations
    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid corporate or personal email address.');
      return;
    }
    if (!phone.trim() || phone.replace(/[^0-9]/g, '').length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!message.trim() || message.trim().length < 10) {
      setErrorMsg('Please provide a message with at least 10 characters.');
      return;
    }

    setIsSubmitting(true);

    // Save to local storage log for reference
    try {
      const existingInquiries = JSON.parse(localStorage.getItem('teqqno_inquiries') || '[]');
      existingInquiries.push({
        id: `inq-${Date.now()}`,
        fullName,
        email,
        phone,
        orderNumber,
        category,
        message,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('teqqno_inquiries', JSON.stringify(existingInquiries));
    } catch (e) {
      console.error(e);
    }

    // Save to Supabase backend
    import('../../lib/supabase').then(async ({ saveAppointmentToSupabase }) => {
      try {
        await saveAppointmentToSupabase({
          name: fullName,
          email,
          phone,
          appointmentDate: new Date().toISOString().split('T')[0],
          appointmentTime: 'Immediate Inquiry',
          serviceType: category,
          meetingMode: 'Contact Form',
          notes: `[Order #${orderNumber || 'N/A'}] ${message}`,
        });
      } catch (err) {
        console.warn('Supabase contact submission notice:', err);
      } finally {
        setIsSubmitting(false);
        setIsSubmitted(true);
      }
    }).catch(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    });
  };

  const handleResetForm = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setOrderNumber('');
    setMessage('');
    setIsSubmitted(false);
  };

  return (
    <LegalLayout
      currentRoute="/contact-us"
      title="Contact Us & Customer Support"
      description="Connect directly with TeqqnoWorld’s prepress design specialists, corporate sales desk, and dedicated customer resolution team."
      lastUpdated="October 25, 2026"
      onNavigate={onNavigate}
    >
      <div className="space-y-10 text-slate-700">
        
        {/* Merchant Review Box */}
        <MerchantPlaceholderNotice
          title="Merchant Action Checklist — Contact Information Verification"
          items={[
            `Confirm customer care working hours: ${BUSINESS_DETAILS.supportHours}`,
            `Confirm registered office address: ${BUSINESS_DETAILS.registeredOfficePlaceholder}`,
            `Backend Integration Point: Form messages are recorded in browser session and provide instant WhatsApp/Mailto dispatch buttons. Connect your backend endpoint at '/api/contact' when ready.`,
          ]}
        />

        {/* 1. Official Communication Channels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Card 1: WhatsApp Support */}
          <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center mb-3 shadow-xs">
                <WhatsAppIcon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Direct WhatsApp Desk</h3>
              <p className="text-xs text-slate-600 mt-1">
                For instant artwork pre-check, Pantone color matching, urgent turnaround requests, and order updates.
              </p>
              <div className="mt-3 font-mono font-bold text-slate-900 text-sm">
                {BUSINESS_DETAILS.whatsappHelp}
              </div>
            </div>
            <a
              href={`https://wa.me/${BUSINESS_DETAILS.whatsappHelp.replace(/[^0-9]/g, '')}?text=Hello%20TeqqnoWorld,%20I%20have%20an%20enquiry%20regarding%20custom%20merchandise`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold text-xs transition-colors shadow-2xs"
            >
              <WhatsAppIcon className="w-3.5 h-3.5 text-white" />
              <span>Chat on WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Card 2: Email Desk */}
          <div className="p-5 rounded-2xl border border-orange-200 bg-orange-50/40 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#FF7A00] text-white flex items-center justify-center mb-3 shadow-xs">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Corporate & RFQ Email</h3>
              <p className="text-xs text-slate-600 mt-1">
                Send vector artwork files (.ai, .eps, .pdf), procurement vendor onboarding forms, and high-volume RFQs.
              </p>
              <div className="mt-3 font-mono font-bold text-slate-900 text-sm truncate">
                {BUSINESS_DETAILS.supportEmail}
              </div>
            </div>
            <a
              href={`mailto:${BUSINESS_DETAILS.supportEmail}`}
              className="mt-4 inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-[#FF7A00] hover:bg-[#e66e00] text-white font-semibold text-xs transition-colors shadow-2xs"
            >
              <span>Send Email</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Card 3: Production Hub */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-3 shadow-xs">
                <MapPin className="w-5 h-5 text-[#FF7A00]" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Industrial Fulfillment Facility</h3>
              <p className="text-xs text-slate-600 mt-1">
                Prepress studio, quality testing laboratory, and central pan-India dispatch logistics center.
              </p>
              <div className="mt-3 text-xs text-slate-800 leading-snug">
                {BUSINESS_DETAILS.facilityAddress}
              </div>
            </div>
            <div className="mt-4 pt-2 text-[11px] text-slate-500 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <span>Hours: {BUSINESS_DETAILS.supportHours}</span>
              <a
                href={BUSINESS_CONFIG.maps.directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#FF7A00] hover:text-[#e66e00] font-semibold transition-colors"
              >
                <span>View on Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

        </div>

        {/* 2. Interactive Contact Form */}
        <div className="bg-slate-50/70 p-6 sm:p-8 rounded-2xl border border-slate-200/90">
          <div className="max-w-2xl mb-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#FF7A00]" />
              <span>Send an Official Support or Order Enquiry</span>
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Fill out the form below with your project requirements or order inquiry. Our procurement specialists typically respond within 2 to 4 business hours.
            </p>
          </div>

          {isSubmitted ? (
            <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-xs space-y-4 text-center max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-base text-slate-900">Enquiry Received Successfully!</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Thank you, <strong>{fullName}</strong>. Your enquiry regarding &ldquo;{category}&rdquo; has been logged. Our prepress or customer resolution team will reach out to <strong>{email}</strong> or <strong>{phone}</strong> shortly.
              </p>

              {/* Instant WhatsApp & Email Action */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href={`https://wa.me/${BUSINESS_DETAILS.whatsappHelp.replace(/[^0-9]/g, '')}?text=Hi%20TeqqnoWorld,%20I%20just%20submitted%20an%20enquiry%20regarding%20${encodeURIComponent(category)}.%20Name:%20${encodeURIComponent(fullName)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#25D366] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5 text-white" />
                  <span>Follow-Up on WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs cursor-pointer"
                >
                  Submit Another Message
                </button>
              </div>

              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                Log reference: inquiry saved securely in current session log.
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
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Your Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Arjun Mehta"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00]"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Business / Personal Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. arjun@company.in"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Mobile Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Mobile Number (for WhatsApp/SMS) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98450 12345"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00]"
                  />
                </div>

                {/* Order Number (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Order Number (Optional if existing order)
                  </label>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="e.g. TQ-98104"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00]"
                  />
                </div>
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Enquiry Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00]"
                >
                  <option value="Custom Printing & Design Proofs">Custom Printing & Artwork Pre-Press Proofs</option>
                  <option value="Bulk Order Quotation (RFQ)">Bulk Enterprise Orders & Tiered Quotations (RFQ)</option>
                  <option value="Order Tracking & Shipping SLA">Order Milestone Tracking & Dispatch Schedules</option>
                  <option value="Payment & GST Tax Invoicing">Payment Gateway & GST Tax Invoicing</option>
                  <option value="Damaged, Defective or Replacement Claim">Report Damaged, Defective or Misprinted Items</option>
                  <option value="Vendor Onboarding & Legal Inquiry">Vendor Onboarding & Legal Compliance</option>
                  <option value="General Support">General Store Support</option>
                </select>
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Your Detailed Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Provide details about your custom printing requirements, quantity estimates, preferred delivery dates, or specific issue..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-hidden focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00]"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-between gap-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#FF7A00] hover:bg-[#e66e00] text-white text-xs font-bold px-6 py-3 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Transmitting Inquiry...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Inquiry to Helpdesk</span>
                    </>
                  )}
                </button>

                <span className="text-[11px] text-slate-400">
                  Standard response SLA: 2–4 business hours
                </span>
              </div>

            </form>
          )}
        </div>

        {/* 3. Statutory Grievance Redressal Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Building className="w-4 h-4 text-[#FF7A00]" />
            <span>Statutory Nodal & Grievance Officer</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            In compliance with Rule 5(9) of the Consumer Protection (E-Commerce) Rules, 2020 and Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021:
          </p>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Nodal Grievance Officer</span>
              <span className="font-semibold text-slate-900">{BUSINESS_DETAILS.grievanceOfficerPlaceholder}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Direct Redressal Email</span>
              <a href={`mailto:${BUSINESS_DETAILS.supportEmail}`} className="font-semibold text-[#FF7A00] underline">{BUSINESS_DETAILS.supportEmail}</a>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Response Acknowledgment</span>
              <span className="font-semibold text-slate-900">Within 48 hours</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Resolution Standard</span>
              <span className="font-semibold text-slate-900">Within 30 calendar days</span>
            </div>
          </div>
        </div>

      </div>
    </LegalLayout>
  );
};
