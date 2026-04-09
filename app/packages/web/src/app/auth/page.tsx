'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/api';
import { Phone, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';

type Step = 'phone' | 'otp' | 'profile';

export default function AuthPage() {
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if already authed
  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, router]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSendOtp = async () => {
    const cleanPhone = phone.replace(/\s/g, '');
    if (!/^\+91\d{10}$/.test(cleanPhone) && !/^\d{10}$/.test(cleanPhone)) {
      setError('Enter a valid 10-digit Indian mobile number');
      return;
    }

    const fullPhone = cleanPhone.startsWith('+91') ? cleanPhone : `+91${cleanPhone}`;
    setError('');
    setLoading(true);

    try {
      await auth.sendOtp(fullPhone);
      setPhone(fullPhone);
      setStep('otp');
      setCountdown(300); // 5 minutes
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-advance
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (newOtp.every(d => d !== '') && value) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newOtp = pasted.split('');
      setOtp(newOtp);
      otpRefs.current[5]?.focus();
      handleVerifyOtp(pasted);
    }
  };

  const handleVerifyOtp = async (code?: string) => {
    const otpCode = code || otp.join('');
    if (otpCode.length !== 6) {
      setError('Enter the 6-digit OTP');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await auth.verifyOtp(phone, otpCode);
      const { accessToken, refreshToken, user, isNewUser } = res.data;

      if (isNewUser) {
        // Store tokens temporarily, show profile step
        login(accessToken, refreshToken, user);
        setStep('profile');
      } else {
        login(accessToken, refreshToken, user);
        router.replace('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('longhealth_auth');
      const parsed = token ? JSON.parse(token) : null;
      if (parsed?.accessToken) {
        await auth.updateProfile(parsed.accessToken, { name: name.trim() });
      }
      router.replace('/dashboard');
    } catch {
      // Non-critical, proceed to dashboard anyway
      router.replace('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatCountdown = () => {
    const m = Math.floor(countdown / 60);
    const s = countdown % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-beige flex flex-col">
      {/* Header area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="w-14 h-14 bg-terracotta rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">LH</span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-midnight">Long Health</h1>
          <p className="text-sm text-text-secondary mt-1">AI-powered blood report analysis</p>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm bg-white rounded-2xl border border-border p-6 sm:p-8 animate-fadeUp">
          {/* Phone step */}
          {step === 'phone' && (
            <>
              <h2 className="font-display text-xl font-semibold text-midnight mb-1">Welcome</h2>
              <p className="text-sm text-text-secondary mb-6">
                Enter your mobile number to get started
              </p>

              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Mobile Number
              </label>
              <div className="relative mb-4">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-text-secondary">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm font-medium">+91</span>
                </div>
                <input
                  type="tel"
                  value={phone.replace('+91', '')}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                  placeholder="98765 43210"
                  className="w-full h-12 pl-[5.5rem] pr-4 bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-terracotta focus:bg-white transition-colors"
                  autoFocus
                />
              </div>

              {error && <p className="text-sm text-red mb-3">{error}</p>}

              <Button
                onClick={handleSendOtp}
                loading={loading}
                className="w-full"
                size="lg"
                iconRight={<ArrowRight className="w-4 h-4" />}
              >
                Send OTP
              </Button>
            </>
          )}

          {/* OTP step */}
          {step === 'otp' && (
            <>
              <button
                onClick={() => { setStep('phone'); setError(''); setOtp(['','','','','','']); }}
                className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-4 -ml-0.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Change number
              </button>

              <h2 className="font-display text-xl font-semibold text-midnight mb-1">Verify OTP</h2>
              <p className="text-sm text-text-secondary mb-6">
                Enter the 6-digit code sent to <span className="font-medium text-text-primary">{phone}</span>
              </p>

              {/* OTP inputs */}
              <div className="flex gap-2 mb-4 justify-center" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className="otp-input w-11 h-13 text-center text-lg font-semibold bg-surface border border-border rounded-lg focus:border-terracotta focus:bg-white transition-colors"
                  />
                ))}
              </div>

              {error && <p className="text-sm text-red mb-3 text-center">{error}</p>}

              <Button
                onClick={() => handleVerifyOtp()}
                loading={loading}
                className="w-full mb-3"
                size="lg"
              >
                Verify
              </Button>

              <p className="text-center text-sm text-text-muted">
                {countdown > 0 ? (
                  <>Resend in {formatCountdown()}</>
                ) : (
                  <button
                    onClick={handleSendOtp}
                    className="text-terracotta font-medium hover:underline"
                  >
                    Resend OTP
                  </button>
                )}
              </p>
            </>
          )}

          {/* Profile step (new users) */}
          {step === 'profile' && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green" />
                <span className="text-sm font-medium text-green">Phone verified</span>
              </div>

              <h2 className="font-display text-xl font-semibold text-midnight mb-1">
                Almost there
              </h2>
              <p className="text-sm text-text-secondary mb-6">
                What should we call you?
              </p>

              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleProfileUpdate()}
                placeholder="e.g. Priya Sharma"
                className="w-full h-12 px-4 bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-terracotta focus:bg-white transition-colors mb-4"
                autoFocus
              />

              {error && <p className="text-sm text-red mb-3">{error}</p>}

              <Button
                onClick={handleProfileUpdate}
                loading={loading}
                className="w-full"
                size="lg"
              >
                Get Started
              </Button>

              <button
                onClick={() => router.replace('/dashboard')}
                className="w-full text-center text-sm text-text-muted mt-3 hover:text-text-secondary transition-colors"
              >
                Skip for now
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-xs text-text-muted mt-8 text-center max-w-xs">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
