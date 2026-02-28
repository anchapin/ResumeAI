import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PasswordStrengthMeter,
  calculatePasswordStrength,
} from '../components/PasswordStrengthMeter';

interface RegisterProps {
  onRegister: (
    email: string,
    username: string,
    password: string,
    fullName?: string,
  ) => Promise<any>;
  error: string | null;
  isLoading: boolean;
}

const Register: React.FC<RegisterProps> = ({ onRegister, error, isLoading }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !username || !password) {
      setLocalError('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    const { score } = calculatePasswordStrength(password);
    if (score < 3) {
      setLocalError('Password is too weak. Please meet all requirements.');
      return;
    }

    try {
      await onRegister(email, username, password, fullName || undefined);
      setSuccess(true);
    } catch {
      // Error handled by parent hook
    }
  };

  const displayError = localError || error;

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f6f8] p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
            <div className="inline-flex items-center justify-center bg-green-100 rounded-full size-16 mb-4">
              <span className="material-symbols-outlined text-green-600 text-3xl">
                check_circle
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Account Created!</h2>
            <p className="text-slate-500 mb-6">
              Your account has been created successfully. You can now sign in.
            </p>
            <Link
              to="/login"
              className="w-full py-3 bg-primary-600 text-white rounded-lg font-bold text-sm hover:bg-primary-700 transition-all shadow-md shadow-primary-600/20 inline-block text-center"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f6f8] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="bg-primary-600 size-12 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-600/20">
              <span className="material-symbols-outlined text-2xl">description</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">ResumeAI</h1>
          </div>
          <p className="text-slate-500">Create your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          {displayError && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {displayError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="reg-email" className="text-sm font-bold text-slate-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="reg-username" className="text-sm font-bold text-slate-700">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                id="reg-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="johndoe"
                autoComplete="username"
                className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="reg-fullname" className="text-sm font-bold text-slate-700">
                Full Name
              </label>
              <input
                id="reg-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                autoComplete="name"
                className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="reg-password" className="text-sm font-bold text-slate-700">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              />
              <PasswordStrengthMeter password={password} />
            </div>

            <div className="space-y-2">
              <label htmlFor="reg-confirm" className="text-sm font-bold text-slate-700">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                id="reg-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary-600 text-white rounded-lg font-bold text-sm hover:bg-primary-700 transition-all shadow-md shadow-primary-600/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">
                    progress_activity
                  </span>
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 font-bold hover:text-primary-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
