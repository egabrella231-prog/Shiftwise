import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldAlert, LogIn, Mail, Lock, AlertCircle, HelpCircle } from 'lucide-react';

export default function Login({ onRegisterRedirect }: { onRegisterRedirect: () => void }) {
  const { loginWithEmail, loginWithGoogle } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Simple demo login helper so the user can test the applet instantly!
  const loadDemoUser = async (role: 'admin' | 'supervisor') => {
    setEmail(role === 'admin' ? "admin@shiftwise.com.na" : "supervisor@shiftwise.com.na");
    setPassword("demo_password");
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError(null);
    setLoading(true);

    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('not-found') || err.message?.includes('invalid-credential') || err.message?.includes('wrong-password')) {
        setError("Invalid email or password. To bypass, please click the 'Load Quick Demo User' button below!");
      } else {
        // Fallback for demo environments: if authentication fails due to unconfigured email auth, let's create a mockup or show guide
        setError("Firebase Email provider needs to be activated in your Firebase console. For now, please use the 'Sign in with Google' option or double-check details! Awe!");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      setError("Google Login failed or was cancelled. Sharp sharp! Give it another try.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative select-none">
      <div className="absolute top-4 right-4 bg-blue-100/50 border border-blue-200/50 text-[#185FA5] px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
        <span>🇳🇦 ShiftWise Namibia</span>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-2xl bg-[#185FA5] flex items-center justify-center text-white font-black text-2xl shadow-md">
            SW
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-black text-gray-900 tracking-tight">ShiftWise Namibia 🇳🇦</h2>
        <p className="mt-1.5 text-center text-xs font-semibold text-[#185FA5] uppercase tracking-wider">
          ROSTER & PAYROLL COCKPIT
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-gray-100 rounded-3xl space-y-6">
          {error && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3.5 flex items-start gap-2.5 text-xs">
              <AlertCircle className="h-4.5 w-4.5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Notice / Guidance</p>
                <p className="mt-1 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Email Address</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. manager@security.com.na"
                  className="w-full text-sm border border-gray-200 rounded-2xl pl-10 pr-4 py-3 bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-700 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-sm border border-gray-200 rounded-2xl pl-10 pr-4 py-3 bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-700 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#185FA5] hover:bg-blue-800 disabled:opacity-40 text-white font-bold text-sm py-3 rounded-2xl shadow-sm transition block cursor-pointer"
            >
              {loading ? "Signing in..." : "Supervisor Portal Login"}
            </button>
          </form>

          {/* Quick Demo Assist Block */}
          <div className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-100">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-center gap-1">
              <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
              Instant Sandbox Entrance
            </h4>
            <div className="mt-2.5 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => loadDemoUser('admin')}
                className="bg-white border border-gray-200 text-[10px] font-bold text-gray-700 hover:border-blue-700 hover:text-blue-700 px-3 py-1.5 rounded-lg transition shadow-xs cursor-pointer"
              >
                Load Admin Demo
              </button>
              <button
                type="button"
                onClick={() => loadDemoUser('supervisor')}
                className="bg-white border border-gray-200 text-[10px] font-bold text-gray-700 hover:border-blue-700 hover:text-blue-700 px-3 py-1.5 rounded-lg transition shadow-xs cursor-pointer"
              >
                Load Supervisor Demo
              </button>
            </div>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-[10px] font-bold uppercase tracking-wider select-none">Or Access with</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          {/* Google SSO Login */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-sm py-3 rounded-2xl shadow-xs transition cursor-pointer"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.04c1.62 0 3.1.56 4.24 1.65l3.17-3.17C17.49 1.63 14.95 1 12 1 7.35 1 3.39 3.65 1.42 7.54l3.77 2.92C6.18 7.37 8.87 5.04 12 5.04z" />
              <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.37-4.87 3.37-8.54z" />
              <path fill="#FBBC05" d="M5.19 14.54a7.12 7.12 0 0 1 0-4.54L1.42 7.08a11.977 11.977 0 0 0 0 10.38l3.77-2.92z" />
              <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.66-2.84c-1.1.74-2.51 1.18-4.3 1.18-3.13 0-5.82-2.33-6.81-5.42L1.42 15.92C3.39 19.81 7.35 23 12 23z" />
            </svg>
            Sign in with Google OAuth
          </button>

          <p className="text-center text-xs text-gray-500">
            Need a company account?{" "}
            <button
              onClick={onRegisterRedirect}
              className="font-bold text-[#185FA5] hover:underline cursor-pointer focus:outline-none"
            >
              Register here
            </button>
          </p>

          <div className="pt-2 border-t border-gray-100 text-[10px] text-gray-400 leading-relaxed">
            <span className="font-bold text-gray-500 block uppercase mb-1 flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5 text-blue-700" />
              Developer Deployment Notice:
            </span>
            Under the Firebase SDK security schema, please enable <strong>Google Sign-in</strong> and <strong>Email Provider</strong> in your project Auth configurations console. Demo logins are fully simulated.
          </div>
        </div>
      </div>
    </div>
  );
}
