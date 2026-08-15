import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Search, ShoppingCart, User, LogOut, Store, ChevronDown, HelpCircle } from 'lucide-react';

export default function Navbar({ onHelpClick }) {
  const { user, logout } = useAuth();
  const { cartItems } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isLoginPage = location.pathname === '/auth' || !user;
  const isProductsPage = location.pathname === '/products';

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/products');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-brand text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo / Brand */}
          <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
            <Store className="h-8 w-8 text-white" />
            <span className="font-extrabold text-lg sm:text-xl tracking-tight">
              FLASH-G <span className="text-yellow-400">Cutmit</span>
            </span>
          </Link>

          {/* Desktop/Tablet Search Bar */}
          {!isLoginPage && (
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-lg relative hidden md:block">
              <input
                type="text"
                placeholder="Search products, brands and categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white text-gray-900 pl-10 pr-4 py-2.5 rounded-full border border-brand-light/35 focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-inner text-sm transition-all"
              />
              <Search className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-gray-400 pointer-events-none" />
            </form>
          )}

          {/* Actions */}
          <div className="flex items-center space-x-4">
            
            {/* Cart Link */}
            {!isLoginPage && (
              <Link to="/cart" className="relative p-2 hover:bg-brand-dark rounded-full transition duration-150 ease-in-out">
                <ShoppingCart className="h-6 w-6" />
                {totalCartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-yellow-400 text-brand-dark text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-brand">
                    {totalCartCount}
                  </span>
                )}
              </Link>
            )}

            {/* Profile / Auth */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-1.5 p-1.5 hover:bg-brand-dark rounded-lg transition duration-150 ease-in-out"
                >
                  <div className="h-8 w-8 rounded-full bg-yellow-400 text-brand-dark font-bold flex items-center justify-center uppercase text-sm border border-white">
                    {user.shopName ? user.shopName.charAt(0) : (user.ownerName ? user.ownerName.charAt(0) : <User className="h-4 w-4" />)}
                  </div>
                  <div className="hidden lg:block text-left text-xs leading-tight">
                    <p className="font-semibold max-w-[120px] truncate">{user.shopName || user.ownerName}</p>
                    <p className="text-gray-200">Owner: {user.ownerName}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-200 hidden lg:block" />
                </button>

                {dropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-30" 
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white text-gray-800 rounded-lg shadow-xl py-1 z-40 border border-gray-100 transform origin-top-right">
                      <div className="px-4 py-2 border-b border-gray-100 lg:hidden">
                        <p className="font-semibold text-sm text-brand">{user.shopName || user.ownerName}</p>
                        <p className="text-xs text-gray-500">{user.mobile || user.mobileNumber || ''}</p>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2 text-sm hover:bg-gray-50"
                      >
                        Shop Profile
                      </Link>
                      <Link
                        to="/orders"
                        onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2 text-sm hover:bg-gray-50"
                      >
                        My Orders
                      </Link>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onHelpClick();
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                      >
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                        Get Help
                      </button>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100 cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        Log Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              !isLoginPage && (
                <Link
                  to="/auth"
                  className="bg-yellow-400 hover:bg-yellow-500 text-brand-dark font-black px-5 py-2.5 rounded-full text-sm transition duration-150 ease-in-out active-bounce"
                >
                  Sign In
                </Link>
              )
            )}

          </div>
        </div>
        
        {/* Mobile Search Bar (Displays below header row, hidden on products page which has its own filter bar) */}
        {!isLoginPage && !isProductsPage && (
          <div className="pb-3 md:hidden">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search biscuit, chips, soap..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white text-gray-900 pl-10 pr-4 py-2.5 rounded-full border border-brand-light/35 focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-inner text-sm transition-all"
              />
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400 pointer-events-none" />
            </form>
          </div>
        )}

      </div>
    </header>
  );
}
