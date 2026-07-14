import { Link } from "react-router-dom";
import { Navigation, ShieldCheck, MapPin, Package, ArrowRight, CheckCircle2 } from "lucide-react";
import { useOrders, getStatusVal } from "../context/OrderContext";

export default function OrderCard({ order }) {
  const { startOrderDelivery } = useOrders();

  if (!order) return null;

  // Defensive value extraction using actual Firestore fields
  const orderId = order.id || "ORD-UNKNOWN";
  const orderTotal = typeof order.totalAmount === "number" ? order.totalAmount : parseFloat(order.totalAmount) || 0;
  const itemsList = Array.isArray(order.items) ? order.items : [];
  const itemsCount = itemsList.length;
  const statusVal = getStatusVal(order.status);
  const customerName = order.customerName || "Unknown Customer";
  const addressVal = order.address || "No address provided";
  const distanceVal = order.distance || "0.0 miles";

  const getStatusStyle = (status) => {
    switch (status) {
      case "assigned":
        return "bg-brand-500/10 text-brand-300 border-brand-500/20";
      case "in-transit":
        return "bg-amber-500/10 text-amber-300 border-amber-500/20";
      case "delivered":
        return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
      default:
        return "bg-zinc-800 text-zinc-400 border-zinc-700";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "assigned": return "Assigned";
      case "in-transit": return "In Transit";
      case "delivered": return "Delivered";
      default: return status;
    }
  };

  const handleStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    startOrderDelivery(orderId);
  };

  return (
    <div className="glass-panel glass-panel-hover rounded-2xl overflow-hidden border border-white/5 p-4 transition-all duration-300">
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono text-zinc-400 tracking-wider">{orderId}</span>
          <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${getStatusStyle(statusVal)}`}>
            {getStatusLabel(statusVal)}
          </span>
        </div>
        <span className="text-sm font-extrabold text-white font-outfit">₹{orderTotal.toFixed(2)}</span>
      </div>

      {/* Main details */}
      <div className="space-y-2 mb-4">
        {/* Customer & Items count */}
        <div className="flex items-center space-x-2 text-zinc-200">
          <Package className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          <span className="text-xs font-medium truncate">
            {customerName} • <span className="text-zinc-400">{itemsCount} item(s)</span>
          </span>
        </div>

        {/* Address */}
        <div className="flex items-start space-x-2 text-zinc-300">
          <MapPin className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-0.5" />
          <span className="text-xs leading-snug line-clamp-1">{addressVal}</span>
        </div>
      </div>

      {/* Action Row */}
      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <span className="text-[11px] text-zinc-400 font-medium">{distanceVal} away</span>
        
        <div className="flex items-center space-x-2">
          {/* Action buttons based on status */}
          {statusVal === "assigned" && (
            <button
              onClick={handleStart}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/10 transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Start</span>
            </button>
          )}

          {statusVal === "in-transit" && (
            <Link
              to="/verify"
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/10 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verify</span>
            </Link>
          )}

          {statusVal === "delivered" && (
            <div className="flex items-center space-x-1 text-emerald-400 text-xs font-semibold px-2 py-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Closed</span>
            </div>
          )}

          <Link
            to={`/orders/${orderId}`}
            className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 transition-all"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
