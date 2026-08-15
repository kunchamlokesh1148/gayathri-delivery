import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Store, Lock, Eye, EyeOff, User, Phone, Mail } from 'lucide-react';
import { reverseGeocode, geocodeManualAddress, isSiddipetUrbanLocation } from '../services/db';
import LocationPickerModal from '../components/LocationPickerModal';

/**
 * Maps any Firebase auth error code/message to a professional user-friendly string.
 * This acts as a final safety net in the UI layer — the primary mapping is in auth.js.
 * Raw Firebase errors are never shown to users; they are only logged to the console.
 */
const mapAuthErrorMessage = (raw = '') => {
  const t = raw.toLowerCase();
  if (t.includes('invalid-credential') || t.includes('wrong-password') || t.includes('invalid-email') || t.includes('auth/invalid')) {
    return 'Invalid credentials. Please check your email and password and try again.';
  }
  if (t.includes('user-not-found')) {
    return 'No account found with the provided credentials.';
  }
  if (t.includes('email-already-in-use')) {
    return 'An account with this email already exists.';
  }
  if (t.includes('weak-password')) {
    return 'Password must be at least 6 characters long.';
  }
  if (t.includes('network-request-failed') || t.includes('network error')) {
    return 'Network error. Please check your internet connection and try again.';
  }
  if (t.includes('too-many-requests') || t.includes('too-many-login-attempts')) {
    return 'Too many failed login attempts. Please try again later.';
  }
  // If the message is already friendly (doesn't look like a Firebase code), return it as-is
  if (raw && !t.includes('firebase') && !t.includes('auth/') && raw.length < 200) {
    return raw;
  }
  return 'Something went wrong. Please try again.';
};

export default function Auth() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect target
  const from = location.state?.from?.pathname || '/';

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // Manage login page background class
  useEffect(() => {
    document.body.classList.add('login-bg');
    return () => {
      document.body.classList.remove('login-bg');
    };
  }, []);

  // Mode state: 'login' | 'register'
  const [mode, setMode] = useState('login');
  
  // Form input fields
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Validation errors
  const [mobileError, setMobileError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register states
  const [registerForm, setRegisterForm] = useState({
    shopName: '',
    ownerName: '',
    mobile: '',
    email: '',
    address: '',
    password: ''
  });

  const [gpsLoading, setGpsLoading] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [addressDetails, setAddressDetails] = useState(null);
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
          setRegisterForm(prev => ({
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
      setRegisterForm(prev => ({
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

  const validateMobile = (value) => {
    let err = '';
    if (!value) {
      err = 'Mobile Number is required.';
    } else if (value.length !== 10) {
      err = 'Enter valid mobile number';
    }
    setMobileError(err);
    return err;
  };

  const validateEmail = (value) => {
    let err = '';
    if (!value || !value.trim()) {
      err = 'Email Address is required.';
    } else if (!value.trim().toLowerCase().endsWith('@gmail.com')) {
      err = 'invalid email';
    }
    setEmailError(err);
    return err;
  };

  const validatePassword = (value) => {
    let err = '';
    if (!value) {
      err = 'Password is required.';
    } else if (value.length < 8) {
      err = 'Password must be at least 8 characters.';
    } else if (!/[a-zA-Z]/.test(value)) {
      err = 'Password must contain at least one letter.';
    } else if (!/\d/.test(value)) {
      err = 'Password must contain at least one number.';
    } else if (!/[-_!@#$*]/.test(value)) {
      err = 'Password must contain at least one special character from: -, _, !, @, #, $, *';
    } else if (/[^a-zA-Z\d\-_!@#$*]/.test(value)) {
      err = 'Password can only consist of letters, numbers, and unique characters: -, _, !, @, #, $, *';
    }
    setPasswordError(err);
    return err;
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!loginEmail || !loginPassword) {
      setError('Please fill in all fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginEmail.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await login(loginEmail.trim(), loginPassword);
      setSuccess('Signed in successfully! Redirecting...');
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1000);
    } catch (err) {
      // All Firebase errors are already mapped in auth.js service, but
      // we add a final safety net here in case any raw message leaks through.
      console.error('[Auth] Login error:', err);
      setError(mapAuthErrorMessage(err.message || err.code || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const { ownerName, mobile, email, password } = registerForm;

    if (mobileError || emailError || passwordError) {
      setError('Please correct the validation errors.');
      return;
    }

    // Strict validation
    if (!ownerName || !ownerName.trim()) {
      setError('User Name is required.');
      return;
    }
    
    const mobileErr = validateMobile(mobile);
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);

    if (mobileErr) {
      setError(mobileErr);
      return;
    }
    if (emailErr) {
      setError(emailErr);
      return;
    }
    if (passwordErr) {
      setError(passwordErr);
      return;
    }

    if (!addressDetails) {
      setError('Please select or add a verified delivery address within Siddipet, Telangana.');
      return;
    }

    setLoading(true);
    try {
      await register({
        ...registerForm,
        deliveryAddress: addressDetails
      });
      setSuccess('Account registered successfully! Redirecting...');
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1000);
    } catch (err) {
      console.error('[Auth] Registration error:', err);
      setError(mapAuthErrorMessage(err.message || err.code || ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] w-full flex items-center justify-center relative overflow-hidden px-4 py-8 lg:py-16">
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-[-20]"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      >
        <source src="https://res.cloudinary.com/dns2zotrw/video/upload/Create_a_second_cinematic__ja10uc.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Subtle Dark Overlay */}
      <div className="fixed inset-0 bg-black/45 z-[-10]" />
      
      {/* 2-Column Foreground Grid Layer */}
      <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center relative z-20">
        
        {/* Left Column: Welcome Branding */}
        <div className="flex flex-col justify-center text-center lg:text-left space-y-6 select-none relative z-20 order-1 lg:max-w-xl">
          <h1 
            className="text-4xl sm:text-5xl lg:text-6xl text-[#854d0e] lowercase tracking-wide font-black opacity-0 animate-welcome-text"
            style={{ 
              fontFamily: "'Lobster', cursive",
              textShadow: '0 2px 10px rgba(255, 255, 255, 0.95), 0 1px 4px rgba(255, 255, 255, 0.9)'
            }}
          >
            Welcome to
          </h1>
          <div className="space-y-3">
            <div 
              className="text-6xl sm:text-8xl lg:text-9xl text-[#ea580c] leading-none opacity-0 animate-gayatri-text"
              style={{ 
                fontFamily: "'Lobster', cursive",
                animationDelay: '0.2s',
                textShadow: '0 4px 15px rgba(255, 255, 255, 0.95), 0 2px 6px rgba(255, 255, 255, 0.9)'
              }}
            >
              FLASH-G
            </div>
            <div 
              className="text-6xl sm:text-8xl lg:text-9xl text-[#581c87] leading-none opacity-0 animate-cutmit-text"
              style={{ 
                fontFamily: "'Lobster', cursive",
                animationDelay: '0.4s',
                textShadow: '0 4px 15px rgba(255, 255, 255, 0.95), 0 2px 6px rgba(255, 255, 255, 0.9)'
              }}
            >
              Cutmit
            </div>
          </div>
        </div>

        {/* Right Column: Card Box */}
        <div className="w-full max-w-sm mx-auto lg:mr-0 lg:ml-auto order-2 relative z-20 opacity-0 animate-card-entry" style={{ animationDelay: '0.6s' }}>
        <div className="bg-white rounded-[32px] shadow-2xl border border-brand-light/35 overflow-hidden flex flex-col transition-all duration-300 animate-float-card">
          
          {/* Header Branding */}
          <div className="bg-brand p-4 text-white text-center">
            <div className="inline-flex p-2 bg-brand-dark rounded-full mb-2 border-2 border-yellow-400 shadow-md">
              <Store className="h-6 w-6 text-yellow-400" />
            </div>
            <h2 className="text-lg font-bold tracking-tight animate-fade-in-up">FLASH-G Partner Portal</h2>
            <p className="text-xs text-brand-light mt-0.5 font-medium animate-fade-in-up">Browse, order, and track for your store</p>
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess(''); setMobileError(''); setEmailError(''); setPasswordError(''); }}
              className={`flex-1 py-3.5 text-sm font-black border-b-2 transition-all cursor-pointer ${mode === 'login' ? 'border-brand text-brand' : 'border-transparent text-gray-400 hover:text-gray-650'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); setSuccess(''); setMobileError(''); setEmailError(''); setPasswordError(''); }}
              className={`flex-1 py-3.5 text-sm font-black border-b-2 transition-all cursor-pointer ${mode === 'register' ? 'border-brand text-brand' : 'border-transparent text-gray-400 hover:text-gray-650'}`}
            >
              Register
            </button>
          </div>

          <div className="p-5 sm:p-6">
            {error && (
              <div className="mb-4 p-3.5 bg-red-50 text-red-700 text-xs font-semibold rounded-2xl border border-red-100 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0 animate-ping" />
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-2xl border border-emerald-100 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0 animate-ping" />
                {success}
              </div>
            )}

            {/* MODE: SIGN IN */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 pl-1">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-150 rounded-2xl text-sm font-bold text-gray-800 uppercase focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition-all placeholder:normal-case placeholder:text-gray-300"
                      required
                    />
                    <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 pl-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-11 pr-10 py-3 bg-gray-50 border border-gray-150 rounded-2xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition-all placeholder:text-gray-300"
                      required
                    />
                    <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-gray-400" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-brand hover:bg-brand-dark text-white rounded-2xl text-sm font-black shadow-md hover:shadow-lg transition-all disabled:opacity-50 active-bounce cursor-pointer btn-premium-hover"
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>
            )}

            {/* MODE: REGISTER SHOP */}
            {mode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 pl-1">Shop Name (Optional)</label>
                    <div className="relative">
                      <input
                        type="text"
                        name="shopName"
                        placeholder="Shop Name"
                        value={registerForm.shopName}
                        onChange={handleRegisterChange}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-150 rounded-2xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition-all placeholder:text-gray-300"
                      />
                      <Store className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 pl-1">User Name *</label>
                    <div className="relative">
                      <input
                        type="text"
                        name="ownerName"
                        placeholder="User Name"
                        value={registerForm.ownerName}
                        onChange={handleRegisterChange}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-150 rounded-2xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition-all placeholder:text-gray-300"
                        required
                      />
                      <User className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-gray-400" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 pl-1">Mobile Number *</label>
                    <div className="relative">
                      <input
                        type="tel"
                        name="mobile"
                        placeholder="Mobile Number"
                        value={registerForm.mobile}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g,'').slice(0,10);
                          setRegisterForm(p => ({ ...p, mobile: val }));
                          if (mobileError) {
                            validateMobile(val);
                          }
                        }}
                        onBlur={(e) => validateMobile(e.target.value)}
                        className={`w-full pl-16 pr-4 py-3 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition-all placeholder:text-gray-300 ${
                          mobileError ? 'border-red-500 focus:ring-red-500 bg-red-50/10' : 'border-gray-150'
                        }`}
                        required
                      />
                      <div className="absolute left-3 top-3.5 flex items-center gap-1 text-gray-400 border-r border-gray-200 pr-2">
                        <Phone className="h-4.5 w-4.5" />
                        <span className="text-sm font-bold text-gray-500">+91</span>
                      </div>
                    </div>
                    {mobileError && (
                      <p className="mt-1 text-xs font-semibold text-red-600 pl-1">{mobileError}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 pl-1">Email Address *</label>
                    <div className="relative">
                      <input
                        type="email"
                        name="email"
                        placeholder="Email Address"
                        value={registerForm.email}
                        onChange={(e) => {
                          handleRegisterChange(e);
                          if (emailError) {
                            validateEmail(e.target.value);
                          }
                        }}
                        onBlur={(e) => validateEmail(e.target.value)}
                        className={`w-full pl-11 pr-4 py-3 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-800 uppercase focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition-all placeholder:normal-case placeholder:text-gray-300 ${
                          emailError ? 'border-red-500 focus:ring-red-500 bg-red-50/10' : 'border-gray-150'
                        }`}
                        required
                      />
                      <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-gray-400" />
                    </div>
                    {emailError && (
                      <p className="mt-1 text-xs font-semibold text-red-600 pl-1">{emailError}</p>
                    )}
                  </div>
                </div>

                {/* Geolocation Address Selector Section */}
                <div className="space-y-3.5 border-t border-gray-100 pt-4">
                  <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-wider pl-1">Delivery Address *</label>
                  
                  {gpsLoading && (
                    <div className="flex items-center justify-center p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs text-brand font-bold animate-pulse">
                      <span className="animate-spin mr-2 text-base">⏳</span> Fetching & Verifying Location Details...
                    </div>
                  )}

                  {!addressDetails && !showManualForm && !gpsLoading && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setShowLocationPicker(true)}
                        className="py-3 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 active-bounce transition-all cursor-pointer"
                      >
                        🗺️ Google Map Pin
                      </button>
                      <button
                        type="button"
                        onClick={handleAddCurrentLocation}
                        className="py-3 px-3 bg-brand hover:bg-brand-dark text-white rounded-2xl text-xs font-black shadow-sm flex items-center justify-center gap-1.5 active-bounce transition-all cursor-pointer"
                      >
                        📍 GPS Location
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
                        className="py-3 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 active-bounce transition-all border border-gray-200 cursor-pointer"
                      >
                        ✏️ Manual Address
                      </button>
                    </div>
                  )}

                  {showManualForm && !gpsLoading && (
                    <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-150 space-y-3">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pb-1.5 border-b border-gray-100">Manual Address Entry</p>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">House / Flat No *</label>
                          <input
                            type="text"
                            required
                            placeholder="House/Flat No"
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
                            placeholder="Street Name"
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
                            placeholder="Area/Locality"
                            value={manualAddressForm.area}
                            onChange={(e) => setManualAddressForm(p => ({ ...p, area: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Landmark (Optional)</label>
                          <input
                            type="text"
                            placeholder="Landmark (Optional)"
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
                            placeholder="Pincode"
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
                        <p className="font-bold text-gray-900">{registerForm.ownerName || "Owner Name"}</p>
                        <p>H.No {addressDetails.houseNumber}</p>
                        <p>{addressDetails.street}, {addressDetails.area}</p>
                        {addressDetails.landmark && <p className="text-gray-400">Near: {addressDetails.landmark}</p>}
                        <p>Siddipet - {!addressDetails.pincode || addressDetails.pincode === '508100' ? '502103' : addressDetails.pincode}</p>
                        <p>Telangana</p>
                      </div>
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
                            setRegisterForm(prev => ({ ...prev, address: '' }));
                          }}
                          className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-black rounded-xl border border-red-150 transition cursor-pointer"
                        >
                          🗑️ Remove
                        </button>
                        <button
                          type="button"
                          onClick={handleAddCurrentLocation}
                          className="flex-1 py-2 bg-brand-light hover:bg-brand text-brand hover:text-white text-[10px] font-black rounded-xl border border-brand/10 transition cursor-pointer"
                        >
                          📍 Change Location
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 pl-1">Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Choose password (min 8 chars)"
                      value={registerForm.password}
                      onChange={(e) => {
                        handleRegisterChange(e);
                        if (passwordError) {
                          validatePassword(e.target.value);
                        }
                      }}
                      onBlur={(e) => validatePassword(e.target.value)}
                      className={`w-full pl-11 pr-10 py-3 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition-all placeholder:text-gray-300 ${
                        passwordError ? 'border-red-500 focus:ring-red-500 bg-red-50/10' : 'border-gray-150'
                      }`}
                      required
                    />
                    <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-gray-400" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                  {passwordError && (
                    <p className="mt-1 text-xs font-semibold text-red-600 pl-1">{passwordError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !!mobileError || !!emailError || !!passwordError}
                  className="w-full py-3 bg-brand hover:bg-brand-dark text-white rounded-2xl text-sm font-black shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active-bounce cursor-pointer btn-premium-hover"
                >
                  {loading ? 'Creating Account...' : 'Register Account'}
                </button>
              </form>
            )}

          </div>

        </div>
      </div>
    </div>
      <LocationPickerModal
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        initialLat={addressDetails?.latitude || 18.1018}
        initialLng={addressDetails?.longitude || 78.8523}
        initialAddress={addressDetails?.fullAddress || registerForm.address || ""}
        onSelectLocation={(selected) => {
          setAddressDetails(selected);
          setRegisterForm(prev => ({
            ...prev,
            address: selected.fullAddress
          }));
          setShowManualForm(false);
        }}
      />
    </div>
  );
}
