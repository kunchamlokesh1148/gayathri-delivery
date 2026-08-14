import { NavLink } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Home, Package, ClipboardList, User, ShoppingCart } from 'lucide-react';

export default function BottomNav() {
  const { user } = useAuth();
  const { cartItems } = useCart();
  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  if (!user) return null;

  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/products', label: 'Catalog', icon: Package },
    { to: '/orders', label: 'Orders', icon: ClipboardList },
    { to: '/profile', label: 'Profile', icon: User },
    { to: '/cart', label: 'Cart', icon: ShoppingCart, badge: totalCartCount },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg py-1.5 px-2 z-40 flex justify-around items-center">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => 
              `flex flex-col items-center justify-center relative flex-1 text-center py-1 transition duration-150 ease-in-out ${
                isActive ? 'text-brand font-medium' : 'text-gray-500 hover:text-gray-900'
              }`
            }
          >
            <div className="relative">
              <Icon className="h-5.5 w-5.5" />
              {item.badge > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-yellow-400 text-brand-dark text-[10px] font-extrabold rounded-full h-4.5 w-4.5 flex items-center justify-center border border-white">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
