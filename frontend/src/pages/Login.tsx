import { Navigate } from 'react-router-dom';
import { BarChart3, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, loading, error, login, clearError } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-surface-bg flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#7B2FF7] rounded-full opacity-15 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#D946A8] rounded-full opacity-15 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-r from-[#D946A8] to-[#7B2FF7] rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-[#7B2FF7]/25">
              <BarChart3 className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
              Beacon
            </h1>
            <p className="text-text-secondary text-sm mt-1.5 font-medium">
              Analytics Dashboard
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-red-700 text-sm font-medium text-center">
                {error}
              </p>
              <button
                onClick={clearError}
                className="text-red-500 text-xs mt-1.5 hover:underline mx-auto block"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Sign in button */}
          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-text-primary font-semibold hover:border-primary-300 hover:bg-primary-50/50 transition-all duration-200 group"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span className="group-hover:text-primary-600 transition-colors">
              Sign in with Google
            </span>
          </button>

          <p className="text-text-muted text-xs text-center mt-6">
            Access restricted to authorized team members only.
          </p>
        </div>
      </div>
    </div>
  );
}
