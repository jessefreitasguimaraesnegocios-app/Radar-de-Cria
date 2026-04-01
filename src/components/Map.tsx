import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { twMerge } from 'tailwind-merge';
import { Place, UserLocation } from '../types';
import {
  mapMarkerHex,
  USER_LOCATION_MARKER_HEX,
  type PlaceMarkColor,
} from '../lib/placeMarks';
import { circleRingLngLat } from '../lib/geo';

const SEARCH_RADIUS_SOURCE_ID = 'search-radius-circle';
const SEARCH_RADIUS_LINE_LAYER_ID = 'search-radius-circle-line';

interface MapProps {
  userLocation: UserLocation;
  places: Place[];
  /** Mesmas chaves que a tabela (computeRowMarkKeys). */
  rowMarkKeys: string[];
  marks: Record<string, PlaceMarkColor>;
  onPlaceSelect: (place: Place) => void;
  /** Raio em metros correspondente ao filtro da busca (círculo no mapa). */
  searchRadiusMeters: number;
  /** Exibe ou oculta o contorno fino do raio. */
  showSearchRadiusOutline: boolean;
  /** Sobrescreve altura (ex.: mapa maior no painel mobile). */
  containerClassName?: string;
}

const Map: React.FC<MapProps> = ({
  userLocation,
  places,
  rowMarkKeys,
  marks,
  onPlaceSelect,
  searchRadiusMeters,
  showSearchRadiusOutline,
  containerClassName,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [mapStyleReady, setMapStyleReady] = useState(false);
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
        map.current.once('load', () => setMapStyleReady(true));
      }
    };

    fetchToken();
  }, []);

  useEffect(() => {
    if (map.current) {
      map.current.setCenter([userLocation.lng, userLocation.lat]);
    }
  }, [userLocation]);

  useLayoutEffect(() => {
    map.current?.resize();
  }, [containerClassName, userLocation.lat, userLocation.lng, places.length]);

  useEffect(() => {
    const m = map.current;
    if (!m || !mapStyleReady) return;

    const applyRadiusOutline = () => {
      if (!m.isStyleLoaded()) return;
      if (!showSearchRadiusOutline) {
        if (m.getLayer(SEARCH_RADIUS_LINE_LAYER_ID)) {
          m.setLayoutProperty(SEARCH_RADIUS_LINE_LAYER_ID, 'visibility', 'none');
        }
        return;
      }

      const ring = circleRingLngLat(userLocation.lng, userLocation.lat, searchRadiusMeters);
      const data = {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'Polygon' as const,
          coordinates: [ring],
        },
      };

      const src = m.getSource(SEARCH_RADIUS_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
      if (!src) {
        m.addSource(SEARCH_RADIUS_SOURCE_ID, { type: 'geojson', data });
        m.addLayer({
          id: SEARCH_RADIUS_LINE_LAYER_ID,
          type: 'line',
          source: SEARCH_RADIUS_SOURCE_ID,
          paint: {
            'line-color': '#2563eb',
            'line-width': 1.5,
            'line-opacity': 0.9,
          },
        });
      } else {
        src.setData(data);
        if (m.getLayer(SEARCH_RADIUS_LINE_LAYER_ID)) {
          m.setLayoutProperty(SEARCH_RADIUS_LINE_LAYER_ID, 'visibility', 'visible');
        }
      }
    };

    if (m.isStyleLoaded()) {
      applyRadiusOutline();
    } else {
      m.once('load', applyRadiusOutline);
    }

    return () => {
      m.off('load', applyRadiusOutline);
    };
  }, [mapStyleReady, userLocation.lat, userLocation.lng, searchRadiusMeters, showSearchRadiusOutline]);

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
              `<h3 style="margin:0 0 4px">${place.name}</h3><p style="margin:0;font-size:12px;color:#666">${
                mark === 'yellow'
                  ? 'Potencial (amarelo)'
                  : mark === 'green'
                    ? 'Vendeu sistema (verde)'
                    : mark === 'red'
                      ? 'Sem potencial / não vendeu (vermelho)'
                      : 'Padrão: ainda não qualificado (vermelho)'
              }</p>`
            )
          )
          .addTo(map.current!);

        marker.getElement().addEventListener('click', () => onPlaceSelectRef.current(place));
        markers.current.push(marker);
      });
    }
  }, [places, userLocation, marks, rowMarkKeys]);

  return (
    <div
      ref={mapContainer}
      className={twMerge(
        'w-full h-64 md:h-96 rounded-xl overflow-hidden shadow-lg',
        containerClassName
      )}
    />
  );
};

export default Map;
