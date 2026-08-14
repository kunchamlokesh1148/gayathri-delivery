import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getOrders } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { ClipboardList, RefreshCw, Eye, Calendar, PackageOpen } from 'lucide-react';

export default function Orders() {
  const { user } = useAuth();
  const { loadPreviousOrderToCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [successNotification, setSuccessNotification] = useState(location.state?.orderPlaced || false);

  useEffect(() => {
    if (location.state?.orderPlaced) {
      // Clear location state to prevent repeating on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'delivered'
  const [reorderingId, setReorderingId] = useState(null);

  useEffect(() => {
    async function loadUserOrders() {
      if (user) {
        try {
          const fetched = await getOrders(user.uid);
          setOrders(fetched);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }
    loadUserOrders();
  }, [user]);

  const handleQuickReorder = (order) => {
    setReorderingId(order.id);
    // Simulate minor lag for visual effect
    setTimeout(() => {
      loadPreviousOrderToCart(order.items);
      setReorderingId(null);
      navigate('/cart');
    }, 800);
  };

  // Filter orders by active vs delivered
  const activeOrders = orders.filter(o => o.status !== 'Delivered');
  const pastOrders = orders.filter(o => o.status === 'Delivered');

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="inline-flex p-5 bg-brand-light rounded-full text-brand mb-6">
          <ClipboardList className="h-12 w-12" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Track your wholesale orders</h2>
        <p className="text-sm text-gray-500 mt-2">Log in to view your current deliveries, previous purchase history, and quick reordering templates.</p>
        <Link
          to="/auth"
          className="mt-6 inline-flex items-center justify-center bg-brand hover:bg-brand-dark text-white text-xs font-bold px-6 py-3 rounded-full shadow-md"
        >
          Sign In Now
        </Link>
      </div>
    );
  }

  // Helper for status badge styling
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      case 'Accepted':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Packed':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Out For Delivery':
        return 'bg-orange-50 text-orange-700 border-orange-100 animate-pulse';
      case 'Delivered':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-6">My Wholesale Orders</h1>

      {successNotification && (
        <div className="mb-6 p-4 bg-emerald-50 text-emerald-800 text-sm font-semibold rounded-xl border border-emerald-100 flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-2">
            <span>🎉</span>
            <span>Wholesale order has been placed successfully! It is now pending distributor acceptance.</span>
          </div>
          <button 
            onClick={() => setSuccessNotification(false)}
            className="text-emerald-500 hover:text-emerald-700 font-extrabold text-xs ml-3"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 bg-white rounded-xl p-1 border shadow-sm">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-3 text-xs font-bold rounded-lg text-center transition-all ${
            activeTab === 'active' 
              ? 'bg-brand text-white shadow-sm' 
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Active Orders ({activeOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('delivered')}
          className={`flex-1 py-3 text-xs font-bold rounded-lg text-center transition-all ${
            activeTab === 'delivered' 
              ? 'bg-brand text-white shadow-sm' 
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Delivered History ({pastOrders.length})
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(n => (
            <div key={n} className="bg-white rounded-2xl h-36 animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : (activeTab === 'active' ? activeOrders : pastOrders).length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center max-w-md mx-auto">
          <PackageOpen className="h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-800">No orders here</h3>
          <p className="text-sm text-gray-500 mt-1">
            {activeTab === 'active' 
              ? "You don't have any active deliveries at the moment." 
              : "You haven't completed any wholesale orders yet."}
          </p>
          <Link
            to="/products"
            className="mt-5 bg-brand hover:bg-brand-dark text-white text-xs font-bold px-4 py-2 rounded-full inline-flex items-center gap-1"
          >
            Start Browsing Stock
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {(activeTab === 'active' ? activeOrders : pastOrders).map((order) => (
            <div 
              key={order.id} 
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md overflow-hidden transition-all duration-200"
            >
              
              {/* Order Header info */}
              <div className="p-4 sm:p-5 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50/40">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-gray-900">{order.id}</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${getStatusBadge(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold mt-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Placed: {new Date(order.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Quick Reorder Button */}
                  <button
                    onClick={() => handleQuickReorder(order)}
                    disabled={reorderingId === order.id}
                    className="flex-1 sm:flex-none py-2 px-3 bg-brand-light hover:bg-brand text-brand hover:text-white border border-brand/10 text-xs font-bold rounded-xl transition duration-150 flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${reorderingId === order.id ? 'animate-spin' : ''}`} />
                    {reorderingId === order.id ? 'Loading...' : 'Quick Reorder'}
                  </button>

                  <Link
                    to={`/orders/${order.id}`}
                    className="flex-1 sm:flex-none py-2 px-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-bold rounded-xl transition duration-150 flex items-center justify-center gap-1.5"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View Tracking
                  </Link>
                </div>
              </div>

              {/* Order content brief */}
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex -space-x-4 overflow-hidden flex-shrink-0">
                    {order.items.slice(0, 3).map((item) => (
                      <img
                        key={item.id}
                        src={item.imageUrl || item.image || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=600'}
                        alt={item.name}
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=600';
                        }}
                        className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm bg-gray-50"
                        title={item.name}
                      />
                    ))}
                    {order.items.length > 3 && (
                      <div className="h-10 w-10 rounded-full border-2 border-white bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center shadow-sm">
                        +{order.items.length - 3}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800 leading-none">
                      {order.items.map(item => item.name).join(', ')}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1 font-semibold uppercase">{order.items.length} wholesale boxes</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Total Invoice</span>
                  <span className="text-lg font-black text-brand">₹{order.totalAmount}</span>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
