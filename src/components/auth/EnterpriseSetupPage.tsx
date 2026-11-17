import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Building2,
  ShieldCheck,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  GraduationCap,
} from 'lucide-react';

const CURRENCY_OPTIONS = [
  { symbol: '$', label: 'USD ($)' },
  { symbol: '€', label: 'EUR (€)' },
  { symbol: '£', label: 'GBP (£)' },
  { symbol: '₦', label: 'NGN (₦)' },
  { symbol: '₵', label: 'GHS (₵)' },
  { symbol: 'KSh', label: 'KES (KSh)' },
  { symbol: 'R', label: 'ZAR (R)' },
  { symbol: '₹', label: 'INR (₹)' },
];

export const EnterpriseSetupPage: React.FC = () => {
  const { completeEnterpriseSetup } = useAuth();
  const toast = useToast();

  const [schoolName, setSchoolName] = useState('');
  const [institutionEmail, setInstitutionEmail] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [tagline, setTagline] = useState('');

  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!schoolName.trim()) {
      toast.error('Institution Name Required', 'Please enter the name of your school or organization.');
      return;
    }
    if (!adminFullName.trim()) {
      toast.error('Administrator Name Required', 'Please enter the Super Administrator full name.');
      return;
    }
    if (!adminEmail.trim() || !adminEmail.includes('@')) {
      toast.error('Valid Email Required', 'Please enter a valid Super Administrator email address.');
      return;
    }
    if (!adminPassword || adminPassword.length < 6) {
      toast.error('Password Too Short', 'Password must be at least 6 characters long.');
      return;
    }
    if (adminPassword !== confirmPassword) {
      toast.error('Password Mismatch', 'Password and confirmation password do not match.');
      return;
    }

    setSubmitting(true);
    const res = await completeEnterpriseSetup({
      schoolName: schoolName.trim(),
      email: institutionEmail.trim() || adminEmail.trim(),
      currencySymbol,
      tagline: tagline.trim(),
      motto: tagline.trim(),
      adminFullName: adminFullName.trim(),
      adminEmail: adminEmail.trim(),
      adminPassword,
    });
    setSubmitting(false);

    if (!res.success) {
      toast.error('Setup Failed', res.error || 'Could not initialize institution workspace.');
    } else {
      toast.success(
        'Workspace Ready',
        `${schoolName.trim()} has been initialized. You are signed in as Super Administrator.`
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 font-sans flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white mb-4 shadow-md shadow-blue-500/20">
          <GraduationCap className="w-7 h-7" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Enterprise Workspace Setup
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
          Configure your institution profile and create your initial Super Administrator account to get started.
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-7 px-6 sm:px-8 shadow-sm rounded-2xl border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Institution Profile */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <h2 className="text-sm font-bold text-slate-900">1. Institution Details</h2>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Clean Slate Setup</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  School / Institution Name *
                </label>
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Enter your school or organization name"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg bg-slate-50/50 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Official Contact Email
                  </label>
                  <input
                    type="email"
                    value={institutionEmail}
                    onChange={(e) => setInstitutionEmail(e.target.value)}
                    placeholder="contact@institution.edu"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg bg-slate-50/50 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Default Currency
                  </label>
                  <select
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg bg-slate-50/50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  >
                    {CURRENCY_OPTIONS.map((opt) => (
                      <option key={opt.symbol} value={opt.symbol}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Institution Motto or Tagline <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Optional motto or academic mission"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg bg-slate-50/50 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Section 2: Super Admin Account */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-sm font-bold text-slate-900">2. Initial Super Administrator</h2>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Full System Control
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Administrator Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={adminFullName}
                      onChange={(e) => setAdminFullName(e.target.value)}
                      placeholder="Full name"
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50/50 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Administrator Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@institution.edu"
                      autoComplete="email"
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50/50 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      autoComplete="new-password"
                      className="w-full pl-9 pr-9 py-2 border border-slate-200 rounded-lg bg-slate-50/50 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50/50 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl text-sm transition shadow-xs disabled:opacity-60 cursor-pointer"
            >
              <span>{submitting ? 'Setting Up Workspace...' : 'Create Institution & Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="mt-5 text-center text-xs text-slate-400">
          Your institutional data is stored privately with zero pre-filled sample records.
        </div>
      </div>
    </div>
  );
};
