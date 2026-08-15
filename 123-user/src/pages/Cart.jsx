import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, Plus, Minus, Trash2, ArrowRight, ShieldCheck, MapPin, AlertCircle, Edit2 } from 'lucide-react';
import { isSiddipetUrbanLocation } from '../services/db';
import LocationPickerModal from '../components/LocationPickerModal';

export default function Cart() {
  const { cartItems, updateQuantity, removeFromCart, subtotal, deliveryFee, totalAmount, checkout, dbProducts } = useCart();
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const handleAddressChangeFromModal = async (selectedLocation) => {
    try {
      setLoading(true);
      if (user) {
        await updateProfile({
          deliveryAddress: selectedLocation,
          address: selectedLocation.fullAddress
        });
      }
      setError('');
    } catch (err) {
      console.error("Failed to update location from Cart:", err);
      setError("Failed to update delivery address. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      // Send to Login page but remember they were trying to checkout
      navigate('/auth', { state: { from: { pathname: '/cart' } } });
      return;
    }

    if (!user.deliveryAddress || typeof user.deliveryAddress !== 'object' || !user.deliveryAddress.fullAddress) {
      setError('Please add a verified delivery address in your Profile page before placing an order.');
      return;
    }

    const lat = user.deliveryAddress?.latitude;
    const lon = user.deliveryAddress?.longitude;
    const urbanCheck = isSiddipetUrbanLocation(lat, lon, user.deliveryAddress || { fullAddress: user.address });
    if (!urbanCheck.isUrban) {
      setError('Sorry! FLASH-G Cutmit currently delivers only within a 5km radius of Siddipet Urban.');
      return;
    }

    if (!user.mobile || user.mobile.trim() === '' || user.mobile === '0000000000') {
      setError('Please add a valid mobile number in your Profile page before placing an order.');
      return;
    }


    setLoading(true);
    setError('');
    try {
      const order = await checkout(user.uid, user);
      // Success! Show success notification and redirect to Orders page
      alert(`Order placed successfully! Order ID: ${order.id}`);
      navigate('/orders', { state: { orderPlaced: true, newOrderId: order.id } });
    } catch (e) {
      setError(e.message || 'Checkout failed.');
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="inline-flex p-5 bg-brand-light rounded-full text-brand mb-6 animate-pulse">
          <ShoppingCart className="h-12 w-12" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Your cart is empty</h2>
        <p className="text-sm text-gray-500 mt-2">Add snack boxes, biscuits, soaps, and more to start your delivery order.</p>
        <Link
          to="/products"
          className="mt-6 inline-flex items-center justify-center bg-brand hover:bg-brand-dark text-white text-xs font-black px-6 py-3 rounded-full shadow-md active-bounce"
        >
          Browse Stock Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-6">Shopping Cart ({cartItems.length} items)</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm font-semibold rounded-xl border border-red-100">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Cart Item List (Left 2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map((item) => {
            const product = dbProducts.find(p => p.id === item.product.id) || item.product;
            const price = product.wholesalePrice !== undefined ? product.wholesalePrice : (product.price || 0);
            const multiplier = (product.wholesaleUnit === 'Pack' || product.wholesaleUnit === 'Box') ? (parseInt(product.packQuantity) || 12) : 1;
            const unitPrice = price * multiplier;
            const itemTotal = unitPrice * item.quantity;
            const displayUnit = product.wholesaleUnit ? product.wholesaleUnit.toLowerCase() : 'pack';

            const wholesaleUnit = String(product?.wholesaleUnit || '').toLowerCase();
            const packQuantity = parseInt(product?.packQuantity) || 1;
            const stockQty = product?.stockQty !== undefined ? parseInt(product.stockQty) : 0;

            const isPack = wholesaleUnit.includes('pack') || wholesaleUnit.includes('box');
            const availablePacks = isPack ? Math.floor(stockQty / (packQuantity > 0 ? packQuantity : 1)) : stockQty;

            console.log("[Cart page] details:", {
              stockQty,
              packQuantity,
              availablePacks,
              productId: product?.id
            });

            const isMaxReached = item.quantity >= availablePacks;

            return (
              <div 
                key={product.id} 
                className="bg-white p-3.5 sm:p-4 rounded-[24px] border border-brand/15 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-all hover:translate-y-[-2px] hover:shadow-md hover:border-brand/35"
              >
                {/* Top Row / Main Details */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Product Thumbnail */}
                  <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-[16px] overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
                    <img 
                      src={product.imageUrl || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=600'} 
                      alt={product.name} 
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=600';
                      }}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-xs sm:text-sm text-gray-900 truncate leading-snug">{product.name}</h3>
                    <p className="text-[11px] sm:text-xs text-gray-400 font-semibold mt-0.5">{product.brand} | {product.unit || `${product.wholesaleUnit} of ${product.packQuantity}`}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs sm:text-sm font-black text-brand">₹{unitPrice}</span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">per {displayUnit}</span>
                    </div>
                  </div>
                </div>

                {/* Quantity Selector + Total + Trash */}
                <div className="flex items-center justify-between sm:justify-end space-x-3 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  <div className="flex items-center bg-gray-50 border border-brand/15 rounded-full p-1">
                    <button
                      onClick={() => updateQuantity(product.id, item.quantity - 1)}
                      className="bg-white hover:bg-gray-100 text-gray-600 rounded-full p-1 transition active-bounce cursor-pointer"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-xs font-black text-gray-800 px-3">{item.quantity}</span>
                    <button
                      disabled={isMaxReached}
                      onClick={() => updateQuantity(product.id, item.quantity + 1)}
                      className={`bg-white hover:bg-gray-100 text-gray-600 rounded-full p-1 transition active-bounce cursor-pointer ${isMaxReached ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Total Item Price */}
                  <div className="text-right sm:w-16">
                    <p className="text-xs sm:text-sm font-black text-gray-800">₹{itemTotal}</p>
                  </div>

                  <button
                    onClick={() => removeFromCart(product.id)}
                    className="p-1.5 sm:p-2 text-red-400 hover:text-red-650 hover:bg-red-50 rounded-full transition active-bounce cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Wholesale Free Delivery Incentive */}
          {deliveryFee > 0 && (
            <div className="bg-brand-light/40 border border-brand/10 p-4 rounded-[20px] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-brand-dark">FREE Delivery Upgrade</p>
                <p className="text-[11px] text-gray-500">Add <span className="font-bold text-brand">₹{2000 - subtotal}</span> more to unlock free shipping.</p>
              </div>
              <Link to="/products" className="text-xs font-extrabold text-brand hover:underline flex items-center gap-0.5">
                Add Items <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>

        {/* Pricing Summary (Right 1 column) */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-[24px] border border-brand/15 shadow-sm space-y-4">
            <h2 className="font-extrabold text-base text-gray-900 tracking-tight">Invoice Breakup</h2>

            <div className="space-y-2.5 text-xs text-gray-600 font-semibold border-b border-gray-50 pb-4">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="text-gray-900 font-bold">₹{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charges</span>
                <span className={deliveryFee === 0 ? 'text-accent font-bold' : 'text-gray-900 font-bold'}>
                  {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-bold text-gray-900">Total Invoice Amount</span>
              <span className="text-xl font-black text-brand">₹{totalAmount}</span>
            </div>

            {/* Address confirmation block if logged in */}
            {user && (
              <div className="p-3.5 bg-gray-50 rounded-[20px] border border-brand/15 text-[11px] leading-relaxed text-gray-500 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-gray-800 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-brand flex-shrink-0" />
                    <span>Deliver to Shop Address:</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowLocationPicker(true)}
                    className="px-2.5 py-1 bg-brand-light hover:bg-brand text-brand hover:text-white text-[10px] font-extrabold rounded-lg transition border border-brand/20 flex items-center gap-1 cursor-pointer active-bounce"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit / Change</span>
                  </button>
                </div>
                <div className="font-medium leading-normal bg-white p-2.5 rounded-xl border border-gray-150">
                  {user.deliveryAddress && typeof user.deliveryAddress === 'object' ? (
                    <>
                      <p className="font-bold text-gray-900">{user.ownerName || user.shopName}</p>
                      <p>H.No {user.deliveryAddress.houseNumber}, {user.deliveryAddress.street}, {user.deliveryAddress.area}</p>
                      {user.deliveryAddress.landmark && <p>Near: {user.deliveryAddress.landmark}</p>}
                      <p>Siddipet - {!user.deliveryAddress.pincode || user.deliveryAddress.pincode === '508100' ? '502103' : user.deliveryAddress.pincode}, Telangana</p>
                    </>
                  ) : (
                    <p>{user.address || "No address added! Click Edit / Change to select location."}</p>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full py-3 bg-accent hover:bg-accent-dark text-white rounded-full text-sm font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 active-bounce cursor-pointer"
            >
              <ShieldCheck className="h-4.5 w-4.5" />
              {loading ? 'Processing Order...' : user ? 'Place Order' : 'Log In to Place Order'}
            </button>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-[20px] border border-brand/15 text-[11px] text-gray-400 font-medium">
            🛡️ Authorized Platform. Share delivery verification codes only on receiving orders.
          </div>
        </div>

      </div>

      <LocationPickerModal
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        initialLat={user?.deliveryAddress?.latitude || 18.1018}
        initialLng={user?.deliveryAddress?.longitude || 78.8523}
        initialAddress={user?.deliveryAddress?.fullAddress || user?.address || ""}
        onSelectLocation={handleAddressChangeFromModal}
      />
    </div>
  );
}
