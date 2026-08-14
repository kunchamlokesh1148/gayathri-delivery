import { createContext, useContext, useState, useEffect } from 'react';
import { createOrder } from '../services/db';
import { db, isFirebaseActive } from '../services/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    const localCart = localStorage.getItem('wh_cart');
    return localCart ? JSON.parse(localCart) : [];
  });

  const [dbProducts, setDbProducts] = useState(() => {
    const localData = localStorage.getItem('wh_products');
    return localData ? JSON.parse(localData) : [];
  });

  useEffect(() => {
    localStorage.setItem('wh_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    let unsubscribe = () => {};
    if (isFirebaseActive) {
      unsubscribe = onSnapshot(collection(db, 'products'), (snap) => {
        const prodData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDbProducts(prodData);
      }, (error) => {
        console.error("[CartContext] onSnapshot products error:", error);
      });
    }
    return () => unsubscribe();
  }, []);

  const addToCart = (product, quantity = 1) => {
    // Look up the latest product details from dbProducts to prevent stale stock validations
    const latestProduct = dbProducts.find(p => p.id === product.id) || product;

    const wholesaleUnit = String(latestProduct?.wholesaleUnit || '').toLowerCase();
    const packQuantity = parseInt(latestProduct?.packQuantity) || 1;
    const stockQty = latestProduct?.stockQty !== undefined ? parseInt(latestProduct.stockQty) : 0;

    const isPack = wholesaleUnit.includes('pack') || wholesaleUnit.includes('box');
    const availablePacks = isPack ? Math.floor(stockQty / (packQuantity > 0 ? packQuantity : 1)) : stockQty;

    console.log("[CartContext] addToCart details:", {
      stockQty,
      packQuantity,
      availablePacks,
      productId: product?.id,
      wholesaleUnit,
      isPack,
      productName: product?.name
    });

    const existing = cartItems.find(item => item.product.id === product.id);
    const currentQty = existing ? existing.quantity : 0;
    const newQty = currentQty + quantity;

    if (newQty > availablePacks) {
      alert(isPack ? `Only ${availablePacks} pack(s) available` : `Only ${availablePacks} piece(s) available`);
      return;
    }

    setCartItems(prev => {
      const existingItem = prev.find(item => item.product.id === product.id);
      if (existingItem) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  const removeFromCart = (productId) => {
    setCartItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    const existing = cartItems.find(item => item.product.id === productId);
    if (!existing) return;

    // Look up the latest product details from dbProducts to prevent stale stock validations
    const latestProduct = dbProducts.find(p => p.id === productId) || existing.product;

    const wholesaleUnit = String(latestProduct?.wholesaleUnit || '').toLowerCase();
    const packQuantity = parseInt(latestProduct?.packQuantity) || 1;
    const stockQty = latestProduct?.stockQty !== undefined ? parseInt(latestProduct.stockQty) : 0;

    const isPack = wholesaleUnit.includes('pack') || wholesaleUnit.includes('box');
    const availablePacks = isPack ? Math.floor(stockQty / (packQuantity > 0 ? packQuantity : 1)) : stockQty;

    console.log("[CartContext] updateQuantity details:", {
      stockQty,
      packQuantity,
      availablePacks,
      productId,
      wholesaleUnit,
      isPack,
      productName: latestProduct?.name
    });

    if (newQty > availablePacks) {
      alert(isPack ? `Only ${availablePacks} pack(s) available` : `Only ${availablePacks} piece(s) available`);
      return;
    }

    setCartItems(prev => 
      prev.map(item => 
        item.product.id === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  // Wholesale pricing calculations
  const subtotal = cartItems.reduce((acc, item) => {
    const prod = dbProducts.find(p => p.id === item.product.id) || item.product;
    const price = prod.wholesalePrice !== undefined ? prod.wholesalePrice : (prod.price || 0);
    const multiplier = (prod.wholesaleUnit === 'Pack' || prod.wholesaleUnit === 'Box') ? (parseInt(prod.packQuantity) || 12) : 1;
    return acc + (price * multiplier * item.quantity);
  }, 0);
  const gst = 0; // GST excluded per user request
  const deliveryFee = subtotal === 0 ? 0 : (subtotal >= 2000 ? 0 : 99); // Free shipping for orders >= Rs. 2000
  const totalAmount = subtotal + deliveryFee;

  const checkout = async (userId, shopDetails) => {
    if (cartItems.length === 0) throw new Error("Cannot checkout an empty cart.");

    const orderData = {
      userId: userId || "",
      customerId: userId || "",
      customerName: shopDetails.ownerName || shopDetails.shopName || "Customer",
      customerEmail: shopDetails.email || "",
      shopName: shopDetails.shopName || "",
      ownerName: shopDetails.ownerName || "",
      mobileNumber: shopDetails.mobileNumber || shopDetails.mobile || shopDetails.phone || "",
      deliveryAddress: shopDetails.address || "",
      items: cartItems.map(item => {
        const prod = dbProducts.find(p => p.id === item.product.id) || item.product;
        const price = prod.wholesalePrice !== undefined ? prod.wholesalePrice : (prod.price || 0);
        const multiplier = (prod.wholesaleUnit === 'Pack' || prod.wholesaleUnit === 'Box') ? (parseInt(prod.packQuantity) || 12) : 1;
        return {
          id: prod.id || "",
          name: prod.name || "",
          brand: prod.brand || "",
          price: price * multiplier,
          unit: prod.unit || "",
          quantity: item.quantity || 0,
          imageUrl: prod.imageUrl || "",
          image: prod.imageUrl || prod.image || ""
        };
      }),
      subtotal: subtotal || 0,
      gst: gst || 0,
      deliveryFee: deliveryFee || 0,
      totalAmount: totalAmount || 0
    };

    const newOrder = await createOrder(orderData);
    clearCart();
    return newOrder;
  };

  const loadPreviousOrderToCart = (items) => {
    const formattedItems = items.map(item => ({
      product: {
        id: item.id,
        name: item.name,
        brand: item.brand,
        price: item.price,
        unit: item.unit,
        imageUrl: item.imageUrl || item.image || "",
        image: item.imageUrl || item.image || ""
      },
      quantity: item.quantity
    }));
    setCartItems(formattedItems);
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      subtotal,
      gst,
      deliveryFee,
      totalAmount,
      checkout,
      loadPreviousOrderToCart,
      dbProducts
    }}>
      {children}
    </CartContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext);
