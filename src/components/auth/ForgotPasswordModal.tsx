import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { db } from '../../db/storage';
import {
  KeyRound,
  X,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import { User, Staff } from '../../types';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  onSuccessReset?: (email: string, newPass: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
  onSuccessReset,
}) => {
  const { resetPassword } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState<'identify' | 'verify' | 'reset' | 'completed'>('identify');
  const [email, setEmail] = useState(initialEmail);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [targetStaff, setTargetStaff] = useState<Staff | null>(null);
  const [verificationInput, setVerificationInput] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationMode, setVerificationMode] = useState<'staff_code' | 'security_code'>('staff_code');

  // Reset internal state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setStep('identify');
      setEmail(initialEmail || '');
      setTargetUser(null);
      setTargetStaff(null);
      setVerificationInput('');
      setGeneratedCode('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setLoading(false);
    }
  }, [isOpen, initialEmail]);

  if (!isOpen) return null;

  const handleIdentifyAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error('Email Required', 'Please enter your institutional email.');
      return;
    }

    const found = db.getUserByEmail(cleanEmail);
    if (!found) {
      toast.error(
        'Account Not Found',
        'No institutional account is registered with this email address. Please contact your school administrator.'
      );
      return;
    }

    if (!found.is_active) {
      toast.error(
        'Account Deactivated',
        'This account is currently marked inactive. Please contact the Super Administrator.'
      );
      return;
    }

    const staffMember = found.staff_id ? db.getStaffById(found.staff_id) : undefined;
    setTargetUser(found);
    setTargetStaff(staffMember || null);

    // Generate a 6-digit one-time verification token
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(randomCode);

    setStep('verify');
  };

  const handleVerifyIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationInput.trim()) {
      toast.error('Verification Required', 'Please enter the verification credential.');
      return;
    }

    const cleanInput = verificationInput.trim().toLowerCase();
    let isVerified = false;

    if (verificationMode === 'security_code') {
      if (cleanInput === generatedCode) {
        isVerified = true;
      }
    } else {
      // Staff code / Employee ID verification
      if (targetStaff) {
        if (
          targetStaff.staff_code.toLowerCase() === cleanInput ||
          (targetStaff.employee_number && targetStaff.employee_number.toLowerCase() === cleanInput) ||
          (targetStaff.phone && targetStaff.phone.replace(/\s+/g, '').includes(cleanInput.replace(/\s+/g, '')))
        ) {
          isVerified = true;
        }
      }
    }

    if (!isVerified) {
      toast.error(
        'Verification Failed',
        verificationMode === 'staff_code'
          ? 'Staff code / Employee number did not match this account record.'
          : 'Invalid one-time security passcode entered.'
      );
      return;
    }

    toast.success('Identity Verified', 'You may now set a new password for your account.');
    setStep('reset');
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('Weak Password', 'Your new password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mismatch', 'The new passwords entered do not match.');
      return;
    }

    if (!targetUser) return;

    setLoading(true);
    const res = await resetPassword(targetUser.email, newPassword);
    setLoading(false);

    if (!res.success) {
      toast.error('Reset Failed', res.error || 'Unable to update password.');
      return;
    }

    toast.success('Password Updated', 'Your institutional login password was successfully reset.');
    setStep('completed');
  };

  const handleFinishAndLogin = () => {
    if (targetUser && onSuccessReset) {
      onSuccessReset(targetUser.email, newPassword);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Institutional Account Recovery</h3>
              <p className="text-xs text-slate-500">Secure Self-Service Password Reset</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* Step 1: Identify Account */}
          {step === 'identify' && (
            <form onSubmit={handleIdentifyAccount} className="space-y-4">
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Enter your registered school email address. We will verify your staff identity and guide you to
                  reset your login credentials safely.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Institutional Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@institution.edu"
                    required
                    autoFocus
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer"
                >
                  <span>Locate Account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Verify Identity */}
          {step === 'verify' && targetUser && (
            <form onSubmit={handleVerifyIdentity} className="space-y-4">
              {/* Account summary card */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                    {targetUser.full_name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{targetUser.full_name}</h4>
                    <p className="text-[11px] text-slate-500">{targetUser.email}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-200 uppercase tracking-wide">
                  {targetUser.role_id?.replace('role_', '').replace('_', ' ') || 'Staff'}
                </span>
              </div>

              {/* Verification mode toggle */}
              <div className="flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setVerificationMode('staff_code');
                    setVerificationInput('');
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                    verificationMode === 'staff_code'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Staff Code / ID Verification
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVerificationMode('security_code');
                    setVerificationInput('');
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                    verificationMode === 'security_code'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  One-Time Security Passcode
                </button>
              </div>

              {verificationMode === 'staff_code' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Staff Code / Employee Number
                  </label>
                  <div className="relative">
                    <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={verificationInput}
                      onChange={(e) => setVerificationInput(e.target.value)}
                      placeholder="Enter your Staff ID, Employee Number, or Phone"
                      required
                      autoFocus
                      className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                    <HelpCircle className="w-3 h-3 text-blue-500" />
                    <span>
                      {targetStaff
                        ? 'Enter your assigned Staff ID, Employee Number, or registered Phone Number to verify your identity.'
                        : 'No linked staff record found. Switch to "One-Time Security Passcode" above or contact your Super Administrator.'}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900">
                    <div className="font-semibold flex items-center justify-between">
                      <span>Generated One-Time Security Passcode:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const newCode = Math.floor(100000 + Math.random() * 900000).toString();
                          setGeneratedCode(newCode);
                        }}
                        className="text-[10px] text-emerald-700 underline flex items-center gap-0.5"
                      >
                        <RefreshCw className="w-3 h-3" /> Refresh
                      </button>
                    </div>
                    <div className="text-xl font-mono font-extrabold tracking-widest text-center py-2 text-emerald-800">
                      {generatedCode}
                    </div>
                    <p className="text-[10px] text-emerald-700 text-center">
                      Enter the 6-digit security passcode above to authorize instant password replacement.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Enter 6-Digit Passcode
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={verificationInput}
                      onChange={(e) => setVerificationInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      required
                      autoFocus
                      className="w-full text-center tracking-widest font-mono text-base py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('identify')}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer"
                >
                  <span>Verify & Proceed</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Set New Password */}
          {step === 'reset' && targetUser && (
            <form onSubmit={handleSetNewPassword} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                Setting a new password for <strong className="text-slate-900">{targetUser.email}</strong>.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  New Account Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    required
                    minLength={6}
                    autoFocus
                    className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('verify')}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {loading ? 'Updating Password...' : 'Save New Password'}
                </button>
              </div>
            </form>
          )}

          {/* Step 4: Completed */}
          {step === 'completed' && targetUser && (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Password Reset Complete</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Your new credentials have been synchronized to both your local device and cloud security records.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-left">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-semibold text-slate-800">{targetUser.email}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Password:</span>
                  <span className="font-mono font-semibold text-blue-600">{newPassword}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFinishAndLogin}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition shadow-xs cursor-pointer"
              >
                Proceed to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
