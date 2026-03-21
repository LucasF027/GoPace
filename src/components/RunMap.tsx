import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface RunMapProps {
  route: { lat: number; lng: number }[];
  className?: string;
  interactive?: boolean;
}

export default function RunMap({ route, className, interactive = false }: RunMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || route.length === 0) return;

    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current, {
        zoomControl: interactive,
        dragging: interactive,
        touchZoom: interactive,
        doubleClickZoom: interactive,
        scrollWheelZoom: interactive,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(leafletMap.current);
    }

    const map = leafletMap.current;
    const latLngs = route.map(p => [p.lat, p.lng] as L.LatLngExpression);
    
    // Clear existing layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Polyline || layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Draw path
    const polyline = L.polyline(latLngs, {
      color: '#39FF14',
      weight: 4,
      opacity: 0.8,
      lineJoin: 'round'
    }).addTo(map);

    // Add start and end markers
    if (route.length > 0) {
      const start = route[0];
      const end = route[route.length - 1];

      L.circleMarker([start.lat, start.lng], {
        radius: 4,
        fillColor: '#FFFFFF',
        color: '#000000',
        weight: 1,
        fillOpacity: 1
      }).addTo(map);

      L.circleMarker([end.lat, end.lng], {
        radius: 6,
        fillColor: '#39FF14',
        color: '#000000',
        weight: 2,
        fillOpacity: 1
      }).addTo(map);
    }

    // Fit bounds
    if (latLngs.length > 0) {
      map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
    }

    return () => {
      // Cleanup is handled by the ref check above, but we could dispose if needed
    };
  }, [route, interactive]);

  return (
    <div 
      ref={mapRef} 
      className={className} 
      style={{ background: '#121212' }}
    />
  );
}
