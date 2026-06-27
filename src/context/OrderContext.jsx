import React, { createContext, useContext, useState, useEffect } from "react";
import { dbService } from "../services/firebase";
import { useAuth } from "./AuthContext";

export const getStatusVal = (status) => {
  if (!status) return "assigned";
  const s = status.toLowerCase().replace(/[\s-_]/g, "");
  if (s === "intransit" || s === "outfordelivery") return "in-transit";
  if (s === "delivered") return "delivered";
  return "assigned";
};

const OrderContext = createContext();

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error("useOrders must be used within an OrderProvider");
  }
  return context;
};

export const OrderProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Subscribe to real-time updates whenever the logged-in user changes
  useEffect(() => {
    if (!currentUser) {
      setOrders([]);
      setProfile(null);
      setActiveOrderId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Subscribe to driver profile
    const unsubscribeProfile = dbService.subscribeDriverProfile(
      currentUser.uid,
      (fetchedProfile) => {
        setProfile(fetchedProfile);
      },
      (err) => {
        console.error("Profile subscription error:", err);
        setError("Failed to sync profile.");
      }
    );

    // Subscribe to orders
    const unsubscribeOrders = dbService.subscribeOrders(
      currentUser.uid,
      (fetchedOrders) => {
        const safeOrders = Array.isArray(fetchedOrders) ? fetchedOrders : [];
        setOrders(safeOrders);
        
        // Find an active order (strictly in-transit) to set as activeOrderId
        setActiveOrderId((currentActiveId) => {
          const activeExists = safeOrders.find(o => {
            if (!o) return false;
            const status = getStatusVal(o.status);
            return o.id === currentActiveId && status === "in-transit";
          });
          if (activeExists) {
            return currentActiveId;
          }
          const active = safeOrders.find(o => o && getStatusVal(o.status) === "in-transit");
          return active ? active.id : null;
        });

        setLoading(false);
      },
      (err) => {
        console.error("Orders subscription error:", err);
        setError("Failed to sync orders.");
        setLoading(false);
      }
    );

    return () => {
      unsubscribeProfile();
      unsubscribeOrders();
    };
  }, [currentUser]);

  // Toggle driver online status
  const changeDriverStatus = async (isOnline) => {
    if (!currentUser) return;
    try {
      await dbService.updateDriverStatus(currentUser.uid, isOnline);
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  // Move order from 'assigned' to 'in-transit'
  const startOrderDelivery = async (orderId) => {
    try {
      await dbService.updateOrderStatus(orderId, "in-transit");
      setActiveOrderId(orderId);
      return true;
    } catch (err) {
      console.error("Failed to start delivery:", err);
      return false;
    }
  };

  // Verify delivery with code
  const verifyOrderDelivery = async (orderId, enteredCode) => {
    const ordersList = Array.isArray(orders) ? orders : [];
    const order = ordersList.find(o => o && o.id === orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.deliveryCode && String(order.deliveryCode).trim() !== "" && String(order.deliveryCode).trim() === String(enteredCode).trim()) {
      try {
        await dbService.updateOrderStatus(orderId, "Delivered");
        return true;
      } catch (err) {
        console.error("Failed to verify delivery:", err);
        throw new Error("Database update failed. Try again.");
      }
    } else {
      throw new Error("Invalid Verification Code");
    }
  };

  const completeOrderDelivery = async (orderId) => {
    try {
      await dbService.updateOrderStatus(orderId, "Delivered");
      return true;
    } catch (err) {
      console.error("Failed to complete delivery:", err);
      return false;
    }
  };

  const updateDriverVehicle = async (vehicle, licensePlate) => {
    if (!currentUser) return false;
    try {
      await dbService.updateDriverVehicle(currentUser.uid, vehicle, licensePlate);
      return true;
    } catch (err) {
      console.error("Failed to update vehicle:", err);
      return false;
    }
  };

  const activeOrder = (Array.isArray(orders) ? orders : []).find(o => o && o.id === activeOrderId) || null;

  return (
    <OrderContext.Provider
      value={{
        orders: Array.isArray(orders) ? orders : [],
        profile,
        activeOrderId,
        activeOrder,
        setActiveOrderId,
        loading,
        error,
        changeDriverStatus,
        startOrderDelivery,
        verifyOrderDelivery,
        completeOrderDelivery,
        updateDriverVehicle,
        refreshData: () => {}
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};
