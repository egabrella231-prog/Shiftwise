import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Building2, Mail, Lock, User, Image, ArrowLeft, Check, AlertCircle } from 'lucide-react';

const PRESET_LOGOS = [
  "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=100",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=100",
  "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=100"
];

export default function Register({ onLoginRedirect }: { onLoginRedirect: () => void }) {
  const { registerCompany } = useApp();

  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState(PRESET_LOGOS[0]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [managerName, setManagerName] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !email.trim() || !password.trim()) {
      return setError("All fields are mandatory to build your Namibian workspace!");
    }

    setLoading(true);
    setError(null);

    try {
      await registerCompany(companyName, logoUrl, email, password, managerName);
    } catch (err: any) {
      console.error("Registration Error details:", err);
      const errorCode = err.code || "";
      const rawMessage = err.message || "";
      
      let friendlyError = "";
      if (errorCode === 'auth/operation-not-allowed' || rawMessage.includes('operation-not-allowed')) {
        friendlyError = "The Email/Password sign-in provider is disabled in your Firebase Console. Under your Firebase project (admission-2), go to Authentication -> Sign-in Method, select 'Email/Password', and switch it on. Once enabled, email registration will work instantly!";
      } else if (errorCode === 'auth/weak-password' || rawMessage.includes('weak-password') || rawMessage.includes('password-should-be')) {
        friendlyError = "The chosen password is too weak. Security requirements of Namibian shift records and Firebase mandate that the password must be at least 6 characters long!";
      } else if (errorCode === 'auth/email-already-in-use' || rawMessage.includes('email-already-in-use')) {
        friendlyError = "This corporate email is already registered to a ShiftWise workspace! Please go back to the Login page and use it there, or sign up with another email.";
      } else if (errorCode === 'auth/invalid-email' || rawMessage.includes('invalid-email')) {
        friendlyError = "The entered Admin Email is invalid or badly formatted. Please confirm your email structure.";
      } else {
        friendlyError = `Firebase Authentication Error: ${rawMessage || "Unable to contact Firebase servers."} (Code: ${errorCode || "unknown"}). For sandbox use, feel free to use standard Google Sign-In or select a Demo Preset from the Login screen!`;
      }
      
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative select-none">
      <div className="absolute top-4 left-4">
        <button
          onClick={onLoginRedirect}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 font-bold transition focus:outline-none cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-2xl bg-indigo-900 flex items-center justify-center text-white font-black text-2xl shadow-md">
            SW
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-black text-gray-900 tracking-tight">Register ShiftWise Namibia 🇳🇦</h2>
        <p className="mt-1.5 text-center text-xs font-semibold text-indigo-900 uppercase tracking-wider">
          Create Corporate Shift & Payroll Workspace
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-gray-100 rounded-3xl space-y-5">
          
          {error && (
            <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-3.5 flex items-start gap-2.5 text-xs">
              <AlertCircle className="h-4.5 w-4.5 text-[#185FA5] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Notice & Help</p>
                <p className="mt-1 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Company / Organization name</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Building2 className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Namib Guard Security S.A."
                  className="w-full text-sm border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-700 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Your Manager / Supervisor Name</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="e.g. Johannes Negumbo"
                  className="w-full text-sm border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-700 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Corporate Admin Email</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@namibguard.com.na"
                  className="w-full text-sm border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-700 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">Secure Password</label>
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
                  className="w-full text-sm border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-700 transition"
                />
              </div>
            </div>

            {/* Logo option */}
            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2">Corporate Logo Selection</label>
              <div className="grid grid-cols-3 gap-3">
                {PRESET_LOGOS.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLogoUrl(url)}
                    className="relative border-2 rounded-xl overflow-hidden h-14 w-full focus:outline-none hover:opacity-90 transition cursor-pointer"
                    style={{ borderColor: logoUrl === url ? '#185FA5' : 'transparent' }}
                  >
                    <img src={url} alt={`Preset Logo ${idx + 1}`} className="h-full w-full object-cover" />
                    {logoUrl === url && (
                      <span className="absolute inset-0 bg-[#185FA5]/30 flex items-center justify-center text-white font-bold select-none">
                        <Check className="h-4 w-4 text-[#185FA5]" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#185FA5] hover:bg-blue-800 disabled:opacity-40 text-white font-bold text-sm py-3 rounded-2xl shadow-sm transition cursor-pointer"
            >
              {loading ? "Constructing workspace..." : "Create workspace & Login"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500">
            Already registered?{" "}
            <button
              onClick={onLoginRedirect}
              className="font-bold text-[#185FA5] hover:underline cursor-pointer focus:outline-none"
            >
              Log in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
