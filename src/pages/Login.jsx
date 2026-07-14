import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff, Mail, Lock, ShieldCheck, ShieldAlert } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { currentUser, role, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // If user is already logged in and verified, redirect directly to dashboard
  if (currentUser && role === "delivery") {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password.trim()) {
      setError("Please fill in all fields.");
      triggerShake();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      triggerShake();
      return;
    }

    setError("");
    setLoading(true);

    try {
      await login(cleanEmail, password);
      // Success triggers AuthState change listener, redirecting automatically
      navigate("/");
    } catch (err) {
      console.error("Login Error details:", err);
      setLoading(false);
      triggerShake();
      
      // Map common Firebase auth errors to readable strings
      const errMsg = err.code ? getFirebaseAuthErrorMessage(err.code) : err.message;
      setError(errMsg);
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const getFirebaseAuthErrorMessage = (code) => {
    switch (code) {
      case "auth/invalid-email":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Invalid credentials. Please check your email and password and try again.";
      case "auth/user-not-found":
        return "No account found with the provided credentials.";
      case "auth/email-already-in-use":
        return "An account with this email already exists.";
      case "auth/weak-password":
        return "Password must be at least 6 characters long.";
      case "auth/network-request-failed":
        return "Network error. Please check your internet connection and try again.";
      case "auth/too-many-requests":
        return "Too many failed login attempts. Please try again later.";
      default:
        return "Something went wrong. Please try again.";
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-950 text-white px-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-brand-600/10 to-transparent -z-10 blur-3xl"></div>
      <div className="absolute -left-20 top-40 w-72 h-72 bg-brand-500/5 rounded-full blur-3xl -z-10"></div>
      <div className="absolute -right-20 bottom-40 w-72 h-72 bg-brand-500/5 rounded-full blur-3xl -z-10"></div>

      {/* Main card */}
      <div className={`w-full max-w-sm glass-panel border border-white/5 rounded-3xl p-6 shadow-2xl transition-all duration-300 ${isShaking ? "animate-shake" : ""}`}>
        
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-4 relative">
            <svg className="w-7 h-7 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4.5 16.5c-1.5 1.26-2.5 3.19-2.5 5.5s3 1 5.5-2.5" />
              <path d="M12 12c-2.73 0-5.06 1.76-6.12 4.28L3.5 20.5l4.22-2.38C10.24 17.06 12 14.73 12 12z" />
              <path d="M20.5 3.5c-2.5-2.5-6.5-1-9.5 2l-6 6c-3 3-4.5 7-2 9.5s6.5 1 9.5-2l6-6c3-3 4.5-7 2-9.5z" />
            </svg>
            <div className="absolute inset-0 rounded-2xl bg-brand-500/5 blur-md"></div>
          </div>
          <h2 className="text-xl font-black font-outfit text-white uppercase tracking-wider">Gayathri Cutmit Wholesale</h2>
          <p className="text-[11px] text-zinc-400 mt-1">Delivery Staff Security Portal</p>
        </div>

        {/* Error alert */}
        {error && (
          <div className="flex items-center space-x-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs mb-5 animate-scale-in">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 font-mono block mb-2">
              Staff Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                placeholder="Enter mail id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-4 py-3 rounded-xl text-xs glass-input border border-white/5 focus:border-brand-500"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 font-mono block mb-2">
              Secure Pin/Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-10 py-3 rounded-xl text-xs glass-input border border-white/5 focus:border-brand-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 rounded-xl text-xs font-black bg-brand-600 hover:bg-brand-500 text-white flex items-center justify-center space-x-1.5 transition active:scale-98 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-brand-600/15"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white border-r-2 border-r-transparent"></div>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Verify & Enter Portal</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
