import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Store, User, Phone, Save, Edit3, X, CheckCircle2, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { reverseGeocode, geocodeManualAddress, isSiddipetUrbanLocation } from '../services/db';
import GoogleMapView from '../components/GoogleMapView';
import LocationPickerModal from '../components/LocationPickerModal';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mobileError, setMobileError] = useState('');

  const validateMobile = (value) => {
    if (!value) {
      setMobileError('Mobile Number is required.');
      return false;
    }
    if (value.length !== 10) {
      setMobileError('Enter valid mobile number');
      return false;
    }
    setMobileError('');
    return true;
  };

  const [formData, setFormData] = useState({
    shopName: user?.shopName || '',
    ownerName: user?.ownerName || '',
    mobile: user?.mobile || '',
    address: user?.address || '',
    email: user?.email || ''
  });

  const [gpsLoading, setGpsLoading] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [addressDetails, setAddressDetails] = useState(user?.deliveryAddress || null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualAddressForm, setManualAddressForm] = useState({
    houseNumber: '',
    street: '',
    area: '',
    landmark: '',
    pincode: ''
  });

  const handleAddCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setGpsLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          // Center coordinates of Siddipet, Telangana, India
          const SIDDIPET_CENTER_LAT = 18.1019;
          const SIDDIPET_CENTER_LON = 78.8519;

          // Haversine distance formula to calculate distance in km
          const getDistanceInKm = (lat1, lon1, lat2, lon2) => {
            const R = 6371; // Radius of the earth in km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = 
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon / 2) * Math.sin(dLon / 2); 
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
            return R * c;
          };

          const distance = getDistanceInKm(latitude, longitude, SIDDIPET_CENTER_LAT, SIDDIPET_CENTER_LON);
          
          if (distance > 5) {
            setError("Sorry! FLASH-G Cutmit currently delivers only within a 5km radius of Siddipet town center.");
            setAddressDetails(null);
            setGpsLoading(false);
            return;
          }

          let geoData = {};
          try {
            geoData = await reverseGeocode(latitude, longitude);
          } catch (ge) {
            console.warn("Reverse geocode failed, using defaults:", ge);
          }
          const addr = geoData.address || {};
          
          const pincode = addr.postcode || "502103";
          const street = addr.road || "";
          const area = addr.suburb || addr.neighbourhood || addr.residential || "";
          const houseNumber = addr.house_number || "";
          
          const fullAddr = `${houseNumber ? 'H.No ' + houseNumber + ', ' : ''}${street ? street + ', ' : ''}${area ? area + ', ' : ''}Siddipet, Telangana - ${pincode}`.trim();
          
          const urbanCheck = isSiddipetUrbanLocation(latitude, longitude, { fullAddress: fullAddr, street, area, pincode });
          if (!urbanCheck.isUrban) {
            setError("Sorry! FLASH-G Cutmit currently delivers only within a 5km radius of Siddipet Urban.");
            setGpsLoading(false);
            return;
          }

          const deliveryAddr = {
            houseNumber,
            street,
            area,
            landmark: "",
            city: "Siddipet",
            district: "Siddipet",
            state: "Telangana",
            pincode,
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            fullAddress: fullAddr,
            isVerified: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          setAddressDetails(deliveryAddr);
          setFormData(prev => ({
            ...prev,
            address: fullAddr
          }));
        } catch (err) {
          console.error(err);
          setError("Failed to fetch address from location. Please enter manually.");
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        console.error(err);
        setError("Location access denied or unavailable. Please enter address manually.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSaveManualAddress = async (e) => {
    e.preventDefault();
    setError('');
    const { houseNumber, street, area, landmark, pincode } = manualAddressForm;
    if (!houseNumber || !street || !area || !pincode) {
      setError("Please fill all required manual address fields.");
      return;
    }
    
    setGpsLoading(true);
    try {
      const geoResult = await geocodeManualAddress(street, area, pincode);
      const lat = geoResult.lat ? geoResult.lat.toString() : "18.1018";
      const lon = geoResult.lon ? geoResult.lon.toString() : "78.8523";
      const fullAddr = `H.No ${houseNumber}, ${street}, ${area}, ${landmark ? landmark + ', ' : ''}Siddipet - ${pincode}, Telangana`;

      const urbanCheck = isSiddipetUrbanLocation(lat, lon, { fullAddress: fullAddr, street, area, pincode });
      if (!urbanCheck.isUrban) {
        setError("Sorry! FLASH-G Cutmit currently delivers only within a 5km radius of Siddipet Urban.");
        setGpsLoading(false);
        return;
      }
      
      const deliveryAddr = {
        houseNumber,
        street,
        area,
        landmark: landmark || "",
        city: "Siddipet",
        district: "Siddipet",
        state: "Telangana",
        pincode,
        latitude: geoResult.lat ? geoResult.lat.toString() : "18.1018",
        longitude: geoResult.lon ? geoResult.lon.toString() : "78.8523",
        fullAddress: fullAddr,
        isVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setAddressDetails(deliveryAddr);
      setFormData(prev => ({
        ...prev,
        address: fullAddr
      }));
      setShowManualForm(false);
    } catch (err) {
      console.error(err);
      setError("Address validation failed. Please check pincode/details.");
    } finally {
      setGpsLoading(false);
    }
  };

  // Sync state if user changes in background
  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        shopName: user.shopName || '',
        ownerName: user.ownerName || '',
        mobile: user.mobile || '',
        address: user.address || '',
        email: user.email || ''
      });
      setAddressDetails(user.deliveryAddress || null);
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    if (mobileError) {
      setError('Please correct the validation errors.');
      setLoading(false);
      return;
    }

    const { shopName, ownerName, mobile, address } = formData;
    if (!ownerName || !ownerName.trim()) {
      setError('User name is required.');
      setLoading(false);
      return;
    }
    const isMobileValid = validateMobile(mobile ? mobile.trim() : '');
    if (!isMobileValid) {
      setError('Enter valid mobile number');
      setLoading(false);
      return;
    }
    if (!address || !address.trim() || !addressDetails) {
      setError('A verified delivery address in Siddipet, Telangana is required.');
      setLoading(false);
      return;
    }

    try {
      // Send only the editable fields
      const updatedFields = {
        ownerName: ownerName.trim(),
        mobile: mobile.trim(),
        address: address.trim(),
        deliveryAddress: addressDetails
      };
      
      if (shopName && shopName.trim() !== '') {
        updatedFields.shopName = shopName.trim();
      } else {
        // If shopName is empty, it should be removed from database document
        updatedFields.shopName = '';
      }

      await updateProfile(updatedFields);
      setIsEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e.message || 'Failed to update profile details.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="inline-flex p-5 bg-brand-light rounded-full text-brand mb-6">
          <User className="h-12 w-12" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Your profile is locked</h2>
        <p className="text-sm text-gray-500 mt-2">Log in or sign up to view and customize your account particulars, delivery address, and invoice configurations.</p>
        <Link
          to="/auth"
          className="mt-6 inline-flex items-center justify-center bg-brand hover:bg-brand-dark text-white text-xs font-bold px-6 py-3 rounded-full shadow-md"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-black text-gray-900 tracking-tight">Account Settings</h1>

      {success && (
        <div className="p-4 bg-emerald-50 text-emerald-800 text-sm font-semibold rounded-xl border border-emerald-100 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          Shop details updated successfully!
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-sm font-semibold rounded-xl border border-red-100">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        
        {/* Profile Card Header */}
        <div className="bg-brand p-4 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-yellow-400 text-brand-dark font-black flex items-center justify-center uppercase text-lg sm:text-xl border-2 border-white shadow-sm shrink-0">
              {user.shopName ? user.shopName.charAt(0) : (user.ownerName ? user.ownerName.charAt(0) : <Store />)}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-bold leading-tight truncate">{user.shopName || user.ownerName}</h2>
              <p className="text-[11px] sm:text-xs text-brand-light font-medium mt-0.5 truncate max-w-[200px] sm:max-w-none">
                Account ID: <span className="font-mono">{user.uid}</span>
              </p>
            </div>
          </div>

          {!isEditing && (
            <button
              onClick={() => { setIsEditing(true); setError(''); setMobileError(''); }}
              className="self-start sm:self-center bg-white/20 hover:bg-white/30 text-white text-xs font-bold py-2 px-3.5 rounded-xl border border-white/10 transition flex items-center gap-1.5 whitespace-nowrap active:scale-95 cursor-pointer shrink-0"
            >
              <Edit3 className="h-4 w-4" />
              <span>Edit Details</span>
            </button>
          )}
        </div>

        {/* Profile Details Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Shop Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Shop name (Optional)</label>
              <div className="relative">
                <input
                  type="text"
                  name="shopName"
                  value={formData.shopName}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="Not set"
                  className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white disabled:opacity-75 disabled:cursor-not-allowed ${
                    isEditing ? 'border-brand/40 bg-white ring-1 ring-brand/10' : ''
                  }`}
                />
                <Store className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-gray-400" />
              </div>
            </div>

            {/* Owner Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">User full name *</label>
              <div className="relative">
                <input
                  type="text"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white disabled:opacity-75 disabled:cursor-not-allowed ${
                    isEditing ? 'border-brand/40 bg-white ring-1 ring-brand/10' : ''
                  }`}
                  required
                />
                <User className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Mobile Number *</label>
              <div className="relative">
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g,'').slice(0,10);
                    setFormData(p => ({ ...p, mobile: val }));
                    if (mobileError) {
                      validateMobile(val);
                    }
                  }}
                  onBlur={(e) => {
                    if (isEditing) {
                      validateMobile(e.target.value);
                    }
                  }}
                  disabled={!isEditing}
                  className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white disabled:opacity-75 disabled:cursor-not-allowed ${
                    isEditing
                      ? mobileError
                        ? 'border-red-500 focus:ring-red-500 bg-red-50/10'
                        : 'border-brand/40 bg-white ring-1 ring-brand/10'
                      : 'border-gray-200'
                  }`}
                  required
                />
                <Phone className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-gray-400" />
              </div>
              {isEditing && mobileError && (
                <p className="mt-1 text-xs font-semibold text-red-600">{mobileError}</p>
              )}
            </div>

            {/* Email (Read-Only) */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email Address (Read-only)</label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  disabled={true}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                />
                <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Location-aware Address section */}
          <div className="space-y-3.5 border-t border-gray-100 pt-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Delivery address *</label>
            
            {gpsLoading && (
              <div className="flex items-center justify-center p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs text-brand font-bold animate-pulse">
                <span className="animate-spin mr-2 text-base">⏳</span> Fetching & Verifying Location Details...
              </div>
            )}

            {isEditing && !addressDetails && !showManualForm && !gpsLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleAddCurrentLocation}
                  className="py-3 px-4 bg-brand hover:bg-brand-dark text-white rounded-2xl text-xs font-black shadow-sm flex items-center justify-center gap-1.5 active-bounce transition-all cursor-pointer"
                >
                  📍 Add Current Location
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setManualAddressForm({
                      houseNumber: '',
                      street: '',
                      area: '',
                      landmark: '',
                      pincode: ''
                    });
                    setShowManualForm(true);
                  }}
                  className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 active-bounce transition-all border border-gray-200 cursor-pointer"
                >
                  📍 Select Delivery Address
                </button>
              </div>
            )}

            {isEditing && showManualForm && !gpsLoading && (
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-150 space-y-3">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pb-1.5 border-b border-gray-100">Manual Address Entry</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">House / Flat No *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2-3-678"
                      value={manualAddressForm.houseNumber}
                      onChange={(e) => setManualAddressForm(p => ({ ...p, houseNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Street Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sanjeeviah Nagar"
                      value={manualAddressForm.street}
                      onChange={(e) => setManualAddressForm(p => ({ ...p, street: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Area / Locality *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bus Stand area"
                      value={manualAddressForm.area}
                      onChange={(e) => setManualAddressForm(p => ({ ...p, area: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Landmark (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Near Bus Stand"
                      value={manualAddressForm.landmark}
                      onChange={(e) => setManualAddressForm(p => ({ ...p, landmark: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Pincode *</label>
                    <input
                      type="text"
                      required
                      maxLength="6"
                      placeholder="502103"
                      value={manualAddressForm.pincode}
                      onChange={(e) => setManualAddressForm(p => ({ ...p, pincode: e.target.value.replace(/\D/g,'') }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">City</label>
                    <input
                      type="text"
                      disabled
                      value="Siddipet"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-400 bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">State</label>
                    <input
                      type="text"
                      disabled
                      value="Telangana"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-400 bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowManualForm(false)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-[11px] font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveManualAddress}
                    className="px-3.5 py-1.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-[11px] font-black shadow-sm cursor-pointer"
                  >
                    Save Address
                  </button>
                </div>
              </div>
            )}

            {addressDetails && !showManualForm && !gpsLoading && (
              <div className="p-4 bg-white rounded-2xl border-2 border-brand/20 shadow-sm space-y-3.5 hover:border-brand/40 transition-all text-left">
                <div className="flex items-start justify-between gap-2 border-b border-gray-50 pb-2">
                  <p className="text-xs font-black text-gray-800 flex items-center gap-1">
                    <span className="text-brand">📍</span> Delivery Address (Verified)
                  </p>
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded-full font-bold">
                    Siddipet Area
                  </span>
                </div>
                <div className="text-xs space-y-1 text-gray-650 font-semibold leading-relaxed">
                  <p className="font-bold text-gray-900">{formData.ownerName || "Owner Name"}</p>
                  <p>H.No {addressDetails.houseNumber}</p>
                  <p>{addressDetails.street}, {addressDetails.area}</p>
                  {addressDetails.landmark && <p className="text-gray-405">Near: {addressDetails.landmark}</p>}
                  <p>Siddipet - {!addressDetails.pincode || addressDetails.pincode === '508100' ? '502103' : addressDetails.pincode}</p>
                  <p>Telangana</p>
                </div>
                
                {isEditing && (
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setManualAddressForm({
                          houseNumber: addressDetails.houseNumber,
                          street: addressDetails.street,
                          area: addressDetails.area,
                          landmark: addressDetails.landmark,
                          pincode: addressDetails.pincode
                        });
                        setShowManualForm(true);
                      }}
                      className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-[10px] font-black rounded-xl border border-gray-200 transition cursor-pointer"
                    >
                      ✏️ Edit Address
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddressDetails(null);
                        setFormData(prev => ({ ...prev, address: '' }));
                      }}
                      className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-black rounded-xl border border-red-150 transition cursor-pointer"
                    >
                      🗑️ Remove
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLocationPicker(true)}
                      className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black rounded-xl shadow-sm transition cursor-pointer"
                    >
                      🗺️ Map Pin
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCurrentLocation}
                      className="flex-1 py-2 bg-brand-light hover:bg-brand text-brand hover:text-white text-[10px] font-black rounded-xl border border-brand/10 transition cursor-pointer"
                    >
                      📍 GPS
                    </button>
                  </div>
                )}

                <GoogleMapView
                  latitude={addressDetails.latitude}
                  longitude={addressDetails.longitude}
                  address={addressDetails.fullAddress}
                  title={user?.shopName || "Saved Shop Address"}
                  height="180px"
                  className="mt-3"
                />
              </div>
            )}

            {!isEditing && !addressDetails && (
              <div className="p-4 bg-gray-55 rounded-2xl border border-dashed border-gray-200 text-center text-xs text-gray-500 font-semibold">
                No delivery address set. Click 'Edit Details' to configure your location.
              </div>
            )}
          </div>

          {/* Action buttons when editing */}
          {isEditing && (
            <div className="flex justify-end space-x-3 pt-3 border-t border-gray-50">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    shopName: user.shopName || '',
                    ownerName: user.ownerName || '',
                    mobile: user.mobile || '',
                    address: user.address || '',
                    email: user.email || ''
                  });
                  setError('');
                  setMobileError('');
                }}
                className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !!mobileError}
                className="py-2.5 px-5 bg-accent hover:bg-accent-dark text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" /> {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>

      </div>
      <LocationPickerModal
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        initialLat={addressDetails?.latitude || 18.1018}
        initialLng={addressDetails?.longitude || 78.8523}
        initialAddress={addressDetails?.fullAddress || formData.address || ""}
        onSelectLocation={(selected) => {
          setAddressDetails(selected);
          setFormData(prev => ({
            ...prev,
            address: selected.fullAddress
          }));
          setShowManualForm(false);
        }}
      />
    </div>
  );
}
