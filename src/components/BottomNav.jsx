import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, ClipboardList, ShieldCheck, User } from "lucide-react";

export default function BottomNav() {
  // Simple sound trigger for satisfying tactile feel
  const playTick = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      // Audio context might be blocked by user gesture policy initially
    }
  };

  const navItems = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/orders", label: "Orders", icon: ClipboardList },
    { to: "/profile", label: "Profile", icon: User }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-40 px-6 py-2 pb-6 md:pb-2.5 glass-panel border-t border-white/5 md:border md:rounded-2xl backdrop-blur-lg md:shadow-2xl md:shadow-brand-500/10">
      <div className="flex justify-between items-center max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={playTick}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-300 ${
                  isActive 
                    ? "text-brand-400 font-semibold" 
                    : "text-zinc-500 hover:text-zinc-300"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Glowing dot for active page */}
                  {isActive && (
                    <span className="absolute -top-1 w-1 h-1 rounded-full bg-brand-400 glow-brand"></span>
                  )}
                  
                  <Icon className={`w-5 h-5 mb-1 transition-transform duration-300 ${isActive ? "scale-110" : ""}`} />
                  <span className="text-[10px] tracking-wide font-medium">{item.label}</span>
                  
                  {/* Frosted highlight behind active item */}
                  {isActive && (
                    <span className="absolute inset-0 -z-10 rounded-xl bg-brand-500/5 border border-brand-500/10 scale-105 animate-scale-in"></span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
