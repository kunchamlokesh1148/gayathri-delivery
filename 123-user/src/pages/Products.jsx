import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProducts, getCategories } from '../services/db';
import { useCart } from '../context/CartContext';
import { Search, SlidersHorizontal, ShoppingBag } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import ProductDetailsModal from '../components/ProductDetailsModal';
import { db, isFirebaseActive } from '../services/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { cartItems, addToCart, updateQuantity } = useCart();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter states
  const categoryFilter = searchParams.get('category') || 'All';
  const searchQuery = searchParams.get('search') || '';
  const [sortBy, setSortBy] = useState('default');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Load products and categories from DB
  useEffect(() => {
    let unsubscribeProducts = () => {};
    let unsubscribeCategories = () => {};

    if (isFirebaseActive) {
      unsubscribeProducts = onSnapshot(collection(db, 'products'), (snap) => {
        const prodData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const activeProds = prodData.filter(p => !p.status || p.status.toLowerCase() === 'active');
        setProducts(activeProds);
        setLoading(false);
      }, (error) => {
        console.error("Firestore onSnapshot products error:", error);
        setLoading(false);
      });

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
          setLoading(true);
          const prodData = await getProducts();
          const activeProds = prodData.filter(p => !p.status || p.status.toLowerCase() === 'active');
          setProducts(activeProds);

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

  // Sync local search input with URL search params
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Apply filters and sorting
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // 1. Category Filter
    if (categoryFilter !== 'All') {
      result = result.filter(p => String(p?.category || '').toLowerCase() === categoryFilter.toLowerCase());
    }

    // 2. Search Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(p => {
        const name = String(p?.name || '').toLowerCase();
        const brand = String(p?.brand || '').toLowerCase();
        const category = String(p?.category || '').toLowerCase();
        return name.includes(q) || brand.includes(q) || category.includes(q);
      });
    }

    // 3. Brand Filter
    if (selectedBrand !== 'All') {
      result = result.filter(p => p?.brand === selectedBrand);
    }

    // 4. Sort
    if (sortBy === 'price-asc') {
      result.sort((a, b) => (Number(a?.price) || 0) - (Number(b?.price) || 0));
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => (Number(b?.price) || 0) - (Number(a?.price) || 0));
    } else if (sortBy === 'alpha') {
      result.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
    }

    return result;
  }, [products, categoryFilter, searchQuery, selectedBrand, sortBy]);

  // Handle category tab click
  const handleCategorySelect = (cat) => {
    setSearchParams(prev => {
      if (cat === 'All') {
        prev.delete('category');
      } else {
        prev.set('category', cat);
      }
      return prev;
    });
  };

  // Handle local search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams(prev => {
      if (localSearch.trim()) {
        prev.set('search', localSearch.trim());
      } else {
        prev.delete('search');
      }
      return prev;
    });
  };

  // Get unique list of brands for side filter
  const brandsList = ['All', ...new Set(products.map(p => p?.brand).filter(b => typeof b === 'string' && b.trim() !== ''))];

  // Helper to find if item is in cart and return its quantity
  const getCartItemQty = (productId) => {
    const item = cartItems.find(c => c.product.id === productId);
    return item ? item.quantity : 0;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* SIDEBAR: Filters & Sorting (Desktop) */}
        <aside className="w-full md:w-60 flex-shrink-0 space-y-6 hidden md:block">
          <div className="bg-white p-5 rounded-[24px] border border-brand/15 shadow-sm space-y-5">
            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-brand" />
              Filter Tools
            </h3>

            {/* Brand Filter */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-gray-400 uppercase">Brands</label>
              <div className="flex flex-wrap gap-1.5">
                {brandsList.map(b => (
                  <button
                    key={b}
                    onClick={() => setSelectedBrand(b)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition active-bounce ${
                      selectedBrand === b 
                        ? 'bg-brand text-white' 
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full text-xs font-semibold bg-gray-50 border border-brand/20 rounded-2xl p-2.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white"
              >
                <option value="default">Relevance / Popularity</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="alpha">Name: A to Z</option>
              </select>
            </div>
          </div>
        </aside>

        {/* MAIN CONTAINER: Product Catalog */}
        <main className="flex-1 space-y-6">
          
          {/* Header Controls & Filter Pills */}
          <div className="bg-white p-4 rounded-[24px] border border-brand/15 shadow-sm space-y-4">
            
            {/* Search + Sorting bar for mobile */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
              <form onSubmit={handleSearchSubmit} className="relative flex-1">
                <input
                  type="text"
                  placeholder="Refine search within stock..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="w-full bg-gray-50 text-gray-900 pl-9 pr-14 py-2.5 rounded-full border border-brand/20 text-xs focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1.5 bg-brand hover:bg-brand-dark text-white text-[10px] font-black px-3 py-1.5 rounded-full transition active-bounce cursor-pointer"
                >
                  Go
                </button>
              </form>

              {/* Mobile sorting & brand dropdowns */}
              <div className="grid grid-cols-2 gap-2 md:hidden">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full text-xs font-semibold bg-gray-50 border border-brand/20 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="default">Relevance</option>
                  <option value="price-asc">₹ Low to High</option>
                  <option value="price-desc">₹ High to Low</option>
                  <option value="alpha">A to Z</option>
                </select>

                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full text-xs font-semibold bg-gray-50 border border-brand/20 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  {brandsList.map(b => (
                    <option key={b} value={b}>{b === 'All' ? 'All Brands' : b}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Horizontal Category tabs (styled scrollbar-less carousel) */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar border-t border-gray-50 pt-3">
              {['All', ...categories.map(c => c.name)].map(cat => (
                <button
                  key={cat}
                  onClick={() => handleCategorySelect(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap flex-shrink-0 capitalize ${
                    categoryFilter.toLowerCase() === cat.toLowerCase()
                      ? 'bg-brand text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Results count/Search summary */}
          <div className="flex justify-between items-center px-1">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
              Showing {filteredProducts.length} Items
            </p>
            {searchQuery && (
              <span className="text-xs bg-brand-light text-brand px-2.5 py-1 rounded-full font-semibold">
                Searched: "{searchQuery}"
              </span>
            )}
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="bg-white rounded-2xl h-80 animate-pulse border border-gray-100" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-[32px] border border-brand/15 shadow-sm flex flex-col items-center max-w-md mx-auto">
              <ShoppingBag className="h-16 w-16 text-gray-300 mb-4 animate-bounce" />
              <h3 className="text-lg font-bold text-gray-800">No products found</h3>
              <p className="text-sm text-gray-500 mt-1">We couldn't find matches. Try adjusting filters or searching again.</p>
              <button
                onClick={() => {
                  setSearchParams({});
                  setSelectedBrand('All');
                  setSortBy('default');
                }}
                className="mt-5 bg-brand hover:bg-brand-dark text-white text-xs font-black px-5 py-2.5 rounded-full active-bounce"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mobile-stitch-container">
              {filteredProducts.map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  cartQty={getCartItemQty(prod.id)}
                  onAdd={addToCart}
                  onUpdateQty={updateQuantity}
                  onViewDetails={setSelectedProduct}
                />
              ))}
            </div>
          )}

        </main>
      </div>

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
