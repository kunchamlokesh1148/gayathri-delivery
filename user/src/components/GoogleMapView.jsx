import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, ExternalLink } from 'lucide-react';

const MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  {
    featureType: "administrative.land_parcel",
    elementType: "labels.text.fill",
    stylers: [{ color: "#bdbdbd" }]
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#eeeeee" }]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }]
  },
  {
    featureType: "road.arterial",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#dadada" }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#c9c9c9" }]
  }
];

export default function GoogleMapView({
  latitude,
  longitude,
  address,
  title = "Delivery Location",
  height = "220px",
  zoom = 15,
  showExternalButton = true,
  className = ""
}) {
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const latNum = parseFloat(latitude);
  const lonNum = parseFloat(longitude);
  const isValidCoords = !isNaN(latNum) && !isNaN(lonNum) && latNum !== 0 && lonNum !== 0;

  const mapsUrl = isValidCoords
    ? `https://www.google.com/maps/search/?api=1&query=${latNum},${lonNum}`
    : address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
      : `https://www.google.com/maps`;

  useEffect(() => {
    if (!apiKey || !isValidCoords) {
      return;
    }

    let isMounted = true;

    const loadGoogleMapsScript = () => {
      if (window.google && window.google.maps) {
        initMap();
        return;
      }

      const scriptId = "google-maps-js-sdk";
      let existingScript = document.getElementById(scriptId);

      if (!existingScript) {
        existingScript = document.createElement("script");
        existingScript.id = scriptId;
        existingScript.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        existingScript.async = true;
        existingScript.defer = true;

        existingScript.onload = () => {
          if (isMounted) initMap();
        };

        existingScript.onerror = () => {
          if (isMounted) setMapError(true);
        };

        document.head.appendChild(existingScript);
      } else {
        existingScript.addEventListener("load", () => {
          if (isMounted) initMap();
        });
      }
    };

    const initMap = () => {
      if (!mapRef.current || !window.google || !window.google.maps) return;

      try {
        const center = { lat: latNum, lng: lonNum };
        const map = new window.google.maps.Map(mapRef.current, {
          center,
          zoom,
          styles: MAP_STYLE,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true
        });

        const marker = new window.google.maps.Marker({
          position: center,
          map,
          title: title || address || "Location",
          animation: window.google.maps.Animation.DROP
        });

        if (address || title) {
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="color: #1f2937; font-family: sans-serif; padding: 4px; max-width: 200px;">
                <strong style="font-size: 12px; display: block; margin-bottom: 2px;">${title}</strong>
                <span style="font-size: 11px; color: #4b5563;">${address || ""}</span>
              </div>
            `
          });
          marker.addListener("click", () => {
            infoWindow.open(map, marker);
          });
        }

        setMapLoaded(true);
      } catch (err) {
        console.error("Google Maps initialization error:", err);
        setMapError(true);
      }
    };

    loadGoogleMapsScript();

    return () => {
      isMounted = false;
    };
  }, [apiKey, latNum, lonNum, isValidCoords, zoom, title, address]);

  if (apiKey && isValidCoords && !mapError) {
    return (
      <div className={`relative rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-md ${className}`}>
        <div ref={mapRef} style={{ width: "100%", height }} />

        {showExternalButton && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-xs font-bold text-gray-800 border border-gray-200 backdrop-blur-md flex items-center space-x-1.5 shadow-md no-underline transition"
          >
            <Navigation className="w-3.5 h-3.5 text-blue-600" />
            <span>Open in Google Maps</span>
            <ExternalLink className="w-3 h-3 text-gray-400" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div
      style={{ height }}
      className={`relative rounded-2xl overflow-hidden border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-4 flex flex-col justify-between shadow-sm text-gray-700 ${className}`}
    >
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#3b82f6 1px, transparent 1px)`,
          backgroundSize: "16px 16px"
        }}
      />

      <div className="relative z-10 flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-800">{title}</h4>
            {isValidCoords && (
              <span className="text-[10px] font-mono text-gray-500 block">
                GPS: {latNum.toFixed(5)}, {lonNum.toFixed(5)}
              </span>
            )}
          </div>
        </div>

        {!apiKey && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 font-mono">
            Google Maps Ready
          </span>
        )}
      </div>

      <div className="relative z-10 my-auto py-2">
        <p className="text-xs text-gray-600 font-medium line-clamp-2 leading-relaxed">
          {address || "Saved delivery location pin."}
        </p>
      </div>

      {showExternalButton && (
        <div className="relative z-10 pt-2 border-t border-gray-200/60 flex justify-end">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm flex items-center space-x-1.5 no-underline transition"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Open Google Maps</span>
            <ExternalLink className="w-3 h-3 opacity-80" />
          </a>
        </div>
      )}
    </div>
  );
}
