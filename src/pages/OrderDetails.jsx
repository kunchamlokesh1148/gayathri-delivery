import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useOrders, getStatusVal } from "../context/OrderContext";
import RouteWrapper from "../components/RouteWrapper";
import { 
  ArrowLeft, 
  Phone, 
  MapPin, 
  Clock, 
  Navigation, 
  ShieldCheck, 
  User, 
  FileText,
  AlertCircle,
  CreditCard,
  Store,
  Calendar,
  CheckCircle2
} from "lucide-react";

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { orders, startOrderDelivery } = useOrders();

  const order = orders.find(o => o.id === id);

  if (!order) {
    return (
      <RouteWrapper>
        <div className="glass-panel rounded-2xl p-6 text-center border border-white/5">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">Order Not Found</h3>
          <p className="text-xs text-zinc-400 mt-2">The order ID does not exist or has been removed.</p>
          <Link to="/" className="inline-block mt-4 px-4 py-2 bg-brand-600 rounded-xl text-xs font-bold text-white">
            Return to Dashboard
          </Link>
        </div>
      </RouteWrapper>
    );
  }

  // Extract Firestore fields defensively
  const orderId = order.id || "ORD-UNKNOWN";
  const customerName = order.customerName || "Unknown Customer";
  const shopName = order.shopName || "N/A";
  const customerPhone = order.phone || order.mobileNumber || order.mobile || "";
  const address = (order.deliveryAddress && typeof order.deliveryAddress === 'object')
    ? (order.deliveryAddress.fullAddress || "No address provided")
    : (order.address || order.deliveryAddress || "No address provided");
  
  const itemsList = Array.isArray(order.items) ? order.items : [];
  const totalQty = order.quantity || itemsList.reduce((sum, item) => sum + (item.qty || item.quantity || 1), 0);
  
  const deliveryChargeVal = typeof order.deliveryCharge === 'number' 
    ? order.deliveryCharge 
    : parseFloat(order.deliveryCharge) || typeof order.deliveryFee === 'number' 
      ? order.deliveryFee 
      : parseFloat(order.deliveryFee) || 0;
      
  const totalAmountVal = typeof order.totalAmount === 'number' 
    ? order.totalAmount 
    : parseFloat(order.totalAmount) || 0;
    
  const subtotalVal = typeof order.subtotal === 'number' 
    ? order.subtotal 
    : parseFloat(order.subtotal) || (totalAmountVal - deliveryChargeVal);
    
  const paymentMethodVal = order.paymentMethod || "Cash On Delivery (COD)";
  
  const orderDate = order.createdAt 
    ? new Date(order.createdAt).toLocaleDateString([], { dateStyle: 'medium' }) + ' ' + new Date(order.createdAt).toLocaleTimeString([], { timeStyle: 'short' }) 
    : order.createdTime || "N/A";

  const orderStatus = getStatusVal(order.status);

  const handleStart = async () => {
    await startOrderDelivery(order.id);
  };

  // Clean phone number for tel: link (remove spaces, dashes)
  const cleanPhone = customerPhone.replace(/[\s\-()]/g, '');

  const handleOpenMaps = () => {
    if (order.deliveryAddress && typeof order.deliveryAddress === 'object' && order.deliveryAddress.latitude && order.deliveryAddress.longitude) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${order.deliveryAddress.latitude},${order.deliveryAddress.longitude}`, '_blank');
    } else if (address && address !== "No address provided") {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    }
  };

  return (
    <RouteWrapper>
      {/* Back Header */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-white/5 border border-white/5 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest">{orderId}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Customer Details */}
          <div className="glass-panel rounded-2xl p-5 border border-white/5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 font-mono flex items-center">
              <User className="w-4 h-4 mr-2 text-zinc-500" />
              CUSTOMER DETAILS
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-start text-xs">
                <span className="text-zinc-400 font-medium w-24">Customer Name</span>
                <span className="text-white font-semibold text-right flex-1">{customerName}</span>
              </div>
              <div className="flex justify-between items-start text-xs">
                <span className="text-zinc-400 font-medium w-24">Shop Name</span>
                <span className="text-white font-semibold text-right flex-1">{shopName}</span>
              </div>
              <div className="flex justify-between items-start text-xs">
                <span className="text-zinc-400 font-medium w-24">Mobile Number</span>
                <span className="text-white font-mono font-semibold text-right flex-1">{customerPhone || "N/A"}</span>
              </div>
              <div className="flex justify-between items-start text-xs pt-1 border-t border-white/5">
                <span className="text-zinc-400 font-medium w-24 mt-1">Delivery Address</span>
                <span className="text-zinc-200 font-medium text-right flex-1 leading-relaxed mt-1">{address}</span>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="glass-panel rounded-2xl p-5 border border-white/5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 font-mono flex items-center">
              <FileText className="w-4 h-4 mr-2 text-zinc-500" />
              ORDER DETAILS
            </h3>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-medium">Order ID</span>
                <span className="text-white font-mono font-semibold">{orderId}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-medium">Order Date</span>
                <span className="text-white font-semibold">{orderDate}</span>
              </div>
            </div>

            {/* Itemized List */}
            <div className="border-t border-white/5 pt-3 mb-4 space-y-2.5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">Items Ordered</span>
              {itemsList.map((item, index) => {
                const qty = item.qty || item.quantity || 1;
                const price = item.price || 0;
                return (
                  <div key={index} className="flex justify-between items-center text-xs py-1">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded bg-white/5 border border-white/5 text-zinc-300 font-bold flex items-center justify-center font-mono">
                        {qty}
                      </span>
                      <span className="text-zinc-200 font-medium">{item.name}</span>
                    </div>
                    <span className="text-zinc-400 font-mono">₹{(price * qty).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            {/* Subtotal, charges, totals */}
            <div className="border-t border-white/5 pt-3 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Quantity</span>
                <span className="text-zinc-300 font-semibold">{totalQty} item(s)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Subtotal</span>
                <span className="text-zinc-300 font-mono">₹{subtotalVal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Delivery Charges</span>
                <span className="text-zinc-300 font-mono">₹{deliveryChargeVal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/5">
                <span className="text-xs font-bold text-white">Total Amount</span>
                <span className="text-base font-extrabold text-white font-outfit">₹{totalAmountVal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Actions & Payment */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Stats / Quick Actions Panel */}
          <div className="glass-panel rounded-3xl border border-white/5 p-5 relative overflow-hidden">
            <div className="absolute -right-12 -top-12 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl"></div>
            
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">Amount to Collect</span>
                <span className="text-3xl font-black text-emerald-400 font-outfit mt-0.5 block">
                  ₹{totalAmountVal.toFixed(2)}
                </span>
              </div>
              <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${
                orderStatus === "assigned"
                  ? "bg-brand-500/10 text-brand-300 border-brand-500/20"
                  : orderStatus === "in-transit"
                    ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
              }`}>
                {orderStatus === "assigned" ? "Assigned" : orderStatus === "in-transit" ? "In Transit" : "Delivered"}
              </span>
            </div>

            {/* Action Buttons for calling and maps */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
              {cleanPhone ? (
                <a
                  href={`tel:${cleanPhone}`}
                  className="flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition duration-150 active:scale-98 no-underline"
                >
                  <Phone className="w-4 h-4" />
                  <span>📞 Call Customer</span>
                </a>
              ) : (
                <div
                  className="flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold bg-zinc-700 text-zinc-400 cursor-not-allowed opacity-60"
                >
                  <Phone className="w-4 h-4" />
                  <span>No Phone</span>
                </div>
              )}
              
              <button
                onClick={handleOpenMaps}
                className="flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/5 transition duration-150 active:scale-98"
              >
                <MapPin className="w-4 h-4" />
                <span>📍 Navigate</span>
              </button>
            </div>
          </div>

          {/* Payment Details */}
          <div className="glass-panel rounded-2xl p-5 border border-white/5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 font-mono flex items-center">
              <CreditCard className="w-4 h-4 mr-2 text-zinc-500" />
              PAYMENT DETAILS
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-medium">Payment Method</span>
                <span className="text-white font-semibold">{paymentMethodVal}</span>
              </div>
              <div className="flex justify-between items-center pt-2.5 border-t border-white/5">
                <span className="text-xs font-bold text-white">Amount To Collect</span>
                <span className="text-lg font-black text-emerald-400 font-outfit">
                  ₹{totalAmountVal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Button Section */}
          <div className="w-full mt-2">
            {orderStatus === "assigned" && (
              <button
                onClick={handleStart}
                className="w-full py-3.5 rounded-2xl font-bold bg-brand-600 hover:bg-brand-500 text-white text-xs flex items-center justify-center space-x-2 transition duration-200 shadow-xl shadow-brand-600/10 active:scale-99"
              >
                <Navigation className="w-4 h-4" />
                <span>Start Delivery Route</span>
              </button>
            )}

            {orderStatus === "in-transit" && (
              <Link
                to="/verify"
                className="w-full py-3.5 rounded-2xl font-bold bg-amber-600 hover:bg-amber-500 text-white text-xs flex items-center justify-center space-x-2 transition duration-200 shadow-xl shadow-amber-600/10 active:scale-99"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify Code & Complete Delivery</span>
              </Link>
            )}

            {orderStatus === "delivered" && (
              <div className="w-full py-3.5 rounded-2xl font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center space-x-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Delivered
                  {order.completedTimestamp ? ` on ${new Date(order.completedTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </RouteWrapper>
  );
}
