import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import HelpModal from './components/HelpModal';
import { HelpCircle } from 'lucide-react';

// Pages
import Home from './pages/Home';
import Products from './pages/Products';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import OrderDetails from './pages/OrderDetails';
import Profile from './pages/Profile';
import Auth from './pages/Auth';

// Protected Route Wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation Header */}
      <Navbar onHelpClick={() => setIsHelpOpen(true)} />

      {/* Main Pages Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto pb-24 md:pb-8">
        <Routes>
          <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
          
          {/* Protected Wholesaler Routes - Require Sign In */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/products" 
            element={
              <ProtectedRoute>
                <Products />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/cart" 
            element={
              <ProtectedRoute>
                <Cart />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/orders" 
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/orders/:id" 
            element={
              <ProtectedRoute>
                <OrderDetails />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Floating Action Button */}
      {user && location.pathname !== '/auth' && (
        <button
          onClick={() => setIsHelpOpen(true)}
          className="fixed z-40 bottom-20 right-4 md:bottom-6 md:right-6 bg-brand hover:bg-brand-dark text-white pl-3.5 pr-4 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-1.5 hover:scale-105 active:scale-95 border border-white/10 cursor-pointer"
          title="Get Help"
        >
          <HelpCircle className="h-5 w-5 text-yellow-400" />
          <span className="font-extrabold text-xs">
            Get Help
          </span>
        </button>
      )}

      {/* Help Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* Mobile Sticky Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}
