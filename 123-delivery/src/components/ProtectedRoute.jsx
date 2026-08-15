import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ShieldAlert, LogOut, ArrowLeft } from "lucide-react";

export default function ProtectedRoute({ children }) {
  const { currentUser, role, authLoading, logout } = useAuth();

  if (authLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-950 text-white">
        <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center max-w-xs text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500 border-r-2 border-r-transparent mb-4"></div>
          <p className="text-xs text-zinc-400 font-mono tracking-wider uppercase">Checking credentials...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if user is not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Check role: must be 'delivery'
  if (role !== "delivery") {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-950 text-white px-6">
        <div className="glass-panel p-6 rounded-3xl border border-rose-500/20 bg-rose-950/5 text-center max-w-sm animate-scale-in">
          {/* Neon warning icon */}
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-5 relative">
            <ShieldAlert className="w-8 h-8 text-rose-400 animate-pulse" />
            <div className="absolute inset-0 rounded-2xl bg-rose-500/5 blur-md"></div>
          </div>

          <h2 className="text-lg font-black font-outfit text-white uppercase tracking-wide">Access Denied</h2>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            Your user account <span className="text-white font-semibold">{currentUser.email}</span> does not have courier clearance.
          </p>

          <div className="bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl text-[10px] font-mono text-rose-300 mt-4 leading-normal">
            Required: role = "delivery"<br />
            Assigned: role = "{role || "none"}"
          </div>

          <div className="flex flex-col space-y-2 mt-6">
            <button
              onClick={logout}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center space-x-1.5 transition shadow-lg shadow-rose-600/10"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out & Re-login</span>
            </button>
            
            <button
              onClick={logout}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-white/5 border border-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center space-x-1.5 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // User is logged in and has delivery role, render protected page
  return children;
}
