'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Zap, User, Mail, Lock, Eye, EyeOff,
  AlertCircle, Loader2, GraduationCap, Briefcase,
} from 'lucide-react';

const ROLES = [
  {
    id: 'Student',
    icon: GraduationCap,
    label: 'Student',
    desc: 'Managing classes, assignments & personal goals',
  },
  {
    id: 'Professional',
    icon: Briefcase,
    label: 'Professional',
    desc: 'Balancing work projects, meetings & growth',
  },
];

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Student' });
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));
  const passwordMismatch = confirm.length > 0 && form.password !== confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) { setError('Full name is required.'); return; }
    if (!form.email.trim()) { setError('Email address is required.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!/[0-9]/.test(form.password)) { setError('Password must contain at least one number.'); return; }
    if (form.password !== confirm) { setError('Passwords do not match. Please check and try again.'); return; }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.');
        return;
      }


      window.location.href = '/login';

    } catch (err) {
      console.error('Register error:', err);
      setError('Unable to connect. Check your internet and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">

      { }
      <div className="absolute top-4 left-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to home
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        { }
        <div className="flex justify-center mb-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight">Stepwise</span>
          </Link>
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="mt-1.5 text-sm text-gray-500">
            Set up your account and start planning smarter.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-8 py-8">

          { }
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            { }
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Full name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  id="name" type="text" required autoComplete="name"
                  placeholder="Alex Johnson"
                  value={form.name} onChange={set('name')} disabled={isSubmitting}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 transition-shadow"
                />
              </div>
            </div>

            { }
            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  id="reg-email" type="email" required autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email} onChange={set('email')} disabled={isSubmitting}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 transition-shadow"
                />
              </div>
            </div>

            { }
            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required autoComplete="new-password"
                  placeholder="Min. 8 characters, include a number"
                  value={form.password} onChange={set('password')} disabled={isSubmitting}
                  className="w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 transition-shadow"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide' : 'Show'}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-gray-400">At least 8 characters and one number.</p>
            </div>

            { }
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  required autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={isSubmitting}
                  className={`w-full pl-9 pr-10 py-2.5 border rounded-lg text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 transition-shadow ${passwordMismatch ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                />
                <button type="button" tabIndex={-1} onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide' : 'Show'}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordMismatch && (
                <p className="mt-1.5 text-xs text-red-500">Passwords do not match.</p>
              )}
            </div>

            { }
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">I am a…</label>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map((r) => {
                  const Icon = r.icon;
                  const selected = form.role === r.id;
                  return (
                    <button key={r.id} type="button" disabled={isSubmitting}
                      onClick={() => setForm((p) => ({ ...p, role: r.id }))}
                      className={`flex flex-col items-start gap-2 p-3.5 rounded-lg border text-left transition-all disabled:opacity-60 ${selected
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${selected ? 'text-blue-700' : 'text-gray-800'}`}>
                          {r.label}
                        </p>
                        <p className="text-xs text-gray-500 leading-snug mt-0.5">{r.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            { }
            <button type="submit" disabled={isSubmitting || passwordMismatch}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors mt-1"
            >
              {isSubmitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
                : 'Create account'
              }
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 border-t border-gray-100 pt-5">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          By creating an account, you agree to our{' '}
          <span className="underline cursor-pointer hover:text-gray-600 transition-colors">Terms of Service</span>
          {' '}and{' '}
          <span className="underline cursor-pointer hover:text-gray-600 transition-colors">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
