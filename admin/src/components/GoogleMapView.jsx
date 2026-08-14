import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, ExternalLink, AlertTriangle } from 'lucide-react';

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#cbd5e1" }]
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#94a3b8" }]
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#0f172a" }]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#334155" }]
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1e293b" }]
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#cbd5e1" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#475569" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1e293b" }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0f172a" }]
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#64748b" }]
  }
];

export default function GoogleMapView({
  latitude,
  longitude,
  address,
  title = "Delivery Location",
  height = "240px",
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
          styles: DARK_MAP_STYLE,
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
              <div style="color: #0f172a; font-family: sans-serif; padding: 4px; max-width: 200px;">
                <strong style="font-size: 12px; display: block; margin-bottom: 2px;">${title}</strong>
                <span style="font-size: 11px; color: #475569;">${address || ""}</span>
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

  // Render Google Map canvas if API key exists and loaded successfully
  if (apiKey && isValidCoords && !mapError) {
    return (
      <div className={`relative rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900 shadow-md ${className}`}>
        <div ref={mapRef} style={{ width: "100%", height }} />

        {showExternalButton && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700 backdrop-blur-md flex items-center space-x-1.5 shadow-lg no-underline transition"
          >
            <Navigation className="w-3.5 h-3.5 text-indigo-400" />
            <span>Open in Google Maps</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        )}
      </div>
    );
  }

  // Fallback map view if API key is not present or offline/loading fallback
  return (
    <div
      style={{ height }}
      className={`relative rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900/90 p-4 flex flex-col justify-between shadow-md text-slate-200 ${className}`}
    >
      {/* Background Grid Pattern */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#6366f1 1px, transparent 1px)`,
          backgroundSize: "16px 16px"
        }}
      />

      <div className="relative z-10 flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100">{title}</h4>
            {isValidCoords && (
              <span className="text-[10px] font-mono text-slate-400 block">
                GPS: {latNum.toFixed(5)}, {lonNum.toFixed(5)}
              </span>
            )}
          </div>
        </div>

        {!apiKey && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
            Google Maps Ready
          </span>
        )}
      </div>

      <div className="relative z-10 my-auto py-2">
        <p className="text-xs text-slate-300 font-medium line-clamp-2 leading-relaxed">
          {address || "Coordinates set for delivery location."}
        </p>
      </div>

      {showExternalButton && (
        <div className="relative z-10 pt-2 border-t border-slate-800/80 flex justify-end">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-md flex items-center space-x-1.5 no-underline transition"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Open Google Maps</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        </div>
      )}
    </div>
  );
}
