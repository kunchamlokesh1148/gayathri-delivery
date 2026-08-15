import { db, isFirebaseActive } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  runTransaction
} from 'firebase/firestore';

// Helper: remove empty fields
const cleanObject = (obj) => {
  const cleaned = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      cleaned[key] = obj[key];
    }
  });
  return cleaned;
};

// Timeout helper to avoid hanging Firebase calls
const withTimeout = (promise, ms = 2500) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Firebase operation timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (res) => { clearTimeout(timer); resolve(res); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
};

/** GET PRODUCTS **/
export const getProducts = async () => {
  console.log('Loading products from Firestore');
  if (isFirebaseActive) {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'products')), 2500);
      if (!snap.empty) {
        const prodData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return prodData.filter(p => !p.status || p.status.toLowerCase() === 'active');
      }
    } catch (e) {
      console.warn('Firestore getProducts failed or timed out:', e);
    }
  }
  // Fallback returns empty array when Firebase inactive
  return [];
};

/** SANITIZE SIDDIPET PINCODE (502103) **/
export const sanitizePincode = (pincode) => {
  if (!pincode || String(pincode).trim() === '508100' || String(pincode).trim() === '') {
    return '502103';
  }
  return String(pincode).trim();
};

export const sanitizeDeliveryAddress = (addr) => {
  if (!addr || typeof addr !== 'object') return addr;
  const rawPin = addr.pincode || addr.postcode || '';
  const cleanPincode = sanitizePincode(rawPin);
  const cleanFullAddr = (addr.fullAddress || '')
    .replace(/508100/g, '502103');
  return {
    ...addr,
    pincode: cleanPincode,
    postcode: cleanPincode,
    fullAddress: cleanFullAddr
  };
};

/** GET USER PROFILE **/
export const getUserProfile = async (uid) => {
  console.log('Loading customers from Firestore');
  if (isFirebaseActive && uid) {
    try {
      const docRef = doc(db, 'customers', uid);
      const docSnap = await withTimeout(getDoc(docRef), 2500);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.deliveryAddress) {
          data.deliveryAddress = sanitizeDeliveryAddress(data.deliveryAddress);
        }
        if (data.address) {
          data.address = data.address.replace(/508100/g, '502103');
        }
        console.log('Customer Profile Loaded');
        return data;
      }
    } catch (e) {
      console.warn('Firestore getUserProfile failed or timed out:', e);
    }
  }
  // Return null when no data
  return null;
};

/** SAVE USER PROFILE **/
export const saveUserProfile = async (uid, profileData) => {
  console.log('Saving customer profile to Firestore');
  if (isFirebaseActive && uid) {
    try {
      if (profileData.deliveryAddress) {
        profileData.deliveryAddress = sanitizeDeliveryAddress(profileData.deliveryAddress);
      }
      if (profileData.address) {
        profileData.address = profileData.address.replace(/508100/g, '502103');
      }

      const docRef = doc(db, 'customers', uid);
      const docSnap = await getDoc(docRef);
      let mergedData = profileData;
      if (docSnap.exists()) {
        mergedData = { ...docSnap.data(), ...profileData };
      }
      const cleaned = cleanObject(mergedData);
      await withTimeout(setDoc(docRef, cleaned), 2500);
      console.log('Customer Profile Saved');
      return true;
    } catch (e) {
      console.warn('Firestore saveUserProfile failed or timed out:', e);
    }
  }
  console.warn('saveUserProfile called when Firebase inactive – operation ignored');
  return false;
};

/** CREATE ORDER **/
export const createOrder = async (orderData) => {
  console.log('Order Data:', orderData);
  const totalQty = (orderData.items || []).reduce((acc, item) => acc + (item.quantity || 0), 0);
  const requiredFields = {
    customerId: orderData.userId || orderData.customerId,
    customerName: orderData.customerName || orderData.ownerName || orderData.shopName,
    items: orderData.items,
    totalAmount: orderData.totalAmount
  };
  for (const [key, value] of Object.entries(requiredFields)) {
    if (value === undefined || value === null) {
      console.error(`Validation failed: Field '${key}' is undefined or null!`);
      throw new Error(`Failed to place order: Required field '${key}' is missing.`);
    }
  }
  const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
  const cleanOrder = {
    id: orderId,
    customerId: orderData.userId || orderData.customerId || '',
    customerName: orderData.customerName || orderData.ownerName || 'Customer',
    customerEmail: orderData.customerEmail || orderData.email || '',
    shopName: orderData.shopName || '',
    address: (orderData.deliveryAddress && typeof orderData.deliveryAddress === 'object') ? (orderData.deliveryAddress.fullAddress || '') : (orderData.deliveryAddress || orderData.address || ''),
    items: (orderData.items || []).map(item => ({
      id: item.id || '',
      name: item.name || '',
      brand: item.brand || '',
      price: item.price || 0,
      unit: item.unit || '',
      quantity: item.quantity || 0,
      image: item.image || ''
    })),
    quantity: totalQty || 0,
    totalAmount: orderData.totalAmount || 0,
    status: 'Pending',
    createdAt: new Date().toISOString(),
    // Compatibility fields for legacy screens
    userId: orderData.userId || orderData.customerId || '',
    ownerName: orderData.ownerName || orderData.customerName || '',
    mobileNumber: orderData.mobileNumber || orderData.mobile || '',
    deliveryAddress: orderData.deliveryAddress || orderData.address || '',
    subtotal: orderData.subtotal || orderData.totalAmount || 0,
    deliveryFee: orderData.deliveryFee || 0
  };
  // Ensure no undefined values
  Object.keys(cleanOrder).forEach(key => {
    if (cleanOrder[key] === undefined) cleanOrder[key] = '';
  });
  if (isFirebaseActive) {
    try {
      console.log('Saving order to Firestore');
      await runTransaction(db, async (transaction) => {
        // Stock validation
        for (const item of cleanOrder.items) {
          const productRef = doc(db, 'products', item.id);
          const productSnap = await transaction.get(productRef);
          if (!productSnap.exists()) {
            throw new Error('Product not found');
          }
          const pData = productSnap.data();
          const wholesaleUnit = String(pData.wholesaleUnit || pData.unit || 'Piece').toLowerCase();
          const packQty = parseInt(pData.packQuantity) || 12;
          const currentStock = parseInt(pData.stockQty !== undefined ? pData.stockQty : (pData.stock || 0));
          let neededQty = wholesaleUnit.includes('pack') || wholesaleUnit.includes('box')
            ? item.quantity * packQty
            : item.quantity;
          if (currentStock < neededQty) {
            throw new Error('Insufficient stock available');
          }
        }
        cleanOrder.stockDeducted = false;
        const docRef = doc(db, 'orders', cleanOrder.id);
        transaction.set(docRef, cleanOrder);
      });
      console.log('Order saved to Firestore');
      return cleanOrder;
    } catch (e) {
      console.error('Firestore createOrder failed:', e);
      throw e;
    }
  }
  console.warn('createOrder called when Firebase inactive – operation ignored');
  throw new Error('Firebase is required to place orders');
};

/** GET ORDERS **/
export const getOrders = async (uid) => {
  console.log('Loading orders from Firestore');
  if (isFirebaseActive && uid) {
    try {
      const q = query(collection(db, 'orders'), where('customerId', '==', uid));
      const snap = await withTimeout(getDocs(q), 2500);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (e) {
      console.warn('Firestore getOrders failed or timed out:', e);
    }
  }
  return [];
};

/** GET ORDER BY ID **/
export const getOrderById = async (orderId) => {
  console.log('Loading single order from Firestore');
  if (isFirebaseActive && orderId) {
    try {
      const docRef = doc(db, 'orders', orderId);
      const docSnap = await withTimeout(getDoc(docRef), 2500);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
    } catch (e) {
      console.warn('Firestore getOrderById failed or timed out:', e);
    }
  }
  return null;
};

/** UPDATE ORDER STATUS **/
export const updateOrderStatus = async (orderId, newStatus) => {
  console.log('Updating order status in Firestore');
  if (isFirebaseActive && orderId) {
    try {
      const docRef = doc(db, 'orders', orderId);
      await withTimeout(updateDoc(docRef, { status: newStatus }), 2500);
      return true;
    } catch (e) {
      console.warn('Firestore updateOrderStatus failed or timed out:', e);
    }
  }
  return false;
};

/** CHECK IF MOBILE EXISTS **/
export const checkMobileExists = async (mobile) => {
  if (isFirebaseActive && mobile) {
    try {
      const cleanMobile = mobile.trim();
      const formattedMobile = cleanMobile.startsWith('+91') ? cleanMobile : `+91${cleanMobile}`;
      const q = query(collection(db, 'customers'), where('mobile', '==', formattedMobile));
      const snap = await withTimeout(getDocs(q), 2500);
      return !snap.empty;
    } catch (e) {
      console.warn('Firestore checkMobileExists failed or timed out:', e);
    }
  }
  return false;
};

/** CHECK IF EMAIL EXISTS **/
export const checkEmailExists = async (email) => {
  if (isFirebaseActive && email) {
    try {
      const q = query(collection(db, 'customers'), where('email', '==', email.trim().toLowerCase()));
      const snap = await withTimeout(getDocs(q), 2500);
      return !snap.empty;
    } catch (e) {
      console.warn('Firestore checkEmailExists failed or timed out:', e);
    }
  }
  return false;
};

/** CREATE SUPPORT ISSUE **/
export const createSupportIssue = async (issueData) => {
  console.log('Creating support issue in Firestore');
  if (isFirebaseActive) {
    try {
      const issuesRef = collection(db, 'issues');
      const newIssueDoc = doc(issuesRef);
      const cleanIssue = {
        customerId: issueData.customerId || '',
        customerName: issueData.customerName || '',
        shopName: issueData.shopName || '',
        mobile: issueData.mobile || '',
        email: issueData.email || '',
        address: issueData.address || '',
        issueType: issueData.issueType || '',
        description: issueData.description || '',
        status: 'Pending',
        createdAt: new Date().toISOString()
      };
      
      await withTimeout(setDoc(newIssueDoc, cleanIssue), 2500);
      console.log('Support issue saved successfully:', newIssueDoc.id);
      return true;
    } catch (e) {
      console.error('Firestore createSupportIssue failed:', e);
      throw e;
    }
  }
  console.warn('createSupportIssue called when Firebase inactive');
  throw new Error('Firebase is required to submit support issues.');
};

/** GEOLOCATION / GEOCODING HELPERS **/
export const reverseGeocode = async (lat, lon) => {
  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (googleApiKey) {
    try {
      const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${googleApiKey}`;
      const response = await fetch(gUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const result = data.results[0];
          
          let postcode = '';
          let city = '';
          let state = 'Telangana';

          result.address_components?.forEach(comp => {
            if (comp.types.includes('postal_code')) postcode = comp.long_name;
            if (comp.types.includes('locality') || comp.types.includes('administrative_area_level_2')) city = comp.long_name;
            if (comp.types.includes('administrative_area_level_1')) state = comp.long_name;
          });

          return {
            display_name: result.formatted_address,
            lat: lat.toString(),
            lon: lon.toString(),
            address: {
              road: result.formatted_address,
              suburb: city,
              city: city || "Siddipet",
              state: state,
              postcode: postcode || "502103"
            }
          };
        }
      }
    } catch (gErr) {
      console.warn("[db.js] Google reverseGeocode failed, falling back to OpenStreetMap:", gErr);
    }
  }

  // Fallback to OpenStreetMap Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'Accept-Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error("Reverse geocoding API call failed");
    return await response.json();
  } catch (error) {
    console.error("[db.js] reverseGeocode error:", error);
    throw error;
  }
};

export const geocodeManualAddress = async (street, area, pincode) => {
  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const queryStr = `${street || ''} ${area || ''} Siddipet Telangana ${pincode || ''}`.trim();

  if (googleApiKey) {
    try {
      const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(queryStr)}&key=${googleApiKey}`;
      const response = await fetch(gUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const result = data.results[0];
          const loc = result.geometry.location;

          let postcode = pincode || '';
          let city = 'Siddipet';
          let state = 'Telangana';

          result.address_components?.forEach(comp => {
            if (comp.types.includes('postal_code')) postcode = comp.long_name;
            if (comp.types.includes('locality')) city = comp.long_name;
            if (comp.types.includes('administrative_area_level_1')) state = comp.long_name;
          });

          return {
            lat: loc.lat.toString(),
            lon: loc.lng.toString(),
            display_name: result.formatted_address,
            address: {
              city,
              state,
              postcode
            }
          };
        }
      }
    } catch (gErr) {
      console.warn("[db.js] Google geocodeManualAddress failed, falling back to Nominatim:", gErr);
    }
  }

  // Fallback to OpenStreetMap Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryStr)}&format=json&limit=1&addressdetails=1&countrycodes=in`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        return data[0];
      }
    }
    
    // Fallback 1: geocode by postal code in Siddipet
    if (pincode) {
      const pUrl = `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&city=Siddipet&state=Telangana&country=India&format=json&limit=1&addressdetails=1`;
      const pRes = await fetch(pUrl);
      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData && pData.length > 0) {
          return pData[0];
        }
      }
    }
    
    // Fallback 2: Return town center coordinates
    return {
      lat: "18.1018",
      lon: "78.8523",
      address: {
        city: "Siddipet",
        county: "Siddipet",
        state: "Telangana",
        postcode: pincode || "502103"
      }
    };
  } catch (error) {
    console.error("[db.js] geocodeManualAddress error:", error);
    return {
      lat: "18.1018",
      lon: "78.8523",
      address: {
        city: "Siddipet",
        county: "Siddipet",
        state: "Telangana",
        postcode: pincode || "502103"
      }
    };
  }
};

/** SIDDIPET URBAN LOCATION VALIDATOR **/
export const SIDDIPET_URBAN_CENTER = { lat: 18.1018, lng: 78.8523 };
export const MAX_DELIVERY_RADIUS_KM = 5; // 5km urban radius around Siddipet
export const SIDDIPET_URBAN_PINCODES = ['502103', '502108', '502114', '502277', '502107'];

export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const isSiddipetUrbanLocation = (latitude, longitude, addressData = {}) => {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  let distanceKm = null;
  let hasValidCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

  if (hasValidCoords) {
    distanceKm = calculateDistanceKm(SIDDIPET_URBAN_CENTER.lat, SIDDIPET_URBAN_CENTER.lng, lat, lng);
  }

  const fullText = (
    (addressData.fullAddress || '') + ' ' +
    (addressData.street || '') + ' ' +
    (addressData.area || '') + ' ' +
    (addressData.city || '') + ' ' +
    (addressData.district || '') + ' ' +
    (addressData.display_name || '')
  ).toLowerCase();

  const pincode = addressData.pincode || addressData.postcode || '';

  const mentionsSiddipet = fullText.includes('siddipet');
  const mentionsTelangana = fullText.includes('telangana') || fullText.includes('ts');
  const hasUrbanPincode = SIDDIPET_URBAN_PINCODES.includes(pincode);

  let isUrban = false;
  if (hasValidCoords) {
    isUrban = distanceKm <= MAX_DELIVERY_RADIUS_KM;
  } else {
    isUrban = (mentionsSiddipet && mentionsTelangana) || hasUrbanPincode;
  }

  return {
    isUrban,
    distanceKm: distanceKm ? parseFloat(distanceKm.toFixed(2)) : null,
    message: isUrban
      ? null
      : "Not available in your location. FLASH-G Cutmit currently delivers only within a 5km radius of Siddipet Urban."
  };
};


/** GET SETTINGS **/
export const getSettings = async (type) => {
  if (isFirebaseActive) {
    try {
      const docRef = doc(db, 'settings', type);
      const docSnap = await withTimeout(getDoc(docRef), 2500);
      return docSnap.exists() ? docSnap.data() : {};
    } catch (e) {
      console.warn(`Firestore getSettings for ${type} failed or timed out:`, e);
    }
  }
  const allSettings = JSON.parse(localStorage.getItem('wholesale_settings')) || {};
  return allSettings[type] || {};
};

/** GET CAROUSEL BANNERS **/
export const getCarouselBanners = async () => {
  if (isFirebaseActive) {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'homepageCarousel')), 3000);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return list.sort((a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0));
    } catch (e) {
      console.warn('Firestore getCarouselBanners failed or timed out:', e);
    }
  }
  const list = JSON.parse(localStorage.getItem('wholesale_carousel')) || [];
  return list.sort((a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0));
};

/** GET CATEGORIES **/
export const getCategories = async () => {
  if (isFirebaseActive) {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'categories')), 3000);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.warn('Firestore getCategories failed or timed out:', e);
    }
  }
  return JSON.parse(localStorage.getItem('wholesale_categories')) || [];
};


