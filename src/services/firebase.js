import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  collection, 
  updateDoc, 
  query, 
  where,
  onSnapshot,
  serverTimestamp,
  deleteDoc
} from "firebase/firestore";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
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
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

// Check if Firebase is configured
const isFirebaseConfigured = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "YOUR_API_KEY" &&
  firebaseConfig.projectId;

let firebaseApp = null;
let firestoreDb = null;
let firebaseAuth = null;

if (isFirebaseConfigured) {
  try {
    firebaseApp = initializeApp(firebaseConfig);
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
    if (!uid) {
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
          console.log("Assigned Order", order);
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
    if (!uid) {
      onUpdate(null);
      return () => {};
    }

    if (isFirebaseConfigured && firestoreDb) {
      const profileRef = doc(firestoreDb, "deliveryStaff", uid);
      return onSnapshot(profileRef, (docSnap) => {
        if (docSnap.exists()) {
          console.log("Profile already exists");
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
    const timestamp = new Date().toISOString();
    
    if (isFirebaseConfigured && firestoreDb) {
      try {
        const orderRef = doc(firestoreDb, "orders", orderId);
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
    if (isFirebaseConfigured && firestoreDb && uid) {
      try {
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
    if (isFirebaseConfigured && firestoreDb && uid) {
      try {
        const profileRef = doc(firestoreDb, "deliveryStaff", uid);
        await withTimeout(updateDoc(profileRef, { vehicle, licensePlate }), 3000);
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
        
        // Fetch driver's profile from Firestore by email query to handle legacy UIDs
        const q = query(
          collection(firestoreDb, "deliveryStaff"),
          where("email", "==", email.trim())
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          throw new Error("No account found with the provided credentials.");
        }

        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();
        const docId = docSnap.id;

        if (data.role !== "delivery") {
          throw new Error("Access Denied. Driver account not authorized.");
        }

        if (data.status !== "active") {
          throw new Error("Your account has been disabled by administrator.");
        }

        localStorage.setItem("deliveryUid", docId);
        localStorage.removeItem("delivery_current_user"); // Clean up old keys
        const userObj = { uid: docId, email: data.email, role: "delivery", ...data };
        return userObj;
      } catch (err) {
        if (err.code) {
          throw new Error(mapAuthError(err));
        }
        throw err;
      }
    }
    throw new Error("Firebase is not configured.");
  },

  async logoutUser() {
    localStorage.removeItem("deliveryUid");
    localStorage.removeItem("delivery_current_user");
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
    const uid = localStorage.getItem("deliveryUid");
    if (uid) {
      if (isFirebaseConfigured && firestoreDb) {
        const docRef = doc(firestoreDb, "deliveryStaff", uid);
        withTimeout(getDoc(docRef), 3000).then((snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.status === 'active' && data.role === 'delivery') {
              callback({ uid, email: data.email, role: 'delivery', ...data });
            } else {
              localStorage.removeItem("deliveryUid");
              callback(null);
            }
          } else {
            localStorage.removeItem("deliveryUid");
            callback(null);
          }
        }).catch((err) => {
          console.error("Auth check failed:", err);
          localStorage.removeItem("deliveryUid");
          callback(null);
        });
      } else {
        localStorage.removeItem("deliveryUid");
        callback(null);
      }
    } else {
      callback(null);
    }
    return () => {};
  }
};
