import { useState } from 'react';
import { X, Plus, Minus, Check, ShoppingBag } from 'lucide-react';

const DEFAULT_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=600";

export default function ProductDetailsModal({ product, isOpen, onClose, cartQty, onAdd, onUpdateQty }) {
  const [justAdded, setJustAdded] = useState(false);

  if (!isOpen || !product) return null;

  const handleAddClick = (e) => {
    e.preventDefault();
    onAdd(product, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const wholesaleUnit = String(product?.wholesaleUnit || '').toLowerCase();
  const packQuantity = parseInt(product?.packQuantity) || 1;
  const stockQty = product?.stockQty !== undefined ? parseInt(product.stockQty) : 0;

  const alertLimit = product?.minStock !== undefined && product?.minStock !== null ? parseInt(product.minStock) : 10;
  const isPack = wholesaleUnit.includes('pack') || wholesaleUnit.includes('box');
  const availablePacks = isPack ? Math.floor(stockQty / (packQuantity > 0 ? packQuantity : 1)) : stockQty;

  console.log("[ProductDetailsModal] details:", {
    stockQty,
    packQuantity,
    availablePacks,
    productId: product?.id
  });

  const isOutOfStock = availablePacks <= 0;

  const price = product.wholesalePrice !== undefined ? product.wholesalePrice : (product.price || 0);
  const multiplier = (product.wholesaleUnit === 'Pack' || product.wholesaleUnit === 'Box') ? (parseInt(product.packQuantity) || 12) : 1;
  const unitPrice = price * multiplier;
  const displayUnit = product.wholesaleUnit ? product.wholesaleUnit.toLowerCase() : 'pack';
  const mrp = product.mrp !== undefined ? product.mrp : (product.price !== undefined ? product.price * 1.25 : 0);
  const unitMrp = Math.round(mrp * multiplier);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-300">
      {/* Background Overlay click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white overflow-hidden flex flex-col max-h-[90vh] z-10 custom-modal animate-in fade-in zoom-in-95 slide-in-from-bottom-8 duration-300 ease-out">
        
        {/* Header/Close Button */}
        <div className="absolute top-4 right-4 z-20">
          <button 
            onClick={onClose}
            className="p-2 bg-white/90 hover:bg-gray-100 text-gray-700 rounded-full shadow-md transition cursor-pointer border border-gray-150 active-bounce"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-y-auto no-scrollbar flex-grow">
          {/* Product Image Area */}
          <div className="relative aspect-video bg-gray-50 flex items-center justify-center border-b border-gray-100">
            <img
              src={product.imageUrl || DEFAULT_PRODUCT_IMAGE}
              alt={product.name}
              loading="lazy"
              onError={(e) => {
                console.warn(`[ProductDetailsModal Error] Failed to load image. Details:`, {
                  productId: product.id || 'N/A',
                  firestoreImageUrl: product.imageUrl || 'N/A',
                  cloudinaryUrl: product.imageUrl?.includes('cloudinary.com') ? product.imageUrl : 'N/A',
                  imageLoadStatus: 'failed',
                  error: 'Image source loading triggered onError fallback'
                });
                e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
              }}
              className="w-full h-full object-cover"
            />

            {/* Brand Tag */}
            <span className="absolute bottom-4 left-4 bg-accent text-white text-xs font-black px-3 py-1.5 rounded-full shadow-md">
              {product.brand}
            </span>

            {/* Category Tag */}
            <span className="absolute bottom-4 right-4 bg-white/95 text-gray-800 text-[10px] font-black tracking-wider uppercase px-3 py-1.5 rounded-full shadow-sm border border-gray-150">
              {product.category}
            </span>
          </div>

          {/* Product Information */}
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-extrabold shadow-sm ${
                  isOutOfStock
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : availablePacks <= alertLimit
                      ? 'bg-orange-100 text-orange-800 border border-orange-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {isOutOfStock ? 'Out Of Stock' : (availablePacks <= alertLimit ? 'Low Stock' : 'In Stock')}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-snug">
                {product.name}
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 font-semibold">{product.unit || `${product.wholesaleUnit} of ${product.packQuantity}`}</p>
            </div>

            <div className="bg-brand-light/30 border border-brand/5 p-4 rounded-[20px] flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Wholesale Price</p>
                <div className="flex items-baseline space-x-1 mt-0.5">
                  <span className="text-2xl font-black text-brand">₹{unitPrice}</span>
                  <span className="text-xs text-gray-400 font-bold uppercase">per {displayUnit}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">M.R.P.</p>
                <p className="text-lg font-bold text-red-500 line-through mt-0.5">₹{unitMrp}</p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Product Description</h4>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-medium">
                {product.description || "High-quality wholesale product sourced directly from brand manufacturing partners. Optimized for retail redistribution, stocking, and fast consumer turnover."}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-4">
          <div className="flex-shrink-0">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Estimated Total</span>
            <span className="text-lg font-black text-gray-800">
              ₹{unitPrice * (cartQty || 1)}
            </span>
          </div>

          <div className="flex-grow max-w-[220px]">
            {isOutOfStock ? (
              <button
                disabled
                className="w-full py-2.5 px-4 rounded-xl text-sm font-bold bg-gray-150 border-gray-200 text-gray-400 cursor-not-allowed border h-11 flex items-center justify-center"
              >
                Out of Stock
              </button>
            ) : cartQty > 0 ? (
              <div className="flex items-center justify-between bg-brand-light rounded-full p-1 border border-brand/20 shadow-inner h-11">
                <button
                  onClick={() => onUpdateQty(product.id, cartQty - 1)}
                  className="bg-white hover:bg-brand text-brand hover:text-white rounded-full p-2 transition active:scale-90 flex items-center justify-center border border-brand/5 shadow-sm cursor-pointer"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-sm font-black text-brand-dark px-3">{cartQty}</span>
                <button
                  disabled={cartQty >= availablePacks}
                  onClick={() => onUpdateQty(product.id, cartQty + 1)}
                  className={`bg-white hover:bg-brand text-brand hover:text-white rounded-full p-2 transition active:scale-90 flex items-center justify-center border border-brand/5 shadow-sm cursor-pointer ${cartQty >= availablePacks ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddClick}
                className={`w-full py-2.5 px-4 rounded-full text-sm font-black transition-all duration-250 flex items-center justify-center gap-1.5 border shadow-md h-11 cursor-pointer active-bounce ${
                  justAdded
                    ? 'bg-accent/10 border-accent text-accent'
                    : 'bg-brand hover:bg-brand-dark border-transparent text-white'
                }`}
              >
                {justAdded ? (
                  <>
                    <Check className="h-4 w-4" />
                    Added to Cart
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" />
                    Add to Cart
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
