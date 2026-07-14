import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocs, 
  collection, 
  updateDoc, 
  query, 
  where,
  onSnapshot,
  setDoc
} from "firebase/firestore";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";

const mapAuthError = (error) => {
  console.error("Original Firebase Auth Error:", error);
  const code = error?.code || error?.message || "";
  const errorText = typeof code === 'string' ? code.toLowerCase() : "";

  if (
    errorText.includes("invalid-credential") ||
    errorText.includes("wrong-password") ||
    errorText.includes("invalid-email")
  ) {
    return "Invalid credentials. Please check your email and password and try again.";
  }
  if (errorText.includes("user-not-found")) {
    return "No account found with the provided credentials.";
  }
  if (errorText.includes("email-already-in-use")) {
    return "An account with this email already exists.";
  }
  if (errorText.includes("weak-password")) {
    return "Password must be at least 6 characters long.";
  }
  if (errorText.includes("network-request-failed") || errorText.includes("network")) {
    return "Network error. Please check your internet connection and try again.";
  }
  if (errorText.includes("too-many-requests") || errorText.includes("too-many-login-attempts")) {
    return "Too many failed login attempts. Please try again later.";
  }
  return "Something went wrong. Please try again.";
};

// Default Firebase Configuration (swapped with env variables if set)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD8HkU-GlMjqe0oTHzlKO929676jTaAdYg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gayathri-c0c79.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gayathri-c0c79",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gayathri-c0c79.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "559006653229",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:559006653229:web:37bb35b002b88fcda611a4"
};

// Check if Firebase is configured
const isFirebaseConfigured = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "YOUR_API_KEY" &&
  firebaseConfig.projectId;

let firestoreDb = null;
let firebaseAuth = null;

if (isFirebaseConfigured) {
  try {
    const firebaseApp = initializeApp(firebaseConfig);
    firestoreDb = getFirestore(firebaseApp);
    firebaseAuth = getAuth(firebaseApp);
    console.log("Firebase SDK successfully initialized.");
  } catch (error) {
    console.error("Failed to initialize Firebase SDK:", error);
  }
} else {
  console.warn("Firebase credentials are not configured. Real-time features will not work.");
}

// Timeout helper to prevent Firestore hangs on slow network/uninitialized DB
const withTimeout = (promise, ms = 2500) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout after ${ms}ms`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
};

// ==========================================
// DB SERVICE METHODS (Firebase Real-Time Only)
// ==========================================

export const dbService = {
  // Subscribe to real-time orders assigned to specific staff ID
  subscribeOrders(uid, onUpdate, onError) {
    if (!uid || typeof uid !== "string") {
      onUpdate([]);
      return () => {};
    }

    const localUid = localStorage.getItem("deliveryUid");
    if (uid !== localUid) {
      console.warn("Security Alert: Unauthorized subscription request to orders.");
      onUpdate([]);
      return () => {};
    }

    if (isFirebaseConfigured && firestoreDb) {
      const q = query(collection(firestoreDb, "orders"), where("deliveryStaffId", "==", uid));
      return onSnapshot(q, (querySnapshot) => {
        const orders = [];
        querySnapshot.forEach((doc) => {
          if (doc.id === "ORD-9982" || doc.id === "ORD-4091") {
            return;
          }
          const order = { id: doc.id, ...doc.data() };
          console.log("Assigned Order loaded:", order.id);
          orders.push(order);
        });
        onUpdate(orders);
      }, (error) => {
        console.error("Firestore orders subscription error:", error);
        if (onError) onError(error);
      });
    }

    // Fallback if not configured
    onUpdate([]);
    return () => {};
  },

  // Subscribe to real-time driver profile
  subscribeDriverProfile(uid, onUpdate, onError) {
    if (!uid || typeof uid !== "string") {
      onUpdate(null);
      return () => {};
    }

    const localUid = localStorage.getItem("deliveryUid");
    if (uid !== localUid) {
      console.warn("Security Alert: Unauthorized subscription request to profile.");
      onUpdate(null);
      return () => {};
    }

    if (isFirebaseConfigured && firestoreDb) {
      const profileRef = doc(firestoreDb, "deliveryStaff", uid);
      return onSnapshot(profileRef, (docSnap) => {
        if (docSnap.exists()) {
          console.log("Profile subscription loaded");
          const data = docSnap.data();
          const defaultProfile = {
            name: data.name || "Delivery Rider",
            email: data.email || "",
            phone: data.phone || "",
            vehicle: data.vehicle || "Electric Cargo Bike",
            licensePlate: data.licensePlate || "N/A - E-Bike",
            avatar: data.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop",
            rating: data.rating !== undefined ? data.rating : 5.0,
            isOnline: data.isOnline !== undefined ? data.isOnline : true,
            earnings: data.earnings !== undefined ? data.earnings : 0.0,
            deliveriesCount: data.deliveriesCount !== undefined ? data.deliveriesCount : 0,
            badges: data.badges || ["Courier Active"]
          };
          const merged = { id: uid, ...defaultProfile, ...data };
          // Ensure fields have correct types and fallbacks
          merged.earnings = typeof merged.earnings === "number" ? merged.earnings : parseFloat(merged.earnings) || 0;
          merged.rating = typeof merged.rating === "number" ? merged.rating : parseFloat(merged.rating) || 0;
          merged.deliveriesCount = typeof merged.deliveriesCount === "number" ? merged.deliveriesCount : parseInt(merged.deliveriesCount) || 0;
          merged.badges = Array.isArray(merged.badges) ? merged.badges : [];
          onUpdate(merged);
        } else {
          onUpdate(null);
        }
      }, (error) => {
        console.error("Firestore profile subscription error:", error);
        if (onError) onError(error);
      });
    } else {
      onUpdate(null);
    }
    return () => {};
  },

  async updateOrderStatus(orderId, status, details = {}) {
    if (!orderId || typeof orderId !== "string") {
      throw new Error("Invalid orderId parameter.");
    }
    if (!status || typeof status !== "string") {
      throw new Error("Invalid status parameter.");
    }
    // Whitelist status changes for safety
    const allowedStatuses = ["in-transit", "delivered", "Delivered", "assigned"];
    if (!allowedStatuses.includes(status)) {
      throw new Error(`Invalid status transition: ${status}`);
    }

    const timestamp = new Date().toISOString();
    
    if (isFirebaseConfigured && firestoreDb) {
      try {
        const uid = localStorage.getItem("deliveryUid");
        if (!uid) {
          throw new Error("Unauthorized: No active login session.");
        }

        const orderRef = doc(firestoreDb, "orders", orderId);
        const orderSnap = await withTimeout(getDoc(orderRef), 3000);
        if (!orderSnap.exists()) {
          throw new Error("Order not found.");
        }

        const orderData = orderSnap.data();
        if (orderData.deliveryStaffId !== uid) {
          throw new Error("Access Denied: You are not authorized to update this order.");
        }

        const updateData = { status, ...details };
        if (status === "delivered" || status === "Delivered") {
          updateData.completedTimestamp = timestamp;
          updateData.deliveredAt = timestamp;
          updateData.estTime = "Completed";
        }
        await withTimeout(updateDoc(orderRef, updateData), 3000);
        
        // Return updated data
        const docSnap = await withTimeout(getDoc(orderRef), 3000);
        return docSnap.data();
      } catch (err) {
        console.error("Firebase updateOrderStatus error:", err);
        throw err;
      }
    }
    throw new Error("Firebase is not configured.");
  },

  // Update driver online status in Firestore
  async updateDriverStatus(uid, isOnline) {
    if (!uid || typeof uid !== "string") {
      throw new Error("Invalid uid parameter.");
    }
    if (typeof isOnline !== "boolean") {
      throw new Error("isOnline must be a boolean value.");
    }

    if (isFirebaseConfigured && firestoreDb) {
      try {
        const localUid = localStorage.getItem("deliveryUid");
        if (uid !== localUid) {
          throw new Error("Access Denied: Unauthorized profile update.");
        }
        const profileRef = doc(firestoreDb, "deliveryStaff", uid);
        await withTimeout(updateDoc(profileRef, { isOnline }), 3000);
      } catch (err) {
        console.error("Firebase updateDriverStatus error:", err);
        throw err;
      }
    }
  },

  // Update driver vehicle profile in Firestore
  async updateDriverVehicle(uid, vehicle, licensePlate) {
    if (!uid || typeof uid !== "string") {
      throw new Error("Invalid uid parameter.");
    }
    const cleanVehicle = (vehicle || "").trim();
    const cleanPlate = (licensePlate || "").trim();
    if (!cleanVehicle || !cleanPlate) {
      throw new Error("Vehicle and Bike Number are required.");
    }
    if (cleanVehicle.length > 50 || cleanPlate.length > 20) {
      throw new Error("Input length exceeds maximum allowed limit.");
    }

    if (isFirebaseConfigured && firestoreDb) {
      try {
        const localUid = localStorage.getItem("deliveryUid");
        if (uid !== localUid) {
          throw new Error("Access Denied: Unauthorized profile update.");
        }
        const profileRef = doc(firestoreDb, "deliveryStaff", uid);
        await withTimeout(updateDoc(profileRef, { vehicle: cleanVehicle, licensePlate: cleanPlate }), 3000);
      } catch (err) {
        console.error("Firebase updateDriverVehicle error:", err);
        throw err;
      }
    }
  },

  // Auth API
  async loginUser(email, password) {
    if (isFirebaseConfigured && firestoreDb && firebaseAuth) {
      try {
        // Authenticate with Firebase Authentication first
        const userCredential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
        const firebaseUser = userCredential.user;
        
        let data = null;
        let docId = firebaseUser.uid;

        // 1. Try to fetch by document ID (uid) first, avoiding collection queries
        try {
          const docRef = doc(firestoreDb, "deliveryStaff", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            data = docSnap.data();
            docId = docSnap.id;
          }
        } catch (getDocErr) {
          console.warn("Failed to get driver doc by UID:", getDocErr.message);
        }

        // 2. Fallback: Query by email if document wasn't found by UID
        if (!data) {
          try {
            const q = query(
              collection(firestoreDb, "deliveryStaff"),
              where("email", "==", email.trim())
            );
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const docSnap = querySnapshot.docs[0];
              data = docSnap.data();
              docId = docSnap.id;
            }
          } catch (queryErr) {
            console.warn("Collection query by email failed:", queryErr.message);
          }
        }

        // 3. Verify driver profile, or seed mock if not found
        if (data) {
          if (data.role !== "delivery") {
            throw new Error("Access Denied. Driver account not authorized.");
          }

          if (data.status !== "active") {
            throw new Error("Your account has been disabled by administrator.");
          }
        } else {
          // Auto-seed or mock driver details
          data = {
            name: "Delivery Driver",
            email: firebaseUser.email,
            role: "delivery",
            status: "active",
            vehicleName: "Mock Truck",
            licensePlate: "TS-MOCK-1234"
          };
          try {
            await setDoc(doc(firestoreDb, "deliveryStaff", docId), data);
          } catch (se) {
            console.warn("Auto-seeding driver doc failed (expected if rules are strict):", se.message);
          }
        }

        localStorage.setItem("deliveryUid", docId);
        localStorage.removeItem("delivery_current_user"); // Clean up old keys
        const userObj = { uid: docId, email: data.email, role: "delivery", ...data };
        return userObj;
      } catch (err) {
        if (err.code) {
          throw new Error(mapAuthError(err), { cause: err });
        }
        throw err;
      }
    }
    throw new Error("Firebase is not configured.");
  },

  async logoutUser() {
    localStorage.removeItem("deliveryUid");
    localStorage.removeItem("delivery_current_user");
    if (isFirebaseConfigured && firebaseAuth) {
      try {
        await signOut(firebaseAuth);
      } catch (e) {
        console.error("Firebase signOut error:", e);
      }
    }
  },

  async getCurrentUserRole(uid) {
    if (isFirebaseConfigured && firestoreDb) {
      try {
        const staffDocRef = doc(firestoreDb, "deliveryStaff", uid);
        const staffSnap = await withTimeout(getDoc(staffDocRef), 3000);
        if (staffSnap.exists()) {
          const data = staffSnap.data();
          if (data.role === "delivery" && data.status === "active") {
            return "delivery";
          }
        }
      } catch (e) {
        console.error("Error fetching user role from firestore:", e);
      }
    }
    return null;
  },

  // Listen to auth changes
  onAuthChanged(callback) {
    if (!isFirebaseConfigured || !firebaseAuth || !firestoreDb) {
      localStorage.removeItem("deliveryUid");
      callback(null);
      return () => {};
    }

    // Subscribe to Firebase Auth state changes
    const unsubscribeAuth = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (!firebaseUser) {
        localStorage.removeItem("deliveryUid");
        callback(null);
        return;
      }

      const uid = localStorage.getItem("deliveryUid");
      if (!uid) {
        let data = null;
        let docId = firebaseUser.uid;

        // 1. Try to fetch by document ID (uid) first, avoiding collection queries
        try {
          const docRef = doc(firestoreDb, "deliveryStaff", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            data = docSnap.data();
            docId = docSnap.id;
          }
        } catch (getDocErr) {
          console.warn("Auth state sync failed to get doc by UID:", getDocErr.message);
        }

        // 2. Fallback: Query by email if document wasn't found by UID
        if (!data) {
          try {
            const q = query(
              collection(firestoreDb, "deliveryStaff"),
              where("email", "==", firebaseUser.email.trim())
            );
            const querySnapshot = await withTimeout(getDocs(q), 3000);
            if (!querySnapshot.empty) {
              const docSnap = querySnapshot.docs[0];
              data = docSnap.data();
              docId = docSnap.id;
            }
          } catch (queryErr) {
            console.warn("Auth state sync query by email failed:", queryErr.message);
          }
        }

        // 3. Set the state with driver profile or mock
        if (data) {
          if (data.role === 'delivery' && data.status === 'active') {
            localStorage.setItem("deliveryUid", docId);
            callback({ uid: docId, email: data.email, role: 'delivery', ...data });
          } else {
            await signOut(firebaseAuth);
            localStorage.removeItem("deliveryUid");
            callback(null);
          }
        } else {
          const mockDriver = {
            uid: firebaseUser.uid,
            name: "Delivery Driver",
            email: firebaseUser.email,
            role: "delivery",
            status: "active",
            vehicleName: "Mock Truck",
            licensePlate: "TS-MOCK-1234"
          };
          localStorage.setItem("deliveryUid", firebaseUser.uid);
          callback(mockDriver);
        }
        return;
      }

      // We have a uid in localStorage. Verify it against the authenticated firebaseUser
      try {
        const docRef = doc(firestoreDb, "deliveryStaff", uid);
        const snap = await withTimeout(getDoc(docRef), 3000);
        if (snap.exists()) {
          const data = snap.data();
          // Security Check: Verify that the Firestore document's email matches the authenticated Firebase User's email
          if (
            data.email &&
            data.email.trim().toLowerCase() === firebaseUser.email.trim().toLowerCase() &&
            data.role === 'delivery' &&
            data.status === 'active'
          ) {
            callback({ uid, email: data.email, role: 'delivery', ...data });
          } else {
            console.warn("Security Alert: User email mismatch or inactive account. Logging out.");
            await signOut(firebaseAuth);
            localStorage.removeItem("deliveryUid");
            callback(null);
          }
        } else {
          await signOut(firebaseAuth);
          localStorage.removeItem("deliveryUid");
          callback(null);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        await signOut(firebaseAuth);
        localStorage.removeItem("deliveryUid");
        callback(null);
      }
    });

    return unsubscribeAuth;
  }
};
