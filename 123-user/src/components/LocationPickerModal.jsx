import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search, Navigation, X, Check, Loader2, Compass, AlertCircle, ShieldCheck } from 'lucide-react';
import { reverseGeocode, geocodeManualAddress, isSiddipetUrbanLocation, SIDDIPET_URBAN_CENTER, MAX_DELIVERY_RADIUS_KM } from '../services/db';

export default function LocationPickerModal({
  isOpen,
  onClose,
  onSelectLocation,
  initialLat = 18.1018,
  initialLng = 78.8523,
  initialAddress = ""
}) {
  const mapRef = useRef(null);
  const searchInputRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);
  const circleInstanceRef = useRef(null);
  const autocompleteRef = useRef(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const [coords, setCoords] = useState({
    lat: parseFloat(initialLat) || 18.1018,
    lng: parseFloat(initialLng) || 78.8523
  });
  const [addressDetails, setAddressDetails] = useState({
    fullAddress: initialAddress || "",
    street: "",
    area: "",
    city: "Siddipet",
    pincode: "502103"
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapError, setMapError] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Urban validation state
  const [urbanStatus, setUrbanStatus] = useState(() => isSiddipetUrbanLocation(coords.lat, coords.lng, addressDetails));

  useEffect(() => {
    if (!isOpen) return;

    const lat = parseFloat(initialLat) || 18.1018;
    const lng = parseFloat(initialLng) || 78.8523;
    setCoords({ lat, lng });

    if (initialAddress) {
      setAddressDetails(prev => ({ ...prev, fullAddress: initialAddress }));
      const val = isSiddipetUrbanLocation(lat, lng, { fullAddress: initialAddress });
      setUrbanStatus(val);
    } else {
      updateAddressFromCoords(lat, lng);
    }
  }, [isOpen, initialLat, initialLng, initialAddress]);

  const updateAddressFromCoords = async (lat, lng) => {
    setLoading(true);
    try {
      const geoData = await reverseGeocode(lat, lng);
      const addr = geoData.address || {};
      const pincode = addr.postcode || "502103";
      const street = addr.road || addr.pedestrian || "";
      const area = addr.suburb || addr.neighbourhood || addr.residential || "";
      const houseNumber = addr.house_number || "";

      const fullAddr = geoData.display_name || `${houseNumber ? 'H.No ' + houseNumber + ', ' : ''}${street ? street + ', ' : ''}${area ? area + ', ' : ''}Siddipet, Telangana - ${pincode}`;

      const newAddrDetails = {
        houseNumber,
        street,
        area,
        city: addr.city || "Siddipet",
        state: "Telangana",
        pincode,
        fullAddress: fullAddr
      };

      setAddressDetails(newAddrDetails);

      // Validate location against Siddipet Urban
      const val = isSiddipetUrbanLocation(lat, lng, newAddrDetails);
      setUrbanStatus(val);
    } catch (err) {
      console.warn("Failed to reverse geocode coords:", err);
      const val = isSiddipetUrbanLocation(lat, lng, addressDetails);
      setUrbanStatus(val);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !apiKey) return;

    let isMounted = true;

    const loadSdk = () => {
      if (window.google && window.google.maps) {
        initGoogleMap();
        return;
      }

      const scriptId = "google-maps-js-sdk";
      let script = document.getElementById(scriptId);

      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if (isMounted) initGoogleMap();
        };
        script.onerror = () => {
          if (isMounted) setMapError(true);
        };
        document.head.appendChild(script);
      } else {
        script.addEventListener("load", () => {
          if (isMounted) initGoogleMap();
        });
      }
    };

    const initGoogleMap = () => {
      if (!mapRef.current || !window.google || !window.google.maps) return;

      try {
        const center = { lat: coords.lat, lng: coords.lng };
        const map = new window.google.maps.Map(mapRef.current, {
          center,
          zoom: 14,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: false
        });

        // Add Siddipet Urban Boundary Circle
        const cityCenter = { lat: SIDDIPET_URBAN_CENTER.lat, lng: SIDDIPET_URBAN_CENTER.lng };
        const urbanCircle = new window.google.maps.Circle({
          strokeColor: "#2563eb",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: "#3b82f6",
          fillOpacity: 0.12,
          map,
          center: cityCenter,
          radius: MAX_DELIVERY_RADIUS_KM * 1000 // Convert km to meters
        });
        circleInstanceRef.current = urbanCircle;

        const marker = new window.google.maps.Marker({
          position: center,
          map,
          draggable: true,
          title: "Drag pin to delivery location",
          animation: window.google.maps.Animation.DROP
        });

        mapInstanceRef.current = map;
        markerInstanceRef.current = marker;

        marker.addListener("dragend", (e) => {
          const newLat = e.latLng.lat();
          const newLng = e.latLng.lng();
          setCoords({ lat: newLat, lng: newLng });
          updateAddressFromCoords(newLat, newLng);
        });

        map.addListener("click", (e) => {
          const newLat = e.latLng.lat();
          const newLng = e.latLng.lng();
          marker.setPosition({ lat: newLat, lng: newLng });
          setCoords({ lat: newLat, lng: newLng });
          updateAddressFromCoords(newLat, newLng);
        });

        if (searchInputRef.current && window.google.maps.places) {
          const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, {
            componentRestrictions: { country: "in" },
            fields: ["geometry", "formatted_address", "address_components", "name"]
          });
          autocomplete.bindTo("bounds", map);
          autocompleteRef.current = autocomplete;

          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (!place.geometry || !place.geometry.location) return;

            const newLat = place.geometry.location.lat();
            const newLng = place.geometry.location.lng();

            map.setCenter({ lat: newLat, lng: newLng });
            map.setZoom(15);
            marker.setPosition({ lat: newLat, lng: newLng });
            setCoords({ lat: newLat, lng: newLng });

            updateAddressFromCoords(newLat, newLng);
          });
        }

        setMapReady(true);
      } catch (err) {
        console.error("LocationPickerModal map init error:", err);
        setMapError(true);
      }
    };

    loadSdk();

    return () => {
      isMounted = false;
    };
  }, [isOpen, apiKey]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        setCoords({ lat: newLat, lng: newLng });

        if (mapInstanceRef.current && markerInstanceRef.current) {
          const center = { lat: newLat, lng: newLng };
          mapInstanceRef.current.setCenter(center);
          mapInstanceRef.current.setZoom(16);
          markerInstanceRef.current.setPosition(center);
        }

        updateAddressFromCoords(newLat, newLng);
      },
      (err) => {
        console.error("GPS location error:", err);
        setLoading(false);
        alert("Failed to access GPS location. Please drag map pin manually.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleFallbackSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const result = await geocodeManualAddress("", searchQuery, "502103");
      if (result && result.lat && result.lon) {
        const newLat = parseFloat(result.lat);
        const newLng = parseFloat(result.lon);
        setCoords({ lat: newLat, lng: newLng });
        updateAddressFromCoords(newLat, newLng);
      }
    } catch (err) {
      console.warn("Fallback search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!urbanStatus.isUrban) {
      alert("Not available in your location. We currently deliver only within Siddipet Urban area.");
      return;
    }

    onSelectLocation({
      latitude: coords.lat.toString(),
      longitude: coords.lng.toString(),
      fullAddress: addressDetails.fullAddress,
      houseNumber: addressDetails.houseNumber || "",
      street: addressDetails.street || "",
      area: addressDetails.area || "",
      city: addressDetails.city || "Siddipet",
      pincode: addressDetails.pincode || "502103",
      isVerified: true
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50/50">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Select Delivery Location</h3>
              <p className="text-xs text-gray-500">Service available only within Siddipet Urban zone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search area, landmark or street in Siddipet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (!apiKey || !window.google)) {
                  handleFallbackSearch(e);
                }
              }}
              className="w-full pl-9 pr-4 py-2.5 bg-white rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
          <button
            onClick={handleGetCurrentLocation}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-2xl bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 font-semibold text-xs flex items-center space-x-1.5 shadow-sm transition disabled:opacity-50"
            title="Use current GPS location"
          >
            <Compass className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">GPS</span>
          </button>
        </div>

        {/* Map Canvas */}
        <div className="relative flex-1 min-h-[260px] bg-gray-100">
          {apiKey && !mapError ? (
            <div ref={mapRef} className="w-full h-full min-h-[260px]" />
          ) : (
            <div className="w-full h-full min-h-[260px] bg-gradient-to-br from-slate-50 to-blue-50 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(#3b82f6 1.5px, transparent 1.5px)`,
                  backgroundSize: "18px 18px"
                }}
              />
              <div className="p-4 rounded-full bg-blue-100 text-blue-600 mb-3 shadow-inner">
                <MapPin className="w-8 h-8 animate-bounce" />
              </div>
              <h4 className="text-sm font-bold text-gray-800 mb-1">Siddipet Urban Delivery Map</h4>
              <p className="text-xs text-gray-500 max-w-xs mb-4">
                Selected GPS Pin: <span className="font-mono text-blue-600 font-bold">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
              </p>
              <button
                onClick={handleGetCurrentLocation}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md flex items-center space-x-2 transition"
              >
                <Navigation className="w-4 h-4" />
                <span>Locate Me via Device GPS</span>
              </button>
            </div>
          )}

          {loading && (
            <div className="absolute top-3 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-white/90 backdrop-blur-md border border-gray-200 rounded-full shadow-lg flex items-center space-x-2 text-xs font-bold text-gray-700">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              <span>Verifying location details...</span>
            </div>
          )}
        </div>

        {/* Selected Address & Urban Location Validation Banner */}
        <div className="p-5 bg-white border-t border-gray-100 flex flex-col space-y-3.5">
          
          {/* Out of service area alert banner */}
          {!urbanStatus.isUrban ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex items-start space-x-3 text-red-900 shadow-sm animate-pulse">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h5 className="text-xs font-black text-red-900 tracking-tight">Not Available in Your Location</h5>
                <p className="text-[11px] text-red-700 font-semibold leading-relaxed mt-0.5">
                  Sorry! FLASH-G Cutmit currently delivers only within a <strong>5km radius</strong> of Siddipet Urban. Please select a location inside Siddipet Urban.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3 flex items-center space-x-2.5 text-emerald-900 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="text-xs font-bold text-emerald-800">
                Verified: Location is within 5km Siddipet Urban Delivery Zone
              </span>
            </div>
          )}

          <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200/80 flex items-start space-x-3">
            <MapPin className={`w-4 h-4 flex-shrink-0 mt-0.5 ${urbanStatus.isUrban ? 'text-blue-600' : 'text-red-500'}`} />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Selected Address</span>
              <p className="text-xs font-semibold text-gray-800 truncate mt-0.5">
                {addressDetails.fullAddress || "No address selected."}
              </p>
              <span className="text-[10px] font-mono text-gray-500 block mt-0.5">
                GPS: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} {urbanStatus.distanceKm ? `(${urbanStatus.distanceKm} km from Siddipet center)` : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-1">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!urbanStatus.isUrban || loading}
              className={`px-6 py-2.5 rounded-2xl font-bold text-xs shadow-md flex items-center space-x-2 transition ${
                urbanStatus.isUrban && !loading
                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                  : 'bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed shadow-none'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Confirm Location</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
