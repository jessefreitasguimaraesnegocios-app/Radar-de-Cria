import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Place, UserLocation } from '../types';
import {
  mapMarkerHex,
  USER_LOCATION_MARKER_HEX,
  type PlaceMarkColor,
} from '../lib/placeMarks';

interface MapProps {
  userLocation: UserLocation;
  places: Place[];
  /** Mesmas chaves que a tabela (computeRowMarkKeys). */
  rowMarkKeys: string[];
  marks: Record<string, PlaceMarkColor>;
  onPlaceSelect: (place: Place) => void;
}

const Map: React.FC<MapProps> = ({
  userLocation,
  places,
  rowMarkKeys,
  marks,
  onPlaceSelect,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  onPlaceSelectRef.current = onPlaceSelect;

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
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];

      const userMarker = new mapboxgl.Marker({ color: USER_LOCATION_MARKER_HEX })
        .setLngLat([userLocation.lng, userLocation.lat])
        .setPopup(new mapboxgl.Popup().setHTML('<h3>Sua localização</h3>'))
        .addTo(map.current);
      markers.current.push(userMarker);

      places.forEach((place, index) => {
        const markKey = rowMarkKeys[index] ?? `row:${index}`;
        const mark = marks[markKey];
        const color = mapMarkerHex(mark);

        const marker = new mapboxgl.Marker({ color })
          .setLngLat([place.geometry.location.lng, place.geometry.location.lat])
          .setPopup(
            new mapboxgl.Popup().setHTML(
              `<h3 style="margin:0 0 4px">${place.name}</h3>${
                mark
                  ? `<p style="margin:0;font-size:12px;color:#666">Marcado: ${
                      mark === 'red' ? 'vermelho' : mark === 'yellow' ? 'amarelo' : 'verde'
                    }</p>`
                  : ''
              }`
            )
          )
          .addTo(map.current!);

        marker.getElement().addEventListener('click', () => onPlaceSelectRef.current(place));
        markers.current.push(marker);
      });
    }
  }, [places, userLocation, marks, rowMarkKeys]);

  return <div ref={mapContainer} className="w-full h-64 md:h-96 rounded-xl overflow-hidden shadow-lg" />;
};

export default Map;
