import React, { useState } from 'react';
import {
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import logoImg from '../img/logo.png';

interface AuthScreenProps {
  onSupabaseSignIn: (email: string, password: string) => Promise<string | null>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onSupabaseSignIn,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const err = await onSupabaseSignIn(email, password);
      if (err) setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2f121b] via-[#753446] to-[#c85a47] flex flex-col justify-between p-4 sm:p-8">
      <div />

      {/* Centered Sign In Card with Brand Logo */}
      <div className="max-w-md w-full mx-auto my-8">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
          {/* Logo & Title */}
          <div className="text-center border-b border-slate-200 pb-5 space-y-3">
            <img
              src={logoImg}
              alt="Company Logo"
              className="h-16 sm:h-20 w-auto object-contain mx-auto"
            />
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Sign in to your account
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter your work credentials to access your workspace
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#8c4356] to-[#d46652] hover:from-[#753446] hover:to-[#c25441] disabled:opacity-60 text-white font-semibold text-sm shadow-md shadow-[#8c4356]/25 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-md w-full mx-auto text-center text-xs text-[#fae5e0]/80 border-t border-white/15 pt-4">
        <p>Employee Task Logging & Manager Monitoring System</p>
      </div>
    </div>
  );
};
