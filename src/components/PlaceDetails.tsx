import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, MapPin, Phone, Globe, Smartphone, Clock, ExternalLink } from 'lucide-react';
import { Place } from '../types';

interface PlaceDetailsProps {
  placeId: string;
  onClose: () => void;
}

const PlaceDetails: React.FC<PlaceDetailsProps> = ({ placeId, onClose }) => {
  const [details, setDetails] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/place-details?placeId=${placeId}`);
        const data = await response.json();
        setDetails(data);
      } catch (error) {
        console.error('Error fetching details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [placeId]);

  if (!details && !loading) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : details && (
          <>
            <div className="relative h-64 w-full">
              <img
                src={details.photos?.[0]?.photo_reference
                  ? `/api/place-photo?photoReference=${details.photos[0].photo_reference}`
                  : 'https://picsum.photos/seed/establishment/800/600'}
                alt={details.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={onClose}
                className="absolute top-4 right-4 bg-white/80 backdrop-blur-md p-2 rounded-full text-gray-800 hover:bg-white transition-all shadow-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 md:p-8">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 mb-1">{details.name}</h2>
                  <p className="text-gray-500 flex items-center text-sm">
                    <MapPin className="w-4 h-4 mr-1 text-blue-500" />
                    {details.vicinity}
                  </p>
                </div>
                {details.rating && (
                  <div className="bg-yellow-50 px-3 py-1 rounded-xl flex items-center text-yellow-600 border border-yellow-100">
                    <Star className="w-5 h-5 fill-current mr-1" />
                    <span className="text-lg font-black">{details.rating}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Informações</h3>
                  
                  {details.formatted_phone_number && (
                    <div className="flex items-center text-gray-700">
                      <div className="bg-blue-50 p-2 rounded-lg mr-3">
                        <Phone className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="font-bold">{details.formatted_phone_number}</span>
                    </div>
                  )}

                  {details.website && (
                    <a
                      href={details.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-gray-700 hover:text-blue-600 transition-colors"
                    >
                      <div className="bg-indigo-50 p-2 rounded-lg mr-3">
                        <Globe className="w-5 h-5 text-indigo-600" />
                      </div>
                      <span className="font-bold truncate max-w-[200px]">{details.website}</span>
                      <ExternalLink className="w-4 h-4 ml-2 opacity-50" />
                    </a>
                  )}

                  <div className="flex items-center text-gray-700">
                    <div className="bg-purple-50 p-2 rounded-lg mr-3">
                      <Smartphone className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="font-bold">
                      {details.hasApp ? 'Aplicativo Próprio Disponível' : 'Sem Aplicativo Próprio'}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Status</h3>
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg mr-3 ${details.opening_hours?.open_now ? 'bg-green-50' : 'bg-red-50'}`}>
                      <Clock className={`w-5 h-5 ${details.opening_hours?.open_now ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <span className={`font-black text-lg ${details.opening_hours?.open_now ? 'text-green-600' : 'text-red-600'}`}>
                      {details.opening_hours?.open_now ? 'Aberto Agora' : 'Fechado no Momento'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                {details.website && (
                  <a
                    href={details.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-center shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                  >
                    Abrir Site Oficial
                  </a>
                )}
                <button
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${details.geometry.location.lat},${details.geometry.location.lng}&query_place_id=${details.place_id}`, '_blank')}
                  className="flex-1 bg-gray-900 text-white py-4 rounded-2xl font-black text-center shadow-lg shadow-gray-200 hover:bg-black transition-all active:scale-95"
                >
                  Ver no Google Maps
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

export default PlaceDetails;
