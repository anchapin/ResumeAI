import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button, Input } from '../components/ui';

interface LoginProps {
  onLogin?: (email: string, password: string) => Promise<boolean>;
  error?: string | null;
  isLoading?: boolean;
}

const Login: React.FC<LoginProps> = ({
  onLogin: propLogin,
  error: propError,
  isLoading: propIsLoading,
}) => {
  const navigate = useNavigate();
  const { login: hookLogin, isLoading: hookIsLoading, error: hookError, clearError } = useAuth();

  const login = propLogin || hookLogin;
  const isLoading = propIsLoading !== undefined ? propIsLoading : hookIsLoading;
  const error = propError !== undefined ? propError : hookError;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password) {
      setLocalError('Please enter your email and password.');
      return;
    }

    try {
      const result = await login(email, password);
      if (result) {
        navigate('/dashboard');
      }
    } catch {
      // Error handled by hook
    }
  };

  const displayError = localError || error;

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
          <p className="text-slate-500">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          {displayError && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {displayError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              id="email"
              type="email"
              label="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setLocalError(null);
              }}
              placeholder="you@example.com"
              autoComplete="email"
            />

            <Input
              id="password"
              type="password"
              label="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setLocalError(null);
              }}
              placeholder="••••••••"
              autoComplete="current-password"
            />

            <Button type="submit" isLoading={isLoading} className="w-full py-3 h-12">
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-primary-600 font-bold hover:text-primary-700">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
