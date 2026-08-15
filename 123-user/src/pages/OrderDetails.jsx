import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { getOrderById, getUserProfile } from '../services/db';
import { db, isFirebaseActive } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import GoogleMapView from '../components/GoogleMapView';
import { 
  ChevronLeft, 
  Phone, 
  Store, 
  Calendar, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Package, 
  ThumbsUp, 
  Lock
} from 'lucide-react';

const STATUS_STEPS = [
  { id: 'Pending', label: 'Order Pending', icon: Clock, desc: 'Awaiting distributor confirmation' },
  { id: 'Accepted', label: 'Accepted', icon: ThumbsUp, desc: 'Accepted by distributor' },
  { id: 'Packed', label: 'Packed & Ready', icon: Package, desc: 'Items packed in crates' },
  { id: 'Out For Delivery', label: 'Out for Delivery', icon: Truck, desc: 'Delivery agent is on the way' },
  { id: 'Delivered', label: 'Delivered', icon: CheckCircle2, desc: 'Order received and verified' }
];

export default function OrderDetails() {
  const { id } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const justPlaced = location.state?.orderPlaced || false;
  const [driver, setDriver] = useState(null);
  const [driverLoading, setDriverLoading] = useState(false);
  const [customerProfile, setCustomerProfile] = useState(null);

  useEffect(() => {
    let unsubscribe = () => {};

    if (isFirebaseActive && id) {
      const docRef = doc(db, 'orders', id);
      unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          setOrder({ id: docSnap.id, ...docSnap.data() });
        } else {
          setOrder(null);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error subscribing to order updates:", error);
        setLoading(false);
      });
    } else {
      async function loadOrder() {
        try {
          const orderData = await getOrderById(id);
          setOrder(orderData);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      }
      loadOrder();
    }

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    let unsubscribeDriver = () => {};

    const driverId = order?.deliveryStaffId || order?.assignedDriverId;
    const isDriverStatus = order?.status === 'Out For Delivery' || order?.status === 'Delivered';

    if (isFirebaseActive && driverId && isDriverStatus) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDriverLoading(true);
      const driverRef = doc(db, 'deliveryStaff', driverId);
      unsubscribeDriver = onSnapshot(driverRef, (docSnap) => {
        if (docSnap.exists()) {
          setDriver({ id: docSnap.id, ...docSnap.data() });
        } else {
          setDriver(null);
        }
        setDriverLoading(false);
      }, (error) => {
        console.error("Error subscribing to driver updates:", error);
        setDriverLoading(false);
      });
    } else {
      setDriver(null);
      setDriverLoading(false);
    }

    return () => unsubscribeDriver();
  }, [order?.deliveryStaffId, order?.assignedDriverId, order?.status]);

  useEffect(() => {
    const custId = order?.customerId || order?.userId;
    if (!custId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCustomerProfile(null);
      return;
    }

    let unsubscribe = () => {};

    if (isFirebaseActive) {
      const docRef = doc(db, 'customers', custId);
      unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          setCustomerProfile(docSnap.data());
        } else {
          setCustomerProfile(null);
        }
      }, (error) => {
        console.error("Error subscribing to customer updates:", error);
      });
    } else {
      async function loadCustomer() {
        try {
          const profile = await getUserProfile(custId);
          setCustomerProfile(profile);
        } catch (e) {
          console.error("Error loading customer profile:", e);
        }
      }
      loadCustomer();
    }

    return () => unsubscribe();
  }, [order?.customerId, order?.userId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse space-y-6">
        <div className="h-6 w-32 bg-gray-200 rounded" />
        <div className="h-40 bg-white rounded-2xl border border-gray-100" />
        <div className="h-80 bg-white rounded-2xl border border-gray-100" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-gray-800">Order Not Found</h2>
        <p className="text-sm text-gray-500 mt-2">We couldn't find an order matching reference code: {id}</p>
        <Link to="/orders" className="mt-5 inline-block text-xs bg-brand text-white font-bold px-4 py-2 rounded-full">
          Back to Order List
        </Link>
      </div>
    );
  }

  // Get index of current status to highlight progress bar
  const currentStepIdx = STATUS_STEPS.findIndex(step => step.id === order.status);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <Link to="/orders" className="text-xs text-gray-500 hover:text-brand font-bold flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Back to My Orders
        </Link>
        {justPlaced && (
          <div className="bg-emerald-50 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-100 animate-bounce">
            🎉 Order Placed Successfully!
          </div>
        )}
      </div>

      {/* order banner */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">{order.id}</h1>
          <p className="text-xs text-gray-400 font-semibold mt-1 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Placed: {new Date(order.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Invoice Total</p>
          <p className="text-2xl font-black text-brand">₹{order.totalAmount}</p>
        </div>
      </div>


      {/* SECURE DELIVERY VERIFICATION CODE (Shows only if status is Out For Delivery) */}
      {order.status === 'Out For Delivery' && order.deliveryCode && (
        <div className="bg-brand-light border-2 border-dashed border-brand p-5 rounded-2xl text-center space-y-2 animate-pulse">
          <div className="inline-flex p-2.5 bg-brand text-white rounded-full">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-xs font-extrabold text-brand-dark uppercase tracking-widest">Your Delivery Verification Code</h2>
          <div className="text-3xl font-black text-brand tracking-widest font-mono bg-white inline-block px-6 py-2 rounded-xl shadow-inner border border-brand/20">
            {order.deliveryCode}
          </div>
          <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed pt-1.5">
            ⚠️ <strong>Share code only after receiving products.</strong> Tell this 6-digit code to the delivery driver only after checking all box counts and items.
          </p>
        </div>
      )}

      {/* TRACKING TIMELINE */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <h2 className="font-extrabold text-base text-gray-900 tracking-tight">Delivery Tracker</h2>

        {/* Timeline Grid */}
        <div className="relative pl-6 space-y-6 border-l-2 border-gray-100 ml-4 py-2">
          {STATUS_STEPS.map((step, idx) => {
            const StepIcon = step.icon;
            const isCompleted = idx <= currentStepIdx;
            const isCurrent = idx === currentStepIdx;

            return (
              <div key={step.id} className="relative">
                {/* Timeline Dot/Icon */}
                <div 
                  className={`absolute -left-10 top-0.5 rounded-full p-1.5 border-2 transition-all ${
                    isCompleted 
                      ? 'bg-accent text-white border-accent' 
                      : 'bg-white text-gray-300 border-gray-200'
                  } ${isCurrent ? 'ring-4 ring-accent/20 scale-110' : ''}`}
                >
                  <StepIcon className="h-4.5 w-4.5" />
                </div>

                {/* Timeline Description */}
                <div>
                  <h3 className={`text-sm font-extrabold ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                    {step.label}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5 font-medium">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DELIVERY PARTNER DETAILS */}
      {(order.status === 'Out For Delivery' || order.status === 'Delivered') && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
            <Truck className="h-5 w-5 text-brand" />
            <h2 className="font-extrabold text-base text-gray-900 tracking-tight">Delivery Partner Details</h2>
          </div>

          {driverLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-100 rounded w-1/3" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
              <div className="h-4 bg-gray-100 rounded w-1/4" />
            </div>
          ) : (order.deliveryStaffId || order.assignedDriverId) ? (
            driver ? (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-gray-700">
                    <span className="font-bold">Name:</span> {driver.name}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-bold">Phone:</span> {driver.phone || driver.mobileNumber}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-bold">Status:</span> {order.status}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-500 py-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                <span className="text-sm font-semibold">Delivery partner not assigned yet</span>
              </div>
            )
          ) : (
            <div className="flex items-center gap-2 text-gray-500 py-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-semibold">Delivery partner not assigned yet</span>
            </div>
          )}
        </div>
      )}

      {/* GOOGLE MAPS DELIVERY PREVIEW */}
      <GoogleMapView
        latitude={order.deliveryAddress && typeof order.deliveryAddress === 'object' ? order.deliveryAddress.latitude : null}
        longitude={order.deliveryAddress && typeof order.deliveryAddress === 'object' ? order.deliveryAddress.longitude : null}
        address={order.deliveryAddress && typeof order.deliveryAddress === 'object' ? order.deliveryAddress.fullAddress : (order.address || "Delivery Address")}
        title={`Delivery Address for Order #${order.id?.substring(0, 8)}`}
        height="200px"
      />

      {/* INVOICE & ITEM LIST */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-50 bg-gray-50/40">
          <h2 className="font-extrabold text-base text-gray-900 tracking-tight">Order Invoice Items</h2>
        </div>
        
        {/* Item table */}
        <div className="divide-y divide-gray-50">
          {order.items.map((item) => (
            <div key={item.id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="h-12 w-12 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
                <img 
                  src={item.imageUrl || item.image || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=600'} 
                  alt={item.name} 
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=600';
                  }}
                  className="h-full w-full object-cover" 
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-gray-900 truncate leading-snug">{item.name}</h4>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">{item.brand} | {item.unit}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-black text-gray-800">₹{item.price * item.quantity}</p>
                <p className="text-[10px] text-gray-400 font-semibold mt-0.5">₹{item.price} x {item.quantity}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Invoice Summary */}
        <div className="p-5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs font-semibold text-gray-600">
          <div className="space-y-1">
            <p className="flex items-center gap-1">
              <Store className="h-3.5 w-3.5 text-brand" />
              {(order.shopName || customerProfile?.shopName) ? (
                <>
                  <strong>Delivering to Shop:</strong> {order.shopName || customerProfile?.shopName} ({customerProfile?.ownerName || order.ownerName})
                </>
              ) : (
                <>
                  <strong>Delivering to:</strong> {customerProfile?.ownerName || order.ownerName}
                </>
              )}
            </p>
            <p className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5 text-brand" />
              <strong>Contact Mobile:</strong> {customerProfile?.mobile || order.mobileNumber || order.mobile || 'N/A'}
            </p>
            <div className="pl-4.5 max-w-md text-left">
              <strong>Address:</strong>
              {order.deliveryAddress && typeof order.deliveryAddress === 'object' ? (
                <div className="mt-1 leading-relaxed text-gray-500 text-left font-semibold">
                  <p>H.No {order.deliveryAddress.houseNumber}</p>
                  <p>{order.deliveryAddress.street}, {order.deliveryAddress.area}</p>
                  {order.deliveryAddress.landmark && <p>Near: {order.deliveryAddress.landmark}</p>}
                  <p>Siddipet - {!order.deliveryAddress.pincode || order.deliveryAddress.pincode === '508100' ? '502103' : order.deliveryAddress.pincode}, Telangana</p>
                </div>
              ) : (
                <span> {customerProfile?.address || order.deliveryAddress || 'N/A'}</span>
              )}
            </div>
          </div>

          <div className="w-full sm:w-64 space-y-2 border-t border-gray-200 sm:border-none pt-4 sm:pt-0">
            <div className="flex justify-between">
              <span>Items Subtotal</span>
              <span className="text-gray-900 font-bold">₹{order.subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span className="text-gray-900 font-bold">₹{order.deliveryFee}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-black text-gray-900 border-t border-gray-200 pt-2">
              <span>Total Paid</span>
              <span className="text-lg text-brand">₹{order.totalAmount}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
