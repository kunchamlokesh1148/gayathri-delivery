import { useOrders } from "../context/OrderContext";
import { Link } from "react-router-dom";

export default function Header() {
  const { profile, changeDriverStatus } = useOrders();

  if (!profile) return null;

  return (
    <header className="sticky top-0 z-30 w-full px-4 py-3 glass-panel border-b border-white/5 backdrop-blur-md">
      <div className="flex items-center justify-between max-w-lg md:max-w-5xl lg:max-w-6xl mx-auto">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center space-x-2 cursor-pointer hover:opacity-90 transition-all duration-200"
        >
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center border border-brand-500/20">
            <svg className="w-5 h-5 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4.5 16.5c-1.5 1.26-2.5 3.19-2.5 5.5s3 1 5.5-2.5" />
              <path d="M12 12c-2.73 0-5.06 1.76-6.12 4.28L3.5 20.5l4.22-2.38C10.24 17.06 12 14.73 12 12z" />
              <path d="M20.5 3.5c-2.5-2.5-6.5-1-9.5 2l-6 6c-3 3-4.5 7-2 9.5s6.5 1 9.5-2l6-6c3-3 4.5-7 2-9.5z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-white font-outfit uppercase">Gayathri Cutmit</h1>
            <p className="text-[10px] text-zinc-400 font-mono tracking-wider">DELIVERY PARTNER</p>
          </div>
        </Link>

        {/* Quick actions & toggle */}
        <div className="flex items-center space-x-3">
          {/* Status Toggle */}
          <button
            onClick={() => changeDriverStatus(!profile.isOnline)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-300 ${
              profile.isOnline
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 glow-emerald"
                : "bg-zinc-800 text-zinc-400 border-zinc-700"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${profile.isOnline ? "bg-emerald-400 pulse-marker-emerald" : "bg-zinc-500"}`}></span>
            <span>{profile.isOnline ? "Online" : "Offline"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
