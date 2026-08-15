import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, ExternalLink, Layers, Car, Store } from 'lucide-react';

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
  originLat = null,
  originLng = null,
  originTitle = "Store Location (Siddipet)",
  height = "260px",
  zoom = 15,
  showExternalButton = true,
  className = ""
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const trafficLayerRef = useRef(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapType, setMapType] = useState('roadmap');
  const [showTraffic, setShowTraffic] = useState(false);
  const [routeDetails, setRouteDetails] = useState(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const latNum = parseFloat(latitude);
  const lonNum = parseFloat(longitude);
  const origLatNum = parseFloat(originLat);
  const origLonNum = parseFloat(originLng);

  const isValidCoords = !isNaN(latNum) && !isNaN(lonNum) && latNum !== 0 && lonNum !== 0;
  const hasRoute = isValidCoords && !isNaN(origLatNum) && !isNaN(origLonNum) && origLatNum !== 0 && origLonNum !== 0;

  const mapsUrl = hasRoute
    ? `https://www.google.com/maps/dir/?api=1&origin=${origLatNum},${origLonNum}&destination=${latNum},${lonNum}&travelmode=driving`
    : isValidCoords
      ? `https://www.google.com/maps/search/?api=1&query=${latNum},${lonNum}`
      : address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
        : `https://www.google.com/maps`;

  useEffect(() => {
    if (!apiKey || !isValidCoords) return;

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
          styles: mapType === 'satellite' ? [] : DARK_MAP_STYLE,
          mapTypeId: mapType,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true
        });

        mapInstanceRef.current = map;

        // Traffic Layer
        const trafficLayer = new window.google.maps.TrafficLayer();
        trafficLayerRef.current = trafficLayer;
        if (showTraffic) {
          trafficLayer.setMap(map);
        }

        // Directions Rendering
        if (hasRoute) {
          const directionsService = new window.google.maps.DirectionsService();
          const directionsRenderer = new window.google.maps.DirectionsRenderer({
            map,
            suppressMarkers: false,
            polylineOptions: {
              strokeColor: "#6366f1",
              strokeWeight: 6,
              strokeOpacity: 0.9
            }
          });

          directionsService.route(
            {
              origin: { lat: origLatNum, lng: origLonNum },
              destination: center,
              travelMode: window.google.maps.TravelMode.DRIVING
            },
            (result, status) => {
              if (status === window.google.maps.DirectionsStatus.OK && isMounted) {
                directionsRenderer.setDirections(result);
                const route = result.routes[0];
                if (route && route.legs && route.legs[0]) {
                  setRouteDetails({
                    distance: route.legs[0].distance.text,
                    duration: route.legs[0].duration.text
                  });
                }
              } else {
                renderSingleMarker(map, center);
              }
            }
          );
        } else {
          renderSingleMarker(map, center);
        }

        setMapLoaded(true);
      } catch (err) {
        console.error("Google Maps initialization error:", err);
        setMapError(true);
      }
    };

    const renderSingleMarker = (map, center) => {
      const marker = new window.google.maps.Marker({
        position: center,
        map,
        title: title || address || "Location",
        animation: window.google.maps.Animation.DROP
      });

      if (address || title) {
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="color: #0f172a; font-family: sans-serif; padding: 6px; max-width: 220px;">
              <strong style="font-size: 13px; display: block; margin-bottom: 3px; color: #4338ca;">${title}</strong>
              <span style="font-size: 11px; color: #475569; line-height: 1.4;">${address || ""}</span>
            </div>
          `
        });
        marker.addListener("click", () => {
          infoWindow.open(map, marker);
        });
      }
    };

    loadGoogleMapsScript();

    return () => {
      isMounted = false;
    };
  }, [apiKey, latNum, lonNum, origLatNum, origLonNum, isValidCoords, hasRoute, zoom, title, address, mapType, showTraffic]);

  const toggleMapType = () => {
    const nextType = mapType === 'roadmap' ? 'satellite' : 'roadmap';
    setMapType(nextType);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setMapTypeId(nextType);
    }
  };

  const toggleTraffic = () => {
    const nextState = !showTraffic;
    setShowTraffic(nextState);
    if (trafficLayerRef.current && mapInstanceRef.current) {
      trafficLayerRef.current.setMap(nextState ? mapInstanceRef.current : null);
    }
  };

  if (apiKey && isValidCoords && !mapError) {
    return (
      <div className={`relative rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900 shadow-md ${className}`}>
        <div ref={mapRef} style={{ width: "100%", height }} />

        {/* Floating Controls Overlay */}
        <div className="absolute top-3 left-3 z-10 flex items-center space-x-2">
          <button
            onClick={toggleMapType}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700 shadow-lg backdrop-blur-md flex items-center space-x-1.5 transition"
            title="Toggle Satellite View"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="capitalize">{mapType}</span>
          </button>
          <button
            onClick={toggleTraffic}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border shadow-lg backdrop-blur-md flex items-center space-x-1.5 transition ${
              showTraffic
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
            }`}
            title="Toggle Real-Time Traffic"
          >
            <Car className="w-3.5 h-3.5" />
            <span>Traffic</span>
          </button>
        </div>

        {/* Route Details Badge */}
        {routeDetails && (
          <div className="absolute top-3 right-3 z-10 px-3 py-1.5 rounded-xl bg-indigo-950/90 text-indigo-200 border border-indigo-700/60 shadow-lg backdrop-blur-md flex items-center space-x-2 text-xs font-bold">
            <Navigation className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>{routeDetails.distance} ({routeDetails.duration})</span>
          </div>
        )}

        {showExternalButton && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-3 right-3 z-10 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700 backdrop-blur-md flex items-center space-x-1.5 shadow-lg no-underline transition"
          >
            <Navigation className="w-3.5 h-3.5 text-indigo-400" />
            <span>{hasRoute ? "View Driving Directions" : "Open in Google Maps"}</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div
      style={{ height }}
      className={`relative rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900/90 p-4 flex flex-col justify-between shadow-md text-slate-200 ${className}`}
    >
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
            {hasRoute ? <Store className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
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
            <span>{hasRoute ? "Open Directions Overview" : "Open Google Maps"}</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        </div>
      )}
    </div>
  );
}
