import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { OrderProvider } from "./context/OrderContext";
import { AuthProvider } from "./context/AuthContext";

// Layout Elements
import Header from "./components/Header";
import BottomNav from "./components/BottomNav";

// Route Security Guard
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AssignedOrders from "./pages/AssignedOrders";
import OrderDetails from "./pages/OrderDetails";

import VerifyDelivery from "./pages/VerifyDelivery";
import Profile from "./pages/Profile";

function AppContent() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col no-scrollbar">
      {/* Header - Hidden on login screen */}
      {!isLoginPage && <Header />}

      {/* Main Content Area */}
      <main className="flex-1 w-full overflow-y-auto no-scrollbar">
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />
          
          {/* Secured Delivery Portal Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute>
              <AssignedOrders />
            </ProtectedRoute>
          } />
          <Route path="/orders/:id" element={
            <ProtectedRoute>
              <OrderDetails />
            </ProtectedRoute>
          } />
          <Route path="/verify" element={
            <ProtectedRoute>
              <VerifyDelivery />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
        </Routes>
      </main>

      {/* Bottom Floating Navigation - Hidden on login screen */}
      {!isLoginPage && <BottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <OrderProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </OrderProvider>
    </AuthProvider>
  );
}
