import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation as NavigationIcon, Loader2, AlertCircle, Info, Target } from 'lucide-react';
import Map from './components/Map';
import PlaceCard from './components/PlaceCard';
import Filters from './components/Filters';
import PlaceDetails from './components/PlaceDetails';
import PlacesResultsList from './components/PlacesResultsList';
import { Place, UserLocation } from './types';
import { distanceMeters } from './lib/geo';
import { computeRowMarkKeys } from './lib/placeMarks';
import {
  buildSearchKey,
  FRESH_MS,
  MAX_RETENTION_MS,
  mergePlacesById,
  readEntry,
  writeEntry,
  pruneExpiredEntries,
} from './lib/placesSearchCache';
import { usePlaceMarks } from './hooks/usePlaceMarks';

async function enrichWithDetails(placesIn: Place[], limit = 15): Promise<Place[]> {
  const head = placesIn.slice(0, limit);
  const detailedHead = await Promise.all(
    head.map(async (place) => {
      try {
        const detailsResponse = await fetch(`/api/place-details?placeId=${place.place_id}`);
        return await detailsResponse.json();
      } catch {
        return place;
      }
    })
  );
  return [...detailedHead, ...placesIn.slice(limit)];
}

const App: React.FC = () => {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const placesRef = useRef<Place[]>([]);
  const placesOpGen = useRef(0);
  const [maxFetchedRadius, setMaxFetchedRadius] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [radius, setRadius] = useState(5000);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const { marks, setMark } = usePlaceMarks();

  useEffect(() => {
    placesRef.current = places;
  }, [places]);

  useEffect(() => {
    pruneExpiredEntries();
  }, []);

  const loadPlacesFresh = useCallback(async (lat: number, lng: number, rad: number, searchKeyword?: string) => {
    const opGen = ++placesOpGen.current;
    const kw = searchKeyword !== undefined ? searchKeyword : keyword;
    const cacheKey = buildSearchKey(lat, lng, kw);
    const now = Date.now();
    const cached = readEntry(cacheKey);

    if (cached && now - cached.savedAt < MAX_RETENTION_MS) {
      if (opGen !== placesOpGen.current) return;
      setPlaces(cached.places);
      setMaxFetchedRadius(cached.maxFetchedRadius);
      setError(null);

      if (now - cached.savedAt < FRESH_MS) {
        setLoading(false);
        return;
      }

      setLoading(false);
      const fetchR = Math.max(rad, cached.maxFetchedRadius);
      void (async () => {
        try {
          const response = await fetch(
            `/api/places?lat=${lat}&lng=${lng}&radius=${fetchR}&type=establishment${kw ? `&keyword=${encodeURIComponent(kw)}` : ''}`
          );
          const data = await response.json();
          if (opGen !== placesOpGen.current) return;
          if (!Array.isArray(data)) {
            if (data && typeof data === 'object' && 'error' in data && data.error) {
              setError(String(data.error));
            }
            return;
          }
          const mergedRaw = mergePlacesById(data as Place[], cached.places);
          const detailedPlaces = await enrichWithDetails(mergedRaw, 15);
          if (opGen !== placesOpGen.current) return;
          setPlaces(detailedPlaces);
          setMaxFetchedRadius(fetchR);
          setError(null);
          writeEntry(cacheKey, detailedPlaces, fetchR);
        } catch (err) {
          console.error('Revalidate places:', err);
        }
      })();
      return;
    }

    if (opGen !== placesOpGen.current) return;
    setLoading(true);
    setMaxFetchedRadius(0);
    try {
      const response = await fetch(
        `/api/places?lat=${lat}&lng=${lng}&radius=${rad}&type=establishment${kw ? `&keyword=${encodeURIComponent(kw)}` : ''}`
      );
      const data = await response.json();

      if (opGen !== placesOpGen.current) return;

      if (!Array.isArray(data)) {
        console.error('API returned non-array data:', data);
        setPlaces([]);
        if (data && typeof data === 'object' && 'error' in data && data.error) {
          setError(String(data.error));
        }
        return;
      }

      const detailedPlaces = await enrichWithDetails(data, 15);
      if (opGen !== placesOpGen.current) return;
      setPlaces(detailedPlaces);
      setMaxFetchedRadius(rad);
      setError(null);
      writeEntry(cacheKey, detailedPlaces, rad);
    } catch (err) {
      console.error('Error fetching places:', err);
      if (opGen === placesOpGen.current) {
        setError('Não foi possível carregar os estabelecimentos próximos.');
      }
    } finally {
      if (opGen === placesOpGen.current) {
        setLoading(false);
      }
    }
  }, [keyword]);

  const expandPlacesRadius = useCallback(async (lat: number, lng: number, rad: number, searchKeyword?: string) => {
    const opGen = ++placesOpGen.current;
    setLoading(true);
    try {
      const kw = searchKeyword !== undefined ? searchKeyword : keyword;
      const response = await fetch(
        `/api/places?lat=${lat}&lng=${lng}&radius=${rad}&type=establishment${kw ? `&keyword=${encodeURIComponent(kw)}` : ''}`
      );
      const data = await response.json();

      if (opGen !== placesOpGen.current) return;

      if (!Array.isArray(data)) {
        console.error('API returned non-array data:', data);
        if (data && typeof data === 'object' && 'error' in data && data.error) {
          setError(String(data.error));
        }
        return;
      }

      const prev = placesRef.current;
      const prevIds = new Set(prev.map((p) => p.place_id));
      const newRaw = data.filter((p: Place) => !prevIds.has(p.place_id)) as Place[];
      const enrichedNew = newRaw.length > 0 ? await enrichWithDetails(newRaw, 15) : [];
      if (opGen !== placesOpGen.current) return;
      const merged = [...prev, ...enrichedNew];
      setPlaces(merged);
      setMaxFetchedRadius(rad);
      setError(null);
      writeEntry(buildSearchKey(lat, lng, kw), merged, rad);
    } catch (err) {
      console.error('Error fetching places:', err);
      if (opGen === placesOpGen.current) {
        setError('Não foi possível carregar os estabelecimentos próximos.');
      }
    } finally {
      if (opGen === placesOpGen.current) {
        setLoading(false);
      }
    }
  }, [keyword]);

  const detectLocation = useCallback(() => {
    const defaultLocation = { lat: -19.9191, lng: -43.9386 }; // Belo Horizonte
    setLoading(true);
    setError(null);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setLoading(false);
        },
        (err) => {
          console.error('Geolocation error:', err);
          setError(
            'Não conseguimos detectar sua localização. O mapa usa Belo Horizonte como referência; busque uma cidade ou toque em Buscar por segmento quando quiser listar negócios.'
          );
          setUserLocation(defaultLocation);
          setLoading(false);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      setError('Geolocalização não suportada. Busque sua cidade no campo abaixo.');
      setUserLocation(defaultLocation);
      setLoading(false);
    }
  }, []);

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    if (!userLocation || maxFetchedRadius === 0) return;
    if (newRadius > maxFetchedRadius) {
      void expandPlacesRadius(userLocation.lat, userLocation.lng, newRadius);
    }
  };

  const handleKeywordSearch = (newKeyword: string) => {
    setKeyword(newKeyword);
    if (userLocation) {
      void loadPlacesFresh(userLocation.lat, userLocation.lng, radius, newKeyword);
    } else {
      setError('Defina um ponto no mapa: busque uma cidade ou use “Localização atual” no topo.');
    }
  };

  const scrollToResultsList = useCallback(() => {
    document.getElementById('places-results-list')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, []);

  const handleCitySearch = async (raw: string) => {
    const q = raw.trim();
    if (!q) {
      setError('Digite uma cidade, bairro ou endereço e clique no botão ao lado (ou Enter).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/geocode?query=${encodeURIComponent(q)}`);
      const data = await response.json();
      if (data.lat && data.lng) {
        setUserLocation({ lat: data.lat, lng: data.lng });
        await loadPlacesFresh(data.lat, data.lng, radius);
      } else {
        setError('Não encontramos este local. Tente outro nome ou cidade.');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Não foi possível localizar. Tente de novo.');
    } finally {
      setLoading(false);
    }
  };

  const withinRadius =
    userLocation == null
      ? places
      : places.filter((place) => {
          const loc = place.geometry?.location;
          if (loc == null) return false;
          return distanceMeters(userLocation, loc) <= radius;
        });

  const filteredPlaces = withinRadius.filter((place) => {
    if (activeFilter === 'open') return place.opening_hours?.open_now;
    if (activeFilter === 'rating') return (place.rating || 0) >= 4.5;
    if (activeFilter === 'app') return place.hasApp === true;
    if (activeFilter === 'no_app') return place.hasApp !== true;
    if (activeFilter === 'no_site') return place.hasSite !== true;
    return true;
  });

  const rowMarkKeys = useMemo(() => computeRowMarkKeys(filteredPlaces), [filteredPlaces]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-4 md:px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
              <NavigationIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-gray-900 leading-tight">Radar de Cria</h1>
              <p className="text-[11px] md:text-xs text-gray-500 font-medium max-w-md hidden sm:block">
                Encontre negócios por segmento e região para oferecer seu app, cardápio digital ou outro serviço.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => detectLocation()}
              className="flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition-all active:scale-95 border border-blue-100"
            >
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">{userLocation ? 'Atualizar GPS' : 'Localização atual'}</span>
              <span className="sm:hidden">GPS</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 md:px-8">
        <div className="mb-6 flex gap-3 rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-950">
          <Target className="w-5 h-5 shrink-0 text-blue-600 mt-0.5" />
          <div>
            <p className="font-black text-blue-900 text-xs uppercase tracking-wide mb-1">Prospecção</p>
            <p className="text-blue-900/90 leading-relaxed">
              Busque por tipo de negócio (ex.: <strong>barbearia</strong>, <strong>bar</strong>, <strong>restaurante</strong>).
              Use <strong>Sem app próprio</strong> para quem pode receber seu app; <strong>Sem site</strong> para oferecer site ou
              cardápio online. Pinos: você em <strong>azul</strong>; buscas em <strong>vermelho</strong> até
              qualificar — <strong>amarelo</strong> (potencial), <strong>verde</strong> (vendeu),{' '}
              <strong>vermelho</strong> (sem potencial / não vendeu).
            </p>
          </div>
        </div>

        {/* Map Section */}
        <div className="mb-8">
          {userLocation ? (
            <Map
              userLocation={userLocation}
              places={filteredPlaces}
              rowMarkKeys={rowMarkKeys}
              marks={marks}
              onPlaceSelect={(place) => setSelectedPlaceId(place.place_id)}
            />
          ) : (
            <div className="w-full h-64 md:h-96 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <MapPin className="w-10 h-10 text-gray-400" />
              <p className="text-gray-800 font-black text-sm">Mapa</p>
              <p className="text-gray-600 text-sm max-w-md leading-relaxed">
                Busque uma cidade abaixo ou use <strong className="text-gray-800">Localização atual</strong> no topo. Os
                estabelecimentos só são buscados quando você buscar por cidade ou por segmento.
              </p>
            </div>
          )}
        </div>

        {/* Filters */}
        <Filters
          radius={radius}
          onRadiusChange={handleRadiusChange}
          onCitySearch={handleCitySearch}
          onKeywordSearch={handleKeywordSearch}
          onFilterChange={setActiveFilter}
          activeFilter={activeFilter}
          resultCount={filteredPlaces.length}
          loading={loading}
          onScrollToList={scrollToResultsList}
        />

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-700 mb-8">
            <AlertCircle className="w-6 h-6" />
            <p className="font-bold">{error}</p>
          </div>
        )}

        {/* Places Grid */}
        <div className="relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              <p className="text-gray-500 font-black uppercase tracking-widest text-sm">Buscando estabelecimentos...</p>
            </div>
          ) : (
            <>
              {filteredPlaces.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredPlaces.map((place) => (
                      <PlaceCard
                        key={place.place_id}
                        place={place}
                        onClick={() => setSelectedPlaceId(place.place_id)}
                      />
                    ))}
                  </div>
                  <PlacesResultsList
                    places={filteredPlaces}
                    marks={marks}
                    setMark={setMark}
                    onOpenPlace={(id) => setSelectedPlaceId(id)}
                  />
                </>
              ) : maxFetchedRadius === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                  <div className="bg-gray-100 p-6 rounded-full">
                    <Info className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900">Nenhuma busca ainda</h3>
                  <p className="text-gray-500 max-w-sm leading-relaxed">
                    Defina o mapa (cidade ou GPS) e depois busque por segmento, ou use o botão de cidade para buscar
                    estabelecimentos na região.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                  <div className="bg-gray-100 p-6 rounded-full">
                    <Info className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900">Nenhum estabelecimento encontrado</h3>
                  <p className="text-gray-500 max-w-xs">Tente aumentar o raio de busca ou mudar os filtros aplicados.</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <NavigationIcon className="w-5 h-5 text-blue-600" />
            <span className="text-lg font-black tracking-tighter">Radar de Cria</span>
          </div>
          <p className="text-gray-400 text-sm font-medium">© 2026 Radar de Cria. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedPlaceId && (
          <PlaceDetails
            placeId={selectedPlaceId}
            onClose={() => setSelectedPlaceId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
