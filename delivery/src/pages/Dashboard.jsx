import { useState } from "react";
import { Link } from "react-router-dom";
import { useOrders, getStatusVal } from "../context/OrderContext";
import RouteWrapper from "../components/RouteWrapper";
import { 
  IndianRupee, 
  TrendingUp, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  Activity, 
  ChevronRight,
  Sparkles,
  Calendar
} from "lucide-react";

export default function Dashboard() {
  const { orders, profile, activeOrder } = useOrders();
  const todayLocalDate = new Date().toLocaleDateString();
  const [selectedDateStr, setSelectedDateStr] = useState(todayLocalDate);

  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500"></div>
      </div>
    );
  }

  // Calculate stats based on orders list
  const ordersList = Array.isArray(orders) ? orders : [];
  const assignedCount = ordersList.filter(o => o && getStatusVal(o.status) === "assigned").length;
  const pendingCount = ordersList.filter(o => o && getStatusVal(o.status) === "in-transit").length;
  const completedCount = ordersList.filter(o => o && getStatusVal(o.status) === "delivered").length;

  // Calculate today's pay: sum of order totalAmount of delivered orders today
  const todaysPay = ordersList
    .filter(o => {
      if (!o || getStatusVal(o.status) !== "delivered") return false;
      const deliveryDateStr = o.deliveredAt || o.completedTimestamp;
      if (!deliveryDateStr) return false;
      return new Date(deliveryDateStr).toLocaleDateString() === todayLocalDate;
    })
    .reduce((sum, o) => {
      const orderTotal = typeof o.totalAmount === "number" ? o.totalAmount : parseFloat(o.totalAmount) || 0;
      return sum + orderTotal;
    }, 0);

  // Generate last 7 days list dynamically
  const getLast7Days = () => {
    const list = [];
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const isToday = i === 0;
      const isYesterday = i === 1;
      let label = isToday ? "Today" : isYesterday ? "Y'day" : weekdays[d.getDay()];
      list.push({
        dateObj: d,
        dateStr: d.toLocaleDateString(),
        formattedDate: d.toLocaleDateString([], { day: "numeric", month: "short" }),
        label
      });
    }
    return list;
  };

  const last7Days = getLast7Days();

  // Filter orders for selected day
  const selectedDayOrders = ordersList.filter(o => {
    if (!o || getStatusVal(o.status) !== "delivered") return false;
    const deliveryDateStr = o.deliveredAt || o.completedTimestamp;
    if (!deliveryDateStr) return false;
    return new Date(deliveryDateStr).toLocaleDateString() === selectedDateStr;
  });

  const selectedDayTotal = selectedDayOrders.reduce((sum, o) => {
    const amount = typeof o.totalAmount === "number" ? o.totalAmount : parseFloat(o.totalAmount) || 0;
    return sum + amount;
  }, 0);

  // Render weekly performance chart mock data points
  // SVG Width: 400, Height: 120
  // Days: Mon (20), Tue (80), Wed (140), Thu (200), Fri (260), Sat (320), Sun (380)
  // Deliveries: [3, 5, 2, 8, 6, 9, 12] mapped to Y: [90, 70, 100, 40, 60, 30, 10]
  const chartPoints = "20,90 80,70 140,100 200,40 260,60 320,30 380,10";

  return (
    <RouteWrapper>
      {/* Welcome & Overview */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black font-outfit text-white leading-none flex items-center">
            Hi, {(profile?.name || "Rider").split(" ")[0]}
            <Sparkles className="w-4 h-4 ml-1.5 text-brand-400 animate-pulse-subtle" />
          </h2>
          <p className="text-xs text-zinc-400 mt-1">You are active on {(profile?.vehicle || "Bike").split(" ")[0]}</p>
        </div>
        <img 
          src={profile?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop"} 
          alt={profile?.name || "Rider"} 
          className="w-11 h-11 rounded-full border border-brand-500/30 object-cover shadow-lg"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Pay, Stats & Active Route */}
        <div className="lg:col-span-8 space-y-6">
          {/* Today's Pay Card (Rating Removed) */}
          <div>
            <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between h-28 border border-white/5 relative overflow-hidden group">
              <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-16 h-16 bg-brand-500/10 rounded-full blur-xl group-hover:scale-150 transition-all duration-300"></div>
              <div className="flex justify-between items-start">
                <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">Today's Pay</span>
                <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black font-outfit text-white">₹{todaysPay.toFixed(2)}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5 flex items-center">
                  <TrendingUp className="w-3 h-3 text-emerald-400 mr-1 animate-pulse" />
                  <span>Total from today's completed deliveries</span>
                </p>
              </div>
            </div>
          </div>

          {/* Mini Stats Banner */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card rounded-xl p-2.5 text-center border border-white/5">
              <p className="text-xs text-zinc-400">Assigned</p>
              <p className="text-base font-extrabold text-brand-400 mt-0.5">{assignedCount}</p>
            </div>
            <div className="glass-card rounded-xl p-2.5 text-center border border-white/5">
              <p className="text-xs text-zinc-400">In Transit</p>
              <p className="text-base font-extrabold text-amber-400 mt-0.5">{pendingCount}</p>
            </div>
            <div className="glass-card rounded-xl p-2.5 text-center border border-white/5">
              <p className="text-xs text-zinc-400">Completed</p>
              <p className="text-base font-extrabold text-emerald-400 mt-0.5">{completedCount}</p>
            </div>
          </div>

          {/* Active Order Banner Section */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 font-mono flex items-center">
              <Activity className="w-3.5 h-3.5 mr-1.5 text-brand-400" />
              Active Route
            </h3>

            {activeOrder ? (() => {
              const activeStatus = getStatusVal(activeOrder.status);
              return (
                <div className="glass-panel border-l-4 border-l-brand-500 rounded-2xl p-4 shadow-xl border border-white/5 overflow-hidden relative">
                  {/* Background Glow */}
                  <div className="absolute -right-12 -bottom-12 w-28 h-28 bg-brand-500/5 rounded-full blur-2xl"></div>

                  {/* Header info */}
                  <div className="flex items-center justify-between mb-3.5">
                    <div>
                      <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">{activeOrder.id}</span>
                      <h4 className="text-sm font-bold text-white mt-0.5">{activeOrder.customerName || "Unknown Customer"}</h4>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      activeStatus === "assigned"
                        ? "bg-brand-500/10 text-brand-300 border-brand-500/20"
                        : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                    }`}>
                      {activeStatus === "assigned" ? "Assigned" : "In Transit"}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-2.5 mb-4">
                    <div className="flex items-start space-x-2">
                      <MapPin className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-zinc-300 leading-snug">{activeOrder.address}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-[11px] text-zinc-400 font-medium">{activeOrder.estTime || "15 mins"} est.</span>
                      </div>
                      <div className="text-[11px] text-zinc-500">•</div>
                      <div className="text-[11px] text-zinc-400 font-medium">{activeOrder.distance || "1.2 miles"} away</div>
                    </div>
                  </div>

                  {/* Route actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <Link
                      to={`/orders/${activeOrder.id}`}
                      className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center"
                    >
                      View Customer Details
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </Link>

                    <Link
                      to="/verify"
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/10 transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verify Code</span>
                    </Link>
                  </div>
                </div>
              );
            })() : (
              <div className="glass-card rounded-2xl p-6 text-center border border-white/5 flex flex-col items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center mb-3">
                  <Activity className="w-5 h-5 text-zinc-500" />
                </div>
                <p className="text-xs font-semibold text-zinc-400">No active delivery route right now</p>
                <Link
                  to="/orders"
                  className="text-xs text-brand-400 hover:text-brand-300 font-bold mt-2 flex items-center"
                >
                  Browse Assigned Orders
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Day-wise Collection Data Container */}
          <div className="glass-panel rounded-2xl p-5 border border-white/5 relative overflow-hidden">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 font-mono flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-brand-400" />
              Day-wise Collection Data
            </h3>

            {/* Horizontal Date Selection Row */}
            <div className="flex space-x-2 pb-3 overflow-x-auto no-scrollbar scroll-smooth">
              {last7Days.map((item) => {
                const isSelected = item.dateStr === selectedDateStr;
                return (
                  <button
                    key={item.dateStr}
                    onClick={() => setSelectedDateStr(item.dateStr)}
                    className={`flex-shrink-0 flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-200 w-[72px] h-[72px] ${
                      isSelected
                        ? "bg-brand-500/10 border-brand-500/50 text-white shadow-lg shadow-brand-500/5 scale-105"
                        : "bg-zinc-900/40 border-white/5 text-zinc-400 hover:text-zinc-200 hover:border-white/10"
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider">{item.label}</span>
                    <span className="text-sm font-extrabold font-outfit mt-1">{item.formattedDate.split(" ")[0]}</span>
                    <span className="text-[9px] font-medium opacity-60 mt-0.5">{item.formattedDate.split(" ")[1]}</span>
                  </button>
                );
              })}
            </div>

            {/* Summary Box */}
            <div className="mt-4 p-3 rounded-xl bg-zinc-950/40 border border-white/5 flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase tracking-wider font-semibold text-zinc-500 font-mono">Collections Summary</span>
                <span className="text-xs font-bold text-zinc-300 block mt-0.5">
                  {selectedDayOrders.length} Completed Delivery(ies)
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase tracking-wider font-semibold text-zinc-500 font-mono">Total Collected</span>
                <span className="text-base font-extrabold text-emerald-400 font-outfit block mt-0.5">
                  ₹{selectedDayTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Orders list for that selected day */}
            <div className="mt-4 space-y-3">
              {selectedDayOrders.length > 0 ? (
                selectedDayOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex justify-between items-center p-3 rounded-xl bg-zinc-900/20 border border-white/5 hover:border-brand-500/20 transition-all group"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">{order.id}</span>
                        <span className="text-[9px] text-zinc-500 font-mono">
                          {order.deliveredAt || order.completedTimestamp
                            ? new Date(order.deliveredAt || order.completedTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ""}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-zinc-300 truncate mt-0.5">
                        {order.customerName || "Unknown Customer"}
                      </h4>
                      <p className="text-[9px] text-zinc-500 truncate">{order.shopName || "N/A"}</p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-extrabold text-white font-outfit">
                        ₹{(typeof order.totalAmount === "number" ? order.totalAmount : parseFloat(order.totalAmount) || 0).toFixed(2)}
                      </span>
                      <Link
                        to={`/orders/${order.id}`}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                      >
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-5 text-center rounded-xl bg-zinc-950/20 border border-white/5">
                  <p className="text-xs text-zinc-500 font-medium">No completed deliveries on this day</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Alerts & Charts */}
        <div className="lg:col-span-4 space-y-6">
          {/* Offline Alert */}
          {!profile.isOnline && (
            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center border border-white/5">
                  <Clock className="w-4.5 h-4.5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-300">You are currently Offline</p>
                  <p className="text-[10px] text-zinc-500">Go online in header to accept new orders.</p>
                </div>
              </div>
            </div>
          )}

          {/* Performance Chart Card */}
          <div className="glass-panel rounded-2xl p-4 border border-white/5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3.5 font-mono">
              Weekly Performance (Deliveries)
            </h3>

            {/* SVG Chart */}
            <div className="w-full relative h-36">
              <svg className="w-full h-full" viewBox="0 0 400 120">
                <defs>
                  <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(139, 92, 246, 0.25)" />
                    <stop offset="100%" stopColor="rgba(139, 92, 246, 0)" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="0" y1="20" x2="400" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                <line x1="0" y1="60" x2="400" y2="60" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                <line x1="0" y1="100" x2="400" y2="100" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

                {/* Gradient Fill under Path */}
                <path
                  d={`M 20 120 L 20 90 L 80 70 L 140 100 L 200 40 L 260 60 L 320 30 L 380 10 L 380 120 Z`}
                  fill="url(#chart-grad)"
                />

                {/* Line Path */}
                <polyline
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="2.5"
                  points={chartPoints}
                  className="glow-brand"
                />

                {/* Node Points */}
                <circle cx="20" cy="90" r="3.5" fill="#a855f7" stroke="#ffffff" strokeWidth="1" />
                <circle cx="80" cy="70" r="3.5" fill="#a855f7" stroke="#ffffff" strokeWidth="1" />
                <circle cx="140" cy="100" r="3.5" fill="#a855f7" stroke="#ffffff" strokeWidth="1" />
                <circle cx="200" cy="40" r="3.5" fill="#a855f7" stroke="#ffffff" strokeWidth="1" />
                <circle cx="260" cy="60" r="3.5" fill="#a855f7" stroke="#ffffff" strokeWidth="1" />
                <circle cx="320" cy="30" r="3.5" fill="#a855f7" stroke="#ffffff" strokeWidth="1" />
                <circle cx="380" cy="10" r="3.5" fill="#a855f7" stroke="#ffffff" strokeWidth="1" />
              </svg>
              
              {/* Chart X-axis Labels */}
              <div className="flex justify-between items-center text-[10px] font-semibold text-zinc-500 font-mono mt-1 px-1">
                <span>MON</span>
                <span>TUE</span>
                <span>WED</span>
                <span>THU</span>
                <span>FRI</span>
                <span>SAT</span>
                <span>SUN</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RouteWrapper>
  );
}
