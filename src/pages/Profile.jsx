import React, { useState, useEffect } from "react";
import { useOrders } from "../context/OrderContext";
import { useAuth } from "../context/AuthContext";
import RouteWrapper from "../components/RouteWrapper";
import { 
  User, 
  Mail, 
  Phone, 
  Bike, 
  Award, 
  Star, 
  Map, 
  DollarSign, 
  Compass, 
  LogOut,
  Sliders
} from "lucide-react";

export default function Profile() {
  const { profile, changeDriverStatus, updateDriverVehicle } = useOrders();
  const { logout } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [vehicleName, setVehicleName] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setVehicleName(profile.vehicle || "");
      setLicensePlate(profile.licensePlate || "");
    }
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await updateDriverVehicle(vehicleName, licensePlate);
    if (success) {
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500"></div>
      </div>
    );
  }

  const badgeIcons = {
    "Speed Demon": "⚡",
    "Rain or Shine": "🌧️",
    "Perfect 5.0": "⭐",
    "Local Legend": "🏆"
  };

  const badgeDescriptions = {
    "Speed Demon": "Completed 10 deliveries under estimated time",
    "Rain or Shine": "Delivered during inclement weather alerts",
    "Perfect 5.0": "Maintained a 5.0 rating over a 7-day period",
    "Local Legend": "First rider to complete 30 routes in Burnage"
  };

  return (
    <RouteWrapper>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Bio, Status & Contact */}
        <div className="lg:col-span-5 space-y-6">
          {/* Profile Bio */}
          <div className="glass-panel border border-white/5 rounded-3xl p-5 text-center relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl"></div>
            
            {/* Avatar */}
            <div className="relative w-20 h-20 mx-auto mb-4">
              <img
                src={profile?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop"}
                alt={profile?.name || "Rider"}
                className="w-20 h-20 rounded-full border-2 border-brand-500/30 object-cover shadow-xl"
              />
              <span className={`absolute bottom-0.5 right-0.5 w-4.5 h-4.5 rounded-full border-2 border-slate-950 ${
                profile?.isOnline ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
              }`}></span>
            </div>

            <h2 className="text-xl font-black font-outfit text-white">{profile?.name || "Delivery Rider"}</h2>
            <p className="text-xs text-brand-400 font-mono tracking-wider mt-1">{profile?.id}</p>

            {/* Info Pill Buttons */}
            <div className="flex justify-center items-center space-x-3 mt-4 pt-4 border-t border-white/5">
              <div className="text-center px-6 border-r border-white/5">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">Earnings</span>
                <span className="text-sm font-extrabold text-white font-outfit mt-0.5 block">₹{(profile?.earnings ?? 0).toFixed(2)}</span>
              </div>
              <div className="text-center px-6">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">Deliveries</span>
                <span className="text-sm font-extrabold text-white font-outfit mt-0.5 block">{profile?.deliveriesCount ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Online Status Card */}
          <div className="glass-panel border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Duty Switch</h4>
                <p className="text-xs text-zinc-400 mt-0.5">Toggle online to receive package notifications</p>
              </div>
              <button
                onClick={() => changeDriverStatus(!profile.isOnline)}
                className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${
                  profile.isOnline ? "bg-emerald-500" : "bg-zinc-800 border border-zinc-700"
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-all duration-300 transform ${
                  profile.isOnline ? "translate-x-6" : "translate-x-0"
                }`}></div>
              </button>
            </div>
          </div>

          {/* Driver Contact Info */}
          <div className="glass-panel border border-white/5 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5 font-mono">
              Contact Details
            </h3>
            
            {/* Email */}
            <div className="flex items-center space-x-3 text-xs">
              <div className="p-1.5 rounded-lg bg-zinc-900 border border-white/5 text-zinc-400">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <span className="text-zinc-500 block text-[9px] uppercase font-bold tracking-wide">Work Email</span>
                <span className="text-zinc-200 font-medium">{profile.email}</span>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center space-x-3 text-xs">
              <div className="p-1.5 rounded-lg bg-zinc-900 border border-white/5 text-zinc-400">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <span className="text-zinc-500 block text-[9px] uppercase font-bold tracking-wide">Mobile Line</span>
                <span className="text-zinc-200 font-medium">{profile.phone}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Vehicle specs, achievements, settings */}
        <div className="lg:col-span-7 space-y-6">
          {/* Vehicle Specs */}
          <div className="glass-panel border border-white/5 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center mb-0">
                <Bike className="w-4 h-4 mr-1.5 text-zinc-500" />
                Vehicle Profile
              </h3>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1 rounded-xl text-[10px] font-bold bg-white/5 border border-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition"
                >
                  Edit Details
                </button>
              ) : (
                <div className="flex space-x-1.5">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-3 py-1 rounded-xl text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setVehicleName(profile.vehicle || "");
                      setLicensePlate(profile.licensePlate || "");
                    }}
                    disabled={isSaving}
                    className="px-3 py-1 rounded-xl text-[10px] font-bold bg-white/5 border border-white/5 hover:bg-white/10 text-zinc-400 hover:text-white disabled:opacity-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-zinc-500 block text-[9px] uppercase font-bold tracking-wide">Equipment / Bike Name</label>
                  <input
                    type="text"
                    value={vehicleName}
                    onChange={(e) => setVehicleName(e.target.value)}
                    placeholder="e.g. Honda Activa"
                    className="w-full px-3 py-2 rounded-xl text-xs glass-input border border-white/5"
                  />
                </div>
                <div className="space-y-1">
                   <label className="text-zinc-500 block text-[9px] uppercase font-bold tracking-wide">Bike Number</label>
                  <input
                    type="text"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    placeholder="e.g. MH12AB1234"
                    className="w-full px-3 py-2 rounded-xl text-xs glass-input border border-white/5"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-950/40 border border-white/5 p-3 rounded-xl">
                  <span className="text-zinc-500 block text-[9px] uppercase font-bold tracking-wide">Equipment</span>
                  <span className="text-xs text-white font-bold block mt-1 truncate">{profile?.vehicle || "Electric Cargo Bike"}</span>
                </div>
                <div className="bg-zinc-950/40 border border-white/5 p-3 rounded-xl">
                  <span className="text-zinc-500 block text-[9px] uppercase font-bold tracking-wide">Bike Number</span>
                  <span className="text-xs text-zinc-300 font-semibold block mt-1">{profile?.licensePlate || "N/A - E-Bike"}</span>
                </div>
              </div>
            )}
          </div>

          {/* Achievements / Badges */}
          <div className="glass-panel border border-white/5 rounded-2xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 font-mono flex items-center">
              <Award className="w-4 h-4 mr-1.5 text-zinc-500" />
              Rider Achievements
            </h3>
            <div className="space-y-3 mt-3">
              {(profile?.badges || []).map((badge) => (
                <div key={badge} className="flex items-start space-x-3 p-2.5 rounded-xl bg-zinc-950/40 border border-white/5 hover:border-brand-500/20 transition-all">
                  <span className="text-xl p-1 bg-white/5 rounded-lg border border-white/5 block flex-shrink-0">
                    {badgeIcons[badge] || "🏆"}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-white">{badge}</h4>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{badgeDescriptions[badge] || "Achievement unlocked"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div>
            <button
              onClick={logout}
              className="w-full py-3.5 rounded-2xl font-extrabold bg-rose-600 hover:bg-rose-500 text-white text-xs flex items-center justify-center space-x-2 transition duration-150 shadow-lg shadow-rose-600/10"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out of Portal</span>
            </button>
          </div>
        </div>
      </div>
    </RouteWrapper>
  );
}
