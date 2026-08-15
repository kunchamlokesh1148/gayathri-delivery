import { useState } from 'react';
import { Plus, Minus, Check } from 'lucide-react';
import { GlowCard } from '@/components/ui/spotlight-card';

const DEFAULT_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=600";

export default function ProductCard({ product, cartQty, onAdd, onUpdateQty, onViewDetails }) {
  const [justAdded, setJustAdded] = useState(false);

  const handleAddClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
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

  console.log("[ProductCard] details:", {
    stockQty,
    packQuantity,
    availablePacks,
    productId: product?.id
  });

  const isOutOfStock = availablePacks <= 0;

  const mrp = product?.mrp !== undefined ? product.mrp : (product?.price !== undefined ? product.price * 1.25 : 0);
  const multiplier = (product?.wholesaleUnit === 'Pack' || product?.wholesaleUnit === 'Box') ? (parseInt(product?.packQuantity) || 12) : 1;
  const unitMrp = Math.round(mrp * multiplier);

  return (
    <GlowCard 
      customSize={true}
      glowColor="orange"
      onClick={() => onViewDetails && onViewDetails(product)}
      className="custom-card custom-card-hover flex flex-col overflow-hidden group cursor-pointer max-md:stitch-card mobile-stitch-item border-none"
      style={{
        '--backdrop': '#ffffff',
        '--backup-border': 'color-mix(in srgb, var(--color-brand) 12%, transparent)',
        '--radius': '24'
      }}
    >
      
      {/* Top Badges Header (Cleanly separated above product image) */}
      <div className="px-3 pt-3 pb-0.5 flex items-center justify-between gap-1">
        {/* Brand Tag */}
        {product.brand ? (
          <span className="bg-amber-500/10 text-amber-800 border border-amber-500/20 text-[10px] font-extrabold px-2 py-0.5 rounded-md truncate max-w-[55%] leading-tight">
            {product.brand}
          </span>
        ) : <span />}

        {/* Stock Status Badge */}
        <span className="text-[9px] font-black px-2 py-0.5 rounded-md whitespace-nowrap border leading-tight shrink-0" style={{
          backgroundColor: isOutOfStock 
            ? '#fee2e2' 
            : availablePacks <= alertLimit
              ? '#ffedd5'
              : '#d1fae5',
          color: isOutOfStock 
            ? '#b91c1c' 
            : availablePacks <= alertLimit
              ? '#c2410c'
              : '#047857',
          borderColor: isOutOfStock 
            ? '#fca5a5' 
            : availablePacks <= alertLimit
              ? '#fdba74'
              : '#6ee7b7'
        }}>
          {isOutOfStock ? 'Out Of Stock' : (availablePacks <= alertLimit ? 'Low Stock' : 'In Stock')}
        </span>
      </div>

      {/* Inset Product Image Box */}
      <div className="relative aspect-square bg-gray-50/50 overflow-hidden flex-shrink-0 flex items-center justify-center rounded-2xl mx-3 mt-1.5 mb-1 border border-brand/5 shadow-inner">
        <img
          src={product.imageUrl || DEFAULT_PRODUCT_IMAGE}
          alt={product.name}
          loading="lazy"
          onError={(e) => {
            console.warn(`[ProductCard Error] Failed to load image. Details:`, {
              productId: product.id || 'N/A',
              firestoreImageUrl: product.imageUrl || 'N/A',
              cloudinaryUrl: product.imageUrl?.includes('cloudinary.com') ? product.imageUrl : 'N/A',
              imageLoadStatus: 'failed',
              error: 'Image source loading triggered onError fallback'
            });
            e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
          }}
          className="w-full h-full object-contain p-1.5 group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Info & Action Area */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-3 bg-transparent">
        <div className="space-y-1">
          <h3 className="font-bold text-gray-800 text-xs sm:text-sm line-clamp-2 h-10 leading-snug group-hover:text-brand transition-colors">
            {product.name}
          </h3>
          <p className="text-[10px] sm:text-xs text-gray-400 font-medium">{product.unit}</p>
        </div>

        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-0">
            <div className="flex items-baseline space-x-1">
              <span className="text-base sm:text-lg font-black text-brand">
                ₹{(product.wholesalePrice !== undefined ? product.wholesalePrice : (product.price || 0)) * ((product.wholesaleUnit === 'Pack' || product.wholesaleUnit === 'Box') ? (parseInt(product.packQuantity) || 12) : 1)}
              </span>
            </div>
            {unitMrp > 0 && (
              <span className="text-[11px] font-bold text-gray-500 sm:text-right">
                <span className="text-gray-400">MRP </span>
                <span className="text-red-500 line-through">₹{unitMrp}</span>
              </span>
            )}
          </div>

          <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed h-8 overflow-hidden">
            {product.description || '\u00A0'}
          </p>

          {/* Action Button/Controls */}
          {isOutOfStock ? (
            <button
              disabled
              onClick={(e) => e.stopPropagation()}
              className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed border h-9 flex items-center justify-center gap-1"
            >
              Out of Stock
            </button>
          ) : cartQty > 0 ? (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-between bg-brand-light rounded-full p-1 border border-brand/20 shadow-inner h-9"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateQty(product.id, cartQty - 1);
                }}
                className="bg-white hover:bg-brand text-brand hover:text-white rounded-full p-1.5 transition active:scale-90 flex items-center justify-center border border-brand/5 shadow-sm cursor-pointer"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="text-xs font-black text-brand-dark px-1.5">{cartQty}</span>
              <button
                disabled={cartQty >= availablePacks}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateQty(product.id, cartQty + 1);
                }}
                className={`bg-white hover:bg-brand text-brand hover:text-white rounded-full p-1.5 transition active:scale-90 flex items-center justify-center border border-brand/5 shadow-sm cursor-pointer ${cartQty >= availablePacks ? 'opacity-30 cursor-not-allowed' : ''}`}
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAddClick}
              className={`w-full py-2 px-3 rounded-full text-xs font-black transition-all duration-250 flex items-center justify-center gap-1 border shadow-sm h-9 cursor-pointer active-bounce ${
                justAdded
                  ? 'bg-accent/10 border-accent text-accent'
                  : 'bg-brand hover:bg-brand-dark border-transparent text-white'
              }`}
            >
              {justAdded ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Added
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Add to Cart
                </>
              )}
            </button>
          )}
        </div>
      </div>

    </GlowCard>
  );
}
