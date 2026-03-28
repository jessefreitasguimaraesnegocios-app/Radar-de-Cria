import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import debounce from 'lodash.debounce';
import { MapPin, Navigation as NavigationIcon, Loader2, AlertCircle, Info } from 'lucide-react';
import Map from './components/Map';
import PlaceCard from './components/PlaceCard';
import Filters from './components/Filters';
import PlaceDetails from './components/PlaceDetails';
import { Place, UserLocation } from './types';

const App: React.FC = () => {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [radius, setRadius] = useState(5000);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [keyword, setKeyword] = useState('');

  const fetchPlaces = async (lat: number, lng: number, rad: number, searchKeyword?: string) => {
    setLoading(true);
    try {
      const kw = searchKeyword !== undefined ? searchKeyword : keyword;
      const response = await fetch(`/api/places?lat=${lat}&lng=${lng}&radius=${rad}&type=establishment${kw ? `&keyword=${encodeURIComponent(kw)}` : ''}`);
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        console.error('API returned non-array data:', data);
        setPlaces([]);
        if (data.error) setError(data.error);
        setLoading(false);
        return;
      }

      // Fetch details for each place to get website/app info (this could be optimized)
      const detailedPlaces = await Promise.all(
        data.slice(0, 10).map(async (place: Place) => {
          try {
            const detailsResponse = await fetch(`/api/place-details?placeId=${place.place_id}`);
            return await detailsResponse.json();
          } catch (e) {
            return place;
          }
        })
      );

      setPlaces(detailedPlaces);
      setError(null);
    } catch (err) {
      console.error('Error fetching places:', err);
      setError('Não foi possível carregar os estabelecimentos próximos.');
    } finally {
      setLoading(false);
    }
  };

  const detectLocation = useCallback(() => {
    const defaultLocation = { lat: -19.9191, lng: -43.9386 }; // Belo Horizonte
    setLoading(true);
    setError(null);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          fetchPlaces(latitude, longitude, radius);
        },
        (err) => {
          console.error('Geolocation error:', err);
          setError('Não conseguimos detectar sua localização automaticamente. Usando Belo Horizonte como padrão, mas você pode buscar sua cidade no campo abaixo.');
          setUserLocation(defaultLocation);
          fetchPlaces(defaultLocation.lat, defaultLocation.lng, radius);
          setLoading(false);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      setError('Geolocalização não suportada. Busque sua cidade manualmente.');
      setUserLocation(defaultLocation);
      fetchPlaces(defaultLocation.lat, defaultLocation.lng, radius);
      setLoading(false);
    }
  }, [radius, keyword]);

  useEffect(() => {
    detectLocation();
  }, []);

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    if (userLocation) {
      fetchPlaces(userLocation.lat, userLocation.lng, newRadius, keyword);
    }
  };

  const handleKeywordSearch = (newKeyword: string) => {
    setKeyword(newKeyword);
    if (userLocation) {
      fetchPlaces(userLocation.lat, userLocation.lng, radius, newKeyword);
    }
  };

  const handleSearch = useCallback(
    debounce(async (query: string) => {
      if (!query) return;
      setLoading(true);
      try {
        const response = await fetch(`/api/geocode?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data.lat && data.lng) {
          setUserLocation({ lat: data.lat, lng: data.lng });
          fetchPlaces(data.lat, data.lng, radius);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 1000),
    [radius]
  );

  const filteredPlaces = places.filter((place) => {
    if (activeFilter === 'open') return place.opening_hours?.open_now;
    if (activeFilter === 'rating') return (place.rating || 0) >= 4.5;
    if (activeFilter === 'app') return place.hasApp;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-4 md:px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
              <NavigationIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-gray-900">LocalFinder</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {(!process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_PLACES_API_KEY === 'MY_GOOGLE_PLACES_KEY') && (
              <div className="hidden lg:flex items-center gap-2 text-xs font-black text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                <AlertCircle className="w-4 h-4" />
                <span>MODO DEMONSTRAÇÃO (Sem Chaves API)</span>
              </div>
            )}
            
            {userLocation && (
              <button 
                onClick={detectLocation}
                className="hidden md:flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition-all active:scale-95 border border-blue-100"
              >
                <MapPin className="w-4 h-4" />
                <span>Localização atual</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 md:px-8">
        {/* Map Section */}
        <div className="mb-8">
          {userLocation ? (
            <Map
              userLocation={userLocation}
              places={filteredPlaces}
              onPlaceSelect={(place) => setSelectedPlaceId(place.place_id)}
            />
          ) : (
            <div className="w-full h-64 md:h-96 bg-gray-200 rounded-xl flex items-center justify-center animate-pulse">
              <p className="text-gray-400 font-bold">Aguardando localização...</p>
            </div>
          )}
        </div>

        {/* Filters */}
        <Filters
          radius={radius}
          onRadiusChange={handleRadiusChange}
          onSearch={handleSearch}
          onDetectLocation={detectLocation}
          onKeywordSearch={handleKeywordSearch}
          onFilterChange={setActiveFilter}
          activeFilter={activeFilter}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredPlaces.map((place, index) => (
                    <PlaceCard
                      key={`${place.place_id}-${index}`}
                      place={place}
                      onClick={() => setSelectedPlaceId(place.place_id)}
                    />
                  ))}
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
            <span className="text-lg font-black tracking-tighter">LocalFinder</span>
          </div>
          <p className="text-gray-400 text-sm font-medium">© 2026 LocalFinder. Todos os direitos reservados.</p>
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
