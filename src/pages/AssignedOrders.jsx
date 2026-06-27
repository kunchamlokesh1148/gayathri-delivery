import React, { useState } from "react";
import { useOrders, getStatusVal } from "../context/OrderContext";
import RouteWrapper from "../components/RouteWrapper";
import OrderCard from "../components/OrderCard";
import { Search, Inbox, SlidersHorizontal, PackageOpen } from "lucide-react";

export default function AssignedOrders() {
  const { orders, loading } = useOrders();
  const [activeTab, setActiveTab] = useState("all"); // all, pending (in-transit + assigned), completed (delivered)
  const [searchQuery, setSearchQuery] = useState("");

  const ordersList = Array.isArray(orders) ? orders : [];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500"></div>
      </div>
    );
  }

  // Filter orders by active tab
  const getFilteredOrders = () => {
    let filtered = [...ordersList];

    if (activeTab === "pending") {
      filtered = filtered.filter(o => o && (getStatusVal(o.status) === "assigned" || getStatusVal(o.status) === "in-transit"));
    } else if (activeTab === "completed") {
      filtered = filtered.filter(o => o && getStatusVal(o.status) === "delivered");
    }

    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        o => o && (
          (o.id || "").toLowerCase().includes(query) || 
          (o.customerName || o.customer || "").toLowerCase().includes(query) ||
          (o.address || "").toLowerCase().includes(query)
        )
      );
    }

    return filtered;
  };

  const filteredOrders = getFilteredOrders();

  return (
    <RouteWrapper>
      {/* Header section */}
      <div className="mb-5">
        <h2 className="text-2xl font-black font-outfit text-white">Assigned Shipments</h2>
        <p className="text-xs text-zinc-400 mt-1">Manage and track your daily courier route</p>
      </div>

      {/* Search Bar & Filter Buttons */}
      <div className="flex items-center space-x-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by ID, name, address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs glass-input border border-white/5"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 rounded-xl bg-zinc-900/50 border border-white/5 mb-6">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === "all"
              ? "bg-brand-600 text-white shadow-lg"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          All ({ordersList.length})
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === "pending"
              ? "bg-amber-600 text-white shadow-lg"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Pending ({ordersList.filter(o => o && (getStatusVal(o.status) === "assigned" || getStatusVal(o.status) === "in-transit")).length})
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === "completed"
              ? "bg-emerald-600 text-white shadow-lg"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Completed ({ordersList.filter(o => o && getStatusVal(o.status) === "delivered").length})
        </button>
      </div>

      {/* Order List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))
        ) : (
          <div className="glass-card rounded-2xl py-12 px-4 text-center border border-white/5 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center mb-4">
              <PackageOpen className="w-6 h-6 text-zinc-500" />
            </div>
            <h4 className="text-sm font-bold text-zinc-300">
              {ordersList.length === 0 ? "No assigned deliveries" : "No shipments found"}
            </h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-[240px]">
              {ordersList.length === 0 
                ? "You have no courier runs scheduled at the moment."
                : (searchQuery 
                  ? "Try adjusting your search query to find the shipment." 
                  : "All caught up! There are no orders in this list.")
              }
            </p>
          </div>
        )}
      </div>
    </RouteWrapper>
  );
}
