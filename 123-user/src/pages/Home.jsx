import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProducts, getCarouselBanners, getSettings, getCategories } from '../services/db';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';
import ProductDetailsModal from '../components/ProductDetailsModal';
import { db, isFirebaseActive } from '../services/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  Cookie, 
  Flame, 
  Sparkles, 
  Droplet, 
  Gift, 
  Store,
  ChevronLeft, 
  ChevronRight, 
  ArrowRight,
  TrendingUp,
  Percent
} from 'lucide-react';

const DEFAULT_BANNERS = [
  {
    id: 'default_1',
    title: "Grocery & Snacks",
    subtitle: "Boost Your Store Margins Up To 35%",
    buttonText: "Shop Snack Bundles",
    buttonLink: "/products",
    bgColor: "from-emerald-700 to-green-500",
    badge: "Bulk Pricing"
  },
  {
    id: 'default_2',
    title: "Personal Care Essentials",
    subtitle: "Premium Shampoos & Soaps - Flat 15% GST Rebate",
    buttonText: "View Hygiene",
    buttonLink: "/products",
    bgColor: "from-emerald-600 to-teal-500",
    badge: "GST Invoice"
  },
  {
    id: 'default_3',
    title: "Free Delivery Offer!",
    subtitle: "Place orders above ₹2,000 for FREE delivery",
    buttonText: "Order Now",
    buttonLink: "/products",
    bgColor: "from-teal-600 to-emerald-500",
    badge: "Limited Offer"
  }
];

const CATEGORY_STYLES = {
  'biscuits': { icon: Cookie, color: 'text-amber-700 bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 shadow-sm shadow-amber-100/60' },
  'chips': { icon: Flame, color: 'text-red-600 bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200 shadow-sm shadow-red-100/60' },
  'namkeens': { icon: Flame, color: 'text-orange-600 bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200 shadow-sm shadow-orange-100/60' },
  'chocolates': { icon: Gift, color: 'text-purple-700 bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200 shadow-sm shadow-purple-100/60' },
  'soaps': { icon: Sparkles, color: 'text-teal-600 bg-gradient-to-br from-teal-50 to-teal-100/50 border border-teal-200 shadow-sm shadow-teal-100/60' },
  'shampoos': { icon: Droplet, color: 'text-sky-600 bg-gradient-to-br from-sky-50 to-sky-100/50 border border-sky-200 shadow-sm shadow-sky-100/60' },
  'soaps & shampoos': { icon: Droplet, color: 'text-sky-600 bg-gradient-to-br from-sky-50 to-sky-100/50 border border-sky-200 shadow-sm shadow-sky-100/60' },
  'sweets': { icon: Gift, color: 'text-pink-650 text-pink-600 bg-gradient-to-br from-pink-50 to-pink-100/50 border border-pink-200 shadow-sm shadow-pink-100/60' },
  'flours': { icon: Store, color: 'text-yellow-700 bg-gradient-to-br from-yellow-50 to-yellow-100/50 border border-yellow-200 shadow-sm shadow-yellow-100/60' },
  'ready to cook food': { icon: Cookie, color: 'text-emerald-700 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 shadow-sm shadow-emerald-100/60' }
};

const getCategoryStyle = (name) => {
  const key = String(name || '').toLowerCase().trim();
  return CATEGORY_STYLES[key] || { icon: Sparkles, color: 'text-blue-600 bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 shadow-sm shadow-blue-100/60' };
};

export default function Home() {
  const navigate = useNavigate();
  const { addToCart, cartItems, updateQuantity } = useCart();
  const [products, setProducts] = useState([]);
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [festivalBanner, setFestivalBanner] = useState(null);
  const [activeBanner, setActiveBanner] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const getCartItemQty = (productId) => {
    const item = cartItems.find(c => c.product.id === productId);
    return item ? item.quantity : 0;
  };

  useEffect(() => {
    let unsubscribeProducts = () => {};
    let unsubscribeCarousel = () => {};
    let unsubscribeSettings = () => {};
    let unsubscribeCategories = () => {};
 
    if (isFirebaseActive) {
      // 1. Subscribe to Products
      unsubscribeProducts = onSnapshot(collection(db, 'products'), (snap) => {
        const prodData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const activeProds = prodData.filter(p => !p.status || p.status.toLowerCase() === 'active');
        setProducts(activeProds);
        setLoading(false);
      }, (error) => {
        console.error("Firestore onSnapshot products error:", error);
        setLoading(false);
      });
 
      // 2. Subscribe to Carousel Banners
      unsubscribeCarousel = onSnapshot(collection(db, 'homepageCarousel'), (snap) => {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const activeBanners = list
          .filter(b => b.status === 'Active')
          .sort((a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0));
        setBanners(activeBanners);
      }, (error) => {
        console.error("Firestore onSnapshot homepageCarousel error:", error);
      });
 
      // 3. Subscribe to Settings (for Festival Banner)
      unsubscribeSettings = onSnapshot(collection(db, 'settings'), (snap) => {
        const festDoc = snap.docs.find(d => d.id === 'festivalBanner');
        if (festDoc && festDoc.exists()) {
          const data = festDoc.data();
          setFestivalBanner(data && data.active ? data : null);
        } else {
          setFestivalBanner(null);
        }
      });

      // 4. Subscribe to Categories
      unsubscribeCategories = onSnapshot(collection(db, 'categories'), (snap) => {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
        setCategories(list);
      }, (error) => {
        console.error("Firestore onSnapshot categories error:", error);
      });
    } else {
      async function loadData() {
        try {
          // Products
          const prodData = await getProducts();
          const activeProds = prodData.filter(p => !p.status || p.status.toLowerCase() === 'active');
          setProducts(activeProds);
 
          // Banners
          const list = await getCarouselBanners();
          setBanners(list.filter(b => b.status === 'Active'));
 
          // Festival Banner
          const festData = await getSettings('festivalBanner');
          setFestivalBanner(festData && festData.active ? festData : null);

          // Categories
          const cats = await getCategories();
          cats.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
          setCategories(cats);
        } catch (e) {
          console.error("Local mock load error:", e);
        } finally {
          setLoading(false);
        }
      }
      loadData();
    }
 
    return () => {
      unsubscribeProducts();
      unsubscribeCarousel();
      unsubscribeSettings();
      unsubscribeCategories();
    };
  }, []);

  // Debug log products loaded
  useEffect(() => {
    console.log("Products loaded:", products);
  }, [products]);

  // Sync selected product details in real-time or close if removed
  useEffect(() => {
    if (selectedProduct) {
      const updated = products.find(p => p.id === selectedProduct.id);
      if (!updated) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedProduct(null);
      } else if (
        updated.price !== selectedProduct.price || 
        updated.wholesalePrice !== selectedProduct.wholesalePrice ||
        updated.stockQty !== selectedProduct.stockQty || 
        updated.stock !== selectedProduct.stock
      ) {
        setSelectedProduct(updated);
      }
    }
  }, [products, selectedProduct]);

  const displayBanners = banners.length > 0 ? banners : DEFAULT_BANNERS;

  // Banner carousel auto scroll
  useEffect(() => {
    if (displayBanners.length === 0) return;
    const interval = setInterval(() => {
      setActiveBanner(prev => (prev + 1) % displayBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [displayBanners]);

  const featuredProducts = products.filter(p => p.featured === true).slice(0, 4);
  const displayFeatured = featuredProducts.length > 0 ? featuredProducts : products.slice(0, 4);
  const popularProducts = products.slice(4, 8);

  return (
    <div className="space-y-8 pb-8">
      
      {/* 1. Hero Promo Banner Slider */}
      <section className="relative rounded-[24px] overflow-hidden shadow-lg mx-4 mt-4 bg-slate-900">
        <div className="relative h-64 md:h-80 w-full overflow-hidden">
          {displayBanners.map((banner, index) => (
            <div
              key={banner.id || index}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out flex flex-col justify-center p-8 sm:p-12 text-white ${
                index === activeBanner ? 'opacity-100 z-10' : 'opacity-0 z-0'
              } ${
                banner.imageUrl ? '' : `bg-gradient-to-r ${banner.bgColor || 'from-emerald-700 to-green-500'}`
              }`}
            >
              {banner.imageUrl && (
                <div className="absolute inset-0 z-0">
                  <img 
                    src={banner.imageUrl} 
                    alt={banner.title} 
                    className="w-full h-full object-cover opacity-60" 
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/90 via-emerald-950/50 to-transparent" />
                </div>
              )}
              
              <div className={`relative z-10 max-w-md space-y-4 ${
                index === activeBanner ? 'animate-fade-in-left' : 'opacity-0'
              }`}>
                {banner.badge && (
                  <span className="inline-block bg-white/20 backdrop-blur-md text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                    {banner.badge}
                  </span>
                )}
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                  {banner.title}
                </h1>
                <p className="text-sm sm:text-base text-white/90">
                  {banner.subtitle}
                </p>
                <button
                  onClick={() => navigate(banner.buttonLink || '/products')}
                  className="bg-yellow-400 hover:bg-yellow-500 text-brand-dark font-extrabold px-6 py-2.5 rounded-full text-xs shadow-md transform transition hover:-translate-y-0.5 cursor-pointer active-bounce"
                >
                  {banner.buttonText || 'Shop Now'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Carousel controls */}
        {displayBanners.length > 1 && (
          <>
            <button
              onClick={() => setActiveBanner(p => (p - 1 + displayBanners.length) % displayBanners.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 z-20 focus:outline-none hidden sm:block cursor-pointer"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={() => setActiveBanner(p => (p + 1) % displayBanners.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 z-20 focus:outline-none hidden sm:block cursor-pointer"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        {/* Carousel indicators */}
        {displayBanners.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2 z-20">
            {displayBanners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveBanner(idx)}
                className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === activeBanner ? 'bg-white w-6' : 'bg-white/40 w-2.5'
                }`}
              />
            ))}
          </div>
        )}
      </section>

      {/* 2. Product Categories */}
      <section className="px-4">
        <div className="flex justify-between items-center mb-4 animate-fade-in-up">
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Categories</h2>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4">
          {categories.map((cat, idx) => {
            const { icon: Icon, color } = getCategoryStyle(cat.name);
            return (
              <Link
                key={cat.id || cat.name}
                to={`/products?category=${encodeURIComponent(cat.name)}`}
                className="custom-card custom-card-hover flex flex-col items-center p-2.5 sm:p-4.5 text-center animate-fade-in-up opacity-0 group"
                style={{ animationDelay: `${idx * 75}ms` }}
              >
                <div className={`p-2.5 sm:p-4 rounded-full ${color} mb-1.5 sm:mb-4 transition-all duration-300 group-hover:scale-105 shadow-2xs`}>
                  <Icon className="h-4 sm:h-6.5 w-4 sm:w-6.5 transition-transform duration-350 ease-out group-hover:scale-120 group-hover:rotate-12" />
                </div>
                <span className="text-[11px] sm:text-sm font-extrabold text-gray-800 tracking-tight transition-colors group-hover:text-brand capitalize truncate max-w-full">{cat.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Festival Special Banner Alert */}
      {festivalBanner && (
        <section className="mx-4 animate-fade-in-up">
          <div className="relative rounded-[20px] overflow-hidden p-6 text-white bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 shadow-md border border-amber-400/25 flex flex-col md:flex-row items-center justify-between gap-4">
            {festivalBanner.imageUrl && (
              <div className="absolute inset-0 z-0">
                <img src={festivalBanner.imageUrl} alt="Festival special banner" className="w-full h-full object-cover opacity-25" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-r from-red-700/80 to-amber-600/60" />
              </div>
            )}
            <div className="relative z-10 space-y-1 text-center md:text-left">
              <span className="inline-block bg-white/20 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-white/10">
                Festival Special Deal
              </span>
              <h3 className="text-lg font-extrabold tracking-tight">{festivalBanner.title}</h3>
              <p className="text-xs text-white/90">{festivalBanner.subtitle}</p>
            </div>
            <button
              onClick={() => navigate(festivalBanner.link || '/products')}
              className="relative z-10 bg-white hover:bg-slate-50 text-red-600 font-extrabold px-5 py-2 rounded-xl text-xs shadow-md transition-all active:scale-95 whitespace-nowrap cursor-pointer"
            >
              Grab Offer
            </button>
          </div>
        </section>
      )}

      {/* 3. Featured Products */}
      <section className="px-4 animate-fade-in-up">
        <div className="flex justify-between items-start sm:items-center mb-4 gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <div className="flex items-center space-x-1.5">
              <Percent className="h-5 w-5 text-yellow-500 flex-shrink-0" />
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Best margins</h2>
            </div>
            <span className="text-[10px] sm:text-xs font-mono font-bold text-indigo-500 bg-indigo-50/80 px-2 py-0.5 rounded-lg border border-indigo-100 w-fit whitespace-nowrap">
              Products Found: {products.length}
            </span>
          </div>
          <Link to="/products" className="text-brand hover:text-brand-dark text-sm font-bold flex items-center gap-1 flex-shrink-0 pt-1 sm:pt-0">
            See All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="bg-white rounded-2xl h-80 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mobile-stitch-container">
            {displayFeatured.map((prod, idx) => (
              <div
                key={prod.id}
                className="animate-scale-in opacity-0"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <ProductCard
                  product={prod}
                  cartQty={getCartItemQty(prod.id)}
                  onAdd={addToCart}
                  onUpdateQty={updateQuantity}
                  onViewDetails={setSelectedProduct}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Popular Products */}
      <section className="px-4 animate-fade-in-up [animation-delay:150ms]">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-brand animate-pulse" />
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Fast moving favorites</h2>
          </div>
          <Link to="/products" className="text-brand hover:text-brand-dark text-sm font-bold flex items-center gap-1">
            See All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="bg-white rounded-2xl h-80 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mobile-stitch-container">
            {popularProducts.map((prod, idx) => (
              <div
                key={prod.id}
                className="animate-scale-in opacity-0"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <ProductCard
                  key={prod.id}
                  product={prod}
                  cartQty={getCartItemQty(prod.id)}
                  onAdd={addToCart}
                  onUpdateQty={updateQuantity}
                  onViewDetails={setSelectedProduct}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <ProductDetailsModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        cartQty={selectedProduct ? getCartItemQty(selectedProduct.id) : 0}
        onAdd={addToCart}
        onUpdateQty={updateQuantity}
      />
    </div>
  );
}
