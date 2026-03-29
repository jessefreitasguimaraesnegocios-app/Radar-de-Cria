import React from 'react';
import { motion } from 'motion/react';
import { twMerge } from 'tailwind-merge';
import { Star, MapPin, Globe, Smartphone } from 'lucide-react';
import { Place } from '../types';
import type { PlaceMarkColor } from '../lib/placeMarks';
import { MarkColorButtons } from './MarkColorButtons';

interface PlaceCardProps {
  place: Place;
  onClick: () => void;
  /** Marca atual (mesma chave da tabela / mapa). */
  mark?: PlaceMarkColor;
  /** Se definido, exibe botões de cor no card (carrossel mobile). */
  onMarkChange?: (next: PlaceMarkColor | null) => void;
}

const PlaceCard: React.FC<PlaceCardProps> = ({ place, onClick, mark, onMarkChange }) => {
  const photoUrl = place.photos?.[0]?.photo_reference
    ? `/api/place-photo?photoReference=${place.photos[0].photo_reference}`
    : 'https://picsum.photos/seed/establishment/400/300';

  const shellClass = twMerge(
    'bg-white rounded-2xl shadow-md overflow-hidden cursor-pointer border flex flex-col h-full transition-colors',
    mark === 'red' && 'border-red-200 bg-red-50/40 ring-1 ring-red-100',
    mark === 'yellow' && 'border-amber-200 bg-amber-50/40 ring-1 ring-amber-100',
    mark === 'green' && 'border-emerald-200 bg-emerald-50/40 ring-1 ring-emerald-100',
    !mark && 'border-gray-100'
  );

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={shellClass}
      onClick={onClick}
    >
      <div className="relative h-40 w-full overflow-hidden">
        <img
          src={photoUrl}
          alt={place.name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        {place.opening_hours && (
          <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-bold ${
            place.opening_hours.open_now ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {place.opening_hours.open_now ? 'Aberto' : 'Fechado'}
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{place.name}</h3>
          {place.rating && (
            <div className="flex items-center text-yellow-500">
              <Star className="w-4 h-4 fill-current" />
              <span className="ml-1 text-sm font-bold">{place.rating}</span>
            </div>
          )}
        </div>

        <p className="text-gray-500 text-sm flex items-center mb-3">
          <MapPin className="w-3 h-3 mr-1" />
          <span className="line-clamp-1">{place.vicinity}</span>
        </p>

        <div className="mt-auto flex flex-wrap gap-2">
          {place.hasApp ? (
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
              <Smartphone className="w-3 h-3 mr-1" /> Tem App
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-50 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
              Sem App Próprio
            </span>
          )}

          {place.hasSite ? (
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
              <Globe className="w-3 h-3 mr-1" /> Tem Site
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-50 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
              Offline
            </span>
          )}
        </div>
      </div>

      {onMarkChange && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-3 py-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2 text-center">
            Funil
          </p>
          <MarkColorButtons mark={mark} onMarkChange={onMarkChange} compact />
        </div>
      )}
    </motion.div>
  );
};

export default PlaceCard;
