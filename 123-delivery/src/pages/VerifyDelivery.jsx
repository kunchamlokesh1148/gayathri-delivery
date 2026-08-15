import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useOrders, getStatusVal } from "../context/OrderContext";
import RouteWrapper from "../components/RouteWrapper";
import { ShieldAlert, ArrowLeft, Delete, Lock, Unlock } from "lucide-react";
import confetti from "canvas-confetti";

export default function VerifyDelivery() {
  const navigate = useNavigate();
  const { orders, activeOrder, verifyOrderDelivery } = useOrders();
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [code, setCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Filter for orders in-transit that can be verified
  const transitOrders = orders.filter(o => getStatusVal(o.status) === "in-transit");

  useEffect(() => {
    // Default to the global active order if it is in-transit
    if (activeOrder && getStatusVal(activeOrder.status) === "in-transit") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedOrderId(activeOrder.id);
    } else {
      const activeTransit = orders.filter(o => getStatusVal(o.status) === "in-transit");
      if (activeTransit.length > 0) {
        setSelectedOrderId(activeTransit[0].id);
      }
    }
  }, [activeOrder, orders]);

  // Synthetic sound triggers
  const playSound = (freq, duration, type = "sine", gainVal = 0.01) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {
      // Audio might be blocked initially
    }
  };

  const playClick = () => playSound(600, 0.08, "sine", 0.015);
  const playError = () => {
    playSound(180, 0.15, "triangle", 0.05);
    setTimeout(() => playSound(140, 0.2, "triangle", 0.05), 100);
  };
  const playSuccess = () => {
    playSound(420, 0.1, "sine", 0.03);
    setTimeout(() => playSound(560, 0.1, "sine", 0.03), 100);
    setTimeout(() => playSound(840, 0.2, "sine", 0.03), 200);
  };

  const handleKeyPress = (num) => {
    if (isSuccess) return;
    setErrorMsg("");
    playClick();

    if (code.length < 6) {
      const newCode = code + num;
      setCode(newCode);

      // Auto-trigger verification when 6th digit is entered
      if (newCode.length === 6) {
        verifyCode(newCode);
      }
    }
  };

  const handleDelete = () => {
    if (isSuccess) return;
    playClick();
    setErrorMsg("");
    setCode(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isSuccess) return;
    playClick();
    setErrorMsg("");
    setCode("");
  };

  const verifyCode = async (enteredCode) => {
    if (!selectedOrderId) {
      setErrorMsg("Please select an order to verify.");
      return;
    }

    const cleanCode = (enteredCode || "").trim();
    if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      setErrorMsg("Verification code must be a 6-digit number.");
      return;
    }

    try {
      await verifyOrderDelivery(selectedOrderId, cleanCode);
      
      // Success
      setIsSuccess(true);
      playSuccess();
      
      // Confetti burst
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.65 },
        colors: ["#a855f7", "#8b5cf6", "#10b981", "#3b82f6"]
      });

      // Navigate away after animation finishes
      setTimeout(() => {
        navigate("/");
      }, 2500);

    } catch (err) {
      // Failure
      playError();
      setErrorMsg(err.message || "Incorrect code");
      setIsShaking(true);
      setCode("");
      setTimeout(() => {
        setIsShaking(false);
      }, 500);
    }
  };

  return (
    <RouteWrapper>
      {/* Back button */}
      <div className="flex items-center mb-6">
        <Link
          to="/"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-white/5 border border-white/5 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
      </div>

      {/* Main card */}
      <div className="glass-panel border border-white/5 rounded-3xl p-6 relative overflow-hidden">
        {isSuccess ? (
          /* Success Screen */
          <div className="py-12 flex flex-col items-center justify-center text-center animate-scale-in">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mb-6 relative">
              <Unlock className="w-10 h-10 text-emerald-400 animate-pulse-subtle" />
              <div className="absolute inset-0 rounded-full glow-emerald opacity-50"></div>
            </div>
            <h3 className="text-xl font-black font-outfit text-white">Verification Approved</h3>
            <p className="text-xs text-zinc-400 mt-2 max-w-[220px]">
              Shipment {selectedOrderId} successfully marked as **Delivered**. Timestamp saved.
            </p>
            <span className="text-[10px] text-zinc-500 font-mono mt-4">Redirecting to Dashboard...</span>
          </div>
        ) : (
          /* Input Pad */
          <div>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-5 h-5 text-brand-400" />
              </div>
              <h3 className="text-lg font-black font-outfit text-white">Secure Delivery Code</h3>
              <p className="text-xs text-zinc-400 mt-1">Request the 6-digit delivery verification code from the recipient</p>
            </div>

            {/* Shipment SelectDropdown */}
            <div className="mb-6">
              <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 font-mono block mb-2">
                Active Order
              </label>
              {transitOrders.length > 0 ? (
                <select
                  value={selectedOrderId}
                  onChange={(e) => {
                    setSelectedOrderId(e.target.value);
                    setCode("");
                    setErrorMsg("");
                  }}
                  className="w-full px-3.5 py-3 rounded-xl text-xs glass-input border border-white/5"
                >
                  {transitOrders.map(o => (
                    <option key={o.id} value={o.id} className="bg-slate-900 text-white">
                      {o.id} - {o.customerName || "Unknown Customer"} ({o.address ? o.address.split(",")[0] : "No Address"})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 text-center rounded-xl bg-zinc-950/60 border border-white/5">
                  <p className="text-xs text-zinc-400 font-medium">No active "In Transit" orders.</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Please start a route in details first.</p>
                </div>
              )}
            </div>

            {/* Code Slots Display */}
            <div className={`flex justify-center space-x-2 mb-6 ${isShaking ? "animate-shake" : ""}`}>
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const isFilled = code.length > idx;
                const digit = isFilled ? code[idx] : "";
                return (
                  <div
                    key={idx}
                    className={`w-11 h-14 rounded-xl border flex items-center justify-center text-xl font-bold font-outfit transition-all duration-150 ${
                      errorMsg
                        ? "border-rose-500 bg-rose-500/5 text-rose-400"
                        : isFilled
                        ? "border-brand-500 bg-brand-500/5 text-white scale-105"
                        : "border-white/10 bg-zinc-950/40 text-zinc-500"
                    }`}
                  >
                    {isFilled ? (
                      <span className="animate-scale-in">{digit}</span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="flex items-center justify-center space-x-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 py-2.5 px-3 rounded-xl mb-6 animate-scale-in">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span className="font-semibold">{errorMsg}</span>
              </div>
            )}

            {/* Virtual Keyboard */}
            <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto mb-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  disabled={transitOrders.length === 0}
                  onClick={() => handleKeyPress(num.toString())}
                  className="py-4 text-lg font-bold font-outfit rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/5 text-white flex items-center justify-center active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
                >
                  {num}
                </button>
              ))}
              <button
                disabled={transitOrders.length === 0}
                onClick={handleClear}
                className="py-4 text-xs font-extrabold uppercase rounded-2xl bg-zinc-900/30 hover:bg-zinc-800/60 border border-white/5 text-zinc-400 flex items-center justify-center active:scale-95 transition-all disabled:opacity-40"
              >
                Clear
              </button>
              <button
                key={0}
                disabled={transitOrders.length === 0}
                onClick={() => handleKeyPress("0")}
                className="py-4 text-lg font-bold font-outfit rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/5 text-white flex items-center justify-center active:scale-95 transition-all disabled:opacity-40"
              >
                0
              </button>
              <button
                disabled={transitOrders.length === 0}
                onClick={handleDelete}
                className="py-4 text-xs font-bold rounded-2xl bg-zinc-900/30 hover:bg-zinc-800/60 border border-white/5 text-zinc-400 flex items-center justify-center active:scale-95 transition-all disabled:opacity-40"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </RouteWrapper>
  );
}
