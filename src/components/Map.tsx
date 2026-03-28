import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Place, UserLocation } from '../types';

interface MapProps {
  userLocation: UserLocation;
  places: Place[];
  onPlaceSelect: (place: Place) => void;
}

const Map: React.FC<MapProps> = ({ userLocation, places, onPlaceSelect }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    const fetchToken = async () => {
      const response = await fetch('/api/mapbox-token');
      const { token } = await response.json();
      mapboxgl.accessToken = token;

      if (mapContainer.current && !map.current) {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [userLocation.lng, userLocation.lat],
          zoom: 13,
        });

        map.current.addControl(new mapboxgl.NavigationControl());
      }
    };

    fetchToken();
  }, []);

  useEffect(() => {
    if (map.current) {
      map.current.setCenter([userLocation.lng, userLocation.lat]);
    }
  }, [userLocation]);

  useEffect(() => {
    if (map.current) {
      // Clear existing markers
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];

      // Add user marker
      const userMarker = new mapboxgl.Marker({ color: '#3B82F6' })
        .setLngLat([userLocation.lng, userLocation.lat])
        .setPopup(new mapboxgl.Popup().setHTML('<h3>Você está aqui</h3>'))
        .addTo(map.current);
      markers.current.push(userMarker);

      // Add place markers
      places.forEach((place) => {
        const marker = new mapboxgl.Marker({ color: '#EF4444' })
          .setLngLat([place.geometry.location.lng, place.geometry.location.lat])
          .setPopup(new mapboxgl.Popup().setHTML(`<h3>${place.name}</h3>`))
          .addTo(map.current!);
        
        marker.getElement().addEventListener('click', () => onPlaceSelect(place));
        markers.current.push(marker);
      });
    }
  }, [places, userLocation]);

  return <div ref={mapContainer} className="w-full h-64 md:h-96 rounded-xl overflow-hidden shadow-lg" />;
};

export default Map;
